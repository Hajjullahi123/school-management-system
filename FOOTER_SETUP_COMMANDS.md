# 🔧 QUICK SETUP COMMANDS - FOOTER LINKS FEATURE

**Run these commands in order:**

## Step 1: Apply Database Changes (NEW COMMAND PROMPT)
```cmd
cd "c:\Users\IT-LAB\School Mn\server"
node add-footer-columns.js
npx prisma db pull
npx prisma generate
```

## Step 2: Restart Server
**In your server terminal**: Press Ctrl+C, then:
```cmd
npm run dev
```

## Step 3: Verify
Server should start without errors.

---

**After these steps, the database will be ready for the new features!**
