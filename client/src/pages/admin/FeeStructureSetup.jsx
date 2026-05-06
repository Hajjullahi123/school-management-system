import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';
import { formatNumber } from '../../utils/formatters';

const FeeStructureSetup = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [terms, setTerms] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [feeStructures, setFeeStructures] = useState([]);
  const [schoolData, setSchoolData] = useState(null);

  const [formData, setFormData] = useState({
    classId: '',
    termId: '',
    academicSessionId: '',
    amount: '',
    description: ''
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [editingStructure, setEditingStructure] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      console.log('Fetching initial data for fee structure setup...');

      // Fetch school info for diagnostics
      try {
        const schoolRes = await api.get('/api/settings');
        const schoolInfo = await schoolRes.json();
        setSchoolData(schoolInfo);
      } catch (e) {
        console.error('Failed to fetch school info:', e);
      }

      const [classesRes, termsRes, sessionsRes, structuresRes] = await Promise.all([
        api.get('/api/classes'),
        api.get('/api/terms'),
        api.get('/api/academic-sessions'),
        api.get('/api/fee-structure')
      ]);

      const classesData = await classesRes.json();
      const termsData = await termsRes.json();
      const sessionsData = await sessionsRes.json();
      const structuresData = await structuresRes.json();

      setClasses(Array.isArray(classesData) ? classesData : []);
      setTerms(Array.isArray(termsData) ? termsData : []);
      setSessions(Array.isArray(sessionsData) ? sessionsData : []);
      setFeeStructures(Array.isArray(structuresData) ? structuresData : []);

      // Set default session/term if available
      const activeSession = (Array.isArray(sessionsData) ? sessionsData : []).find(s => s.isCurrent) || sessionsData[0];
      if (activeSession) {
        setFormData(prev => ({ ...prev, academicSessionId: activeSession.id }));

        const activeTerm = (Array.isArray(termsData) ? termsData : []).find(t => t.isCurrent && t.academicSessionId === activeSession.id) ||
          (Array.isArray(termsData) ? termsData : []).find(t => t.academicSessionId === activeSession.id);
        if (activeTerm) {
          setFormData(prev => ({ ...prev, termId: activeTerm.id }));
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage({
        type: 'error',
        text: 'System Sync Error: Failed to load relational data. Please check your network or re-login.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (structure) => {
    setEditingStructure(structure);
    setFormData({
      classId: structure.classId,
      termId: structure.termId,
      academicSessionId: structure.academicSessionId,
      amount: structure.amount,
      description: structure.description || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingStructure(null);
    setFormData({
      classId: '',
      termId: '',
      academicSessionId: sessions.find(s => s.isCurrent)?.id || '',
      amount: '',
      description: ''
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this fee structure? This will NOT delete existing student fee records, only the master configuration.')) {
      return;
    }

    try {
      setLoading(true);
      const response = await api.delete(`/api/fee-structure/${id}`);

      if (response.ok) {
        setMessage({ type: 'success', text: 'Fee structure removed from ledger' });
        fetchInitialData();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error || 'Deletion failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Critical: Connection to financial engine lost' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await api.post('/api/fee-structure/setup', formData);
      const data = await response.json();

      if (response.ok) {
        const action = editingStructure ? 'updated' : 'created';
        setMessage({
          type: 'success',
          text: `Ledger ${action}: ${data.stats.recordsUpdated} modified, ${data.stats.recordsCreated} initialized.`
        });
        fetchInitialData(); 
        handleCancelEdit(); 
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save configuration' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Critical: Data transmission failure' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pr-2 pb-10">
      <style>{`
        @keyframes slideIn {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide { animation: slideIn 0.4s ease-out forwards; }
      `}</style>

      {/* Diagnostic System Header */}
      <div className="bg-slate-900 rounded-[32px] p-1 shadow-2xl overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 opacity-50"></div>
        <div className="relative bg-slate-900/90 backdrop-blur-xl border border-white/5 p-6 md:p-10 rounded-[31px]">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-[10px] font-black text-indigo-300 uppercase tracking-widest">
                  Diagnostic Portal
                </span>
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[10px] font-black text-emerald-300 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  System Active
                </span>
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-white italic tracking-tighter uppercase mb-2">
                Fee Ledger <span className="text-indigo-400">Control</span>
              </h1>
              <p className="text-slate-400 text-sm font-medium max-w-md">
                Configure master fee structures. Relational data is scoped to your school instance.
              </p>
            </div>

            <div className="flex gap-4 w-full md:w-auto">
              <div className="flex-1 md:w-32 p-4 bg-white/5 rounded-2xl border border-white/10 text-center">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">School ID</span>
                <span className="text-2xl font-black text-white italic">#{user?.schoolId || '??'}</span>
              </div>
              <div className="flex-1 md:w-32 p-4 bg-white/5 rounded-2xl border border-white/10 text-center">
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-1">Records</span>
                <span className="text-2xl font-black text-white italic">{feeStructures.length}</span>
              </div>
            </div>
          </div>

          {/* Sync Warning if classes are missing */}
          {(classes.length === 0 || terms.length === 0) && !loading && (
            <div className="mt-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-4 animate-slide">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <div>
                <p className="text-amber-200 text-xs font-black uppercase tracking-tight">Data Scoping Conflict Detected</p>
                <p className="text-amber-200/60 text-[11px]">No classes or terms found for School #{user?.schoolId}. Please initialize Academic Setup before configuring fees.</p>
              </div>
              <button 
                onClick={fetchInitialData}
                className="ml-auto px-4 py-2 bg-amber-500 text-slate-900 text-[10px] font-black uppercase rounded-lg hover:bg-amber-400 transition-colors"
              >
                Resync
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Setup Form - Ultra Premium */}
        <div className="lg:col-span-5 animate-slide">
          <div className="bg-white p-8 rounded-[32px] shadow-2xl border border-slate-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-all transform group-hover:rotate-12">
              <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
            </div>
            
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-8 flex items-center gap-3">
              <span className="w-2 h-8 bg-indigo-600 rounded-full"></span>
              {editingStructure ? 'Ledger Override' : 'New Configuration'}
            </h2>

            {message && (
              <div className={`p-4 mb-8 rounded-2xl font-bold flex items-center gap-3 border animate-in slide-in-from-top-2 ${
                message.type === 'success' 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                  : 'bg-rose-50 text-rose-700 border-rose-100'
              }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  message.type === 'success' ? 'bg-emerald-100' : 'bg-rose-100'
                }`}>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                </div>
                <span className="text-xs tracking-tight">{message.text}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2 group">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 group-focus-within:text-indigo-600 transition-colors">Academic Session</label>
                <select
                  required
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:border-indigo-600 focus:bg-white transition-all appearance-none cursor-pointer"
                  value={formData.academicSessionId}
                  onChange={e => setFormData({ ...formData, academicSessionId: e.target.value })}
                >
                  <option value="">Select Session</option>
                  {sessions.map(s => (
                    <option key={s.id} value={s.id}>{s.name} {s.isCurrent ? '(Active)' : ''}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Select Term</label>
                  <select
                    required
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:border-indigo-600 focus:bg-white transition-all cursor-pointer"
                    value={formData.termId}
                    onChange={e => setFormData({ ...formData, termId: e.target.value })}
                  >
                    <option value="">Term</option>
                    {terms.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Target Class</label>
                  <select
                    required
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:border-indigo-600 focus:bg-white transition-all cursor-pointer"
                    value={formData.classId}
                    onChange={e => setFormData({ ...formData, classId: e.target.value })}
                  >
                    <option value="">Class</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name} {c.arm || ''}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Billing Amount (₦)</label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-black">₦</span>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="0.00"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-10 pr-5 py-4 text-xl font-black italic focus:border-indigo-600 focus:bg-white transition-all"
                    value={formData.amount}
                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Ledger Reference</label>
                <input
                  type="text"
                  placeholder="Internal description..."
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:border-indigo-600 focus:bg-white transition-all"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                {editingStructure && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="flex-1 py-4 px-6 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all"
                  >
                    Abort Edit
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] py-4 px-8 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-200 active:scale-95 disabled:opacity-50 transition-all hover:bg-indigo-700"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Syncing...</span>
                    </div>
                  ) : (editingStructure ? 'Apply Override' : 'Push to Ledger')}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Existing Ledger Table */}
        <div className="lg:col-span-7 animate-slide" style={{ animationDelay: '0.1s' }}>
          <div className="bg-white rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">Active Ledger Configuration</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Master Fee Schematics</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50/30">
                  <tr>
                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Class Entity</th>
                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Period</th>
                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Valuation</th>
                    <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Operations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {feeStructures.map((fs) => (
                    <tr key={fs.id} className={`group hover:bg-indigo-50/30 transition-all ${editingStructure?.id === fs.id ? 'bg-indigo-50' : ''}`}>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                            {fs.class.name.charAt(0)}
                          </div>
                          <div>
                            <span className="text-sm font-black text-slate-900 uppercase tracking-tight block">{fs.class.name}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">{fs.class.arm || 'Main'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-1">
                          <span className="px-2 py-0.5 text-[9px] font-black bg-slate-900 text-white rounded-md uppercase tracking-widest inline-block w-fit">{fs.term.name}</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase">{fs.academicSession.name}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-base font-black text-slate-900 italic tracking-tight">₦{formatNumber(fs.amount)}</span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEdit(fs)}
                            className="p-2.5 bg-white hover:bg-slate-900 text-slate-400 hover:text-white rounded-xl transition-all shadow-sm border border-slate-100"
                            title="Edit Ledger Entry"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </button>
                          <button
                            onClick={() => handleDelete(fs.id)}
                            className="p-2.5 bg-rose-50 hover:bg-rose-600 text-rose-400 hover:text-white rounded-xl transition-all shadow-sm border border-rose-100"
                            title="Purge Entry"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {feeStructures.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-8 py-32 text-center">
                         <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-slate-100 shadow-inner group">
                           <svg className="w-10 h-10 text-slate-200 group-hover:text-indigo-200 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                         </div>
                         <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-1">Financial Ledger Void</h3>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No active structures detected for this entity scope.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeeStructureSetup;
