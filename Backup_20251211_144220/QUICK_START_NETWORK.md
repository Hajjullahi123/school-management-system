# 🚀 QUICK START - LOCAL NETWORK HOSTING
## 5-Minute Setup Guide

---

## ⚡ **SUPER QUICK SETUP**

### **1. Find Your IP** (30 seconds)
```cmd
ipconfig
```
Look for: `IPv4 Address: 192.168.x.x`

### **2. Update Config** (30 seconds)
Open: `client/src/config.js`
```javascript
const SERVER_IP = '192.168.1.100'; // ← PUT YOUR IP HERE!
```

### **3. Start Servers** (1 minute)
Double-click:
1. `START-SERVER-NETWORK.bat` ← Start this FIRST!
2. `START-CLIENT-NETWORK.bat` ← Then start this!

### **4. Access Website** (30 seconds)
On any computer in school:
```
http://YOUR-IP:5173
Example: http://192.168.1.100:5173
```

**DONE!** 🎉

---

## 📋 **DAILY CHECKLIST**

### **Morning:**
- [ ] Start server computer
- [ ] Run `START-SERVER-NETWORK.bat`
- [ ] Run `START-CLIENT-NETWORK.bat`
- [ ] Test from another computer

### **Evening:**
- [ ] Close both terminal windows
- [ ] Backup database (optional)
- [ ] Shut down or leave running

---

## 🔥 **FIREWALL FIX**

If others can't access:

1. Press `Windows + R`
2. Type: `firewall.cpl`
3. Click "Allow an app..."
4. Click "Change settings"
5. Find "Node.js" or add it
6. Check BOTH boxes (Private & Public)
7. Click OK

---

## 🆘 **TROUBLESHOOTING**

| Problem | Solution |
|---------|----------|
| Can't access from other PCs | Check firewall (see above) |
| IP keeps changing | Set static IP in network settings |
| "Cannot GET /" error | Make sure client is running |
| CORS error | Restart backend server |
| Slow performance | Close other programs on server |

---

## 📞 **SHARE WITH USERS**

**Website URL:**
```
http://YOUR-IP:5173
```

**Requirements:**
- Must be on school WiFi/network
- Use Chrome, Firefox, or Edge
- Bookmark for easy access

---

## ⚠️ **IMPORTANT REMINDERS**

✅ **KEEP TERMINAL WINDOWS OPEN!**  
✅ **DON'T CLOSE SERVER COMPUTER!**  
✅ **BACKUP DATABASE REGULARLY!**  
✅ **UPDATE config.js IF IP CHANGES!**

---

## 🎯 **FILES YOU CREATED**

- `client/src/config.js` ← Your IP address here
- `client/src/api.js` ← API helper (auto-configured)
- `START-SERVER-NETWORK.bat` ← Start backend
- `START-CLIENT-NETWORK.bat` ← Start frontend
- `LOCAL_NETWORK_HOSTING_GUIDE.md` ← Full guide

---

## 📊 **SYSTEM STATUS CHECK**

✅ **Backend Running:**
```
Server running on port 3000
```

✅ **Frontend Running:**
```
Local: http://192.168.x.x:5173
```

✅ **Accessible:**
Open browser → Go to URL → Site loads!

---

**Need detailed help?** Read: `LOCAL_NETWORK_HOSTING_GUIDE.md`

**Everything working?** Enjoy your school management system! 🎓✨
