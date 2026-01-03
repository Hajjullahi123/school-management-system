import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { toast } from '../../utils/toast';

const PromotionManager = () => {
  const [classes, setClasses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [targetClass, setTargetClass] = useState('');
  const [graduationYear, setGraduationYear] = useState(new Date().getFullYear());
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Check if selected class is SS3
  const selectedClassObj = classes.find(c => c.id === parseInt(selectedClass));
  const isSS3 = selectedClassObj?.name?.replace(/\s/g, '').toUpperCase().includes('SS3');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (isSS3) {
      setTargetClass('alumni');
    } else {
      setTargetClass('');
    }
  }, [isSS3, selectedClass]);

  const fetchInitialData = async () => {
    try {
      const [classesRes, sessionsRes] = await Promise.all([
        api.get('/api/classes'),
        api.get('/api/academic-sessions')
      ]);
      setClasses(await classesRes.json());
      setSessions(await sessionsRes.json());
    } catch (error) {
      toast.error('Failed to load initial data');
    }
  };

  const fetchStudents = async (classId) => {
    if (!classId) return;
    setLoading(true);
    try {
      const response = await api.get(`/api/promotion/class/${classId}/eligibility`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch students');
      }
      setStudents(data);
      setSelectedStudents([]); // Reset selection
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error(error.message || 'Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  const handleClassChange = (e) => {
    const classId = e.target.value;
    setSelectedClass(classId);
    if (classId) {
      fetchStudents(classId);
    } else {
      setStudents([]);
    }
  };

  const toggleStudent = (id) => {
    setSelectedStudents(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map(s => s.id));
    }
  };

  const handlePromote = async () => {
    if (!targetClass) {
      toast.error('Please select a target class');
      return;
    }
    if (selectedStudents.length === 0) {
      toast.error('Please select at least one student');
      return;
    }

    if (!window.confirm(`Are you sure you want to promote ${selectedStudents.length} students to the new class?`)) {
      return;
    }

    setProcessing(true);
    try {
      const response = await api.post('/api/promotion/promote', {
        studentIds: selectedStudents,
        targetClassId: targetClass
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Promotion failed');
      }
      toast.success(data.message);
      fetchStudents(selectedClass); // Refresh list
    } catch (error) {
      toast.error(error.message || 'Promotion failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleGraduate = async () => {
    if (selectedStudents.length === 0) {
      toast.error('Please select at least one student');
      return;
    }

    if (!window.confirm(`Are you sure you want to GRADUATE ${selectedStudents.length} students to the Alumni Portal? This will remove them from active classes.`)) {
      return;
    }

    setProcessing(true);
    try {
      const response = await api.post('/api/promotion/graduate', {
        studentIds: selectedStudents,
        graduationYear: graduationYear
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Graduation failed');
      }
      toast.success(data.message);
      fetchStudents(selectedClass); // Refresh list
    } catch (error) {
      toast.error(error.message || 'Graduation failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-primary to-secondary text-white flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Promotion & Graduation Manager</h2>
            <p className="text-sm opacity-90">Manage student transitions between academic sessions</p>
          </div>
          <Link
            to="/promotion-history"
            className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-bold backdrop-blur-sm transition-all flex items-center space-x-2 border border-white/30"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>View Transition History</span>
          </Link>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Source Class (Current)</label>
            <select
              value={selectedClass}
              onChange={handleClassChange}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
            >
              <option value="">Select Class</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name} {c.arm}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Target Class (Promotion)</label>
            <select
              value={targetClass}
              onChange={(e) => setTargetClass(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
              disabled={isSS3}
            >
              <option value="">Select Next Class</option>
              {isSS3 ? (
                <option value="alumni">Alumni (Graduation)</option>
              ) : (
                classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name} {c.arm}</option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Graduation Year (For Alumni)</label>
            <input
              type="number"
              value={graduationYear}
              onChange={(e) => setGraduationYear(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
            />
          </div>
        </div>

        <div className="p-0">
          {loading ? (
            <div className="p-10 text-center text-gray-500">Loading students...</div>
          ) : students.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-500">
                <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={selectedStudents.length === students.length}
                        onChange={toggleAll}
                        className="rounded text-primary focus:ring-primary"
                      />
                    </th>
                    <th className="px-6 py-3">Admission No</th>
                    <th className="px-6 py-3">Student Name</th>
                    <th className="px-6 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(student => (
                    <tr key={student.id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student.id)}
                          onChange={() => toggleStudent(student.id)}
                          className="rounded text-primary focus:ring-primary"
                        />
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">{student.admissionNumber}</td>
                      <td className="px-6 py-4">{student.user.firstName} {student.user.lastName}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-10 text-center text-gray-500">Select a class to manage students</div>
          )}
        </div>

        <div className="p-6 bg-gray-50 flex flex-wrap justify-end gap-4 border-t border-gray-100">
          <button
            onClick={targetClass === 'alumni' ? handleGraduate : handlePromote}
            disabled={processing || selectedStudents.length === 0}
            className={`flex items-center space-x-2 text-white px-6 py-2.5 rounded-lg font-medium shadow-md transition-all disabled:opacity-50 ${targetClass === 'alumni'
                ? 'bg-accent hover:bg-accent/90'
                : 'bg-primary hover:bg-primary/90'
              }`}
          >
            {processing ? 'Processing...' : targetClass === 'alumni'
              ? `Graduate Selected (${selectedStudents.length})`
              : `Promote Selected (${selectedStudents.length})`
            }
          </button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
          <h3 className="text-lg font-bold text-blue-800 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="I13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            How Promotion Works
          </h3>
          <ul className="mt-3 text-sm text-blue-700 space-y-2 list-disc list-inside">
            <li>Select the current class to load the list of students.</li>
            <li>Choose the target class for the next session.</li>
            <li>Selected students will be moved to the new class automatically.</li>
            <li>Historical records (results, fees, attendance) remain unchanged in the database.</li>
          </ul>
        </div>

        <div className="bg-amber-50 p-6 rounded-xl border border-amber-100">
          <h3 className="text-lg font-bold text-amber-800 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="I12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            Graduation (Alumni)
          </h3>
          <p className="mt-3 text-sm text-amber-700">
            Use "Graduate Selected" only for students leaving the school (e.g., SS3).
            This will convert them to Alumni and remove them from all active classroom activities.
            They will then be able to access the Alumni Portal to update their careers.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PromotionManager;
