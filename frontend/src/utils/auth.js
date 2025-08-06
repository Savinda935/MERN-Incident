import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// Auto logout configuration
const AUTO_LOGOUT_DELAY = 10 * 60 * 1000; // 10 minutes in milliseconds
const WARNING_DELAY = 8 * 60 * 1000; // Show warning 2 minutes before logout
let logoutTimer = null;
let warningTimer = null;
let activityListeners = [];
let onWarningCallback = null;

// Initialize activity monitoring
const initializeActivityMonitoring = () => {
  // Reset timer on any user activity
  const resetLogoutTimer = () => {
    if (logoutTimer) {
      clearTimeout(logoutTimer);
    }
    if (warningTimer) {
      clearTimeout(warningTimer);
    }
    
    // Set warning timer
    warningTimer = setTimeout(() => {
      if (onWarningCallback) {
        onWarningCallback();
      }
    }, WARNING_DELAY);
    
    // Set logout timer
    logoutTimer = setTimeout(() => {
      console.log('Auto logout due to inactivity');
      logout();
    }, AUTO_LOGOUT_DELAY);
  };

  // Activity events to monitor
  const activityEvents = [
    'mousedown',
    'mousemove',
    'keypress',
    'scroll',
    'touchstart',
    'click'
  ];

  // Add event listeners for user activity
  activityEvents.forEach(event => {
    document.addEventListener(event, resetLogoutTimer, true);
    activityListeners.push({ event, handler: resetLogoutTimer });
  });

  // Start the initial timer
  resetLogoutTimer();
};

// Clear activity monitoring
const clearActivityMonitoring = () => {
  if (logoutTimer) {
    clearTimeout(logoutTimer);
    logoutTimer = null;
  }
  if (warningTimer) {
    clearTimeout(warningTimer);
    warningTimer = null;
  }

  // Remove all activity listeners
  activityListeners.forEach(({ event, handler }) => {
    document.removeEventListener(event, handler, true);
  });
  activityListeners = [];
};

// Set warning callback
export const setWarningCallback = (callback) => {
  onWarningCallback = callback;
};

export const login = async (email, password) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email,
      password
    });

    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      // Initialize activity monitoring after successful login
      initializeActivityMonitoring();
      
      return { success: true, user: response.data.user };
    } else {
      return { success: false, message: 'Login failed' };
    }
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Login failed'
    };
  }
};

export const register = async (username, email, password) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/register`, {
      username,
      email,
      password
    });

    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      // Initialize activity monitoring after successful registration
      initializeActivityMonitoring();
      
      return { success: true, user: response.data.user };
    } else {
      return { success: false, message: 'Registration failed' };
    }
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Registration failed'
    };
  }
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  
  // Clear activity monitoring
  clearActivityMonitoring();
  
  // Redirect to login page
  window.location.href = '/login';
};

export const getToken = () => {
  return localStorage.getItem('token');
};

export const getUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

export const isAuthenticated = () => {
  const token = getToken();
  return !!token;
};

export const setupAuthInterceptor = () => {
  // Add request interceptor to include token
  axios.interceptors.request.use(
    (config) => {
      const token = getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Add response interceptor to handle auth errors
  axios.interceptors.response.use(
    (response) => {
      return response;
    },
    (error) => {
      if (error.response?.status === 401) {
        // Token expired or invalid
        logout();
      }
      return Promise.reject(error);
    }
  );
};

// Check if user is logged in and initialize activity monitoring
export const initializeAuth = () => {
  if (isAuthenticated()) {
    initializeActivityMonitoring();
  }
};

// Manual logout function for user-initiated logout
export const manualLogout = () => {
  clearActivityMonitoring();
  logout();
};

// Reset activity timer (can be called from components)
export const resetActivityTimer = () => {
  if (isAuthenticated()) {
    // Clear existing timers
    if (logoutTimer) {
      clearTimeout(logoutTimer);
    }
    if (warningTimer) {
      clearTimeout(warningTimer);
    }
    
    // Restart timers
    warningTimer = setTimeout(() => {
      if (onWarningCallback) {
        onWarningCallback();
      }
    }, WARNING_DELAY);
    
    logoutTimer = setTimeout(() => {
      console.log('Auto logout due to inactivity');
      logout();
    }, AUTO_LOGOUT_DELAY);
  }
}; 