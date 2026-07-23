import React, { useState, useEffect } from 'react';
import { api, API_BASE_URL } from '../../api';
import { toast } from '../../utils/toast';
import useSchoolSettings from '../../hooks/useSchoolSettings';
import { useAuth } from '../../context/AuthContext';
import useTermContext from '../../hooks/useTermContext';
import MathToolbar from '../../components/common/MathToolbar';
import { parseQuestionContent } from '../../utils/cbtUtils';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title as ChartTitle,
  Tooltip as ChartTooltip,
  Legend as ChartLegend
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Printer, BarChart2, PieChart, CheckCircle2, ShieldCheck, X } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  ChartTitle,
  ChartTooltip,
  ChartLegend
);

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
    randomizeOptions: true,
    token: ''
  });

  const [selectedExam, setSelectedExam] = useState(null);
  const [editingExam, setEditingExam] = useState(null);
  const [questions, setQuestions] = useState([]); // Questions for selected exam
  const [examResults, setExamResults] = useState([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
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
  const [activeQuestionField, setActiveQuestionField] = useState('questionText');

  const handleInsertMathSymbolInExam = (char) => {
    if (activeQuestionField === 'questionText') {
      setNewQuestion(prev => ({
        ...prev,
        questionText: prev.questionText + char
      }));
    } else if (activeQuestionField.startsWith('option-')) {
      const index = parseInt(activeQuestionField.split('-')[1]);
      setNewQuestion(prev => {
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

  const { currentTerm, currentSession, loading: termLoading } = useTermContext();

  useEffect(() => {
    if (!termLoading) {
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
          examType: 'examination',
          randomizeQuestions: true,
          randomizeOptions: true,
          token: ''
        });
      } else {
        toast.error(data.error || 'Failed to create exam');
      }
    } catch (error) {
      toast.error('Error creating exam');
    }
  };

  const handleEditExam = (exam) => {
    const formatDateTimeLocal = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      const offset = date.getTimezoneOffset();
      const localDate = new Date(date.getTime() - (offset * 60 * 1000));
      return localDate.toISOString().slice(0, 16);
    };

    setEditingExam(exam);
    setFormData({
      title: exam.title || '',
      description: exam.description || '',
      classId: exam.classId || '',
      subjectId: exam.subjectId || '',
      durationMinutes: exam.durationMinutes || 60,
      totalMarks: exam.totalMarks || 100,
      startDate: formatDateTimeLocal(exam.startDate),
      endDate: formatDateTimeLocal(exam.endDate),
      examType: exam.examType || 'examination',
      randomizeQuestions: exam.randomizeQuestions !== false,
      randomizeOptions: exam.randomizeOptions !== false,
      token: exam.token || ''
    });
    setView('edit');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.put(`/api/cbt/${editingExam.id}`, formData);
      const data = await response.json();

      if (response.ok) {
        toast.success('Exam settings updated successfully');
        // Map data to preserve local model relationships (class, subject)
        const updatedExams = exams.map(ex => {
          if (ex.id === editingExam.id) {
            return {
              ...ex,
              ...data,
              class: ex.class,
              subject: ex.subject,
              _count: ex._count
            };
          }
          return ex;
        });
        setExams(updatedExams);
        setView('list');
        setEditingExam(null);
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
          examType: 'examination',
          randomizeQuestions: true,
          randomizeOptions: true,
          token: ''
        });
      } else {
        toast.error(data.error || 'Failed to update exam');
      }
    } catch (error) {
      toast.error('Error updating exam');
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
    const { cleanText } = parseQuestionContent(q.questionText);
    setEditingQuestion(q);
    setNewQuestion({
      questionText: cleanText,
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
              ${qs.map((q, i) => {
                const { cleanText, diagramUrl } = parseQuestionContent(q.questionText, q.imageUrl || q.attachmentUrl);
                return `
                <div class="question">
                  <div class="question-text">${i + 1}. ${cleanText} (${q.points} marks)</div>
                  ${diagramUrl ? `<div style="margin: 10px 0;"><img src="${diagramUrl}" style="max-height: 220px; max-width: 100%; border: 1px solid #ddd; border-radius: 6px; padding: 4px;" alt="Diagram" /></div>` : ''}
                  <div class="options">
                    ${Array.isArray(q.options) ? q.options.map(o => `<div class="option">(${o.id.toUpperCase()}) ${o.text}</div>`).join('') : '<div class="option"><em>Essay / Theory Paper Question</em></div>'}
                  </div>
                </div>
              `;
              }).join('')}
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

    fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(response => {
        const disposition = response.headers.get('Content-Disposition');
        let filename = `CBT_Results_${selectedExam.title.replace(/\s+/g, '_')}.xlsx`;
        if (disposition && disposition.includes('filename=')) {
          const match = disposition.match(/filename="?([^"]+)"?/);
          if (match && match[1]) filename = match[1];
        }
        return response.blob().then(blob => ({ blob, filename }));
      })
      .then(({ blob, filename }) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
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

  // Printable Official PDF Transcript Generator (Feature 3)
  const handlePrintPDFTranscript = (singleResult = null) => {
    if (!selectedExam) return;
    const resultsToPrint = singleResult ? [singleResult] : examResults;

    if (resultsToPrint.length === 0) {
      toast.error('No results available to print.');
      return;
    }

    const printWindow = window.open('', '_blank');
    const schoolName = schoolSettings?.name || 'SCHOOL MANAGEMENT SYSTEM';
    const schoolAddress = schoolSettings?.address || '';
    const schoolPhone = schoolSettings?.phone || '';
    const logoUrl = schoolSettings?.logoUrl || '';

    const getLetterGrade = (percentage) => {
      if (percentage >= 70) return { grade: 'A', remark: 'EXCELLENT', color: '#16a34a' };
      if (percentage >= 60) return { grade: 'B', remark: 'VERY GOOD', color: '#2563eb' };
      if (percentage >= 50) return { grade: 'C', remark: 'CREDIT', color: '#d97706' };
      if (percentage >= 40) return { grade: 'D', remark: 'PASS', color: '#ca8a04' };
      return { grade: 'F', remark: 'FAIL', color: '#dc2626' };
    };

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Official CBT Assessment Transcript - ${selectedExam.title}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 25px; color: #0f172a; line-height: 1.5; background: #fff; }
          .page { page-break-after: always; max-width: 800px; margin: 0 auto 40px auto; border: 2px solid #1e3a8a; padding: 25px; border-radius: 12px; position: relative; }
          .page:last-child { page-break-after: avoid; }
          .header-table { width: 100%; border-bottom: 3px double #1e3a8a; padding-bottom: 15px; margin-bottom: 20px; }
          .school-title { font-size: 22px; font-weight: 900; color: #1e3a8a; text-transform: uppercase; margin: 0; }
          .school-sub { font-size: 12px; color: #475569; margin-top: 3px; }
          .doc-title { text-align: center; background: #1e3a8a; color: #fff; font-weight: 800; font-size: 14px; padding: 8px; text-transform: uppercase; letter-spacing: 1px; border-radius: 6px; margin-bottom: 20px; }
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
          .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
          .info-box h4 { margin: 0 0 8px 0; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 800; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
          .info-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px; }
          .info-row span.label { color: #475569; font-weight: 600; }
          .info-row span.val { font-weight: 700; color: #0f172a; }
          
          .score-card { display: flex; align-items: center; justify-content: space-between; background: #eff6ff; border: 2px solid #bfdbfe; border-radius: 10px; padding: 15px 20px; margin-bottom: 20px; }
          .score-main { text-align: center; }
          .score-num { font-size: 32px; font-weight: 900; color: #1e3a8a; }
          .score-denom { font-size: 14px; color: #64748b; font-weight: 600; }
          .grade-badge { text-align: center; padding: 10px 20px; border-radius: 8px; color: #fff; font-weight: 900; }
          .grade-letter { font-size: 28px; line-height: 1; }
          .grade-remark { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }

          .stats-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
          .stats-table th, .stats-table td { border: 1px solid #cbd5e1; padding: 10px; text-align: center; font-size: 12px; }
          .stats-table th { background: #f1f5f9; font-weight: 800; color: #334155; text-transform: uppercase; font-size: 11px; }

          .footer-section { display: flex; justify-content: space-between; align-items: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
          .sig-block { text-align: center; width: 200px; }
          .sig-line { border-bottom: 1.5px dashed #475569; height: 40px; margin-bottom: 6px; }
          .sig-label { font-size: 11px; font-weight: 700; color: #334155; text-transform: uppercase; }

          .qr-block { display: flex; align-items: center; gap: 10px; background: #fafafa; border: 1px solid #e5e5e5; padding: 8px 12px; border-radius: 8px; }
          .qr-img { width: 65px; height: 65px; }
          .qr-text { font-size: 9px; color: #525252; max-width: 130px; line-height: 1.3; }

          @media print {
            body { padding: 0; background: #fff; }
            .page { border: none; padding: 0; margin-bottom: 0; }
          }
        </style>
      </head>
      <body>
        ${resultsToPrint.map(r => {
          const studentName = r.student?.user ? `${r.student.user.firstName} ${r.student.user.lastName}` : (r.student?.name || 'Student');
          const admNum = r.student?.admissionNumber || 'N/A';
          const totalQ = r.totalQuestions || 0;
          const correctQ = r.correctAnswers || 0;
          
          let attemptedCount = correctQ;
          if (r.answers) {
            try {
              const parsed = JSON.parse(r.answers);
              if (parsed && typeof parsed === 'object') {
                attemptedCount = Object.keys(parsed).filter(k => parsed[k] !== undefined && parsed[k] !== null && parsed[k] !== '').length;
              }
            } catch(e) {}
          } else { attemptedCount = totalQ; }

          const unattemptedQ = Math.max(0, totalQ - attemptedCount);
          const failedQ = Math.max(0, attemptedCount - correctQ);
          const pct = selectedExam.totalMarks > 0 ? Math.round((r.score / selectedExam.totalMarks) * 100) : 0;
          const gradeObj = getLetterGrade(pct);

          let timeTakenStr = 'N/A';
          if (r.startedAt && r.submittedAt) {
            const diffSecs = Math.max(0, Math.floor((new Date(r.submittedAt) - new Date(r.startedAt)) / 1000));
            if (diffSecs > 0) {
              const m = Math.floor(diffSecs / 60);
              const s = diffSecs % 60;
              timeTakenStr = `${m}m ${s < 10 ? '0' : ''}${s}s`;
            }
          }

          const subDateStr = r.submittedAt ? new Date(r.submittedAt).toLocaleString() : 'N/A';
          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${window.location.origin}/api/cbt/verify-result/${r.id}`)}`;

          return `
            <div class="page">
              <table class="header-table">
                <tr>
                  ${logoUrl ? `<td style="width: 80px;"><img src="${logoUrl}" style="max-height: 70px; max-width: 70px;" /></td>` : ''}
                  <td>
                    <h1 class="school-title">${schoolName}</h1>
                    <div class="school-sub">${schoolAddress ? schoolAddress + ' • ' : ''}${schoolPhone ? 'Tel: ' + schoolPhone : ''}</div>
                  </td>
                </tr>
              </table>

              <div class="doc-title">OFFICIAL CBT ASSESSMENT RESULT TRANSCRIPT</div>

              <div class="grid-2">
                <div class="info-box">
                  <h4>Candidate Information</h4>
                  <div class="info-row"><span class="label">Full Name:</span> <span class="val">${studentName}</span></div>
                  <div class="info-row"><span class="label">Admission No:</span> <span class="val">${admNum}</span></div>
                  <div class="info-row"><span class="label">Class Level:</span> <span class="val">${selectedExam.class?.name || 'N/A'}</span></div>
                </div>
                <div class="info-box">
                  <h4>Assessment Metadata</h4>
                  <div class="info-row"><span class="label">Exam Title:</span> <span class="val">${selectedExam.title}</span></div>
                  <div class="info-row"><span class="label">Subject:</span> <span class="val">${selectedExam.subject?.name || 'N/A'}</span></div>
                  <div class="info-row"><span class="label">Submitted Date:</span> <span class="val">${subDateStr}</span></div>
                </div>
              </div>

              <div class="score-card">
                <div>
                  <div style="font-size: 11px; font-weight: 800; color: #475569; uppercase">Total Score Obtained</div>
                  <div class="score-main">
                    <span class="score-num">${r.score}</span>
                    <span class="score-denom"> / ${selectedExam.totalMarks} (${pct}%)</span>
                  </div>
                </div>
                <div class="grade-badge" style="background: ${gradeObj.color};">
                  <div class="grade-letter">${gradeObj.grade}</div>
                  <div class="grade-remark">${gradeObj.remark}</div>
                </div>
              </div>

              <table class="stats-table">
                <thead>
                  <tr>
                    <th>Total Questions</th>
                    <th>Correct (Passed)</th>
                    <th>Incorrect (Failed)</th>
                    <th>Skipped (Unattempted)</th>
                    <th>Time Taken</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><b>${totalQ}</b></td>
                    <td style="color: #16a34a; font-weight: bold;">${correctQ}</td>
                    <td style="color: #dc2626; font-weight: bold;">${failedQ}</td>
                    <td style="color: #64748b;">${unattemptedQ}</td>
                    <td><b>${timeTakenStr}</b></td>
                  </tr>
                </tbody>
              </table>

              <div class="footer-section">
                <div class="qr-block">
                  <img src="${qrUrl}" class="qr-img" alt="QR Verification" />
                  <div class="qr-text">
                    <b>AUTHENTIC DIGITAL TRANSCRIPT</b><br/>
                    Scan QR code to verify validity on school system portal.<br/>
                    Ref ID: #${r.id}
                  </div>
                </div>
                <div class="sig-block">
                  <div class="sig-line"></div>
                  <div class="sig-label">Examination Officer / Principal</div>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  // Visual Performance Analytics Generators (Feature 4)
  const getGradeChartData = () => {
    const counts = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    examResults.forEach(r => {
      const pct = selectedExam?.totalMarks > 0 ? (r.score / selectedExam.totalMarks) * 100 : 0;
      if (pct >= 70) counts.A++;
      else if (pct >= 60) counts.B++;
      else if (pct >= 50) counts.C++;
      else if (pct >= 40) counts.D++;
      else counts.F++;
    });

    return {
      labels: ['Grade A (70%+)', 'Grade B (60-69%)', 'Grade C (50-59%)', 'Grade D (40-49%)', 'Grade F (<40%)'],
      datasets: [{
        data: [counts.A, counts.B, counts.C, counts.D, counts.F],
        backgroundColor: ['#16a34a', '#2563eb', '#d97706', '#ca8a04', '#dc2626'],
        borderWidth: 1
      }]
    };
  };

  const getHistogramChartData = () => {
    const bins = { '0-20%': 0, '21-40%': 0, '41-60%': 0, '61-80%': 0, '81-100%': 0 };
    examResults.forEach(r => {
      const pct = selectedExam?.totalMarks > 0 ? (r.score / selectedExam.totalMarks) * 100 : 0;
      if (pct <= 20) bins['0-20%']++;
      else if (pct <= 40) bins['21-40%']++;
      else if (pct <= 60) bins['41-60%']++;
      else if (pct <= 80) bins['61-80%']++;
      else bins['81-100%']++;
    });

    return {
      labels: Object.keys(bins),
      datasets: [{
        label: 'Number of Students',
        data: Object.values(bins),
        backgroundColor: '#4f46e5',
        borderRadius: 6
      }]
    };
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
      {!currentTerm && (
        <div className="bg-amber-50 border-2 border-amber-200 text-amber-800 px-6 py-4 rounded-2xl flex items-center gap-3">
          <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
          <span className="text-sm font-semibold">No active term is set. Exams from all terms are being shown. Please ask your admin to set a current term for filtered results.</span>
        </div>
      )}
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

          {/* Desktop Table View */}
          <div className="hidden lg:block bg-white rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden">
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
                            <span className="text-[10px] text-slate-400 font-bold">
                              {new Date(exam.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
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
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          <button
                            onClick={() => handleViewResults(exam)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded-xl transition-all shadow-sm hover:shadow-indigo-200 text-[10px] font-black uppercase tracking-widest group/btn"
                            title="Analytics"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                            Results
                          </button>
                          <button
                            onClick={() => handleManageQuestions(exam)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-xl transition-all shadow-sm hover:shadow-primary/30 text-[10px] font-black uppercase tracking-widest"
                            title="Manage Questions"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                            Questions
                          </button>
                          <button
                            onClick={() => handleEditExam(exam)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-600 text-amber-600 hover:text-white rounded-xl transition-all shadow-sm hover:shadow-amber-200 text-[10px] font-black uppercase tracking-widest"
                            title="Edit Settings"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            Edit
                          </button>
                          <button
                            onClick={() => handlePrintExam(exam)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-900 text-slate-600 hover:text-white rounded-xl transition-all shadow-sm text-[10px] font-black uppercase tracking-widest"
                            title="Print Hardcopy"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                            Print
                          </button>
                          <button
                            onClick={() => handleDeleteExam(exam.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-xl transition-all shadow-sm hover:shadow-rose-100 text-[10px] font-black uppercase tracking-widest"
                            title="Destroy"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            Delete
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

          {/* Mobile/Tablet Card View */}
          <div className="lg:hidden space-y-6">
            {exams.map((exam) => (
              <div key={exam.id} className="bg-white rounded-[32px] p-6 shadow-xl border border-slate-100 space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <span className="px-2 py-0.5 text-[9px] font-black bg-indigo-50 text-indigo-600 rounded-md border border-indigo-100 uppercase tracking-widest">
                      {exam.examType?.replace('_', ' ') || 'Examination'}
                    </span>
                    <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">{exam.title}</h3>
                    <p className="text-[11px] text-slate-400 font-bold">
                      Created: {new Date(exam.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  
                  <button
                    onClick={() => handlePublishToggle(exam)}
                    className={`px-3 py-1.5 text-[9px] rounded-full font-black uppercase tracking-wider border transition-all ${exam.isPublished
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                      : 'bg-amber-50 text-amber-600 border-amber-100'
                      }`}
                  >
                    {exam.isPublished ? 'Live' : 'Draft'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-2xl text-xs">
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Target Class</p>
                    <p className="font-bold text-slate-800">{exam.class?.name}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Subject</p>
                    <p className="font-bold text-slate-800">{exam.subject?.name}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Duration</p>
                    <p className="font-bold text-slate-800">{exam.durationMinutes} Minutes</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Questions</p>
                    <p className="font-bold text-slate-800">{exam._count?.questions || 0} Questions</p>
                  </div>
                </div>

                {/* Console Actions - Modern Responsive Grid with full labels */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2">Console Actions</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleViewResults(exam)}
                      className="flex items-center justify-center gap-2 py-3 bg-indigo-50 active:bg-indigo-100 text-indigo-600 rounded-xl font-bold uppercase tracking-wider text-xs transition-all shadow-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                      Results
                    </button>
                    <button
                      onClick={() => handleManageQuestions(exam)}
                      className="flex items-center justify-center gap-2 py-3 bg-primary/10 active:bg-primary/20 text-primary rounded-xl font-bold uppercase tracking-wider text-xs transition-all shadow-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                      Questions
                    </button>
                    <button
                      onClick={() => handleEditExam(exam)}
                      className="flex items-center justify-center gap-2 py-3 bg-amber-50 active:bg-amber-100 text-amber-600 rounded-xl font-bold uppercase tracking-wider text-xs transition-all shadow-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      Edit
                    </button>
                    <button
                      onClick={() => handlePrintExam(exam)}
                      className="flex items-center justify-center gap-2 py-3 bg-slate-50 active:bg-slate-100 text-slate-600 rounded-xl font-bold uppercase tracking-wider text-xs transition-all shadow-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                      Print
                    </button>
                    <button
                      onClick={() => handleDeleteExam(exam.id)}
                      className="flex items-center justify-center gap-2 py-3 bg-rose-50 active:bg-rose-100 text-rose-600 rounded-xl font-bold uppercase tracking-wider text-xs transition-all shadow-sm col-span-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {exams.length === 0 && (
              <div className="bg-white rounded-[32px] p-10 text-center text-slate-500 border border-slate-100 shadow-xl">
                <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No Examinations Found</p>
                <button onClick={() => setView('create')} className="mt-4 text-primary font-black uppercase text-xs hover:underline tracking-widest italic">Create Your First CBT Core</button>
              </div>
            )}
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Access Token (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. MATH101"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary font-mono uppercase tracking-wider"
                  value={formData.token || ''}
                  onChange={(e) => setFormData({ ...formData, token: e.target.value })}
                />
                <p className="mt-1 text-[10px] text-gray-400">If set, students must enter this exact code to start taking the exam.</p>
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

      {/* VIEW: Edit Form */}
      {view === 'edit' && editingExam && (
        <div className="bg-white rounded-lg shadow p-6 max-w-2xl mx-auto">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Edit Exam Settings</h2>
          <form onSubmit={handleEditSubmit} className="space-y-4">
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
                <label className="block text-sm font-medium text-gray-700">Class (Locked)</label>
                <select
                  disabled
                  className="mt-1 block w-full rounded-md border-gray-100 bg-gray-50 text-gray-500 cursor-not-allowed shadow-sm focus:ring-0"
                  value={formData.classId}
                >
                  <option value={formData.classId}>{editingExam.class?.name} {editingExam.class?.arm}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Subject (Locked)</label>
                <select
                  disabled
                  className="mt-1 block w-full rounded-md border-gray-100 bg-gray-50 text-gray-500 cursor-not-allowed shadow-sm focus:ring-0"
                  value={formData.subjectId}
                >
                  <option value={formData.subjectId}>{editingExam.subject?.name}</option>
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
                    id="randomizeQuestionsEdit"
                    className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                    checked={formData.randomizeQuestions !== false}
                    onChange={(e) => setFormData({ ...formData, randomizeQuestions: e.target.checked })}
                  />
                  <label htmlFor="randomizeQuestionsEdit" className="text-xs font-semibold text-gray-700">Randomize Questions</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="randomizeOptionsEdit"
                    className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                    checked={formData.randomizeOptions !== false}
                    onChange={(e) => setFormData({ ...formData, randomizeOptions: e.target.checked })}
                  />
                  <label htmlFor="randomizeOptionsEdit" className="text-xs font-semibold text-gray-700">Randomize Options</label>
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Access Token (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. MATH101"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary font-mono uppercase tracking-wider"
                  value={formData.token || ''}
                  onChange={(e) => setFormData({ ...formData, token: e.target.value })}
                />
                <p className="mt-1 text-[10px] text-gray-400">If set, students must enter this exact code to start taking the exam.</p>
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
                onClick={() => {
                  setView('list');
                  setEditingExam(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-amber-500 text-white rounded-md hover:brightness-90 font-semibold"
              >
                Save Changes
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
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">Question Text</label>
                  <MathToolbar onInsert={handleInsertMathSymbolInExam} />
                </div>
                <textarea
                  className="w-full rounded-md border-gray-300 focus:ring-primary focus:border-primary text-sm p-2.5"
                  rows="3"
                  value={newQuestion.questionText}
                  onFocus={() => setActiveQuestionField('questionText')}
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
                        onFocus={() => setActiveQuestionField(`option-${index}`)}
                        onChange={(e) => updateOptionText(index, e.target.value)}
                        placeholder={`Option ${option.id.toUpperCase()}`}
                        className="flex-1 rounded-md border-gray-300 text-sm focus:ring-primary focus:border-primary px-3 py-1.5"
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
                                  {(() => {
                                    const { cleanText, diagramUrl } = parseQuestionContent(q.questionText, q.imageUrl || q.attachmentUrl);
                                    return (
                                      <>
                                        <p className="font-medium text-gray-900 mb-1">{cleanText}</p>
                                        {diagramUrl && (
                                          <div className="my-1.5">
                                            <img src={diagramUrl} alt="Diagram" className="max-h-24 rounded border border-gray-200" />
                                          </div>
                                        )}
                                      </>
                                    );
                                  })()}
                                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                                    <span>
                                      Type/Options: {q.questionType === 'essay' ? 'Essay / Theory' : (() => {
                                        try {
                                          const parsed = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
                                          return Array.isArray(parsed) ? `${parsed.length} Choices` : 'CBT';
                                        } catch (e) {
                                          return 'CBT';
                                        }
                                      })()}
                                    </span>
                                    <span>Correct: {(q.correctOption || 'A').toUpperCase()}</span>
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

            {questions.map((q, qIndex) => {
              const { cleanText, diagramUrl } = parseQuestionContent(q.questionText, q.imageUrl || q.attachmentUrl);
              return (
                <div key={q.id} className={`bg-white rounded-lg shadow p-4 border transition ${editingQuestion?.id === q.id ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-gray-200'}`}>
                  <div className="flex justify-between items-start mb-2 group">
                    <div>
                      <h4 className="font-semibold text-gray-800 text-lg pr-4">Q{qIndex + 1}. {cleanText}</h4>
                      {diagramUrl && (
                        <div className="mt-3 mb-2">
                          <img src={diagramUrl} alt="Diagram" className="max-h-56 w-auto object-contain rounded-lg border border-gray-200 shadow-sm" />
                        </div>
                      )}
                    </div>
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
                  {Array.isArray(q.options) ? (
                    q.options.map(opt => (
                      <div key={opt.id} className={`flex items-center space-x-2 ${q.correctOption === opt.id ? 'text-green-700 font-bold' : 'text-gray-600'}`}>
                        <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs border ${q.correctOption === opt.id ? 'border-green-600 bg-green-100' : 'border-gray-300'}`}>
                          {opt.id?.toUpperCase()}
                        </span>
                        <span>{opt.text}</span>
                        {q.correctOption === opt.id && <span className="text-[10px] bg-green-100 px-1 rounded ml-1">✓</span>}
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-purple-700 font-semibold italic bg-purple-50 p-2 rounded inline-block border border-purple-100">
                      Essay / Theory Question (Written Paper Examination)
                    </div>
                  )}
                </div>
              </div>
            );
          })}

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
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-blue-50 p-5 rounded-xl border border-blue-200 gap-4">
            <div>
              <h2 className="text-xl font-bold text-blue-900">{selectedExam.title} - Assessment Results</h2>
              <p className="text-sm text-blue-700">Subject: {selectedExam.subject?.name} • Class: {selectedExam.class?.name} • Total Attempts: {examResults.length}</p>
            </div>
            <div className="flex flex-wrap gap-2 items-center justify-end">
              <button
                onClick={() => setShowAnalyticsModal(true)}
                className="px-3.5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-1.5 text-xs font-bold transition-all shadow-sm"
              >
                <BarChart2 size={16} /> Visual Analytics
              </button>
              <button
                onClick={() => handlePrintPDFTranscript(null)}
                className="px-3.5 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-1.5 text-xs font-bold transition-all shadow-sm"
              >
                <Printer size={16} /> Print Transcripts (PDF)
              </button>
              <button
                onClick={handleDownloadResults}
                className="px-3.5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1.5 text-xs font-bold transition-all shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export Excel (.xlsx)
              </button>
              <button
                onClick={handleImportResults}
                disabled={importing || examResults.length === 0}
                className={`px-3.5 py-2 text-white rounded-lg flex items-center gap-1.5 text-xs font-bold transition-all shadow-sm ${importing ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:brightness-90'
                  }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {importing ? 'Importing...' : 'Import Records'}
              </button>
            </div>
          </div>

          {resultsLoading ? (
            <div className="text-center py-10 text-gray-500">Loading results...</div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Student Name</th>
                    <th className="px-4 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Score & %</th>
                    <th className="px-4 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Passed / Failed / Skipped</th>
                    <th className="px-4 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Time Taken</th>
                    <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Submission Date</th>
                    <th className="px-4 py-3 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {examResults.map((result) => {
                    const totalQ = result.totalQuestions || 0;
                    const correctQ = result.correctAnswers || 0;

                    let attemptedCount = correctQ;
                    if (result.answers) {
                      try {
                        const parsed = JSON.parse(result.answers);
                        if (parsed && typeof parsed === 'object') {
                          attemptedCount = Object.keys(parsed).filter(k => parsed[k] !== undefined && parsed[k] !== null && parsed[k] !== '').length;
                        }
                      } catch(e) {}
                    } else { attemptedCount = totalQ; }

                    const unattemptedQ = Math.max(0, totalQ - attemptedCount);
                    const failedQ = Math.max(0, attemptedCount - correctQ);

                    let timeTakenStr = 'N/A';
                    if (result.startedAt && result.submittedAt) {
                      const diffSecs = Math.max(0, Math.floor((new Date(result.submittedAt) - new Date(result.startedAt)) / 1000));
                      if (diffSecs > 0) {
                        const m = Math.floor(diffSecs / 60);
                        const s = diffSecs % 60;
                        timeTakenStr = `${m}m ${s < 10 ? '0' : ''}${s}s`;
                      }
                    }

                    const pct = selectedExam.totalMarks > 0 ? Math.round((result.score / selectedExam.totalMarks) * 100) : 0;

                    return (
                      <tr key={result.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-gray-900">
                            {result.student.user.firstName} {result.student.user.lastName}
                          </div>
                          <div className="text-xs text-gray-500 font-mono">{result.student.admissionNumber}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <div className="text-sm font-extrabold text-gray-900">{result.score} / {selectedExam.totalMarks}</div>
                          <span className={`px-2 py-0.5 inline-flex text-[10px] font-bold rounded-full mt-0.5 ${pct >= 50 ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
                            }`}>
                            {pct}%
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center text-xs">
                          <span className="font-bold text-green-600" title="Correct">{correctQ} ✓</span>
                          <span className="text-gray-300 mx-1.5">|</span>
                          <span className="font-bold text-red-500" title="Incorrect">{failedQ} ✗</span>
                          <span className="text-gray-300 mx-1.5">|</span>
                          <span className="text-gray-400 italic" title="Unattempted">{unattemptedQ} skipped</span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center text-xs font-semibold text-gray-700">
                          {timeTakenStr}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-500">
                          {new Date(result.submittedAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right text-xs font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handlePrintPDFTranscript(result)}
                              className="text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2.5 py-1 rounded-md transition-colors font-bold flex items-center gap-1"
                              title="Print Official Result Card PDF"
                            >
                              <Printer size={13} /> Transcript
                            </button>
                            <button
                              onClick={() => handleDeleteResult(result.id)}
                              className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                              title="Delete Result"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {examResults.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-6 py-10 text-center text-gray-500">
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

      {/* Visual Analytics & Distribution Modal (Feature 4) */}
      {showAnalyticsModal && selectedExam && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto relative animate-in fade-in zoom-in duration-150">
            <div className="flex justify-between items-center pb-4 border-b">
              <div>
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <BarChart2 className="text-indigo-600" size={24} /> Performance Analytics & Distribution
                </h2>
                <p className="text-xs text-gray-500">{selectedExam.title} • {selectedExam.subject?.name} • Class: {selectedExam.class?.name}</p>
              </div>
              <button onClick={() => setShowAnalyticsModal(false)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition">
                <X size={20} />
              </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-center">
                <p className="text-xs font-bold text-blue-600 uppercase">Candidates</p>
                <p className="text-2xl font-black text-blue-900 mt-1">{examResults.length}</p>
              </div>
              <div className="bg-green-50 border border-green-200 p-4 rounded-xl text-center">
                <p className="text-xs font-bold text-green-600 uppercase">Class Average</p>
                <p className="text-2xl font-black text-green-900 mt-1">
                  {examResults.length > 0 ? (examResults.reduce((a, b) => a + b.score, 0) / examResults.length).toFixed(1) : 0}
                  <span className="text-xs font-semibold text-green-700 ml-1">
                    ({selectedExam.totalMarks > 0 ? ((examResults.reduce((a, b) => a + b.score, 0) / examResults.length / selectedExam.totalMarks) * 100).toFixed(0) : 0}%)
                  </span>
                </p>
              </div>
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-center">
                <p className="text-xs font-bold text-amber-600 uppercase">Highest Score</p>
                <p className="text-2xl font-black text-amber-900 mt-1">
                  {examResults.length > 0 ? Math.max(...examResults.map(r => r.score)) : 0}
                </p>
              </div>
              <div className="bg-purple-50 border border-purple-200 p-4 rounded-xl text-center">
                <p className="text-xs font-bold text-purple-600 uppercase">Pass Rate</p>
                <p className="text-2xl font-black text-purple-900 mt-1">
                  {examResults.length > 0 ? Math.round((examResults.filter(r => (selectedExam.totalMarks > 0 ? (r.score / selectedExam.totalMarks) >= 0.5 : r.score >= 50)).length / examResults.length) * 100) : 0}%
                </p>
              </div>
            </div>

            {/* Visual Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Grade Breakdown Doughnut */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2">
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <PieChart size={16} className="text-indigo-600" /> Grade Distribution (A-F)
                </h3>
                <div className="h-64 flex items-center justify-center">
                  <Doughnut data={getGradeChartData()} options={{ responsive: true, maintainAspectRatio: false }} />
                </div>
              </div>

              {/* Score Ranges Histogram Bar Chart */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2">
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <BarChart2 size={16} className="text-indigo-600" /> Score Frequency Bell Curve
                </h3>
                <div className="h-64 flex items-center justify-center">
                  <Bar data={getHistogramChartData()} options={{ responsive: true, maintainAspectRatio: false }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CBTManagement;
