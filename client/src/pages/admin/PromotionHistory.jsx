import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { toast } from '../../utils/toast';

const PromotionHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await api.get('/api/promotion/history');
      const data = await response.json();
      setHistory(data);
    } catch (error) {
      toast.error('Failed to load promotion history');
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history.filter(item => {
    const fullName = `${item.student.user.firstName} ${item.student.user.lastName}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

  const exportToCSV = () => {
    const headers = ['Date', 'Student', 'From Class', 'To Class', 'Session', 'Type', 'Performed By'];
    const rows = filteredHistory.map(item => [
      new Date(item.createdAt).toLocaleDateString(),
      `${item.student.user.firstName} ${item.student.user.lastName}`,
      item.fromClass ? `${item.fromClass.name} ${item.fromClass.arm}` : 'N/A',
      item.toClass ? `${item.toClass.name} ${item.toClass.arm}` : 'Graduated',
      item.academicSession ? item.academicSession.name : 'N/A',
      item.type.toUpperCase(),
      `Admin ID: ${item.performedBy}`
    ]);

    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers, ...rows].map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `promotion_history_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Promotion & Graduation History</h1>
          <p className="text-gray-600">Audit trail of student academic transitions</p>
        </div>
        <button
          onClick={exportToCSV}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg transition-all flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          <span>Export to CSV</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <div className="relative w-full max-w-md">
            <input
              type="text"
              placeholder="Search by student name..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border-gray-300 focus:ring-primary focus:border-primary"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <div className="text-sm text-gray-500 font-medium">
            Showing {filteredHistory.length} records
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Transition</th>
                <th className="px-6 py-4">Session</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Performed By</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-gray-500">
                    <div className="flex justify-center items-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                      <span>Loading records...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredHistory.length > 0 ? (
                filteredHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 border-b border-gray-100">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900">
                      {item.student.user.firstName} {item.student.user.lastName}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-500">{item.fromClass ? `${item.fromClass.name} ${item.fromClass.arm}` : 'N/A'}</span>
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                        <span className="font-semibold text-primary">
                          {item.toClass ? `${item.toClass.name} ${item.toClass.arm}` : <span className="text-accent italic">GRADUATED</span>}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {item.academicSession?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest ${item.type === 'promotion' ? 'bg-green-100 text-green-700' :
                        item.type === 'graduation' ? 'bg-blue-100 text-blue-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                        {item.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs">
                      Admin (ID: {item.performedBy})
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-gray-500 italic">
                    No transition history found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PromotionHistory;
