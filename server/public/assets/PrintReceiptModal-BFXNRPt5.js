import{j as t}from"./chart-vendor-BYY-65EX.js";import"./FileSaver.min-D0dQec9w.js";import{s as ae}from"./mobileDownload-CZXh0UZT.js";import{a as u}from"./react-vendor-C00C9m_W.js";import{u as oe,a as M,A as y}from"./index-D5Q_yc8e.js";import{b as re,a as x,c as K}from"./formatters-CX5es-NB.js";import{h as se,E as ne}from"./doc-vendor-BZnDaIDN.js";function xe({student:a,isOpen:C,onClose:L,currentTerm:Q,currentSession:X,allTerms:I,allSessions:A,currentPayment:P}){var G,Y,q,_;const{settings:o}=oe(),[c,D]=u.useState(P?"single":"summary"),[v,U]=u.useState(P||null),[m,R]=u.useState(Q),[n,B]=u.useState(X),[h,F]=u.useState([]),[Z,W]=u.useState(!1),[T,H]=u.useState(!1);u.useEffect(()=>{C&&P&&(U(P),D("single"))},[C,P]),u.useEffect(()=>{C&&a&&ee()},[C,a,m,n]);const ee=async()=>{if(!(!a||!m||!n)){W(!0);try{const i=await(await M.get(`/api/fees/payments/${a.id}?termId=${m.id}&academicSessionId=${n.id}`)).json();F(i||[]),i&&i.length>0&&U(i[0])}catch(e){console.error("Error fetching payments:",e),F([])}finally{W(!1)}}},O=e=>{var w,$,j,s,d,p,S,z,E;const i=o.primaryColor||"#0f766e",l=y.endsWith("/")?y.slice(0,-1):y,g=o.logoUrl?o.logoUrl.startsWith("http")?o.logoUrl:`${l}${o.logoUrl.startsWith("/")?"":"/"}${o.logoUrl}`:null,r=(($=(w=e.FeeRecord)==null?void 0:w.Term)==null?void 0:$.name)||(m==null?void 0:m.name)||"Current Term",f=((s=(j=e.FeeRecord)==null?void 0:j.AcademicSession)==null?void 0:s.name)||(n==null?void 0:n.name)||"Current Session",b=btoa(`PAY-${e.id}-${a.id}`).substring(0,12).toUpperCase(),k=`PAY-${e.id}`,N=`https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(k)}&scale=3&rotate=N&includetext=true&backgroundcolor=ffffff&height=12`;return`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Receipt - ${a.admissionNumber}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=JetBrains+Mono&display=swap" rel="stylesheet">
        <style>
          @page {
            size: 105mm 148mm;
            margin: 0;
          }
          @media print {
            html, body { margin: 0 !important; padding: 0 !important; background: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .no-print { display: none !important; }
            .receipt-card { 
              box-shadow: none !important; 
              border: none !important; 
              margin: 0 auto !important; 
              width: 105mm !important; 
              height: 148mm !important; 
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              overflow: hidden !important;
            }
          }
          * { box-sizing: border-box; }
          body {
            font-family: 'Inter', sans-serif;
            margin: 0;
            padding: 10px;
            background: #f8fafc;
            color: #1e293b;
            line-height: 1.3;
            font-size: 11px;
          }
          .receipt-card {
            background: white;
            width: 100mm;
            height: 140mm;
            margin: 0 auto;
            border-radius: 8px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            position: relative;
            border: 1px solid rgba(0,0,0,0.05);
            display: flex;
            flex-direction: column;
          }
          /* Anti-Forge Watermark */
          .watermark {
            position: absolute;
            top: 55%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-35deg);
            font-size: 80px;
            font-weight: 900;
            color: rgba(0, 0, 0, 0.025);
            pointer-events: none;
            text-transform: uppercase;
            white-space: nowrap;
            z-index: 0;
            letter-spacing: 5px;
          }
          .receipt-header {
            background: linear-gradient(135deg, ${i}, ${i}dd);
            padding: 15px;
            color: white;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .school-info h1 {
            margin: 0;
            font-size: 14px;
            font-weight: 700;
          }
          .school-info p {
            margin: 2px 0 0;
            opacity: 0.9;
            font-size: 9px;
          }
          .receipt-badge {
            background: rgba(255,255,255,0.2);
            padding: 4px 8px;
            border-radius: 9999px;
            font-size: 9px;
            font-weight: 600;
            text-transform: uppercase;
            backdrop-filter: blur(4px);
          }
          .receipt-body {
            padding: 15px;
            position: relative;
            z-index: 1;
            flex-grow: 1;
          }
          .section-title {
            font-size: 9px;
            font-weight: 700;
            color: ${i};
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
          }
          .section-title::after {
            content: '';
            flex: 1;
            height: 1px;
            background: #f1f5f9;
            margin-left: 8px;
          }
          .info-group {
            margin-bottom: 10px;
          }
          .info-label {
            font-size: 9px;
            color: #64748b;
            text-transform: uppercase;
            font-weight: 600;
          }
          .info-value {
            font-size: 11px;
            font-weight: 600;
            color: #0f172a;
          }
          .amount-section {
            background: #f8fafc;
            border-radius: 8px;
            padding: 12px;
            text-align: center;
            border: 1px dashed #e2e8f0;
            margin: 10px 0;
          }
          .amount-label {
            font-size: 10px;
            color: #64748b;
            margin-bottom: 4px;
          }
          .amount-value {
            font-size: 24px;
            font-weight: 800;
            color: ${i};
            font-family: 'JetBrains Mono', monospace;
          }
          .security-footer {
            margin-top: auto;
            padding-top: 10px;
            border-top: 1px solid #f1f5f9;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .qr-section {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
          }
          .qr-code {
            border: 1px solid #f1f5f9;
            padding: 2px;
            border-radius: 4px;
            background: white;
          }
          .security-text {
            font-size: 8px;
            color: #94a3b8;
          }
          .security-hash {
            font-family: 'JetBrains Mono', monospace;
            font-weight: 700;
            color: #64748b;
          }
          .signatures {
            margin-top: 15px;
            display: flex;
            justify-content: center;
          }
          .sig-box {
            width: 120px;
            text-align: center;
          }
          .sig-line {
            border-top: 1px solid #cbd5e1;
            margin-bottom: 4px;
          }
          .sig-label {
            font-size: 9px;
            color: #64748b;
            font-weight: 500;
          }
          .digital-seal-wrapper {
            position: absolute;
            bottom: 60px;
            right: 15px;
            width: 80px;
            height: 80px;
            pointer-events: none;
            z-index: 10;
            opacity: 0.8;
          }
          .barcode-wrapper {
            margin-top: 8px;
            text-align: center;
          }
          .barcode-img {
            max-width: 140px;
            height: auto;
          }
        </style>
      </head>
      <body>
        <div class="receipt-card">
          <div class="watermark">PAID</div>
          
          <div class="receipt-header">
            <div class="school-info">
              ${g?`<img src="${g}" alt="Logo" style="height: 35px; width: auto; margin-bottom: 4px;" />`:""}
              <h1>${o.schoolName||"SMS"}</h1>
              <p>${o.schoolAddress||"Official Receipt"}</p>
            </div>
            <div style="text-align: right">
              <div class="receipt-badge">PAID</div>
              <p style="font-size: 9px; margin-top: 4px; opacity: 0.9;">#${e.id}</p>
            </div>
          </div>

          <div class="receipt-body">
            <div class="section-title">Student</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div class="info-group">
                <div class="info-label">Name</div>
                <div class="info-value" style="font-size: 10px;">${((d=a.user)==null?void 0:d.firstName)||"Unknown"} ${((p=a.user)==null?void 0:p.lastName)||""} ${a.middleName||""}</div>
              </div>
              <div class="info-group">
                <div class="info-label">ID No.</div>
                <div class="info-value" style="font-size: 10px;">${a.admissionNumber}</div>
              </div>
            </div>
            <div class="info-group">
              <div class="info-label">Class</div>
              <div class="info-value">${((S=a.classModel)==null?void 0:S.name)||""} ${((z=a.classModel)==null?void 0:z.arm)||""}</div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div class="info-group">
                <div class="info-label">Term</div>
                <div class="info-value">${r}</div>
              </div>
              <div class="info-group">
                <div class="info-label">Session</div>
                <div class="info-value">${f}</div>
              </div>
            </div>

            <div class="section-title" style="margin-top: 10px;">Payment</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div class="info-group">
                <div class="info-label">Date</div>
                <div class="info-value">${new Date(e.paymentDate).toLocaleDateString()}</div>
              </div>
              <div class="info-group">
                <div class="info-label">Method</div>
                <div class="info-value">${e.paymentMethod}</div>
              </div>
            </div>
            
            ${e.reference?`
            <div class="info-group">
              <div class="info-label">Reference</div>
              <div class="info-value" style="font-family: 'JetBrains Mono'; font-size: 9px;">${e.reference}</div>
            </div>`:""}

            <div class="amount-section">
              <div class="amount-label">Amount Paid</div>
              <div class="amount-value">₦${x(e.amount)}</div>
              ${(E=e.fee)!=null&&E.title?`<div style="font-size: 9px; color: #64748b; margin-top: 4px; font-weight: 700; text-transform: uppercase;">FOR: ${e.fee.title}</div>`:""}
            </div>

            <div style="margin: 10px 0; text-align: center;">
              <img src="${N}" alt="Barcode" style="max-width: 160px; height: auto;" onerror="this.style.display='none'" />
            </div>

            <div class="signatures">
              <div class="sig-box">
                <div class="sig-line"></div>
                <div class="sig-label">Bursar / Cashier</div>
              </div>
            </div>

            <div class="security-footer">
              <div class="security-text">
                ID: <span class="security-hash">${b}</span>
              </div>
              <div style="text-align: right; font-size: 7px; color: #94a3b8;">
                ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}
              </div>
            </div>

            <div class="digital-seal-wrapper">
              <svg width="80" height="80" viewBox="0 0 120 120" style="transform: rotate(-15deg);">
                <circle cx="60" cy="60" r="55" fill="none" stroke="${i}" stroke-width="2" stroke-dasharray="3,2" opacity="0.3"/>
                <path id="sealPath" d="M 60,60 m -40,0 a 40,40 0 1,1 80,0 a 40,40 0 1,1 -80,0" fill="none"/>
                <text font-size="8" font-weight="800" fill="${i}" opacity="0.5">
                  <textPath href="#sealPath">OFFICIAL RECEIPT • VERIFIED • </textPath>
                </text>
                <g opacity="0.5">
                  <text x="60" y="62" text-anchor="middle" font-size="12" font-weight="900" fill="${i}">VALID</text>
                </g>
              </svg>
            </div>
          </div>
        </div>

        <div class="no-print" style="margin-top: 20px; display: flex; gap: 8px; justify-content: center;">
          <button onclick="window.print()" style="padding: 8px 16px; background: ${i}; color: white; border: none; border-radius: 4px; font-weight: 600; cursor: pointer;">Print</button>
          <button onclick="window.close()" style="padding: 8px 16px; background: white; color: #475569; border: 1px solid #e2e8f0; border-radius: 4px; font-weight: 600; cursor: pointer;">Close</button>
        </div>
      </body>
      </html>
    `},J=async()=>{var N,w,$,j,s,d;const e=o.primaryColor||"#0f766e",i=y.endsWith("/")?y.slice(0,-1):y,l=o.logoUrl?o.logoUrl.startsWith("http")?o.logoUrl:`${i}${o.logoUrl.startsWith("/")?"":"/"}${o.logoUrl}`:null,g=l?`<img src="${l}" alt="School Logo" style="height: 70px; width: auto; max-width: 250px; object-fit: contain; margin-bottom: 8px;" />`:`<div style="height: 70px; width: 70px; border-radius: 50%; background-color: ${e}10; border: 3px solid ${e}; color: ${e}; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 900; margin-bottom: 8px;">${((o==null?void 0:o.schoolName)||"SCH").split(" ").slice(0,3).map(p=>p[0]).join("").toUpperCase()}</div>`;let r=null;try{r=(await(await M.get(`/api/fees/students?termId=${m.id}&academicSessionId=${n.id}`)).json()||[]).find(z=>z.id===a.id)}catch(p){console.error("Error fetching fee record:",p)}const f=h.reduce((p,S)=>p+S.amount,0),b=btoa(`TERM-${m.id}-${a.id}`).substring(0,10).toUpperCase(),k=`https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(`TERM-${m.id}-${a.id}`)}&scale=2&rotate=N&height=10&includetext=true&backgroundcolor=ffffff`;return`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Term Payment Statement - ${((N=a.user)==null?void 0:N.firstName)||"Student"}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=JetBrains+Mono&display=swap" rel="stylesheet">
        <style>
          @page {
            size: auto;
            margin: 10mm;
          }
          @media print {
            body { margin: 0 !important; padding: 0 !important; background: white !important; }
            .no-print { display: none !important; }
            .statement-card { box-shadow: none !important; border: 1px solid #eee !important; margin: 0 !important; width: 100% !important; }
          }
          body { font-family: 'Inter', sans-serif; background: #f1f5f9; padding: 40px 20px; color: #1e293b; }
          .statement-card { background: white; max-width: 850px; margin: 0 auto; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); overflow: hidden; }
          .header { background: ${e}; color: white; padding: 30px 40px; display: flex; justify-content: space-between; align-items: center; }
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
              ${g}
              <h1>${o.schoolName||"School Name"}</h1>
              <p>Term Payment Summary Statement</p>
            </div>
            <div style="text-align: right">
              <div style="font-weight: 700; font-size: 18px;">${n.name}</div>
              <div style="opacity: 0.8;">${m.name}</div>
            </div>
          </div>
          <div class="body">
            <div class="meta-grid">
              <div class="meta-item">
                <label>Student Name</label>
                <span>${((w=a.user)==null?void 0:w.firstName)||"Unknown"} ${(($=a.user)==null?void 0:$.lastName)||""} ${a.middleName||""}</span>
              </div>
              <div class="meta-item">
                <label>Admission No.</label>
                <span>${a.admissionNumber}</span>
              </div>
              <div class="meta-item">
                <label>Current Class</label>
                <span>${((j=a.classModel)==null?void 0:j.name)||"N/A"} ${((s=a.classModel)==null?void 0:s.arm)||""}</span>
              </div>
              <div class="meta-item">
                <label>Statement Hash</label>
                <span style="font-family: 'JetBrains Mono', monospace; font-size: 12px;">${b}</span>
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
                ${(Array.isArray(h)?h:[]).length>0?(Array.isArray(h)?h:[]).map(p=>`
                  <tr>
                    <td>${new Date(p.paymentDate).toLocaleDateString()}</td>
                    <td>School Fee Payment</td>
                    <td>${p.paymentMethod.toUpperCase()}</td>
                    <td class="amount-col">₦${x(p.amount)}</td>
                  </tr>
                `).join(""):'<tr><td colspan="4" style="text-align: center; color: #94a3b8;">No payments found for this period.</td></tr>'}
              </tbody>
            </table>

            <div class="summary-card">
              <div class="summary-item">
                <div class="summary-label">Expected Charge</div>
                <div class="summary-val">₦${x((r==null?void 0:r.expectedAmount)||0)}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Total Paid</div>
                <div class="summary-val" style="color: #10b981;">₦${x(f)}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Current Balance</div>
                <div class="summary-val" style="color: ${((r==null?void 0:r.balance)||0)>0?"#ef4444":"#10b981"};">₦${x((r==null?void 0:r.balance)||0)}</div>
              </div>
            </div>

            <div class="digital-seal-wrapper">
              <svg width="130" height="130" viewBox="0 0 120 120" style="transform: rotate(-10deg);">
                <circle cx="60" cy="60" r="55" fill="none" stroke="${e}" stroke-width="2" stroke-dasharray="3,2" opacity="0.4"/>
                <path id="termSealPath" d="M 60,60 m -40,0 a 40,40 0 1,1 80,0 a 40,40 0 1,1 -80,0" fill="none"/>
                <text font-size="7" font-weight="800" fill="${e}" opacity="0.6">
                  <textPath href="#termSealPath" startOffset="0%">TERM STATEMENT • VERIFIED FINANCIAL RECORD • ${((d=o.schoolName)==null?void 0:d.toUpperCase())||"OFFICIAL SEAL"} •</textPath>
                </text>
                <text x="60" y="62" text-anchor="middle" font-size="12" font-weight="900" fill="${e}" opacity="0.6">VALID</text>
              </svg>
            </div>

            <div style="margin-top: 20px; text-align: center;">
               <img src="${k}" alt="Barcode" style="max-width: 250px; height: auto;" />
            </div>

            <div class="footer">
              <div>
                Official computer-generated statement. Verified by system at ${K(new Date)}.
              </div>
              <div style="text-align: right;">
                Verification ID: ${b}
              </div>
            </div>
          </div>
        </div>
        <div class="no-print" style="text-align: center; margin-top: 30px;">
          <button onclick="window.print()" style="padding: 12px 24px; background: ${e}; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">Print Statement</button>
          <button onclick="window.close()" style="margin-left: 10px; padding: 12px 24px; background: #64748b; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">Close</button>
        </div>
      </body>
      </html>
    `},V=async()=>{var N,w,$,j;const e=o.primaryColor||"#0f766e",i=y.endsWith("/")?y.slice(0,-1):y,l=o.logoUrl?o.logoUrl.startsWith("http")?o.logoUrl:`${i}${o.logoUrl.startsWith("/")?"":"/"}${o.logoUrl}`:null,g=l?`<img src="${l}" alt="School Logo" style="height: 65px; width: auto; max-width: 250px; object-fit: contain; margin-bottom: 5px;" />`:`<div style="height: 65px; width: 65px; border-radius: 50%; background-color: ${e}10; border: 3px solid ${e}; color: ${e}; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 900; margin-bottom: 5px;">${((o==null?void 0:o.schoolName)||"SCH").split(" ").slice(0,3).map(s=>s[0]).join("").toUpperCase()}</div>`;let r=[];try{const s=I.filter(d=>d.academicSessionId===n.id);for(const d of s){const z=(await(await M.get(`/api/fees/students?termId=${d.id}&academicSessionId=${n.id}`)).json()||[]).find(E=>E.id===a.id);z&&r.push({term:d,...z})}}catch(s){console.error("Error fetching cumulative records:",s)}const f={expected:r.reduce((s,d)=>s+(d.expectedAmount||0),0),paid:r.reduce((s,d)=>s+(d.paidAmount||0),0),balance:r.reduce((s,d)=>s+(d.balance||0),0)},b=btoa(`SESS-${n.id}-${a.id}`).substring(0,12).toUpperCase(),k=`https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(`SESS-${n.id}-${a.id}`)}&scale=2&rotate=N&height=10&includetext=true&backgroundcolor=ffffff`;return`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Sessional Payment Ledger - ${((N=a.user)==null?void 0:N.firstName)||"Student"}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=JetBrains+Mono&display=swap" rel="stylesheet">
        <style>
          @page {
            size: auto;
            margin: 10mm;
          }
          @media print {
            body { margin: 0 !important; padding: 0 !important; background: white !important; }
            .no-print { display: none !important; }
            .ledger-card { box-shadow: none !important; border: 1px solid #eee !important; margin: 0 !important; width: 100% !important; }
          }
          body { font-family: 'Inter', sans-serif; background: #e2e8f0; padding: 40px 20px; color: #1e293b; }
          .ledger-card { background: white; max-width: 900px; margin: 0 auto; border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); overflow: hidden; }
          .side-accent { width: 8px; background: ${e}; position: absolute; left: 0; top: 0; bottom: 0; }
          .header { padding: 40px; border-bottom: 1px solid #f1f5f9; position: relative; display: flex; justify-content: space-between; align-items: flex-start; }
          .header h1 { margin: 0; font-size: 26px; font-weight: 700; color: ${e}; }
          .header p { margin: 4px 0 0; color: #64748b; font-size: 14px; }
          .content { padding: 40px; }
          .summary-header { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 30px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 40px; }
          .stat-item { text-align: left; }
          .stat-label { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700; margin-bottom: 4px; }
          .stat-val { font-size: 18px; font-weight: 700; font-family: 'JetBrains Mono', monospace; }
          .term-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          .term-card { border: 1px solid #f1f5f9; border-radius: 12px; padding: 20px; background: #fff; transition: all 0.2s; }
          .term-title { font-size: 14px; font-weight: 700; color: ${e}; margin-bottom: 12px; display: flex; justify-content: space-between; }
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
              ${g}
              <h1>Sessional Payment Ledger</h1>
              <p>Academic Session: <strong>${n.name}</strong></p>
            </div>
            <div style="text-align: right">
              <div style="font-weight: 600; font-size: 16px;">${((w=a.user)==null?void 0:w.firstName)||"Unknown"} ${(($=a.user)==null?void 0:$.lastName)||""} ${a.middleName||""}</div>
              <div style="font-size: 12px; color: #64748b;">ID: ${a.admissionNumber}</div>
            </div>
          </div>
          <div class="content">
            <div class="summary-header">
              <div class="stat-item">
                <div class="stat-label">Total Expected</div>
                <div class="stat-val">₦${x(f.expected)}</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">Total Remitted</div>
                <div class="stat-val" style="color: #10b981;">₦${x(f.paid)}</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">Outstanding Balance</div>
                <div class="stat-val" style="color: ${f.balance>0?"#ef4444":"#10b981"};">₦${x(f.balance)}</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">Completion</div>
                <div class="stat-val">${f.expected>0?(f.paid/f.expected*100).toFixed(1):0}%</div>
              </div>
            </div>

            <h2 style="font-size: 16px; margin-bottom: 20px;">Term-by-Term Breakdown</h2>
            <div class="term-grid">
              ${(Array.isArray(r)?r:[]).length>0?(Array.isArray(r)?r:[]).map(s=>`
                <div class="term-card">
                  <div class="term-title">
                    ${s.term.name}
                    <span class="status-badge" style="background: ${s.balance<=0?"#dcfce7":"#fee2e2"}; color: ${s.balance<=0?"#166534":"#991b1b"};">
                      ${s.balance<=0?"Settled":"Pending"}
                    </span>
                  </div>
                  <div class="row">
                    <span>Charge:</span>
                    <span>₦${x(s.expectedAmount||0)}</span>
                  </div>
                  <div class="row">
                    <span>Arrears:</span>
                    <span>₦${x(s.openingBalance||0)}</span>
                  </div>
                  <div class="row">
                    <span>Paid:</span>
                    <span>₦${x(s.paidAmount||0)}</span>
                  </div>
                  <div class="row" style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #f1f5f9;">
                    <span>Term Balance:</span>
                    <span style="color: ${s.balance>0?"#ef4444":"#10b981"};">₦${x(s.balance||0)}</span>
                  </div>
                </div>
              `).join(""):"<p>No records found.</p>"}
            </div>

            <div style="margin-top: 40px; text-align: center;">
               <img src="${k}" alt="Barcode" style="max-width: 300px; height: auto;" />
            </div>

            <div class="digital-seal-wrapper">
              <svg width="150" height="150" viewBox="0 0 120 120" style="transform: rotate(-12deg);">
                <circle cx="60" cy="60" r="58" fill="none" stroke="${e}" stroke-width="2.5" stroke-dasharray="4,2" opacity="0.4"/>
                <path id="sessSealPath" d="M 60,60 m -42,0 a 42,42 0 1,1 84,0 a 42,42 0 1,1 -84,0" fill="none"/>
                <text font-size="6" font-weight="900" fill="${e}" opacity="0.6" letter-spacing="1">
                  <textPath href="#sessSealPath" startOffset="0%">SESSIONAL LEDGER • ACADEMIC AUDIT RECORD • ${((j=o.schoolName)==null?void 0:j.toUpperCase())||"OFFICIAL SEAL"} •</textPath>
                </text>
                <text x="60" y="58" text-anchor="middle" font-size="8" font-weight="900" fill="${e}" opacity="0.6">SESSIONAL</text>
                <text x="60" y="70" text-anchor="middle" font-size="12" font-weight="900" fill="${e}" opacity="0.6">LEDGER</text>
              </svg>
            </div>

            <div class="footer">
              <div style="font-size: 10px; color: #94a3b8;">
                Security Verification ID: <span style="font-family: 'JetBrains Mono', monospace; font-weight: 700;">${b}</span><br/>
                Generated: ${K(new Date)}
              </div>
              <div style="text-align: right;">
                <div style="height: 40px; border-bottom: 1px solid #cbd5e1; width: 150px; margin-bottom: 4px;"></div>
                <div style="font-size: 11px; color: #64748b;">Burser/Accountant Seal</div>
              </div>
            </div>
          </div>
        </div>
        <div class="no-print" style="text-align: center; margin-top: 30px;">
          <button onclick="window.print()" style="padding: 12px 24px; background: ${e}; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">Print Full Ledger</button>
          <button onclick="window.close()" style="margin-left: 10px; padding: 12px 24px; background: #64748b; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">Close</button>
        </div>
      </body>
      </html>
    `},te=async()=>{if(!T){H(!0);try{let e="";if(c==="single"){if(!v)return;e=O(v)}else c==="summary"?e=await J():e=await V();const i=document.createElement("iframe");i.style.position="fixed",i.style.right="0",i.style.bottom="0",i.style.width="210mm",i.style.height="100%",i.style.border="none",i.style.visibility="hidden",document.body.appendChild(i);const l=i.contentWindow.document;l.open(),l.write(e),l.close(),await new Promise(k=>setTimeout(k,1500));const g=l.querySelector(".receipt-card, .statement-card, .ledger-card");if(!g)throw new Error("Preview container not found");const r=await se(g,{scale:2,useCORS:!0,allowTaint:!0,logging:!1,backgroundColor:"#ffffff"}),f=r.toDataURL("image/png"),b=new ne({orientation:r.width>r.height?"l":"p",unit:"mm",format:[r.width*.264583,r.height*.264583]});b.addImage(f,"PNG",0,0,r.width*.264583,r.height*.264583),ae(b,`Receipt-${a.admissionNumber}-${new Date().getTime()}.pdf`),document.body.removeChild(i)}catch(e){console.error("PDF Generation failed:",e),alert("Failed to generate PDF. Please try again.")}finally{H(!1)}}},ie=async()=>{const e=window.open("","_blank");if(!e){alert("Popup blocked! Please allow popups for this site to print receipts.");return}e.document.write('<html><head><title>Loading...</title></head><body><div style="font-family:sans-serif; display:flex; align-items:center; justify-content:center; height:100vh;"><h2>Generating Receipt...</h2></div></body></html>');try{let i="";if(c==="single"){if(!v){alert("Please select a payment"),e.close();return}i=O(v)}else c==="term"?i=await J():c==="cumulative"&&(i=await V());e.document.open(),e.document.write(i),e.document.close(),e.focus(),e.onload=()=>{setTimeout(()=>{e.print()},1e3)},e.document.readyState==="complete"&&setTimeout(()=>{e.print&&e.print()},2e3)}catch(i){console.error("Print Error:",i),e.document.write(`<div style="color:red; padding:20px;">Error generating receipt: ${i.message}</div>`)}};return C?t.jsx("div",{className:"fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]",children:t.jsxs("div",{className:"bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto",children:[t.jsxs("div",{className:"p-6 border-b border-gray-200",children:[t.jsxs("div",{className:"flex justify-between items-center",children:[t.jsx("h2",{className:"text-2xl font-bold text-gray-900",children:"Print Receipt"}),t.jsx("button",{onClick:L,className:"text-gray-400 hover:text-gray-600",children:t.jsx("svg",{className:"w-6 h-6",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:t.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M6 18L18 6M6 6l12 12"})})})]}),a&&t.jsxs("div",{className:"mt-4 text-sm text-gray-600",children:[t.jsxs("p",{children:[t.jsx("strong",{children:"Student:"})," ",((G=a.user)==null?void 0:G.firstName)||"Unknown"," ",((Y=a.user)==null?void 0:Y.lastName)||""," ",a.middleName||""]}),t.jsxs("p",{children:[t.jsx("strong",{children:"Admission No:"})," ",a.admissionNumber]}),t.jsxs("p",{children:[t.jsx("strong",{children:"Class:"})," ",((q=a.classModel)==null?void 0:q.name)||"N/A"," ",((_=a.classModel)==null?void 0:_.arm)||""]})]})]}),t.jsxs("div",{className:"p-6 space-y-6",children:[t.jsxs("div",{children:[t.jsx("label",{className:"block text-sm font-medium text-gray-700 mb-2",children:"Select Receipt Type"}),t.jsxs("div",{className:"space-y-2",children:[t.jsxs("label",{className:"flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50",children:[t.jsx("input",{type:"radio",name:"receiptType",value:"single",checked:c==="single",onChange:e=>D(e.target.value),className:"mr-3"}),t.jsxs("div",{children:[t.jsx("div",{className:"font-medium",children:"Single Payment Receipt"}),t.jsx("div",{className:"text-sm text-gray-500",children:"Print receipt for one specific payment"})]})]}),t.jsxs("label",{className:"flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50",children:[t.jsx("input",{type:"radio",name:"receiptType",value:"term",checked:c==="term",onChange:e=>D(e.target.value),className:"mr-3"}),t.jsxs("div",{children:[t.jsx("div",{className:"font-medium",children:"Term Receipt"}),t.jsx("div",{className:"text-sm text-gray-500",children:"Print all payments for a specific term"})]})]}),t.jsxs("label",{className:"flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50",children:[t.jsx("input",{type:"radio",name:"receiptType",value:"cumulative",checked:c==="cumulative",onChange:e=>D(e.target.value),className:"mr-3"}),t.jsxs("div",{children:[t.jsx("div",{className:"font-medium",children:"Cumulative Receipt (All Terms)"}),t.jsx("div",{className:"text-sm text-gray-500",children:"Print summary for entire academic session"})]})]})]})]}),c==="cumulative"&&t.jsxs("div",{children:[t.jsx("label",{className:"block text-sm font-medium text-gray-700 mb-2",children:"Academic Session"}),t.jsx("select",{value:(n==null?void 0:n.id)||"",onChange:e=>{const i=A.find(l=>l.id===parseInt(e.target.value));B(i)},className:"w-full border border-gray-300 rounded-md p-2",children:A.map(e=>t.jsx("option",{value:e.id,children:e.name},e.id))})]}),(c==="single"||c==="term")&&t.jsxs("div",{className:"grid grid-cols-1 sm:grid-cols-2 gap-4",children:[t.jsxs("div",{children:[t.jsx("label",{className:"block text-sm font-medium text-gray-700 mb-2",children:"Academic Session"}),t.jsx("select",{value:(n==null?void 0:n.id)||"",onChange:e=>{const i=A.find(g=>g.id===parseInt(e.target.value));B(i);const l=I.find(g=>g.academicSessionId===parseInt(e.target.value));R(l)},className:"w-full border border-gray-300 rounded-md p-2",children:A.map(e=>t.jsx("option",{value:e.id,children:e.name},e.id))})]}),t.jsxs("div",{children:[t.jsx("label",{className:"block text-sm font-medium text-gray-700 mb-2",children:"Term"}),t.jsx("select",{value:(m==null?void 0:m.id)||"",onChange:e=>{const i=I.find(l=>l.id===parseInt(e.target.value));R(i)},className:"w-full border border-gray-300 rounded-md p-2",children:I.filter(e=>e.academicSessionId===(n==null?void 0:n.id)).map(e=>t.jsx("option",{value:e.id,children:e.name},e.id))})]})]}),c==="single"&&t.jsxs("div",{children:[t.jsx("label",{className:"block text-sm font-medium text-gray-700 mb-2",children:"Select Payment"}),Z?t.jsx("p",{className:"text-gray-500",children:"Loading payments..."}):h.length>0?t.jsx("select",{value:(v==null?void 0:v.id)||"",onChange:e=>{const i=h.find(l=>l.id===parseInt(e.target.value));U(i)},className:"w-full border border-gray-300 rounded-md p-2",children:h.map(e=>t.jsxs("option",{value:e.id,children:[re(e.paymentDate)," - ₦",x(e.amount)," (",e.paymentMethod,")"]},e.id))}):t.jsx("p",{className:"text-gray-500 text-sm",children:"No payments found for this term"})]})]}),t.jsxs("div",{className:"p-6 border-t border-gray-200 flex justify-end space-x-3",children:[t.jsx("button",{onClick:L,className:"px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50",children:"Cancel"}),t.jsxs("button",{onClick:te,disabled:T||c==="single"&&(!v||h.length===0),className:"px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center",children:[T?t.jsx("div",{className:"w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"}):t.jsx("svg",{className:"w-5 h-5 mr-2",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:t.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"})}),"Download PDF"]}),t.jsxs("button",{onClick:ie,disabled:T||c==="single"&&(!v||h.length===0),className:"px-4 py-2 bg-primary text-white rounded-md hover:brightness-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center",children:[t.jsx("svg",{className:"w-5 h-5 mr-2",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:t.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"})}),"Print Receipt"]})]})]})}):null}export{xe as P};
