# Adding Term Selector to Fee Management Page

## Instructions to Add Term/Session Dropdown

Add this code to the Fee Management page to allow viewing different terms.

### Step 1: Add State for View Term/Session Selection

Find where state variables are defined (near the top of FeeManagement function), and add:

```javascript
// View filters - for selecting which term/session to view
const [selectedViewTerm, setSelectedViewTerm] = useState(null);
const [selectedViewSession, setSelectedViewSession] = useState(null);
const [viewAllTerms, setViewAllTerms] = useState(false);
```

### Step 2: Update fetchData to Set Default View Term

In the `fetchData` function, after setting `allTerms` and `allSessions`, add:

```javascript
// Set default view to current term/session
setSelectedViewTerm(activeTerm);
setSelectedViewSession(activeSession);
```

### Step 3: Add Function to Handle Term/Session Change

Add this function after `fetchData`:

```javascript
const handleViewFilterChange = async (termId, sessionId, viewAll = false) => {
  setViewAllTerms(viewAll);
  
  if (viewAll) {
    // Load data for all terms in the session
    setSelectedViewTerm(null);
    await loadStudentsAllTerms(sessionId);
  } else {
    const term = allTerms.find(t => t.id === termId);
    const session = allSessions.find(s => s.id === sessionId);
    setSelectedViewTerm(term);
    setSelectedViewSession(session);
    await loadStudents(termId, sessionId);
    await loadSummary(termId, sessionId);
  }
};

const loadStudentsAllTerms = async (sessionId) => {
  try {
    // Fetch students with fee records for all terms in the session
    const termsInSession = allTerms.filter(t => t.academicSessionId === sessionId);
    let allStudentsData = [];
    
    for (const term of termsInSession) {
      const response = await api.get(
        `/api/fees/students?termId=${term.id}&academicSessionId=${sessionId}`
      );
      const data = await response.json();
      allStudentsData = [...allStudentsData, ...data];
    }
    
    // Group by student and aggregate
    const studentMap = {};
    allStudentsData.forEach(student => {
      if (!studentMap[student.id]) {
        studentMap[student.id] = {
          ...student,
          feeRecords: []
        };
      }
      if (student.feeRecords && student.feeRecords.length > 0) {
        studentMap[student.id].feeRecords.push(...student.feeRecords);
      }
    });
    
    const studentsArray = Object.values(studentMap);
    setStudents(studentsArray);
    calculateClassSummaries(studentsArray);
  } catch (error) {
    console.error('Error loading all terms data:', error);
  }
};
```

### Step 4: Add the UI Dropdowns

Add this HTML/JSX near the top of the return statement, BEFORE the statistics/summary cards:

```jsx
{/* Term/Session Selector */}
<div style={{
  background: 'white',
  padding: '20px',
  borderRadius: '8px',
  marginBottom: '20px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
}}>
  <h3 style={{ marginBottom: '15px', color: '#0f766e', fontSize: '18px', fontWeight: 'bold' }}>
    📅 View Fee Records
  </h3>
  
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '15px', alignItems: 'end' }}>
    {/* Session Selector */}
    <div>
      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '14px' }}>
        Academic Session
      </label>
      <select
        value={selectedViewSession?.id || ''}
        onChange={(e) => {
          const session = allSessions.find(s => s.id === parseInt(e.target.value));
          setSelectedViewSession(session);
          // Reset to first term of new session
          const firstTerm = allTerms.find(t => t.academicSessionId === parseInt(e.target.value));
          if (firstTerm && !viewAllTerms) {
            handleViewFilterChange(firstTerm.id, parseInt(e.target.value), false);
          } else if (viewAllTerms) {
            handleViewFilterChange(null, parseInt(e.target.value), true);
          }
        }}
        style={{
          width: '100%',
          padding: '10px',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          fontSize: '14px'
        }}
      >
        {allSessions.map(s => (
          <option key={s.id} value={s.id}>
            {s.name} {s.isCurrent ? '(Current)' : ''}
          </option>
        ))}
      </select>
    </div>

    {/* Term Selector */}
    <div>
      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '14px' }}>
        Term
      </label>
      <select
        value={viewAllTerms ? 'all' : (selectedViewTerm?.id || '')}
        onChange={(e) => {
          if (e.target.value === 'all') {
            handleViewFilterChange(null, selectedViewSession.id, true);
          } else {
            const termId = parseInt(e.target.value);
            handleViewFilterChange(termId, selectedViewSession.id, false);
          }
        }}
        style={{
          width: '100%',
          padding: '10px',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          fontSize: '14px'
        }}
      >
        <option value="all">All Terms (Cumulative)</option>
        {allTerms
          .filter(t => t.academicSessionId === selectedViewSession?.id)
          .map(t => (
            <option key={t.id} value={t.id}>
              {t.name} {t.isCurrent ? '(Current)' : ''}
            </option>
          ))
        }
      </select>
    </div>

    {/* Current Selection Display */}
    <div style={{
      background: '#f0fdf4',
      padding: '10px 15px',
      borderRadius: '6px',
      border: '1px solid #0f766e'
    }}>
      <div style={{ fontSize: '12px', color: '#059669', marginBottom: '3px' }}>Viewing:</div>
      <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f766e' }}>
        {viewAllTerms 
          ? `${selectedViewSession?.name} - All Terms`
          : `${selectedViewSession?.name} - ${selectedViewTerm?.name}`
        }
      </div>
    </div>

    {/* Refresh Button */}
    <div>
      <button
        onClick={() => {
          if (viewAllTerms) {
            handleViewFilterChange(null, selectedViewSession.id, true);
          } else {
            handleViewFilterChange(selectedViewTerm.id, selectedViewSession.id, false);
          }
        }}
        style={{
          padding: '10px 20px',
          background: '#0f766e',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '600'
        }}
      >
        🔄 Refresh
      </button>
    </div>
  </div>
</div>
```

### Step 5: Where to Add This Code

**Location in FeeManagement.jsx:**

Find the `return (` statement in the component. Add the selector dropdown RIGHT AFTER the opening tags but BEFORE any summary/statistics cards.

Typically it would go:
```jsx
return (
  <div className="space-y-6">
    <h1 className="text-2xl font-bold text-gray-900">Fee Management</h1>
    
    {/* ADD THE TERM/SESSION SELECTOR HERE */}
    {/* The code from Step 4 goes here */}
    
    {/* Then the rest of your existing content... */}
    {/* Summary cards, student table, etc. */}
```

---

## Quick Summary

This will add:
- ✅ **Session dropdown** - Select which academic year to view
- ✅ **Term dropdown** - Select specific term OR "All Terms"
- ✅ **Current selection display** - Shows what you're viewing
- ✅ **Refresh button** - Reload data for selected term
- ✅ **All Terms option** - View cumulative data across all terms in a session

The dropdowns will:
- Default to current session and term
- Allow switching between First, Second, Third term
- Show "All Terms (Cumulative)" option
- Automatically load data when changed
- Display clearly what term/session you're viewing

---

## Complete File Location

**File to modify**: `client/src/pages/accountant/FeeManagement.jsx`

Would you like me to:
1. Create a complete modified version of the file with these changes?
2. Show you the exact line numbers where to add each piece?
