import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, Button, Spin, Alert, Badge, Modal, Typography, Space, Progress, notification } from 'antd';
import { 
  EyeOutlined, 
  ClockCircleOutlined, 
  TeamOutlined, 
  LoadingOutlined,
  UserOutlined,
  ExclamationCircleOutlined 
} from '@ant-design/icons';
import '../styles/ProjectsList.css';

const { Title, Text } = Typography;
const { confirm } = Modal;

const ProjectsList = ({ userRole }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [queueStatus, setQueueStatus] = useState({});
  const [sessionTimers, setSessionTimers] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    console.log('ProjectsList mounted, userRole:', userRole);
    fetchProjects();
    
    // Set up periodic queue status updates for guests
    if (userRole === 'guest') {
      const interval = setInterval(updateQueueStatuses, 5000);
      return () => clearInterval(interval);
    }
  }, [userRole]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError('');
      
      const userId = localStorage.getItem('userId');
      const email = localStorage.getItem('userEmail');
      const role = localStorage.getItem('userRole');
      
      console.log('Fetching projects with credentials:', { userId, email, role });
      
      // Validate credentials
      if (!userId || !role) {
        throw new Error('Missing authentication credentials');
      }
      
      const config = {
        headers: {
          'userid': userId,
          'email': email || '',
          'role': role
        }
      };

      console.log('Making API request to fetch projects...');
      const response = await axios.get('http://localhost:5000/api/projects', config);
      console.log('Projects API response:', response.data);
      
      // Ensure we have an array
      const projectsData = Array.isArray(response.data) ? response.data : [];
      setProjects(projectsData);
      
      // For guests, also fetch queue statuses
      if (userRole === 'guest' && projectsData.length > 0) {
        console.log('Fetching queue statuses for guest...');
        await updateQueueStatuses(projectsData);
      }
      
    } catch (err) {
      console.error('Error fetching projects:', err);
      console.error('Error response:', err.response?.data);
      
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError('Session expired. Please login again.');
        setTimeout(() => {
          localStorage.clear();
          navigate('/');
        }, 2000);
      } else {
        const errorMessage = err.response?.data?.message || err.message || 'Failed to load projects. Please try again.';
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const updateQueueStatuses = async (projectsList = projects) => {
    if (userRole !== 'guest' || !projectsList.length) return;
    
    const userId = localStorage.getItem('userId');
    const email = localStorage.getItem('userEmail');
    
    if (!userId || !email) {
      console.warn('Missing credentials for queue status update');
      return;
    }
    
    const config = {
      headers: {
        'userid': userId,
        'email': email,
        'role': 'guest'
      }
    };

    for (const project of projectsList) {
      try {
        const response = await axios.get(
          `http://localhost:5000/api/guests/projects/${project.id}/queue-status`,
          config
        );
        
        setQueueStatus(prev => ({
          ...prev,
          [project.id]: response.data
        }));

        // If user has active session, update timer
        if (response.data.hasActiveSession && response.data.remainingTime) {
          setSessionTimers(prev => ({
            ...prev,
            [project.id]: response.data.remainingTime
          }));
        }
      } catch (err) {
        console.error(`Error fetching queue status for project ${project.id}:`, err);
      }
    }
  };

  const handleViewProject = async (projectId) => {
    if (userRole === 'guest') {
      await handleGuestAccess(projectId);
    } else {
      // Regular users can directly access
      navigate(`/project/${projectId}`);
    }
  };

  const handleGuestAccess = async (projectId) => {
    const userId = localStorage.getItem('userId');
    const email = localStorage.getItem('userEmail');
    
    if (!userId || !email) {
      notification.error({
        message: 'Authentication Error',
        description: 'Missing credentials. Please login again.',
      });
      return;
    }
    
    const config = {
      headers: {
        'userid': userId,
        'email': email,
        'role': 'guest'
      }
    };

    try {
      setLoading(true);
      const response = await axios.post(
        `http://localhost:5000/api/guests/projects/${projectId}/request-access`,
        {},
        config
      );

      if (response.data.accessGranted) {
        notification.success({
          message: 'Access Granted!',
          description: `You have ${Math.ceil(response.data.remainingTime / 1000)}s to use this project.`,
          duration: 3
        });
        
        // Navigate to project with session info
        navigate(`/project/${projectId}?sessionId=${response.data.sessionId}`);
      } else {
        // Show queue position
        notification.info({
          message: 'Added to Queue',
          description: `Position: ${response.data.position}. Estimated wait: ${Math.ceil(response.data.estimatedWait / 1000)}s`,
          duration: 5
        });
        
        // Update queue status
        updateQueueStatuses();
      }
    } catch (err) {
      console.error('Error requesting access:', err);
      notification.error({
        message: 'Access Request Failed',
        description: err.response?.data?.message || 'Failed to request project access',
        duration: 3
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (milliseconds) => {
    const seconds = Math.ceil(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  };

  const getProjectStatus = (project) => {
    const status = queueStatus[project.id];
    
    if (!status) return { type: 'default', text: 'Available' };
    
    if (status.hasActiveSession) {
      return { 
        type: 'success', 
        text: 'Active Session',
        time: status.remainingTime,
        sessionId: status.sessionId
      };
    }
    
    if (status.inQueue) {
      return { 
        type: 'warning', 
        text: `Queue Position: ${status.position}`,
        wait: status.estimatedWait,
        position: status.position
      };
    }
    
    return { type: 'default', text: 'Available' };
  };

  const renderProjectCard = (project) => {
    const status = getProjectStatus(project);
    
    return (
      <Card
        key={project.id}
        className={`project-card ${userRole === 'guest' ? 'guest-card' : ''}`}
        style={{ marginBottom: 16 }}
        actions={[
          userRole === 'guest' ? (
            status.type === 'success' ? (
              <Button 
                type="primary" 
                icon={<EyeOutlined />}
                onClick={() => navigate(`/project/${project.id}?sessionId=${status.sessionId || ''}`)}
              >
                Continue Session
              </Button>
            ) : status.type === 'warning' ? (
              <Button 
                type="default" 
                icon={<TeamOutlined />}
                disabled
              >
                In Queue (#{status.position || 0})
              </Button>
            ) : (
              <Button 
                type="primary" 
                icon={<EyeOutlined />}
                loading={loading}
                onClick={() => handleViewProject(project.id)}
              >
                Request Access
              </Button>
            )
          ) : (
            <Button 
              type="primary" 
              icon={<EyeOutlined />}
              onClick={() => handleViewProject(project.id)}
            >
              View Project
            </Button>
          )
        ]}
      >
        <div className="project-card-header">
          <Title level={4}>{project.name || `Project ${project.id}`}</Title>
          {userRole === 'guest' && (
            <Badge 
              status={
                status.type === 'success' ? 'success' : 
                status.type === 'warning' ? 'warning' : 
                'default'
              } 
              text={status.text}
            />
          )}
        </div>
        
        <Text type="secondary" className="project-description">
          {project.description || 'No description available'}
        </Text>
        
        {userRole === 'guest' && status.type === 'success' && status.time && (
          <div className="session-timer" style={{ marginTop: 16 }}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Space>
                <ClockCircleOutlined />
                <Text strong>Time Remaining: {formatTime(status.time)}</Text>
              </Space>
              <Progress 
                percent={Math.max(0, (status.time / 60000) * 100)} 
                size="small" 
                strokeColor={status.time < 15000 ? '#ff4d4f' : '#52c41a'}
                showInfo={false}
              />
            </Space>
          </div>
        )}
        
        {userRole === 'guest' && status.type === 'warning' && status.wait && (
          <div className="queue-info" style={{ marginTop: 16 }}>
            <Space direction="vertical" size="small">
              <Text type="secondary">
                <UserOutlined /> Position in queue: #{status.position || 0}
              </Text>
              <Text type="secondary">
                <ClockCircleOutlined /> Estimated wait: {formatTime(status.wait)}
              </Text>
            </Space>
          </div>
        )}
      </Card>
    );
  };

  // Debug logging
  console.log('ProjectsList render state:', { 
    loading, 
    projectsCount: projects.length, 
    error, 
    userRole,
    projects: projects.map(p => ({ id: p.id, name: p.name }))
  });

  // Loading state
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '400px',
        padding: '40px'
      }}>
        <Spin 
          indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} 
          size="large" 
        />
        <Text style={{ marginTop: 16, color: '#666' }}>Loading projects...</Text>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="projects-container">
        <Alert
          message="Error Loading Projects"
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={fetchProjects}>
              Retry
            </Button>
          }
          style={{ marginBottom: 16 }}
        />
      </div>
    );
  }

  return (
    <div className="projects-container">
      <div className="projects-header">
        <Title level={2}>
          {userRole === 'guest' ? 'Available Projects' : 'Projects'}
        </Title>
        {userRole === 'guest' && (
          <Alert
            message="Guest Access"
            description="You can request access to any project. If busy, you'll be added to a queue and notified when it's your turn."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
        
        {/* Debug info - remove in production */}
        <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
          Debug: Role: {userRole}, Projects: {projects.length}, Loading: {loading.toString()}
        </div>
      </div>
      
      <div className="projects-grid">
        {projects.length > 0 ? (
          projects.map(renderProjectCard)
        ) : (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px',
            background: '#fafafa',
            borderRadius: '8px',
            border: '1px dashed #d9d9d9'
          }}>
            <Text type="secondary" style={{ fontSize: 16 }}>
              {userRole === 'guest' 
                ? 'No projects available for guest access.' 
                : 'No projects found.'
              }
            </Text>
            <br />
            <Button 
              type="link" 
              onClick={fetchProjects}
              style={{ marginTop: 8 }}
            >
              Refresh Projects
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectsList;