// API Helper - Centralized API calls
// This file provides a single place to manage all API endpoints

import { API_BASE_URL } from './config';

// Helper function to make API calls
export const apiCall = async (endpoint, options = {}) => {
  // Ensure no double slashes when joining base URL and endpoint
  const rawBase = API_BASE_URL || window.location.origin;
  const baseURL = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${baseURL}${path}`;

  console.log(`[API DEBUG] ${options.method || 'GET'} ${url} - Token: ${localStorage.getItem('token') ? 'Yes' : 'No'}`);

  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    credentials: 'include', // Important for cookies/sessions
    ...options
  };

  // Add authorization token if available
  const token = localStorage.getItem('token');
  if (token) {
    defaultOptions.headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, defaultOptions);

    // Parse JSON if possible
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const error = new Error(data?.error || data?.message || 'API call failed');
      error.response = {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      };
      throw error;
    }

    return {
      data,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      ok: response.ok
    };
  } catch (error) {
    console.error('API Call Error:', error);
    throw error;
  }
};

// Convenience methods
// These return the raw fetch Promise (Response object) for components that handle status/json themselves
export const api = {
  get: async (endpoint, options = {}) => {
    const baseURL = API_BASE_URL || window.location.origin;
    const url = `${baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    const token = localStorage.getItem('token');
    console.log(`[API GET] ${url} - Token: ${token ? 'Yes' : 'No'}`);
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return fetch(url, { ...options, method: 'GET', headers, credentials: 'include' });
  },

  post: async (endpoint, data, options = {}) => {
    const baseURL = API_BASE_URL || window.location.origin;
    const url = `${baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    const token = localStorage.getItem('token');
    console.log(`[API POST] ${url} - Token: ${token ? 'Yes' : 'No'}`);
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return fetch(url, { ...options, method: 'POST', headers, credentials: 'include', body: JSON.stringify(data) });
  },

  put: async (endpoint, data, options = {}) => {
    const baseURL = API_BASE_URL || window.location.origin;
    const url = `${baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return fetch(url, { ...options, method: 'PUT', headers, credentials: 'include', body: JSON.stringify(data) });
  },

  delete: async (endpoint, options = {}) => {
    const baseURL = API_BASE_URL || window.location.origin;
    const url = `${baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return fetch(url, { ...options, method: 'DELETE', headers, credentials: 'include' });
  },

  patch: async (endpoint, data, options = {}) => {
    const baseURL = API_BASE_URL || window.location.origin;
    const url = `${baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return fetch(url, { ...options, method: 'PATCH', headers, credentials: 'include', body: JSON.stringify(data) });
  }
};

// Export API_BASE_URL for direct use if needed
export { API_BASE_URL };
