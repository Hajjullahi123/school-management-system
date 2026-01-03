# Admin System Settings - Implementation Guide

## What Was Created

A complete UI for admin to set the current academic session and term.

---

## ✅ Files Created

1. **`client/src/pages/admin/SystemSettings.jsx`** - Admin settings page
2. **`server/routes/system-settings.js`** - Backend API routes

---

## 📋 Setup Instructions

### **Step 1: Register the Backend Route**

**File**: `server/index.js`

Add this line with the other route imports (around line 20):
```javascript
const systemSettingsRoutes = require('./routes/system-settings');
```

Then add this line with the other route registrations (around line 50):
```javascript
app.use('/api/system', systemSettingsRoutes);
```

**Example**:
```javascript
// Routes
const authRoutes = require('./routes/auth');
const classRoutes = require('./routes/classes');
const systemSettingsRoutes = require('./routes/system-settings'); // ← ADD THIS

app.use('/api/auth', authRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/system', systemSettingsRoutes); // ← ADD THIS
```

---

### **Step 2: Add Route to Frontend**

**File**: `client/src/App.jsx`

Add the import:
```javascript
import SystemSettings from './pages/admin/SystemSettings';
```

Add the route (in the admin section):
```javascript
<Route path="/admin/system-settings" element={<SystemSettings />} />
```

**Example**:
```javascript
// Admin Routes
<Route path="/admin/dashboard" element={<AdminDashboard />} />
<Route path="/admin/students" element={<StudentManagement />} />
<Route path="/admin/system-settings" element={<SystemSettings />} /> {/* ← ADD THIS */}
```

---

### **Step 3: Add to Admin Navigation**

**File**: `client/src/components/Layout.jsx`

Find the admin menu items section and add:

```javascript
{
  name: 'Settings',
  icon: '⚙️',
  path: '/admin/system-settings',
  roles: ['admin']
},
```

**Example location** (add after other admin items):
```javascript
const menuItems = [
  { name: 'Dashboard', icon: '📊', path: '/admin/dashboard', roles: ['admin', 'teacher', 'accountant'] },
  { name: 'Students', icon: '👨‍🎓', path: '/admin/students', roles: ['admin'] },
  { name: 'Classes', icon: '🏫', path: '/admin/classes', roles: ['admin'] },
  // ... other items ...
  { 
    name: 'Settings', 
    icon: '⚙️', 
    path: '/admin/system-settings', 
    roles: ['admin'] 
  }, // ← ADD THIS
];
```

---

### **Step 4: Restart the Server**

```bash
# Restart your backend server
cd server
# Stop the server (Ctrl+C if running)
# Start it again
npm start
```

---

## 🎯 How to Use

### **As Admin**:

1. **Login** as admin
2. **Go to Settings** in the menu (⚙️ icon)
3. **See current session/term** at the top (green box)
4. **Select new session** from dropdown
5. **Select new term** from dropdown
6. **Click "Save Changes"**
7. **Confirm** the change
8. **Done!** System updated

---

## 📊 What It Looks Like

```
┌─ System Settings ───────────────────────────────────┐
│                                                       │
│ ┌─ Currently Active ───────────────────────────┐   │
│ │ Academic Session: 2024/2025                   │   │
│ │ Term: Second Term                             │   │
│ └───────────────────────────────────────────────┘   │
│                                                       │
│ Change Current Session/Term                          │
│                                                       │
│ [Academic Session ▼]    [Term ▼]                    │
│  2024/2025 (Current)     Second Term (Current)       │
│                                                       │
│ ℹ️ What does this do?                               │
│ • Sets which session/term is active                  │
│ • Affects default views                              │
│ • Users can still view other terms                   │
│                                                       │
│               [Reset]  [✓ Save Changes]              │
└───────────────────────────────────────────────────────┘
```

---

## ✨ Features

### **Visual**:
- ✅ Shows current session/term in green box
- ✅ Dropdowns for easy selection
- ✅ Warning when changes not saved
- ✅ Loading states
- ✅ Info tooltips

### **Functionality**:
- ✅ Only admin can access
- ✅ Confirmation before saving
- ✅ Auto-selects terms for chosen session
- ✅ Reset button to undo changes
- ✅ Real-time validation

### **Security**:
- ✅ Admin-only route (backend enforced)
- ✅ Authentication required
- ✅ Authorization check

---

## 🔒 Security

**Backend routes protected**:
```javascript
router.post('/set-current-session', authenticate, authorize(['admin']), ...)
router.post('/set-current-term', authenticate, authorize(['admin']), ...)
```

Only admin users can change system settings.

---

## 📝 API Endpoints Created

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/system/set-current-session` | Set current session |
| POST | `/api/system/set-current-term` | Set current term |
| GET | `/api/system/settings` | Get current settings |

---

## 🎯 When to Use

**Admin should change current term when**:
- ✅ A new academic term begins
- ✅ Moving from First → Second → Third Term
- ✅ Starting a new academic year
- ✅ Want to change system-wide defaults

**Users don't need to wait for admin** because:
- ✅ They have the dropdown to view any term
- ✅ Can work with any session/term
- ✅ Only affects default view

---

## 🚀 Quick Start (After Setup)

1. **Add routes** to `server/index.js`
2. **Add route** to `client/src/App.jsx`
3. **Add menu item** to `Layout.jsx`
4. **Restart server**
5. **Login as admin**
6. **Go to Settings**
7. **Change term**
8. **Done!**

---

## ✅ Benefits

**Before**:
- ❌ Had to run scripts to change current term
- ❌ Manual database editing
- ❌ Risk of errors
- ❌ Only tech-savvy could do it

**Now**:
- ✅ Admin UI - click and select
- ✅ No scripts needed
- ✅ Safe and validated
- ✅ Anyone with admin access can do it
- ✅ Instant feedback

---

## 📚 Complete Integration Checklist

- [ ] Add backend route to `server/index.js`
- [ ] Add frontend route to `App.jsx`
- [ ] Add menu item to `Layout.jsx`
- [ ] Restart server
- [ ] Test as admin
- [ ] Verify term changes
- [ ] Check user can still view other terms

---

**Ready to set up?** Follow the 3 steps above and you'll have a complete admin settings page!

**Questions?** Check the code in:
- `client/src/pages/admin/SystemSettings.jsx`
- `server/routes/system-settings.js`
