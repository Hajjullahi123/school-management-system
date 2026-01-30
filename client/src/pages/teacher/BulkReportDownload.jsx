import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import useSchoolSettings from '../../hooks/useSchoolSettings';

const BulkReportDownload = () => {
  const { user } = useAuth();
  const { settings: schoolSettings } = useSchoolSettings();
  const [classes, setClasses] = useState([]);
  const [terms, setTerms] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [startAdmission, setStartAdmission] = useState('');
  const [endAdmission, setEndAdmission] = useState('');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);

  const [downloading, setDownloading] = useState(false);
  const [viewingReport, setViewingReport] = useState(null);

  useEffect(() => {
    fetchClasses();
    fetchTerms();
  }, []);

  const fetchClasses = async () => {
    try {
      const response = await api.get('/api/classes');
      const data = await response.json();
      const classesArray = Array.isArray(data) ? data : [];

      if (user.role === 'teacher') {
        const teacherClasses = classesArray.filter(c => c.classTeacherId === user.id);
        setClasses(teacherClasses);
        if (teacherClasses.length === 1) {
          setSelectedClass(teacherClasses[0].id.toString());
        }
      } else {
        setClasses(classesArray);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchTerms = async () => {
    try {
      const response = await api.get('/api/terms');
      const data = await response.json();
      const termsArray = Array.isArray(data) ? data : [];
      setTerms(termsArray);
      const currentTerm = termsArray.find(t => t.isCurrent);
      if (currentTerm) {
        setSelectedTerm(currentTerm.id.toString());
      }
    } catch (error) {
      console.error('Error fetching terms:', error);
    }
  };

  const fetchReports = async () => {
    if (!selectedClass || !selectedTerm) {
      alert('Please select both class and term');
      return;
    }

    setLoading(true);
    try {
      let endpoint = `/api/reports/bulk/${selectedClass}/${selectedTerm}`;
      const params = new URLSearchParams();

      if (startAdmission) params.append('startAdmission', startAdmission);
      if (endAdmission) params.append('endAdmission', endAdmission);

      if (params.toString()) {
        endpoint += `?${params.toString()}`;
      }

      const response = await api.get(endpoint);

      if (!response.ok) {
        throw new Error('Failed to fetch reports');
      }

      const data = await response.json();
      setReports(Array.isArray(data.reports) ? data.reports : []);
    } catch (error) {
      console.error('Error fetching reports:', error);
      alert('Failed to load reports: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async () => {
    if (reports.length === 0) {
      alert('No reports to download');
      return;
    }

    setDownloading(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < reports.length; i++) {
        const report = reports[i];

        // Create a temporary div for the report card
        const reportCard = document.createElement('div');
        reportCard.style.width = '210mm';
        reportCard.style.padding = '10mm';
        reportCard.style.backgroundColor = 'white';
        reportCard.style.fontFamily = 'Arial, sans-serif';

        reportCard.innerHTML = `
          <div style="border: 4px solid ${schoolSettings.primaryColor || '#0d9488'}; padding: 30px; border-radius: 15px; position: relative; background: white; overflow: hidden; min-height: 280mm;">
            <!-- Watermark -->
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(30deg); opacity: 0.03; font-size: 100px; font-weight: 900; z-index: 0; white-space: nowrap; pointer-events: none;">
              ${schoolSettings.schoolName || 'OFFICIAL'}
            </div>

            <!-- Header -->
            <div style="background: linear-gradient(135deg, ${schoolSettings.primaryColor || '#0d9488'}, #0f766e); color: white; padding: 30px; border-radius: 12px; margin-bottom: 25px; display: flex; align-items: center; gap: 25px; position: relative; z-index: 10; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              ${schoolSettings.logoUrl ? `<img src="${schoolSettings.logoUrl}" style="height: 70px; width: 70px; object-fit: contain; background: white; padding: 8px; border-radius: 10px;" />` : ''}
              <div>
                <h1 style="margin: 0; font-size: 32px; font-weight: 800; text-transform: uppercase; letter-spacing: -0.02em;">${schoolSettings.schoolName || 'School Name'}</h1>
                <p style="margin: 5px 0 0 0; font-size: 16px; font-style: italic; opacity: 0.9;">${schoolSettings.schoolMotto || 'Excellence in Education'}</p>
                <p style="margin: 8px 0 0 0; font-size: 11px; text-transform: uppercase; opacity: 0.8; letter-spacing: 0.1em;">${schoolSettings.schoolAddress || ''}</p>
              </div>
            </div>

            <!-- Student Info Section -->
            <div style="margin-bottom: 30px; border-bottom: 3px solid #f3f4f6; padding-bottom: 20px; position: relative; z-index: 10;">
              <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 15px;">
                <h2 style="font-size: 20px; font-weight: 800; color: #111827; text-transform: uppercase; margin: 0;">Terminal Report Card</h2>
                <span style="background: ${schoolSettings.primaryColor || '#0d9488'}20; color: ${schoolSettings.primaryColor || '#0d9488'}; font-weight: 800; padding: 6px 15px; border-radius: 20px; font-size: 12px;">
                  ${report.term.name} - ${report.term.session}
                </span>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 13px;">
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f3f4f6; padding: 5px 0;">
                  <strong style="color: #4b5563;">Student Name:</strong> <span style="font-weight: 800;">${report.student.name}</span>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f3f4f6; padding: 5px 0;">
                  <strong style="color: #4b5563;">Admission No:</strong> <span style="font-weight: 800; color: ${schoolSettings.primaryColor || '#0d9488'}; font-family: monospace;">${report.student.admissionNumber}</span>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f3f4f6; padding: 5px 0;">
                  <strong style="color: #4b5563;">Class:</strong> <span>${report.student.class}</span>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f3f4f6; padding: 5px 0;">
                  <strong style="color: #4b5563;">Gender:</strong> <span>${report.student.gender || 'N/A'}</span>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f3f4f6; padding: 5px 0;">
                  <strong style="color: #4b5563; font-style: italic;">Clubs:</strong> <span style="opacity: 0.8;">${report.student.clubs || 'None Assigned'}</span>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f3f4f6; padding: 5px 0;">
                  <strong style="color: #4b5563; font-style: italic;">Position:</strong> <span style="font-weight: 900; color: ${schoolSettings.primaryColor || '#0d9488'}; text-decoration: underline;">${report.termPosition} / ${report.totalStudents}</span>
                </div>
              </div>
            </div>

            <!-- Performance Table -->
            <div style="margin-bottom: 30px; position: relative; z-index: 10;">
              <table style="width: 100%; border-collapse: separate; border-spacing: 0; font-size: 11px; border: 2px solid ${schoolSettings.primaryColor || '#0d9488'}20; border-radius: 12px; overflow: hidden;">
                <thead>
                  <tr style="background-color: ${schoolSettings.primaryColor || '#0d9488'}10;">
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; border-right: 1px solid #e5e7eb; font-weight: 800; text-transform: uppercase;">Subject</th>
                    <th style="padding: 8px; text-align: center; border-bottom: 2px solid #e5e7eb; border-right: 1px solid #e5e7eb; font-size: 9px; min-width: 40px;">CA 1<br/>(${report.term.weights?.assignment1})</th>
                    <th style="padding: 8px; text-align: center; border-bottom: 2px solid #e5e7eb; border-right: 1px solid #e5e7eb; font-size: 9px; min-width: 40px;">CA 2<br/>(${report.term.weights?.assignment2})</th>
                    <th style="padding: 8px; text-align: center; border-bottom: 2px solid #e5e7eb; border-right: 1px solid #e5e7eb; font-size: 9px; min-width: 40px;">TST 1<br/>(${report.term.weights?.test1})</th>
                    <th style="padding: 8px; text-align: center; border-bottom: 2px solid #e5e7eb; border-right: 1px solid #e5e7eb; font-size: 9px; min-width: 40px;">TST 2<br/>(${report.term.weights?.test2})</th>
                    <th style="padding: 8px; text-align: center; border-bottom: 2px solid #e5e7eb; border-right: 1px solid #e5e7eb; font-size: 9px; min-width: 45px;">EXAM<br/>(${report.term.weights?.exam})</th>
                    <th style="padding: 8px; text-align: center; border-bottom: 2px solid #e5e7eb; border-right: 1px solid #e5e7eb; background: ${schoolSettings.primaryColor || '#0d9488'}20; font-weight: 900; color: ${schoolSettings.primaryColor || '#0d9488'};">TOTAL</th>
                    <th style="padding: 8px; text-align: center; border-bottom: 2px solid #e5e7eb; border-right: 1px solid #e5e7eb; background: ${schoolSettings.primaryColor || '#0d9488'}; color: white;">GRD</th>
                    <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e5e7eb; font-weight: 600; font-style: italic; color: #6b7280; font-size: 10px;">REMARK</th>
                  </tr>
                </thead>
                <tbody>
                  {(report.subjects || []).map((sub, idx) => `
          < tr style = "background-color: ${idx % 2 === 0 ? 'white' : '#f9fafb'};" >
                      <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; border-right: 1px solid #f3f4f6; font-weight: 700;">${sub.name}</td>
                      <td style="padding: 8px; text-align: center; border-bottom: 1px solid #f3f4f6; border-right: 1px solid #f3f4f6;">${sub.assignment1?.toFixed(1) || '-'}</td>
                      <td style="padding: 8px; text-align: center; border-bottom: 1px solid #f3f4f6; border-right: 1px solid #f3f4f6;">${sub.assignment2?.toFixed(1) || '-'}</td>
                      <td style="padding: 8px; text-align: center; border-bottom: 1px solid #f3f4f6; border-right: 1px solid #f3f4f6;">${sub.test1?.toFixed(1) || '-'}</td>
                      <td style="padding: 8px; text-align: center; border-bottom: 1px solid #f3f4f6; border-right: 1px solid #f3f4f6;">${sub.test2?.toFixed(1) || '-'}</td>
                      <td style="padding: 8px; text-align: center; border-bottom: 1px solid #f3f4f6; border-right: 1px solid #f3f4f6;">${sub.exam?.toFixed(1) || '-'}</td>
                      <td style="padding: 8px; text-align: center; border-bottom: 1px solid #f3f4f6; border-right: 1px solid #f3f4f6; font-weight: 900; background: ${schoolSettings.primaryColor || '#0d9488'}05; color: ${schoolSettings.primaryColor || '#0d9488'};">${sub.total.toFixed(1)}</td>
                      <td style="padding: 8px; text-align: center; border-bottom: 1px solid #f3f4f6; border-right: 1px solid #f3f4f6; font-weight: 900; color: ${sub.grade === 'F' ? '#e11d48' : (schoolSettings.primaryColor || '#0d9488')};">${sub.grade}</td>
                      <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; font-style: italic; color: #6b7280; font-size: 9px; font-weight: 500;">${sub.remark}</td>
                    </tr >
  `).join('')}
                </tbody>
              </table>
            </div>

            <!-- Stats & Psychomotor -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; position: relative; z-index: 10;">
              <div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                   <div style="background: ${schoolSettings.primaryColor || '#0d9488'}08; padding: 12px; border-radius: 12px; border: 1px solid ${schoolSettings.primaryColor || '#0d9488'}15; text-align: center;">
                     <p style="margin: 0; font-size: 10px; font-weight: 800; color: #9ca3af; text-transform: uppercase;">Average</p>
                     <p style="margin: 5px 0 0 0; font-size: 22px; font-weight: 900; color: ${schoolSettings.primaryColor || '#0d9488'};">${report.termAverage.toFixed(2)}%</p>
                   </div>
                   <div style="background: ${schoolSettings.primaryColor || '#0d9488'}08; padding: 12px; border-radius: 12px; border: 1px solid ${schoolSettings.primaryColor || '#0d9488'}15; text-align: center;">
                     <p style="margin: 0; font-size: 10px; font-weight: 800; color: #9ca3af; text-transform: uppercase;">Grade</p>
                     <p style="margin: 5px 0 0 0; font-size: 22px; font-weight: 900; color: ${schoolSettings.primaryColor || '#0d9488'};">${report.overallGrade}</p>
                   </div>
                   <div style="grid-column: span 2; background: ${schoolSettings.primaryColor || '#0d9488'}08; padding: 12px; border-radius: 12px; border: 1px solid ${schoolSettings.primaryColor || '#0d9488'}15; display: flex; justify-content: space-between; align-items: center; padding-left: 20px; padding-right: 20px;">
                     <span style="font-size: 10px; font-weight: 800; color: #9ca3af; text-transform: uppercase;">Attendance</span>
                     <span style="font-size: 18px; font-weight: 900; color: ${schoolSettings.primaryColor || '#0d9488'};">${report.attendance?.percentage || 0}%</span>
                     <span style="font-size: 10px; color: #9ca3af; font-weight: 600;">(${report.attendance?.present}/${report.attendance?.total} Days)</span>
                   </div>
                </div>
                <div style="margin-top: 15px; background: #f9fafb; padding: 12px; border-radius: 10px; border: 1px solid #e5e7eb;">
                   <p style="margin: 0 0 5px 0; font-size: 9px; font-weight: 800; color: #9ca3af; text-transform: uppercase;">Next Term Begins</p>
                   <p style="margin: 0; font-size: 12px; font-weight: 700; color: #374151;">${report.term.nextTermStartDate ? new Date(report.term.nextTermStartDate).toDateString() : (report.term.nextTermBegins ? new Date(report.term.nextTermBegins).toDateString() : 'To be announced')}</p>
                </div>
              </div>
              
              <div style="background: #f9fafb; padding: 15px; border-radius: 12px; border: 1px solid #e5e7eb;">
                <h3 style="margin: 0 0 10px 0; font-size: 10px; font-weight: 900; text-transform: uppercase; color: #9ca3af; text-align: center; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">Psychomotor Evaluation</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                  ${report.psychomotorRatings?.map(r => `
                    <div style="display: flex; justify-content: space-between; font-size: 9px; border-bottom: 1px solid #eeeff1; padding: 3px 0;">
                      <span style="font-weight: 700; color: #4b5563;">${r.name}</span>
                      <span style="color: ${schoolSettings.primaryColor || '#0d9488'}; font-weight: 900;">${r.score || 0}/${r.maxScore || 5}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>

            <!-- Remarks -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 40px; position: relative; z-index: 10;">
              <div style="padding: 12px; border: 1px solid #e5e7eb; border-radius: 10px; background: white;">
                <p style="margin: 0 0 5px 0; font-size: 9px; font-weight: 800; color: #9ca3af; text-transform: uppercase;">Form Master's Remark</p>
                <p style="margin: 0; font-size: 11px; font-style: italic; color: #4b5563; font-weight: 500; min-height: 25px;">"${report.formMasterRemark}"</p>
              </div>
              <div style="padding: 12px; border: 1px solid #e5e7eb; border-radius: 10px; background: white;">
                <p style="margin: 0 0 5px 0; font-size: 9px; font-weight: 800; color: #9ca3af; text-transform: uppercase;">Principal's Remark</p>
                <p style="margin: 0; font-size: 11px; font-style: italic; color: #4b5563; font-weight: 500; min-height: 25px;">"${report.principalRemark}"</p>
              </div>
            </div>

            <!-- Signatures Section -->
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: auto; padding-top: 30px; border-top: 2px solid ${schoolSettings.primaryColor || '#0d9488'}20; position: relative; z-index: 10;">
              <!-- Form Master Seal -->
              <div style="text-align: center; position: relative;">
                <div style="position: absolute; top: -45px; left: 50%; transform: translateX(-50%); opacity: 0.15;">
                  <svg width="60" height="60" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="4 2"/><text x="50" y="45" text-anchor="middle" font-size="8" font-weight="bold">OFFICIAL</text><text x="50" y="55" text-anchor="middle" font-size="10" font-weight="black">SEAL</text></svg>
                </div>
                <div style="border-bottom: 2px solid #374151; width: 100%; margin-bottom: 5px;"></div>
                <p style="margin: 0; font-size: 10px; font-weight: 900; text-transform: uppercase;">${report.student.formMaster}</p>
                <p style="margin: 0; font-size: 8px; color: #9ca3af; text-transform: uppercase; font-weight: 700;">Form Master</p>
              </div>

              <!-- Verification Badge -->
              <div style="text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <div style="border: 2px solid ${schoolSettings.primaryColor || '#0d9488'}20; border-radius: 40px; padding: 4px 12px; background: ${schoolSettings.primaryColor || '#0d9488'}05; margin-bottom: 5px;">
                   <span style="font-size: 9px; font-weight: 900; color: ${schoolSettings.primaryColor || '#0d9488'}; letter-spacing: 0.1em;">DIGITALLY VERIFIED</span>
                </div>
                <p style="margin: 0; font-size: 8px; color: #d1d5db; font-weight: 700; text-transform: uppercase;">${new Date().toLocaleDateString()}</p>
              </div>

              <!-- Principal Stamp -->
              <div style="text-align: center; position: relative;">
                <div style="position: absolute; top: -45px; left: 50%; transform: translateX(-50%); opacity: 0.15; color: ${schoolSettings.primaryColor || '#0d9488'};">
                  <svg width="60" height="60" viewBox="0 0 100 100"><polygon points="50,5 95,25 95,75 50,95 5,75 5,25" fill="none" stroke="currentColor" stroke-width="2"/><text x="50" y="45" text-anchor="middle" font-size="8" font-weight="bold">SCHOOL</text><text x="50" y="55" text-anchor="middle" font-size="10" font-weight="black">STAMP</text></svg>
                </div>
                <div style="border-bottom: 2px solid #374151; width: 100%; margin-bottom: 5px;"></div>
                <p style="margin: 0; font-size: 10px; font-weight: 900; text-transform: uppercase;">School Principal</p>
                <p style="margin: 0; font-size: 8px; color: #9ca3af; text-transform: uppercase; font-weight: 700;">Authorized Signature</p>
              </div>
            </div>

            <!-- Footer Legend -->
            <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #f3f4f6; display: flex; justify-content: space-between; align-items: center; font-size: 8px; font-weight: 800; color: #d1d5db; position: relative; z-index: 10;">
               <div style="text-transform: uppercase; letter-spacing: 0.1em;">
                 Grade Key: ${(() => {
    try {
      const scales = JSON.parse(schoolSettings?.gradingSystem || '[]');
      return scales.sort((a, b) => b.min - a.min).map(s => `${s.grade}: ${s.min}-${s.max || 100}`).join(' | ');
    } catch (e) { return 'Legend Error'; }
  })()}
               </div>
               <div style="text-transform: uppercase; letter-spacing: 0.1em;">
                 Generated by ${schoolSettings.schoolName || 'Portal'} Management System
               </div>
            </div>
          </div>
        `;

document.body.appendChild(reportCard);

// Convert to canvas
const canvas = await html2canvas(reportCard, {
  scale: 2,
  useCORS: true,
  logging: false
});

// Remove temporary element
document.body.removeChild(reportCard);

// Add to PDF
if (i > 0) {
  pdf.addPage();
}

const imgData = canvas.toDataURL('image/png');
const imgWidth = pageWidth - 20;
const imgHeight = (canvas.height * imgWidth) / canvas.width;

pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      }

// Save PDF
const className = classes.find(c => c.id === parseInt(selectedClass))?.name || 'Class';
const termName = terms.find(t => t.id === parseInt(selectedTerm))?.name || 'Term';
pdf.save(`${className}_${termName}_Reports.pdf`);

alert(`Successfully generated PDF with ${reports.length} report cards!`);
    } catch (error) {
  console.error('Error generating PDF:', error);
  alert('Failed to generate PDF: ' + error.message);
} finally {
  setDownloading(false);
}
  };

return (
  <div className="space-y-6">
    <h1 className="text-2xl font-bold text-gray-900">Bulk Report Card Download</h1>

    {user.role === 'teacher' && classes.length === 0 ? (
      <div className="bg-white p-12 rounded-lg shadow text-center">
        <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-10 h-10 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-gray-900">Access Restricted</h3>
        <p className="text-gray-600 mt-2">You are not assigned as a Form Master for any class. Report generation is restricted to Form Masters only.</p>
      </div>
    ) : (
      <>
        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">
            {user.role === 'teacher' && classes.length === 1
              ? `Academic Report Generation: ${classes[0].name} ${classes[0].arm || ''}`
              : "Select Class and Term"}
          </h3>
          <div className={`grid grid-cols-1 ${user.role === 'teacher' && classes.length === 1 ? 'md:grid-cols-1' : 'md:grid-cols-2'} gap-4`}>
            {!(user.role === 'teacher' && classes.length === 1) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                >
                  <option value="">Select a class</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} {cls.arm || ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Academic Term</label>
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                className="w-full border rounded-md px-3 py-2"
              >
                <option value="">Select a term</option>
                {terms.map(term => (
                  <option key={term.id} value={term.id}>
                    {term.name} - {term.academicSession?.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Optional: Filter by Admission Number Range</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Admission Number</label>
                <input
                  type="text"
                  value={startAdmission}
                  onChange={(e) => setStartAdmission(e.target.value)}
                  placeholder="e.g., 2025-JSS1A-AA"
                  className="w-full border rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Admission Number</label>
                <input
                  type="text"
                  value={endAdmission}
                  onChange={(e) => setEndAdmission(e.target.value)}
                  placeholder="e.g., 2025-JSS1A-ZZ"
                  className="w-full border rounded-md px-3 py-2"
                />
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Leave blank to download all students in the class
            </p>
          </div>

          <button
            onClick={fetchReports}
            disabled={!selectedClass || !selectedTerm || loading}
            className="mt-4 bg-primary text-white px-6 py-2 rounded-md hover:brightness-90 disabled:bg-gray-400"
          >
            {loading ? 'Loading...' : 'Load Reports'}
          </button>
        </div>

        {/* Preview */}
        {reports.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold">Report Preview</h3>
                <p className="text-sm text-gray-600">{reports.length} student(s) found</p>
              </div>
              <button
                onClick={generatePDF}
                disabled={downloading}
                className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2"
              >
                {downloading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download as PDF
                  </>
                )}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">#</th>
                    <th className="px-4 py-2 text-left">Admission No.</th>
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-left">Average</th>
                    <th className="px-4 py-2 text-left">Grade</th>
                    <th className="px-4 py-2 text-left">Position</th>
                    <th className="px-4 py-2 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(Array.isArray(reports) ? reports : []).map((report, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-2">{idx + 1}</td>
                      <td className="px-4 py-2 font-mono text-xs">{report.student?.admissionNumber}</td>
                      <td className="px-4 py-2">{report.student?.name}</td>
                      <td className="px-4 py-2 font-semibold text-primary">{report.termAverage?.toFixed(2)}%</td>
                      <td className="px-4 py-2 font-semibold">{report.overallGrade}</td>
                      <td className="px-4 py-2">{report.termPosition}/{report.totalStudents}</td>
                      <td className="px-4 py-2 text-center">
                        <button
                          onClick={() => setViewingReport(report)}
                          className="text-primary hover:text-primary font-medium text-xs border border-primary px-2 py-1 rounded hover:bg-primary/5"
                        >
                          View Report
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && reports.length === 0 && selectedClass && selectedTerm && (
          <div className="bg-white p-12 rounded-lg shadow text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="mt-4 text-gray-600">No reports found for the selected criteria</p>
          </div>
        )}
        {/* View Modal */}
        {viewingReport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto relative">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
                <h3 className="text-xl font-bold text-gray-800">Report Preview</h3>
                <button
                  onClick={() => setViewingReport(null)}
                  className="text-gray-500 hover:text-gray-700 p-2"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6 bg-gray-100">
                <ReportCardPreview report={viewingReport} />
              </div>
              <div className="px-6 py-4 border-t bg-gray-50 flex justify-end">
                <button
                  onClick={() => setViewingReport(null)}
                  className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    )}
  </div>
);
};
const ReportCardPreview = ({ report }) => {
  const { settings: schoolSettings } = useSchoolSettings();

  return (
    <div className="bg-white p-8 shadow-lg mx-auto max-w-3xl border-2 border-primary rounded-lg text-sm text-gray-800 font-sans relative overflow-hidden">
      {/* Watermark */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none rotate-[30deg]">
        <h1 className="text-9xl font-black">{schoolSettings?.schoolName || 'OFFICIAL'}</h1>
      </div>

      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/90 text-white p-6 rounded-lg mb-6 flex items-center gap-6 relative z-10">
        {schoolSettings.logoUrl && (
          <img
            src={schoolSettings.logoUrl}
            alt="School Logo"
            className="h-16 w-16 bg-white rounded-lg p-2 object-contain"
          />
        )}
        <div>
          <h1 className="text-2xl font-bold m-0 uppercase tracking-tight">{schoolSettings.schoolName || 'School Name'}</h1>
          <p className="mt-1 opacity-90 italic">{schoolSettings.schoolMotto || 'Excellence in Education'}</p>
          <p className="text-[10px] mt-2 opacity-80 uppercase tracking-widest">{schoolSettings.schoolAddress}</p>
        </div>
      </div>

      {/* Student Info */}
      <div className="mb-6 border-b-2 border-gray-200 pb-4 relative z-10">
        <div className="flex justify-between items-baseline mb-4">
          <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wide">Terminal Report Card</h2>
          <span className="text-primary font-bold px-3 py-1 bg-primary/10 rounded-full text-xs uppercase tracking-widest">
            {report.term.name} - {report.term.session}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-y-2 gap-x-8">
          <div className="flex justify-between border-b border-gray-100 py-1">
            <span className="font-semibold text-gray-600">Name:</span>
            <span className="font-bold">{report.student.name}</span>
          </div>
          <div className="flex justify-between border-b border-gray-100 py-1">
            <span className="font-semibold text-gray-600">Admission No:</span>
            <span className="font-mono font-bold text-primary">{report.student.admissionNumber}</span>
          </div>
          <div className="flex justify-between border-b border-gray-100 py-1">
            <span className="font-semibold text-gray-600">Class:</span>
            <span>{report.student.class}</span>
          </div>
          <div className="flex justify-between border-b border-gray-100 py-1">
            <span className="font-semibold text-gray-600">Gender:</span>
            <span>{report.student.gender || 'N/A'}</span>
          </div>
          <div className="flex justify-between border-b border-gray-100 py-1 text-xs">
            <span className="font-semibold text-gray-600 italic">Clubs:</span>
            <span className="opacity-70">{report.student.clubs || 'None Assigned'}</span>
          </div>
          <div className="flex justify-between border-b border-gray-100 py-1">
            <span className="font-semibold text-gray-600 italic font-mono text-[10px]">Position:</span>
            <span className="font-black text-primary">{report.termPosition} / {report.totalStudents}</span>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="mb-6 relative z-10">
        <h2 className="text-[10px] font-black mb-2 text-primary uppercase tracking-[0.2em]">Academic Performance Breakdown</h2>
        <div className="overflow-hidden border-2 border-primary/20 rounded-xl">
          <table className="min-w-full divide-y divide-gray-200 text-xs">
            <thead className="bg-primary/10">
              <tr>
                <th className="px-3 py-3 text-left font-black text-primary border-r border-primary/20 uppercase tracking-tighter">Subject</th>
                <th className="px-1 py-3 text-center text-gray-600 border-r border-gray-100 text-[9px] leading-tight font-bold uppercase">1ST CA<br />(${report.term.weights?.assignment1})</th>
                <th className="px-1 py-3 text-center text-gray-600 border-r border-gray-100 text-[9px] leading-tight font-bold uppercase">2ND CA<br />(${report.term.weights?.assignment2})</th>
                <th className="px-1 py-3 text-center text-gray-600 border-r border-gray-100 text-[9px] leading-tight font-bold uppercase">1ST TST<br />(${report.term.weights?.test1})</th>
                <th className="px-1 py-3 text-center text-gray-600 border-r border-gray-100 text-[9px] leading-tight font-bold uppercase">2ND TST<br />(${report.term.weights?.test2})</th>
                <th className="px-2 py-3 text-center text-gray-600 border-r border-gray-100 text-[9px] leading-tight font-bold uppercase">EXAM<br />(${report.term.weights?.exam})</th>
                <th className="px-3 py-3 text-center font-black text-primary bg-primary/20 border-r border-primary/20 uppercase tracking-tighter">Total</th>
                <th className="px-3 py-3 text-center font-black text-white bg-primary border-r border-primary">GRD</th>
                <th className="px-3 py-3 text-left text-[10px] font-bold text-gray-500 uppercase italic">Remark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {(report.subjects || []).map((subject, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? '' : 'bg-primary/[0.02]'}>
                  <td className="px-3 py-2.5 font-bold text-gray-900 border-r border-gray-100 text-[11px]">{subject.name}</td>
                  <td className="px-2 py-2.5 text-center border-r border-gray-50">{subject.assignment1?.toFixed(1) || '-'}</td>
                  <td className="px-2 py-2.5 text-center border-r border-gray-50">{subject.assignment2?.toFixed(1) || '-'}</td>
                  <td className="px-2 py-2.5 text-center border-r border-gray-50">{subject.test1?.toFixed(1) || '-'}</td>
                  <td className="px-2 py-2.5 text-center border-r border-gray-50">{subject.test2?.toFixed(1) || '-'}</td>
                  <td className="px-2 py-2.5 text-center border-r border-gray-50">{subject.exam?.toFixed(1) || '-'}</td>
                  <td className="px-3 py-2.5 text-center font-black bg-primary/10 text-primary border-r border-primary/10">{subject.total?.toFixed(1)}</td>
                  <td className={`px-3 py-2.5 text-center font-black border-r border-primary/10 ${subject.grade === 'F' ? 'text-red-600 bg-red-50' : 'text-primary bg-primary/5'}`}>{subject.grade}</td>
                  <td className="px-3 py-2.5 text-[10px] text-gray-500 italic font-medium">{subject.remark}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6 relative z-10">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3 h-fit">
          <div className="bg-primary/5 p-3 rounded-xl text-center border border-primary/10 shadow-sm">
            <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest mb-1">Average</p>
            <p className="text-xl font-black text-primary">{report.termAverage.toFixed(2)}%</p>
          </div>
          <div className="bg-primary/5 p-3 rounded-xl text-center border border-primary/10 shadow-sm">
            <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest mb-1">Final Grade</p>
            <p className="text-xl font-black text-primary">{report.overallGrade}</p>
          </div>
          <div className="bg-primary/5 p-3 rounded-xl text-center border border-primary/10 shadow-sm col-span-2 flex justify-between items-center px-4">
            <span className="text-gray-500 text-[9px] font-black uppercase tracking-widest">Attendance</span>
            <span className="text-lg font-black text-primary">{report.attendance?.percentage || 0}%</span>
            <span className="text-[10px] text-gray-400 font-bold">(${report.attendance?.present}/${report.attendance?.total} Days)</span>
          </div>
        </div>

        {/* Psychomotor Ratings */}
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 shadow-inner h-fit">
          <h3 className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3 text-center">Psychomotor & Behavioral Evaluation</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            {report.psychomotorRatings?.map((rating, idx) => (
              <div key={idx} className="flex justify-between items-center text-[10px] border-b border-gray-200/50 pb-1">
                <span className="text-gray-600 font-bold">{rating.name}</span>
                <span className="flex gap-0.5">
                  {[...Array(rating.maxScore)].map((_, i) => (
                    <span key={i} className={`w-2 h-2 rounded-full ${i < rating.score ? 'bg-primary' : 'bg-gray-300'}`}></span>
                  ))}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Remarks */}
      <div className="grid grid-cols-2 gap-6 mb-8 relative z-10">
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Form Master's Remarks</p>
          <p className="text-[11px] italic text-gray-600 font-medium leading-relaxed">"${report.formMasterRemark}"</p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Principal's Remarks</p>
          <p className="text-[11px] italic text-gray-600 font-medium leading-relaxed">"${report.principalRemark}"</p>
        </div>
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-3 gap-8 mt-12 pt-6 border-t-2 border-primary/20 relative z-10">
        <div className="text-center relative">
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-20 pointer-events-none">
            <svg width="60" height="60" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2" />
              <text x="50" y="45" textAnchor="middle" fontSize="8" fontWeight="bold">OFFICIAL</text>
              <text x="50" y="55" textAnchor="middle" fontSize="10" fontWeight="black">SEAL</text>
            </svg>
          </div>
          <div className="border-b-2 border-black w-full mb-1 opacity-80"></div>
          <p className="text-[10px] font-black uppercase">{report.student.formMaster}</p>
          <p className="text-[8px] text-gray-400 uppercase mt-0.5 italic">Form Master</p>
        </div>

        <div className="text-center flex flex-col justify-center items-center">
          <div className="p-2 border-2 border-primary/20 rounded-full mb-1">
            <div className="bg-primary/5 text-primary p-2 rounded-full font-black text-[10px]">VERIFIED</div>
          </div>
          <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">${new Date().toLocaleDateString()}</p>
        </div>

        <div className="text-center relative">
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-20 pointer-events-none">
            <svg width="60" height="60" viewBox="0 0 100 100" className="text-primary">
              <polygon points="50,5 95,25 95,75 50,95 5,75 5,25" fill="none" stroke="currentColor" strokeWidth="2" />
              <text x="50" y="45" textAnchor="middle" fontSize="8" fontWeight="bold">SCHOOL</text>
              <text x="50" y="55" textAnchor="middle" fontSize="10" fontWeight="black">STAMP</text>
            </svg>
          </div>
          <div className="border-b-2 border-black w-full mb-1 opacity-80"></div>
          <p className="text-[10px] font-black uppercase">Principal's Signature</p>
          <p className="text-[8px] text-gray-400 uppercase mt-0.5 italic">School Authority</p>
        </div>
      </div>

      {/* Legend Footer */}
      <div className="mt-8 pt-4 border-t border-gray-100 flex justify-between items-center text-[9px] text-gray-400 font-bold relative z-10">
        <div className="flex gap-4 uppercase tracking-widest">
          <span>GP: Grade Point</span>
          <span>CA: Continuous Assessment</span>
          <span>% Attend: Attendance Percentage</span>
        </div>
        <div className="flex gap-2 text-primary/60">
          {(() => {
            try {
              const scales = JSON.parse(schoolSettings?.gradingSystem || '[]');
              return scales.sort((a, b) => b.min - a.min).map(s => (
                <span key={s.grade}>{s.grade}: {s.min}-{s.max || 100}</span>
              ));
            } catch (e) { return null; }
          })()}
        </div>
      </div>
    </div>
  );
};

export default BulkReportDownload;
