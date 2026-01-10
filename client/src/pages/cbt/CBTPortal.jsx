import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../api';
import { toast } from '../../utils/toast';
import useSchoolSettings from '../../hooks/useSchoolSettings';

const CBTPortal = () => {
  const [view, setView] = useState('list'); // 'list', 'taking', 'result'
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const { settings: schoolSettings } = useSchoolSettings();

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
      const response = await api.get('/api/cbt/student/available');
      const data = await response.json();
      setExams(data);
    } catch (error) {
      console.error('Error fetching exams:', error);
      toast.error('Failed to load exams');
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

          <div className="p-6 grid grid-cols-3 gap-4 border-t border-gray-100">
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

          <div className="p-6 bg-gray-50">
            <button
              onClick={() => setView('list')}
              className="px-6 py-2 bg-primary text-white rounded-md hover:brightness-90 font-medium w-full md:w-auto"
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
      <div className="flex flex-col h-[calc(100vh-100px)]">
        {/* Top Bar */}
        <div className="bg-white shadow-sm p-4 flex justify-between items-center z-10">
          <div className="flex items-center gap-4">
            {schoolSettings?.logoUrl && (
              <img src={schoolSettings.logoUrl} alt="Logo" className="h-10 w-10 object-contain" />
            )}
            <div>
              <h1 className="text-lg font-bold text-gray-800">{activeExam.title}</h1>
              <p className="text-xs text-gray-500">{activeExam.subject.name} - {schoolSettings?.schoolName || 'School Name'}</p>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase tracking-widest">Time Remaining</p>
              <p className={`text-xl font-mono font-bold ${timeLeft < 300 ? 'text-red-600 animate-pulse' : 'text-gray-800'}`}>
                {formatTime(timeLeft)}
              </p>
            </div>
            <button
              onClick={() => handleSubmitExam(false)}
              className="bg-red-600 text-white px-4 py-2 rounded shadow hover:bg-red-700 transition"
            >
              Submit Exam
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

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar Question Nav */}
          <div className="w-64 bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto hidden md:block">
            <h3 className="text-sm font-semibold text-gray-500 mb-4 uppercase">Questions</h3>
            <div className="grid grid-cols-4 gap-2">
              {questions.map((q, idx) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentQuestionIndex(idx)}
                  className={`h-10 w-10 text-sm font-medium rounded-lg flex items-center justify-center transition-colors relative ${currentQuestionIndex === idx
                    ? 'bg-primary text-white ring-2 ring-primary/30'
                    : answers[q.id]
                      ? 'bg-primary-100 text-primary-700 border border-primary-200'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                    }`}
                >
                  {idx + 1}
                  {flaggedQuestions[q.id] && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Question Area */}
          <div className="flex-1 p-6 md:p-10 overflow-y-auto bg-white/50">
            <div className="max-w-3xl mx-auto">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 min-h-[400px] flex flex-col">
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-bold text-primary block">Question {currentQuestionIndex + 1} of {questions.length}</span>
                    <button
                      onClick={() => handleToggleFlag(currentQ.id)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${flaggedQuestions[currentQ.id]
                        ? 'bg-amber-100 text-amber-700 border border-amber-200'
                        : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-amber-50 hover:text-amber-600'
                        }`}
                    >
                      <svg className={`w-3.5 h-3.5 ${flaggedQuestions[currentQ.id] ? 'fill-current' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                      {flaggedQuestions[currentQ.id] ? 'Flagged for Review' : 'Flag for Review'}
                    </button>
                  </div>
                  <h2 className="text-xl md:text-2xl font-medium text-gray-900 mb-8 leading-relaxed">
                    {currentQ.questionText}
                  </h2>

                  <div className="space-y-3">
                    {currentQ.options.map(opt => (
                      <label
                        key={opt.id}
                        className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${answers[currentQ.id] === opt.id
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-gray-200 hover:bg-gray-50'
                          }`}
                      >
                        <input
                          type="radio"
                          name={`question-${currentQ.id}`}
                          value={opt.id}
                          checked={answers[currentQ.id] === opt.id}
                          onChange={() => handleOptionSelect(currentQ.id, opt.id)}
                          className="w-5 h-5 text-primary focus:ring-primary"
                        />
                        <div className="ml-4">
                          <span className="font-bold text-gray-500 mr-2 uppercase">{opt.id}.</span>
                          <span className="text-gray-800">{opt.text}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
                  <button
                    onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentQuestionIndex === 0}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    ← Previous
                  </button>

                  {currentQuestionIndex < questions.length - 1 ? (
                    <button
                      onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                      className="px-6 py-2 bg-primary text-white rounded-lg hover:brightness-90 shadow-sm"
                    >
                      Next Question →
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSubmitExam(false)}
                      className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-sm"
                    >
                      Finish & Submit
                    </button>
                  )}
                </div>
              </div>
            </div>
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
          <p className="text-gray-600">Available computer-based tests for your class.</p>
        </div>
        {schoolSettings?.logoUrl && (
          <img src={schoolSettings.logoUrl} alt="School Logo" className="h-16 w-16 object-contain" />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {exams.map(exam => {
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
