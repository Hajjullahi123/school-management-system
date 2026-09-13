import React, { useState, useEffect } from 'react';
import { 
  FiShield, FiSearch, FiCalendar, FiUser, FiActivity, 
  FiArrowLeft, FiFilter, FiDownload, FiRefreshCw 
} from 'react-icons/fi';
import { apiCall } from '../../api';
import { format } from 'date-fns';
import { toast } from '../../utils/toast';

const AuditLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [limit] = useState(50);
  
  // Filters
  const [filters, setFilters] = useState({
    action: '',
    resource: '',
    userId: '',
    startDate: '',
    endDate: ''
  });

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        limit,
        offset,
        ...filters
      });
      
      const response = await apiCall(`/api/audit?${queryParams.toString()}`);
      if (response.ok) {
        setLogs(response.data.logs || []);
        setTotal(response.data.total || 0);
      }
    } catch (error) {
      toast.error('Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [offset, limit]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const applyFilters = (e) => {
    e.preventDefault();
    setOffset(0);
    fetchLogs();
  };

  const resetFilters = () => {
    setFilters({
      action: '',
      resource: '',
      userId: '',
      startDate: '',
      endDate: ''
    });
    setOffset(0);
    // fetchLogs will be triggered by the useEffect if offset was > 0, 
    // otherwise we call it manually
    if (offset === 0) fetchLogs();
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'CREATE': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'UPDATE': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'DELETE': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'LOGIN': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'LOGOUT': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <FiShield className="text-primary" /> Audit Trail & System Logs
          </h1>
          <p className="text-sm text-gray-500">Chronological record of all administrative activities within this school.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchLogs}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 border border-gray-200"
            title="Refresh Logs"
          >
            <FiRefreshCw className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filters Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <form onSubmit={applyFilters} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Action Type</label>
            <select 
              name="action"
              value={filters.action}
              onChange={handleFilterChange}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            >
              <option value="">All Actions</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
              <option value="LOGIN">Login</option>
              <option value="LOGOUT">Logout</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Resource</label>
            <select 
              name="resource"
              value={filters.resource}
              onChange={handleFilterChange}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            >
              <option value="">All Resources</option>
              <option value="STUDENT">Student</option>
              <option value="FEE_PAYMENT">Fee Payment</option>
              <option value="SETTINGS">Settings</option>
              <option value="USER">User</option>
              <option value="AUTH">Authentication</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Start Date</label>
            <input 
              type="date"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">End Date</label>
            <input 
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>

          <div className="flex items-end gap-2">
            <button 
              type="submit"
              className="flex-1 bg-primary text-white font-bold py-2 rounded-xl text-sm hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/10"
            >
              Filter
            </button>
            <button 
              type="button"
              onClick={resetFilters}
              className="p-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all border border-gray-200"
            >
              <FiRefreshCw />
            </button>
          </div>
        </form>
      </div>

      {/* Logs Table Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Time & Date</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Administrator</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Action</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Resource Path</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Identifier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan="5" className="px-6 py-4 bg-gray-50/30"></td>
                  </tr>
                ))
              ) : logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-800">{format(new Date(log.createdAt), 'MMM dd, yyyy')}</span>
                        <span className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">{format(new Date(log.createdAt), 'hh:mm:ss a')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-xs border border-primary/20">
                          {log.user?.firstName?.[0] || 'S'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 leading-none mb-1">
                            {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System Agent'}
                          </p>
                          <p className="text-[10px] text-gray-400 font-bold tracking-tighter uppercase">
                            @{log.user?.username || 'automated_service'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border tracking-widest ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FiActivity className="text-gray-300 group-hover:text-primary transition-colors" size={14} />
                        <code className="text-[11px] font-bold text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                          {log.resource}
                        </code>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-[11px] font-mono text-gray-400 bg-gray-100 px-2 py-1 rounded-md">
                        ID: {log.resourceId || 'N/A'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center">
                      <div className="p-4 bg-gray-50 rounded-full mb-4">
                        <FiShield size={40} className="text-gray-200" />
                      </div>
                      <p className="text-sm font-black text-gray-400 uppercase tracking-widest">No activities recorded in this scope</p>
                      <button 
                        onClick={resetFilters}
                        className="mt-4 text-primary font-bold text-xs hover:underline"
                      >
                        Reset filters to see all
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {total > limit && (
          <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-500 font-bold">
              Showing <span className="text-gray-900">{offset + 1}</span> - <span className="text-gray-900">{Math.min(offset + limit, total)}</span> of <span className="text-gray-900">{total}</span>
            </p>
            <div className="flex gap-2">
              <button 
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - limit))}
                className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold bg-white hover:bg-gray-50 disabled:opacity-50 transition-all shadow-sm"
              >
                Previous
              </button>
              <button 
                disabled={offset + limit >= total}
                onClick={() => setOffset(offset + limit)}
                className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold bg-white hover:bg-gray-50 disabled:opacity-50 transition-all shadow-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Security Advisory */}
      <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-6 flex gap-4">
        <FiActivity className="text-indigo-500 flex-shrink-0 w-6 h-6 mt-1" />
        <div className="space-y-1">
          <p className="text-sm font-black text-indigo-900 uppercase tracking-tight">Security & Compliance Oversight</p>
          <p className="text-xs text-indigo-700 leading-relaxed opacity-80">
            This audit trail is immutable and records all critical infrastructure modifications, financial transactions, and authentication events. 
            Use this data for forensic analysis, regulatory compliance checks, and verifying administrative accountability within the platform.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuditLog;
