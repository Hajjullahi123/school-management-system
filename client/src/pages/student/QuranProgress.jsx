import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useReactToPrint } from 'react-to-print';
import { QRCodeSVG } from 'qrcode.react';
import { api, API_BASE_URL } from '../../api';
import useSchoolSettings from '../../hooks/useSchoolSettings';

const QuranProgress = () => {
  const { user } = useAuth();
  const { settings: schoolSettings } = useSchoolSettings();
  const [records, setRecords] = useState([]);
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printType, setPrintType] = useState('weekly');
  const [stats, setStats] = useState({
    totalRecords: 0,
    thisWeek: 0,
    thisMonth: 0,
    averageStatus: 'N/A'
  });

  const componentRef = useRef();
  const handlePrintAction = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `${user?.firstName}_Quran_Report`,
  });

  useEffect(() => {
    if (user?.student?.id) {
      fetchRecords();
      fetchTargets();
    }
  }, [user]);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/api/quran-tracker/records/${user.student.id}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Failed to fetch records');
      }

      const data = await response.json();
      if (Array.isArray(data)) {
        setRecords(data);
        calculateStats(data);
      } else {
        console.error('Expected an array for records, got:', data);
        setRecords([]);
      }
    } catch (error) {
      console.error('Error fetching records:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTargets = async () => {
    if (!user?.student?.classId) return;
    try {
      const response = await api.get(`/api/quran-tracker/targets/${user.student.classId}`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setTargets(data);
        } else {
          setTargets([]);
        }
      }
    } catch (error) {
      console.error('Error fetching targets:', error);
    }
  };

  const calculateStats = (records) => {
    if (!Array.isArray(records)) return;

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
    const expectedEntries = target.period === 'daily' ? 1 : target.period === 'weekly' ? 5 : target.period === 'monthly' ? 20 : 40;
    return Math.min(100, Math.round((relevantRecords.length / expectedEntries) * 100));
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

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#064e3b] to-[#065f46] text-white rounded-[32px] p-8 shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="relative z-10">
          <h1 className="text-3xl font-black mb-2 tracking-tight italic">Spiritual Journey</h1>
          <p className="text-emerald-100/70 font-medium">Monitoring your Qur'an memorization and revision path</p>
        </div>
        <div className="flex gap-3 relative z-10 w-full md:w-auto">
          <button 
             onClick={() => {
               setPrintType('weekly');
               setShowPrintModal(true);
             }}
             className="flex-1 md:flex-none px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
          >
            🖨️ Generate Report
          </button>
        </div>
        <div className="absolute top-0 right-0 -m-8 opacity-10">
          <svg className="w-64 h-64" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm0 16c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7z"/></svg>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-100 p-6 rounded-[24px] animate-slideIn">
          <div className="flex items-center gap-4">
            <div className="bg-rose-500 text-white p-2 rounded-xl">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <div>
              <p className="text-sm font-black text-rose-900 uppercase tracking-tight">System Notification</p>
              <p className="text-xs font-bold text-rose-600 mt-0.5">{error}</p>
              {error.toLowerCase().includes('premium') && (
                <p className="text-[10px] text-rose-400 mt-2 font-black uppercase tracking-widest bg-white w-fit px-3 py-1 rounded-full border border-rose-100">Contact Admin for Premium Access</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-6 rounded-[24px] shadow-sm border border-gray-100 flex flex-col justify-between">
          <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight mb-2">Total Sessions</span>
          <div>
            <p className="text-xl sm:text-3xl font-black text-slate-900">{stats.totalRecords}</p>
            <p className="text-[8px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider">Entries</p>
          </div>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-[24px] shadow-sm border border-gray-100 flex flex-col justify-between">
          <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight mb-2">Weekly Activity</span>
          <div>
            <p className="text-xl sm:text-3xl font-black text-emerald-600">{stats.thisWeek}</p>
            <p className="text-[8px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider">Sessions</p>
          </div>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-[24px] shadow-sm border border-gray-100 flex flex-col justify-between">
          <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight mb-2">Monthly Growth</span>
          <div>
            <p className="text-xl sm:text-3xl font-black text-blue-600">{stats.thisMonth}</p>
            <p className="text-[8px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider">Wins</p>
          </div>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-[24px] shadow-sm border border-gray-100 flex flex-col justify-between">
          <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight mb-2">Average Rank</span>
          <div>
            <p className={`text-lg sm:text-2xl font-black ${
              stats.averageStatus === 'Excellent' ? 'text-emerald-500' :
              stats.averageStatus === 'Good' ? 'text-blue-500' :
              stats.averageStatus === 'Fair' ? 'text-amber-500' : 'text-rose-500'
            }`}>{stats.averageStatus}</p>
            <p className="text-[8px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider">Status</p>
          </div>
        </div>
      </div>

      {/* Active Targets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 p-8">
            <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
              Learning Goals
            </h2>
            {targets.length > 0 ? (
              <div className="space-y-6">
                {targets.map(target => (
                  <div key={target.id} className="p-6 bg-slate-900 rounded-[28px] text-white">
                    <div className="flex justify-between items-center mb-4">
                      <span className="px-3 py-1 bg-white/20 rounded-full text-[9px] font-black uppercase tracking-widest">{target.period}</span>
                      <span className="text-[9px] font-bold opacity-60">{new Date(target.endDate).toLocaleDateString()}</span>
                    </div>
                    <h3 className="text-lg font-bold mb-4">
                      {target.surahStart || `Juz ${target.juzStart}`} to {target.surahEnd || 'End'}
                      {target.subject && (
                        <span className="ml-2 px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[9px] uppercase font-black">
                          {target.subject.name}
                        </span>
                      )}
                    </h3>
                    <div className="space-y-4">
                      <div className="flex justify-between text-[10px] font-black uppercase opacity-60">
                         <span>Progress</span>
                         <span>{getTargetProgress(target)}%</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-2">
                        <div 
                           className={`h-2 rounded-full ${getTargetProgress(target) > 70 ? 'bg-emerald-400' : 'bg-amber-400'}`}
                           style={{ width: `${getTargetProgress(target)}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-white/50 italic leading-relaxed">{target.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-[24px] border-2 border-dashed border-gray-200">
                <p className="text-gray-400 font-medium">No class targets set.</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 p-8">
            <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
              Timeline History
            </h2>
            <div className="relative border-l-2 border-slate-100 ml-4 space-y-8 pb-4">
               {records.length === 0 ? (
                <div className="text-center py-12 text-slate-400 font-medium">No records found.</div>
              ) : (
                records.map((record) => (
                  <div key={record.id} className="relative pl-8">
                    <div className={`absolute left-[-9px] top-0 w-4 h-4 rounded-full border-4 border-white shadow-sm ${
                      record.status === 'Excellent' ? 'bg-emerald-500' :
                      record.status === 'Good' ? 'bg-blue-500' :
                      record.status === 'Fair' ? 'bg-amber-500' : 'bg-rose-500'
                    }`}></div>
                    <div className="bg-slate-50 rounded-[24px] p-6 hover:shadow-lg transition-all group">
                       <div className="flex justify-between items-start mb-4">
                         <div>
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(record.date).toLocaleDateString()}</p>
                           <h3 className="text-lg font-black text-slate-900 mt-1">
                             {record.surah || `Juz ${record.juz}`}
                             {record.subject && (
                               <span className="ml-2 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[9px] uppercase font-black border border-emerald-100">
                                 {record.subject.name}
                               </span>
                             )}
                           </h3>
                         </div>
                         <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase ${getStatusColor(record.status)}`}>
                           {record.status}
                         </span>
                       </div>
                       <div className="grid grid-cols-2 gap-4 mb-4 text-[11px]">
                         <div className="bg-white p-3 rounded-2xl border border-slate-100">
                           <p className="font-black text-slate-400 uppercase text-[8px] tracking-widest mb-1">Passage</p>
                           <p className="font-bold text-slate-700">Verses {record.ayahStart}-{record.ayahEnd || 'End'}</p>
                         </div>
                         <div className="bg-white p-3 rounded-2xl border border-slate-100">
                           <p className="font-black text-slate-400 uppercase text-[8px] tracking-widest mb-1">Session Type</p>
                           <p className="font-bold text-slate-700 capitalize">{record.type}</p>
                         </div>
                       </div>
                       {record.comments && (
                        <div className="bg-white/50 p-4 rounded-2xl border border-dashed border-slate-200">
                          <p className="text-sm text-slate-600 leading-relaxed"><span className="font-black text-emerald-700 uppercase text-[9px] mr-2">Teacher Note:</span>{record.comments}</p>
                        </div>
                       )}
                    </div>
                  </div>
                ))
              )}
            </div>
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
                  Confirm & Print
                </button>
                <button 
                  onClick={() => setShowPrintModal(false)}
                  className="p-2.5 bg-gray-100 text-gray-500 rounded-xl hover:bg-gray-200 transition-all"
                >
                  Close View
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
                  <QuranReportCard student={{...user.student, user }} records={records} type={printType} schoolSettings={schoolSettings} />
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
                  <td className="p-3 text-slate-900 border border-black">
                    {record.surah || `Juz ${record.juz}`} ({record.type})
                    {record.subject && (
                      <div className="text-[9px] uppercase font-black text-emerald-600">[{record.subject.name}]</div>
                    )}
                  </td>
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



<style>{`
  .report-card-scaler {
    width: 210mm;
    transform-origin: top center;
    margin: 0 auto;
    transition: transform 0.3s ease-out;
  }

  @media (max-width: 1024px) {
    .report-card-scaler { transform: scale(0.85); }
  }

  @media (max-width: 768px) {
    .report-card-scaler { transform: scale(0.7); }
  }

  @media (max-width: 640px) {
    .report-card-scaler {
       transform: scale(0.55);
       transform-origin: top left;
       margin-left: 0;
    }
  }

  @media (max-width: 480px) {
    .report-card-scaler { transform: scale(0.42); }
  }

  @media (max-width: 380px) {
    .report-card-scaler { transform: scale(0.35); }
  }
  
  @media print {
    .report-card-scaler { 
      transform: none !important; 
      width: 210mm !important;
      margin: 0 !important;
    }
  }
`}</style>
export default QuranProgress;
