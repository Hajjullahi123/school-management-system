import { useState, useEffect } from 'react';
import { api, API_BASE_URL } from '../api';
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
    const primaryColor = schoolSettings.primaryColor || '#0f766e';
    const logoUrl = schoolSettings.logoUrl
      ? (schoolSettings.logoUrl.startsWith('http') ? schoolSettings.logoUrl : `${API_BASE_URL}${schoolSettings.logoUrl}`)
      : null;
    const logoHTML = logoUrl
      ? `<img src="${logoUrl}" alt="School Logo" style="height: 80px; width: auto; max-width: 250px; object-fit: contain; margin-bottom: 12px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));" />`
      : '';

    // Generate a unique security hash
    // Generate security markers
    const securityHash = btoa(`PAY-${payment.id}-${student.id}`).substring(0, 12).toUpperCase();
    const verificationUrl = `${window.location.origin}/verify/payment/${securityHash}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(verificationUrl)}&bgcolor=ffffff`;
    const barcodeUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=PAY-${payment.id}&scale=2&rotate=N&includetext=true&backgroundcolor=ffffff`;

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Payment Receipt - ${student.user.firstName} ${student.user.lastName}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=JetBrains+Mono&display=swap" rel="stylesheet">
        <style>
          @media print {
            body { margin: 0; padding: 0; background: white !important; }
            .no-print { display: none !important; }
            .receipt-card { box-shadow: none !important; border: 1px solid #eee !important; margin: 0 !important; width: 100% !important; }
          }
          * { box-sizing: border-box; }
          body {
            font-family: 'Inter', sans-serif;
            margin: 0;
            padding: 40px 20px;
            background: #f8fafc;
            color: #1e293b;
            line-height: 1.5;
          }
          .receipt-card {
            background: white;
            max-width: 800px;
            margin: 0 auto;
            border-radius: 16px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            overflow: hidden;
            position: relative;
            border: 1px solid rgba(0,0,0,0.05);
          }
          /* Anti-Forge Watermark */
          .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-30deg);
            font-size: 150px;
            font-weight: 900;
            color: rgba(0, 0, 0, 0.03);
            pointer-events: none;
            text-transform: uppercase;
            white-space: nowrap;
            z-index: 0;
            letter-spacing: 10px;
          }
          .receipt-header {
            background: linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd);
            padding: 40px;
            color: white;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .school-info h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
            letter-spacing: -0.025em;
          }
          .school-info p {
            margin: 5px 0 0;
            opacity: 0.9;
            font-size: 14px;
          }
          .receipt-badge {
            background: rgba(255,255,255,0.2);
            padding: 8px 16px;
            border-radius: 9999px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            backdrop-filter: blur(4px);
          }
          .receipt-body {
            padding: 40px;
            position: relative;
            z-index: 1;
          }
          .main-grid {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 40px;
          }
          .section-title {
            font-size: 12px;
            font-weight: 700;
            color: ${primaryColor};
            text-transform: uppercase;
            letter-spacing: 0.1em;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
          }
          .section-title::after {
            content: '';
            flex: 1;
            height: 1px;
            background: #e2e8f0;
            margin-left: 15px;
          }
          .info-group {
            margin-bottom: 24px;
          }
          .info-label {
            font-size: 11px;
            color: #64748b;
            text-transform: uppercase;
            font-weight: 600;
          }
          .info-value {
            font-size: 16px;
            font-weight: 600;
            color: #0f172a;
          }
          .amount-section {
            background: #f1f5f9;
            border-radius: 12px;
            padding: 30px;
            text-align: center;
            border: 1px dashed #cbd5e1;
          }
          .amount-label {
            font-size: 13px;
            color: #64748b;
            margin-bottom: 8px;
          }
          .amount-value {
            font-size: 42px;
            font-weight: 800;
            color: ${primaryColor};
            font-family: 'JetBrains Mono', monospace;
          }
          .security-footer {
            margin-top: 40px;
            padding-top: 30px;
            border-top: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .qr-section {
            display: flex;
            align-items: center;
            gap: 15px;
          }
          .qr-code {
            border: 1px solid #e2e8f0;
            padding: 5px;
            border-radius: 8px;
            background: white;
          }
          .security-text {
            font-size: 11px;
            color: #94a3b8;
          }
          .security-hash {
            font-family: 'JetBrains Mono', monospace;
            font-weight: 700;
            color: #475569;
            display: block;
            margin-top: 4px;
          }
          .signatures {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 60px;
            margin-top: 50px;
          }
          .sig-box {
            text-align: center;
          }
          .sig-line {
            border-top: 2px solid #e2e8f0;
            margin-bottom: 8px;
          }
          .sig-label {
            font-size: 12px;
            color: #64748b;
            font-weight: 500;
          }
          .digital-seal-wrapper {
            position: absolute;
            bottom: 40px;
            right: 40px;
            width: 140px;
            height: 140px;
            pointer-events: none;
            z-index: 10;
          }
          .barcode-wrapper {
            margin-top: 20px;
            text-align: center;
          }
          .barcode-img {
            max-width: 200px;
            height: auto;
          }
        </style>
      </head>
      <body>
        <div class="receipt-card">
          <div class="watermark">PAID</div>
          
          <div class="receipt-header">
            <div class="school-info">
              ${logoHTML}
              <h1>${schoolSettings.schoolName || 'School Management System'}</h1>
              <p>${schoolSettings.schoolAddress || 'Official Educational Institution'}</p>
              ${schoolSettings.schoolPhone ? `<p>Tel: ${schoolSettings.schoolPhone}</p>` : ''}
            </div>
            <div style="text-align: right">
              <div class="receipt-badge">Official Receipt</div>
              <p style="font-size: 12px; margin-top: 10px; opacity: 0.8;">No: <strong>PAY-${payment.id}</strong></p>
            </div>
          </div>

          <div class="receipt-body">
            <div class="main-grid">
              <div>
                <div class="section-title">Student Details</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                  <div class="info-group">
                    <div class="info-label">Full Name</div>
                    <div class="info-value">${student.user.firstName} ${student.user.lastName}</div>
                  </div>
                  <div class="info-group">
                    <div class="info-label">Admission No.</div>
                    <div class="info-value">${student.admissionNumber}</div>
                  </div>
                </div>
                <div class="info-group">
                  <div class="info-label">Class</div>
                  <div class="info-value">${student.classModel?.name || 'N/A'} ${student.classModel?.arm || ''}</div>
                </div>

                <div class="section-title" style="margin-top: 20px;">Payment Breakdown</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                  <div class="info-group">
                    <div class="info-label">Transaction Date</div>
                    <div class="info-value">${new Date(payment.paymentDate).toLocaleDateString(undefined, { dateStyle: 'long' })}</div>
                  </div>
                  <div class="info-group">
                    <div class="info-label">Payment Method</div>
                    <div class="info-value">${payment.paymentMethod.toUpperCase()}</div>
                  </div>
                </div>
                ${payment.reference ? `
                <div class="info-group">
                  <div class="info-label">Reference / ID</div>
                  <div class="info-value" style="font-family: 'JetBrains Mono', monospace; font-size: 14px;">${payment.reference}</div>
                </div>` : ''}
                ${payment.notes ? `
                <div class="info-group">
                  <div class="info-label">Narration</div>
                  <div class="info-value" style="font-weight: 400; font-size: 14px; color: #475569;">${payment.notes}</div>
                </div>` : ''}
              </div>

              <div>
                <div class="amount-section">
                  <div class="amount-label">Total Amount Paid</div>
                  <div class="amount-value">₦${payment.amount.toLocaleString()}</div>
                  <div style="margin-top: 15px; font-size: 11px; color: #10b981; font-weight: 700; text-transform: uppercase;">
                    Payment Confirmed ✓
                  </div>
                </div>

                <div class="qr-section" style="margin-top: 30px; justify-content: center; flex-direction: column; text-align: center;">
                  <img src="${qrCodeUrl}" alt="Verification QR" class="qr-code" width="100" height="100" />
                  <div style="font-size: 10px; color: #94a3b8; margin-top: 8px; font-weight: 600;">Scan to Verify</div>
                  
                  <div class="barcode-wrapper">
                    <img src="${barcodeUrl}" alt="Barcode" class="barcode-img" />
                  </div>
                </div>
              </div>
            </div>

            <div class="signatures">
              <div class="sig-box">
                <div class="sig-line"></div>
                <div class="sig-label">Authorized Signatory</div>
              </div>
              <div class="sig-box">
                <div class="sig-line"></div>
                <div class="sig-label">Parent / Guardian</div>
              </div>
            </div>

            <div class="security-footer">
              <div class="security-text">
                This document is electronically generated and verified.<br/>
                Digital Security ID: <span class="security-hash">${securityHash}</span>
              </div>
              <div style="text-align: right; font-size: 10px; color: #94a3b8;">
                Printed on: ${new Date().toLocaleString()}<br/>
                Server Trace: ${btoa(window.location.host).substring(0, 8)}
              </div>
            </div>

            <div class="digital-seal-wrapper">
              <svg width="140" height="140" viewBox="0 0 120 120" style="transform: rotate(-15deg);">
                <circle cx="60" cy="60" r="55" fill="none" stroke="${primaryColor}" stroke-width="2" stroke-dasharray="3,2" opacity="0.4"/>
                <circle cx="60" cy="60" r="48" fill="none" stroke="${primaryColor}" stroke-width="1.5" opacity="0.5"/>
                <path id="sealPath" d="M 60,60 m -40,0 a 40,40 0 1,1 80,0 a 40,40 0 1,1 -80,0" fill="none"/>
                <text font-size="7" font-weight="800" fill="${primaryColor}" opacity="0.6" letter-spacing="1">
                  <textPath href="#sealPath" startOffset="0%">OFFICIAL RECEIPT • VERIFIED RECORD • VALIDATED PAYMENT • ${schoolSettings.schoolName?.toUpperCase() || 'SCHOOL SEAL'} •</textPath>
                </text>
                <g opacity="0.6">
                  <circle cx="60" cy="60" r="30" fill="none" stroke="${primaryColor}" stroke-width="0.5"/>
                  <text x="60" y="58" text-anchor="middle" font-size="8" font-weight="900" fill="${primaryColor}">APPROVED</text>
                  <text x="60" y="68" text-anchor="middle" font-size="10" font-weight="900" fill="${primaryColor}">${new Date().getFullYear()}</text>
                  <path d="M 45 62 L 75 62" stroke="${primaryColor}" stroke-width="1"/>
                </g>
              </svg>
            </div>
          </div>
        </div>

        <div class="no-print" style="max-width: 800px; margin: 30px auto; display: flex; gap: 12px; justify-content: center;">
          <button onclick="window.print()" style="padding: 12px 24px; background: ${primaryColor}; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
            Print Secure Copy
          </button>
          <button onclick="window.close()" style="padding: 12px 24px; background: white; color: #475569; border: 1px solid #e2e8f0; border-radius: 8px; font-weight: 600; cursor: pointer;">
            Close Preview
          </button>
        </div>
      </body>
      </html>
    `;
  };

  const generateTermReceipt = async () => {
    const primaryColor = schoolSettings.primaryColor || '#0f766e';
    const logoUrl = schoolSettings.logoUrl
      ? (schoolSettings.logoUrl.startsWith('http') ? schoolSettings.logoUrl : `${API_BASE_URL}${schoolSettings.logoUrl}`)
      : null;
    const logoHTML = logoUrl
      ? `<img src="${logoUrl}" alt="School Logo" style="height: 70px; width: auto; max-width: 250px; object-fit: contain; margin-bottom: 8px;" />`
      : '';

    // Fetch fee record for term totals
    let feeRecord = null;
    try {
      const response = await api.get(
        `/api/fees/students?termId=${selectedTerm.id}&academicSessionId=${selectedSession.id}`
      );
      const data = await response.json();
      feeRecord = (data || []).find(s => s.id === student.id);
    } catch (error) {
      console.error('Error fetching fee record:', error);
    }

    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const securityHash = btoa(`TERM-${selectedTerm.id}-${student.id}`).substring(0, 10).toUpperCase();
    const barcodeUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=TERM-${selectedTerm.id}-${student.id}&scale=2&rotate=N&height=10&includetext=true`;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Term Payment Statement - ${student.user.firstName}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=JetBrains+Mono&display=swap" rel="stylesheet">
        <style>
          @media print {
            body { background: white !important; padding: 0 !important; }
            .no-print { display: none !important; }
            .statement-card { box-shadow: none !important; border: 1px solid #eee !important; margin: 0 !important; width: 100% !important; }
          }
          body { font-family: 'Inter', sans-serif; background: #f1f5f9; padding: 40px 20px; color: #1e293b; }
          .statement-card { background: white; max-width: 850px; margin: 0 auto; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); overflow: hidden; }
          .header { background: ${primaryColor}; color: white; padding: 30px 40px; display: flex; justify-content: space-between; align-items: center; }
          .header h1 { margin: 0; font-size: 24px; }
          .header p { margin: 5px 0 0; opacity: 0.8; font-size: 14px; }
          .body { padding: 40px; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; padding: 20px; background: #f8fafc; border-radius: 8px; }
          .meta-item label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; display: block; }
          .meta-item span { font-size: 15px; font-weight: 600; color: #0f172a; }
          table { width: 100%; border-collapse: collapse; margin: 30px 0; }
          th { text-align: left; font-size: 12px; text-transform: uppercase; color: #64748b; padding: 12px; border-bottom: 2px solid #e2e8f0; }
          td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
          .amount-col { font-family: 'JetBrains Mono', monospace; font-weight: 600; text-align: right; }
          .summary-card { background: #f8fafc; border-radius: 12px; padding: 25px; margin-top: 30px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; border: 1px solid #e2e8f0; }
          .summary-item { text-align: center; }
          .summary-label { font-size: 11px; color: #64748b; text-transform: uppercase; margin-bottom: 5px; font-weight: 600; }
          .summary-val { font-size: 20px; font-weight: 700; font-family: 'JetBrains Mono', monospace; }
          .footer { margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px; font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between; }
          .digital-seal-wrapper {
            position: absolute;
            bottom: 40px;
            right: 40px;
            width: 130px;
            height: 130px;
            pointer-events: none;
            z-index: 10;
            opacity: 0.7;
          }
          .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-30deg);
            font-size: 120px;
            font-weight: 900;
            color: rgba(0, 0, 0, 0.02);
            pointer-events: none;
            text-transform: uppercase;
            white-space: nowrap;
            z-index: 0;
            letter-spacing: 15px;
          }
        </style>
      </head>
      <body>
        <div class="statement-card" style="position: relative;">
          <div class="watermark">STATEMENT</div>
          <div class="header">
            <div>
              ${logoHTML}
              <h1>${schoolSettings.schoolName || 'School Name'}</h1>
              <p>Term Payment Summary Statement</p>
            </div>
            <div style="text-align: right">
              <div style="font-weight: 700; font-size: 18px;">${selectedSession.name}</div>
              <div style="opacity: 0.8;">${selectedTerm.name}</div>
            </div>
          </div>
          <div class="body">
            <div class="meta-grid">
              <div class="meta-item">
                <label>Student Name</label>
                <span>${student.user.firstName} ${student.user.lastName}</span>
              </div>
              <div class="meta-item">
                <label>Admission No.</label>
                <span>${student.admissionNumber}</span>
              </div>
              <div class="meta-item">
                <label>Current Class</label>
                <span>${student.classModel?.name || 'N/A'} ${student.classModel?.arm || ''}</span>
              </div>
              <div class="meta-item">
                <label>Statement Hash</label>
                <span style="font-family: 'JetBrains Mono', monospace; font-size: 12px;">${securityHash}</span>
              </div>
            </div>

            <h3 style="font-size: 16px; color: #475569; margin-bottom: 10px;">Transaction History</h3>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Method</th>
                  <th style="text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${payments.length > 0 ? payments.map(p => `
                  <tr>
                    <td>${new Date(p.paymentDate).toLocaleDateString()}</td>
                    <td>School Fee Payment</td>
                    <td>${p.paymentMethod.toUpperCase()}</td>
                    <td class="amount-col">₦${p.amount.toLocaleString()}</td>
                  </tr>
                `).join('') : '<tr><td colspan="4" style="text-align: center; color: #94a3b8;">No payments found for this period.</td></tr>'}
              </tbody>
            </table>

            <div class="summary-card">
              <div class="summary-item">
                <div class="summary-label">Expected Charge</div>
                <div class="summary-val">₦${(feeRecord?.expectedAmount || 0).toLocaleString()}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Total Paid</div>
                <div class="summary-val" style="color: #10b981;">₦${totalPaid.toLocaleString()}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Current Balance</div>
                <div class="summary-val" style="color: ${(feeRecord?.balance || 0) > 0 ? '#ef4444' : '#10b981'};">₦${(feeRecord?.balance || 0).toLocaleString()}</div>
              </div>
            </div>

            <div class="digital-seal-wrapper">
              <svg width="130" height="130" viewBox="0 0 120 120" style="transform: rotate(-10deg);">
                <circle cx="60" cy="60" r="55" fill="none" stroke="${primaryColor}" stroke-width="2" stroke-dasharray="3,2" opacity="0.4"/>
                <path id="termSealPath" d="M 60,60 m -40,0 a 40,40 0 1,1 80,0 a 40,40 0 1,1 -80,0" fill="none"/>
                <text font-size="7" font-weight="800" fill="${primaryColor}" opacity="0.6">
                  <textPath href="#termSealPath" startOffset="0%">TERM STATEMENT • VERIFIED FINANCIAL RECORD • ${schoolSettings.schoolName?.toUpperCase() || 'OFFICIAL SEAL'} •</textPath>
                </text>
                <text x="60" y="62" text-anchor="middle" font-size="12" font-weight="900" fill="${primaryColor}" opacity="0.6">VALID</text>
              </svg>
            </div>

            <div style="margin-top: 20px; text-align: center;">
               <img src="${barcodeUrl}" alt="Barcode" style="max-width: 250px; height: auto;" />
            </div>

            <div class="footer">
              <div>
                Official computer-generated statement. Verified by system at ${new Date().toLocaleString()}.
              </div>
              <div style="text-align: right;">
                Verification ID: ${securityHash}
              </div>
            </div>
          </div>
        </div>
        <div class="no-print" style="text-align: center; margin-top: 30px;">
          <button onclick="window.print()" style="padding: 12px 24px; background: ${primaryColor}; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">Print Statement</button>
          <button onclick="window.close()" style="margin-left: 10px; padding: 12px 24px; background: #64748b; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">Close</button>
        </div>
      </body>
      </html>
    `;
  };

  const generateCumulativeReceipt = async () => {
    const primaryColor = schoolSettings.primaryColor || '#0f766e';
    const logoUrl = schoolSettings.logoUrl
      ? (schoolSettings.logoUrl.startsWith('http') ? schoolSettings.logoUrl : `${API_BASE_URL}${schoolSettings.logoUrl}`)
      : null;
    const logoHTML = logoUrl
      ? `<img src="${logoUrl}" alt="School Logo" style="height: 65px; width: auto; max-width: 250px; object-fit: contain; margin-bottom: 5px;" />`
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

    const securityHash = btoa(`SESS-${selectedSession.id}-${student.id}`).substring(0, 12).toUpperCase();
    const barcodeUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=SESS-${selectedSession.id}-${student.id}&scale=2&rotate=N&height=10&includetext=true`;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Sessional Payment Ledger - ${student.user.firstName}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=JetBrains+Mono&display=swap" rel="stylesheet">
        <style>
          @media print {
            body { background: white !important; padding: 0 !important; }
            .no-print { display: none !important; }
            .ledger-card { box-shadow: none !important; border: 1px solid #eee !important; margin: 0 !important; width: 100% !important; }
          }
          body { font-family: 'Inter', sans-serif; background: #e2e8f0; padding: 40px 20px; color: #1e293b; }
          .ledger-card { background: white; max-width: 900px; margin: 0 auto; border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); overflow: hidden; }
          .side-accent { width: 8px; background: ${primaryColor}; position: absolute; left: 0; top: 0; bottom: 0; }
          .header { padding: 40px; border-bottom: 1px solid #f1f5f9; position: relative; display: flex; justify-content: space-between; align-items: flex-start; }
          .header h1 { margin: 0; font-size: 26px; font-weight: 700; color: ${primaryColor}; }
          .header p { margin: 4px 0 0; color: #64748b; font-size: 14px; }
          .content { padding: 40px; }
          .summary-header { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 30px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 40px; }
          .stat-item { text-align: left; }
          .stat-label { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700; margin-bottom: 4px; }
          .stat-val { font-size: 18px; font-weight: 700; font-family: 'JetBrains Mono', monospace; }
          .term-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          .term-card { border: 1px solid #f1f5f9; border-radius: 12px; padding: 20px; background: #fff; transition: all 0.2s; }
          .term-title { font-size: 14px; font-weight: 700; color: ${primaryColor}; margin-bottom: 12px; display: flex; justify-content: space-between; }
          .row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px; }
          .row span:first-child { color: #64748b; }
          .row span:last-child { font-weight: 600; }
          .status-badge { font-size: 10px; padding: 4px 8px; border-radius: 4px; text-transform: uppercase; }
          .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-30deg);
            font-size: 140px;
            font-weight: 900;
            color: rgba(0, 0, 0, 0.02);
            pointer-events: none;
            text-transform: uppercase;
            white-space: nowrap;
            z-index: 0;
            letter-spacing: 20px;
          }
          .digital-seal-wrapper {
            position: absolute;
            bottom: 40px;
            right: 40px;
            width: 150px;
            height: 150px;
            pointer-events: none;
            z-index: 10;
            opacity: 0.7;
          }
          .footer { margin-top: 50px; border-top: 1px solid #f1f5f9; padding-top: 24px; display: flex; justify-content: space-between; align-items: center; position: relative; z-index: 10; }
        </style>
      </head>
      <body>
        <div class="ledger-card" style="position: relative;">
          <div class="side-accent"></div>
          <div class="header">
            <div>
              ${logoHTML}
              <h1>Sessional Payment Ledger</h1>
              <p>Academic Session: <strong>${selectedSession.name}</strong></p>
            </div>
            <div style="text-align: right">
              <div style="font-weight: 600; font-size: 16px;">${student.user.firstName} ${student.user.lastName}</div>
              <div style="font-size: 12px; color: #64748b;">ID: ${student.admissionNumber}</div>
            </div>
          </div>
          <div class="content">
            <div class="summary-header">
              <div class="stat-item">
                <div class="stat-label">Total Expected</div>
                <div class="stat-val">₦${grandTotal.expected.toLocaleString()}</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">Total Remitted</div>
                <div class="stat-val" style="color: #10b981;">₦${grandTotal.paid.toLocaleString()}</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">Outstanding Balance</div>
                <div class="stat-val" style="color: ${grandTotal.balance > 0 ? '#ef4444' : '#10b981'};">₦${grandTotal.balance.toLocaleString()}</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">Completion</div>
                <div class="stat-val">${grandTotal.expected > 0 ? ((grandTotal.paid / grandTotal.expected) * 100).toFixed(1) : 0}%</div>
              </div>
            </div>

            <h2 style="font-size: 16px; margin-bottom: 20px;">Term-by-Term Breakdown</h2>
            <div class="term-grid">
              ${allFeeRecords.length > 0 ? allFeeRecords.map(record => `
                <div class="term-card">
                  <div class="term-title">
                    ${record.term.name}
                    <span class="status-badge" style="background: ${record.balance <= 0 ? '#dcfce7' : '#fee2e2'}; color: ${record.balance <= 0 ? '#166534' : '#991b1b'};">
                      ${record.balance <= 0 ? 'Settled' : 'Pending'}
                    </span>
                  </div>
                  <div class="row">
                    <span>Charge:</span>
                    <span>₦${(record.expectedAmount || 0).toLocaleString()}</span>
                  </div>
                  <div class="row">
                    <span>Arrears:</span>
                    <span>₦${(record.openingBalance || 0).toLocaleString()}</span>
                  </div>
                  <div class="row">
                    <span>Paid:</span>
                    <span>₦${(record.paidAmount || 0).toLocaleString()}</span>
                  </div>
                  <div class="row" style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #f1f5f9;">
                    <span>Term Balance:</span>
                    <span style="color: ${record.balance > 0 ? '#ef4444' : '#10b981'};">₦${(record.balance || 0).toLocaleString()}</span>
                  </div>
                </div>
              `).join('') : '<p>No records found.</p>'}
            </div>

            <div style="margin-top: 40px; text-align: center;">
               <img src="${barcodeUrl}" alt="Barcode" style="max-width: 300px; height: auto;" />
            </div>

            <div class="digital-seal-wrapper">
              <svg width="150" height="150" viewBox="0 0 120 120" style="transform: rotate(-12deg);">
                <circle cx="60" cy="60" r="58" fill="none" stroke="${primaryColor}" stroke-width="2.5" stroke-dasharray="4,2" opacity="0.4"/>
                <path id="sessSealPath" d="M 60,60 m -42,0 a 42,42 0 1,1 84,0 a 42,42 0 1,1 -84,0" fill="none"/>
                <text font-size="6" font-weight="900" fill="${primaryColor}" opacity="0.6" letter-spacing="1">
                  <textPath href="#sessSealPath" startOffset="0%">SESSIONAL LEDGER • ACADEMIC AUDIT RECORD • ${schoolSettings.schoolName?.toUpperCase() || 'OFFICIAL SEAL'} •</textPath>
                </text>
                <text x="60" y="58" text-anchor="middle" font-size="8" font-weight="900" fill="${primaryColor}" opacity="0.6">SESSIONAL</text>
                <text x="60" y="70" text-anchor="middle" font-size="12" font-weight="900" fill="${primaryColor}" opacity="0.6">LEDGER</text>
              </svg>
            </div>

            <div class="footer">
              <div style="font-size: 10px; color: #94a3b8;">
                Security Verification ID: <span style="font-family: 'JetBrains Mono', monospace; font-weight: 700;">${securityHash}</span><br/>
                Generated: ${new Date().toLocaleString()}
              </div>
              <div style="text-align: right;">
                <div style="height: 40px; border-bottom: 1px solid #cbd5e1; width: 150px; margin-bottom: 4px;"></div>
                <div style="font-size: 11px; color: #64748b;">Burser/Accountant Seal</div>
              </div>
            </div>
          </div>
        </div>
        <div class="no-print" style="text-align: center; margin-top: 30px;">
          <button onclick="window.print()" style="padding: 12px 24px; background: ${primaryColor}; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">Print Full Ledger</button>
          <button onclick="window.close()" style="margin-left: 10px; padding: 12px 24px; background: #64748b; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">Close</button>
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
