# Dynamic School Branding Implementation Plan

## Objective
Replace all hardcoded school names ("DARUL QUR'AN", "DQ") and logos across the application with dynamic values from the school settings API.

## Files Requiring Updates

### 1. Payment Receipts
**File:** `client/src/components/PrintReceiptModal.jsx`
- **Lines to Update:** 138, 306, 478, 198 (all "DARUL QUR'AN" references)
- **Change:** Use `useSchoolSettings` hook to get dynamic school name and logo
- **Action:** 
  - Import `useSchoolSettings` hook
  - Fetch school settings
  - Replace hardcoded "DARUL QUR'AN" with `{settings.schoolName}`
  - Add logo image if `settings.logoUrl` exists

### 2. Report Cards
**File:** `client/src/pages/student/TermReportCard.jsx`
- **Line:** 322 - "DARUL QUR'AN"
- **Action:** Use `useSchoolSettings` hook and replace with dynamic name + logo

**File:** `client/src/pages/student/CumulativeReport.jsx`
- **Lines:** 296, 428 - "DARUL QUR'AN"
- **Action:** Use `useSchoolSettings` hook and replace with dynamic name + logo

### 3. Bulk Report Download
**File:** `client/src/pages/teacher/BulkReportDownload.jsx`
- **Lines:** 113, 430 - "DARUL QUR'AN"
- **Action:** Use `useSchoolSettings` hook and replace with dynamic name + logo

### 4. ID Card Generator
**File:** `client/src/pages/IDCardGenerator.jsx`
- **Line:** 149 - "DARUL QUR'AN"
- **Action:** Use `useSchoolSettings` hook and replace with dynamic name + logo

### 5. Examination Card
**File:** `client/src/pages/student/ExamCardGenerator.jsx`
- **Action:** Search for hardcoded school name and replace with dynamic values

### 6. Login Page
**File:** `client/src/pages/Login.jsx`
- **Lines:** 42 ("DQ"), 49 ("DARUL QUR'AN Management System")
- **Action:** Use `useSchoolSettings` hook for dynamic branding

### 7. Landing Page
**File:** `client/src/pages/LandingPage.jsx`
- **Lines:** 111 ("DQ"), 114, 354, 364 ("DARUL QUR'AN")
- **Action:** Use `useSchoolSettings` hook for dynamic branding

### 8. Dashboard
**File:** `client/src/pages/Dashboard.jsx`
- **Line:** 531 - "DARUL QUR'AN Management System"
- **Action:** Use `useSchoolSettings` hook for dynamic name

## Implementation Strategy

### Step 1: Already Completed ✅
Created reusable hook: `client/src/hooks/useSchoolSettings.js`

### Step 2: Update Components Systematically
For each component:
1. Import the hook: `import useSchoolSettings from '../../hooks/useSchoolSettings';`
2. Use the hook: `const { settings, loading } = useSchoolSettings();`
3. Replace hardcoded text with: `{settings.schoolName}`
4. Add logo where appropriate:
   ```jsx
   {settings.logoUrl && (
     <img src={settings.logoUrl} alt="School Logo" className="h-12 w-auto" />
   )}
   ```

### Step 3: PDF/Print Templates
For HTML templates (in PrintReceiptModal and BulkReportDownload):
- Pass settings as parameters to the template generation functions
- Replace hardcoded names in the HTML strings
- Add logo image tags in the HTML

### Step 4: Testing
Test each updated component to ensure:
- Default values work when settings haven't loaded
- Logo displays correctly when uploaded
- School name changes reflect immediately
- PDFs and printouts show correct branding

## Priority Order
1. **High Priority** - Payment receipts (users need these frequently)
2. **High Priority** - Report cards (official student documents)
3. **Medium Priority** - ID cards and exam cards
4. **Low Priority** - Login and landing pages (nice to have)

## Notes
- All components should handle loading states
- Fallback to "DARUL QUR'AN" if settings fail to load
- Logo should be optional (gracefully handle if not uploaded)
- Consider caching settings to avoid repeated API calls
