import{j as e}from"./chart-vendor-BYY-65EX.js";import{a as p}from"./react-vendor-C00C9m_W.js";import{a as Ea}from"./FileSaver.min-D0dQec9w.js";import{s as jt}from"./mobileDownload-CZXh0UZT.js";import{u as Fa,A as Te,b as gs,a as L,n as P}from"./index-mRO0F4gt.js";import{P as us}from"./PrintReceiptModal-CX_YLO1Z.js";import{h as Nt,E as kt}from"./doc-vendor-BZnDaIDN.js";import{a as x}from"./formatters-CX5es-NB.js";import{E as Ra}from"./exceljs.min-DDgFSJCG.js";import"./icons-az3e4FRa.js";function fs({student:I,isOpen:ue,onClose:y,currentTerm:E,currentSession:U}){var b,me,fe,_;const{settings:f}=Fa(),[w,Je]=p.useState(!1),j=()=>{var ie,he,le,M;if(!I)return;const N=(f==null?void 0:f.primaryColor)||"#059669",we=(f==null?void 0:f.secondaryColor)||"#047857",H=f!=null&&f.logoUrl?f.logoUrl.startsWith("http")?f.logoUrl:`${Te}${f.logoUrl}`:null,te=f!=null&&f.principalSignatureUrl?f.principalSignatureUrl.startsWith("http")?f.principalSignatureUrl:`${Te}${f.principalSignatureUrl}`:null,Y=`SCH-${I.id}-${(E==null?void 0:E.id)||"ALL"}`,xe=`https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(Y)}&scale=3&rotate=N&includetext=true&backgroundcolor=ffffff&height=12`,pe=btoa(`SCHOLARSHIP-${I.id}-${new Date().getTime()}`).substring(0,16).toUpperCase(),re=`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Scholarship Card - ${I.admissionNumber}</title>
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
              margin: 0 auto !important; 
              width: 100mm !important; 
              height: 140mm !important; 
              border: none !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
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
              ${N} 1mm,
              ${N} 1.1mm
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
            background: linear-gradient(135deg, ${N}, ${we});
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
            background: ${N};
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
            color: ${N};
            text-transform: uppercase;
            margin-bottom: 2mm;
            display: flex;
            align-items: center;
            gap: 2mm;
          }

          .desc-label::after {
            content: ''; flex: 1; height: 0.2mm; background: ${N}30;
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
            background: linear-gradient(135deg, ${N}, ${we});
            color: white;
            box-shadow: 0 10px 20px -5px ${N}40;
          }

          .btn-print:hover {
            transform: translateY(-2px);
            box-shadow: 0 15px 25px -5px ${N}60;
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
              ${H?`<img src="${H}" alt="Logo" />`:'<span style="font-size: 20px;">🎓</span>'}
            </div>
            <div class="school-name">${(f==null?void 0:f.schoolName)||"ACADEMY"}</div>
            <div class="school-addr">${(f==null?void 0:f.schoolAddress)||"Official Document"}</div>
          </div>

          <div class="badge-row">
            <div class="scholarship-badge">Official Exemption Award</div>
          </div>

          <div class="body">
            <h2 class="card-title">Scholarship Card</h2>

            <div class="student-card">
              <div class="info-grid">
                <div class="info-label">Full Name</div>
                <div class="info-value">${((ie=I.user)==null?void 0:ie.firstName)||"Unknown"} ${((he=I.user)==null?void 0:he.lastName)||""}</div>
              </div>
              
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4mm;">
                <div>
                  <div class="info-label">Student ID</div>
                  <div class="info-value">${I.admissionNumber}</div>
                </div>
                <div>
                  <div class="info-label">Classification</div>
                  <div class="info-value" style="font-size: 11px;">${((le=I.classModel)==null?void 0:le.name)||"N/A"} ${((M=I.classModel)==null?void 0:M.arm)||""}</div>
                </div>
              </div>
            </div>

            <div class="desc-label">Legal Declaration</div>
            <p class="description">
              This card certifies that the student is under a <strong style="color: ${N}">FULL ACADEMIC SCHOLARSHIP</strong>. 
              They are hereby <strong style="color: ${N}">EXEMPTED</strong> from all standard tuition and fees for the 
              <strong>${(U==null?void 0:U.name)||"Current Session"}</strong>. 
              Full clearance and academic access must be granted.
            </p>

            <div class="footer">
              <div class="barcode-box">
                <img class="barcode" src="${xe}" alt="Barcode">
                <div class="security-hash">${pe}</div>
              </div>

              <div class="auth-box">
                ${te?`<img class="signature-img" src="${te}" alt="Sign">`:'<div style="height: 10mm;"></div>'}
                <div class="auth-line">Official Seal / Sign</div>
              </div>
            </div>

            <div class="digital-seal">
              <svg width="100%" height="100%" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="55" fill="none" stroke="${N}" stroke-width="2" stroke-dasharray="3,2" />
                <path id="sealPath" d="M 60,60 m -40,0 a 40,40 0 1,1 80,0 a 40,40 0 1,1 -80,0" fill="none"/>
                <text font-size="8" font-weight="800" fill="${N}">
                  <textPath href="#sealPath">AUTHENTIC AWARD • VERIFIED ACCESS • </textPath>
                </text>
                <text x="60" y="65" text-anchor="middle" font-size="14" font-weight="900" fill="${N}">VALID</text>
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
    `,Q=window.open("","_blank");Q.document.write(re),Q.document.close(),Q.focus(),setTimeout(()=>{Q.onload=()=>{setTimeout(()=>{Q.print()},500)},Q.document.readyState==="complete"&&setTimeout(()=>{Q.print&&Q.print()},1500)},500)},dt=async()=>{var N,we,H,te;if(!(w||!I)){Je(!0);try{const Y=(f==null?void 0:f.primaryColor)||"#059669",xe=(f==null?void 0:f.secondaryColor)||"#047857",pe=f!=null&&f.logoUrl?f.logoUrl.startsWith("http")?f.logoUrl:`${Te}${f.logoUrl}`:null,re=f!=null&&f.principalSignatureUrl?f.principalSignatureUrl.startsWith("http")?f.principalSignatureUrl:`${Te}${f.principalSignatureUrl}`:null,Q=`SCH-${I.id}-${(E==null?void 0:E.id)||"ALL"}`,ie=`https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(Q)}&scale=3&rotate=N&includetext=true&backgroundcolor=ffffff&height=12`,he=btoa(`SCHOLARSHIP-${I.id}-${new Date().getTime()}`).substring(0,16).toUpperCase(),le=`
        <!DOCTYPE html>
        <html>
        <head>
          <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap" rel="stylesheet">
          <style>
            body { margin: 0; padding: 0; background: white; }
            .card-container {
              width: 105mm;
              height: 148mm;
              background: white;
              position: relative;
              border-radius: 8mm;
              display: flex;
              flex-direction: column;
              border: 0.5mm solid rgba(0,0,0,0.05);
              overflow: hidden;
            }
            /* ... Copy required styles from above ... */
            .header { background: linear-gradient(135deg, ${Y}, ${xe}); padding: 8mm 6mm; color: white; text-align: center; }
            .school-logo-frame { width: 18mm; height: 18mm; background: white; border-radius: 5mm; margin: 0 auto 3mm; display: flex; align-items: center; justify-content: center; padding: 2mm; }
            .school-logo-frame img { max-width: 100%; max-height: 100%; object-fit: contain; }
            .school-name { font-size: 14px; font-weight: 800; text-transform: uppercase; margin-bottom: 1mm; }
            .badge-row { padding: 4mm 6mm; display: flex; justify-content: center; }
            .scholarship-badge { background: #fef3c7; color: #92400e; padding: 1.5mm 4mm; border-radius: 100px; font-size: 9px; font-weight: 800; text-transform: uppercase; border: 0.5mm solid #fbbf24; }
            .body { flex: 1; padding: 0 8mm 6mm; display: flex; flex-direction: column; align-items: center; }
            .card-title { font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 6mm; text-transform: uppercase; }
            .student-card { width: 100%; background: #f8fafc; border-radius: 5mm; padding: 5mm; border: 0.3mm solid #e2e8f0; margin-bottom: 6mm; border-left: 1.5mm solid ${Y}; }
            .info-label { font-size: 7px; color: #94a3b8; text-transform: uppercase; font-weight: 800; }
            .info-value { font-size: 13px; font-weight: 700; color: #0f172a; }
            .description { font-size: 10px; line-height: 1.6; color: #475569; text-align: justify; }
            .footer { margin-top: auto; width: 100%; display: flex; justify-content: space-between; align-items: flex-end; }
            .barcode { max-width: 40mm; }
            .signature-img { height: 12mm; width: auto; }
            .auth-line { width: 35mm; border-top: 0.3mm solid #cbd5e1; padding-top: 1.5mm; font-size: 7px; font-weight: 800; color: #64748b; text-transform: uppercase; text-align: center; }
          </style>
        </head>
        <body>
          <div class="card-container" id="capture-container">
            <div class="header">
              <div class="school-logo-frame">
                ${pe?`<img src="${pe}" />`:"🎓"}
              </div>
              <div class="school-name">${(f==null?void 0:f.schoolName)||"ACADEMY"}</div>
            </div>
            <div class="badge-row">
              <div class="scholarship-badge">Official Exemption Award</div>
            </div>
            <div class="body">
              <h2 class="card-title">Scholarship Card</h2>
              <div class="student-card">
                <div class="info-label">Full Name</div>
                <div class="info-value">${((N=I.user)==null?void 0:N.firstName)||""} ${((we=I.user)==null?void 0:we.lastName)||""}</div>
                <div style="margin-top: 3mm; display: grid; grid-template-columns: 1fr 1fr;">
                  <div>
                    <div class="info-label">Student ID</div>
                    <div class="info-value">${I.admissionNumber}</div>
                  </div>
                  <div>
                    <div class="info-label">Class</div>
                    <div class="info-value">${((H=I.classModel)==null?void 0:H.name)||""} ${((te=I.classModel)==null?void 0:te.arm)||""}</div>
                  </div>
                </div>
              </div>
              <p class="description">
                This card certifies that the student is under a FULL ACADEMIC SCHOLARSHIP for the ${(U==null?void 0:U.name)||"Current Session"}.
              </p>
              <div class="footer">
                <div>
                  <img class="barcode" src="${ie}" />
                  <div style="font-size: 7px; color: #94a3b8; font-family: monospace;">${he}</div>
                </div>
                <div style="text-align: center;">
                  ${re?`<img class="signature-img" src="${re}" />`:'<div style="height: 10mm;"></div>'}
                  <div class="auth-line">Official Seal / Sign</div>
                </div>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,M=document.createElement("iframe");M.style.position="fixed",M.style.visibility="hidden",document.body.appendChild(M);const je=M.contentWindow.document;je.open(),je.write(le),je.close(),await new Promise(q=>setTimeout(q,1500));const Ae=je.getElementById("capture-container"),W=(await Nt(Ae,{scale:3,useCORS:!0})).toDataURL("image/png"),Oe=new kt({orientation:"p",unit:"mm",format:[105,148]});Oe.addImage(W,"PNG",0,0,105,148),jt(Oe,`ScholarshipCard-${I.admissionNumber}.pdf`),document.body.removeChild(M)}catch(Y){console.error("PDF Generation failed:",Y),alert("Failed to generate PDF")}finally{Je(!1)}}};return ue?e.jsx("div",{className:"fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4",children:e.jsxs("div",{className:"bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all",children:[e.jsxs("div",{className:"bg-gradient-to-r from-emerald-600 to-teal-800 p-6 flex justify-between items-center text-white",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("div",{className:"p-2 bg-white/20 rounded-lg backdrop-blur-sm",children:e.jsx("svg",{className:"w-6 h-6",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"})})}),e.jsx("h2",{className:"text-xl font-bold tracking-tight",children:"Print Exemption Card"})]}),e.jsx("button",{onClick:y,className:"text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors",children:e.jsx("svg",{className:"w-5 h-5",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M6 18L18 6M6 6l12 12"})})})]}),e.jsxs("div",{className:"p-6",children:[e.jsx("p",{className:"text-gray-600 text-sm mb-6",children:"You are about to generate an official Certificate of Exemption for scholarship awardee:"}),e.jsxs("div",{className:"bg-emerald-50 border border-emerald-100 rounded-xl p-4 mb-8",children:[e.jsxs("h3",{className:"font-bold text-emerald-900 text-lg",children:[(b=I.user)==null?void 0:b.firstName," ",(me=I.user)==null?void 0:me.lastName]}),e.jsxs("div",{className:"text-sm text-emerald-700 mt-1 flex items-center gap-2",children:[e.jsx("span",{className:"font-medium bg-emerald-200/50 px-2 py-0.5 rounded text-xs",children:I.admissionNumber}),e.jsx("span",{children:"•"}),e.jsxs("span",{children:[((fe=I.classModel)==null?void 0:fe.name)||"N/A"," ",((_=I.classModel)==null?void 0:_.arm)||""]})]})]}),e.jsxs("div",{className:"flex justify-end gap-3",children:[e.jsx("button",{onClick:y,className:"px-5 py-2.5 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors",children:"Cancel"}),e.jsxs("button",{onClick:dt,disabled:w,className:"px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center gap-2",children:[w?e.jsx("div",{className:"w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"}):e.jsx("span",{children:"💾"}),"Download Card (PDF)"]}),e.jsx("button",{onClick:j,disabled:w,className:"px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-bold shadow-md shadow-emerald-600/20 hover:bg-emerald-700 hover:shadow-lg hover:-translate-y-0.5 transition-all",children:"Print 🖨️"})]})]})]})}):null}function Fs(){var Qt,Xt,Kt,Zt,Vt,ea,ta,aa,sa,ra,ia,la,na,oa,da,ca,ma,xa,pa,ha,ga,ua,fa,ba,ya,va,wa;const I=p.useRef(null),{user:ue}=gs(),{settings:y}=Fa(),E=["superadmin","proprietor"].includes((Qt=ue==null?void 0:ue.role)==null?void 0:Qt.toLowerCase()),[U,f]=p.useState([]),[w,Je]=p.useState(null),[j,dt]=p.useState(null),[b,me]=p.useState(null),[fe,_]=p.useState(!0),[N,we]=p.useState(!0),[H,te]=p.useState(null),[Y,xe]=p.useState(""),[pe,re]=p.useState("cash"),[Q,ie]=p.useState(""),[he,le]=p.useState(""),[M,je]=p.useState(null),[Ae,ct]=p.useState(!1),[W,Oe]=p.useState([]),[q,Ct]=p.useState([]),[A,_e]=p.useState(null),[ge,Qe]=p.useState(null),[Xe,mt]=p.useState(null),[Ke,Se]=p.useState(!1),[$t,Ee]=p.useState(!1),[Ia,Re]=p.useState(null),[At,Fe]=p.useState(null),[St,Et]=p.useState(!1),[Rt,Ft]=p.useState(null),[It,Ma]=p.useState(""),[xt,Pa]=p.useState("all"),[Ie,za]=p.useState("all"),[Me,La]=p.useState([]),[J,Ze]=p.useState(null),[Mt,Da]=p.useState({}),[be,Ve]=p.useState([]),[bs,ys]=p.useState(!1),[Ba,et]=p.useState(!1),[tt,pt]=p.useState([]),[V,Pt]=p.useState(null),[Ta,zt]=p.useState(!1),[Lt,Oa]=p.useState(""),[Dt,Ua]=p.useState(!1),[Pe,vs]=p.useState(null),[T,Ue]=p.useState(null),[ht,Bt]=p.useState(""),[He,Tt]=p.useState("standard"),[Ne,Ha]=p.useState([]),[gt,at]=p.useState(!1),[ut,Wa]=p.useState(null),[ft,Ga]=p.useState(null),[ke,Ot]=p.useState(null),[Ce,Ut]=p.useState(null),[ye,st]=p.useState(null),[Ya,rt]=p.useState(!1),[Ht,Wt]=p.useState(!1),[G,$e]=p.useState({title:"",description:"",amount:"",isCompulsory:!1,classIds:[],sessionId:"",termId:""}),[ne,We]=p.useState({amount:"",paymentMethod:"cash",receiptNumber:""}),bt=t=>{var s;const a=t.feeRecords[0];Ue({student:t,record:a}),Bt(((s=a==null?void 0:a.expectedAmount)==null?void 0:s.toString())||"0")},qa=async()=>{var t;if(T)try{const a=parseFloat(ht)||0;if(a<0){P.error("Fee amount cannot be negative");return}const s=((t=T.record)==null?void 0:t.expectedAmount)||0;if(a===s){P.error("No changes detected");return}if(!confirm(`Change term fee from ₦${x(s)} to ₦${x(a)}? This will recalculate the student's balance and update all subsequent terms.`))return;_(!0);const r=(h==null?void 0:h.id)||w.id,i=(o==null?void 0:o.id)||j.id,l=await L.post("/api/fees/record",{studentId:T.student.id,termId:r,academicSessionId:i,expectedAmount:a}),u=await l.json();l.ok?(P.success("Fee adjusted successfully. Subsequent terms updated."),Ue(null),D?await oe(i):(await ae(r,i),await de(r,i))):P.error(u.error||"Failed to adjust fee record")}catch(a){console.error("Error adjusting fee:",a),P.error("Failed to save changes")}finally{_(!1)}},Ja=async()=>{if(Pe)try{const t=await L.put(`/api/students/${Pe.id}`,{isExamRestricted:Dt,examRestrictionReason:Lt});if(t.ok){alert("Restriction settings updated successfully"),zt(!1);const a=(h==null?void 0:h.id)||w.id,s=(o==null?void 0:o.id)||j.id;D?await oe(s):await ae(a,s)}else{const a=await t.json();alert(a.error||"Failed to update restriction")}}catch(t){console.error("Error saving restriction:",t),alert("Failed to save restriction settings")}},[it,Gt]=p.useState("table"),[h,lt]=p.useState(null),[o,Ge]=p.useState(null),[D,_a]=p.useState(!1),[X,Qa]=p.useState(!1);p.useEffect(()=>{var t;J&&((t=I.current)==null||t.scrollIntoView({behavior:"smooth",block:"start"}))},[J]),p.useEffect(()=>{if(w&&j)if(X)Ye();else if(D)oe((o==null?void 0:o.id)||j.id);else{const t=(h==null?void 0:h.id)||w.id,a=(o==null?void 0:o.id)||j.id;ae(t,a),de(t,a)}},[N]),p.useEffect(()=>{ts()},[]),p.useEffect(()=>{He==="misc"&&yt()},[He,ke,Ce]);const yt=async()=>{try{at(!0);let t="/api/misc-fees/detailed-analytics";const a=new URLSearchParams;Ce&&a.append("sessionId",Ce),ke&&a.append("termId",ke),a.toString()&&(t+=`?${a.toString()}`);const s=await L.get(t);if(s.ok){const r=await s.json();Ha(Array.isArray(r)?r:[])}}catch(t){console.error("Error fetching detailed analytics:",t)}finally{at(!1)}},Xa=async t=>{if(t.preventDefault(),!G.title||!G.amount){P.error("Title and Amount are required");return}if(G.classIds.length===0){P.error("Please select at least one class");return}try{Wt(!0);const a=await L.post("/api/misc-fees",{...G,academicSessionId:G.sessionId||Ce,termId:G.termId||ke,amount:parseFloat(G.amount)});if(a.ok)P.success("Miscellaneous fee created successfully"),rt(!1),$e({title:"",description:"",amount:"",isCompulsory:!1,classIds:[],sessionId:"",termId:""}),yt();else{const s=await a.json();P.error(s.error||"Failed to create fee")}}catch(a){console.error("Error creating misc fee:",a),P.error("An error occurred while creating the fee")}finally{Wt(!1)}},Ka=t=>{const a=t.toString();$e(s=>({...s,classIds:s.classIds.includes(a)?s.classIds.filter(r=>r!==a):[...s.classIds,a]}))},Za=async t=>{if(t.preventDefault(),!!ye)try{at(!0);const a=await L.post("/api/misc-fees/payments",{studentId:ye.student.id,feeId:ye.fee.id,amount:parseFloat(ne.amount),paymentMethod:ne.paymentMethod,receiptNumber:ne.receiptNumber});if(a.ok)P.success("Payment recorded successfully"),st(null),We({amount:"",paymentMethod:"cash",receiptNumber:""}),yt();else{const s=await a.json();P.error(s.error||"Failed to record payment")}}catch(a){console.error("Error recording misc payment:",a),P.error("An error occurred while recording payment")}finally{at(!1)}},Va=async t=>{var a,s,r,i,l,u,c,d;try{const n=await L.get(`/api/misc-fees/receipt/${t}`);if(!n.ok){const S=await n.json();throw new Error(S.error||"Failed to fetch receipt data")}const m=await n.json(),g=y.primaryColor||"#0f766e",k=y.logoUrl?y.logoUrl.startsWith("http")?y.logoUrl:`${Te}${y.logoUrl}`:null,v=btoa(`MISC-${m.id}-${m.student.id}`).substring(0,12).toUpperCase(),R=`MISC-${m.id}`,C=`https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(R)}&scale=3&rotate=N&includetext=true&backgroundcolor=ffffff&height=12`,$=window.open("","_blank");$.document.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Receipt - ${m.student.admissionNumber}</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet">
        <style>
          @page {
            size: auto;
            margin: 0mm;
          }
          @media print {
            html, body { margin: 0 !important; padding: 0 !important; background: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .no-print { display: none !important; }
            .receipt-card { box-shadow: none !important; border: none !important; margin: 0 auto !important; width: 74mm !important; height: 100mm !important; break-inside: avoid !important; page-break-inside: avoid !important; }
          }
          * { box-sizing: border-box; }
          body {
            font-family: 'Outfit', sans-serif;
            margin: 0;
            padding: 4mm;
            background: #f1f5f9;
            color: #1e293b;
            line-height: 1.2;
            font-size: 10px;
          }
          .receipt-card {
            background: white;
            width: 74mm;
            height: 100mm;
            margin: 0 auto;
            border-radius: 4mm;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            position: relative;
            border: 0.5mm solid rgba(0,0,0,0.05);
            display: flex;
            flex-direction: column;
          }
          .security-bg {
            position: absolute;
            inset: 0;
            background-image: radial-gradient(${g}05 1px, transparent 1px);
            background-size: 3mm 3mm;
            pointer-events: none;
            z-index: 0;
          }
          .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 50px;
            font-weight: 800;
            color: rgba(0, 0, 0, 0.03);
            pointer-events: none;
            text-transform: uppercase;
            white-space: nowrap;
            z-index: 0;
            letter-spacing: 2mm;
          }
          .receipt-header {
            background: linear-gradient(135deg, ${g}, ${g}dd);
            padding: 3mm 4mm;
            color: white;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1mm solid rgba(0,0,0,0.1);
            position: relative;
            z-index: 1;
          }
          .school-info h1 {
            margin: 0;
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: -0.2mm;
            line-height: 1;
          }
          .school-info p {
            margin: 1mm 0 0;
            opacity: 0.9;
            font-size: 7px;
            font-weight: 600;
          }
          .receipt-badge {
            background: white;
            color: ${g};
            padding: 1mm 2mm;
            border-radius: 1mm;
            font-size: 8px;
            font-weight: 800;
            text-transform: uppercase;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .receipt-body {
            padding: 3mm 4mm;
            position: relative;
            z-index: 1;
            flex-grow: 1;
            display: flex;
            flex-direction: column;
          }
          .id-line {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2mm;
            font-size: 8px;
            font-weight: 700;
            color: #64748b;
          }
          .section-title {
            font-size: 8px;
            font-weight: 800;
            color: ${g};
            text-transform: uppercase;
            letter-spacing: 0.5mm;
            margin-bottom: 2mm;
            display: flex;
            align-items: center;
          }
          .section-title::after {
            content: '';
            flex: 1;
            height: 0.2mm;
            background: ${g}20;
            margin-left: 2mm;
          }
          .info-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2mm;
            margin-bottom: 2mm;
          }
          .info-group {
            margin-bottom: 1.5mm;
          }
          .info-label {
            font-size: 7px;
            color: #94a3b8;
            text-transform: uppercase;
            font-weight: 800;
            margin-bottom: 0.2mm;
          }
          .info-value {
            font-size: 9px;
            font-weight: 700;
            color: #0f172a;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .amount-section {
            background: #f8fafc;
            border-radius: 2mm;
            padding: 3mm;
            text-align: center;
            border: 0.5mm dashed #e2e8f0;
            margin: 2mm 0;
            position: relative;
          }
          .amount-label {
            font-size: 8px;
            font-weight: 800;
            color: #64748b;
            text-transform: uppercase;
            margin-bottom: 1mm;
          }
          .amount-value {
            font-size: 18px;
            font-weight: 800;
            color: ${g};
            font-family: 'JetBrains Mono', monospace;
          }
          .security-footer {
            margin-top: auto;
            padding-top: 2mm;
            border-top: 0.2mm solid #f1f5f9;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .security-hash-box {
            font-family: 'JetBrains Mono', monospace;
            font-size: 7px;
            color: #64748b;
            background: #f1f5f9;
            padding: 0.5mm 1.5mm;
            border-radius: 0.5mm;
          }
          .signatures {
            margin-top: 2mm;
            display: flex;
            justify-content: center;
          }
          .sig-box {
            width: 30mm;
            text-align: center;
          }
          .sig-line {
            border-top: 0.3mm solid #cbd5e1;
            margin-bottom: 1mm;
          }
          .sig-label {
            font-size: 7px;
            color: #94a3b8;
            font-weight: 700;
            text-transform: uppercase;
          }
          .digital-seal {
            position: absolute;
            bottom: 15mm;
            right: 2mm;
            width: 20mm;
            height: 20mm;
            opacity: 0.6;
            pointer-events: none;
            z-index: 5;
            transform: rotate(-10deg);
          }
        </style>
      </head>
      <body>
        <div class="receipt-card">
          <div class="security-bg"></div>
          <div class="watermark">PAID</div>
          
          <div class="receipt-header">
            <div class="school-info">
              <h1>${y.schoolName||"SMS"}</h1>
              <p>${((a=y.schoolAddress)==null?void 0:a.substring(0,30))||"Official Receipt"}</p>
            </div>
            <div class="receipt-badge">MISC</div>
          </div>

          <div class="receipt-body">
            <div class="id-line">
              <span>NO: ${m.receiptNumber||m.id}</span>
              <span>${new Date(m.paymentDate).toLocaleDateString()}</span>
            </div>

            <div class="section-title">Student Details</div>
            <div class="info-group">
              <div class="info-label">Student Name</div>
              <div class="info-value">${((r=(s=m.student)==null?void 0:s.user)==null?void 0:r.firstName)||"Unknown"} ${((l=(i=m.student)==null?void 0:i.user)==null?void 0:l.lastName)||""}</div>
            </div>
            <div class="info-row">
              <div class="info-group">
                <div class="info-label">Student ID</div>
                <div class="info-value">${m.student.admissionNumber}</div>
              </div>
              <div class="info-group">
                <div class="info-label">Class</div>
                <div class="info-value">${((u=m.student.classModel)==null?void 0:u.name)||""} ${((c=m.student.classModel)==null?void 0:c.arm)||""}</div>
              </div>
            </div>

            <div class="section-title" style="margin-top: 1mm;">Payment Info</div>
            <div class="info-group" style="margin-bottom: 1mm;">
              <div class="info-label">Fee Title</div>
              <div class="info-value">${m.fee.title}</div>
            </div>
            <div class="info-row">
              <div class="info-group">
                <div class="info-label">Method</div>
                <div class="info-value" style="text-transform: uppercase;">${m.paymentMethod}</div>
              </div>
              <div class="info-group">
                <div class="info-label">Recorded By</div>
                <div class="info-value">STAFF</div>
              </div>
            </div>

            <div class="amount-section">
              <div class="amount-label">Verified Payment</div>
              <div class="amount-value">₦${m.amount.toLocaleString()}</div>
            </div>

            <div style="text-align: center; margin-top: 1mm;">
              <img src="${C}" alt="Barcode" style="max-width: 40mm; height: auto;" />
            </div>

            <div class="signatures">
              <div class="sig-box">
                <div class="sig-line"></div>
                <div class="sig-label">Authorized Signature</div>
              </div>
            </div>

            <div class="security-footer">
              <div class="security-hash-box">${v}</div>
              <div style="font-size: 6px; color: #94a3b8; font-weight: 700;">
                SECURE PRINT • ${new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}
              </div>
            </div>

            <div class="digital-seal">
              <svg width="100%" height="100%" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="55" fill="none" stroke="${g}" stroke-width="2" stroke-dasharray="3,2" />
                <path id="sealPath" d="M 60,60 m -40,0 a 40,40 0 1,1 80,0 a 40,40 0 1,1 -80,0" fill="none"/>
                <text font-size="8" font-weight="800" fill="${g}">
                  <textPath href="#sealPath">AUTHENTIC RECEIPT • ${((d=y.schoolName)==null?void 0:d.split(" ")[0])||"SMS"} • </textPath>
                </text>
                <text x="60" y="65" text-anchor="middle" font-size="14" font-weight="900" fill="${g}">VALID</text>
              </svg>
            </div>
          </div>
        </div>

        <div class="no-print" style="margin-top: 10px; display: flex; gap: 8px; justify-content: center;">
          <button onclick="window.print()" style="padding: 6px 12px; background: ${g}; color: white; border: none; border-radius: 4px; font-weight: 800; font-size: 10px; cursor: pointer; text-transform: uppercase;">Print</button>
          <button onclick="window.close()" style="padding: 6px 12px; background: white; color: #475569; border: 1px solid #e2e8f0; border-radius: 4px; font-weight: 800; font-size: 10px; cursor: pointer; text-transform: uppercase;">Close</button>
        </div>
      </body>
      </html>
    `),$.document.close(),$.onload=()=>{setTimeout(()=>{$.print()},300)},$.document.readyState==="complete"&&setTimeout(()=>{$.print&&$.print()},800)}catch(n){P.error("Error generating receipt: "+n.message)}},es=async t=>{var s,r,i,l,u;if(downloadingMisc)return;setDownloadingMisc(!0);const a=P.loading("Generating PDF Receipt...");try{const c=await L.get(`/api/misc-fees/receipt/${t}`);if(!c.ok){const z=await c.json();throw new Error(z.error||"Failed to fetch receipt data")}const d=await c.json(),n=y.primaryColor||"#0f766e",m=y.logoUrl?y.logoUrl.startsWith("http")?y.logoUrl:`${Te}${y.logoUrl}`:null,g=btoa(`MISC-${d.id}-${d.student.id}`).substring(0,12).toUpperCase(),k=`MISC-${d.id}`,v=`https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(k)}&scale=3&rotate=N&includetext=true&backgroundcolor=ffffff&height=12`,R=`
        <!DOCTYPE html>
        <html>
        <head>
          <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&display=swap" rel="stylesheet">
          <style>
            body { margin: 0; padding: 0; background: white; }
            .receipt-card {
              width: 74mm;
              height: 100mm;
              background: white;
              border: 0.5mm solid #eee;
              display: flex;
              flex-direction: column;
              font-family: 'Outfit', sans-serif;
              overflow: hidden;
            }
            .header { background: ${n}; padding: 3mm 4mm; color: white; display: flex; justify-content: space-between; align-items: center; }
            .school-info h1 { margin: 0; font-size: 10px; text-transform: uppercase; }
            .school-info p { margin: 1mm 0 0; font-size: 7px; opacity: 0.9; }
            .badge { background: white; color: ${n}; padding: 1mm 2mm; border-radius: 1mm; font-size: 8px; font-weight: 800; }
            .body { padding: 4mm; flex: 1; display: flex; flex-direction: column; }
            .id-line { display: flex; justify-content: space-between; font-size: 8px; font-weight: 700; color: #64748b; margin-bottom: 3mm; }
            .section-title { font-size: 8px; font-weight: 800; color: ${n}; text-transform: uppercase; margin-bottom: 2mm; border-bottom: 0.2mm solid ${n}20; }
            .info-group { margin-bottom: 2mm; }
            .info-label { font-size: 7px; color: #94a3b8; text-transform: uppercase; font-weight: 800; }
            .info-value { font-size: 9px; font-weight: 700; color: #0f172a; }
            .amount-section { background: #f8fafc; border-radius: 2mm; padding: 3mm; text-align: center; border: 0.5mm dashed #e2e8f0; margin: 3mm 0; }
            .amount-val { font-size: 18px; font-weight: 800; color: ${n}; }
            .barcode { max-width: 40mm; height: auto; margin: 2mm auto; display: block; }
            .sig-line { border-top: 0.3mm solid #cbd5e1; margin: 4mm auto 1mm; width: 30mm; }
            .sig-label { font-size: 7px; color: #94a3b8; text-align: center; text-transform: uppercase; font-weight: 700; }
            .footer { margin-top: auto; display: flex; justify-content: space-between; align-items: center; padding-top: 2mm; border-top: 0.2mm solid #f1f5f9; }
            .hash { font-size: 7px; color: #64748b; background: #f1f5f9; padding: 0.5mm 1mm; }
          </style>
        </head>
        <body>
          <div id="misc-receipt-capture" class="receipt-card">
            <div class="header">
              <div class="school-info">
                <h1>${y.schoolName||"SMS"}</h1>
                <p>${((s=y.schoolAddress)==null?void 0:s.substring(0,30))||""}</p>
              </div>
              <div class="badge">MISC</div>
            </div>
            <div class="body">
              <div class="id-line">
                <span>NO: ${d.receiptNumber||d.id}</span>
                <span>${new Date(d.paymentDate).toLocaleDateString()}</span>
              </div>
              <div class="section-title">Student</div>
              <div class="info-group">
                <div class="info-label">Name</div>
                <div class="info-value">${((i=(r=d.student)==null?void 0:r.user)==null?void 0:i.firstName)||""} ${((u=(l=d.student)==null?void 0:l.user)==null?void 0:u.lastName)||""}</div>
              </div>
              <div class="section-title">Payment</div>
              <div class="info-group">
                <div class="info-label">Fee Title</div>
                <div class="info-value">${d.fee.title}</div>
              </div>
              <div class="amount-section">
                <div class="amount-val">₦${d.amount.toLocaleString()}</div>
              </div>
              <img src="${v}" class="barcode" />
              <div class="sig-line"></div>
              <div class="sig-label">Authorized Signature</div>
              <div class="footer">
                <div class="hash">${g}</div>
                <div style="font-size: 6px; color: #94a3b8;">${new Date().toLocaleTimeString()}</div>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,C=document.createElement("iframe");C.style.position="fixed",C.style.visibility="hidden",document.body.appendChild(C);const $=C.contentWindow.document;$.open(),$.write(R),$.close(),await new Promise(z=>setTimeout(z,1500));const S=$.getElementById("misc-receipt-capture"),Z=(await Nt(S,{scale:3,useCORS:!0})).toDataURL("image/png"),K=new kt({orientation:"p",unit:"mm",format:[74,100]});K.addImage(Z,"PNG",0,0,74,100),jt(K,`MiscReceipt-${d.receiptNumber||d.id}.pdf`),document.body.removeChild(C),P.success("Receipt downloaded successfully",{id:a})}catch(c){console.error("PDF Generation failed:",c),P.error("Failed to generate PDF receipt",{id:a})}finally{setDownloadingMisc(!1)}},ts=async()=>{try{const[t,a,s]=await Promise.all([L.get("/api/terms"),L.get("/api/academic-sessions"),L.get("/api/classes")]),r=await t.json(),i=await a.json(),l=await s.json(),u=Array.isArray(r)?r:[],c=Array.isArray(i)?i:[],d=Array.isArray(l)?l:[],n=u.find(g=>g.isCurrent)||u[0]||null,m=c.find(g=>g.isCurrent)||c[0]||null;Je(n),dt(m),Oe(u),Ct(c),La(d),n&&Ot(n.id),m&&Ut(m.id),Oe(u),Ct(c),_e(n),Qe(m),lt(n),Ge(m),n&&m&&(await ae(n.id,m.id),await de(n.id,m.id))}catch(t){console.error("Error fetching data:",t),alert("Failed to load data")}finally{_(!1)}},ve=async(t,a,s=!1,r=!1)=>{if(_a(s),Qa(r),r)Ge(null),lt(null),await Ye();else if(s){const i=q.find(l=>l.id===a);Ge(i),lt(null),await oe(a)}else{const i=W.find(u=>u.id===t),l=q.find(u=>u.id===a);lt(i),Ge(l),await ae(t,a),await de(t,a)}},Ye=async()=>{try{_(!0);let t=[];for(const c of q){const d=W.filter(n=>n.academicSessionId===c.id);for(const n of d){const m=await L.get(`/api/fees/students?termId=${n.id}&academicSessionId=${c.id}&ignoreJoinDate=${!N}`);if(!m.ok)continue;const g=await m.json();Array.isArray(g)&&(g.forEach(k=>{k.feeRecords&&k.feeRecords.length>0&&k.feeRecords.forEach(v=>{v.termName=n.name,v.sessionName=c.name})}),t=[...t,...g])}}const a=new Map;t.forEach(c=>{a.has(c.id)||a.set(c.id,{...c,feeRecords:[]});const d=a.get(c.id);c.feeRecords&&c.feeRecords.length>0&&d.feeRecords.push(...c.feeRecords)});const s=Array.from(a.values()).map(c=>{const d=c.feeRecords.reduce((n,m)=>({expectedAmount:n.expectedAmount+m.expectedAmount,paidAmount:n.paidAmount+m.paidAmount,balance:n.balance+m.balance,isClearedForExam:m.isClearedForExam}),{expectedAmount:0,paidAmount:0,balance:0,isClearedForExam:!0});return{...c,feeRecords:[d,...c.feeRecords]}});f(s),vt(s);const r=s.reduce((c,d)=>{var n;return c+(((n=d.feeRecords[0])==null?void 0:n.expectedAmount)||0)},0),i=s.reduce((c,d)=>{var n;return c+(((n=d.feeRecords[0])==null?void 0:n.paidAmount)||0)},0),l=s.reduce((c,d)=>{var n;return c+(((n=d.feeRecords[0])==null?void 0:n.balance)||0)},0),u=s.filter(c=>{var d;return(d=c.feeRecords[0])==null?void 0:d.isClearedForExam}).length;me({totalStudents:s.length,totalExpected:r,totalPaid:i,totalBalance:l,clearedStudents:u,restrictedStudents:s.length-u})}catch(t){console.error("Error loading all sessions data:",t),alert("Failed to load cumulative session data")}finally{_(!1)}},oe=async t=>{try{_(!0);const a=W.filter(n=>n.academicSessionId===t);let s=[];for(const n of a){const m=await L.get(`/api/fees/students?termId=${n.id}&academicSessionId=${t}&ignoreJoinDate=${!N}`);if(!m.ok){console.error(`Failed to load students for term ${n.name}`);continue}const g=await m.json();Array.isArray(g)&&(g.forEach(k=>{k.feeRecords&&k.feeRecords.length>0&&k.feeRecords.forEach(v=>{v.termName=n.name})}),s=[...s,...g])}const r=new Map;s.forEach(n=>{r.has(n.id)||r.set(n.id,{...n,feeRecords:[]});const m=r.get(n.id);n.feeRecords&&n.feeRecords.length>0&&m.feeRecords.push(...n.feeRecords)});const i=Array.from(r.values()).map(n=>{const m=[...n.feeRecords].sort((k,v)=>{const R=W.find($=>$.id===k.termId),C=W.find($=>$.id===v.termId);return((R==null?void 0:R.startDate)||"").localeCompare((C==null?void 0:C.startDate)||"")}),g=m.reduce((k,v,R)=>{const C=R===m.length-1;return{expectedAmount:k.expectedAmount+v.expectedAmount,paidAmount:k.paidAmount+v.paidAmount,balance:C?v.balance:k.balance,isClearedForExam:C?v.isClearedForExam:k.isClearedForExam}},{expectedAmount:0,paidAmount:0,balance:0,isClearedForExam:!0});return{...n,feeRecords:[g,...n.feeRecords]}});f(i),vt(i);const l=i.reduce((n,m)=>{var g;return n+(((g=m.feeRecords[0])==null?void 0:g.expectedAmount)||0)},0),u=i.reduce((n,m)=>{var g;return n+(((g=m.feeRecords[0])==null?void 0:g.paidAmount)||0)},0),c=i.reduce((n,m)=>{var g;return n+(((g=m.feeRecords[0])==null?void 0:g.balance)||0)},0),d=i.filter(n=>{var m;return(m=n.feeRecords[0])==null?void 0:m.isClearedForExam}).length;me({totalStudents:i.length,totalExpected:l,totalPaid:u,totalBalance:c,clearedStudents:d,restrictedStudents:i.length-d})}catch(a){console.error("Error loading all terms data:",a),alert("Failed to load cumulative data")}finally{_(!1)}},ae=async(t,a)=>{try{const s=await L.get(`/api/fees/students?termId=${t}&academicSessionId=${a}&ignoreJoinDate=${!N}`);if(!s.ok){const i=await s.json();console.error("Error loading students:",i),f([]);return}const r=await s.json();Array.isArray(r)?(f(r),vt(r)):(console.error("Expected array but got:",typeof r),f([]))}catch(s){console.error("Error loading students:",s),f([])}},vt=t=>{const a={};t.forEach(s=>{const r=s.classId||"historical",i=s.classId?s.classModel?`${s.classModel.name}${s.classModel.arm||""}`:"Unknown Class":"Historical/Alumni (No Current Class)";a[r]||(a[r]={classId:r,className:i,totalStudents:0,totalExpected:0,totalPaid:0,totalBalance:0,clearedStudents:0,unclearedStudents:0});const l=s.feeRecords[0];a[r].totalStudents++,a[r].totalExpected+=(l==null?void 0:l.expectedAmount)||0,a[r].totalPaid+=(l==null?void 0:l.paidAmount)||0,a[r].totalArrears=(a[r].totalArrears||0)+((l==null?void 0:l.openingBalance)||0),a[r].totalBalance+=(l==null?void 0:l.balance)||0,l!=null&&l.isClearedForExam?a[r].clearedStudents++:a[r].unclearedStudents++}),Da(a)},de=async(t,a)=>{try{const s=await L.get(`/api/fees/summary?termId=${t}&academicSessionId=${a}&ignoreJoinDate=${!N}`);if(!s.ok){console.error("Error loading summary: API returned error"),me(null);return}const r=await s.json();r&&typeof r=="object"&&"totalStudents"in r?me(r):(console.error("Invalid summary data received"),me(null))}catch(s){console.error("Error loading summary:",s),me(null)}},as=async t=>{try{ct(!0);const a=(h==null?void 0:h.id)||w.id,s=(o==null?void 0:o.id)||j.id,r=await L.get(`/api/fees/student/${t}/summary?termId=${a}&academicSessionId=${s}`);if(r.ok){const i=await r.json();je(i)}}catch(a){console.error("Error fetching student summary:",a)}finally{ct(!1)}};p.useEffect(()=>{H?(_e(h||w),Qe(o||j),as(H.id)):je(null)},[H]);const ss=async t=>{var r,i;if(!Y||parseFloat(Y)<=0){alert("Please enter a valid payment amount");return}if((i=(r=M==null?void 0:M.outstandingTerms)==null?void 0:r.find(l=>l.termId===((A==null?void 0:A.id)||(w==null?void 0:w.id))))!=null&&i.balance,!M){alert("Student financial summary is still loading. Please wait a moment...");return}const a=(M==null?void 0:M.grandTotal)||0,s=parseFloat(Y);if(a>0&&s>a){alert(`⛔ FEE CEILING ERROR

This payment (₦${x(s)}) exceeds the student's total outstanding balance (₦${x(a)}).

The system is configured to prevent overpayments. Please reduce the amount.`);return}else if(a<=0){alert(`⛔ FEE CEILING ERROR

This student has no outstanding balance (current balance: ₦${x(a)}).

You cannot record a payment on a cleared account.`);return}try{Se(!0);const l=await L.post("/api/fees/payment",{studentId:t,termId:(A==null?void 0:A.id)||w.id,academicSessionId:(ge==null?void 0:ge.id)||j.id,amount:parseFloat(Y),paymentMethod:pe,reference:Q,notes:he}),u=await l.json();if(!l.ok)throw new Error(u.error||"Failed to record payment");alert("Payment recorded successfully"),confirm("Would you like to print a receipt?")&&(Re(u.payment),Fe(H),Ee(!0)),xe(""),re("cash"),ie(""),le(""),te(null);const c=(h==null?void 0:h.id)||w.id,d=(o==null?void 0:o.id)||j.id;D?await oe(d):(await ae(c,d),await de(c,d))}catch(l){console.error("Error recording payment:",l),alert(l.message||"Failed to record payment")}finally{Se(!1)}},rs=async()=>{var r;if(!Xe||!Y||parseFloat(Y)<=0){alert("Please enter a valid payment amount");return}const t=parseFloat(Y),a=Xe.amount||0,s=(r=V==null?void 0:V.feeRecords)==null?void 0:r[0];if(s){const l=(s.balance||0)+a-t;if(l<0){alert(`⛔ FEE CEILING ERROR

Changing this payment to ₦${x(t)} would cause an overpayment (Credit: ₦${x(Math.abs(l))}).

Action blocked by System Policy.`);return}}try{Se(!0);const i=await L.put(`/api/fees/payment/${Xe.id}`,{amount:parseFloat(Y),paymentMethod:pe,reference:Q,notes:he}),l=await i.json();if(!i.ok)throw new Error(l.error||"Failed to update payment");alert("Payment updated successfully"),await qe(V);const u=(h==null?void 0:h.id)||w.id,c=(o==null?void 0:o.id)||j.id;D?await oe(c):(await ae(u,c),await de(u,c)),mt(null),xe(""),re("cash"),ie(""),le("")}catch(i){console.error("Error updating payment:",i),alert(i.message||"Failed to update payment")}finally{Se(!1)}},is=async t=>{if(confirm("⚠️ Are you sure you want to PERMANENTLY DELETE this payment? This will increase the student's balance and update their arrears. This action cannot be undone."))try{Se(!0);const a=await L.delete(`/api/fees/payment/${t}`),s=await a.json();if(!a.ok)throw new Error(s.error||"Failed to delete payment");P.success("Payment deleted successfully"),await qe(V);const r=(h==null?void 0:h.id)||(w==null?void 0:w.id),i=(o==null?void 0:o.id)||(j==null?void 0:j.id);D?await oe(i):(await ae(r,i),await de(r,i))}catch(a){console.error("Error deleting payment:",a),P.error(a.message||"Failed to delete payment")}finally{Se(!1)}},ls=async t=>{if(!(!confirm(`⚠️ EXTREME WARNING: You are about to RESET this student's entire ledger. This will PERMANENTLY DELETE all payment history and fee records for this student. This action cannot be undone.

Type "RESET" to confirm.`)||prompt("Please type RESET to confirm permanent deletion:")!=="RESET"))try{if(!(await L.delete(`/api/fees/student/${t}/reset`)).ok)throw new Error("Reset failed");alert("Student ledger has been completely wiped."),Ue(null),X?await Ye():D?await oe((o==null?void 0:o.id)||j.id):(await ae((h==null?void 0:h.id)||w.id,(o==null?void 0:o.id)||j.id),await de((h==null?void 0:h.id)||w.id,(o==null?void 0:o.id)||j.id))}catch(s){alert("Error: "+s.message)}},Yt=async t=>{const a=t==="allow",s=a?"Allow":"Restrict";if(confirm(`${s} ${be.length} selected student(s) for examination?`))try{_(!0);let r=0,i=0;for(const c of be)try{const d=a?"/api/fees/clear/":"/api/fees/revoke-clearance/",n=(h==null?void 0:h.id)||w.id,m=(o==null?void 0:o.id)||j.id;await L.post(`${d}${c}`,{termId:n,academicSessionId:m}),r++}catch{i++}alert(`${s}ed ${r} student(s). Failed: ${i}`),Ve([]);const l=(h==null?void 0:h.id)||w.id,u=(o==null?void 0:o.id)||j.id;await ae(l,u),await de(l,u)}catch(r){console.error("Error in bulk clearance:",r),alert("Failed to process bulk action")}finally{_(!1)}},qe=async t=>{try{if(!t)return;const a=(h==null?void 0:h.id)||"all",s=(o==null?void 0:o.id)||(j==null?void 0:j.id);if(!s){console.warn("Cannot fetch payment history: No academic session identified.");return}const r=await L.get(`/api/fees/payments/${t.id}?termId=${a}&academicSessionId=${s}`),i=await r.json();r.ok&&Array.isArray(i)?(pt(i),Pt(t),et(!0)):(console.error("Invalid payment history data:",i),pt([]),Pt(t),et(!0),P.error(i.error||"No payment records found or failed to load."))}catch(a){console.error("Error fetching payment history:",a),P.error("Failed to load payment history"),pt([])}},ns=t=>{mt(t),xe(t.amount.toString()),re(t.paymentMethod||"cash"),ie(t.reference||""),le(t.notes||"")},os=async()=>{if(confirm(`Are you sure you want to send fee payment reminders to all students with outstanding balances for ${w==null?void 0:w.name}?`))try{_(!0);const t=await L.post("/api/fees/bulk-reminder",{termId:w==null?void 0:w.id,academicSessionId:j==null?void 0:j.id,classId:J||void 0}),a=await t.json();t.ok?alert(a.message||"Reminders are being sent!"):alert(a.error||"Failed to send reminders")}catch(t){console.error("Error sending reminders:",t),alert("Failed to send reminders")}finally{_(!1)}},qt=async()=>{const t=h||w,a=o||j;if(!t||!a){alert("Please select a specific term and session to sync, or ensure there is an active term and session.");return}if(confirm(`This will automatically generate missing fee records for all active students for ${t.name} (${a.name}). Standard fees will be applied to non-scholarship students. Proceed?`))try{_(!0);const s=await L.post("/api/fees/sync-records",{termId:t.id,academicSessionId:a.id,ignoreJoinDate:!N}),r=await s.json();s.ok?(alert(r.message),X?await Ye():D?await oe(a.id):(await ae(t.id,a.id),await de(t.id,a.id))):alert(r.error||"Sync failed")}catch(s){console.error("Sync error:",s),alert("Failed to sync records")}finally{_(!1)}},Jt=async(t="cumulative",a=null)=>{let s=Array.isArray(ce)?ce:[];if(a==="scholarship"?(s=(Array.isArray(U)?U:[]).filter(O=>O.isScholarship),t="class"):a&&a!=="all"&&(s=(Array.isArray(U)?U:[]).filter(O=>O.classId===parseInt(a)),t="class"),s.length===0){P.error("No students to export");return}const r=(y==null?void 0:y.schoolName)||"School Name",i=(y==null?void 0:y.schoolAddress)||"",l=(h==null?void 0:h.name)||(w==null?void 0:w.name)||"",u=(o==null?void 0:o.name)||(j==null?void 0:j.name)||"",c=new Ra.Workbook,d=c.addWorksheet("Fee Records");d.mergeCells("A1:H1");const n=d.getCell("A1");n.value=r.toUpperCase(),n.font={name:"Arial",size:16,bold:!0},n.alignment={vertical:"middle",horizontal:"center"},d.mergeCells("A2:H2");const m=d.getCell("A2");m.value=i,m.font={name:"Arial",size:11,bold:!1},m.alignment={vertical:"middle",horizontal:"center"},d.mergeCells("A3:H3");const g=d.getCell("A3");g.value=`FEE REPORT - Term: ${l} | Session: ${u}`,g.font={name:"Arial",size:12,bold:!0},g.alignment={vertical:"middle",horizontal:"center"},d.mergeCells("A4:H4");const k=d.getCell("A4");k.value=`Generated on: ${new Date().toLocaleString()}`,k.font={name:"Arial",size:10,italic:!0},k.alignment={vertical:"middle",horizontal:"center"},d.addRow([]);const v=["S/N","Admission Number","Student Name","Class","Previous Balance","Current Expected","Paid","Total Balance"],R=()=>({top:{style:"thin"},left:{style:"thin"},bottom:{style:"thin"},right:{style:"thin"}}),C=(S,O=!1,Z=!1,K=!1)=>{const z=d.addRow(S);return z.eachCell((F,B)=>{F.border=R(),O?(F.font={bold:!0,color:{argb:"FFFFFFFF"}},F.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF1E40AF"}},F.alignment={horizontal:"center",vertical:"middle"}):K?(F.font={bold:!0,size:12},F.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFFCD34D"}}):Z&&(F.font={bold:!0},F.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFF3F4F6"}}),B>=5&&!O&&F.value!=="scholarship"&&typeof F.value=="number"&&(F.numFmt="#,##0.00",!Z&&!K&&(F.alignment={horizontal:"right"}))}),z};if(t==="class"){const S={};s.forEach(F=>{const B=F.classModel?`${F.classModel.name}${F.classModel.arm||""}`:"Unassigned";S[B]||(S[B]=[]),S[B].push(F)});let O=0,Z=0,K=0,z=0;Object.keys(S).sort().forEach(F=>{const B=S[F];d.addRow([]);const nt=d.addRow([`CLASS: ${F}`]);nt.font={bold:!0,size:12,color:{argb:"FF4338CA"}},C(v,!0);let ze=0,Le=0,De=0,Be=0;B.forEach((se,ot)=>{var $a,Aa,Sa;const ee=($a=se.feeRecords)==null?void 0:$a[0],ja=(ee==null?void 0:ee.openingBalance)||0,Na=(ee==null?void 0:ee.expectedAmount)||0,ka=(ee==null?void 0:ee.paidAmount)||0,Ca=(ee==null?void 0:ee.balance)||0;ze+=ja,Le+=Na,De+=ka,Be+=Ca,C([ot+1,se.admissionNumber||"N/A",`${((Aa=se.user)==null?void 0:Aa.firstName)||""} ${((Sa=se.user)==null?void 0:Sa.lastName)||""}`,F,se.isScholarship?"scholarship":ja,se.isScholarship?"scholarship":Na,se.isScholarship?"scholarship":ka,se.isScholarship?"scholarship":Ca])}),C(["","","",`${F} SUBTOTAL:`,ze,Le,De,Be],!1,!0),O+=ze,Z+=Le,K+=De,z+=Be}),d.addRow([]),C(["","","","GRAND TOTAL:",O,Z,K,z],!1,!1,!0)}else{C(v,!0);let S=0,O=0,Z=0,K=0;s.forEach((z,F)=>{var Be,se,ot;const B=(Be=z.feeRecords)==null?void 0:Be[0],nt=(B==null?void 0:B.openingBalance)||0,ze=(B==null?void 0:B.expectedAmount)||0,Le=(B==null?void 0:B.paidAmount)||0,De=(B==null?void 0:B.balance)||0;S+=nt,O+=ze,Z+=Le,K+=De,C([F+1,z.admissionNumber||"N/A",`${((se=z.user)==null?void 0:se.firstName)||""} ${((ot=z.user)==null?void 0:ot.lastName)||""}`,z.classModel?`${z.classModel.name}${z.classModel.arm||""}`:"N/A",z.isScholarship?"scholarship":nt,z.isScholarship?"scholarship":ze,z.isScholarship?"scholarship":Le,z.isScholarship?"scholarship":De])}),d.addRow([]),C(["","","","TOTAL:",S,O,Z,K],!1,!1,!0)}d.columns=[{width:5},{width:22},{width:35},{width:15},{width:18},{width:18},{width:18},{width:18}];const $=await c.xlsx.writeBuffer();Ea.saveAs(new Blob([$]),`fee-records-${t==="class"?"by-class":"cumulative"}-${l}-${u}.xlsx`)},ds=async()=>{var g,k;if(!Ne.length){P.error("No analytics data to export");return}const t=(y==null?void 0:y.schoolName)||"School Name",a=((g=W.find(v=>v.id===parseInt(ke)))==null?void 0:g.name)||"All Terms",s=((k=q.find(v=>v.id===parseInt(Ce)))==null?void 0:k.name)||"All Sessions",r=new Ra.Workbook,i=r.addWorksheet("Miscellaneous Fees Report");i.mergeCells("A1:F1");const l=i.getCell("A1");l.value=t.toUpperCase(),l.font={name:"Arial",size:16,bold:!0},l.alignment={vertical:"middle",horizontal:"center"},i.mergeCells("A2:F2");const u=i.getCell("A2");u.value=`MISCELLANEOUS FEES REPORT - Term: ${a} | Session: ${s}`,u.font={name:"Arial",size:12,bold:!0},u.alignment={vertical:"middle",horizontal:"center"},i.mergeCells("A3:F3");const c=i.getCell("A3");c.value=`Generated on: ${new Date().toLocaleString()}`,c.font={name:"Arial",size:10,italic:!0},c.alignment={vertical:"middle",horizontal:"center"},i.addRow([]);const d=()=>({top:{style:"thin"},left:{style:"thin"},bottom:{style:"thin"},right:{style:"thin"}}),n=(v,R=!1,C=!1)=>{const $=i.addRow(v);return $.eachCell((S,O)=>{S.border=d(),R?(S.font={bold:!0,color:{argb:"FFFFFFFF"}},S.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF1E40AF"}},S.alignment={horizontal:"center",vertical:"middle"}):C&&(S.font={bold:!0,size:11},S.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFFCD34D"}}),!R&&(O===4||O===5)&&typeof S.value=="number"&&(S.numFmt="#,##0.00")}),$};Ne.forEach(v=>{i.addRow([]);const R=i.addRow([`FEE: ${v.title.toUpperCase()} (₦${x(v.amount)})`]);R.font={bold:!0,size:12,color:{argb:"FF4338CA"}},n(["Class","Student Name","Admission No","Paid","Balance","Status"],!0),v.classes.forEach(C=>{C.students.forEach($=>{const S=$.balance===0?"Fully Paid":$.totalPaid>0?"Partially Paid":"Pending";n([`${C.name}${C.arm||""}`,$.name,$.admissionNumber,$.totalPaid,$.balance,S])})}),n(["","","SUBTOTALS:",v.totalReceived,v.outstanding,""],!1,!0)}),i.columns=[{width:15},{width:35},{width:22},{width:18},{width:18},{width:18}];const m=await r.xlsx.writeBuffer();Ea.saveAs(new Blob([m]),`miscellaneous-fees-report-${s}-${a}.xlsx`)},cs=t=>{const a=window.open("","_blank"),s=(y==null?void 0:y.primaryColor)||"#0f766e",r=(y==null?void 0:y.schoolName)||"School";a.document.write(`
      <html>
        <head>
          <title>${t.title} - Status Report</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; }
            .header { text-align: center; border-bottom: 2px solid ${s}; padding-bottom: 20px; margin-bottom: 30px; }
            .school-name { font-size: 24px; font-weight: 900; color: ${s}; margin: 0; }
            .report-title { font-size: 18px; font-weight: 700; margin: 10px 0; text-transform: uppercase; }
            .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
            .stat-card { padding: 15px; border-radius: 8px; background: #f8fafc; border: 1px solid #e2e8f0; }
            .stat-label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; }
            .stat-value { font-size: 16px; font-weight: 900; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { text-align: left; padding: 12px; background: #f1f5f9; font-size: 11px; text-transform: uppercase; border: 1px solid #e2e8f0; }
            td { padding: 10px; font-size: 12px; border: 1px solid #e2e8f0; }
            .class-header { background: #f8fafc; font-weight: 700; }
            .status-paid { color: #059669; font-weight: 700; }
            .status-pending { color: #dc2626; font-weight: 700; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="school-name">${r}</h1>
            <div class="report-title">Miscellaneous Fee Status: ${t.title}</div>
            <div style="font-size: 12px; color: #64748b;">Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</div>
          </div>

          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-label">Total Expected</div>
              <div class="stat-value">₦${x(t.totalExpected||0)}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Total Collected</div>
              <div class="stat-value" style="color: #059669;">₦${x(t.totalReceived||0)}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Total Outstanding</div>
              <div class="stat-value" style="color: #dc2626;">₦${x(t.outstanding||0)}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Student Details</th>
                <th>Class</th>
                <th>Admission No</th>
                <th>Amount Paid</th>
                <th>Balance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${(Array.isArray(t.classes)?t.classes:[]).map(i=>`
                <tr class="class-header">
                  <td colspan="6">${i.name} ${i.arm||""} (${i.students.length} students)</td>
                </tr>
                ${(Array.isArray(i.students)?i.students:[]).map(l=>`
                  <tr>
                    <td>${l.name}</td>
                    <td>${i.name}</td>
                    <td>${l.admissionNumber}</td>
                    <td>₦${x(l.totalPaid)}</td>
                    <td>₦${x(l.balance)}</td>
                    <td class="${l.balance===0?"status-paid":"status-pending"}">
                      ${l.balance===0?"FULLY PAID":l.totalPaid>0?"PARTIAL":"PENDING"}
                    </td>
                  </tr>
                `).join("")}
              `).join("")}
            </tbody>
          </table>
          <script>window.print();<\/script>
        </body>
      </html>
    `),a.document.close()},[wt,_t]=p.useState(!1),ms=async t=>{if(wt)return;_t(!0);const a=P.loading("Generating Detailed Report PDF...");try{const s=(y==null?void 0:y.primaryColor)||"#0f766e",r=(y==null?void 0:y.schoolName)||"School",i=`
        <!DOCTYPE html>
        <html>
        <head>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Inter', sans-serif; padding: 20px; color: #1e293b; background: white; }
            .report-container { width: 210mm; background: white; }
            .header { text-align: center; border-bottom: 2px solid ${s}; padding-bottom: 20px; margin-bottom: 30px; }
            .school-name { font-size: 24px; font-weight: 900; color: ${s}; margin: 0; }
            .report-title { font-size: 18px; font-weight: 700; margin: 10px 0; text-transform: uppercase; }
            .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
            .stat-card { padding: 15px; border-radius: 8px; background: #f8fafc; border: 1px solid #e2e8f0; }
            .stat-label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; }
            .stat-value { font-size: 16px; font-weight: 900; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { text-align: left; padding: 12px; background: #f1f5f9; font-size: 11px; text-transform: uppercase; border: 1px solid #e2e8f0; }
            td { padding: 10px; font-size: 10px; border: 1px solid #e2e8f0; }
            .class-header { background: #f8fafc; font-weight: 700; }
            .status-paid { color: #059669; font-weight: 700; }
            .status-pending { color: #dc2626; font-weight: 700; }
          </style>
        </head>
        <body>
          <div id="detailed-report-capture" class="report-container">
            <div class="header">
              <h1 class="school-name">${r}</h1>
              <div class="report-title">Miscellaneous Fee Status: ${t.title}</div>
              <div style="font-size: 10px; color: #64748b;">Generated on ${new Date().toLocaleDateString()}</div>
            </div>
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-label">Total Expected</div>
                <div class="stat-value">₦${x(t.totalExpected||0)}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Total Collected</div>
                <div class="stat-value" style="color: #059669;">₦${x(t.totalReceived||0)}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Total Outstanding</div>
                <div class="stat-value" style="color: #dc2626;">₦${x(t.outstanding||0)}</div>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Class</th>
                  <th>Admission No</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${(Array.isArray(t.classes)?t.classes:[]).map(v=>`
                  <tr class="class-header">
                    <td colspan="6">${v.name} ${v.arm||""}</td>
                  </tr>
                  ${(Array.isArray(v.students)?v.students:[]).map(R=>`
                    <tr>
                      <td>${R.name}</td>
                      <td>${v.name}</td>
                      <td>${R.admissionNumber}</td>
                      <td>₦${x(R.totalPaid)}</td>
                      <td>₦${x(R.balance)}</td>
                      <td class="${R.balance===0?"status-paid":"status-pending"}">
                        ${R.balance===0?"FULLY PAID":R.totalPaid>0?"PARTIAL":"PENDING"}
                      </td>
                    </tr>
                  `).join("")}
                `).join("")}
              </tbody>
            </table>
          </div>
        </body>
        </html>
      `,l=document.createElement("iframe");l.style.position="fixed",l.style.visibility="hidden",document.body.appendChild(l);const u=l.contentWindow.document;u.open(),u.write(i),u.close(),await new Promise(v=>setTimeout(v,2e3));const c=u.getElementById("detailed-report-capture"),d=await Nt(c,{scale:2,useCORS:!0}),n=d.toDataURL("image/png"),m=new kt({orientation:"p",unit:"mm",format:"a4"}),g=210,k=d.height*g/d.width;m.addImage(n,"PNG",0,0,g,k),jt(m,`DetailedReport-${t.title}-${new Date().getTime()}.pdf`),document.body.removeChild(l),P.success("Report downloaded successfully",{id:a})}catch(s){console.error("PDF Generation failed:",s),P.error("Failed to generate report PDF",{id:a})}finally{_t(!1)}},xs=(t,a)=>{Re(t),Fe(a),Ee(!0)},ce=(Array.isArray(U)?U:[]).filter(t=>{var n,m,g;const a=(n=t.feeRecords)==null?void 0:n[0],s=`${((m=t.user)==null?void 0:m.firstName)||""} ${((g=t.user)==null?void 0:g.lastName)||""} `.toLowerCase(),r=(t.admissionNumber||"").toLowerCase(),i=It.toLowerCase(),l=s.includes(i)||r.includes(i),u=xt==="all"||t.classId===parseInt(xt),c=J===null||(J==="scholarship"?t.isScholarship:J==="historical"?!t.classId:t.classId===J),d=Ie==="all"||Ie==="cleared"&&(a==null?void 0:a.isClearedForExam)||Ie==="not-cleared"&&!(a!=null&&a.isClearedForExam)||Ie==="owing"&&(a==null?void 0:a.balance)>0||Ie==="paid"&&(a==null?void 0:a.balance)===0;return l&&u&&c&&d}),ps=t=>{Ve(a=>a.includes(t)?a.filter(s=>s!==t):[...a,t])},hs=()=>{be.length===ce.length?Ve([]):Ve(ce.map(t=>t.id))};return fe?e.jsx("div",{className:"flex justify-center items-center h-64",children:e.jsxs("div",{className:"text-center",children:[e.jsx("div",{className:"animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"}),e.jsx("p",{className:"text-gray-600",children:"Loading fee records..."})]})}):e.jsxs("div",{className:"max-w-7xl mx-auto p-6",children:[e.jsxs("div",{className:"flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 p-6 bg-gradient-to-br from-slate-900 to-indigo-950 rounded-[32px] text-white shadow-2xl relative overflow-hidden",children:[e.jsx("div",{className:"absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"}),e.jsxs("div",{className:"relative z-10",children:[e.jsxs("div",{className:"flex items-center gap-3 mb-2",children:[e.jsx("span",{className:"px-2 py-0.5 bg-indigo-500/20 border border-indigo-400/30 rounded text-[10px] font-black uppercase tracking-widest text-indigo-300",children:"Administrative Portal"}),(!(h!=null&&h.isCurrent)||!(o!=null&&o.isCurrent))&&!X&&!D&&e.jsx("span",{className:"px-2 py-0.5 bg-amber-500/20 border border-amber-400/30 rounded text-[10px] font-black uppercase tracking-widest text-amber-300 animate-pulse",children:"Historical Records"})]}),e.jsx("h1",{className:"text-3xl md:text-4xl font-black tracking-tighter italic uppercase leading-none mb-2",children:"Fee Management"}),e.jsxs("p",{className:"text-indigo-200/60 font-bold flex items-center gap-2",children:[e.jsx("span",{className:"w-1.5 h-1.5 rounded-full bg-indigo-400"}),X?"GLOBAL ACADEMIC HISTORY":D?`All Terms of ${o==null?void 0:o.name}`:`${(h==null?void 0:h.name)||(w==null?void 0:w.name)||"Loading..."} - ${(o==null?void 0:o.name)||(j==null?void 0:j.name)||"Session"}`]})]}),e.jsxs("div",{className:"relative z-10 flex flex-wrap gap-4",children:[e.jsxs("div",{className:"p-3 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 text-center min-w-[100px]",children:[e.jsx("span",{className:"text-[9px] font-black text-indigo-300 uppercase tracking-widest block mb-1",children:"School ID"}),e.jsx("span",{className:"text-lg font-black",children:(ue==null?void 0:ue.schoolId)||"N/A"})]}),e.jsxs("div",{className:"p-3 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 text-center min-w-[100px]",children:[e.jsx("span",{className:"text-[9px] font-black text-indigo-300 uppercase tracking-widest block mb-1",children:"Students"}),e.jsx("span",{className:"text-lg font-black",children:U.length})]}),U.length===0&&!fe&&!E&&e.jsxs("button",{onClick:qt,className:"bg-indigo-500 hover:bg-indigo-400 text-white px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2",children:[e.jsx("svg",{className:"w-4 h-4",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:"3",d:"M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"})}),"Sync Records"]})]})]}),e.jsxs("div",{className:"flex border-b border-gray-200 mb-6",children:[e.jsx("button",{onClick:()=>Tt("standard"),className:`px-6 py-3 font-bold text-sm uppercase tracking-widest transition-all ${He==="standard"?"border-b-4 border-primary text-primary":"text-gray-400 hover:text-gray-600"}`,children:"Standard Fees"}),e.jsx("button",{onClick:()=>Tt("misc"),className:`px-6 py-3 font-bold text-sm uppercase tracking-widest transition-all ${He==="misc"?"border-b-4 border-primary text-primary":"text-gray-400 hover:text-gray-600"}`,children:"Other Fees"})]}),He==="standard"?e.jsxs(e.Fragment,{children:[!fe&&q.length>0&&e.jsxs("div",{style:{background:"white",padding:"20px",borderRadius:"8px",marginBottom:"24px",boxShadow:"0 1px 3px rgba(0,0,0,0.1)"},children:[e.jsxs("h3",{className:"text-lg font-bold text-primary mb-4 flex items-center gap-2",children:[e.jsx("svg",{className:"w-5 h-5",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"})}),"View Fee Records"]}),e.jsxs("div",{className:"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end",children:[e.jsxs("div",{children:[e.jsx("label",{style:{display:"block",marginBottom:"5px",fontWeight:"600",fontSize:"14px",color:"#374151"},children:"Academic Session"}),e.jsxs("select",{value:X?"all":(o==null?void 0:o.id)||"",onChange:t=>{if(t.target.value==="all")ve(null,null,!0,!0);else{const a=parseInt(t.target.value),s=q.find(r=>r.id===a);if(Ge(s),D)ve(null,a,!0,!1);else{const r=W.find(i=>i.academicSessionId===a);r&&ve(r.id,a,!1,!1)}}},style:{width:"100%",padding:"10px",border:"1px solid #d1d5db",borderRadius:"6px",fontSize:"14px",backgroundColor:"white",cursor:"pointer"},children:[e.jsx("option",{value:"all",children:"📊 All Sessions (Cumulative)"}),(Array.isArray(q)?q:[]).map(t=>e.jsxs("option",{value:t.id,children:[t.name," ",t.isCurrent?"(Current)":""]},t.id))]})]}),e.jsxs("div",{children:[e.jsx("label",{style:{display:"block",marginBottom:"5px",fontWeight:"600",fontSize:"14px",color:"#374151"},children:"Term"}),e.jsxs("select",{value:D?"all":(h==null?void 0:h.id)||"",onChange:t=>{if(t.target.value==="all")ve(null,o.id,!0,!1);else{const a=parseInt(t.target.value);ve(a,o.id,!1,!1)}},disabled:X,style:{width:"100%",padding:"10px",border:"1px solid #d1d5db",borderRadius:"6px",fontSize:"14px",backgroundColor:"white",cursor:"pointer"},children:[e.jsx("option",{value:"all",children:"📊 All Terms (Cumulative)"}),(Array.isArray(W)?W:[]).filter(t=>t.academicSessionId===(o==null?void 0:o.id)).map(t=>e.jsxs("option",{value:t.id,children:[t.name," ",t.isCurrent?"(Current)":""]},t.id))]})]}),e.jsxs("div",{className:"bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border-2 border-primary flex flex-col justify-center",children:[e.jsx("div",{className:"text-xs text-emerald-600 font-bold uppercase tracking-wider mb-1",children:"Currently Viewing"}),e.jsx("div",{className:"text-primary font-black text-base",children:D?`${o==null?void 0:o.name} - All Terms`:`${o==null?void 0:o.name} - ${h==null?void 0:h.name} `})]}),e.jsx("div",{children:e.jsxs("button",{onClick:()=>{D?ve(null,o.id,!0):ve(h.id,o.id,!1)},className:"bg-primary hover:brightness-90 text-white flex items-center gap-2 px-5 py-2.5 rounded-md font-semibold text-sm transition-all",style:{border:"none",cursor:"pointer"},onMouseOver:t=>t.target.style.filter="brightness(0.9)",onMouseOut:t=>t.target.style.filter="brightness(1)",children:[e.jsx("span",{children:"🔄"}),e.jsx("span",{children:"Refresh"})]})})]}),D&&e.jsxs("div",{style:{marginTop:"15px",padding:"12px",background:"#fffbeb",border:"1px solid #fbbf24",borderRadius:"6px",fontSize:"14px",color:"#92400e"},children:["ℹ️ ",e.jsx("strong",{children:"Cumulative View:"})," Showing combined fee records from all terms in ",o==null?void 0:o.name,". Each student shows total expected, paid, and balance across all terms."]})]}),b&&e.jsxs("div",{className:`grid grid-cols-1 md:grid-cols-2 ${!D&&!X?"lg:grid-cols-4":"lg:grid-cols-3"} gap-5 mb-6`,children:[e.jsxs("div",{className:"bg-gradient-to-br from-primary to-primary/90 text-white p-6 rounded-xl shadow-lg",children:[e.jsx("h3",{className:"text-sm font-black uppercase tracking-widest mb-5 opacity-80",children:"Quick Info"}),e.jsxs("div",{className:"space-y-4",children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx("span",{className:"text-white/80 text-sm font-medium",children:"📊 Total Students"}),e.jsx("span",{className:"font-black text-xl text-white",children:b.totalStudents})]}),e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx("span",{className:"text-white/80 text-sm font-medium",children:"💰 Avg. Payment"}),e.jsxs("span",{className:"font-black text-lg text-white",children:["₦",b.totalStudents>0?x(b.totalPaid/b.totalStudents,{minimumFractionDigits:0,maximumFractionDigits:0}):0]})]}),e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx("span",{className:"text-white/80 text-sm font-medium",children:"✅ Clearance Rate"}),e.jsxs("span",{className:"font-black text-lg text-white",children:[b.totalStudents>0?(b.clearedStudents/b.totalStudents*100).toFixed(1):0,"%"]})]}),e.jsx("div",{className:"pt-3 border-t border-white/20",children:e.jsxs("button",{onClick:()=>Ze(J==="scholarship"?null:"scholarship"),className:`w-full flex items-center justify-between p-2 rounded-lg transition-all ${J==="scholarship"?"bg-white/30 ring-2 ring-white/50":"hover:bg-white/10"}`,children:[e.jsx("span",{className:"text-yellow-200 text-sm font-bold uppercase tracking-tight",children:"🎓 Scholarship Filter"}),e.jsx("span",{className:"font-black text-lg text-white",children:U.filter(t=>t.isScholarship).length})]})})]})]}),e.jsxs("div",{className:"bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg p-6 text-white flex flex-col justify-between overflow-hidden",children:[e.jsx("p",{className:"text-sm font-bold text-emerald-100 uppercase tracking-wider mb-2",children:D?"Total Collected (All Terms)":X?"Total Collected (All Sessions)":`Collected (${(h==null?void 0:h.name)||"This Term"})`}),e.jsxs("p",{className:"text-3xl font-black break-words",children:["₦",x(b.totalPaid)]}),e.jsxs("div",{className:"mt-4 pt-3 border-t border-white/20",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("div",{className:"flex-1 bg-white/20 rounded-full h-2",children:e.jsx("div",{className:"bg-white h-2 rounded-full transition-all",style:{width:`${b.totalExpected>0?Math.min(b.totalPaid/b.totalExpected*100,100):0}%`}})}),e.jsxs("span",{className:"text-sm font-black text-emerald-100",children:[b.totalExpected>0?(b.totalPaid/b.totalExpected*100).toFixed(1):0,"%"]})]}),e.jsx("p",{className:"text-[10px] text-emerald-200 mt-1.5 font-bold uppercase tracking-wider",children:D||X?"Cumulative collection across periods":"Collection for this term only — does not include other terms"})]})]}),!D&&!X&&e.jsxs("div",{className:"bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white flex flex-col justify-between overflow-hidden",children:[e.jsx("p",{className:"text-sm font-bold text-orange-100 uppercase tracking-wider mb-2",children:"Term Outstanding"}),e.jsxs("p",{className:"text-3xl font-black break-words",children:["₦",x(b.totalBalance)]}),e.jsx("div",{className:"mt-4 pt-3 border-t border-white/20",children:e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsxs("span",{className:"text-orange-100 text-xs font-bold uppercase",children:["For ",(h==null?void 0:h.name)||"Current Term"]}),e.jsxs("span",{className:"font-black text-orange-100 text-sm",children:[b.totalExpected>0?(b.totalBalance/b.totalExpected*100).toFixed(1):0,"%"]})]})})]}),e.jsxs("div",{className:"bg-gradient-to-br from-red-600 to-red-700 rounded-xl shadow-lg p-6 text-white flex flex-col justify-between overflow-hidden",children:[e.jsx("p",{className:"text-sm font-bold text-red-100 uppercase tracking-wider mb-2",children:"Total Outstanding"}),e.jsxs("p",{className:"text-3xl font-black break-words",children:["₦",x(b.grandTotalBalance||b.totalBalance)]}),e.jsx("div",{className:"mt-4 pt-3 border-t border-white/20",children:e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx("span",{className:"text-red-100 text-xs font-bold uppercase",children:"All History (Grand Total)"}),e.jsx("div",{className:"flex h-2 w-2 rounded-full bg-white animate-pulse"})]})})]})]}),e.jsxs("div",{ref:I,className:"bg-white rounded-lg shadow p-4 mb-6",children:[e.jsxs("div",{className:"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4",children:[e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-medium text-gray-700 mb-1",children:"Search"}),e.jsx("input",{type:"text",placeholder:"Search by name or admission number...",value:It,onChange:t=>Ma(t.target.value),className:"w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-medium text-gray-700 mb-1",children:"Filter by Class"}),e.jsxs("select",{value:xt,onChange:t=>Pa(t.target.value),className:"w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent",children:[e.jsx("option",{value:"all",children:"All Classes"}),(Array.isArray(Me)?Me:[]).map(t=>e.jsxs("option",{value:t.id,children:[t.name,t.arm||""]},t.id))]})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-medium text-gray-700 mb-1",children:"Filter by Status"}),e.jsxs("select",{value:Ie,onChange:t=>za(t.target.value),className:"w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent",children:[e.jsx("option",{value:"all",children:"All Status"}),e.jsx("option",{value:"cleared",children:"✅ Access Allowed"}),e.jsx("option",{value:"not-cleared",children:"🚫 Restricted"}),e.jsx("option",{value:"owing",children:"💸 Owing"}),e.jsx("option",{value:"paid",children:"💰 Fully Paid"})]})]}),e.jsxs("div",{className:"flex flex-col",children:[e.jsx("label",{className:"block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2",children:e.jsx("span",{children:"🛡️ Enrollment Logic"})}),e.jsxs("div",{onClick:()=>we(!N),className:`relative w-full h-10 rounded-lg cursor-pointer transition-all duration-300 flex items-center px-2 gap-3 border ${N?"bg-indigo-600 border-indigo-600 shadow-sm":"bg-gray-100 border-gray-300"}`,children:[e.jsx("div",{className:`w-6 h-6 rounded-md bg-white transition-all duration-300 shadow-md flex items-center justify-center transform ${N?"translate-x-0":"translate-x-[calc(100%-1.5rem)]"}`,style:{marginLeft:N?"0":"auto"},children:N?"✅":"🔓"}),e.jsx("span",{className:`text-[10px] font-bold uppercase tracking-tight flex-1 ${N?"text-white text-left":"text-gray-600 text-right"}`,children:N?"Strict":"Flexible"}),e.jsxs("div",{className:"group relative",children:[e.jsx("span",{className:`text-[10px] ${N?"text-indigo-200":"text-gray-400"}`,children:"ⓘ"}),e.jsx("div",{className:"absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-[9px] rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-center leading-tight",children:N?"Strict: Only students joined before term end are charged":"Flexible: All active students are charged regardless of join date"})]})]})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-medium text-gray-700 mb-1",children:"View Mode"}),e.jsxs("div",{className:"flex gap-2",children:[e.jsx("button",{onClick:()=>Gt("table"),className:`flex-1 px-3 py-2 rounded-md ${it==="table"?"bg-primary text-white":"bg-gray-200 text-gray-700"}`,children:"Table"}),e.jsx("button",{onClick:()=>Gt("cards"),className:`flex-1 px-3 py-2 rounded-md ${it==="cards"?"bg-primary text-white":"bg-gray-200 text-gray-700"}`,children:"Cards"})]})]})]}),e.jsxs("div",{className:"flex flex-wrap gap-2 sm:gap-3",children:[e.jsxs("div",{className:"flex-1 sm:flex-none relative group min-w-[220px]",children:[e.jsxs("select",{onChange:t=>{t.target.value&&(Jt("class",t.target.value),t.target.value="")},className:"appearance-none w-full pl-4 pr-12 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs sm:text-sm font-bold cursor-pointer outline-none shadow-md transition-all",defaultValue:"",children:[e.jsx("option",{value:"",disabled:!0,children:"📥 Export By Class..."}),e.jsx("option",{value:"all",children:"All Classes"}),(Array.isArray(Me)?Me:[]).map(t=>e.jsxs("option",{value:t.id,children:[t.name,t.arm||""]},t.id))]}),e.jsx("div",{className:"pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 border-l border-white/30 pl-2 ml-2",children:e.jsx("svg",{className:"w-5 h-5 text-white",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2.5,d:"M19 9l-7 7-7-7"})})})]}),e.jsxs("button",{onClick:()=>Jt("cumulative"),className:"flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold",children:[e.jsx("svg",{className:"w-4 h-4 sm:w-5 sm:h-5",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"})}),"Cumulative"]}),!E&&e.jsxs("button",{onClick:qt,className:"flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold",children:[e.jsx("svg",{className:"w-4 h-4 sm:w-5 sm:h-5",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"})}),"Sync"]}),e.jsxs("div",{className:"flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center mt-6 w-full",children:[e.jsxs("div",{className:"flex-1 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-4 rounded-2xl flex items-center gap-4 shadow-sm",children:[e.jsx("div",{className:"p-3 bg-blue-600 text-white rounded-xl shadow-lg shrink-0",children:e.jsx("svg",{className:"w-6 h-6",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"})})}),e.jsxs("div",{className:"min-w-0",children:[e.jsx("p",{className:"text-[10px] font-black text-blue-600 uppercase tracking-widest mb-0.5",children:"Currently Viewing"}),e.jsx("p",{className:"text-sm font-bold text-blue-900 truncate",children:X?"GLOBAL ACADEMIC HISTORY - ALL SESSIONS":`${(o==null?void 0:o.name)||"Loading..."} - ${D?"All Terms (Cumulative)":(h==null?void 0:h.name)||"Term"}`})]})]}),e.jsxs("button",{onClick:()=>X?Ye():D?oe(o.id):ve(h.id,o.id,!1,!1),className:"bg-primary text-white px-6 py-4 rounded-2xl shadow-lg hover:brightness-95 transition-all active:scale-95 flex items-center justify-center gap-2 font-black uppercase text-xs tracking-widest sm:w-auto w-full",children:[e.jsx("svg",{className:"w-5 h-5",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"})}),"Refresh View"]})]}),X&&e.jsxs("div",{className:"mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3",children:[e.jsx("svg",{className:"w-6 h-6 text-amber-600",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"})}),e.jsx("p",{className:"text-xs font-bold text-amber-800",children:"Showing aggregated fee records from every academic session in history. Each student shows their total expected, paid, and balance across all years."})]}),D&&!X&&e.jsxs("div",{className:"mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3",children:[e.jsx("svg",{className:"w-6 h-6 text-blue-600",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"})}),e.jsx("p",{className:"text-xs font-bold text-blue-800",children:"Showing cumulative fee records for all terms within the selected academic session. Each student shows their total expected, paid, and balance across all terms."})]}),e.jsx("div",{className:"w-full sm:w-auto flex flex-wrap gap-2",children:be.length>0&&!E&&e.jsxs(e.Fragment,{children:[e.jsxs("button",{onClick:()=>Yt("allow"),className:"flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center justify-center gap-2 text-xs font-bold",children:["✅ Allow (",be.length,")"]}),e.jsxs("button",{onClick:()=>Yt("restrict"),className:"flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 flex items-center justify-center gap-2 text-xs font-bold",children:["🚫 Restrict (",be.length,")"]})]})}),!E&&e.jsxs("button",{onClick:os,className:"w-full sm:w-auto px-4 py-2.5 bg-orange-600 text-white rounded-md hover:bg-orange-700 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold shadow-lg",children:[e.jsx("svg",{className:"w-5 h-5",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"})}),"Send Fee Reminders"]})]}),e.jsxs("div",{className:"mt-4 text-[10px] sm:text-xs text-gray-400 font-bold uppercase tracking-widest text-center sm:text-left",children:["Showing ",ce.length," of ",U.length," students"]})]}),e.jsxs("div",{className:"bg-white rounded-lg shadow-lg p-6 mb-6",children:[e.jsxs("div",{className:"flex justify-between items-center mb-4",children:[e.jsx("h2",{className:"text-xl font-bold text-gray-900",children:"📚 Navigate by Class"}),J!==null&&e.jsxs("button",{onClick:()=>Ze(null),className:"px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center gap-2",children:[e.jsx("svg",{className:"w-4 h-4",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M10 19l-7-7m0 0l7-7m-7 7h18"})}),"View All Classes"]})]}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",children:[e.jsxs("button",{onClick:()=>Ze(null),className:`p-5 rounded-xl border-2 transition-all transform hover:scale-105 hover:shadow-lg text-left ${J===null?"border-primary bg-primary/5 shadow-md":"border-gray-200 bg-white hover:border-primary/50"}`,children:[e.jsxs("div",{className:"flex items-center justify-between mb-3",children:[e.jsx("h3",{className:"text-lg font-bold text-gray-900",children:"All Classes"}),J===null&&e.jsx("svg",{className:"w-6 h-6 text-primary",fill:"currentColor",viewBox:"0 0 20 20",children:e.jsx("path",{fillRule:"evenodd",d:"M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z",clipRule:"evenodd"})})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsxs("div",{className:"flex justify-between text-sm",children:[e.jsx("span",{className:"text-gray-500",children:"Students:"}),e.jsx("span",{className:"font-bold text-gray-900",children:U.length})]}),e.jsxs("div",{className:"flex justify-between text-sm",children:[e.jsx("span",{className:"text-gray-500",children:"Expected:"}),e.jsxs("span",{className:"font-bold text-blue-600",children:["₦",x((b==null?void 0:b.totalExpected)||0)]})]}),e.jsxs("div",{className:"flex justify-between text-sm",children:[e.jsx("span",{className:"text-gray-500",children:"Collected:"}),e.jsxs("span",{className:"font-bold text-green-600",children:["₦",x((b==null?void 0:b.totalPaid)||0)]})]}),e.jsxs("div",{className:"flex justify-between text-sm",children:[e.jsx("span",{className:"text-gray-500",children:"Balance:"}),e.jsxs("span",{className:"font-bold text-red-600",children:["₦",x((b==null?void 0:b.totalBalance)||0)]})]}),e.jsxs("div",{className:"mt-4 pt-4 border-t border-gray-100",children:[e.jsx("div",{className:"w-full bg-gray-100 rounded-full h-1.5",children:e.jsx("div",{className:"bg-gradient-to-r from-green-500 to-primary h-1.5 rounded-full transition-all",style:{width:`${(b==null?void 0:b.totalExpected)>0?b.totalPaid/b.totalExpected*100:0}%`}})}),e.jsxs("p",{className:"text-[10px] text-gray-400 mt-1.5 text-center font-medium",children:[(b==null?void 0:b.totalExpected)>0?(b.totalPaid/b.totalExpected*100).toFixed(1):0,"% overall collection"]})]})]})]}),Object.values(Mt||{}).map(t=>e.jsxs("button",{onClick:()=>Ze(t.classId),className:`p-5 rounded-xl border-2 transition-all transform hover:scale-105 hover:shadow-lg text-left ${J===t.classId?"border-primary bg-primary/5 shadow-md":"border-gray-200 bg-white hover:border-primary/50"}`,children:[e.jsxs("div",{className:"flex items-center justify-between mb-3",children:[e.jsx("h3",{className:"text-lg font-bold text-gray-900",children:t.className}),J===t.classId&&e.jsx("svg",{className:"w-6 h-6 text-primary",fill:"currentColor",viewBox:"0 0 20 20",children:e.jsx("path",{fillRule:"evenodd",d:"M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z",clipRule:"evenodd"})})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsxs("div",{className:"flex justify-between text-sm",children:[e.jsx("span",{className:"text-gray-500",children:"Students:"}),e.jsx("span",{className:"font-bold text-gray-900",children:t.totalStudents})]}),e.jsxs("div",{className:"flex justify-between text-sm",children:[e.jsx("span",{className:"text-gray-500 font-medium",children:"Expected (Term):"}),e.jsxs("span",{className:"font-black text-blue-600 tracking-tight",children:["₦",x(t.totalExpected)]})]}),e.jsxs("div",{className:"flex justify-between text-sm",children:[e.jsx("span",{className:"text-gray-500 font-medium",children:"Collected (Term):"}),e.jsxs("span",{className:"font-black text-emerald-600 tracking-tight",children:["₦",x(t.totalPaid)]})]}),e.jsxs("div",{className:"flex justify-between text-sm pt-1 border-t border-dashed border-gray-100",children:[e.jsx("span",{className:"text-gray-400 italic text-[11px]",children:"Previous Arrears:"}),e.jsxs("span",{className:"font-bold text-gray-400 text-[11px]",children:["₦",x(t.totalArrears||0)]})]}),e.jsxs("div",{className:"flex justify-between text-sm pt-1 mt-1 border-t-2 border-gray-100",children:[e.jsx("span",{className:"text-gray-900 font-black uppercase text-[10px]",children:"Total Balance:"}),e.jsxs("span",{className:"font-black text-red-600 tracking-tight",children:["₦",x(t.totalBalance)]})]}),e.jsxs("div",{className:"mt-3 pt-3 border-t border-gray-100",children:[e.jsxs("div",{className:"flex justify-between text-xs font-medium",children:[e.jsx("span",{className:"text-gray-400 uppercase tracking-tighter",children:"Allowed:"}),e.jsx("span",{className:"font-bold text-indigo-600",children:t.clearedStudents})]}),e.jsxs("div",{className:"flex justify-between text-xs font-medium mt-1",children:[e.jsx("span",{className:"text-gray-400 uppercase tracking-tighter",children:"Restricted:"}),e.jsx("span",{className:"font-bold text-amber-600",children:t.unclearedStudents})]})]}),e.jsxs("div",{className:"mt-3",children:[e.jsx("div",{className:"w-full bg-gray-100 rounded-full h-1.5",children:e.jsx("div",{className:"bg-gradient-to-r from-green-500 to-primary h-1.5 rounded-full transition-all",style:{width:`${t.totalExpected>0?t.totalPaid/t.totalExpected*100:0}%`}})}),e.jsxs("p",{className:"text-[10px] text-gray-400 mt-1.5 text-center font-medium",children:[t.totalExpected>0?(t.totalPaid/t.totalExpected*100).toFixed(1):0,"% collected"]})]})]})]},t.classId))]}),J!==null&&e.jsx("div",{className:"mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg",children:e.jsxs("p",{className:"text-sm text-primary",children:[e.jsx("strong",{children:"📌 Viewing:"})," ",J==="scholarship"?"Scholarship Students":((Xt=Object.values(Mt).find(t=>t.classId===J))==null?void 0:Xt.className)||"Selected Class"," - Showing ",ce.length," student(s)"]})})]}),it==="table"&&e.jsx("div",{className:"bg-white rounded-lg shadow overflow-hidden",children:e.jsx("div",{className:"overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 relative",children:e.jsxs("table",{className:"min-w-full divide-y divide-gray-200",children:[e.jsx("thead",{className:"bg-gray-50 sticky top-0 z-10",children:e.jsxs("tr",{children:[e.jsx("th",{className:"px-3 py-3 text-left",children:e.jsx("input",{type:"checkbox",checked:be.length===ce.length&&ce.length>0,onChange:hs,className:"rounded border-gray-300 text-primary focus:ring-primary"})}),e.jsx("th",{className:"px-3 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest",children:"Student"}),e.jsx("th",{className:"px-3 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest",children:"Class"}),e.jsx("th",{className:"px-3 py-3 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest",children:"Prev. Balance"}),e.jsx("th",{className:"px-3 py-3 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest",children:"Current Expected"}),e.jsx("th",{className:"px-3 py-3 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest",children:"Paid"}),e.jsx("th",{className:"px-3 py-3 text-right text-[10px] font-black text-red-500 uppercase tracking-widest bg-red-50/50",children:"Total Balance"}),e.jsx("th",{className:"px-3 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest",children:"Actions"})]})}),e.jsx("tbody",{className:"bg-white divide-y divide-gray-200",children:ce.map(t=>{var l,u,c,d,n,m,g,k;const a=t.feeRecords[0],s=(a==null?void 0:a.openingBalance)||0,r=(a==null?void 0:a.expectedAmount)||0,i=(a==null?void 0:a.paidAmount)||0;return e.jsxs("tr",{className:`hover:bg-gray-50 ${t.isScholarship?"bg-emerald-50/30":""}`,children:[e.jsx("td",{className:"px-3 py-4 border-b border-gray-100",children:e.jsx("input",{type:"checkbox",checked:be.includes(t.id),onChange:()=>ps(t.id),className:"rounded border-gray-300 text-primary focus:ring-primary"})}),e.jsx("td",{className:"px-3 py-4 border-b border-gray-100",children:e.jsxs("div",{className:"min-w-[140px]",children:[e.jsxs("div",{className:"font-bold text-gray-900 leading-tight",children:[((l=t.user)==null?void 0:l.firstName)||""," ",((u=t.user)==null?void 0:u.lastName)||""," ",t.middleName||""]}),e.jsx("div",{className:"text-[10px] text-gray-400 font-medium",children:t.admissionNumber})]})}),e.jsx("td",{className:"px-3 py-4 text-xs font-semibold text-gray-700 border-b border-gray-100",children:t.classModel?`${t.classModel.name}${t.classModel.arm||""}`:"N/A"}),t.isScholarship?e.jsxs(e.Fragment,{children:[e.jsx("td",{colSpan:"4",className:"px-3 py-4 text-[11px] font-black text-center border-b border-gray-100 text-emerald-600 uppercase tracking-widest italic bg-emerald-50/50",children:"🎓 SCHOLARSHIP"}),e.jsx("td",{className:"px-3 py-4 border-b border-gray-100",children:e.jsxs("div",{className:"flex gap-1.5",children:[e.jsx("button",{onClick:()=>{Ft(t),Et(!0)},className:"flex-1 bg-emerald-600 text-white hover:bg-emerald-700 px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter shadow-sm transition-all",children:"🖨️ Print Card"}),!E&&e.jsx("button",{onClick:()=>bt(t),className:"bg-gray-100 text-gray-600 hover:bg-gray-200 px-2 py-1 rounded text-[10px] font-black transition-all flex-none aspect-square w-7 flex items-center justify-center",title:"Adjust settings",children:"⚙️"})]})})]}):e.jsxs(e.Fragment,{children:[e.jsx("td",{className:"px-3 py-4 text-xs font-bold text-right border-b border-gray-100",children:e.jsxs("span",{className:s>0?"text-red-500":"text-gray-400",children:["₦",x(s)]})}),e.jsxs("td",{className:"px-3 py-4 text-xs font-bold text-gray-900 text-right border-b border-gray-100",children:["₦",x(r)]}),e.jsxs("td",{className:"px-3 py-4 text-xs font-black text-green-600 text-right border-b border-gray-100",children:["₦",x(i)]}),e.jsx("td",{className:"px-3 py-4 text-xs font-black text-right border-b border-gray-100 bg-red-50/20",children:e.jsxs("span",{className:((c=t.feeRecords[0])==null?void 0:c.balance)>0?"text-red-700":((d=t.feeRecords[0])==null?void 0:d.balance)<0?"text-emerald-700":"text-gray-400",children:["₦",x(((n=t.feeRecords[0])==null?void 0:n.balance)||0)]})}),e.jsx("td",{className:"px-3 py-4 border-b border-gray-100",children:e.jsxs("div",{className:"flex flex-wrap gap-1.5 min-w-[160px]",children:[!E&&e.jsx("button",{onClick:()=>te(t),className:"bg-primary/10 text-primary hover:bg-primary hover:text-white px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter transition-all",children:"💰 Pay"}),e.jsxs("button",{onClick:()=>qe(t),className:"bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter transition-all",children:["🕒 ",E?"View Records":"Edit Records"]}),e.jsx("button",{onClick:()=>{Fe(t),Re(null),Ee(!0)},className:"bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter transition-all",children:"🖨️ Receipt"}),!E&&e.jsx("button",{onClick:()=>bt(t),className:"bg-orange-50 text-orange-600 hover:bg-orange-600 hover:text-white px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter transition-all",children:"⚙️ Adjust"}),e.jsxs("a",{href:`https://wa.me/${((m=t.parentGuardianPhone)==null?void 0:m.replace(/\D/g,""))||""}?text=${encodeURIComponent(`Hello ${t.parentGuardianName}, this is a friendly reminder from ${y.schoolName} regarding the outstanding fees for ${(g=t.user)==null?void 0:g.firstName} (${t.admissionNumber}). The current balance is ₦${x(((k=t.feeRecords[0])==null?void 0:k.balance)||0)}. Please kindly make payments at your earliest convenience. Thank you.`)}`,target:"_blank",rel:"noopener noreferrer",className:"bg-green-50 text-green-600 hover:bg-green-600 hover:text-white px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter transition-all flex items-center gap-1",children:[e.jsx("span",{children:"📱"})," WhatsApp"]})]})})]})]},t.id)})})]})})}),it==="cards"&&e.jsx("div",{className:"grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4",children:ce.map(t=>{var d,n,m,g,k,v,R,C,$,S,O,Z,K,z,F;const a=t.feeRecords[0],s=(a==null?void 0:a.openingBalance)||0,r=(a==null?void 0:a.expectedAmount)||0,i=(a==null?void 0:a.paidAmount)||0,l=r-i,u=s+r,c=u>0?Math.min(i/u*100,100):0;return t.isScholarship?e.jsxs("div",{className:"rounded-2xl overflow-hidden shadow-lg border border-emerald-200 bg-gradient-to-br from-emerald-500 to-teal-700 text-white p-5 relative",children:[e.jsx("div",{className:"absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 rounded-full bg-white/10 blur-2xl"}),e.jsxs("div",{className:"flex items-center gap-3 mb-3",children:[e.jsxs("div",{className:"w-10 h-10 rounded-full bg-white/20 border border-white/30 flex items-center justify-center font-black text-sm",children:[(n=(d=t.user)==null?void 0:d.firstName)==null?void 0:n[0],(g=(m=t.user)==null?void 0:m.lastName)==null?void 0:g[0]]}),e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsxs("p",{className:"font-black text-sm truncate",children:[((k=t.user)==null?void 0:k.firstName)||""," ",((v=t.user)==null?void 0:v.lastName)||""," ",t.middleName||""]}),e.jsx("p",{className:"text-emerald-100 text-xs font-medium",children:t.admissionNumber})]}),e.jsx("span",{className:"px-2 py-0.5 bg-yellow-400 text-yellow-900 text-[9px] font-black uppercase rounded-sm",children:"Scholar"})]}),e.jsx("p",{className:"text-sm font-bold text-emerald-100",children:t.classModel?`${t.classModel.name}${t.classModel.arm||""}`:"N/A"}),e.jsx("p",{className:"text-xs text-emerald-200 mt-2 italic",children:"Full scholarship — fees waived"}),e.jsxs("div",{className:"flex gap-2 mt-4 pt-3 border-t border-white/20",children:[e.jsx("button",{onClick:()=>qe(t),className:"flex-1 bg-white/20 hover:bg-white/30 text-white text-xs font-bold py-1.5 rounded-lg transition-all",children:E?"View Records":"Edit Records"}),e.jsx("button",{onClick:()=>{Fe(t),Re(null),Ee(!0)},className:"flex-1 bg-white/20 hover:bg-white/30 text-white text-xs font-bold py-1.5 rounded-lg transition-all",children:"Receipt"})]})]},t.id):e.jsxs("div",{className:"rounded-2xl overflow-hidden shadow-md border border-gray-100 bg-white hover:shadow-lg transition-all",children:[e.jsxs("div",{className:"p-4 border-b border-gray-50",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsxs("div",{className:"w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-black text-primary text-sm",children:[(C=(R=t.user)==null?void 0:R.firstName)==null?void 0:C[0],(S=($=t.user)==null?void 0:$.lastName)==null?void 0:S[0]]}),e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsxs("p",{className:"font-bold text-gray-900 text-sm truncate",children:[((O=t.user)==null?void 0:O.firstName)||""," ",((Z=t.user)==null?void 0:Z.lastName)||""," ",t.middleName||""]}),e.jsx("p",{className:"text-gray-400 text-xs font-medium",children:t.admissionNumber})]}),e.jsx("span",{className:`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${l<=0?"bg-green-100 text-green-700":"bg-red-100 text-red-700"}`,children:l<=0?"Cleared":"Owing"})]}),e.jsx("p",{className:"text-xs font-semibold text-gray-500 mt-2 ml-[52px]",children:t.classModel?`${t.classModel.name}${t.classModel.arm||""}`:"N/A"})]}),e.jsxs("div",{className:"p-4 space-y-3",children:[e.jsxs("div",{className:"grid grid-cols-2 gap-3",children:[e.jsxs("div",{className:"bg-gray-50 rounded-lg p-2.5 text-center",children:[e.jsx("p",{className:"text-[10px] font-bold text-gray-400 uppercase",children:"Prev. Balance"}),e.jsxs("p",{className:"text-sm font-black text-gray-700",children:["₦",x(s)]})]}),e.jsxs("div",{className:"bg-blue-50 rounded-lg p-2.5 text-center",children:[e.jsx("p",{className:"text-[10px] font-bold text-blue-400 uppercase",children:"Expected"}),e.jsxs("p",{className:"text-sm font-black text-blue-700",children:["₦",x(r)]})]}),e.jsxs("div",{className:"bg-green-50 rounded-lg p-2.5 text-center",children:[e.jsx("p",{className:"text-[10px] font-bold text-green-500 uppercase",children:"Paid"}),e.jsxs("p",{className:"text-sm font-black text-green-700",children:["₦",x(i)]})]}),e.jsxs("div",{className:`rounded-lg p-2.5 text-center ${l>0?"bg-red-50":"bg-emerald-50"}`,children:[e.jsx("p",{className:`text-[10px] font-bold uppercase ${l>0?"text-red-400":"text-emerald-400"}`,children:"Balance"}),e.jsxs("p",{className:`text-sm font-black ${l>0?"text-red-700":"text-emerald-700"}`,children:["₦",x(l)]})]})]}),e.jsxs("div",{children:[e.jsx("div",{className:"w-full bg-gray-100 rounded-full h-2",children:e.jsx("div",{className:`h-2 rounded-full transition-all ${c>=100?"bg-emerald-500":c>=50?"bg-blue-500":"bg-amber-500"}`,style:{width:`${c}%`}})}),e.jsxs("p",{className:"text-[10px] text-gray-400 font-bold mt-1 text-center",children:[c.toFixed(1),"% paid"]})]})]}),e.jsxs("div",{className:"px-4 pb-4 flex flex-wrap gap-2",children:[!E&&e.jsx("button",{onClick:()=>te(t),className:"flex-1 min-w-[70px] bg-primary/10 text-primary hover:bg-primary hover:text-white text-[10px] font-black uppercase py-2 rounded-lg transition-all tracking-tighter",children:"Pay"}),e.jsx("button",{onClick:()=>qe(t),className:"flex-1 min-w-[70px] bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white text-[10px] font-black uppercase py-2 rounded-lg transition-all tracking-tighter",children:E?"Records":"Edit"}),e.jsx("button",{onClick:()=>{Fe(t),Re(null),Ee(!0)},className:"flex-1 min-w-[70px] bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white text-[10px] font-black uppercase py-2 rounded-lg transition-all tracking-tighter",children:"Receipt"}),!E&&e.jsx("button",{onClick:()=>bt(t),className:"flex-1 min-w-[70px] bg-orange-50 text-orange-600 hover:bg-orange-600 hover:text-white text-[10px] font-black uppercase py-2 rounded-lg transition-all tracking-tighter",children:"Adjust"}),e.jsxs("a",{href:`https://wa.me/${((K=t.parentGuardianPhone)==null?void 0:K.replace(/\D/g,""))||""}?text=${encodeURIComponent(`Hello ${t.parentGuardianName}, this is a friendly reminder from ${y.schoolName} regarding the outstanding fees for ${(z=t.user)==null?void 0:z.firstName} (${t.admissionNumber}). The current balance is ₦${x(((F=t.feeRecords[0])==null?void 0:F.balance)||0)}. Please kindly make payments at your earliest convenience. Thank you.`)}`,target:"_blank",rel:"noopener noreferrer",className:"flex-1 min-w-[70px] bg-green-50 text-green-600 hover:bg-green-600 hover:text-white text-[10px] font-black uppercase py-2 rounded-lg transition-all tracking-tighter text-center flex items-center justify-center gap-1",children:[e.jsx("span",{children:"📱"})," WA"]})]})]},t.id)})})]}):e.jsxs("div",{className:"space-y-6",children:[e.jsxs("div",{className:"bg-white p-4 rounded-xl shadow-md border border-gray-100 flex flex-wrap gap-4 items-end",children:[e.jsxs("div",{className:"flex-1 min-w-[200px]",children:[e.jsx("label",{className:"block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1",children:"Academic Session"}),e.jsxs("select",{value:Ce||"",onChange:t=>Ut(t.target.value||null),className:"w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-4 focus:ring-primary/5 outline-none transition-all",children:[e.jsx("option",{value:"",children:"All Sessions"}),(Array.isArray(q)?q:[]).map(t=>e.jsx("option",{value:t.id,children:t.name},t.id))]})]}),e.jsxs("div",{className:"flex-1 min-w-[200px]",children:[e.jsx("label",{className:"block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1",children:"Term"}),e.jsxs("select",{value:ke||"",onChange:t=>Ot(t.target.value||null),className:"w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-4 focus:ring-primary/5 outline-none transition-all",children:[e.jsx("option",{value:"",children:"All Terms"}),(Array.isArray(W)?W:[]).map(t=>e.jsx("option",{value:t.id,children:t.name},t.id))]})]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsxs("button",{onClick:ds,className:"px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-indigo-700 transition-all",title:"Export to Excel/CSV",children:[e.jsx("svg",{className:"w-5 h-5",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"})}),"Export"]}),e.jsx("button",{onClick:()=>{$e(t=>({...t,sessionId:Ce||"",termId:ke||""})),rt(!0)},className:"px-6 py-2.5 bg-primary text-white rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-primary/20 hover:brightness-95 active:scale-95 transition-all",children:"+ Create Fee Structure"})]})]}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-3 gap-6",children:[e.jsxs("div",{className:"bg-white p-6 rounded-xl shadow-md border-l-4 border-blue-500",children:[e.jsx("p",{className:"text-xs font-black text-gray-400 uppercase tracking-widest mb-1",children:"Total Expected"}),e.jsxs("p",{className:"text-2xl font-black text-gray-900",children:["₦",x(Ne.reduce((t,a)=>t+(a.totalExpected||0),0))]})]}),e.jsxs("div",{className:"bg-white p-6 rounded-xl shadow-md border-l-4 border-green-500",children:[e.jsx("p",{className:"text-xs font-black text-gray-400 uppercase tracking-widest mb-1",children:"Total Received"}),e.jsxs("p",{className:"text-2xl font-black text-green-600",children:["₦",x(Ne.reduce((t,a)=>t+(a.totalReceived||0),0))]})]}),e.jsxs("div",{className:"bg-white p-6 rounded-xl shadow-md border-l-4 border-red-500",children:[e.jsx("p",{className:"text-xs font-black text-gray-400 uppercase tracking-widest mb-1",children:"Total Outstanding"}),e.jsxs("p",{className:"text-2xl font-black text-red-600",children:["₦",x(Ne.reduce((t,a)=>t+(a.outstanding||0),0))]})]})]}),gt?e.jsx("div",{className:"flex justify-center py-12",children:e.jsx("div",{className:"animate-spin rounded-full h-12 w-12 border-b-2 border-primary"})}):e.jsx("div",{className:"space-y-4",children:(Array.isArray(Ne)?Ne:[]).map(t=>e.jsxs("div",{className:"bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100",children:[e.jsxs("div",{onClick:()=>Wa(ut===t.id?null:t.id),className:"p-6 flex justify-between items-center cursor-pointer hover:bg-gray-50 bg-gradient-to-r from-gray-50 to-white",children:[e.jsxs("div",{children:[e.jsx("h3",{className:"text-xl font-black text-gray-900",children:t.title}),e.jsxs("div",{className:"flex gap-4 mt-1",children:[e.jsxs("span",{className:"text-xs font-bold text-gray-500 uppercase tracking-tighter",children:["Amount: ₦",x(t.amount)]}),e.jsx("span",{className:`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${t.isCompulsory?"bg-red-100 text-red-700":"bg-blue-100 text-blue-700"}`,children:t.isCompulsory?"Compulsory":"Optional"})]})]}),e.jsxs("div",{className:"flex items-center gap-8",children:[e.jsxs("div",{className:"text-right hidden md:block",children:[e.jsx("p",{className:"text-[10px] font-black text-gray-400 uppercase tracking-widest",children:"Outstanding"}),e.jsxs("p",{className:"text-lg font-black text-red-600",children:["₦",x(t.outstanding)]})]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsxs("button",{onClick:a=>{a.stopPropagation(),ms(t)},disabled:wt,className:"p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-colors flex items-center gap-1",title:"Download PDF Report",children:[wt?e.jsx("div",{className:"w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"}):e.jsx("svg",{className:"w-5 h-5",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"})}),e.jsx("span",{className:"text-[10px] font-black uppercase hidden sm:inline",children:"Report"})]}),e.jsx("button",{onClick:a=>{a.stopPropagation(),cs(t)},className:"p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors",title:"Print Fee Report",children:e.jsx("svg",{className:"w-5 h-5",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2-2h10a2 2 0 002 2v4"})})})]}),e.jsx("svg",{className:`w-6 h-6 transform transition-transform ${ut===t.id?"rotate-180":""}`,fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M19 9l-7 7-7-7"})})]})]}),ut===t.id&&e.jsx("div",{className:"p-6 bg-gray-50 border-t border-gray-100 space-y-4",children:(Array.isArray(t.classes)?t.classes:[]).map(a=>e.jsxs("div",{className:"bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden",children:[e.jsxs("button",{onClick:()=>Ga(ft===`${t.id}-${a.id}`?null:`${t.id}-${a.id}`),className:"w-full p-4 flex justify-between items-center hover:bg-gray-50 transition-colors",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("span",{className:"w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-xs",children:a.students.length}),e.jsxs("span",{className:"font-bold text-gray-800",children:[a.name," ",a.arm]})]}),e.jsxs("div",{className:"flex items-center gap-4",children:[e.jsxs("div",{className:"text-right text-xs",children:[e.jsx("span",{className:"text-gray-400 font-medium",children:"Collection: "}),e.jsxs("span",{className:"font-bold text-green-600",children:["₦",x(a.totalReceived)]})]}),e.jsx("svg",{className:`w-4 h-4 transform transition-transform ${ft===`${t.id}-${a.id}`?"rotate-180":""}`,fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M19 9l-7 7-7-7"})})]})]}),ft===`${t.id}-${a.id}`&&e.jsx("div",{className:"overflow-x-auto",children:e.jsxs("table",{className:"min-w-full divide-y divide-gray-100",children:[e.jsx("thead",{className:"bg-gray-50",children:e.jsxs("tr",{children:[e.jsx("th",{className:"px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest",children:"Student"}),e.jsx("th",{className:"px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest",children:"Paid"}),e.jsx("th",{className:"px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest",children:"Balance"}),e.jsx("th",{className:"px-6 py-3 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest",children:"Actions"})]})}),e.jsx("tbody",{className:"divide-y divide-gray-100",children:(Array.isArray(a.students)?a.students:[]).map(s=>e.jsxs("tr",{className:"hover:bg-gray-50 transition-colors",children:[e.jsxs("td",{className:"px-6 py-4",children:[e.jsx("div",{className:"font-bold text-gray-900",children:s.name}),e.jsx("div",{className:"text-[10px] text-gray-400 font-medium",children:s.admissionNumber})]}),e.jsxs("td",{className:"px-6 py-4 font-bold text-green-600 text-sm",children:["₦",x(s.totalPaid)]}),e.jsxs("td",{className:"px-6 py-4 font-bold text-red-600 text-sm",children:["₦",x(s.balance)]}),e.jsx("td",{className:"px-6 py-4 text-right",children:e.jsxs("div",{className:"flex justify-end gap-2",children:[!E&&e.jsx("button",{onClick:()=>{st({student:s,fee:t}),We({...ne,amount:s.balance})},className:"px-3 py-1 bg-primary text-white text-[10px] font-black uppercase rounded-lg hover:brightness-90",children:"Update"}),s.payments.length>0&&e.jsxs("div",{className:"relative group",children:[e.jsxs("button",{className:"px-3 py-1 bg-gray-100 text-gray-600 text-[10px] font-black uppercase rounded-lg hover:bg-gray-200 flex items-center gap-1",children:["Receipts (",s.payments.length,")",e.jsx("span",{children:"▼"})]}),e.jsxs("div",{className:"absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-50 hidden group-hover:block animate-in fade-in slide-in-from-top-1 duration-200",children:[e.jsx("div",{className:"p-2 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center",children:"Select Payment"}),e.jsx("div",{className:"max-h-48 overflow-y-auto",children:(Array.isArray(s.payments)?s.payments:[]).map((r,i)=>e.jsxs("div",{className:"w-full hover:bg-primary/5 transition-colors border-b border-gray-50 flex items-center pr-2",children:[e.jsxs("button",{onClick:()=>es(r.id),className:"flex-1 text-left px-4 py-3 flex flex-col gap-0.5",children:[e.jsxs("span",{className:"text-[10px] font-black text-primary uppercase",children:["Payment #",s.payments.length-i]}),e.jsxs("div",{className:"flex justify-between items-center text-xs",children:[e.jsxs("span",{className:"font-bold text-gray-900",children:["₦",x(r.amount)]}),e.jsx("span",{className:"text-gray-400 font-medium",children:new Date(r.paymentDate).toLocaleDateString()})]})]}),e.jsx("button",{onClick:()=>Va(r.id),className:"p-2 text-gray-400 hover:text-primary transition-colors",title:"Print (Alternative)",children:e.jsx("svg",{className:"w-4 h-4",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"})})})]},r.id))})]})]})]})})]},s.id))})]})})]},a.id))})]},t.id))})]}),H&&e.jsx("div",{className:"fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full flex justify-center items-end sm:items-center z-50 p-0 pb-24 sm:p-4",children:e.jsxs("div",{className:"bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] sm:max-h-[85vh] flex flex-col transform transition-all",children:[e.jsxs("div",{className:"flex justify-between items-center p-4 border-b border-gray-100 shrink-0",children:[e.jsx("h2",{className:"text-lg font-black text-gray-900 uppercase tracking-tight",children:"Record Payment"}),e.jsx("button",{onClick:()=>te(null),className:"p-2 hover:bg-gray-100 rounded-full transition-colors",children:e.jsx("svg",{className:"w-6 h-6 text-gray-400",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M6 18L18 6M6 6l12 12"})})})]}),e.jsxs("div",{className:"p-4 sm:p-6 overflow-y-auto flex-1",children:[e.jsxs("div",{className:"mb-6 p-4 bg-primary/5 rounded-2xl border border-primary/10",children:[e.jsx("p",{className:"text-[10px] font-black uppercase tracking-widest text-primary/60 mb-1",children:"Student Details"}),e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsxs("div",{className:"w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center font-black text-primary text-lg",children:[(Zt=(Kt=H.user)==null?void 0:Kt.firstName)==null?void 0:Zt[0],(ea=(Vt=H.user)==null?void 0:Vt.lastName)==null?void 0:ea[0]]}),e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsxs("p",{className:"font-black text-gray-900 text-base truncate leading-tight",children:[((ta=H.user)==null?void 0:ta.firstName)||""," ",((aa=H.user)==null?void 0:aa.lastName)||""]}),e.jsxs("p",{className:"text-gray-400 text-xs font-bold uppercase tracking-tighter",children:[H.admissionNumber," • ",((sa=H.classModel)==null?void 0:sa.name)||"N/A"]})]})]})]}),e.jsxs("div",{className:"space-y-6",children:[e.jsxs("div",{className:"grid grid-cols-2 gap-4",children:[e.jsxs("div",{children:[e.jsx("label",{className:"block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1",children:"Payment Session"}),e.jsx("select",{value:(ge==null?void 0:ge.id)||"",onChange:t=>{const a=q.find(s=>s.id===parseInt(t.target.value));Qe(a)},className:"w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary font-bold text-sm transition-all",children:(Array.isArray(q)?q:[]).map(t=>e.jsx("option",{value:t.id,children:t.name},t.id))})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1",children:"Payment Term"}),e.jsx("select",{value:(A==null?void 0:A.id)||"",onChange:t=>{const a=W.find(s=>s.id===parseInt(t.target.value));_e(a)},className:"w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary font-bold text-sm transition-all",children:(Array.isArray(W)?W:[]).filter(t=>t.academicSessionId===(ge==null?void 0:ge.id)).map(t=>e.jsx("option",{value:t.id,children:t.name},t.id))})]})]}),Ae?e.jsxs("div",{className:"p-4 bg-gray-50 rounded-2xl flex items-center justify-center gap-3",children:[e.jsx("div",{className:"w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"}),e.jsx("span",{className:"text-xs font-bold text-gray-400 uppercase tracking-widest",children:"Loading Balances..."})]}):((ra=M==null?void 0:M.outstandingTerms)==null?void 0:ra.length)>0&&e.jsxs("div",{className:"bg-orange-50 border border-orange-100 rounded-2xl p-4",children:[e.jsxs("h4",{className:"text-[10px] font-black text-orange-600 uppercase tracking-widest mb-3 flex items-center gap-2",children:[e.jsx("span",{className:"flex h-2 w-2 rounded-full bg-orange-500 animate-pulse"}),"Outstanding Balances"]}),e.jsx("div",{className:"grid grid-cols-1 gap-3 max-h-60 overflow-y-auto pr-1 custom-scrollbar",children:M.outstandingTerms.map((t,a)=>e.jsxs("div",{className:`p-4 rounded-2xl border-2 transition-all cursor-pointer transform active:scale-95 ${(A==null?void 0:A.id)===t.termId?"bg-orange-500 border-orange-600 shadow-xl text-white":"bg-white border-orange-100 hover:border-orange-300 hover:shadow-md"}`,onClick:()=>{const s=W.find(i=>i.id===t.termId),r=q.find(i=>i.id===t.sessionId);_e(s),Qe(r)},children:[e.jsxs("div",{className:"flex justify-between items-start mb-3",children:[e.jsxs("div",{className:"flex flex-col",children:[e.jsx("span",{className:`text-[9px] font-black uppercase tracking-widest ${(A==null?void 0:A.id)===t.termId?"text-white/70":"text-gray-400"}`,children:t.sessionName}),e.jsx("span",{className:"text-base font-black italic tracking-tighter",children:t.termName})]}),e.jsx("div",{className:`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter ${(A==null?void 0:A.id)===t.termId?"bg-white/20 text-white":"bg-orange-100 text-orange-700"}`,children:"Debt Breakdown"})]}),e.jsxs("div",{className:`grid grid-cols-2 gap-4 pt-3 border-t ${(A==null?void 0:A.id)===t.termId?"border-white/20":"border-gray-50"}`,children:[e.jsxs("div",{children:[e.jsx("p",{className:`text-[9px] font-black uppercase tracking-widest mb-0.5 ${(A==null?void 0:A.id)===t.termId?"text-white/60":"text-gray-400"}`,children:"Term Outstanding"}),e.jsxs("p",{className:"text-sm font-black",children:["₦",x(t.balance)]})]}),e.jsxs("div",{className:"text-right",children:[e.jsx("p",{className:`text-[9px] font-black uppercase tracking-widest mb-0.5 ${(A==null?void 0:A.id)===t.termId?"text-white/60":"text-gray-400"}`,children:"Total (Cumulative)"}),e.jsxs("p",{className:"text-sm font-black",children:["₦",x(t.cumulativeBalance)]})]})]})]},a))})]}),e.jsxs("div",{children:[e.jsxs("div",{className:"flex justify-between items-center mb-1.5 ml-1",children:[e.jsx("label",{className:"text-[10px] font-black text-gray-400 uppercase tracking-widest",children:"Amount to Pay"}),e.jsxs("div",{className:"flex flex-col items-end",children:[e.jsxs("span",{className:"text-[10px] font-black text-gray-400 uppercase tracking-widest",children:["Term Balance: ₦",x(((la=(ia=M==null?void 0:M.outstandingTerms)==null?void 0:ia.find(t=>t.termId===(A==null?void 0:A.id)))==null?void 0:la.balance)||0)]}),e.jsxs("span",{className:"text-[10px] font-black text-primary uppercase tracking-widest",children:["Max (Total Debt): ₦",x((M==null?void 0:M.grandTotal)||0)]})]})]}),e.jsxs("div",{className:"relative",children:[e.jsx("span",{className:"absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-400",children:"₦"}),e.jsx("input",{type:"number",value:Y,onChange:t=>xe(t.target.value),className:"w-full pl-8 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary font-black text-xl text-gray-900 transition-all placeholder:text-gray-200",placeholder:"0.00"})]})]}),e.jsxs("div",{className:"grid grid-cols-2 gap-4",children:[e.jsxs("div",{children:[e.jsx("label",{className:"block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1",children:"Method"}),e.jsxs("select",{value:pe,onChange:t=>re(t.target.value),className:"w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary font-bold text-sm transition-all",children:[e.jsx("option",{value:"cash",children:"Cash"}),e.jsx("option",{value:"bank_transfer",children:"Bank Transfer"}),e.jsx("option",{value:"pos",children:"POS"}),e.jsx("option",{value:"cheque",children:"Cheque"})]})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1",children:"Reference No."}),e.jsx("input",{type:"text",value:Q,onChange:t=>ie(t.target.value),className:"w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary font-bold text-sm transition-all",placeholder:"e.g. Teller #"})]})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1",children:"Notes"}),e.jsx("textarea",{value:he,onChange:t=>le(t.target.value),className:"w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium text-sm transition-all",rows:"2",placeholder:"Add additional details..."})]})]})]}),e.jsxs("div",{className:"p-4 bg-gray-50 flex justify-end gap-3 rounded-b-2xl sm:rounded-b-xl shrink-0",children:[e.jsx("button",{onClick:()=>te(null),className:"flex-1 sm:flex-none px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50 transition-colors",children:"Cancel"}),!E&&e.jsx("button",{onClick:()=>ss(H.id),disabled:Ae||Ke,className:`flex-1 sm:flex-none px-6 py-2.5 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:brightness-95 active:scale-95 transition-all flex items-center justify-center gap-2 ${Ae||Ke?"opacity-70 cursor-not-allowed":""}`,children:Ae||Ke?e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"}),Ke?"Recording...":"Verifying..."]}):"Record Payment"})]})]})}),ye&&e.jsx("div",{className:"fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100] p-4 pb-24 sm:pb-4",children:e.jsxs("div",{className:"bg-white rounded-[32px] shadow-2xl w-full max-w-md max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in duration-300",children:[e.jsxs("div",{className:"p-6 bg-gradient-to-br from-primary to-primary/90 text-white shrink-0",children:[e.jsxs("div",{className:"flex justify-between items-start mb-4",children:[e.jsxs("div",{children:[e.jsx("h3",{className:"text-2xl font-black italic tracking-tighter uppercase mb-1",children:"Record Payment"}),e.jsx("p",{className:"text-primary-100 text-xs font-bold uppercase tracking-widest",children:ye.fee.title})]}),e.jsx("button",{onClick:()=>st(null),className:"p-2 hover:bg-white/10 rounded-full transition-colors",children:e.jsx("svg",{className:"w-6 h-6",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M6 18L18 6M6 6l12 12"})})})]}),e.jsxs("div",{className:"bg-white/10 rounded-2xl p-4 border border-white/20",children:[e.jsx("p",{className:"text-[10px] font-black uppercase tracking-widest text-primary-100 mb-1",children:"Student"}),e.jsx("p",{className:"font-bold text-lg",children:ye.student.name}),e.jsxs("div",{className:"flex justify-between mt-2 pt-2 border-t border-white/10",children:[e.jsxs("div",{className:"text-xs",children:[e.jsx("span",{className:"text-primary-100",children:"Fee Amount:"}),e.jsxs("span",{className:"font-bold ml-1",children:["₦",x(ye.fee.amount||0)]})]}),e.jsxs("div",{className:"text-xs",children:[e.jsx("span",{className:"text-primary-100",children:"Balance:"}),e.jsxs("span",{className:"font-bold ml-1",children:["₦",x(ye.student.balance||0)]})]})]})]})]}),e.jsxs("form",{onSubmit:Za,className:"flex flex-col flex-1 overflow-hidden",children:[e.jsxs("div",{className:"p-6 sm:p-8 space-y-4 overflow-y-auto flex-1",children:[e.jsxs("div",{className:"space-y-2",children:[e.jsx("label",{className:"text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1",children:"Payment Amount (₦)"}),e.jsx("input",{type:"number",required:!0,value:ne.amount,onChange:t=>We({...ne,amount:t.target.value}),placeholder:"0.00",className:"w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-xl font-black focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all"})]}),e.jsxs("div",{className:"grid grid-cols-2 gap-4",children:[e.jsxs("div",{className:"space-y-2",children:[e.jsx("label",{className:"text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1",children:"Method"}),e.jsxs("select",{value:ne.paymentMethod,onChange:t=>We({...ne,paymentMethod:t.target.value}),className:"w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-primary/5 outline-none transition-all",children:[e.jsx("option",{value:"cash",children:"Cash"}),e.jsx("option",{value:"bank",children:"Bank Transfer"}),e.jsx("option",{value:"online",children:"Online"})]})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx("label",{className:"text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1",children:"Receipt No."}),e.jsx("input",{type:"text",value:ne.receiptNumber,onChange:t=>We({...ne,receiptNumber:t.target.value}),placeholder:"Optional",className:"w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-primary/5 outline-none transition-all"})]})]})]}),e.jsxs("div",{className:"flex gap-4 p-6 sm:p-8 pt-4 border-t border-gray-100 shrink-0",children:[e.jsx("button",{type:"button",onClick:()=>st(null),className:"flex-1 py-4 rounded-2xl font-black text-sm text-gray-500 hover:bg-gray-50 transition-all uppercase tracking-widest",children:"Cancel"}),!E&&e.jsx("button",{type:"submit",disabled:gt,className:"flex-3 bg-gray-900 text-white py-4 px-8 rounded-2xl font-black text-sm hover:bg-black active:scale-95 transition-all shadow-xl shadow-gray-200 uppercase tracking-widest disabled:opacity-50",children:gt?"Recording...":"Record Payment"})]})]})]})}),Ba&&V&&e.jsx("div",{className:"fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-2 sm:p-4 overflow-hidden",children:e.jsxs("div",{className:"bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col border border-white/20",children:[e.jsxs("div",{className:"p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50",children:[e.jsx("h2",{className:"text-xl font-black text-gray-900 italic tracking-tighter uppercase",children:"Payment History"}),e.jsx("button",{onClick:()=>et(!1),className:"p-2 hover:bg-gray-100 rounded-full transition-colors",children:e.jsx("svg",{className:"w-6 h-6 text-gray-400",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M6 18L18 6M6 6l12 12"})})})]}),e.jsx("div",{className:"p-4 sm:p-6 bg-slate-50 border-b border-gray-100",children:e.jsxs("div",{className:"grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm",children:[e.jsxs("div",{className:"col-span-2 lg:col-span-1",children:[e.jsx("span",{className:"block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1",children:"Student Name"}),e.jsxs("span",{className:"font-bold text-gray-900 truncate block",children:[((na=V.user)==null?void 0:na.firstName)||"Unknown"," ",((oa=V.user)==null?void 0:oa.lastName)||""]})]}),e.jsxs("div",{children:[e.jsx("span",{className:"block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1",children:"Admission No"}),e.jsx("span",{className:"font-bold text-gray-900",children:V.admissionNumber})]}),e.jsxs("div",{children:[e.jsx("span",{className:"block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1",children:"Total Paid"}),e.jsxs("span",{className:"font-black text-green-600",children:["₦",x(((da=V.feeRecords[0])==null?void 0:da.paidAmount)||0)]})]}),e.jsxs("div",{children:[e.jsx("span",{className:"block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1",children:"Outstanding"}),e.jsxs("span",{className:"font-black text-red-600",children:["₦",x(((ca=V.feeRecords[0])==null?void 0:ca.balance)||0)]})]})]})}),e.jsxs("div",{className:"p-4 sm:p-6 overflow-y-auto flex-1",children:[e.jsx("div",{className:"mb-4 flex items-center justify-between",children:e.jsxs("p",{className:"text-xs sm:text-sm text-gray-500 italic",children:["📝 Use ",e.jsx("strong",{children:"Edit"})," to update payment records."]})}),!Array.isArray(tt)||tt.length===0?e.jsxs("div",{className:"flex flex-col items-center justify-center py-16 text-gray-500 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 mx-4",children:[e.jsx("div",{className:"text-4xl mb-2",children:"💸"}),e.jsx("p",{className:"font-bold text-gray-600",children:"No Payment History Found"}),e.jsx("p",{className:"text-sm",children:"No recorded payments match the current filter criteria."})]}):e.jsx("div",{className:"overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0",children:e.jsxs("table",{className:"min-w-full divide-y divide-gray-200",children:[e.jsx("thead",{className:"bg-gray-50",children:e.jsxs("tr",{children:[e.jsx("th",{className:"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase",children:"Date"}),e.jsx("th",{className:"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase",children:"Term"}),e.jsx("th",{className:"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase",children:"Amount"}),e.jsx("th",{className:"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase",children:"Method"}),e.jsx("th",{className:"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase",children:"Ref"}),e.jsx("th",{className:"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase",children:"Recorder"}),e.jsx("th",{className:"px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase",children:"Actions"})]})}),e.jsx("tbody",{className:"divide-y divide-gray-200",children:(Array.isArray(tt)?tt:[]).map(t=>{var a,s,r,i;return e.jsxs("tr",{children:[e.jsx("td",{className:"px-6 py-4 whitespace-nowrap text-sm text-gray-900",children:new Date(t.paymentDate).toLocaleDateString()}),e.jsx("td",{className:"px-6 py-4 whitespace-nowrap text-sm text-indigo-600 font-bold",children:((s=(a=t.FeeRecord)==null?void 0:a.Term)==null?void 0:s.name)||"-"}),e.jsxs("td",{className:"px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600",children:["₦",x(t.amount)]}),e.jsx("td",{className:"px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize",children:t.paymentMethod}),e.jsx("td",{className:"px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono",children:t.reference||"-"}),e.jsxs("td",{className:"px-6 py-4 whitespace-nowrap text-sm text-gray-500",children:[(r=t.recordedByUser)==null?void 0:r.firstName," ",(i=t.recordedByUser)==null?void 0:i.lastName]}),e.jsxs("td",{className:"px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-2",children:[e.jsxs("button",{onClick:()=>xs(t,V),className:"inline-flex items-center px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors border border-indigo-100",title:"Regenerate payment receipt",children:[e.jsx("span",{className:"mr-1",children:"📄"})," Receipt"]}),!E&&e.jsxs(e.Fragment,{children:[e.jsxs("button",{onClick:()=>{console.log("Editing payment:",t),ns(t)},className:"inline-flex items-center px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-sm font-bold text-xs",children:[e.jsx("span",{className:"mr-1",children:"✏️"})," Edit"]}),e.jsxs("button",{onClick:()=>is(t.id),className:"inline-flex items-center px-4 py-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white transition-all border border-rose-100 font-bold text-xs",title:"Delete this payment",children:[e.jsx("span",{className:"mr-1",children:"🗑️"})," Delete"]})]})]})]},t.id)})})]})})]}),e.jsx("div",{className:"p-6 border-t border-gray-200 bg-gray-50 flex justify-end",children:e.jsx("button",{onClick:()=>et(!1),className:"px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300",children:"Close"})})]})}),Xe&&e.jsx("div",{className:"fixed inset-0 bg-slate-900/80 backdrop-blur-md overflow-y-auto h-full w-full flex justify-center items-center z-[2000] p-4",children:e.jsxs("div",{className:"bg-white p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-md border border-white/20 transform transition-all",children:[e.jsx("h2",{className:"text-xl font-bold mb-4",children:"Edit Payment"}),e.jsxs("div",{className:"space-y-4",children:[e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-medium text-gray-700 mb-1",children:"Amount (₦)"}),e.jsx("input",{type:"number",value:Y,onChange:t=>xe(t.target.value),className:"w-full p-2 border rounded focus:ring-primary focus:border-primary"})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-medium text-gray-700 mb-1",children:"Payment Method"}),e.jsxs("select",{value:pe,onChange:t=>re(t.target.value),className:"w-full p-2 border rounded focus:ring-primary focus:border-primary",children:[e.jsx("option",{value:"cash",children:"Cash"}),e.jsx("option",{value:"bank_transfer",children:"Bank Transfer"}),e.jsx("option",{value:"pos",children:"POS"}),e.jsx("option",{value:"cheque",children:"Cheque"}),e.jsx("option",{value:"online",children:"Online"})]})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-medium text-gray-700 mb-1",children:"Reference No."}),e.jsx("input",{type:"text",value:Q,onChange:t=>ie(t.target.value),className:"w-full p-2 border rounded focus:ring-primary focus:border-primary"})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-medium text-gray-700 mb-1",children:"Notes"}),e.jsx("textarea",{value:he,onChange:t=>le(t.target.value),className:"w-full p-2 border rounded focus:ring-primary focus:border-primary",rows:"2"})]})]}),e.jsxs("div",{className:"mt-6 flex justify-end gap-3",children:[e.jsx("button",{onClick:()=>mt(null),className:"px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300",children:"Cancel"}),!E&&e.jsx("button",{onClick:rs,className:"px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700",children:"Update Payment"})]})]})}),Ta&&Pe&&e.jsx("div",{className:"fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-[70]",children:e.jsxs("div",{className:"bg-white p-6 rounded-lg shadow-xl w-full max-w-md",children:[e.jsx("h2",{className:"text-xl font-bold mb-4 text-red-600",children:"🛑 Examination Card Restriction"}),e.jsxs("p",{className:"text-gray-600 mb-4",children:["Manage restriction for ",e.jsxs("strong",{children:[((ma=Pe.user)==null?void 0:ma.firstName)||"Unknown"," ",((xa=Pe.user)==null?void 0:xa.lastName)||""]})," (",Pe.admissionNumber,")."]}),e.jsxs("div",{className:"space-y-4",children:[e.jsxs("div",{className:"flex items-center gap-2 p-3 bg-red-50 rounded-md border border-red-100",children:[e.jsx("input",{type:"checkbox",id:"isExamRestricted",checked:Dt,onChange:t=>Ua(t.target.checked),className:"w-5 h-5 text-red-600 rounded focus:ring-red-500"}),e.jsx("label",{htmlFor:"isExamRestricted",className:"font-medium text-red-900 cursor-pointer",children:"Block Examination Card Access"})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-medium text-gray-700 mb-1",children:"Reason for Restriction"}),e.jsx("textarea",{value:Lt,onChange:t=>Oa(t.target.value),className:"w-full p-2 border rounded focus:ring-red-500 focus:border-red-500",rows:"3",placeholder:"e.g. Outstanding Fees, Disciplinary Action, etc."}),e.jsx("p",{className:"text-xs text-gray-500 mt-1",children:"This reason will be visible to the student when they try to print their card."})]})]}),e.jsxs("div",{className:"mt-6 flex justify-end gap-3",children:[e.jsx("button",{onClick:()=>zt(!1),className:"px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300",children:"Cancel"}),!E&&e.jsx("button",{onClick:Ja,className:"px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-medium",children:"Save Restriction"})]})]})}),T&&e.jsx("div",{className:"fixed inset-0 bg-gray-900/60 backdrop-blur-sm overflow-y-auto h-full w-full flex justify-center items-end sm:items-center z-[80] p-0 sm:p-4",children:e.jsxs("div",{className:"bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col",children:[e.jsxs("div",{className:"p-5 border-b border-gray-100 flex justify-between items-center shrink-0",children:[e.jsxs("div",{children:[e.jsxs("h2",{className:"text-lg font-black text-gray-900 uppercase tracking-tight flex items-center gap-2",children:[e.jsx("span",{className:"text-orange-500",children:"⚙️"})," Adjust Term Fee"]}),e.jsxs("p",{className:"text-xs text-gray-400 font-bold mt-0.5",children:[(pa=T.student.user)==null?void 0:pa.firstName," ",(ha=T.student.user)==null?void 0:ha.lastName," • ",T.student.admissionNumber]})]}),e.jsx("button",{onClick:()=>Ue(null),className:"p-2 hover:bg-gray-100 rounded-full transition-colors",children:e.jsx("svg",{className:"w-5 h-5 text-gray-400",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M6 18L18 6M6 6l12 12"})})})]}),e.jsxs("div",{className:"p-5 overflow-y-auto flex-1 space-y-5",children:[e.jsxs("div",{className:"bg-slate-50 rounded-xl p-4 border border-slate-100",children:[e.jsx("h4",{className:"text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3",children:"Current Fee Breakdown"}),e.jsxs("div",{className:"space-y-2 text-sm",children:[e.jsxs("div",{className:"flex justify-between",children:[e.jsx("span",{className:"text-gray-500",children:"Previous Balance (Arrears):"}),e.jsxs("span",{className:"font-bold text-gray-700",children:["₦",x(((ga=T.record)==null?void 0:ga.openingBalance)||0)]})]}),e.jsxs("div",{className:"flex justify-between",children:[e.jsx("span",{className:"text-gray-500",children:"Current Term Fee:"}),e.jsxs("span",{className:"font-bold text-gray-700",children:["₦",x(((ua=T.record)==null?void 0:ua.expectedAmount)||0)]})]}),e.jsxs("div",{className:"flex justify-between border-t pt-2 border-slate-200",children:[e.jsx("span",{className:"text-gray-600 font-semibold",children:"Total Due:"}),e.jsxs("span",{className:"font-black text-gray-900",children:["₦",x((((fa=T.record)==null?void 0:fa.openingBalance)||0)+(((ba=T.record)==null?void 0:ba.expectedAmount)||0))]})]}),e.jsxs("div",{className:"flex justify-between",children:[e.jsx("span",{className:"text-green-600 font-semibold",children:"Total Paid:"}),e.jsxs("span",{className:"font-black text-green-600",children:["₦",x(((ya=T.record)==null?void 0:ya.paidAmount)||0)]})]}),e.jsxs("div",{className:"flex justify-between border-t pt-2 border-slate-200",children:[e.jsx("span",{className:"text-gray-600 font-bold",children:"Current Balance:"}),e.jsxs("span",{className:`font-black ${(((va=T.record)==null?void 0:va.balance)||0)>0?"text-red-600":"text-emerald-600"}`,children:["₦",x(((wa=T.record)==null?void 0:wa.balance)||0)]})]})]})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1",children:"New Term Fee Amount (₦)"}),e.jsxs("div",{className:"relative",children:[e.jsx("span",{className:"absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400",children:"₦"}),e.jsx("input",{type:"number",value:ht,onChange:t=>Bt(t.target.value),className:"w-full pl-10 pr-4 py-3 bg-white border-2 border-orange-200 rounded-xl focus:ring-4 focus:ring-orange-100 focus:border-orange-400 font-black text-xl transition-all",placeholder:"0.00"})]})]}),(()=>{var u,c,d,n;const t=parseFloat(ht)||0,a=((u=T.record)==null?void 0:u.openingBalance)||0,s=((c=T.record)==null?void 0:c.paidAmount)||0,r=a+t-s,i=((d=T.record)==null?void 0:d.balance)||0,l=r-i;return e.jsxs("div",{className:`rounded-xl p-4 border-2 transition-all ${l===0?"bg-gray-50 border-gray-100":l<0?"bg-emerald-50 border-emerald-200":"bg-orange-50 border-orange-200"}`,children:[e.jsx("h4",{className:"text-[10px] font-black uppercase tracking-widest mb-3 text-gray-500",children:"Preview After Adjustment"}),e.jsxs("div",{className:"grid grid-cols-3 gap-3 text-center",children:[e.jsxs("div",{children:[e.jsx("p",{className:"text-[9px] font-black text-gray-400 uppercase mb-1",children:"Old Fee"}),e.jsxs("p",{className:"text-sm font-black text-gray-600",children:["₦",x(((n=T.record)==null?void 0:n.expectedAmount)||0)]})]}),e.jsxs("div",{children:[e.jsx("p",{className:"text-[9px] font-black text-gray-400 uppercase mb-1",children:"New Fee"}),e.jsxs("p",{className:"text-sm font-black text-orange-600",children:["₦",x(t)]})]}),e.jsxs("div",{children:[e.jsx("p",{className:"text-[9px] font-black text-gray-400 uppercase mb-1",children:"New Balance"}),e.jsxs("p",{className:`text-sm font-black ${r>0?"text-red-600":"text-emerald-600"}`,children:["₦",x(r)]})]})]}),l!==0&&e.jsxs("p",{className:`text-center text-xs font-bold mt-3 pt-2 border-t ${l<0?"text-emerald-600 border-emerald-200":"text-orange-600 border-orange-200"}`,children:["Balance will ",l<0?"decrease":"increase"," by ₦",x(Math.abs(l))]})]})})(),e.jsxs("div",{className:"bg-blue-50 border border-blue-100 rounded-xl p-3 flex gap-3 items-start",children:[e.jsx("svg",{className:"w-5 h-5 text-blue-500 shrink-0 mt-0.5",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"})}),e.jsxs("div",{children:[e.jsx("p",{className:"text-xs font-bold text-blue-800",children:"Need to correct a payment amount?"}),e.jsxs("p",{className:"text-[11px] text-blue-600 mt-0.5",children:["Use ",e.jsx("strong",{children:"Payment History → Edit"})," on the specific payment entry. This keeps your records accurate and maintains an audit trail."]})]})]})]}),e.jsxs("div",{className:"p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between shrink-0",children:[!E&&e.jsx("button",{onClick:()=>ls(T.student.id),className:"px-4 py-2.5 bg-rose-50 text-rose-600 text-[10px] font-black uppercase rounded-xl border border-rose-100 hover:bg-rose-600 hover:text-white transition-all shadow-sm shadow-rose-100",children:"Reset Student Ledger"}),e.jsxs("div",{className:"flex gap-3",children:[e.jsx("button",{onClick:()=>Ue(null),className:"px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50 transition-colors",children:"Cancel"}),!E&&e.jsx("button",{onClick:qa,disabled:fe,className:"px-6 py-2.5 bg-orange-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-200 hover:bg-orange-600 active:scale-95 transition-all flex items-center gap-2",children:fe?e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"}),"Saving..."]}):"Update Fee Amount"})]})]})]})}),$t&&At&&e.jsx(us,{isOpen:$t,onClose:()=>{Ee(!1),Re(null),Fe(null)},student:At,currentPayment:Ia,currentTerm:w,currentSession:j,allTerms:W,allSessions:q}),St&&Rt&&e.jsx(fs,{isOpen:St,onClose:()=>{Et(!1),Ft(null)},student:Rt,currentTerm:w,currentSession:j}),Ya&&e.jsx("div",{className:"fixed inset-0 bg-gray-900 bg-opacity-60 backdrop-blur-sm overflow-y-auto h-full w-full flex justify-center items-center z-[100] p-4",children:e.jsxs("div",{className:"bg-white rounded-2xl shadow-2xl w-full max-w-2xl transform transition-all animate-in fade-in zoom-in duration-200",children:[e.jsxs("div",{className:"flex justify-between items-center p-6 border-b border-gray-100",children:[e.jsxs("div",{children:[e.jsx("h2",{className:"text-xl font-black text-gray-900 uppercase tracking-tight",children:"Create Fee Structure"}),e.jsx("p",{className:"text-xs font-bold text-gray-400 uppercase tracking-widest mt-1",children:"Configure new custom charge"})]}),e.jsx("button",{onClick:()=>rt(!1),className:"p-2 hover:bg-gray-100 rounded-full transition-colors",children:e.jsx("svg",{className:"w-6 h-6 text-gray-400",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M6 18L18 6M6 6l12 12"})})})]}),e.jsxs("form",{onSubmit:Xa,className:"p-6",children:[e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-6 mb-6",children:[e.jsxs("div",{className:"md:col-span-2",children:[e.jsx("label",{className:"block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1",children:"Fee Title"}),e.jsx("input",{type:"text",required:!0,value:G.title,onChange:t=>$e({...G,title:t.target.value}),className:"w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-primary/5 outline-none transition-all",placeholder:"e.g., Computer Lab Maintenance, Anniversary Cloth"})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1",children:"Amount (₦)"}),e.jsx("input",{type:"number",required:!0,value:G.amount,onChange:t=>$e({...G,amount:t.target.value}),className:"w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-primary/5 outline-none transition-all font-mono",placeholder:"0.00"})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1",children:"Fee Type"}),e.jsx("div",{className:"flex gap-4 items-center h-[52px]",children:e.jsxs("label",{className:"inline-flex items-center cursor-pointer",children:[e.jsx("input",{type:"checkbox",checked:G.isCompulsory,onChange:t=>$e({...G,isCompulsory:t.target.checked}),className:"sr-only peer"}),e.jsx("div",{className:"relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"}),e.jsx("span",{className:"ms-3 text-xs font-bold text-gray-700 uppercase tracking-tighter",children:"Compulsory Fee"})]})})]}),e.jsxs("div",{className:"md:col-span-2",children:[e.jsx("label",{className:"block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1",children:"Description (Optional)"}),e.jsx("textarea",{value:G.description,onChange:t=>$e({...G,description:t.target.value}),className:"w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-primary/5 outline-none transition-all resize-none",rows:"2",placeholder:"Briefly describe what this fee covers..."})]}),e.jsxs("div",{className:"md:col-span-2",children:[e.jsx("label",{className:"block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1",children:"Applicable Classes"}),e.jsx("div",{className:"grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100 max-h-60 overflow-y-auto",children:(Array.isArray(Me)?Me:[]).map(t=>e.jsxs("div",{onClick:()=>Ka(t.id),className:`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${G.classIds.includes(t.id.toString())?"bg-primary border-primary text-white shadow-md shadow-primary/20 scale-[1.02]":"bg-white border-gray-100 text-gray-600 hover:border-primary/30"}`,children:[e.jsx("div",{className:`w-4 h-4 rounded flex items-center justify-center border ${G.classIds.includes(t.id.toString())?"bg-white border-white":"border-gray-300"}`,children:G.classIds.includes(t.id.toString())&&e.jsx("svg",{className:"w-3 h-3 text-primary",fill:"currentColor",viewBox:"0 0 20 20",children:e.jsx("path",{fillRule:"evenodd",d:"M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z",clipRule:"evenodd"})})}),e.jsxs("span",{className:"text-[11px] font-black uppercase tracking-tighter",children:[t.name," ",t.arm]})]},t.id))})]})]}),e.jsxs("div",{className:"flex justify-end gap-3 mt-8",children:[e.jsx("button",{type:"button",onClick:()=>rt(!1),className:"px-6 py-3 bg-gray-100 text-gray-900 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-gray-200 transition-all",children:"Cancel"}),e.jsx("button",{type:"submit",disabled:Ht,className:"px-8 py-3 bg-primary text-white rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-primary/20 hover:brightness-95 active:scale-95 transition-all disabled:opacity-50",children:Ht?"Processing...":"Create Basic Fee"})]})]})]})})]})}export{Fs as default};
