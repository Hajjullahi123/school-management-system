# 🔧 PowerShell Execution Policy Workaround

## ⚠️ **Issue:**

When trying to run `npm run dev`, you get this error:

```
npm : File C:\Program Files\nodejs\npm.ps1 cannot be loaded because running 
scripts is disabled on this system.
CategoryInfo: SecurityError: (:) [], PSSecurityException
```

---

## ✅ **Solution - 3 Options:**

### **Option 1: Use Command Prompt (Recommended)**

Instead of PowerShell, use Command Prompt (cmd):

1. **Open Command Prompt:**
   - Press `Windows + R`
   - Type `cmd`
   - Press Enter

2. **Start Server:**
   ```cmd
   cd "c:\Users\IT-LAB\School Mn\server"
   npm run dev
   ```

3. **Open ANOTHER Command Prompt** (don't close the first!)

4. **Start Client:**
   ```cmd
   cd "c:\Users\IT-LAB\School Mn\client"
   npm run dev
   ```

✅ **Both should now be running!**

---

### **Option 2: Use VS Code Terminal**

VS Code terminals usually work even if PowerShell is restricted:

1. **Open VS Code** in your project folder

2. **Open Terminal 1** (Ctrl + `)

3. **Run Server:**
   ```bash
   cd server
   npm run dev
   ```

4. **Click the "+" button** to open Terminal 2

5. **Run Client:**
   ```bash
   cd client
   npm run dev
   ```

✅ **Both running in separate terminals!**

---

### **Option 3: Enable PowerShell Scripts (Admin Required)**

If you have admin rights, you can fix PowerShell permanently:

1. **Run PowerShell as Administrator:**
   - Right-click Start menu
   - Click "Windows PowerShell (Admin)"

2. **Enable scripts:**
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

3. **Type `Y` and press Enter**

4. **Now npm commands will work in PowerShell!**

---

## 🎯 **Which Terminals Are Running?**

To check if your servers are running:

**Check Server (Port 5000):**
- Open browser: `http://localhost:5000/api/health` or any API endpoint
- Should see JSON response ✅

**Check Client (Port 5173):**
- Open browser: `http://localhost:5173`
- Should see login page ✅

**If either fails:**
- ERR_CONNECTION_REFUSED = Not running ❌
- Start it using one of the options above

---

## 📋 **Quick Start Guide:**

**Every time you want to run the project:**

1. **Open 2 Command Prompts** (or 2 VS Code terminals)

2. **Terminal 1 - Server:**
   ```cmd
   cd "c:\Users\IT-LAB\School Mn\server"
   npm run dev
   ```
   Wait for: `Server running on port 5000`

3. **Terminal 2 - Client:**
   ```cmd
   cd "c:\Users\IT-LAB\School Mn\client"
   npm run dev
   ```
   Wait for: `Local: http://localhost:5173`

4. **Open browser:** `http://localhost:5173`

✅ **Done!**

---

## 🚀 **Current Status:**

Based on the test we just ran:

- ❌ **Server:** NOT running (ERR_CONNECTION_REFUSED)
- ✅ **Client:** Running (showing login page)

**You need to start the server using Option 1 or 2 above!**

---

## 💡 **Pro Tip:**

**Keep both terminals open** while working. If you close them, the servers stop!

To stop servers:
- Press `Ctrl + C` in each terminal
- Or just close the terminals

---

**Choose one of the 3 options above and start your server!** 🎉
