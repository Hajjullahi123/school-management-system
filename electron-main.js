const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const portfinder = require('portfinder'); // Fallback if 5115 is busy

let mainWindow;
let serverProcess;
const SERVER_PORT = 5115;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'electron-preload.js')
    },
    icon: path.join(__dirname, 'client/public/logo.png'), // Fallback icon path
    title: 'School Management System - Pro Desktop'
  });

  // Load the client (Built Vite build in Production)
  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, 'client/dist/index.html'));
  } else {
    // Development mode
    mainWindow.loadURL('http://localhost:5173');
  }

  // Handle external links by opening them in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startServer() {
  console.log('Starting backend server...');
  const serverPath = path.join(__dirname, 'server/index.js');
  
  // Set the environment for the server
  const env = { 
    ...process.env, 
    PORT: SERVER_PORT,
    DATABASE_URL: `file:${path.join(app.getPath('userData'), 'database.db')}`
  };

  // Initial Database Setup
  const dbPath = path.join(app.getPath('userData'), 'database.db');
  if (!fs.existsSync(dbPath)) {
    console.log('📦 Initializing local database from seed...');
    const seedPath = app.isPackaged 
      ? path.join(__dirname, 'server/prisma/dev.db') // If packaged, look in the installation dir
      : path.join(__dirname, 'server/prisma/dev.db'); // In dev, we can find it here
    
    try {
      if (fs.existsSync(seedPath)) {
        fs.copyFileSync(seedPath, dbPath);
        console.log('✅ Database initialized successfully.');
      } else {
        console.warn('⚠️ Warning: Seed database (dev.db) not found at ', seedPath);
      }
    } catch (err) {
      console.error('❌ Failed to initialize database:', err.message);
    }
  }

  serverProcess = spawn('node', [serverPath], { env });

  serverProcess.stdout.on('data', (data) => {
    console.log(`Server: ${data}`);
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`Server Error: ${data}`);
  });

  serverProcess.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
  });
}

app.on('ready', () => {
  startServer();
  // Wait a short bit for server to spin up, then create window
  setTimeout(createWindow, 3000);
});

app.on('window-all-closed', () => {
  // On Windows/Linux, quit app when all windows are closed
  if (process.platform !== 'darwin') {
    if (serverProcess) serverProcess.kill();
    app.quit();
  }
});

app.on('before-quit', () => {
  if (serverProcess) serverProcess.kill();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
