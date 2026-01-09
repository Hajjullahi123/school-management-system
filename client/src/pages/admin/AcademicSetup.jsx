import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../api';

const AcademicSetup = () => {
  const [activeTab, setActiveTab] = useState('sessions');

  // Refs for scrolling to forms
  const sessionFormRef = useRef(null);
  const termFormRef = useRef(null);

  // Academic Sessions State
  const [sessions, setSessions] = useState([]);
  const [sessionForm, setSessionForm] = useState({ name: '', startDate: '', endDate: '', isCurrent: false });
  const [editingSession, setEditingSession] = useState(null);

  // Terms State
  const [terms, setTerms] = useState([]);
  const [termForm, setTermForm] = useState({ name: '', academicSessionId: '', startDate: '', endDate: '', isCurrent: false });
  const [editingTerm, setEditingTerm] = useState(null);

  // School Settings (for weights)
  const [schoolSettings, setSchoolSettings] = useState({
    assignment1Weight: 5,
    assignment2Weight: 5,
    test1Weight: 10,
    test2Weight: 10,
    examWeight: 70
  });
  const [savingWeights, setSavingWeights] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!isMounted) return;

      try {
        // Fetch sessions
        const sessionsRes = await api.get('/api/academic-sessions');
        const sessionsData = await sessionsRes.json();
        if (isMounted) setSessions(sessionsData);

        // Fetch terms
        const termsRes = await api.get('/api/terms');
        const termsData = await termsRes.json();
        if (isMounted) setTerms(termsData);

        // Fetch settings
        const settingsRes = await api.get('/api/settings');
        const settingsData = await settingsRes.json();
        if (isMounted) {
          setSchoolSettings({
            assignment1Weight: settingsData.assignment1Weight || 5,
            assignment2Weight: settingsData.assignment2Weight || 5,
            test1Weight: settingsData.test1Weight || 10,
            test2Weight: settingsData.test2Weight || 10,
            examWeight: settingsData.examWeight || 70
          });
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  // ========== ACADEMIC SESSIONS ==========
  const fetchSessions = async () => {
    try {
      const response = await api.get('/api/academic-sessions');
      const data = await response.json();
      setSessions(data);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  const handleSessionSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingSession
        ? `/api/academic-sessions/${editingSession.id}`
        : '/api/academic-sessions';

      const method = editingSession ? 'put' : 'post';

      const response = await api[method](url, sessionForm);

      if (response.ok) {
        alert(editingSession ? 'Session updated!' : 'Session created!');
        setSessionForm({ name: '', startDate: '', endDate: '', isCurrent: false });
        setEditingSession(null);
        fetchSessions();
      }
    } catch (error) {
      console.error('Error saving session:', error);
      alert('Failed to save session');
    }
  };

  const handleSetCurrentSession = async (id) => {
    try {
      const response = await api.put(`/api/academic-sessions/${id}/set-current`, {});
      if (response.ok) {
        alert('Current session updated!');
        fetchSessions();
        // Also fetch terms because current session affects term filtering/context
        fetchTerms();
      } else {
        const error = await response.json();
        alert('Failed to set current session: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error setting current session:', error);
      alert('Failed to set current session. Please try again.');
    }
  };

  const handleDeleteSession = async (id) => {
    if (!confirm('Are you sure you want to delete this academic session? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await api.delete(`/api/academic-sessions/${id}`);
      if (response.ok) {
        alert('Session deleted successfully!');
        fetchSessions();
        fetchTerms(); // Refresh terms as they're tied to sessions
      } else {
        const error = await response.json();
        alert('Failed to delete session: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Failed to delete session. It may have associated terms or data.');
    }
  };

  // ========== TERMS ==========
  const fetchTerms = async () => {
    try {
      const response = await api.get('/api/terms');
      const data = await response.json();
      setTerms(data);
    } catch (error) {
      console.error('Error fetching terms:', error);
    }
  };

  const handleTermSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingTerm
        ? `/api/terms/${editingTerm.id}`
        : '/api/terms';

      const method = editingTerm ? 'put' : 'post';

      const response = await api[method](url, termForm);

      if (response.ok) {
        alert(editingTerm ? 'Term updated!' : 'Term created!');
        setTermForm({ name: '', academicSessionId: '', startDate: '', endDate: '', isCurrent: false });
        setEditingTerm(null);
        fetchTerms();
      }
    } catch (error) {
      console.error('Error saving term:', error);
      alert('Failed to save term');
    }
  };

  const handleSetCurrentTerm = async (id) => {
    try {
      const response = await api.put(`/api/terms/${id}/set-current`, {});
      if (response.ok) {
        alert('Current term updated!');
        fetchTerms();
      } else {
        const error = await response.json();
        alert('Failed to set current term: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error setting current term:', error);
      alert('Failed to set current term. Please try again.');
    }
  };

  // ========== GRADING WEIGHTS ==========
  const fetchSchoolSettings = async () => {
    try {
      const response = await api.get('/api/settings');
      const data = await response.json();
      setSchoolSettings({
        assignment1Weight: data.assignment1Weight || 5,
        assignment2Weight: data.assignment2Weight || 5,
        test1Weight: data.test1Weight || 10,
        test2Weight: data.test2Weight || 10,
        examWeight: data.examWeight || 70
      });
    } catch (error) {
      console.error('Error fetching weights:', error);
    }
  };

  const handleWeightsSubmit = async (e) => {
    e.preventDefault();
    const total =
      Number(schoolSettings.assignment1Weight) +
      Number(schoolSettings.assignment2Weight) +
      Number(schoolSettings.test1Weight) +
      Number(schoolSettings.test2Weight) +
      Number(schoolSettings.examWeight);

    if (total !== 100) {
      alert(`Error: Total weighting must equal 100%. Current total is ${total}%`);
      return;
    }

    setSavingWeights(true);
    try {
      const response = await api.put('/api/settings', schoolSettings);
      if (response.ok) {
        alert('Grading weights updated successfully!');
      } else {
        const error = await response.json();
        alert('Failed to save weights: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error saving weights:', error);
      alert('Failed to save weights');
    } finally {
      setSavingWeights(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Academic Setup</h1>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('sessions')}
              className={`px-6 py-3 text-sm font-medium ${activeTab === 'sessions'
                ? 'border-b-2 border-primary text-primary'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Academic Sessions
            </button>
            <button
              onClick={() => setActiveTab('terms')}
              className={`px-6 py-3 text-sm font-medium ${activeTab === 'terms'
                ? 'border-b-2 border-primary text-primary'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Terms
            </button>
            <button
              onClick={() => setActiveTab('grading')}
              className={`px-6 py-3 text-sm font-medium ${activeTab === 'grading'
                ? 'border-b-2 border-primary text-primary'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Grading Weights
            </button>
          </nav>
        </div>

        <div className="p-6 max-h-[calc(100vh-250px)] overflow-y-auto scrollbar-visible">
          {/* Custom scrollbar styling */}
          {/* Replaced style jsx with inline styles for portability */}
          <style>{`
            .scrollbar-visible::-webkit-scrollbar {
              width: 12px;
            }
            .scrollbar-visible::-webkit-scrollbar-track {
              background: #f1f5f9;
              border-radius: 6px;
            }
            .scrollbar-visible::-webkit-scrollbar-thumb {
              background: #0f766e;
              border-radius: 6px;
            }
            .scrollbar-visible::-webkit-scrollbar-thumb:hover {
              background: #0d9488;
            }
          `}</style>

          {/* ACADEMIC SESSIONS TAB */}
          {activeTab === 'sessions' && (
            <div className="space-y-6">
              {/* Session Form */}
              <div ref={sessionFormRef} className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">
                  {editingSession ? 'Edit Session' : 'Create New Session'}
                </h3>
                <form onSubmit={handleSessionSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Session Name (e.g., 2024/2025)
                      </label>
                      <input
                        type="text"
                        value={sessionForm.name}
                        onChange={(e) => setSessionForm({ ...sessionForm, name: e.target.value })}
                        className="w-full border rounded-md px-3 py-2"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                      <input
                        type="date"
                        value={sessionForm.startDate}
                        onChange={(e) => setSessionForm({ ...sessionForm, startDate: e.target.value })}
                        className="w-full border rounded-md px-3 py-2"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                      <input
                        type="date"
                        value={sessionForm.endDate}
                        onChange={(e) => setSessionForm({ ...sessionForm, endDate: e.target.value })}
                        className="w-full border rounded-md px-3 py-2"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="bg-primary text-white px-6 py-2 rounded-md hover:brightness-90"
                    >
                      {editingSession ? 'Update Session' : 'Create Session'}
                    </button>
                    {editingSession && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSession(null);
                          setSessionForm({ name: '', startDate: '', endDate: '', isCurrent: false });
                        }}
                        className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Sessions List */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Existing Sessions</h3>
                <div className="space-y-2">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className={`p-4 rounded-lg border-2 ${session.isCurrent ? 'border-primary bg-primary/5' : 'border-gray-200 bg-white'
                        }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-semibold text-lg">{session.name}</h4>
                          <p className="text-sm text-gray-600">
                            {new Date(session.startDate).toLocaleDateString()} - {new Date(session.endDate).toLocaleDateString()}
                          </p>
                          {session.isCurrent && (
                            <span className="inline-block mt-1 px-2 py-1 bg-primary text-white text-xs rounded">
                              Current Session
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {!session.isCurrent && (
                            <button
                              onClick={() => handleSetCurrentSession(session.id)}
                              className="px-4 py-2 bg-primary/10 text-primary rounded hover:bg-primary/20"
                            >
                              Set as Current
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setEditingSession(session);
                              setSessionForm({
                                name: session.name,
                                startDate: session.startDate.split('T')[0],
                                endDate: session.endDate.split('T')[0],
                                isCurrent: session.isCurrent
                              });
                              // Scroll to form
                              setTimeout(() => {
                                sessionFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              }, 100);
                            }}
                            className="px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                          >
                            Edit
                          </button>
                          {!session.isCurrent && (
                            <button
                              onClick={() => handleDeleteSession(session.id)}
                              className="px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TERMS TAB */}
          {activeTab === 'terms' && (
            <div className="space-y-6">
              {/* Term Form */}
              <div ref={termFormRef} className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">
                  {editingTerm ? 'Edit Term' : 'Create New Term'}
                </h3>
                <form onSubmit={handleTermSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Academic Session</label>
                      <select
                        key={`session-select-${sessions.length}`}
                        value={termForm.academicSessionId}
                        onChange={(e) => setTermForm({ ...termForm, academicSessionId: e.target.value })}
                        className="w-full border rounded-md px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent"
                        required
                      >
                        <option value="">Select Session</option>
                        {sessions && sessions.length > 0 ? (
                          sessions.map((session) => (
                            <option key={session.id} value={session.id}>
                              {session.name}
                            </option>
                          ))
                        ) : (
                          <option disabled>No sessions available</option>
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Term Name (e.g., First Term)
                      </label>
                      <input
                        type="text"
                        value={termForm.name}
                        onChange={(e) => setTermForm({ ...termForm, name: e.target.value })}
                        className="w-full border rounded-md px-3 py-2"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                      <input
                        type="date"
                        value={termForm.startDate}
                        onChange={(e) => setTermForm({ ...termForm, startDate: e.target.value })}
                        className="w-full border rounded-md px-3 py-2"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                      <input
                        type="date"
                        value={termForm.endDate}
                        onChange={(e) => setTermForm({ ...termForm, endDate: e.target.value })}
                        className="w-full border rounded-md px-3 py-2"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="bg-primary text-white px-6 py-2 rounded-md hover:brightness-90"
                    >
                      {editingTerm ? 'Update Term' : 'Create Term'}
                    </button>
                    {editingTerm && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTerm(null);
                          setTermForm({ name: '', academicSessionId: '', startDate: '', endDate: '', isCurrent: false });
                        }}
                        className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Terms List */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Existing Terms</h3>
                <div className="space-y-2">
                  {terms.map((term) => (
                    <div
                      key={term.id}
                      className={`p-4 rounded-lg border-2 ${term.isCurrent ? 'border-primary bg-primary/5' : 'border-gray-200 bg-white'
                        }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-semibold text-lg">{term.name}</h4>
                          <p className="text-sm text-gray-600">
                            Session: {term.academicSession?.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {new Date(term.startDate).toLocaleDateString()} - {new Date(term.endDate).toLocaleDateString()}
                          </p>
                          {term.isCurrent && (
                            <span className="inline-block mt-1 px-2 py-1 bg-primary text-white text-xs rounded">
                              Current Term
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {!term.isCurrent && (
                            <button
                              onClick={() => handleSetCurrentTerm(term.id)}
                              className="px-4 py-2 bg-primary/10 text-primary rounded hover:bg-primary/20 font-medium"
                            >
                              Set as Current
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setEditingTerm(term);
                              setTermForm({
                                name: term.name,
                                academicSessionId: term.academicSessionId,
                                startDate: term.startDate.split('T')[0],
                                endDate: term.endDate.split('T')[0],
                                isCurrent: term.isCurrent
                              });
                              // Scroll to form
                              setTimeout(() => {
                                termFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              }, 100);
                            }}
                            className="px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* GRADING WEIGHTS TAB */}
          {activeTab === 'grading' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-semibold text-blue-900 mb-1">Grading Configuration</h3>
                    <p className="text-sm text-blue-800">
                      Define the percentage contribution for each assessment component.
                      <strong> The total must sum to exactly 100%.</strong>
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleWeightsSubmit} className="max-w-xl bg-gray-50 p-6 rounded-lg space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">1st Assignment (%)</label>
                    <input
                      type="number"
                      value={schoolSettings.assignment1Weight}
                      onChange={(e) => setSchoolSettings({ ...schoolSettings, assignment1Weight: parseInt(e.target.value) || 0 })}
                      className="w-full border rounded-md px-3 py-2"
                      min="0"
                      max="100"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">2nd Assignment (%)</label>
                    <input
                      type="number"
                      value={schoolSettings.assignment2Weight}
                      onChange={(e) => setSchoolSettings({ ...schoolSettings, assignment2Weight: parseInt(e.target.value) || 0 })}
                      className="w-full border rounded-md px-3 py-2"
                      min="0"
                      max="100"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">1st Test (%)</label>
                    <input
                      type="number"
                      value={schoolSettings.test1Weight}
                      onChange={(e) => setSchoolSettings({ ...schoolSettings, test1Weight: parseInt(e.target.value) || 0 })}
                      className="w-full border rounded-md px-3 py-2"
                      min="0"
                      max="100"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">2nd Test (%)</label>
                    <input
                      type="number"
                      value={schoolSettings.test2Weight}
                      onChange={(e) => setSchoolSettings({ ...schoolSettings, test2Weight: parseInt(e.target.value) || 0 })}
                      className="w-full border rounded-md px-3 py-2"
                      min="0"
                      max="100"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1 border-t pt-2 mt-2 font-bold">Examination (%)</label>
                    <input
                      type="number"
                      value={schoolSettings.examWeight}
                      onChange={(e) => setSchoolSettings({ ...schoolSettings, examWeight: parseInt(e.target.value) || 0 })}
                      className="w-full border-2 border-primary rounded-md px-3 py-2 font-bold"
                      min="0"
                      max="100"
                      required
                    />
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between border-t mt-6">
                  <div className={`text-lg font-bold ${(Number(schoolSettings.assignment1Weight) +
                    Number(schoolSettings.assignment2Weight) +
                    Number(schoolSettings.test1Weight) +
                    Number(schoolSettings.test2Weight) +
                    Number(schoolSettings.examWeight)) === 100
                    ? 'text-green-600' : 'text-red-600'
                    }`}>
                    Total: {
                      Number(schoolSettings.assignment1Weight) +
                      Number(schoolSettings.assignment2Weight) +
                      Number(schoolSettings.test1Weight) +
                      Number(schoolSettings.test2Weight) +
                      Number(schoolSettings.examWeight)
                    }%
                  </div>
                  <button
                    type="submit"
                    disabled={savingWeights}
                    className="bg-primary text-white px-8 py-2 rounded-md hover:brightness-90 disabled:opacity-50"
                  >
                    {savingWeights ? 'Saving...' : 'Save Weights'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AcademicSetup;
