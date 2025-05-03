import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import '../styles/ResetPassword.css'; // Ensure this path is correct

const ResetPassword = () => {
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const timeoutRef = useRef(null);

  useEffect(() => {
    const urlToken = searchParams.get('token');
    if (urlToken) {
      setToken(urlToken);
    } else {
      setError('Invalid or missing reset token');
      navigate('/');
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
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
        newPassword,
      });

      // Assume a 200 status means success.
      if (response.status === 200) {
        setSuccess(true);

        // Optionally, you can display a success message immediately.
        timeoutRef.current = setTimeout(() => {
          navigate('/'); // Change this to '/login' if that's your login route.
        }, 3000);
      } else {
        setError(response.data?.message || 'Something went wrong. Try again.');
      }
    } catch (err) {
      console.error('Reset password error:', err);
      setError(err.response?.data?.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-wrapper">
      <div className="reset-container">
        {!success ? (
          <>
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
          </>
        ) : (
          <div className="reset-success">
            <div className="success-icon">&#10004;</div>
            <h2>Password Reset Successful!</h2>
            <p>You will be redirected to the login page shortly.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;