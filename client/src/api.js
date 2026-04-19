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


  const isFormData = options.body instanceof FormData;
  
  const defaultOptions = {
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
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

    let data;
    const contentType = response.headers.get('content-type');
    
    // Check if the response is actually JSON before trying to parse it
    if (contentType && contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch (parseError) {
        data = await response.text();
        console.error('[API JSON Error] Failed to parse JSON even though Content-Type was set:', data.substring(0, 100));
      }
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      // If we got an HTML response instead of JSON (common with 404s or server errors hitting fallbacks)
      if (typeof data === 'string' && (data.trim().startsWith('<') || data.trim().includes('<!DOCTYPE'))) {
        const error = new Error(`Server returned HTML instead of JSON (${response.status} ${response.statusText}). This usually happens if the API route is incorrect or the server is down.`);
        error.response = { status: response.status, statusText: response.statusText, data: 'HTML Content HIDDEN' };
        throw error;
      }

      const error = new Error(data?.error || data?.message || typeof data === 'string' ? data : 'API call failed');
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

    const isFormData = data instanceof FormData;
    const headers = { ...options.headers };
    if (!isFormData) {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    }
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const body = isFormData ? data : JSON.stringify(data);
    return fetch(url, { ...options, method: 'POST', headers, credentials: 'include', body });
  },

  put: async (endpoint, data, options = {}) => {
    const baseURL = API_BASE_URL || window.location.origin;
    const url = `${baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    const token = localStorage.getItem('token');

    const isFormData = data instanceof FormData;
    const headers = { ...options.headers };
    if (!isFormData) {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    }
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const body = isFormData ? data : JSON.stringify(data);
    return fetch(url, { ...options, method: 'PUT', headers, credentials: 'include', body });
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
  },

  postForm: async (endpoint, formData, options = {}) => {
    const baseURL = API_BASE_URL || window.location.origin;
    const url = `${baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    const token = localStorage.getItem('token');
    // For FormData, we must NOT set Content-Type header so the browser sets it with the boundary
    const headers = { ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return fetch(url, { ...options, method: 'POST', headers, credentials: 'include', body: formData });
  }
};

// Export API_BASE_URL for direct use if needed
export { API_BASE_URL };
