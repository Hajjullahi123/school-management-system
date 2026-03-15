import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { formatNumber } from '../../utils/formatters';

const AccountantDashboard = ({ user }) => {
  const [feeStats, setFeeStats] = useState(null);
  const [allTerms, setAllTerms] = useState([]);
  const [allSessions, setAllSessions] = useState([]);
  const [selectedDashboardTerm, setSelectedDashboardTerm] = useState(null);
  const [selectedDashboardSession, setSelectedDashboardSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notices, setNotices] = useState([]);

  useEffect(() => {
    fetchAccountantData();
    fetchNotices();
  }, [user]);

  const fetchNotices = async () => {
    try {
      const response = await api.get('/api/notices');
      if (response.ok) {
        const data = await response.json();
        setNotices(Array.isArray(data) ? data : []);
      }
    } catch (e) { }
  };

  const fetchAccountantData = async (termId = null, sessionId = null) => {
    try {
      setLoading(true);
      const [termsRes, sessionsRes] = await Promise.all([
        api.get('/api/terms'),
        api.get('/api/academic-sessions')
      ]);

      const terms = await termsRes.json();
      const sessions = await sessionsRes.json();

      setAllTerms(Array.isArray(terms) ? terms : []);
      setAllSessions(Array.isArray(sessions) ? sessions : []);

      const activeTerm = termId ? terms.find(t => t.id === parseInt(termId)) : (terms.find(t => t.isCurrent) || terms[0]);
      const activeSession = sessionId ? sessions.find(s => s.id === parseInt(sessionId)) : (sessions.find(s => s.isCurrent) || sessions[0]);

      setSelectedDashboardTerm(activeTerm);
      setSelectedDashboardSession(activeSession);

      if (activeTerm && activeSession) {
        const response = await api.get(
          `/api/fees/summary?termId=${activeTerm.id}&academicSessionId=${activeSession.id}`
        );
        const data = await response.json();
        setFeeStats(data);
      }
    } catch (error) {
      console.error('Error fetching accountant data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-xs font-black uppercase tracking-widest text-gray-400">Loading Treasury Data...</div>;

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-primary to-primary/90 text-white p-5 rounded-xl shadow-lg">
        <h1 className="text-xl font-black italic tracking-tighter uppercase">Treasury Control</h1>
        <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mt-1">Authorized User: {user?.firstName}</p>
      </div>

      {/* Selectors */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 flex gap-2">
        <select
          value={selectedDashboardSession?.id || ''}
          onChange={(e) => fetchAccountantData(selectedDashboardTerm?.id, e.target.value)}
          className="flex-1 bg-gray-50 border-none rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-widest"
        >
          {allSessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select
          value={selectedDashboardTerm?.id || ''}
          onChange={(e) => fetchAccountantData(e.target.value, selectedDashboardSession?.id)}
          className="flex-1 bg-gray-50 border-none rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-widest"
        >
          {allTerms.filter(t => t.academicSessionId === selectedDashboardSession?.id).map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {feeStats && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-green-500">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Collections</p>
            <p className="text-lg font-black text-gray-900">₦{formatNumber(feeStats.totalPaid)}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-red-500">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Unsettled</p>
            <p className="text-lg font-black text-gray-900">₦{formatNumber(feeStats.totalBalance)}</p>
          </div>
          <div className="col-span-2 bg-slate-900 p-4 rounded-xl flex justify-between items-center">
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Remittance Rate</p>
              <p className="text-xl font-black text-white">
                {feeStats.totalExpected > 0 ? ((feeStats.totalPaid / feeStats.totalExpected) * 100).toFixed(1) : 0}%
              </p>
            </div>
            <Link to="/dashboard/fees" className="bg-primary text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest">
              Manage
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountantDashboard;
