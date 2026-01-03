# Accountant Login Fix - Summary

## Problem
When trying to sign in as an accountant, the system showed "API call failed" error.

## Root Causes Identified
1. **Double `/api` prefix in URLs**: The `API_BASE_URL` in config.js incorrectly included `/api` suffix, but all API calls throughout the codebase already use `/api/` prefix, creating invalid URLs like `http://localhost:3000/api/api/auth/login`
2. **API wrapper incompatibility**: The `api.js` helper was returning a custom response object that didn't match the native fetch Response interface, breaking the `.json()` and `.ok` property checks
3. **Accountant password mismatch**: The accountant user's password hash didn't match "accountant123"

## Fixes Applied

### 1. Fixed config.js
- Changed `API_BASE_URL` from `http://${SERVER_IP}:3000/api` to `http://${SERVER_IP}:3000`
- Since all API calls in the codebase use `/api/...` prefix, the base URL should NOT include `/api`

### 2. Fixed api.js
- Simplified all API methods (get, post, put, delete) to use native `fetch` directly
- This ensures the response has proper `.json()`, `.ok`, and other standard properties
- Removed the custom `apiCall` wrapper that was modifying the response structure

### 3. Reset Accountant Password
- Created `setup-accountant.js` script to verify and reset accountant credentials
- Password has been reset to: **accountant123**

## Accountant Login Credentials
```
Username: accountant
Password: accountant123
```

## How to Test
1. Make sure the server is running on port 3000
2. Make sure the client is running on port 5173
3. Navigate to the login page
4. Enter:
   - Username: `accountant`
   - Password: `accountant123`
5. Click "Sign in"

## Technical Details

### URL Structure
- **Client**: `http://<IP>:5173`
- **API Base**: `http://<IP>:3000` (configured in `config.js`)
- **Login Endpoint**: `http://<IP>:3000/api/auth/login` (correct)
- **Previous (wrong)**: `http://<IP>:3000/api/api/auth/login`

### Files Modified
1. `client/src/config.js` - Removed `/api` from API_BASE_URL
2. `client/src/api.js` - Simplified to use native fetch responses
3. `server/setup-accountant.js` - Created for accountant user management

## Next Steps
If you still encounter issues:
1. Check browser console (F12) for specific error messages
2. Check server terminal for backend error logs
3. Verify both client and server are running
4. Check that you're accessing the correct IP address
