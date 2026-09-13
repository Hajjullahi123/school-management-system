import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const BenchmarkingDashboard = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBenchmarks();
  }, []);

  const fetchBenchmarks = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/departments/benchmarking/all');
      if (response.ok) {
        setData(await response.json());
      } else {
        toast.error('Failed to access benchmarking intelligence');
      }
    } catch (error) {
      toast.error('Benchmarking link offline');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-12 space-y-8 sm:space-y-12 bg-gray-50 min-h-screen pb-20">
      {/* Header Intelligence */}
      <div className="bg-white p-8 sm:p-12 rounded-[2rem] sm:rounded-[3rem] shadow-xl border border-gray-100 relative overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32"></div>
         <div className="relative z-10">
            <span className="px-4 py-1.5 bg-primary/10 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-6 inline-block">Institutional Intelligence</span>
            <h1 className="text-4xl sm:text-6xl font-black tracking-tighter text-gray-900 leading-none mb-4">Strategic Benchmarking</h1>
            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.5em]">Cross-Departmental Performance Analytics</p>
         </div>
      </div>

      {data.length === 0 ? (
        <div className="bg-white p-20 rounded-[3rem] text-center shadow-xl border border-gray-100">
           <p className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-300">No Comparative Data Available</p>
        </div>
      ) : (
        <>
          {/* Leaderboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
             {/* Compliance Leaderboard */}
             <div className="bg-white p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] shadow-xl border border-gray-100">
                <div className="flex justify-between items-center mb-8 sm:mb-10">
                   <h2 className="text-lg sm:text-xl font-black uppercase tracking-tighter">Compliance Velocity</h2>
                   <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                   </div>
                </div>
                
                <div className="space-y-4 sm:space-y-6">
                   {[...data].sort((a, b) => b.complianceRate - a.complianceRate).map((dept, idx) => (
                      <div key={dept.id} className="flex items-center gap-4 sm:gap-6 p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-gray-50 border border-gray-100 transition-all hover:scale-[1.01]">
                         <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white shadow-sm flex items-center justify-center font-black text-sm sm:text-lg text-primary">#{idx + 1}</div>
                         <div className="flex-1 min-w-0">
                            <h3 className="font-black text-gray-900 uppercase tracking-tight text-sm sm:text-base truncate">{dept.name}</h3>
                            <p className="text-[8px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">HOD: {dept.head}</p>
                         </div>
                         <div className="text-right">
                            <p className="text-xl sm:text-2xl font-black text-primary leading-none">{dept.complianceRate}%</p>
                            <p className="text-[8px] sm:text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">Compliance</p>
                         </div>
                      </div>
                   ))}
                </div>
             </div>

             {/* Activity Volume Intelligence */}
             <div className="bg-white p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] shadow-xl border border-gray-100">
                <div className="flex justify-between items-center mb-8 sm:mb-10">
                   <h2 className="text-lg sm:text-xl font-black uppercase tracking-tighter">Activity Momentum</h2>
                   <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                   </div>
                </div>
                
                <div className="space-y-4 sm:space-y-6">
                   {[...data].sort((a, b) => b.activityVolume - a.activityVolume).map((dept, idx) => (
                      <div key={dept.id} className="flex items-center gap-4 sm:gap-6 p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-gray-50 border border-gray-100 transition-all hover:scale-[1.01]">
                         <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white shadow-sm flex items-center justify-center font-black text-sm sm:text-lg text-blue-500">#{idx + 1}</div>
                         <div className="flex-1 min-w-0">
                            <h3 className="font-black text-gray-900 uppercase tracking-tight text-sm sm:text-base truncate">{dept.name}</h3>
                            <p className="text-[8px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">{dept.staffCount} Staff Members</p>
                         </div>
                         <div className="text-right">
                            <p className="text-xl sm:text-2xl font-black text-blue-600 leading-none">{dept.activityVolume}</p>
                            <p className="text-[8px] sm:text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">Total Entries</p>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          </div>

          {/* Comparative Matrix Table */}
          <div className="bg-white rounded-[2rem] sm:rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden">
             <div className="p-6 sm:p-10 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-lg sm:text-xl font-black uppercase tracking-tighter">Strategic Matrix</h2>
                <div className="flex flex-wrap gap-2">
                   <span className="flex items-center gap-2 text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">Optimum</span>
                   <span className="flex items-center gap-2 text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">Warning</span>
                   <span className="flex items-center gap-2 text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-100">Critical</span>
                </div>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[800px]">
                   <thead>
                      <tr className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                         <th className="px-6 sm:px-10 py-6">Department</th>
                         <th className="px-6 sm:px-10 py-6">Status</th>
                         <th className="px-6 sm:px-10 py-6 text-center">Resources</th>
                         <th className="px-6 sm:px-10 py-6 text-center">Staff Pool</th>
                         <th className="px-6 sm:px-10 py-6 text-right">Actions</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-50">
                      {data.map(dept => (
                         <tr key={dept.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 sm:px-10 py-6 sm:py-8">
                               <p className="font-black text-gray-900 uppercase tracking-tight text-sm sm:text-base">{dept.name}</p>
                               <p className="text-[10px] font-bold text-gray-400">Head: {dept.head}</p>
                            </td>
                            <td className="px-6 sm:px-10 py-6 sm:py-8">
                               <div className="flex items-center gap-3">
                                  <div className={`w-2 h-2 rounded-full ${dept.status === 'OPTIMUM' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : dept.status === 'WARNING' ? 'bg-amber-500' : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)] animate-pulse'}`}></div>
                                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">{dept.status}</span>
                               </div>
                            </td>
                            <td className="px-6 sm:px-10 py-6 sm:py-8 text-center font-black text-gray-900">{dept.resourceCount}</td>
                            <td className="px-6 sm:px-10 py-6 sm:py-8 text-center font-black text-gray-900">{dept.staffCount}</td>
                            <td className="px-6 sm:px-10 py-6 sm:py-8 text-right">
                               <button 
                                 onClick={() => navigate(`/dashboard/department-monitoring`)}
                                 className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline"
                               >Audit Hub →</button>
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        </>
      )}
    </div>
  );
};

export default BenchmarkingDashboard;
