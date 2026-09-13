# 💾 School Management System - Backup Guide

## 🎯 **Quick Backup**

### **Easy Method (Recommended):**

**Double-click:** `BACKUP-SYSTEM.bat`

That's it! A complete backup will be created automatically.

---

## 📁 **What Gets Backed Up:**

### **✅ Source Code:**
- ✅ All client source files (`client/src`)
- ✅ All server code (`server/routes`, `server/middleware`, etc.)
- ✅ Client public assets
- ✅ Configuration files

### **✅ Database:**
- ✅ SQLite database (`dev.db`)
- ✅ Prisma schema
- ✅ All student, parent, class data

### **✅ Important Files:**
- ✅ Environment variables (`.env`)
- ✅ Package configuration (`package.json`)
- ✅ Documentation (`docs/`)
- ✅ Batch startup files
- ✅ CSV import files

### **✅ User Data:**
- ✅ Student photos (`uploads/`)
- ✅ Teacher photos
- ✅ All uploaded files

### **❌ NOT Backed Up (Can Reinstall):**
- ❌ `node_modules` folders (too large, reinstallable)
- ❌ Auto-generated files

---

## 📍 **Backup Location:**

**Format:** `Backup_YYYYMMDD_HHMMSS`

**Example:** `Backup_20251211_134532`

**Location:** Same folder as your project

```
C:\Users\IT-LAB\School Mn\
├── Backup_20251211_134532\
│   ├── client\
│   ├── server\
│   ├── docs\
│   ├── uploads\
│   └── BACKUP_INFO.txt
├── client\
├── server\
└── BACKUP-SYSTEM.bat
```

---

## 🔄 **How to Restore from Backup:**

### **Step 1: Copy Files**
1. Open the backup folder
2. Copy all contents
3. Paste into a new folder

### **Step 2: Reinstall Dependencies**

**In Client folder:**
```cmd
cd client
npm install
```

**In Server folder:**
```cmd
cd server
npm install
npx prisma generate
```

### **Step 3: Start System**
Double-click `START-BOTH.bat`

Done! ✅

---

## 📊 **Backup File Structure:**

```
Backup_20251211_134532/
├── BACKUP_INFO.txt          ← Backup summary & restore guide
├── client/
│   ├── src/                 ← All React components
│   ├── public/              ← Static assets
│   ├── package.json         ← Dependencies list
│   └── *.config.*           ← Build configs
├── server/
│   ├── routes/              ← API endpoints
│   ├── middleware/          ← Auth, validation
│   ├── utils/               ← Helper functions
│   ├── prisma/
│   │   ├── schema.prisma    ← Database schema
│   │   └── dev.db           ← SQLite database
│   ├── .env                 ← Environment variables
│   ├── package.json         ← Dependencies list
│   └── index.js             ← Server entry point
├── docs/                    ← All documentation
├── uploads/                 ← Student/teacher photos
├── *.bat                    ← Startup scripts
└── *.md                     ← README files
```

---

## ⏰ **Backup Schedule Recommendations:**

### **Daily:**
- End of each workday
- After major changes
- Before system updates

### **Weekly:**
- Full system backup
- Copy to external drive
- Store in cloud (Google Drive, OneDrive)

### **Monthly:**
- Archive backup
- Keep for records
- Test restoration

---

## 💡 **Pro Tips:**

### **1. Multiple Backups:**
```
Run BACKUP-SYSTEM.bat daily
Each backup has unique timestamp
Keep last 7-10 backups
Delete older ones to save space
```

### **2. External Storage:**
```
Copy backup folder to:
- USB Flash Drive
- External Hard Drive
- Cloud Storage (OneDrive, Google Drive)
- Network Drive
```

### **3. Test Your Backup:**
```
Occasionally restore to test folder
Verify everything works
Better safe than sorry!
```

---

## 🚨 **Emergency Restore:**

### **If Your System Crashes:**

1. **Find latest backup folder**
   - Look for most recent timestamp
   - Check `BACKUP_INFO.txt` for details

2. **Create new project folder**
   ```
   mkdir "C:\School Management Restored"
   ```

3. **Copy backup contents**
   - Copy everything from backup folder
   - Paste into new folder

4. **Reinstall dependencies**
   ```cmd
   cd client
   npm install
   
   cd ..\server
   npm install
   npx prisma generate
   ```

5. **Start system**
   - Double-click `START-BOTH.bat`
   - Login with your credentials
   - Verify data is intact

---

## 📋 **Backup Checklist:**

Before important events (exams, term end, etc.):

- [ ] Run `BACKUP-SYSTEM.bat`
- [ ] Verify backup folder created
- [ ] Check `BACKUP_INFO.txt`
- [ ] Copy to external drive
- [ ] Upload to cloud storage
- [ ] Test backup (optional but recommended)

---

## 🔐 **Security:**

### **Protect Your Backups:**

**Contains sensitive data:**
- Student information
- Parent contact details
- Fee records
- Login credentials (hashed)

**Best Practices:**
- Store in secure location
- Don't share publicly
- Encrypt if possible
- Keep offline copies

---

## 📏 **Backup Size:**

**Typical sizes:**
- **Fresh install:** ~50MB
- **With 100 students:** ~100MB
- **With 500 students:** ~200MB
- **With photos:** +50-100MB

**Note:** `node_modules` NOT included (would add ~500MB)

---

## ⚙️ **Customizing Backup:**

### **To Add More Folders:**

Edit `BACKUP-SYSTEM.bat` and add:
```bat
echo Backing up custom folder...
xcopy /E /I /Y "custom_folder" "%BACKUP_FOLDER%\custom_folder" >nul
```

### **To Exclude Files:**

Create `backup_exclude.txt`:
```
.git
.vscode
*.log
temp\
```

---

## 🎓 **Understanding the Backup:**

### **What the script does:**

1. **Creates timestamped folder**
   - Uses current date/time
   - Ensures unique names
   - No overwriting

2. **Copies important files**
   - Source code
   - Database
   - Configuration
   - User uploads

3. **Skips unnecessary files**
   - node_modules (too large)
   - temp files
   - logs

4. **Creates summary**
   - Lists what's backed up
   - Provides restore instructions
   - Records backup details

5. **Opens backup folder**
   - For your verification
   - Easy access

---

## 🎉 **Backup Complete Checklist:**

After running backup:

✅ **Backup folder created** with timestamp
✅ **BACKUP_INFO.txt** contains summary
✅ **All source files** copied
✅ **Database** included
✅ **Photos/uploads** backed up
✅ **Batch files** preserved
✅ **Documentation** saved

---

## 📞 **Need Help?**

### **Common Issues:**

**Q: Backup takes too long**
```
A: Normal if you have many photos
   Wait for completion
   Usually < 2 minutes
```

**Q: Can I delete old backups?**
```
A: Yes! Keep most recent 5-10
   Delete older ones to save space
```

**Q: Backup failed**
```
A: Run as Administrator
   Check disk space
   Close any open files
```

---

## 🚀 **Ready to Backup!**

### **To Backup Now:**

1. **Save all your work**
2. **Double-click:** `BACKUP-SYSTEM.bat`
3. **Wait for completion** (~1-2 minutes)
4. **Verify backup folder** opened automatically
5. **Check** `BACKUP_INFO.txt` for details
6. **Copy to external drive** (recommended)

---

## 📊 **Backup Log Example:**

```
School Management System - Backup Summary
================================================

Backup Date: 2025-12-11
Backup Time: 13:45:32
Computer Name: IT-LAB-PC
User: IT-LAB

================================================
BACKUP CONTENTS:
================================================

[X] Client source code
[X] Server routes, middleware
[X] Database (dev.db)
[X] Configuration files
[X] Documentation
[X] Student photos
[X] Batch files

================================================
```

---

**Your data is valuable - backup regularly!** 💾

**Recommended:** Backup daily at end of work 🕐

**Store safely:** External drive + Cloud ☁️
