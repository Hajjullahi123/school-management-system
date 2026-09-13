# How to Set Current Term/Session (Dashboard)

## 🎯 Quick Answer

To change which term/session is the "current" one (what shows by default on the dashboard):

---

## **Method 1: Use the Script** (Recommended)

### **Step 1: Edit the Script**

Open: `server/set-current-term.js`

Find this line (around line 53):
```javascript
const DESIRED_TERM = 'Second'; // ← CHANGE THIS TO SET CURRENT TERM
```

**Change to your desired term**:
- `'First'` - For First Term
- `'Second'` - For Second Term  
- `'Third'` - For Third Term

### **Step 2: Run the Script**

```bash
cd server
node set-current-term.js
```

### **Step 3: Refresh Your Browser**

The dashboard will now show the selected term as current!

---

## **Method 2: Manually (via Database)**

If you prefer to do it manually, here are the SQL commands:

### **Set Second Term as Current**:

```sql
-- Set all terms to not current
UPDATE Term SET isCurrent = 0;

-- Set Second Term as current (adjust ID as needed)
UPDATE Term SET isCurrent = 1 WHERE name LIKE '%Second%';
```

---

## **What "Current" Means**

When a term/session is marked as **current**:
- ✅ It's the **default term** shown on Fee Management page
- ✅ It's what appears when the page first loads
- ✅ System suggests it for new operations

**BUT**: With the new dropdown, you can **always view any term** regardless of which is "current"!

---

## **Current Status** (As of now)

Based on our earlier changes:

```
Current Session: 2024/2025
Current Term: Second Term  ← We set this earlier
```

---

## **To Change to First Term**

### **Option A: Use Script**

1. Open `server/set-current-term.js`
2. Change line 53 to:
   ```javascript
   const DESIRED_TERM = 'First';
   ```
3. Run: `node set-current-term.js`
4. Done!

### **Option B: Quick Command**

Create a file `server/set-first-term.js`:

```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setFirstTerm() {
  const session = await prisma.academicSession.findFirst({ where: { isCurrent: true } });
  
  await prisma.term.updateMany({
    where: { academicSessionId: session.id },
    data: { isCurrent: false }
  });
  
  await prisma.term.updateMany({
    where: { 
      academicSessionId: session.id,
      name: { contains: 'First' }
    },
    data: { isCurrent: true }
  });
  
  console.log('✅ First Term is now current!');
  await prisma.$disconnect();
}

setFirstTerm();
```

Then run:
```bash
node set-first-term.js
```

---

## **To Change to Third Term**

Same as above, but change to:
```javascript
const DESIRED_TERM = 'Third';
```

---

## **Important Notes**

### ✅ **You Don't HAVE to change the current term anymore!**

With the new **term selector dropdown** we just added:
- You can view **any term** from the dropdown
- No need to run scripts to switch
- "Current" just sets the default

### **When to Change Current Term**:

Change the "current" term when:
- ✅ A new term starts (e.g., First → Second)
- ✅ You want the default view to change
- ✅ Reports/operations should target a different term

### **Don't Need to Change** if:
- ❌ You just want to view another term (use dropdown!)
- ❌ You're checking different term data temporarily
- ❌ You're comparing terms

---

## **Quick Reference**

| Task | Method |
|------|--------|
| **View different term temporarily** | Use dropdown on Fee Management page |
| **Change default/current term** | Run `set-current-term.js` |
| **View all terms at once** | Select "All Terms" in dropdown |
| **Switch to First Term** | Edit script to `'First'`, then run |
| **Switch to Second Term** | Edit script to `'Second'`, then run |
| **Switch to Third Term** | Edit script to `'Third'`, then run |

---

## **Examples**

### **Example 1: Start of Second Term**

When Second Term begins:
```bash
# Edit set-current-term.js to say 'Second'
node set-current-term.js
```

Now Fee Management shows Second Term by default.

### **Example 2: Just Checking First Term Data**

Don't run any script! Just:
1. Open Fee Management
2. Click Term dropdown
3. Select "First Term"
4. View the data

### **Example 3: End of Year Review**

Want to see ALL terms combined:
1. Open Fee Management
2. Click Term dropdown  
3. Select "📊 All Terms (Cumulative)"
4. See combined year data

---

## **Testing the Current Term**

To check what's currently set:

```bash
node check-second-term.js
```

This shows:
- Which session is current
- Which term is current
- All available terms

---

## **Summary**

**Before the Dropdown**:
- Had to run scripts to see different terms ❌

**Now with Dropdown**:
- View any term anytime with dropdown ✅
- "Current" just sets default ✅
- Much more flexible! ✅

**Set current term when**: You want to change the default for the whole system  
**Use dropdown when**: You want to view/work with a specific term temporarily

---

**Ready to set a different current term?**  
Run: `node set-current-term.js`
