import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const ExamRepository = () => {
  const { user } = useAuth();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    driveLink: '',
    subjectId: '',
    classId: ''
  });
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teacherAssignments, setTeacherAssignments] = useState([]);

  useEffect(() => {
    fetchExams();
    if (user.role === 'teacher') {
      fetchTeacherAssignments();
    } else {
      fetchClassesAndSubjects();
    }
  }, []);

  const fetchExams = async () => {
    try {
      const resp = await api.get('/api/academics/exam-repository');
      if (resp.ok) {
        setExams(await resp.json());
      }
    } catch (err) {
      toast.error('Failed to fetch exams');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeacherAssignments = async () => {
    try {
      const resp = await api.get(`/api/teacher-assignments/teacher/${user.id}`);
      if (resp.ok) {
        const data = await resp.json();
        setTeacherAssignments(data);
        
        // Extract unique classes from assignments
        const uniqueClasses = [];
        const classIdsSet = new Set();
        data.forEach(a => {
            if (a.class && !classIdsSet.has(a.class.id)) {
                uniqueClasses.push(a.class);
                classIdsSet.add(a.class.id);
            }
        });
        setClasses(uniqueClasses);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchClassesAndSubjects = async () => {
      // For admins
      const [cResp, sResp] = await Promise.all([
          api.get('/api/classes'),
          api.get('/api/subjects')
      ]);
      if (cResp.ok) setClasses(await cResp.json());
      if (sResp.ok) setSubjects(await sResp.json());
  };

  const handleClassChange = (classId) => {
      setFormData({...formData, classId, subjectId: ''});
      if (user.role === 'teacher') {
          const relevantSubjects = teacherAssignments
            .filter(a => a.classId === parseInt(classId))
            .map(a => a.subject);
          setSubjects(relevantSubjects);
      }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const resp = await api.post('/api/academics/exam-repository', formData);
      if (resp.ok) {
        toast.success('Exam question link submitted successfully');
        setShowSubmitModal(false);
        setFormData({ title: '', driveLink: '', subjectId: '', classId: '' });
        fetchExams();
      } else {
        const err = await resp.json();
        toast.error(err.error || 'Failed to submit');
      }
    } catch (err) {
      toast.error('Submission failed');
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Exam Question Repository</h1>
          <p className="text-gray-600">Centralized database of examination questions (Drive Links)</p>
        </div>
        {user.role === 'teacher' && (
          <button 
            onClick={() => setShowSubmitModal(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
          >
            Submit Exam Questions
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 font-semibold text-gray-700">Exam Title</th>
              <th className="px-6 py-4 font-semibold text-gray-700">Subject</th>
              <th className="px-6 py-4 font-semibold text-gray-700">Class</th>
              <th className="px-6 py-4 font-semibold text-gray-700">Teacher</th>
              <th className="px-6 py-4 font-semibold text-gray-700">Drive Link</th>
              <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan="6" className="text-center py-10">Loading...</td></tr>
            ) : exams.length === 0 ? (
              <tr><td colSpan="6" className="text-center py-10 text-gray-500">No exam submissions found.</td></tr>
            ) : exams.map(exam => (
              <tr key={exam.id} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4 font-medium text-gray-900">{exam.title}</td>
                <td className="px-6 py-4 text-gray-600">{exam.subject?.name}</td>
                <td className="px-6 py-4 text-gray-600">{exam.class?.name} {exam.class?.arm}</td>
                <td className="px-6 py-4 text-gray-600">{exam.teacher?.firstName} {exam.teacher?.lastName}</td>
                <td className="px-6 py-4">
                  <a 
                    href={exam.driveLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline flex items-center gap-1"
                  >
                    Open Link
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </a>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    exam.status === 'approved' ? 'bg-green-100 text-green-700' : 
                    exam.status === 'submitted' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {exam.status.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-indigo-600 p-6 text-white">
              <h2 className="text-xl font-bold">Submit Exam Question Link</h2>
              <p className="text-indigo-100 text-sm">Provide the Google Drive link for your exam questions.</p>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Exam Title</label>
                <input 
                  required
                  type="text"
                  placeholder="e.g. 2nd Term 2026 Mathematics Exam"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                  <select 
                    required
                    value={formData.classId}
                    onChange={e => handleClassChange(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">Select Class</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name} {c.arm}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <select 
                    required
                    disabled={!formData.classId}
                    value={formData.subjectId}
                    onChange={e => setFormData({...formData, subjectId: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-gray-50"
                  >
                    <option value="">Select Subject</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Google Drive Link</label>
                <input 
                  required
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={formData.driveLink}
                  onChange={e => setFormData({...formData, driveLink: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition font-medium"
                >
                  Submit Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamRepository;
