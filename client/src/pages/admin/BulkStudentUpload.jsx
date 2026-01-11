import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const BulkStudentUpload = () => {
  const [csvData, setCsvData] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    fetchClasses();
  }, []);

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
    if (!csvData) {
      alert('Please select a CSV file first');
      return;
    }

    setLoading(true);
    try {
      const students = parseCSV(csvData);

      const response = await api.post('/api/bulk-upload/bulk-upload', { students });

      const result = await response.json();
      setResults(result);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload students');
    } finally {
      setLoading(false);
    }
  };

  const downloadResults = () => {
    if (!results || !results.successful || results.successful.length === 0) return;

    const headers = ['Name', 'Admission Number', 'Username', 'Default Password'];
    const rows = results.successful.map(s => [
      s.name,
      s.admissionNumber,
      s.username,
      '123456' // Default password used in bulk upload
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

  const downloadTemplate = () => {
    const template =
      `firstName,lastName,classId,dateOfBirth,gender,email,parentGuardianName,parentGuardianPhone,parentEmail,bloodGroup,genotype,stateOfOrigin,nationality,address,disability
John,Doe,${classes[0]?.id || 1},2010-01-15,Male,john@example.com,Mr. Doe,08012345678,parent@example.com,O+,AA,Lagos,Nigerian,123 Street,None
Jane,Smith,${classes[0]?.id || 1},2010-03-20,Female,jane@example.com,Mrs. Smith,08087654321,parent2@example.com,A+,AS,Abuja,Nigerian,456 Avenue,None`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_upload_template.csv';
    a.click();
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
      '1. Download the CSV template from the admin dashboard.',
      '2. Open the template in Excel, Google Sheets, or a text editor.',
      '3. Fill in the student data. Ensure firstName, lastName, and classId are provided.',
      '4. The "classId" MUST be numeric. Refer to the table below for correct IDs.',
      '5. Save your file as "Comma Separated Values (.csv)".',
      '6. Upload the saved CSV file through the system to complete import.'
    ];
    doc.text(instructions, 20, 45);

    // Class IDs Table
    doc.setFontSize(14);
    doc.setTextColor(52, 73, 94);
    doc.text('Official Class IDs Reference:', 20, 90);

    autoTable(doc, {
      startY: 95,
      head: [['ID (Value for CSV)', 'Class Name', 'Class Arm']],
      body: classes.map(c => [c.id, c.name, c.arm || 'N/A']),
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



  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Bulk Student Upload</h1>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3">📋 Upload Instructions</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
          <li>Download the CSV template below</li>
          <li>Fill in student information (firstName, lastName, and classId are required)</li>
          <li>Save the file as CSV format</li>
          <li>Upload the file using the form below</li>
          <li>Review the results and fix any errors if needed</li>
        </ol>
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
          <strong>Note for Teachers:</strong> You can only upload students for classes where you are the assigned <strong>Class Teacher</strong>. If you try to upload for other classes, it will fail.
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
            Download CSV Template
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
        <h3 className="text-lg font-semibold mb-4">Step 2: Upload Filled CSV</h3>
        <div className="space-y-4">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
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
        <h3 className="text-lg font-semibold mb-4">CSV Field Reference</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium text-gray-700">Required Fields:</p>
            <ul className="list-disc list-inside text-gray-600 mt-2 space-y-1">
              <li><code className="bg-gray-100 px-1">firstName</code></li>
              <li><code className="bg-gray-100 px-1">lastName</code></li>
              <li><code className="bg-gray-100 px-1">classId</code> (numeric, e.g., 1, 2, 3)</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-gray-700">Optional Fields:</p>
            <ul className="list-disc list-inside text-gray-600 mt-2 space-y-1">
              <li><code className="bg-gray-100 px-1">dateOfBirth</code> (YYYY-MM-DD)</li>
              <li><code className="bg-gray-100 px-1">gender</code> (Male/Female)</li>
              <li><code className="bg-gray-100 px-1">email</code></li>
              <li><code className="bg-gray-100 px-1">parentGuardianName</code></li>
              <li><code className="bg-gray-100 px-1">bloodGroup</code> (A+, O+, etc.)</li>
              <li>...and more (see template)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkStudentUpload;
