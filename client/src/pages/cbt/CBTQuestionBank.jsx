import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { api, API_BASE_URL } from '../../api';
import { toast } from '../../utils/toast';
import useSchoolSettings from '../../hooks/useSchoolSettings';
import { useAuth } from '../../context/AuthContext';
import { ChevronDown, ChevronUp, Trash2, Plus, Edit2, X, Printer, Image as ImageIcon, Paperclip, FileText, CheckCircle } from 'lucide-react';
import MathToolbar from '../../components/common/MathToolbar';

const CBTQuestionBank = () => {
  const [questions, setQuestions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const { settings: schoolSettings } = useSchoolSettings();
  const { user } = useAuth();

  // Tab Filter: 'all' | 'multiple_choice' | 'essay'
  const [bankTab, setBankTab] = useState('all');

  // Live Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [sessionAddedCount, setSessionAddedCount] = useState(0);
  const [validationError, setValidationError] = useState('');

  const [questionForm, setQuestionForm] = useState({
    subjectId: '',
    classId: '',
    questionType: 'multiple_choice',
    questionText: '',
    markingGuide: '',
    attachmentUrl: '',
    options: [
      { id: 'a', text: '' },
      { id: 'b', text: '' },
      { id: 'c', text: '' },
      { id: 'd', text: '' }
    ],
    correctOption: 'a',
    points: 1
  });

  // Track active field for MathToolbar character insertion
  const [activeField, setActiveField] = useState('questionText');

  // Filters
  const [filters, setFilters] = useState({
    subjectId: '',
    classId: '',
    teacherId: ''
  });

  // Expanded questions state
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [expandedSubjectIds, setExpandedSubjectIds] = useState(new Set());

  const toggleExpand = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSubjectExpand = (id) => {
    const strId = String(id);
    setExpandedSubjectIds(prev => {
      const next = new Set(prev);
      if (next.has(strId)) next.delete(strId);
      else next.add(strId);
      return next;
    });
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
    setExpandedSubjectIds(new Set());
  };

  // Bulk Upload State
  const [uploadData, setUploadData] = useState({
    subjectId: '',
    classId: ''
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchQuestions();
  }, [filters, bankTab]);

  const fetchInitialData = async () => {
    try {
      const [subsRes, classRes] = await Promise.all([
        api.get('/api/subjects'),
        api.get('/api/classes')
      ]);

      if (subsRes.ok) setSubjects(await subsRes.json());
      if (classRes.ok) setClasses(await classRes.json());
    } catch (error) {
      toast.error('Failed to load initial data');
    }
  };

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== '' && v != null)
      );
      if (bankTab !== 'all') {
        cleanFilters.questionType = bankTab;
      }
      const query = new URLSearchParams(cleanFilters).toString();
      const response = await api.get(`/api/cbt/bank?${query}`);
      const data = await response.json();
      if (response.ok) {
        setQuestions(data);
      } else {
        toast.error(data.error || 'Failed to fetch questions');
      }
    } catch (error) {
      toast.error('Error loading question bank');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = (defaultType = 'multiple_choice') => {
    setEditingQuestion(null);
    setSessionAddedCount(0);
    setValidationError('');

    // Ensure essay questions are visible on current tab
    if (defaultType === 'essay' && bankTab === 'multiple_choice') {
      setBankTab('essay');
    }

    setQuestionForm({
      subjectId: filters.subjectId || (subjects[0]?.id ? String(subjects[0].id) : ''),
      classId: filters.classId || '',
      questionType: defaultType,
      questionText: '',
      markingGuide: '',
      attachmentUrl: '',
      options: [
        { id: 'a', text: '' },
        { id: 'b', text: '' },
        { id: 'c', text: '' },
        { id: 'd', text: '' }
      ],
      correctOption: 'a',
      points: 1
    });
    setActiveField('questionText');
    setShowModal(true);
  };

  const openEditModal = (q) => {
    let parsedOptions = [];
    let guide = '';
    try {
      if (typeof q.options === 'string') {
        const parsed = JSON.parse(q.options);
        if (Array.isArray(parsed)) {
          parsedOptions = parsed;
        } else if (parsed && typeof parsed === 'object') {
          guide = parsed.markingGuide || '';
        }
      } else if (Array.isArray(q.options)) {
        parsedOptions = q.options;
      } else if (q.options && typeof q.options === 'object') {
        guide = q.options.markingGuide || '';
      }
    } catch (e) {
      parsedOptions = [];
    }

    if (!Array.isArray(parsedOptions) || parsedOptions.length === 0) {
      parsedOptions = [
        { id: 'a', text: '' },
        { id: 'b', text: '' },
        { id: 'c', text: '' },
        { id: 'd', text: '' }
      ];
    }

    setEditingQuestion(q);
    setValidationError('');
    setQuestionForm({
      subjectId: q.subjectId ? String(q.subjectId) : '',
      classId: q.classId ? String(q.classId) : '',
      questionType: q.questionType || 'multiple_choice',
      questionText: q.questionText || '',
      markingGuide: guide,
      attachmentUrl: q.imageUrl || q.attachmentUrl || '',
      options: parsedOptions,
      correctOption: q.correctOption || 'a',
      points: q.points || 1
    });
    setActiveField('questionText');
    setShowModal(true);
  };

  const handleInsertMathSymbol = (char) => {
    if (activeField === 'questionText') {
      setQuestionForm(prev => ({
        ...prev,
        questionText: prev.questionText + char
      }));
    } else if (activeField === 'markingGuide') {
      setQuestionForm(prev => ({
        ...prev,
        markingGuide: prev.markingGuide + char
      }));
    } else if (activeField.startsWith('option-')) {
      const index = parseInt(activeField.split('-')[1]);
      setQuestionForm(prev => {
        const nextOptions = [...prev.options];
        if (nextOptions[index]) {
          nextOptions[index] = {
            ...nextOptions[index],
            text: nextOptions[index].text + char
          };
        }
        return { ...prev, options: nextOptions };
      });
    }
  };

  const handleAttachmentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingAttachment(true);
    const formData = new FormData();
    formData.append('attachment', file);

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/api/cbt/bank/upload-attachment`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const data = await response.json();
      if (response.ok && data.attachmentUrl) {
        setQuestionForm(prev => ({ ...prev, attachmentUrl: data.attachmentUrl }));
        toast.success('Diagram / Attachment uploaded successfully');
      } else {
        toast.error(data.error || 'Attachment upload failed');
      }
    } catch (error) {
      toast.error('Error uploading attachment file');
    } finally {
      setUploadingAttachment(false);
      e.target.value = '';
    }
  };

  const handleSaveQuestion = async (e, closeModalAfter = true) => {
    if (e) e.preventDefault();
    setValidationError('');

    if (!questionForm.subjectId) {
      const errMsg = 'Please select a Subject';
      setValidationError(errMsg);
      toast.error(errMsg);
      return;
    }
    if (!questionForm.questionText.trim()) {
      const errMsg = 'Question Text is required. Please type the question prompt for students.';
      setValidationError(errMsg);
      toast.error(errMsg);
      return;
    }

    if (questionForm.questionType === 'multiple_choice') {
      if (questionForm.options.some(o => !o.text.trim())) {
        const errMsg = 'All option choices must have text for multiple choice questions';
        setValidationError(errMsg);
        toast.error(errMsg);
        return;
      }
    }

    // Embed attachment image or marking guide into option structure if essay
    let payloadOptions = questionForm.options;
    if (questionForm.questionType === 'essay') {
      payloadOptions = {
        markingGuide: questionForm.markingGuide || '',
        attachmentUrl: questionForm.attachmentUrl || ''
      };
    } else if (questionForm.attachmentUrl) {
      if (!Array.isArray(payloadOptions)) payloadOptions = [];
    }

    setSaving(true);
    try {
      const payload = {
        subjectId: questionForm.subjectId,
        classId: questionForm.classId,
        questionType: questionForm.questionType,
        questionText: questionForm.attachmentUrl 
          ? `${questionForm.questionText}\n![Diagram](${questionForm.attachmentUrl})`
          : questionForm.questionText,
        options: payloadOptions,
        correctOption: questionForm.questionType === 'essay' ? 'essay' : questionForm.correctOption,
        points: questionForm.points
      };

      let response;
      if (editingQuestion) {
        response = await api.put(`/api/cbt/bank/${editingQuestion.id}`, payload);
      } else {
        response = await api.post('/api/cbt/bank', payload);
      }

      const data = await response.json();
      if (response.ok) {
        const nextCount = sessionAddedCount + 1;
        setSessionAddedCount(nextCount);

        // Auto expand subject accordion and switch tab if necessary
        if (questionForm.subjectId) {
          setExpandedSubjectIds(prev => new Set([...prev, String(questionForm.subjectId)]));
        }
        if (questionForm.questionType === 'essay' && bankTab === 'multiple_choice') {
          setBankTab('essay');
        }

        if (closeModalAfter) {
          toast.success(editingQuestion ? 'Question updated' : 'Question added to bank');
          setShowModal(false);
        } else {
          toast.success(`Question #${nextCount} saved! Ready for next question.`);
          // Clear text fields while retaining Subject, Class, and Question Type
          setQuestionForm(prev => ({
            ...prev,
            questionText: '',
            markingGuide: '',
            attachmentUrl: '',
            options: [
              { id: 'a', text: '' },
              { id: 'b', text: '' },
              { id: 'c', text: '' },
              { id: 'd', text: '' }
            ],
            correctOption: 'a',
            points: 1
          }));
        }
        fetchQuestions();
      } else {
        const errMsg = data.error || 'Failed to save question';
        setValidationError(errMsg);
        toast.error(errMsg);
      }
    } catch (error) {
      const errMsg = 'Error saving question to server';
      setValidationError(errMsg);
      toast.error(errMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this question from the bank?')) return;
    try {
      const response = await api.delete(`/api/cbt/bank/${id}`);
      if (response.ok) {
        toast.success('Question deleted');
        setQuestions(questions.filter(q => q.id !== id));
      } else {
        const data = await response.json();
        toast.error(data.error || 'Delete failed');
      }
    } catch (error) {
      toast.error('Error deleting question');
    }
  };

  const handleSubjectDelete = async (subjectId, subjectName) => {
    if (!confirm(`Are you sure you want to delete ALL questions for "${subjectName}" from the bank? This cannot be undone.`)) return;
    try {
      const response = await api.delete(`/api/cbt/bank/subject/${subjectId}`);
      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || 'Subject questions deleted');
        setQuestions(questions.filter(q => q.subject?.id !== parseInt(subjectId)));
      } else {
        const data = await response.json();
        toast.error(data.error || 'Delete failed');
      }
    } catch (error) {
      toast.error('Error deleting subject questions');
    }
  };

  const handleDownloadBank = () => {
    const params = {};
    if (filters.subjectId) params.subjectId = filters.subjectId;
    const query = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/api/cbt/bank/download${query ? '?' + query : ''}`;
    const token = localStorage.getItem('token');

    fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(response => response.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CBT_Question_Bank.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch(() => toast.error('Failed to download bank'));
  };

  const handleBulkUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!uploadData.subjectId) {
      toast.error('Please select a subject first');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('subjectId', uploadData.subjectId);
    if (uploadData.classId) formData.append('classId', uploadData.classId);

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/api/cbt/bank/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const data = await response.json();
      if (response.ok) {
        toast.success(data.message || 'Questions uploaded to bank');
        fetchQuestions();
      } else {
        toast.error(data.error || 'Upload failed');
      }
    } catch (error) {
      toast.error('Error uploading file');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDownloadTemplate = () => {
    const url = `${API_BASE_URL}/api/cbt/template/questions`;
    const token = localStorage.getItem('token');
    fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'CBT_Questions_Template.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
      });
  };

  // Print Theory / Essay Paper for Examination Officer
  const handlePrintTheoryPaper = () => {
    const essayQuestions = questions.filter(q => q.questionType === 'essay');
    if (essayQuestions.length === 0) {
      toast.error('No Essay / Theory questions available to print. Select or add essay questions first.');
      return;
    }

    const printWindow = window.open('', '_blank');
    const subjectName = subjects.find(s => String(s.id) === String(filters.subjectId))?.name || 'Theory / Essay Examination';
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Theory Examination Paper - ${schoolSettings?.name || 'School'}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #111; line-height: 1.6; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 30px; }
          .header h1 { margin: 0; font-size: 24px; text-transform: uppercase; }
          .header h2 { margin: 5px 0 0 0; font-size: 16px; color: #555; font-weight: normal; }
          .meta { display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 20px; font-size: 14px; border-bottom: 1px dashed #ccc; padding-bottom: 10px; }
          .question { margin-bottom: 25px; page-break-inside: avoid; }
          .q-num { font-weight: bold; }
          .q-text { font-size: 15px; font-weight: 600; margin-bottom: 8px; }
          .q-points { float: right; font-style: italic; color: #666; font-size: 13px; }
          .diagram { margin: 10px 0; max-height: 250px; border: 1px solid #ddd; border-radius: 8px; padding: 5px; }
          .answer-space { height: 100px; border-bottom: 1px dotted #ccc; margin-top: 15px; }
          @media print {
            body { padding: 0; }
            .answer-space { height: 120px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${schoolSettings?.name || 'SCHOOL EXAMINATION PAPER'}</h1>
          <h2>${subjectName} - Written Theory Assessment</h2>
        </div>
        <div class="meta">
          <span>Student Name: __________________________</span>
          <span>Class: ________</span>
          <span>Time Allowed: ________</span>
        </div>
        <p style="font-weight: bold; font-size: 13px; font-style: italic;">Instruction: Answer all questions clearly in the space provided.</p>
        <hr style="margin-bottom: 20px;" />
        ${essayQuestions.map((q, idx) => {
          let cleanText = q.questionText || '';
          let diagramMatch = cleanText.match(/!\[Diagram\]\((.*?)\)/);
          let diagramUrl = diagramMatch ? diagramMatch[1] : null;
          cleanText = cleanText.replace(/!\[Diagram\]\((.*?)\)/g, '').trim();

          return `
            <div class="question">
              <span class="q-points">[${q.points || 1} Marks]</span>
              <div class="q-text"><span class="q-num">Q${idx + 1}.</span> ${cleanText}</div>
              ${diagramUrl ? `<img src="${diagramUrl}" class="diagram" alt="Question Diagram" />` : ''}
              <div class="answer-space"></div>
            </div>
          `;
        }).join('')}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">CBT & Theory Question Bank</h1>
          <p className="text-sm text-gray-500">Centralized repository for CBT multiple choice & paper exam theory questions</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => openAddModal('multiple_choice')}
            className="px-4 py-2 bg-primary text-white rounded-md hover:brightness-90 transition text-sm font-medium flex items-center gap-2 shadow-sm"
          >
            <Plus size={18} />
            + Add CBT Question
          </button>
          <button
            onClick={() => openAddModal('essay')}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition text-sm font-medium flex items-center gap-2 shadow-sm"
          >
            <FileText size={18} />
            + Add Essay / Theory
          </button>
          <button
            onClick={handleDownloadTemplate}
            className="px-3.5 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition text-sm font-medium"
          >
            Template
          </button>
          <button
            onClick={handleDownloadBank}
            className="px-3.5 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition text-sm font-medium flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export Bank
          </button>
          <button
            onClick={handlePrintTheoryPaper}
            className="px-3.5 py-2 bg-slate-800 text-white rounded hover:bg-slate-900 transition text-sm font-medium flex items-center gap-1.5 shadow-sm"
            title="Print Theory Question Paper for Written Exams"
          >
            <Printer size={16} />
            Print Theory Paper
          </button>
        </div>
      </div>

      {/* Category Tabs: All | CBT | Essay */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setBankTab('all')}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 ${
            bankTab === 'all'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <span>All Questions</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-white/20 font-mono">
            {questions.length}
          </span>
        </button>
        <button
          onClick={() => setBankTab('multiple_choice')}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 ${
            bankTab === 'multiple_choice'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <span>CBT (Multiple Choice)</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-indigo-500/20 font-mono">
            {questions.filter(q => q.questionType !== 'essay').length}
          </span>
        </button>
        <button
          onClick={() => setBankTab('essay')}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 ${
            bankTab === 'essay'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <FileText size={15} />
          <span>Essay / Theory Bank</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-purple-500/20 font-mono">
            {questions.filter(q => q.questionType === 'essay').length}
          </span>
        </button>
      </div>

      {/* Bulk Upload Section */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-primary">
        <h2 className="text-base font-semibold mb-3 text-gray-800 flex items-center gap-2">
          <Paperclip size={18} className="text-primary" /> Bulk Upload CBT Questions via Excel/CSV
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Subject (Required)</label>
            <select
              className="w-full rounded-md border-gray-300 shadow-sm focus:ring-primary focus:border-primary text-sm"
              value={uploadData.subjectId}
              onChange={(e) => setUploadData({ ...uploadData, subjectId: e.target.value })}
            >
              <option value="">Select Subject</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Target Class Level (Optional)</label>
            <select
              className="w-full rounded-md border-gray-300 shadow-sm focus:ring-primary focus:border-primary text-sm"
              value={uploadData.classId}
              onChange={(e) => setUploadData({ ...uploadData, classId: e.target.value })}
            >
              <option value="">All Classes</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className={`w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${uploading ? 'bg-gray-400' : 'bg-primary hover:brightness-90'} cursor-pointer transition`}>
              {uploading ? 'Uploading...' : 'Upload Excel/CSV File'}
              <input type="file" className="hidden" accept=".csv,.xlsx" onChange={handleBulkUpload} disabled={uploading} />
            </label>
          </div>
        </div>
      </div>

      {/* Filters & List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center">
            <select
              className="rounded-md border-gray-300 text-sm py-1.5 px-3"
              value={filters.subjectId}
              onChange={(e) => setFilters({ ...filters, subjectId: e.target.value })}
            >
              <option value="">All Subjects</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select
              className="rounded-md border-gray-300 text-sm py-1.5 px-3"
              value={filters.classId}
              onChange={(e) => setFilters({ ...filters, classId: e.target.value })}
            >
              <option value="">All Class Levels</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            {(expandedIds.size > 0 || expandedSubjectIds.size > 0) && (
              <button
                onClick={collapseAll}
                className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
              >
                <ChevronUp size={14} /> Collapse All
              </button>
            )}
          </div>
        </div>

        <div className="p-4 space-y-4">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading bank questions...</div>
          ) : questions.length === 0 ? (
            <div className="p-12 text-center text-gray-500 space-y-3">
              <FileText className="mx-auto text-gray-300" size={40} />
              <p className="font-medium text-gray-600">No questions found in this category.</p>
              <button
                onClick={() => openAddModal(bankTab === 'essay' ? 'essay' : 'multiple_choice')}
                className="px-4 py-2 bg-primary text-white rounded-md text-xs font-bold uppercase tracking-wider hover:brightness-90 transition"
              >
                + Add Question Live
              </button>
            </div>
          ) : (
            Object.entries(
              questions.reduce((acc, q) => {
                const subjectId = q.subject?.id || 'unknown';
                if (!acc[subjectId]) acc[subjectId] = { subject: q.subject, questions: [] };
                acc[subjectId].questions.push(q);
                return acc;
              }, {})
            ).map(([subjectId, group]) => {
              const isSubjectExpanded = expandedSubjectIds.has(subjectId);
              const { subject, questions: subjectQuestions } = group;

              return (
                <div key={subjectId} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  {/* Subject Header */}
                  <div
                    onClick={() => toggleSubjectExpand(subjectId)}
                    className={`px-6 py-4 flex justify-between items-center cursor-pointer transition-colors ${isSubjectExpanded ? 'bg-primary text-white' : 'bg-white hover:bg-gray-50'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isSubjectExpanded ? 'bg-white/20' : 'bg-primary/10'}`}>
                        <svg className={`w-5 h-5 ${isSubjectExpanded ? 'text-white' : 'text-primary'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{subject?.name || 'Unassigned Subject'}</h3>
                        <p className={`text-xs ${isSubjectExpanded ? 'text-white/80' : 'text-gray-500'}`}>
                          {subjectQuestions.length} Questions available
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSubjectDelete(subjectId, subject?.name || 'Unassigned Subject');
                        }}
                        className={`p-2 rounded-full transition-colors ${isSubjectExpanded ? 'hover:bg-white/10 text-white/70 hover:text-white' : 'hover:bg-red-50 text-red-400 hover:text-red-600'}`}
                        title="Delete all questions in this subject"
                      >
                        <Trash2 size={18} />
                      </button>
                      <div className={isSubjectExpanded ? 'text-white' : 'text-gray-400'}>
                        {isSubjectExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </div>
                  </div>

                  {/* Questions Table */}
                  {isSubjectExpanded && (
                    <div className="overflow-x-auto bg-white border-t border-gray-200">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 border-b border-gray-100">
                          <tr>
                            <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Type</th>
                            <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Question</th>
                            <th className="px-6 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Correct / Guide</th>
                            <th className="px-6 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Points</th>
                            <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Teacher</th>
                            <th className="px-6 py-3 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {subjectQuestions.map((q) => {
                            const isExpanded = expandedIds.has(q.id);
                            const isEssay = q.questionType === 'essay';
                            let options = [];
                            let guide = '';
                            try {
                              if (typeof q.options === 'string') {
                                const parsed = JSON.parse(q.options);
                                if (Array.isArray(parsed)) options = parsed;
                                else if (parsed && typeof parsed === 'object') guide = parsed.markingGuide || '';
                              } else if (Array.isArray(q.options)) {
                                options = q.options;
                              }
                            } catch (e) {}

                            let cleanQuestionText = q.questionText || '';
                            let diagramMatch = cleanQuestionText.match(/!\[Diagram\]\((.*?)\)/);
                            let diagramUrl = diagramMatch ? diagramMatch[1] : (q.imageUrl || q.attachmentUrl || null);
                            cleanQuestionText = cleanQuestionText.replace(/!\[Diagram\]\((.*?)\)/g, '').trim();

                            return (
                              <React.Fragment key={q.id}>
                                <tr
                                  className={`hover:bg-gray-50 transition-colors cursor-pointer ${isExpanded ? 'bg-blue-50/30' : ''}`}
                                  onClick={() => toggleExpand(q.id)}
                                >
                                  <td className="px-6 py-4 whitespace-nowrap text-xs">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                      isEssay ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-indigo-100 text-indigo-700'
                                    }`}>
                                      {isEssay ? 'Essay / Paper' : 'CBT'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex items-start gap-3 min-w-[200px]">
                                      <div className="mt-0.5 text-gray-400">
                                        {isExpanded ? <ChevronUp size={18} className="text-primary" /> : <ChevronDown size={18} />}
                                      </div>
                                      <div>
                                        <div className={`text-sm font-medium text-gray-900 ${isExpanded ? '' : 'line-clamp-2'} max-w-md`}>
                                          {cleanQuestionText}
                                        </div>
                                        {diagramUrl && (
                                          <span className="inline-flex items-center gap-1 text-[10px] text-indigo-600 bg-indigo-50 font-bold px-1.5 py-0.5 rounded mt-1">
                                            <ImageIcon size={11} /> Has Diagram / Image
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-center">
                                    {isEssay ? (
                                      <span className="text-xs font-semibold text-purple-600 italic">Theory Paper</span>
                                    ) : (
                                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold uppercase">
                                        {q.correctOption}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center font-bold">
                                    {q.points}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 italic">
                                    {q.teacher?.firstName} {q.teacher?.lastName}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                      <button
                                        onClick={() => openEditModal(q)}
                                        className="text-blue-600 hover:text-blue-800 bg-blue-50 p-2 rounded-full transition-colors"
                                        title="Edit Question"
                                      >
                                        <Edit2 size={16} />
                                      </button>
                                      <button
                                        onClick={() => handleDelete(q.id)}
                                        className="text-red-500 hover:text-red-700 bg-red-50 p-2 rounded-full transition-colors"
                                        title="Delete Question"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                                {isExpanded && (
                                  <tr className="bg-blue-50/30">
                                    <td colSpan="6" className="px-6 pb-6 pt-0">
                                      <div className="ml-8 border-l-2 border-blue-200 pl-4 py-2 space-y-3">
                                        {diagramUrl && (
                                          <div>
                                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Attached Diagram / Figure</p>
                                            <img src={diagramUrl} alt="Diagram" className="max-h-48 rounded border border-gray-200 p-1 bg-white" />
                                          </div>
                                        )}

                                        {isEssay ? (
                                          <div>
                                            <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider mb-1">Marking Scheme / Model Answer</p>
                                            <div className="p-3 bg-purple-50 rounded border border-purple-100 text-sm text-purple-900 italic">
                                              {guide || 'No marking scheme specified.'}
                                            </div>
                                          </div>
                                        ) : (
                                          <div>
                                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Options</p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                              {options.map(opt => (
                                                <div
                                                  key={opt.id}
                                                  className={`flex items-start gap-2 p-3 rounded border ${q.correctOption === opt.id
                                                    ? 'bg-green-50 border-green-200 ring-1 ring-green-100'
                                                    : 'bg-white border-gray-100'
                                                    }`}
                                                >
                                                  <span className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${q.correctOption === opt.id
                                                    ? 'bg-green-600 text-white'
                                                    : 'bg-gray-100 text-gray-500'
                                                    }`}>
                                                    {opt.id?.toUpperCase()}
                                                  </span>
                                                  <span className={`text-sm ${q.correctOption === opt.id ? 'text-green-800 font-medium' : 'text-gray-600'}`}>
                                                    {opt.text}
                                                  </span>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Live Add / Edit Question Modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-4 sm:p-6 space-y-4 relative max-h-[92vh] overflow-y-auto border border-gray-100 animate-in fade-in zoom-in duration-150 my-auto">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  {editingQuestion ? 'Edit Question' : 'Add Question Live'}
                  {sessionAddedCount > 0 && !editingQuestion && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 font-bold">
                      +{sessionAddedCount} added this session
                    </span>
                  )}
                </h2>
                <p className="text-xs text-gray-500">
                  {questionForm.questionType === 'essay'
                    ? 'Compose essay/theory questions for paper exams'
                    : 'Compose multiple choice questions for CBT online exams'}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {validationError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-lg flex items-center justify-between animate-in fade-in duration-150">
                  <div className="flex items-center gap-2">
                    <span>⚠️</span>
                    <span>{validationError}</span>
                  </div>
                  <button type="button" onClick={() => setValidationError('')} className="text-red-400 hover:text-red-600">
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Question Type Toggle */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Question Format / Type</label>
                <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setQuestionForm({ ...questionForm, questionType: 'multiple_choice' })}
                    className={`py-2 text-xs font-bold rounded-md transition ${
                      questionForm.questionType === 'multiple_choice'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    CBT Multiple Choice (A-D)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuestionForm({ ...questionForm, questionType: 'essay' })}
                    className={`py-2 text-xs font-bold rounded-md transition ${
                      questionForm.questionType === 'essay'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Essay / Theory (Paper Exam)
                  </button>
                </div>
              </div>

              {/* Subject & Class Selectors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                  <select
                    className="w-full rounded-md border-gray-300 shadow-sm focus:ring-primary focus:border-primary text-sm"
                    value={questionForm.subjectId}
                    onChange={(e) => setQuestionForm({ ...questionForm, subjectId: e.target.value })}
                    required
                  >
                    <option value="">Select Subject</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Class Level (Optional)</label>
                  <select
                    className="w-full rounded-md border-gray-300 shadow-sm focus:ring-primary focus:border-primary text-sm"
                    value={questionForm.classId}
                    onChange={(e) => setQuestionForm({ ...questionForm, classId: e.target.value })}
                  >
                    <option value="">All Classes</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Question Text & Math Toolbar */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">Question Text *</label>
                  <MathToolbar onInsert={handleInsertMathSymbol} />
                </div>
                <textarea
                  rows={3}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:ring-primary focus:border-primary text-sm p-3"
                  placeholder={questionForm.questionType === 'essay'
                    ? "e.g. Describe the process of photosynthesis in plants and draw a simple flowchart."
                    : "e.g. Solve for x: 2x + 4 = 10  OR  Calculate √x when x = 16"
                  }
                  value={questionForm.questionText}
                  onFocus={() => setActiveField('questionText')}
                  onChange={(e) => setQuestionForm({ ...questionForm, questionText: e.target.value })}
                  required
                />
              </div>

              {/* File / Diagram Attachment Upload */}
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                    <ImageIcon size={14} className="text-indigo-600" /> Diagram / Image Attachment (Optional)
                  </span>
                  {questionForm.attachmentUrl && (
                    <button
                      type="button"
                      onClick={() => setQuestionForm({ ...questionForm, attachmentUrl: '' })}
                      className="text-xs text-red-500 font-semibold hover:underline"
                    >
                      Remove Diagram
                    </button>
                  )}
                </div>

                {questionForm.attachmentUrl ? (
                  <div className="flex items-center gap-3 bg-white p-2 rounded border border-gray-200">
                    <img src={questionForm.attachmentUrl} alt="Attachment" className="h-12 w-12 object-cover rounded border" />
                    <span className="text-xs text-gray-600 font-mono truncate flex-1">{questionForm.attachmentUrl}</span>
                    <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
                  </div>
                ) : (
                  <label className="flex justify-center items-center px-4 py-2 border border-gray-300 border-dashed rounded-md text-xs font-medium text-gray-600 bg-white hover:bg-gray-100 cursor-pointer transition gap-2">
                    {uploadingAttachment ? 'Uploading Diagram...' : '📷 Click to upload diagram image (PNG, JPG)'}
                    <input type="file" className="hidden" accept="image/*" onChange={handleAttachmentUpload} disabled={uploadingAttachment} />
                  </label>
                )}
              </div>

              {/* Options or Essay Marking Scheme */}
              {questionForm.questionType === 'essay' ? (
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <div className="flex justify-between items-center">
                    <label className="block text-sm font-semibold text-purple-900">Marking Scheme / Model Answer (Optional)</label>
                    <MathToolbar onInsert={handleInsertMathSymbol} />
                  </div>
                  <textarea
                    rows={2}
                    className="w-full rounded-md border-gray-300 shadow-sm text-sm focus:ring-purple-500 focus:border-purple-500 p-2.5 bg-purple-50/50"
                    placeholder="Notes or grading rubric for the examination officer..."
                    value={questionForm.markingGuide}
                    onFocus={() => setActiveField('markingGuide')}
                    onChange={(e) => setQuestionForm({ ...questionForm, markingGuide: e.target.value })}
                  />
                </div>
              ) : (
                <div className="space-y-3 pt-2 border-t border-gray-100">
                  <label className="block text-sm font-semibold text-gray-800">Options & Correct Answer</label>
                  <div className="grid grid-cols-1 gap-2.5">
                    {questionForm.options.map((opt, index) => (
                      <div key={opt.id} className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg border border-gray-200">
                        <input
                          type="radio"
                          name="correctOption"
                          checked={questionForm.correctOption === opt.id}
                          onChange={() => setQuestionForm({ ...questionForm, correctOption: opt.id })}
                          className="w-4 h-4 text-primary focus:ring-primary border-gray-300 cursor-pointer"
                          title="Mark as correct answer"
                        />
                        <span className="w-6 h-6 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs uppercase flex-shrink-0">
                          {opt.id}
                        </span>
                        <input
                          type="text"
                          placeholder={`Option ${opt.id.toUpperCase()} text...`}
                          className="flex-1 rounded-md border-gray-300 shadow-sm text-sm focus:ring-primary focus:border-primary px-3 py-1.5"
                          value={opt.text}
                          onFocus={() => setActiveField(`option-${index}`)}
                          onChange={(e) => {
                            const nextOptions = [...questionForm.options];
                            nextOptions[index] = { ...nextOptions[index], text: e.target.value };
                            setQuestionForm({ ...questionForm, options: nextOptions });
                          }}
                          required
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer / Action Buttons */}
              <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="w-full sm:w-32">
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Points / Score</label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    className="w-full rounded-md border-gray-300 shadow-sm text-sm focus:ring-primary focus:border-primary px-3 py-1.5"
                    value={questionForm.points}
                    onChange={(e) => setQuestionForm({ ...questionForm, points: parseFloat(e.target.value) || 1 })}
                  />
                </div>

                <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-3.5 py-2 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition font-medium"
                  >
                    Cancel
                  </button>
                  
                  {!editingQuestion && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={(e) => handleSaveQuestion(e, false)}
                      className="px-4 py-2 text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-md transition font-bold disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                    >
                      <Plus size={15} />
                      Save & Add Another
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={saving}
                    onClick={(e) => handleSaveQuestion(e, true)}
                    className="px-5 py-2 text-xs text-white bg-primary hover:brightness-90 rounded-md transition font-bold disabled:opacity-50 flex items-center gap-2 shadow-sm"
                  >
                    {saving ? 'Saving...' : editingQuestion ? 'Update Question' : 'Save & Close'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default CBTQuestionBank;
