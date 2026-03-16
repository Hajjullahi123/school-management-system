import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../api';
import { toast } from '../../utils/toast';
import useSchoolSettings from '../../hooks/useSchoolSettings';
import useTermContext from '../../hooks/useTermContext';

const CBTPortal = () => {
  const [view, setView] = useState('list'); // 'list', 'taking', 'result'
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { settings: schoolSettings } = useSchoolSettings();
  const { currentTerm } = useTermContext();

  // Active Exam State
  const [activeExam, setActiveExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({}); // { questionId: optionId }
  const [flaggedQuestions, setFlaggedQuestions] = useState({}); // { questionId: boolean }
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0); // in seconds
  const [submissionResult, setSubmissionResult] = useState(null);

  const timerRef = useRef(null);

  useEffect(() => {
    fetchAvailableExams();
    return () => clearInterval(timerRef.current);
  }, []);

  const fetchAvailableExams = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/cbt/student/available');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to fetch available exams');
      }

      if (Array.isArray(data)) {
        setExams(data);
      } else {
        console.error('Expected array of exams, got:', data);
        setExams([]);
        setError('Invalid data format received from server.');
      }
    } catch (error) {
      console.error('Error fetching exams:', error);
      setError(error.message);
      toast.error(error.message || 'Failed to load exams');
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = async (examId) => {
    const examToStart = exams.find(e => e.id === examId);
    const now = new Date();

    if (examToStart?.startDate && new Date(examToStart.startDate) > now) {
      toast.error(`This exam has not started yet. It starts at ${new Date(examToStart.startDate).toLocaleString()}`);
      return;
    }

    if (examToStart?.endDate && new Date(examToStart.endDate) < now) {
      toast.error('This exam has expired and can no longer be taken.');
      return;
    }

    try {
      setLoading(true);
      const response = await api.get(`/api/cbt/${examId}`);
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to start exam');
        setLoading(false);
        return;
      }

      // Prepare exam state
      setActiveExam(data);

      // Parse and Randomize questions
      const shuffledQuestions = data.questions.map(q => {
        const options = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
        // Shuffle options
        const shuffledOptions = [...options].sort(() => Math.random() - 0.5);
        return { ...q, options: shuffledOptions };
      }).sort(() => Math.random() - 0.5); // Shuffle questions

      setQuestions(shuffledQuestions);
      setAnswers({});
      setFlaggedQuestions({});
      setCurrentQuestionIndex(0);
      setTimeLeft(data.durationMinutes * 60);
      setView('taking');

      // Start Timer
      startTimer();
    } catch (error) {
      toast.error('Error starting exam');
    } finally {
      setLoading(false);
    }
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleSubmitExam(true); // Auto-submit
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleOptionSelect = (questionId, optionId) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: optionId
    }));
  };

  const handleToggleFlag = (questionId) => {
    setFlaggedQuestions(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  const handleSubmitExam = async (auto = false) => {
    if (!auto && !confirm('Are you sure you want to submit? You cannot undo this action.')) {
      return;
    }

    clearInterval(timerRef.current);

    try {
      const response = await api.post(`/api/cbt/${activeExam.id}/submit`, { answers });
      const data = await response.json();

      if (response.ok) {
        setSubmissionResult(data);
        setView('result');
        toast.success('Exam submitted successfully');
        fetchAvailableExams(); // Refresh list to show 'Taken' status
      } else {
        toast.error(data.error || 'Submission failed');
      }
    } catch (error) {
      toast.error('Error connecting to server');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const getProgressPercentage = () => {
    const answeredCount = Object.keys(answers).length;
    return Math.round((answeredCount / questions.length) * 100);
  };

  if (loading && !activeExam) return <div className="p-8 text-center">Loading exams...</div>;

  // VIEW: Exam Result
  if (view === 'result' && submissionResult) {
    const scorePercentage = Math.round((submissionResult.correctAnswers / submissionResult.totalQuestions) * 100);

    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden text-center">
          <div className={`p-8 ${scorePercentage >= 50 ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-white shadow-md mb-4">
              <span className={`text-3xl font-bold ${scorePercentage >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                {scorePercentage}%
              </span>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {scorePercentage >= 50 ? 'Great Job!' : 'Keep Practicing'}
            </h2>
            <p className="text-gray-600">You have completed the exam.</p>
          </div>

          <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-gray-100">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Total Score</p>
              <p className="text-xl font-bold text-gray-800">{submissionResult.score}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Correct Answers</p>
              <p className="text-xl font-bold text-green-600">{submissionResult.correctAnswers} / {submissionResult.totalQuestions}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Time Taken</p>
              <p className="text-xl font-bold text-gray-800">Completed</p>
            </div>
          </div>

          <div className="p-4 sm:p-6 bg-gray-50">
            <button
              onClick={() => setView('list')}
              className="px-6 py-3 bg-primary text-white rounded-md hover:brightness-90 font-bold w-full"
            >
              Back to Exam List
            </button>
          </div>
        </div>
      </div>
    );
  }

  // VIEW: Taking Exam
  if (view === 'taking' && activeExam) {
    const currentQ = questions[currentQuestionIndex];

    return (
      <div className="flex flex-col h-screen overflow-hidden fixed inset-0 z-[100] bg-gray-50">
        {/* Top Bar */}
        <div className="bg-white shadow-sm p-3 sm:p-4 flex justify-between items-center z-10">
          <div className="flex items-center gap-2 sm:gap-4 overflow-hidden">
            {schoolSettings?.logoUrl && (
              <img src={schoolSettings.logoUrl} alt="Logo" className="h-8 w-8 sm:h-10 sm:w-10 object-contain hidden sm:block" />
            )}
            <div className="truncate">
              <h1 className="text-sm sm:text-lg font-bold text-gray-800 truncate">{activeExam.title}</h1>
              <p className="text-[10px] sm:text-xs text-gray-500 truncate">{activeExam.subject.name}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 sm:space-x-6">
            <div className="text-right">
              <p className="hidden sm:block text-[10px] text-gray-500 uppercase tracking-widest leading-none mb-1">Time Left</p>
              <p className={`text-lg sm:text-xl font-mono font-black ${timeLeft < 300 ? 'text-red-600 animate-pulse' : 'text-gray-800'}`}>
                {formatTime(timeLeft)}
              </p>
            </div>
            <button
              onClick={() => handleSubmitExam(false)}
              className="bg-red-600 text-white px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold rounded shadow hover:bg-red-700 transition"
            >
              Submit
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-gray-200 w-full">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${getProgressPercentage()}%` }}
          ></div>
        </div>

        <div className="flex-1 flex overflow-hidden relative">
          {/* Sidebar Question Nav - Desktop Only */}
          <div className="w-64 bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto hidden lg:block">
            <h3 className="text-xs font-black text-gray-400 mb-4 uppercase tracking-widest">Question Map</h3>
            <div className="grid grid-cols-4 gap-2">
              {questions.map((q, idx) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentQuestionIndex(idx)}
                  className={`h-10 w-10 text-xs font-bold rounded-lg flex items-center justify-center transition-all relative ${currentQuestionIndex === idx
                    ? 'bg-primary text-white shadow-lg ring-2 ring-primary/30 scale-105'
                    : answers[q.id]
                      ? 'bg-green-100 text-green-700 border border-green-200'
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-primary/50'
                    }`}
                >
                  {idx + 1}
                  {flaggedQuestions[q.id] && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-amber-500 border-2 border-white"></span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Question Area */}
          <div className="flex-1 p-3 sm:p-6 md:p-10 overflow-y-auto bg-gray-50 pb-24 lg:pb-10">
            <div className="max-w-3xl mx-auto h-full">
              <div className="bg-white rounded-2xl shadow-xl border border-gray-200/50 p-4 sm:p-8 min-h-full sm:min-h-[400px] flex flex-col">
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-xs font-black text-primary uppercase tracking-widest">Q. {currentQuestionIndex + 1} / {questions.length}</span>
                    <button
                      onClick={() => handleToggleFlag(currentQ.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tight transition-all border ${flaggedQuestions[currentQ.id]
                        ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                        : 'bg-white text-gray-400 border-gray-200 hover:border-amber-300 hover:text-amber-600'
                        }`}
                    >
                      {flaggedQuestions[currentQ.id] ? 'Flagged' : 'Flag it'}
                    </button>
                  </div>
                  <h2 className="text-lg sm:text-2xl font-semibold text-gray-800 mb-8 leading-snug">
                    {currentQ.questionText}
                  </h2>

                  <div className="space-y-3">
                    {currentQ.options.map(opt => (
                      <label
                        key={opt.id}
                        className={`group flex items-center p-4 sm:p-5 border-2 rounded-xl cursor-pointer transition-all ${answers[currentQ.id] === opt.id
                          ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                          : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        <div className={`w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0 flex items-center justify-center rounded-lg border-2 transition-colors ${answers[currentQ.id] === opt.id
                          ? 'bg-primary border-primary text-white font-black'
                          : 'border-gray-200 text-gray-400 bg-white group-hover:border-primary/50 text-xs sm:text-sm font-bold'
                          }`}>
                          {opt.id.toUpperCase()}
                        </div>
                        <input
                          type="radio"
                          name={`question-${currentQ.id}`}
                          value={opt.id}
                          checked={answers[currentQ.id] === opt.id}
                          onChange={() => handleOptionSelect(currentQ.id, opt.id)}
                          className="hidden"
                        />
                        <div className="ml-4 flex-1">
                          <span className="text-sm sm:text-lg text-gray-700 font-medium">{opt.text}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Desktop Navigation */}
                <div className="hidden sm:flex justify-between mt-12 pt-6 border-t border-gray-100">
                  <button
                    onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentQuestionIndex === 0}
                    className="px-8 py-2.5 border-2 border-gray-100 rounded-xl text-gray-500 font-bold hover:bg-gray-50 disabled:opacity-30 transition-all"
                  >
                    ← Previous
                  </button>

                  {currentQuestionIndex < questions.length - 1 ? (
                    <button
                      onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                      className="px-8 py-2.5 bg-primary text-white rounded-xl font-bold hover:brightness-95 shadow-lg shadow-primary/20 transition-all"
                    >
                      Next Question →
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSubmitExam(false)}
                      className="px-8 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-200 transition-all"
                    >
                      Submit Exam
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Navigation Sticky Bar */}
          <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 flex justify-between items-center z-[110] shadow-2xl">
            <button
              onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
              disabled={currentQuestionIndex === 0}
              className="p-3 text-gray-400 disabled:opacity-20"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex gap-1 overflow-x-auto px-2 max-w-[50vw]">
              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${currentQuestionIndex === idx ? 'bg-primary w-4' : (answers[q.id] ? 'bg-green-400' : 'bg-gray-200')}`}
                ></div>
              ))}
            </div>
            {currentQuestionIndex < questions.length - 1 ? (
              <button
                onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                className="bg-primary text-white p-3 rounded-xl shadow-lg shadow-primary/30"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <button
                onClick={() => handleSubmitExam(false)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-xs"
              >
                SUBMIT
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // VIEW: List of Exams
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{schoolSettings?.schoolName || 'School'} Online Exams</h1>
          <p className="text-gray-600">
            Available computer-based tests for <span className="text-primary font-bold uppercase">{currentTerm?.name || '...'}</span>.
          </p>
        </div>
        {schoolSettings?.logoUrl && (
          <img src={schoolSettings.logoUrl} alt="School Logo" className="h-16 w-16 object-contain" />
        )}
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700 font-medium whitespace-pre-line">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.isArray(exams) && exams.map(exam => {
          const hasTaken = exam.results && exam.results.length > 0;
          const result = hasTaken ? exam.results[0] : null;

          return (
            <div key={exam.id} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex flex-col gap-1">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full w-fit">
                      {exam.subject.name}
                    </span>
                    <span className="px-3 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded-full w-fit uppercase tracking-wider">
                      {exam.examType?.replace('_', ' ') || 'Examination'}
                    </span>
                  </div>
                  {hasTaken ? (
                    <span className="flex items-center text-green-600 text-sm font-medium">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Completed
                    </span>
                  ) : (
                    <span className="text-sm text-gray-500 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {exam.durationMinutes} mins
                    </span>
                  )}
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-1">{exam.title}</h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{exam.description || 'No description provided.'}</p>

                <div className="space-y-2 mb-4">
                  {exam.startDate && (
                    <div className="flex items-center text-xs text-gray-500">
                      <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Starts: {new Date(exam.startDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </div>
                  )}
                  {exam.endDate && (
                    <div className="flex items-center text-xs text-gray-500">
                      <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Ends: {new Date(exam.endDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-100 pt-4 mt-auto">
                  {hasTaken ? (
                    <div className="text-center">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Your Score</p>
                      <p className="text-2xl font-bold text-primary">
                        {result.score} <span className="text-sm text-black font-normal">/ {exam.totalMarks || (result.totalQuestions * 1)}</span>
                      </p>
                    </div>
                  ) : (
                    <>
                      {exam.startDate && new Date(exam.startDate) > new Date() ? (
                        <div className="w-full py-2 bg-gray-100 text-gray-500 rounded-md font-medium text-center flex justify-center items-center cursor-not-allowed">
                          Upcoming
                        </div>
                      ) : exam.endDate && new Date(exam.endDate) < new Date() ? (
                        <div className="w-full py-2 bg-red-50 text-red-500 rounded-md font-medium text-center flex justify-center items-center cursor-not-allowed">
                          Expired
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartExam(exam.id)}
                          className="w-full py-2 bg-primary text-white rounded-md font-medium hover:brightness-90 transition flex justify-center items-center"
                        >
                          Start Exam
                          <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {exams.length === 0 && !loading && (
          <div className="col-span-full py-12 text-center bg-white rounded-lg border border-dashed border-gray-300">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No active exams</h3>
            <p className="mt-1 text-sm text-gray-500">Check back later for scheduled tests.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CBTPortal;
