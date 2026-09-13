# 🖥️ DESKTOP APP GUIDE - School Management System Pro

The application has been enhanced with a native desktop environment using **Electron**. This guide explains how to develop, test, and package the desktop version.

---

## 🚀 QUICK START (FOR ADMINS)

### 1. Development Mode
To run the app in a desktop window while you work on it:
```bash
# Start the normal development servers (Client & Server)
npm run dev

# (In a new terminal) Launch the Electron Shell
npm run desktop:dev
```
*Note: In development mode, Electron loads `http://localhost:5173`.*

### 2. Testing the "Packaged" Experience
To simulate how the app looks after installation:
```bash
# 1. Build the client and prepare components
npm run build

# 2. Start Electron (It will automatically load client/dist/index.html)
npm run desktop:dev
```

### 3. Creating the Installer (Production Build)
To generate a standalone `.exe` installer for Windows:
```bash
npm run desktop:dist
```
*The installer will be generated in the `dist-desktop/` folder.*

---

## 🏗️ HOW THE DESKTOP APP WORKS

### **Architecture Overview**
The desktop version is an **all-in-one bundle**:
1.  **Electron Shell**: The main container (`electron-main.js`).
2.  **Background Server**: Automatically spawns the Node/Express server on **Port 5115**.
3.  **Local Database**: Uses a persistent **SQLite database** stored in your system's AppData folder.
4.  **Frontend**: Loads the React/Vite interface directly from disk.

### **Database Strategy**
- **Location**: `%APPDATA%/school-mn/database.db` (on Windows).
- **Persistence**: Your settings, students, and records stay safe even if you uninstall the app or update to a new version.
- **Offline Access**: No internet is required! The entire system runs locally.

---

## 🔧 TROUBLESHOOTING

### **"Port 5115 Busy"**
If the app says the port is in use:
1.  Check if another instance of the server is running.
2.  Restart the application.

### **"Database Connection Failed"**
1.  Verify the `server/prisma/schema.prisma` is up-to-date.
2.  Run `npm run build` to regenerate the Prisma client.

---

## ✅ FEATURES FOR DESKTOP
- [x] **Automatic Server Start**: No more running multiple terminals.
- [x] **Native Window**: Branded application icon and window controls.
- [x] **Offline Mode**: Works without an internet connection.
- [x] **Local Persistence**: Database stored in a secure user directory.
- [x] **One-Click Installer**: Simple setup for school administrators.

---

**Current Status**: 🛠️ Desktop Foundation Ready  
**Target Platform**: Windows (NSIS Installer)
