import React, { useState, useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { FiArrowLeft, FiArrowRight, FiCheckCircle, FiSend, FiLock, FiUpload, FiCreditCard, FiDownload } from 'react-icons/fi';
import { API_BASE_URL } from '../config';
import toast from 'react-hot-toast';

/* ── helpers ── */
const hexToRgba = (hex, a = 1) => {
  const h = hex?.replace('#', '') || '4f46e5';
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
};

const darkenHex = (hex, percent) => {
  const h = hex?.replace('#', '') || '4f46e5';
  let r = parseInt(h.substring(0, 2), 16);
  let g = parseInt(h.substring(2, 4), 16);
  let b = parseInt(h.substring(4, 6), 16);
  
  r = Math.floor(r * (1 - percent));
  g = Math.floor(g * (1 - percent));
  b = Math.floor(b * (1 - percent));
  
  return `#${(r < 0 ? 0 : r).toString(16).padStart(2, '0')}${(g < 0 ? 0 : g).toString(16).padStart(2, '0')}${(b < 0 ? 0 : b).toString(16).padStart(2, '0')}`;
};

const getLogoUrl = (src) => {
  if (!src) return null;
  if (src.startsWith('data:image') || src.startsWith('http')) return src;
  const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  return `${base}${src.startsWith('/') ? src : '/' + src}`;
};

const PublicAdmissions = () => {
  const { schoolSlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [error, setError] = useState('');
  
  // Application Access State
  const [applicationCode, setApplicationCode] = useState(() => localStorage.getItem(`appCode_${schoolSlug}`) || '');
  const [appData, setAppData] = useState(null);
  const [activeStep, setActiveStep] = useState(1); // 1: Pay/Access, 2: Biodata, 3: Parent, 4: Uploads, 5: Review & Submit
  const [tokenMode, setTokenMode] = useState('resume'); // 'resume' or 'check'

  // Purchase Form State
  const [purchaseForm, setPurchaseForm] = useState({
    parentName: '',
    parentEmail: '',
    parentPhone: '',
    candidateFirstName: '',
    candidateLastName: '',
    candidateMiddleName: '',
    gender: 'male',
    dateOfBirth: '',
    gradeLevel: '',
    previousSchool: '',
    provider: 'paystack'
  });
  
  const [isSubmittingPurchase, setIsSubmittingPurchase] = useState(false);
  const [offlineSlip, setOfflineSlip] = useState(null);
  const [inputCode, setInputCode] = useState('');
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);

  // File Upload State
  const [files, setFiles] = useState({ passport: null, birthCert: null, reportCard: null });
  const [uploadingFiles, setUploadingFiles] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/api/public-school/${schoolSlug}`);
        if (!r.ok) throw new Error('Not found');
        const data = await r.json();
        setSchool(data);
        
        // Check if verify reference is in search params
        const verifyRef = searchParams.get('verify');
        if (verifyRef) {
          await verifyOnlinePayment(verifyRef, data);
        } else if (applicationCode) {
          // Auto-load application if code exists in storage
          await fetchApplicationDetails(applicationCode);
        }
      } catch (err) {
        setError('Unable to load admissions information.');
      } finally {
        setLoading(false);
      }
    })();
  }, [schoolSlug, searchParams]);

  // Verify online transaction
  const verifyOnlinePayment = async (reference, schoolInfo) => {
    setVerifyingPayment(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admissions/verify-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference,
          schoolSlug,
          provider: reference.includes('FLW') ? 'flutterwave' : 'paystack'
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success('Payment verified successfully!');
        localStorage.setItem(`appCode_${schoolSlug}`, data.applicationCode);
        setApplicationCode(data.applicationCode);
        await fetchApplicationDetails(data.applicationCode);
        
        // Remove search params
        searchParams.delete('verify');
        setSearchParams(searchParams);
      } else {
        toast.error(data.error || 'Failed to verify payment reference');
      }
    } catch (e) {
      console.error(e);
      toast.error('Connection error verifying payment.');
    } finally {
      setVerifyingPayment(false);
    }
  };

  // Fetch application details by code
  const fetchApplicationDetails = async (code) => {
    try {
      const r = await fetch(`${API_BASE_URL}/api/admissions/application/${code}`);
      if (!r.ok) throw new Error('Not found');
      const data = await r.json();
      setAppData(data);
      setApplicationCode(code);
      
      // Determine active step based on application status
      if (data.status === 'draft') {
        setActiveStep(2); // Jump to detailed form
      } else {
        setActiveStep(5); // Show final status screen
      }
    } catch {
      localStorage.removeItem(`appCode_${schoolSlug}`);
      setApplicationCode('');
      setAppData(null);
      toast.error('Invalid or expired application code.');
    }
  };

  // Start checkout or offline payment
  const handlePurchaseSubmit = async (e) => {
    e.preventDefault();
    setIsSubmittingPurchase(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admissions/initialize-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...purchaseForm,
          schoolSlug
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to initialize application form');

      if (data.paymentStatus === 'paid') {
        // Free form path
        toast.success('Application form unlocked successfully!');
        localStorage.setItem(`appCode_${schoolSlug}`, data.applicationCode);
        setApplicationCode(data.applicationCode);
        await fetchApplicationDetails(data.applicationCode);
      } else if (data.isOffline) {
        // Offline payment instructions path
        setOfflineSlip(data);
        toast.success('Offline invoice generated!');
      } else if (data.authorization_url) {
        // Redirect to Paystack/Flutterwave host checkout
        window.location.href = data.authorization_url;
      }
    } catch (err) {
      toast.error(err.message || 'Payment initialization failed');
    } finally {
      setIsSubmittingPurchase(false);
    }
  };

  // Access form with code input
  const handleVerifyCodeSubmit = async (e) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    setIsVerifyingCode(true);
    try {
      await fetchApplicationDetails(inputCode.trim().toUpperCase());
      localStorage.setItem(`appCode_${schoolSlug}`, inputCode.trim().toUpperCase());
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const [checkerResult, setCheckerResult] = useState(null);
  const handleCheckStatus = async (e) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    setIsVerifyingCode(true);
    setCheckerResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admissions/public/check?code=${inputCode.trim().toUpperCase()}`);
      const data = await res.json();
      if (res.ok) {
        setCheckerResult(data.application);
      } else {
        toast.error(data.error || 'Failed to retrieve application status');
      }
    } catch (error) {
      toast.error('Network error checking status');
    } finally {
      setIsVerifyingCode(false);
    }
  };

  // Save detailed form fields
  const handleSaveFormDetails = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admissions/application/${applicationCode}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentName: appData.parentName,
          parentEmail: appData.parentEmail,
          parentPhone: appData.parentPhone,
          parentAddress: appData.parentAddress,
          candidateFirstName: appData.candidateFirstName,
          candidateLastName: appData.candidateLastName,
          candidateMiddleName: appData.candidateMiddleName,
          gender: appData.gender,
          dateOfBirth: appData.dateOfBirth,
          gradeLevel: appData.gradeLevel,
          previousSchool: appData.previousSchool
        })
      });
      if (!res.ok) throw new Error('Save failed');
      toast.success('Draft saved successfully');
    } catch {
      toast.error('Failed to save draft details.');
    }
  };

  // Handle document upload
  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!files.passport && !files.birthCert && !files.reportCard) {
      toast.error('Please select at least one document to upload');
      return;
    }

    setUploadingFiles(true);
    const formData = new FormData();
    if (files.passport) formData.append('passport', files.passport);
    if (files.birthCert) formData.append('birthCert', files.birthCert);
    if (files.reportCard) formData.append('reportCard', files.reportCard);

    try {
      const res = await fetch(`${API_BASE_URL}/api/admissions/application/${applicationCode}/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload files');
      
      setAppData(data.application);
      setFiles({ passport: null, birthCert: null, reportCard: null });
      toast.success('Documents uploaded successfully!');
      setActiveStep(5); // Proceed to Review step
    } catch (err) {
      toast.error(err.message || 'File upload failed');
    } finally {
      setUploadingFiles(false);
    }
  };

  // Final submit application
  const handleFinalSubmit = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admissions/application/${applicationCode}/submit`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');
      
      setAppData(data.application);
      toast.success('Application submitted successfully!');
    } catch (err) {
      toast.error(err.message || 'Final submission failed');
    }
  };

  const handleLogoutCode = () => {
    localStorage.removeItem(`appCode_${schoolSlug}`);
    setApplicationCode('');
    setAppData(null);
    setOfflineSlip(null);
    setActiveStep(1);
  };

  if (loading || verifyingPayment) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="w-14 h-14 border-4 border-t-transparent rounded-full animate-spin mb-4"
        style={{ borderColor: school?.primaryColor || '#4f46e5', borderTopColor: 'transparent' }} />
      <p className="text-gray-500 font-bold uppercase tracking-widest text-xs animate-pulse">
        {verifyingPayment ? 'Verifying Online Payment...' : 'Loading Admissions...'}
      </p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 text-center">
      <div>
        <div className="w-20 h-20 bg-red-100 text-red-400 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">!</div>
        <p className="text-gray-600 font-medium">{error}</p>
        <Link to={`/${schoolSlug}`} className="mt-6 inline-block text-sm font-bold underline text-gray-500">← Back to Homepage</Link>
      </div>
    </div>
  );

  const primary = school?.primaryColor || '#4f46e5';
  const inputCls = 'w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-transparent transition-all';
  const inputFocus = { boxShadow: `0 0 0 3px ${hexToRgba(primary, 0.18)}` };

  return (
    <div className="min-h-screen flex flex-col font-sans text-gray-800 overflow-x-hidden bg-gray-50/50">
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
        .fade-in { animation: fadeIn 0.4s ease both; }
        ::selection { background: ${hexToRgba(primary, 0.15)}; color: ${primary}; }
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-5 flex items-center justify-between" style={{ height: 68 }}>
          <Link to={`/${schoolSlug}`} className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center shrink-0">
              {school?.logoUrl
                ? <img src={getLogoUrl(school.logoUrl)} alt="" className="w-full h-full object-contain p-0.5" />
                : <span className="text-lg font-black text-gray-300">{school?.name?.[0]}</span>
              }
            </div>
            <span className="font-black text-gray-900 text-base tracking-tight">{school?.name}</span>
          </Link>
          <div className="flex items-center gap-3">
            {applicationCode && (
              <button onClick={handleLogoutCode} className="text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors">
                Exit Form
              </button>
            )}
            <Link to={`/${schoolSlug}`}
              className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all">
              <FiArrowLeft className="w-4 h-4" /> Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Wizard Steps indicator */}
      {school?.enableOnlineAdmissionForm && (
        <div className="bg-white border-b border-gray-100 py-3 shadow-xs">
          <div className="max-w-4xl mx-auto px-5">
            <div className="flex items-center justify-between text-xs font-bold text-gray-400">
              {[
                { step: 1, label: 'Form Payment' },
                { step: 2, label: 'Candidate Details' },
                { step: 3, label: 'Parent Details' },
                { step: 4, label: 'Upload Documents' },
                { step: 5, label: 'Review & Submit' }
              ].map((s) => (
                <div key={s.step} className="flex items-center gap-2 flex-1 justify-center first:justify-start last:justify-end">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${activeStep >= s.step ? 'text-white' : 'bg-gray-100 text-gray-400'}`}
                    style={activeStep >= s.step ? { backgroundColor: primary } : {}}>
                    {s.step}
                  </div>
                  <span className={`hidden md:inline ${activeStep === s.step ? 'text-gray-900 font-extrabold' : ''}`}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Hero Banner */}
      <div className="relative overflow-hidden py-10 px-5 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto">
          <span className="inline-block px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-3"
            style={{ backgroundColor: hexToRgba(primary, 0.12), color: primary }}>
            Join Our Community
          </span>
          <h1 className="text-2xl md:text-4xl font-black text-gray-900 leading-tight">
            Admissions <span style={{ color: primary }}>Portal</span>
          </h1>
          <p className="text-gray-500 max-w-xl leading-relaxed text-sm mt-2">
            Welcome! {school?.enableOnlineAdmissionForm ? 'Complete your application form entirely online securely in 5 steps.' : 'Fill in the inquiry form and our admissions desk will guide you.'}
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <main className="flex-1 max-w-7xl mx-auto px-5 py-10 w-full fade-in">
        
        {/* Scenario 1: Standard Inquiry Form (Online Admission Form Disabled) */}
        {!school?.enableOnlineAdmissionForm ? (
          <div className="grid lg:grid-cols-2 gap-10 items-start">
            <div className="space-y-6">
              <h2 className="text-xl font-black text-gray-900">Admissions Steps</h2>
              <div className="space-y-4">
                {[
                  { step: 1, title: 'Submit an Inquiry', body: 'Fill in the inquiry form. Our admissions desk will reach out within 24 hours to guide you through next steps.' },
                  { step: 2, title: 'Entrance Assessment', body: 'Visit our campus, meet our dedicated staff, and your child will complete a friendly academic assessment.' },
                  { step: 3, title: 'Enrollment & Resumption', body: 'Submit required documents, set up portal access, and your child is ready to start their academic journey!' },
                ].map((s, i) => (
                  <div key={i} className="flex gap-4 p-5 rounded-2xl border border-gray-100 bg-white shadow-xs">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-base shrink-0"
                      style={{ background: `linear-gradient(135deg, ${primary}, ${darkenHex(primary, 0.15)})` }}>
                      {s.step}
                    </div>
                    <div>
                      <h4 className="font-black text-gray-900 text-base mb-0.5">{s.title}</h4>
                      <p className="text-gray-500 leading-relaxed text-xs">{s.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Standard Inquiry Form */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-5 text-white" style={{ background: `linear-gradient(135deg, ${primary}, ${darkenHex(primary, 0.14)})` }}>
                <h3 className="text-lg font-black">Request Admission Info</h3>
                <p className="text-white/80 text-xs mt-0.5">We will respond within 24 hours.</p>
              </div>
              <div className="p-6">
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    const res = await fetch(`${API_BASE_URL}/api/public-school/${schoolSlug}/inquiry`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ parentName: purchaseForm.parentName, email: purchaseForm.parentEmail, phone: purchaseForm.parentPhone, gradeLevel: purchaseForm.gradeLevel, message: purchaseForm.previousSchool })
                    });
                    if (res.ok) {
                      toast.success('Inquiry submitted successfully!');
                      setPurchaseForm({ parentName: '', parentEmail: '', parentPhone: '', candidateFirstName: '', candidateLastName: '', candidateMiddleName: '', gender: 'male', dateOfBirth: '', gradeLevel: '', previousSchool: '', provider: 'paystack' });
                    }
                  } catch {
                    toast.error('Inquiry submission failed.');
                  }
                }} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Parent Name</label>
                    <input type="text" required placeholder="e.g. Aisha Musa" className={inputCls} value={purchaseForm.parentName} onChange={e => setPurchaseForm({ ...purchaseForm, parentName: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Email</label>
                      <input type="email" required placeholder="you@email.com" className={inputCls} value={purchaseForm.parentEmail} onChange={e => setPurchaseForm({ ...purchaseForm, parentEmail: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Phone</label>
                      <input type="tel" required placeholder="+234..." className={inputCls} value={purchaseForm.parentPhone} onChange={e => setPurchaseForm({ ...purchaseForm, parentPhone: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Target Grade</label>
                    <select required className={inputCls} value={purchaseForm.gradeLevel} onChange={e => setPurchaseForm({ ...purchaseForm, gradeLevel: e.target.value })}>
                      <option value="">Select Grade</option>
                      {['Creche', 'Nursery 1', 'Nursery 2', 'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6', 'JSS 1', 'JSS 2', 'JSS 3', 'SSS 1', 'SSS 2', 'SSS 3'].map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Message</label>
                    <textarea rows={3} placeholder="Tell us more about your child..." className={`${inputCls} resize-none`} value={purchaseForm.previousSchool} onChange={e => setPurchaseForm({ ...purchaseForm, previousSchool: e.target.value })} />
                  </div>
                  <button type="submit" className="w-full py-3.5 rounded-xl font-black text-white flex items-center justify-center gap-2 hover:-translate-y-0.5 shadow-md transition-all text-sm" style={{ background: `linear-gradient(135deg, ${primary}, ${darkenHex(primary, 0.14)})` }}>
                    <FiSend className="w-4 h-4" /> Submit Inquiry
                  </button>
                </form>
              </div>
            </div>
          </div>
        ) : (
          
          /* Scenario 2: Online Admission Form Sale Flow (Enabled) */
          <div className="max-w-4xl mx-auto">
            
            {/* Step 1: Pay / Access Application Form */}
            {activeStep === 1 && (
              <div className="grid md:grid-cols-12 gap-8 items-start">
                
                {/* Log In Box (Token Entry) */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden md:col-span-5 flex flex-col">
                  {/* Tabs */}
                  <div className="flex border-b border-gray-100">
                    <button
                      onClick={() => { setTokenMode('resume'); setCheckerResult(null); }}
                      className={`flex-1 py-3 text-xs font-bold transition-colors ${tokenMode === 'resume' ? 'text-gray-900 border-b-2 border-primary bg-gray-50' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      Fill Form
                    </button>
                    <button
                      onClick={() => setTokenMode('check')}
                      className={`flex-1 py-3 text-xs font-bold transition-colors ${tokenMode === 'check' ? 'text-gray-900 border-b-2 border-primary bg-gray-50' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      Check Status
                    </button>
                  </div>
                  
                  <div className="p-6 space-y-4 flex-1">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg text-white" style={{ background: `linear-gradient(135deg, ${primary}, ${darkenHex(primary, 0.14)})` }}>
                      <FiLock />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-gray-900 text-lg">
                        {tokenMode === 'resume' ? 'Enter Admission Token' : 'Admission Checker'}
                      </h4>
                      <p className="text-gray-500 text-xs leading-relaxed mt-0.5">
                        {tokenMode === 'resume' ? 'Input your pre-purchased admission token to fill or resume filling your application form.' : 'Enter your application token to check your admission status and interview schedule.'}
                      </p>
                    </div>
                    
                    {tokenMode === 'resume' ? (
                      <form onSubmit={handleVerifyCodeSubmit} className="space-y-3 pt-2">
                        <input type="text" required placeholder="e.g. 42ABC78926" className={inputCls} value={inputCode} onChange={e => setInputCode(e.target.value)} />
                        <button type="submit" disabled={isVerifyingCode} className="w-full py-4 hover:-translate-y-0.5 text-white font-black rounded-xl text-sm transition-all flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:translate-y-0 shadow-md" style={{ backgroundColor: primary }}>
                          {isVerifyingCode ? 'Verifying...' : 'Unlock Application Form'}
                        </button>
                      </form>
                    ) : (
                      <div className="space-y-4 pt-2">
                        <form onSubmit={handleCheckStatus} className="space-y-3">
                          <input type="text" required placeholder="Enter Token" className={inputCls} value={inputCode} onChange={e => setInputCode(e.target.value)} />
                          <button type="submit" disabled={isVerifyingCode} className="w-full py-3 hover:-translate-y-0.5 text-white font-black rounded-xl text-sm transition-all flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:translate-y-0 shadow-md" style={{ backgroundColor: primary }}>
                            {isVerifyingCode ? 'Checking...' : 'Check Status'}
                          </button>
                        </form>

                        {checkerResult && (
                          <div className="mt-4 bg-gray-50 border border-gray-150 rounded-xl p-4 text-xs space-y-2 animate-fade-in">
                            <p><strong>Candidate:</strong> {checkerResult.candidateFirstName} {checkerResult.candidateLastName}</p>
                            <p><strong>Grade:</strong> {checkerResult.gradeLevel}</p>
                            <p><strong>Status:</strong> <span className="capitalize font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">{checkerResult.status.replace('_', ' ')}</span></p>
                            {checkerResult.interviewDate && (
                              <p><strong>Interview Date:</strong> <span className="font-bold text-primary bg-primary/10 px-2 py-0.5 rounded block mt-1">{new Date(checkerResult.interviewDate).toLocaleString()}</span></p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Purchase Form Block */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden md:col-span-7">
                  <div className="px-6 py-5 text-gray-900 border-b border-gray-100 bg-gray-50">
                    <h3 className="text-lg font-black">Or Buy Token Online</h3>
                    <p className="text-gray-500 text-xs mt-0.5">Don't have a token? Purchase one right here.</p>
                  </div>
                  
                  {offlineSlip ? (
                    /* Offline Payment Instructions Screen */
                    <div className="p-6 space-y-5 text-center">
                      <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-2xl mx-auto">
                        <FiCreditCard />
                      </div>
                      <h4 className="font-extrabold text-gray-900 text-lg">Offline Slip Generated</h4>
                      <p className="text-gray-500 text-xs leading-relaxed max-w-sm mx-auto">
                        Please deposit the form purchase fee to the school's bank account. Provide the payment reference below to the admin desk to verify.
                      </p>
                      
                      <div className="bg-gray-50 p-4 rounded-xl text-left text-xs space-y-2 border border-gray-150">
                        <p><strong>Form Price:</strong> ₦{offlineSlip.price?.toLocaleString()}</p>
                        <p><strong>Payment Reference:</strong> <code className="bg-gray-200 px-1 py-0.5 rounded text-blue-700 font-bold">{offlineSlip.reference}</code></p>
                        <p><strong>Temporary Code:</strong> <code className="bg-gray-200 px-1 py-0.5 rounded text-gray-700">{offlineSlip.applicationCode}</code></p>
                        <p className="text-gray-400 mt-2 font-medium">Please save this reference. Once verified by the admissions desk, this temporary code will unlock the application form.</p>
                      </div>
                      
                      <div className="flex gap-4">
                        <button onClick={() => window.print()} className="flex-1 py-3 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-bold text-xs flex items-center justify-center gap-2">
                          <FiDownload /> Print Invoice
                        </button>
                        <button onClick={() => { setApplicationCode(offlineSlip.applicationCode); fetchApplicationDetails(offlineSlip.applicationCode); }} className="flex-1 py-3 text-white rounded-xl font-bold text-xs" style={{ backgroundColor: primary }}>
                          Open Form Draft
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handlePurchaseSubmit} className="p-6 space-y-4">
                      
                      <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] uppercase font-black text-gray-400 tracking-wider">Admission Form Price</p>
                          <p className="text-lg font-black" style={{ color: primary }}>
                            {school.admissionFormPrice > 0 ? `₦${school.admissionFormPrice.toLocaleString()}` : 'Free Form'}
                          </p>
                        </div>
                        <span className="text-[10px] text-gray-500 font-medium">Secured Payment Processing</span>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Parent Name</label>
                          <input type="text" required placeholder="Aisha Musa" className={inputCls} value={purchaseForm.parentName} onChange={e => setPurchaseForm({ ...purchaseForm, parentName: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Parent Phone</label>
                          <input type="tel" required placeholder="+234..." className={inputCls} value={purchaseForm.parentPhone} onChange={e => setPurchaseForm({ ...purchaseForm, parentPhone: e.target.value })} />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Parent Email</label>
                        <input type="email" required placeholder="you@email.com" className={inputCls} value={purchaseForm.parentEmail} onChange={e => setPurchaseForm({ ...purchaseForm, parentEmail: e.target.value })} />
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Candidate Name</label>
                          <input type="text" required placeholder="First & Last Name" className={inputCls} value={purchaseForm.candidateFirstName} onChange={e => setPurchaseForm({ ...purchaseForm, candidateFirstName: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Gender</label>
                          <select className={inputCls} value={purchaseForm.gender} onChange={e => setPurchaseForm({ ...purchaseForm, gender: e.target.value })}>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Target Grade</label>
                          <select required className={inputCls} value={purchaseForm.gradeLevel} onChange={e => setPurchaseForm({ ...purchaseForm, gradeLevel: e.target.value })}>
                            <option value="">Select Grade</option>
                            {['Creche', 'Nursery 1', 'Nursery 2', 'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6', 'JSS 1', 'JSS 2', 'JSS 3', 'SSS 1', 'SSS 2', 'SSS 3'].map(g => (
                              <option key={g} value={g}>{g}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Date of Birth</label>
                          <input type="date" required className={inputCls} value={purchaseForm.dateOfBirth} onChange={e => setPurchaseForm({ ...purchaseForm, dateOfBirth: e.target.value })} />
                        </div>
                      </div>

                      {school.admissionFormPrice > 0 && (
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Payment Method</label>
                          <div className="grid grid-cols-3 gap-3">
                            {[
                              { id: 'paystack', label: 'Paystack', enabled: !!school.paystackPublicKey },
                              { id: 'flutterwave', label: 'Flutterwave', enabled: !!school.flutterwavePublicKey },
                              { id: 'offline', label: 'Bank Payment', enabled: true }
                            ].map(item => (
                              <button key={item.id} type="button" disabled={!item.enabled}
                                onClick={() => setPurchaseForm({ ...purchaseForm, provider: item.id })}
                                className={`py-3 rounded-xl border text-xs font-bold transition-all ${!item.enabled ? 'opacity-40 cursor-not-allowed border-gray-100 bg-gray-50' : purchaseForm.provider === item.id ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
                                style={purchaseForm.provider === item.id ? { borderColor: primary, color: primary } : {}}>
                                {item.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <button type="submit" disabled={isSubmittingPurchase} className="w-full py-4 rounded-xl font-black text-white flex items-center justify-center gap-2 hover:-translate-y-0.5 shadow-md transition-all text-sm mt-2 disabled:bg-gray-400 disabled:translate-y-0" style={{ background: `linear-gradient(135deg, ${primary}, ${darkenHex(primary, 0.14)})` }}>
                        {isSubmittingPurchase ? 'Processing...' : school.admissionFormPrice > 0 ? 'Pay & Unlock Form' : 'Unlock Application Form'}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Fill Candidate Biodata Form */}
            {activeStep === 2 && appData && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6 fade-in">
                <div>
                  <h3 className="text-lg font-black text-gray-900">Step 2: Candidate Details</h3>
                  <p className="text-gray-400 text-xs mt-0.5">Provide detailed biological information about the applicant.</p>
                </div>
                
                <form onSubmit={(e) => { e.preventDefault(); handleSaveFormDetails(); setActiveStep(3); }}>
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">First Name</label>
                      <input type="text" required className={inputCls} value={appData.candidateFirstName || ''} onChange={e => setAppData({ ...appData, candidateFirstName: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Last Name</label>
                      <input type="text" required className={inputCls} value={appData.candidateLastName || ''} onChange={e => setAppData({ ...appData, candidateLastName: e.target.value })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Middle Name (optional)</label>
                      <input type="text" className={inputCls} value={appData.candidateMiddleName || ''} onChange={e => setAppData({ ...appData, candidateMiddleName: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Gender</label>
                      <select required className={inputCls} value={appData.gender || 'male'} onChange={e => setAppData({ ...appData, gender: e.target.value })}>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Date of Birth</label>
                      <input type="date" required className={inputCls} value={appData.dateOfBirth ? appData.dateOfBirth.split('T')[0] : ''} onChange={e => setAppData({ ...appData, dateOfBirth: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Grade Level</label>
                      <select required className={inputCls} value={appData.gradeLevel || ''} onChange={e => setAppData({ ...appData, gradeLevel: e.target.value })}>
                        <option value="">Select Grade</option>
                        {['Creche', 'Nursery 1', 'Nursery 2', 'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6', 'JSS 1', 'JSS 2', 'JSS 3', 'SSS 1', 'SSS 2', 'SSS 3'].map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Previous School Attended</label>
                    <input type="text" className={inputCls} placeholder="e.g. Hope Academy" value={appData.previousSchool || ''} onChange={e => setAppData({ ...appData, previousSchool: e.target.value })} />
                  </div>

                  <div className="flex justify-between pt-4 border-t border-gray-100 mt-6">
                    <button type="button" onClick={handleSaveFormDetails} className="px-4 py-2 border border-gray-200 hover:bg-gray-50 font-bold rounded-lg text-xs">
                      Save Draft
                    </button>
                    <button type="submit" className="px-5 py-2 text-white font-bold rounded-lg text-xs flex items-center gap-1" style={{ backgroundColor: primary }}>
                      Next Step <FiArrowRight />
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Step 3: Parent/Guardian Details */}
            {activeStep === 3 && appData && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6 fade-in">
                <div>
                  <h3 className="text-lg font-black text-gray-900">Step 3: Parent & Contact Details</h3>
                  <p className="text-gray-400 text-xs mt-0.5">Provide contact information for parent / guardian.</p>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleSaveFormDetails(); setActiveStep(4); }}>
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Parent / Guardian Name</label>
                      <input type="text" required className={inputCls} value={appData.parentName || ''} onChange={e => setAppData({ ...appData, parentName: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Parent Phone Number</label>
                      <input type="tel" required className={inputCls} value={appData.parentPhone || ''} onChange={e => setAppData({ ...appData, parentPhone: e.target.value })} />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Parent Email Address</label>
                    <input type="email" required className={inputCls} value={appData.parentEmail || ''} onChange={e => setAppData({ ...appData, parentEmail: e.target.value })} />
                  </div>

                  <div className="mt-4">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Residential Address</label>
                    <textarea rows={2} required className={`${inputCls} resize-none`} value={appData.parentAddress || ''} onChange={e => setAppData({ ...appData, parentAddress: e.target.value })} />
                  </div>

                  <div className="flex justify-between pt-4 border-t border-gray-100 mt-6">
                    <button type="button" onClick={() => setActiveStep(2)} className="px-4 py-2 border border-gray-200 hover:bg-gray-50 font-bold rounded-lg text-xs flex items-center gap-1">
                      <FiArrowLeft /> Back
                    </button>
                    <div className="flex gap-3">
                      <button type="button" onClick={handleSaveFormDetails} className="px-4 py-2 border border-gray-200 hover:bg-gray-50 font-bold rounded-lg text-xs">
                        Save Draft
                      </button>
                      <button type="submit" className="px-5 py-2 text-white font-bold rounded-lg text-xs flex items-center gap-1" style={{ backgroundColor: primary }}>
                        Next Step <FiArrowRight />
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* Step 4: Upload Documents */}
            {activeStep === 4 && appData && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6 fade-in">
                <div>
                  <h3 className="text-lg font-black text-gray-900">Step 4: Upload Attachments</h3>
                  <p className="text-gray-400 text-xs mt-0.5">Upload required files. Formats supported: PNG, JPG, WEBP, PDF (max 5MB).</p>
                </div>

                <form onSubmit={handleFileUpload} className="space-y-5">
                  <div className="grid md:grid-cols-3 gap-6">
                    {/* Passport Photo */}
                    <div className="border border-dashed border-gray-200 p-4 rounded-xl flex flex-col items-center justify-center text-center space-y-2">
                      <FiUpload className="text-xl text-gray-400" />
                      <span className="text-[10px] font-bold uppercase text-gray-500">Candidate Passport Photo</span>
                      <input type="file" accept="image/*" onChange={e => setFiles({ ...files, passport: e.target.files[0] })} className="text-xs w-full text-center" />
                      {appData.passportPhotoUrl && <span className="text-[10px] text-green-500 font-bold">Uploaded ✓</span>}
                    </div>

                    {/* Birth Certificate */}
                    <div className="border border-dashed border-gray-200 p-4 rounded-xl flex flex-col items-center justify-center text-center space-y-2">
                      <FiUpload className="text-xl text-gray-400" />
                      <span className="text-[10px] font-bold uppercase text-gray-500">Birth Certificate</span>
                      <input type="file" accept="image/*,application/pdf" onChange={e => setFiles({ ...files, birthCert: e.target.files[0] })} className="text-xs w-full text-center" />
                      {appData.birthCertUrl && <span className="text-[10px] text-green-500 font-bold">Uploaded ✓</span>}
                    </div>

                    {/* Report Card */}
                    <div className="border border-dashed border-gray-200 p-4 rounded-xl flex flex-col items-center justify-center text-center space-y-2">
                      <FiUpload className="text-xl text-gray-400" />
                      <span className="text-[10px] font-bold uppercase text-gray-500">Previous Report Card</span>
                      <input type="file" accept="image/*,application/pdf" onChange={e => setFiles({ ...files, reportCard: e.target.files[0] })} className="text-xs w-full text-center" />
                      {appData.reportCardUrl && <span className="text-[10px] text-green-500 font-bold">Uploaded ✓</span>}
                    </div>
                  </div>

                  <div className="flex justify-between pt-4 border-t border-gray-100">
                    <button type="button" onClick={() => setActiveStep(3)} className="px-4 py-2 border border-gray-200 hover:bg-gray-50 font-bold rounded-lg text-xs flex items-center gap-1">
                      <FiArrowLeft /> Back
                    </button>
                    <button type="submit" disabled={uploadingFiles} className="px-5 py-2 text-white font-bold rounded-lg text-xs disabled:bg-gray-400" style={{ backgroundColor: primary }}>
                      {uploadingFiles ? 'Uploading...' : 'Upload & Continue'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Step 5: Review & Final Submit */}
            {activeStep === 5 && appData && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6 fade-in">
                
                {appData.status === 'draft' ? (
                  /* Review and Submit Draft Application */
                  <>
                    <div>
                      <h3 className="text-lg font-black text-gray-900">Step 5: Review & Submit</h3>
                      <p className="text-gray-400 text-xs mt-0.5">Please review the details below before submitting. Submitted applications cannot be edited.</p>
                    </div>

                    <div className="bg-gray-50 p-5 rounded-2xl text-xs space-y-4 border border-gray-100">
                      <div>
                        <h4 className="font-bold text-gray-900 border-b border-gray-200 pb-1 mb-2 uppercase text-[9px] tracking-wider text-gray-400">Candidate Details</h4>
                        <div className="grid grid-cols-2 gap-y-2">
                          <p><strong>Name:</strong> {appData.candidateFirstName} {appData.candidateLastName}</p>
                          <p><strong>Gender:</strong> {appData.gender}</p>
                          <p><strong>Grade Level:</strong> {appData.gradeLevel}</p>
                          <p><strong>Date of Birth:</strong> {appData.dateOfBirth ? new Date(appData.dateOfBirth).toLocaleDateString() : ''}</p>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-bold text-gray-900 border-b border-gray-200 pb-1 mb-2 uppercase text-[9px] tracking-wider text-gray-400">Parent / Guardian Details</h4>
                        <div className="grid grid-cols-2 gap-y-2">
                          <p><strong>Name:</strong> {appData.parentName}</p>
                          <p><strong>Phone:</strong> {appData.parentPhone}</p>
                          <p><strong>Email:</strong> {appData.parentEmail}</p>
                          <p><strong>Address:</strong> {appData.parentAddress}</p>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-bold text-gray-900 border-b border-gray-200 pb-1 mb-2 uppercase text-[9px] tracking-wider text-gray-400">Uploaded Attachments</h4>
                        <div className="flex gap-4">
                          <p><strong>Passport:</strong> {appData.passportPhotoUrl ? 'Uploaded ✓' : 'Not Uploaded'}</p>
                          <p><strong>Birth Certificate:</strong> {appData.birthCertUrl ? 'Uploaded ✓' : 'Not Uploaded'}</p>
                          <p><strong>Report Card:</strong> {appData.reportCardUrl ? 'Uploaded ✓' : 'Not Uploaded'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between pt-4 border-t border-gray-100">
                      <button onClick={() => setActiveStep(4)} className="px-4 py-2 border border-gray-200 hover:bg-gray-50 font-bold rounded-lg text-xs flex items-center gap-1">
                        <FiArrowLeft /> Back to Uploads
                      </button>
                      <button onClick={handleFinalSubmit} className="px-6 py-2.5 text-white font-bold rounded-lg text-xs" style={{ backgroundColor: primary }}>
                        Submit Application
                      </button>
                    </div>
                  </>
                ) : (
                  /* Completed/Submitted Screen */
                  <div className="text-center py-8 space-y-4">
                    <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center text-3xl font-bold bg-green-50 text-green-500">
                      <FiCheckCircle />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-gray-900">Application Received</h3>
                      <p className="text-gray-400 text-xs mt-0.5">Thank you! Your application is in progress.</p>
                    </div>
                    
                    <div className="max-w-md mx-auto bg-gray-50 border border-gray-100 rounded-2xl p-4 text-xs text-left space-y-2">
                      <p><strong>Applicant Name:</strong> {appData.candidateFirstName} {appData.candidateLastName}</p>
                      <p><strong>Application Code:</strong> <code className="bg-gray-200 px-1 py-0.5 rounded text-blue-700 font-bold">{appData.applicationCode}</code></p>
                      <p><strong>Admissions Status:</strong> <span className="capitalize font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">{appData.status.replace('_', ' ')}</span></p>
                      <p><strong>Form Payment:</strong> <span className="capitalize font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">{appData.paymentStatus}</span></p>
                      {appData.interviewDate && (
                        <p><strong>Scheduled Interview Date:</strong> <span className="font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">{new Date(appData.interviewDate).toLocaleString()}</span></p>
                      )}
                    </div>

                    <p className="text-[10px] text-gray-500 max-w-sm mx-auto">
                      Please keep your Application Code safe. You can use it in the "Check Status" tab to view your admission progress.
                    </p>
                    
                    <p className="text-gray-500 text-xs leading-relaxed max-w-sm mx-auto pt-2">
                      A copy of your code and registration details has been sent to your email. We will contact you via email, WhatsApp, or SMS regarding your assessment schedule.
                    </p>

                    <button onClick={handleLogoutCode} className="px-6 py-2 border border-gray-200 hover:bg-gray-50 font-bold rounded-lg text-xs mt-4">
                      Exit Admissions Portal
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </main>

      {/* Mini footer */}
      <footer className="border-t border-gray-150 bg-white py-6 text-center text-xs text-gray-400 mt-auto">
        <p>© {new Date().getFullYear()} {school?.name}. All Rights Reserved.</p>
      </footer>
    </div>
  );
};

export default PublicAdmissions;
