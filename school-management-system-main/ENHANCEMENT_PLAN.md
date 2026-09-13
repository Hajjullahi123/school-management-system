# Fee Management & Class Management Enhancement Plan

## Overview
This document outlines the implementation plan for the requested features:
1. Edit fee structure after it has been set
2. Delete class without affecting student records
3. Print receipt button for each student
4. Print receipts on termly basis
5. Print cumulative receipt for all terms

---

## 1. Edit Fee Structure (READY TO IMPLEMENT)

### Current Status
✅ **Backend is ALREADY READY!**
- The POST `/api/fee-structure/setup` endpoint uses `upsert` which creates OR updates
- When you select an existing class + term + session combination, it updates the amount
- It automatically recalculates all student balances

### What Needs To Be Done
**Frontend Changes** in `client/src/pages/admin/FeeStructureSetup.jsx`:

1. **Add Edit Button to Fee Structures Table**
   - Add "Actions" column
   - Add Edit and Delete buttons for each fee structure

2. **Populate Form When Edit is Clicked**
   - Click Edit → fills form with fee structure data
   - User can modify amount or description
   - Submit button text changes to "Update Fee Structure"

3. **Add Editing State**
   ```javascript
   const [editingStructure, setEditingStructure] = useState(null);
   ```

4. **Modify handleSubmit**
   - Detect if editing (editingStructure is not null)
   - Show appropriate success message

### Implementation Steps
1. Add state `editingStructure`
2. Add Actions column to table
3. Create `handleEdit(structure)` function
4. Update form when editing
5. Update button text dynamically
6. Add cancel button when editing

---

## 2. Delete Class Without Affecting Students

### Current Problem
If a class is deleted, students assigned to that class will have `classId` pointing to non-existent class which will cause errors.

### Solution: Soft Delete or Unassign

**Option A: Soft Delete (Recommended)**
- Add `isActive` or `isDeleted` column to `Class` model
- Mark class as deleted but don't remove from database
- Filter deleted classes from dropdowns
- Students keep their classId but it points to inactive class

**Option B: Unassign Students**
- When class is deleted, set all students' `classId` to NULL
- Students become "unassigned"
- Can be reassigned to new class later

**Recommendation: Use Soft Delete** because:
- Preserves historical data
- Better for reporting
- Can be "undeleted" if needed
- Fee records remain intact

### Implementation Steps

**Database Schema Change**:
```prisma
model Class {
  id           Int        @id @default(autoincrement())
  name         String
  arm          String?
  isActive     Boolean    @default(true)  // ADD THIS
  // ...existing fields
}
```

**Backend Changes**:
1. Add migration for `isActive` field
2. Modify GET /api/classes to filter by `isActive: true`
3. Create DELETE /api/classes/:id that sets `isActive: false`
4. Don't actually delete the record

**Frontend Changes**:
1. Add Delete button in ClassManagement
2. Confirm before deleting
3. Show deleted classes separately (or hide them)
4. Optional: Add "Restore" button for deleted classes

---

## 3. Print Receipt Button for Each Student

### Where to Add
**In Fee Management Page** (`FeeManagement.jsx`):
- In the Actions column for each student
- Next to "Record Payment" and "Clear Student" buttons

### What It Does
- Shows all payments made by the student
- Allows printing individual payment receipts
- Allows printing consolidated receipt for a term
- Allows printing cumulative receipt for all terms

### UI Design
```
Actions Column:
[Record Payment] [View History] [Print Receipt]
```

When "Print Receipt" is clicked:
```
┌─ Print Receipt Modal ──────────────┐
│ Student: John Doe (ADM001)          │
│ Class: JSS 2A                      │
│                                     │
│ Select Receipt Type:                │
│ ○ Single Payment Receipt           │
│ ○ Term Receipt (All payments)      │
│ ○ Cumulative Receipt (All terms)   │
│                                     │
│ [If Single] Select Payment:        │
│ └─ Dropdown of payments            │
│                                     │
│ [If Term] Select Term:             │
│ └─ Dropdown of terms               │
│                                     │
│        [Cancel] [Print Receipt]    │
└─────────────────────────────────────┘
```

### Implementation Steps
1. Add "Print Receipt" button to Actions column
2. Create `PrintReceiptModal` component
3. Add state for modal visibility and selection
4. Create print functions for:
   - Single payment
   - Term-based receipt
   - Cumulative receipt

---

## 4. Print Term-Based Receipt

### What It Shows
```
┌─ SCHOOL NAME ─────────────────────┐
│        TERM PAYMENT RECEIPT        │
├────────────────────────────────────┤
│ Student: John Doe                  │
│ Admission No: ADM001               │
│ Class: JSS 2A                      │
│ Academic Session: 2024/2025        │
│ Term: First Term                   │
├────────────────────────────────────┤
│ PAYMENT DETAILS                    │
│                                     │
│ Date          Amount    Method     │
│ ──────────────────────────────────│
│ 2024-09-15   ₦50,000  Bank        │
│ 2024-10-01   ₦30,000  Cash        │
│ 2024-10-20   ₦20,000  Transfer    │
│                                     │
│ Total Paid:    ₦100,000            │
│ Expected:      ₦100,000            │
│ Balance:       ₦0                  │
├────────────────────────────────────┤
│ Status: FULLY PAID ✓               │
│                                     │
│ Printed on: 2024-12-10             │
│ By: School Accountant              │
└────────────────────────────────────┘
```

### Implementation
```javascript
const printTermReceipt = async (student, termId, sessionId) => {
  // Fetch all payments for this student, term, session
  const payments = await api.get(
    `/api/fees/payments/${student.id}?termId=${termId}&sessionId=${sessionId}`
  );
  
  // Get fee record for totals
  const feeRecord = await api.get(
    `/api/fees/student/${student.id}?termId=${termId}&sessionId=${sessionId}`
  );
  
  // Generate printable HTML
  const receiptHTML = generateTermReceiptHTML(student, payments, feeRecord);
  
  // Open print window
  const printWindow = window.open('', '_blank');
  printWindow.document.write(receiptHTML);
  printWindow.document.close();
  printWindow.print();
};
```

---

## 5. Print Cumulative Receipt (All Terms)

### What It Shows
```
┌─ SCHOOL NAME ─────────────────────┐
│   CUMULATIVE PAYMENT RECEIPT       │
├────────────────────────────────────┤
│ Student: John Doe                  │
│ Admission No: ADM001               │
│ Class: JSS 2A                      │
│ Academic Session: 2024/2025        │
├────────────────────────────────────┤
│ PAYMENT BREAKDOWN BY TERM          │
│                                     │
│ FIRST TERM                         │
│ Expected:  ₦100,000                │
│ Paid:      ₦100,000                │
│ Balance:   ₦0                      │
│ Payments: 3                        │
│                                     │
│ SECOND TERM                        │
│ Expected:  ₦100,000                │
│ Paid:      ₦50,000                 │
│ Balance:   ₦50,000                 │
│ Payments: 2                        │
│                                     │
│ THIRD TERM                         │
│ Expected:  ₦100,000                │
│ Paid:      ₦0                      │
│ Balance:   ₦100,000                │
│ Payments: 0                        │
├────────────────────────────────────┤
│ GRAND TOTAL                        │
│ Total Expected:  ₦300,000          │
│ Total Paid:      ₦150,000          │
│ Total Balance:   ₦150,000          │
│ Payment Rate:    50.0%             │
├────────────────────────────────────┤
│ Printed on: 2024-12-10             │
│ By: School Accountant              │
└────────────────────────────────────┘
```

### Implementation
```javascript
const printCumulativeReceipt = async (student, sessionId) => {
  // Fetch ALL fee records for student in this session
  const feeRecords = await api.get(
    `/api/fees/student-session/${student.id}?sessionId=${sessionId}`
  );
  
  // Group by term
  const termSummaries = feeRecords.reduce((acc, record) => {
    if (!acc[record.termId]) {
      acc[record.termId] = {
        term: record.term,
        expected: 0,
        paid: 0,
        balance: 0,
        payments: []
      };
    }
    acc[record.termId].expected += record.expectedAmount;
    acc[record.termId].paid += record.paidAmount;
    acc[record.termId].balance += record.balance;
    return acc;
  }, {});
  
  // Generate printable HTML
  const receiptHTML = generateCumulativeReceiptHTML(student, termSummaries);
  
  // Open print window
  const printWindow = window.open('', '_blank');
  printWindow.document.write(receiptHTML);
  printWindow.document.close();
  printWindow.print();
};
```

---

## Implementation Priority

### Phase 1: Immediate (Today)
1. ✅ Add Edit button to Fee Structure table
2. ✅ Implement edit functionality (populate form)
3. ✅ Add soft delete to Class model

### Phase 2: High Priority (Next)
4. ✅ Add "Print Receipt" button to student actions
5. ✅ Implement single payment receipt printing
6. ✅ Implement term-based receipt

### Phase 3: Important
7. ✅ Implement cumulative receipt
8. ✅ Add delete class functionality with soft delete

### Phase 4: Polish
9. Add receipt templates customization
10. Add school logo to receipts
11. Add receipt numbering system

---

## Files To Modify

### Backend
1. `server/prisma/schema.prisma` - Add isActive to Class model
2. `server/routes/classes.js` - Add soft delete endpoint
3. `server/routes/fee-management.js` - Add cumulative receipt endpoint (optional)

### Frontend
1. `client/src/pages/admin/FeeStructureSetup.jsx` - Add edit/delete UI
2. `client/src/pages/accountant/FeeManagement.jsx` - Add print receipt buttons
3. `client/src/components/PrintReceiptModal.jsx` - New component for receipt printing
4. `client/src/pages/admin/ClassManagement.jsx` - Add delete class button

---

## Next Steps

Would you like me to:
1. Start with Fee Structure edit functionality?
2. Implement Class soft delete?
3. Add Print Receipt buttons and modal?
4. Implement all receipt types?

Please let me know which feature to prioritize, and I'll implement it immediately!
