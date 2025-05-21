// src/components/GuestLoginPage.js
import React, { useState } from 'react';
import { Form, Input, Button, Typography, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { MailOutlined } from '@ant-design/icons';
import axios from 'axios';
import '../styles/LoginPage.css';

const { Title, Text } = Typography;

const GuestLoginPage = () => {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  const onFinish = async (values) => {
    try {
      setLoading(true);
      setErrorMessage('');

      const res = await axios.post('http://localhost:5000/api/guests/login', {
        email: values.email
      });

      if (res.data) {
        // Store the email explicitly in localStorage along with the other data
        localStorage.setItem('userId', res.data.userId);
        localStorage.setItem('userEmail', values.email); // Store the email from the form
        localStorage.setItem('userRole', 'guest');
        message.success('Guest login successful!');
        navigate('/dashboard?tab=dashboard');
      }
    } catch (err) {
      console.error('Guest login failed:', err);
      setErrorMessage(err.response?.data?.message || 'Guest login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="">
      <div className="">
        <div className="">
          <Title level={3}>Guest Access</Title>
          <Text type="secondary">Enter your email to get temporary access</Text>

          <div className="login-form-container">
            {errorMessage && (
              <div className="error-message">
                <Text type="danger">{errorMessage}</Text>
              </div>
            )}
            
            <Form layout="vertical" onFinish={onFinish} className="login-form">
              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: 'Please input your email!' },
                  { type: 'email', message: 'Please enter a valid email!' }
                ]}
              >
                <Input 
                  prefix={<MailOutlined className="site-form-item-icon" />} 
                  placeholder="guest@example.com" 
                  size="large"
                />
              </Form.Item>

              <Form.Item>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  loading={loading} 
                  block 
                  className="login-button"
                >
                  {loading ? 'Signing in...' : 'Get Access'}
                </Button>
              </Form.Item>
            </Form>

            <div className="guest-login-footer">
              <Text>Already have an account? <a onClick={() => navigate('/')}>Regular login</a></Text>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuestLoginPage;