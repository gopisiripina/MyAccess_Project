import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Typography, message } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import '../styles/ChangePassword.css'; // Use dedicated CSS file

const { Title, Text } = Typography;

const ChangePassword = () => {
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  // Extract state passed from login page
  const { userId, email, currentPassword } = location.state || {};

  useEffect(() => {
    // Redirect to login if accessed directly without state
    if (!userId || !email || !currentPassword) {
      message.error('Invalid access. Please login first.');
      navigate('/');
    }
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

      if (res.data && res.data.message) {
        message.success('Password changed successfully! Please login with your new password.');
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
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

  // Check password strength
  const checkPasswordStrength = (password) => {
    if (!password) {
      setPasswordStrength('');
      return;
    }
    
    let strength = 0;
    
    // Has number
    if (/\d/.test(password)) strength++;
    // Has lowercase
    if (/[a-z]/.test(password)) strength++;
    // Has uppercase
    if (/[A-Z]/.test(password)) strength++;
    // Has special char
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    // Has min length
    if (password.length >= 8) strength++;
    
    if (strength < 3) {
      setPasswordStrength('weak');
    } else if (strength < 5) {
      setPasswordStrength('medium');
    } else {
      setPasswordStrength('strong');
    }
  };

  return (
    <div className="change-password-page">
      <div className="change-password-container">
        <div className="change-password-logo">
          <div className="change-password-logo-icon">
            <svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
              <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" />
            </svg>
          </div>
        </div>

        <div className="change-password-header">
          <Title level={4}>Change Your Password</Title>
          <Text type="secondary">Your account requires a password change</Text>
        </div>

        <div className="change-password-form-container">
          <Form layout="vertical" onFinish={handlePasswordChange} className="change-password-form">
            <Form.Item
              name="newPassword"
              label="New Password"
              rules={[
                { required: true, message: 'Please input your new password!' },
                { min: 8, message: 'Password must be at least 8 characters!' },
                {
                  pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
                  message: 'Password must meet all requirements below'
                }
              ]}
            >
              <Input.Password 
                placeholder="Enter new password" 
                onChange={(e) => checkPasswordStrength(e.target.value)}
              />
            </Form.Item>
            
            {passwordStrength && (
              <div className="password-strength-indicator">
                <div className={`password-strength-bar strength-${passwordStrength}`}></div>
              </div>
            )}
            
            <div className="password-requirements">
              <p>Password must contain:</p>
              <ul>
                <li>At least 8 characters</li>
                <li>One uppercase letter</li>
                <li>One lowercase letter</li>
                <li>One number</li>
                <li>One special character (@$!%*?&)</li>
              </ul>
            </div>

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
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading} 
                block 
                className="change-password-button"
              >
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