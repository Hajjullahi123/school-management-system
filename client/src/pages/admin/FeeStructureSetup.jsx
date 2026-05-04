import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../api';
import { formatNumber } from '../../utils/formatters';

const FeeStructureSetup = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [terms, setTerms] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [feeStructures, setFeeStructures] = useState([]);

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
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      console.log('Fetching initial data for fee structure setup...');

      const [classesRes, termsRes, sessionsRes, structuresRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/classes`, { headers }),
        fetch(`${API_BASE_URL}/api/terms`, { headers }),
        fetch(`${API_BASE_URL}/api/academic-sessions`, { headers }),
        fetch(`${API_BASE_URL}/api/fee-structure`, { headers })
      ]);

      console.log('Response statuses:', {
        classes: classesRes.status,
        terms: termsRes.status,
        sessions: sessionsRes.status,
        structures: structuresRes.status
      });

      const classesData = await classesRes.json();
      const termsData = await termsRes.json();
      const sessionsData = await sessionsRes.json();
      const structuresData = await structuresRes.json();

      console.log('Fetched data:', {
        classes: classesData.length || classesData,
        terms: termsData.length || termsData,
        sessions: sessionsData.length || sessionsData,
        structures: structuresData.length || structuresData
      });

      setClasses(Array.isArray(classesData) ? classesData : []);
      setTerms(Array.isArray(termsData) ? termsData : []);
      setSessions(Array.isArray(sessionsData) ? sessionsData : []);
      setFeeStructures(Array.isArray(structuresData) ? structuresData : []);

      // Set default session/term if available
      const sessions = Array.isArray(sessionsData) ? sessionsData : [];
      const terms = Array.isArray(termsData) ? termsData : [];
      const activeSession = sessions.find(s => s.isCurrent) || sessions[0];
      if (activeSession) {
        console.log('Setting active session for setup:', activeSession);
        setFormData(prev => ({ ...prev, academicSessionId: activeSession.id }));

        const activeTerm = terms.find(t => t.isCurrent && t.academicSessionId === activeSession.id) ||
          terms.find(t => t.academicSessionId === activeSession.id);
        if (activeTerm) {
          console.log('Setting active term for setup:', activeTerm);
          setFormData(prev => ({ ...prev, termId: activeTerm.id }));
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage({
        type: 'error',
        text: 'Failed to load data. Please check the console for details.'
      });
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
      academicSessionId: '',
      amount: '',
      description: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/fee-structure/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        const action = editingStructure ? 'updated' : 'created';
        setMessage({
          type: 'success',
          text: `Fee structure ${action} successfully. Updated ${data.stats.recordsUpdated} records, Created ${data.stats.recordsCreated} records.`
        });
        fetchInitialData(); // Refresh list
        handleCancelEdit(); // Reset form
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save fee structure' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-h-[calc(100vh-180px)] overflow-y-auto pr-2 pb-10" style={{
      scrollbarWidth: 'none',
      msOverflowStyle: 'none'
    }}>
      {/* Hide scrollbar but keep functionality */}
      <style>{`
        div::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Header Section - Glassmorphism */}
      <div className="relative group overflow-hidden rounded-[32px] p-1 bg-gradient-to-br from-slate-800 via-slate-900 to-indigo-900 shadow-2xl">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay"></div>
        <div className="relative bg-white/5 backdrop-blur-sm p-8 sm:p-10 rounded-[31px] text-white flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/20 mb-3">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">Financial Engine</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter italic mb-1 uppercase">Create Fee Structure</h1>
            <p className="text-sm text-white/60 font-medium tracking-wide">Set up school fees for different classes and terms</p>
          </div>
          
          <div className="p-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 text-center">
            <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest block mb-1">Monitored Records</span>
            <span className="text-2xl font-black italic">{feeStructures.length}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Setup Form */}
        <div className="lg:col-span-5 bg-white p-8 rounded-[32px] shadow-2xl border border-slate-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
          </div>
          
          <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-primary rounded-full"></span>
            {editingStructure ? 'Change Fee Amount' : 'Create New Fee'}
          </h2>

          {message && (
            <div className={`p-4 mb-6 rounded-2xl font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-4 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
              <span className="text-sm">{message.text}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Academic Session</label>
              <select
                required
                className="w-full bg-slate-50 border-white rounded-2xl px-5 py-4 text-sm font-bold shadow-inner focus:ring-2 focus:ring-primary transition-all cursor-pointer"
                value={formData.academicSessionId}
                onChange={e => setFormData({ ...formData, academicSessionId: e.target.value })}
              >
                <option value="">Select Academic Session</option>
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
                  className="w-full bg-slate-50 border-white rounded-2xl px-5 py-4 text-sm font-bold shadow-inner focus:ring-2 focus:ring-primary transition-all cursor-pointer"
                  value={formData.termId}
                  onChange={e => setFormData({ ...formData, termId: e.target.value })}
                >
                  <option value="">Select Term</option>
                  {terms.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({sessions.find(s => s.id === t.academicSessionId)?.name || 'N/A'})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Class Level</label>
                <select
                  required
                  className="w-full bg-slate-50 border-white rounded-2xl px-5 py-4 text-sm font-bold shadow-inner focus:ring-2 focus:ring-primary transition-all cursor-pointer"
                  value={formData.classId}
                  onChange={e => setFormData({ ...formData, classId: e.target.value })}
                >
                  <option value="">Select Class</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name} {c.arm || ''}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Termly Amount (₦)</label>
              <div className="relative group/input">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-black">₦</span>
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="0.00"
                  className="w-full bg-slate-50 border-white rounded-2xl pl-10 pr-5 py-4 text-lg font-black italic shadow-inner focus:ring-2 focus:ring-primary transition-all"
                  value={formData.amount}
                  onChange={e => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Reference Note</label>
              <input
                type="text"
                placeholder="E.g. Standard Tuition + Lab Fees"
                className="w-full bg-slate-50 border-white rounded-2xl px-5 py-4 text-sm font-bold shadow-inner focus:ring-2 focus:ring-primary transition-all"
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
                  Cancel Override
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="flex-[2] py-4 px-8 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 disabled:opacity-50 transition-all"
              >
                {loading ? 'Saving...' : (editingStructure ? 'Save Changes' : 'Create Fee Structure')}
              </button>
            </div>
          </form>
        </div>

        {/* Existing Structures List */}
        <div className="lg:col-span-7 bg-white rounded-[32px] shadow-xl border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">Active Ledger Configuration</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50/30">
                <tr>
                  <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tier Class</th>
                  <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Term</th>
                  <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Billing Amount</th>
                  <th className="px-6 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Ops</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {feeStructures.map((fs) => (
                  <tr key={fs.id} className={`group hover:bg-slate-50/80 transition-all ${editingStructure?.id === fs.id ? 'bg-primary/5' : ''}`}>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-slate-200 rounded-full group-hover:bg-primary transition-colors"></div>
                        <span className="text-sm font-black text-slate-900 uppercase tracking-tight">{fs.class.name} {fs.class.arm}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="px-3 py-1 text-[9px] font-black bg-indigo-50 text-indigo-600 rounded-md uppercase tracking-widest">{fs.term.name}</span>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-sm font-black text-slate-900 italic tracking-tight">₦{formatNumber(fs.amount)}</span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button
                        onClick={() => handleEdit(fs)}
                        className="p-2.5 bg-slate-50 hover:bg-slate-900 text-slate-400 hover:text-white rounded-xl transition-all shadow-sm active:scale-90"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                    </td>
                  </tr>
                ))}
                {feeStructures.length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-6 py-20 text-center">
                       <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100 shadow-inner">
                         <svg className="w-8 h-8 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                       </div>
                       <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Financial Ledger Empty</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeeStructureSetup;
