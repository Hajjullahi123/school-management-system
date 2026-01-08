# ⚡ RAILWAY MIGRATION - QUICK START CARD

## 🚀 **FASTEST PATH (15 Minutes)**

### **Step 1: Backup Database (2 min)**
```bash
pg_dump "YOUR_RENDER_DATABASE_URL" > backup.sql
```

### **Step 2: Create Railway Account (2 min)**
- Go to: https://railway.app
- Sign in with GitHub
- Verify email

### **Step 3: Deploy from GitHub (3 min)**
- New Project → Deploy from GitHub
- Select: school-management-system
- Wait for build

### **Step 4: Add PostgreSQL (1 min)**
- Click "+ New"
- Add PostgreSQL
- Auto-configured!

### **Step 5: Set Environment Variables (3 min)**
```
DATABASE_URL (auto-generated)
JWT_SECRET (copy from Render)
SESSION_SECRET (copy from Render)
NODE_ENV=production
```

### **Step 6: Restore Database (2 min)**
```bash
railway login
railway link
railway run psql < backup.sql
```

### **Step 7: Generate Domain & Test (2 min)**
- Settings → Domains → Generate Domain
- Open URL → Test login
- ✅ Done!

---

## 📝 **COPY-PASTE COMMANDS**

### **Install Railway CLI:**
```powershell
iwr https://railway.app/install.ps1 | iex
```

### **Deploy Commands:**
```bash
railway login
railway link
railway run psql < backup.sql
railway logs
```

---

## ✅ **VERIFICATION CHECKLIST**

- [ ] App loads
- [ ] Can login
- [ ] Data is there
- [ ] Logo displays
- [ ] Settings work

---

## 🆘 **IF STUCK:**

**Check Logs:**
- Dashboard → Deployments → View Logs

**Common Fix:**
- Verify all environment variables
- Check DATABASE_URL is set
- Ensure build completed successfully

---

**FULL GUIDE:** See RAILWAY_MIGRATION_GUIDE.md

**Time:** 15 minutes  
**Result:** 3x faster deployments! 🎉
