import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { api, API_BASE_URL } from '../../api';
import { toast } from '../../utils/toast';
import useSchoolSettings from '../../hooks/useSchoolSettings';
import { useAuth } from '../../context/AuthContext';
import useTermContext from '../../hooks/useTermContext';
import { ChevronDown, ChevronUp, Trash2, Plus, Edit2, X, Printer, Image as ImageIcon, Paperclip, FileText, CheckCircle, Copy, ZoomIn, AlignLeft, AlignCenter, AlignRight, Check, Download } from 'lucide-react';
import MathToolbar from '../../components/common/MathToolbar';
import { parseQuestionContent, IMAGE_SIZE_CLASSES } from '../../utils/cbtUtils';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';

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
  const { currentTerm, currentSession } = useTermContext();

  // Tab Filter: 'all' | 'multiple_choice' | 'essay'
  const [bankTab, setBankTab] = useState('all');

  // Live Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [sessionAddedCount, setSessionAddedCount] = useState(0);
  const [validationError, setValidationError] = useState('');
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState(new Set());

  const [questionForm, setQuestionForm] = useState({
    subjectId: '',
    classId: '',
    questionType: 'multiple_choice',
    questionText: '',
    markingGuide: '',
    attachmentUrl: '',
    imageSize: 'medium',
    imageAlignment: 'left',
    imageCaption: '',
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

  const expandAllSubjects = () => {
    const allSubIds = new Set(questions.map(q => String(q.subject?.id || 'unknown')));
    setExpandedSubjectIds(allSubIds);
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

  const IMAGE_SIZES = IMAGE_SIZE_CLASSES;

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
      imageSize: 'medium',
      imageAlignment: 'left',
      imageCaption: '',
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

    const { cleanText, diagramUrl } = parseQuestionContent(q.questionText, q.imageUrl || q.attachmentUrl);

    setEditingQuestion(q);
    setValidationError('');
    setQuestionForm({
      subjectId: q.subjectId ? String(q.subjectId) : '',
      classId: q.classId ? String(q.classId) : '',
      questionType: q.questionType || 'multiple_choice',
      questionText: cleanText,
      markingGuide: guide,
      attachmentUrl: diagramUrl || '',
      imageSize: 'medium',
      imageAlignment: 'left',
      imageCaption: '',
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
          ? `${questionForm.questionText.trim()}\n![Diagram#${questionForm.imageSize || 'medium'}](${questionForm.attachmentUrl})`
          : questionForm.questionText.trim(),
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
            imageSize: 'medium',
            imageAlignment: 'left',
            imageCaption: '',
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

  const handleDuplicateQuestion = (q) => {
    let parsedOptions = [];
    let guide = '';
    try {
      if (typeof q.options === 'string') {
        const parsed = JSON.parse(q.options);
        if (Array.isArray(parsed)) parsedOptions = parsed;
        else if (parsed && typeof parsed === 'object') guide = parsed.markingGuide || '';
      } else if (Array.isArray(q.options)) {
        parsedOptions = q.options;
      } else if (q.options && typeof q.options === 'object') {
        guide = q.options.markingGuide || '';
      }
    } catch (e) { parsedOptions = []; }

    if (!Array.isArray(parsedOptions) || parsedOptions.length === 0) {
      parsedOptions = [
        { id: 'a', text: '' }, { id: 'b', text: '' },
        { id: 'c', text: '' }, { id: 'd', text: '' }
      ];
    }

    const { cleanText } = parseQuestionContent(q.questionText);

    setEditingQuestion(null);
    setSessionAddedCount(0);
    setValidationError('');
    setQuestionForm({
      subjectId: q.subjectId ? String(q.subjectId) : '',
      classId: q.classId ? String(q.classId) : '',
      questionType: q.questionType || 'multiple_choice',
      questionText: cleanText,
      markingGuide: guide,
      attachmentUrl: '',
      imageSize: 'medium',
      imageAlignment: 'left',
      imageCaption: '',
      options: parsedOptions,
      correctOption: q.correctOption || 'a',
      points: q.points || 1
    });
    setActiveField('questionText');
    setShowModal(true);
    toast.success('Question duplicated! Edit and save as a new entry.');
  };

  const handleBulkDelete = async () => {
    if (selectedQuestionIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedQuestionIds.size} selected question(s)? This cannot be undone.`)) return;
    
    let deleted = 0;
    for (const id of selectedQuestionIds) {
      try {
        const response = await api.delete(`/api/cbt/bank/${id}`);
        if (response.ok) deleted++;
      } catch (e) {}
    }
    toast.success(`${deleted} question(s) deleted`);
    setSelectedQuestionIds(new Set());
    fetchQuestions();
  };

  const toggleSelectQuestion = (id) => {
    setSelectedQuestionIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (questionIds) => {
    setSelectedQuestionIds(prev => {
      const allSelected = questionIds.every(id => prev.has(id));
      if (allSelected) return new Set();
      return new Set(questionIds);
    });
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

  // ── Print Settings Modal State ──
  const [showPrintSettings, setShowPrintSettings] = useState(false);
  const [printAction, setPrintAction] = useState('print'); // 'print' | 'pdf' | 'word'
  const [printTimeAllowed, setPrintTimeAllowed] = useState('');

  // Validate required fields before any print/download action
  const validateAndOpenPrintSettings = (action) => {
    if (!filters.subjectId) {
      toast.error('Please select a Subject before printing/downloading the theory paper.');
      return;
    }
    if (!filters.classId) {
      toast.error('Please select a Class before printing/downloading the theory paper.');
      return;
    }
    const essayQuestions = questions.filter(q => q.questionType === 'essay');
    if (essayQuestions.length === 0) {
      toast.error('No Essay / Theory questions available. Add essay questions first.');
      return;
    }
    setPrintAction(action);
    setPrintTimeAllowed('');
    setShowPrintSettings(true);
  };

  const handleConfirmPrint = () => {
    if (!printTimeAllowed.trim()) {
      toast.error('Please enter the time allowed for this examination.');
      return;
    }
    setShowPrintSettings(false);
    if (printAction === 'print') handlePrintTheoryPaper(printTimeAllowed.trim());
    else if (printAction === 'pdf') handleDownloadTheoryPDF(printTimeAllowed.trim());
    else if (printAction === 'word') handleDownloadTheoryWord(printTimeAllowed.trim());
  };

  // Resolve logo URL
  const getLogoUrl = () => {
    if (!schoolSettings?.logoUrl) return null;
    const cleanBaseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    return schoolSettings.logoUrl.startsWith('http') || schoolSettings.logoUrl.startsWith('data:')
      ? schoolSettings.logoUrl
      : `${cleanBaseUrl}${schoolSettings.logoUrl.startsWith('/') ? '' : '/'}${schoolSettings.logoUrl}`;
  };

  // Print Theory / Essay Paper for Examination Officer
  const handlePrintTheoryPaper = (timeAllowed) => {
    const essayQuestions = questions.filter(q => q.questionType === 'essay');
    const subjectName = subjects.find(s => String(s.id) === String(filters.subjectId))?.name;
    const className = classes.find(c => String(c.id) === String(filters.classId))?.name;
    const termName = currentTerm?.name || '';
    const sessionName = currentSession?.name || '';
    const schoolName = schoolSettings?.schoolName || schoolSettings?.name || '';
    const logoUrl = getLogoUrl();

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Theory Examination Paper - ${schoolName}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #111; line-height: 1.6; background-color: #fff; }
          .no-print { background: #1e1b4b; color: white; padding: 12px 24px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 1000; box-shadow: 0 4px 12px rgba(0,0,0,0.15); margin: -30px -30px 25px -30px; }
          .no-print button { background: #6366f1; color: white; font-weight: bold; border: none; padding: 8px 20px; border-radius: 8px; cursor: pointer; font-size: 13px; transition: all; }
          .no-print button:hover { background: #4f46e5; }
          .header { text-align: center; border-bottom: 2px solid #1e1b4b; padding-bottom: 15px; margin-bottom: 25px; }
          .header img.school-logo { height: 70px; width: auto; max-width: 200px; object-fit: contain; margin-bottom: 8px; }
          .header h1 { margin: 0; font-size: 24px; text-transform: uppercase; color: #1e1b4b; font-weight: 800; }
          .header h2 { margin: 6px 0 0 0; font-size: 16px; color: #475569; font-weight: 600; }
          .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px 20px; font-weight: 600; margin-bottom: 20px; font-size: 13px; border: 1px solid #e2e8f0; padding: 12px 16px; border-radius: 8px; background: #f8fafc; }
          .meta-item span[contenteditable="true"] { outline: none; border-bottom: 1px dotted #94a3b8; padding: 0 4px; color: #0f172a; }
          .question { margin-bottom: 25px; page-break-inside: avoid; border-bottom: 1px dashed #f1f5f9; padding-bottom: 15px; }
          .q-num { font-weight: bold; color: #1e1b4b; }
          .q-text { font-size: 15px; font-weight: 600; margin-bottom: 8px; color: #1e293b; }
          .q-points { float: right; font-style: italic; color: #64748b; font-size: 13px; font-weight: bold; }
          .diagram { margin: 10px 0; border: 1px solid #cbd5e1; border-radius: 8px; padding: 4px; object-fit: contain; }
          .answer-space { height: 100px; border-bottom: 1px dotted #cbd5e1; margin-top: 15px; }
          [contenteditable="true"]:hover { background-color: #f1f5f9; cursor: pointer; }
          @media print {
            .no-print { display: none !important; }
            body { padding: 0 !important; margin: 0 !important; }
            .meta-grid { border: 1px solid #333 !important; background: transparent !important; }
            .answer-space { height: 120px; }
            [contenteditable="true"] { border: none !important; background: transparent !important; }
          }
        </style>
      </head>
      <body>
        <div class="no-print">
          <div style="font-size: 13px;">
            ✏️ <strong>Interactive Print Preview:</strong> Click any text below to edit before printing.
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <button onclick="window.print()">🖨️ Print</button>
            <button onclick="downloadAsPDF()" style="background: #dc2626;">📄 Save as PDF</button>
            <button onclick="downloadAsWord()" style="background: #2563eb;">📝 Download Word</button>
          </div>
        </div>

        <div class="header">
          ${logoUrl ? `<img src="${logoUrl}" class="school-logo" alt="School Logo" />` : ''}
          <h1 contenteditable="true" title="Click to edit school name">${schoolName}</h1>
          <h2 contenteditable="true" title="Click to edit paper title">${subjectName} - Written Theory / Essay Examination</h2>
        </div>

        <div class="meta-grid">
          <div class="meta-item">Subject: <span contenteditable="true" title="Click to edit subject">${subjectName}</span></div>
          <div class="meta-item">Class: <span contenteditable="true" title="Click to edit class">${className}</span></div>
          <div class="meta-item">Term: <span contenteditable="true" title="Click to edit term">${termName}</span></div>
          <div class="meta-item">Academic Session: <span contenteditable="true" title="Click to edit session">${sessionName}</span></div>
          <div class="meta-item">Time Allowed: <span contenteditable="true" title="Click to edit duration">${timeAllowed}</span></div>
          <div class="meta-item">Student Name: <span contenteditable="true" title="Click to edit">__________________________</span></div>
        </div>

        <p style="font-weight: bold; font-size: 13px; font-style: italic; color: #334155; margin-bottom: 15px;">
          Instruction: <span contenteditable="true">Answer all questions clearly in the space provided. Show all step-by-step working where applicable.</span>
        </p>
        <hr style="margin-bottom: 20px; border: 0; border-top: 2px solid #e2e8f0;" />

        ${essayQuestions.map((q, idx) => {
          const { cleanText, diagramUrl, imageSize } = parseQuestionContent(q.questionText, q.imageUrl || q.attachmentUrl);
          const maxHStyle = IMAGE_SIZE_CLASSES[imageSize]?.printMaxH ? `max-height: ${IMAGE_SIZE_CLASSES[imageSize].printMaxH};` : 'max-height: 250px;';

          return `
            <div class="question">
              <span class="q-points">[${q.points || 1} Marks]</span>
              <div class="q-text"><span class="q-num">Q${idx + 1}.</span> ${cleanText}</div>
              ${diagramUrl ? `<img src="${diagramUrl}" class="diagram" style="${maxHStyle}" alt="Question Diagram" />` : ''}
              <div class="answer-space"></div>
            </div>
          `;
        }).join('')}
      <script>
        function downloadAsPDF() {
          var noPrint = document.querySelector('.no-print');
          if (noPrint) noPrint.style.display = 'none';
          window.print();
          if (noPrint) noPrint.style.display = '';
        }

        function downloadAsWord() {
          var noPrint = document.querySelector('.no-print');
          if (noPrint) noPrint.style.display = 'none';
          var content = document.documentElement.outerHTML;
          if (noPrint) noPrint.style.display = '';
          var blob = new Blob(['\\ufeff' + '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">' + content + '</html>'], { type: 'application/msword' });
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = '${subjectName}_Theory_Paper.doc';
          document.body.appendChild(a);
          a.click();
          setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
        }
      </script>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
  };

  // Generate theory paper HTML content for direct downloads
  const generateTheoryPaperHTML = (timeAllowed) => {
    const essayQuestions = questions.filter(q => q.questionType === 'essay');
    const subjectName = subjects.find(s => String(s.id) === String(filters.subjectId))?.name;
    const className = classes.find(c => String(c.id) === String(filters.classId))?.name;
    const termName = currentTerm?.name || '';
    const sessionName = currentSession?.name || '';
    const schoolName = schoolSettings?.schoolName || schoolSettings?.name || '';
    const logoUrl = getLogoUrl();

    const questionsHTML = essayQuestions.map((q, idx) => {
      const { cleanText, diagramUrl, imageSize } = parseQuestionContent(q.questionText, q.imageUrl || q.attachmentUrl);
      const maxHStyle = IMAGE_SIZE_CLASSES[imageSize]?.printMaxH ? `max-height: ${IMAGE_SIZE_CLASSES[imageSize].printMaxH};` : 'max-height: 250px;';
      return `
        <div style="margin-bottom: 25px; page-break-inside: avoid; border-bottom: 1px dashed #f1f5f9; padding-bottom: 15px;">
          <span style="float: right; font-style: italic; color: #64748b; font-size: 13px; font-weight: bold;">[${q.points || 1} Marks]</span>
          <div style="font-size: 15px; font-weight: 600; margin-bottom: 8px; color: #1e293b;">
            <span style="font-weight: bold; color: #1e1b4b;">Q${idx + 1}.</span> ${cleanText}
          </div>
          ${diagramUrl ? `<img src="${diagramUrl}" style="margin: 10px 0; border: 1px solid #cbd5e1; border-radius: 8px; padding: 4px; object-fit: contain; ${maxHStyle}" alt="Question Diagram" />` : ''}
          <div style="height: 100px; border-bottom: 1px dotted #cbd5e1; margin-top: 15px;"></div>
        </div>
      `;
    }).join('');

    return {
      html: `
        <div style="text-align: center; border-bottom: 2px solid #1e1b4b; padding-bottom: 15px; margin-bottom: 25px;">
          ${logoUrl ? `<img src="${logoUrl}" style="height: 70px; width: auto; max-width: 200px; object-fit: contain; margin-bottom: 8px;" alt="School Logo" />` : ''}
          <h1 style="margin: 0; font-size: 24px; text-transform: uppercase; color: #1e1b4b; font-weight: 800;">${schoolName}</h1>
          <h2 style="margin: 6px 0 0 0; font-size: 16px; color: #475569; font-weight: 600;">${subjectName} - Written Theory / Essay Examination</h2>
        </div>
        <table style="width: 100%; font-weight: 600; margin-bottom: 20px; font-size: 13px; border: 1px solid #e2e8f0; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">Subject: <strong>${subjectName}</strong></td>
            <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">Class: <strong>${className}</strong></td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">Term: <strong>${termName}</strong></td>
            <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">Academic Session: <strong>${sessionName}</strong></td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">Time Allowed: <strong>${timeAllowed}</strong></td>
            <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">Student Name: __________________________</td>
          </tr>
        </table>
        <p style="font-weight: bold; font-size: 13px; font-style: italic; color: #334155; margin-bottom: 15px;">
          Instruction: Answer all questions clearly in the space provided. Show all step-by-step working where applicable.
        </p>
        <hr style="margin-bottom: 20px; border: 0; border-top: 2px solid #e2e8f0;" />
        ${questionsHTML}
      `,
      subjectName,
      schoolName,
      essayQuestions
    };
  };

  // Download Theory Paper as PDF using jsPDF + html rendering
  const handleDownloadTheoryPDF = async (timeAllowed) => {
    const data = generateTheoryPaperHTML(timeAllowed);
    if (!data) return;

    toast.success('Generating PDF... Please wait.');

    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const container = document.createElement('div');
      container.style.cssText = 'position: absolute; left: -9999px; top: 0; width: 794px; padding: 30px; font-family: Segoe UI, Arial, sans-serif; color: #111; line-height: 1.6; background: #fff;';
      container.innerHTML = data.html;
      document.body.appendChild(container);

      await pdf.html(container, {
        callback: function (doc) {
          doc.save(`${data.subjectName}_Theory_Paper.pdf`);
          document.body.removeChild(container);
          toast.success('PDF downloaded successfully!');
        },
        x: 5,
        y: 5,
        width: 190,
        windowWidth: 794,
        html2canvas: { scale: 0.26, useCORS: true, logging: false }
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF. Try printing to PDF instead.');
    }
  };

  // Download Theory Paper as Word Document (.doc)
  const handleDownloadTheoryWord = (timeAllowed) => {
    const data = generateTheoryPaperHTML(timeAllowed);
    if (!data) return;

    const fullHTML = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:w="urn:schemas-microsoft-com:office:word"
            xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <title>${data.subjectName} - Theory Paper</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #111; line-height: 1.6; }
          table { border-collapse: collapse; width: 100%; }
          td { padding: 8px 12px; border: 1px solid #ccc; }
          h1 { font-size: 22px; text-transform: uppercase; text-align: center; margin: 0; }
          h2 { font-size: 15px; text-align: center; color: #475569; margin: 6px 0 0 0; }
        </style>
      </head>
      <body>
        ${data.html}
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + fullHTML], { type: 'application/msword' });
    saveAs(blob, `${data.subjectName}_Theory_Paper.doc`);
    toast.success('Word document downloaded successfully!');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">CBT & Theory Question Bank</h1>
          <p className="text-sm text-gray-500">Centralized repository for CBT multiple choice & paper exam theory questions</p>
        </div>
        <div className="flex flex-wrap gap-2 overflow-x-auto pb-1">
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
            onClick={() => validateAndOpenPrintSettings('print')}
            className="px-3.5 py-2 bg-slate-800 text-white rounded hover:bg-slate-900 transition text-sm font-medium flex items-center gap-1.5 shadow-sm"
            title="Print Theory Question Paper for Written Exams"
          >
            <Printer size={16} />
            Print Theory Paper
          </button>
          <button
            onClick={() => validateAndOpenPrintSettings('pdf')}
            className="px-3.5 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm font-medium flex items-center gap-1.5 shadow-sm"
            title="Download Theory Paper as PDF"
          >
            <Download size={16} />
            PDF
          </button>
          <button
            onClick={() => validateAndOpenPrintSettings('word')}
            className="px-3.5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm font-medium flex items-center gap-1.5 shadow-sm"
            title="Download Theory Paper as Word Document"
          >
            <Download size={16} />
            Word
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
              className="rounded-md border-gray-300 text-sm py-1.5 px-3 font-medium focus:ring-primary focus:border-primary"
              value={filters.subjectId}
              onChange={(e) => setFilters({ ...filters, subjectId: e.target.value })}
            >
              <option value="">All Subjects</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select
              className="rounded-md border-gray-300 text-sm py-1.5 px-3 font-medium focus:ring-primary focus:border-primary"
              value={filters.classId}
              onChange={(e) => setFilters({ ...filters, classId: e.target.value })}
            >
              <option value="">All Class Levels</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {(filters.subjectId || filters.classId) && (
              <button
                onClick={() => setFilters({ subjectId: '', classId: '', teacherId: '' })}
                className="text-xs px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full font-medium flex items-center gap-1.5 hover:bg-amber-100 transition-colors"
                title="Clear Active Filters"
              >
                <span>Filter Active</span>
                <X size={12} className="font-bold" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={expandAllSubjects}
              className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
            >
              <ChevronDown size={14} /> Expand All
            </button>
            {(expandedIds.size > 0 || expandedSubjectIds.size > 0) && (
              <button
                onClick={collapseAll}
                className="text-xs font-semibold text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors"
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
                    <div className="bg-white border-t border-gray-200">
                      {/* Desktop Table - hidden on mobile */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                              <th className="px-3 py-3 text-center w-10">
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 text-primary rounded border-gray-300 cursor-pointer"
                                  checked={subjectQuestions.length > 0 && subjectQuestions.every(q => selectedQuestionIds.has(q.id))}
                                  onChange={() => toggleSelectAll(subjectQuestions.map(q => q.id))}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </th>
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

                              const { cleanText: cleanQuestionText, diagramUrl } = parseQuestionContent(q.questionText, q.imageUrl || q.attachmentUrl);

                              return (
                                <React.Fragment key={q.id}>
                                  <tr
                                    className={`hover:bg-gray-50 transition-colors cursor-pointer ${isExpanded ? 'bg-blue-50/30' : ''}`}
                                    onClick={() => toggleExpand(q.id)}
                                  >
                                    <td className="px-3 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                                      <input
                                        type="checkbox"
                                        className="w-4 h-4 text-primary rounded border-gray-300 cursor-pointer"
                                        checked={selectedQuestionIds.has(q.id)}
                                        onChange={() => toggleSelectQuestion(q.id)}
                                      />
                                    </td>
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
                                          onClick={() => handleDuplicateQuestion(q)}
                                          className="text-amber-600 hover:text-amber-800 bg-amber-50 p-2 rounded-full transition-colors"
                                          title="Duplicate Question"
                                        >
                                          <Copy size={16} />
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
                                      <td colSpan="7" className="px-6 pb-6 pt-0">
                                        <div className="ml-8 border-l-2 border-blue-200 pl-4 py-2 space-y-3">
                                          {diagramUrl && (
                                            <div>
                                              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Attached Diagram / Figure</p>
                                              <img
                                                src={diagramUrl}
                                                alt="Diagram"
                                                className="max-h-48 rounded border border-gray-200 p-1 bg-white cursor-pointer hover:shadow-lg transition-shadow"
                                                onClick={(e) => { e.stopPropagation(); setLightboxUrl(diagramUrl); }}
                                                title="Click to zoom"
                                              />
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

                      {/* Mobile Card Grid - shown only on mobile */}
                      <div className="md:hidden p-3 space-y-3">
                        {subjectQuestions.map((q) => {
                          const isEssay = q.questionType === 'essay';
                          const { cleanText: cleanQuestionText } = parseQuestionContent(q.questionText);

                          return (
                            <div key={q.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-2 flex-1 min-w-0">
                                  <input
                                    type="checkbox"
                                    className="w-4 h-4 text-primary rounded border-gray-300 mt-1 flex-shrink-0"
                                    checked={selectedQuestionIds.has(q.id)}
                                    onChange={() => toggleSelectQuestion(q.id)}
                                  />
                                  <div className="min-w-0">
                                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-1.5 ${
                                      isEssay ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-indigo-100 text-indigo-700'
                                    }`}>
                                      {isEssay ? 'Essay' : 'CBT'}
                                    </span>
                                    <p className="text-sm font-medium text-gray-900 line-clamp-3">{cleanQuestionText}</p>
                                  </div>
                                </div>
                                <span className="text-xs font-bold text-gray-500 bg-white px-2 py-1 rounded border flex-shrink-0">{q.points} pts</span>
                              </div>
                              <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                                <span className="text-[11px] text-gray-500 italic">{q.teacher?.firstName} {q.teacher?.lastName}</span>
                                <div className="flex items-center gap-1">
                                  <button onClick={() => openEditModal(q)} className="text-blue-600 bg-blue-50 p-2 rounded-full" title="Edit">
                                    <Edit2 size={14} />
                                  </button>
                                  <button onClick={() => handleDuplicateQuestion(q)} className="text-amber-600 bg-amber-50 p-2 rounded-full" title="Duplicate">
                                    <Copy size={14} />
                                  </button>
                                  <button onClick={() => handleDelete(q.id)} className="text-red-500 bg-red-50 p-2 rounded-full" title="Delete">
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Bulk Selection Action Bar */}
      {selectedQuestionIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[999] bg-gray-900 text-white rounded-2xl shadow-2xl px-6 py-3 flex items-center gap-4 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-2">
            <Check size={16} className="text-green-400" />
            <span className="text-sm font-bold">{selectedQuestionIds.size} selected</span>
          </div>
          <div className="w-px h-6 bg-gray-700" />
          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-red-500/20 text-red-300 hover:bg-red-500/30 hover:text-red-200 rounded-lg transition text-xs font-bold"
          >
            <Trash2 size={14} />
            Delete Selected
          </button>
          <button
            onClick={() => setSelectedQuestionIds(new Set())}
            className="px-3 py-1.5 text-gray-400 hover:text-white transition text-xs font-medium"
          >
            Clear
          </button>
        </div>
      )}

      {/* Live Add / Edit Question Modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-0 sm:p-6">
          <div className="bg-white sm:rounded-2xl shadow-2xl max-w-2xl w-full p-4 sm:p-6 space-y-4 relative h-full sm:h-auto sm:max-h-[92vh] overflow-y-auto border-0 sm:border border-gray-100 animate-in fade-in zoom-in duration-150 sm:my-auto">
            
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
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                    <ImageIcon size={14} className="text-indigo-600" /> Diagram / Image Attachment (Optional)
                  </span>
                  {questionForm.attachmentUrl && (
                    <button
                      type="button"
                      onClick={() => setQuestionForm({ ...questionForm, attachmentUrl: '', imageCaption: '' })}
                      className="text-xs text-red-500 font-semibold hover:underline"
                    >
                      Remove Diagram
                    </button>
                  )}
                </div>

                {questionForm.attachmentUrl ? (
                  <div className="space-y-3">
                    {/* Image Preview */}
                    <div className={`${questionForm.imageAlignment === 'center' ? 'flex justify-center' : questionForm.imageAlignment === 'right' ? 'flex justify-end' : ''}`}>
                      <img
                        src={questionForm.attachmentUrl}
                        alt="Attachment Preview"
                        className={`rounded-lg border border-gray-200 p-1 bg-white cursor-pointer hover:shadow-lg transition-shadow ${IMAGE_SIZES[questionForm.imageSize]?.maxH || 'max-h-[300px]'} object-contain`}
                        onClick={() => setLightboxUrl(questionForm.attachmentUrl)}
                        title="Click to zoom"
                      />
                    </div>

                    {/* Size Selector */}
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold text-gray-500 uppercase mr-1">Size:</span>
                        {Object.entries(IMAGE_SIZES).map(([key, val]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setQuestionForm({ ...questionForm, imageSize: key })}
                            className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all ${
                              questionForm.imageSize === key
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-100'
                            }`}
                          >
                            {val.label}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold text-gray-500 uppercase mr-1">Align:</span>
                        {[{ key: 'left', Icon: AlignLeft }, { key: 'center', Icon: AlignCenter }, { key: 'right', Icon: AlignRight }].map(({ key, Icon }) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setQuestionForm({ ...questionForm, imageAlignment: key })}
                            className={`p-1 rounded transition-all ${
                              questionForm.imageAlignment === key
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'bg-white text-gray-400 border border-gray-200 hover:bg-gray-100'
                            }`}
                          >
                            <Icon size={12} />
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setLightboxUrl(questionForm.attachmentUrl)}
                        className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100 transition"
                      >
                        <ZoomIn size={11} /> Preview Full
                      </button>
                    </div>

                    {/* Caption */}
                    <input
                      type="text"
                      placeholder="Figure caption (e.g., Figure 1.1: Photosynthesis Cycle)..."
                      className="w-full rounded-md border-gray-300 shadow-sm text-xs focus:ring-indigo-500 focus:border-indigo-500 px-3 py-1.5 bg-white"
                      value={questionForm.imageCaption}
                      onChange={(e) => setQuestionForm({ ...questionForm, imageCaption: e.target.value })}
                    />
                  </div>
                ) : (
                  <label className="flex justify-center items-center px-4 py-3 border border-gray-300 border-dashed rounded-lg text-xs font-medium text-gray-600 bg-white hover:bg-gray-50 hover:border-indigo-300 cursor-pointer transition-all gap-2">
                    {uploadingAttachment ? (
                      <span className="flex items-center gap-2"><svg className="animate-spin h-4 w-4 text-indigo-500" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Uploading...</span>
                    ) : (
                      <><ImageIcon size={16} className="text-indigo-400" /> Click to upload diagram image (PNG, JPG)</>  
                    )}
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

      {/* ── Print Settings Modal ── */}
      {showPrintSettings && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Printer size={20} className="text-indigo-600" />
                {printAction === 'print' ? 'Print' : printAction === 'pdf' ? 'Download PDF' : 'Download Word'} — Theory Paper
              </h3>
              <button onClick={() => setShowPrintSettings(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Subject</label>
                <div className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold text-gray-800">
                  {subjects.find(s => String(s.id) === String(filters.subjectId))?.name || '—'}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Class</label>
                <div className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold text-gray-800">
                  {classes.find(c => String(c.id) === String(filters.classId))?.name || '—'}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                  Time Allowed <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={printTimeAllowed}
                  onChange={e => setPrintTimeAllowed(e.target.value)}
                  placeholder="e.g. 1 Hour 30 Minutes"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none transition"
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') handleConfirmPrint(); }}
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setShowPrintSettings(false)}
                className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPrint}
                className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm transition flex items-center gap-2"
              >
                {printAction === 'print' ? <><Printer size={16} /> Print Paper</> : printAction === 'pdf' ? <><Download size={16} /> Download PDF</> : <><Download size={16} /> Download Word</>}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Image Lightbox */}
      {lightboxUrl && createPortal(
        <div
          className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer animate-in fade-in duration-150"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightboxUrl}
              alt="Full size preview"
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
            />
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-white text-gray-800 rounded-full shadow-lg flex items-center justify-center hover:bg-red-50 hover:text-red-600 transition"
            >
              <X size={16} />
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default CBTQuestionBank;
