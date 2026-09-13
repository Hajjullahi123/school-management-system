# ✅ TROUBLESHOOTING: Can't Access System Settings

## 🎯 **Issue**: Can't see or access "Set as Current Term" buttons

## ✅ **Solution**: Follow these steps EXACTLY

---

## **Step 1: RESTART THE SERVER** ⚠️ REQUIRED!

### **Option A: If server is running in terminal**

1. **Find the terminal** where server is running
2. **Press Ctrl+C** to stop it
3. **Wait** for it to fully stop
4. **Run**: `npm start`
5. **Wait** for "Server running on port 3000"

###**Option B: If you're not sure**

Just run these commands:
```bash
cd server
npm start
```

---

## **Step 2: HARD REFRESH YOUR BROWSER** ⚠️ REQUIRED!

Don't just press F5! Do a HARD refresh:

**Windows**: Press **Ctrl + Shift + R**  
**Or**: Press **Ctrl + F5**  
**Or**: Hold Ctrl and click the refresh button

This clears the cache and loads new code.

---

## **Step 3: LOGIN AS ADMIN**

Make sure you're logged in as **admin**, not teacher or accountant!

Only admins can see System Settings.

---

## **Step 4: LOOK FOR "SYSTEM SETTINGS" IN MENU**

After logging in, scroll down the left menu. You should see:

```
Dashboard
Timetable
Homework
Resources & Notes
Term Report
... (more items) ...
Settings          ← Regular settings
System Settings   ← NEW! This one! 📅
ID Card
```

**Do you see "System Settings"?**

### **If YES**: Click it! You'll see the page with buttons.

### **If NO**: Go to Step 5.

---

## **Step 5: IF YOU DON'T SEE "SYSTEM SETTINGS"**

### **Check 1: Are you logged in as ADMIN?**
- Top right corner should show your name
- Role should be "admin" not "teacher" or "accountant"

### **Check 2: Did server restart successfully?**
- Look at server terminal
- Should say "Server running on port 3000"
- No errors

### **Check 3: Did browser refresh?**
- Press Ctrl + Shift + R again
- Or close browser completely and reopen

---

## **Step 6: DIRECT URL TEST**

Try going directly to the page:

**Type in browser address bar**:
```
http://localhost:3001/system-settings
```

Or if your client runs on a different port:
```
http://192.168.x.x:3001/system-settings
```

**Replace x.x with your IP**

### **What happens?**

**If you see the page**: Menu issue, but page works!  
**If you see error**: There's a problem with the setup.

---

## **Step 7: CHECK FOR ERRORS**

### **In Browser Console** (F12):
1. Press **F12** to open developer tools
2. Click **Console** tab
3. Look for red errors
4. Tell me what errors you see

### **In Server Terminal**:
1. Look at the terminal running the server
2. Any red errors?
3. Tell me what it says

---

## **Quick Checklist** ✅

Before you say it doesn't work, verify:

- [ ] Server was restarted (Ctrl+C then npm start)
- [ ] Browser was hard refreshed (Ctrl + Shift + R)
- [ ] Logged in as **ADMIN** (not teacher/accountant)
- [ ] Checked the menu for "System Settings"
- [ ] No errors in browser console (F12)
- [  ] No errors in server terminal

---

## **Common Mistakes**

### ❌ **Mistake 1**: "I refreshed but still don't see it"
**Solution**: Do a HARD refresh (Ctrl + Shift + R), not regular F5

### ❌ **Mistake 2**: "The menu item isn't there"
**Solution**: Make sure you're logged in as ADMIN, not accountant or teacher

### ❌ **Mistake 3**: "Server says it's running but page doesn't load"
**Solution**: Check if client is also running. You need BOTH server AND client running.

### ❌ **Mistake 4**: "I see System Settings but clicking does nothing"
**Solution**: Check browser console (F12) for errors

---

## **What Should Happen** (When Working Correctly)

### **1. After Server Restart**:
```
Server terminal shows:
> Server running on port 3000
(No errors)
```

### **2. After Browser Refresh as Admin**:
```
Menu shows:
...
Settings
System Settings  ← You see this!
ID Card
...
```

### **3. After Clicking "System Settings"**:
```
Page loads showing:
┌─ Currently Active ───────┐
│ Session: 2024/2025        │
│ Term: Second Term         │
└───────────────────────────┘

Academic Sessions:
...

Terms:
First Term [Set as Current Term]
Second Term [✓ Current Term]
Third Term [Set as Current Term]
```

### **4. After Clicking "Set as Current Term"**:
```
Popup: "Set this as the current term? This will affect all users."
[Cancel] [OK]

Click OK →

Button changes to: [Setting...]

Success message: "✅ Current term updated successfully!"

Page refreshes, now shows selected term as current
```

---

## **Still Not Working?**

Tell me:

1. **Did you restart the server?** (Yes/No)
2. **Did you hard refresh browser?** (Yes/No)
3. **Are you logged in as admin?** (Yes/No)
4. **Do you see "System Settings" in the menu?** (Yes/No)
5. **Any errors in browser console?** (What errors?)
6. **Any errors in server terminal?** (What errors?)

---

## **MOST LIKELY CAUSE**

**90% of the time, it's because**:
- ✅ Server wasn't restarted (must restart after adding route!)
- ✅ Browser wasn't hard refreshed (must clear cache!)

**Do these two things first!**

---

**After restarting server and hard refreshing browser, you WILL see System Settings!** 🎉
