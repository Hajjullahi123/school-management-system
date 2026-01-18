import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { toast } from 'react-hot-toast';

const ExamSubmissionTracker = () => {
  const [academicData, setAcademicData] = useState([]);
  const [cbtData, setCbtData] = useState([]);
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const [nudging, setNudging] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [activeTab, setActiveTab] = useState('academic'); // 'academic' or 'cbt'
  const [groupBy, setGroupBy] = useState('none'); // 'none', 'teacher', 'class', 'subject'

  useEffect(() => {
    fetchTrackingData();
  }, []);

  const fetchTrackingData = async () => {
    try {
      setLoading(true);
      const [academicRes, cbtRes] = await Promise.all([
        api.get('/api/analytics/submission-tracking'),
        api.get('/api/analytics/cbt-tracking')
      ]);

      const academicResult = await academicRes.json();
      const cbtResult = await cbtRes.json();

      if (academicRes.ok) {
        setAcademicData(academicResult.tracking);
        setConfig(academicResult.config);
      }
      if (cbtRes.ok) {
        setCbtData(cbtResult);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Network error while fetching tracking data');
    } finally {
      setLoading(false);
    }
  };

  const handleNudge = async (item) => {
    try {
      setNudging(item.id + item.subjectName);
      const response = await api.post('/api/analytics/nudge', {
        teacherId: item.teacherId,
        className: item.className,
        subjectName: item.subjectName,
        targetType: config.examModeType
      });
      if (response.ok) {
        const result = await response.json();
        toast.success(result.message || `Nudge sent to ${item.teacherName}`);
      } else {
        toast.error('Failed to send nudge');
      }
    } catch (error) {
      toast.error('Error sending nudge');
    } finally {
      setNudging(null);
    }
  };

  const currentData = activeTab === 'academic' ? academicData : cbtData;

  const filteredData = currentData.filter(item => {
    const targetSearch = activeTab === 'academic'
      ? `${item.className} ${item.subjectName} ${item.teacherName}`
      : `${item.title} ${item.className} ${item.subjectName} ${item.teacherName}`;

    const matchesSearch = targetSearch.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesFilter = true;
    if (filterStatus !== 'All') {
      if (activeTab === 'academic') {
        matchesFilter = item.status === filterStatus;
      } else {
        if (filterStatus === 'Completed') matchesFilter = parseFloat(item.participationRate) === 100;
        else if (filterStatus === 'Partial') matchesFilter = parseFloat(item.participationRate) > 0 && parseFloat(item.participationRate) < 100;
        else if (filterStatus === 'Not Started') matchesFilter = parseFloat(item.participationRate) === 0;
      }
    }

    return matchesSearch && matchesFilter;
  });

  const groupedData = (() => {
    if (groupBy === 'none') return { 'All Units': filteredData };

    return filteredData.reduce((acc, item) => {
      let key = 'Other';
      if (groupBy === 'teacher') key = item.teacherName;
      else if (groupBy === 'class') key = item.className;
      else if (groupBy === 'subject') key = item.subjectName;

      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  })();

  const getStats = () => {
    if (activeTab === 'academic') {
      return {
        total: academicData.length,
        completed: academicData.filter(i => i.status === 'Completed').length,
        partial: academicData.filter(i => i.status === 'Partial').length,
        pending: academicData.filter(i => i.status === 'Not Started').length
      };
    } else {
      return {
        total: cbtData.length,
        completed: cbtData.filter(i => parseFloat(i.participationRate) === 100).length,
        partial: cbtData.filter(i => parseFloat(i.participationRate) > 0 && parseFloat(i.participationRate) < 100).length,
        pending: cbtData.filter(i => parseFloat(i.participationRate) === 0).length
      };
    }
  };

  const stats = getStats();

  const getStatusColor = (status, rate) => {
    if (activeTab === 'academic') {
      switch (status) {
        case 'Completed': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
        case 'Partial': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
        default: return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
      }
    } else {
      const r = parseFloat(rate);
      if (r === 100) return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      if (r > 0) return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
    }
  };

  const getTargetLabel = (type) => {
    const labels = {
      assignment1: '1st Assignment',
      assignment2: '2nd Assignment',
      test1: '1st Test',
      test2: '2nd Test',
      examination: 'Final Exam',
      none: 'General Submission'
    };
    return labels[type] || 'Submission';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <p className="text-slate-500 font-black uppercase tracking-widest text-xs">Decrypting Academic Data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-full border border-primary/20">
              Live Intelligence
            </span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
              {config.session} • {config.term}
            </span>
          </div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase italic">
            Submission <span className="text-primary">Ops</span> Tracker
          </h1>
        </div>

        <div className="flex gap-4">
          <button
            onClick={fetchTrackingData}
            className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all text-slate-600 active:scale-90"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <div className="px-6 py-4 bg-slate-900 text-white rounded-3xl shadow-xl shadow-slate-200">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Monitoring Focus</p>
            <p className="text-sm font-black italic">{getTargetLabel(config.examModeType)}</p>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 p-1.5 bg-slate-100 w-fit rounded-[24px]">
        <button
          onClick={() => setActiveTab('academic')}
          className={`px-8 py-3 rounded-[20px] text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'academic' ? 'bg-white text-primary shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Academic Records
        </button>
        <button
          onClick={() => setActiveTab('cbt')}
          className={`px-8 py-3 rounded-[20px] text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'cbt' ? 'bg-white text-primary shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
        >
          CBT Operations
        </button>
      </div>

      {!config.examMode && activeTab === 'academic' && (
        <div className="bg-amber-50 border-2 border-amber-200 p-6 rounded-[32px] flex items-center gap-6">
          <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center flex-shrink-0 animate-pulse">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-black text-amber-900 uppercase italic">Examination Mode Inactive</h3>
            <p className="text-amber-700 font-bold text-sm">Real-time enforcement is disabled. You can still view current entry progress below.</p>
          </div>
        </div>
      )}

      {/* Stats Matrix */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: activeTab === 'academic' ? 'Total Units' : 'Total Exams', value: stats.total, color: 'text-slate-900', bg: 'bg-white' },
          { label: 'Completed', value: stats.completed, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'In Progress', value: stats.partial, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'No Activity', value: stats.pending, color: 'text-rose-600', bg: 'bg-rose-50' }
        ].map((stat, idx) => (
          <div key={idx} className={`${stat.bg} p-8 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden group hover:scale-[1.02] transition-all`}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-current opacity-[0.03] -translate-y-1/2 translate-x-1/2 rounded-full"></div>
            <p className="relative z-10 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">{stat.label}</p>
            <p className={`relative z-10 text-4xl font-black ${stat.color} tracking-tighter italic`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filter Hub */}
      <div className="bg-white p-4 rounded-[32px] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder={activeTab === 'academic' ? "SEARCH CLASS, SUBJECT OR TEACHER..." : "SEARCH EXAM TITLE, CLASS, SUBJECT..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border-0 rounded-2xl px-6 py-4 focus:ring-2 ring-primary outline-none font-bold text-xs uppercase tracking-widest placeholder:text-slate-300"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        <div className="flex bg-slate-50 p-2 rounded-2xl overflow-x-auto min-w-max">
          {['All', 'Completed', 'Partial', 'Not Started'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterStatus === status ? 'bg-white text-primary shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="flex bg-slate-100/50 p-2 rounded-2xl overflow-x-auto min-w-max border border-slate-200/50">
          <span className="self-center px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-200 mr-2">Group By</span>
          {['none', 'teacher', 'class', 'subject'].map(mode => (
            <button
              key={mode}
              onClick={() => setGroupBy(mode)}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${groupBy === mode ? 'bg-white text-primary shadow-sm ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Tracking Ledger */}
      <div className="bg-white rounded-[48px] border border-slate-100 shadow-2xl overflow-hidden min-h-[400px]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="px-8 py-8 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
                {activeTab === 'academic' ? 'Operational Unit' : 'CBT Examination Detail'}
              </th>
              <th className="px-8 py-8 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Lead Instructor</th>
              <th className="px-8 py-8 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Coverage</th>
              <th className="px-8 py-8 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] text-center">Protocol Status</th>
              <th className="px-8 py-8 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {Object.entries(groupedData).length > 0 ? (
              Object.entries(groupedData).map(([groupName, items]) => (
                <React.Fragment key={`group-${groupName}`}>
                  {groupBy !== 'none' && (
                    <tr className="bg-slate-50/30">
                      <td colSpan="5" className="px-8 py-4 border-l-4 border-primary">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black text-primary uppercase tracking-widest opacity-50">{groupBy}:</span>
                          <span className="text-sm font-black text-slate-900 uppercase tracking-wider">{groupName}</span>
                          <span className="px-2 py-0.5 bg-slate-100 text-[10px] font-bold text-slate-500 rounded-md">
                            {items.length} {items.length === 1 ? 'Record' : 'Records'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                  {items.map((item) => (
                    <tr key={`${activeTab}-${item.id}-${item.subjectName}`} className="hover:bg-slate-50/80 transition-all group">
                      <td className="px-8 py-8">
                        <p className="text-xl font-black text-slate-900 tracking-tighter italic">
                          {activeTab === 'academic' ? item.className : item.title}
                        </p>
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                          {activeTab === 'academic' ? item.subjectName : `${item.className} • ${item.subjectName}`}
                        </p>
                      </td>
                      <td className="px-8 py-8">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-black text-slate-400 text-xs">
                            {item.teacherName ? item.teacherName.split(' ').map(n => n[0]).join('') : '??'}
                          </div>
                          <p className="font-bold text-slate-700 text-sm whitespace-nowrap">{item.teacherName || 'Unknown Teacher'}</p>
                        </div>
                      </td>
                      <td className="px-8 py-8">
                        {activeTab === 'academic' ? (
                          <div className="w-48">
                            <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                              <span>Progress</span>
                              <span>{Math.round((item.protocolCount / item.totalStudents) * 100 || 0)}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-700 ${item.status === 'Completed' ? 'bg-emerald-500' : item.status === 'Partial' ? 'bg-amber-500' : 'bg-rose-500'}`}
                                style={{ width: `${(item.protocolCount / item.totalStudents) * 100 || 0}%` }}
                              ></div>
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 mt-2 italic">
                              {item.gradedCount} / {item.totalStudents} Students Synchronized
                            </p>
                          </div>
                        ) : (
                          <div className="w-48">
                            <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                              <span>Response Rate</span>
                              <span>{item.participationRate}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-700 ${parseFloat(item.participationRate) === 100 ? 'bg-emerald-500' : parseFloat(item.participationRate) > 0 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                style={{ width: `${item.participationRate}%` }}
                              ></div>
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 mt-2 italic">
                              {item.completedCount} / {item.totalStudents} Active Submissions
                            </p>
                          </div>
                        )}
                      </td>
                      <td className="px-8 py-8">
                        <div className="flex justify-center">
                          <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${activeTab === 'academic' ? getStatusColor(item.status) : getStatusColor(null, item.participationRate)}`}>
                            {activeTab === 'academic'
                              ? item.status
                              : (parseFloat(item.participationRate) === 100 ? 'Completed' : parseFloat(item.participationRate) > 0 ? 'Partial' : 'Not Started')}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-8 text-right">
                        <div className="flex justify-end gap-2">
                          {(activeTab === 'academic' ? item.status !== 'Completed' : parseFloat(item.participationRate) < 100) && (
                            <button
                              onClick={() => handleNudge(item)}
                              disabled={nudging === (item.id + item.subjectName)}
                              className={`flex items-center gap-1 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${nudging === (item.id + item.subjectName)
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                                }`}
                              title="Remind Teacher"
                            >
                              {nudging === (item.id + item.subjectName) ? (
                                <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin"></div>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                              )}
                              {nudging === (item.id + item.subjectName) ? 'Nudging...' : 'NUDGE'}
                            </button>
                          )}
                          <button
                            className="p-3 hover:bg-slate-50 rounded-xl text-slate-300 hover:text-primary transition-all active:scale-90"
                            title="View Details"
                          >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="px-8 py-20 text-center">
                  <div className="flex flex-col items-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-[32px] flex items-center justify-center mb-6">
                      <svg className="w-10 h-10 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <p className="text-xl font-black text-slate-300 uppercase italic tracking-tighter">No Units found matching search criteria</p>
                  </div>
                </td>
              </tr>
            )}

            {filteredData.length === 0 && (
              <tr>
                <td colSpan="5" className="px-8 py-20 text-center">
                  <div className="flex flex-col items-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-[32px] flex items-center justify-center mb-6">
                      <svg className="w-10 h-10 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <p className="text-xl font-black text-slate-300 uppercase italic tracking-tighter">No Units found matching search criteria</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ExamSubmissionTracker;
