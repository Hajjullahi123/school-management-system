# Quick Fix: Remove System Settings Temporarily

The server is crashing because of the system-settings route.

## Quick Fix Option 1: Comment Out the Route

**File**: `server/index.js`

Find this line (line 70):
```javascript
app.use('/api/system', require('./routes/system-settings')); // System settings (current term/session)
```

**Comment it out** (add // at the start):
```javascript
// app.use('/api/system', require('./routes/system-settings')); // System settings (current term/session)
```

**Save and restart server**:
```bash
npm start
```

This will let the server start, but System Settings won't work yet.

---

## Quick Fix Option 2: Check the Full Error

Instead of using nodemon, run:
```bash
node index.js
```

This will show the FULL error message. Then tell me what it says!

---

## Quick Fix Option 3: Use Scripts for Now

While we fix the System Settings page, you can use the scripts:

**To change to First Term**:
```bash
node switch-to-first-term.js
```

**To change to Third Term**:
```bash
# Edit set-current-term.js, change line 53 to 'Third'
node set-current-term.js
```

---

## What I Need From You

**Run this and tell me the FULL error**:
```bash
cd server
node index.js
```

Look for the error message. It will say something like:
- "Cannot find module..."
- "Error: ..."
- "SyntaxError: ..."

Tell me the COMPLETE error message!

---

## Most Likely Causes

1. **Missing auth middleware** - The authorize function might not exist
2. **Wrong path** - The require path might be wrong
3. **Syntax error** - There might be a typo

Once you tell me the full error, I can fix it immediately!
