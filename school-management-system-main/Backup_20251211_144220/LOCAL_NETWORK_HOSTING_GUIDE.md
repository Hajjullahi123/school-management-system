# 🏫 LOCAL NETWORK HOSTING - COMPLETE SETUP GUIDE
## Host Your School Management System on Your School Network

---

## 📋 **QUICK START (5 MINUTES)**

### **Step 1: Find Your IP Address** (1 minute)

1. Press `Windows + R`
2. Type `cmd` and press Enter
3. Type: `ipconfig`
4. Find **"IPv4 Address"** - it looks like `192.168.1.100`
5. **Write it down:** `_________________`

### **Step 2: Update Configuration** (1 minute)

1. Open: `client/src/config.js`
2. Find this line:
   ```javascript
   const SERVER_IP = '192.168.1.100'; // ⚠️ CHANGE THIS!
   ```
3. Replace `192.168.1.100` with **YOUR IP address**
4. Save the file (`Ctrl + S`)

### **Step 3: Start the Servers** (2 minutes)

**Option A: Using Batch Files (EASIEST)**

1. Double-click: `START-SERVER-NETWORK.bat`
   - Wait for "Server running on port 3000"
   - **Keep this window open!**

2. Double-click: `START-CLIENT-NETWORK.bat`
   - Wait for "Local: http://YOUR-IP:5173"
   - **Keep this window open!**

**Option B: Using Command Prompt**

Terminal 1 (Backend):
```cmd
cd "c:\Users\IT-LAB\School Mn\server"
npm start
```

Terminal 2 (Frontend):
```cmd
cd "c:\Users\IT-LAB\School Mn\client"
npm run dev -- --host
```

### **Step 4: Access from Other Computers** (1 minute)

On **any computer** in your school:

1. Open browser (Chrome, Firefox, Edge)
2. Type in address bar: `http://YOUR-IP:5173`
   - Example: `http://192.168.1.100:5173`
3. Press Enter
4. **Your school system loads!** 🎉

---

## 🎯 **DETAILED SETUP GUIDE**

### **What You Need:**

- ✅ One computer to act as server (this PC)
- ✅ School WiFi or LAN network
- ✅ All computers connected to same network
- ✅ Windows Firewall configured (see below)

---

## 🔥 **FIREWALL CONFIGURATION**

**IMPORTANT:** You must allow Node.js through Windows Firewall!

### **Method 1: Automatic (When Prompted)**

When you first start the servers, Windows will ask:
```
Windows Defender Firewall has blocked some features...
Do you want to allow Node.js to communicate on these networks?
```

✅ **Check BOTH boxes:**
- [x] Private networks (home, work)
- [x] Public networks

✅ Click **"Allow access"**

### **Method 2: Manual Configuration**

If you didn't see the prompt or need to fix it:

1. Press `Windows + R`
2. Type: `firewall.cpl`
3. Press Enter
4. Click **"Allow an app or feature through Windows Defender Firewall"**
5. Click **"Change settings"** (top right)
6. Click **"Allow another app..."**
7. Click **"Browse..."**
8. Navigate to: `C:\Program Files\nodejs\node.exe`
9. Click **"Add"**
10. Make sure **both checkboxes** are checked (Private and Public)
11. Click **"OK"**

### **Method 3: PowerShell (Advanced)**

Run PowerShell as Administrator:

```powershell
# Allow Node.js through firewall
New-NetFirewallRule -DisplayName "Node.js Server" -Direction Inbound -Program "C:\Program Files\nodejs\node.exe" -Action Allow

# Allow ports 3000 and 5173
New-NetFirewallRule -DisplayName "School System Backend" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "School System Frontend" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow
```

---

## 📱 **ACCESSING FROM DIFFERENT DEVICES**

### **From Windows PC:**
```
http://192.168.1.100:5173
```

### **From Mac:**
```
http://192.168.1.100:5173
```

### **From Phone/Tablet:**
1. Connect to same WiFi
2. Open browser
3. Type: `http://192.168.1.100:5173`

### **From Chromebook:**
```
http://192.168.1.100:5173
```

**Replace `192.168.1.100` with YOUR server's IP address!**

---

## 🔧 **TROUBLESHOOTING**

### **Problem 1: Can't Access from Other Computers**

**Symptoms:**
- Works on server computer
- Doesn't work on other computers
- Shows "Can't reach this page"

**Solutions:**

1. **Check Firewall:**
   - Follow firewall configuration above
   - Make sure Node.js is allowed

2. **Verify IP Address:**
   - Run `ipconfig` again
   - IP might have changed
   - Update `config.js` if different

3. **Check Network:**
   - All computers on same WiFi?
   - Same network name?
   - Can you ping the server?
     ```cmd
     ping 192.168.1.100
     ```

4. **Restart Servers:**
   - Close both terminal windows
   - Start servers again

### **Problem 2: "CORS Error" in Browser**

**Symptoms:**
- Browser console shows CORS error
- API calls failing

**Solutions:**

1. **Check server/index.js:**
   - Make sure CORS configuration is updated
   - Should allow local network IPs

2. **Restart Backend:**
   - Close backend terminal
   - Start again: `npm start`

3. **Clear Browser Cache:**
   - Press `Ctrl + Shift + Delete`
   - Clear cache
   - Reload page

### **Problem 3: "Cannot GET /" Error**

**Symptoms:**
- Page shows "Cannot GET /"
- Blank white page

**Solutions:**

1. **Check Frontend is Running:**
   - Is `START-CLIENT-NETWORK.bat` running?
   - Should show "Local: http://..."

2. **Check URL:**
   - Should be: `http://IP:5173`
   - NOT: `http://IP:3000`

3. **Restart Frontend:**
   - Close client terminal
   - Start again

### **Problem 4: IP Address Keeps Changing**

**Symptoms:**
- IP changes every day
- Have to update config.js repeatedly

**Solution: Set Static IP**

1. Press `Windows + R`
2. Type: `ncpa.cpl`
3. Right-click your network adapter
4. Click **"Properties"**
5. Double-click **"Internet Protocol Version 4 (TCP/IPv4)"**
6. Select **"Use the following IP address"**
7. Enter:
   - **IP address:** `192.168.1.100` (or your preferred IP)
   - **Subnet mask:** `255.255.255.0`
   - **Default gateway:** `192.168.1.1` (your router's IP)
   - **DNS:** `8.8.8.8` (Google DNS)
8. Click **"OK"**

**Note:** Make sure the IP you choose is not already in use!

---

## 📊 **NETWORK REQUIREMENTS**

### **Minimum:**
- Router/WiFi access point
- 2+ computers on same network
- Internet NOT required (for local use)

### **Recommended:**
- Dedicated server computer (stays on)
- Gigabit network switch (for speed)
- UPS (uninterruptible power supply)
- Static IP configuration

---

## 💡 **BEST PRACTICES**

### **For Server Computer:**

1. **Keep it Running:**
   - Don't shut down during school hours
   - Don't put to sleep
   - Configure power settings:
     ```
     Control Panel → Power Options → 
     Choose "High Performance" → 
     Change "Turn off display" to "Never"
     Change "Put computer to sleep" to "Never"
     ```

2. **Dedicated Machine (Ideal):**
   - Use a dedicated computer as server
   - Don't use for other tasks
   - Reduces crashes and slowdowns

3. **Regular Backups:**
   - Backup database weekly
   - Copy `server/prisma/dev.db` to safe location
   - Keep multiple backup copies

4. **Monitor Performance:**
   - Watch for slowdowns
   - Check disk space
   - Monitor RAM usage

### **For Network:**

1. **Stable Connection:**
   - Use Ethernet cable for server (not WiFi)
   - Faster and more reliable

2. **Network Security:**
   - Use WPA2/WPA3 WiFi encryption
   - Strong WiFi password
   - Separate guest network (optional)

3. **Quality Router:**
   - Good quality router/access point
   - Sufficient bandwidth for users
   - Regular router reboots

---

## 📋 **DAILY OPERATIONS CHECKLIST**

### **Morning (School Opens):**

- [ ] Turn on server computer
- [ ] Double-click `START-SERVER-NETWORK.bat`
- [ ] Wait for "Server running on port 3000"
- [ ] Double-click `START-CLIENT-NETWORK.bat`
- [ ] Wait for "Local: http://..."
- [ ] Test access from one other computer
- [ ] Minimize terminal windows (don't close!)

### **During Day:**

- [ ] Keep terminal windows open
- [ ] Don't close/restart server computer
- [ ] Monitor for any issues
- [ ] Help users who can't connect

### **Evening (School Closes):**

- [ ] Close both terminal windows (Ctrl + C)
- [ ] Backup database (copy dev.db)
- [ ] Shut down server computer (optional)
- [ ] Or leave running for next day

---

## 🎓 **USER INSTRUCTIONS**

### **For Teachers/Staff:**

**To Access the System:**

1. Connect to school WiFi
2. Open browser
3. Go to: `http://192.168.1.100:5173` (use your school's IP)
4. Login with your credentials
5. Use the system normally

**Bookmark the URL for easy access!**

### **For Students:**

**To Check Results:**

1. Connect to school WiFi
2. Open browser
3. Go to: `http://192.168.1.100:5173`
4. Click "Student Portal"
5. Login with admission number and password
6. View your results!

---

## 📞 **GETTING HELP**

### **Common Questions:**

**Q: Can students access from home?**
A: No, only works on school network. For home access, you need internet hosting (Option 2-5).

**Q: How many users can access at once?**
A: Depends on server computer specs. Typically 20-50 concurrent users on average PC.

**Q: What if server computer crashes?**
A: System goes offline. Restart computer and servers. This is why backups are important!

**Q: Can I use my laptop as server?**
A: Yes, but keep it plugged in and don't close the lid.

**Q: Does this use internet data?**
A: No! Everything is local network. No internet required or used.

---

## 🔐 **SECURITY NOTES**

### **Network Security:**

- ✅ System only accessible on school network
- ✅ Not exposed to internet
- ✅ Relatively secure
- ⚠️ Anyone on school WiFi can access
- ⚠️ Use strong passwords
- ⚠️ Change default admin password

### **Recommendations:**

1. **Strong Passwords:**
   - Minimum 8 characters
   - Mix of letters, numbers, symbols
   - Different for each user

2. **Regular Updates:**
   - Keep system updated
   - Update Node.js periodically
   - Update dependencies

3. **Access Control:**
   - Only give credentials to authorized users
   - Disable accounts for former staff/students
   - Regular password changes

---

## 📈 **PERFORMANCE TIPS**

### **For Better Speed:**

1. **Server Computer:**
   - Close unnecessary programs
   - 8GB+ RAM recommended
   - SSD drive (faster than HDD)
   - Modern processor (i5 or better)

2. **Network:**
   - Use Ethernet for server
   - Quality WiFi router
   - 5GHz WiFi (faster than 2.4GHz)
   - Minimal interference

3. **Database:**
   - Regular maintenance
   - Archive old data
   - Optimize queries

---

## ✅ **VERIFICATION CHECKLIST**

After setup, verify everything works:

- [ ] Server starts without errors
- [ ] Client starts without errors
- [ ] Can access on server computer
- [ ] Can access from another computer
- [ ] Login works
- [ ] Can view students
- [ ] Can enter results
- [ ] Can record fees
- [ ] Can generate reports
- [ ] All features working

---

## 🎉 **SUCCESS!**

If you've followed all steps, your school management system is now:

✅ **Accessible** from any computer in school  
✅ **Fast** (local network speed)  
✅ **Free** (no hosting costs)  
✅ **Secure** (not on internet)  
✅ **Ready** for daily use!

---

## 📞 **SUPPORT**

If you encounter issues:

1. Check troubleshooting section above
2. Verify firewall settings
3. Confirm network connectivity
4. Restart servers
5. Check error messages in terminal

---

**Last Updated:** December 5, 2025  
**Version:** 1.0  
**For:** Local Network Hosting

**Your school management system is now live on your school network!** 🎓✨
