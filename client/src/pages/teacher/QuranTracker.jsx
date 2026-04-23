import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import useSchoolSettings from '../../hooks/useSchoolSettings';
import { api, API_BASE_URL } from '../../api';
import { toast } from '../../utils/toast';
import { useReactToPrint } from 'react-to-print';
import { QRCodeSVG } from 'qrcode.react';

const SURAH_LIST = [
  "Al-Fatihah", "Al-Baqarah", "Aali 'Imran", "An-Nisa'", "Al-Ma'idah", "Al-An'am", "Al-A'raf", "Al-Anfal", "At-Tawbah", "Yunus",
  "Hud", "Yusuf", "Ar-Ra'd", "Ibrahim", "Al-Hijr", "An-Nahl", "Al-Isra'", "Al-Kahf", "Maryam", "Ta-Ha",
  "Al-Anbiya'", "Al-Hajj", "Al-Mu'minun", "An-Nur", "Al-Furqan", "Ash-Shu'ara'", "An-Naml", "Al-Qasas", "Al-Ankabut", "Ar-Rum",
  "Luqman", "As-Sajdah", "Al-Ahzab", "Saba'", "Fatir", "Ya-Sin", "As-Saffat", "Sad", "Az-Zumar", "Ghafir",
  "Fussilat", "Ash-Shura", "Az-Zukhruf", "Ad-Dukhan", "Al-Jathiyah", "Al-Ahqaf", "Muhammad", "Al-Fath", "Al-Hujurat", "Qaf",
  "Adh-Dhariyat", "At-Tur", "An-Najm", "Al-Qamar", "Ar-Rahman", "Al-Waqi'ah", "Al-Hadid", "Al-Mujadilah", "Al-Hashr", "Al-Mumtahanah",
  "As-Saff", "Al-Jumu'ah", "Al-Munafiqun", "At-Taghabun", "At-Talaq", "At-Tahrim", "Al-Mulk", "Al-Qalam", "Al-Haqqah", "Al-Ma'arij",
  "Nuh", "Al-Jinn", "Al-Muzzammil", "Al-Muddaththir", "Al-Qiyamah", "Al-Insan", "Al-Mursalat", "An-Naba'", "An-Nazi'at", "'Abasa",
  "At-Takwir", "Al-Infitar", "Al-Mutaffifin", "Al-Inshiqaq", "Al-Buruj", "At-Tariq", "Al-A'la", "Al-Ghashiyah", "Al-Fajr", "Al-Balad",
  "Ash-Shams", "Al-Layl", "Ad-Duha", "Ash-Sharh", "At-Tin", "Al-'Alaq", "Al-Qadr", "Al-Bayyinah", "Az-Zalzalah", "Al-'Adiyat",
  "Al-Qari'ah", "At-Takathur", "Al-'Asr", "Al-Humazah", "Al-Fil", "Quraysh", "Al-Ma'un", "Al-Kawthar", "Al-Kafirun", "An-Nasr",
  "Al-Masad", "Al-Ikhlas", "Al-Falaq", "An-Nas"
];

const QuranTracker = () => {
  const { user } = useAuth();
  const { settings } = useSchoolSettings();

  const [activeTab, setActiveTab] = useState('targets'); // targets, records, summary, viewer
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [students, setStudents] = useState([]);
  const [targets, setTargets] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [terms, setTerms] = useState([]);
  const [quranSubjects, setQuranSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [classSummary, setClassSummary] = useState([]);
  const [editingRecord, setEditingRecord] = useState(null);
  const [studentRecords, setStudentRecords] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printType, setPrintType] = useState('weekly');
  const [printStudent, setPrintStudent] = useState(null);
  const [printRecords, setPrintRecords] = useState([]);

  const componentRef = useRef();
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `${printStudent?.user?.firstName || 'Student'}_Quran_Report`,
  });

  const [targetForm, setTargetForm] = useState({
    classId: '',
    sessionId: '',
    termId: '',
    targetType: 'memorization',
    period: 'daily',
    juzStart: '',
    juzEnd: '',
    surahStart: '',
    surahEnd: '',
    ayahStart: '',
    ayahEnd: '',
    pagesCount: '',
    description: '',
    startDate: '',
    endDate: '',
    subjectId: ''
  });

  const [recordForm, setRecordForm] = useState({
    studentId: '',
    date: new Date().toISOString().split('T')[0],
    type: 'memorization',
    juz: '',
    surah: '',
    ayahStart: '',
    ayahEnd: '',
    pages: '',
    status: 'Good',
    comments: '',
    subjectId: ''
  });

  useEffect(() => {
    fetchClasses();
    fetchCurrentSessionAndTerm();
    fetchQuranSubjects();
  }, []);

  const fetchQuranSubjects = async () => {
    try {
      const resp = await api.get('/api/subjects');
      if (resp.ok) {
        const allSubjects = await resp.json();
        // Look for subjects that are in a department named "Quran" or just show all for flexibility
        setQuranSubjects(allSubjects);
      }
    } catch (error) {
      console.error('Error fetching Quran subjects:', error);
    }
  };

  const fetchCurrentSessionAndTerm = async () => {
    try {
      const resp = await api.get('/api/academic-sessions');
      const sessionsData = await resp.json();
      setSessions(sessionsData);
      const currentSession = sessionsData.find(s => s.isCurrent);
      
      const respTerms = await api.get('/api/terms');
      const termsData = await respTerms.json();
      setTerms(termsData);
      const currentTerm = termsData.find(t => t.isCurrent);

      if (currentSession && currentTerm) {
        setTargetForm(prev => ({
          ...prev,
          sessionId: currentSession.id,
          termId: currentTerm.id
        }));
      }
    } catch (error) {
      console.error('Error fetching session/term:', error);
    }
  };

  useEffect(() => {
    if (selectedClassId) {
      fetchTargets();
      fetchStudents();
      if (activeTab === 'summary') {
        fetchClassSummary();
      }
    }
  }, [selectedClassId, activeTab]);

  const fetchClasses = async () => {
    try {
      const response = await api.get('/api/classes');
      const data = await response.json();
      setClasses(data);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchSessions = async () => {
    try {
      const response = await api.get('/api/academic-sessions');
      const data = await response.json();
      setSessions(data);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  const fetchTerms = async () => {
    try {
      const response = await api.get('/api/terms');
      const data = await response.json();
      setTerms(data);
    } catch (error) {
      console.error('Error fetching terms:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await api.get(`/api/students?classId=${selectedClassId}`);
      const data = await response.json();
      setStudents(data);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchTargets = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/quran-tracker/targets/${selectedClassId}`);
      const data = await response.json();
      setTargets(data);
    } catch (error) {
      console.error('Error fetching targets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClassSummary = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/quran-tracker/class-summary/${selectedClassId}`);
      const data = await response.json();
      setClassSummary(data);
    } catch (error) {
      console.error('Error fetching class summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentRecords = async (studentId) => {
    try {
      setLoading(true);
      const resp = await api.get(`/api/quran-tracker/records/${studentId}`);
      const data = await resp.json();
      setStudentRecords(data);
    } catch (err) {
      toast.error('Failed to fetch records');
    } finally {
      setLoading(false);
    }
  };

  const handleEditRecord = (record) => {
    setEditingRecord(record);
    setRecordForm({
      studentId: record.studentId,
      date: new Date(record.date).toISOString().split('T')[0],
      type: record.type,
      juz: record.juz || '',
      surah: record.surah || '',
      ayahStart: record.ayahStart || '',
      ayahEnd: record.ayahEnd || '',
      pages: record.pages || '',
      status: record.status,
      comments: record.comments || '',
      subjectId: record.subjectId || ''
    });
    setShowRecordModal(true);
  };

  const handleOpenPrint = (student) => {
    setPrintStudent(student);
    if (activeTab === 'records' && student.id === selectedStudent?.id) {
       setPrintRecords(studentRecords);
    } else {
       // student summary might already have some records if passed from backend summary
       // but safer to fetch or use student.quranRecords if loaded
       setPrintRecords(student.quranRecords || []);
    }
    setPrintType('weekly');
    setShowPrintModal(true);
  };

  const handleDeleteRecord = async (id, studentId) => {
    if (!confirm('Are you sure you want to delete this record?')) return;
    try {
      const resp = await api.delete(`/api/quran-tracker/records/${id}`);
      if (resp.ok) {
        toast.success('Record deleted');
        fetchStudentRecords(studentId);
        fetchClassSummary();
      }
    } catch (err) {
      toast.error('Deletion failed');
    }
  };

  const handleCreateTarget = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/api/quran-tracker/targets', {
        ...targetForm,
        classId: selectedClassId
      });

      if (response.ok) {
        toast.success('Target created successfully');
        setShowTargetModal(false);
        fetchTargets();
        resetTargetForm();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create target');
      }
    } catch (error) {
      toast.error('Failed to create target');
    }
  };

  const handleDeleteTarget = async (id) => {
    if (!confirm('Delete this target?')) return;
    try {
      const response = await api.delete(`/api/quran-tracker/targets/${id}`);
      if (response.ok) {
        toast.success('Target deleted');
        fetchTargets();
      }
    } catch (error) {
      toast.error('Failed to delete target');
    }
  };

  const handleAddRecord = async (e) => {
    e.preventDefault();
    try {
      let response;
      if (isBulkMode) {
        response = await api.post('/api/quran-tracker/records/bulk', {
          ...recordForm,
          studentIds: selectedStudentIds
        });
      } else if (editingRecord) {
        response = await api.put(`/api/quran-tracker/records/${editingRecord.id}`, recordForm);
      } else {
        response = await api.post('/api/quran-tracker/records', recordForm);
      }

      if (response.ok) {
        toast.success(isBulkMode ? 'Bulk update successful' : editingRecord ? 'Record updated' : 'Progress recorded successfully');
        setShowRecordModal(false);
        resetRecordForm();
        setEditingRecord(null);
        setIsBulkMode(false);
        setSelectedStudentIds([]);
        if (selectedStudent) {
          fetchStudentRecords(selectedStudent.id);
        }
        fetchClassSummary();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to record progress');
      }
    } catch (error) {
      toast.error('Failed to record progress');
    }
  };

  const resetTargetForm = () => {
    setTargetForm({
      classId: '',
      sessionId: '',
      termId: '',
      targetType: 'memorization',
      period: 'daily',
      juzStart: '',
      juzEnd: '',
      surahStart: '',
      surahEnd: '',
      ayahStart: '',
      ayahEnd: '',
      pagesCount: '',
      description: '',
      startDate: '',
      endDate: '',
      subjectId: ''
    });
  };

  const resetRecordForm = () => {
    setRecordForm({
      studentId: '',
      date: new Date().toISOString().split('T')[0],
      type: 'memorization',
      juz: '',
      surah: '',
      ayahStart: '',
      ayahEnd: '',
      pages: '',
      status: 'Good',
      comments: '',
      subjectId: ''
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Excellent': return 'bg-green-100 text-green-800';
      case 'Good': return 'bg-blue-100 text-blue-800';
      case 'Fair': return 'bg-yellow-100 text-yellow-800';
      case 'Poor': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Qur'an Memorization Tracker</h1>
          <p className="text-gray-600">Monitor and track student Qur'an memorization progress</p>
        </div>
        <div className="flex gap-2">
          {selectedClassId && activeTab === 'targets' && (
            <button
              onClick={() => setShowTargetModal(true)}
              className="bg-primary text-white px-4 py-2 rounded-md hover:brightness-90 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Set Target
            </button>
          )}
          {selectedClassId && activeTab === 'records' && (
            <button
              onClick={() => setShowRecordModal(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Progress
            </button>
          )}
        </div>
      </div>

      {/* Class Selection */}
      <div className="bg-white p-4 rounded-lg shadow">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Class</label>
        <select
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
          className="w-full md:w-1/3 border rounded-md px-3 py-2"
        >
          <option value="">-- Choose Class --</option>
          {classes.map(c => (
            <option key={c.id} value={c.id}>{c.name} {c.arm}</option>
          ))}
        </select>
      </div>

      {selectedClassId && (
        <>
          {/* Tabs */}
          <div className="bg-white rounded-lg shadow">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveTab('targets')}
                  className={`px-6 py-3 border-b-2 font-medium text-sm ${activeTab === 'targets'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  Targets
                </button>
                <button
                  onClick={() => setActiveTab('records')}
                  className={`px-6 py-3 border-b-2 font-medium text-sm ${activeTab === 'records'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  Student History
                </button>
                <button
                  onClick={() => setActiveTab('summary')}
                  className={`px-6 py-3 border-b-2 font-medium text-sm ${activeTab === 'summary'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  Class Summary
                </button>
                <button
                  onClick={() => setActiveTab('viewer')}
                  className={`px-6 py-3 border-b-2 font-medium text-sm ${activeTab === 'viewer'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  Quran Viewer
                </button>
              </nav>
            </div>

            <div className="p-6">
              {/* Targets Tab */}
              {activeTab === 'targets' && (
                <div className="space-y-4">
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    </div>
                  ) : targets.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <p className="mt-2 text-gray-500">No targets set for this class yet</p>
                      <button
                        onClick={() => setShowTargetModal(true)}
                        className="mt-4 text-primary hover:underline"
                      >
                        Create your first target
                      </button>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {targets.map(target => (
                        <div key={target.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${target.targetType === 'memorization' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                                }`}>
                                {target.targetType}
                              </span>
                              <span className="ml-2 px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                {target.period}
                              </span>
                            </div>
                            <button
                              onClick={() => handleDeleteTarget(target.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                          {target.subject && (
                            <div className="mb-2">
                              <span className="text-[10px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase tracking-tighter">
                                {target.subject.name}
                              </span>
                            </div>
                          )}
                          <div className="space-y-2 text-sm">
                            {target.surahStart && (
                              <p><span className="font-medium">Surah:</span> {target.surahStart} {target.surahEnd && `- ${target.surahEnd}`}</p>
                            )}
                            {target.juzStart && (
                              <p><span className="font-medium">Juz:</span> {target.juzStart} {target.juzEnd && `- ${target.juzEnd}`}</p>
                            )}
                            {target.ayahStart && (
                              <p><span className="font-medium">Ayah:</span> {target.ayahStart} {target.ayahEnd && `- ${target.ayahEnd}`}</p>
                            )}
                            {target.pagesCount && (
                              <p><span className="font-medium">Pages:</span> {target.pagesCount}</p>
                            )}
                            {target.description && (
                              <p className="text-gray-600 italic">{target.description}</p>
                            )}
                            <p className="text-gray-500 text-xs">
                              {new Date(target.startDate).toLocaleDateString()} - {new Date(target.endDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Records Tab -> Student History */}
              {activeTab === 'records' && (
                <div className="space-y-6">
                  <div className="bg-gray-50 p-4 rounded-lg flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Select Student to View History</label>
                      <select
                        value={selectedStudent?.id || ''}
                        onChange={(e) => {
                          const student = students.find(s => s.id === parseInt(e.target.value));
                          setSelectedStudent(student);
                          if (student) fetchStudentRecords(student.id);
                        }}
                        className="w-full border rounded-md px-3 py-2 bg-white"
                      >
                        <option value="">-- Select Student --</option>
                        {students.map(s => (
                          <option key={s.id} value={s.id}>{s.user.firstName} {s.user.lastName}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2">
                       <button
                        onClick={() => handleOpenPrint(selectedStudent)}
                        className="bg-white text-gray-700 border border-gray-200 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition flex items-center gap-2"
                      >
                        🖨️ Report
                      </button>
                    </div>
                  </div>

                  {loading ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    </div>
                  ) : !selectedStudent ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed">
                      <p className="text-gray-500">Pick a student above to see their full memorization timeline</p>
                    </div>
                  ) : studentRecords.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <p className="text-gray-500">No records found for {selectedStudent.user.firstName}</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {studentRecords.map(record => (
                        <div key={record.id} className="bg-white border rounded-xl p-4 hover:shadow-sm transition flex justify-between items-center">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-bold text-gray-900">{new Date(record.date).toLocaleDateString()}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${getStatusColor(record.status)}`}>
                                {record.status}
                              </span>
                              <span className="text-[10px] text-gray-400 font-medium px-2 py-0.5 bg-gray-50 rounded-full border">
                                {record.type}
                              </span>
                              {record.subject && (
                                <span className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full uppercase tracking-tighter border border-emerald-100">
                                  {record.subject.name}
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-700">
                              {record.surah && <span className="mr-3">Surah: <span className="font-medium">{record.surah}</span></span>}
                              {record.juz && <span className="mr-3">Juz: <span className="font-medium">{record.juz}</span></span>}
                              {(record.ayahStart || record.ayahEnd) && (
                                <span className="mr-3">Ayah: <span className="font-medium">{record.ayahStart || '?'}-{record.ayahEnd || '?'}</span></span>
                              )}
                              {record.pages && <span>Pages: <span className="font-medium">{record.pages}</span></span>}
                            </div>
                            {record.comments && <p className="text-xs text-gray-500 mt-2 italic">"{record.comments}"</p>}
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleEditRecord(record)}
                              className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition"
                              title="Edit"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button 
                              onClick={() => handleDeleteRecord(record.id, record.studentId)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                              title="Delete"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Summary Tab */}
              {activeTab === 'summary' && (
                <div className="space-y-4">
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    </div>
                  ) : classSummary.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <p className="text-gray-500">No students found in this class</p>
                    </div>
                  ) : (
                    <>
                      {selectedStudentIds.length > 0 && (
                        <div className="sticky top-0 z-20 bg-primary/10 backdrop-blur-md border-b border-primary/20 p-4 flex justify-between items-center animate-slideIn">
                          <div className="flex items-center gap-3">
                            <span className="bg-primary text-white text-xs font-black px-3 py-1 rounded-full">{selectedStudentIds.length} Selected</span>
                            <p className="text-sm font-bold text-primary">Apply bulk progress update</p>
                          </div>
                          <div className="flex gap-2">
                             <button
                              onClick={() => {
                                setIsBulkMode(true);
                                setShowRecordModal(true);
                              }}
                              className="bg-primary text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:shadow-lg transition"
                            >
                              Bulk Update
                            </button>
                            <button
                              onClick={() => setSelectedStudentIds([])}
                              className="text-gray-500 hover:text-gray-700 text-xs font-bold px-3 py-2"
                            >
                              Deselect All
                            </button>
                          </div>
                        </div>
                      )}
                      <div className="overflow-x-auto border rounded-xl">
                        <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-4 text-left">
                              <input 
                                type="checkbox" 
                                className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                                checked={selectedStudentIds.length === classSummary.length && classSummary.length > 0}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedStudentIds(classSummary.map(s => s.id));
                                  else setSelectedStudentIds([]);
                                }}
                              />
                            </th>
                            <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">Student</th>
                            <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">Records</th>
                            <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">Last Activity</th>
                            <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">Latest Status</th>
                            <th className="px-6 py-4 text-right text-[10px] font-bold text-gray-500 uppercase tracking-widest">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                          {classSummary.map(student => (
                            <tr key={student.id} className={`hover:bg-gray-50 transition ${selectedStudentIds.includes(student.id) ? 'bg-primary/5' : ''}`}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <input 
                                  type="checkbox" 
                                  className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                                  checked={selectedStudentIds.includes(student.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) setSelectedStudentIds([...selectedStudentIds, student.id]);
                                    else setSelectedStudentIds(selectedStudentIds.filter(id => id !== student.id));
                                  }}
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-semibold text-gray-900">
                                  {student.user.firstName} {student.user.lastName}
                                </div>
                                <div className="text-xs text-gray-400">{student.admissionNumber}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                <span className="bg-gray-100 px-2 py-0.5 rounded-full font-medium">{student.quranRecords.length} entries</span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {student.quranRecords[0] ? new Date(student.quranRecords[0].date).toLocaleDateString() : '—'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {student.quranRecords[0] && (
                                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${getStatusColor(student.quranRecords[0].status)}`}>
                                    {student.quranRecords[0].status}
                                  </span>
                                )}
                                {student.quranRecords[0]?.subject && (
                                  <div className="mt-1 text-[9px] font-black text-gray-400 uppercase tracking-tighter">
                                    {student.quranRecords[0].subject.name}
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right">
                                <button
                                  onClick={() => {
                                    setSelectedStudent(student);
                                    setRecordForm({ ...recordForm, studentId: student.id });
                                    setIsBulkMode(false);
                                    setShowRecordModal(true);
                                  }}
                                  className="text-primary hover:text-primary/80 font-bold text-xs uppercase tracking-wider bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/20"
                                >
                                  + Record
                                </button>
                                <button
                                  onClick={() => handleOpenPrint(student)}
                                  className="ml-2 text-gray-500 hover:text-gray-700 font-bold text-xs uppercase tracking-wider bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200"
                                >
                                  🖨️ Report
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
                </div>
              )}

              {/* Quran Viewer Tab */}
              {activeTab === 'viewer' && (
                <div className="h-[700px] border rounded-xl overflow-hidden shadow-sm">
                   <iframe 
                    src="https://quran.com" 
                    title="Al-Qur'an Reference"
                    className="w-full h-full border-0"
                    loading="lazy"
                  />
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Target Modal */}
      {showTargetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Set Memorization Target</h3>
              <button onClick={() => setShowTargetModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleCreateTarget} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Academic Session *</label>
                  <select
                    value={targetForm.sessionId}
                    onChange={(e) => setTargetForm({ ...targetForm, sessionId: e.target.value })}
                    className="w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 outline-none"
                    required
                  >
                    <option value="">Select Session</option>
                    {sessions.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Term *</label>
                  <select
                    value={targetForm.termId}
                    onChange={(e) => setTargetForm({ ...targetForm, termId: e.target.value })}
                    className="w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 outline-none"
                    required
                  >
                    <option value="">Select Term</option>
                    {terms.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Target Type *</label>
                  <select
                    value={targetForm.targetType}
                    onChange={(e) => setTargetForm({ ...targetForm, targetType: e.target.value })}
                    className="w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 outline-none"
                    required
                  >
                    <option value="memorization">Memorization</option>
                    <option value="revision">Revision</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Period *</label>
                  <select
                    value={targetForm.period}
                    onChange={(e) => setTargetForm({ ...targetForm, period: e.target.value })}
                    className="w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 outline-none"
                    required
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="termly">Termly</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Subject (Optional)</label>
                <select
                  value={targetForm.subjectId}
                  onChange={(e) => setTargetForm({ ...targetForm, subjectId: e.target.value })}
                  className="w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  <option value="">-- Generic Quran Tracking --</option>
                  {quranSubjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="bg-gray-50 p-6 rounded-2xl space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Juz Start</label>
                    <input
                      type="number" min="1" max="30"
                      value={targetForm.juzStart}
                      onChange={(e) => setTargetForm({ ...targetForm, juzStart: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Juz End</label>
                    <input
                      type="number" min="1" max="30"
                      value={targetForm.juzEnd}
                      onChange={(e) => setTargetForm({ ...targetForm, juzEnd: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Surah Start</label>
                    <select
                      value={targetForm.surahStart}
                      onChange={(e) => setTargetForm({ ...targetForm, surahStart: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="">-- Select Surah --</option>
                      {SURAH_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Surah End</label>
                    <select
                      value={targetForm.surahEnd}
                      onChange={(e) => setTargetForm({ ...targetForm, surahEnd: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="">-- Select Surah --</option>
                      {SURAH_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Start Date *</label>
                  <input
                    type="date"
                    value={targetForm.startDate}
                    onChange={(e) => setTargetForm({ ...targetForm, startDate: e.target.value })}
                    className="w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">End Date *</label>
                  <input
                    type="date"
                    value={targetForm.endDate}
                    onChange={(e) => setTargetForm({ ...targetForm, endDate: e.target.value })}
                    className="w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setShowTargetModal(false)}
                  className="px-6 py-3 font-bold text-gray-400 hover:text-gray-600 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 bg-primary text-white font-bold rounded-xl hover:shadow-lg transition transform hover:-translate-y-0.5"
                >
                  Create Target
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Modal */}
      {showRecordModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-lg border border-gray-100">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-black text-gray-900">{isBulkMode ? 'Bulk' : editingRecord ? 'Update' : 'Record'} Progress</h3>
                <p className="text-gray-400 text-sm font-medium">Tracking for {isBulkMode ? `${selectedStudentIds.length} Students` : selectedStudent?.user?.firstName || 'Student'}</p>
              </div>
              <button 
                onClick={() => { 
                  setShowRecordModal(false); 
                  setEditingRecord(null); 
                  setIsBulkMode(false);
                }} 
                className="p-2 hover:bg-gray-100 rounded-full transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleAddRecord} className="space-y-6">
              <div className="bg-gray-50/50 p-6 rounded-2xl space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Date *</label>
                    <input
                      type="date"
                      value={recordForm.date}
                      onChange={(e) => setRecordForm({ ...recordForm, date: e.target.value })}
                      className="w-full border-0 rounded-xl px-4 py-3 bg-white shadow-sm focus:ring-2 focus:ring-primary/20 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Type *</label>
                    <select
                      value={recordForm.type}
                      onChange={(e) => setRecordForm({ ...recordForm, type: e.target.value })}
                      className="w-full border-0 rounded-xl px-4 py-3 bg-white shadow-sm focus:ring-2 focus:ring-primary/20 outline-none"
                      required
                    >
                      <option value="memorization">Memorization</option>
                      <option value="revision">Revision</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Juz</label>
                    <input
                      type="number" min="1" max="30"
                      value={recordForm.juz}
                      onChange={(e) => setRecordForm({ ...recordForm, juz: e.target.value })}
                      className="w-full border-0 rounded-xl px-4 py-3 bg-white shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Surah</label>
                    <select
                      value={recordForm.surah}
                      onChange={(e) => setRecordForm({ ...recordForm, surah: e.target.value })}
                      className="w-full border-0 rounded-xl px-4 py-3 bg-white shadow-sm"
                    >
                      <option value="">-- Choose Surah --</option>
                      {SURAH_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Subject (Optional)</label>
                  <select
                    value={recordForm.subjectId}
                    onChange={(e) => setRecordForm({ ...recordForm, subjectId: e.target.value })}
                    className="w-full border-0 rounded-xl px-4 py-3 bg-white shadow-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    <option value="">-- Generic Quran Tracking --</option>
                    {quranSubjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Ayah Start</label>
                    <input
                      type="number" min="1"
                      value={recordForm.ayahStart}
                      onChange={(e) => setRecordForm({ ...recordForm, ayahStart: e.target.value })}
                      className="w-full border-0 rounded-xl px-4 py-3 bg-white shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Ayah End</label>
                    <input
                      type="number" min="1"
                      value={recordForm.ayahEnd}
                      onChange={(e) => setRecordForm({ ...recordForm, ayahEnd: e.target.value })}
                      className="w-full border-0 rounded-xl px-4 py-3 bg-white shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Pages</label>
                    <input
                      type="number" min="0" step="0.25"
                      value={recordForm.pages}
                      onChange={(e) => setRecordForm({ ...recordForm, pages: e.target.value })}
                      className="w-full border-0 rounded-xl px-4 py-3 bg-white shadow-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Performance *</label>
                <div className="flex gap-2">
                  {['Poor', 'Fair', 'Good', 'Excellent'].map(status => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setRecordForm({ ...recordForm, status })}
                      className={`flex-1 py-3 rounded-xl text-xs font-bold transition border-2 ${
                        recordForm.status === status 
                          ? 'bg-primary border-primary text-white shadow-lg' 
                          : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Teacher Comments</label>
                <textarea
                  value={recordForm.comments}
                  onChange={(e) => setRecordForm({ ...recordForm, comments: e.target.value })}
                  className="w-full border rounded-2xl px-4 py-3 bg-gray-50/50 min-h-[100px] outline-none focus:ring-2 focus:ring-primary/10"
                  placeholder="Optional notes about performance..."
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowRecordModal(false); setEditingRecord(null); }}
                  className="flex-1 py-4 font-bold text-gray-400 hover:text-gray-600 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-4 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] transition"
                >
                  {editingRecord ? 'Update Record' : 'Save Progress'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print Report Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Generate Student Report</h2>
                <div className="flex gap-2 mt-2">
                  {['daily', 'weekly', 'monthly', 'session'].map(t => (
                    <button
                      key={t}
                      onClick={() => setPrintType(t)}
                      className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                        printType === t ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-white text-gray-400 border border-gray-200'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => handlePrint()}
                  className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center gap-2"
                >
                  Confirm & Print
                </button>
                <button 
                  onClick={() => setShowPrintModal(false)}
                  className="p-2.5 bg-gray-100 text-gray-500 rounded-xl hover:bg-gray-200 transition-all"
                >
                  Close View
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-8 bg-slate-100 custom-scrollbar">
              <div className="md:hidden flex items-center justify-center gap-2 py-4 text-emerald-600 font-black text-[10px] uppercase tracking-widest animate-pulse">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
                Pinch or scroll to see whole report
              </div>

              <div className="overflow-x-auto pb-12 flex justify-center no-scrollbar">
                <div ref={componentRef} className="report-card-scaler origin-top scale-[0.42] xs:scale-[0.55] md:scale-90 lg:scale-100 transition-transform duration-500 shadow-2xl">
                  <QuranReportCard 
                    student={printStudent} 
                    records={printRecords} 
                    type={printType} 
                    schoolSettings={settings} 
                    teacher={user}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


// Printable Report Component
const QuranReportCard = ({ student, records, type, schoolSettings, teacher }) => {
  const filteredRecords = records.filter(r => {
    const rDate = new Date(r.date);
    const now = new Date();
    if (type === 'daily') return rDate.toDateString() === now.toDateString();
    if (type === 'weekly') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return rDate >= weekAgo;
    }
    if (type === 'monthly') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return rDate >= monthAgo;
    }
    // 'session' or anything else returns all
    return true;
  });

  const reportColor = schoolSettings?.reportColorScheme || schoolSettings?.primaryColor || '#064e3b';
  const reportFont = schoolSettings?.reportFontFamily || 'serif';

  return (
    <div className="p-8 bg-white text-black min-h-[297mm] border-[12px] print:border-8 print:p-4 mx-auto w-[210mm]" style={{ fontFamily: reportFont, borderColor: reportColor }}>
      {/* Official Header */}
      <div className="grid grid-cols-[96px_1fr_96px] items-start gap-4 mb-6 pb-4 border-b-2 border-slate-200">
        <div className="w-24 h-24 flex-shrink-0">
          {schoolSettings?.logoUrl && (
            <img
              src={schoolSettings.logoUrl.startsWith('data:') || schoolSettings.logoUrl.startsWith('http') ? schoolSettings.logoUrl : `${API_BASE_URL}${schoolSettings.logoUrl.startsWith('/') ? schoolSettings.logoUrl : '/' + schoolSettings.logoUrl}`}
              alt="Logo"
              className="w-full h-full object-contain"
            />
          )}
        </div>

        <div className="text-center flex flex-col items-center justify-center">
          <h1 className="text-2xl font-black uppercase tracking-wider leading-none text-emerald-900 mb-1" style={{ color: reportColor }}>
            {schoolSettings?.schoolName || 'SCHOOL NAME'}
          </h1>
          <p className="text-xs font-black italic text-gray-800 mb-1 uppercase tracking-normal w-full text-center">{schoolSettings?.schoolMotto || 'Excellence and Dedication'}</p>
          <p className="text-[9px] font-black text-gray-600 max-w-[500px] leading-tight text-center">{schoolSettings?.address || 'School Address Location'} | TEL: {schoolSettings?.phone || '000'} | Email: {schoolSettings?.email || 'email@school.com'}</p>

          <div className="mt-2 border-b-2 inline-block px-4 pb-0" style={{ borderColor: reportColor }}>
            <h2 className="text-lg font-black uppercase tracking-wider italic">
              Official Qur'an Progress Report
            </h2>
          </div>
        </div>

        <div className="w-24 h-28 border-2 border-black bg-gray-50 flex-shrink-0 relative overflow-hidden">
          {(() => {
            const photo = student?.user?.photoUrl || student?.photoUrl;
            return photo ? (
              <img src={photo.startsWith('data:') || photo.startsWith('http') ? photo : `${API_BASE_URL}${photo}`} alt="Student" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[10px] text-center p-1 font-bold text-gray-300">PHOTO</div>
            );
          })()}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-8 bg-slate-50 p-6 rounded-2xl border border-slate-100">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Student Particulars</p>
          <p className="text-xl font-black text-slate-900 uppercase tracking-tight">{student?.user?.firstName} {student?.user?.lastName}</p>
          <p className="text-sm font-bold text-emerald-700 uppercase">{student?.classModel?.name} {student?.classModel?.arm}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Registration No</p>
          <p className="text-xl font-bold italic tracking-tighter">{student?.admissionNumber}</p>
          <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest">{type} review • {new Date().toLocaleDateString()}</p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-emerald-900 mb-4 flex items-center gap-2">
          Chronological Summary
          <span className="h-0.5 flex-1 bg-emerald-100"></span>
        </h3>
        
        {filteredRecords.length === 0 ? (
          <p className="text-center py-12 text-slate-400 italic font-medium">No progress entries recorded for this {type} period.</p>
        ) : (
          <table className="w-full border-collapse border-2 border-black">
            <thead>
              <tr className="bg-emerald-900 text-white text-[10px] font-black uppercase tracking-widest" style={{ backgroundColor: reportColor }}>
                <th className="p-3 text-left border border-black">Date</th>
                <th className="p-3 text-left border border-black">Content</th>
                <th className="p-3 text-left border border-black">Verses</th>
                <th className="p-3 text-center border border-black">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 italic">
              {filteredRecords.map(record => (
                <tr key={record.id} className="text-sm font-bold">
                  <td className="p-3 text-slate-600 border border-black">{new Date(record.date).toLocaleDateString()}</td>
                  <td className="p-3 text-slate-900 border border-black">
                    {record.surah || `Juz ${record.juz}`} ({record.type})
                    {record.subject && (
                      <div className="text-[9px] uppercase font-black text-emerald-600">[{record.subject.name}]</div>
                    )}
                  </td>
                  <td className="p-3 text-slate-500 border border-black">{record.ayahStart}-{record.ayahEnd || record.ayahStart}</td>
                  <td className="p-3 text-center border border-black">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      record.status === 'Excellent' ? 'text-green-700' :
                      record.status === 'Good' ? 'text-blue-700' :
                      record.status === 'Fair' ? 'text-yellow-700' : 'text-red-700'
                    }`}>
                      {record.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-12 grid grid-cols-2 gap-12 items-end">
        <div className="text-center">
          <div className="h-10 flex flex-col items-center justify-center mb-1">
             {teacher?.teacher?.signatureUrl ? (
                <img 
                  src={teacher.teacher.signatureUrl.startsWith('data:') || teacher.teacher.signatureUrl.startsWith('http') ? teacher.teacher.signatureUrl : `${API_BASE_URL}${teacher.teacher.signatureUrl}`} 
                  alt="Teacher Signature" 
                  className="h-10 w-auto mix-blend-multiply" 
                />
             ) : (
                <div className="h-[1px] w-full bg-slate-400"></div>
             )}
          </div>
          <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Quran Teacher's Signature</p>
          <p className="text-[8px] font-bold text-slate-400 capitalize">{teacher?.firstName} {teacher?.lastName}</p>
        </div>
        <div className="text-center">
          <div className="h-10 flex flex-col items-center justify-end mb-1">
              <div className="h-[1px] w-full bg-slate-400"></div>
          </div>
          <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Registrar Seal</p>
          <div className="mt-2 flex justify-center">
            <QRCodeSVG 
              value={`${window.location.origin}/dashboard/quran-progress?studentId=${student?.id}`}
              size={40}
              level="H"
            />
          </div>
        </div>
      </div>
      
      <div className="mt-auto pt-16 flex justify-between items-center text-[8px] font-black text-slate-300 uppercase tracking-widest">
        <span>Official school document • strictly for internal monitoring</span>
        <span>Generated by {schoolSettings?.schoolName || 'Kuntau Academy'}</span>
      </div>
    </div>
  );
};



<style>{`
  .report-card-scaler {
    width: 210mm;
    transform-origin: top center;
    margin: 0 auto;
    transition: transform 0.3s ease-out;
  }

  @media (max-width: 1024px) {
    .report-card-scaler { transform: scale(0.85); }
  }

  @media (max-width: 768px) {
    .report-card-scaler { transform: scale(0.7); }
  }

  @media (max-width: 640px) {
    .report-card-scaler {
       transform: scale(0.55);
       transform-origin: top left;
       margin-left: 0;
    }
  }

  @media (max-width: 480px) {
    .report-card-scaler { transform: scale(0.42); }
  }

  @media (max-width: 380px) {
    .report-card-scaler { transform: scale(0.35); }
  }
  
  @media print {
    .report-card-scaler { 
      transform: none !important; 
      width: 210mm !important;
      margin: 0 !important;
    }
  }
`}</style>

export default QuranTracker;
