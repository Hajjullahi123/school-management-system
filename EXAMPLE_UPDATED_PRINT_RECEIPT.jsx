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
      ? `<img src="${schoolSettings.logoUrl}" alt="School Logo" style="height: 60px; margin: 0 auto 15px;" />`
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
          .school-logo {
            margin-bottom: 15px;
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
          ${schoolSettings.schoolPhone ? `<p>Contact: ${schoolSettings.schoolPhone}</p>` : ''}
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

  // ... rest of the file (Term Receipt and Cumulative Receipt would follow the same pattern)

  // Continuing with the rest of the component...
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      {/* ... rest of modal JSX remains the same ... */}
    </div>
  );
}
