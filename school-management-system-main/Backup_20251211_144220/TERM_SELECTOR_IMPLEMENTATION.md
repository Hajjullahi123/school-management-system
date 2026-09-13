# COMPLETE IMPLEMENTATION: Term Selector for Fee Management

## 🎯 What This Adds

A dropdown navigation at the top of the Fee Management page to:
- ✅ Switch between Academic Sessions (2024/2025, etc.)
- ✅ Switch between Terms (First, Second, Third)
- ✅ View "All Terms" cumulative data
- ✅ Refresh data for selected term
- ✅ Clear visual indicator of what you're viewing

---

## 📝 STEP-BY-STEP IMPLEMENTATION

### STEP 1: Add State Variables (Line ~48)

**Find this section** in `FeeManagement.jsx`:
```javascript
// View mode
const [viewMode, setViewMode] = useState('table');
```

**Add AFTER it**:
```javascript
// View mode
const [viewMode, setViewMode] = useState('table');

// View filters - NEW: For term/session selection
const [selectedViewTerm, setSelectedViewTerm] = useState(null);
const [selectedViewSession, setSelectedViewSession] = useState(null);
const [viewAllTerms, setViewAllTerms] = useState(false);
```

---

### STEP 2: Update fetchData Function (Line ~54-89)

**Find the fetchData function**. At the END of it (before the `} finally {` line), ADD:

```javascript
    // Store all terms and sessions for payment selection
    setAllTerms(terms);
    setAllSessions(sessions);
    
    // Set default payment term/session to current
    setSelectedPaymentTerm(activeTerm);
    setSelectedPaymentSession(activeSession);
    
    // NEW: Set default VIEW term/session to current
    setSelectedViewTerm(activeTerm);
    setSelectedViewSession(activeSession);

    if (activeTerm && activeSession) {
      await loadStudents(activeTerm.id, activeSession.id);
      await loadSummary(activeTerm.id, activeSession.id);
    }
```

---

### STEP 3: Add Handler Functions (After fetchData, around line ~90)

**Add these TWO new functions** right after the `fetchData` function:

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
      setLoading(true);
      // Fetch students with fee records for all terms in the session
      const termsInSession = allTerms.filter(t => t.academicSessionId === sessionId);
      let allStudentsData = [];
      
      for (const term of termsInSession) {
        const response = await api.get(
          `/api/fees/students?termId=${term.id}&academicSessionId=${sessionId}`
        );
        const data = await response.json();
        
        // Add term info to each student's fee records
        data.forEach(student => {
          if (student.feeRecords && student.feeRecords.length > 0) {
            student.feeRecords.forEach(record => {
              record.termName = term.name;
            });
          }
        });
        
        allStudentsData = [...allStudentsData, ...data];
      }
      
      // Group by student ID and merge fee records
      const studentMap = new Map();
      allStudentsData.forEach(student => {
        if (!studentMap.has(student.id)) {
          studentMap.set(student.id, {
            ...student,
            feeRecords: []
          });
        }
        const existingStudent = studentMap.get(student.id);
        if (student.feeRecords && student.feeRecords.length > 0) {
          existingStudent.feeRecords.push(...student.feeRecords);
        }
      });
      
      const studentsArray = Array.from(studentMap.values());
      setStudents(studentsArray);
      calculateClassSummaries(studentsArray);
    } catch (error) {
      console.error('Error loading all terms data:', error);
      alert('Failed to load cumulative data');
    } finally {
      setLoading(false);
    }
  };
```

---

### STEP 4: Find the Return Statement and Add UI

**Find the return statement** (usually starts around line 400-600). It looks like:
```javascript
return (
  <div className="space-y-6">
    <h1 className="text-2xl font-bold text-gray-900">Fee Management</h1>
```

**RIGHT AFTER the `<h1>` tag**, ADD this complete dropdown section:

```jsx
    <h1 className="text-2xl font-bold text-gray-900">Fee Management</h1>

    {/* Term/Session Selector - NEW */}
    {!loading && selectedViewSession && (
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
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '14px', color: '#374151' }}>
              Academic Session
            </label>
            <select
              value={selectedViewSession?.id || ''}
              onChange={(e) => {
                const sessionId = parseInt(e.target.value);
                const session = allSessions.find(s => s.id === sessionId);
                setSelectedViewSession(session);
                
                if (viewAllTerms) {
                  handleViewFilterChange(null, sessionId, true);
                } else {
                  const firstTerm = allTerms.find(t => t.academicSessionId === sessionId);
                  if (firstTerm) {
                    handleViewFilterChange(firstTerm.id, sessionId, false);
                  }
                }
              }}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: 'white',
                cursor: 'pointer'
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
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '14px', color: '#374151' }}>
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
                fontSize: '14px',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="all">📊 All Terms (Cumulative)</option>
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
            background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
            padding: '10px 15px',
            borderRadius: '6px',
            border: '2px solid #0f766e'
          }}>
            <div style={{ fontSize: '11px', color: '#059669', marginBottom: '3px', fontWeight: '600', textTransform: 'uppercase' }}>
              Currently Viewing
            </div>
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
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.target.style.background = '#14b8a6'}
              onMouseOut={(e) => e.target.style.background = '#0f766e'}
            >
              <span>🔄</span>
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Info Banner */}
        {viewAllTerms && (
          <div style={{
            marginTop: '15px',
            padding: '12px',
            background: '#fffbeb',
            border: '1px solid #fbbf24',
            borderRadius: '6px',
            fontSize: '14px',
            color: '#92400e'
          }}>
            ℹ️ <strong>Cumulative View:</strong> Showing combined fee records from all terms in {selectedViewSession?.name}. 
            Each student shows total expected, paid, and balance across all terms.
          </div>
        )}
      </div>
    )}

    {/* Rest of your existing content continues here... */}
```

---

## 🎨 WHAT IT LOOKS LIKE

The dropdown will appear at the top with:

```
┌─ 📅 View Fee Records ─────────────────────────────────────┐
│                                                             │
│ [Academic Session ▼] [Term ▼]  [Currently Viewing] [🔄 Refresh] │
│  2024/2025 (Current)   Second Term    2024/2025 - Second Term   │
│                        First Term                                │
│                        Third Term                                │
│                        📊 All Terms                              │
└──────────────────────────────────────────────────────────────┘
```

---

## ✅ TESTING

After adding the code:

1. **Refresh the page** - You should see the dropdown at the top
2. **Test Session Selector** - Change session, data should reload
3. **Test Term Selector** - Switch between First, Second, Third
4. **Test "All Terms"** - Select "All Terms (Cumulative)" to see combined data
5. **Test Refresh** - Click refresh button to reload current selection

---

## 📊 FEATURES

✅ **Session Dropdown** - View any academic year  
✅ **Term Dropdown** - View specific term or all terms  
✅ **Visual Indicator** - Green box shows what you're viewing  
✅ **Refresh Button** - Reload data on demand  
✅ **Current Term Marked** - Shows "(Current)" label  
✅ **Cumulative View** - "All Terms" option combines all terms  
✅ **Info Banner** - Explains cumulative view when active  
✅ **Hover Effects** - Button changes color on hover  

---

## 🚀 RESULT

After implementation, you can:
- ✅ View First Term fee records
- ✅ View Second Term fee records
- ✅ View Third Term fee records
- ✅ View ALL terms combined (cumulative)
- ✅ Switch between academic sessions
- ✅ See totals update automatically

No more need to run scripts to switch terms! 🎉

---

## 📝 FILE TO MODIFY

**Single file**: `client/src/pages/accountant/FeeManagement.jsx`

**Total additions**: 
- ~5 lines (state)
- ~60 lines (functions)
- ~100 lines (UI)
- **≈165 lines total**

---

## 💡 NEED HELP?

If you're unsure where exactly to add the code:
1. Open `FeeManagement.jsx`
2. Search for `const [viewMode, setViewMode]` - Add state after this
3. Search for `const fetchData = async` - Add functions after this function ends
4. Search for `return (` and `<h1` - Add UI dropdown after the h1 tag

The code is designed to work with your existing structure!
