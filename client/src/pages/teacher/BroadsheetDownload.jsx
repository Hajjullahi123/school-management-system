import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';

const BroadsheetDownload = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [terms, setTerms] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedTerms, setSelectedTerms] = useState([]);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchClasses();
    fetchSessions();
  }, []);

  useEffect(() => {
    if (selectedSession) fetchTermsForSession(selectedSession);
  }, [selectedSession]);

  const fetchClasses = async () => {
    try {
      const res = await api.get('/api/classes');
      const data = await res.json();
      const classesArray = Array.isArray(data) ? data : [];

      if (user.role === 'teacher') {
        const teacherClasses = classesArray.filter(c => c.classTeacherId === user.id);
        setClasses(teacherClasses);
        if (teacherClasses.length === 1) setSelectedClass(teacherClasses[0].id.toString());
      } else {
        setClasses(classesArray);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchSessions = async () => {
    try {
      const res = await api.get('/api/academic-sessions');
      const data = await res.json();
      const sessionsArray = Array.isArray(data) ? data : [];
      setSessions(sessionsArray);
      const current = sessionsArray.find(s => s.isCurrent);
      if (current) setSelectedSession(current.id.toString());
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  const fetchTermsForSession = async (sessionId) => {
    try {
      const res = await api.get(`/api/terms?academicSessionId=${sessionId}`);
      const data = await res.json();
      const termsArray = Array.isArray(data) ? data : [];
      setTerms(termsArray);
      // Default: select all terms
      setSelectedTerms(termsArray.map(t => t.id.toString()));
    } catch (error) {
      console.error('Error fetching terms:', error);
    }
  };

  const handleTermToggle = (termId) => {
    setSelectedTerms(prev =>
      prev.includes(termId) ? prev.filter(t => t !== termId) : [...prev, termId]
    );
  };

  const selectAllTerms = () => setSelectedTerms(terms.map(t => t.id.toString()));
  const deselectAllTerms = () => setSelectedTerms([]);

  const handleDownload = async () => {
    if (!selectedClass || !selectedSession || selectedTerms.length === 0) {
      alert('Please select a class, session, and at least one term');
      return;
    }

    setDownloading(true);
    try {
      const termIds = selectedTerms.join(',');
      const res = await api.get(`/api/broadsheet/download/${selectedClass}?academicSessionId=${selectedSession}&termIds=${termIds}`);

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Download failed');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Extract filename from Content-Disposition header
      const disposition = res.headers.get('Content-Disposition');
      let filename = 'broadsheet.xlsx';
      if (disposition) {
        const match = disposition.match(/filename="?(.+?)"?$/);
        if (match) filename = match[1];
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download broadsheet: ' + error.message);
    } finally {
      setDownloading(false);
    }
  };

  const selectedClassName = classes.find(c => c.id.toString() === selectedClass);
  const selectedSessionName = sessions.find(s => s.id.toString() === selectedSession);

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="relative group overflow-hidden rounded-[32px] p-1 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 shadow-2xl">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay"></div>
        <div className="relative bg-white/5 backdrop-blur-sm p-6 sm:p-8 rounded-[31px] text-white flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="min-w-0 text-center sm:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/20 mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">Broadsheet Generator</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tighter italic mb-1 uppercase text-white">
              Compiled Result Sheet
            </h1>
            <p className="text-xs sm:text-sm text-white/70 font-medium tracking-wide">
              Download all-in-one broadsheet with subjects, scores, grades, positions & cumulative
            </p>
          </div>

          {selectedClass && selectedSession && selectedTerms.length > 0 && (
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="group/btn bg-white text-emerald-700 px-6 py-4 rounded-[24px] font-black uppercase tracking-widest text-xs shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 border border-white disabled:opacity-60"
            >
              {downloading ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 transition-transform group-hover/btn:-translate-y-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download Excel
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Teacher without class teacher assignment */}
      {user.role === 'teacher' && classes.length === 0 ? (
        <div className="bg-white p-12 rounded-[32px] shadow-2xl text-center border border-slate-100">
          <div className="w-24 h-24 bg-amber-100 rounded-[28px] flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Access Restricted</h3>
          <p className="text-slate-500 mt-2 font-medium max-w-sm mx-auto text-sm">
            Form Master assignment is required for broadsheet generation. Contact your admin.
          </p>
        </div>
      ) : (
        <div className="bg-white p-6 sm:p-8 rounded-[32px] shadow-xl border border-slate-100">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 ml-2">
            Configuration
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Class Selector */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Target Class</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full bg-slate-50 border-white rounded-2xl px-4 py-4 text-sm font-bold shadow-inner focus:ring-2 focus:ring-emerald-500 transition-all"
                disabled={user.role === 'teacher' && classes.length === 1}
              >
                <option value="">Select Class</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.name} {cls.arm || ''}</option>
                ))}
              </select>
            </div>

            {/* Session Selector */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Academic Session</label>
              <select
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
                className="w-full bg-slate-50 border-white rounded-2xl px-4 py-4 text-sm font-bold shadow-inner focus:ring-2 focus:ring-emerald-500 transition-all"
              >
                <option value="">Select Session</option>
                {sessions.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Term Selection */}
          {terms.length > 0 && (
            <div className="mt-8 p-6 bg-slate-50/50 border border-slate-100 rounded-3xl">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                  Select Terms to Include
                </h4>
                <div className="flex gap-2">
                  <button
                    onClick={selectAllTerms}
                    className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 transition-all"
                  >
                    All
                  </button>
                  <button
                    onClick={deselectAllTerms}
                    className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-all"
                  >
                    None
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {terms.map(term => {
                  const isSelected = selectedTerms.includes(term.id.toString());
                  return (
                    <button
                      key={term.id}
                      onClick={() => handleTermToggle(term.id.toString())}
                      className={`relative p-4 rounded-2xl border-2 transition-all duration-300 text-left group ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-100'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                          isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'
                        }`}>
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <p className={`text-sm font-black uppercase ${isSelected ? 'text-emerald-900' : 'text-slate-700'}`}>
                            {term.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {term.isCurrent ? '● Current Term' : 'Past Term'}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Download Button (Mobile) */}
          <button
            onClick={handleDownload}
            disabled={!selectedClass || !selectedSession || selectedTerms.length === 0 || downloading}
            className="mt-8 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 disabled:from-slate-200 disabled:to-slate-300 disabled:text-slate-400 transition-all w-full flex items-center justify-center gap-3"
          >
            {downloading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating Broadsheet...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Compiled Broadsheet
              </>
            )}
          </button>

          {/* Preview Info */}
          {selectedClass && selectedSession && selectedTerms.length > 0 && (
            <div className="mt-6 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-xs space-y-1">
                  <p className="font-bold text-emerald-900">Download Preview</p>
                  <p className="text-emerald-700">
                    <strong>Class:</strong> {selectedClassName?.name} {selectedClassName?.arm || ''} •{' '}
                    <strong>Session:</strong> {selectedSessionName?.name} •{' '}
                    <strong>Terms:</strong> {selectedTerms.length} selected
                  </p>
                  <p className="text-emerald-600/80 italic">
                    The Excel file will contain one sheet per term (with all subjects, scores, grades, positions, remarks)
                    {selectedTerms.length > 1 && ' plus a Cumulative summary sheet with term averages and grand position.'}.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BroadsheetDownload;
