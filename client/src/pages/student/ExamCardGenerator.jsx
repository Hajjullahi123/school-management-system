import React, { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { api, API_BASE_URL } from '../../api';
import useSchoolSettings from '../../hooks/useSchoolSettings';

export default function ExamCardGenerator() {
  const { settings: schoolSettings } = useSchoolSettings();
  const [examCard, setExamCard] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [currentSession, setCurrentSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [restrictionReason, setRestrictionReason] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  // ... (fetchData remains same, skipping lines for brevity if not changing logic significantly) ...
  // Actually I need to update loadExamCard and generateExamCard, so I will replace the whole block or specific functions.

  const fetchData = async () => {
    try {
      // Get current term and session
      const [termsRes, sessionsRes] = await Promise.all([
        api.get('/api/terms'),
        api.get('/api/academic-sessions')
      ]);

      const terms = await termsRes.json();
      const sessions = await sessionsRes.json();

      const activeTerm = terms.find(t => t.isCurrent);
      const activeSession = sessions.find(s => s.isCurrent);

      setCurrentTerm(activeTerm);
      setCurrentSession(activeSession);

      if (activeTerm && activeSession) {
        await loadExamCard(activeTerm.id, activeSession.id);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadExamCard = async (termId, sessionId) => {
    try {
      // Check for studentId in URL (for admins/accountants)
      const urlParams = new URLSearchParams(window.location.search);
      const studentId = urlParams.get('studentId');

      let endpoint = `/api/exam-cards/my-card?termId=${termId}&academicSessionId=${sessionId}`;

      if (studentId) {
        endpoint = `/api/exam-cards/student/${studentId}?termId=${termId}&academicSessionId=${sessionId}`;
      }

      const response = await api.get(endpoint);

      // Handle non-JSON responses gracefully
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        // If it's a 404, we don't necessarily want to throw an error, just handle it as "not found"
        if (response.status === 404) {
          setError(null); // No card yet is OK
          setExamCard(null);
          return;
        }
        throw new Error(text || `Server error: ${response.status}`);
      }

      if (response.ok) {
        if (data.isExamRestricted || (data.student && data.student.isExamRestricted)) {
          setExamCard(null);
          setRestrictionReason(data.examRestrictionReason || data.student?.examRestrictionReason || 'Access Restricted');
          setError('Access Denied');
        } else {
          setExamCard(data);
          setError(null);
          setRestrictionReason(null);
        }
      } else {
        setExamCard(null);
        // Only set error if it's not a simple 404 (handled above)
        setError(data.error || 'Failed to load exam card');
        if (data.restrictionReason) {
          setRestrictionReason(data.restrictionReason);
        }
      }
    } catch (error) {
      console.error('Error in loadExamCard:', error);
      setError(error.message || 'Failed to load exam card');
    }
  };

  const generateExamCard = async () => {
    if (!currentTerm || !currentSession) {
      setError('Current academic term or session not found. Please contact the administrator.');
      return;
    }

    try {
      const response = await api.post('/api/exam-cards/generate', {
        termId: currentTerm.id,
        academicSessionId: currentSession.id,
        studentId: new URLSearchParams(window.location.search).get('studentId')
      });

      // Handle non-JSON responses gracefully
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(text || `Server error: ${response.status}`);
      }

      if (response.ok) {
        setExamCard(data.examCard);
        setError(null);
        setRestrictionReason(null);
        alert('Exam card generated successfully!');
      } else {
        if (data.requiresClearance) {
          setError(data.error);
          if (data.feeStatus) {
            alert(`Fee Status:\nExpected: ₦${data.feeStatus.expected}\nPaid: ₦${data.feeStatus.paid}\nBalance: ₦${data.feeStatus.balance}`);
          }
        } else if (data.restrictionReason) {
          setError(data.error);
          setRestrictionReason(data.restrictionReason);
        } else {
          setError(data.error || 'Failed to generate exam card');
        }
      }
    } catch (error) {
      console.error('Error in generateExamCard:', error);
      setError(error.message || 'Failed to connect to the server. Please try again.');
    }
  };

  const printCard = () => {
    window.print();
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Examination Card</h1>

      {restrictionReason && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6 animate-pulse">
          <h3 className="text-lg font-bold text-red-800 mb-2 flex items-center">
            ⛔ Access Restricted
          </h3>
          <p className="text-red-700 font-medium mb-1">
            {error || 'You are restricted from generating your exam card.'}
          </p>
          <div className="mt-3 p-3 bg-white/60 rounded border border-red-100">
            <span className="text-xs font-bold text-red-500 uppercase tracking-wider">Reason from Admin:</span>
            <p className="text-gray-800 italic mt-1">"{restrictionReason}"</p>
          </div>
        </div>
      )}

      {error && !examCard && !restrictionReason && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-amber-800 mb-2">Examination Access Information</h3>
          <p className="text-amber-700">{error}</p>
        </div>
      )}

      {!examCard && (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-600 mb-4 font-medium">
            {new URLSearchParams(window.location.search).get('studentId')
              ? 'Ready to generate exam card for this student.'
              : "Your examination card is ready for generation. Once generated, you can print and present it during exams."}
          </p>
          <button
            onClick={generateExamCard}
            className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:brightness-90 transition-all font-bold"
          >
            🖨️ Generate & View Exam Card
          </button>
        </div>
      )}

      {examCard && (
        <>
          <div className="flex justify-center mb-6 print:m-0">
            <div
              className="bg-white rounded-lg shadow-xl print:shadow-none border-2 border-gray-200 print:border-gray-400 overflow-hidden relative"
              id="exam-card"
              style={{
                width: '105mm',
                height: '148.5mm',
                padding: '12mm 8mm',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* Watermark/Background decoration */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center">
                {schoolSettings?.logoUrl && (
                  <img src={schoolSettings.logoUrl} alt="" className="w-1/2 grayscale" />
                )}
              </div>

              {/* Header */}
              <div className="text-center border-b border-gray-300 pb-2 mb-3 relative z-10">
                {schoolSettings?.logoUrl && (
                  <img
                    src={schoolSettings.logoUrl}
                    alt="School Logo"
                    className="h-10 w-10 absolute left-0 top-0 object-contain"
                  />
                )}
                <h2 className="text-sm font-bold text-gray-900 uppercase leading-none px-12">
                  {schoolSettings?.schoolName || 'EXAMINATION CARD'}
                </h2>
                <p className="text-[10px] font-bold text-indigo-700 tracking-widest mt-1">
                  EXAMINATION CARD
                </p>
                <p className="text-[9px] text-gray-600 mt-0.5 font-medium">
                  {currentSession?.name} • {currentTerm?.name}
                </p>
              </div>

              <div className="grid grid-cols-12 gap-3 relative z-10">
                {/* Student Photo */}
                <div className="col-span-4">
                  {(() => {
                    const photo = examCard.student.user?.photoUrl || examCard.student.photoUrl;
                    return photo ? (
                      <img
                        src={photo.startsWith('data:') || photo.startsWith('http') ? photo : `${API_BASE_URL}${photo}`}
                        alt="Student"
                        className="w-full aspect-[3/4] object-cover rounded border border-gray-300 shadow-sm"
                      />
                    ) : (
                      <div className="w-full aspect-[3/4] bg-gray-100 rounded border border-gray-300 flex items-center justify-center">
                        <span className="text-[8px] text-gray-400">No Photo</span>
                      </div>
                    );
                  })()}
                </div>

                {/* Student Details */}
                <div className="col-span-8 flex flex-col justify-center space-y-2">
                  <div>
                    <label className="text-[8px] font-bold text-gray-500 uppercase">Student Name</label>
                    <p className="text-xs font-bold text-gray-900 leading-tight">{examCard.student.name}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[8px] font-bold text-gray-500 uppercase">Admission No</label>
                      <p className="text-[10px] font-bold">{examCard.student.admissionNumber}</p>
                    </div>
                    <div>
                      <label className="text-[8px] font-bold text-gray-500 uppercase">Class</label>
                      <p className="text-[10px] font-bold">{examCard.student.class}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-[8px] font-bold text-gray-500 uppercase">Card Access ID</label>
                    <p className="text-[9px] font-mono text-gray-700">{examCard.cardNumber}</p>
                  </div>
                </div>
              </div>

              {/* Subjects */}
              <div className="mt-3 flex-grow overflow-hidden relative z-10">
                <h3 className="text-[9px] font-bold mb-1.5 border-b border-gray-100 pb-0.5">Registered Subjects:</h3>
                {examCard.subjects && examCard.subjects.length > 0 ? (
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                    {examCard.subjects.slice(0, 14).map((subject, idx) => (
                      <div key={idx} className="text-[8px] text-gray-800 flex items-center">
                        <span className="w-1 h-1 bg-indigo-400 rounded-full mr-1.5 flex-shrink-0"></span>
                        <span className="truncate">{subject.name}</span>
                      </div>
                    ))}
                    {examCard.subjects.length > 14 && (
                      <div className="text-[8px] text-gray-500 italic">+{examCard.subjects.length - 14} more...</div>
                    )}
                  </div>
                ) : (
                  <div className="text-[8px] text-amber-600 bg-amber-50 p-2 rounded italic">
                    Contact academic department for registration.
                  </div>
                )}
              </div>

              {/* Bottom Section: QR and Footer */}
              <div className="mt-auto border-t border-gray-200 pt-2 flex items-end justify-between relative z-10">
                <div className="flex-1 text-[8px] text-gray-600 leading-tight">
                  <p className="font-bold text-red-600 mb-0.5 uppercase tracking-tighter">Security Notice:</p>
                  <p>Must be presented for entry.</p>
                  <p className="mt-1">Issued: {new Date(examCard.issuedAt).toLocaleDateString()}</p>
                </div>
                <div className="flex flex-col items-center">
                  {schoolSettings?.principalSignatureUrl ? (
                    <img
                      src={schoolSettings.principalSignatureUrl.startsWith('data:') || schoolSettings.principalSignatureUrl.startsWith('http') ? schoolSettings.principalSignatureUrl : `${API_BASE_URL}${schoolSettings.principalSignatureUrl}`}
                      alt="Principal Signature"
                      className="h-[28px] w-auto object-contain mix-blend-multiply"
                    />
                  ) : (
                    <div className="h-[18px]"></div>
                  )}
                  <div className="border-t border-gray-800 w-full mt-0.5 pt-0.5">
                    <p className="text-[7px] font-bold text-gray-500 uppercase m-0">Principal</p>
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <QRCodeCanvas value={examCard.cardNumber} size={48} />
                  <p className="text-[7px] text-gray-400 mt-0.5">VERIFY</p>
                </div>
              </div>
            </div>
          </div>

          {/* Print Button */}
          <div className="mt-6 text-center print:hidden">
            <button
              onClick={printCard}
              className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:brightness-90 font-bold flex items-center gap-2 mx-auto"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Exam Card (A6 Size)
            </button>
          </div>
        </>
      )}

      <style>{`
        @media print {
          body * {
            visibility: hidden;
            margin: 0 !important;
            padding: 0 !important;
          }
          #exam-card, #exam-card * {
            visibility: visible;
          }
          #exam-card {
            position: fixed;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            width: 105mm !important;
            height: 148.5mm !important;
            border: 1px solid #ccc !important;
          }
          @page {
            size: A4;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}
