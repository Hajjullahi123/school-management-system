// Network Configuration for Local Hosting
// Automatically detects the IP address and protocol used to access the site
// This prevents connection errors when IP addresses change or when accessing remotely

const isProduction = import.meta.env.PROD;
const isElectron = window.navigator.userAgent.toLowerCase().includes('electron') || window.location.origin.includes('file://');

const PRODUCTION_URL = 'https://educatechportal.com';
const DEFAULT_API_PORT = '3000';

// Helper to determine the correct API base URL
const getApiBaseUrl = () => {
  const { hostname, protocol, origin } = window.location;
  
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // 1. Electron handling (Desktop App)
  if (isElectron) {
    return `http://localhost:${DEFAULT_API_PORT}`;
  }

  // 2. Hosted Domain handling (e.g., educatechportal.com or custom school domains)
  // Standard web domains serving over HTTP/HTTPS should always use same-origin requests without custom ports
  const isLocalhostOrIP = 
    hostname === 'localhost' || 
    hostname === '127.0.0.1' || 
    /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);

  if (!isLocalhostOrIP) {
    return origin;
  }

  // Detect if we are running in a Capacitor/Mobile environment
  const isMobileApp = 
    protocol.includes('capacitor') || 
    window.location.href.includes('android_asset');

  // 3. Mobile App or Production on localhost
  if (isMobileApp || isProduction) {
    return PRODUCTION_URL;
  }

  // 4. Local Development (npm run dev on localhost or local network IP)
  return `${protocol}//${hostname}:${DEFAULT_API_PORT}`;
};

export const API_BASE_URL = getApiBaseUrl();
export const CLIENT_URL = window.location.origin;
export const SERVER_IP = window.location.hostname;

export default {
  API_BASE_URL,
  CLIENT_URL,
  SERVER_IP
};
