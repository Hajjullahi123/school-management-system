# Dynamic School Branding - Implementation Summary

## ✅ What I've Done

### 1. Created Reusable Hook
**File:** `client/src/hooks/useSchoolSettings.js`
- Fetches school settings from API
- Provides: schoolName, logoUrl, colors, address, phone, email
- Handles loading and error states
- Returns defaults if API fails

### 2. Created Documentation
- **DYNAMIC_BRANDING_PLAN.md** - Full implementation plan with all files to update
- **EXAMPLE_UPDATED_PRINT_RECEIPT.jsx** - Complete example of updated component

## 📋 What Needs To Be Done

Due to the large number of files (10+ files with 20+ occurrences of hardcoded names), I recommend updating them in priority order:

### **PRIORITY 1 - Official Documents** (Most Important)  
These are official documents that parents/students receive:

1. **Payment Receipts** - `client/src/components/PrintReceiptModal.jsx`
   - 5 occurrences of "DARUL QUR'AN"
   - Update all 3 receipt types (single, term, cumulative)
   - Add logo to header
   
2. **Report Cards** - Update these 2 files:
   - `client/src/pages/student/TermReportCard.jsx`
   - `client/src/pages/student/CumulativeReport.jsx`
   - Add logo and dynamic school name

3. **Bulk Report Download** - `client/src/pages/teacher/BulkReportDownload.jsx`
   - Teachers download multiple reports at once
   - Add logo and dynamic name

4. **Examination Cards** - `client/src/pages/student/ExamCardGenerator.jsx`
   - Students print these for exams
   - Add logo and dynamic name

5. **ID Cards** - `client/src/pages/IDCardGenerator.jsx`
   - Official student identification
   - Add logo and dynamic name

### **PRIORITY 2 - UI Pages** (Nice to Have)
These don't appear in printed documents:

6. **Login Page** - `client/src/pages/Login.jsx`
7. **Landing Page** - `client/src/pages/LandingPage.jsx`
8. **Dashboard** - `client/src/pages/Dashboard.jsx`

### **Already Dynamic** ✅
- **Sidebar** (Layout.jsx) - Already uses school settings
- **Header** (Layout.jsx) - Already uses school settings

##  Implementation Pattern

For each component, follow this pattern:

### Step 1: Import the Hook
```javascript
import useSchoolSettings from '../hooks/useSchoolSettings';  // or '../../hooks/...' depending on location
```

### Step 2: Use the Hook
```javascript
const { settings } = useSchoolSettings();
```

### Step 3: Replace Hardcoded Text
```javascript
// OLD:
<h1>DARUL QUR'AN</h1>

// NEW:
<h1>{settings.schoolName}</h1>
```

### Step 4: Add Logo (Optional)
```javascript
{settings.logoUrl && (
  <img 
    src={settings.logoUrl} 
    alt={settings.schoolName} 
    className="h-12 w-auto mb-4"
  />
)}
```

### Step 5: For PDF/Print Templates (HTML strings)
```javascript
const logoHTML = settings.logoUrl 
  ? `<img src="${settings.logoUrl}" alt="School Logo" style="height: 60px;" />`
  : '';

const htmlTemplate = `
  <div class="header">
    ${logoHTML}
    <h1>${settings.schoolName}</h1>
    <p>${settings.schoolAddress}</p>
  </div>
`;
```

## 🎨 Benefits After Implementation

1. **Single Upload Point** - Upload logo once in settings, appears everywhere
2. **Instant Updates** - Change school name, reflects across all pages immediately
3. **White-Label Ready** - Easy to customize for different schools
4. **Professional** - Logo on official documents looks more professional
5. **Consistent Branding** - School colors apply to all documents

## ⚠️ Important Notes

- **Fallback Values** - Hook provides defaults if API fails
- **Loading States** - Settings load async, components should handle this
- **Optional Logo** - Code should work with or without logo
- **Colors** - Use `settings.primaryColor` for consistent branding

## 📊 Impact

**Files to Update:** 10+  
**Lines to Change:** 20+  
**Time Estimate:** 2-3 hours for all files  
**Testing Required:** Print/export each document type

## 🚀 Quick Start

To update your first file (Payment Receipts):
1. Look at `EXAMPLE_UPDATED_PRINT_RECEIPT.jsx`
2. Copy the pattern
3. Apply to `client/src/components/PrintReceiptModal.jsx`
4. Test by printing a receipt
5. Verify logo appears and school name is correct

Would you like me to help update specific files one by one?
