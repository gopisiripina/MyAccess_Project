import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/Dashboard.css';

const ProjectsList = ({ userRole }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [accessLoading, setAccessLoading] = useState({});
  const [queuePolling, setQueuePolling] = useState({});
  const navigate = useNavigate();

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const userId = localStorage.getItem('userId');
      const role = localStorage.getItem('userRole');
      
      const config = {
        headers: {
          'userid': userId,
          'role': role
        }
      };

      const response = await axios.get('http://localhost:5000/api/projects', config);
      setProjects(response.data);
      setError('');
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Failed to fetch projects. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
    
    // Cleanup any polling intervals when component unmounts
    return () => {
      Object.values(queuePolling).forEach(intervalId => {
        if (intervalId) clearInterval(intervalId);
      });
    };
  }, []);

  // Function to check queue status and auto-redirect
  const checkQueueStatus = async (projectId) => {
    const userId = localStorage.getItem('userId');
    const email = localStorage.getItem('userEmail');
    const role = localStorage.getItem('userRole');

    try {
      const config = {
        headers: {
          'userid': userId,
          'email': email,
          'role': role
        }
      };

      const response = await axios.post(
        `http://localhost:5000/api/projects/${projectId}/request-access`,
        {},
        config
      );

      if (response.data.accessGranted) {
        // Access granted! Stop polling and redirect
        setQueuePolling(prev => {
          if (prev[projectId]) {
            clearInterval(prev[projectId]);
          }
          const { [projectId]: removed, ...rest } = prev;
          return rest;
        });

        // Navigate to project
        navigate(`/project/${projectId}`, {
          state: {
            sessionId: response.data.sessionId,
            timerEnds: response.data.timerEnds
          }
        });
      }
    } catch (error) {
      console.error('Error checking queue status:', error);
      // If there's an error, stop polling
      setQueuePolling(prev => {
        if (prev[projectId]) {
          clearInterval(prev[projectId]);
        }
        const { [projectId]: removed, ...rest } = prev;
        return rest;
      });
    }
  };

  // Start polling for queue updates
  const startQueuePolling = (projectId) => {
    // Don't start if already polling
    if (queuePolling[projectId]) return;

    const intervalId = setInterval(() => {
      checkQueueStatus(projectId);
    }, 3000); // Check every 3 seconds

    setQueuePolling(prev => ({
      ...prev,
      [projectId]: intervalId
    }));
  };

  // Stop polling for a specific project
  const stopQueuePolling = (projectId) => {
    if (queuePolling[projectId]) {
      clearInterval(queuePolling[projectId]);
      setQueuePolling(prev => {
        const { [projectId]: removed, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleViewProject = async (projectId) => {
    const userId = localStorage.getItem('userId');
    const email = localStorage.getItem('userEmail');
    const role = localStorage.getItem('userRole');

    // Set loading state for this specific project
    setAccessLoading(prev => ({ ...prev, [projectId]: true }));

    try {
      const config = {
        headers: {
          'userid': userId,
          'email': email,
          ...(role !== 'guest' && { 'role': role })
        }
      };

      const response = await axios.post(
        `http://localhost:5000/api/projects/${projectId}/request-access`,
        {},
        config
      );

      if (response.data.accessGranted) {
        // Access granted, navigate to project immediately
        navigate(`/project/${projectId}`, {
          state: {
            sessionId: response.data.sessionId,
            timerEnds: response.data.timerEnds
          }
        });
      } else {
        // Added to queue - show alert and start polling
        const waitMessage = `You will wait in queue. Position: ${response.data.position}`;
        const estimatedWait = response.data.estimatedWait 
          ? `. Estimated wait: ${Math.round(response.data.estimatedWait / 60000)} minutes`
          : '';
        
        alert(`${response.data.message}. ${waitMessage}${estimatedWait}. You will be automatically redirected when it's your turn.`);
        
        // Start polling to check when user can access the project
        startQueuePolling(projectId);
      }
    } catch (error) {
      console.error('Error requesting project access:', error);
      
      if (error.response?.status === 404) {
        setError('Project not found');
      } else if (error.response?.status === 403) {
        setError('Access denied to this project');
      } else {
        setError('Failed to request project access. Please try again.');
      }
    } finally {
      // Clear loading state for this project
      setAccessLoading(prev => ({ ...prev, [projectId]: false }));
    }
  };

  // Function to cancel queue for a project
  const cancelQueue = async (projectId) => {
    const userId = localStorage.getItem('userId');
    
    try {
      await axios.delete(`http://localhost:5000/api/projects/${projectId}/queue/${userId}`);
      stopQueuePolling(projectId);
      alert('You have been removed from the queue.');
    } catch (error) {
      console.error('Error canceling queue:', error);
      alert('Failed to cancel queue position.');
    }
  };

  // Generate loading rows to match the user table loading effect
  const renderLoadingRows = () => {
    return Array(5).fill(0).map((_, index) => (
      <tr key={`loading-${index}`} className="loading-row-placeholder">
        <td>
          <div className="loading-cell-content" style={{ width: '70%' }}></div>
        </td>
        <td>
          <div className="loading-cell-content" style={{ width: '85%' }}></div>
        </td>
        <td>
          <div className="loading-cell-content" style={{ width: '60%' }}></div>
        </td>
        <td>
          <div className="loading-cell-content" style={{ width: '50%' }}></div>
        </td>
      </tr>
    ));
  };

  return (
    <div className="users-list-container">
      <div className="users-header">
        <h2>Projects</h2>
        {(userRole === 'superadmin' || userRole === 'admin') && (
          <button 
            className="add-button"
            onClick={() => navigate('/projects/add')}
          >
            + Add Project
          </button>
        )}
      </div>
      
      {error && <p className="error-message">{error}</p>}
      
      {loading ? (
        <div className="table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {renderLoadingRows()}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.length > 0 ? (
                projects.map(project => (
                  <tr key={project.id}>
                    <td>{project.name}</td>
                    <td>{project.description || '-'}</td>
                    <td>{new Date(project.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="edit-button"
                          onClick={() => handleViewProject(project.id)}
                          disabled={accessLoading[project.id]}
                        >
                          {accessLoading[project.id] ? 'Requesting...' : 'View'}
                        </button>
                        {queuePolling[project.id] && (
                          <button 
                            className="cancel-button"
                            onClick={() => cancelQueue(project.id)}
                            style={{ marginLeft: '8px', backgroundColor: '#f44336', color: 'white' }}
                            title="Cancel queue position"
                          >
                            Cancel Queue
                          </button>
                        )}
                      </div>
                      {queuePolling[project.id] && (
                        <div className="queue-status" style={{ 
                          fontSize: '12px', 
                          color: '#2196F3', 
                          marginTop: '4px',
                          fontStyle: 'italic'
                        }}>
                          Waiting in queue... You'll be redirected automatically
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="no-results">No projects found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ProjectsList;