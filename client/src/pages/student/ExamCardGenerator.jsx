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
          <div className="bg-white rounded-lg shadow p-8 print:shadow-none" id="exam-card">
            {/* Header */}
            <div className="text-center border-b-2 border-gray-300 pb-4 mb-6 relative">
              {schoolSettings?.logoUrl && (
                <img
                  src={schoolSettings.logoUrl}
                  alt="School Logo"
                  className="h-16 w-16 absolute left-0 top-0 object-contain print:h-20 print:w-20"
                />
              )}
              <h2 className="text-2xl font-bold text-gray-900 uppercase">
                {schoolSettings?.schoolName || 'EXAMINATION CARD'}
              </h2>
              <p className="text-gray-600 font-semibold tracking-wider">
                {schoolSettings ? 'EXAMINATION CARD' : 'EXAMINATION CARD'}
              </p>
              <p className="text-gray-600 mt-1">
                {currentSession?.name} - {currentTerm?.name}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-6">
              {/* Student Photo */}
              <div className="col-span-1">
                {examCard.student.photoUrl ? (
                  <img
                    src={`${API_BASE_URL}${examCard.student.photoUrl}`}
                    alt="Student"
                    className="w-full h-40 object-cover rounded border-2 border-gray-300"
                  />
                ) : (
                  <div className="w-full h-40 bg-gray-200 rounded border-2 border-gray-300 flex items-center justify-center">
                    <span className="text-gray-500">No Photo</span>
                  </div>
                )}
              </div>

              {/* Student Details */}
              <div className="col-span-2 space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600">Name:</label>
                  <p className="text-lg font-semibold">{examCard.student.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Admission No:</label>
                    <p className="font-semibold">{examCard.student.admissionNumber}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Class:</label>
                    <p className="font-semibold">{examCard.student.class}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Card Number:</label>
                  <p className="font-mono text-sm">{examCard.cardNumber}</p>
                </div>
              </div>
            </div>

            {/* Subjects */}
            <div className="mt-6">
              <h3 className="font-semibold mb-3">Registered Subjects:</h3>
              {examCard.subjects && examCard.subjects.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {examCard.subjects.map((subject, idx) => (
                    <div key={idx} className="text-sm border border-gray-200 rounded px-3 py-2">
                      {subject.name}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded px-4 py-3 italic">
                  No subjects have been registered for this class yet. Please contact the academic department.
                </div>
              )}
            </div>

            {/* QR Code */}
            <div className="mt-6 flex justify-center">
              <div className="text-center">
                <QRCodeCanvas value={examCard.cardNumber} size={128} />
                <p className="text-xs text-gray-500 mt-2">Scan to verify</p>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-4 border-t border-gray-300 text-center text-sm text-gray-600">
              <p>This card must be presented during all examinations</p>
              <p className="mt-1">Issued: {new Date(examCard.issuedAt).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Print Button */}
          <div className="mt-6 text-center print:hidden">
            <button
              onClick={printCard}
              className="px-6 py-3 bg-primary text-white rounded-md hover:brightness-90"
            >
              🖨️ Print Exam Card
            </button>
          </div>
        </>
      )}

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #exam-card, #exam-card * {
            visibility: visible;
          }
          #exam-card {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
