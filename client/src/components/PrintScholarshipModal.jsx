import { api, API_BASE_URL } from '../api';
import useSchoolSettings from '../hooks/useSchoolSettings';
import { formatDateTime } from '../utils/formatters';

export default function PrintScholarshipModal({ student, isOpen, onClose, currentTerm, currentSession }) {
  const { settings: schoolSettings } = useSchoolSettings();

  const handlePrint = () => {
    if (!student) return;

    const primaryColor = schoolSettings?.primaryColor || '#059669'; // Emerald default
    const secondaryColor = schoolSettings?.secondaryColor || '#047857';

    const logoUrl = schoolSettings?.logoUrl
      ? (schoolSettings.logoUrl.startsWith('http') ? schoolSettings.logoUrl : `${API_BASE_URL}${schoolSettings.logoUrl}`)
      : null;

    const signatureUrl = schoolSettings?.principalSignatureUrl
      ? (schoolSettings.principalSignatureUrl.startsWith('http') ? schoolSettings.principalSignatureUrl : `${API_BASE_URL}${schoolSettings.principalSignatureUrl}`)
      : null;

    const barcodeText = `SCH-${student.id}-${currentTerm?.id || 'ALL'}`;
    const barcodeUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(barcodeText)}&scale=3&rotate=N&includetext=true&backgroundcolor=ffffff&height=12`;
    const securityHash = btoa(`SCHOLARSHIP-${student.id}-${new Date().getTime()}`).substring(0, 16).toUpperCase();

    const printHTML = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Scholarship Exemption - ${student.admissionNumber}</title>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          @page {
            size: A5 landscape;
            margin: 0;
          }
          @media print {
            body { 
              margin: 0; 
              padding: 0; 
              background: white !important; 
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .no-print { display: none !important; }
            .card-container { 
              box-shadow: none !important; 
              margin: 0 !important; 
              width: 210mm !important; 
              height: 148mm !important; 
              border: none !important;
              page-break-after: avoid;
            }
          }
          * { box-sizing: border-box; }
          body {
            font-family: 'Inter', sans-serif;
            margin: 0;
            padding: 20px;
            background: #f8fafc;
            color: #1e293b;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
          }
          
          .card-container {
            width: 210mm;
            height: 148mm;
            background: white;
            position: relative;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            overflow: hidden;
            display: flex;
            flex-direction: column;
          }
          
          .border-frame {
            position: absolute;
            top: 8mm;
            left: 8mm;
            right: 8mm;
            bottom: 8mm;
            border: 2px solid ${primaryColor};
            border-radius: 4px;
            pointer-events: none;
            z-index: 10;
          }
          
          .inner-border {
            position: absolute;
            top: 2px;
            left: 2px;
            right: 2px;
            bottom: 2px;
            border: 1px solid ${primaryColor}40;
            pointer-events: none;
          }

          .corner-tl, .corner-tr, .corner-bl, .corner-br {
            position: absolute;
            width: 20px;
            height: 20px;
            border: 3px solid ${primaryColor};
            z-index: 11;
          }
          .corner-tl { top: 6mm; left: 6mm; border-right: none; border-bottom: none; }
          .corner-tr { top: 6mm; right: 6mm; border-left: none; border-bottom: none; }
          .corner-bl { bottom: 6mm; left: 6mm; border-right: none; border-top: none; }
          .corner-br { bottom: 6mm; right: 6mm; border-left: none; border-top: none; }

          .bg-pattern {
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            opacity: 0.03;
            background-image: radial-gradient(${primaryColor} 1px, transparent 1px);
            background-size: 10px 10px;
            z-index: 1;
          }

          .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-30deg);
            font-family: 'Playfair Display', serif;
            font-size: 80px;
            font-weight: 700;
            color: ${primaryColor};
            opacity: 0.04;
            white-space: nowrap;
            z-index: 2;
            letter-spacing: 10px;
          }

          .content {
            position: relative;
            z-index: 20;
            padding: 10mm 12mm;
            display: flex;
            flex-direction: column;
            height: 100%;
          }

          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2px solid ${primaryColor}30;
            padding-bottom: 10px;
            margin-bottom: 15px;
          }

          .logo-area {
            display: flex;
            align-items: center;
            gap: 15px;
          }

          .logo-area img {
            height: 50px;
            width: auto;
            max-width: 150px;
            object-fit: contain;
          }

          .school-info h1 {
            margin: 0;
            font-family: 'Playfair Display', serif;
            color: ${primaryColor};
            font-size: 20px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
          }

          .school-info p {
            margin: 4px 0 0;
            font-size: 9px;
            color: #475569;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .title-area {
            text-align: center;
            margin-bottom: 15px;
          }

          .doc-title {
            font-family: 'Playfair Display', serif;
            font-size: 24px;
            color: #0f172a;
            margin: 0;
            letter-spacing: 2px;
            text-transform: uppercase;
          }
          
          .doc-subtitle {
            font-size: 10px;
            color: ${primaryColor};
            font-weight: 600;
            letter-spacing: 3px;
            text-transform: uppercase;
            margin-top: 5px;
          }

          .student-details {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-left: 4px solid ${primaryColor};
            padding: 10px 15px;
            margin-bottom: 15px;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
          }

          .detail-group {
            display: flex;
            flex-direction: column;
          }

          .detail-label {
            font-size: 8px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 4px;
            font-weight: 600;
          }

          .detail-value {
            font-size: 13px;
            font-weight: 700;
            color: #0f172a;
          }

          .statement {
            font-family: 'Playfair Display', serif;
            font-size: 14px;
            line-height: 1.5;
            color: #334155;
            text-align: justify;
            margin-bottom: 20px;
            flex-grow: 1;
            font-style: italic;
          }

          .highlight {
            font-style: normal;
            font-weight: 700;
            color: ${primaryColor};
            border-bottom: 1px dotted ${primaryColor};
          }

          .footer {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: auto;
          }

          .verification {
            display: flex;
            flex-direction: column;
            gap: 5px;
          }

          .barcode {
            max-width: 130px;
            height: auto;
          }

          .hash {
            font-family: monospace;
            font-size: 7px;
            color: #94a3b8;
          }

          .signature-area {
            text-align: center;
            width: 180px;
          }

          .signature-img {
            height: 40px;
            width: auto;
            max-width: 150px;
            object-fit: contain;
            margin-bottom: -10px;
            position: relative;
            z-index: 1;
          }

          .signature-line {
            border-top: 1px solid #cbd5e1;
            padding-top: 6px;
            font-size: 9px;
            font-weight: 600;
            color: #475569;
            text-transform: uppercase;
            letter-spacing: 1px;
          }

          .controls {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 10px;
            z-index: 100;
            background: white;
            padding: 15px 25px;
            border-radius: 50px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          }

          button {
            padding: 10px 24px;
            font-family: 'Inter', sans-serif;
            font-weight: 600;
            font-size: 14px;
            border: none;
            border-radius: 25px;
            cursor: pointer;
            transition: all 0.2s;
          }

          .btn-print {
            background: ${primaryColor};
            color: white;
            box-shadow: 0 4px 6px ${primaryColor}40;
          }

          .btn-print:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 12px ${primaryColor}40;
          }

          .btn-close {
            background: #f1f5f9;
            color: #475569;
          }

          .btn-close:hover {
            background: #e2e8f0;
            color: #1e293b;
          }
        </style>
      </head>
      <body>
        <div class="card-container">
          <div class="bg-pattern"></div>
          <div class="watermark">EXEMPTED</div>
          
          <div class="border-frame">
            <div class="inner-border"></div>
          </div>
          
          <div class="corner-tl"></div>
          <div class="corner-tr"></div>
          <div class="corner-bl"></div>
          <div class="corner-br"></div>

          <div class="content">
            <div class="header">
              <div class="logo-area">
                ${logoUrl ? `<img src="${logoUrl}" alt="School Logo" />` : ''}
                <div class="school-info">
                  <h1>${schoolSettings?.schoolName || 'School Management System'}</h1>
                  <p>${schoolSettings?.schoolAddress || 'Official Document'}</p>
                </div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 10px; color: #64748b; font-weight: 600; text-transform: uppercase;">Date Issued</div>
                <div style="font-size: 12px; font-weight: 700; color: #0f172a;">${formatDateTime(new Date()).split(' ')[0]}</div>
              </div>
            </div>

            <div class="title-area">
              <h2 class="doc-title">Certificate of Exemption</h2>
              <div class="doc-subtitle">Official Scholarship Award</div>
            </div>

            <div class="student-details">
              <div class="detail-group">
                <span class="detail-label">Student Name</span>
                <span class="detail-value">${student.user.firstName} ${student.user.lastName}</span>
              </div>
              <div class="detail-group">
                <span class="detail-label">Admission ID</span>
                <span class="detail-value">${student.admissionNumber}</span>
              </div>
              <div class="detail-group">
                <span class="detail-label">Academic Level</span>
                <span class="detail-value">${student.classModel?.name || 'N/A'} ${student.classModel?.arm || ''}</span>
              </div>
            </div>

            <div class="statement">
              This official document certifies that the aforementioned student is currently under a full academic scholarship program. 
              Therefore, the student is hereby <span class="highlight">EXEMPTED</span> from the payment of all standard statutory school fees and associated levies 
              for the <span class="highlight">${currentSession?.name || 'Current Session'}</span> academic period. 
              <br>
              The bursary and examination departments are mandated to grant full clearance and uninterrupted academic access 
              in accordance with this continuous directive.
            </div>

            <div class="footer">
              <div class="verification">
                <img class="barcode" src="${barcodeUrl}" alt="Barcode ID" onerror="this.style.display='none'">
                <div class="hash">VERIFICATION ID: ${securityHash}</div>
              </div>

              <div class="signature-area">
                ${signatureUrl
        ? `<img class="signature-img" src="${signatureUrl}" alt="Principal Signature">`
        : '<div style="height: 50px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #94a3b8; font-style: italic;">[Signature Not Uploaded]</div>'
      }
                <div class="signature-line">Principal / Administrator</div>
              </div>
            </div>
          </div>
        </div>

        <div class="controls no-print">
          <button class="btn-print" onclick="window.print()">🖨️ Print Certificate</button>
          <button class="btn-close" onclick="window.close()">Close</button>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printHTML);
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 800);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-800 p-6 flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold tracking-tight">Print Exemption Card</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          <p className="text-gray-600 text-sm mb-6">
            You are about to generate an official Certificate of Exemption for scholarship awardee:
          </p>

          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 mb-8">
            <h3 className="font-bold text-emerald-900 text-lg">
              {student.user?.firstName} {student.user?.lastName}
            </h3>
            <div className="text-sm text-emerald-700 mt-1 flex items-center gap-2">
              <span className="font-medium bg-emerald-200/50 px-2 py-0.5 rounded text-xs">{student.admissionNumber}</span>
              <span>•</span>
              <span>{student.classModel?.name || 'N/A'} {student.classModel?.arm || ''}</span>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handlePrint}
              className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-bold shadow-md shadow-emerald-600/20 hover:bg-emerald-700 hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              Generate Official Card 🖨️
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
