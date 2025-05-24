import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Button, Progress, notification, Modal, Space, Typography, Alert, Card, Row, Col, Spin } from 'antd';
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
import { LoadingOutlined } from '@ant-design/icons';
import '../styles/projectdashboard.css';

const { Title, Text } = Typography;
const { confirm } = Modal;

const ProjectDashboard = () => {
  const { projectId } = useParams();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  
  const [projectData, setProjectData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sessionTimer, setSessionTimer] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [userRole, setUserRole] = useState('');
  const [extensionRequested, setExtensionRequested] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    setUserRole(role);
    
    console.log('ProjectDashboard initialized:', { projectId, sessionId, role });
    
    fetchProjectData();
    
    // If guest with session, start timer
    if (role === 'guest' && sessionId) {
      startSessionTimer();
    }
  }, [projectId, sessionId]);

  const fetchProjectData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const userId = localStorage.getItem('userId');
      const email = localStorage.getItem('userEmail');
      const role = localStorage.getItem('userRole');
      
      console.log('Fetching project dashboard data:', { userId, role, projectId, sessionId });
      
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

      // UNIFIED API ENDPOINT - Use the same endpoint for all user types
      // The backend should handle role-based access control
      let apiUrl = `http://localhost:5000/api/projects/${projectId}/dashboard`;
      
      // Add session parameter if it exists (for guests)
      if (sessionId) {
        apiUrl += `?sessionId=${sessionId}`;
      }

      console.log('Making API request to:', apiUrl);
      
      const response = await axios.get(apiUrl, config);
      
      console.log('Project dashboard response:', response.data);
      
      // Validate and clean the response data
      const cleanedData = {
        ...response.data,
        devices: response.data.devices || {},
        vehicles: response.data.vehicles || {}
      };
      
      // Log the structure for debugging
      console.log('Cleaned project data structure:', {
        hasDevices: Object.keys(cleanedData.devices).length > 0,
        hasVehicles: Object.keys(cleanedData.vehicles).length > 0,
        deviceKeys: Object.keys(cleanedData.devices),
        vehicleKeys: Object.keys(cleanedData.vehicles)
      });
      
      setProjectData(cleanedData);
      setError('');
    } catch (err) {
      console.error('Error fetching project data:', err);
      console.error('Error response:', err.response?.data);
      
      if (err.response?.status === 401 || err.response?.status === 403) {
        const message = userRole === 'guest' 
          ? 'Your session has expired or you don\'t have access to this project.'
          : 'You don\'t have permission to access this project.';
          
        setError(message);
        
        notification.error({
          message: 'Access Denied',
          description: message,
          duration: 5
        });
        
        // Redirect after short delay
        setTimeout(() => {
          navigate('/dashboard?tab=devices');
        }, 3000);
      } else if (err.response?.status === 404) {
        setError('Project not found or dashboard data unavailable.');
      } else {
        const errorMessage = err.response?.data?.message || err.message || 'Failed to load project dashboard.';
        setError(errorMessage);
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

      console.log('Fetching session status for timer...');
      
      // Use unified queue status endpoint
      const response = await axios.get(
        `http://localhost:5000/api/projects/${projectId}/queue-status`,
        config
      );

      console.log('Session status response:', response.data);

      if (response.data.hasActiveSession && response.data.isCurrentUserSession && response.data.remainingTime) {
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
      } else {
        // Session not active - redirect back
        console.warn('No active session found for current user');
        handleSessionExpired();
      }
    } catch (err) {
      console.error('Error fetching session status:', err);
      // Don't redirect on timer error immediately, give user a chance
      notification.warning({
        message: 'Session Status Unknown',
        description: 'Unable to verify session status. Your access may be limited.',
        duration: 5
      });
    }
  };

  const handleSessionExpired = () => {
    notification.warning({
      message: 'Session Expired',
      description: 'Your access session has ended. Redirecting back to projects.',
      duration: 5
    });
    
    if (sessionTimer) {
      clearInterval(sessionTimer);
    }
    
    setTimeout(() => {
      navigate('/dashboard?tab=devices');
    }, 3000);
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

          // Use unified session end endpoint
          await axios.post(
            `http://localhost:5000/api/projects/${projectId}/end-session`,
            { sessionId },
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
          
          // Still redirect even if end session fails
          navigate('/dashboard?tab=devices');
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

      // Use unified extension request endpoint
      await axios.post(
        `http://localhost:5000/api/projects/${projectId}/request-extension`,
        { sessionId },
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

  const renderDeviceCard = (deviceId, device) => {
    // Safe rendering function for potentially complex data
    const safeRender = (value, defaultValue = 'N/A') => {
      if (value === null || value === undefined) return defaultValue;
      if (typeof value === 'string' || typeof value === 'number') return value;
      if (typeof value === 'object') {
        try {
          return JSON.stringify(value);
        } catch (e) {
          return defaultValue;
        }
      }
      return String(value);
    };

    return (
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
            className={`status-badge ${device.status?.toLowerCase() || 'unknown'}`}
          >
            {device.status || 'Unknown'}
          </Text>
        }
      >
        <Row gutter={16}>
          <Col span={12}>
            <Space>
              <FiBattery size={16} />
              <Text type="secondary">Energy: </Text>
              <Text>{safeRender(device.energy_usage)}W</Text>
            </Space>
          </Col>
          <Col span={12}>
            <Space>
              <FiThermometer size={16} />
              <Text type="secondary">Temp: </Text>
              <Text>{safeRender(device.temperature)}°C</Text>
            </Space>
          </Col>
        </Row>
        {device.last_updated && (
          <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: 8 }}>
            Updated: {new Date(device.last_updated).toLocaleTimeString()}
          </Text>
        )}
      </Card>
    );
  };

  const renderVehicleCard = (vehicleId, vehicle) => {
    // Handle location object properly
    const formatLocation = (location) => {
      if (!location) return 'Unknown';
      
      // If location is an object with lat/lng
      if (typeof location === 'object' && location.lat !== undefined && location.lng !== undefined) {
        return `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
      }
      
      // If location is a string
      if (typeof location === 'string') {
        return location;
      }
      
      // If location is an object but not lat/lng, try to stringify safely
      if (typeof location === 'object') {
        try {
          return JSON.stringify(location);
        } catch (e) {
          return 'Invalid location data';
        }
      }
      
      return 'Unknown';
    };

    return (
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
            <Text>{formatLocation(vehicle.location)}</Text>
          </Col>
          <Col span={12}>
            <Text type="secondary">Speed: </Text>
            <Text>{vehicle.speed || 0} km/h</Text>
          </Col>
        </Row>
        {vehicle.last_updated && (
          <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: 8 }}>
            Updated: {new Date(vehicle.last_updated).toLocaleTimeString()}
          </Text>
        )}
      </Card>
    );
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (sessionTimer) {
        clearInterval(sessionTimer);
      }
    };
  }, [sessionTimer]);

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
        <Text style={{ marginTop: 16, color: '#666' }}>Loading project dashboard...</Text>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '400px',
        padding: '40px',
        textAlign: 'center'
      }}>
        <Alert
          message="Dashboard Error"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 24, maxWidth: 500 }}
        />
        <Space>
          <Button 
            type="primary"
            icon={<FiArrowLeft />}
            onClick={() => navigate('/dashboard?tab=devices')}
          >
            Back to Projects
          </Button>
          <Button 
            onClick={fetchProjectData}
          >
            Retry
          </Button>
        </Space>
      </div>
    );
  }

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
                {projectData?.name || `Project ${projectId}`}
              </Title>
              <Text type="secondary">
                {projectData?.description || 'No description available'}
              </Text>
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
        {/* Debug Info - Only show in development */}
        {process.env.NODE_ENV === 'development' && (
          <div style={{ fontSize: 12, color: '#666', marginBottom: 16 }}>
            Debug: Role: {userRole}, Project: {projectId}, Session: {sessionId || 'None'}
          </div>
        )}

        {/* Devices Section */}
        {projectData?.devices && Object.keys(projectData.devices).length > 0 && (
          <div className="section">
            <Title level={4}>Devices ({Object.keys(projectData.devices).length})</Title>
            <Row gutter={[16, 16]}>
              {Object.entries(projectData.devices).map(([deviceId, device]) => {
                try {
                  return (
                    <Col xs={24} sm={12} md={8} lg={6} key={deviceId}>
                      {renderDeviceCard(deviceId, device)}
                    </Col>
                  );
                } catch (error) {
                  console.error(`Error rendering device ${deviceId}:`, error);
                  return (
                    <Col xs={24} sm={12} md={8} lg={6} key={deviceId}>
                      <Card size="small" title={`Device ${deviceId}`}>
                        <Text type="danger">Error loading device data</Text>
                      </Card>
                    </Col>
                  );
                }
              })}
            </Row>
          </div>
        )}

        {/* Vehicles Section */}
        {projectData?.vehicles && Object.keys(projectData.vehicles).length > 0 && (
          <div className="section">
            <Title level={4}>Vehicles ({Object.keys(projectData.vehicles).length})</Title>
            <Row gutter={[16, 16]}>
              {Object.entries(projectData.vehicles).map(([vehicleId, vehicle]) => {
                try {
                  return (
                    <Col xs={24} sm={12} md={8} lg={6} key={vehicleId}>
                      {renderVehicleCard(vehicleId, vehicle)}
                    </Col>
                  );
                } catch (error) {
                  console.error(`Error rendering vehicle ${vehicleId}:`, error);
                  return (
                    <Col xs={24} sm={12} md={8} lg={6} key={vehicleId}>
                      <Card size="small" title={`Vehicle ${vehicleId}`}>
                        <Text type="danger">Error loading vehicle data</Text>
                      </Card>
                    </Col>
                  );
                }
              })}
            </Row>
          </div>
        )}

        {/* No Data Available */}
        {(!projectData?.devices || Object.keys(projectData.devices).length === 0) &&
         (!projectData?.vehicles || Object.keys(projectData.vehicles).length === 0) && (
          <div className="section">
            <Alert
              message="No Data Available"
              description="This project doesn't have any devices or vehicles configured yet, or the data is still loading."
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            
            {/* Show some mock data for demo purposes */}
            <Title level={4}>Sample Dashboard</Title>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={8} lg={6}>
                <Card size="small" title="Demo Device" extra={<Text className="status-badge on">ON</Text>}>
                  <p>This is a sample device card showing how the dashboard would look with real data.</p>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Energy: 250W | Temp: 22°C
                  </Text>
                </Card>
              </Col>
              <Col xs={24} sm={12} md={8} lg={6}>
                <Card size="small" title="Demo Vehicle">
                  <p>Sample vehicle tracking data</p>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Location: 40.7128, -74.0060 | Speed: 35 km/h
                  </Text>
                </Card>
              </Col>
            </Row>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectDashboard;