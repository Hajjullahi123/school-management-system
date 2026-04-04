import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, API_BASE_URL } from '../../api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const BulkStudentUpload = () => {
  const [csvData, setCsvData] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState([]);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    fetchClasses();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await api.get('/api/classes');
      if (response.ok) {
        const data = await response.json();
        setClasses(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCsvData(event.target.result);
      };
      reader.readAsText(file);
    }
  };

  const parseCSV = (csvText) => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());

    const students = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const student = {};
      headers.forEach((header, index) => {
        student[header] = values[index] || '';
      });
      students.push(student);
    }
    return students;
  };

  const handleUpload = async () => {
    if (!csvData && !selectedFile) {
      alert('Please select a CSV file first');
      return;
    }

    setLoading(true);
    try {
      if (selectedFile) {
        // Use multipart upload if a file was selected directly
        const formData = new FormData();
        formData.append('file', selectedFile);

        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/bulk-upload/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        const result = await response.json();
        setResults(result);
      } else {
        // Fallback for legacy text area paste
        const students = parseCSV(csvData);
        const response = await api.post('/api/bulk-upload/bulk-upload', { students });
        const result = await response.json();
        setResults(result);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload students');
    } finally {
      setLoading(false);
    }
  };

  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      // Also read as text for preview if it's small enough
      if (file.size < 1024 * 1024 && file.name.toLowerCase().endsWith('.csv')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setCsvData(event.target.result);
        };
        reader.readAsText(file);
      } else if (file.name.toLowerCase().endsWith('.xlsx')) {
        setCsvData("Excel file detected. Click Upload to process students.");
      } else {
        setCsvData("File ready for upload.");
      }
    }
  };

  const downloadResults = () => {
    if (!results || !results.successful || results.successful.length === 0) return;

    const headers = ['Name', 'Admission Number', 'Username', 'Default Password'];
    const rows = results.successful.map(s => [
      s.name,
      s.admissionNumber,
      s.username,
      'student123' // Updated default password to match backend
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `uploaded_students_credentials_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadTemplate = async () => {
    const url = `${API_BASE_URL}/api/bulk-upload/template/students`;
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download template');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `Student_Bulk_Upload_Template.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      a.remove();
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download template. Please try downloading it from the Student Management page.');
    }
  };

  const downloadGuidancePDF = () => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(22);
    doc.setTextColor(44, 62, 80);
    doc.text('Bulk Student Upload Guidance', 105, 20, { align: 'center' });

    // Instructions
    doc.setFontSize(14);
    doc.setTextColor(52, 73, 94);
    doc.text('Step-by-Step Instructions:', 20, 35);

    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    const instructions = [
      '1. Download the Excel template from the admin dashboard.',
      '2. Open the template in Microsoft Excel or Google Sheets.',
      '3. Fill in the student data. Ensure First Name, Last Name, and Class ID are provided.',
      '4. For the "Class ID" column, select the class from the drop-down menu.',
      '5. Use the drop-down menus for Gender, Genotype, Disability, and Scholarship columns.',
      '6. Save your file as an "Excel Workbook (.xlsx)" to keep the dropdowns working.',
      '7. Upload the saved Excel file through the system to complete import.'
    ];
    doc.text(instructions, 20, 45);

    // Class IDs Table
    doc.setFontSize(14);
    doc.setTextColor(52, 73, 94);
    doc.text('Official Class IDs Reference:', 20, 90);

    autoTable(doc, {
      startY: 95,
      head: [['Local ID (Value for Template)', 'Class Name', 'Class Arm']],
      body: classes.map((c, index) => [index + 1, c.name, c.arm || 'N/A']),
      headStyles: { fillColor: [43, 108, 176] },
      margin: { top: 10 }
    });

    // Formatting Note
    const finalY = (doc).lastAutoTable.finalY + 15;
    doc.setFontSize(10);
    doc.setTextColor(150, 0, 0);
    doc.text('IMPORTANT: Dates must be in YYYY-MM-DD format (e.g., 2015-05-15).', 20, finalY);

    doc.save('Bulk_Upload_Guidance_IDs.pdf');
  };

  const downloadPrintableForm = () => {
    const doc = new jsPDF();
    const primaryColor = settings?.primaryColor || '#1e40af';
    
    // Header Section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(primaryColor);
    doc.text(settings?.schoolName || 'SCHOOL NAME', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100);
    doc.text(settings?.schoolMotto || 'Motto goes here', 105, 26, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(settings?.schoolAddress || 'Address, City, State', 105, 32, { align: 'center' });
    doc.text(`Phone: ${settings?.schoolPhone || ''} | Email: ${settings?.schoolEmail || ''}`, 105, 36, { align: 'center' });

    doc.setLineWidth(0.5);
    doc.setDrawColor(primaryColor);
    doc.line(20, 42, 190, 42);

    // Form Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('STUDENT ADMISSION / ENROLLMENT FORM', 105, 52, { align: 'center' });
    
    // Instruction
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('Instructions: Please fill this form in BLOCK LETTERS. Return to the School Admin upon completion.', 105, 58, { align: 'center' });

    let y = 70;
    const drawSectionHeader = (title, currentY) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setFillColor(240, 240, 240);
      doc.rect(20, currentY - 5, 170, 7, 'F');
      doc.setTextColor(primaryColor);
      doc.text(title, 25, currentY);
      return currentY + 12;
    };

    const drawField = (label, currentY, width = 170) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(50);
      doc.text(label, 20, currentY);
      doc.setDrawColor(200);
      doc.setLineWidth(0.1);
      doc.line(20, currentY + 2, 20 + width, currentY + 2);
      return currentY + 10;
    };

    // Personal Information
    y = drawSectionHeader('PERSONAL INFORMATION', y);
    y = drawField('First Name:', y, 170);
    y = drawField('Last Name:', y, 170);
    y = drawField('Middle Name:', y, 170);
    
    // Row 1: Gender & DOB
    doc.setFont('helvetica', 'bold');
    doc.text('Gender (Male/Female):', 20, y);
    doc.line(20, y+2, 90, y+2);
    doc.text('Date of Birth (YYYY-MM-DD):', 100, y);
    doc.line(100, y+2, 190, y+2);
    y += 12;

    // Row 2: Genotype & Disability
    doc.text('Genotype (AA, AS, SS, etc):', 20, y);
    doc.line(20, y+2, 90, y+2);
    doc.text('Disability (if any):', 100, y);
    doc.line(100, y+2, 190, y+2);
    y += 12;

    y = drawField('Student Email (Optional):', y, 170);
    y = drawField('Home Address:', y, 170);
    y = drawField('Home Address (Contd):', y, 170);

    // Parent Information
    y += 5;
    y = drawSectionHeader('PARENT / GUARDIAN INFORMATION', y);
    y = drawField("Full Name:", y, 170);
    y = drawField("Phone Number:", y, 170);
    y = drawField("Email Address:", y, 170);

    // Academic Information
    y += 5;
    y = drawSectionHeader('ACADEMIC INFORMATION', y);
    y = drawField("Intended Class:", y, 170);
    
    doc.text('Scholarship Eligibility (Yes/No):', 20, y);
    doc.line(20, y+2, 90, y+2);
    y += 20;

    // Consent section
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('Declaration: I hereby certify that the information provided above is true and correct to the best of my knowledge.', 20, y);
    y += 15;
    
    doc.setFont('helvetica', 'bold');
    doc.text('Parent/Guardian Signature: ___________________________', 20, y);
    doc.text('Date: _______________', 140, y);
    
    y += 25;
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.rect(20, y, 170, 30);
    doc.setFontSize(9);
    doc.text('OFFICIAL USE ONLY', 105, y + 6, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text('Admission No: ____________________', 25, y + 14);
    doc.text('Class Assigned: ___________________', 25, y + 22);
    doc.text('Admin Signature: __________________', 110, y + 22);

    doc.save(`Admission_Form_${settings?.schoolName?.replace(/\s+/g, '_') || 'Student'}.pdf`);
  };



  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Bulk Student Upload</h1>
        <Link
          to="/dashboard/users"
          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          Back to User Management
        </Link>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3">📋 Upload Instructions</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
          <li>Download the Excel (.xlsx) template below</li>
          <li>Fill in student information (First Name, Last Name, and Class ID are required)</li>
          <li>New: Use the drop-down menus for <strong>Class ID, Gender, Genotype, Disability, and Scholarship</strong></li>
          <li>For the "Class ID" column, simply select the mapped class from the dropdown list menu.</li>
          <li>Upload the Excel file (.xlsx) using the form below (saving as .csv will remove dropdowns)</li>
          <li>Review the results and fix any errors if needed</li>
        </ol>
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
          <strong>Note for Teachers:</strong> You can only upload students for classes where you are the assigned <strong>Class Teacher</strong>. If you try to upload for other classes, it will fail.
        </div>
      </div>

      {/* Step 0: Download Printable Form */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h3 className="font-bold text-indigo-900 text-lg">Step 0: Offline Data Collection</h3>
            <p className="text-sm text-indigo-800">
              Download and print this form to collect student information manually before entering it into the bulk upload template.
            </p>
          </div>
          <button
            onClick={downloadPrintableForm}
            className="whitespace-nowrap bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 flex items-center justify-center gap-2 font-bold transition-all shadow-lg active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Admission Form (PDF)
          </button>
        </div>
      </div>

      {/* Template Download */}
      <div className="bg-white p-6 rounded-lg shadow grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-lg font-semibold mb-4">Step 1: Download Template</h3>
          <button
            onClick={downloadTemplate}
            className="w-full bg-primary text-white px-6 py-3 rounded-xl hover:brightness-90 flex items-center justify-center gap-2 font-bold transition-all shadow-lg active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Excel Template
          </button>
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-4">Need Help? Get IDs</h3>
          <button
            onClick={downloadGuidancePDF}
            className="w-full bg-amber-500 text-white px-6 py-3 rounded-xl hover:brightness-90 flex items-center justify-center gap-2 font-bold transition-all shadow-lg active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Guidance PDF (incl. IDs)
          </button>
        </div>
      </div>

      {/* File Upload */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Step 2: Upload Filled Template</h3>
        <div className="space-y-4">
          <input
            type="file"
            accept=".csv, .xlsx"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/5 file:text-primary hover:file:bg-primary/10"
          />

          {csvData && (
            <div className="bg-gray-50 p-4 rounded border">
              <p className="text-sm text-gray-600 mb-2">Preview (first 500 characters):</p>
              <pre className="text-xs overflow-x-auto">{csvData.substring(0, 500)}...</pre>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={loading || !csvData}
            className="bg-primary text-white px-8 py-3 rounded-md hover:brightness-90 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Processing...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload Students
              </>
            )}
          </button>
        </div>
      </div>

      {/* Results */}
      {results && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Upload Results</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-600 font-medium">Successful</p>
                <p className="text-3xl font-bold text-green-700">{results.successful?.length || 0}</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-600 font-medium">Failed</p>
                <p className="text-3xl font-bold text-red-700">{results.failed?.length || 0}</p>
              </div>
            </div>

            {results.successful && results.successful.length > 0 && (
              <div className="mt-6">
                <button
                  onClick={downloadResults}
                  className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Credentials CSV
                </button>
                <p className="text-xs text-gray-500 mt-2 italic">* Password for all students is set to '123456' by default.</p>
              </div>
            )}
          </div>

          {/* Successful Uploads */}
          {results.successful && results.successful.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4 text-green-700">✓ Successfully Uploaded Students</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Admission No.</th>
                      <th className="px-4 py-2 text-left">Name</th>
                      <th className="px-4 py-2 text-left">Username</th>
                      <th className="px-4 py-2 text-left">Class</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {results.successful.map((student, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium text-primary">{student.admissionNumber}</td>
                        <td className="px-4 py-2">{student.name}</td>
                        <td className="px-4 py-2 font-mono text-xs">{student.username}</td>
                        <td className="px-4 py-2">{student.class}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Failed Uploads */}
          {results.failed && results.failed.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4 text-red-700">✗ Failed Uploads</h3>
              <div className="space-y-3">
                {results.failed.map((failure, idx) => (
                  <div key={idx} className="bg-red-50 border border-red-200 rounded p-3">
                    <p className="text-sm font-medium text-red-800">
                      {failure.data?.firstName} {failure.data?.lastName}
                    </p>
                    <p className="text-xs text-red-600 mt-1">Error: {failure.error}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Field Reference */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Template Field Reference</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium text-gray-700">Required Fields:</p>
            <ul className="list-disc list-inside text-gray-600 mt-2 space-y-1">
              <li><code className="bg-gray-100 px-1">First Name</code></li>
              <li><code className="bg-gray-100 px-1">Last Name</code></li>
              <li><code className="bg-gray-100 px-1">Class ID</code> (select from dropdown)</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-gray-700">Optional Fields:</p>
            <ul className="list-disc list-inside text-gray-600 mt-2 space-y-1">
              <li><code className="bg-gray-100 px-1">Date of Birth</code> (YYYY-MM-DD)</li>
              <li><code className="bg-gray-100 px-1">Gender</code> (select from dropdown)</li>
              <li><code className="bg-gray-100 px-1">Email</code></li>
              <li><code className="bg-gray-100 px-1">Parent Name</code></li>
              <li><code className="bg-gray-100 px-1">Scholarship</code> (select from dropdown)</li>
              <li>...and more (see template)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkStudentUpload;
