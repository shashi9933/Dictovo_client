// API Configuration for different environments
const getApiUrl = () => {
  // Check if we're in development mode
  if (process.env.NODE_ENV === 'development') {
    return process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  }
  
  // Production mode - use Render URL
  return process.env.REACT_APP_RENDER_API_URL || 'https://dictovo-server.onrender.com/api';
};

export const API_CONFIG = {
  baseURL: getApiUrl(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
};

// Log the API URL for debugging (only in development)
if (process.env.NODE_ENV === 'development') {
  console.log('API Base URL:', API_CONFIG.baseURL);
}

export default API_CONFIG; 