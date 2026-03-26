import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';

const ParentQuranView = () => {
  const { user } = useAuth();
  const [selectedChild, setSelectedChild] = useState(null);
  const [children, setChildren] = useState([]);
  const [records, setRecords] = useState([]);
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalRecords: 0,
    thisWeek: 0,
    thisMonth: 0,
    averageStatus: 'N/A'
  });

  useEffect(() => {
    fetchWards();
  }, []);

  const fetchWards = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/parents/my-wards');
      if (response.ok) {
        const data = await response.json();
        setChildren(data);
        if (data.length > 0) {
          setSelectedChild(data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching wards:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedChild) {
      fetchRecords();
      fetchTargets();
    }
  }, [selectedChild]);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/quran-tracker/records/${selectedChild.id}`);
      const data = await response.json();
      setRecords(data);
      calculateStats(data);
    } catch (error) {
      console.error('Error fetching records:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTargets = async () => {
    if (!selectedChild?.classId) return;
    try {
      const response = await api.get(`/api/quran-tracker/targets/${selectedChild.classId}`);
      const data = await response.json();
      setTargets(data);
    } catch (error) {
      console.error('Error fetching targets:', error);
    }
  };

  const calculateStats = (records) => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const thisWeek = records.filter(r => new Date(r.date) >= weekAgo).length;
    const thisMonth = records.filter(r => new Date(r.date) >= monthAgo).length;

    const statusValues = { 'Excellent': 4, 'Good': 3, 'Fair': 2, 'Poor': 1 };
    const avgValue = records.length > 0
      ? records.reduce((sum, r) => sum + (statusValues[r.status] || 0), 0) / records.length
      : 0;

    const avgStatus = avgValue >= 3.5 ? 'Excellent' : avgValue >= 2.5 ? 'Good' : avgValue >= 1.5 ? 'Fair' : 'Poor';

    setStats({
      totalRecords: records.length,
      thisWeek,
      thisMonth,
      averageStatus: records.length > 0 ? avgStatus : 'N/A'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Excellent': return 'bg-green-100 text-green-800 border-green-200';
      case 'Good': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Fair': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Poor': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Excellent': return '🌟';
      case 'Good': return '✅';
      case 'Fair': return '⚠️';
      case 'Poor': return '❌';
      default: return '📝';
    }
  };

  if (!selectedChild) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No children found in your account</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#1e293b] to-[#334155] text-white rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl font-black mb-2 tracking-tight">Qur'an Progress Tracker</h1>
          <p className="text-slate-400 font-medium">Monitoring the spiritual and academic journey of {selectedChild.user.firstName}</p>
        </div>
        <div className="absolute top-0 right-0 -m-8 opacity-10">
          <svg className="w-64 h-64" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm0 16c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7z"/></svg>
        </div>
      </div>

      {/* Child Selector & Quick Stats */}
      <div className="flex flex-col lg:flex-row gap-6">
        {children.length > 1 && (
          <div className="lg:w-1/3 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Select Ward</label>
            <div className="space-y-2">
              {children.map(child => (
                <button
                  key={child.id}
                  onClick={() => setSelectedChild(child)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl transition duration-300 ${
                    selectedChild.id === child.id 
                      ? 'bg-primary/10 border-2 border-primary' 
                      : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    selectedChild.id === child.id ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {child.user.firstName[0]}
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-900">{child.user.firstName} {child.user.lastName}</p>
                    <p className="text-xs text-gray-400">{child.admissionNumber}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</span>
            <div>
              <p className="text-3xl font-black text-gray-900">{stats.totalRecords}</p>
              <p className="text-xs text-gray-400 font-medium">Sessions</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Weekly</span>
            <div>
              <p className="text-3xl font-black text-green-600">{stats.thisWeek}</p>
              <p className="text-xs text-gray-400 font-medium">Tests</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Monthly</span>
            <div>
              <p className="text-3xl font-black text-blue-600">{stats.thisMonth}</p>
              <p className="text-xs text-gray-400 font-medium">Insights</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Grade</span>
            <div>
              <p className={`text-2xl font-black ${
                stats.averageStatus === 'Excellent' ? 'text-green-500' :
                stats.averageStatus === 'Good' ? 'text-blue-500' :
                stats.averageStatus === 'Fair' ? 'text-yellow-500' : 'text-red-500'
              }`}>{stats.averageStatus}</p>
              <p className="text-xs text-gray-400 font-medium">Performance</p>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Progress & Targets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
            <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
              Recent Progress Timeline
            </h2>
            
            <div className="relative border-l-2 border-gray-100 ml-4 space-y-8 pb-4">
              {loading ? (
                <div className="animate-pulse space-y-4">
                  {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-50 rounded-2xl"></div>)}
                </div>
              ) : records.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400 font-medium">No records found for this period.</p>
                </div>
              ) : (
                records.map((record, index) => (
                  <div key={record.id} className="relative pl-8">
                    <div className={`absolute left-[-9px] top-0 w-4 h-4 rounded-full border-4 border-white shadow-sm ${
                      record.status === 'Excellent' ? 'bg-green-500' :
                      record.status === 'Good' ? 'bg-blue-500' :
                      record.status === 'Fair' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}></div>
                    <div className="bg-gray-50 rounded-2xl p-6 hover:shadow-md transition group">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{new Date(record.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                          <h3 className="text-lg font-black text-gray-900 mt-1">{record.surah || `Juz ${record.juz}`}</h3>
                        </div>
                        <span className={`px-4 py-1.5 rounded-full text-xs font-bold ${getStatusColor(record.status)}`}>
                          {record.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-white p-3 rounded-xl border border-gray-100">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Verses</p>
                          <p className="font-bold text-gray-700">{record.ayahStart} - {record.ayahEnd || record.ayahStart}</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-gray-100">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Type</p>
                          <p className="font-bold text-gray-700 capitalize">{record.type}</p>
                        </div>
                      </div>
                      {record.comments && (
                        <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                          <p className="text-sm text-gray-600 leading-relaxed"><span className="font-black text-primary uppercase text-[10px] mr-2">Note:</span>{record.comments}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
            <h2 className="text-xl font-black text-gray-900 mb-6">Learning Goal</h2>
            {targets.length > 0 ? (
              <div className="space-y-6">
                {targets.map(target => (
                  <div key={target.id} className="p-6 bg-slate-900 rounded-3xl text-white">
                    <div className="flex justify-between items-center mb-4">
                      <span className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest">{target.period}</span>
                      <span className="text-[10px] font-bold opacity-60">Expires {new Date(target.endDate).toLocaleDateString()}</span>
                    </div>
                    <h3 className="text-lg font-bold mb-4">{target.surahStart} to {target.surahEnd || 'End'}</h3>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between text-xs font-bold opacity-75">
                        <span>Progress</span>
                        <span>{target.targetType}</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-3">
                        <div 
                          className="bg-primary h-3 rounded-full shadow-lg shadow-primary/20" 
                          style={{ width: '65%' }}
                        ></div>
                      </div>
                      <p className="text-xs text-white/60 italic leading-relaxed">{target.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                <p className="text-gray-400 font-medium">No active targets set.</p>
              </div>
            )}
          </div>

          <div className="bg-gradient-to-br from-primary to-primary-600 rounded-3xl p-8 text-white shadow-xl shadow-primary/20">
            <h3 className="text-lg font-black mb-2">Teacher Contact</h3>
            <p className="text-sm opacity-80 mb-6">Have questions about your child's progress? Reach out to the assigned teacher.</p>
            <button className="w-full py-4 bg-white text-primary font-black rounded-2xl hover:scale-[1.02] transition">
              Message Teacher
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParentQuranView;
