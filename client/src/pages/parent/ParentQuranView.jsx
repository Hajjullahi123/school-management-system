import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLocation, Link } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { QRCodeSVG } from 'qrcode.react';
import { api, API_BASE_URL } from '../../api';
import useSchoolSettings from '../../hooks/useSchoolSettings';

const ParentQuranView = () => {
  const { user } = useAuth();
  const location = useLocation();
  const { settings: schoolSettings } = useSchoolSettings();
  const queryParams = new URLSearchParams(location.search);
  const studentIdParam = queryParams.get('studentId');

  const [selectedChild, setSelectedChild] = useState(null);
  const [children, setChildren] = useState([]);
  const [records, setRecords] = useState([]);
  const [targets, setTargets] = useState([]);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printType, setPrintType] = useState('weekly'); // daily, weekly, monthly
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
        if (studentIdParam) {
          const matched = data.find(c => c.id === parseInt(studentIdParam));
          if (matched) setSelectedChild(matched);
          else if (data.length > 0) setSelectedChild(data[0]);
        } else if (data.length > 0) {
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

  const getTargetProgress = (target) => {
    if (!records || records.length === 0) return 0;
    
    // Filter records within target period and matching target type
    const relevantRecords = records.filter(r => {
      const rDate = new Date(r.date);
      return rDate >= new Date(target.startDate) && 
             rDate <= new Date(target.endDate) && 
             r.type === target.targetType;
    });

    if (target.pagesCount > 0) {
      const totalPages = relevantRecords.reduce((sum, r) => sum + (parseFloat(r.pages) || 0), 0);
      return Math.min(100, Math.round((totalPages / target.pagesCount) * 100));
    }

    // Fallback: If no pagesCount, check by entries count (e.g., 10 entries for a termly target)
    const expectedEntries = target.period === 'daily' ? 1 : target.period === 'weekly' ? 5 : target.period === 'monthly' ? 20 : 40;
    return Math.min(100, Math.round((relevantRecords.length / expectedEntries) * 100));
  };
  const handlePrint = (type) => {
    setPrintType(type);
    setShowPrintModal(true);
  };

  const componentRef = useRef();
  const handlePrintAction = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `${selectedChild?.user?.firstName}_Quran_Report`,
  });

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
      <div className="bg-gradient-to-br from-[#1e293b] to-[#334155] text-white rounded-3xl p-8 shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="relative z-10">
          <h1 className="text-3xl font-black mb-2 tracking-tight">Qur'an Progress Tracker</h1>
          <p className="text-slate-400 font-medium">Monitoring the spiritual and academic journey of {selectedChild.user.firstName}</p>
        </div>
        <div className="flex gap-3 relative z-10 w-full md:w-auto">
          <button 
            onClick={() => handlePrint('weekly')}
            className="flex-1 md:flex-none px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95"
          >
            🖨️ Print Report
          </button>
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
                          className={`h-3 rounded-full shadow-lg ${
                            getTargetProgress(target) > 70 ? 'bg-emerald-400' : 
                            getTargetProgress(target) > 40 ? 'bg-amber-400' : 'bg-rose-500'
                          }`}
                          style={{ width: `${getTargetProgress(target)}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between mt-1 text-[9px] font-black uppercase opacity-60">
                        <span>{getTargetProgress(target)}% Achieved</span>
                        <span>Goal: {target.pagesCount || 'N/A'} Pages</span>
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
            <Link to={`/dashboard/parent/messages${selectedChild ? '?studentId=' + selectedChild.id : ''}`} className="w-full py-4 bg-white text-primary font-black rounded-2xl hover:scale-[1.02] transition block text-center">
              Message Teacher
            </Link>
          </div>
        </div>
      </div>

      {/* Print Report Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Generate Official Report</h2>
                <div className="flex gap-2 mt-2">
                  {['daily', 'weekly', 'monthly'].map(t => (
                    <button
                      key={t}
                      onClick={() => setPrintType(t)}
                      className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                        printType === t ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-white text-gray-400 border border-gray-200'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => handlePrintAction()}
                  className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                  Confirm & Print
                </button>
                <button 
                  onClick={() => setShowPrintModal(false)}
                  className="p-2.5 bg-gray-100 text-gray-500 rounded-xl hover:bg-gray-200 transition-all"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-0 md:p-8 bg-slate-100 custom-scrollbar">
              {/* Mobile Scroll Hint */}
              <div className="md:hidden flex items-center justify-center gap-2 py-4 text-emerald-600 font-black text-[10px] uppercase tracking-widest animate-pulse">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
                Pinch or scroll to see whole report
              </div>

              <div className="overflow-x-auto pb-12 px-4 flex justify-center no-scrollbar">
                <div ref={componentRef} className="report-card-scaler origin-top scale-[0.42] xs:scale-[0.55] md:scale-90 lg:scale-100 transition-transform duration-500 shadow-2xl">
                  <QuranReportCard student={selectedChild} records={records} type={printType} schoolSettings={schoolSettings} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Printable Report Component
const QuranReportCard = ({ student, records, type, schoolSettings }) => {
  const filteredRecords = records.filter(r => {
    const rDate = new Date(r.date);
    const now = new Date();
    if (type === 'daily') return rDate.toDateString() === now.toDateString();
    if (type === 'weekly') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return rDate >= weekAgo;
    }
    if (type === 'monthly') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return rDate >= monthAgo;
    }
    return true;
  });

  const reportColor = schoolSettings?.reportColorScheme || schoolSettings?.primaryColor || '#064e3b';
  const reportFont = schoolSettings?.reportFontFamily || 'serif';

  return (
    <div className="p-8 bg-white text-black min-h-[297mm] border-[12px] print:border-8 print:p-4 mx-auto w-[210mm]" style={{ fontFamily: reportFont, borderColor: reportColor }}>
      {/* Official Header */}
      <div className="grid grid-cols-[96px_1fr_96px] items-start gap-4 mb-6 pb-4 border-b-2 border-slate-200">
        <div className="w-24 h-24 flex-shrink-0">
          {schoolSettings?.logoUrl && (
            <img
              src={schoolSettings.logoUrl.startsWith('data:') || schoolSettings.logoUrl.startsWith('http') ? schoolSettings.logoUrl : `${API_BASE_URL}${schoolSettings.logoUrl.startsWith('/') ? schoolSettings.logoUrl : '/' + schoolSettings.logoUrl}`}
              alt="Logo"
              className="w-full h-full object-contain"
            />
          )}
        </div>

        <div className="text-center flex flex-col items-center justify-center">
          <h1 className="text-2xl font-black uppercase tracking-wider leading-none text-emerald-900 mb-1" style={{ color: reportColor }}>
            {schoolSettings?.schoolName || 'SCHOOL NAME'}
          </h1>
          <p className="text-xs font-black italic text-gray-800 mb-1 uppercase tracking-normal w-full text-center">{schoolSettings?.schoolMotto || 'Excellence and Dedication'}</p>
          <p className="text-[9px] font-black text-gray-600 max-w-[500px] leading-tight text-center">{schoolSettings?.address || 'School Address Location'} | TEL: {schoolSettings?.phone || '000'} | Email: {schoolSettings?.email || 'email@school.com'}</p>

          <div className="mt-2 border-b-2 inline-block px-4 pb-0" style={{ borderColor: reportColor }}>
            <h2 className="text-lg font-black uppercase tracking-wider italic">
              Official Qur'an Progress Report
            </h2>
          </div>
        </div>

        <div className="w-24 h-28 border-2 border-black bg-gray-50 flex-shrink-0 relative overflow-hidden">
          {(() => {
            const photo = student?.user?.photoUrl || student?.photoUrl;
            return photo ? (
              <img src={photo.startsWith('data:') || photo.startsWith('http') ? photo : `${API_BASE_URL}${photo}`} alt="Student" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[10px] text-center p-1 font-bold text-gray-300">PHOTO</div>
            );
          })()}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-8 bg-slate-50 p-6 rounded-2xl border border-slate-100">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Student Particulars</p>
          <p className="text-xl font-black text-slate-900 uppercase tracking-tight">{student.user.firstName} {student.user.lastName}</p>
          <p className="text-sm font-bold text-emerald-700 uppercase">{student.classModel?.name} {student.classModel?.arm}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Registration No</p>
          <p className="text-xl font-bold italic tracking-tighter">{student.admissionNumber}</p>
          <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest">{type} review • {new Date().toLocaleDateString()}</p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-emerald-900 mb-4 flex items-center gap-2">
          Chronological Summary
          <span className="h-0.5 flex-1 bg-emerald-100"></span>
        </h3>
        
        {filteredRecords.length === 0 ? (
          <p className="text-center py-12 text-slate-400 italic font-medium">No progress entries recorded for this {type} period.</p>
        ) : (
          <table className="w-full border-collapse border-2 border-black">
            <thead>
              <tr className="bg-emerald-900 text-white text-[10px] font-black uppercase tracking-widest" style={{ backgroundColor: reportColor }}>
                <th className="p-3 text-left border border-black">Date</th>
                <th className="p-3 text-left border border-black">Content</th>
                <th className="p-3 text-left border border-black">Verses</th>
                <th className="p-3 text-center border border-black">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 italic">
              {filteredRecords.map(record => (
                <tr key={record.id} className="text-sm font-bold">
                  <td className="p-3 text-slate-600 border border-black">{new Date(record.date).toLocaleDateString()}</td>
                  <td className="p-3 text-slate-900 border border-black">{record.surah || `Juz ${record.juz}`} ({record.type})</td>
                  <td className="p-3 text-slate-500 border border-black">{record.ayahStart}-{record.ayahEnd || record.ayahStart}</td>
                  <td className="p-3 text-center border border-black">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      record.status === 'Excellent' ? 'text-green-700' :
                      record.status === 'Good' ? 'text-blue-700' :
                      record.status === 'Fair' ? 'text-yellow-700' : 'text-red-700'
                    }`}>
                      {record.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-12 grid grid-cols-2 gap-12 items-end">
        <div className="text-center">
          <div className="h-10 flex flex-col items-center justify-center mb-1">
             {student?.classModel?.classTeacher?.signatureUrl ? (
                <img 
                  src={student.classModel.classTeacher.signatureUrl.startsWith('data:') || student.classModel.classTeacher.signatureUrl.startsWith('http') ? student.classModel.classTeacher.signatureUrl : `${API_BASE_URL}${student.classModel.classTeacher.signatureUrl}`} 
                  alt="Form Master Signature" 
                  className="h-10 w-auto mix-blend-multiply" 
                />
             ) : (
                <div className="h-1 w-full bg-slate-200"></div>
             )}
          </div>
          <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Form Master's Signature</p>
          <p className="text-[8px] font-bold text-slate-400 capitalize">{student?.classModel?.classTeacher?.firstName} {student?.classModel?.classTeacher?.lastName}</p>
        </div>
        <div className="text-center">
          <div className="h-10 flex flex-col items-center justify-end mb-1">
              <div className="h-[1px] w-full bg-slate-400"></div>
          </div>
          <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Quran Coordinator Signature</p>
          <div className="mt-2 flex justify-center">
            <QRCodeSVG 
              value={`${window.location.origin}/dashboard/quran-progress?studentId=${student.id}`}
              size={40}
              level="H"
            />
          </div>
        </div>
      </div>
      
      <div className="mt-auto pt-16 flex justify-between items-center text-[8px] font-black text-slate-300 uppercase tracking-widest">
        <span>Integrated spiritual monitoring system • strictly for internal school use</span>
        <span>Generated by {schoolSettings?.schoolName || 'Kuntau-Pay Portal'}</span>
      </div>
    </div>
  );
};

export default ParentQuranView;

<style>{`
  .report-card-scaler {
    width: 210mm;
    transform-origin: top center;
    margin: 0 auto;
    transition: transform 0.3s ease-out;
  }

  @media (max-width: 1024px) {
    .report-card-scaler {
      transform: scale(0.85);
    }
  }

  @media (max-width: 768px) {
    .report-card-scaler {
      transform: scale(0.7);
    }
  }

  @media (max-width: 640px) {
    .report-card-scaler {
      transform: scale(0.55);
      transform-origin: top left;
      margin-left: 0;
    }
  }

  @media (max-width: 480px) {
    .report-card-scaler {
      transform: scale(0.42);
    }
  }

  @media (max-width: 380px) {
    .report-card-scaler {
      transform: scale(0.35);
    }
  }
  
  @media print {
    .report-card-scaler { 
      transform: none !important; 
      width: 210mm !important;
      margin: 0 !important;
      padding: 0 !important;
    }
  }

  /* Custom Scrollbar for the preview container */
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(0,0,0,0.1);
    border-radius: 10px;
  }
`}</style>
