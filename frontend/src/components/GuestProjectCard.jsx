import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Typography, message, Progress, Alert, Tag, Tooltip, Modal, InputNumber } from 'antd';
import { 
  ClockCircleOutlined, 
  UserOutlined, 
  CrownOutlined, 
  StarOutlined, 
  ExclamationCircleOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import axios from 'axios';
import '../styles/GuestProjectCard.css';

const { Text, Title } = Typography;
const { confirm } = Modal;

const GuestProjectDashboard = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId');
  
  const [project, setProject] = useState(null);
  const [accessState, setAccessState] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [inQueue, setInQueue] = useState(false);
  const [queuePosition, setQueuePosition] = useState(null);
  const [queueDetails, setQueueDetails] = useState([]);
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [extensionModalVisible, setExtensionModalVisible] = useState(false);
  const [extensionMinutes, setExtensionMinutes] = useState(15);
  const [realTimeStatus, setRealTimeStatus] = useState(null);

  useEffect(() => {
    const fetchProjectDetails = async () => {
      try {
        const res = await axios.get(
          `http://localhost:5000/api/projects/${projectId}`,
          { headers: { userid: userId } }
        );
        setProject(res.data);
      } catch (err) {
        message.error('Failed to load project details');
        navigate('/dashboard?tab=devices');
      }
    };

    const fetchAccessState = async () => {
      try {
        const res = await axios.get(
          `http://localhost:5000/api/guests/projects/${projectId}/access-state`,
          { headers: { userid: userId } }
        );
        
        setAccessState(res.data);
        setIsMaintenance(res.data.maintenanceMode);
        setMaintenanceMessage(res.data.maintenanceMessage);
        
        if (res.data.inQueue) {
          setInQueue(true);
          setQueuePosition(res.data.position);
          setQueueDetails(res.data.queueDetails || []);
        }
        
        if (res.data.activeSession) {
          startSessionTimer(res.data.sessionId, res.data.sessionEnds);
        }
      } catch (err) {
        message.error('Failed to load project status');
      } finally {
        setLoading(false);
      }
    };

    fetchProjectDetails();
    fetchAccessState();
    
    // WebSocket for real-time updates
    const ws = new WebSocket(`ws://localhost:5000/ws/projects/${projectId}/queue`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      switch(data.type) {
        case 'queue_update':
          setQueuePosition(data.position);
          setQueueDetails(data.queueDetails);
          break;
        case 'access_granted':
          setInQueue(false);
          startSessionTimer(data.sessionId, data.sessionEnds);
          // Already on project page, no need to navigate
          break;
        case 'priority_override':
          if (data.kicked) {
            navigate('/dashboard?tab=devices');
          }
          break;
        case 'maintenance_toggle':
          setIsMaintenance(data.active);
          setMaintenanceMessage(data.message);
          break;
        case 'status_update':
          setRealTimeStatus(data);
          break;
        default:
          break;
      }
    };

    return () => ws.close();
  }, [projectId, userId, navigate]);

  const requestAccess = async () => {
    try {
      setLoading(true);
      const res = await axios.post(
        `http://localhost:5000/api/guests/projects/${projectId}/request-access`,
        {},
        { headers: { userid: userId } }
      );

      if (res.data.accessGranted) {
        startSessionTimer(res.data.sessionId, res.data.sessionEnds);
      } else {
        setInQueue(true);
        setQueuePosition(res.data.position);
        setQueueDetails(res.data.queueDetails);
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to request access');
    } finally {
      setLoading(false);
    }
  };

  const cancelQueueRequest = async () => {
    confirm({
      title: 'Leave Queue?',
      icon: <ExclamationCircleOutlined />,
      content: 'You will lose your current position in the queue.',
      onOk: async () => {
        try {
          await axios.delete(
            `http://localhost:5000/api/guests/projects/${projectId}/queue`,
            { headers: { userid: userId } }
          );
          setInQueue(false);
          setQueuePosition(null);
          message.success('Left the queue');
          navigate('/dashboard?tab=devices');
        } catch (err) {
          message.error('Failed to leave queue');
        }
      }
    });
  };

  const requestSessionExtension = async (minutes = null) => {
    try {
      const res = await axios.post(
        `http://localhost:5000/api/guests/projects/${projectId}/extension-request`,
        { minutes: minutes || extensionMinutes },
        { headers: { userid: userId } }
      );
      message.success(res.data.message || 'Extension requested');
      setExtensionModalVisible(false);
    } catch (err) {
      message.error(err.response?.data?.message || 'Extension request failed');
    }
  };

  const startSessionTimer = (sessionId, endTime) => {
    const end = new Date(endTime).getTime();
    const updateTimer = () => {
      const now = new Date().getTime();
      const remaining = end - now;
      
      if (remaining <= 0) {
        clearInterval(timer);
        message.warning('Session ended');
        navigate('/dashboard?tab=devices');
      } else {
        setTimeLeft(Math.floor(remaining / 1000));
      }
    };

    const timer = setInterval(updateTimer, 1000);
    updateTimer();

    return () => clearInterval(timer);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const renderQueueBadge = (userType) => {
    switch(userType) {
      case 'superadmin': return <CrownOutlined style={{ color: 'gold' }} />;
      case 'admin': return <CrownOutlined style={{ color: 'silver' }} />;
      case 'priority': return <StarOutlined style={{ color: 'orange' }} />;
      default: return <UserOutlined />;
    }
  };

  const getPriorityTag = () => {
    if (!project?.priority) return null;
    return (
      <Tag 
        color={project.priority === 'high' ? 'red' : 'orange'} 
        icon={<ThunderboltOutlined />}
      >
        {project.priority === 'high' ? 'High Priority' : 'Medium Priority'}
      </Tag>
    );
  };

  if (loading) {
    return (
      <div className="guest-project-dashboard loading">
        <div className="loading-spinner">Loading project data...</div>
      </div>
    );
  }

  return (
    <div className="guest-project-dashboard">
      <div className="dashboard-header">
        <Button onClick={() => navigate('/dashboard?tab=devices')} className="back-button">
          Back to Projects
        </Button>
        <Title level={2}>
          {project?.name || 'Project Dashboard'}
          {getPriorityTag()}
        </Title>
        <div className="session-status">
          {accessState?.hasAccess && (
            <Tag color="green">
              Session Time: {formatTime(timeLeft)}
            </Tag>
          )}
        </div>
      </div>

      <div className="dashboard-content">
        {isMaintenance ? (
          <Alert 
            message="Maintenance Mode" 
            description={maintenanceMessage || 'This dashboard is currently undergoing maintenance.'}
            type="error" 
            showIcon
            className="maintenance-alert"
          />
        ) : accessState?.hasAccess ? (
          <div className="project-content">
            <Alert
              message={`Guest Session Active (${formatTime(timeLeft)} remaining)`}
              type="success"
              showIcon
              className="session-alert"
            />
            <div className="dashboard-panel">
              <Card title="Project Dashboard Content">
                <p>This is where the actual project dashboard content would be displayed.</p>
                <p>As a guest user, you have limited access to this project's features.</p>
                <p>Your session will automatically end in {formatTime(timeLeft)}.</p>
              </Card>
            </div>
            <div className="dashboard-controls">
              <Button 
                onClick={() => setExtensionModalVisible(true)}
                className="extension-button"
              >
                Request More Time
              </Button>
            </div>
          </div>
        ) : inQueue ? (
          <div className="queue-status">
            <Alert 
              message={`Queue Position: ${queuePosition}`}
              description={`Estimated wait: ~${Math.ceil(queuePosition * 1.5)} minutes`}
              type="info"
              showIcon
              className="queue-alert"
            />
            
            <div className="queue-progress-container">
              <Progress 
                percent={Math.max(5, 100 - (queuePosition * 5))} 
                status="active" 
                format={() => `Position ${queuePosition}`}
              />
            </div>
            
            <div className="queue-details">
              <Text strong>Next in Line:</Text>
              <div className="queue-tags">
                {queueDetails.slice(0, 3).map((user, index) => (
                  <Tooltip 
                    key={index} 
                    title={`${user.type} - ${user.email}`}
                  >
                    <Tag className="queue-tag">
                      {renderQueueBadge(user.type)} {index + 1}. {user.email.split('@')[0]}
                    </Tag>
                  </Tooltip>
                ))}
              </div>
            </div>
            
            <Button 
              danger
              onClick={cancelQueueRequest}
              className="leave-queue-button"
            >
              Leave Queue
            </Button>
          </div>
        ) : (
          <div className="access-controls">
            {accessState?.isAvailable ? (
              <div className="request-access">
                <Alert
                  message="This project dashboard is available for guest access."
                  description="Click the button below to request access for 60 minutes."
                  type="info"
                  showIcon
                  className="available-alert"
                />
                <Button 
                  type="primary" 
                  onClick={requestAccess}
                  loading={loading}
                  className="request-button"
                  icon={<ClockCircleOutlined />}
                >
                  Request Access (60 min)
                </Button>
              </div>
            ) : (
              <Alert 
                message="Dashboard in Use"
                description="A higher priority user is currently using this dashboard."
                type="warning"
                showIcon
                className="in-use-alert"
              />
            )}
          </div>
        )}
      </div>

      <Modal
        title="Request Time Extension"
        visible={extensionModalVisible}
        onOk={() => requestSessionExtension()}
        onCancel={() => setExtensionModalVisible(false)}
      >
        <div style={{ marginBottom: 16 }}>
          <label>Additional minutes: </label>
          <InputNumber 
            min={1} 
            max={60} 
            defaultValue={15} 
            value={extensionMinutes}
            onChange={setExtensionMinutes}
          />
        </div>
      </Modal>
    </div>
  );
};

export default GuestProjectDashboard;