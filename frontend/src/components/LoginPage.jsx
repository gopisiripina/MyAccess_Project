import React, { useState } from 'react';
import { Form, Input, Image, Button, Typography, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import axios from 'axios';
import '../styles/LoginPage.css';
import image from '../assets/img.jpg';

const { Title, Text } = Typography;

const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  const onFinish = async (values) => {
    try {
      setLoading(true);
      setErrorMessage(''); // Clear previous error messages

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
          navigate('/change-password', {
            state: {
              userId: res.data.userId,
              email: values.email,
              currentPassword: values.password
            }
          });
          return;
        }

        localStorage.setItem('userId', res.data.user.id);
        localStorage.setItem('userEmail', res.data.user.email);
        localStorage.setItem('userRole', res.data.user.role);
        localStorage.setItem('userData', JSON.stringify(res.data.user));

        message.success(res.data.message || 'Login successful!');
        navigate('/dashboard');
      } else {
        setErrorMessage('Login failed: Invalid response from server');
      }

    } catch (err) {
      console.error('Login failed:', err.response?.data?.message || err.message);
      
      // Check specifically for "Invalid credentials" message
      if (err.response?.data?.message === "Invalid credentials") {
        setErrorMessage("Invalid credentials");
      } else {
        setErrorMessage(err.response?.data?.message || 'Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    navigate('/forgot');
  };

  return (
    <div className="login-page">
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

          <Title level={3}>Get Started</Title>
          <Text type="secondary">Welcome to Fillianta – Let's log you in</Text>

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
                  prefix={<UserOutlined className="site-form-item-icon" />} 
                  placeholder="test@domain.com" 
                  size="large"
                  status={errorMessage ? "error" : ""}
                />
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
                <Input.Password 
                  prefix={<LockOutlined className="site-form-item-icon" />}
                  placeholder="Enter your password"
                  size="large"
                  status={errorMessage ? "error" : ""}
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
                  {loading ? 'Logging in...' : 'Log in'}
                </Button>
              </Form.Item>
            </Form>
          </div>
        </div>

        <div className="login-right">
          <div className="tagline">
            <div className="tagline-text">
              <Image
                src={image}
                alt="Fillianta Logo"
                preview={false}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;