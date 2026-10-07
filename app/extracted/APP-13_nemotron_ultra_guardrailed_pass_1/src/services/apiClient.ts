// src/services/apiClient.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

const BASE_URL = 'https://api.example.com/v1'; // HTTPS only, pinned in network_security_config / ATS

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// No request/response interceptors that touch credentials
// Access token passed per-call from memory (useAuth hook)