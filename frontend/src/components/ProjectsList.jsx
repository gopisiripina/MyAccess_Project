import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/Dashboard.css';

const ProjectsList = ({ userRole }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
  }, []);

  const handleViewProject = (projectId) => {
    navigate(`/project/${projectId}`);
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
      
      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p className="error-message">{error}</p>
      ) : (
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
                    <button 
                      className="edit-button"
                      onClick={() => handleViewProject(project.id)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4">No projects found</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ProjectsList;