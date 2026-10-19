import React, { useState, useEffect } from 'react';
import { api } from '../../api';

const SubjectManagement = () => {
  const [subjects, setSubjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjectForm, setSubjectForm] = useState({ name: '', code: '', departmentId: '', sectionId: '' });
  const [editingSubject, setEditingSubject] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSection, setFilterSection] = useState('');

  useEffect(() => {
    fetchSubjects();
    fetchDepartments();
    fetchSections();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/api/departments');
      if (response.ok) {
        setDepartments(await response.json());
      }
    } catch (error) {}
  };

  const fetchSections = async () => {
    try {
      const response = await api.get('/api/sections');
      if (response.ok) {
        setSections(await response.json());
      }
    } catch (error) {}
  };

  const fetchSubjects = async () => {
    try {
      const response = await api.get('/api/subjects');
      const data = await response.json();
      setSubjects(data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const filteredAndSortedSubjects = (subjects || [])
    .filter(subject => {
      const matchesSearch =
        subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (subject.code && subject.code.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesSection = filterSection === ''
        ? true
        : filterSection === 'all'
          ? !subject.sectionId
          : subject.sectionId === parseInt(filterSection);
      return matchesSearch && matchesSection;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingSubject
        ? `/api/subjects/${editingSubject.id}`
        : '/api/subjects';

      const response = await (editingSubject
        ? api.put(url, subjectForm)
        : api.post(url, subjectForm));

      if (response.ok) {
        alert(editingSubject ? 'Subject updated!' : 'Subject created!');
        setSubjectForm({ name: '', code: '', departmentId: '', sectionId: '' });
        setEditingSubject(null);
        fetchSubjects();
      } else {
        const result = await response.json();
        alert(`Error: ${result.error || 'Failed to save subject'}`);
      }
    } catch (error) {
      console.error('Error saving subject:', error);
      alert('Failed to save subject');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this subject?')) return;

    try {
      const response = await api.delete(`/api/subjects/${id}`);

      if (response.ok) {
        alert('Subject deleted!');
        fetchSubjects();
      } else {
        const result = await response.json();
        alert(`Error: ${result.error || 'Failed to delete subject'}`);
      }
    } catch (error) {
      console.error('Error deleting subject:', error);
      alert('Failed to delete subject');
    }
  };

  // Section badge colours — cycle through a small palette
  const sectionColors = [
    'bg-blue-100 text-blue-800',
    'bg-green-100 text-green-800',
    'bg-purple-100 text-purple-800',
    'bg-orange-100 text-orange-800',
    'bg-pink-100 text-pink-800',
    'bg-teal-100 text-teal-800',
  ];
  const getSectionColor = (sectionId) => sectionColors[(sectionId - 1) % sectionColors.length];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Subject Management</h1>
      </div>

      {/* Subject Form */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4 text-gray-900">
          {editingSubject ? 'Edit Subject' : 'Create New Subject'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject Name
              </label>
              <input
                type="text"
                value={subjectForm.name}
                onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                className="w-full border rounded-md px-3 py-2 text-gray-900 bg-white"
                placeholder="Mathematics"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject Code (Optional)
              </label>
              <input
                type="text"
                value={subjectForm.code}
                onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                className="w-full border rounded-md px-3 py-2 text-gray-900 bg-white"
                placeholder="MATH101"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department
              </label>
              <select
                value={subjectForm.departmentId}
                onChange={(e) => setSubjectForm({ ...subjectForm, departmentId: e.target.value })}
                className="w-full border rounded-md px-3 py-2 text-gray-900 bg-white"
              >
                <option value="">No Department</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Restrict to Section
                <span className="ml-1 text-xs text-gray-400 font-normal">(leave blank for all sections)</span>
              </label>
              <select
                value={subjectForm.sectionId}
                onChange={(e) => setSubjectForm({ ...subjectForm, sectionId: e.target.value })}
                className="w-full border rounded-md px-3 py-2 text-gray-900 bg-white"
              >
                <option value="">All Sections (school-wide)</option>
                {sections.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-primary text-white px-6 py-2 rounded-md hover:brightness-90"
            >
              {editingSubject ? 'Update Subject' : 'Create Subject'}
            </button>
            {editingSubject && (
              <button
                type="button"
                onClick={() => {
                  setEditingSubject(null);
                  setSubjectForm({ name: '', code: '', departmentId: '', sectionId: '' });
                }}
                className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Subjects List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h3 className="text-lg font-semibold text-gray-900">Existing Subjects ({filteredAndSortedSubjects.length})</h3>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              {/* Section filter */}
              <select
                value={filterSection}
                onChange={(e) => setFilterSection(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm text-gray-700 bg-white focus:ring-primary focus:border-primary"
              >
                <option value="">All Sections</option>
                <option value="all">School-wide only</option>
                {sections.map(s => (
                  <option key={s.id} value={s.id}>{s.name} only</option>
                ))}
              </select>
              {/* Search */}
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Search subjects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-primary focus:border-primary text-gray-900 bg-white"
                />
                <div className="absolute left-3 top-2.5 text-gray-400">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAndSortedSubjects.map((subject) => (
              <div
                key={subject.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0 mr-2">
                    <h4 className="font-semibold text-lg text-gray-900">{subject.name}</h4>
                    {subject.code && (
                      <p className="text-sm text-gray-600 mt-1">Code: {subject.code}</p>
                    )}
                    {subject.departmentId && (
                      <p className="text-xs font-bold text-primary mt-1 uppercase tracking-tighter">
                        Dept: {departments.find(d => d.id === subject.departmentId)?.name || 'Loading...'}
                      </p>
                    )}
                    {/* Section badge */}
                    <div className="mt-2">
                      {subject.sectionId && subject.section ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getSectionColor(subject.sectionId)}`}>
                          📚 {subject.section.name}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                          🌐 All Sections
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setEditingSubject(subject);
                        setSubjectForm({
                          name: subject.name,
                          code: subject.code || '',
                          departmentId: subject.departmentId || '',
                          sectionId: subject.sectionId || ''
                        });
                      }}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(subject.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {filteredAndSortedSubjects.length === 0 && (
              <div className="col-span-3 text-center text-gray-400 py-10">No subjects found.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubjectManagement;
