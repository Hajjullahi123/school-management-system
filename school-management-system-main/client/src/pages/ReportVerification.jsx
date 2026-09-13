import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, API_BASE_URL } from '../api';
import { QRCodeSVG } from 'qrcode.react';

const ReportVerification = () => {
    const { type, studentId, targetId } = useParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);

    useEffect(() => {
        fetchVerification();
    }, [type, studentId, targetId]);

    const fetchVerification = async () => {
        setLoading(true);
        try {
            // Public endpoint - no authenticate middleware
            const response = await api.get(`/api/reports/verify/${type}/${studentId}/${targetId}`);
            if (!response.ok) {
                throw new Error('Verification Failed - This document may be invalid or forged.');
            }
            const result = await response.json();
            setData(result);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 font-sans">
                <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-slate-500 font-black uppercase tracking-widest text-xs animate-pulse">Authenticating Document...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-rose-50 p-6 font-sans">
                <div className="bg-white p-8 rounded-[40px] shadow-2xl max-w-md w-full text-center border-2 border-rose-100">
                    <div className="w-24 h-24 bg-rose-100 rounded-[32px] flex items-center justify-center mx-auto mb-6">
                        <svg className="w-12 h-12 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-2">Security Alert</h1>
                    <p className="text-slate-500 font-medium leading-relaxed mb-8">{error}</p>
                    <Link to="/login" className="block w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all">Go to Portal</Link>
                </div>
            </div>
        );
    }

    const reportColor = data?.school?.primaryColor || '#065f46';

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-6 font-sans">
            <div className="max-w-xl mx-auto">
                <div className="bg-white rounded-[48px] shadow-2xl overflow-hidden border border-slate-100">
                    {/* Status Header */}
                    <div className="p-8 pb-0 text-center relative">
                        <div className="absolute top-0 right-0 p-8">
                             <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100">
                                 <svg className="w-6 h-6 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M2.166 4.9L10 1.55l7.834 3.35a1 1 0 01.583.912v5.188a10 10 0 01-5.188 8.163l-3.229 1.737a1 1 0 01-.912 0l-3.229-1.737A10 10 0 011.583 11V5.812a1 1 0 01.583-.912z" clipRule="evenodd" />
                                 </svg>
                             </div>
                        </div>

                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-full border border-emerald-100 mb-6">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Official Authenticated Document</span>
                        </div>
                        
                        <div className="relative inline-block mb-6">
                            <div className="w-24 h-24 rounded-[32px] overflow-hidden bg-slate-100 border-4 border-white shadow-xl mx-auto">
                                {data?.student?.photoUrl ? (
                                    <img src={data.student.photoUrl.startsWith('http') ? data.student.photoUrl : `${API_BASE_URL}${data.student.photoUrl}`} alt="Student" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                         <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                         </svg>
                                    </div>
                                )}
                            </div>
                        </div>

                        <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase mb-2">{data?.student?.name}</h1>
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mb-8">Verified {type.replace('-', ' ')} Summary</p>
                    </div>

                    {/* Verification Details */}
                    <div className="px-8 pb-8 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Admission Number</p>
                                <p className="text-sm font-black text-slate-900">{data?.student?.admissionNumber}</p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Class Level</p>
                                <p className="text-sm font-black text-slate-900">{data?.student?.class}</p>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100">
                            <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-200/50">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Performance Metrics</p>
                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${data?.performance?.grade === 'F' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                    {data?.performance?.remark}
                                </span>
                            </div>

                            <div className="grid grid-cols-3 gap-6 text-center">
                                <div>
                                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Total Score</p>
                                    <p className="text-lg font-black text-slate-900 leading-none">{data?.performance?.totalScore}</p>
                                </div>
                                <div className="border-x border-slate-200/50">
                                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Average</p>
                                    <p className="text-lg font-black text-slate-900 leading-none">{data?.performance?.average?.toFixed(1)}%</p>
                                </div>
                                <div>
                                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Grade</p>
                                    <p className="text-lg font-black text-emerald-600 leading-none">{data?.performance?.grade}</p>
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-slate-200/50 grid grid-cols-2 gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center border border-indigo-100">
                                        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">ATTENDANCE</p>
                                        <p className="text-[11px] font-black text-slate-900">{data?.attendance?.present}/{data?.attendance?.total} DAYS</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 ${data?.feeStatus?.status === 'Cleared' ? 'bg-emerald-50' : 'bg-rose-50'} rounded-2xl flex items-center justify-center border ${data?.feeStatus?.status === 'Cleared' ? 'border-emerald-100' : 'border-rose-100'}`}>
                                        <svg className={`w-5 h-5 ${data?.feeStatus?.status === 'Cleared' ? 'text-emerald-600' : 'text-rose-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">FEE STANDING</p>
                                        <p className={`text-[11px] font-black ${data?.feeStatus?.status === 'Cleared' ? 'text-emerald-700' : 'text-rose-700'}`}>
                                            {data?.feeStatus?.status || 'Unknown'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-900 p-6 rounded-[32px] text-white flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">Issuing Institution</p>
                                <p className="text-sm font-black uppercase tracking-tight">{data?.school?.name}</p>
                                <p className="text-[10px] text-white/40 mt-1">{data?.school?.address}</p>
                            </div>
                            <div className="w-16 h-16 bg-white/10 rounded-2xl p-2 border border-white/10">
                                {data?.school?.logoUrl && (
                                    <img src={data.school.logoUrl.startsWith('http') ? data.school.logoUrl : `${API_BASE_URL}${data.school.logoUrl}`} alt="Logo" className="w-full h-full object-contain" />
                                )}
                            </div>
                        </div>

                        <div className="pt-4 flex flex-col items-center">
                            <div className="text-[8px] font-black text-slate-300 uppercase tracking-[0.3em] mb-4">Verification Audit Trail</div>
                            <div className="flex items-center gap-6 opacity-30">
                                <QRCodeSVG value={window.location.href} size={40} />
                                <div className="text-[7px] font-bold text-slate-400 max-w-[120px] uppercase leading-tight">
                                    This Document Has Been Validated Against The Electronic Database Record On {new Date().toLocaleDateString()} At {new Date().toLocaleTimeString()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 text-center px-4">
                    <p className="text-[10px] font-medium text-slate-400 leading-relaxed uppercase tracking-widest">
                        Document Fingerprint: {btoa(`${studentId}-${targetId}-${type}`).substring(0, 32).toUpperCase()}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ReportVerification;
