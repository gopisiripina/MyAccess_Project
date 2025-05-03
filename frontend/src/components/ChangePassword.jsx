import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Typography, message } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import '../styles/LoginPage.css'; // Reuse login page styles

const { Title, Text } = Typography;

const ChangePassword = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Extract state passed from login page
  const { userId, email, currentPassword } = location.state || {};
  
  useEffect(() => {
    // Apply the same styling as login page
    document.body.classList.add('login-page-body');
    
    // Redirect to login if accessed directly without state
    if (!userId || !email || !currentPassword) {
      message.error('Invalid access. Please login first.');
      navigate('/');
    }
    
    return () => {
      document.body.classList.remove('login-page-body');
    };
  }, [userId, email, currentPassword, navigate]);

  const handlePasswordChange = async (values) => {
    try {
      setLoading(true);
      
      const config = {
        headers: {
          'Content-Type': 'application/json',
        }
      };
      
      const changePasswordData = {
        userId,
        currentPassword,
        newPassword: values.newPassword
      };
      
      const res = await axios.post('http://localhost:5000/api/auth/change-password', changePasswordData, config);
      
      // Check for message instead of success flag
      if (res.data && res.data.message) {
        message.success('Password changed successfully! Please login with your new password.');
        
        // Navigate back to login page after successful password change
        setTimeout(() => {
          // Force a full page navigation to ensure clean state
          window.location.href = '/';
        }, 1500); // Short delay to let user read the message
      } else {
        message.error('Failed to change password. Please try again.');
      }
    } catch (err) {
      console.error('Password change failed:', err.response?.data?.message || err.message);
      message.error(err.response?.data?.message || 'Password change failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-left" style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}>
        <Title level={4}>Change Your Password</Title>
        <Text type="secondary">Your account requires a password change</Text>
        
        <div className="login-form-container">
          <Form layout="vertical" onFinish={handlePasswordChange} className="login-form">
            <Form.Item
              name="newPassword"
              label="New Password"
              rules={[
                { required: true, message: 'Please input your new password!' },
                { min: 8, message: 'Password must be at least 8 characters!' },
                { 
                  pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
                  message: 'Password must contain at least one uppercase, one lowercase, one number and one special character!'
                }
              ]}
            >
              <Input.Password placeholder="Enter new password" />
            </Form.Item>
            
            <Form.Item
              name="confirmPassword"
              label="Confirm New Password"
              dependencies={['newPassword']}
              rules={[
                { required: true, message: 'Please confirm your new password!' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('newPassword') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('The two passwords do not match!'));
                  },
                }),
              ]}
            >
              <Input.Password placeholder="Confirm new password" />
            </Form.Item>
            
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block className="login-button">
                Change Password
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;