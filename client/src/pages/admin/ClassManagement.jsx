import React, { useState, useEffect } from 'react';
import { api, API_BASE_URL } from '../../api';
import { Link } from 'react-router-dom';

const ClassManagement = () => {
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classForm, setClassForm] = useState({ 
    name: '', 
    arm: '', 
    classTeacherId: '', 
    expectedSubjects: 0,
    showPositionOnReport: true,
    showFeesOnReport: true,
    showAttendanceOnReport: true,
    reportLayout: ''
  });
  const [editingClass, setEditingClass] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [classStudents, setClassStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [showClassForm, setShowClassForm] = useState(false);
  const [terms, setTerms] = useState([]);
  const [selectedTermId, setSelectedTermId] = useState('');

  // Grading Modal State
  const [gradingStudent, setGradingStudent] = useState(null);
  const [remarks, setRemarks] = useState({ formMasterRemark: '', principalRemark: '' });
  const [psychomotorRatings, setPsychomotorRatings] = useState([]);
  const [domains, setDomains] = useState([]);
  const [saving, setSaving] = useState(false);

  // New states for report preview within modal
  const [studentReport, setStudentReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // Early Years Class Domains Modal State
  const [earlyYearsClass, setEarlyYearsClass] = useState(null);
  const [earlyYearsConfig, setEarlyYearsConfig] = useState({ isCustomized: false, domains: [] });
  const [loadingEarlyYearsConfig, setLoadingEarlyYearsConfig] = useState(false);
  const [savingEarlyYearsConfig, setSavingEarlyYearsConfig] = useState(false);
  const [addingDomain, setAddingDomain] = useState(false);
  const [newDomain, setNewDomain] = useState({ name: '', code: '' });
  const [newSkill, setNewSkill] = useState({});

  const openEarlyYearsModal = async (cls) => {
    setEarlyYearsClass(cls);
    setLoadingEarlyYearsConfig(true);
    setAddingDomain(false);
    setNewDomain({ name: '', code: '' });
    setNewSkill({});
    try {
      const res = await api.get(`/api/early-years/class/${cls.id}/domains`);
      if (res.ok) {
        const data = await res.json();
        setEarlyYearsConfig({
          isCustomized: !!data.isCustomized,
          domains: Array.isArray(data.domains) ? data.domains : []
        });
      } else {
        alert("Failed to load Early Years domains for class.");
      }
    } catch (e) {
      console.error(e);
      alert("Error loading class domains.");
    } finally {
      setLoadingEarlyYearsConfig(false);
    }
  };

  const handleSaveEarlyYearsClassDomains = async () => {
    if (!earlyYearsClass) return;
    setSavingEarlyYearsConfig(true);
    try {
      const res = await api.post(`/api/early-years/class/${earlyYearsClass.id}/domains`, {
        domains: earlyYearsConfig.domains || []
      });
      if (res.ok) {
        const data = await res.json();
        setEarlyYearsConfig({
          isCustomized: !!data.isCustomized,
          domains: Array.isArray(data.domains) ? data.domains : []
        });
        alert(`Early Years domains saved for ${earlyYearsClass.name}!`);
        setEarlyYearsClass(null);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to save class domains");
      }
    } catch (e) {
      console.error(e);
      alert("Error saving class domains.");
    } finally {
      setSavingEarlyYearsConfig(false);
    }
  };

  const handleResetEarlyYearsClassDomains = async () => {
    if (!earlyYearsClass) return;
    if (!confirm(`Reset ${earlyYearsClass.name} domains to school default template? Custom overrides for this class will be cleared.`)) return;

    setSavingEarlyYearsConfig(true);
    try {
      const res = await api.post(`/api/early-years/class/${earlyYearsClass.id}/domains/reset`);
      if (res.ok) {
        const data = await res.json();
        setEarlyYearsConfig({
          isCustomized: !!data.isCustomized,
          domains: Array.isArray(data.domains) ? data.domains : []
        });
        alert(`Domains for ${earlyYearsClass.name} reset to school defaults.`);
      } else {
        alert("Failed to reset class domains.");
      }
    } catch (e) {
      console.error(e);
      alert("Error resetting class domains.");
    } finally {
      setSavingEarlyYearsConfig(false);
    }
  };

  const toggleDomainActive = (dIndex) => {
    setEarlyYearsConfig(prev => {
      const domains = [...prev.domains];
      domains[dIndex] = { ...domains[dIndex], isActive: !domains[dIndex].isActive };
      return { ...prev, domains };
    });
  };

  const deleteDomain = (dIndex) => {
    setEarlyYearsConfig(prev => {
      const domains = prev.domains.filter((_, idx) => idx !== dIndex);
      return { ...prev, domains };
    });
  };

  const handleAddDomain = () => {
    if (!newDomain.name.trim()) return;
    setEarlyYearsConfig(prev => ({
      ...prev,
      domains: [
        ...prev.domains,
        {
          name: newDomain.name.trim(),
          code: newDomain.code ? newDomain.code.trim() : null,
          sortOrder: prev.domains.length + 1,
          isActive: true,
          skills: []
        }
      ]
    }));
    setNewDomain({ name: '', code: '' });
    setAddingDomain(false);
  };

  const toggleSkillActive = (dIndex, sIndex) => {
    setEarlyYearsConfig(prev => {
      const domains = [...prev.domains];
      const skills = [...domains[dIndex].skills];
      skills[sIndex] = { ...skills[sIndex], isActive: !skills[sIndex].isActive };
      domains[dIndex] = { ...domains[dIndex], skills };
      return { ...prev, domains };
    });
  };

  const deleteSkill = (dIndex, sIndex) => {
    setEarlyYearsConfig(prev => {
      const domains = [...prev.domains];
      const skills = domains[dIndex].skills.filter((_, idx) => idx !== sIndex);
      domains[dIndex] = { ...domains[dIndex], skills };
      return { ...prev, domains };
    });
  };

  const handleAddSkill = (dIndex) => {
    const skillName = (newSkill[dIndex] || '').trim();
    if (!skillName) return;
    setEarlyYearsConfig(prev => {
      const domains = [...prev.domains];
      const skills = [
        ...domains[dIndex].skills,
        {
          name: skillName,
          sortOrder: domains[dIndex].skills.length + 1,
          isActive: true
        }
      ];
      domains[dIndex] = { ...domains[dIndex], skills };
      return { ...prev, domains };
    });
    setNewSkill(prev => ({ ...prev, [dIndex]: '' }));
  };

  const predefinedRemarks = [
    "Excellent performance. Keep it up.",
    "A very good result. Maintain the standard.",
    "Good effort. You can do better.",
    "Satisfactory performance. Focus more on weak areas.",
    "Fair result. More effort is required.",
    "Weak performance. Put in more effort next time.",
    "Poor result. You must buckle up next term."
  ];

  useEffect(() => {
    fetchClasses();
    fetchTeachers();
    fetchTerms();
    fetchDomains();
  }, []);

  const fetchDomains = async () => {
    try {
      const res = await api.get('/api/report-extras/domains');
      if (res.ok) {
        const data = await res.json();
        setDomains(Array.isArray(data) ? data : []);
      }
    } catch (e) { console.error("Failed to fetch domains", e); }
  };

  const openGradingModal = async (student) => {
    if (!selectedTermId) {
      alert("Please select a term first from the top right.");
      return;
    }
    setGradingStudent(student);
    setRemarks({ formMasterRemark: '', principalRemark: '' });
    setPsychomotorRatings([]);
    setStudentReport(null);

    setLoadingReport(true);
    try {
      // Parallel fetch report extras and the full report card for preview
      const [extrasRes, reportRes] = await Promise.all([
        api.get(`/api/report-extras/${student.id}/${selectedTermId}`),
        api.get(`/api/reports/term/${student.id}/${selectedTermId}`)
      ]);

      if (extrasRes.ok) {
        const data = await extrasRes.json();
        setRemarks({
          formMasterRemark: data.formMasterRemark || '',
          principalRemark: data.principalRemark || ''
        });
        setPsychomotorRatings(Array.isArray(data.psychomotorRatings) ? data.psychomotorRatings : []);
      }

      if (reportRes.ok) {
        setStudentReport(await reportRes.json());
      }
    } catch (e) {
      console.error("Error fetching report details", e);
    } finally {
      setLoadingReport(false);
    }
  };

  const saveGrading = async () => {
    if (!gradingStudent || !selectedTermId || !selectedClass) return;
    setSaving(true);
    try {
      const payload = {
        studentId: gradingStudent.id,
        termId: selectedTermId,
        classId: selectedClass.id,
        formMasterRemark: remarks.formMasterRemark,
        principalRemark: remarks.principalRemark,
        psychomotorRatings
      };

      const res = await api.post('/api/report-extras/save', payload);
      if (res.ok) {
        alert("Saved successfully!");
        setGradingStudent(null);
      } else {
        alert("Failed to save. Ensure you have the right permissions.");
      }
    } catch (e) {
      console.error(e);
      alert("Error saving.");
    } finally {
      setSaving(false);
    }
  };

  const fetchTerms = async () => {
    try {
      const response = await api.get('/api/terms');
      if (response.ok) {
        const data = await response.json();
        const termsArray = Array.isArray(data) ? data : [];
        setTerms(termsArray);
        const currentTerm = termsArray.find(t => t.isCurrent);
        if (currentTerm) setSelectedTermId(currentTerm.id.toString());
      }
    } catch (error) {
      console.error('Error fetching terms:', error);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await api.get('/api/classes');
      const data = await response.json();
      setClasses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching classes:', error);
      setClasses([]);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await api.get('/api/users?role=teacher');
      const data = await response.json();
      setTeachers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      setTeachers([]);
    }
  };

  const fetchClassStudents = async (classId) => {
    try {
      const response = await api.get(`/api/students?classId=${classId}`);
      if (response.ok) {
        const data = await response.json();
        setClassStudents(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching class students:', error);
      setClassStudents([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingClass
        ? `${API_BASE_URL}/api/classes/${editingClass.id}`
        : `${API_BASE_URL}/api/classes`;

      const response = await fetch(url, {
        method: editingClass ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...classForm,
          reportLayout: classForm.reportLayout || null,
          classTeacherId: classForm.classTeacherId ? parseInt(classForm.classTeacherId) : null
        })
      });

      if (response.ok) {
        alert(editingClass ? 'Class updated!' : 'Class created!');
        setClassForm({ 
          name: '', 
          arm: '', 
          classTeacherId: '', 
          expectedSubjects: 0,
          showPositionOnReport: true,
          showFeesOnReport: true,
          showAttendanceOnReport: true,
          reportLayout: ''
        });
        setEditingClass(null);
        setShowClassForm(false);
        fetchClasses();
      } else {
        const err = await response.json();
        alert(err.error || 'Failed to save class');
      }
    } catch (error) {
      console.error('Error saving class:', error);
      alert('Failed to save class. Please try again.');
    }
  };

  const handleDeleteClass = async (id) => {
    if (!confirm('Are you sure you want to delete this class?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/classes/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        alert('Class deleted!');
        fetchClasses();
      }
    } catch (error) {
      console.error('Error deleting class:', error);
      alert('Failed to delete class');
    }
  };

  const handleClassClick = (cls) => {
    setSelectedClass(cls);
    setSelectedStudents([]);
    fetchClassStudents(cls.id);
  };

  const handleBackToClasses = () => {
    setSelectedClass(null);
    setClassStudents([]);
    setSelectedStudents([]);
  };

  const handleSelectStudent = (studentId) => {
    setSelectedStudents(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === classStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(classStudents.map(s => s.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedStudents.length === 0) {
      alert('Please select students to delete');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedStudents.length} student(s)?`)) return;

    try {
      const deletePromises = selectedStudents.map(studentId =>
        fetch(`${API_BASE_URL}/api/students/${studentId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      );

      await Promise.all(deletePromises);
      alert(`Successfully deleted ${selectedStudents.length} student(s)!`);
      setSelectedStudents([]);
      fetchClassStudents(selectedClass.id);
      fetchClasses(); // Refresh class counts
    } catch (error) {
      console.error('Error deleting students:', error);
      alert('Failed to delete some students');
    }
  };

  // Early Years Modal Renderer
  const renderEarlyYearsModal = () => {
    if (!earlyYearsClass) return null;
    return (
      <div className="fixed inset-0 z-[99999] overflow-y-auto bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-purple-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-700 text-white p-5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold">
                  Early Years Domains: {earlyYearsClass.name}{earlyYearsClass.arm ? ` ${earlyYearsClass.arm}` : ''}
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${earlyYearsConfig.isCustomized ? 'bg-amber-400 text-amber-950' : 'bg-white/20 text-white'}`}>
                  {earlyYearsConfig.isCustomized ? 'Class Custom Overrides Active' : 'Using School Default Template'}
                </span>
              </div>
              <p className="text-xs text-purple-100 mt-1">
                Customize developmental domains & skills for this specific class.
              </p>
            </div>
            <button
              onClick={() => setEarlyYearsClass(null)}
              className="text-purple-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Action Bar */}
          <div className="bg-purple-50 p-4 border-b border-purple-100 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAddingDomain(true)}
                className="px-3 py-1.5 bg-purple-700 text-white text-xs font-bold rounded-lg hover:bg-purple-800 transition-colors flex items-center gap-1 shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                Add Custom Domain
              </button>
            </div>
            {earlyYearsConfig.isCustomized && (
              <button
                onClick={handleResetEarlyYearsClassDomains}
                className="px-3 py-1.5 bg-white text-red-600 border border-red-200 text-xs font-bold rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reset to School Defaults
              </button>
            )}
          </div>

          {/* Add Domain Inline Form */}
          {addingDomain && (
            <div className="p-4 bg-amber-50 border-b border-amber-200 flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-700 mb-1">Domain Name</label>
                <input
                  type="text"
                  placeholder="e.g. 07 MOTOR COORDINATION & AGILITY"
                  value={newDomain.name}
                  onChange={e => setNewDomain(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="w-24">
                <label className="block text-xs font-bold text-gray-700 mb-1">Code</label>
                <input
                  type="text"
                  placeholder="07"
                  value={newDomain.code}
                  onChange={e => setNewDomain(prev => ({ ...prev, code: e.target.value }))}
                  className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <button
                onClick={handleAddDomain}
                className="px-3 py-1.5 bg-purple-700 text-white text-xs font-bold rounded-lg hover:bg-purple-800"
              >
                Add
              </button>
              <button
                onClick={() => setAddingDomain(false)}
                className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Content Body */}
          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            {loadingEarlyYearsConfig ? (
              <div className="py-12 text-center text-gray-500 font-medium animate-pulse">
                Loading Early Years domains...
              </div>
            ) : (earlyYearsConfig.domains || []).length === 0 ? (
              <div className="py-12 text-center text-gray-500 space-y-4">
                <p className="font-semibold text-sm">No Early Years domains configured for this class yet.</p>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  You can restore standard template defaults (01 General Info, 02 Language, 03 Numeracy, etc.) or create custom domains.
                </p>
                <div className="flex justify-center gap-3 pt-2">
                  <button
                    onClick={() => setAddingDomain(true)}
                    className="px-4 py-2 bg-purple-700 text-white text-xs font-bold rounded-lg hover:bg-purple-800 shadow transition-colors"
                  >
                    + Add Custom Domain
                  </button>
                  <button
                    onClick={handleResetEarlyYearsClassDomains}
                    className="px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 shadow transition-colors"
                  >
                    Restore School Default Template
                  </button>
                </div>
              </div>
            ) : (
              (earlyYearsConfig.domains || []).map((domain, dIdx) => (
                <div
                  key={dIdx}
                  className={`border rounded-xl p-4 transition-all ${domain.isActive ? 'bg-white border-purple-200 shadow-sm' : 'bg-gray-50 border-gray-200 opacity-60'}`}
                >
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-purple-100 text-purple-800 font-black text-xs flex items-center justify-center">
                        {domain.code || dIdx + 1}
                      </span>
                      <input
                        type="text"
                        value={domain.name}
                        onChange={e => {
                          const val = e.target.value;
                          setEarlyYearsConfig(prev => {
                            const domains = [...prev.domains];
                            domains[dIdx] = { ...domains[dIdx], name: val };
                            return { ...prev, domains };
                          });
                        }}
                        className="font-bold text-sm text-gray-900 border-b border-transparent hover:border-gray-300 focus:border-purple-600 focus:outline-none px-1 py-0.5"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-gray-600">
                        <input
                          type="checkbox"
                          checked={!!domain.isActive}
                          onChange={() => toggleDomainActive(dIdx)}
                          className="rounded text-purple-600 focus:ring-purple-500"
                        />
                        Active
                      </label>
                      <button
                        onClick={() => deleteDomain(dIdx)}
                        className="text-red-500 hover:text-red-700 p-1 text-xs font-bold"
                        title="Delete Domain"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Sub-skills */}
                  <div className="pl-4 space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-purple-900/70">Sub-Skills / Rating Items ({domain.skills?.length || 0})</p>
                    {(domain.skills || []).map((skill, sIdx) => (
                      <div key={sIdx} className="flex items-center justify-between bg-gray-50 hover:bg-purple-50/50 px-3 py-1.5 rounded-lg border border-gray-200 text-xs">
                        <input
                          type="text"
                          value={skill.name}
                          onChange={e => {
                            const val = e.target.value;
                            setEarlyYearsConfig(prev => {
                              const domains = [...prev.domains];
                              const skills = [...domains[dIdx].skills];
                              skills[sIdx] = { ...skills[sIdx], name: val };
                              domains[dIdx] = { ...domains[dIdx], skills };
                              return { ...prev, domains };
                            });
                          }}
                          className="flex-1 font-medium text-gray-800 border-b border-transparent hover:border-gray-300 focus:border-purple-600 focus:outline-none px-1 py-0.5 mr-2"
                        />
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1 cursor-pointer text-[11px] text-gray-500">
                            <input
                              type="checkbox"
                              checked={!!skill.isActive}
                              onChange={() => toggleSkillActive(dIdx, sIdx)}
                              className="rounded text-purple-600 focus:ring-purple-500"
                            />
                            Active
                          </label>
                          <button
                            onClick={() => deleteSkill(dIdx, sIdx)}
                            className="text-red-400 hover:text-red-600 px-1 font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Add Skill Input */}
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        placeholder="+ Add new skill for this domain..."
                        value={newSkill[dIdx] || ''}
                        onChange={e => setNewSkill(prev => ({ ...prev, [dIdx]: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddSkill(dIdx); }}
                        className="flex-1 px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                      <button
                        onClick={() => handleAddSkill(dIdx)}
                        className="px-3 py-1.5 bg-purple-100 text-purple-800 hover:bg-purple-200 text-xs font-bold rounded-lg transition-colors"
                      >
                        Add Skill
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
            <button
              onClick={() => setEarlyYearsClass(null)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEarlyYearsClassDomains}
              disabled={savingEarlyYearsConfig}
              className="px-5 py-2 bg-purple-700 text-white rounded-lg text-xs font-bold hover:bg-purple-800 disabled:opacity-50 transition-colors shadow-md flex items-center gap-1.5"
            >
              {savingEarlyYearsConfig ? 'Saving...' : 'Save Class Domains'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Main view - Class Cards
  if (!selectedClass) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Class Management</h1>
          <button
            onClick={() => {
              if (showClassForm && editingClass) {
                // If editing, clicking "+ Create" should switch to create mode
                setEditingClass(null);
                setClassForm({ 
                  name: '', 
                  arm: '', 
                  classTeacherId: '', 
                  expectedSubjects: 0,
                  showPositionOnReport: true,
                  showFeesOnReport: true,
                  showAttendanceOnReport: true,
                  reportLayout: ''
                });
              } else {
                setShowClassForm(!showClassForm);
                if (!showClassForm) {
                  setEditingClass(null);
                  setClassForm({ 
                    name: '', 
                    arm: '', 
                    classTeacherId: '', 
                    expectedSubjects: 0,
                    showPositionOnReport: true,
                    showFeesOnReport: true,
                    showAttendanceOnReport: true,
                    reportLayout: ''
                  });
                  
                  // Scroll to form on mobile
                  setTimeout(() => {
                    const formElement = document.getElementById('class-form-container');
                    if (formElement) {
                      formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }, 100);
                }
              }
            }}
            className="bg-primary text-white px-6 py-2 rounded-md hover:brightness-90 transition-colors"
          >
            {showClassForm && !editingClass ? 'Hide Form' : '+ Create New Class'}
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 relative">
          {/* Class Cards Grid - Takes more space */}
          <div className={`flex-1 transition-all duration-300 ${showClassForm ? 'lg:w-2/3' : 'w-full'}`}>
            <div className={`grid grid-cols-1 gap-6 ${showClassForm ? 'md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
              }`}>
              {classes.map((cls) => (
                <div
                  key={cls.id}
                  className={`bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 border overflow-hidden cursor-pointer ${editingClass?.id === cls.id ? 'border-primary ring-2 ring-primary/20' : 'border-gray-200'
                    }`}
                  onClick={() => handleClassClick(cls)}
                >
                  <div className="bg-gradient-to-br from-primary to-primary/90 p-6 text-white">
                    <h3 className="text-2xl font-bold">
                      {cls.name}{cls.arm ? ` ${cls.arm}` : ''}
                    </h3>
                    <p className="text-white/90 text-sm mt-1">
                      {cls._count?.students || 0} Students | {Math.max(0, (cls.expectedSubjects || 0) - (cls._count?.subjects || 0))} More Subjects Needed
                    </p>
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-gray-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500">Form Master</p>
                        <p className="text-sm font-medium text-gray-900">
                          {cls.classTeacher
                            ? `${cls.classTeacher.firstName} ${cls.classTeacher.middleName ? cls.classTeacher.middleName + ' ' : ''}${cls.classTeacher.lastName}`
                            : 'Not Assigned'}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-1.5 pt-2 border-t flex-wrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openEarlyYearsModal(cls);
                        }}
                        className="flex-1 min-w-[100px] text-xs text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 py-1.5 px-2 rounded font-semibold transition-colors cursor-pointer"
                        title="Configure Early Years Domains for this class"
                      >
                        EY Domains
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingClass(cls);
                          setClassForm({
                            name: cls.name,
                            arm: cls.arm || '',
                            classTeacherId: cls.classTeacherId || '',
                            expectedSubjects: cls.expectedSubjects || 0,
                            showPositionOnReport: cls.showPositionOnReport ?? true,
                            showFeesOnReport: cls.showFeesOnReport ?? true,
                            showAttendanceOnReport: cls.showAttendanceOnReport ?? true,
                            reportLayout: cls.reportLayout || ''
                          });
                          setShowClassForm(true);
                          
                          // Scroll to the form on mobile
                          setTimeout(() => {
                            const formElement = document.getElementById('class-form-container');
                            if (formElement) {
                              formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                          }, 100);
                        }}
                        className={`text-xs py-1.5 px-3 rounded transition-colors ${editingClass?.id === cls.id
                          ? 'bg-primary text-white'
                          : 'text-blue-600 hover:bg-blue-50'
                          }`}
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClass(cls.id);
                        }}
                        className="text-xs text-red-600 hover:bg-red-50 py-1.5 px-3 rounded transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {classes.length === 0 && (
              <div className="text-center py-12 bg-white rounded-lg shadow border border-gray-200">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <p className="text-gray-500 text-lg">No classes created yet</p>
                <p className="text-gray-400 text-sm mt-2">Click "+ Create New Class" to get started</p>
              </div>
            )}
          </div>

          {/* Sidebar Form - Sticky */}
          {showClassForm && (
            <div className="lg:w-96" id="class-form-container">
              <div className="sticky top-6 bg-white p-6 rounded-lg shadow-lg border border-primary/20 transition-all duration-300 animate-in slide-in-from-right-4">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900">
                    {editingClass ? 'Edit Class' : 'Create New Class'}
                  </h3>
                  <button
                    onClick={() => {
                      setShowClassForm(false);
                      setEditingClass(null);
                      setClassForm({ 
                        name: '', 
                        arm: '', 
                        classTeacherId: '', 
                        expectedSubjects: 0,
                        showPositionOnReport: true,
                        showFeesOnReport: true,
                        showAttendanceOnReport: true,
                        reportLayout: ''
                      });
                    }}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Class Name (e.g., SS 1)
                    </label>
                    <input
                      type="text"
                      list="classNames"
                      value={classForm.name}
                      onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                      className="w-full border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      placeholder="e.g. SS 1"
                      required
                    />
                    <datalist id="classNames">
                      {Array.from(new Set(classes.map(c => c.name))).sort().map(name => (
                        <option key={name} value={name} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Arm (e.g., A, B, C)
                    </label>
                    <input
                      type="text"
                      list="classArms"
                      value={classForm.arm}
                      onChange={(e) => setClassForm({ ...classForm, arm: e.target.value })}
                      className="w-full border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      placeholder="e.g. A"
                    />
                    <datalist id="classArms">
                      {Array.from(new Set(classes.map(c => c.arm).filter(Boolean))).sort().map(arm => (
                        <option key={arm} value={arm} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Form Master
                    </label>
                    <select
                      value={classForm.classTeacherId}
                      onChange={(e) => setClassForm({ ...classForm, classTeacherId: e.target.value })}
                      className="w-full border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    >
                      <option value="">No Form Master</option>
                      {teachers.map((teacher) => {
                        const isAssigned = classes.some(c => Number(c.classTeacherId) === Number(teacher.id) && (!editingClass || c.id !== editingClass.id));
                        return (
                          <option key={teacher.id} value={teacher.id} disabled={isAssigned}>
                            {teacher.firstName} {teacher.middleName ? teacher.middleName + ' ' : ''}{teacher.lastName} {isAssigned ? '(Assigned)' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Expected Subjects
                    </label>
                    <input
                      type="number"
                      value={classForm.expectedSubjects}
                      onChange={(e) => setClassForm({ ...classForm, expectedSubjects: e.target.value })}
                      className="w-full border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      placeholder="e.g. 12"
                      min="0"
                    />
                  </div>
                  
                  {/* Report Card Customization Toggles */}
                  <div className="pt-4 border-t space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-primary">Report Customization</h4>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <label className="text-xs font-bold text-gray-700">Display Class Position</label>
                        <input
                          type="checkbox"
                          checked={classForm.showPositionOnReport}
                          onChange={(e) => setClassForm({ ...classForm, showPositionOnReport: e.target.checked })}
                          className="w-4 h-4 text-primary rounded focus:ring-primary"
                        />
                      </div>

                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <label className="text-xs font-bold text-gray-700">Show Financial Standing</label>
                        <input
                          type="checkbox"
                          checked={classForm.showFeesOnReport}
                          onChange={(e) => setClassForm({ ...classForm, showFeesOnReport: e.target.checked })}
                          className="w-4 h-4 text-primary rounded focus:ring-primary"
                        />
                      </div>

                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <label className="text-xs font-bold text-gray-700">Show Attendance Record</label>
                        <input
                          type="checkbox"
                          checked={classForm.showAttendanceOnReport}
                          onChange={(e) => setClassForm({ ...classForm, showAttendanceOnReport: e.target.checked })}
                          className="w-4 h-4 text-primary rounded focus:ring-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Report Template</label>
                        <select
                          value={classForm.reportLayout}
                          onChange={(e) => setClassForm({ ...classForm, reportLayout: e.target.value })}
                          className="w-full border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
                        >
                          <option value="">Use School Default</option>
                          <option value="classic">Classic Professional</option>
                          <option value="modern">Modern Gradient</option>
                          <option value="minimal">Minimalist Business</option>
                          <option value="early_years">Early Years Progress Report (School Default)</option>
                          <option value="early_years_1-page">Early Years Progress Report (1-Page)</option>
                          <option value="early_years_2-page">Early Years Progress Report (2-Page)</option>
                          <option value="early_years_3-page">Early Years Progress Report (3-Page)</option>
                        </select>

                        {editingClass && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              openEarlyYearsModal(editingClass);
                            }}
                            className="mt-3 w-full py-2.5 px-3 bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            <svg className="w-4 h-4 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                            </svg>
                            Configure EY Domains & Skills for {editingClass.name}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex flex-col gap-3">
                    <button
                      type="submit"
                      className="w-full bg-primary text-white py-3 rounded-lg font-bold hover:brightness-90 transition-all shadow-md active:scale-95"
                    >
                      {editingClass ? 'Update Class Details' : 'Create Class'}
                    </button>
                    {editingClass && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingClass(null);
                          setClassForm({ 
                            name: '', 
                            arm: '', 
                            classTeacherId: '', 
                            expectedSubjects: 0,
                            showPositionOnReport: true,
                            showFeesOnReport: true,
                            showAttendanceOnReport: true,
                            reportLayout: ''
                          });
                          setShowClassForm(false);
                        }}
                        className="w-full bg-gray-100 text-gray-600 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-all"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
          <div className="flex">
            <svg className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="text-sm font-bold text-blue-900 uppercase tracking-tighter">About Class Management</h4>
              <p className="text-sm text-blue-700 mt-1">
                Click on any class card to view and manage students. Use the sidebar to quickly add or edit classes without losing your place.
              </p>
            </div>
          </div>
        </div>

        {/* Early Years Domains Modal */}
        {renderEarlyYearsModal()}
      </div>
    );
  }

  // Detail view - Students in selected class
  return (
    <div className="space-y-6">
      {/* Grading Modal */}
      {gradingStudent && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold">Grading & Remarks: {gradingStudent.user?.firstName} {gradingStudent.user?.lastName}</h3>
              <button
                onClick={() => setGradingStudent(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 max-h-[70vh] overflow-y-auto">
              {/* Left Column: Interactive Grading */}
              <div className="space-y-6">
                {/* Remarks Section */}
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-black uppercase tracking-widest text-gray-500">Form Master's Remark</label>
                      <select 
                        onChange={(e) => setRemarks({ ...remarks, formMasterRemark: e.target.value })}
                        className="text-[10px] bg-gray-100 border-none rounded px-2 py-1 font-bold text-primary cursor-pointer"
                      >
                        <option value="">Quick Select Remark</option>
                        {predefinedRemarks.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <textarea
                      value={remarks.formMasterRemark}
                      onChange={(e) => setRemarks({ ...remarks, formMasterRemark: e.target.value })}
                      className="w-full border-gray-200 rounded-xl p-3 h-24 text-sm font-medium focus:ring-2 focus:ring-primary outline-none transition-all shadow-inner bg-gray-50/50"
                      placeholder="Teacher's impression..."
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-black uppercase tracking-widest text-gray-500">Principal's Remark</label>
                      <select 
                        onChange={(e) => setRemarks({ ...remarks, principalRemark: e.target.value })}
                        className="text-[10px] bg-gray-100 border-none rounded px-2 py-1 font-bold text-accent cursor-pointer"
                      >
                        <option value="">Quick Select Remark</option>
                        {predefinedRemarks.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <textarea
                      value={remarks.principalRemark}
                      onChange={(e) => setRemarks({ ...remarks, principalRemark: e.target.value })}
                      className="w-full border-gray-200 rounded-xl p-3 h-24 text-sm font-medium focus:ring-2 focus:ring-accent outline-none transition-all shadow-inner bg-gray-50/50"
                      placeholder="Headteacher's remark..."
                    />
                  </div>
                </div>

                {/* Psychomotor Domain Section */}
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                  <h4 className="font-black italic uppercase text-xs tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                    Psychomotor & Affective
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {domains.length === 0 ? (
                      <div className="col-span-full text-center p-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">No domains configured</p>
                      </div>
                    ) : (
                      (Array.isArray(domains) ? domains : []).map(domain => {
                        const rating = psychomotorRatings.find(r => r.domainId === domain.id) || { score: 0 };
                        return (
                          <div key={domain.id} className="space-y-1">
                            <div className="flex justify-between items-end">
                              <span className="font-bold text-[10px] text-gray-500 uppercase tracking-tighter">{domain.name}</span>
                              <span className="text-[10px] font-black text-primary">{rating.score}/{domain.maxScore}</span>
                            </div>
                            <input
                              type="range"
                              min="1"
                              max={domain.maxScore}
                              value={rating.score || 0}
                              onChange={(e) => {
                                const newScore = parseInt(e.target.value);
                                setPsychomotorRatings(prev => {
                                  const existing = prev.find(p => p.domainId === domain.id);
                                  if (existing) {
                                    return prev.map(p => p.domainId === domain.id ? { ...p, score: newScore } : p);
                                  } else {
                                    return [...prev, { domainId: domain.id, name: domain.name, score: newScore }];
                                  }
                                });
                              }}
                              className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Report Card Preview */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden flex flex-col">
                <div className="p-3 bg-slate-900 flex items-center justify-between">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Live Report View</h4>
                  <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-[8px] font-black uppercase">Auto-Refresh On</span>
                </div>
                
                <div className="p-4 flex-1 overflow-y-auto">
                  {loadingReport ? (
                    <div className="flex flex-col items-center justify-center p-12 space-y-3">
                      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-[10px] font-black uppercase text-slate-400">Auditing Results...</p>
                    </div>
                  ) : studentReport ? (
                    <div className="space-y-4">
                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100">
                          <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Average Score</p>
                          <p className="text-xl font-black text-slate-900 italic">{studentReport.termAverage?.toFixed(1) || '0.0'}%</p>
                        </div>
                        <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100">
                          <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Position</p>
                          <p className="text-xl font-black text-slate-900 italic">{studentReport.termPosition} / {studentReport.totalStudents}</p>
                        </div>
                        <div className="p-3 bg-green-50 rounded-xl shadow-sm border border-green-100">
                          <p className="text-[8px] font-black uppercase text-green-600 tracking-widest">Passed</p>
                          <p className="text-xl font-black text-green-800 italic">{studentReport.passFailSummary?.totalPassed || 0}</p>
                        </div>
                        <div className="p-3 bg-red-50 rounded-xl shadow-sm border border-red-100">
                          <p className="text-[8px] font-black uppercase text-red-600 tracking-widest">Failed</p>
                          <p className="text-xl font-black text-red-800 italic">{studentReport.passFailSummary?.totalFailed || 0}</p>
                        </div>
                      </div>

                      {/* Subjects Table Preview */}
                      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
                        <table className="w-full text-left text-[10px]">
                          <thead className="bg-slate-100 border-b border-slate-200">
                            <tr>
                              <th className="px-3 py-2 font-black uppercase">Subject</th>
                              <th className="px-3 py-2 font-black uppercase text-center">Total</th>
                              <th className="px-3 py-2 font-black uppercase text-center">Grade</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {studentReport.subjects?.map(s => (
                              <tr key={s.id} className={s.total < 40 ? 'bg-red-50/30' : ''}>
                                <td className="px-3 py-2 font-bold text-slate-700">{s.name}</td>
                                <td className="px-3 py-2 font-black text-center text-slate-900">{s.total}</td>
                                <td className={`px-3 py-2 font-black text-center ${s.total < 40 ? 'text-red-600' : 'text-primary'}`}>{s.grade}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-8">
                      <p className="text-xs font-bold text-slate-400 italic">Could not load report preview.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setGradingStudent(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={saveGrading}
                disabled={saving}
                className="px-6 py-2 bg-primary text-white rounded-md hover:brightness-90 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Grading'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBackToClasses}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Classes
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {selectedClass.name}{selectedClass.arm ? ` ${selectedClass.arm}` : ''} - Students
          </h1>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <button
            onClick={() => openEarlyYearsModal(selectedClass)}
            className="px-3 py-1.5 text-xs font-semibold rounded-md text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors flex items-center gap-1 shadow-sm"
            title="Configure Early Years Domains for this class"
          >
            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            EY Domains
          </button>
          <div className="flex items-center gap-3 bg-white p-2 rounded-md border shadow-sm">
            <label className="text-sm font-semibold text-gray-700">Select Term:</label>
            <select
              value={selectedTermId}
              onChange={(e) => setSelectedTermId(e.target.value)}
              className="border-none bg-transparent text-sm font-medium focus:ring-0 cursor-pointer"
            >
              <option value="">Select Term</option>
              {terms.map(term => (
                <option key={term.id} value={term.id}>
                  {term.name} ({term.academicSession?.name}) {term.isCurrent ? '• Active' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 bg-white p-2 rounded-md border shadow-sm">
            <label className="text-sm font-semibold text-gray-700">Publish:</label>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (!selectedClass || !selectedTermId) return;
                  const isPublished = selectedClass.isProgressivePublished;
                  if (!confirm(`Are you sure you want to ${isPublished ? 'unpublish' : 'publish'} PROGRESSIVE results?`)) return;

                  try {
                    const response = await api.put(`/api/classes/${selectedClass.id}/publish-results`, {
                      isProgressivePublished: !isPublished,
                      termId: parseInt(selectedTermId)
                    });

                    if (response.ok) {
                      alert(`Progressive results ${!isPublished ? 'published' : 'unpublished'} successfully!`);
                      setSelectedClass(prev => ({ ...prev, isProgressivePublished: !isPublished }));
                    } else {
                      const errorData = await response.json();
                      alert(`Failed: ${errorData.error}`);
                    }
                  } catch (e) {
                    alert(`Error: ${e.message}`);
                  }
                }}
                className={`px-3 py-1 text-xs rounded-md text-white transition-colors ${selectedClass.isProgressivePublished ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {selectedClass.isProgressivePublished ? 'Progressive: Published' : 'Progressive: Draft'}
              </button>
              <button
                onClick={async () => {
                  if (!selectedClass || !selectedTermId) return;
                  const isPublished = selectedClass.isResultPublished;
                  if (!confirm(`Are you sure you want to ${isPublished ? 'unpublish' : 'publish'} FINAL results?`)) return;

                  try {
                    const response = await api.put(`/api/classes/${selectedClass.id}/publish-results`, {
                      isPublished: !isPublished,
                      termId: parseInt(selectedTermId)
                    });

                    if (response.ok) {
                      alert(`Final results ${!isPublished ? 'published' : 'unpublished'} successfully!`);
                      setSelectedClass(prev => ({ ...prev, isResultPublished: !isPublished }));
                      setClasses(prev => prev.map(c => c.id === selectedClass.id ? { ...c, isResultPublished: !isPublished } : c));
                    } else {
                      const errorData = await response.json();
                      alert(`Failed: ${errorData.error}`);
                    }
                  } catch (e) {
                    alert(`Error: ${e.message}`);
                  }
                }}
                className={`px-3 py-1 text-xs rounded-md text-white transition-colors ${selectedClass.isResultPublished ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
              >
                {selectedClass.isResultPublished ? 'Final: Published' : 'Final: Draft'}
              </button>
            </div>
          </div>

          {selectedStudents.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete Selected ({selectedStudents.length})
            </button>
          )}
        </div>
      </div>

      {/* Class Info Card */}
      <div className="bg-gradient-to-r from-primary to-primary/90 text-white p-6 rounded-lg shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-white/90 text-sm">Total Students</p>
            <p className="text-3xl font-bold">{classStudents.length}</p>
          </div>
          <div>
            <p className="text-white/90 text-sm">Form Master</p>
            <p className="text-lg font-semibold">
              {selectedClass.classTeacher
                ? `${selectedClass.classTeacher.firstName} ${selectedClass.classTeacher.middleName ? selectedClass.classTeacher.middleName + ' ' : ''}${selectedClass.classTeacher.lastName}`
                : 'Not Assigned'}
            </p>
          </div>
          <div>
            <p className="text-white/90 text-sm">Selected</p>
            <p className="text-3xl font-bold">{selectedStudents.length}</p>
          </div>
        </div>
      </div>

      {/* Students Table */}
      {
        classStudents.length > 0 ? (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedStudents.length === classStudents.length}
                        onChange={handleSelectAll}
                        className="w-4 h-4 text-primary rounded focus:ring-primary"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Admission No.
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gender
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date of Birth
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {classStudents.map((student) => (
                    <tr
                      key={student.id}
                      className={`hover:bg-gray-50 transition-colors ${selectedStudents.includes(student.id) ? 'bg-primary/5' : ''
                        }`}
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student.id)}
                          onChange={() => handleSelectStudent(student.id)}
                          className="w-4 h-4 text-primary rounded focus:ring-primary"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{student.admissionNumber}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {(() => {
                            const userName = student.user ? `${student.user.firstName || ''} ${student.user.lastName || ''}`.trim() : '';
                            const legacyName = (student.name || '').trim();
                            const middleName = (student.middleName || '').trim();
                            let baseName = userName.length >= legacyName.length ? userName : legacyName;
                            if (!baseName && middleName) baseName = middleName;
                            if (!baseName) return `Unknown Student (${student.admissionNumber})`;
                            return middleName && !baseName.toLowerCase().includes(middleName.toLowerCase()) 
                              ? `${baseName} ${middleName}` 
                              : baseName;
                          })()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{student.gender}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex gap-2 justify-end">
                        <Link
                          to={`/dashboard/term-report?studentId=${student.id}&termId=${selectedTermId || ''}`}
                          className="text-blue-600 border border-blue-200 hover:bg-blue-50 px-3 py-1 rounded-md transition-colors"
                          target="_blank"
                        >
                          Term Report
                        </Link>
                        <Link
                          to={`/dashboard/report-card?studentId=${student.id}`}
                          className="text-purple-600 border border-purple-200 hover:bg-purple-50 px-3 py-1 rounded-md transition-colors"
                          target="_blank"
                        >
                          Cum. Report
                        </Link>
                        <button
                          onClick={() => openGradingModal(student)}
                          className="text-white bg-primary hover:bg-primary/90 px-3 py-1 rounded-md transition-colors"
                        >
                          Grade & Remark
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <p className="text-gray-500 text-lg">No students in this class yet</p>
          </div>
        )
      }

      {/* Early Years Domains Modal */}
      {renderEarlyYearsModal()}
    </div>
  );
};

export default ClassManagement;

