import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// Token management
export const getToken = () => {
  return localStorage.getItem('token');
};

export const setToken = (token) => {
  localStorage.setItem('token', token);
};

export const removeToken = () => {
  localStorage.removeItem('token');
};

export const getUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

export const setUser = (user) => {
  localStorage.setItem('user', JSON.stringify(user));
};

export const removeUser = () => {
  localStorage.removeItem('user');
};

// Check if user is authenticated
export const isAuthenticated = () => {
  const token = getToken();
  return !!token;
};

// API functions
export const login = async (email, password) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email,
      password
    });

    const { token, user } = response.data;
    setToken(token);
    setUser(user);

    // Set default authorization header for future requests
    axios.defaults.headers.common['x-auth-token'] = token;

    return { success: true, user };
  } catch (error) {
    return { 
      success: false, 
      message: error.response?.data || 'Login failed' 
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

    return { success: true, message: response.data };
  } catch (error) {
    return { 
      success: false, 
      message: error.response?.data || 'Registration failed' 
    };
  }
};

export const logout = () => {
  removeToken();
  removeUser();
  delete axios.defaults.headers.common['x-auth-token'];
};

// Setup axios interceptor for authentication
export const setupAuthInterceptor = () => {
  // Add token to all requests
  axios.interceptors.request.use(
    (config) => {
      const token = getToken();
      if (token) {
        config.headers['x-auth-token'] = token;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Handle authentication errors
  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        logout();
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );
}; 