import axios from 'axios';

// Create a direct, lightweight Axios instance targeting local Django API proxy
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://breathe-esg-backend-77b2.onrender.com/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach a unique X-Device-ID header for client-side data isolation
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined' && window.localStorage) {
    let deviceId = localStorage.getItem('esg_device_id');
    if (!deviceId) {
      // Generate a simple, unique ID
      deviceId = 'dev_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now().toString(36);
      localStorage.setItem('esg_device_id', deviceId);
    }
    config.headers['X-Device-ID'] = deviceId;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;
