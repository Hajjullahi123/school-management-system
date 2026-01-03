# 🔍 SOCIAL MEDIA DEBUGGING GUIDE

## Step 1: Check if Data is Saved in Database

**Open Command Prompt** and run:
```cmd
cd "c:\Users\IT-LAB\School Mn\server"
node -e "const {PrismaClient} = require('@prisma/client'); const prisma = new PrismaClient(); prisma.schoolSettings.findFirst().then(d => console.log(JSON.stringify(d, null, 2)))"
```

Look for:
- `"facebookUrl": "..."`
- `"instagramUrl": "..."`
- `"whatsappUrl": "..."`

---

## Step 2: Test API Directly

In browser console (F12), paste this:

```javascript
fetch('http://localhost:5000/api/settings')
  .then(r => r.json())
  .then(d => console.log('Settings:', d))
```

Check if you see the social media URLs.

---

## Step 3: Check Component State

In console, paste this:

```javascript
// Force re-render
window.location.reload()
```

Then check footer again.

---

## If Values Are NULL/Empty:

Go to Admin Settings and:
1. Enter URLs again
2. Click Save
3. Check for success message
4. Refresh landing page

---

**Run Step 1 first and show me the output!**
