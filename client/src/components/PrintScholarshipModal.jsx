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
        <title>Scholarship Card - ${student.admissionNumber}</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet">
        <style>
          @page {
            size: 105mm 148mm;
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
              width: 105mm !important; 
              height: 148mm !important; 
              border: none !important;
            }
          }
          * { box-sizing: border-box; }
          body {
            font-family: 'Outfit', sans-serif;
            margin: 0;
            padding: 5mm;
            background: #f1f5f9;
            color: #1e293b;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
          }
          
          .card-container {
            width: 105mm;
            height: 148mm;
            background: white;
            position: relative;
            border-radius: 8mm;
            box-shadow: 0 30px 60px -12px rgba(0,0,0,0.25);
            overflow: hidden;
            display: flex;
            flex-direction: column;
            border: 0.5mm solid rgba(0,0,0,0.05);
          }
          
          .security-bg {
            position: absolute;
            inset: 0;
            background-image: 
              linear-gradient(rgba(5, 150, 105, 0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(5, 150, 105, 0.03) 1px, transparent 1px);
            background-size: 3mm 3mm;
            z-index: 1;
          }

          .guilloche {
            position: absolute;
            top: -20mm;
            right: -20mm;
            width: 80mm;
            height: 80mm;
            opacity: 0.1;
            background: repeating-radial-gradient(
              circle at center,
              transparent 0,
              transparent 1mm,
              ${primaryColor} 1mm,
              ${primaryColor} 1.1mm
            );
            z-index: 1;
            border-radius: 50%;
          }

          .watermark {
            position: absolute;
            top: 55%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-35deg);
            font-size: 80px;
            font-weight: 900;
            color: rgba(5, 150, 105, 0.04);
            pointer-events: none;
            text-transform: uppercase;
            white-space: nowrap;
            z-index: 0;
            letter-spacing: 15px;
          }

          .header {
            background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor});
            padding: 8mm 6mm;
            color: white;
            text-align: center;
            position: relative;
            z-index: 2;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
          }

          .school-logo-frame {
            width: 18mm;
            height: 18mm;
            background: white;
            border-radius: 5mm;
            margin: 0 auto 3mm;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2mm;
            box-shadow: 0 8px 16px rgba(0,0,0,0.15);
          }

          .school-logo-frame img {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
          }

          .school-name {
            font-size: 14px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5mm;
            margin-bottom: 1mm;
          }

          .school-addr {
            font-size: 7px;
            opacity: 0.9;
            font-weight: 600;
            max-width: 80%;
            margin: 0 auto;
          }

          .badge-row {
            padding: 4mm 6mm;
            display: flex;
            justify-content: center;
            position: relative;
            z-index: 2;
          }

          .scholarship-badge {
            background: #fef3c7;
            color: #92400e;
            padding: 1.5mm 4mm;
            border-radius: 100px;
            font-size: 9px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 2px;
            box-shadow: 0 4px 10px rgba(146, 64, 14, 0.1);
            border: 0.5mm solid #fbbf24;
          }

          .body {
            flex: 1;
            padding: 0 8mm 6mm;
            position: relative;
            z-index: 2;
            display: flex;
            flex-direction: column;
            align-items: center;
          }

          .card-title {
            font-size: 18px;
            font-weight: 800;
            color: #0f172a;
            margin-bottom: 6mm;
            text-transform: uppercase;
            letter-spacing: 1.5mm;
            text-align: center;
            background: linear-gradient(90deg, #1e293b, #475569);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }

          .student-card {
            width: 100%;
            background: #f8fafc;
            border-radius: 5mm;
            padding: 5mm;
            border: 0.3mm solid #e2e8f0;
            margin-bottom: 6mm;
            position: relative;
            overflow: hidden;
          }

          .student-card::before {
            content: '';
            position: absolute;
            top: 0; left: 0; width: 1.5mm; height: 100%;
            background: ${primaryColor};
          }

          .info-grid {
            margin-bottom: 4mm;
          }

          .info-label {
            font-size: 7px;
            color: #94a3b8;
            text-transform: uppercase;
            font-weight: 800;
            letter-spacing: 1px;
            margin-bottom: 1mm;
          }

          .info-value {
            font-size: 13px;
            font-weight: 700;
            color: #0f172a;
          }

          .desc-label {
            font-size: 8px;
            font-weight: 700;
            color: ${primaryColor};
            text-transform: uppercase;
            margin-bottom: 2mm;
            display: flex;
            align-items: center;
            gap: 2mm;
          }

          .desc-label::after {
            content: ''; flex: 1; height: 0.2mm; background: ${primaryColor}30;
          }

          .description {
            font-size: 10px;
            line-height: 1.6;
            color: #475569;
            text-align: justify;
            font-weight: 500;
            margin-bottom: 6mm;
          }

          .footer {
            margin-top: auto;
            width: 100%;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }

          .barcode-box {
            display: flex;
            flex-direction: column;
            gap: 1.5mm;
          }

          .barcode {
            max-width: 40mm;
            height: auto;
          }

          .security-hash {
            font-family: 'JetBrains Mono', monospace;
            font-size: 7px;
            color: #94a3b8;
          }

          .auth-box {
            text-align: center;
          }

          .signature-img {
            height: 12mm;
            width: auto;
            margin-bottom: 1mm;
          }

          .auth-line {
            width: 35mm;
            border-top: 0.3mm solid #cbd5e1;
            padding-top: 1.5mm;
            font-size: 7px;
            font-weight: 800;
            color: #64748b;
            text-transform: uppercase;
          }

          .digital-seal {
            position: absolute;
            bottom: 30mm;
            right: 5mm;
            width: 25mm;
            height: 25mm;
            opacity: 0.6;
            pointer-events: none;
            z-index: 5;
            transform: rotate(-10deg);
          }

          .controls {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 10px;
            z-index: 100;
            background: rgba(255,255,255,0.9);
            backdrop-filter: blur(10px);
            padding: 3mm 6mm;
            border-radius: 100px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            border: 1px solid rgba(255,255,255,0.5);
          }

          .btn {
            padding: 3mm 8mm;
            border-radius: 100px;
            font-size: 13px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1px;
            cursor: pointer;
            border: none;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }

          .btn-print {
            background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor});
            color: white;
            box-shadow: 0 10px 20px -5px ${primaryColor}40;
          }

          .btn-print:hover {
            transform: translateY(-2px);
            box-shadow: 0 15px 25px -5px ${primaryColor}60;
          }

          .btn-close {
            background: white;
            color: #475569;
            border: 1px solid #e2e8f0;
          }
        </style>
      </head>
      <body>
        <div class="card-container">
          <div class="security-bg"></div>
          <div class="guilloche"></div>
          <div class="watermark">SECURE</div>
          
          <div class="header">
            <div class="school-logo-frame">
              ${logoUrl ? `<img src="${logoUrl}" alt="Logo" />` : '<span style="font-size: 20px;">🎓</span>'}
            </div>
            <div class="school-name">${schoolSettings?.schoolName || 'ACADEMY'}</div>
            <div class="school-addr">${schoolSettings?.schoolAddress || 'Official Document'}</div>
          </div>

          <div class="badge-row">
            <div class="scholarship-badge">Official Exemption Award</div>
          </div>

          <div class="body">
            <h2 class="card-title">Scholarship Card</h2>

            <div class="student-card">
              <div class="info-grid">
                <div class="info-label">Full Name</div>
                <div class="info-value">${student.user.firstName} ${student.user.lastName}</div>
              </div>
              
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4mm;">
                <div>
                  <div class="info-label">Student ID</div>
                  <div class="info-value">${student.admissionNumber}</div>
                </div>
                <div>
                  <div class="info-label">Classification</div>
                  <div class="info-value" style="font-size: 11px;">${student.classModel?.name || 'N/A'} ${student.classModel?.arm || ''}</div>
                </div>
              </div>
            </div>

            <div class="desc-label">Legal Declaration</div>
            <p class="description">
              This card certifies that the student is under a <strong style="color: ${primaryColor}">FULL ACADEMIC SCHOLARSHIP</strong>. 
              They are hereby <strong style="color: ${primaryColor}">EXEMPTED</strong> from all standard tuition and fees for the 
              <strong>${currentSession?.name || 'Current Session'}</strong>. 
              Full clearance and academic access must be granted.
            </p>

            <div class="footer">
              <div class="barcode-box">
                <img class="barcode" src="${barcodeUrl}" alt="Barcode">
                <div class="security-hash">${securityHash}</div>
              </div>

              <div class="auth-box">
                ${signatureUrl 
                  ? `<img class="signature-img" src="${signatureUrl}" alt="Sign">` 
                  : '<div style="height: 10mm;"></div>'}
                <div class="auth-line">Official Seal / Sign</div>
              </div>
            </div>

            <div class="digital-seal">
              <svg width="100%" height="100%" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="55" fill="none" stroke="${primaryColor}" stroke-width="2" stroke-dasharray="3,2" />
                <path id="sealPath" d="M 60,60 m -40,0 a 40,40 0 1,1 80,0 a 40,40 0 1,1 -80,0" fill="none"/>
                <text font-size="8" font-weight="800" fill="${primaryColor}">
                  <textPath href="#sealPath">AUTHENTIC AWARD • VERIFIED ACCESS • </textPath>
                </text>
                <text x="60" y="65" text-anchor="middle" font-size="14" font-weight="900" fill="${primaryColor}">VALID</text>
              </svg>
            </div>
          </div>
        </div>

        <div class="controls no-print">
          <button class="btn btn-print" onclick="window.print()">🖨️ Print Award Card</button>
          <button class="btn btn-close" onclick="window.close()">Close</button>
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
