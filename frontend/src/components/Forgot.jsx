import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/ForgotPasswordPage.css';

const ForgotPasswordPage = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const navigate = useNavigate();

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      setEmailError('Please input your email!');
      return;
    }
    
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email!');
      return;
    }

    try {
      setLoading(true);
      setEmailError('');
      await axios.post('http://localhost:5000/api/auth/forgot-password', { email });
      alert('Password reset link sent to your email!');
      navigate('/');
    } catch (err) {
      console.error('Error:', err.response?.data?.message || err.message);
      alert(err.response?.data?.message || 'Failed to send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-card">
        <h2 className="card-title">Reset Your Password</h2>
        <p className="card-description">Enter your email to receive a reset link.</p>
        
        <form onSubmit={handleSubmit} className="forgot-password-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`form-input ${emailError ? 'input-error' : ''}`}
            />
            {emailError && (
              <div className="error-message">{emailError}</div>
            )}
          </div>
          
          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
        
        <div className="login-link">
          <span>Remember your password?{' '}</span>
          <a href="/login">Log in</a>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;