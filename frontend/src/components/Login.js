import React, { useState, useEffect } from 'react';
import { login, register, setupAuthInterceptor } from '../utils/auth';
import '../css/Login.css';

const Login = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    remember: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setupAuthInterceptor();
  }, []);

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value
    });
    setError(''); // Clear error when user types
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let result;
      if (isLogin) {
        result = await login(formData.email, formData.password);
      } else {
        result = await register(formData.username, formData.email, formData.password);
        if (result.success) {
          // If registration successful, try to login
          result = await login(formData.email, formData.password);
        }
      }
      
      if (result.success) {
        if (onLoginSuccess) {
          onLoginSuccess(result.user);
        } else {
          window.location.href = '/';
        }
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-header">
        <h1 className="login-title">Welcome Back</h1>
        <p className="login-subtitle">Sign in to your account</p>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {!isLogin && (
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <div className="input-wrapper">
              <i className="fas fa-user input-icon"></i>
              <input
                type="text"
                id="username"
                name="username"
                className="form-control"
                placeholder="Enter your username"
                value={formData.username}
                onChange={handleChange}
                required={!isLogin}
                disabled={loading}
              />
            </div>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <div className="input-wrapper">
            <i className="fas fa-envelope input-icon"></i>
            <input
              type="email"
              id="email"
              name="email"
              className="form-control"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <div className="input-wrapper">
            <i className="fas fa-lock input-icon"></i>
            <input
              type="password"
              id="password"
              name="password"
              className="form-control"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>
        </div>

        <div className="checkbox-group">
          <div className="remember-me">
            <input
              type="checkbox"
              id="remember"
              name="remember"
              checked={formData.remember}
              onChange={handleChange}
              disabled={loading}
            />
            <label htmlFor="remember">Remember me</label>
          </div>
          <a href="#" className="forgot-link">Forgot password?</a>
        </div>

        <button type="submit" className="btn-login" disabled={loading}>
          {loading ? (
            <>
              <span className="spinner"></span>
              Signing In...
            </>
          ) : (
            <>
              <i className="fas fa-sign-in-alt btn-icon"></i>
              {isLogin ? 'Sign In' : 'Create Account'}
            </>
          )}
        </button>
      </form>

      <div className="login-footer">
        <p className="toggle-mode">
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <a href="#" onClick={(e) => { e.preventDefault(); setIsLogin(!isLogin); }}>
            {isLogin ? 'Sign up' : 'Sign in'}
          </a>
        </p>
      </div>
    </div>
  );
};

export default Login; 