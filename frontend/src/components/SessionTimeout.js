import React, { useState, useEffect } from 'react';
import { resetActivityTimer } from '../utils/auth';
import '../css/SessionTimeout.css';

const SessionTimeout = ({ isVisible, onExtend, onLogout, timeLeft }) => {
  const [countdown, setCountdown] = useState(timeLeft);

  useEffect(() => {
    if (isVisible && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            onLogout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isVisible, countdown, onLogout]);

  const handleExtend = () => {
    resetActivityTimer();
    setCountdown(timeLeft);
    onExtend();
  };

  if (!isVisible) return null;

  return (
    <div className="session-timeout-overlay">
      <div className="session-timeout-modal">
        <div className="session-timeout-header">
          <h3>Session Timeout Warning</h3>
        </div>
        <div className="session-timeout-content">
          <p>Your session will expire in <strong>{countdown} seconds</strong> due to inactivity.</p>
          <p>Would you like to extend your session?</p>
        </div>
        <div className="session-timeout-actions">
          <button 
            className="btn-extend" 
            onClick={handleExtend}
          >
            Extend Session
          </button>
          <button 
            className="btn-logout" 
            onClick={onLogout}
          >
            Logout Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionTimeout; 