import React, { useState, useEffect } from 'react';
import { api, API_BASE_URL } from '../../api';
import { 
  FiSearch, FiFilter, FiEye, FiCheck, FiX, FiUserPlus, FiCreditCard, 
  FiDownload, FiCheckCircle, FiPrinter, FiPlus, FiEdit2, FiTrash2, 
  FiAward, FiCalendar, FiClock, FiHelpCircle, FiFileText, FiMapPin, 
  FiUsers, FiLayers, FiKey
} from 'react-icons/fi';
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
  const [activeTab, setActiveTab] = useState('applications'); // 'applications' | 'questions' | 'settings'
  
  // Settings State
  const [settings, setSettings] = useState({
    enableOnlineAdmissionForm: false,
    admissionFormPrice: 0,
    defaultInterviewDate: '',
    defaultInterviewVenue: '',
    enableAdmissionExam: false,
    admissionExamPassMark: 50,
    admissionExamDuration: 60,
    defaultExaminationDate: '',
    defaultExamVenue: '',
    requireExamInvigilatorToken: false,
    examInvigilatorToken: ''
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Multi-select & Bulk Scheduling State
  const [selectedAppIds, setSelectedAppIds] = useState([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkScheduleForm, setBulkScheduleForm] = useState({
    batchName: '',
    examinationDate: '',
    examVenue: '',
    interviewDate: '',
    interviewVenue: ''
  });
  const [isBulkScheduling, setIsBulkScheduling] = useState(false);

  // Token Generation State
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateForm, setGenerateForm] = useState({ purchaserName: '', purchaserPhone: '', gradeLevel: '' });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTokenData, setGeneratedTokenData] = useState(null);
  
  // Modals state
  const [selectedApp, setSelectedApp] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAdmitModal, setShowAdmitModal] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState(false);
  
  // Admit Form State
  const [targetClassId, setTargetClassId] = useState('');
  const [admissionNumberOverride, setAdmissionNumberOverride] = useState('');
  const [isAdmitting, setIsAdmitting] = useState(false);

  // Manual Score Form State
  const [scoreForm, setScoreForm] = useState({
    examScore: '',
    examTotalMarks: 100,
    examPassed: true,
    adminRemarks: ''
  });
  const [isSavingScore, setIsSavingScore] = useState(false);

  // Exam Questions State
  const [examQuestions, setExamQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [printModalType, setPrintModalType] = useState(null); // 'paper' | 'marking_guide' | null
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [questionForm, setQuestionForm] = useState({
    questionText: '',
    questionType: 'multiple_choice',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctOption: 'A',
    points: 1,
    isActive: true
  });
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);

  useEffect(() => {
    fetchApplications();
    fetchClasses();
    fetchSettings();
  }, []);

  useEffect(() => {
    if (activeTab === 'questions') {
      fetchExamQuestions();
    }
  }, [activeTab]);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings({
          enableOnlineAdmissionForm: data.enableOnlineAdmissionForm || false,
          admissionFormPrice: data.admissionFormPrice || 0,
          defaultInterviewDate: data.defaultInterviewDate ? new Date(data.defaultInterviewDate).toISOString().slice(0, 16) : '',
          defaultInterviewVenue: data.defaultInterviewVenue || '',
          enableAdmissionExam: data.enableAdmissionExam || false,
          admissionExamPassMark: data.admissionExamPassMark || 50,
          admissionExamDuration: data.admissionExamDuration || 60,
          defaultExaminationDate: data.defaultExaminationDate ? new Date(data.defaultExaminationDate).toISOString().slice(0, 16) : '',
          defaultExamVenue: data.defaultExamVenue || '',
          requireExamInvigilatorToken: data.requireExamInvigilatorToken || false,
          examInvigilatorToken: data.examInvigilatorToken || ''
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSettingsChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const saveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await api.put('/api/settings', settings);
      if (res.ok) {
        toast.success('Admissions settings saved successfully');
      } else {
        toast.error('Failed to save settings');
      }
    } catch (err) {
      toast.error('Network error saving settings');
    } finally {
      setSavingSettings(false);
    }
  };

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

  const fetchExamQuestions = async () => {
    setLoadingQuestions(true);
    try {
      const res = await api.get('/api/admissions/admin/exam-questions');
      if (res.ok) {
        const data = await res.json();
        setExamQuestions(data);
      } else {
        toast.error('Failed to load exam questions');
      }
    } catch (error) {
      console.error(error);
      toast.error('Network error loading exam questions');
    } finally {
      setLoadingQuestions(false);
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

  const handleUpdateInterview = async (appId, newDate, newVenue) => {
    try {
      const res = await api.put(`/api/admissions/admin/${appId}/interview`, {
        interviewDate: newDate !== undefined ? (newDate || null) : undefined,
        interviewVenue: newVenue !== undefined ? (newVenue || null) : undefined
      });
      if (res.ok) {
        toast.success('Interview details updated successfully!');
        fetchApplications();
        if (selectedApp && selectedApp.id === appId) {
          const updated = await res.json();
          setSelectedApp(updated.application);
        }
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update interview details');
      }
    } catch (error) {
      console.error(error);
      toast.error('Connection error updating interview');
    }
  };

  const handleUpdateExamDate = async (appId, newDate, newVenue, newBatch) => {
    try {
      const res = await api.put(`/api/admissions/admin/${appId}/examination-date`, {
        examinationDate: newDate !== undefined ? (newDate || null) : undefined,
        examVenue: newVenue !== undefined ? (newVenue || null) : undefined,
        batchName: newBatch !== undefined ? (newBatch || null) : undefined
      });
      if (res.ok) {
        toast.success('Examination schedule updated successfully!');
        fetchApplications();
        if (selectedApp && selectedApp.id === appId) {
          const updated = await res.json();
          setSelectedApp(updated.application);
        }
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update examination schedule');
      }
    } catch (error) {
      console.error(error);
      toast.error('Connection error updating examination');
    }
  };

  const handleSaveManualScore = async (e) => {
    e.preventDefault();
    if (!selectedApp) return;

    setIsSavingScore(true);
    try {
      const res = await api.put(`/api/admissions/admin/${selectedApp.id}/exam-score`, {
        examScore: scoreForm.examScore !== '' ? Number(scoreForm.examScore) : null,
        examTotalMarks: Number(scoreForm.examTotalMarks) || 100,
        examPassed: scoreForm.examPassed,
        adminRemarks: scoreForm.adminRemarks
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Exam score recorded successfully!');
        setSelectedApp(data.application);
        setShowScoreModal(false);
        fetchApplications();
      } else {
        toast.error(data.error || 'Failed to record exam score');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error recording exam score');
    } finally {
      setIsSavingScore(false);
    }
  };

  const openManualScoreModal = (app) => {
    setScoreForm({
      examScore: app.examScore !== null && app.examScore !== undefined ? app.examScore : '',
      examTotalMarks: app.examTotalMarks || 100,
      examPassed: app.examPassed !== null && app.examPassed !== undefined ? app.examPassed : true,
      adminRemarks: app.adminRemarks || ''
    });
    setShowScoreModal(true);
  };

  // Bulk Scheduling Handler
  const handleBulkScheduleSubmit = async (e) => {
    e.preventDefault();
    if (selectedAppIds.length === 0) {
      toast.error('No applicants selected');
      return;
    }

    setIsBulkScheduling(true);
    try {
      const res = await api.post('/api/admissions/admin/bulk-schedule', {
        applicationIds: selectedAppIds,
        batchName: bulkScheduleForm.batchName || undefined,
        examinationDate: bulkScheduleForm.examinationDate || undefined,
        examVenue: bulkScheduleForm.examVenue || undefined,
        interviewDate: bulkScheduleForm.interviewDate || undefined,
        interviewVenue: bulkScheduleForm.interviewVenue || undefined
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Successfully assigned ${data.count} candidates to batch!`);
        setShowBulkModal(false);
        setSelectedAppIds([]);
        fetchApplications();
      } else {
        toast.error(data.error || 'Failed to bulk schedule');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error performing bulk schedule');
    } finally {
      setIsBulkScheduling(false);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedAppIds(filteredApps.map(a => a.id));
    } else {
      setSelectedAppIds([]);
    }
  };

  const handleToggleSelectOne = (id) => {
    setSelectedAppIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
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

  // Question CRUD Handlers
  const handleOpenAddQuestion = () => {
    setEditingQuestionId(null);
    setQuestionForm({
      questionText: '',
      questionType: 'multiple_choice',
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      correctOption: 'A',
      points: 1,
      isActive: true
    });
    setShowQuestionModal(true);
  };

  const handleOpenEditQuestion = (q) => {
    setEditingQuestionId(q.id);
    let options = [];
    try {
      options = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
    } catch (e) {
      options = [];
    }
    setQuestionForm({
      questionText: q.questionText || '',
      questionType: q.questionType || 'multiple_choice',
      optionA: options[0] || '',
      optionB: options[1] || '',
      optionC: options[2] || '',
      optionD: options[3] || '',
      correctOption: q.correctOption || 'A',
      points: q.points || 1,
      isActive: q.isActive !== undefined ? q.isActive : true
    });
    setShowQuestionModal(true);
  };

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    if (!questionForm.questionText.trim()) {
      toast.error('Please enter question text');
      return;
    }
    if (!questionForm.optionA.trim() || !questionForm.optionB.trim()) {
      toast.error('Please provide at least Option A and Option B');
      return;
    }

    const options = [
      questionForm.optionA.trim(),
      questionForm.optionB.trim(),
      questionForm.optionC.trim() || 'N/A',
      questionForm.optionD.trim() || 'N/A'
    ];

    setIsSavingQuestion(true);
    try {
      const payload = {
        questionText: questionForm.questionText.trim(),
        questionType: questionForm.questionType,
        options,
        correctOption: questionForm.correctOption,
        points: Number(questionForm.points) || 1,
        isActive: questionForm.isActive
      };

      let res;
      if (editingQuestionId) {
        res = await api.put(`/api/admissions/admin/exam-questions/${editingQuestionId}`, payload);
      } else {
        res = await api.post('/api/admissions/admin/exam-questions', payload);
      }

      if (res.ok) {
        toast.success(editingQuestionId ? 'Question updated successfully' : 'Question added successfully');
        setShowQuestionModal(false);
        fetchExamQuestions();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to save question');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error saving question');
    } finally {
      setIsSavingQuestion(false);
    }
  };

  const handleDeleteQuestion = async (id) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    try {
      const res = await api.delete(`/api/admissions/admin/exam-questions/${id}`);
      if (res.ok) {
        toast.success('Question deleted successfully');
        fetchExamQuestions();
      } else {
        toast.error('Failed to delete question');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error deleting question');
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

  const getExamScoreBadge = (app) => {
    if (app.examScore === null || app.examScore === undefined) {
      return <span className="text-xs text-gray-400 font-medium">Pending Exam</span>;
    }
    const score = app.examScore;
    const total = app.examTotalMarks || 100;
    const pct = total > 0 ? Math.round((score / total) * 100) : 0;
    const passed = app.examPassed;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold border rounded-full ${passed ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
        <FiAward className="w-3 h-3" />
        {score}/{total} ({pct}%) • {passed ? 'Pass' : 'Fail'}
      </span>
    );
  };

  // Filter list
  const filteredApps = applications.filter(app => {
    const candidateName = `${app.candidateFirstName || ''} ${app.candidateLastName || ''}`.toLowerCase();
    const parentName = (app.parentName || '').toLowerCase();
    const appCode = (app.applicationCode || '').toLowerCase();
    const parentPhone = (app.parentPhone || '');
    const batchName = (app.batchName || '').toLowerCase();
    const examVenue = (app.examVenue || '').toLowerCase();
    const searchLower = (searchTerm || '').toLowerCase();

    const matchesSearch = 
      candidateName.includes(searchLower) ||
      parentName.includes(searchLower) ||
      appCode.includes(searchLower) ||
      parentPhone.includes(searchTerm) ||
      batchName.includes(searchLower) ||
      examVenue.includes(searchLower);
      
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    const matchesPayment = paymentFilter === 'all' || app.paymentStatus === paymentFilter;

    return matchesSearch && matchesStatus && matchesPayment;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Online Admissions Portal</h1>
          <p className="text-gray-500 text-sm">Review applications, schedule center shifts, conduct entrance examinations, and admit candidates.</p>
        </div>
        <button
          onClick={() => { setGenerateForm({ purchaserName: '', purchaserPhone: '', gradeLevel: '' }); setShowGenerateModal(true); }}
          className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
        >
          <FiPrinter /> Generate Admission Token
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('applications')}
          className={`pb-3 px-6 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'applications' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <FiFileText className="w-4 h-4" /> Applications ({applications.length})
        </button>
        <button
          onClick={() => setActiveTab('questions')}
          className={`pb-3 px-6 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'questions' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <FiHelpCircle className="w-4 h-4" /> Exam Questions ({examQuestions.length})
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-3 px-6 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'settings' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <FiCalendar className="w-4 h-4" /> Admission & Exam Settings
        </button>
      </div>

      {/* TAB 1: APPLICATIONS LIST */}
      {activeTab === 'applications' && (
        <>
          {/* Filters & Bulk Actions Bar */}
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl border border-gray-150 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative col-span-2">
                <FiSearch className="absolute left-3 top-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, code, batch, or venue..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                />
              </div>

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

            {/* Bulk Action Sticky Strip */}
            {selectedAppIds.length > 0 && (
              <div className="bg-indigo-600 text-white px-5 py-3 rounded-xl flex items-center justify-between shadow-md animate-fade-in">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <FiUsers className="w-5 h-5" />
                  <span>{selectedAppIds.length} candidate{selectedAppIds.length > 1 ? 's' : ''} selected</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedAppIds([])}
                    className="text-xs text-indigo-100 hover:text-white px-2 py-1"
                  >
                    Deselect All
                  </button>
                  <button
                    onClick={() => setShowBulkModal(true)}
                    className="bg-white text-indigo-700 px-4 py-1.5 rounded-lg font-bold text-xs hover:bg-indigo-50 flex items-center gap-1.5 shadow-sm"
                  >
                    <FiLayers /> Bulk Schedule Batch / Venue
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Applications List Table */}
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
                      <th className="px-4 py-4 w-10 text-center">
                        <input
                          type="checkbox"
                          onChange={handleSelectAll}
                          checked={selectedAppIds.length > 0 && selectedAppIds.length === filteredApps.length}
                          className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                        />
                      </th>
                      <th className="px-6 py-4">Code / Batch</th>
                      <th className="px-6 py-4">Candidate</th>
                      <th className="px-6 py-4">Parent / Phone</th>
                      <th className="px-6 py-4">Grade</th>
                      <th className="px-6 py-4">Exam Schedule & Venue</th>
                      <th className="px-6 py-4">Score</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredApps.map((app) => (
                      <tr key={app.id} className={`hover:bg-gray-50/50 transition-colors ${selectedAppIds.includes(app.id) ? 'bg-indigo-50/30' : ''}`}>
                        <td className="px-4 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={selectedAppIds.includes(app.id)}
                            onChange={() => handleToggleSelectOne(app.id)}
                            className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                          />
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-700">
                          <div>{app.applicationCode}</div>
                          {app.batchName && (
                            <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 mt-0.5 inline-block">
                              {app.batchName}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 font-semibold text-gray-900">{app.candidateFirstName} {app.candidateLastName}</td>
                        <td className="px-6 py-4">
                          <div>{app.parentName}</div>
                          <div className="text-xs text-gray-400">{app.parentPhone}</div>
                        </td>
                        <td className="px-6 py-4">{app.gradeLevel}</td>
                        <td className="px-6 py-4 text-xs">
                          {app.examinationDate ? (
                            <div>
                              <span className="font-semibold text-gray-800">{new Date(app.examinationDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                              {app.examVenue && (
                                <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                                  <FiMapPin className="w-3 h-3 text-indigo-500 shrink-0" />
                                  <span className="truncate max-w-[140px]">{app.examVenue}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">Not scheduled</span>
                          )}
                        </td>
                        <td className="px-6 py-4">{getExamScoreBadge(app)}</td>
                        <td className="px-6 py-4">{getStatusBadge(app.status)}</td>
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
        </>
      )}

      {/* TAB 2: EXAM QUESTIONS (CBT Question Bank) */}
      {activeTab === 'questions' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-white p-4 rounded-xl border border-gray-150 shadow-xs">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Entrance Examination Question Bank</h2>
              <p className="text-xs text-gray-500">Manage multiple-choice questions for prospective students taking the online or paper entrance exam.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setPrintModalType('paper')}
                disabled={examQuestions.length === 0}
                className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs disabled:opacity-50 transition-colors"
                title="Print physical exam question paper for students"
              >
                <FiPrinter /> Print Exam Paper
              </button>
              <button
                type="button"
                onClick={() => setPrintModalType('marking_guide')}
                disabled={examQuestions.length === 0}
                className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs disabled:opacity-50 transition-colors"
                title="Print official answers and marking scheme for examiners"
              >
                <FiAward /> Print Marking Guide
              </button>
              <button
                type="button"
                onClick={handleOpenAddQuestion}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm"
              >
                <FiPlus /> Add New Question
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-150 shadow-xs overflow-hidden">
            {loadingQuestions ? (
              <div className="flex justify-center items-center py-20">
                <div className="w-10 h-10 border-4 border-t-transparent border-primary rounded-full animate-spin"></div>
              </div>
            ) : examQuestions.length === 0 ? (
              <div className="text-center py-16 text-gray-500 text-sm space-y-3">
                <p>No entrance exam questions have been added yet.</p>
                <button
                  onClick={handleOpenAddQuestion}
                  className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <FiPlus /> Create First Question
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {examQuestions.map((q, index) => {
                  let options = [];
                  try {
                    options = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
                  } catch (e) {
                    options = [];
                  }
                  const optionLetters = ['A', 'B', 'C', 'D'];

                  return (
                    <div key={q.id} className="p-5 hover:bg-gray-50/50 transition-colors flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs bg-primary/10 text-primary px-2.5 py-0.5 rounded-md">Q{index + 1}</span>
                          <span className="text-xs text-gray-400 font-semibold">{q.points} Point{q.points > 1 ? 's' : ''}</span>
                          {!q.isActive && (
                            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded font-bold">Inactive</span>
                          )}
                        </div>
                        <p className="font-semibold text-gray-900 text-sm whitespace-pre-wrap">{q.questionText}</p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {options.map((opt, optIdx) => {
                            const letter = optionLetters[optIdx] || optIdx;
                            const isCorrect = String(q.correctOption).toUpperCase() === letter;
                            return (
                              <div 
                                key={optIdx} 
                                className={`text-xs p-2 rounded-lg border flex items-center gap-2 ${isCorrect ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold' : 'bg-gray-50 border-gray-200 text-gray-700'}`}
                              >
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${isCorrect ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                  {letter}
                                </span>
                                <span className="truncate">{opt}</span>
                                {isCorrect && <span className="ml-auto text-[10px] text-emerald-600 font-black">CORRECT</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-start">
                        <button
                          onClick={() => handleOpenEditQuestion(q)}
                          className="p-2 text-gray-600 hover:text-primary hover:bg-primary/10 rounded-lg text-xs font-bold transition-colors"
                          title="Edit Question"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="p-2 text-gray-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-bold transition-colors"
                          title="Delete Question"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: ADMISSION & EXAM SETTINGS */}
      {activeTab === 'settings' && (
        <div className="bg-white p-6 rounded-xl border border-gray-150 shadow-xs max-w-4xl space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Admission & Entrance Examination Settings</h2>
            <p className="text-xs text-gray-500 mt-1">Configure admission form pricing, venues, interview schedules, and CBT lab invigilation rules.</p>
          </div>

          <form onSubmit={saveSettings} className="space-y-6">
            {/* Section 1: Online Form Settings */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-150 space-y-4">
              <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                <FiFileText className="text-primary" /> Application Form Configuration
              </h3>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="enableOnlineAdmissionForm"
                  name="enableOnlineAdmissionForm"
                  checked={settings.enableOnlineAdmissionForm}
                  onChange={handleSettingsChange}
                  className="h-4 w-4 text-primary rounded"
                />
                <label htmlFor="enableOnlineAdmissionForm" className="ml-2 text-sm font-semibold text-gray-700">
                  Enable Online Admission Applications on Public Website
                </label>
              </div>

              {settings.enableOnlineAdmissionForm && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-gray-200">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Admission Form Price (₦)
                    </label>
                    <input
                      type="number"
                      name="admissionFormPrice"
                      min="0"
                      value={settings.admissionFormPrice}
                      onChange={handleSettingsChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="e.g. 5000"
                    />
                    <p className="mt-1 text-[11px] text-gray-500">Set to 0 for free form.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Default Interview Date
                    </label>
                    <input
                      type="datetime-local"
                      name="defaultInterviewDate"
                      value={settings.defaultInterviewDate || ''}
                      onChange={handleSettingsChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                    <p className="mt-1 text-[11px] text-gray-500">Auto-assigned on form submit.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Default Interview Venue
                    </label>
                    <input
                      type="text"
                      name="defaultInterviewVenue"
                      value={settings.defaultInterviewVenue || ''}
                      onChange={handleSettingsChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="e.g. Principal's Office, Main Block"
                    />
                    <p className="mt-1 text-[11px] text-gray-500">Location for physical interviews.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Section 2: Entrance Examination (CBT) Settings */}
            <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-4">
              <h3 className="font-bold text-sm text-indigo-950 flex items-center gap-2">
                <FiAward className="text-indigo-600" /> Entrance Examination (CBT) Configuration
              </h3>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="enableAdmissionExam"
                  name="enableAdmissionExam"
                  checked={settings.enableAdmissionExam}
                  onChange={handleSettingsChange}
                  className="h-4 w-4 text-indigo-600 rounded"
                />
                <label htmlFor="enableAdmissionExam" className="ml-2 text-sm font-semibold text-gray-800">
                  Enable CBT Entrance Examination for Prospective Students
                </label>
              </div>

              {settings.enableAdmissionExam && (
                <div className="space-y-4 pt-2 border-t border-indigo-100">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Pass Mark (%)
                      </label>
                      <input
                        type="number"
                        name="admissionExamPassMark"
                        min="1"
                        max="100"
                        value={settings.admissionExamPassMark}
                        onChange={handleSettingsChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                        placeholder="50"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Duration (Mins)
                      </label>
                      <input
                        type="number"
                        name="admissionExamDuration"
                        min="5"
                        max="240"
                        value={settings.admissionExamDuration}
                        onChange={handleSettingsChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                        placeholder="60"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Default Exam Date
                      </label>
                      <input
                        type="datetime-local"
                        name="defaultExaminationDate"
                        value={settings.defaultExaminationDate || ''}
                        onChange={handleSettingsChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Default Exam Venue / Lab
                      </label>
                      <input
                        type="text"
                        name="defaultExamVenue"
                        value={settings.defaultExamVenue || ''}
                        onChange={handleSettingsChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                        placeholder="e.g. ICT Lab 1 (30 PCs)"
                      />
                    </div>
                  </div>

                  {/* Invigilator Lab Security Section */}
                  <div className="p-3 bg-white rounded-xl border border-indigo-200 space-y-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="requireExamInvigilatorToken"
                        name="requireExamInvigilatorToken"
                        checked={settings.requireExamInvigilatorToken}
                        onChange={handleSettingsChange}
                        className="h-4 w-4 text-indigo-600 rounded"
                      />
                      <label htmlFor="requireExamInvigilatorToken" className="ml-2 text-xs font-bold text-gray-800 flex items-center gap-1.5">
                        <FiKey className="text-indigo-600" /> Require Invigilator Token to Unlock Exam in Lab
                      </label>
                    </div>

                    {settings.requireExamInvigilatorToken && (
                      <div className="pt-2 border-t border-gray-100">
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Daily / Session Invigilator Token (Case-insensitive)
                        </label>
                        <input
                          type="text"
                          name="examInvigilatorToken"
                          value={settings.examInvigilatorToken || ''}
                          onChange={handleSettingsChange}
                          className="w-full md:w-64 font-mono font-bold tracking-wider border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 uppercase"
                          placeholder="e.g. CBT2026"
                        />
                        <p className="mt-1 text-[11px] text-gray-500">
                          Candidates in the lab must obtain this password from the supervisor to start their test.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100">
              <button
                type="submit"
                disabled={savingSettings}
                className="px-6 py-2.5 bg-primary text-white rounded-xl hover:brightness-90 disabled:bg-gray-400 font-bold text-sm shadow-sm transition-all"
              >
                {savingSettings ? 'Saving Settings...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* BULK BATCH & VENUE SCHEDULING MODAL */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-gray-100">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-indigo-50">
              <div className="flex items-center gap-2 text-indigo-900 font-bold">
                <FiLayers className="w-5 h-5" />
                <span>Bulk Batch & Center Scheduling ({selectedAppIds.length} candidates)</span>
              </div>
              <button onClick={() => setShowBulkModal(false)} className="text-gray-400 hover:text-gray-600">
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBulkScheduleSubmit} className="p-6 space-y-4 text-sm">
              <p className="text-xs text-gray-500">
                Assign all selected candidates to a specific testing center, shift time, and batch session.
              </p>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Batch / Shift Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Batch 1 — Morning Session"
                  value={bulkScheduleForm.batchName}
                  onChange={e => setBulkScheduleForm({ ...bulkScheduleForm, batchName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Exam Date & Time</label>
                  <input
                    type="datetime-local"
                    value={bulkScheduleForm.examinationDate}
                    onChange={e => setBulkScheduleForm({ ...bulkScheduleForm, examinationDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Examination Venue / Center</label>
                  <input
                    type="text"
                    placeholder="e.g. ICT Lab A (30 Seats)"
                    value={bulkScheduleForm.examVenue}
                    onChange={e => setBulkScheduleForm({ ...bulkScheduleForm, examVenue: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Interview Date & Time (Optional)</label>
                  <input
                    type="datetime-local"
                    value={bulkScheduleForm.interviewDate}
                    onChange={e => setBulkScheduleForm({ ...bulkScheduleForm, interviewDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Interview Venue (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Conference Hall B"
                    value={bulkScheduleForm.interviewVenue}
                    onChange={e => setBulkScheduleForm({ ...bulkScheduleForm, interviewVenue: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBulkScheduling}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 flex items-center gap-1.5"
                >
                  <FiCheck /> {isBulkScheduling ? 'Scheduling...' : 'Apply Schedule to Selected'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                  <p><strong>Batch / Shift:</strong> {selectedApp.batchName || 'Not Assigned'}</p>
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

              {/* Examination & Interview Schedules */}
              <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-xl space-y-3 text-xs">
                <h4 className="font-bold text-blue-900 uppercase tracking-wider text-[11px]">Schedules & Center Performance</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Examination Schedule & Venue */}
                  <div className="bg-white p-3 rounded-lg border border-blue-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-600">Exam Schedule:</span>
                      <button
                        onClick={() => {
                          const newDate = prompt('Enter examination date (YYYY-MM-DD HH:MM) or leave blank to clear:', selectedApp.examinationDate ? new Date(selectedApp.examinationDate).toISOString().slice(0,16) : '');
                          if (newDate !== null) {
                            const newVenue = prompt('Enter examination venue/center (e.g. ICT Lab A):', selectedApp.examVenue || '');
                            const newBatch = prompt('Enter batch/shift (e.g. Batch 1 - Morning):', selectedApp.batchName || '');
                            handleUpdateExamDate(selectedApp.id, newDate, newVenue, newBatch);
                          }
                        }}
                        className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-[11px] font-bold"
                      >
                        Edit
                      </button>
                    </div>
                    <p className="text-gray-900 font-semibold">{selectedApp.examinationDate ? new Date(selectedApp.examinationDate).toLocaleString() : 'Not Scheduled'}</p>
                    <p className="text-gray-500 text-[11px]"><strong>Center:</strong> {selectedApp.examVenue || 'Not Assigned'}</p>
                  </div>

                  {/* Interview Schedule & Venue */}
                  <div className="bg-white p-3 rounded-lg border border-blue-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-600">Interview Schedule:</span>
                      <button
                        onClick={() => {
                          const newDate = prompt('Enter interview date (YYYY-MM-DD HH:MM) or leave blank to clear:', selectedApp.interviewDate ? new Date(selectedApp.interviewDate).toISOString().slice(0,16) : '');
                          if (newDate !== null) {
                            const newVenue = prompt('Enter interview venue (e.g. Principal Office):', selectedApp.interviewVenue || '');
                            handleUpdateInterview(selectedApp.id, newDate, newVenue);
                          }
                        }}
                        className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-[11px] font-bold"
                      >
                        Edit
                      </button>
                    </div>
                    <p className="text-gray-900 font-semibold">{selectedApp.interviewDate ? new Date(selectedApp.interviewDate).toLocaleString() : 'Not Scheduled'}</p>
                    <p className="text-gray-500 text-[11px]"><strong>Venue:</strong> {selectedApp.interviewVenue || 'Not Assigned'}</p>
                  </div>
                </div>

                {/* Exam Score Summary */}
                <div className="bg-white p-3 rounded-lg border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-gray-600 block">Entrance Exam Score:</span>
                    {selectedApp.examScore !== null && selectedApp.examScore !== undefined ? (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm font-black text-gray-900">{selectedApp.examScore} / {selectedApp.examTotalMarks || 100}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${selectedApp.examPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {selectedApp.examPassed ? 'PASSED' : 'FAILED'}
                        </span>
                        {selectedApp.examCorrectAnswers !== null && (
                          <span className="text-gray-400 text-[11px]">({selectedApp.examCorrectAnswers}/{selectedApp.examTotalQuestions || 0} questions correct)</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 font-medium">Not taken / score pending</span>
                    )}
                    {selectedApp.adminRemarks && (
                      <p className="text-[11px] text-gray-500 italic mt-1">Remarks: {selectedApp.adminRemarks}</p>
                    )}
                  </div>
                  <button
                    onClick={() => openManualScoreModal(selectedApp)}
                    className="px-3 py-1 bg-indigo-600 text-white rounded text-[11px] font-bold hover:bg-indigo-700 self-start sm:self-auto"
                  >
                    {selectedApp.examScore !== null ? 'Edit Score' : 'Record Score Manually'}
                  </button>
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

      {/* QUESTION CREATE/EDIT MODAL */}
      {showQuestionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-gray-100">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-900">{editingQuestionId ? 'Edit Exam Question' : 'Add Entrance Exam Question'}</h3>
              <button onClick={() => setShowQuestionModal(false)} className="text-gray-400 hover:text-gray-600">
                <FiX className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveQuestion} className="p-6 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Question Text</label>
                <textarea
                  required
                  rows={3}
                  value={questionForm.questionText}
                  onChange={(e) => setQuestionForm({ ...questionForm, questionText: e.target.value })}
                  placeholder="e.g. Which of the following is a prime number?"
                  className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700">Options</label>
                
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center font-bold text-xs text-gray-700">A</span>
                  <input
                    type="text"
                    required
                    placeholder="Option A text"
                    value={questionForm.optionA}
                    onChange={(e) => setQuestionForm({ ...questionForm, optionA: e.target.value })}
                    className="flex-1 px-3 py-1.5 border rounded-lg text-sm"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center font-bold text-xs text-gray-700">B</span>
                  <input
                    type="text"
                    required
                    placeholder="Option B text"
                    value={questionForm.optionB}
                    onChange={(e) => setQuestionForm({ ...questionForm, optionB: e.target.value })}
                    className="flex-1 px-3 py-1.5 border rounded-lg text-sm"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center font-bold text-xs text-gray-700">C</span>
                  <input
                    type="text"
                    placeholder="Option C text"
                    value={questionForm.optionC}
                    onChange={(e) => setQuestionForm({ ...questionForm, optionC: e.target.value })}
                    className="flex-1 px-3 py-1.5 border rounded-lg text-sm"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center font-bold text-xs text-gray-700">D</span>
                  <input
                    type="text"
                    placeholder="Option D text"
                    value={questionForm.optionD}
                    onChange={(e) => setQuestionForm({ ...questionForm, optionD: e.target.value })}
                    className="flex-1 px-3 py-1.5 border rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Correct Answer</label>
                  <select
                    value={questionForm.correctOption}
                    onChange={(e) => setQuestionForm({ ...questionForm, correctOption: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white text-sm font-bold text-primary"
                  >
                    <option value="A">Option A</option>
                    <option value="B">Option B</option>
                    <option value="C">Option C</option>
                    <option value="D">Option D</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Points</label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={questionForm.points}
                    onChange={(e) => setQuestionForm({ ...questionForm, points: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center pt-2">
                <input
                  type="checkbox"
                  id="questionIsActive"
                  checked={questionForm.isActive}
                  onChange={(e) => setQuestionForm({ ...questionForm, isActive: e.target.checked })}
                  className="h-4 w-4 text-primary rounded"
                />
                <label htmlFor="questionIsActive" className="ml-2 text-xs font-semibold text-gray-700">
                  Active (Include in student exams)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowQuestionModal(false)}
                  className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingQuestion}
                  className="px-5 py-2 text-sm font-bold text-white bg-primary hover:bg-primary/90 rounded-lg disabled:opacity-50"
                >
                  {isSavingQuestion ? 'Saving...' : editingQuestionId ? 'Update Question' : 'Add Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD/EDIT EXAM SCORE MODAL */}
      {showScoreModal && selectedApp && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-gray-150 p-6 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Record Entrance Exam Score</h3>
              <p className="text-gray-500 text-xs">For candidate: {selectedApp.candidateFirstName} {selectedApp.candidateLastName}</p>
            </div>

            <form onSubmit={handleSaveManualScore} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Score Obtained</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    value={scoreForm.examScore}
                    onChange={(e) => setScoreForm({ ...scoreForm, examScore: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder="e.g. 75"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Total Marks</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={scoreForm.examTotalMarks}
                    onChange={(e) => setScoreForm({ ...scoreForm, examTotalMarks: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder="100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Pass Status</label>
                <select
                  value={scoreForm.examPassed ? 'true' : 'false'}
                  onChange={(e) => setScoreForm({ ...scoreForm, examPassed: e.target.value === 'true' })}
                  className="w-full px-3 py-2 border rounded-lg bg-white text-sm font-bold"
                >
                  <option value="true">Passed</option>
                  <option value="false">Failed</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Admin Remarks (Optional)</label>
                <textarea
                  rows={2}
                  value={scoreForm.adminRemarks}
                  onChange={(e) => setScoreForm({ ...scoreForm, adminRemarks: e.target.value })}
                  placeholder="e.g. Excellent math skills, recommended for Science stream."
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowScoreModal(false)}
                  className="px-4 py-2 border rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingScore}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold disabled:bg-gray-400"
                >
                  {isSavingScore ? 'Saving...' : 'Save Exam Result'}
                </button>
              </div>
            </form>
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
                window.location.reload();
              }} className="px-4 py-2 text-sm font-bold text-white bg-primary hover:bg-primary/90 flex items-center justify-center gap-2 rounded-lg">
                <FiPrinter /> Print Slip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE EXAMINATION PAPER & MARKING GUIDE MODAL */}
      {printModalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50 print:hidden sticky top-0 z-10">
              <div className="flex items-center gap-2 font-bold text-gray-900">
                <FiPrinter className="text-primary" />
                <span>{printModalType === 'paper' ? 'Print Physical Question Paper' : 'Print Examiner Marking Scheme & Answer Key'}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const printContent = document.getElementById('printable-exam-paper-area').innerHTML;
                    const originalContent = document.body.innerHTML;
                    document.body.innerHTML = printContent;
                    window.print();
                    document.body.innerHTML = originalContent;
                    window.location.reload();
                  }}
                  className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm hover:bg-primary/90"
                >
                  <FiPrinter /> Print Now
                </button>
                <button type="button" onClick={() => setPrintModalType(null)} className="text-gray-400 hover:text-gray-600 p-1">
                  <FiX className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-8 bg-white text-gray-900 printable-document" id="printable-exam-paper-area">
              {/* Official School Header */}
              <div className="border-b-2 border-gray-900 pb-4 mb-6 text-center space-y-1.5">
                {schoolSettings?.logoUrl && (
                  <img
                    src={`${API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL}${schoolSettings.logoUrl.startsWith('/') ? schoolSettings.logoUrl : '/' + schoolSettings.logoUrl}`}
                    alt="Logo"
                    className="w-16 h-16 mx-auto mb-1 object-contain grayscale"
                  />
                )}
                <h1 className="text-xl font-black uppercase tracking-wider text-gray-900">{schoolSettings?.schoolName || 'SCHOOL ADMISSIONS'}</h1>
                {schoolSettings?.schoolMotto && (
                  <p className="text-xs italic font-serif text-gray-600">"{schoolSettings.schoolMotto}"</p>
                )}
                {schoolSettings?.schoolAddress && (
                  <p className="text-[11px] text-gray-500">{schoolSettings.schoolAddress}</p>
                )}
                <div className="pt-2">
                  <span className="inline-block bg-gray-900 text-white px-4 py-1 rounded text-xs font-black uppercase tracking-widest">
                    {printModalType === 'paper' ? 'ENTRANCE EXAMINATION QUESTION PAPER' : 'OFFICIAL MARKING SCHEME & ANSWER KEY'}
                  </span>
                </div>
              </div>

              {/* Student Header & Metadata (Only for Paper Exam) */}
              {printModalType === 'paper' ? (
                <div className="space-y-4 mb-6">
                  <div className="grid grid-cols-2 gap-4 border border-gray-300 rounded-lg p-3 text-xs bg-gray-50/50">
                    <div className="space-y-2">
                      <p><strong>CANDIDATE NAME:</strong> ____________________________________________</p>
                      <p><strong>APPLICATION CODE / SEAT NO:</strong> ________________________________</p>
                    </div>
                    <div className="space-y-2">
                      <p><strong>DATE:</strong> _____________________ &nbsp;<strong>HALL/VENUE:</strong> _________________</p>
                      <p><strong>TIME ALLOWED:</strong> {settings.admissionExamDuration || 60} Minutes &nbsp;|&nbsp; <strong>TOTAL MARKS:</strong> {examQuestions.reduce((acc, q) => acc + (q.points || 1), 0)}</p>
                    </div>
                  </div>

                  <div className="p-3 bg-gray-100 rounded-lg text-xs space-y-1 text-gray-800 border border-gray-200">
                    <p className="font-bold uppercase text-[10px] tracking-wider text-gray-600">INSTRUCTIONS TO CANDIDATES:</p>
                    <ol className="list-decimal pl-4 space-y-0.5 text-[11px]">
                      <li>Write your full name and application code clearly in the spaces provided above.</li>
                      <li>Answer ALL questions. Each question carries the point(s) stated.</li>
                      <li>For each question, select the best answer from options A, B, C, or D and circle/shade it clearly.</li>
                      <li>Do not open this question paper until instructed to do so by the invigilator.</li>
                    </ol>
                  </div>
                </div>
              ) : (
                /* Marking Guide Info Bar */
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs flex justify-between items-center mb-6">
                  <div>
                    <span className="font-bold text-emerald-950 block">EXAMINER'S CONFIDENTIAL ANSWER SCHEME</span>
                    <span className="text-emerald-700 text-[11px]">Total Questions: {examQuestions.length} &nbsp;|&nbsp; Total Marks: {examQuestions.reduce((acc, q) => acc + (q.points || 1), 0)} Marks &nbsp;|&nbsp; Pass Threshold: {settings.admissionExamPassMark || 50}%</span>
                  </div>
                  <span className="px-2 py-1 bg-emerald-700 text-white font-bold text-[10px] rounded uppercase tracking-wider">CONFIDENTIAL</span>
                </div>
              )}

              {/* Questions List */}
              {printModalType === 'paper' ? (
                /* Paper Questions View */
                <div className="space-y-6">
                  {examQuestions.filter(q => q.isActive).map((q, idx) => {
                    let options = [];
                    try {
                      options = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
                    } catch (e) {
                      options = [];
                    }
                    const optionLetters = ['A', 'B', 'C', 'D'];

                    return (
                      <div key={q.id} className="text-xs space-y-2 border-b border-gray-150 pb-4 break-inside-avoid">
                        <div className="flex items-baseline gap-2">
                          <span className="font-bold text-sm text-gray-900">Q{idx + 1}.</span>
                          <span className="font-semibold text-gray-900 text-sm flex-1 leading-relaxed">{q.questionText}</span>
                          <span className="text-[10px] font-bold text-gray-500">({q.points} Mark{q.points > 1 ? 's' : ''})</span>
                        </div>

                        <div className="grid grid-cols-2 gap-x-6 gap-y-2 pl-6 pt-1">
                          {options.map((opt, optIdx) => (
                            <div key={optIdx} className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full border border-gray-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                                {optionLetters[optIdx]}
                              </span>
                              <span className="text-gray-800">{opt}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Marking Guide Table View */
                <div className="space-y-6">
                  <table className="w-full text-xs border-collapse border border-gray-300">
                    <thead className="bg-gray-100 font-bold text-gray-800">
                      <tr>
                        <th className="border border-gray-300 px-3 py-2 w-12 text-center">Q#</th>
                        <th className="border border-gray-300 px-3 py-2 text-left">Question Excerpt</th>
                        <th className="border border-gray-300 px-3 py-2 w-24 text-center">Correct Option</th>
                        <th className="border border-gray-300 px-3 py-2 w-20 text-center">Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {examQuestions.map((q, idx) => (
                        <tr key={q.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="border border-gray-300 px-3 py-2 font-bold text-center">Q{idx + 1}</td>
                          <td className="border border-gray-300 px-3 py-2 text-gray-800">{q.questionText}</td>
                          <td className="border border-gray-300 px-3 py-2 text-center font-black text-emerald-700 bg-emerald-50">
                            Option [{String(q.correctOption).toUpperCase()}]
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-center font-semibold">{q.points} pt</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="grid grid-cols-2 gap-8 pt-8 text-xs border-t border-gray-200">
                    <div>
                      <p><strong>Chief Examiner / Invigilator:</strong> __________________________</p>
                      <p className="mt-4"><strong>Signature:</strong> ____________________ <strong>Date:</strong> ____________</p>
                    </div>
                    <div>
                      <p><strong>Admissions Officer:</strong> __________________________________</p>
                      <p className="mt-4"><strong>Signature:</strong> ____________________ <strong>Date:</strong> ____________</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdmissionsManagement;
