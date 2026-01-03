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

      // Filter to only show classes where user is class teacher (if teacher role)
      if (user.role === 'teacher') {
        const teacherClasses = data.filter(c => c.classTeacherId === user.id);
        setClasses(teacherClasses);
      } else {
        setClasses(data);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchTerms = async () => {
    try {
      const response = await api.get('/api/terms');
      const data = await response.json();
      setTerms(data);
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
      setReports(data.reports);
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
          <div style="border: 2px solid ${schoolSettings.primaryColor || '#0d9488'}; padding: 20px; border-radius: 8px;">
            <!-- Header -->
            <div style="background: linear-gradient(to right, ${schoolSettings.primaryColor || '#0d9488'}, ${schoolSettings.primaryColor ? schoolSettings.primaryColor : '#0f766e'}); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; display: flex; align-items: center; gap: 15px;">
              ${schoolSettings.logoUrl ? `<img src="${schoolSettings.logoUrl}" alt="Logo" style="height: 50px; width: 50px; object-fit: contain; background: white; padding: 5px; border-radius: 5px;" />` : ''}
              <div>
                <h1 style="margin: 0; font-size: 24px;">${schoolSettings.schoolName || 'School Name'}</h1>
                <p style="margin: 5px 0 0 0; font-size: 14px;">${schoolSettings.schoolMotto || 'Excellence in Education'}</p>
              </div>
            </div>

            <!-- Student Info -->
            <div style="margin-bottom: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 15px;">
              <h2 style="font-size: 18px; margin-bottom: 15px; color: #1f2937;">STUDENT INFORMATION</h2>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px;">
                <div><strong>Name:</strong> ${report.student.name}</div>
                <div><strong>Admission No:</strong> ${report.student.admissionNumber}</div>
                <div><strong>Class:</strong> ${report.student.class}</div>
                <div><strong>Gender:</strong> ${report.student.gender || 'N/A'}</div>
                <div><strong>Term:</strong> ${report.term.name}</div>
                <div><strong>Session:</strong> ${report.term.session}</div>
                <div><strong>Form Master:</strong> ${report.student.formMaster}</div>
              </div>
            </div>

            <!-- Results Table -->
            <div style="margin-bottom: 20px;">
              <h2 style="font-size: 18px; margin-bottom: 15px; color: #1f2937;">ACADEMIC PERFORMANCE</h2>
              <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
                <thead style="background-color: #f0fdfa;">
                  <tr>
                    <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">Subject</th>
                    <th style="border: 1px solid #d1d5db; padding: 8px; text-align: center;">Assign1<br/>(5)</th>
                    <th style="border: 1px solid #d1d5db; padding: 8px; text-align: center;">Assign2<br/>(5)</th>
                    <th style="border: 1px solid #d1d5db; padding: 8px; text-align: center;">Test1<br/>(10)</th>
                    <th style="border: 1px solid #d1d5db; padding: 8px; text-align: center;">Test2<br/>(10)</th>
                    <th style="border: 1px solid #d1d5db; padding: 8px; text-align: center;">Exam<br/>(70)</th>
                    <th style="border: 1px solid #d1d5db; padding: 8px; text-align: center; background-color: #ccfbf1;">Total<br/>(100)</th>
                    <th style="border: 1px solid #d1d5db; padding: 8px; text-align: center; background-color: #ccfbf1;">Grade</th>
                    <th style="border: 1px solid #d1d5db; padding: 8px; text-align: center;">Remark</th>
                  </tr>
                </thead>
                <tbody>
                  ${report.subjects.map((subject, idx) => `
                    <tr style="background-color: ${idx % 2 === 0 ? 'white' : '#f9fafb'};">
                      <td style="border: 1px solid #d1d5db; padding: 8px;">${subject.name}</td>
                      <td style="border: 1px solid #d1d5db; padding: 8px; text-align: center;">${subject.assignment1?.toFixed(1) || '-'}</td>
                      <td style="border: 1px solid #d1d5db; padding: 8px; text-align: center;">${subject.assignment2?.toFixed(1) || '-'}</td>
                      <td style="border: 1px solid #d1d5db; padding: 8px; text-align: center;">${subject.test1?.toFixed(1) || '-'}</td>
                      <td style="border: 1px solid #d1d5db; padding: 8px; text-align: center;">${subject.test2?.toFixed(1) || '-'}</td>
                      <td style="border: 1px solid #d1d5db; padding: 8px; text-align: center;">${subject.exam?.toFixed(1) || '-'}</td>
                      <td style="border: 1px solid #d1d5db; padding: 8px; text-align: center; font-weight: bold; background-color: #f0fdfa;">${subject.total.toFixed(1)}</td>
                      <td style="border: 1px solid #d1d5db; padding: 8px; text-align: center; font-weight: bold; background-color: #f0fdfa;">${subject.grade}</td>
                      <td style="border: 1px solid #d1d5db; padding: 8px;">${subject.remark}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <!-- Summary -->
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px;">
              <div style="background-color: #f0fdfa; padding: 15px; border-radius: 8px; text-align: center;">
                <p style="margin: 0; font-size: 12px; color: #6b7280;">Term Average</p>
                <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: ${schoolSettings.primaryColor || '#0d9488'};">${report.termAverage.toFixed(2)}%</p>
              </div>
              <div style="background-color: #f0fdfa; padding: 15px; border-radius: 8px; text-align: center;">
                <p style="margin: 0; font-size: 12px; color: #6b7280;">Overall Grade</p>
                <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: ${schoolSettings.primaryColor || '#0d9488'};">${report.overallGrade}</p>
              </div>
              <div style="background-color: #f0fdfa; padding: 15px; border-radius: 8px; text-align: center;">
                <p style="margin: 0; font-size: 12px; color: #6b7280;">Position</p>
                <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: ${schoolSettings.primaryColor || '#0d9488'};">${report.termPosition}/${report.totalStudents}</p>
              </div>
            </div>

            <!-- Signatures -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 30px;">
              <div>
                <p style="margin: 0 0 5px 0; font-size: 12px; color: #6b7280;">Form Master's Signature</p>
                <div style="border-top: 2px solid #9ca3af; padding-top: 5px;">
                  <p style="margin: 0; font-size: 12px;">${report.student.formMaster}</p>
                </div>
              </div>
              <div>
                <p style="margin: 0 0 5px 0; font-size: 12px; color: #6b7280;">Principal's Signature</p>
                <div style="border-top: 2px solid #9ca3af; padding-top: 5px;">
                  <p style="margin: 0; font-size: 12px;">_____________________</p>
                </div>
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

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Select Class and Term</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Term</label>
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
                {reports.map((report, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-2">{idx + 1}</td>
                    <td className="px-4 py-2 font-mono text-xs">{report.student.admissionNumber}</td>
                    <td className="px-4 py-2">{report.student.name}</td>
                    <td className="px-4 py-2 font-semibold text-primary">{report.termAverage.toFixed(2)}%</td>
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
    </div>
  );
};

const ReportCardPreview = ({ report }) => {
  const { settings: schoolSettings } = useSchoolSettings();
  return (
    <div className="bg-white p-8 shadow-lg mx-auto max-w-3xl border-2 border-primary rounded-lg text-sm text-gray-800 font-sans">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/90 text-white p-6 rounded-lg mb-6 flex items-center gap-6">
        {schoolSettings.logoUrl && (
          <img
            src={schoolSettings.logoUrl}
            alt="School Logo"
            className="h-16 w-16 bg-white rounded-lg p-2 object-contain"
          />
        )}
        <div>
          <h1 className="text-2xl font-bold m-0">{schoolSettings.schoolName || 'School Name'}</h1>
          <p className="mt-1 opacity-90">{schoolSettings.schoolMotto || 'Excellence in Education'}</p>
        </div>
      </div>

      {/* Student Info */}
      <div className="mb-6 border-b-2 border-gray-200 pb-4">
        <h2 className="text-lg font-bold mb-4 text-gray-800 uppercase tracking-wide">Student Information</h2>
        <div className="grid grid-cols-2 gap-y-2 gap-x-8">
          <div className="flex justify-between border-b border-gray-100 py-1">
            <span className="font-semibold text-gray-600">Name:</span>
            <span>{report.student.name}</span>
          </div>
          <div className="flex justify-between border-b border-gray-100 py-1">
            <span className="font-semibold text-gray-600">Admission No:</span>
            <span className="font-mono">{report.student.admissionNumber}</span>
          </div>
          <div className="flex justify-between border-b border-gray-100 py-1">
            <span className="font-semibold text-gray-600">Class:</span>
            <span>{report.student.class}</span>
          </div>
          <div className="flex justify-between border-b border-gray-100 py-1">
            <span className="font-semibold text-gray-600">Gender:</span>
            <span>{report.student.gender || 'N/A'}</span>
          </div>
          <div className="flex justify-between border-b border-gray-100 py-1">
            <span className="font-semibold text-gray-600">Term:</span>
            <span>{report.term.name}</span>
          </div>
          <div className="flex justify-between border-b border-gray-100 py-1">
            <span className="font-semibold text-gray-600">Session:</span>
            <span>{report.term.session}</span>
          </div>
          <div className="col-span-2 flex justify-between border-b border-gray-100 py-1">
            <span className="font-semibold text-gray-600">Form Master:</span>
            <span>{report.student.formMaster}</span>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="mb-6">
        <h2 className="text-lg font-bold mb-4 text-gray-800 uppercase tracking-wide">Academic Performance</h2>
        <div className="overflow-hidden border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200 text-xs">
            <thead className="bg-primary/5">
              <tr>
                <th className="px-3 py-2 text-left font-bold text-primary border-r border-gray-200">Subject</th>
                <th className="px-2 py-2 text-center text-gray-600 border-r border-gray-200">Ass 1<br />(5)</th>
                <th className="px-2 py-2 text-center text-gray-600 border-r border-gray-200">Ass 2<br />(5)</th>
                <th className="px-2 py-2 text-center text-gray-600 border-r border-gray-200">Test 1<br />(10)</th>
                <th className="px-2 py-2 text-center text-gray-600 border-r border-gray-200">Test 2<br />(10)</th>
                <th className="px-2 py-2 text-center text-gray-600 border-r border-gray-200">Exam<br />(70)</th>
                <th className="px-3 py-2 text-center font-bold text-primary bg-primary/10 border-r border-gray-200">Total<br />(100)</th>
                <th className="px-2 py-2 text-center font-bold text-primary bg-primary/10 border-r border-gray-200">Grd</th>
                <th className="px-3 py-2 text-left text-gray-600">Remark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {report.subjects.map((subject, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? '' : 'bg-gray-50'}>
                  <td className="px-3 py-2 font-medium text-gray-900 border-r border-gray-200">{subject.name}</td>
                  <td className="px-2 py-2 text-center border-r border-gray-200">{subject.assignment1?.toFixed(1) || '-'}</td>
                  <td className="px-2 py-2 text-center border-r border-gray-200">{subject.assignment2?.toFixed(1) || '-'}</td>
                  <td className="px-2 py-2 text-center border-r border-gray-200">{subject.test1?.toFixed(1) || '-'}</td>
                  <td className="px-2 py-2 text-center border-r border-gray-200">{subject.test2?.toFixed(1) || '-'}</td>
                  <td className="px-2 py-2 text-center border-r border-gray-200">{subject.exam?.toFixed(1) || '-'}</td>
                  <td className="px-3 py-2 text-center font-bold bg-primary/5 border-r border-primary/20">{subject.total.toFixed(1)}</td>
                  <td className={`px-2 py-2 text-center font-bold bg-primary/5 border-r border-primary/20 ${subject.grade === 'F' ? 'text-red-600' : 'text-primary'
                    }`}>{subject.grade}</td>
                  <td className="px-3 py-2 text-gray-500 italic">{subject.remark}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-primary/5 p-4 rounded-lg text-center border border-primary/20">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Term Average</p>
          <p className="text-3xl font-bold text-primary">{report.termAverage.toFixed(2)}%</p>
        </div>
        <div className="bg-primary/5 p-4 rounded-lg text-center border border-primary/20">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Overall Grade</p>
          <p className="text-3xl font-bold text-primary">{report.overallGrade}</p>
        </div>
        <div className="bg-primary/5 p-4 rounded-lg text-center border border-primary/20">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Position</p>
          <p className="text-3xl font-bold text-primary">{report.termPosition} <span className="text-sm text-gray-500 font-normal">/ {report.totalStudents}</span></p>
        </div>
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-2 gap-12 mt-12 pt-6 border-t border-gray-200">
        <div className="text-center">
          <div className="inline-block border-b-2 border-gray-400 w-48 pb-2 mb-2 font-script text-lg">
            {report.student.formMaster}
          </div>
          <p className="text-xs text-gray-500 uppercase tracking-widest">Form Master's Signature</p>
        </div>
        <div className="text-center">
          <div className="inline-block border-b-2 border-gray-400 w-48 pb-2 mb-2">
            &nbsp;
          </div>
          <p className="text-xs text-gray-500 uppercase tracking-widest">Principal's Signature</p>
        </div>
      </div>

    </div>
  );
};

export default BulkReportDownload;
