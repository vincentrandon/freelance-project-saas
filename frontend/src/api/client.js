import axios from 'axios';
import i18n from '../i18n';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost/api';

const client = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token and language header
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add Accept-Language header based on current i18n language
    const currentLanguage = i18n.language || 'en';
    config.headers['Accept-Language'] = currentLanguage;

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');

      if (refreshToken) {
        try {
          const response = await axios.post(`${API_URL}/auth/token/refresh/`, {
            refresh: refreshToken,
          });

          const { access } = response.data;
          localStorage.setItem('access_token', access);

          originalRequest.headers.Authorization = `Bearer ${access}`;
          return client(originalRequest);
        } catch (err) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/signin';
          return Promise.reject(err);
        }
      }
    }

    return Promise.reject(error);
  }
);

export default client;
