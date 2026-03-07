import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { toast } from '../../utils/toast';

const PromotionHistory = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedClasses, setExpandedClasses] = useState(new Set());

  const toggleClassExpansion = (classId) => {
    setExpandedClasses(prev => {
      const next = new Set(prev);
      if (next.has(classId)) {
        next.delete(classId);
      } else {
        next.add(classId);
      }
      return next;
    });
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await api.get('/api/promotion/history');
      const data = await response.json();
      if (Array.isArray(data)) {
        setHistory(data);
      } else {
        console.error('Expected array for promotion history, got:', data);
        setHistory([]);
      }
    } catch (error) {
      toast.error('Failed to load promotion history');
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = Array.isArray(history) ? history.filter(item => {
    const fullName = `${item.student.user.firstName} ${item.student.user.lastName}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  }) : [];

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

  const groupedHistory = filteredHistory.reduce((acc, item) => {
    const classId = item.fromClass ? item.fromClass.id : 'unknown';
    const sessionId = item.academicSession ? item.academicSession.id : 'unknown';
    const sessionName = item.academicSession ? item.academicSession.name : 'Unknown Session';
    const key = `${classId}_${sessionId}`;

    if (!acc[key]) {
      acc[key] = {
        classId,
        sessionId,
        name: `${item.fromClass ? `${item.fromClass.name} ${item.fromClass.arm || ''}` : 'Unknown/Others'} (${sessionName})`,
        items: []
      };
    }
    acc[key].items.push(item);
    return acc;
  }, {});

  const sortedGroupKeys = Object.keys(groupedHistory).sort((a, b) => {
    return groupedHistory[a].name.localeCompare(groupedHistory[b].name);
  });

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

        <div className="overflow-x-auto p-4 space-y-4">
          {loading ? (
            <div className="py-10 text-center text-gray-500">
              <div className="flex justify-center items-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                <span>Loading records...</span>
              </div>
            </div>
          ) : sortedGroupKeys.length > 0 ? (
            sortedGroupKeys.map((groupKey) => {
              const group = groupedHistory[groupKey];
              const isExpanded = expandedClasses.has(groupKey);
              return (
                <div key={groupKey} className="bg-white rounded-lg shadow overflow-hidden border border-gray-100">
                  <button
                    onClick={() => toggleClassExpansion(groupKey)}
                    className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg text-gray-800">
                        {group.name}
                      </span>
                      <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full font-medium">
                        {group.items.length} Records
                      </span>
                    </div>
                    <svg
                      className={`w-5 h-5 text-gray-500 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-200">
                      {(group.classId !== 'unknown' && group.sessionId !== 'unknown') && (
                        <div className="p-3 bg-white flex justify-end items-center gap-3 border-b border-gray-200">
                          <span className="text-sm font-semibold text-gray-700 mr-auto ml-2">Bulk Actions:</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/dashboard/history-bulk-certificates/${group.classId}/${group.sessionId}`);
                            }}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 font-medium transition-colors shadow-sm"
                          >
                            Print Certificates
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/dashboard/history-bulk-testimonials/${group.classId}/${group.sessionId}`);
                            }}
                            className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700 font-medium transition-colors shadow-sm"
                          >
                            Print Testimonials
                          </button>
                        </div>
                      )}
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm text-left">
                          <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="px-6 py-4">Date</th>
                              <th className="px-6 py-4">Student</th>
                              <th className="px-6 py-4">Transition</th>
                              <th className="px-6 py-4">Session</th>
                              <th className="px-6 py-4">Type</th>
                              <th className="px-6 py-4">Performed By</th>
                              <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.items.map((item) => (
                              <tr key={item.id} className="hover:bg-gray-50 border-b border-gray-100">
                                <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                                  {new Date(item.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 font-bold text-gray-900">
                                  {item.student?.user?.firstName || ''} {item.student?.user?.lastName || ''}
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-gray-500">{item.fromClass ? `${item.fromClass.name} ${item.fromClass.arm || ''}` : 'N/A'}</span>
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                    <span className="font-semibold text-primary">
                                      {item.toClass ? `${item.toClass.name} ${item.toClass.arm || ''}` : <span className="text-accent italic">GRADUATED</span>}
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
                                <td className="px-6 py-4 text-right">
                                  {(item.type === 'promotion' || item.type === 'graduation') && (
                                    <div className="flex justify-end gap-2">
                                      <button
                                        onClick={() => navigate(`/dashboard/certificate/${item.student.id}`)}
                                        className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                                        title="View Certificate"
                                      >
                                        Certificate
                                      </button>
                                      <button
                                        onClick={() => navigate(`/dashboard/testimonial/${item.student.id}`)}
                                        className="text-purple-600 hover:text-purple-900 text-sm font-medium"
                                        title="View Testimonial"
                                      >
                                        Testimonial
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="py-10 text-center text-gray-500 italic bg-white rounded-lg">
              No transition history found matching your search.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PromotionHistory;
