import React, { useState, useEffect } from 'react';
import { api } from '../../api';

const TeacherAssignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [classSubjects, setClassSubjects] = useState([]);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    teacherId: '',
    classSubjectId: '',
    selectedClassId: '' // Helper for filtering subjects
  });
  const [editingId, setEditingId] = useState(null);
  const [groupBy, setGroupBy] = useState('class'); // 'teacher' or 'class'
  const [unassignedCounts, setUnassignedCounts] = useState({});

  useEffect(() => {
    fetchAssignments();
    fetchTeachers();
    fetchClasses();
    fetchAllClassSubjects();
  }, []);

  useEffect(() => {
    if (formData.selectedClassId) {
      fetchClassSubjectsForClass(formData.selectedClassId);
    }
  }, [formData.selectedClassId]);

  const fetchAssignments = async () => {
    try {
      const response = await api.get('/api/teacher-assignments');
      const data = await response.json();
      setAssignments(data);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await api.get('/api/users?role=teacher');
      const data = await response.json();
      setTeachers(data);
    } catch (error) {
      console.error('Error fetching teachers:', error);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await api.get('/api/classes');
      const data = await response.json();
      setClasses(data);

      // Fetch unassigned counts for each class
      for (const cls of data) {
        fetchUnassignedCount(cls.id);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchAllClassSubjects = async () => {
    try {
      const response = await api.get('/api/class-subjects');
      const data = await response.json();
      setClassSubjects(data);
    } catch (error) {
      console.error('Error fetching class subjects:', error);
    }
  };

  const fetchClassSubjectsForClass = async (classId) => {
    try {
      const response = await api.get(`/api/class-subjects/class/${classId}`);
      const data = await response.json();
      setClassSubjects(data);
    } catch (error) {
      console.error('Error fetching class subjects:', error);
    }
  };

  const fetchUnassignedCount = async (classId) => {
    try {
      const response = await api.get(`/api/class-subjects/class/${classId}/unassigned-count`);
      const data = await response.json();
      setUnassignedCounts(prev => ({ ...prev, [classId]: data }));
    } catch (error) {
      console.error('Error fetching unassigned count:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingId
        ? `/api/teacher-assignments/${editingId}`
        : '/api/teacher-assignments';

      const method = editingId ? 'PUT' : 'POST';

      const payload = {
        teacherId: formData.teacherId,
        classSubjectId: formData.classSubjectId
      };

      const response = await api[method.toLowerCase()](url, payload);

      const result = await response.json();

      if (response.ok) {
        alert(editingId ? 'Assignment updated!' : 'Teacher assigned successfully!');
        setFormData({ teacherId: '', classSubjectId: '', selectedClassId: '' });
        setEditingId(null);
        setShowForm(false);
        fetchAssignments();
        fetchAllClassSubjects();
        fetchClasses();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error saving assignment:', error);
      alert('Failed to save assignment');
    }
  };

  const handleEdit = (assignment) => {
    setFormData({
      teacherId: assignment.teacherId,
      classSubjectId: assignment.classSubjectId,
      selectedClassId: assignment.classId
    });
    setEditingId(assignment.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to remove this assignment?')) return;

    try {
      const response = await api.delete(`/api/teacher-assignments/${id}`);

      if (response.ok) {
        alert('Assignment removed successfully!');
        fetchAssignments();
        fetchAllClassSubjects();
        fetchClasses();
      }
    } catch (error) {
      console.error('Error deleting assignment:', error);
      alert('Failed to delete assignment');
    }
  };

  // Group assignments based on selection
  const groupedAssignments = assignments.reduce((acc, assignment) => {
    if (groupBy === 'teacher') {
      const teacherName = `${assignment.teacher.firstName} ${assignment.teacher.lastName}`;
      if (!acc[teacherName]) {
        acc[teacherName] = {
          title: teacherName,
          subtitle: assignment.teacher.email,
          assignments: []
        };
      }
      acc[teacherName].assignments.push(assignment);
    } else {
      const className = `${assignment.class.name} ${assignment.class.arm || ''}`;
      const countData = unassignedCounts[assignment.classId] || { unassignedCount: 0, totalCount: 0 };

      if (!acc[className]) {
        acc[className] = {
          title: className,
          subtitle: `${assignment.class.students?.length || 0} Students`,
          classId: assignment.classId,
          unassignedCount: countData.unassignedCount,
          totalCount: countData.totalCount,
          assignments: []
        };
      }
      acc[className].assignments.push(assignment);
    }
    return acc;
  }, {});

  // Get available class subjects for form
  const availableClassSubjects = classSubjects.filter(cs => {
    if (!formData.selectedClassId) return false;
    if (cs.classId !== parseInt(formData.selectedClassId)) return false;
    // If editing, include the currently assigned one
    if (editingId) {
      const currentAssignment = assignments.find(a => a.id === editingId);
      if (currentAssignment && currentAssignment.classSubjectId === cs.id) return true;
    }
    // Only show unassigned subjects
    return !cs.isAssigned;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Teacher-Subject-Class Assignments</h1>
        <div className="flex gap-2">
          <div className="bg-gray-100 p-1 rounded-md flex">
            <button
              onClick={() => setGroupBy('class')}
              className={`px-4 py-1.5 text-sm rounded-md transition-all ${groupBy === 'class' ? 'bg-white shadow text-primary font-medium' : 'text-gray-600 hover:text-gray-900'}`}
            >
              By Class
            </button>
            <button
              onClick={() => setGroupBy('teacher')}
              className={`px-4 py-1.5 text-sm rounded-md transition-all ${groupBy === 'teacher' ? 'bg-white shadow text-primary font-medium' : 'text-gray-600 hover:text-gray-900'}`}
            >
              By Teacher
            </button>
          </div>
          <button
            onClick={() => {
              setShowForm(!showForm);
              if (showForm) {
                setEditingId(null);
                setFormData({ teacherId: '', classSubjectId: '', selectedClassId: '' });
              }
            }}
            className="bg-primary text-white px-6 py-2 rounded-md hover:brightness-90"
          >
            {showForm ? 'Cancel' : '+ Assign Teacher'}
          </button>
        </div>
      </div>

      {/* Assignment Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">{editingId ? 'Edit Assignment' : 'Assign Teacher to Subject'}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teacher <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.teacherId}
                  onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                  className="w-full border rounded-md px-3 py-2"
                  required
                >
                  <option value="">Select Teacher</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.firstName} {teacher.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Class <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.selectedClassId}
                  onChange={(e) => setFormData({ ...formData, selectedClassId: e.target.value, classSubjectId: '' })}
                  className="w-full border rounded-md px-3 py-2"
                  required
                >
                  <option value="">Select Class</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} {cls.arm || ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.classSubjectId}
                  onChange={(e) => setFormData({ ...formData, classSubjectId: e.target.value })}
                  className="w-full border rounded-md px-3 py-2"
                  required
                  disabled={!formData.selectedClassId}
                >
                  <option value="">Select Subject</option>
                  {availableClassSubjects.map((cs) => (
                    <option key={cs.id} value={cs.id}>
                      {cs.subject.name}
                    </option>
                  ))}
                </select>
                {formData.selectedClassId && availableClassSubjects.length === 0 && (
                  <p className="text-sm text-orange-600 mt-1">
                    No unassigned subjects available for this class
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-primary text-white px-6 py-2 rounded-md hover:brightness-90"
              >
                {editingId ? 'Update Assignment' : 'Assign Teacher'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setFormData({ teacherId: '', classSubjectId: '', selectedClassId: '' });
                }}
                className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Assignments List - Grouped */}
      <div className="space-y-4">
        {Object.entries(groupedAssignments).sort().map(([key, data]) => (
          <div key={key} className="bg-white rounded-lg shadow">
            <div className="p-4 bg-primary/5 border-b border-primary/20 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-primary">{data.title}</h3>
                <p className="text-sm text-primary/80">
                  {data.subtitle}
                  {groupBy === 'class' && data.unassignedCount !== undefined && (
                    <span className={`ml-3 px-2 py-0.5 rounded text-xs font-bold ${data.unassignedCount === 0
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                      }`}>
                      {data.unassignedCount} More Subject{data.unassignedCount !== 1 ? 's' : ''} Needed
                    </span>
                  )}
                </p>
              </div>
              <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">{data.assignments.length} Assigned</span>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        {groupBy === 'teacher' ? (
                          <>
                            <p className="font-medium text-gray-900">{assignment.subject.name}</p>
                            <p className="text-sm text-gray-600">{assignment.class.name} {assignment.class.arm}</p>
                          </>
                        ) : (
                          <>
                            <p className="font-medium text-gray-900">{assignment.subject.name}</p>
                            <p className="text-sm text-gray-600">Tr. {assignment.teacher.firstName} {assignment.teacher.lastName}</p>
                          </>
                        )}
                      </div>
                      <div className="flex">
                        <button
                          onClick={() => handleEdit(assignment)}
                          className="text-blue-600 hover:text-blue-900 mx-2"
                          title="Edit assignment"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(assignment.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Remove assignment"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {data.assignments.length === 0 && (
                <p className="text-gray-500 text-center py-4">No assignments yet</p>
              )}
            </div>
          </div>
        ))}
        {Object.keys(groupedAssignments).length === 0 && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">No teacher assignments yet. Click "+ Assign Teacher" to create one.</p>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <svg className="w-5 h-5 text-blue-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-blue-900">About Teacher Assignments</h4>
            <p className="text-sm text-blue-700 mt-1">
              First, ensure subjects are added to classes via <strong>Class Subject Management</strong>. Then assign teachers here.
              Teachers will only see their assigned classes when entering results.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherAssignments;
