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
  ExclamationCircleOutlined,
  CrownOutlined,
  StarOutlined
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
  const [buttonLoading, setButtonLoading] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    console.log('ProjectsList mounted, userRole:', userRole);
    fetchProjects();
    
    // Set up periodic queue status updates for all users to see real-time status
    const interval = setInterval(updateQueueStatuses, 5000);
    return () => clearInterval(interval);
  }, [userRole]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError('');
      
      const userId = localStorage.getItem('userId');
      const email = localStorage.getItem('userEmail');
      const role = localStorage.getItem('userRole');
      
      console.log('Fetching projects with credentials:', { userId, email, role });
      
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
      
      const projectsData = Array.isArray(response.data) ? response.data : [];
      setProjects(projectsData);
      
      // Fetch queue statuses for all users to see current status
      if (projectsData.length > 0) {
        console.log('Fetching queue statuses...');
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
    if (!projectsList.length) return;
    
    const userId = localStorage.getItem('userId');
    const email = localStorage.getItem('userEmail');
    const role = localStorage.getItem('userRole');
    
    if (!userId || !role) {
      console.warn('Missing credentials for queue status update');
      return;
    }
    
    const config = {
      headers: {
        'userid': userId,
        'email': email || '',
        'role': role
      }
    };

    for (const project of projectsList) {
      try {
        // Use unified queue status endpoint for all user types
        const response = await axios.get(
          `http://localhost:5000/api/projects/${project.id}/queue-status`,
          config
        );
        
        setQueueStatus(prev => ({
          ...prev,
          [project.id]: response.data
        }));

        // Update session timers for active sessions
        if (response.data.hasActiveSession && response.data.remainingTime) {
          setSessionTimers(prev => ({
            ...prev,
            [project.id]: response.data.remainingTime
          }));
          
          // Start countdown timer for active sessions
          startSessionCountdown(project.id, response.data.remainingTime);
        }
      } catch (err) {
        console.error(`Error fetching queue status for project ${project.id}:`, err);
      }
    }
  };

  const startSessionCountdown = (projectId, initialTime) => {
    // Clear existing timer
    if (sessionTimers[projectId + '_interval']) {
      clearInterval(sessionTimers[projectId + '_interval']);
    }

    let remainingTime = initialTime;
    
    const timer = setInterval(() => {
      remainingTime -= 1000;
      
      if (remainingTime <= 0) {
        clearInterval(timer);
        // Refresh queue status when session expires
        updateQueueStatuses();
        notification.info({
          message: 'Session Expired',
          description: 'A project session has ended. Queue positions may have updated.',
        });
      } else {
        setSessionTimers(prev => ({
          ...prev,
          [projectId]: remainingTime
        }));
      }
    }, 1000);

    setSessionTimers(prev => ({
      ...prev,
      [projectId + '_interval']: timer
    }));
  };

  const handleViewProject = async (projectId) => {
    try {
      // All users go through the unified queue system
      await handleUnifiedAccess(projectId);
    } catch (err) {
      console.error('Error in handleViewProject:', err);
      notification.error({
        message: 'Navigation Error',
        description: 'Failed to access project. Please try again.',
      });
    }
  };

  const handleUnifiedAccess = async (projectId) => {
    const userId = localStorage.getItem('userId');
    const email = localStorage.getItem('userEmail');
    const role = localStorage.getItem('userRole');
    
    if (!userId || !role) {
      notification.error({
        message: 'Authentication Error',
        description: 'Missing credentials. Please login again.',
      });
      return;
    }
    
    const config = {
      headers: {
        'userid': userId,
        'email': email || '',
        'role': role
      }
    };

    try {
      setButtonLoading(prev => ({ ...prev, [projectId]: true }));
      
      // Use unified access endpoint that handles all user types and queue logic
      const response = await axios.post(
        `http://localhost:5000/api/projects/${projectId}/request-access`,
        {
          userRole: role // Send role in body for backend processing
        },
        config
      );

      console.log('Access request response:', response.data);

      if (response.data.accessGranted) {
        notification.success({
          message: 'Access Granted!',
          description: `You have ${Math.ceil(response.data.remainingTime / 1000)}s to use this project.`,
          duration: 3
        });
        
        // Navigate to project with session info
        const sessionParam = response.data.sessionId ? `?sessionId=${response.data.sessionId}` : '';
        navigate(`/project/${projectId}${sessionParam}`);
      } else if (response.data.inQueue) {
        // User added to queue
        const queueType = response.data.queueType || 'standard';
        const priorityText = queueType === 'priority' ? ' (Priority Queue)' : '';
        
        notification.info({
          message: `Added to Queue${priorityText}`,
          description: `Position: ${response.data.position}. Estimated wait: ${Math.ceil(response.data.estimatedWait / 1000)}s`,
          duration: 5
        });
        
        // Update queue status immediately
        updateQueueStatuses();
      } else {
        // Access denied or other status
        notification.warning({
          message: 'Access Denied',
          description: response.data.message || 'Unable to access project at this time.',
          duration: 3
        });
      }
    } catch (err) {
      console.error('Error requesting access:', err);
      
      if (err.response?.status === 403) {
        notification.error({
          message: 'Access Forbidden',
          description: 'You do not have permission to access this project.',
          duration: 3
        });
      } else if (err.response?.status === 429) {
        notification.warning({
          message: 'Too Many Requests',
          description: 'Please wait before making another access request.',
          duration: 3
        });
      } else {
        notification.error({
          message: 'Access Request Failed',
          description: err.response?.data?.message || 'Failed to request project access',
          duration: 3
        });
      }
    } finally {
      setButtonLoading(prev => ({ ...prev, [projectId]: false }));
    }
  };

  const handleLeaveQueue = async (projectId) => {
    const userId = localStorage.getItem('userId');
    const email = localStorage.getItem('userEmail');
    const role = localStorage.getItem('userRole');
    
    const config = {
      headers: {
        'userid': userId,
        'email': email || '',
        'role': role
      }
    };

    try {
      await axios.post(
        `http://localhost:5000/api/projects/${projectId}/leave-queue`,
        {},
        config
      );

      notification.success({
        message: 'Left Queue',
        description: 'You have been removed from the queue.',
      });

      // Update queue status
      updateQueueStatuses();
    } catch (err) {
      console.error('Error leaving queue:', err);
      notification.error({
        message: 'Error',
        description: 'Failed to leave queue.',
      });
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
    
    // Check if current user has active session
    if (status.hasActiveSession && status.isCurrentUserSession) {
      return { 
        type: 'success', 
        text: 'Your Active Session',
        time: sessionTimers[project.id] || status.remainingTime,
        sessionId: status.sessionId
      };
    }
    
    // Check if someone else has active session
    if (status.hasActiveSession && !status.isCurrentUserSession) {
      return {
        type: 'error',
        text: `In Use${status.currentUserRole ? ` (${status.currentUserRole})` : ''}`,
        currentUser: status.currentUserRole
      };
    }
    
    // Check if current user is in queue
    if (status.inQueue && status.isCurrentUserInQueue) {
      const queueType = status.queueType || 'standard';
      const priorityText = queueType === 'priority' ? ' Priority' : '';
      
      return { 
        type: 'warning', 
        text: `In${priorityText} Queue #${status.position}`,
        wait: status.estimatedWait,
        position: status.position,
        queueType: queueType
      };
    }
    
    // Check if there's a queue but user not in it
    if (status.inQueue && !status.isCurrentUserInQueue) {
      return {
        type: 'processing',
        text: `Queue Active (${status.queueLength} waiting)`,
        queueLength: status.queueLength
      };
    }
    
    return { type: 'default', text: 'Available' };
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'superadmin':
        return <CrownOutlined style={{ color: '#ff4d4f' }} />;
      case 'admin':
        return <StarOutlined style={{ color: '#faad14' }} />;
      case 'user':
        return <UserOutlined style={{ color: '#52c41a' }} />;
      default:
        return <UserOutlined style={{ color: '#999' }} />;
    }
  };

  const renderProjectCard = (project) => {
    const status = getProjectStatus(project);
    const isButtonLoading = buttonLoading[project.id] || false;
    
    return (
      <Card
        key={project.id}
        className={`project-card ${userRole === 'guest' ? 'guest-card' : 'privileged-card'}`}
        style={{ marginBottom: 16 }}
        actions={[
          // Continue active session
          status.type === 'success' ? (
            <Button 
              type="primary" 
              icon={<EyeOutlined />}
              onClick={() => navigate(`/project/${project.id}${status.sessionId ? `?sessionId=${status.sessionId}` : ''}`)}
            >
              Continue Session
            </Button>
          ) : 
          // In queue - show leave queue option
          status.type === 'warning' ? (
            <Space>
              <Button 
                type="default" 
                icon={<TeamOutlined />}
                disabled
              >
                Queue #{status.position || 0}
              </Button>
              <Button 
                type="link" 
                size="small"
                onClick={() => handleLeaveQueue(project.id)}
              >
                Leave Queue
              </Button>
            </Space>
          ) : 
          // Project in use by someone else
          status.type === 'error' ? (
            <Button 
              type="primary" 
              icon={<EyeOutlined />}
              loading={isButtonLoading}
              onClick={() => handleViewProject(project.id)}
            >
              Join Queue
            </Button>
          ) :
          // Project has queue but user not in it  
          status.type === 'processing' ? (
            <Button 
              type="primary" 
              icon={<EyeOutlined />}
              loading={isButtonLoading}
              onClick={() => handleViewProject(project.id)}
            >
              Join Queue
            </Button>
          ) :
          // Available - direct access
          (
            <Button 
              type="primary" 
              icon={<EyeOutlined />}
              loading={isButtonLoading}
              onClick={() => handleViewProject(project.id)}
            >
              Access Project
            </Button>
          )
        ]}
      >
        <div className="project-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {getRoleIcon(userRole)}
            <Title level={4}>{project.name || `Project ${project.id}`}</Title>
          </div>
          <Badge 
            status={
              status.type === 'success' ? 'success' : 
              status.type === 'warning' ? 'warning' : 
              status.type === 'error' ? 'error' :
              status.type === 'processing' ? 'processing' :
              'default'
            } 
            text={status.text}
          />
        </div>
        
        <Text type="secondary" className="project-description">
          {project.description || 'No description available'}
        </Text>
        
        {/* Active session timer */}
        {status.type === 'success' && status.time && (
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
        
        {/* Queue information */}
        {status.type === 'warning' && (
          <div className="queue-info" style={{ marginTop: 16 }}>
            <Space direction="vertical" size="small">
              <Text type="secondary">
                <UserOutlined /> Position: #{status.position || 0}
                {status.queueType === 'priority' && (
                  <Text style={{ color: '#faad14' }}> (Priority)</Text>
                )}
              </Text>
              {status.wait && (
                <Text type="secondary">
                  <ClockCircleOutlined /> Estimated wait: {formatTime(status.wait)}
                </Text>
              )}
            </Space>
          </div>
        )}

        {/* Project in use info */}
        {status.type === 'error' && status.currentUser && (
          <div className="in-use-info" style={{ marginTop: 16 }}>
            <Text type="secondary">
              <UserOutlined /> Currently used by: {status.currentUser}
            </Text>
          </div>
        )}

        {/* Queue activity info */}
        {status.type === 'processing' && (
          <div className="queue-activity-info" style={{ marginTop: 16 }}>
            <Text type="secondary">
              <TeamOutlined /> {status.queueLength} users waiting
            </Text>
          </div>
        )}
      </Card>
    );
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.keys(sessionTimers).forEach(key => {
        if (key.endsWith('_interval')) {
          clearInterval(sessionTimers[key]);
        }
      });
    };
  }, []);

  console.log('ProjectsList render state:', { 
    loading, 
    projectsCount: projects.length, 
    error, 
    userRole,
    queueStatus
  });

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
          <Space>
            {getRoleIcon(userRole)}
            Projects ({userRole})
          </Space>
        </Title>
        
        {userRole === 'guest' ? (
          <Alert
            message="Guest Access"
            description="You can request access to projects. When a project is busy, you'll join the standard queue."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        ) : ['superadmin', 'admin', 'user'].includes(userRole) && (
          <Alert
            message={`${userRole.charAt(0).toUpperCase() + userRole.slice(1)} Access`}
            description={`You have ${userRole === 'superadmin' ? 'highest' : userRole === 'admin' ? 'high' : 'standard'} priority access. You can preempt guest users but will queue behind other ${userRole}s.`}
            type="success"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
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
              No projects found.
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