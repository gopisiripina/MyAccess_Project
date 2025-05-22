import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, Form, Input, Button, Alert, Typography, Space } from 'antd';
import { UserOutlined, MailOutlined, ArrowLeftOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const GuestLoginPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const onFinish = async (values) => {
    try {
      setLoading(true);
      setError('');

      const response = await axios.post('http://localhost:5000/api/guests/login', {
        email: values.email
      });

      if (response.data.userId) {
        // Store guest credentials
        localStorage.setItem('userId', response.data.userId);
        localStorage.setItem('userEmail', values.email);
        localStorage.setItem('userRole', 'guest');
        
        // Redirect to devices page
        navigate('/dashboard?tab=devices');
      }
    } catch (err) {
      console.error('Guest login error:', err);
      setError(
        err.response?.data?.message || 
        'Failed to login as guest. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <Card 
        style={{ 
          width: '100%', 
          maxWidth: 400,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <UserOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
          <Title level={2} style={{ margin: 0 }}>Guest Access</Title>
          <Text type="secondary">
            Enter your email to access projects as a guest
          </Text>
        </div>

        {error && (
          <Alert
            message="Login Failed"
            description={error}
            type="error"
            closable
            onClose={() => setError('')}
            style={{ marginBottom: 16 }}
          />
        )}

        <Form
          name="guest-login"
          onFinish={onFinish}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="email"
            label="Email Address"
            rules={[
              {
                required: true,
                message: 'Please enter your email address'
              },
              {
                type: 'email',
                message: 'Please enter a valid email address'
              }
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="Enter your email"
              autoComplete="email"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              style={{ height: 48 }}
            >
              {loading ? 'Logging in...' : 'Continue as Guest'}
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Space>
            <Button 
              type="link" 
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/')}
            >
              Back to Login
            </Button>
          </Space>
        </div>

        <div style={{ 
          marginTop: 24, 
          padding: 16, 
          backgroundColor: '#f0f2f5', 
          borderRadius: 6 
        }}>
          <Title level={5} style={{ margin: 0, marginBottom: 8 }}>
            Guest Access Info:
          </Title>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li><Text type="secondary">60 second sessions per project</Text></li>
            <li><Text type="secondary">Queue-based access when busy</Text></li>
            <li><Text type="secondary">Can request time extensions</Text></li>
            <li><Text type="secondary">Access to devices page only</Text></li>
          </ul>
        </div>
      </Card>
    </div>
  );
};

export default GuestLoginPage;