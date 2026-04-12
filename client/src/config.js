// Network Configuration for Local Hosting
// Automatically detects the IP address and protocol used to access the site
// This prevents connection errors when IP addresses change or when accessing remotely

const isProduction = import.meta.env.PROD;
const isElectron = window.navigator.userAgent.toLowerCase().includes('electron') || window.location.origin.includes('file://');

const PRODUCTION_URL = 'https://school-management-system-bkat.onrender.com';
const DEFAULT_API_PORT = '5115';

// Helper to determine the correct API base URL
const getApiBaseUrl = () => {
  const { hostname, protocol, origin } = window.location;
  
  // Detect if we are running in a Capacitor/Mobile environment
  const isMobileApp = 
    protocol.includes('capacitor') || 
    hostname === 'localhost' && (window.location.port === '' || window.location.port === '80' || window.location.port === '443') ||
    window.location.href.includes('android_asset');

  // 1. Electron handling (Desktop App)
  if (isElectron) {
    return `http://localhost:${DEFAULT_API_PORT}`;
  }

  // 2. Mobile/Production Fallback
  // If we are on mobile OR in production, use the remote server
  if (isMobileApp || isProduction) {
    // If we are strictly on a hosted domain (not localhost), use that origin
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return origin;
    }
    // Otherwise (Mobile App or localhost-production), force the live server
    return PRODUCTION_URL;
  }

  // 3. Local Development (npm run dev)
  // dynamically use the hostname to support mobile access on the same network
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
