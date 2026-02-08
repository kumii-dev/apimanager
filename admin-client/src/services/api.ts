/**
 * API Client Service
 * Secure axios instance with interceptors
 * ISO 27001 A.14 - Secure Development
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { supabase } from './supabase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

/**
 * Create axios instance with defaults
 */
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor - add auth token
  client.interceptors.request.use(
    async (config) => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
      }

      // Add request ID for correlation
      config.headers['X-Request-ID'] = crypto.randomUUID();

      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor - handle errors and token refresh
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as any;

      // Handle 401 - token expired
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          // Refresh session
          const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError || !session) {
            // Refresh failed, redirect to login
            await supabase.auth.signOut();
            window.location.href = '/login';
            return Promise.reject(error);
          }

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${session.access_token}`;
          return client(originalRequest);
        } catch (refreshErr) {
          await supabase.auth.signOut();
          window.location.href = '/login';
          return Promise.reject(error);
        }
      }

      return Promise.reject(error);
    }
  );

  return client;
};

export const apiClient = createApiClient();

/**
 * API Service functions
 */

// Connectors
export const connectorsApi = {
  list: () => apiClient.get('/admin/connectors'),
  get: (id: string) => apiClient.get(`/admin/connectors/${id}`),
  create: (data: any) => apiClient.post('/admin/connectors', data),
  update: (id: string, data: any) => apiClient.patch(`/admin/connectors/${id}`, data),
  delete: (id: string) => apiClient.delete(`/admin/connectors/${id}`),
  rotateSecret: (id: string, newSecret: string) => 
    apiClient.post(`/admin/connectors/${id}/rotate-secret`, { newSecret }),
};

// Routes
export const routesApi = {
  list: () => apiClient.get('/admin/routes'),
  get: (id: string) => apiClient.get(`/admin/routes/${id}`),
  create: (data: any) => apiClient.post('/admin/routes', data),
  update: (id: string, data: any) => apiClient.patch(`/admin/routes/${id}`, data),
  delete: (id: string) => apiClient.delete(`/admin/routes/${id}`),
  test: (id: string, testData: any) => apiClient.post(`/admin/routes/${id}/test`, testData),
};

// Audit Logs
export const auditLogsApi = {
  list: (params?: any) => apiClient.get('/admin/audit-logs', { params }),
};

// Metrics
export const metricsApi = {
  get: () => apiClient.get('/admin/metrics'),
};

// Modules
export const modulesApi = {
  list: () => apiClient.get('/admin/modules'),
};
