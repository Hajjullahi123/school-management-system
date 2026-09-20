import{j as e}from"./chart-vendor-BYY-65EX.js";import"./FileSaver.min-D0dQec9w.js";import{s as fe}from"./mobileDownload-CZXh0UZT.js";import{a as m}from"./react-vendor-C00C9m_W.js";import{b as xe,u as ge,a as y,n,A as Z}from"./index-CR2UoQBu.js";import{h as he,E as be}from"./doc-vendor-BZnDaIDN.js";import"./icons-az3e4FRa.js";const Ce=()=>{var _,Y,K;const{user:P}=xe(),{settings:s}=ge(),B=!["admin","superadmin","proprietor","accountant"].includes((_=P==null?void 0:P.role)==null?void 0:_.toLowerCase()),[z,ee]=m.useState([]),[ye,te]=m.useState([]),[H,ae]=m.useState([]),[l,se]=m.useState(null),[S,ie]=m.useState([]),[W,q]=m.useState(!1),[F,M]=m.useState(!1),[I,oe]=m.useState(""),[A,re]=m.useState(""),[p,k]=m.useState({feeId:"",amount:"",paymentMethod:"cash",receiptNumber:""}),[R,G]=m.useState(!1);m.useEffect(()=>{ne(),de(),E()},[]);const ne=async()=>{try{const t=await y.get("/api/students");if(t.ok){const a=await t.json();ee(a)}}catch(t){console.error("Error fetching students:",t),n.error("Failed to load students")}},de=async()=>{try{const t=await y.get("/api/misc-fees");if(t.ok){const a=await t.json();te(a)}}catch(t){console.error("Error fetching fees:",t),n.error("Failed to load fees")}},E=async()=>{try{const t=await y.get("/api/misc-fees/payments");if(t.ok){const a=await t.json();ae(a)}}catch(t){console.error("Error fetching payments:",t),n.error("Failed to load payment history")}},L=async t=>{try{const a=z.find(d=>d.id===parseInt(t));se(a);const i=await y.get(`/api/misc-fees/student/${t}`);if(i.ok){const d=await i.json();ie(d),M(!1)}else n.error("Failed to load student fee details")}catch(a){console.error("Error fetching student fees:",a),n.error("An unexpected error occurred")}},le=async t=>{t.preventDefault(),q(!0);try{const a=await y.post("/api/misc-fees/payments",{studentId:l.id,...p,amount:parseFloat(p.amount)});if(a.ok)n.success("Payment recorded successfully!"),L(l.id),E(),J();else{const i=await a.json();n.error(i.error||"Failed to record payment")}}catch(a){console.error("Error recording payment:",a),n.error("An unexpected error occurred")}finally{q(!1)}},J=()=>{k({feeId:"",amount:"",paymentMethod:"cash",receiptNumber:""}),M(!1)},ce=async t=>{var i,d,v,w,f,x,g;if(R)return;G(!0);const a=n.loading("Generating Receipt PDF...");try{const h=await y.get(`/api/misc-fees/receipt/${t}`);if(!h.ok){const O=await h.json();throw new Error(O.error||"Failed to fetch receipt data")}const r=await h.json(),b=(s==null?void 0:s.primaryColor)||"#0f766e",U=s!=null&&s.logoUrl?s.logoUrl.startsWith("http")?s.logoUrl:`${Z}${s.logoUrl}`:null,C=((i=r.student)==null?void 0:i.id)||"N/A",N=btoa(`MISC-${r.id}-${C}`).substring(0,12).toUpperCase(),o=`MISC-${r.id}`,c=`https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(o)}&scale=3&rotate=N&includetext=true&backgroundcolor=ffffff&height=12`,Q=`
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
            .header { background: ${b}; padding: 3mm 4mm; color: white; display: flex; justify-content: space-between; align-items: center; }
            .school-info h1 { margin: 0; font-size: 10px; text-transform: uppercase; }
            .school-info p { margin: 1mm 0 0; font-size: 7px; opacity: 0.9; }
            .badge { background: white; color: ${b}; padding: 1mm 2mm; border-radius: 1mm; font-size: 8px; font-weight: 800; }
            .body { padding: 4mm; flex: 1; display: flex; flex-direction: column; }
            .id-line { display: flex; justify-content: space-between; font-size: 8px; font-weight: 700; color: #64748b; margin-bottom: 3mm; }
            .section-title { font-size: 8px; font-weight: 800; color: ${b}; text-transform: uppercase; margin-bottom: 2mm; border-bottom: 0.2mm solid ${b}20; }
            .info-group { margin-bottom: 2mm; }
            .info-label { font-size: 7px; color: #94a3b8; text-transform: uppercase; font-weight: 800; }
            .info-value { font-size: 9px; font-weight: 700; color: #0f172a; }
            .amount-section { background: #f8fafc; border-radius: 2mm; padding: 3mm; text-align: center; border: 0.5mm dashed #e2e8f0; margin: 3mm 0; }
            .amount-val { font-size: 18px; font-weight: 800; color: ${b}; }
            .barcode { max-width: 40mm; height: auto; margin: 2mm auto; display: block; }
            .footer { margin-top: auto; display: flex; justify-content: space-between; align-items: center; padding-top: 2mm; border-top: 0.2mm solid #f1f5f9; }
            .hash { font-size: 7px; color: #64748b; background: #f1f5f9; padding: 0.5mm 1mm; }
          </style>
        </head>
        <body>
          <div id="misc-receipt-capture" class="receipt-card">
            <div class="header">
              <div class="school-info">
                <h1>${(s==null?void 0:s.schoolName)||"SMS"}</h1>
                <p>${((d=s==null?void 0:s.schoolAddress)==null?void 0:d.substring(0,30))||""}</p>
              </div>
              <div class="badge">MISC</div>
            </div>
            <div class="body">
              <div class="id-line">
                <span>NO: ${r.receiptNumber||r.id}</span>
                <span>${new Date(r.paymentDate).toLocaleDateString()}</span>
              </div>
              <div class="section-title">Student</div>
              <div class="info-group">
                <div class="info-label">Name</div>
                <div class="info-value">${((w=(v=r.student)==null?void 0:v.user)==null?void 0:w.firstName)||"Student"} ${((x=(f=r.student)==null?void 0:f.user)==null?void 0:x.lastName)||""}</div>
              </div>
              <div class="section-title">Payment</div>
              <div class="info-group">
                <div class="info-label">Fee Title</div>
                <div class="info-value">${((g=r.fee)==null?void 0:g.title)||"Misc Fee"}</div>
              </div>
              <div class="amount-section">
                <div class="amount-val">₦${(r.amount||0).toLocaleString()}</div>
              </div>
              <img src="${c}" class="barcode" />
              <div class="footer">
                <div class="hash">${N}</div>
                <div style="font-size: 6px; color: #94a3b8;">${new Date().toLocaleTimeString()}</div>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,j=document.createElement("iframe");j.style.position="fixed",j.style.visibility="hidden",document.body.appendChild(j);const $=j.contentWindow.document;$.open(),$.write(Q),$.close(),await new Promise(O=>setTimeout(O,1500));const T=$.getElementById("misc-receipt-capture"),u=(await he(T,{scale:3,useCORS:!0})).toDataURL("image/png"),D=new be({orientation:"p",unit:"mm",format:[74,100]});D.addImage(u,"PNG",0,0,74,100),fe(D,`MiscReceipt-${r.receiptNumber||r.id}.pdf`),document.body.removeChild(j),n.success("Receipt downloaded successfully",{id:a})}catch(h){console.error("PDF Generation failed:",h),n.error("Failed to generate PDF receipt",{id:a})}finally{G(!1)}},me=async t=>{var a,i,d,v,w,f,x,g,h,r,b,U,C;try{const N=await y.get(`/api/misc-fees/receipt/${t}`);if(!N.ok){const D=await N.json();throw new Error(D.error||"Failed to fetch receipt data")}const o=await N.json(),c=(s==null?void 0:s.primaryColor)||"#0f766e",Q=s!=null&&s.logoUrl?s.logoUrl.startsWith("http")?s.logoUrl:`${Z}${s.logoUrl}`:null,j=((a=o.student)==null?void 0:a.id)||"N/A",$=btoa(`MISC-${o.id}-${j}`).substring(0,12).toUpperCase(),T=`MISC-${o.id}`,X=`https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(T)}&scale=3&rotate=N&includetext=true&backgroundcolor=ffffff&height=12`,u=window.open("","_blank");u.document.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Receipt - ${((i=o.student)==null?void 0:i.admissionNumber)||"N/A"}</title>
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
            background-image: radial-gradient(${c}05 1px, transparent 1px);
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
            background: linear-gradient(135deg, ${c}, ${c}dd);
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
            color: ${c};
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
            color: ${c};
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
            background: ${c}20;
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
            color: ${c};
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
              <h1>${(s==null?void 0:s.schoolName)||"SMS"}</h1>
              <p>${((d=s==null?void 0:s.schoolAddress)==null?void 0:d.substring(0,30))||"Official Receipt"}</p>
            </div>
            <div class="receipt-badge">MISC</div>
          </div>

          <div class="receipt-body">
            <div class="id-line">
              <span>NO: ${o.receiptNumber||o.id}</span>
              <span>${new Date(o.paymentDate).toLocaleDateString()}</span>
            </div>

            <div class="section-title">Student Details</div>
            <div class="info-group">
              <div class="info-label">Student Name</div>
              <div class="info-value">${((w=(v=o.student)==null?void 0:v.user)==null?void 0:w.firstName)||"Student"} ${((x=(f=o.student)==null?void 0:f.user)==null?void 0:x.lastName)||""} ${((g=o.student)==null?void 0:g.middleName)||""}</div>
            </div>
            <div class="info-row">
              <div class="info-group">
                <div class="info-label">Student ID</div>
                <div class="info-value">${((h=o.student)==null?void 0:h.admissionNumber)||"N/A"}</div>
              </div>
              <div class="info-group">
                <div class="info-label">Class</div>
                <div class="info-value">${((b=(r=o.student)==null?void 0:r.classModel)==null?void 0:b.name)||"N/A"}</div>
              </div>
            </div>

            <div class="section-title" style="margin-top: 1mm;">Payment Info</div>
            <div class="info-group" style="margin-bottom: 1mm;">
              <div class="info-label">Fee Title</div>
              <div class="info-value">${((U=o.fee)==null?void 0:U.title)||"Miscellaneous Fee"}</div>
            </div>
            <div class="info-row">
              <div class="info-group">
                <div class="info-label">Method</div>
                <div class="info-value" style="text-transform: uppercase;">${o.paymentMethod||"CASH"}</div>
              </div>
              <div class="info-group">
                <div class="info-label">Recorded By</div>
                <div class="info-value">STAFF</div>
              </div>
            </div>

            <div class="amount-section">
              <div class="amount-label">Verified Payment</div>
              <div class="amount-value">₦${(o.amount||0).toLocaleString()}</div>
            </div>

            <div style="text-align: center; margin-top: 1mm;">
              <img src="${X}" alt="Barcode" style="max-width: 40mm; height: auto;" />
            </div>

            <div class="signatures">
              <div class="sig-box">
                <div class="sig-line"></div>
                <div class="sig-label">Authorized Signature</div>
              </div>
            </div>

            <div class="security-footer">
              <div class="security-hash-box">${$}</div>
              <div style="font-size: 6px; color: #94a3b8; font-weight: 700;">
                SECURE PRINT • ${new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}
              </div>
            </div>

            <div class="digital-seal">
              <svg width="100%" height="100%" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="55" fill="none" stroke="${c}" stroke-width="2" stroke-dasharray="3,2" />
                <path id="sealPath" d="M 60,60 m -40,0 a 40,40 0 1,1 80,0 a 40,40 0 1,1 -80,0" fill="none"/>
                <text font-size="8" font-weight="800" fill="${c}">
                  <textPath href="#sealPath">AUTHENTIC RECEIPT • ${((C=s==null?void 0:s.schoolName)==null?void 0:C.split(" ")[0])||"SMS"} • </textPath>
                </text>
                <text x="60" y="65" text-anchor="middle" font-size="14" font-weight="900" fill="${c}">VALID</text>
              </svg>
            </div>
          </div>
        </div>

        <div class="no-print" style="margin-top: 10px; display: flex; gap: 8px; justify-content: center;">
          <button onclick="window.print()" style="padding: 6px 12px; background: ${c}; color: white; border: none; border-radius: 4px; font-weight: 800; font-size: 10px; cursor: pointer; text-transform: uppercase;">Print</button>
          <button onclick="window.close()" style="padding: 6px 12px; background: white; color: #475569; border: 1px solid #e2e8f0; border-radius: 4px; font-weight: 800; font-size: 10px; cursor: pointer; text-transform: uppercase;">Close</button>
        </div>
      </body>
      </html>
    `),u.document.close(),u.onload=()=>{setTimeout(()=>{u.print()},300)},u.document.readyState==="complete"&&setTimeout(()=>{u.print&&u.print()},800)}catch(N){n.error("Error generating receipt: "+N.message)}},pe=async t=>{if(window.confirm("Are you sure you want to delete this payment?"))try{const a=await y.delete(`/api/misc-fees/payments/${t}`);if(a.ok)n.success("Payment deleted successfully!"),E(),l&&L(l.id);else{const i=await a.json();n.error(i.error||"Failed to delete payment")}}catch(a){console.error("Error deleting payment:",a),n.error("An unexpected error occurred")}},ue=[...new Set(z.map(t=>{var a;return(a=t.classModel)==null?void 0:a.name}).filter(Boolean))].sort(),V=z.filter(t=>{var f,x,g;if(!t||A&&((f=t.classModel)==null?void 0:f.name)!==A)return!1;const a=((x=t.user)==null?void 0:x.firstName)||"Student",i=((g=t.user)==null?void 0:g.lastName)||"",d=t.middleName||"",v=`${a} ${i} ${d}`.toLowerCase(),w=(t.admissionNumber||"").toLowerCase();return v.includes(I.toLowerCase())||w.includes(I.toLowerCase())});return e.jsxs("div",{className:"p-6",children:[e.jsxs("div",{className:"mb-6",children:[e.jsx("h1",{className:"text-2xl font-bold text-gray-800",children:"Miscellaneous Fee Payments"}),e.jsx("p",{className:"text-gray-600",children:"Record and manage payments for custom fees"})]}),e.jsxs("div",{className:"grid grid-cols-1 lg:grid-cols-3 gap-6",children:[e.jsx("div",{className:"lg:col-span-1",children:e.jsxs("div",{className:"bg-white rounded-lg shadow-md p-4",children:[e.jsx("h2",{className:"font-semibold text-lg mb-4",children:"Select Student"}),e.jsxs("div",{className:"flex flex-col space-y-3 mb-4",children:[e.jsxs("select",{className:"w-full border border-gray-300 rounded-md px-3 py-2",value:A,onChange:t=>re(t.target.value),children:[e.jsx("option",{value:"",children:"All Classes"}),ue.map(t=>e.jsx("option",{value:t,children:t},t))]}),e.jsx("input",{type:"text",placeholder:"Search by name or admission number...",className:"w-full border border-gray-300 rounded-md px-3 py-2",value:I,onChange:t=>oe(t.target.value)})]}),e.jsx("div",{className:"max-h-96 overflow-y-auto space-y-2",children:V.length===0?e.jsx("p",{className:"text-center text-gray-500 py-4",children:"No students found"}):V.map(t=>{var a,i,d;return e.jsxs("div",{onClick:()=>L(t.id),className:`p-3 border rounded cursor-pointer hover:bg-gray-50 transition-colors ${(l==null?void 0:l.id)===t.id?"bg-blue-50 border-blue-500":""}`,children:[e.jsxs("div",{className:"font-bold text-gray-900",children:[((a=t.user)==null?void 0:a.firstName)||"Student"," ",((i=t.user)==null?void 0:i.lastName)||""," ",t.middleName||""]}),e.jsx("div",{className:"text-xs text-gray-400 font-bold uppercase tracking-widest",children:t.admissionNumber||"No ID"}),e.jsx("div",{className:"text-[10px] text-gray-400 mt-1",children:((d=t.classModel)==null?void 0:d.name)||"No Class"})]},t.id)})})]})}),e.jsx("div",{className:"lg:col-span-2",children:l?e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"bg-white rounded-lg shadow-md p-6 mb-4",children:[e.jsxs("div",{className:"flex justify-between items-center mb-4",children:[e.jsxs("h2",{className:"font-semibold text-lg",children:[((Y=l.user)==null?void 0:Y.firstName)||"Student"," ",((K=l.user)==null?void 0:K.lastName)||""," ",l.middleName||"","'s Fees"]}),!B&&e.jsx("button",{onClick:()=>M(!F),className:"bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark text-sm",children:F?"Cancel":"+ Record Payment"})]}),F&&e.jsxs("form",{onSubmit:le,className:"bg-gray-50 p-4 rounded-md mb-4",children:[e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-4",children:[e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-medium text-gray-700 mb-2",children:"Fee *"}),e.jsxs("select",{value:p.feeId,onChange:t=>{const a=S.find(i=>i.id===parseInt(t.target.value));k({...p,feeId:t.target.value,amount:(a==null?void 0:a.balance)||""})},className:"w-full border border-gray-300 rounded-md px-3 py-2",required:!0,children:[e.jsx("option",{value:"",children:"Select fee"}),S.filter(t=>(t.balance||0)>0).map(t=>e.jsxs("option",{value:t.id,children:[t.title," (Balance: ₦",(t.balance||0).toLocaleString(),")"]},t.id))]})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-medium text-gray-700 mb-2",children:"Amount (₦) *"}),e.jsx("input",{type:"number",value:p.amount,onChange:t=>k({...p,amount:t.target.value}),className:"w-full border border-gray-300 rounded-md px-3 py-2",required:!0,min:"0",step:"0.01"})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-medium text-gray-700 mb-2",children:"Payment Method"}),e.jsxs("select",{value:p.paymentMethod,onChange:t=>k({...p,paymentMethod:t.target.value}),className:"w-full border border-gray-300 rounded-md px-3 py-2",children:[e.jsx("option",{value:"cash",children:"Cash"}),e.jsx("option",{value:"bank",children:"Bank Transfer"}),e.jsx("option",{value:"online",children:"Online Payment"})]})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-medium text-gray-700 mb-2",children:"Receipt Number"}),e.jsx("input",{type:"text",value:p.receiptNumber,onChange:t=>k({...p,receiptNumber:t.target.value}),placeholder:"Optional",className:"w-full border border-gray-300 rounded-md px-3 py-2"})]})]}),e.jsxs("div",{className:"flex justify-end space-x-3 mt-4",children:[e.jsx("button",{type:"button",onClick:J,className:"px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50",children:"Cancel"}),e.jsx("button",{type:"submit",disabled:W,className:"px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:bg-gray-400",children:W?"Recording...":"Record Payment"})]})]}),e.jsxs("table",{className:"min-w-full divide-y divide-gray-200",children:[e.jsx("thead",{className:"bg-gray-50",children:e.jsxs("tr",{children:[e.jsx("th",{className:"px-4 py-2 text-left text-xs font-medium text-gray-500",children:"Fee"}),e.jsx("th",{className:"px-4 py-2 text-left text-xs font-medium text-gray-500",children:"Amount"}),e.jsx("th",{className:"px-4 py-2 text-left text-xs font-medium text-gray-500",children:"Paid"}),e.jsx("th",{className:"px-4 py-2 text-left text-xs font-medium text-gray-500",children:"Balance"})]})}),e.jsx("tbody",{className:"bg-white divide-y divide-gray-200",children:S.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:"4",className:"px-4 py-4 text-center text-gray-500",children:"No fees assigned to this student"})}):S.map(t=>e.jsxs("tr",{children:[e.jsx("td",{className:"px-4 py-2",children:t.title}),e.jsxs("td",{className:"px-4 py-2",children:["₦",(t.amount||0).toLocaleString()]}),e.jsxs("td",{className:"px-4 py-2 text-green-600",children:["₦",(t.paid||0).toLocaleString()]}),e.jsx("td",{className:"px-4 py-2",children:e.jsxs("span",{className:(t.balance||0)>0?"text-red-600":"text-green-600",children:["₦",(t.balance||0).toLocaleString()]})})]},t.id))})]})]}),e.jsxs("div",{className:"bg-white rounded-lg shadow-md p-6",children:[e.jsx("h3",{className:"font-semibold text-lg mb-4",children:"Payment History"}),e.jsxs("table",{className:"min-w-full divide-y divide-gray-200",children:[e.jsx("thead",{className:"bg-gray-50",children:e.jsxs("tr",{children:[e.jsx("th",{className:"px-4 py-2 text-left text-xs font-medium text-gray-500",children:"Date"}),e.jsx("th",{className:"px-4 py-2 text-left text-xs font-medium text-gray-500",children:"Fee"}),e.jsx("th",{className:"px-4 py-2 text-left text-xs font-medium text-gray-500",children:"Amount"}),e.jsx("th",{className:"px-4 py-2 text-left text-xs font-medium text-gray-500",children:"Method"}),e.jsx("th",{className:"px-4 py-2 text-left text-xs font-medium text-gray-500",children:"Actions"})]})}),e.jsx("tbody",{className:"bg-white divide-y divide-gray-200",children:H.filter(t=>t.studentId===l.id).length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:"5",className:"px-4 py-4 text-center text-gray-500",children:"No payments recorded yet"})}):H.filter(t=>t.studentId===l.id).map(t=>{var a;return e.jsxs("tr",{children:[e.jsx("td",{className:"px-4 py-2 text-sm",children:t.paymentDate?new Date(t.paymentDate).toLocaleDateString():"N/A"}),e.jsx("td",{className:"px-4 py-2 text-sm",children:((a=t.fee)==null?void 0:a.title)||"Unknown Fee"}),e.jsxs("td",{className:"px-4 py-2 text-sm",children:["₦",(t.amount||0).toLocaleString()]}),e.jsx("td",{className:"px-4 py-2 text-sm capitalize",children:t.paymentMethod||"Cash"}),e.jsx("td",{className:"px-4 py-2 text-sm",children:e.jsxs("div",{className:"flex space-x-2",children:[e.jsxs("button",{onClick:()=>ce(t.id),disabled:R,className:"text-blue-600 hover:text-blue-800 flex items-center gap-1",children:[R?e.jsx("div",{className:"w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin"}):e.jsx("span",{children:"💾"}),"Download"]}),e.jsx("button",{onClick:()=>me(t.id),className:"text-gray-500 hover:text-gray-700",children:"Print"}),!B&&e.jsx("button",{onClick:()=>pe(t.id),className:"text-red-600 hover:text-red-800",children:"Delete"})]})})]},t.id)})})]})]})]}):e.jsx("div",{className:"bg-white rounded-lg shadow-md p-6 text-center text-gray-500",children:"Please select a student to view their fee details"})})]})]})};export{Ce as default};
