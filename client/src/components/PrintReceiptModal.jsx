import { useState, useEffect } from 'react';
import { api } from '../api';
import useSchoolSettings from '../hooks/useSchoolSettings';

export default function PrintReceiptModal({ student, isOpen, onClose, currentTerm, currentSession, allTerms, allSessions }) {
  const { settings: schoolSettings } = useSchoolSettings();
  const [receiptType, setReceiptType] = useState('single');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [selectedTerm, setSelectedTerm] = useState(currentTerm);
  const [selectedSession, setSelectedSession] = useState(currentSession);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && student) {
      fetchPayments();
    }
  }, [isOpen, student, selectedTerm, selectedSession]);

  const fetchPayments = async () => {
    if (!student || !selectedTerm || !selectedSession) return;

    setLoading(true);
    try {
      const response = await api.get(
        `/api/fees/payments/${student.id}?termId=${selectedTerm.id}&academicSessionId=${selectedSession.id}`
      );
      const data = await response.json();
      setPayments(data || []);
      if (data && data.length > 0) {
        setSelectedPayment(data[0]);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const generateSinglePaymentReceipt = (payment) => {
    const logoHTML = schoolSettings.logoUrl
      ? `<img src="${schoolSettings.logoUrl}" alt="School Logo" style="height: 60px; margin: 0 auto 15px; display: block;" />`
      : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Receipt</title>
        <style>
          @media print {
            body { margin: 0; padding: 20px; }
            .no-print { display: none; }
          }
          body {
            font-family: 'Arial', sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          .receipt-header {
            text-align: center;
            border-bottom: 3px solid ${schoolSettings.primaryColor || '#0f766e'};
            padding-bottom: 20px;
            margin-bottom: 20px;
          }
          .school-name {
            font-size: 24px;
            font-weight: bold;
            color: ${schoolSettings.primaryColor || '#0f766e'};
            margin-bottom: 5px;
          }
          .school-address {
            font-size: 12px;
            color: #666;
            margin-bottom: 10px;
          }
          .receipt-title {
            font-size: 18px;
            color: #666;
            margin-top: 10px;
          }
          .receipt-number {
            font-size: 14px;
            color: #999;
            margin-top: 5px;
          }
          .student-info, .payment-info {
            margin: 20px 0;
          }
          .info-row {
            display: flex;
            padding: 8px 0;
            border-bottom: 1px solid #eee;
          }
          .info-label {
            font-weight: bold;
            width: 200px;
            color: #333;
          }
          .info-value {
            flex: 1;
            color: #666;
          }
          .amount-box {
            background: #f0fdf4;
            border: 2px solid ${schoolSettings.primaryColor || '#0f766e'};
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            text-align: center;
          }
          .amount-label {
            font-size: 14px;
            color: #666;
            margin-bottom: 10px;
          }
          .amount-value {
            font-size: 32px;
            font-weight: bold;
            color: ${schoolSettings.primaryColor || '#0f766e'};
          }
          .receipt-footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #eee;
            text-align: center;
            color: #999;
            font-size: 12px;
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
            border-top: 1px solid #333;
            width: 200px;
            margin-top: 40px;
          }
        </style>
      </head>
      <body>
        <div class="receipt-header">
          ${logoHTML}
          <div class="school-name">${schoolSettings.schoolName || 'School Name'}</div>
          ${schoolSettings.schoolAddress ? `<div class="school-address">${schoolSettings.schoolAddress}</div>` : ''}
          <div class="receipt-title">PAYMENT RECEIPT</div>
          <div class="receipt-number">Receipt No: PAY-${payment.id}-${Date.now()}</div>
        </div>

        <div class="student-info">
          <h3 style="color: ${schoolSettings.primaryColor || '#0f766e'}; margin-bottom: 15px;">Student Information</h3>
          <div class="info-row">
            <span class="info-label">Student Name:</span>
            <span class="info-value">${student.user.firstName} ${student.user.lastName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Admission Number:</span>
            <span class="info-value">${student.admissionNumber}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Class:</span>
            <span class="info-value">${student.classModel?.name || 'N/A'} ${student.classModel?.arm || ''}</span>
          </div>
        </div>

        <div class="payment-info">
          <h3 style="color: ${schoolSettings.primaryColor || '#0f766e'}; margin-bottom: 15px;">Payment Details</h3>
          <div class="info-row">
            <span class="info-label">Payment Date:</span>
            <span class="info-value">${new Date(payment.paymentDate).toLocaleDateString()}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Payment Method:</span>
            <span class="info-value">${payment.paymentMethod.toUpperCase()}</span>
          </div>
          ${payment.reference ? `
          <div class="info-row">
            <span class="info-label">Reference:</span>
            <span class="info-value">${payment.reference}</span>
          </div>` : ''}
          ${payment.notes ? `
          <div class="info-row">
            <span class="info-label">Notes:</span>
            <span class="info-value">${payment.notes}</span>
          </div>` : ''}
        </div>

        <div class="amount-box">
          <div class="amount-label">Amount Paid</div>
          <div class="amount-value">₦${payment.amount.toLocaleString()}</div>
        </div>

        <div class="signature-section">
          <div class="signature-box">
            <div class="signature-line"></div>
            <div style="margin-top: 10px;">Accountant's Signature</div>
          </div>
          <div class="signature-box">
            <div class="signature-line"></div>
            <div style="margin-top: 10px;">Parent's Signature</div>
          </div>
        </div>

        <div class="receipt-footer">
          <p>This is an official receipt from ${schoolSettings.schoolName || 'School Management System'}</p>
          ${schoolSettings.schoolPhone ? `<p>Contact: ${schoolSettings.schoolPhone} ${schoolSettings.schoolEmail ? `| ${schoolSettings.schoolEmail}` : ''}</p>` : ''}
          <p>Printed on: ${new Date().toLocaleString()}</p>
          <p>If you have any questions, please contact the school office</p>
        </div>

        <div class="no-print" style="text-align: center; margin-top: 20px;">
          <button onclick="window.print()" style="padding: 10px 20px; background: ${schoolSettings.primaryColor || '#0f766e'}; color: white; border: none; border-radius: 5px; cursor: pointer;">
            Print Receipt
          </button>
          <button onclick="window.close()" style="padding: 10px 20px; background: #666; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">
            Close
          </button>
        </div>
      </body>
      </html>
    `;
  };

  const generateTermReceipt = async () => {
    const logoHTML = schoolSettings.logoUrl
      ? `<img src="${schoolSettings.logoUrl}" alt="School Logo" style="height: 60px; margin: 0 auto 15px; display: block;" />`
      : '';
    // Fetch fee record for term totals
    let feeRecord = null;
    try {
      const response = await api.get(
        `/api/fees/students?termId=${selectedTerm.id}&academicSessionId=${selectedSession.id}`
      );
      const data = await response.json();
      const students = data || [];
      feeRecord = students.find(s => s.id === student.id);
    } catch (error) {
      console.error('Error fetching fee record:', error);
    }

    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Term Payment Receipt</title>
        <style>
          @media print {
            body { margin: 0; padding: 20px; }
            .no-print { display: none; }
          }
          body {
            font-family: 'Arial', sans-serif;
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
          }
          .receipt-header {
            text-align: center;
            border-bottom: 3px solid ${schoolSettings.primaryColor || '#0f766e'};
            padding-bottom: 20px;
            margin-bottom: 20px;
          }
          .school-name {
            font-size: 24px;
            font-weight: bold;
            color: ${schoolSettings.primaryColor || '#0f766e'};
          }
          .receipt-title {
            font-size: 20px;
            color: #666;
            margin-top: 10px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          th {
            background: ${schoolSettings.primaryColor || '#0f766e'};
            color: white;
            padding: 12px;
            text-align: left;
          }
          td {
            padding: 10px;
            border-bottom: 1px solid #eee;
          }
          .summary-box {
            background: #f0fdf4;
            border: 2px solid ${schoolSettings.primaryColor || '#0f766e'};
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            font-size: 16px;
          }
          .summary-label {
            font-weight: bold;
          }
          .total-row {
            border-top: 2px solid ${schoolSettings.primaryColor || '#0f766e'};
            margin-top: 10px;
            padding-top: 10px;
            font-size: 20px;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="receipt-header">
          ${logoHTML}
          <div class="school-name">${schoolSettings.schoolName || 'School Name'}</div>
          ${schoolSettings.schoolAddress ? `<div style="font-size: 12px;<h3 style="color: ${schoolSettings.primaryColor || '#0f766e'}; margin-bottom: 15px;">${schoolSettings.schoolAddress}</div>` : ''}
          <div class="receipt-title">TERM PAYMENT RECEIPT</div>
          <div style="margin-top: 10px; color: #666;">
            ${selectedSession.name} - ${selectedTerm.name}
          </div>
        </div>

        <div style="margin: 20px 0;">
          <h3>Student: ${student.user.firstName} ${student.user.lastName}</h3>
          <p>Admission No: ${student.admissionNumber} | Class: ${student.classModel?.name || 'N/A'} ${student.classModel?.arm || ''}</p>
        </div>

        <h3 style="color: ${schoolSettings.primaryColor || '#0f766e'};">Payment History</h3>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Reference</th>
            </tr>
          </thead>
          <tbody>
            ${payments.length > 0 ? payments.map(p => `
              <tr>
                <td>${new Date(p.paymentDate).toLocaleDateString()}</td>
                <td>₦${p.amount.toLocaleString()}</td>
                <td>${p.paymentMethod}</td>
                <td>${p.reference || 'N/A'}</td>
              </tr>
            `).join('') : '<tr><td colspan="4" style="text-align: center;">No payments recorded</td></tr>'}
          </tbody>
        </table>

        <div class="summary-box">
          <h3 style="margin-top: 0; color: ${schoolSettings.primaryColor || '#0f766e'};">Summary</h3>
          <div class="summary-row">
            <span class="summary-label">Expected Amount:</span>
            <span>₦${(feeRecord?.expectedAmount || 0).toLocaleString()}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Total Paid:</span>
            <span>₦${totalPaid.toLocaleString()}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Balance:</span>
            <span>₦${(feeRecord?.balance || 0).toLocaleString()}</span>
          </div>
          <div class="summary-row total-row">
            <span>Payment Status:</span>
            <span style="color: ${(feeRecord?.balance || 0) <= 0 ? '#059669' : '#dc2626'};">
              ${(feeRecord?.balance || 0) <= 0 ? 'FULLY PAID ✓' : 'PARTIAL PAYMENT'}
            </span>
          </div>
        </div>

        <div style="margin-top: 60px; padding-top: 20px; border-top: 2px solid #eee; text-align: center; font-size: 12px; color: #999;">
          <p>Printed on: ${new Date().toLocaleString()}</p>
          <p>This is an official document from ${schoolSettings.schoolName || 'School Management System'}</p>
          ${schoolSettings.schoolPhone ? `<p>Contact: ${schoolSettings.schoolPhone}</p>` : ''}
        </div>

        <div class="no-print" style="text-align: center; margin-top: 20px;">
          <button onclick="window.print()" style="padding: 10px 20px; background: ${schoolSettings.primaryColor || '#0f766e'}; color: white; border: none; border-radius: 5px; cursor: pointer;">
            Print Receipt
          </button>
          <button onclick="window.close()" style="padding: 10px 20px; background: #666; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">
            Close
          </button>
        </div>
      </body>
      </html>
    `;
  };

  const generateCumulativeReceipt = async () => {
    const logoHTML = schoolSettings.logoUrl
      ? `<img src="${schoolSettings.logoUrl}" alt="School Logo" style="height: 60px; margin: 0 auto 15px; display: block;" />`
      : '';
    // Fetch all fee records for the student in the selected session
    let allFeeRecords = [];
    try {
      const termsInSession = allTerms.filter(t => t.academicSessionId === selectedSession.id);

      for (const term of termsInSession) {
        const response = await api.get(
          `/api/fees/students?termId=${term.id}&academicSessionId=${selectedSession.id}`
        );
        const data = await response.json();
        const studentRecord = (data || []).find(s => s.id === student.id);
        if (studentRecord) {
          allFeeRecords.push({
            term: term,
            ...studentRecord
          });
        }
      }
    } catch (error) {
      console.error('Error fetching cumulative records:', error);
    }

    const grandTotal = {
      expected: allFeeRecords.reduce((sum, r) => sum + (r.expectedAmount || 0), 0),
      paid: allFeeRecords.reduce((sum, r) => sum + (r.paidAmount || 0), 0),
      balance: allFeeRecords.reduce((sum, r) => sum + (r.balance || 0), 0)
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cumulative Payment Receipt</title>
        <style>
          @media print {
            body { margin: 0; padding: 20px; }
            .no-print { display: none; }
          }
          body {
            font-family: 'Arial', sans-serif;
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
          }
          .receipt-header {
            text-align: center;
            border-bottom: 3px solid ${schoolSettings.primaryColor || '#0f766e'};
            padding-bottom: 20px;
            margin-bottom: 20px;
          }
          .school-name {
            font-size: 28px;
            font-weight: bold;
            color: ${schoolSettings.primaryColor || '#0f766e'};
          }
          .term-box {
            background: #f9fafb;
            border-left: 4px solid ${schoolSettings.primaryColor || '#0f766e'};
            padding: 15px;
            margin: 15px 0;
            border-radius: 4px;
          }
          .term-name {
            font-size: 18px;
            font-weight: bold;
            color: ${schoolSettings.primaryColor || '#0f766e'};
            margin-bottom: 10px;
          }
          .term-row {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
          }
          .grand-total-box {
            background: linear-gradient(135deg, ${schoolSettings.primaryColor || '#0f766e'}, ${schoolSettings.primaryColor ? schoolSettings.primaryColor + 'cc' : '#14b8a6'});
            color: white;
            padding: 25px;
            border-radius: 10px;
            margin: 30px 0;
          }
          .gt-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            font-size: 18px;
          }
          .gt-total {
            border-top: 2px solid rgba(255,255,255,0.3);
            margin-top: 15px;
            padding-top: 15px;
            font-size: 24px;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="receipt-header">
          ${logoHTML}
          <div class="school-name">${schoolSettings.schoolName || 'School Name'}</div>
          ${schoolSettings.schoolAddress ? `<div style="font-size: 12px; color: #666; margin: 5px 0;">${schoolSettings.schoolAddress}</div>` : ''}
          <div style="font-size: 20px; color: #666; margin-top: 10px;">CUMULATIVE PAYMENT RECEIPT</div>
          <div style="margin-top: 10px; color: #666; font-size: 16px;">Academic Session: ${selectedSession.name}</div>
        </div>

        <div style="margin: 20px 0; padding: 15px; background: #f0fdf4; border-radius: 8px;">
          <h3 style="margin-top: 0;">Student: ${student.user.firstName} ${student.user.lastName}</h3>
          <p style="margin: 5px 0;">Admission No: ${student.admissionNumber}</p>
          <p style="margin: 5px 0;">Class: ${student.classModel?.name || 'N/A'} ${student.classModel?.arm || ''}</p>
        </div>

        <h3 style="color: ${schoolSettings.primaryColor || '#0f766e'};">Payment Breakdown by Term</h3>
        
        ${allFeeRecords.length > 0 ? allFeeRecords.map(record => `
          <div class="term-box">
            <div class="term-name">${record.term.name}</div>
            <div class="term-row">
              <span>Expected:</span>
              <span style="font-weight: bold;">₦${(record.expectedAmount || 0).toLocaleString()}</span>
            </div>
            <div class="term-row">
              <span>Paid:</span>
              <span style="color: #059669; font-weight: bold;">₦${(record.paidAmount || 0).toLocaleString()}</span>
            </div>
            <div class="term-row">
              <span>Balance:</span>
              <span style="color: ${record.balance > 0 ? '#dc2626' : '#059669'}; font-weight: bold;">₦${(record.balance || 0).toLocaleString()}</span>
            </div>
            <div class="term-row" style="margin-top: 5px; padding-top: 8px; border-top: 1px solid #ddd;">
              <span style="font-size: 14px;">Status:</span>
              <span style="font-weight: bold; color: ${record.balance <= 0 ? '#059669' : '#dc2626'};">
                ${record.balance <= 0 ? 'FULLY PAID ✓' : 'PARTIAL PAYMENT'}
              </span>
            </div>
          </div>
        `).join('') : '<p style="text-align: center; color: #999;">No fee records found for this session</p>'}

        <div class="grand-total-box">
          <h3 style="margin-top: 0; margin-bottom: 20px;">GRAND TOTAL</h3>
          <div class="gt-row">
            <span>Total Expected:</span>
            <span>₦${grandTotal.expected.toLocaleString()}</span>
          </div>
          <div class="gt-row">
            <span>Total Paid:</span>
            <span>₦${grandTotal.paid.toLocaleString()}</span>
          </div>
          <div class="gt-row">
            <span>Total Balance:</span>
            <span>₦${grandTotal.balance.toLocaleString()}</span>
          </div>
          <div class="gt-row gt-total">
            <span>Payment Rate:</span>
            <span>${grandTotal.expected > 0 ? ((grandTotal.paid / grandTotal.expected) * 100).toFixed(1) : 0}%</span>
          </div>
        </div>

        <div style="margin-top: 60px; padding-top: 20px; border-top: 2px solid #eee; text-align: center; font-size: 12px; color: #999;">
          <p>Printed on: ${new Date().toLocaleString()}</p>
          <p>This is an official cumulative receipt from ${schoolSettings.schoolName || 'School Management System'}</p>
          ${schoolSettings.schoolPhone ? `<p>Contact: ${schoolSettings.schoolPhone} ${schoolSettings.schoolEmail ? `| ${schoolSettings.schoolEmail}` : ''}</p>` : ''}
        </div>

        <div class="no-print" style="text-align: center; margin-top: 20px;">
          <button onclick="window.print()" style="padding: 10px 20px; background: ${schoolSettings.primaryColor || '#0f766e'}; color: white; border: none; border-radius: 5px; cursor: pointer;">
            Print Receipt
          </button>
          <button onclick="window.close()" style="padding: 10px 20px; background: #666; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">
            Close
          </button>
        </div>
      </body>
      </html>
    `;
  };

  const handlePrint = async () => {
    let receiptHTML = '';

    if (receiptType === 'single') {
      if (!selectedPayment) {
        alert('Please select a payment');
        return;
      }
      receiptHTML = generateSinglePaymentReceipt(selectedPayment);
    } else if (receiptType === 'term') {
      receiptHTML = await generateTermReceipt();
    } else if (receiptType === 'cumulative') {
      receiptHTML = await generateCumulativeReceipt();
    }

    // Open in new window and print
    const printWindow = window.open('', '_blank');
    printWindow.document.write(receiptHTML);
    printWindow.document.close();
    printWindow.focus();

    // Auto-print after a short delay
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Print Receipt</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {student && (
            <div className="mt-4 text-sm text-gray-600">
              <p><strong>Student:</strong> {student.user.firstName} {student.user.lastName}</p>
              <p><strong>Admission No:</strong> {student.admissionNumber}</p>
              <p><strong>Class:</strong> {student.classModel?.name || 'N/A'} {student.classModel?.arm || ''}</p>
            </div>
          )}
        </div>

        <div className="p-6 space-y-6">
          {/* Receipt Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Receipt Type
            </label>
            <div className="space-y-2">
              <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="receiptType"
                  value="single"
                  checked={receiptType === 'single'}
                  onChange={(e) => setReceiptType(e.target.value)}
                  className="mr-3"
                />
                <div>
                  <div className="font-medium">Single Payment Receipt</div>
                  <div className="text-sm text-gray-500">Print receipt for one specific payment</div>
                </div>
              </label>

              <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="receiptType"
                  value="term"
                  checked={receiptType === 'term'}
                  onChange={(e) => setReceiptType(e.target.value)}
                  className="mr-3"
                />
                <div>
                  <div className="font-medium">Term Receipt</div>
                  <div className="text-sm text-gray-500">Print all payments for a specific term</div>
                </div>
              </label>

              <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="receiptType"
                  value="cumulative"
                  checked={receiptType === 'cumulative'}
                  onChange={(e) => setReceiptType(e.target.value)}
                  className="mr-3"
                />
                <div>
                  <div className="font-medium">Cumulative Receipt (All Terms)</div>
                  <div className="text-sm text-gray-500">Print summary for entire academic session</div>
                </div>
              </label>
            </div>
          </div>

          {/* Session Selection (for cumulative) */}
          {receiptType === 'cumulative' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Academic Session
              </label>
              <select
                value={selectedSession?.id || ''}
                onChange={(e) => {
                  const session = allSessions.find(s => s.id === parseInt(e.target.value));
                  setSelectedSession(session);
                }}
                className="w-full border border-gray-300 rounded-md p-2"
              >
                {allSessions.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Term Selection */}
          {(receiptType === 'single' || receiptType === 'term') && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Academic Session
                </label>
                <select
                  value={selectedSession?.id || ''}
                  onChange={(e) => {
                    const session = allSessions.find(s => s.id === parseInt(e.target.value));
                    setSelectedSession(session);
                    // Reset term to first term of new session
                    const firstTerm = allTerms.find(t => t.academicSessionId === parseInt(e.target.value));
                    setSelectedTerm(firstTerm);
                  }}
                  className="w-full border border-gray-300 rounded-md p-2"
                >
                  {allSessions.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Term
                </label>
                <select
                  value={selectedTerm?.id || ''}
                  onChange={(e) => {
                    const term = allTerms.find(t => t.id === parseInt(e.target.value));
                    setSelectedTerm(term);
                  }}
                  className="w-full border border-gray-300 rounded-md p-2"
                >
                  {allTerms
                    .filter(t => t.academicSessionId === selectedSession?.id)
                    .map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))
                  }
                </select>
              </div>
            </div>
          )}

          {/* Payment Selection (for single payment receipt) */}
          {receiptType === 'single' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Payment
              </label>
              {loading ? (
                <p className="text-gray-500">Loading payments...</p>
              ) : payments.length > 0 ? (
                <select
                  value={selectedPayment?.id || ''}
                  onChange={(e) => {
                    const payment = payments.find(p => p.id === parseInt(e.target.value));
                    setSelectedPayment(payment);
                  }}
                  className="w-full border border-gray-300 rounded-md p-2"
                >
                  {payments.map(p => (
                    <option key={p.id} value={p.id}>
                      {new Date(p.paymentDate).toLocaleDateString()} - ₦{p.amount.toLocaleString()} ({p.paymentMethod})
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-gray-500 text-sm">No payments found for this term</p>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handlePrint}
            disabled={receiptType === 'single' && (!selectedPayment || payments.length === 0)}
            className="px-4 py-2 bg-primary text-white rounded-md hover:brightness-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
}
