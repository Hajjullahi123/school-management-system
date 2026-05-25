import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, apiCall, API_BASE_URL } from '../../api';
import { toast } from '../../utils/toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const BulkStaffUpload = () => {
  const [csvData, setCsvData] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    // Settings or Classes not needed for staff bulk upload
  }, []);



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
      toast.error('Please select a file first');
      return;
    }

    console.log('[BulkUpload] handleUpload started. selectedFile:', !!selectedFile);
    toast.info('Starting staff upload, please wait...');
    setLoading(true);
    setResults(null); // Clear previous results

    try {
      let result;
      if (selectedFile) {
        console.log('[BulkUpload] Using Multipart Upload');
        // Use multipart upload if a file was selected directly
        const formData = new FormData();
        formData.append('file', selectedFile);

        const response = await apiCall('/api/bulk-upload/upload-staff', {
          method: 'POST',
          body: formData
        });

        console.log('[BulkUpload] Multipart response status:', response.status);

        if (!response.ok) {
          throw new Error(response.data?.error || response.data?.message || 'Failed to upload staff');
        }
        result = response.data;
      } else {
        console.log('[BulkUpload] Using Legacy JSON Upload');
        // Fallback for legacy text area paste
        const students = parseCSV(csvData);
        const response = await apiCall('/api/bulk-upload/upload-staff', {
          method: 'POST',
          body: JSON.stringify({ students })
        });
        
        console.log('[BulkUpload] Legacy response status:', response.status);

        if (!response.ok) {
          throw new Error(response.data?.error || response.data?.message || 'Failed to upload staff');
        }
        result = response.data;
      }

      console.log('[BulkUpload] Success. Results:', result);
      setResults(result);
      toast.success(`Successfully processed staff!`);
      
      // Auto-scroll to results
      setTimeout(() => {
        const element = document.getElementById('upload-results');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300);
    } catch (error) {
      console.error('[BulkUpload] Error during upload:', error);
      toast.error(error.message || 'Failed to upload staff');
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
        setCsvData("Excel file detected. Click Upload to process staff.");
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
      s.password
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `uploaded_staff_credentials_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadTemplate = async () => {
    const url = `${API_BASE_URL}/api/bulk-upload/template/staff`;
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
      a.download = `Staff_Bulk_Upload_Template.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      a.remove();
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download template. Please try downloading it from the User Management page.');
    }
  };





  return (
    <div className="relative min-h-screen space-y-6">
      {loading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center text-white">
          <div className="bg-white p-8 rounded-2xl flex flex-col items-center gap-4 text-gray-900 shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold">Uploading Students...</h3>
              <p className="text-gray-500 text-sm mt-1">This may take a moment. Please do not refresh the page.</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Bulk Staff Upload</h1>
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
          <li>Fill in staff information (First Name, Last Name, and Role are required)</li>
          <li>For the "Role" column, simply select the mapped role from the dropdown list menu.</li>
          <li>Upload the Excel file (.xlsx) using the form below (saving as .csv will remove dropdowns)</li>
          <li>Review the results and fix any errors if needed</li>
        </ol>
      </div>



      {/* Template Download */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h3 className="text-lg font-semibold mb-4">Step 1: Download Template</h3>
        <button
          onClick={downloadTemplate}
          className="w-full md:w-1/2 bg-primary text-white px-6 py-3 rounded-xl hover:brightness-90 flex items-center justify-center gap-2 font-bold transition-all shadow-lg active:scale-95"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download Excel Template
        </button>
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
                Upload Staff
              </>
            )}
          </button>
        </div>
      </div>

      {/* Results */}
      {results && (
        <div className="space-y-4" id="upload-results">
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
                <p className="text-xs text-gray-500 mt-2 italic">* Passwords have been auto-generated.</p>
              </div>
            )}
          </div>

          {/* Successful Uploads */}
          {results.successful && results.successful.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4 text-green-700">✓ Successfully Uploaded Staff</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Admission No.</th>
                      <th className="px-4 py-2 text-left">Name</th>
                      <th className="px-4 py-2 text-left">Username</th>
                      <th className="px-4 py-2 text-left">Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {results.successful.map((student, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium text-primary">{student.admissionNumber}</td>
                        <td className="px-4 py-2">{student.name}</td>
                        <td className="px-4 py-2 font-mono text-xs">{student.username}</td>
                        <td className="px-4 py-2">{student.role}</td>
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
              <li><code className="bg-gray-100 px-1">Role</code> (select from dropdown)</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-gray-700">Optional Fields:</p>
            <ul className="list-disc list-inside text-gray-600 mt-2 space-y-1">
              <li><code className="bg-gray-100 px-1">Email</code></li>
              <li><code className="bg-gray-100 px-1">Phone</code></li>
              <li><code className="bg-gray-100 px-1">Specialization</code> (For Teachers)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkStaffUpload;
