# 🚀 Quick Start - Batch Files Created!

## ✅ **3 Batch Files Created for Easy Startup**

I've created 3 batch files in your project folder that you can **double-click** to start the system:

```
c:\Users\IT-LAB\School Mn\
├── START-SERVER.bat   ← Start backend only (GREEN window)
├── START-CLIENT.bat   ← Start frontend only (BLUE window)
└── START-BOTH.bat     ← Start BOTH at once (RECOMMENDED) ⭐
```

---

## 🎯 **RECOMMENDED: Use START-BOTH.bat**

### **To Start the System:**

1. **Navigate to:** `c:\Users\IT-LAB\School Mn\`
2. **Double-click:** `START-BOTH.bat`
3. **Two windows will open:**
   - **Green Window** = Backend Server (port 5000)
   - **Blue Window** = Frontend Client (port 5173)
4. **Wait 10-15 seconds** for both to start
5. **Open browser:** http://localhost:5173
6. **Login with:**
   - Username: `admin`
   - Password: `admin123`

### **✅ That's it! The system is running!**

---

## 📋 **Individual Batch Files:**

### **1. START-SERVER.bat** (Green Window)
- Starts **backend only**
- Port: 5000
- Use when: Client is already running

### **2. START-CLIENT.bat** (Blue Window)
- Starts **frontend only**  
- Port: 5173
- Use when: Server is already running

### **3. START-BOTH.bat** ⭐ (Recommended)
- Starts **both server and client**
- Opens 2 windows automatically
- One-click solution!

---

## ⚠️ **IMPORTANT: Keep Windows Open!**

**DON'T close the green or blue windows!**

- **Green Window (Server)** must stay open
- **Blue Window (Client)** must stay open
- Closing them will **stop the services**

**You CAN close:**
- The yellow "Launcher" window
- Your browser (services keep running)

---

## 🛑 **To Stop the System:**

### **Option 1: Close the Windows**
- Close the **Green window** (server stops)
- Close the **Blue window** (client stops)

### **Option 2: Press Ctrl+C**
- In the green or blue window
- Press `Ctrl + C`
- Type `Y` and press Enter
- Window closes

---

## 🎯 **Quick Reference:**

| Action | What to Do |
|--------|------------|
| **Start System** | Double-click `START-BOTH.bat` |
| **Access System** | Open http://localhost:5173 |
| **Login** | admin / admin123 |
| **Stop System** | Close green & blue windows |
| **Restart** | Close windows, run `START-BOTH.bat` again |

---

## 🔧 **Troubleshooting:**

### **Problem: "Failed to Fetch"**
**Solution:** Server window (green) is not open
- Double-click `START-SERVER.bat`

### **Problem: "Can't reach the page"**
**Solution:** Client window (blue) is not open or wrong URL
- Double-click `START-CLIENT.bat`
- Make sure you're going to http://localhost:5173

### **Problem: "Port already in use"**
**Solution:** Service is already running
- Check TaskBar for existing windows
- Or close existing windows and restart

---

## 💡 **Pro Tips:**

1. **Create Desktop Shortcuts:**
   - Right-click `START-BOTH.bat`
   - Click "Create shortcut"
   - Drag shortcut to Desktop
   - Rename to "School Management System"

2. **Pin to Taskbar:**
   - Create shortcut first
   - Right-click shortcut
   - Click "Pin to taskbar"

3. **Daily Workflow:**
   - Double-click shortcut
   - Wait 15 seconds
   - Open browser
   - Start working!

4. **When Finished:**
   - Save your work
   - Close browser
   - Close green & blue windows
   - Done!

---

## 📁 **File Locations:**

All batch files are in:
```
c:\Users\IT-LAB\School Mn\
```

You can also find them by:
- Opening File Explorer
- Going to your project folder
- Looking for `.bat` files

---

## ✅ **What Each Window Shows:**

### **Green Window (Server):**
```
========================================
  School Management System
  Starting Backend Server...
========================================

Server running on port 5000
Database connected
```

### **Blue Window (Client):**
```
========================================
  School Management System
  Starting Frontend Client...
========================================

VITE v4.x.x ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: http://192.168.x.x:5173/
```

---

## 🎉 **You're All Set!**

**To start using your system:**

1. **Double-click** `START-BOTH.bat` in your project folder
2. **Wait** for both windows to show "ready" messages
3. **Open browser** to http://localhost:5173
4. **Login** with admin/admin123
5. **Start managing** your school!

---

## 📊 **System Status Check:**

| Component | Port | Check |
|-----------|------|-------|
| **Backend** | 5000 | http://localhost:5000/api/health |
| **Frontend** | 5173 | http://localhost:5173 |

If both URLs work, your system is running correctly! ✅

---

**Created on:** December 11, 2025  
**Status:** ✅ Ready to use  
**Next Step:** Double-click `START-BOTH.bat`! 🚀
