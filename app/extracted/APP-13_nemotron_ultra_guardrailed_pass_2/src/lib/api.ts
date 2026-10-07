import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = 'https://api.example.com/v1';

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token refresh handled by useAuth hook
    }
    return Promise.reject(error);
  }
);