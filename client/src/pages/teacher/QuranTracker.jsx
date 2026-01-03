import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSchoolSettings } from '../../hooks/useSchoolSettings';
import { api } from '../../api';
import { toast } from '../../utils/toast';

const QuranTracker = () => {
  const { user } = useAuth();
  const { settings } = useSchoolSettings();

  const [activeTab, setActiveTab] = useState('targets'); // targets, records, summary
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
    fetchSessions();
    fetchTerms();
  }, []);

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
      const response = await api.post('/api/quran-tracker/records', recordForm);

      if (response.ok) {
        toast.success('Progress recorded successfully');
        setShowRecordModal(false);
        resetRecordForm();
        if (activeTab === 'summary') {
          fetchClassSummary();
        }
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
                  Daily Records
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

              {/* Records Tab */}
              {activeTab === 'records' && (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <p className="text-gray-600">Select a student from the Class Summary tab to view their detailed records</p>
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
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Records</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Activity</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Latest Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {classSummary.map(student => (
                            <tr key={student.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {student.user.firstName} {student.user.lastName}
                                </div>
                                <div className="text-sm text-gray-500">{student.admissionNumber}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {student.quranRecords.length}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {student.quranRecords[0] ? new Date(student.quranRecords[0].date).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {student.quranRecords[0] && (
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(student.quranRecords[0].status)}`}>
                                    {student.quranRecords[0].status}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <button
                                  onClick={() => {
                                    setSelectedStudent(student);
                                    setRecordForm({ ...recordForm, studentId: student.id });
                                    setShowRecordModal(true);
                                  }}
                                  className="text-primary hover:text-primary/80 font-medium"
                                >
                                  Add Progress
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
            </div>
          </div>
        </>
      )}

      {/* Target Modal */}
      {showTargetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Set Memorization Target</h3>
            <form onSubmit={handleCreateTarget} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Academic Session *</label>
                  <select
                    value={targetForm.sessionId}
                    onChange={(e) => setTargetForm({ ...targetForm, sessionId: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    required
                  >
                    <option value="">Select Session</option>
                    {sessions.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Term *</label>
                  <select
                    value={targetForm.termId}
                    onChange={(e) => setTargetForm({ ...targetForm, termId: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    required
                  >
                    <option value="">Select Term</option>
                    {terms.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Target Type *</label>
                  <select
                    value={targetForm.targetType}
                    onChange={(e) => setTargetForm({ ...targetForm, targetType: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    required
                  >
                    <option value="memorization">Memorization</option>
                    <option value="revision">Revision</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Period *</label>
                  <select
                    value={targetForm.period}
                    onChange={(e) => setTargetForm({ ...targetForm, period: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    required
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="termly">Termly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Juz Start</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={targetForm.juzStart}
                    onChange={(e) => setTargetForm({ ...targetForm, juzStart: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Juz End</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={targetForm.juzEnd}
                    onChange={(e) => setTargetForm({ ...targetForm, juzEnd: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Surah Start</label>
                  <input
                    type="text"
                    value={targetForm.surahStart}
                    onChange={(e) => setTargetForm({ ...targetForm, surahStart: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="e.g., Al-Fatiha"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Surah End</label>
                  <input
                    type="text"
                    value={targetForm.surahEnd}
                    onChange={(e) => setTargetForm({ ...targetForm, surahEnd: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="e.g., Al-Baqarah"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Ayah Start</label>
                  <input
                    type="number"
                    min="1"
                    value={targetForm.ayahStart}
                    onChange={(e) => setTargetForm({ ...targetForm, ayahStart: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Ayah End</label>
                  <input
                    type="number"
                    min="1"
                    value={targetForm.ayahEnd}
                    onChange={(e) => setTargetForm({ ...targetForm, ayahEnd: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Pages Count</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={targetForm.pagesCount}
                    onChange={(e) => setTargetForm({ ...targetForm, pagesCount: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date *</label>
                  <input
                    type="date"
                    value={targetForm.startDate}
                    onChange={(e) => setTargetForm({ ...targetForm, startDate: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Date *</label>
                  <input
                    type="date"
                    value={targetForm.endDate}
                    onChange={(e) => setTargetForm({ ...targetForm, endDate: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={targetForm.description}
                  onChange={(e) => setTargetForm({ ...targetForm, description: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows="3"
                  placeholder="Optional notes about this target..."
                />
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowTargetModal(false);
                    resetTargetForm();
                  }}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded hover:brightness-90"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-bold mb-4">Record Student Progress</h3>
            <form onSubmit={handleAddRecord} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Student *</label>
                <select
                  value={recordForm.studentId}
                  onChange={(e) => setRecordForm({ ...recordForm, studentId: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="">Select Student</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.user.firstName} {s.user.lastName} - {s.admissionNumber}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Date *</label>
                  <input
                    type="date"
                    value={recordForm.date}
                    onChange={(e) => setRecordForm({ ...recordForm, date: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Type *</label>
                  <select
                    value={recordForm.type}
                    onChange={(e) => setRecordForm({ ...recordForm, type: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    required
                  >
                    <option value="memorization">Memorization</option>
                    <option value="revision">Revision</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Juz</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={recordForm.juz}
                    onChange={(e) => setRecordForm({ ...recordForm, juz: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Surah</label>
                  <input
                    type="text"
                    value={recordForm.surah}
                    onChange={(e) => setRecordForm({ ...recordForm, surah: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="e.g., Al-Baqarah"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Ayah Start</label>
                  <input
                    type="number"
                    min="1"
                    value={recordForm.ayahStart}
                    onChange={(e) => setRecordForm({ ...recordForm, ayahStart: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Ayah End</label>
                  <input
                    type="number"
                    min="1"
                    value={recordForm.ayahEnd}
                    onChange={(e) => setRecordForm({ ...recordForm, ayahEnd: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Pages</label>
                  <input
                    type="number"
                    min="0"
                    step="0.25"
                    value={recordForm.pages}
                    onChange={(e) => setRecordForm({ ...recordForm, pages: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Performance Status *</label>
                <select
                  value={recordForm.status}
                  onChange={(e) => setRecordForm({ ...recordForm, status: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="Excellent">Excellent</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                  <option value="Poor">Poor</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Comments</label>
                <textarea
                  value={recordForm.comments}
                  onChange={(e) => setRecordForm({ ...recordForm, comments: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows="3"
                  placeholder="Teacher's observations..."
                />
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowRecordModal(false);
                    resetRecordForm();
                  }}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Save Progress
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
