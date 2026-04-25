import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { generatePayslip } from '../../utils/payslipGenerator';
import { useSchoolSettings } from '../../hooks/useSchoolSettings';

const StaffHRDashboard = () => {
  const [data, setData] = useState({ salaries: [], loans: [], leaves: [], materials: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('payroll'); // payroll, loans, requests
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showMaterialModal, setShowMaterialModal] = useState(false);

  const [loanForm, setLoanForm] = useState({ amount: '', reason: '', repaymentMonths: '1' });
  const [leaveForm, setLeaveForm] = useState({ type: 'ANNUAL', startDate: '', endDate: '', reason: '' });
  const [materialForm, setMaterialForm] = useState({ items: '', priority: 'NORMAL' });
  const { settings: schoolSettings } = useSchoolSettings();

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/hr/my-records');
      if (res.ok) setData(await res.json());
    } catch (e) { toast.error('Connection to HR hub interrupted'); }
    finally { setLoading(false); }
  };

  const handleLoanRequest = async () => {
    if (!loanForm.amount || !loanForm.reason) return toast.error('Amount and reason required');
    try {
      const res = await api.post('/api/hr/loan-request', loanForm);
      if (res.ok) {
        toast.success('Loan application submitted for review');
        setShowLoanModal(false);
        fetchRecords();
      }
    } catch (e) { toast.error('Application failed'); }
  };

  const handleLeaveRequest = async () => {
    if (!leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason) return toast.error('All fields required');
    try {
      const res = await api.post('/api/hr/leave-request', leaveForm);
      if (res.ok) {
        toast.success('Leave request submitted');
        setShowLeaveModal(false);
        fetchRecords();
      }
    } catch (e) { toast.error('Submission failed'); }
  };

  const handleMaterialRequest = async () => {
    if (!materialForm.items) return toast.error('Items list required');
    try {
      const res = await api.post('/api/hr/material-request', { 
        items: materialForm.items.split(',').map(i => i.trim()),
        priority: materialForm.priority
      });
      if (res.ok) {
        toast.success('Material requisition synchronized');
        setShowMaterialModal(false);
        fetchRecords();
      }
    } catch (e) { toast.error('Sync failed'); }
  };

  if (loading) return <div className="p-20 text-center animate-pulse font-black text-gray-300 uppercase tracking-widest">Accessing Personnel Files...</div>;

  return (
    <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Card */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-900 p-8 sm:p-12 rounded-[3rem] shadow-2xl relative overflow-hidden text-white border-4 border-white/5">
         <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
         <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div>
               <div className="flex items-center gap-3 mb-4">
                  <span className="px-4 py-1.5 bg-primary/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-primary/30 text-primary-light">Personnel Financial Hub</span>
               </div>
               <h1 className="text-4xl sm:text-6xl font-black tracking-tighter leading-none mb-6 italic uppercase">HR Dashboard</h1>
               
               <div className="flex flex-wrap gap-3">
                  <button onClick={() => setActiveTab('payroll')} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'payroll' ? 'bg-primary text-white shadow-lg' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>Payroll History</button>
                  <button onClick={() => setActiveTab('loans')} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'loans' ? 'bg-primary text-white shadow-lg' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>Loan Center</button>
                  <button onClick={() => setActiveTab('requests')} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'requests' ? 'bg-primary text-white shadow-lg' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>Requisitions</button>
               </div>
            </div>

            <div className="flex gap-4">
               <div className="bg-white/10 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/10 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-1">Last Net Pay</p>
                  <p className="text-3xl font-black leading-none">₦{data.salaries[0]?.netPay?.toLocaleString() || '0'}</p>
               </div>
            </div>
         </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'payroll' && (
          <motion.div key="payroll" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
             <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-gray-100">
                <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter mb-8">Monthly Salary Records</h3>
                 <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full">
                       <thead>
                          <tr className="text-left border-b border-gray-50">
                             <th className="pb-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Period</th>
                             <th className="pb-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Base Salary</th>
                             <th className="pb-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-emerald-600">Allowances</th>
                             <th className="pb-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-rose-600">Deductions</th>
                             <th className="pb-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Net Pay</th>
                             <th className="pb-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Status</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-50">
                          {data.salaries.length === 0 ? (
                             <tr><td colSpan="6" className="py-20 text-center font-black text-gray-300 uppercase tracking-widest">No payroll data generated yet</td></tr>
                          ) : data.salaries.map(s => (
                             <tr key={s.id} className="group hover:bg-gray-50/50 transition-all">
                                <td className="py-6 font-black text-gray-900 uppercase tracking-tight">
                                   {new Date(0, s.voucher.month - 1).toLocaleString('default', { month: 'long' })} {s.voucher.year}
                                </td>
                                <td className="py-6 font-bold text-gray-600">₦{s.baseSalary.toLocaleString()}</td>
                                <td className="py-6">
                                   <div className="flex flex-col gap-1">
                                      <span className="font-bold text-emerald-600">₦{s.totalAllowances.toLocaleString()}</span>
                                      {s.allowances.map((a, i) => (
                                         <span key={i} className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">{a.type}: {a.description}</span>
                                      ))}
                                   </div>
                                </td>
                                <td className="py-6">
                                   <div className="flex flex-col gap-1">
                                      <span className="font-bold text-rose-600">₦{s.totalDeductions.toLocaleString()}</span>
                                      {s.deductions.map((d, i) => (
                                         <span key={i} className="text-[8px] font-black text-rose-400 uppercase tracking-widest">{d.reason}: -₦{d.amount}</span>
                                      ))}
                                   </div>
                                </td>
                                <td className="py-6 font-black text-indigo-600">₦{s.netPay.toLocaleString()}</td>
                                <td className="py-6 text-right flex items-center justify-end gap-3">
                                   <button onClick={() => generatePayslip(s, schoolSettings)} className="p-2 bg-gray-50 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Download Payslip">
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                   </button>
                                   <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${s.status === 'PAID' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                      {s.status}
                                   </span>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>

                 {/* Mobile Cards */}
                 <div className="sm:hidden space-y-4">
                    {data.salaries.length === 0 ? (
                       <div className="py-20 text-center font-black text-gray-300 uppercase tracking-widest">No payroll data generated yet</div>
                    ) : data.salaries.map(s => (
                       <div key={s.id} className="bg-gray-50 p-6 rounded-[2.5rem] border border-gray-100 space-y-4">
                          <div className="flex justify-between items-start">
                             <div>
                                <h4 className="font-black text-gray-900 uppercase">{new Date(0, s.voucher.month - 1).toLocaleString('default', { month: 'long' })} {s.voucher.year}</h4>
                                <span className={`inline-block mt-1 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${s.status === 'PAID' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                   {s.status}
                                </span>
                             </div>
                             <button onClick={() => generatePayslip(s, schoolSettings)} className="p-3 bg-white text-indigo-600 rounded-xl shadow-sm">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                             </button>
                          </div>
                          <div className="grid grid-cols-2 gap-4 pt-2">
                             <div>
                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Net Pay</p>
                                <p className="text-xl font-black text-indigo-600 leading-none">₦{s.netPay.toLocaleString()}</p>
                             </div>
                             <div>
                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Base Salary</p>
                                <p className="text-sm font-bold text-gray-600 leading-none">₦{s.baseSalary.toLocaleString()}</p>
                             </div>
                          </div>
                          {(s.totalAllowances > 0 || s.totalDeductions > 0) && (
                             <div className="pt-2 border-t border-gray-200/50 space-y-2">
                                {s.totalAllowances > 0 && <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">+₦{s.totalAllowances.toLocaleString()} Allowances</p>}
                                {s.totalDeductions > 0 && <p className="text-[9px] font-bold text-rose-600 uppercase tracking-widest">-₦{s.totalDeductions.toLocaleString()} Deductions</p>}
                             </div>
                          )}
                       </div>
                    ))}
                 </div>
             </div>
          </motion.div>
        )}

        {activeTab === 'loans' && (
          <motion.div key="loans" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-white p-8 rounded-[3rem] shadow-xl border border-gray-100">
                   <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter mb-8">Loan History</h3>
                   <div className="space-y-4">
                      {data.loans.length === 0 ? (
                         <div className="py-20 text-center font-black text-gray-300 uppercase tracking-widest border-2 border-dashed border-gray-50 rounded-[2rem]">No credit history identified</div>
                      ) : data.loans.map(loan => (
                         <div key={loan.id} className="flex items-center justify-between p-6 bg-gray-50 rounded-2xl border border-gray-100 group hover:bg-white transition-all">
                            <div>
                               <p className="text-lg font-black text-gray-900">₦{loan.amount.toLocaleString()}</p>
                               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{loan.reason}</p>
                               <p className="text-[8px] font-black text-indigo-500 uppercase">Repayment: {loan.repaymentMonths} Months</p>
                            </div>
                            <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest ${
                               loan.status === 'APPROVED' ? 'bg-emerald-500 text-white' : 
                               loan.status === 'PENDING' ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-500'
                            }`}>{loan.status}</span>
                         </div>
                      ))}
                   </div>
                </div>

                <div className="bg-indigo-600 text-white p-8 rounded-[3rem] shadow-2xl flex flex-col justify-between">
                   <div>
                      <h3 className="text-2xl font-black uppercase tracking-tighter mb-2 italic">Loan Request</h3>
                      <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest leading-relaxed mb-8">Apply for institutional credit facilities with streamlined approvals</p>
                   </div>
                   <button onClick={() => setShowLoanModal(true)} className="w-full bg-white text-indigo-600 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:scale-105 transition-all">Start Application</button>
                </div>
             </div>
          </motion.div>
        )}

        {activeTab === 'requests' && (
          <motion.div key="requests" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-gray-100">
                <div className="flex justify-between items-center mb-8">
                   <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter italic">Leave Center</h3>
                   <button onClick={() => setShowLeaveModal(true)} className="bg-indigo-50 text-indigo-600 p-3 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                   </button>
                </div>
                <div className="space-y-4">
                   {data.leaves.map(l => (
                      <div key={l.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                         <div className="flex justify-between items-start mb-2">
                            <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest px-2 py-1 bg-indigo-50 rounded-lg">{l.type}</span>
                            <span className={`text-[8px] font-black uppercase ${l.status === 'APPROVED' ? 'text-emerald-600' : 'text-amber-600'}`}>{l.status}</span>
                         </div>
                         <p className="text-sm font-bold text-gray-800 mb-1">{l.reason}</p>
                         <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{new Date(l.startDate).toLocaleDateString()} - {new Date(l.endDate).toLocaleDateString()}</p>
                      </div>
                   ))}
                </div>
             </div>

             <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-gray-100">
                <div className="flex justify-between items-center mb-8">
                   <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter italic">Material Requisition</h3>
                   <button onClick={() => setShowMaterialModal(true)} className="bg-emerald-50 text-emerald-600 p-3 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                   </button>
                </div>
                <div className="space-y-4">
                   {data.materials.map(m => (
                      <div key={m.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                         <div className="flex justify-between items-start mb-3">
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${m.priority === 'URGENT' ? 'bg-rose-50 text-rose-600' : 'bg-gray-100 text-gray-500'}`}>{m.priority}</span>
                            <span className="text-[8px] font-black uppercase text-indigo-600">{m.status}</span>
                         </div>
                         <div className="flex flex-wrap gap-2">
                            {(() => {
                               try {
                                  return JSON.parse(m.items).map((item, i) => (
                                     <span key={i} className="text-[10px] font-bold bg-white px-3 py-1 rounded-full border border-gray-100 shadow-sm">{item}</span>
                                  ));
                               } catch (e) { return <span className="text-[9px] text-gray-400 italic">Invalid Data</span>; }
                            })()}
                         </div>
                         <p className="text-[8px] font-bold text-gray-400 uppercase mt-3">Requested on {new Date(m.createdAt).toLocaleDateString()}</p>
                      </div>
                   ))}
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
             <div className="bg-white rounded-[2.5rem] sm:rounded-[3rem] w-full max-w-lg p-6 sm:p-10 shadow-2xl border border-gray-100 my-auto">
                <h2 className="text-2xl sm:text-3xl font-black text-gray-900 uppercase tracking-tighter italic mb-6 sm:mb-8">Loan Application</h2>
                <div className="space-y-4 sm:space-y-6">
                   <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Requested Principal (₦)</label>
                      <input type="number" value={loanForm.amount} onChange={e => setLoanForm({...loanForm, amount: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-50 rounded-2xl py-3 sm:py-4 px-5 sm:px-6 outline-none font-black text-sm focus:ring-4 focus:ring-primary/10 transition-all" placeholder="50000" />
                   </div>
                   <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Repayment Tenure (Months)</label>
                      <select value={loanForm.repaymentMonths} onChange={e => setLoanForm({...loanForm, repaymentMonths: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-50 rounded-2xl py-3 sm:py-4 px-5 sm:px-6 outline-none font-black text-sm focus:ring-4 focus:ring-primary/10 transition-all">
                         {[1,2,3,4,5,6,12].map(m => <option key={m} value={m}>{m} Months</option>)}
                      </select>
                   </div>
                   <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Justification</label>
                      <textarea value={loanForm.reason} onChange={e => setLoanForm({...loanForm, reason: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-50 rounded-2xl py-3 sm:py-4 px-5 sm:px-6 outline-none font-bold text-sm focus:ring-4 focus:ring-primary/10 transition-all h-20 sm:h-24 resize-none" placeholder="Provide reason for credit request..."></textarea>
                   </div>
                   <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2 sm:pt-4">
                      <button onClick={() => setShowLoanModal(false)} className="order-2 sm:order-1 py-3 sm:py-4 font-black uppercase text-[10px] tracking-widest text-gray-400">Abort</button>
                      <button onClick={handleLoanRequest} className="order-1 sm:order-2 bg-indigo-600 text-white py-3 sm:py-4 px-6 sm:px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-600/20 hover:scale-105 transition-all">Submit Application</button>
                   </div>
                </div>
             </div>
          </div>
      )}

      {showLeaveModal && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-[3rem] w-full max-w-lg p-10 shadow-2xl border border-gray-100">
               <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter italic mb-8">Leave Requisition</h2>
               <div className="space-y-6">
                  <div>
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Classification</label>
                     <select value={leaveForm.type} onChange={e => setLeaveForm({...leaveForm, type: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-50 rounded-2xl py-4 px-6 outline-none font-black text-sm transition-all">
                        <option value="ANNUAL">Annual Leave</option>
                        <option value="SICK">Sick / Medical Leave</option>
                        <option value="EXCUSE">Casual Excuse</option>
                        <option value="MATERNITY">Maternity / Paternity</option>
                     </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Start Date</label>
                        <input type="date" value={leaveForm.startDate} onChange={e => setLeaveForm({...leaveForm, startDate: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-50 rounded-2xl py-4 px-6 outline-none font-black text-[10px] transition-all" />
                     </div>
                     <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">End Date</label>
                        <input type="date" value={leaveForm.endDate} onChange={e => setLeaveForm({...leaveForm, endDate: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-50 rounded-2xl py-4 px-6 outline-none font-black text-[10px] transition-all" />
                     </div>
                  </div>
                  <div>
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Reasoning</label>
                     <textarea value={leaveForm.reason} onChange={e => setLeaveForm({...leaveForm, reason: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-50 rounded-2xl py-4 px-6 outline-none font-bold text-sm h-24 resize-none" placeholder="Provide context for the request..."></textarea>
                  </div>
                  <div className="flex gap-4 pt-4">
                     <button onClick={() => setShowLeaveModal(false)} className="flex-1 py-4 font-black uppercase text-[10px] tracking-widest text-gray-400">Abort</button>
                     <button onClick={handleLeaveRequest} className="flex-2 bg-indigo-600 text-white py-4 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-600/20 hover:scale-105 transition-all">Submit Requisition</button>
                  </div>
               </div>
            </div>
         </div>
      )}

      {showMaterialModal && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-[3rem] w-full max-w-lg p-10 shadow-2xl border border-gray-100">
               <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter italic mb-8">Supply Requisition</h2>
               <div className="space-y-6">
                  <div>
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Items (Comma separated)</label>
                     <textarea value={materialForm.items} onChange={e => setMaterialForm({...materialForm, items: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-50 rounded-2xl py-4 px-6 outline-none font-bold text-sm h-24 resize-none focus:ring-4 focus:ring-emerald-500/10 transition-all" placeholder="e.g. White Board Marker, Pens, Refiller..."></textarea>
                  </div>
                  <div>
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Priority Strategy</label>
                     <select value={materialForm.priority} onChange={e => setMaterialForm({...materialForm, priority: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-50 rounded-2xl py-4 px-6 outline-none font-black text-sm transition-all">
                        <option value="NORMAL">Standard Deployment</option>
                        <option value="URGENT">Urgent Allocation</option>
                     </select>
                  </div>
                  <div className="flex gap-4 pt-4">
                     <button onClick={() => setShowMaterialModal(false)} className="flex-1 py-4 font-black uppercase text-[10px] tracking-widest text-gray-400">Abort</button>
                     <button onClick={handleMaterialRequest} className="flex-2 bg-emerald-600 text-white py-4 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-600/20 hover:scale-105 transition-all">Synchronize Requisition</button>
                  </div>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default StaffHRDashboard;
