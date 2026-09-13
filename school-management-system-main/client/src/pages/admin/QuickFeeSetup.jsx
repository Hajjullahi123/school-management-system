import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { toast } from 'react-hot-toast';
import { formatNumber } from '../../utils/formatters';

const QuickFeeSetup = () => {
  const [classes, setClasses] = useState([]);
  const [terms, setTerms] = useState([]);
  const [sessions, setSessions] = useState([]);
  
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [formData, setFormData] = useState({
    academicSessionId: '',
    termId: '',
    amount: '',
    description: 'General Termly Fee'
  });

  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cRes, tRes, sRes] = await Promise.all([
        api.get('/api/classes'),
        api.get('/api/terms'),
        api.get('/api/academic-sessions')
      ]);

      const cData = await cRes.json();
      const tData = await tRes.json();
      const sData = await sRes.json();

      setClasses(Array.isArray(cData) ? cData : []);
      setTerms(Array.isArray(tData) ? tData : []);
      setSessions(Array.isArray(sData) ? sData : []);

      const activeSession = (Array.isArray(sData) ? sData : []).find(s => s.isCurrent) || sData[0];
      if (activeSession) {
        setFormData(prev => ({ ...prev, academicSessionId: activeSession.id }));
        const activeTerm = (Array.isArray(tData) ? tData : []).find(t => t.isCurrent && t.academicSessionId === activeSession.id);
        if (activeTerm) {
          setFormData(prev => ({ ...prev, termId: activeTerm.id }));
        }
      }
    } catch (err) {
      toast.error('Failed to load system data');
    } finally {
      setLoading(false);
    }
  };

  const toggleClass = (id) => {
    setSelectedClasses(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedClasses(classes.map(c => c.id));
  };

  const deselectAll = () => {
    setSelectedClasses([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedClasses.length === 0) {
      toast.error('Please select at least one class');
      return;
    }

    setSyncing(true);
    try {
      let successCount = 0;
      let failCount = 0;

      // Process in sequence for better reliability and status tracking
      for (const classId of selectedClasses) {
        const payload = {
          ...formData,
          classId
        };
        
        const res = await api.post('/api/fee-structure/setup', payload);
        if (res.ok) successCount++;
        else failCount++;
      }

      toast.success(`Batch Process Complete: ${successCount} successful, ${failCount} failed.`);
      loadData();
    } catch (err) {
      toast.error('Massive sync failure. Please check network.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 italic tracking-tighter uppercase">
            Mass Fee <span className="text-indigo-600">Architect</span>
          </h1>
          <p className="text-slate-500 font-medium">Batch configure school fees across multiple departments.</p>
        </div>
        
        <button 
          onClick={loadData}
          className="p-3 bg-white border-2 border-slate-100 rounded-2xl hover:border-indigo-600 transition-all text-slate-400 hover:text-indigo-600"
        >
          <svg className={`w-6 h-6 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
        </button>
      </div>

      {classes.length === 0 && !loading && (
        <div className="p-12 bg-rose-50 border-2 border-rose-100 rounded-[32px] text-center space-y-4">
          <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto text-rose-500">
             <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <h2 className="text-2xl font-black text-rose-900 uppercase">Registry is Empty</h2>
          <p className="text-rose-700/70 max-w-md mx-auto">No classes detected in your school database. You must create classes in Class Management before you can set fees.</p>
          <button className="px-8 py-4 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-rose-200">
            Go to Class Management
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Class Selection Grid */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-[32px] shadow-xl border border-slate-100 p-8">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Step 1: Select Target Classes</h3>
              <div className="flex gap-2">
                <button onClick={selectAll} className="text-[10px] font-black text-indigo-600 uppercase hover:underline">All</button>
                <span className="text-slate-300">|</span>
                <button onClick={deselectAll} className="text-[10px] font-black text-slate-400 uppercase hover:underline">None</button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {classes.map(c => (
                <button
                  key={c.id}
                  onClick={() => toggleClass(c.id)}
                  className={`p-4 rounded-2xl border-2 transition-all text-left relative overflow-hidden group ${
                    selectedClasses.includes(c.id) 
                      ? 'border-indigo-600 bg-indigo-50/50' 
                      : 'border-slate-50 bg-slate-50 hover:border-slate-200'
                  }`}
                >
                  <div className={`absolute top-0 right-0 p-2 transition-transform ${selectedClasses.includes(c.id) ? 'scale-100' : 'scale-0'}`}>
                    <div className="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center text-white">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 14.142l-7 7a1 1 0 01-1.414 0l-3.5-3.5a1 1 0 111.414-1.414L9 10.586l6.293-6.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    </div>
                  </div>
                  <span className={`text-sm font-black uppercase tracking-tight block ${selectedClasses.includes(c.id) ? 'text-indigo-900' : 'text-slate-900'}`}>
                    {c.name}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{c.arm || 'Main'}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Fee Parameters */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 rounded-[32px] p-8 shadow-2xl sticky top-24 border border-white/5 overflow-hidden">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl"></div>
            
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-8 relative z-10">Step 2: Configuration</h3>
            
            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Academic Cycle</label>
                <div className="grid grid-cols-2 gap-3">
                  <select
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs font-bold text-white focus:border-indigo-500 outline-none transition-all"
                    value={formData.academicSessionId}
                    onChange={e => setFormData({ ...formData, academicSessionId: e.target.value })}
                  >
                    <option value="" className="bg-slate-900">Session</option>
                    {sessions.map(s => <option key={s.id} value={s.id} className="bg-slate-900">{s.name}</option>)}
                  </select>
                  <select
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs font-bold text-white focus:border-indigo-500 outline-none transition-all"
                    value={formData.termId}
                    onChange={e => setFormData({ ...formData, termId: e.target.value })}
                  >
                    <option value="" className="bg-slate-900">Term</option>
                    {terms.map(t => <option key={t.id} value={t.id} className="bg-slate-900">{t.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Fee Amount (₦)</label>
                <div className="relative group">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-indigo-500 font-black">₦</span>
                  <input
                    type="number"
                    required
                    placeholder="0.00"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-5 py-5 text-2xl font-black text-white italic placeholder:text-white/10 focus:border-indigo-500 outline-none transition-all shadow-inner"
                    value={formData.amount}
                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                  />
                </div>
              </div>

              <div className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-500 uppercase">Target Selection</span>
                  <span className="text-xs font-black text-white italic">{selectedClasses.length} Classes</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-500 uppercase">Total Potential Impact</span>
                  <span className="text-xl font-black text-indigo-400 italic">₦{formatNumber(formData.amount * (selectedClasses.length || 0))}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={syncing || selectedClasses.length === 0}
                className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-indigo-900/50 hover:bg-indigo-500 active:scale-95 disabled:opacity-50 disabled:grayscale transition-all flex items-center justify-center gap-3"
              >
                {syncing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Initializing Pulse...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    <span>Deploy to Selected Classes</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickFeeSetup;
