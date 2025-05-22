import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Button, Progress, notification, Modal, Space, Typography, Alert, Card, Row, Col } from 'antd';
import { 
  FiArrowLeft, 
  FiHome, 
  FiZap, 
  FiSettings, 
  FiTruck, 
  FiClock,
  FiLogOut,
  FiThermometer,
  FiBattery
} from 'react-icons/fi';
import { WiDaySunny, WiRain, WiSnow } from 'react-icons/wi';
import '../styles/projectdashboard.css';

const { Title, Text } = Typography;
const { confirm } = Modal;

const ProjectDashboard = () => {
  const { projectId } = useParams();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  
  const [projectData, setProjectData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionTimer, setSessionTimer] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [userRole, setUserRole] = useState('');
  const [extensionRequested, setExtensionRequested] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    setUserRole(role);
    fetchProjectData();
    
    // If guest with session, start timer
    if (role === 'guest' && sessionId) {
      startSessionTimer();
    }
  }, [projectId, sessionId]);

  const fetchProjectData = async () => {
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

      const response = await axios.get(
        `http://localhost:5000/api/projects/${projectId}/dashboard`,
        config
      );
      
      setProjectData(response.data);
      setError('');
    } catch (err) {
      console.error('Error fetching project data:', err);
      setError('Failed to load project dashboard. Please try again.');
      
      // If access denied for guest, redirect back
      if (err.response?.status === 403 && userRole === 'guest') {
        notification.error({
          message: 'Access Expired',
          description: 'Your session has expired. Redirecting back to projects.',
        });
        setTimeout(() => {
          navigate('/dashboard?tab=devices');
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  const startSessionTimer = async () => {
    if (!sessionId) return;
    
    try {
      const userId = localStorage.getItem('userId');
      const email = localStorage.getItem('userEmail');
      
      const config = {
        headers: {
          'userid': userId,
          'email': email,
          'role': 'guest'
        }
      };

      const response = await axios.get(
        `http://localhost:5000/api/guests/projects/${projectId}/queue-status`,
        config
      );

      if (response.data.hasActiveSession && response.data.remainingTime) {
        setTimeRemaining(response.data.remainingTime);
        
        const timer = setInterval(() => {
          setTimeRemaining(prev => {
            if (prev <= 1000) {
              clearInterval(timer);
              handleSessionExpired();
              return 0;
            }
            return prev - 1000;
          });
        }, 1000);
        
        setSessionTimer(timer);
      }
    } catch (err) {
      console.error('Error fetching session status:', err);
    }
  };

  const handleSessionExpired = () => {
    notification.warning({
      message: 'Session Expired',
      description: 'Your access session has ended. Redirecting back to projects.',
      duration: 3
    });
    
    setTimeout(() => {
      navigate('/dashboard?tab=devices');
    }, 2000);
  };

  const handleEndSession = () => {
    if (!sessionId) return;
    
    confirm({
      title: 'End Session',
      content: 'Are you sure you want to end your session early?',
      onOk: async () => {
        try {
          const userId = localStorage.getItem('userId');
          const email = localStorage.getItem('userEmail');
          
          const config = {
            headers: {
              'userid': userId,
              'email': email,
              'role': 'guest'
            }
          };

          await axios.post(
            `http://localhost:5000/api/guests/sessions/${sessionId}/end`,
            {},
            config
          );

          notification.success({
            message: 'Session Ended',
            description: 'You have successfully ended your session.',
          });

          if (sessionTimer) {
            clearInterval(sessionTimer);
          }

          navigate('/dashboard?tab=devices');
        } catch (err) {
          console.error('Error ending session:', err);
          notification.error({
            message: 'Error',
            description: 'Failed to end session properly.',
          });
        }
      }
    });
  };

  const handleRequestExtension = async () => {
    if (!sessionId || extensionRequested) return;
    
    try {
      const userId = localStorage.getItem('userId');
      const email = localStorage.getItem('userEmail');
      
      const config = {
        headers: {
          'userid': userId,
          'email': email,
          'role': 'guest'
        }
      };

      await axios.post(
        `http://localhost:5000/api/guests/sessions/${sessionId}/request-extension`,
        {},
        config
      );

      setExtensionRequested(true);
      notification.success({
        message: 'Extension Requested',
        description: 'Your extension request has been submitted and is pending admin approval.',
      });
    } catch (err) {
      console.error('Error requesting extension:', err);
      notification.error({
        message: 'Extension Request Failed',
        description: err.response?.data?.message || 'Failed to request extension.',
      });
    }
  };

  const formatTime = (milliseconds) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  };

  const getProjectIcon = () => {
    if (projectData?.name?.includes('Smart Home')) return <FiHome className="project-icon" />;
    if (projectData?.name?.includes('Industrial')) return <FiSettings className="project-icon" />;
    if (projectData?.name?.includes('Fleet')) return <FiTruck className="project-icon" />;
    return <FiZap className="project-icon" />;
  };

  const getStatusIcon = (status) => {
    if (status === 'ON') return <WiDaySunny className="status-icon online" />;
    if (status === 'OFF') return <WiRain className="status-icon offline" />;
    return <WiSnow className="status-icon warning" />;
  };

  const renderDeviceCard = (deviceId, device) => (
    <Card
      key={deviceId}
      className="device-card"
      size="small"
      title={
        <Space>
          {getStatusIcon(device.status)}
          <Text strong>{device.name || deviceId}</Text>
        </Space>
      }
      extra={
        <Text 
          className={`status-badge ${device.status.toLowerCase()}`}
        >
          {device.status}
        </Text>
      }
    >
      <Row gutter={16}>
        <Col span={12}>
          <Space>
            <FiBattery size={16} />
            <Text type="secondary">Energy: </Text>
            <Text>{device.energy_usage || 'N/A'}W</Text>
          </Space>
        </Col>
        <Col span={12}>
          <Space>
            <FiThermometer size={16} />
            <Text type="secondary">Temp: </Text>
            <Text>{device.temperature || 'N/A'}°C</Text>
          </Space>
        </Col>
      </Row>
      {device.last_updated && (
        <Text type="secondary" style={{ fontSize: '12px' }}>
          Updated: {new Date(device.last_updated).toLocaleTimeString()}
        </Text>
      )}
    </Card>
  );

  const renderVehicleCard = (vehicleId, vehicle) => (
    <Card
      key={vehicleId}
      className="vehicle-card"
      size="small"
      title={
        <Space>
          <FiTruck />
          <Text strong>{vehicle.name || vehicleId}</Text>
        </Space>
      }
    >
      <Row gutter={16}>
        <Col span={12}>
          <Text type="secondary">Location: </Text>
          <Text>{vehicle.location || 'Unknown'}</Text>
        </Col>
        <Col span={12}>
          <Text type="secondary">Speed: </Text>
          <Text>{vehicle.speed || 0} km/h</Text>
        </Col>
      </Row>
    </Card>
  );

  useEffect(() => {
    return () => {
      if (sessionTimer) {
        clearInterval(sessionTimer);
      }
    };
  }, [sessionTimer]);

  if (loading) return (
    <div className="dashboard-loading">
      <div className="loading-spinner"></div>
      <p>Loading project data...</p>
    </div>
  );

  if (error) return (
    <div className="dashboard-error">
      <div className="error-icon">!</div>
      <p>{error}</p>
      <Button 
        type="primary"
        icon={<FiArrowLeft />}
        onClick={() => navigate('/dashboard?tab=devices')}
      >
        Back to Projects
      </Button>
    </div>
  );

  return (
    <div className="project-dashboard">
      {/* Header Section */}
      <div className="dashboard-header">
        <div className="header-left">
          <Button 
            type="text" 
            icon={<FiArrowLeft />}
            onClick={() => navigate('/dashboard?tab=devices')}
            className="back-btn"
          >
            Back
          </Button>
          <div className="project-info">
            {getProjectIcon()}
            <div>
              <Title level={3} className="project-title">
                {projectData?.name || 'Project Dashboard'}
              </Title>
              <Text type="secondary">{projectData?.description}</Text>
            </div>
          </div>
        </div>

        {/* Guest Session Controls */}
        {userRole === 'guest' && sessionId && (
          <div className="session-controls">
            <div className="timer-display">
              <FiClock className="timer-icon" />
              <div className="timer-info">
                <Text strong>Time Remaining</Text>
                <div className="timer-value">
                  {formatTime(timeRemaining)}
                </div>
                <Progress 
                  percent={Math.max(0, (timeRemaining / 60000) * 100)} 
                  size="small" 
                  strokeColor={timeRemaining < 15000 ? '#ff4d4f' : '#52c41a'}
                  showInfo={false}
                />
              </div>
            </div>
            
            <Space>
              <Button 
                type="default"
                onClick={handleRequestExtension}
                disabled={extensionRequested}
                size="small"
              >
                {extensionRequested ? 'Extension Requested' : 'Request Extension'}
              </Button>
              <Button 
                type="primary" 
                danger
                icon={<FiLogOut />}
                onClick={handleEndSession}
                size="small"
              >
                End Session
              </Button>
            </Space>
          </div>
        )}
      </div>

      {/* Alert for low time remaining */}
      {userRole === 'guest' && timeRemaining > 0 && timeRemaining < 15000 && (
        <Alert
          message="Session Ending Soon"
          description={`Your session will end in ${formatTime(timeRemaining)}. Request an extension if you need more time.`}
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Content Section */}
      <div className="dashboard-content">
        {/* Devices Section */}
        {projectData?.devices && Object.keys(projectData.devices).length > 0 && (
          <div className="section">
            <Title level={4}>Devices</Title>
            <Row gutter={[16, 16]}>
              {Object.entries(projectData.devices).map(([deviceId, device]) => (
                <Col xs={24} sm={12} md={8} lg={6} key={deviceId}>
                  {renderDeviceCard(deviceId, device)}
                </Col>
              ))}
            </Row>
          </div>
        )}

        {/* Vehicles Section */}
        {projectData?.vehicles && Object.keys(projectData.vehicles).length > 0 && (
          <div className="section">
            <Title level={4}>Vehicles</Title>
            <Row gutter={[16, 16]}>
              {Object.entries(projectData.vehicles).map(([vehicleId, vehicle]) => (
                <Col xs={24} sm={12} md={8} lg={6} key={vehicleId}>
                  {renderVehicleCard(vehicleId, vehicle)}
                </Col>
              ))}
            </Row>
          </div>
        )}

        {/* No Data Message */}
        {(!projectData?.devices || Object.keys(projectData.devices).length === 0) &&
         (!projectData?.vehicles || Object.keys(projectData.vehicles).length === 0) && (
          <div className="no-data">
            <Text type="secondary">No devices or vehicles found in this project.</Text>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectDashboard;