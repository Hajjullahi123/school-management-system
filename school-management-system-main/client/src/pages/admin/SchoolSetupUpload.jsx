import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, apiCall, API_BASE_URL } from '../../api';
import { toast } from '../../utils/toast';

const SchoolSetupUpload = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const downloadTemplate = async () => {
    const url = `${API_BASE_URL}/api/school-setup/template`;
    const token = localStorage.getItem('token');

    try {
      toast.info('Downloading template...');
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
      a.download = `School_Setup_Template.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      a.remove();
      toast.success('Template downloaded successfully!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download template.');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file first');
      return;
    }

    toast.info('Processing school setup, please wait...');
    setLoading(true);
    setResults(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await apiCall('/api/school-setup/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(response.data?.error || response.data?.message || 'Failed to process setup');
      }

      setResults(response.data);
      toast.success('School setup processed successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to process school setup');
    } finally {
      setLoading(false);
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold">Configuring School...</h3>
              <p className="text-gray-500 text-sm mt-1">Creating sessions, terms, classes, subjects, and fees. Do not close or refresh this page.</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">School Setup Wizard</h1>
          <p className="text-sm text-gray-500 mt-1">Configure your academic environment in one single bulk file.</p>
        </div>
        <Link
          to="/dashboard/settings"
          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          Back to Settings
        </Link>
      </div>

      {/* Overview Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-sm">
        <h3 className="font-bold text-blue-900 text-lg mb-2">🚀 Complete Setup in One Step</h3>
        <p className="text-sm text-blue-800 max-w-3xl leading-relaxed">
          This wizard allows you to skip manually clicking through multiple menus to set up your school. You can write your academic session, terms, classes, subjects, and fees in one template, upload it, and the system handles the rest.
        </p>
      </div>

      {/* Setup Steps */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Step 1 */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-bold mb-4">1</span>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Download Template</h3>
            <p className="text-sm text-gray-600 mb-6">
              Download the special Excel template configured for your school. Fill in your terms, sessions, classes, subjects, and fees.
            </p>
          </div>
          <button
            onClick={downloadTemplate}
            className="w-full bg-primary text-white py-3 px-4 rounded-lg hover:brightness-95 transition-all font-bold flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Setup Template
          </button>
        </div>

        {/* Step 2 */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-bold mb-4">2</span>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Upload Completed Template</h3>
            <p className="text-sm text-gray-600 mb-6">
              Upload the saved Excel sheet (.xlsx format). The system will read, parse, and safely import all records.
            </p>
          </div>
          <div className="space-y-4">
            <input
              type="file"
              accept=".xlsx"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/5 file:text-primary hover:file:bg-primary/10 cursor-pointer"
            />
            <button
              onClick={handleUpload}
              disabled={loading || !selectedFile}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-all font-bold flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 11l3-3m0 0l3 3m-3-3v8m0-13a9 9 0 110 18 9 9 0 010-18z" />
              </svg>
              Upload and Configure School
            </button>
          </div>
        </div>
      </div>

      {/* Results View */}
      {results && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
          <div className="border-b border-gray-150 pb-4">
            <h2 className="text-xl font-bold text-gray-900">Configuration Results</h2>
            <p className="text-sm text-gray-500 mt-1">{results.message}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg">
              <span className="text-xs text-blue-600 font-bold uppercase tracking-wider">Session</span>
              <p className="text-lg font-bold text-blue-900 mt-1">{results.session ? results.session.name : 'Skipped/No change'}</p>
            </div>
            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-lg">
              <span className="text-xs text-indigo-600 font-bold uppercase tracking-wider">Terms Created/Updated</span>
              <p className="text-2xl font-bold text-indigo-900 mt-1">{results.termsCreated}</p>
            </div>
            <div className="bg-green-50 border border-green-100 p-4 rounded-lg">
              <span className="text-xs text-green-600 font-bold uppercase tracking-wider">Classes Configured</span>
              <p className="text-2xl font-bold text-green-900 mt-1">{results.classesCreated + results.classesSkipped}</p>
              <span className="text-xs text-green-500 block mt-1">({results.classesCreated} new, {results.classesSkipped} skipped)</span>
            </div>
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-lg">
              <span className="text-xs text-amber-600 font-bold uppercase tracking-wider">Fees Standardized</span>
              <p className="text-2xl font-bold text-amber-900 mt-1">{results.feeStructuresSet}</p>
            </div>
          </div>

          {results.errors && results.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-5">
              <h4 className="font-bold text-red-900 mb-2">⚠️ Process Warnings & Remarks</h4>
              <ul className="list-disc list-inside text-sm text-red-800 space-y-1">
                {results.errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Details Table */}
          <div className="space-y-4">
            <h3 className="font-bold text-gray-800">Setup Breakdown</h3>
            <div className="border border-gray-150 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold">Entity Type</th>
                    <th className="px-6 py-3 text-left font-semibold">Details</th>
                    <th className="px-6 py-3 text-left font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-gray-600">
                  {results.details.session && (
                    <tr>
                      <td className="px-6 py-4 font-medium text-gray-900">Academic Session</td>
                      <td className="px-6 py-4">{results.details.session.name}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          {results.details.session.status}
                        </span>
                      </td>
                    </tr>
                  )}
                  {results.details.terms.map((term) => (
                    <tr key={term.id}>
                      <td className="px-6 py-4 font-medium text-gray-900">Academic Term</td>
                      <td className="px-6 py-4">{term.name} {term.isCurrent && '(Current Term)'}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          {term.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {results.details.classes.map((cls) => (
                    <tr key={cls.id}>
                      <td className="px-6 py-4 font-medium text-gray-900">Class</td>
                      <td className="px-6 py-4">{cls.name}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          cls.status === 'created' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {cls.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {results.details.feeStructures.map((fee, idx) => (
                    <tr key={idx}>
                      <td className="px-6 py-4 font-medium text-gray-900">Term Fee Structure</td>
                      <td className="px-6 py-4">{fee.class}: ₦{fee.amount.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          {fee.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchoolSetupUpload;
