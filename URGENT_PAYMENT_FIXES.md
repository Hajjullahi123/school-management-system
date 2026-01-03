# URGENT FIXES - Payment Modal & Receipts

## Issue 1: No Term Selection UI in Payment Modal ❌

**Problem**: Backend is ready (`selectedPaymentTerm`, `selectedPaymentSession`) but UI doesn't show dropdowns.

**Solution**: Add these dropdowns to the payment recording modal.

### Where to Add (in FeeManagement.jsx):

Find the payment modal rendering section (search for "Record Payment" or "selectedStudent"), then add these dropdowns BEFORE the payment amount field:

```jsx
{/* Term/Session Selection - ADD THIS */}
{selectedStudent && (
  <div style={{ marginBottom: '20px', padding: '15px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #0f766e' }}>
    <h4 style={{ color: '#0f766e', marginBottom: '10px' }}>Payment Term Selection</h4>
    
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
      <div>
        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
          Academic Session
        </label>
        <select
          value={selectedPaymentSession?.id || ''}
          onChange={(e) => {
            const session = allSessions.find(s => s.id === parseInt(e.target.value));
            setSelectedPaymentSession(session);
            // Reset term to first term of new session
            const firstTerm = allTerms.find(t => t.academicSessionId === parseInt(e.target.value));
            setSelectedPaymentTerm(firstTerm);
          }}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #d1d5db',
            borderRadius: '4px'
          }}
        >
          {allSessions.map(s => (
            <option key={s.id} value={s.id}>
              {s.name} {s.isCurrent ? '(Current)' : ''}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label style={{  display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
          Term
        </label>
        <select
          value={selectedPaymentTerm?.id || ''}
          onChange={(e) => {
            const term = allTerms.find(t => t.id === parseInt(e.target.value));
            setSelectedPaymentTerm(term);
          }}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #d1d5db',
            borderRadius: '4px'
          }}
        >
          {allTerms
            .filter(t => t.academicSessionId === selectedPaymentSession?.id)
            .map(t => (
              <option key={t.id} value={t.id}>
                {t.name} {t.isCurrent ? '(Current)' : ''}
              </option>
            ))
          }
        </select>
      </div>
    </div>
    
    <p style={{ fontSize: '0.875rem', color: '#059669', marginTop: '10px' }}>
      ℹ️ Recording payment for: <strong>{selectedPaymentSession?.name} - {selectedPaymentTerm?.name}</strong>
    </p>
  </div>
)}
```

---

## Issue 2: Official Name/Rank Not in Receipt ❌

**Problem**: Receipt doesn't show who recorded the payment.

**Solution**: Update the `printReceipt` function in FeeManagement.jsx

### Fix the printReceipt function:

Find the `printReceipt` function and modify the receipt HTML to include recorder information:

```jsx
const printReceipt = (payment, student) => {
  const receiptWindow = window.open('', '_blank', 'width=800,height=600');
  if (!receiptWindow) {
    alert("Pop-up blocked. Please allow pop-ups for this site to print receipts.");
    return;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payment Receipt #${payment.id}</title>
      <style>
        @media print {
          body { margin: 0; padding: 20px; }
          .no-print { display: none !important; }
        }
        body { 
          font-family: 'Arial', sans-serif; 
          max-width: 800px; 
          margin: 0 auto; 
          padding: 40px;
          background: #f9fafb;
        }
        .receipt-container {
          background: white;
          padding: 40px;
          border-radius: 10px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .school-name {
          font-size: 32px;
          font-weight: bold;
          color: #0f766e;
          text-align: center;
          margin-bottom: 5px;
          text-transform: uppercase;
          letter-spacing: 2px;
        }
        .receipt-title {
          font-size: 20px;
          color: #666;
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 3px solid #0f766e;
        }
        .section {
          margin: 20px 0;
        }
        .section-title {
          font-weight: bold;
          color: #0f766e;
          margin-bottom: 10px;
          font-size: 16px;
        }
        .info-row {
          display: flex;
          padding: 8px 0;
          border-bottom: 1px solid #eee;
        }
        .info-label {
          font-weight: bold;
          width: 180px;
        }
        .info-value {
          flex: 1;
        }
        .amount-box {
          background: linear-gradient(135deg, #0f766e, #14b8a6);
          color: white;
          padding: 25px;
          border-radius: 10px;
          text-align: center;
          margin: 30px 0;
        }
        .amount-label {
          font-size: 14px;
          opacity: 0.9;
        }
        .amount-value {
          font-size: 36px;
          font-weight: bold;
          margin-top: 10px;
        }
        .official-section {
          background: #f0fdf4;
          padding: 15px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 4px solid #0f766e;
        }
        .signature-section {
          display: flex;
          justify-content: space-between;
          margin-top: 60px;
        }
        .signature-box {
          text-align: center;
        }
        .signature-line {
          border-top: 2px solid #333;
          width: 200px;
          margin-top: 50px;
        }
        .footer {
          text-align: center;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid #eee;
          font-size: 12px;
          color: #999;
        }
        .print-btn {
          background: #0f766e;
          color: white;
          padding: 12px 30px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 16px;
        }
      </style>
    </head>
    <body>
      <div class="receipt-container">
        <div class="school-name">DARUL QUR'AN</div>
        <div class="receipt-title">PAYMENT RECEIPT</div>
        
        <div class="section">
          <div class="section-title">Student Information</div>
          <div class="info-row">
            <div class="info-label">Student Name:</div>
            <div class="info-value">${student.user.firstName} ${student.user.lastName}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Admission Number:</div>
            <div class="info-value">${student.admissionNumber}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Class:</div>
            <div class="info-value">${student.classModel?.name || 'N/A'} ${student.classModel?.arm || ''}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Payment Details</div>
          <div class="info-row">
            <div class="info-label">Receipt No:</div>
            <div class="info-value">PAY-${payment.id}-${Date.now()}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Payment Date:</div>
            <div class="info-value">${new Date(payment.paymentDate).toLocaleDateString()}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Payment Method:</div>
            <div class="info-value">${payment.paymentMethod.toUpperCase()}</div>
          </div>
          ${payment.reference ? `
          <div class="info-row">
            <div class="info-label">Reference:</div>
            <div class="info-value">${payment.reference}</div>
          </div>` : ''}
          ${payment.notes ? `
          <div class="info-row">
            <div class="info-label">Notes:</div>
            <div class="info-value">${payment.notes}</div>
          </div>` : ''}
        </div>

        <div class="amount-box">
          <div class="amount-label">Amount Paid</div>
          <div class="amount-value">₦${payment.amount.toLocaleString()}</div>
        </div>

        <div class="official-section">
          <div class="section-title">Received By</div>
          <div class="info-row">
            <div class="info-label">Name:</div>
            <div class="info-value">${payment.recordedByUser?.firstName || 'Accountant'} ${payment.recordedByUser?.lastName || ''}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Position:</div>
            <div class="info-value">${payment.recordedByUser?.role?.toUpperCase() || 'ACCOUNTANT'}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Date & Time:</div>
            <div class="info-value">${new Date(payment.paymentDate).toLocaleString()}</div>
          </div>
        </div>

        <div class="signature-section">
          <div class="signature-box">
            <div class="signature-line"></div>
            <div style="margin-top: 10px; font-weight: bold;">Accountant's Signature</div>
          </div>
          <div class="signature-box">
            <div class="signature-line"></div>
            <div style="margin-top: 10px; font-weight: bold;">Parent's Signature</div>
          </div>
        </div>

        <div class="footer">
          <p><strong>DARUL QUR'AN</strong></p>
          <p>This is an official receipt. Keep for your records.</p>
          <p>Printed on: ${new Date().toLocaleString()}</p>
        </div>

        <div class="no-print" style="text-align: center; margin-top: 30px;">
          <button class="print-btn" onclick="window.print()">Print Receipt</button>
          <button class="print-btn" onclick="window.close()" style="background: #666; margin-left: 10px;">Close</button>
        </div>
      </div>
    </body>
    </html>
  `;

  receiptWindow.document.write(htmlContent);
  receiptWindow.document.close();
};
```

---

## Issue 3: School Name Not Bold on Receipt ❌

**Solution**: Already fixed in the above code! See the `.school-name` class with:
- `font-weight: bold`
- `font-size: 32px`
- `text-transform: uppercase`
- `letter-spacing: 2px`

---

## Quick Summary of Changes Needed:

1. **Add Term Selection UI** - Insert the dropdown code in payment modal
2. **Update printReceipt** - Replace entire function with new version above
3. **School Name** - Already bold and prominent in new receipt

These changes will:
- ✅ Show term/session selection when recording payment
- ✅ Display official's name and rank on receipt
- ✅ Show school name boldly on top of receipt
- ✅ Include "Received By" section with official details

---

## Backend Note:

The backend needs to include the `recordedByUser` information in the payment response. Check if this relation is already included in `/api/fees/payment` endpoint. If not, modify the endpoint to include:

```javascript
include: {
  recordedByUser: {
    select: {
      firstName: true,
      lastName: true,
      role: true
    }
  }
}
```

This ensures the official's information is available for the receipt.
