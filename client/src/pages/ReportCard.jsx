import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import EmailConfig from '../components/EmailConfig';
import { api, API_BASE_URL } from '../api';
import useSchoolSettings from '../hooks/useSchoolSettings';

const ReportCard = () => {
  const { settings: schoolSettings } = useSchoolSettings();
  const [exams, setExams] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showEmailConfig, setShowEmailConfig] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  // Selection states
  const [classes, setClasses] = useState([]);
  const [classStudents, setClassStudents] = useState([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [searchMode, setSearchMode] = useState('admission'); // 'admission', 'class'
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');


  useEffect(() => {
    fetchDropdownData();
    fetchClasses();
  }, []);

  const fetchDropdownData = async () => {
    try {
      const examsRes = await api.get('/api/exams');
      setExams(await examsRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load exams');
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await api.get('/api/classes');
      setClasses(await response.json());
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  useEffect(() => {
    if (selectedClassId) {
      fetchClassStudents(selectedClassId);
    } else {
      setClassStudents([]);
    }
  }, [selectedClassId]);

  const fetchClassStudents = async (classId) => {
    try {
      const response = await api.get(`/api/students?classId=${classId}`);
      const data = await response.json();
      setClassStudents(data);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchReportCard = async () => {
    if (!selectedExam) {
      setError('Please select an exam');
      return;
    }

    let targetStudentId = selectedStudentId;

    setLoading(true);
    setError('');

    try {
      // If searching by admission number, lookup first
      if (searchMode === 'admission' && admissionNumber) {
        const lookupRes = await api.get(`/api/students/lookup?admissionNumber=${admissionNumber}`);

        if (!lookupRes.ok) {
          throw new Error('Student not found with this Admission Number');
        }

        const student = await lookupRes.json();
        targetStudentId = student.id;
      }

      if (!targetStudentId) {
        setError('Please select a student or enter a valid admission number');
        setLoading(false);
        return;
      }

      const response = await api.get(
        `/api/report-card/${targetStudentId}/${selectedExam}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch report card');
      }

      const data = await response.json();
      setReportData(data);
    } catch (error) {
      console.error('Error fetching report card:', error);
      setError(error.message);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');

    let currentY = 20;
    if (schoolSettings?.logoUrl) {
      try {
        doc.addImage(schoolSettings.logoUrl, 'PNG', 14, 10, 20, 20);
      } catch (e) {
        console.error('Error adding logo to PDF:', e);
      }
    }

    doc.text(schoolSettings?.schoolName || 'School Management System', 105, currentY, { align: 'center' });
    doc.setFontSize(16);
    doc.text('Student Report Card', 105, currentY + 10, { align: 'center' });

    // Add student info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Student Information', 14, 45);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${reportData.student.name}`, 14, 52);
    doc.text(`Roll Number: ${reportData.student.rollNo}`, 14, 59);
    doc.text(`Class: ${reportData.student.class}`, 14, 66);

    // Add exam info
    doc.setFont('helvetica', 'bold');
    doc.text('Exam Information', 120, 45);
    doc.setFont('helvetica', 'normal');
    doc.text(`Exam: ${reportData.exam.name}`, 120, 52);
    doc.text(`Date: ${new Date(reportData.exam.date).toLocaleDateString()}`, 120, 59);

    // Add results table
    const tableData = reportData.results.map(result => [
      result.subject,
      result.subjectCode || '-',
      result.marks,
      '100',
      result.grade
    ]);

    doc.autoTable({
      startY: 75,
      head: [['Subject', 'Code', 'Marks Obtained', 'Max Marks', 'Grade']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 10 }
    });

    // Add summary
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFont('helvetica', 'bold');
    doc.text('Performance Summary', 14, finalY);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Marks: ${reportData.summary.totalMarks}/${reportData.summary.maxMarks}`, 14, finalY + 7);
    doc.text(`Percentage: ${reportData.summary.percentage}%`, 14, finalY + 14);
    doc.text(`Overall Grade: ${reportData.summary.overallGrade}`, 14, finalY + 21);
    doc.text(`Status: ${parseFloat(reportData.summary.percentage) >= 50 ? 'PASS' : 'FAIL'}`, 14, finalY + 28);

    // Add grading scale
    doc.setFontSize(10);
    doc.text('Grading Scale: A+: 90-100 | A: 80-89 | B: 70-79 | C: 60-69 | D: 50-59 | F: Below 50', 14, finalY + 40);

    // Add footer
    doc.setFontSize(8);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 280);

    // Save PDF
    doc.save(`ReportCard_${reportData.student.rollNo}_${reportData.exam.name}.pdf`);
  };

  const handleSendEmail = async () => {
    if (!emailAddress) {
      setError('Please enter an email address');
      return;
    }

    const smtpConfig = localStorage.getItem('smtpConfig');
    if (!smtpConfig) {
      setShowEmailConfig(true);
      setError('Please configure email settings first');
      return;
    }

    setSendingEmail(true);
    setError('');

    try {
      const response = await api.post('/api/email/send-report', {
        to: emailAddress,
        subject: `Report Card - ${reportData.student.name} - ${reportData.exam.name}`,
        reportData,
        smtpConfig: JSON.parse(smtpConfig)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email');
      }

      alert('Email sent successfully!');
      setShowEmailModal(false);
      setEmailAddress('');
    } catch (error) {
      console.error('Email error:', error);
      setError(error.message);
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Report Card</h1>

      {/* Selection Form - Hidden when printing */}
      <div className="bg-white p-6 rounded-lg shadow-md print:hidden">
        <h2 className="text-lg font-semibold mb-4">Generate Report Card</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div className="md:col-span-2 flex gap-4 mb-2">
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio"
                name="searchMode"
                value="admission"
                checked={searchMode === 'admission'}
                onChange={(e) => setSearchMode(e.target.value)}
              />
              <span className="ml-2">By Admission No</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio"
                name="searchMode"
                value="class"
                checked={searchMode === 'class'}
                onChange={(e) => setSearchMode(e.target.value)}
              />
              <span className="ml-2">By Class</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Exam
            </label>
            <select
              className="w-full rounded-md border-gray-300 border p-2"
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
            >
              <option value="">Choose an exam</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.name}
                </option>
              ))}
            </select>
          </div>

          {searchMode === 'admission' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Admission Number
              </label>
              <input
                type="text"
                value={admissionNumber}
                onChange={(e) => setAdmissionNumber(e.target.value)}
                className="w-full border rounded-md px-3 py-2"
                placeholder="e.g. 2024-SS1A-JD"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Class
                </label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                >
                  <option value="">Select Class</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} {cls.arm}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Student
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                  disabled={!selectedClassId}
                >
                  <option value="">Select Student</option>
                  {classStudents.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.user.firstName} {student.user.lastName} ({student.admissionNumber})
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="flex items-end md:col-span-2">
            <button
              onClick={fetchReportCard}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : 'Generate Report'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* Report Card Display */}
      {reportData && (
        <div className="bg-white rounded-lg shadow-md print:shadow-none">
          {/* Action Buttons - Hidden when printing */}
          <div className="p-4 border-b flex justify-end gap-3 print:hidden">
            <button
              onClick={handlePrint}
              className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
            </button>
            <button
              onClick={handleDownloadPDF}
              className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download PDF
            </button>
            <button
              onClick={() => setShowEmailModal(true)}
              className="bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email Report
            </button>
            <button
              onClick={() => setShowEmailConfig(true)}
              className="bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Email Settings
            </button>
          </div>

          {/* Report Card Content */}
          <div className="p-8 print:p-12">
            {/* Header */}
            <div className="flex items-center justify-between mb-8 border-b-2 border-gray-300 pb-6">
              {schoolSettings?.logoUrl && (
                <img
                  src={schoolSettings.logoUrl}
                  alt="Logo"
                  className="h-20 w-20 object-contain"
                />
              )}
              <div className="flex-1 text-center">
                <h2 className="text-3xl font-bold text-gray-800 mb-1">
                  {schoolSettings?.schoolName || 'School Management System'}
                </h2>
                <p className="text-gray-600 italic font-medium">
                  {schoolSettings?.schoolMotto || 'Excellence in Education'}
                </p>
                <h3 className="text-xl font-semibold text-gray-500 mt-2 uppercase tracking-wider">
                  Student Report Card
                </h3>
              </div>
              <div className="h-20 w-20"></div> {/* Spacer for symmetry */}
            </div>

            {/* Student and Exam Information */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <h4 className="text-sm font-semibold text-gray-500 uppercase mb-3">
                  Student Information
                </h4>
                <div className="space-y-2">
                  <p className="text-gray-800">
                    <span className="font-medium">Name:</span> {reportData.student.name}
                  </p>
                  <p className="text-gray-800">
                    <span className="font-medium">Roll Number:</span> {reportData.student.rollNo}
                  </p>
                  <p className="text-gray-800">
                    <span className="font-medium">Class:</span> {reportData.student.class}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-500 uppercase mb-3">
                  Exam Information
                </h4>
                <div className="space-y-2">
                  <p className="text-gray-800">
                    <span className="font-medium">Exam:</span> {reportData.exam.name}
                  </p>
                  <p className="text-gray-800">
                    <span className="font-medium">Date:</span>{' '}
                    {new Date(reportData.exam.date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Marks Table */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">
                Subject-wise Performance
              </h4>
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-3 text-left font-semibold">
                      Subject
                    </th>
                    <th className="border border-gray-300 px-4 py-3 text-left font-semibold">
                      Code
                    </th>
                    <th className="border border-gray-300 px-4 py-3 text-center font-semibold">
                      Marks Obtained
                    </th>
                    <th className="border border-gray-300 px-4 py-3 text-center font-semibold">
                      Max Marks
                    </th>
                    <th className="border border-gray-300 px-4 py-3 text-center font-semibold">
                      Grade
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.results.map((result, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-3">
                        {result.subject}
                      </td>
                      <td className="border border-gray-300 px-4 py-3">
                        {result.subjectCode || '-'}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center font-semibold">
                        {result.marks}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        100
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <span className={`inline-block px-3 py-1 rounded font-semibold ${result.grade === 'A+' || result.grade === 'A'
                          ? 'bg-green-100 text-green-800'
                          : result.grade === 'B' || result.grade === 'C'
                            ? 'bg-blue-100 text-blue-800'
                            : result.grade === 'D'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                          {result.grade}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="bg-gray-50 p-6 rounded-lg border-2 border-gray-300">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">
                Performance Summary
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Total Marks</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {reportData.summary.totalMarks}/{reportData.summary.maxMarks}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Percentage</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {reportData.summary.percentage}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Overall Grade</p>
                  <p className={`text-3xl font-bold ${reportData.summary.overallGrade === 'A+' || reportData.summary.overallGrade === 'A'
                    ? 'text-green-600'
                    : reportData.summary.overallGrade === 'B' || reportData.summary.overallGrade === 'C'
                      ? 'text-blue-600'
                      : reportData.summary.overallGrade === 'D'
                        ? 'text-yellow-600'
                        : 'text-red-600'
                    }`}>
                    {reportData.summary.overallGrade}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Status</p>
                  <p className={`text-lg font-semibold ${reportData.summary.percentage >= 50 ? 'text-green-600' : 'text-red-600'
                    }`}>
                    {reportData.summary.percentage >= 50 ? 'PASS' : 'FAIL'}
                  </p>
                </div>
              </div>
            </div>

            {/* Grading Scale */}
            <div className="mt-8 pt-6 border-t border-gray-300">
              <h4 className="text-sm font-semibold text-gray-600 mb-3">Grading Scale</h4>
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <span>A+: 90-100</span>
                <span>A: 80-89</span>
                <span>B: 70-79</span>
                <span>C: 60-69</span>
                <span>D: 50-59</span>
                <span>F: Below 50</span>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-12 pt-6 border-t border-gray-300 flex justify-between text-sm text-gray-600">
              <div>
                <p>Generated on: {new Date().toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="mb-8">_____________________</p>
                <p>Principal's Signature</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Send Report via Email</h2>
              <button onClick={() => setShowEmailModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Email</label>
                <input
                  type="email"
                  placeholder="parent@example.com"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  className="w-full rounded-md border-gray-300 border p-2"
                />
              </div>
              <button
                onClick={handleSendEmail}
                disabled={sendingEmail || !emailAddress}
                className="w-full bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700 disabled:opacity-50"
              >
                {sendingEmail ? 'Sending...' : 'Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Configuration Modal */}
      {showEmailConfig && (
        <EmailConfig
          onClose={() => setShowEmailConfig(false)}
          onSave={() => setShowEmailConfig(false)}
        />
      )}

      {/* Print-specific styles */}
      <style>{`
        @media print {
          body {
            background: white;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:p-12 {
            padding: 3rem !important;
          }
          @page {
            margin: 1cm;
          }
        }
      `}</style>
    </div>
  );
};

export default ReportCard;
