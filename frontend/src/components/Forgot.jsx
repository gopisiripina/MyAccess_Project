import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

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
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: 400, padding: 24, border: '1px solid #ccc', borderRadius: 8 }}>
        <h2 style={{ marginBottom: 16 }}>Reset Your Password</h2>
        <p style={{ marginBottom: 24 }}>Enter your email to receive a reset link.</p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="email">Email</label><br />
            <input
              type="email"
              id="email"
              placeholder="test@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: 8,
                borderRadius: 4,
                border: emailError ? '1px solid red' : '1px solid #ccc',
                marginTop: 4
              }}
            />
            {emailError && (
              <div style={{ color: 'red', fontSize: 12, marginTop: 4 }}>{emailError}</div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: 10,
              backgroundColor: '#1890ff',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <p>
            Remember your password?{' '}
            <a href="/" style={{ color: '#1890ff' }}>Log in</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
