import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSchoolSettings } from '../../hooks/useSchoolSettings';
import { api } from '../../api';
import { toast } from '../../utils/toast';

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
  const [loading, setLoading] = useState(false);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [classSummary, setClassSummary] = useState([]);
  const [editingRecord, setEditingRecord] = useState(null);
  const [studentRecords, setStudentRecords] = useState([]);

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
    endDate: ''
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
    comments: ''
  });

  useEffect(() => {
    fetchClasses();
    fetchCurrentSessionAndTerm();
  }, []);

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
      comments: record.comments || ''
    });
    setShowRecordModal(true);
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
      if (editingRecord) {
        response = await api.put(`/api/quran-tracker/records/${editingRecord.id}`, recordForm);
      } else {
        response = await api.post('/api/quran-tracker/records', recordForm);
      }

      if (response.ok) {
        toast.success(editingRecord ? 'Record updated' : 'Progress recorded successfully');
        setShowRecordModal(false);
        resetRecordForm();
        setEditingRecord(null);
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
      endDate: ''
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
      comments: ''
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
                    <div className="overflow-x-auto border rounded-xl">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">Student</th>
                            <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">Records</th>
                            <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">Last Activity</th>
                            <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">Latest Status</th>
                            <th className="px-6 py-4 text-right text-[10px] font-bold text-gray-500 uppercase tracking-widest">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                          {classSummary.map(student => (
                            <tr key={student.id} className="hover:bg-gray-50 transition">
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
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right">
                                <button
                                  onClick={() => {
                                    setSelectedStudent(student);
                                    setRecordForm({ ...recordForm, studentId: student.id });
                                    setShowRecordModal(true);
                                  }}
                                  className="text-primary hover:text-primary/80 font-bold text-xs uppercase tracking-wider bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/20"
                                >
                                  + Add Progress
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
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
                <h3 className="text-2xl font-black text-gray-900">{editingRecord ? 'Update' : 'Record'} Progress</h3>
                <p className="text-gray-400 text-sm font-medium">Tracking for {selectedStudent?.user?.firstName || 'Student'}</p>
              </div>
              <button onClick={() => { setShowRecordModal(false); setEditingRecord(null); }} className="p-2 hover:bg-gray-100 rounded-full transition">
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
    </div>
  );
};

export default QuranTracker;
