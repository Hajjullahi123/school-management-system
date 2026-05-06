import React, { useState, useEffect } from 'react';
import { api, API_BASE_URL } from '../../api';
import { toast } from '../../utils/toast';
import useSchoolSettings from '../../hooks/useSchoolSettings';
import { useAuth } from '../../context/AuthContext';
import useTermContext from '../../hooks/useTermContext';

const CBTManagement = () => {
  const [view, setView] = useState('list'); // 'list', 'create', 'questions'
  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teacherAssignments, setTeacherAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const { settings: schoolSettings } = useSchoolSettings();
  const { user } = useAuth();

  // Create/Edit Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    classId: '',
    subjectId: '',
    durationMinutes: 60,
    totalMarks: 100,
    startDate: '',
    endDate: '',
    examType: 'examination', // assignment1, assignment2, test1, test2, examination
    randomizeQuestions: true,
    randomizeOptions: true
  });

  // Question Management State
  const [selectedExam, setSelectedExam] = useState(null);
  const [questions, setQuestions] = useState([]); // Questions for selected exam
  const [examResults, setExamResults] = useState([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    questionText: '',
    questionType: 'multiple_choice',
    options: [
      { id: 'a', text: '' },
      { id: 'b', text: '' },
      { id: 'c', text: '' },
      { id: 'd', text: '' }
    ],
    correctOption: 'a',
    points: 1
  });

  // Bank Import State
  const [bankQuestions, setBankQuestions] = useState([]);
  const [showBankModal, setShowBankModal] = useState(false);
  const [selectedBankQuestions, setSelectedBankQuestions] = useState([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [saveToBank, setSaveToBank] = useState(false);
  const [bankSearchTerm, setBankSearchTerm] = useState('');
  const [editingQuestion, setEditingQuestion] = useState(null);

  const { currentTerm, currentSession, loading: termLoading } = useTermContext();

  useEffect(() => {
    if (!termLoading && currentTerm) {
      fetchInitialData();
    }
  }, [termLoading, currentTerm]);

  const fetchInitialData = async () => {
    try {
      const requests = [
        api.get(`/api/cbt/teacher?termId=${currentTerm?.id || ''}`),
        api.get('/api/classes'),
        api.get('/api/subjects')
      ];

      if (user?.role === 'teacher') {
        requests.push(api.get(`/api/teacher-assignments/teacher/${user.id}`));
      }

      const results = await Promise.all(requests);

      // Process Exams response
      if (results[0].ok) {
        const examsData = await results[0].json();
        setExams(Array.isArray(examsData) ? examsData : []);
      } else {
        console.error('Failed to fetch exams');
        setExams([]);
      }

      // Process Classes response
      if (results[1].ok) {
        setClasses(await results[1].json());
      }

      // Process Subjects response
      if (results[2].ok) {
        setSubjects(await results[2].json());
      }

      if (user?.role === 'teacher' && results[3] && results[3].ok) {
        setTeacherAssignments(await results[3].json());
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/api/cbt', formData);
      const data = await response.json();

      if (response.ok) {
        toast.success('Exam created successfully');
        setExams([data, ...exams]);
        setView('list');
        // Reset form
        setFormData({
          title: '',
          description: '',
          classId: '',
          subjectId: '',
          durationMinutes: 60,
          totalMarks: 100,
          startDate: '',
          endDate: '',
          examType: 'examination'
        });
      } else {
        toast.error(data.error || 'Failed to create exam');
      }
    } catch (error) {
      toast.error('Error creating exam');
    }
  };

  const handleManageQuestions = async (exam) => {
    setSelectedExam(exam);
    // Fetch questions for this exam
    try {
      const response = await api.get(`/api/cbt/${exam.id}`);
      const data = await response.json();
      if (response.ok) {
        // Parse options if they are strings (JSON)
        const parsedQuestions = data.questions.map(q => ({
          ...q,
          options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
        }));
        setQuestions(parsedQuestions);
        setView('questions');
      }
    } catch (error) {
      toast.error('Failed to load questions');
    }
  };

  const handleAddQuestion = async () => {
    if (!newQuestion.questionText) {
      toast.error('Question text is required');
      return;
    }
    // Check if options are filled
    if (newQuestion.options.some(o => !o.text.trim())) {
      toast.error('All options must be filled');
      return;
    }

    try {
      if (editingQuestion) {
        // UPDATE MODE
        const response = await api.put(`/api/cbt/${selectedExam.id}/questions/${editingQuestion.id}`, newQuestion);
        const data = await response.json();
        if (response.ok) {
          toast.success('Question updated');
          setQuestions(questions.map(q => q.id === editingQuestion.id ? { ...data, options: JSON.parse(data.options) } : q));
          setEditingQuestion(null);
          resetQuestionForm();
        } else {
          toast.error(data.error || 'Update failed');
        }
      } else {
        // ADD MODE
        const payload = {
          questions: [newQuestion],
          saveToBank
        };
        const response = await api.post(`/api/cbt/${selectedExam.id}/questions`, payload);
        const data = await response.json();

        if (response.ok) {
          toast.success('Question added');
          const createdQ = data[0];
          createdQ.options = JSON.parse(createdQ.options);
          setQuestions([...questions, createdQ]);
          resetQuestionForm();
        } else {
          toast.error(data.error || 'Failed to add question');
        }
      }
    } catch (error) {
      toast.error('Error saving question');
    }
  };

  const resetQuestionForm = () => {
    setNewQuestion({
      questionText: '',
      questionType: 'multiple_choice',
      options: [
        { id: 'a', text: '' },
        { id: 'b', text: '' },
        { id: 'c', text: '' },
        { id: 'd', text: '' }
      ],
      correctOption: 'a',
      points: 1
    });
    setEditingQuestion(null);
  };

  const handleEditIndividualQuestion = (q) => {
    setEditingQuestion(q);
    setNewQuestion({
      questionText: q.questionText,
      questionType: q.questionType,
      options: q.options,
      correctOption: q.correctOption,
      points: q.points
    });
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteIndividualQuestion = async (qId) => {
    if (!confirm('Are you sure you want to delete this specific question?')) return;
    try {
      const response = await api.delete(`/api/cbt/${selectedExam.id}/questions/${qId}`);
      if (response.ok) {
        toast.success('Question deleted');
        setQuestions(questions.filter(q => q.id !== qId));
        if (editingQuestion?.id === qId) resetQuestionForm();
      }
    } catch (error) {
      toast.error('Failed to delete question');
    }
  };

  const handlePublishToggle = async (exam) => {
    try {
      const response = await api.put(`/api/cbt/${exam.id}/publish`, { isPublished: !exam.isPublished });
      if (response.ok) {
        toast.success(exam.isPublished ? 'Exam unpublished' : 'Exam published');
        // Update local state
        setExams(exams.map(e => e.id === exam.id ? { ...e, isPublished: !e.isPublished } : e));
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleDeleteExam = async (examId) => {
    if (!confirm('Are you sure? This will delete the exam and all results.')) return;

    try {
      const response = await api.delete(`/api/cbt/${examId}`);
      if (response.ok) {
        toast.success('Exam deleted');
        setExams(exams.filter(e => e.id !== examId));
      }
    } catch (error) {
      toast.error('Failed to delete exam');
    }
  };

  const handleViewResults = async (exam) => {
    setSelectedExam(exam);
    setResultsLoading(true);
    setView('results');
    try {
      const response = await api.get(`/api/cbt/${exam.id}/results`);
      const data = await response.json();
      if (response.ok) {
        setExamResults(data.results);
      } else {
        toast.error('Failed to fetch results');
      }
    } catch (error) {
      toast.error('Error loading results');
    } finally {
      setResultsLoading(false);
    }
  };

  const handlePrintExam = async (exam) => {
    try {
      const response = await api.get(`/api/cbt/${exam.id}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      const qs = data.questions.map(q => ({
        ...q,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
      }));

      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html>
          <head>
            <title>${exam.title} - Questions</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; }
              .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
              .school-name { font-size: 24px; font-bold; margin: 0; }
              .exam-title { font-size: 20px; margin: 10px 0; color: #555; }
              .meta { font-size: 14px; display: flex; justify-content: space-between; margin-top: 10px; }
              .question { margin-bottom: 25px; page-break-inside: avoid; }
              .question-text { font-weight: bold; margin-bottom: 10px; }
              .options { margin-left: 20px; }
              .option { margin-bottom: 5px; }
              @media print {
                .no-print { display: none; }
                body { padding: 0; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1 class="school-name">${schoolSettings?.schoolName || 'School Management System'}</h1>
              <h2 class="exam-title">${exam.title}</h2>
              <div class="meta">
                <span>Subject: ${exam.subject?.name}</span>
                <span>Class: ${exam.class?.name}</span>
                <span>Time: ${exam.durationMinutes} mins</span>
              </div>
            </div>
            <div class="questions">
              ${qs.map((q, i) => `
                <div class="question">
                  <div class="question-text">${i + 1}. ${q.questionText} (${q.points} marks)</div>
                  <div class="options">
                    ${q.options.map(o => `<div class="option">(${o.id.toUpperCase()}) ${o.text}</div>`).join('')}
                  </div>
                </div>
              `).join('')}
            </div>
            <script>
              window.onload = () => {
                window.print();
                // window.close();
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (error) {
      toast.error('Failed to generate printable exam');
    }
  };

  const handleDeleteResult = async (resultId) => {
    if (!confirm('Are you sure you want to delete this attempt?')) return;

    try {
      const response = await api.delete(`/api/cbt/results/${resultId}`);
      if (response.ok) {
        toast.success('Result deleted');
        setExamResults(examResults.filter(r => r.id !== resultId));
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete result');
      }
    } catch (error) {
      toast.error('Error deleting result');
    }
  };

  const handleDownloadResults = () => {
    if (!selectedExam) return;
    const url = `${API_BASE_URL}/api/cbt/${selectedExam.id}/results/download`;
    const token = localStorage.getItem('token');

    // Use a hidden anchor tag to trigger download with auth token
    fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(response => response.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CBT_Results_${selectedExam.title.replace(/\s+/g, '_')}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      })
      .catch(error => {
        console.error('Download error:', error);
        toast.error('Failed to download results');
      });
  };

  const handleImportResults = async () => {
    if (!selectedExam) return;
    if (!confirm(`This will automatically import scores from this ${selectedExam.examType || 'examination'} into the students' academic records for ${selectedExam.class?.name}. Existing scores for this specific component will be overwritten. Continue?`)) return;

    setImporting(true);
    try {
      const response = await api.post(`/api/cbt/${selectedExam.id}/results/import`, {});
      const data = await response.json();
      if (response.ok) {
        toast.success(data.message || 'Scores imported successfully');
      } else {
        toast.error(data.error || 'Failed to import scores');
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Error importing scores');
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const url = `${API_BASE_URL}/api/cbt/template/questions`;
    const token = localStorage.getItem('token');

    fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(response => response.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CBT_Questions_Template.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      })
      .catch(error => {
        console.error('Download error:', error);
        toast.error('Failed to download template');
      });
  };

  const handleBulkUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!confirm(`Importing questions from "${file.name}" to "${selectedExam.title}". Continue?`)) {
      e.target.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('saveToBank', saveToBank);

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/api/cbt/${selectedExam.id}/questions/bulk`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      if (response.ok) {
        toast.success(data.message || 'Questions imported successfully');
        // Refresh questions list
        handleManageQuestions(selectedExam);
      } else {
        toast.error(data.error || 'Import failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file');
    } finally {
      e.target.value = '';
    }
  };

  const fetchBankQuestions = async () => {
    if (!selectedExam?.subjectId) return;
    setBankLoading(true);
    try {
      const response = await api.get(`/api/cbt/bank?subjectId=${selectedExam.subjectId}`);
      if (response.ok) {
        setBankQuestions(await response.json());
      }
    } catch (error) {
      toast.error('Failed to load bank questions');
    } finally {
      setBankLoading(false);
    }
  };

  const handleImportFromBank = async () => {
    if (selectedBankQuestions.length === 0) {
      toast.error('No questions selected');
      return;
    }

    try {
      const response = await api.post(`/api/cbt/${selectedExam.id}/import-from-bank`, {
        questionIds: selectedBankQuestions
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(data.message || 'Questions imported');
        setShowBankModal(false);
        setSelectedBankQuestions([]);
        handleManageQuestions(selectedExam); // Refresh
      } else {
        toast.error(data.error || 'Import failed');
      }
    } catch (error) {
      toast.error('Error importing from bank');
    }
  };

  const toggleBankQuestion = (id) => {
    if (selectedBankQuestions.includes(id)) {
      setSelectedBankQuestions(selectedBankQuestions.filter(qid => qid !== id));
    } else {
      setSelectedBankQuestions([...selectedBankQuestions, id]);
    }
  };

  const updateOptionText = (index, text) => {
    const newOptions = [...newQuestion.options];
    newOptions[index].text = text;
    setNewQuestion({ ...newQuestion, options: newOptions });
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="space-y-6 pr-2 pb-10">
      {/* Header Section - Glassmorphism */}

      {/* Header Section - Glassmorphism */}
      <div className="relative group overflow-hidden rounded-[40px] p-1 bg-gradient-to-br from-indigo-600 via-primary to-emerald-600 shadow-2xl">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay"></div>
        <div className="relative bg-white/5 backdrop-blur-sm p-6 sm:p-10 rounded-[39px] text-white flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6 text-center md:text-left">
            {schoolSettings?.logoUrl && (
              <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-[28px] p-4 border border-white/20 shadow-xl group-hover:scale-110 transition-transform duration-500">
                <img src={schoolSettings.logoUrl} alt="Logo" className="w-full h-full object-contain" />
              </div>
            )}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/20 mb-3">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">Digital Examination Control</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tighter italic mb-1 uppercase text-white">CBT Management</h1>
              <p className="text-sm text-white/70 font-medium tracking-wide flex items-center gap-2 justify-center md:justify-start">
                {currentSession?.name} <span className="w-1 h-1 rounded-full bg-white/30"></span> 
                <span className="text-emerald-300 font-black uppercase">{currentTerm?.name}</span>
              </p>
            </div>
          </div>
          
          <div className="flex gap-4">
            {view !== 'list' && (
              <button
                onClick={() => setView('list')}
                className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-[24px] font-black uppercase tracking-widest text-xs backdrop-blur-md border border-white/20 transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                Return Home
              </button>
            )}
            {view === 'list' && (
              <button
                onClick={() => setView('create')}
                className="bg-white text-primary px-8 py-4 rounded-[24px] font-black uppercase tracking-widest text-xs shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 border border-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                Create New Exam
              </button>
            )}
          </div>
        </div>
      </div>

      {/* VIEW: List */}
      {view === 'list' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Quick Stats */}
            <div className="bg-white p-8 rounded-[32px] shadow-xl border border-slate-100 group">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Active Assessments</p>
              <h3 className="text-4xl font-black text-slate-900 italic tracking-tighter group-hover:scale-105 transition-transform">{exams.length}</h3>
            </div>
            <div className="bg-white p-8 rounded-[32px] shadow-xl border border-slate-100 group">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Published Exams</p>
              <h3 className="text-4xl font-black text-emerald-600 italic tracking-tighter group-hover:scale-105 transition-transform">{exams.filter(e => e.isPublished).length}</h3>
            </div>
             <div className="bg-white p-8 rounded-[32px] shadow-xl border border-slate-100 group">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Questions</p>
              <h3 className="text-4xl font-black text-indigo-600 italic tracking-tighter group-hover:scale-105 transition-transform">
                {exams.reduce((acc, e) => acc + (e._count?.questions || 0), 0)}
              </h3>
            </div>
          </div>

          <div className="bg-white rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Examination Title</th>
                    <th className="px-6 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Target Group</th>
                    <th className="px-6 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Configuration</th>
                    <th className="px-6 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                    <th className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Console Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {exams.map((exam) => (
                    <tr key={exam.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-slate-900 uppercase tracking-tight group-hover:text-primary transition-colors">{exam.title}</span>
                          <div className="flex items-center gap-2 mt-2">
                             <span className="px-2 py-0.5 text-[9px] font-black bg-indigo-50 text-indigo-600 rounded-md border border-indigo-100 uppercase tracking-widest">
                              {exam.examType?.replace('_', ' ') || 'Examination'}
                            </span>
                             <span className="text-[10px] text-slate-400 font-bold">{new Date(exam.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-black text-slate-800">{exam.class?.name}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{exam.subject?.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <svg className="w-3 h-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">{exam.durationMinutes}m</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <svg className="w-3 h-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">{exam._count?.questions || 0} Questions</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <button
                          onClick={() => handlePublishToggle(exam)}
                          className={`px-4 py-2 text-[9px] rounded-full font-black uppercase tracking-[0.2em] border-2 transition-all ${exam.isPublished
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'
                            : 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100'
                            }`}
                        >
                          {exam.isPublished ? 'Live & Active' : 'Offline Draft'}
                        </button>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewResults(exam)}
                            className="p-3 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded-2xl transition-all shadow-sm hover:shadow-indigo-200 group/btn"
                            title="Analytics"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                          </button>
                          <button
                            onClick={() => handleManageQuestions(exam)}
                            className="p-3 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-2xl transition-all shadow-sm hover:shadow-primary/30"
                            title="Manage Bank"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                          </button>
                          <button
                            onClick={() => handlePrintExam(exam)}
                            className="p-3 bg-slate-50 hover:bg-slate-900 text-slate-600 hover:text-white rounded-2xl transition-all shadow-sm"
                            title="Print Hardcopy"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                          </button>
                          <button
                            onClick={() => handleDeleteExam(exam.id)}
                            className="p-3 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-2xl transition-all shadow-sm hover:shadow-rose-100"
                            title="Destroy"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {exams.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-8 py-20 text-center">
                        <div className="w-20 h-20 bg-slate-50 rounded-[28px] flex items-center justify-center mx-auto mb-6">
                           <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </div>
                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No Examinations Found</p>
                        <button onClick={() => setView('create')} className="mt-4 text-primary font-black uppercase text-xs hover:underline tracking-widest italic">Create Your First CBT Core</button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: Create Form */}
      {view === 'create' && (
        <div className="bg-white rounded-lg shadow p-6 max-w-2xl mx-auto">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Create New Exam</h2>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Exam Title</label>
              <input
                type="text"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Class</label>
                <select
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                  value={formData.classId}
                  onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                >
                  <option value="">Select Class</option>
                  {classes
                    .filter(c => user?.role === 'admin' || teacherAssignments.some(ta => ta.classId === c.id))
                    .map(c => <option key={c.id} value={c.id}>{c.name} {c.arm}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Subject</label>
                <select
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                  value={formData.subjectId}
                  onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                >
                  <option value="">Select Subject</option>
                  {subjects
                    .filter(s => {
                      if (user?.role === 'admin') return true;
                      if (!formData.classId) return false;
                      return teacherAssignments.some(ta => ta.classId === parseInt(formData.classId) && ta.subjectId === s.id);
                    })
                    .map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Exam Type</label>
                <select
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                  value={formData.examType}
                  onChange={(e) => setFormData({ ...formData, examType: e.target.value })}
                >
                  <option value="examination">Final Examination</option>
                  <option value="test1">1st Continuous Assessment (Test 1)</option>
                  <option value="test2">2nd Continuous Assessment (Test 2)</option>
                  <option value="assignment1">1st Assignment</option>
                  <option value="assignment2">2nd Assignment</option>
                </select>
              </div>
              <div className="flex gap-4 items-center bg-gray-50 p-3 rounded mt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="randomizeQuestions"
                    className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                    checked={formData.randomizeQuestions !== false}
                    onChange={(e) => setFormData({ ...formData, randomizeQuestions: e.target.checked })}
                  />
                  <label htmlFor="randomizeQuestions" className="text-xs font-semibold text-gray-700">Randomize Questions</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="randomizeOptions"
                    className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                    checked={formData.randomizeOptions !== false}
                    onChange={(e) => setFormData({ ...formData, randomizeOptions: e.target.checked })}
                  />
                  <label htmlFor="randomizeOptions" className="text-xs font-semibold text-gray-700">Randomize Options</label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Duration (Minutes)</label>
                <input
                  type="number"
                  min="10"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                  value={formData.durationMinutes}
                  onChange={(e) => setFormData({ ...formData, durationMinutes: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Total Marks</label>
                <input
                  type="number"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                  value={formData.totalMarks}
                  onChange={(e) => setFormData({ ...formData, totalMarks: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Date (Optional)</label>
                <input
                  type="datetime-local"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">End Date (Optional)</label>
                <input
                  type="datetime-local"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                rows="3"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              ></textarea>
            </div>

            <div className="pt-4 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setView('list')}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-white rounded-md hover:brightness-90"
              >
                Create Exam
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VIEW: Manage Questions */}
      {view === 'questions' && selectedExam && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Col: Add Question Form */}
          <div className="lg:col-span-1 bg-white rounded-lg shadow p-6 h-fit sticky top-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add Question</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Question Text</label>
                <textarea
                  className="w-full rounded-md border-gray-300 focus:ring-primary focus:border-primary"
                  rows="3"
                  value={newQuestion.questionText}
                  onChange={(e) => setNewQuestion({ ...newQuestion, questionText: e.target.value })}
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
                <div className="space-y-2">
                  {newQuestion.options.map((option, index) => (
                    <div key={option.id} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="correctOption"
                        checked={newQuestion.correctOption === option.id}
                        onChange={() => setNewQuestion({ ...newQuestion, correctOption: option.id })}
                        className="h-4 w-4 text-primary focus:ring-primary"
                      />
                      <span className="text-gray-500 w-6 font-mono font-bold uppercase">{option.id}.</span>
                      <input
                        type="text"
                        value={option.text}
                        onChange={(e) => updateOptionText(index, e.target.value)}
                        placeholder={`Option ${option.id.toUpperCase()}`}
                        className="flex-1 rounded-md border-gray-300 text-sm focus:ring-primary focus:border-primary"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">Select the radio button next to the correct answer.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Points</label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  className="w-full rounded-md border-gray-300 focus:ring-primary focus:border-primary"
                  value={newQuestion.points}
                  onChange={(e) => setNewQuestion({ ...newQuestion, points: parseFloat(e.target.value) })}
                />
              </div>

              <div className="flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  id="saveToBank"
                  className="h-4 w-4 text-primary focus:ring-primary rounded border-gray-300"
                  checked={saveToBank}
                  onChange={(e) => setSaveToBank(e.target.checked)}
                />
                <label htmlFor="saveToBank" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Save to Question Bank
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleAddQuestion}
                  className={`flex-1 py-2 text-white rounded-md hover:brightness-90 font-medium transition ${editingQuestion ? 'bg-amber-600' : 'bg-primary'}`}
                >
                  {editingQuestion ? 'Update Question' : 'Add Question'}
                </button>
                {editingQuestion && (
                  <button
                    onClick={resetQuestionForm}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-medium transition"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Col: Question List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg flex justify-between items-center flex-wrap gap-4">
              <div>
                <h2 className="text-xl font-bold text-blue-900">{selectedExam.title}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${selectedExam.isPublished
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                    }`}>
                    {selectedExam.isPublished ? 'Published' : 'Draft'}
                  </span>
                  <p className="text-sm text-blue-700 font-medium">
                    | Questions: {questions.length} 
                    | Total Points: {questions.reduce((sum, q) => sum + q.points, 0)} 
                    {selectedExam.totalMarks !== questions.reduce((sum, q) => sum + q.points, 0) && (
                      <span className="ml-2 text-red-600 font-bold bg-red-100 px-2 py-0.5 rounded animate-pulse">
                        ⚠️ Mismatch with Exam Total ({selectedExam.totalMarks})
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    handlePublishToggle(selectedExam);
                    setSelectedExam(prev => ({ ...prev, isPublished: !prev.isPublished }));
                  }}
                  className={`px-3 py-1.4 text-sm font-medium rounded transition flex items-center gap-1.5 ${selectedExam.isPublished
                    ? 'bg-white border border-yellow-400 text-yellow-700 hover:bg-yellow-50'
                    : 'bg-white border border-green-400 text-green-700 hover:bg-green-50'
                    }`}
                >
                  {selectedExam.isPublished ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                      Unpublish
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Publish Exam
                    </>
                  )}
                </button>
                <div className="w-px bg-blue-200 mx-1"></div>
                <button
                  onClick={handleDownloadTemplate}
                  className="px-3 py-1.4 bg-white border border-blue-300 text-blue-700 rounded text-sm font-medium hover:bg-blue-50 transition flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Template
                </button>
                <label className="px-3 py-1.4 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition cursor-pointer flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Import
                  <input
                    type="file"
                    className="hidden"
                    accept=".csv,.xlsx"
                    onChange={handleBulkUpload}
                  />
                </label>
                <button
                  onClick={() => {
                    setShowBankModal(true);
                    fetchBankQuestions();
                  }}
                  className="px-3 py-1.4 bg-indigo-600 text-white rounded text-sm font-medium hover:bg-indigo-700 transition flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Import from Bank
                </button>
              </div>
            </div>

            {/* Bulk Upload Options */}
            <div className="flex items-center gap-4 px-4 pb-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="bulkSaveToBank"
                  className="h-3.5 w-3.5 text-primary focus:ring-primary rounded border-gray-300"
                  checked={saveToBank}
                  onChange={(e) => setSaveToBank(e.target.checked)}
                />
                <label htmlFor="bulkSaveToBank" className="text-xs text-gray-600 cursor-pointer">
                  Save bulk uploads to Bank
                </label>
              </div>
            </div>

            {/* Bank Import Modal */}
            {showBankModal && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                  <div className="p-6 border-b flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Import from Question Bank</h3>
                      <p className="text-sm text-gray-500">Subject: {selectedExam.subject?.name}</p>
                    </div>
                    <button onClick={() => setShowBankModal(false)} className="text-gray-400 hover:text-gray-600">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6">
                    <div className="mb-4">
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </span>
                        <input
                          type="text"
                          placeholder="Search questions in bank..."
                          className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-primary focus:border-primary"
                          value={bankSearchTerm}
                          onChange={(e) => setBankSearchTerm(e.target.value)}
                        />
                      </div>
                    </div>

                    {bankLoading ? (
                      <p className="text-center py-10">Loading bank...</p>
                    ) : bankQuestions.length === 0 ? (
                      <p className="text-center py-10 text-gray-500">No questions found for this subject in the bank.</p>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200 sticky top-0 z-10">
                          <span className="text-sm font-medium text-gray-700">{selectedBankQuestions.length} questions selected</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setSelectedBankQuestions(bankQuestions.map(q => q.id))}
                              className="text-xs text-primary font-medium"
                            >
                              Select All
                            </button>
                            <button
                              onClick={() => setSelectedBankQuestions([])}
                              className="text-xs text-red-500 font-medium"
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                        {bankQuestions
                          .filter(q => q.questionText.toLowerCase().includes(bankSearchTerm.toLowerCase()))
                          .map(q => (
                            <div
                              key={q.id}
                              onClick={() => toggleBankQuestion(q.id)}
                              className={`p-4 border rounded-lg cursor-pointer transition ${selectedBankQuestions.includes(q.id) ? 'border-primary bg-primary/5' : 'border-gray-200 hover:bg-gray-50'
                                }`}
                            >
                              <div className="flex gap-4">
                                <input
                                  type="checkbox"
                                  checked={selectedBankQuestions.includes(q.id)}
                                  onChange={() => { }} // Controlled by div click
                                  className="mt-1 h-5 w-5 text-primary rounded border-gray-300 pointer-events-none"
                                />
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900 mb-1">{q.questionText}</p>
                                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                                    <span>Options: {JSON.parse(q.options).length}</span>
                                    <span>Correct: {q.correctOption.toUpperCase()}</span>
                                    <span>Level: {q.difficulty || 'Medium'}</span>
                                    <span>Points: {q.points}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  <div className="p-6 border-t bg-gray-50 flex justify-end gap-3 rounded-b-xl">
                    <button
                      onClick={() => setShowBankModal(false)}
                      className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleImportFromBank}
                      disabled={selectedBankQuestions.length === 0}
                      className="px-8 py-2 bg-primary text-white rounded-lg hover:brightness-90 disabled:bg-gray-400 font-medium transition shadow-md"
                    >
                      Import {selectedBankQuestions.length} Questions
                    </button>
                  </div>
                </div>
              </div>
            )}

            {questions.map((q, qIndex) => (
              <div key={q.id} className={`bg-white rounded-lg shadow p-4 border transition ${editingQuestion?.id === q.id ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-gray-200'}`}>
                <div className="flex justify-between items-start mb-2 group">
                  <h4 className="font-semibold text-gray-800 text-lg pr-4">Q{qIndex + 1}. {q.questionText}</h4>
                  <div className="flex items-center gap-2">
                    <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded whitespace-nowrap">{q.points} Marks</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEditIndividualQuestion(q)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="Edit question"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteIndividualQuestion(q.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Delete question"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
                <div className="space-y-1 ml-2">
                  {q.options.map(opt => (
                    <div key={opt.id} className={`flex items-center space-x-2 ${q.correctOption === opt.id ? 'text-green-700 font-bold' : 'text-gray-600'}`}>
                      <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs border ${q.correctOption === opt.id ? 'border-green-600 bg-green-100' : 'border-gray-300'}`}>
                        {opt.id.toUpperCase()}
                      </span>
                      <span>{opt.text}</span>
                      {q.correctOption === opt.id && <span className="text-[10px] bg-green-100 px-1 rounded ml-1">✓</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {questions.length === 0 && (
              <div className="bg-white rounded-lg shadow p-10 text-center text-gray-500">
                No questions added yet. Use the form on the left to add questions.
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW: Results */}
      {view === 'results' && selectedExam && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-blue-50 p-4 rounded-lg">
            <div>
              <h2 className="text-xl font-bold text-blue-900">{selectedExam.title} - Results</h2>
              <p className="text-sm text-blue-700">Total Attempts: {examResults.length}</p>
            </div>
            <div className="text-right flex flex-col items-end gap-2">
              <p className="text-sm text-gray-600">Total Marks: {selectedExam.totalMarks}</p>
              <button
                onClick={handleDownloadResults}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2 text-sm font-medium transition-colors shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Excel (CSV)
              </button>
              <button
                onClick={handleImportResults}
                disabled={importing || examResults.length === 0}
                className={`px-4 py-2 text-white rounded flex items-center gap-2 text-sm font-medium transition-colors shadow-sm ${importing ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:brightness-90'
                  }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {importing ? 'Importing...' : 'Import to Records'}
              </button>
            </div>
          </div>

          {resultsLoading ? (
            <div className="text-center py-10">Loading results...</div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Student Name</th>
                    <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Submission Date</th>
                    <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Score</th>
                    <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Percentage</th>
                    <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Correct Answers</th>
                    <th className="px-4 py-3 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {examResults.map((result) => (
                    <tr key={result.id}>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {result.student.user.firstName} {result.student.user.lastName}
                        </div>
                        <div className="text-xs text-gray-500">{result.student.admissionNumber}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(result.submittedAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        {result.score}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${(result.score / selectedExam.totalMarks) >= 0.5 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                          {selectedExam.totalMarks > 0 ? Math.round((result.score / selectedExam.totalMarks) * 100) : 0}%
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {result.correctAnswers} / {result.totalQuestions}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleDeleteResult(result.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {examResults.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-6 py-10 text-center text-gray-500">
                        No submissions yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CBTManagement;
