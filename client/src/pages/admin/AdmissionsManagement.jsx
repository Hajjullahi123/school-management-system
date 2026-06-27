import React, { useState, useEffect } from 'react';
import { api, API_BASE_URL } from '../../api';
import { FiSearch, FiFilter, FiEye, FiCheck, FiX, FiUserPlus, FiCreditCard, FiDownload, FiCheckCircle, FiPrinter } from 'react-icons/fi';
import toast from 'react-hot-toast';
import useSchoolSettings from '../../hooks/useSchoolSettings';

const AdmissionsManagement = () => {
  const [applications, setApplications] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  
  const { settings: schoolSettings } = useSchoolSettings();
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateForm, setGenerateForm] = useState({ purchaserName: '', purchaserPhone: '', gradeLevel: '' });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTokenData, setGeneratedTokenData] = useState(null);
  
  // Modals state
  const [selectedApp, setSelectedApp] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAdmitModal, setShowAdmitModal] = useState(false);
  
  // Admit Form State
  const [targetClassId, setTargetClassId] = useState('');
  const [admissionNumberOverride, setAdmissionNumberOverride] = useState('');
  const [isAdmitting, setIsAdmitting] = useState(false);

  useEffect(() => {
    fetchApplications();
    fetchClasses();
  }, []);

  const handleGenerateToken = async (e) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      const res = await api.post('/api/admissions/admin/generate-token', generateForm);
      const data = await res.json();
      if (res.ok) {
        setGeneratedTokenData(data.applicationCode);
        fetchApplications();
      } else {
        toast.error(data.error || 'Failed to generate token');
      }
    } catch (err) {
      toast.error('Network error generating token');
    } finally {
      setIsGenerating(false);
    }
  };

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admissions/admin/list');
      if (res.ok) {
        const data = await res.json();
        setApplications(data);
      } else {
        toast.error('Failed to load applications');
      }
    } catch (error) {
      console.error(error);
      toast.error('Network error loading applications');
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await api.get('/api/classes');
      if (res.ok) {
        const data = await res.json();
        setClasses(data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpdateStatus = async (appId, status, paymentStatus = null) => {
    try {
      const res = await api.put(`/api/admissions/admin/${appId}/status`, {
        status,
        paymentStatus
      });
      if (res.ok) {
        toast.success(paymentStatus === 'paid' ? 'Payment marked as verified!' : 'Status updated successfully!');
        fetchApplications();
        if (selectedApp && selectedApp.id === appId) {
          const updated = await res.json();
          setSelectedApp(updated.application);
        }
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update status');
      }
    } catch (error) {
      console.error(error);
      toast.error('Connection error updating status');
    }
  };

  const handleAdmitSubmit = async (e) => {
    e.preventDefault();
    if (!targetClassId) {
      toast.error('Please select a class placement');
      return;
    }

    setIsAdmitting(true);
    try {
      const res = await api.post(`/api/admissions/admin/${selectedApp.id}/convert`, {
        classId: targetClassId,
        admissionNumberOverride: admissionNumberOverride || undefined
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Success! Student created with Admission No: ${data.admissionNumber}`);
        setShowAdmitModal(false);
        setShowDetailModal(false);
        setTargetClassId('');
        setAdmissionNumberOverride('');
        fetchApplications();
      } else {
        toast.error(data.error || 'Failed to admit applicant');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error occurred while converting applicant to student');
    } finally {
      setIsAdmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: 'bg-gray-100 text-gray-800 border-gray-200',
      submitted: 'bg-blue-50 text-blue-700 border-blue-100',
      under_review: 'bg-amber-50 text-amber-700 border-amber-100',
      admitted: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      rejected: 'bg-red-50 text-red-700 border-red-100'
    };
    return (
      <span className={`px-2 py-0.5 text-xs font-bold border rounded-full capitalize ${badges[status] || badges.draft}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  const getPaymentBadge = (status) => {
    return status === 'paid' ? (
      <span className="px-2 py-0.5 text-xs font-bold bg-green-50 text-green-700 border border-green-100 rounded-full">
        Paid
      </span>
    ) : (
      <span className="px-2 py-0.5 text-xs font-bold bg-rose-50 text-rose-700 border border-rose-100 rounded-full animate-pulse">
        Pending
      </span>
    );
  };

  // Filter list
  const filteredApps = applications.filter(app => {
    const candidateName = `${app.candidateFirstName || ''} ${app.candidateLastName || ''}`.toLowerCase();
    const parentName = (app.parentName || '').toLowerCase();
    const appCode = (app.applicationCode || '').toLowerCase();
    const parentPhone = (app.parentPhone || '');
    const searchLower = (searchTerm || '').toLowerCase();

    const matchesSearch = 
      candidateName.includes(searchLower) ||
      parentName.includes(searchLower) ||
      appCode.includes(searchLower) ||
      parentPhone.includes(searchTerm);
      
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    const matchesPayment = paymentFilter === 'all' || app.paymentStatus === paymentFilter;

    return matchesSearch && matchesStatus && matchesPayment;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Online Admissions Portal</h1>
          <p className="text-gray-500 text-sm">Review, verify, and convert online applicants to active school students.</p>
        </div>
        <button
          onClick={() => { setGenerateForm({ purchaserName: '', purchaserPhone: '', gradeLevel: '' }); setShowGenerateModal(true); }}
          className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
        >
          <FiPrinter /> Generate Admission Token
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-gray-150 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Search */}
        <div className="relative col-span-2">
          <FiSearch className="absolute left-3 top-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by candidate name, parent name, code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
          />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <FiFilter className="absolute left-3 top-3.5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm appearance-none bg-white"
          >
            <option value="all">All Application Statuses</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="admitted">Admitted</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Payment Filter */}
        <div className="relative">
          <FiFilter className="absolute left-3 top-3.5 text-gray-400" />
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm appearance-none bg-white"
          >
            <option value="all">All Payment Statuses</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Applications List */}
      <div className="bg-white rounded-xl border border-gray-150 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-10 h-10 border-4 border-t-transparent border-primary rounded-full animate-spin"></div>
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="text-center py-16 text-gray-500 text-sm">
            No admission applications found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-150 text-xs font-bold text-gray-400 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Code</th>
                  <th className="px-6 py-4">Candidate</th>
                  <th className="px-6 py-4">Parent / Phone</th>
                  <th className="px-6 py-4">Grade Placement</th>
                  <th className="px-6 py-4">Form Payment</th>
                  <th className="px-6 py-4">Admissions Status</th>
                  <th className="px-6 py-4">Registered Date</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredApps.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-700">{app.applicationCode}</td>
                    <td className="px-6 py-4 font-semibold text-gray-900">{app.candidateFirstName} {app.candidateLastName}</td>
                    <td className="px-6 py-4">
                      <div>{app.parentName}</div>
                      <div className="text-xs text-gray-400">{app.parentPhone}</div>
                    </td>
                    <td className="px-6 py-4">{app.gradeLevel}</td>
                    <td className="px-6 py-4">{getPaymentBadge(app.paymentStatus)}</td>
                    <td className="px-6 py-4">{getStatusBadge(app.status)}</td>
                    <td className="px-6 py-4 text-gray-500">{new Date(app.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => { setSelectedApp(app); setShowDetailModal(true); }}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold flex items-center gap-1.5 mx-auto"
                      >
                        <FiEye className="w-3.5 h-3.5" /> View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETAIL MODAL */}
      {showDetailModal && selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-gray-150 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Application: {selectedApp.applicationCode}</h3>
                <p className="text-gray-400 text-xs mt-0.5">Submitted: {new Date(selectedApp.createdAt).toLocaleString()}</p>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-900 text-lg">×</button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
              <div className="grid grid-cols-2 gap-6">
                {/* Candidate Info */}
                <div className="space-y-3">
                  <h4 className="font-bold text-gray-900 border-b border-gray-100 pb-1 uppercase text-xs tracking-wider text-gray-400">Candidate biodata</h4>
                  <p><strong>Full Name:</strong> {selectedApp.candidateFirstName} {selectedApp.candidateMiddleName || ''} {selectedApp.candidateLastName}</p>
                  <p><strong>Gender:</strong> <span className="capitalize">{selectedApp.gender}</span></p>
                  <p><strong>Date of Birth:</strong> {selectedApp.dateOfBirth ? new Date(selectedApp.dateOfBirth).toLocaleDateString() : 'N/A'}</p>
                  <p><strong>Grade Level:</strong> {selectedApp.gradeLevel}</p>
                  <p><strong>Previous School:</strong> {selectedApp.previousSchool || 'None'}</p>
                </div>

                {/* Parent Info */}
                <div className="space-y-3">
                  <h4 className="font-bold text-gray-900 border-b border-gray-100 pb-1 uppercase text-xs tracking-wider text-gray-400">Parent / Guardian</h4>
                  <p><strong>Name:</strong> {selectedApp.parentName}</p>
                  <p><strong>Phone:</strong> {selectedApp.parentPhone}</p>
                  <p><strong>Email:</strong> {selectedApp.parentEmail}</p>
                  <p><strong>Address:</strong> {selectedApp.parentAddress || 'N/A'}</p>
                </div>
              </div>

              {/* Document Attachments */}
              <div className="space-y-3">
                <h4 className="font-bold text-gray-900 border-b border-gray-100 pb-1 uppercase text-xs tracking-wider text-gray-400">Uploaded Documents</h4>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Passport Photo', url: selectedApp.passportPhotoUrl },
                    { label: 'Birth Certificate', url: selectedApp.birthCertUrl },
                    { label: 'Previous Result', url: selectedApp.reportCardUrl }
                  ].map((doc, idx) => (
                    <div key={idx} className="border border-gray-150 rounded-xl p-3 flex flex-col items-center justify-center text-center space-y-2 bg-gray-50/50">
                      <span className="font-semibold text-xs text-gray-700">{doc.label}</span>
                      {doc.url ? (
                        <a href={doc.url.startsWith('data:') ? doc.url : `${API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL}${doc.url}`} 
                           target="_blank" rel="noreferrer" 
                           className="px-3 py-1 bg-primary text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-sm">
                          <FiDownload /> View / Get
                        </a>
                      ) : (
                        <span className="text-[10px] text-gray-400 font-medium">Not Uploaded</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Status and Action Buttons */}
              <div className="p-4 bg-gray-50 border border-gray-150 rounded-xl space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <div>
                    <strong>Payment:</strong> {getPaymentBadge(selectedApp.paymentStatus)}
                  </div>
                  <div>
                    <strong>Admissions Status:</strong> {getStatusBadge(selectedApp.status)}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200 justify-end">
                  {selectedApp.paymentStatus !== 'paid' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedApp.id, null, 'paid')}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-emerald-700"
                    >
                      <FiCheckCircle className="w-3.5 h-3.5" /> Mark Offline Payment Paid
                    </button>
                  )}

                  {selectedApp.status === 'submitted' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedApp.id, 'under_review')}
                      className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600"
                    >
                      Move to Under Review
                    </button>
                  )}

                  {selectedApp.status !== 'admitted' && selectedApp.status !== 'rejected' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedApp.id, 'rejected')}
                      className="px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-bold hover:bg-rose-100"
                    >
                      Reject Application
                    </button>
                  )}

                  {selectedApp.status !== 'admitted' && selectedApp.paymentStatus === 'paid' && (
                    <button
                      onClick={() => setShowAdmitModal(true)}
                      className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-indigo-700"
                    >
                      <FiUserPlus className="w-3.5 h-3.5" /> Admit & Convert to Student
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADMIT STUDENT SUB-MODAL */}
      {showAdmitModal && selectedApp && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-gray-100 p-6 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Student Placement Placement</h3>
              <p className="text-gray-400 text-xs mt-0.5">Assign applicant to a class and generate student records.</p>
            </div>

            <form onSubmit={handleAdmitSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Target Class Placement</label>
                <select
                  required
                  value={targetClassId}
                  onChange={(e) => setTargetClassId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none"
                >
                  <option value="">Select a class</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name} {c.arm || ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Admission Number (Optional)</label>
                <input
                  type="text"
                  placeholder="Leave empty to auto-generate"
                  value={admissionNumberOverride}
                  onChange={(e) => setAdmissionNumberOverride(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none placeholder-gray-400"
                />
                <p className="mt-1 text-[10px] text-gray-400">If left blank, the system automatically format-codes the next sequential admission number.</p>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdmitModal(false)}
                  className="px-4 py-2 border border-gray-200 hover:bg-gray-50 rounded-lg text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdmitting}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold disabled:bg-gray-400"
                >
                  {isAdmitting ? 'Converting...' : 'Admit & Generate Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generate Token Modal */}
      {showGenerateModal && !generatedTokenData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-900">Generate Admission Token</h3>
              <button onClick={() => setShowGenerateModal(false)} className="text-gray-400 hover:text-gray-600">
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleGenerateToken} className="p-6 space-y-4">
              <p className="text-xs text-gray-500 mb-4">Generate a pre-paid admission token after receiving offline payment. The printed token allows parents to apply online.</p>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Purchaser Name (Optional)</label>
                <input type="text" placeholder="e.g. Aisha Musa" className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm" value={generateForm.purchaserName} onChange={e => setGenerateForm({ ...generateForm, purchaserName: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Purchaser Phone (Optional)</label>
                <input type="text" placeholder="+234..." className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm" value={generateForm.purchaserPhone} onChange={e => setGenerateForm({ ...generateForm, purchaserPhone: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Target Grade (Optional)</label>
                <select className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm" value={generateForm.gradeLevel} onChange={e => setGenerateForm({ ...generateForm, gradeLevel: e.target.value })}>
                  <option value="">Select Grade</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowGenerateModal(false)} className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button type="submit" disabled={isGenerating} className="px-4 py-2 text-sm font-bold text-white bg-primary hover:bg-primary/90 rounded-lg disabled:opacity-50">
                  {isGenerating ? 'Generating...' : 'Generate & Print'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Slip Modal */}
      {showGenerateModal && generatedTokenData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50 print:hidden">
              <h3 className="font-bold text-gray-900">Token Generated Successfully</h3>
              <button onClick={() => { setShowGenerateModal(false); setGeneratedTokenData(null); }} className="text-gray-400 hover:text-gray-600">
                <FiX className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 bg-white printable-token text-center" id="printable-token-area">
              {schoolSettings?.logoUrl && (
                <img src={`${API_BASE_URL}${schoolSettings.logoUrl}`} alt="Logo" className="w-16 h-16 mx-auto mb-2 object-contain grayscale" />
              )}
              <h2 className="font-black text-lg uppercase tracking-wider border-b-2 border-dashed pb-2 mb-4">{schoolSettings?.schoolName || 'Admissions'}</h2>
              
              <div className="mb-6">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Admission Token</p>
                <div className="bg-gray-100 py-3 rounded-lg border-2 border-gray-300">
                  <span className="font-mono text-2xl font-black tracking-widest">{generatedTokenData}</span>
                </div>
              </div>

              <div className="text-left text-xs space-y-3 mb-6">
                <p className="font-bold uppercase tracking-wider text-center text-gray-700">Instructions to Apply</p>
                <ol className="list-decimal pl-4 space-y-2 text-gray-600">
                  <li>Visit our website at <strong>educatechportal.com/{schoolSettings?.schoolSlug}</strong></li>
                  <li>Click on <strong>Apply for Admission</strong></li>
                  <li>In the <strong>Enter Admission Token</strong> section, type in the token printed above exactly as shown.</li>
                  <li>Follow the on-screen steps to securely complete your application form.</li>
                </ol>
              </div>
              
              <div className="text-[9px] text-gray-400 uppercase tracking-wider border-t pt-2">
                Keep this token secure. It provides full access to the online form.
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t flex justify-end gap-3 print:hidden">
              <button onClick={() => { setShowGenerateModal(false); setGeneratedTokenData(null); }} className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg">Close</button>
              <button onClick={() => {
                const printContent = document.getElementById('printable-token-area').innerHTML;
                const originalContent = document.body.innerHTML;
                document.body.innerHTML = printContent;
                window.print();
                document.body.innerHTML = originalContent;
                window.location.reload(); // Quick way to restore app state after crude HTML swap
              }} className="px-4 py-2 text-sm font-bold text-white bg-primary hover:bg-primary/90 flex items-center justify-center gap-2 rounded-lg">
                <FiPrinter /> Print Slip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdmissionsManagement;
