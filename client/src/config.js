// Network Configuration for Local Hosting
// Automatically detects the IP address used to access the site
// This prevents connection errors when IP addresses change

const isProduction = import.meta.env.PROD;

// If in production (built) or using a domain name/HTTPS, use origin
// This allows the app to work on Render, Vercel, or any hosting where frontend is served by backend
// or they are on the same domain.
// detect Port
const currentPort = window.location.port;

const PRODUCTION_URL = 'https://school-management-system-bkat.onrender.com';

const isElectron = window.navigator.userAgent.toLowerCase().includes('electron') || window.location.origin.includes('file://');

const CURRENT_LOCAL_IP = '192.168.43.66';

export const API_BASE_URL = isProduction
  ? (isElectron 
    ? 'http://localhost:5115'
    : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.origin.includes('capacitor://')
      ? PRODUCTION_URL
      : window.location.origin))
  : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? (currentPort !== '5115' ? `http://${window.location.hostname}:5115` : window.location.origin)
    : `http://${CURRENT_LOCAL_IP}:5115`);


export const CLIENT_URL = window.location.origin;

export const SERVER_IP = window.location.hostname;

export default {
  API_BASE_URL,
  CLIENT_URL,
  SERVER_IP
};
