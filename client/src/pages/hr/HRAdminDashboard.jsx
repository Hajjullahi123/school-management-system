import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const HRAdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('vouchers'); // vouchers, requests, records
  const [vouchers, setVouchers] = useState([]);
  const [requests, setRequests] = useState({ loans: [], leaves: [], materials: [] });
  const [staffPool, setStaffPool] = useState([]);
  
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [voucherForm, setVoucherForm] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear() });
  
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [recordForm, setRecordForm] = useState({ baseSalary: 0, allowances: [], deductions: [] });

  useEffect(() => {
    fetchVouchers();
    fetchRequests();
    fetchStaff();
  }, []);

  const fetchVouchers = async () => {
    try {
      const res = await api.get('/api/hr/admin/vouchers');
      if (res.ok) setVouchers(await res.json());
    } catch (e) { toast.error('Voucher retrieval failed'); }
  };

  const fetchRequests = async () => {
    try {
      const res = await api.get('/api/hr/admin/requests');
      if (res.ok) setRequests(await res.json());
    } catch (e) { toast.error('Request retrieval failed'); }
    finally { setLoading(false); }
  };

  const fetchStaff = async () => {
    try {
      const res = await api.get('/api/hr/admin/staff');
      if (res.ok) setStaffPool(await res.json());
    } catch (e) {}
  };

  const handleCreateVoucher = async () => {
    try {
      const res = await api.post('/api/hr/admin/vouchers', voucherForm);
      if (res.ok) {
        toast.success('Monthly payroll voucher drafted');
        setShowVoucherModal(false);
        fetchVouchers();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Voucher creation failed');
      }
    } catch (e) { toast.error('Drafting failed'); }
  };

  const handleProcessRequest = async (type, id, status) => {
    try {
      let endpoint = '';
      if (type === 'loan') endpoint = `/api/hr/admin/loan-requests/${id}`;
      else if (type === 'leave') endpoint = `/api/hr/admin/leave-requests/${id}`;
      else if (type === 'material') endpoint = `/api/hr/admin/material-requests/${id}`;

      const res = await api.patch(endpoint, { status });
      if (res.ok) {
        toast.success(`Request ${status.toLowerCase()} successfully`);
        fetchRequests();
      }
    } catch (e) { toast.error('Processing failed'); }
  };

  const openRecordEditor = async (record) => {
    setSelectedRecord(record);
    setRecordForm({
      baseSalary: record.baseSalary,
      allowances: record.allowances || [],
      deductions: record.deductions || []
    });
  };

  const handleUpdateRecord = async () => {
    try {
      const res = await api.patch(`/api/hr/admin/payroll-records/${selectedRecord.id}`, recordForm);
      if (res.ok) {
        toast.success('Personnel payroll record synchronized');
        setSelectedRecord(null);
        // Refresh records view if applicable
      }
    } catch (e) { toast.error('Record update failed'); }
  };

  const handleFinalizeVoucher = async (id) => {
    if (!window.confirm('Are you sure you want to finalize this voucher? This will permanently increment loan repayments and lock the records.')) return;
    try {
      const res = await api.patch(`/api/hr/admin/vouchers/${id}/finalize`);
      if (res.ok) {
        toast.success('Monthly payroll cycle finalized and locked');
        fetchVouchers();
      }
    } catch (e) { toast.error('Finalization sequence failed'); }
  };

  if (loading) return <div className="p-20 text-center animate-pulse font-black text-gray-300 uppercase tracking-widest">Accessing HR Strategic Hub...</div>;

  return (
    <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
       <div className="bg-slate-900 p-8 sm:p-12 rounded-[3rem] shadow-2xl relative overflow-hidden text-white">
          <div className="relative z-10">
             <div className="flex items-center gap-3 mb-4">
                <span className="px-4 py-1.5 bg-indigo-500/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-indigo-500/30 text-indigo-400">HR Administrative Hub</span>
             </div>
             <h1 className="text-4xl sm:text-6xl font-black tracking-tighter leading-none mb-8 uppercase italic">Human Resources</h1>
             
             <div className="flex flex-wrap gap-3">
                <button onClick={() => setActiveTab('vouchers')} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'vouchers' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>Payroll Vouchers</button>
                <button onClick={() => setActiveTab('requests')} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'requests' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>Approval Center</button>
             </div>
          </div>
       </div>

       <AnimatePresence mode="wait">
          {activeTab === 'vouchers' && (
             <motion.div key="vouchers" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
                <div className="flex justify-between items-center bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
                   <div>
                      <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Strategic Payroll</h3>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Manage monthly vouchers & disbursement</p>
                   </div>
                   <button onClick={() => setShowVoucherModal(true)} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:scale-105 transition-all">Draft New Voucher</button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                   {vouchers.map(v => (
                      <div key={v.id} className="bg-white p-6 sm:p-8 rounded-[2.5rem] sm:rounded-[3rem] shadow-xl border border-gray-100 flex flex-col justify-between group hover:scale-[1.02] transition-all">
                         <div>
                            <div className="flex justify-between items-start mb-6">
                               <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${v.status === 'FINALIZED' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{v.status}</span>
                               <span className="text-[10px] font-black text-gray-400 uppercase">{v._count?.records || 0} Records</span>
                            </div>
                            <h4 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-1">{new Date(0, v.month-1).toLocaleString('default', {month:'long'})} {v.year}</h4>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6">Disbursement Sequence</p>
                         </div>
                         <div className="space-y-3">
                            <div className="flex justify-between text-[11px] font-bold">
                               <span className="text-gray-400 uppercase">Gross Total</span>
                               <span className="text-gray-900">₦{v.totalGross.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-[11px] font-bold">
                               <span className="text-gray-400 uppercase">Net Disbursement</span>
                               <span className="text-indigo-600">₦{v.totalNet.toLocaleString()}</span>
                            </div>
                            <div className="flex gap-2 mt-4">
                               <button className="flex-1 py-4 bg-gray-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all">Open Records</button>
                               {v.status === 'DRAFT' && (
                                  <button onClick={() => handleFinalizeVoucher(v.id)} className="px-6 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all" title="Finalize & Lock">Finalize</button>
                               )}
                            </div>
                         </div>
                      </div>
                   ))}
                </div>
             </motion.div>
          )}

          {activeTab === 'requests' && (
             <motion.div key="requests" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-12">
                {/* Loan Requests */}
                <section>
                   <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter mb-6 italic px-4">Credit Facilities</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {requests.loans.map(loan => (
                         <div key={loan.id} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-xl flex justify-between items-center">
                            <div>
                               <p className="text-sm font-black text-gray-900 uppercase">{loan.staff.firstName} {loan.staff.lastName}</p>
                               <p className="text-lg font-black text-indigo-600 leading-none my-1">₦{loan.amount.toLocaleString()}</p>
                               <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{loan.reason}</p>
                            </div>
                            {loan.status === 'PENDING' ? (
                               <div className="flex gap-2">
                                  <button onClick={() => handleProcessRequest('loan', loan.id, 'APPROVED')} className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></button>
                                  <button onClick={() => handleProcessRequest('loan', loan.id, 'REJECTED')} className="p-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                               </div>
                            ) : (
                               <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest ${loan.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{loan.status}</span>
                            )}
                         </div>
                      ))}
                   </div>
                </section>

                {/* Leave Requests */}
                <section>
                   <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter mb-6 italic px-4">Leave Management</h3>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {requests.leaves.map(leave => (
                         <div key={leave.id} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-xl">
                            <div className="flex justify-between items-start mb-4">
                               <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest px-3 py-1 bg-indigo-50 rounded-lg">{leave.type}</span>
                               <span className="text-[8px] font-black text-gray-400">{new Date(leave.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-sm font-black text-gray-900 uppercase mb-1">{leave.staff.firstName} {leave.staff.lastName}</p>
                            <p className="text-xs text-gray-500 mb-4 font-medium">{leave.reason}</p>
                            <div className="flex justify-between items-center">
                               <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{new Date(leave.startDate).toLocaleDateString()} → {new Date(leave.endDate).toLocaleDateString()}</p>
                               {leave.status === 'PENDING' ? (
                                  <div className="flex gap-2">
                                     <button onClick={() => handleProcessRequest('leave', leave.id, 'APPROVED')} className="text-emerald-600 font-black text-[10px] uppercase hover:underline">Approve</button>
                                     <button onClick={() => handleProcessRequest('leave', leave.id, 'REJECTED')} className="text-rose-600 font-black text-[10px] uppercase hover:underline">Deny</button>
                                  </div>
                               ) : (
                                  <span className={`text-[10px] font-black uppercase ${leave.status === 'APPROVED' ? 'text-emerald-600' : 'text-rose-600'}`}>{leave.status}</span>
                               )}
                            </div>
                         </div>
                      ))}
                   </div>
                </section>

                {/* Material Requests */}
                 <section>
                    <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter mb-6 italic px-4">Supply Requisitions</h3>
                    
                    {/* Desktop View */}
                    <div className="hidden lg:block bg-white rounded-[3rem] shadow-xl border border-gray-100 overflow-hidden">
                       <table className="w-full">
                          <thead>
                             <tr className="text-left border-b border-gray-50 bg-gray-50/50">
                                <th className="p-6 text-[9px] font-black text-gray-400 uppercase tracking-widest">Staff</th>
                                <th className="p-6 text-[9px] font-black text-gray-400 uppercase tracking-widest">Items</th>
                                <th className="p-6 text-[9px] font-black text-gray-400 uppercase tracking-widest">Priority</th>
                                <th className="p-6 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Action</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                             {requests.materials.map(m => (
                                <tr key={m.id}>
                                   <td className="p-6 font-black text-gray-900 uppercase text-xs">{m.staff.firstName} {m.staff.lastName}</td>
                                   <td className="p-6 flex flex-wrap gap-1">
                                      {(() => {
                                         try {
                                            return JSON.parse(m.items).map((it, i) => <span key={i} className="text-[9px] font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg">{it}</span>);
                                         } catch(e) { return <span className="text-[9px] text-gray-400 italic">Invalid Data</span>; }
                                      })()}
                                   </td>
                                   <td className="p-6"><span className={`text-[9px] font-black uppercase ${m.priority === 'URGENT' ? 'text-rose-600' : 'text-gray-400'}`}>{m.priority}</span></td>
                                   <td className="p-6 text-right">
                                      {m.status === 'PENDING' ? (
                                         <button onClick={() => handleProcessRequest('material', m.id, 'APPROVED')} className="bg-gray-900 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all">Disburse</button>
                                      ) : (
                                         <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">{m.status}</span>
                                      )}
                                   </td>
                                </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="lg:hidden space-y-4 px-2">
                       {requests.materials.map(m => (
                          <div key={m.id} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-xl space-y-4">
                             <div className="flex justify-between items-start">
                                <div>
                                   <p className="text-xs font-black text-gray-900 uppercase">{m.staff.firstName} {m.staff.lastName}</p>
                                   <p className={`text-[8px] font-black uppercase tracking-widest mt-1 ${m.priority === 'URGENT' ? 'text-rose-600' : 'text-gray-400'}`}>{m.priority} Priority</p>
                                </div>
                                <span className={`text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${m.status === 'PENDING' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>{m.status}</span>
                             </div>
                             <div className="flex flex-wrap gap-2">
                                {(() => {
                                   try {
                                      return JSON.parse(m.items).map((it, i) => <span key={i} className="text-[9px] font-bold bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg">{it}</span>);
                                   } catch(e) { return <span className="text-[9px] text-gray-400 italic">Invalid Data</span>; }
                                })()}
                             </div>
                             {m.status === 'PENDING' && (
                                <button onClick={() => handleProcessRequest('material', m.id, 'APPROVED')} className="w-full bg-gray-900 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest">Disburse Supplies</button>
                             )}
                          </div>
                       ))}
                    </div>
                 </section>
             </motion.div>
          )}
       </AnimatePresence>

       {/* Voucher Creation Modal */}
       {showVoucherModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
             <div className="bg-white rounded-[3rem] w-full max-w-sm p-10 shadow-2xl border border-gray-100">
                <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter italic mb-8">Draft Voucher</h2>
                <div className="space-y-6">
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                         <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Month</label>
                         <select value={voucherForm.month} onChange={e => setVoucherForm({...voucherForm, month: parseInt(e.target.value)})} className="w-full bg-gray-50 border-2 border-gray-50 rounded-2xl py-4 px-6 outline-none font-black text-sm">
                            {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <option key={m} value={m}>{new Date(0, m-1).toLocaleString('default', {month:'short'})}</option>)}
                         </select>
                      </div>
                      <div>
                         <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Year</label>
                         <input type="number" value={voucherForm.year} onChange={e => setVoucherForm({...voucherForm, year: parseInt(e.target.value)})} className="w-full bg-gray-50 border-2 border-gray-50 rounded-2xl py-4 px-6 outline-none font-black text-sm" />
                      </div>
                   </div>
                   <div className="flex gap-4 pt-4">
                      <button onClick={() => setShowVoucherModal(false)} className="flex-1 py-4 font-black uppercase text-[10px] tracking-widest text-gray-400">Abort</button>
                      <button onClick={handleCreateVoucher} className="flex-2 bg-indigo-600 text-white py-4 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-600/20 hover:scale-105 transition-all">Initialize Sequence</button>
                   </div>
                </div>
             </div>
          </div>
       )}
    </div>
  );
};

export default HRAdminDashboard;
