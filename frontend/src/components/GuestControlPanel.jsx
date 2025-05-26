import React, { useState, useEffect } from 'react';
import { 
  Tabs, 
  Table, 
  Button, 
  Card, 
  Space, 
  Tag, 
  Modal, 
  notification, 
  Progress, 
  Typography, 
  Alert,
  Popconfirm,
  Badge,
  Statistic,
  Row,
  Col
} from 'antd';
import { 
  UserOutlined, 
  ClockCircleOutlined, 
  CheckOutlined, 
  CloseOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  TeamOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined
} from '@ant-design/icons';
import axios from 'axios';
import '../styles/GuestControlPanel.css';

const { TabPane } = Tabs;
const { Title, Text } = Typography;

const GuestControlPanel = ({ userRole }) => {
  const [loading, setLoading] = useState(false);
  const [activeSessions, setActiveSessions] = useState([]);
  const [allQueues, setAllQueues] = useState({});
  const [extensionRequests, setExtensionRequests] = useState([]);
  const [usageLogs, setUsageLogs] = useState([]);
  const [refreshInterval, setRefreshInterval] = useState(null);

  useEffect(() => {
    fetchAllData();
    
    // Set up auto-refresh every 10 seconds
    const interval = setInterval(fetchAllData, 10000);
    setRefreshInterval(interval);
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  const fetchAllData = async () => {
    await Promise.all([
      fetchActiveSessions(),
      fetchAllQueues(),
      fetchExtensionRequests(),
      userRole === 'superadmin' && fetchUsageLogs()
    ]);
  };

  const getAuthHeaders = () => ({
    headers: {
      'userid': localStorage.getItem('userId'),
      'email': localStorage.getItem('userEmail'),
      'role': localStorage.getItem('userRole')
    }
  });

  const fetchActiveSessions = async () => {
    try {
      const response = await axios.get(
        'http://localhost:5000/api/admin/guest-sessions',
        getAuthHeaders()
      );
      setActiveSessions(response.data);
    } catch (err) {
      console.error('Error fetching active sessions:', err);
    }
  };

  const fetchAllQueues = async () => {
    try {
      const response = await axios.get(
        'http://localhost:5000/api/admin/queues',
        getAuthHeaders()
      );
      setAllQueues(response.data);
    } catch (err) {
      console.error('Error fetching queues:', err);
    }
  };

  const fetchExtensionRequests = async () => {
    try {
      const response = await axios.get(
        'http://localhost:5000/api/admin/extension-requests',
        getAuthHeaders()
      );
      setExtensionRequests(response.data);
    } catch (err) {
      console.error('Error fetching extension requests:', err);
    }
  };

  const fetchUsageLogs = async () => {
    if (userRole !== 'superadmin') return;
    
    try {
      const response = await axios.get(
        'http://localhost:5000/api/admin/usage-logs',
        getAuthHeaders()
      );
      setUsageLogs(response.data);
    } catch (err) {
      console.error('Error fetching usage logs:', err);
    }
  };

  const handleApproveExtension = async (requestId) => {
    try {
      setLoading(true);
      await axios.post(
        `http://localhost:5000/api/admin/extension-requests/${requestId}/approve`,
        {},
        getAuthHeaders()
      );
      
      notification.success({
        message: 'Extension Approved',
        description: 'The extension request has been approved successfully.'
      });
      
      fetchExtensionRequests();
      fetchActiveSessions();
    } catch (err) {
      notification.error({
        message: 'Error',
        description: err.response?.data?.message || 'Failed to approve extension'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRejectExtension = async (requestId, reason = '') => {
    try {
      setLoading(true);
      await axios.post(
        `http://localhost:5000/api/admin/extension-requests/${requestId}/reject`,
        { reason },
        getAuthHeaders()
      );
      
      notification.success({
        message: 'Extension Rejected',
        description: 'The extension request has been rejected.'
      });
      
      fetchExtensionRequests();
    } catch (err) {
      notification.error({
        message: 'Error',
        description: err.response?.data?.message || 'Failed to reject extension'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTerminateSession = async (sessionId) => {
    try {
      setLoading(true);
      await axios.post(
        `http://localhost:5000/api/admin/guest-sessions/${sessionId}/terminate`,
        {},
        getAuthHeaders()
      );
      
      notification.success({
        message: 'Session Terminated',
        description: 'The guest session has been terminated successfully.'
      });
      
      fetchActiveSessions();
      fetchAllQueues();
    } catch (err) {
      notification.error({
        message: 'Error',
        description: err.response?.data?.message || 'Failed to terminate session'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetGuestCounter = async (userId) => {
    try {
      setLoading(true);
      await axios.post(
        `http://localhost:5000/api/admin/reset-guest-counter/${userId}`,
        {},
        getAuthHeaders()
      );
      
      notification.success({
        message: 'Counter Reset',
        description: 'Guest session counter has been reset successfully.'
      });
      
      fetchActiveSessions();
    } catch (err) {
      notification.error({
        message: 'Error',
        description: err.response?.data?.message || 'Failed to reset counter'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetAllCounters = async () => {
    try {
      setLoading(true);
      await axios.post(
        'http://localhost:5000/api/admin/reset-all-guest-counters',
        {},
        getAuthHeaders()
      );
      
      notification.success({
        message: 'All Counters Reset',
        description: 'All guest session counters have been reset successfully.'
      });
      
      fetchActiveSessions();
    } catch (err) {
      notification.error({
        message: 'Error',
        description: err.response?.data?.message || 'Failed to reset all counters'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeString) => {
    const date = new Date(timeString);
    return date.toLocaleString();
  };

  const formatDuration = (milliseconds) => {
    if (!milliseconds) return 'N/A';
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getTimeRemaining = (timerEnds) => {
    const now = new Date();
    const end = new Date(timerEnds);
    const remaining = end.getTime() - now.getTime();
    return Math.max(0, remaining);
  };

  // Statistics Cards
  const renderStatistics = () => {
    const totalActiveSessions = activeSessions.length;
    const totalInQueues = Object.values(allQueues).reduce((sum, queue) => sum + queue.length, 0);
    const pendingExtensions = extensionRequests.length;
    
    return (
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="Active Sessions"
              value={totalActiveSessions}
              prefix={<PlayCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="In Queue"
              value={totalInQueues}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Pending Extensions"
              value={pendingExtensions}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>
    );
  };

  // Active Sessions Table
  const activeSessionsColumns = [
    {
      title: 'Guest Email',
      dataIndex: 'email',
      key: 'email',
      render: (email) => (
        <Space>
          <UserOutlined />
          <Text>{email}</Text>
        </Space>
      )
    },
    {
      title: 'Project ID',
      dataIndex: 'projectId',
      key: 'projectId',
      render: (projectId) => <Tag color="blue">{projectId}</Tag>
    },
    {
      title: 'Time Remaining',
      dataIndex: 'timerEnds',
      key: 'timerEnds',
      render: (timerEnds) => {
        const remaining = getTimeRemaining(timerEnds);
        const percentage = Math.max(0, (remaining / 60000) * 100);
        
        return (
          <div style={{ minWidth: 120 }}>
            <Text>{formatDuration(remaining)}</Text>
            <Progress 
              percent={percentage} 
              size="small" 
              strokeColor={remaining < 15000 ? '#ff4d4f' : '#52c41a'}
              showInfo={false}
            />
          </div>
        );
      }
    },
    {
      title: 'Extended',
      dataIndex: 'extended',
      key: 'extended',
      render: (extended) => (
        <Tag color={extended ? 'green' : 'default'}>
          {extended ? 'Yes' : 'No'}
        </Tag>
      )
    },
    {
      title: 'Start Time',
      dataIndex: 'startTime',
      key: 'startTime',
      render: (time) => formatTime(time)
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Popconfirm
            title="Terminate Session"
            description="Are you sure you want to terminate this session?"
            onConfirm={() => handleTerminateSession(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="primary" danger size="small">
              Terminate
            </Button>
          </Popconfirm>
          <Button 
            size="small"
            onClick={() => handleResetGuestCounter(record.userId)}
          >
            Reset Counter
          </Button>
        </Space>
      )
    }
  ];

  // Extension Requests Table
  const extensionRequestsColumns = [
    {
      title: 'Guest Email',
      dataIndex: 'email',
      key: 'email'
    },
    {
      title: 'Project ID',
      dataIndex: 'projectId',
      key: 'projectId',
      render: (projectId) => <Tag color="blue">{projectId}</Tag>
    },
    {
      title: 'Requested At',
      dataIndex: 'requestedAt',
      key: 'requestedAt',
      render: (time) => formatTime(time)
    },
    {
      title: 'Current Timer Ends',
      dataIndex: 'currentTimerEnds',
      key: 'currentTimerEnds',
      render: (time) => formatTime(time)
    },
    {
      title: 'Extension Duration',
      dataIndex: 'requestedExtension',
      key: 'requestedExtension',
      render: (duration) => formatDuration(duration)
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button 
            type="primary" 
            icon={<CheckOutlined />}
            onClick={() => handleApproveExtension(record.id)}
            size="small"
          >
            Approve
          </Button>
          <Button 
            type="default" 
            icon={<CloseOutlined />}
            onClick={() => {
              Modal.confirm({
                title: 'Reject Extension Request',
                content: 'Are you sure you want to reject this extension request?',
                onOk: () => handleRejectExtension(record.id, 'Rejected by admin')
              });
            }}
            size="small"
          >
            Reject
          </Button>
        </Space>
      )
    }
  ];

  // Queue Management
  const renderQueueManagement = () => (
    <div>
      {Object.keys(allQueues).length === 0 ? (
        <Alert
          message="No Active Queues"
          description="There are currently no guests waiting in any project queues."
          type="info"
          showIcon
        />
      ) : (
        Object.entries(allQueues).map(([projectId, queue]) => (
          <Card 
            key={projectId} 
            title={`Project: ${projectId}`} 
            style={{ marginBottom: 16 }}
          >
            {queue.length === 0 ? (
              <Text type="secondary">No guests in queue</Text>
            ) : (
              <Table
                dataSource={queue.map((user, index) => ({ ...user, key: index }))}
                columns={[
                  {
                    title: 'Position',
                    key: 'position',
                    render: (_, __, index) => (
                      <Badge count={index + 1} style={{ backgroundColor: '#1890ff' }} />
                    )
                  },
                  {
                    title: 'Guest Email',
                    dataIndex: 'email',
                    key: 'email'
                  },
                  {
                    title: 'Joined At',
                    dataIndex: 'joinedAt',
                    key: 'joinedAt',
                    render: (time) => formatTime(time)
                  },
                  {
                    title: 'Priority',
                    dataIndex: 'priority',
                    key: 'priority',
                    render: (priority) => (
                      <Tag color={priority <= 2 ? 'red' : priority <= 4 ? 'orange' : 'default'}>
                        {priority}
                      </Tag>
                    )
                  }
                ]}
                pagination={false}
                size="small"
              />
            )}
          </Card>
        ))
      )}
    </div>
  );

  // Usage Logs (Superadmin only)
  const usageLogsColumns = [
    {
      title: 'Guest Email',
      dataIndex: 'email',
      key: 'email'
    },
    {
      title: 'Project ID',
      dataIndex: 'projectId',
      key: 'projectId',
      render: (projectId) => <Tag color="blue">{projectId}</Tag>
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const color = status === 'completed' ? 'green' : 
                    status === 'expired' ? 'orange' : 
                    status === 'terminated' ? 'red' : 'default';
        return <Tag color={color}>{status.toUpperCase()}</Tag>;
      }
    },
    {
      title: 'Start Time',
      dataIndex: 'startTime',
      key: 'startTime',
      render: (time) => formatTime(time)
    },
    {
      title: 'End Time',
      dataIndex: 'endTime',
      key: 'endTime',
      render: (time) => time ? formatTime(time) : 'N/A'
    },
    {
      title: 'Duration',
      dataIndex: 'duration',
      key: 'duration',
      render: (duration) => formatDuration(duration * 1000) // Convert seconds to milliseconds
    },
    {
      title: 'Extended',
      dataIndex: 'extended',
      key: 'extended',
      render: (extended) => (
        <Tag color={extended ? 'green' : 'default'}>
          {extended ? 'Yes' : 'No'}
        </Tag>
      )
    }
  ];

  return (
    <div className="">
      <div className="panel-header">
        <Title level={2}>Guest Management</Title>
        <Button 
          icon={<ReloadOutlined />} 
          onClick={fetchAllData}
          loading={loading}
        >
          Refresh
        </Button>
      </div>

      {renderStatistics()}

      <Tabs defaultActiveKey="active-sessions" type="card">
        <TabPane tab="Active Sessions" key="active-sessions">
          <Card>
            <div style={{ marginBottom: 16 }}>
              <Space>
                <Text strong>Active Guest Sessions</Text>
                {userRole === 'superadmin' && (
                  <Popconfirm
                    title="Reset All Counters"
                    description="This will reset session counters for all guests. Continue?"
                    onConfirm={handleResetAllCounters}
                    okText="Yes"
                    cancelText="No"
                  >
                    <Button type="default" size="small">
                      Reset All Counters
                    </Button>
                  </Popconfirm>
                )}
              </Space>
            </div>
            <Table
              dataSource={activeSessions}
              columns={activeSessionsColumns}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              loading={loading}
            />
          </Card>
        </TabPane>

        <TabPane tab="Queue Management" key="queue-management">
          <Card>
            <Title level={4}>Project Queues</Title>
            {renderQueueManagement()}
          </Card>
        </TabPane>

        <TabPane tab="Extension Requests" key="extension-requests">
          <Card>
            <Title level={4}>Pending Extension Requests</Title>
            {extensionRequests.length === 0 ? (
              <Alert
                message="No Pending Requests"
                description="There are currently no pending extension requests."
                type="info"
                showIcon
              />
            ) : (
              <Table
                dataSource={extensionRequests}
                columns={extensionRequestsColumns}
                rowKey="id"
                pagination={{ pageSize: 10 }}
                loading={loading}
              />
            )}
          </Card>
        </TabPane>

        {userRole === 'superadmin' && (
          <TabPane tab="Usage Logs" key="usage-logs">
            <Card>
              <Title level={5}>Guest Session History</Title>
              <Table
                dataSource={usageLogs}
                columns={usageLogsColumns}
                rowKey="id"
                pagination={{ pageSize: 5 }}
                loading={loading}
              />
            </Card>
          </TabPane>
        )}
      </Tabs>
    </div>
  );
};

export default GuestControlPanel;