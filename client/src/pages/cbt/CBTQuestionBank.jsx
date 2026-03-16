import React, { useState, useEffect } from 'react';
import { api, API_BASE_URL } from '../../api';
import { toast } from '../../utils/toast';
import useSchoolSettings from '../../hooks/useSchoolSettings';
import { useAuth } from '../../context/AuthContext';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';

const CBTQuestionBank = () => {
  const [questions, setQuestions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { settings: schoolSettings } = useSchoolSettings();
  const { user } = useAuth();

  // Filters
  const [filters, setFilters] = useState({
    subjectId: '',
    classId: '',
    teacherId: ''
  });

  // Expanded questions state
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [expandedSubjectIds, setExpandedSubjectIds] = useState(new Set());

  const toggleExpand = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSubjectExpand = (id) => {
    setExpandedSubjectIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
    setExpandedSubjectIds(new Set());
  };

  // Bulk Upload State
  const [uploadData, setUploadData] = useState({
    subjectId: '',
    classId: ''
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchQuestions();
  }, [filters]);

  const fetchInitialData = async () => {
    try {
      const [subsRes, classRes] = await Promise.all([
        api.get('/api/subjects'),
        api.get('/api/classes')
      ]);

      if (subsRes.ok) setSubjects(await subsRes.json());
      if (classRes.ok) setClasses(await classRes.json());
    } catch (error) {
      toast.error('Failed to load initial data');
    }
  };

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams(filters).toString();
      const response = await api.get(`/api/cbt/bank?${query}`);
      const data = await response.json();
      if (response.ok) {
        setQuestions(data);
      } else {
        toast.error(data.error || 'Failed to fetch questions');
      }
    } catch (error) {
      toast.error('Error loading question bank');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this question from the bank?')) return;
    try {
      const response = await api.delete(`/api/cbt/bank/${id}`);
      if (response.ok) {
        toast.success('Question deleted');
        setQuestions(questions.filter(q => q.id !== id));
      } else {
        const data = await response.json();
        toast.error(data.error || 'Delete failed');
      }
    } catch (error) {
      toast.error('Error deleting question');
    }
  };

  const handleSubjectDelete = async (subjectId, subjectName) => {
    if (!confirm(`Are you sure you want to delete ALL questions for "${subjectName}" from the bank? This cannot be undone.`)) return;
    try {
      const response = await api.delete(`/api/cbt/bank/subject/${subjectId}`);
      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || 'Subject questions deleted');
        setQuestions(questions.filter(q => q.subject?.id !== parseInt(subjectId)));
      } else {
        const data = await response.json();
        toast.error(data.error || 'Delete failed');
      }
    } catch (error) {
      toast.error('Error deleting subject questions');
    }
  };

  const handleDownloadBank = () => {
    const query = new URLSearchParams({ subjectId: filters.subjectId }).toString();
    const url = `${API_BASE_URL}/api/cbt/bank/download?${query}`;
    const token = localStorage.getItem('token');

    fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(response => response.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CBT_Question_Bank.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch(() => toast.error('Failed to download bank'));
  };

  const handleBulkUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!uploadData.subjectId) {
      toast.error('Please select a subject first');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('subjectId', uploadData.subjectId);
    if (uploadData.classId) formData.append('classId', uploadData.classId);

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/api/cbt/bank/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const data = await response.json();
      if (response.ok) {
        toast.success(data.message || 'Questions uploaded to bank');
        fetchQuestions();
      } else {
        toast.error(data.error || 'Upload failed');
      }
    } catch (error) {
      toast.error('Error uploading file');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDownloadTemplate = () => {
    const url = `${API_BASE_URL}/api/cbt/template/questions`;
    const token = localStorage.getItem('token');
    fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'CBT_Questions_Template.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
      });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">CBT Question Bank</h1>
          <p className="text-sm text-gray-500">Centralized repository for all CBT questions</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleDownloadTemplate}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition text-sm font-medium"
          >
            Download Template
          </button>
          <button
            onClick={handleDownloadBank}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition text-sm font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export Bank
          </button>
        </div>
      </div>

      {/* Upload Section */}
      <div className="bg-white p-6 rounded-lg shadow mb-6 border-l-4 border-primary">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">Bulk Upload Questions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject (Required)</label>
            <select
              className="w-full rounded-md border-gray-300 shadow-sm focus:ring-primary focus:border-primary"
              value={uploadData.subjectId}
              onChange={(e) => setUploadData({ ...uploadData, subjectId: e.target.value })}
            >
              <option value="">Select Subject</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Class Level (Optional)</label>
            <select
              className="w-full rounded-md border-gray-300 shadow-sm focus:ring-primary focus:border-primary"
              value={uploadData.classId}
              onChange={(e) => setUploadData({ ...uploadData, classId: e.target.value })}
            >
              <option value="">All Classes</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className={`w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${uploading ? 'bg-gray-400' : 'bg-primary hover:brightness-90'} cursor-pointer transition`}>
              {uploading ? 'Uploading...' : 'Upload Excel/CSV'}
              <input type="file" className="hidden" accept=".csv,.xlsx" onChange={handleBulkUpload} disabled={uploading} />
            </label>
          </div>
        </div>
      </div>

      {/* Filters & List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b bg-gray-50 grid grid-cols-1 md:grid-cols-4 gap-4">
          <select
            className="rounded-md border-gray-300 text-sm"
            value={filters.subjectId}
            onChange={(e) => setFilters({ ...filters, subjectId: e.target.value })}
          >
            <option value="">All Subjects</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select
            className="rounded-md border-gray-300 text-sm"
            value={filters.classId}
            onChange={(e) => setFilters({ ...filters, classId: e.target.value })}
          >
            <option value="">All Class Levels</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="flex items-center">
            {(expandedIds.size > 0 || expandedSubjectIds.size > 0) && (
              <button
                onClick={collapseAll}
                className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
              >
                <ChevronUp size={14} /> Collapse All
              </button>
            )}
          </div>
        </div>

        <div className="p-4 space-y-4">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading bank questions...</div>
          ) : questions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No questions found in the bank.</div>
          ) : (
            Object.entries(
              questions.reduce((acc, q) => {
                const subjectId = q.subject?.id || 'unknown';
                if (!acc[subjectId]) acc[subjectId] = { subject: q.subject, questions: [] };
                acc[subjectId].questions.push(q);
                return acc;
              }, {})
            ).map(([subjectId, group]) => {
              const isSubjectExpanded = expandedSubjectIds.has(subjectId);
              const { subject, questions: subjectQuestions } = group;

              return (
                <div key={subjectId} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  {/* Subject Card Header */}
                  <div
                    onClick={() => toggleSubjectExpand(subjectId)}
                    className={`px-6 py-4 flex justify-between items-center cursor-pointer transition-colors ${isSubjectExpanded ? 'bg-primary text-white' : 'bg-white hover:bg-gray-50'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isSubjectExpanded ? 'bg-white/20' : 'bg-primary/10'}`}>
                        <svg className={`w-5 h-5 ${isSubjectExpanded ? 'text-white' : 'text-primary'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{subject?.name || 'Unassigned Subject'}</h3>
                        <p className={`text-xs ${isSubjectExpanded ? 'text-white/80' : 'text-gray-500'}`}>
                          {subjectQuestions.length} Questions available
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSubjectDelete(subjectId, subject?.name || 'Unassigned Subject');
                        }}
                        className={`p-2 rounded-full transition-colors ${isSubjectExpanded ? 'hover:bg-white/10 text-white/70 hover:text-white' : 'hover:bg-red-50 text-red-400 hover:text-red-600'}`}
                        title="Delete all questions in this subject"
                      >
                        <Trash2 size={18} />
                      </button>
                      <div className={isSubjectExpanded ? 'text-white' : 'text-gray-400'}>
                        {isSubjectExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </div>
                  </div>

                  {/* Subject Card Content (Questions Table) */}
                  {isSubjectExpanded && (
                    <div className="overflow-x-auto bg-white border-t border-gray-200">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 border-b border-gray-100">
                          <tr>
                            <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Question</th>
                            <th className="px-6 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Correct</th>
                            <th className="px-6 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Points</th>
                            <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Teacher</th>
                            <th className="px-6 py-3 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {subjectQuestions.map((q) => {
                            const isExpanded = expandedIds.has(q.id);
                            let options = [];
                            try {
                              options = q.options ? JSON.parse(q.options) : [];
                            } catch (e) {
                              console.error("Error parsing options", e);
                            }

                            return (
                              <React.Fragment key={q.id}>
                                <tr
                                  className={`hover:bg-gray-50 transition-colors cursor-pointer ${isExpanded ? 'bg-blue-50/30' : ''}`}
                                  onClick={() => toggleExpand(q.id)}
                                >
                                  <td className="px-6 py-4">
                                    <div className="flex items-start gap-3 min-w-[200px]">
                                      <div className="mt-0.5 text-gray-400">
                                        {isExpanded ? <ChevronUp size={18} className="text-primary" /> : <ChevronDown size={18} />}
                                      </div>
                                      <div className={`text-sm font-medium text-gray-900 ${isExpanded ? '' : 'line-clamp-2'} max-w-md`}>
                                        {q.questionText}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-center">
                                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold uppercase">
                                      {q.correctOption}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center font-bold">
                                    {q.points}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 italic">
                                    {q.teacher?.firstName} {q.teacher?.lastName}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(q.id);
                                      }}
                                      className="text-red-500 hover:text-red-700 bg-red-50 p-2 rounded-full transition-colors flex items-center justify-center ml-auto"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </td>
                                </tr>
                                {isExpanded && (
                                  <tr className="bg-blue-50/30">
                                    <td colSpan="6" className="px-6 pb-6 pt-0">
                                      <div className="ml-8 border-l-2 border-blue-200 pl-4 py-2 space-y-2">
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Options</p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          {options.map(opt => (
                                            <div
                                              key={opt.id}
                                              className={`flex items-start gap-2 p-3 rounded border ${q.correctOption === opt.id
                                                ? 'bg-green-50 border-green-200 ring-1 ring-green-100'
                                                : 'bg-white border-gray-100'
                                                }`}
                                            >
                                              <span className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${q.correctOption === opt.id
                                                ? 'bg-green-600 text-white'
                                                : 'bg-gray-100 text-gray-500'
                                                }`}>
                                                {opt.id.toUpperCase()}
                                              </span>
                                              <span className={`text-sm ${q.correctOption === opt.id ? 'text-green-800 font-medium' : 'text-gray-600'}`}>
                                                {opt.text}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default CBTQuestionBank;
