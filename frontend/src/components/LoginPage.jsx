import React, { useState, useEffect } from 'react';
import { Form, Input, Image, Button, Typography, message, Modal } from 'antd';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/LoginPage.css';
import image from '../assets/img.jpg';
const { Title, Text } = Typography;

const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const [changePasswordModalVisible, setChangePasswordModalVisible] = useState(false);
  const [userIdForPasswordChange, setUserIdForPasswordChange] = useState(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const navigate = useNavigate();
  
  useEffect(() => {
    document.body.classList.add('login-page-body');
    return () => {
      document.body.classList.remove('login-page-body');
    };
  }, []);

  const onFinish = async (values) => {
    try {
      setLoading(true);
      
      const config = {
        headers: {
          'Content-Type': 'application/json',
        }
      };
      
      const loginData = {
        email: values.email,
        password: values.password
      };
      
      const res = await axios.post('http://localhost:5000/api/auth/login', loginData, config);
      
      if (res.data) {
        if (res.data.requirePasswordChange) {
          // Handle first-time login requiring password change
          setUserIdForPasswordChange(res.data.userId);
          setCurrentPassword(values.password); // Store the initial password
          setChangePasswordModalVisible(true);
          return;
        }
        
        // Normal login flow
        localStorage.setItem('userId', res.data.user.id);
        localStorage.setItem('userEmail', res.data.user.email);
        localStorage.setItem('userRole', res.data.user.role);
        localStorage.setItem('userData', JSON.stringify(res.data.user));
        
        // Redirect based on user role
        redirectBasedOnRole(res.data.user.role);
        
        message.success(res.data.message || 'Login successful!');
      } else {
        message.error('Login failed: Invalid response from server');
      }
      
    } catch (err) {
      console.error('Login failed:', err.response?.data?.message || err.message);
      message.error(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };
  const handleForgotPassword = () => {
    navigate('/forgot');
  };
  
  const redirectBasedOnRole = (role) => {
    switch(role) {
      case 'superadmin':
        navigate('/superadmin-dashboard');
        break;
      case 'admin':
        navigate('/admin-dashboard');
        break;
      case 'user':
        navigate('/user-dashboard');
        break;
      default:
        navigate('/dashboard');
    }
  };

  const handlePasswordChange = async (values) => {
    try {
      setLoading(true);
      
      const config = {
        headers: {
          'Content-Type': 'application/json',
        }
      };
      
      const changePasswordData = {
        userId: userIdForPasswordChange,
        currentPassword: currentPassword,
        newPassword: values.newPassword
      };
      
      const res = await axios.post('http://localhost:5000/api/auth/change-password', changePasswordData, config);
      
      if (res.data) {
        message.success(res.data.message || 'Password changed successfully!');
        setChangePasswordModalVisible(false);
        
        // Automatically login with new credentials
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
          email: localStorage.getItem('userEmail'),
          password: values.newPassword
        }, config);
        
        if (loginRes.data) {
          localStorage.setItem('userId', loginRes.data.user.id);
          localStorage.setItem('userEmail', loginRes.data.user.email);
          localStorage.setItem('userRole', loginRes.data.user.role);
          localStorage.setItem('userData', JSON.stringify(loginRes.data.user));
          
          redirectBasedOnRole(loginRes.data.user.role);
        }
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
      <div className="login-left">
        <div className="login-logo">
          <div className="logo-icon">
            <svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
              <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" />
            </svg>
          </div>
        </div>
        
        <Title level={4}>Get Started</Title>
        <Text type="secondary">Welcome to Fillianta – Let's log you in</Text>
        
        <div className="login-form-container">
          <Form layout="vertical" onFinish={onFinish} className="login-form">
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Please input your email!' },
                { type: 'email', message: 'Please enter a valid email!' }
              ]}
            >
              <Input placeholder="test@domain.com" />
            </Form.Item>
            
            <Form.Item
  name="password"
  label="Password"
  rules={[{ required: true, message: 'Please input your password!' }]}
  extra={
    <div className="forgot-password" onClick={handleForgotPassword}>
      Forgot?
    </div>
  }
>
  <Input.Password />
</Form.Item>
            
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block className="login-button">
                Log in
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>

      <div className="login-right">
        <div className="tagline">
          <div className="tagline-text">
            <Image
              height={400}
              width={400}
              src={image}
              alt="Logo"
            />
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      <Modal
        title="Change Your Password"
        visible={changePasswordModalVisible}
        onCancel={() => setChangePasswordModalVisible(false)}
        footer={null}
        closable={false}
      >
        <Form layout="vertical" onFinish={handlePasswordChange}>
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
            <Button type="primary" htmlType="submit" loading={loading} block>
              Change Password
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default LoginPage;