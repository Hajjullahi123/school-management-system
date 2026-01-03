import { useState, useEffect } from 'react';
import { api } from '../../api';

export default function SystemSettings() {
  const [sessions, setSessions] = useState([]);
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingSession, setUpdatingSession] = useState(null);
  const [updatingTerm, setUpdatingTerm] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sessionsRes, termsRes] = await Promise.all([
        api.get('/api/academic-sessions'),
        api.get('/api/terms')
      ]);

      if (!sessionsRes.ok || !termsRes.ok) {
        const sessErr = !sessionsRes.ok ? await sessionsRes.json().catch(() => ({ error: 'Failed to fetch sessions' })) : null;
        const termErr = !termsRes.ok ? await termsRes.json().catch(() => ({ error: 'Failed to fetch terms' })) : null;
        throw new Error(sessErr?.error || termErr?.error || 'Server error');
      }

      const sessionsData = await sessionsRes.json();
      const termsData = await termsRes.json();

      if (!Array.isArray(sessionsData) || !Array.isArray(termsData)) {
        throw new Error('Invalid data format received from server');
      }

      setSessions(sessionsData);
      setTerms(termsData);
    } catch (error) {
      console.error('Fetch error:', error);
      alert(`Failed to load settings: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const setCurrentSession = async (sessionId) => {
    if (!confirm('Set this as the current academic session? This will affect all users.')) {
      return;
    }

    setUpdatingSession(sessionId);
    try {
      await api.post('/api/system/set-current-session', { sessionId });
      alert('✅ Current session updated successfully!');
      await fetchData();
    } catch (error) {
      console.error('Error updating session:', error);
      alert('❌ Failed to update session');
    } finally {
      setUpdatingSession(null);
    }
  };

  const setCurrentTerm = async (termId) => {
    if (!confirm('Set this as the current term? This will affect all users.')) {
      return;
    }

    setUpdatingTerm(termId);
    try {
      await api.post('/api/system/set-current-term', { termId });
      alert('✅ Current term updated successfully!');
      await fetchData();
    } catch (error) {
      console.error('Error updating term:', error);
      alert('❌ Failed to update term');
    } finally {
      setUpdatingTerm(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const currentSession = sessions.find(s => s.isCurrent);
  const currentTerm = terms.find(t => t.isCurrent);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        {/* Current Settings Display */}
        <div className="bg-gradient-to-r from-primary/5 to-secondary/5 border-2 border-primary rounded-lg p-6 mb-8">
          <h2 className="text-lg font-bold text-primary mb-4 flex items-center">
            <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Currently Active
          </h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-primary font-semibold mb-1">Academic Session</p>
              <p className="text-2xl font-bold text-primary">{currentSession?.name || 'Not Set'}</p>
            </div>
            <div>
              <p className="text-sm text-primary font-semibold mb-1">Term</p>
              <p className="text-2xl font-bold text-primary">{currentTerm?.name || 'Not Set'}</p>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-900 mb-1">About Current Session/Term</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Click "Set as Current" to activate a session or term</li>
                <li>• This affects default views for all users system-wide</li>
                <li>• Users can still view other terms using dropdowns</li>
                <li>• Users will see changes after refreshing their browser</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Academic Sessions */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Academic Sessions</h2>
        <div className="space-y-3">
          {sessions.map(session => (
            <div
              key={session.id}
              className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${session.isCurrent
                ? 'border-primary bg-primary/5'
                : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
            >
              <div className="flex items-center">
                {session.isCurrent && (
                  <svg className="w-6 h-6 text-primary mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{session.name}</h3>
                  {session.isCurrent && (
                    <span className="text-sm font-semibold text-primary">Currently Active</span>
                  )}
                </div>
              </div>
              <div>
                {session.isCurrent ? (
                  <span className="px-4 py-2 bg-primary/10 text-primary rounded-lg font-semibold">
                    ✓ Current Session
                  </span>
                ) : (
                  <button
                    onClick={() => setCurrentSession(session.id)}
                    disabled={updatingSession === session.id}
                    className="px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:brightness-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updatingSession === session.id ? 'Setting...' : 'Set as Current Session'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Terms */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Terms</h2>

        {sessions.map(session => {
          const sessionTerms = terms.filter(t => t.academicSessionId === session.id);
          if (sessionTerms.length === 0) return null;

          return (
            <div key={session.id} className="mb-6 last:mb-0">
              <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center">
                <span className="w-2 h-2 bg-primary rounded-full mr-2"></span>
                {session.name}
              </h3>
              <div className="space-y-3 ml-4">
                {sessionTerms.map(term => (
                  <div
                    key={term.id}
                    className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${term.isCurrent
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                  >
                    <div className="flex items-center">
                      {term.isCurrent && (
                        <svg className="w-6 h-6 text-primary mr-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                      <div>
                        <h4 className="text-lg font-bold text-gray-900">{term.name}</h4>
                        {term.isCurrent && (
                          <span className="text-sm font-semibold text-primary">Currently Active</span>
                        )}
                      </div>
                    </div>
                    <div>
                      {term.isCurrent ? (
                        <span className="px-4 py-2 bg-primary/10 text-primary rounded-lg font-semibold">
                          ✓ Current Term
                        </span>
                      ) : (
                        <button
                          onClick={() => setCurrentTerm(term.id)}
                          disabled={updatingTerm === term.id}
                          className="px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:brightness-90 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {updatingTerm === term.id ? 'Setting...' : 'Set as Current Term'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
