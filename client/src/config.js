// Network Configuration for Local Hosting
// Automatically detects the IP address used to access the site
// This prevents connection errors when IP addresses change

const isProduction = import.meta.env.PROD === true || process.env.NODE_ENV === 'production';

// If in production (built) or using a domain name/HTTPS, use origin
// This allows the app to work on Render, Vercel, or any hosting where frontend is served by backend
// or they are on the same domain.
export const API_BASE_URL = isProduction
  ? window.location.origin
  : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || /^(\d{1,3}\.){3}\d{1,3}$/.test(window.location.hostname)
    ? `http://${window.location.hostname}:5000`
    : window.location.origin);

export const CLIENT_URL = window.location.origin;

export const SERVER_IP = window.location.hostname;

export default {
  API_BASE_URL,
  CLIENT_URL,
  SERVER_IP
};
