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
  
  // 1. Electron handling (Desktop App)
  if (isElectron) {
    return `http://localhost:${DEFAULT_API_PORT}`;
  }

  // 2. Production Environment Check (Critical for Mobile & Hosted)
  if (isProduction) {
    // If we are on a Mobile App (Capacitor/Android) or built Electron,
    // hostname will often be 'localhost' or 'capacitor://'
    // In this case, we MUST use the remote server address.
    if (hostname === 'localhost' || hostname === '127.0.0.1' || protocol.includes('capacitor')) {
      return PRODUCTION_URL;
    }
    // Generic hosted web (Render, etc.) - use the current address
    return origin; 
  }

  // 3. Localhost/Development handling (npm run dev on your own PC)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `http://localhost:${DEFAULT_API_PORT}`;
  }

  // 4. Local Network Access (e.g. 192.168.x.x or Public IP)
  // Accessing your PC from your phone on the same WiFi
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
