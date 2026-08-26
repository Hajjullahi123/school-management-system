import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { 
  FiArrowLeft, FiArrowRight, FiCheckCircle, FiSend, FiLock, FiUpload, 
  FiCreditCard, FiDownload, FiAward, FiClock, FiHelpCircle, FiCheck, 
  FiX, FiRefreshCw 
} from 'react-icons/fi';
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

const formatTime = (totalSeconds) => {
  if (totalSeconds <= 0) return '00:00';
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
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

  // CBT Exam Taking State
  const [isTakingExam, setIsTakingExam] = useState(false);
  const [isLoadingExam, setIsLoadingExam] = useState(false);
  const [examQuestions, setExamQuestions] = useState([]);
  const [examInfo, setExamInfo] = useState(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [examAnswers, setExamAnswers] = useState({});
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(0);
  const [isSubmittingExam, setIsSubmittingExam] = useState(false);
  const [examResult, setExamResult] = useState(null);
  const timerRef = useRef(null);

  // Status Checker Result
  const [checkerResult, setCheckerResult] = useState(null);

  // Invigilator Lab Security State
  const [invigilatorModalOpen, setInvigilatorModalOpen] = useState(false);
  const [invigilatorTokenInput, setInvigilatorTokenInput] = useState('');
  const [pendingExamCode, setPendingExamCode] = useState('');

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

  // CBT Countdown Timer Effect
  useEffect(() => {
    if (isTakingExam && timeLeftSeconds > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeftSeconds(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleAutoSubmitExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [isTakingExam, timeLeftSeconds]);

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

  // Save Step 2 & 3 Data
  const handleSaveFormData = async (nextStep) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admissions/application/${applicationCode}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appData)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAppData(data.application);
        setActiveStep(nextStep);
      } else {
        toast.error(data.error || 'Failed to save application');
      }
    } catch (err) {
      toast.error('Connection error saving form');
    }
  };

  // Handle File Uploads (Step 4)
  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!files.passport && !files.birthCert && !files.reportCard && !appData.passportPhotoUrl) {
      toast.error('Please select at least a passport photo');
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
      if (res.ok && data.success) {
        setAppData(data.application);
        toast.success('Files uploaded successfully!');
        setActiveStep(5);
      } else {
        toast.error(data.error || 'Failed to upload attachments');
      }
    } catch (err) {
      toast.error('Connection error uploading files');
    } finally {
      setUploadingFiles(false);
    }
  };

  // Final Submit Application (Step 5)
  const handleFinalSubmit = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admissions/application/${applicationCode}/submit`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAppData(data.application);
        toast.success('Application submitted successfully!');
      } else {
        toast.error(data.error || 'Failed to submit application');
      }
    } catch (err) {
      toast.error('Connection error submitting application');
    }
  };

  // CBT Exam Handlers
  const handleStartExam = async (codeToUse, tokenSupplied = null) => {
    const code = codeToUse || applicationCode;
    if (!code) {
      toast.error('Application code is required');
      return;
    }

    // Check if invigilator token is needed
    if (school?.requireExamInvigilatorToken && !tokenSupplied) {
      setPendingExamCode(code);
      setInvigilatorModalOpen(true);
      return;
    }

    setIsLoadingExam(true);
    try {
      let url = `${API_BASE_URL}/api/admissions/exam/${code}`;
      if (tokenSupplied) {
        url += `?invigilatorToken=${encodeURIComponent(tokenSupplied)}`;
      }

      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403 && data.requireToken) {
          setPendingExamCode(code);
          setInvigilatorModalOpen(true);
        }
        toast.error(data.error || 'Failed to load exam');
        return;
      }

      if (data.alreadyTaken) {
        setExamResult({
          score: data.examScore,
          totalMarks: data.examTotalMarks,
          correctAnswers: data.examCorrectAnswers,
          totalQuestions: data.examTotalQuestions,
          passed: data.examPassed,
          percentage: data.examTotalMarks > 0 ? Math.round((data.examScore / data.examTotalMarks) * 100) : 0
        });
        toast.info('You have already completed this entrance exam.');
        return;
      }

      setExamQuestions(data.questions || []);
      setExamInfo({
        candidateName: data.candidateName,
        durationMinutes: data.durationMinutes || 60,
        passMark: data.passMark || 50,
        totalQuestions: data.totalQuestions
      });
      setTimeLeftSeconds((data.durationMinutes || 60) * 60);
      setCurrentQuestionIdx(0);
      setExamAnswers({});
      setIsTakingExam(true);
      setExamResult(null);
      setInvigilatorModalOpen(false);
      setInvigilatorTokenInput('');
    } catch (err) {
      console.error(err);
      toast.error('Network error loading entrance exam');
    } finally {
      setIsLoadingExam(false);
    }
  };

  const handleSelectAnswer = (questionId, optionLetter) => {
    setExamAnswers(prev => ({
      ...prev,
      [questionId]: optionLetter
    }));
  };

  const handleAutoSubmitExam = async () => {
    toast.error('Time is up! Submitting exam automatically...');
    await executeExamSubmit(true);
  };

  const handleSubmitExamClick = async () => {
    const answeredCount = Object.keys(examAnswers).length;
    const totalCount = examQuestions.length;

    if (answeredCount < totalCount) {
      const confirmSubmit = window.confirm(
        `You have answered ${answeredCount} of ${totalCount} questions. Unanswered questions will receive 0 marks. Submit now?`
      );
      if (!confirmSubmit) return;
    } else {
      const confirmSubmit = window.confirm('Are you sure you want to submit your entrance exam?');
      if (!confirmSubmit) return;
    }

    await executeExamSubmit(false);
  };

  const executeExamSubmit = async (isAuto = false) => {
    const code = applicationCode || (checkerResult ? checkerResult.applicationCode : inputCode);
    if (!code) return;

    setIsSubmittingExam(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admissions/exam/${code}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: examAnswers })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setExamResult(data);
        setIsTakingExam(false);
        toast.success(`Exam submitted successfully! Score: ${data.score}/${data.totalMarks} (${data.percentage}%)`);
        
        // Refresh application details if code is active
        if (applicationCode) {
          fetchApplicationDetails(applicationCode);
        }
      } else {
        toast.error(data.error || 'Failed to submit exam');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error submitting exam answers');
    } finally {
      setIsSubmittingExam(false);
    }
  };

  const handleLogoutCode = () => {
    localStorage.removeItem(`appCode_${schoolSlug}`);
    setApplicationCode('');
    setAppData(null);
    setActiveStep(1);
    setIsTakingExam(false);
    setExamResult(null);
    setCheckerResult(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-t-transparent border-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !school) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 text-center">
        <div className="max-w-md bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Admissions Portal Unavailable</h2>
          <p className="text-sm text-gray-500">{error || 'This school has not enabled online admission applications.'}</p>
          <Link to={`/${schoolSlug}`} className="inline-block px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold">
            Back to School Home
          </Link>
        </div>
      </div>
    );
  }

  const primary = school.primaryColor || '#4f46e5';
  const logo = getLogoUrl(school.logoUrl);
  const inputCls = "w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm transition-all";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* School Top Header */}
      <header className="bg-white border-b border-gray-150 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <Link to={`/${schoolSlug}`} className="flex items-center gap-3 group">
            {logo ? (
              <img src={logo} alt={school.name} className="w-9 h-9 rounded-xl object-contain border border-gray-100 shadow-xs" />
            ) : (
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-xs" style={{ background: primary }}>
                {school.name.charAt(0)}
              </div>
            )}
            <div>
              <span className="font-extrabold text-gray-900 text-base group-hover:text-primary transition-colors block leading-tight">{school.name}</span>
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block">Online Admissions Portal</span>
            </div>
          </Link>

          {applicationCode && !isTakingExam && (
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold bg-gray-100 px-3 py-1.5 rounded-lg text-gray-700 hidden sm:inline-block border border-gray-200">
                Code: {applicationCode}
              </span>
              <button onClick={handleLogoutCode} className="text-xs text-gray-500 hover:text-rose-600 font-bold px-2 py-1 transition-colors">
                Exit
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-4 py-8 flex-1 w-full">
        
        {/* VIEW 1: CBT ENTRANCE EXAM TAKING INTERFACE */}
        {isTakingExam && examQuestions.length > 0 && (
          <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
            {/* Exam Header Bar with Countdown */}
            <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-16 z-20">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  Entrance Examination
                </span>
                <h2 className="text-base font-black text-gray-900 mt-1">{examInfo?.candidateName || 'Prospective Candidate'}</h2>
                <p className="text-xs text-gray-400">Pass Mark: {examInfo?.passMark}% • Total Questions: {examQuestions.length}</p>
              </div>

              {/* Timer & Submit */}
              <div className="flex items-center gap-4">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-sm font-black border ${timeLeftSeconds < 300 ? 'bg-rose-50 border-rose-200 text-rose-700 animate-pulse' : 'bg-gray-50 border-gray-200 text-gray-800'}`}>
                  <FiClock className="w-4 h-4" />
                  <span>{formatTime(timeLeftSeconds)}</span>
                </div>

                <button
                  onClick={handleSubmitExamClick}
                  disabled={isSubmittingExam}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  <FiCheck className="w-4 h-4" />
                  {isSubmittingExam ? 'Submitting...' : 'Submit Exam'}
                </button>
              </div>
            </div>

            {/* Exam Question Area */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              
              {/* Question Box */}
              <div className="md:col-span-8 bg-white p-6 rounded-2xl border border-gray-150 shadow-sm space-y-6">
                {(() => {
                  const currentQ = examQuestions[currentQuestionIdx];
                  if (!currentQ) return null;
                  const optionLetters = ['A', 'B', 'C', 'D'];
                  const selectedOption = examAnswers[currentQ.id];

                  return (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <span className="font-extrabold text-xs text-indigo-600 uppercase tracking-wide">
                          Question {currentQuestionIdx + 1} of {examQuestions.length}
                        </span>
                        <span className="text-xs font-semibold text-gray-400">
                          {currentQ.points} Point{currentQ.points > 1 ? 's' : ''}
                        </span>
                      </div>

                      <p className="text-base font-semibold text-gray-900 leading-relaxed whitespace-pre-wrap">
                        {currentQ.questionText}
                      </p>

                      <div className="space-y-3 pt-2">
                        {currentQ.options.map((opt, optIdx) => {
                          const letter = optionLetters[optIdx] || optIdx;
                          const isSelected = selectedOption === letter;

                          return (
                            <label
                              key={optIdx}
                              onClick={() => handleSelectAnswer(currentQ.id, letter)}
                              className={`flex items-center gap-3.5 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? 'border-indigo-600 bg-indigo-50/50 shadow-xs' : 'border-gray-150 hover:border-gray-300 bg-white'}`}
                            >
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs transition-colors ${isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                                {letter}
                              </div>
                              <span className="text-sm text-gray-800 flex-1 font-medium">{opt}</span>
                            </label>
                          );
                        })}
                      </div>

                      {/* Navigation buttons */}
                      <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                        <button
                          type="button"
                          onClick={() => setCurrentQuestionIdx(prev => Math.max(0, prev - 1))}
                          disabled={currentQuestionIdx === 0}
                          className="px-4 py-2 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-bold disabled:opacity-40 flex items-center gap-1.5"
                        >
                          <FiArrowLeft /> Previous
                        </button>

                        <span className="text-xs text-gray-400 font-semibold">
                          {Object.keys(examAnswers).length} of {examQuestions.length} Answered
                        </span>

                        {currentQuestionIdx < examQuestions.length - 1 ? (
                          <button
                            type="button"
                            onClick={() => setCurrentQuestionIdx(prev => Math.min(examQuestions.length - 1, prev + 1))}
                            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                          >
                            Next <FiArrowRight />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleSubmitExamClick}
                            disabled={isSubmittingExam}
                            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                          >
                            Submit Exam <FiCheck />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Question Navigator Palette */}
              <div className="md:col-span-4 bg-white p-5 rounded-2xl border border-gray-150 shadow-sm space-y-4">
                <h4 className="font-bold text-xs text-gray-900 uppercase tracking-wide">Question Navigator</h4>
                
                <div className="grid grid-cols-5 gap-2">
                  {examQuestions.map((q, idx) => {
                    const isAnswered = !!examAnswers[q.id];
                    const isCurrent = idx === currentQuestionIdx;

                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => setCurrentQuestionIdx(idx)}
                        className={`w-full aspect-square rounded-xl text-xs font-black transition-all flex items-center justify-center ${isCurrent ? 'ring-2 ring-indigo-600 ring-offset-2' : ''} ${isAnswered ? 'bg-indigo-600 text-white shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-3 border-t border-gray-100 space-y-1.5 text-[11px] text-gray-500 font-medium">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-indigo-600"></span>
                    <span>Answered ({Object.keys(examAnswers).length})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-gray-200"></span>
                    <span>Unanswered ({examQuestions.length - Object.keys(examAnswers).length})</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: EXAM COMPLETED / RESULT CARD */}
        {!isTakingExam && examResult && (
          <div className="max-w-lg mx-auto bg-white p-8 rounded-3xl border border-gray-150 shadow-lg text-center space-y-6 animate-fade-in">
            <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center text-4xl font-black ${examResult.passed ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              {examResult.passed ? <FiCheckCircle /> : <FiAward />}
            </div>

            <div>
              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${examResult.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                {examResult.passed ? 'Entrance Exam Passed' : 'Entrance Exam Result'}
              </span>
              <h2 className="text-2xl font-black text-gray-900 mt-2">
                Score: {examResult.score} / {examResult.totalMarks} ({examResult.percentage}%)
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                {examResult.correctAnswers} of {examResult.totalQuestions} questions answered correctly. (Pass threshold: {examResult.passMark}%)
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-150 text-xs text-left space-y-2 text-gray-700">
              <p><strong>Result Notice:</strong> Your entrance examination has been recorded and submitted to the admissions board.</p>
              <p>You can use your Application Code at any time in the <strong>Check Status</strong> tab to view your score and admission decision.</p>
            </div>

            <button
              onClick={() => { setExamResult(null); if (applicationCode) fetchApplicationDetails(applicationCode); }}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-sm transition-all"
            >
              Continue to Application Dashboard
            </button>
          </div>
        )}

        {/* VIEW 3: STANDARD ADMISSION APPLICATION WIZARD */}
        {!isTakingExam && !examResult && (
          <div className="space-y-8">
            
            {/* Step Indicators (Only if logged into a draft application) */}
            {appData && appData.status === 'draft' && (
              <div className="flex justify-between items-center max-w-2xl mx-auto px-4">
                {[
                  { step: 2, label: 'Biodata' },
                  { step: 3, label: 'Parent' },
                  { step: 4, label: 'Uploads' },
                  { step: 5, label: 'Review' }
                ].map((s, idx) => (
                  <div key={idx} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${activeStep === s.step ? 'bg-primary text-white shadow-md' : activeStep > s.step ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`} style={activeStep === s.step ? { backgroundColor: primary } : {}}>
                      {activeStep > s.step ? '✓' : s.step - 1}
                    </div>
                    <span className={`ml-2 text-xs font-bold hidden sm:inline ${activeStep === s.step ? 'text-gray-900' : 'text-gray-400'}`}>
                      {s.label}
                    </span>
                    {idx < 3 && <div className="w-8 sm:w-12 h-0.5 bg-gray-200 mx-2"></div>}
                  </div>
                ))}
              </div>
            )}

            {/* STEP 1: TOKEN ACCESS & PURCHASE */}
            {activeStep === 1 && (
              <div className="grid md:grid-cols-12 gap-8 items-start">
                
                {/* Log In Box (Token Entry & Status Checker) */}
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
                      Check Status & Score
                    </button>
                  </div>
                  
                  <div className="p-6 space-y-4 flex-1">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg text-white" style={{ background: `linear-gradient(135deg, ${primary}, ${darkenHex(primary, 0.14)})` }}>
                      <FiLock />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-gray-900 text-lg">
                        {tokenMode === 'resume' ? 'Enter Admission Token' : 'Admission Status & Exam Checker'}
                      </h4>
                      <p className="text-gray-500 text-xs leading-relaxed mt-0.5">
                        {tokenMode === 'resume' ? 'Input your pre-purchased admission token to fill or resume filling your application form.' : 'Enter your application token to check your score, exam date, interview date, and admission decision.'}
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
                          <input type="text" required placeholder="Enter Token / Code" className={inputCls} value={inputCode} onChange={e => setInputCode(e.target.value)} />
                          <button type="submit" disabled={isVerifyingCode} className="w-full py-3 hover:-translate-y-0.5 text-white font-black rounded-xl text-sm transition-all flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:translate-y-0 shadow-md" style={{ backgroundColor: primary }}>
                            {isVerifyingCode ? 'Checking...' : 'Check Status & Score'}
                          </button>
                        </form>

                        {checkerResult && (
                          <div className="mt-4 bg-gray-50 border border-gray-150 rounded-xl p-4 text-xs space-y-2.5 animate-fade-in text-gray-800">
                            <p><strong>Candidate:</strong> {checkerResult.candidateFirstName} {checkerResult.candidateLastName}</p>
                            <p><strong>Grade:</strong> {checkerResult.gradeLevel}</p>
                            {checkerResult.batchName && (
                              <p><strong>Assigned Shift / Batch:</strong> <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{checkerResult.batchName}</span></p>
                            )}
                            <p>
                              <strong>Admissions Status:</strong>{' '}
                              <span className={`capitalize font-bold px-2 py-0.5 rounded text-[11px] ${checkerResult.status === 'admitted' ? 'bg-emerald-100 text-emerald-800' : checkerResult.status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>
                                {checkerResult.status.replace('_', ' ')}
                              </span>
                            </p>

                            {/* Scheduled Examination & Venue */}
                            {checkerResult.examinationDate && (
                              <div className="p-2 bg-indigo-50/70 border border-indigo-100 rounded-lg space-y-1">
                                <p className="font-bold text-indigo-950">Entrance Examination Schedule:</p>
                                <p className="text-gray-800"><strong>Date & Time:</strong> {new Date(checkerResult.examinationDate).toLocaleString()}</p>
                                {checkerResult.examVenue && (
                                  <p className="text-gray-800"><strong>Testing Center / Lab:</strong> <span className="font-semibold text-indigo-700">{checkerResult.examVenue}</span></p>
                                )}
                              </div>
                            )}

                            {/* Scheduled Interview & Venue */}
                            {checkerResult.interviewDate && (
                              <div className="p-2 bg-blue-50/70 border border-blue-100 rounded-lg space-y-1">
                                <p className="font-bold text-blue-950">Interview Schedule:</p>
                                <p className="text-gray-800"><strong>Date & Time:</strong> {new Date(checkerResult.interviewDate).toLocaleString()}</p>
                                {checkerResult.interviewVenue && (
                                  <p className="text-gray-800"><strong>Interview Location:</strong> <span className="font-semibold text-blue-700">{checkerResult.interviewVenue}</span></p>
                                )}
                              </div>
                            )}

                            {/* Exam Score Summary */}
                            {checkerResult.examScore !== null && checkerResult.examScore !== undefined ? (
                              <div className="p-2.5 bg-white border border-gray-200 rounded-lg space-y-1">
                                <span className="font-bold text-gray-700 block">Entrance Exam Result:</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-black text-sm text-gray-900">{checkerResult.examScore} / {checkerResult.examTotalMarks || 100}</span>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-black ${checkerResult.examPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                    {checkerResult.examPassed ? 'PASSED' : 'FAILED'}
                                  </span>
                                </div>
                              </div>
                            ) : school?.enableAdmissionExam && (
                              <div className="pt-2">
                                <button
                                  type="button"
                                  onClick={() => handleStartExam(checkerResult.applicationCode)}
                                  disabled={isLoadingExam}
                                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
                                >
                                  <FiAward /> {isLoadingExam ? 'Loading...' : 'Take Online Entrance Exam Now'}
                                </button>
                              </div>
                            )}

                            {checkerResult.adminRemarks && (
                              <p className="text-[11px] text-gray-500 italic border-t pt-1.5">Remarks: {checkerResult.adminRemarks}</p>
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
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Parent/Guardian Name</label>
                          <input type="text" required placeholder="e.g. John Musa" className={inputCls} value={purchaseForm.parentName} onChange={e => setPurchaseForm({ ...purchaseForm, parentName: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Parent Phone Number</label>
                          <input type="tel" required placeholder="e.g. +234..." className={inputCls} value={purchaseForm.parentPhone} onChange={e => setPurchaseForm({ ...purchaseForm, parentPhone: e.target.value })} />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Parent Email</label>
                          <input type="email" required placeholder="john@example.com" className={inputCls} value={purchaseForm.parentEmail} onChange={e => setPurchaseForm({ ...purchaseForm, parentEmail: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Applying Grade Level</label>
                          <select required className={inputCls} value={purchaseForm.gradeLevel} onChange={e => setPurchaseForm({ ...purchaseForm, gradeLevel: e.target.value })}>
                            <option value="">Select Grade</option>
                            {school.classes?.map(c => (
                              <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Candidate First Name</label>
                          <input type="text" required placeholder="First name" className={inputCls} value={purchaseForm.candidateFirstName} onChange={e => setPurchaseForm({ ...purchaseForm, candidateFirstName: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Last Name</label>
                          <input type="text" required placeholder="Surname" className={inputCls} value={purchaseForm.candidateLastName} onChange={e => setPurchaseForm({ ...purchaseForm, candidateLastName: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Date of Birth</label>
                          <input type="date" required className={inputCls} value={purchaseForm.dateOfBirth} onChange={e => setPurchaseForm({ ...purchaseForm, dateOfBirth: e.target.value })} />
                        </div>
                      </div>

                      {/* Payment Provider Selector (If form is paid) */}
                      {school.admissionFormPrice > 0 && (
                        <div className="pt-2 border-t border-gray-100">
                          <label className="block text-xs font-bold text-gray-700 mb-2">Select Payment Method</label>
                          <div className="grid grid-cols-3 gap-3">
                            <label className={`border p-3 rounded-xl cursor-pointer text-center text-xs font-bold flex flex-col items-center justify-center gap-1 ${purchaseForm.provider === 'paystack' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-600'}`}>
                              <input type="radio" name="provider" value="paystack" className="hidden" checked={purchaseForm.provider === 'paystack'} onChange={() => setPurchaseForm({ ...purchaseForm, provider: 'paystack' })} />
                              Paystack
                            </label>
                            <label className={`border p-3 rounded-xl cursor-pointer text-center text-xs font-bold flex flex-col items-center justify-center gap-1 ${purchaseForm.provider === 'flutterwave' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-600'}`}>
                              <input type="radio" name="provider" value="flutterwave" className="hidden" checked={purchaseForm.provider === 'flutterwave'} onChange={() => setPurchaseForm({ ...purchaseForm, provider: 'flutterwave' })} />
                              Flutterwave
                            </label>
                            <label className={`border p-3 rounded-xl cursor-pointer text-center text-xs font-bold flex flex-col items-center justify-center gap-1 ${purchaseForm.provider === 'offline' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-600'}`}>
                              <input type="radio" name="provider" value="offline" className="hidden" checked={purchaseForm.provider === 'offline'} onChange={() => setPurchaseForm({ ...purchaseForm, provider: 'offline' })} />
                              Bank Transfer
                            </label>
                          </div>
                        </div>
                      )}

                      <div className="pt-4 flex items-center justify-between">
                        <div className="text-sm font-extrabold text-gray-900">
                          Form Fee: <span className="text-primary">{school.admissionFormPrice > 0 ? `₦${school.admissionFormPrice.toLocaleString()}` : 'Free'}</span>
                        </div>
                        <button type="submit" disabled={isSubmittingPurchase} className="px-6 py-3.5 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md disabled:bg-gray-400" style={{ backgroundColor: primary }}>
                          {isSubmittingPurchase ? 'Processing...' : school.admissionFormPrice > 0 ? 'Proceed to Payment' : 'Start Free Application'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}

            {/* STEP 2: CANDIDATE BIODATA */}
            {activeStep === 2 && appData && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6 fade-in">
                <div>
                  <h3 className="text-lg font-black text-gray-900">Step 2: Candidate Information</h3>
                  <p className="text-gray-400 text-xs mt-0.5">Please provide accurate personal details of the prospective student.</p>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleSaveFormData(3); }} className="space-y-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">First Name *</label>
                      <input type="text" required className={inputCls} value={appData.candidateFirstName || ''} onChange={e => setAppData({ ...appData, candidateFirstName: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Middle Name</label>
                      <input type="text" className={inputCls} value={appData.candidateMiddleName || ''} onChange={e => setAppData({ ...appData, candidateMiddleName: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Last Name *</label>
                      <input type="text" required className={inputCls} value={appData.candidateLastName || ''} onChange={e => setAppData({ ...appData, candidateLastName: e.target.value })} />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Gender *</label>
                      <select required className={inputCls} value={appData.gender || 'male'} onChange={e => setAppData({ ...appData, gender: e.target.value })}>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Date of Birth *</label>
                      <input type="date" required className={inputCls} value={appData.dateOfBirth ? new Date(appData.dateOfBirth).toISOString().slice(0, 10) : ''} onChange={e => setAppData({ ...appData, dateOfBirth: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Applying Grade Level *</label>
                      <select required className={inputCls} value={appData.gradeLevel || ''} onChange={e => setAppData({ ...appData, gradeLevel: e.target.value })}>
                        <option value="">Select Grade</option>
                        {school.classes?.map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Previous School Attended (If Any)</label>
                    <input type="text" placeholder="e.g. St. Jude Primary School" className={inputCls} value={appData.previousSchool || ''} onChange={e => setAppData({ ...appData, previousSchool: e.target.value })} />
                  </div>

                  <div className="flex justify-end pt-4 border-t border-gray-100">
                    <button type="submit" className="px-6 py-2.5 text-white font-bold rounded-lg text-xs flex items-center gap-1" style={{ backgroundColor: primary }}>
                      Save & Continue <FiArrowRight />
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* STEP 3: PARENT / GUARDIAN INFORMATION */}
            {activeStep === 3 && appData && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6 fade-in">
                <div>
                  <h3 className="text-lg font-black text-gray-900">Step 3: Parent / Guardian Information</h3>
                  <p className="text-gray-400 text-xs mt-0.5">Contact details of the primary parent or sponsor.</p>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleSaveFormData(4); }} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Parent/Guardian Full Name *</label>
                      <input type="text" required className={inputCls} value={appData.parentName || ''} onChange={e => setAppData({ ...appData, parentName: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number *</label>
                      <input type="tel" required className={inputCls} value={appData.parentPhone || ''} onChange={e => setAppData({ ...appData, parentPhone: e.target.value })} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Email Address *</label>
                    <input type="email" required className={inputCls} value={appData.parentEmail || ''} onChange={e => setAppData({ ...appData, parentEmail: e.target.value })} />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Residential Address</label>
                    <textarea rows={2} className={inputCls} value={appData.parentAddress || ''} onChange={e => setAppData({ ...appData, parentAddress: e.target.value })} />
                  </div>

                  <div className="flex justify-between pt-4 border-t border-gray-100">
                    <button type="button" onClick={() => setActiveStep(2)} className="px-4 py-2 border border-gray-200 hover:bg-gray-50 font-bold rounded-lg text-xs flex items-center gap-1">
                      <FiArrowLeft /> Back
                    </button>
                    <button type="submit" className="px-6 py-2.5 text-white font-bold rounded-lg text-xs flex items-center gap-1" style={{ backgroundColor: primary }}>
                      Save & Continue <FiArrowRight />
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* STEP 4: UPLOAD DOCUMENTS */}
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

            {/* STEP 5: REVIEW & SUBMIT / APPLICATION RECEIVED SCREEN */}
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
                  <div className="text-center py-8 space-y-6 max-w-lg mx-auto">
                    <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center text-3xl font-bold bg-green-50 text-green-500">
                      <FiCheckCircle />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-gray-900">Application Received</h3>
                      <p className="text-gray-400 text-xs mt-0.5">Thank you! Your application is in progress.</p>
                    </div>
                    
                    <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-xs text-left space-y-2.5">
                      <p><strong>Applicant Name:</strong> {appData.candidateFirstName} {appData.candidateLastName}</p>
                      <p><strong>Application Code:</strong> <code className="bg-gray-200 px-1.5 py-0.5 rounded text-blue-700 font-bold font-mono">{appData.applicationCode}</code></p>
                      {appData.batchName && (
                        <p><strong>Assigned Shift / Batch:</strong> <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{appData.batchName}</span></p>
                      )}
                      <p><strong>Admissions Status:</strong> <span className="capitalize font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">{appData.status.replace('_', ' ')}</span></p>
                      <p><strong>Form Payment:</strong> <span className="capitalize font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">{appData.paymentStatus}</span></p>
                      
                      {appData.examinationDate && (
                        <div className="p-2 bg-indigo-50/70 border border-indigo-100 rounded-lg space-y-1 mt-2">
                          <p className="font-bold text-indigo-950">Entrance Examination Schedule:</p>
                          <p className="text-gray-800"><strong>Date & Time:</strong> {new Date(appData.examinationDate).toLocaleString()}</p>
                          {appData.examVenue && (
                            <p className="text-gray-800"><strong>Testing Center / Lab:</strong> <span className="font-semibold text-indigo-700">{appData.examVenue}</span></p>
                          )}
                        </div>
                      )}

                      {appData.interviewDate && (
                        <div className="p-2 bg-blue-50/70 border border-blue-100 rounded-lg space-y-1">
                          <p className="font-bold text-blue-950">Interview Schedule:</p>
                          <p className="text-gray-800"><strong>Date & Time:</strong> {new Date(appData.interviewDate).toLocaleString()}</p>
                          {appData.interviewVenue && (
                            <p className="text-gray-800"><strong>Interview Location:</strong> <span className="font-semibold text-blue-700">{appData.interviewVenue}</span></p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* CBT Entrance Exam Section */}
                    {school?.enableAdmissionExam && (
                      <div className="p-5 bg-indigo-50/70 border border-indigo-100 rounded-2xl text-left space-y-3">
                        <div className="flex items-center gap-2">
                          <FiAward className="text-indigo-600 text-lg" />
                          <h4 className="font-bold text-sm text-indigo-950">Entrance Examination (CBT)</h4>
                        </div>

                        {appData.examScore !== null && appData.examScore !== undefined ? (
                          <div className="bg-white p-4 rounded-xl border border-indigo-100 space-y-2">
                            <span className="text-xs text-gray-500 font-semibold block">Your Score:</span>
                            <div className="flex items-center gap-3">
                              <span className="text-xl font-black text-gray-900">{appData.examScore} / {appData.examTotalMarks || 100}</span>
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${appData.examPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                {appData.examPassed ? 'PASSED' : 'FAILED'}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-400">
                              Completed on {appData.examSubmittedAt ? new Date(appData.examSubmittedAt).toLocaleString() : 'N/A'}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <p className="text-xs text-indigo-900 leading-relaxed">
                              This school requires prospective candidates to complete an online CBT entrance examination. Click below when ready to start your test.
                            </p>
                            <button
                              type="button"
                              onClick={() => handleStartExam(appData.applicationCode)}
                              disabled={isLoadingExam}
                              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                            >
                              <FiAward /> {isLoadingExam ? 'Preparing Exam...' : 'Start Entrance Examination (CBT)'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    <p className="text-[11px] text-gray-500 max-w-sm mx-auto">
                      Please keep your Application Code safe. You can use it in the "Check Status" tab at any time to view your admission decision and test scores.
                    </p>

                    <button onClick={handleLogoutCode} className="px-6 py-2 border border-gray-200 hover:bg-gray-50 font-bold rounded-lg text-xs mt-2">
                      Exit Admissions Portal
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </main>

      {/* INVIGILATOR TOKEN MODAL */}
      {invigilatorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-gray-100 p-6 space-y-4">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto text-xl">
                <FiLock />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Invigilator Verification Required</h3>
              <p className="text-xs text-gray-500">
                This testing center requires an authorized invigilator token to unlock this examination session on this computer.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!invigilatorTokenInput.trim()) {
                  toast.error('Please enter the invigilator session code');
                  return;
                }
                handleStartExam(pendingExamCode, invigilatorTokenInput.trim());
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Session / Invigilator Password</label>
                <input
                  type="password"
                  required
                  autoFocus
                  placeholder="Enter token provided by supervisor"
                  value={invigilatorTokenInput}
                  onChange={(e) => setInvigilatorTokenInput(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-center font-mono font-bold tracking-wider text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setInvigilatorModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 hover:bg-gray-50 rounded-lg text-xs font-bold text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoadingExam}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isLoadingExam ? 'Verifying...' : 'Unlock & Begin Exam'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mini footer */}
      <footer className="border-t border-gray-150 bg-white py-6 text-center text-xs text-gray-400 mt-auto">
        <p>© {new Date().getFullYear()} {school?.name}. All Rights Reserved.</p>
      </footer>
    </div>
  );
};

export default PublicAdmissions;
