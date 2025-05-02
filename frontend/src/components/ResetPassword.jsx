import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import '../styles/ResetPassword.css'; // Make sure this path is correct

const ResetPassword = () => {
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const urlToken = searchParams.get('token');
    if (urlToken) {
      setToken(urlToken);
    } else {
      setError('Invalid or missing reset token');
      navigate('/');
    }
  }, [searchParams, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post('http://localhost:5000/api/auth/reset-password', {
        token,
        newPassword
      });

      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/');
        }, 3000);
      }
    } catch (err) {
      console.error('Reset password error:', err);
      setError(err.response?.data?.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="reset-success-container">
        <h2>Password Reset Successful!</h2>
        <p>You will be redirected to the login page shortly.</p>
      </div>
    );
  }

  return (
    <div className="reset-wrapper">
      <div className="reset-container">
        <h2 className="reset-title">Reset Your Password</h2>
  
        {error && <div className="reset-error">{error}</div>}
  
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>New Password:</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
  
          <div className="form-group">
            <label>Confirm New Password:</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
  
          <button type="submit" className="reset-button" disabled={loading}>
            {loading ? 'Resetting Password...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
