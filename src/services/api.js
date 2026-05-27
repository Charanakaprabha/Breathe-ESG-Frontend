import axios from 'axios';

// Create a direct, lightweight Axios instance targeting local Django API proxy
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

export default api;
