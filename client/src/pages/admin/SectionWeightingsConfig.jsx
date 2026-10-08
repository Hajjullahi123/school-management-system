import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { toast } from '../../utils/toast';
import { useAuth } from '../../context/AuthContext';
import { Check, RotateCcw, Save, ShieldCheck, Sparkles, Sliders, Layers, Plus, Trash2, UserCheck, X } from 'lucide-react';

const SectionWeightingsConfig = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [subAdmins, setSubAdmins] = useState([]);
  const [adminAssignments, setAdminAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState(null);

  const [schoolDefaults, setSchoolDefaults] = useState({
    assignment1Weight: 5,
    assignment2Weight: 5,
    test1Weight: 10,
    test2Weight: 10,
    examWeight: 70
  });

  // Modal State for Creating/Editing Custom Sections
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [sectionForm, setSectionForm] = useState({
    name: '',
    code: '',
    assignment1Weight: 5,
    assignment2Weight: 5,
    test1Weight: 10,
    test2Weight: 10,
    examWeight: 70,
    reportName: '',
    expectedArrivalTime: '07:30',
    lateCutoffTime: '08:15',
    lateGraceMinutes: 15,
    attendanceDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  });

  // Modal State for Sub-Admin Section Assignment
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [selectedSubAdmin, setSelectedSubAdmin] = useState(null);
  const [selectedSectionIds, setSelectedSectionIds] = useState([]);

  const [editingClassId, setEditingClassId] = useState(null);
  const [classFormData, setClassFormData] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [settingsRes, classesRes, sectionsRes, usersRes, assignRes] = await Promise.all([
        api.get('/api/settings'),
        api.get('/api/classes'),
        api.get('/api/sections'),
        api.get('/api/users'),
        api.get('/api/sections/admin-assignments')
      ]);

      if (settingsRes.ok) {
        const sData = await settingsRes.json();
        setSchoolDefaults({
          assignment1Weight: sData.assignment1Weight ?? 5,
          assignment2Weight: sData.assignment2Weight ?? 5,
          test1Weight: sData.test1Weight ?? 10,
          test2Weight: sData.test2Weight ?? 10,
          examWeight: sData.examWeight ?? 70
        });
      }

      if (classesRes.ok) {
        const cData = await classesRes.json();
        setClasses(Array.isArray(cData) ? cData : []);
      }

      if (sectionsRes.ok) {
        const secData = await sectionsRes.json();
        const normalized = Array.isArray(secData) ? secData.map(s => {
          let days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
          if (s.attendanceDays) {
            try {
              days = typeof s.attendanceDays === 'string' ? JSON.parse(s.attendanceDays) : s.attendanceDays;
            } catch (e) {}
          }
          return {
            ...s,
            expectedArrivalTime: s.expectedArrivalTime || '07:30',
            lateCutoffTime: s.lateCutoffTime || '08:15',
            lateGraceMinutes: s.lateGraceMinutes ?? 15,
            attendanceDays: days
          };
        }) : [];
        setSections(normalized);
      }

      if (usersRes.ok) {
        const uData = await usersRes.json();
        const subAdminList = Array.isArray(uData)
          ? uData.filter(u => ['sub_admin', 'admin', 'principal'].includes(u.role))
          : [];
        setSubAdmins(subAdminList);
      }

      if (assignRes.ok) {
        const aData = await assignRes.json();
        setAdminAssignments(Array.isArray(aData) ? aData : []);
      }
    } catch (e) {
      console.error('Failed to load section weightings data', e);
      toast.error('Failed to load section configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSection = async (e) => {
    e.preventDefault();
    const total = Number(sectionForm.assignment1Weight || 0) +
      Number(sectionForm.assignment2Weight || 0) +
      Number(sectionForm.test1Weight || 0) +
      Number(sectionForm.test2Weight || 0) +
      Number(sectionForm.examWeight || 0);

    if (total !== 100) {
      toast.error(`Total weight must equal 100%. Current total: ${total}%`);
      return;
    }

    try {
      const res = await api.post('/api/sections', sectionForm);
      if (res.ok) {
        toast.success(`Section "${sectionForm.name}" created successfully!`);
        setShowSectionModal(false);
        setSectionForm({
          name: '',
          code: '',
          assignment1Weight: 5,
          assignment2Weight: 5,
          test1Weight: 10,
          test2Weight: 10,
          examWeight: 70,
          reportName: '',
          expectedArrivalTime: '07:30',
          lateCutoffTime: '08:15',
          lateGraceMinutes: 15,
          attendanceDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
        });
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to create section');
      }
    } catch (err) {
      toast.error('Unexpected error creating section');
    }
  };

  const handleUpdateSectionWeights = async (sec) => {
    const total = Number(sec.assignment1Weight || 0) +
      Number(sec.assignment2Weight || 0) +
      Number(sec.test1Weight || 0) +
      Number(sec.test2Weight || 0) +
      Number(sec.examWeight || 0);

    if (total !== 100) {
      toast.error(`Total weight must equal 100%. Current total: ${total}%`);
      return;
    }

    setSavingSection(sec.id);
    try {
      const res = await api.put(`/api/sections/${sec.id}`, sec);
      if (res.ok) {
        toast.success(`Updated weights for ${sec.name} section!`);
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to update section');
      }
    } catch (e) {
      toast.error('Error updating section weights');
    } finally {
      setSavingSection(null);
    }
  };

  const handleDeleteSection = async (sectionId, sectionName) => {
    if (!confirm(`Are you sure you want to delete section "${sectionName}"?`)) return;
    try {
      const res = await api.delete(`/api/sections/${sectionId}`);
      if (res.ok) {
        toast.success(`Section "${sectionName}" deleted.`);
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to delete section');
      }
    } catch (e) {
      toast.error('Error deleting section');
    }
  };

  const handleClassSectionChange = async (classId, newSectionId) => {
    try {
      const targetSecId = newSectionId ? parseInt(newSectionId) : null;
      const res = await api.post('/api/sections/assign-classes', {
        sectionId: targetSecId,
        classIds: [classId]
      });

      if (res.ok) {
        toast.success('Class section assignment updated!');
        fetchData();
      } else {
        toast.error('Failed to reassign class section');
      }
    } catch (e) {
      toast.error('Error reassigning class section');
    }
  };

  const handleSaveClassWeights = async (classId) => {
    const cData = classFormData[classId];
    if (!cData) return;

    const total = Number(cData.assignment1Weight || 0) +
      Number(cData.assignment2Weight || 0) +
      Number(cData.test1Weight || 0) +
      Number(cData.test2Weight || 0) +
      Number(cData.examWeight || 0);

    if (total !== 100) {
      toast.error(`Total weight for class must equal 100%. Current: ${total}%`);
      return;
    }

    try {
      const res = await api.put(`/api/classes/${classId}`, cData);
      if (res.ok) {
        toast.success('Class assessment weights updated!');
        setEditingClassId(null);
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to update class weights');
      }
    } catch (e) {
      toast.error('Error updating class weights');
    }
  };

  const handleResetClassToDefault = async (classId) => {
    try {
      const res = await api.put(`/api/classes/${classId}`, {
        assignment1Weight: null,
        assignment2Weight: null,
        test1Weight: null,
        test2Weight: null,
        examWeight: null
      });

      if (res.ok) {
        toast.success('Class reset to default section/school weights!');
        setEditingClassId(null);
        fetchData();
      } else {
        toast.error('Failed to reset class weights');
      }
    } catch (e) {
      toast.error('Error resetting class weights');
    }
  };

  const handleOpenAdminAssignModal = (admin) => {
    setSelectedSubAdmin(admin);
    const existingSectionIds = adminAssignments
      .filter(a => a.userId === admin.id)
      .map(a => a.sectionId);
    setSelectedSectionIds(existingSectionIds);
    setShowAdminModal(true);
  };

  const handleSaveAdminSectionAssignments = async () => {
    if (!selectedSubAdmin) return;
    try {
      const res = await api.post('/api/sections/assign-admin', {
        userId: selectedSubAdmin.id,
        sectionIds: selectedSectionIds
      });

      if (res.ok) {
        toast.success(`Section access updated for ${selectedSubAdmin.firstName}!`);
        setShowAdminModal(false);
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to save section assignment');
      }
    } catch (e) {
      toast.error('Error saving section assignments');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Overview Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-8 rounded-[36px] shadow-2xl relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-black text-indigo-300 uppercase tracking-widest mb-4">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Flexible Custom Section Architecture
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tight">Section & Class Assessment Control</h2>
          <p className="text-slate-300 text-sm font-medium mt-2 leading-relaxed">
            Manage assessment weights across any school section—such as <strong className="text-white">Primary</strong>, <strong className="text-white">JSS</strong>, <strong className="text-white">SSS</strong>, or custom sections like <strong className="text-white">SAT & SUN (Weekend)</strong>, <strong className="text-white">Pre-School</strong>, or <strong className="text-white">Islamiyyah</strong>. Delegate sub-admins to handle specific sections with isolated permissions.
          </p>
        </div>
      </div>

      {/* Global Default Summary */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Global School Default Weights
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">Classes without specific section rules inherit these fallback settings.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-black">
          <span className="px-3 py-1.5 bg-slate-100 rounded-xl text-slate-700">Ass 1: {schoolDefaults.assignment1Weight}%</span>
          <span className="px-3 py-1.5 bg-slate-100 rounded-xl text-slate-700">Ass 2: {schoolDefaults.assignment2Weight}%</span>
          <span className="px-3 py-1.5 bg-slate-100 rounded-xl text-slate-700">Test 1: {schoolDefaults.test1Weight}%</span>
          <span className="px-3 py-1.5 bg-slate-100 rounded-xl text-slate-700">Test 2: {schoolDefaults.test2Weight}%</span>
          <span className="px-3 py-1.5 bg-indigo-100 text-indigo-900 rounded-xl border border-indigo-200">Exam: {schoolDefaults.examWeight}%</span>
          <span className="px-3 py-1.5 bg-emerald-100 text-emerald-900 rounded-xl">Total: 100%</span>
        </div>
      </div>

      {/* Sections Management */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              School Sections & Weight Configurations
            </h3>
            <p className="text-slate-500 text-xs font-bold mt-0.5">Create custom sections (e.g. SAT & SUN) and set their grading rules.</p>
          </div>
          {user?.role !== 'sub_admin' && (
            <button
              type="button"
              onClick={() => setShowSectionModal(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-md transition-all flex items-center gap-2 self-start"
            >
              <Plus className="w-4 h-4" /> Add Custom Section (SAT/SUN)
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sections.length === 0 ? (
            <div className="col-span-full p-8 text-center bg-slate-50 border border-slate-200 rounded-3xl font-bold text-slate-500">
              No sections assigned to your account.
            </div>
          ) : (
            sections.map((sec) => {
            const caTotal = Number(sec.assignment1Weight || 0) + Number(sec.assignment2Weight || 0) + Number(sec.test1Weight || 0) + Number(sec.test2Weight || 0);
            const examTotal = Number(sec.examWeight || 0);
            const grandTotal = caTotal + examTotal;

            return (
              <div key={sec.id} className="p-6 rounded-3xl border-2 border-slate-200 bg-white space-y-5 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between border-b pb-3 border-slate-100">
                  <div>
                    <span className="px-2.5 py-1 text-[10px] font-black uppercase bg-indigo-100 text-indigo-900 rounded-lg">
                      {sec.code || 'SECTION'}
                    </span>
                    <h4 className="text-lg font-black uppercase tracking-tight mt-1 text-slate-900">{sec.name}</h4>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-slate-900">{caTotal}/{examTotal}</span>
                    <span className="block text-[10px] font-bold text-slate-500">CA / EXAM</span>
                  </div>
                </div>

                <div className="text-left pt-1">
                  <label className="block text-[9px] uppercase font-black text-slate-500 mb-1">Report Card Display Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. OFFICIAL RESULT"
                    value={sec.reportName || ''}
                    onChange={(e) => setSections(sections.map(s => s.id === sec.id ? { ...s, reportName: e.target.value } : s))}
                    className="w-full text-left px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Weight Inputs */}
                <div className="grid grid-cols-5 gap-2 text-center text-xs font-bold">
                  <div>
                    <label className="block text-[9px] uppercase font-black text-slate-500 mb-1">Ass 1</label>
                    <input
                      type="number"
                      value={sec.assignment1Weight}
                      onChange={(e) => setSections(sections.map(s => s.id === sec.id ? { ...s, assignment1Weight: Number(e.target.value) } : s))}
                      className="w-full text-center py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase font-black text-slate-500 mb-1">Ass 2</label>
                    <input
                      type="number"
                      value={sec.assignment2Weight}
                      onChange={(e) => setSections(sections.map(s => s.id === sec.id ? { ...s, assignment2Weight: Number(e.target.value) } : s))}
                      className="w-full text-center py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase font-black text-slate-500 mb-1">Test 1</label>
                    <input
                      type="number"
                      value={sec.test1Weight}
                      onChange={(e) => setSections(sections.map(s => s.id === sec.id ? { ...s, test1Weight: Number(e.target.value) } : s))}
                      className="w-full text-center py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase font-black text-slate-500 mb-1">Test 2</label>
                    <input
                      type="number"
                      value={sec.test2Weight}
                      onChange={(e) => setSections(sections.map(s => s.id === sec.id ? { ...s, test2Weight: Number(e.target.value) } : s))}
                      className="w-full text-center py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase font-black text-slate-500 mb-1">Exam</label>
                    <input
                      type="number"
                      value={sec.examWeight}
                      onChange={(e) => setSections(sections.map(s => s.id === sec.id ? { ...s, examWeight: Number(e.target.value) } : s))}
                      className="w-full text-center py-1.5 bg-indigo-50 border border-indigo-300 rounded-xl font-black text-indigo-950 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Section Attendance Rules & Active Days */}
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-indigo-900 tracking-wider flex items-center gap-1">
                      📅 Active Attendance Days
                    </span>
                    <div className="flex gap-1 text-[9px] font-bold text-slate-500">
                      <button
                        type="button"
                        onClick={() => setSections(sections.map(s => s.id === sec.id ? { ...s, attendanceDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'] } : s))}
                        className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700"
                      >
                        Mon-Fri
                      </button>
                      <button
                        type="button"
                        onClick={() => setSections(sections.map(s => s.id === sec.id ? { ...s, attendanceDays: ['Saturday','Sunday'] } : s))}
                        className="px-1.5 py-0.5 bg-amber-100 hover:bg-amber-200 rounded text-amber-900"
                      >
                        Sat-Sun
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {[
                      { day: 'Sunday', label: 'Sun' },
                      { day: 'Monday', label: 'Mon' },
                      { day: 'Tuesday', label: 'Tue' },
                      { day: 'Wednesday', label: 'Wed' },
                      { day: 'Thursday', label: 'Thu' },
                      { day: 'Friday', label: 'Fri' },
                      { day: 'Saturday', label: 'Sat' }
                    ].map(({ day, label }) => {
                      const activeDays = Array.isArray(sec.attendanceDays) ? sec.attendanceDays : [];
                      const isSelected = activeDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            const updatedDays = isSelected
                              ? activeDays.filter(d => d !== day)
                              : [...activeDays, day];
                            setSections(sections.map(s => s.id === sec.id ? { ...s, attendanceDays: updatedDays } : s));
                          }}
                          className={`flex-1 min-w-[34px] py-1 text-[10px] font-black rounded-lg border transition-all ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                              : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <label className="block text-[9px] uppercase font-black text-slate-500 mb-0.5">Arrival Time</label>
                      <input
                        type="time"
                        value={sec.expectedArrivalTime || '07:30'}
                        onChange={(e) => setSections(sections.map(s => s.id === sec.id ? { ...s, expectedArrivalTime: e.target.value } : s))}
                        className="w-full text-center py-1 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase font-black text-slate-500 mb-0.5">Late Cutoff</label>
                      <input
                        type="time"
                        value={sec.lateCutoffTime || '08:15'}
                        onChange={(e) => setSections(sections.map(s => s.id === sec.id ? { ...s, lateCutoffTime: e.target.value } : s))}
                        className="w-full text-center py-1 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase font-black text-slate-500 mb-0.5">Grace (Mins)</label>
                      <input
                        type="number"
                        value={sec.lateGraceMinutes ?? 15}
                        onChange={(e) => setSections(sections.map(s => s.id === sec.id ? { ...s, lateGraceMinutes: Number(e.target.value) } : s))}
                        className="w-full text-center py-1 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs text-slate-900"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                  <span className="font-bold text-slate-600">Assigned Classes: {sec.classes?.length || 0}</span>
                  {grandTotal !== 100 ? (
                    <span className="text-[10px] font-black text-rose-600 uppercase">Must equal 100%</span>
                  ) : (
                    <span className="text-[10px] font-black text-emerald-600 uppercase">Sum = 100%</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={savingSection === sec.id || grandTotal !== 100}
                    onClick={() => handleUpdateSectionWeights(sec)}
                    className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-2xl font-black uppercase text-xs tracking-wider shadow-sm transition-all flex items-center justify-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {savingSection === sec.id ? 'Saving...' : 'Save Section Weights'}
                  </button>

                  {(!['Primary', 'JSS', 'SSS'].includes(sec.name) || (sec.classes?.length || 0) === 0) && (
                    <button
                      type="button"
                      onClick={() => handleDeleteSection(sec.id, sec.name)}
                      className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-2xl transition-all border border-rose-200"
                      title="Delete Section"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          }))}
        </div>
      </div>

      {/* Sub-Admin Section Assignment Module */}
      {user?.role !== 'sub_admin' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-slate-100">
            <div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-600" />
                Section Admin Access & Permissions Scoping
              </h3>
              <p className="text-slate-500 text-xs font-bold mt-1">
                Assign Sub-Admins or Section Heads to manage specific school sections (e.g. Primary Admin, SAT Coordinator).
              </p>
            </div>
          </div>

          {subAdmins.length === 0 ? (
            <div className="text-center py-8 text-slate-400 font-bold text-sm">
              No Sub-Admin or Principal accounts found.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subAdmins.map((admin) => {
                const assignedSecs = adminAssignments
                  .filter(a => a.userId === admin.id)
                  .map(a => a.Section?.name)
                  .filter(Boolean);

                return (
                  <div key={admin.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-4">
                    <div>
                      <h5 className="font-black text-sm text-slate-900">{admin.firstName} {admin.lastName}</h5>
                      <p className="text-xs text-slate-500 font-medium">@{admin.username} ({admin.role})</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {assignedSecs.length > 0 ? (
                          assignedSecs.map((name, i) => (
                            <span key={i} className="px-2 py-0.5 bg-indigo-100 text-indigo-900 rounded font-black text-[10px]">
                              {name}
                            </span>
                          ))
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded font-bold text-[10px]">
                            All Sections (Full Access)
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenAdminAssignModal(admin)}
                      className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 rounded-xl font-bold text-xs shadow-xs"
                    >
                      Manage Scope
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Class Level Detailed Overrides Table */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-slate-100">
          <div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-600" />
              Per-Class Section & Assessment Overrides
            </h3>
            <p className="text-slate-500 text-xs font-bold mt-1">
              Assign classes to custom sections and fine-tune individual class assessment weights.
            </p>
          </div>
          <span className="px-3 py-1.5 bg-slate-100 rounded-xl text-xs font-black text-slate-700">
            Total Classes: {classes.length}
          </span>
        </div>

        {classes.length === 0 ? (
          <div className="text-center py-12 text-slate-400 font-bold text-sm">
            No active classes found. Add classes in Class Management to configure weightings.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  <th className="p-3">Class Name</th>
                  <th className="p-3">Assigned Section</th>
                  <th className="p-3">Ass 1</th>
                  <th className="p-3">Ass 2</th>
                  <th className="p-3">Test 1</th>
                  <th className="p-3">Test 2</th>
                  <th className="p-3">Exam</th>
                  <th className="p-3">Total CA</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {classes.map((cls) => {
                  const isEditing = editingClassId === cls.id;
                  const hasCustom = (
                    cls.assignment1Weight !== null && cls.assignment1Weight !== undefined ||
                    cls.assignment2Weight !== null && cls.assignment2Weight !== undefined ||
                    cls.test1Weight !== null && cls.test1Weight !== undefined ||
                    cls.test2Weight !== null && cls.test2Weight !== undefined ||
                    cls.examWeight !== null && cls.examWeight !== undefined
                  );

                  // Priority: Class custom -> Section weight -> Global default
                  const currentSec = sections.find(s => s.id === cls.sectionId);

                  const curA1 = cls.assignment1Weight ?? (currentSec?.assignment1Weight ?? schoolDefaults.assignment1Weight);
                  const curA2 = cls.assignment2Weight ?? (currentSec?.assignment2Weight ?? schoolDefaults.assignment2Weight);
                  const curT1 = cls.test1Weight ?? (currentSec?.test1Weight ?? schoolDefaults.test1Weight);
                  const curT2 = cls.test2Weight ?? (currentSec?.test2Weight ?? schoolDefaults.test2Weight);
                  const curExam = cls.examWeight ?? (currentSec?.examWeight ?? schoolDefaults.examWeight);
                  const curCaTotal = curA1 + curA2 + curT1 + curT2;

                  if (isEditing) {
                    const cForm = classFormData[cls.id] || {
                      assignment1Weight: curA1,
                      assignment2Weight: curA2,
                      test1Weight: curT1,
                      test2Weight: curT2,
                      examWeight: curExam
                    };

                    return (
                      <tr key={cls.id} className="bg-indigo-50/50">
                        <td className="p-3 font-black text-slate-900 uppercase">
                          {cls.name} {cls.arm || ''}
                        </td>
                        <td className="p-3">
                          <select
                            value={cls.sectionId || ''}
                            onChange={(e) => handleClassSectionChange(cls.id, e.target.value)}
                            className="px-2 py-1 bg-white border border-slate-300 rounded font-bold text-xs text-slate-900"
                          >
                            <option value="">-- Select Section --</option>
                            {sections.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={cForm.assignment1Weight}
                            onChange={(e) => setClassFormData({
                              ...classFormData,
                              [cls.id]: { ...cForm, assignment1Weight: Number(e.target.value) }
                            })}
                            className="w-16 text-center py-1 bg-white border rounded font-black text-slate-900"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={cForm.assignment2Weight}
                            onChange={(e) => setClassFormData({
                              ...classFormData,
                              [cls.id]: { ...cForm, assignment2Weight: Number(e.target.value) }
                            })}
                            className="w-16 text-center py-1 bg-white border rounded font-black text-slate-900"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={cForm.test1Weight}
                            onChange={(e) => setClassFormData({
                              ...classFormData,
                              [cls.id]: { ...cForm, test1Weight: Number(e.target.value) }
                            })}
                            className="w-16 text-center py-1 bg-white border rounded font-black text-slate-900"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={cForm.test2Weight}
                            onChange={(e) => setClassFormData({
                              ...classFormData,
                              [cls.id]: { ...cForm, test2Weight: Number(e.target.value) }
                            })}
                            className="w-16 text-center py-1 bg-white border rounded font-black text-slate-900"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={cForm.examWeight}
                            onChange={(e) => setClassFormData({
                              ...classFormData,
                              [cls.id]: { ...cForm, examWeight: Number(e.target.value) }
                            })}
                            className="w-16 text-center py-1 bg-white border rounded font-black text-indigo-900"
                          />
                        </td>
                        <td className="p-3 font-black text-indigo-900">
                          {Number(cForm.assignment1Weight || 0) + Number(cForm.assignment2Weight || 0) + Number(cForm.test1Weight || 0) + Number(cForm.test2Weight || 0)}%
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded font-black text-[10px]">Editing</span>
                        </td>
                        <td className="p-3 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => handleSaveClassWeights(cls.id)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-black text-xs inline-flex items-center gap-1 shadow-xs"
                          >
                            <Check className="w-3.5 h-3.5" /> Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingClassId(null)}
                            className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded font-black text-xs inline-flex items-center gap-1"
                          >
                            Cancel
                          </button>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={cls.id} className="hover:bg-slate-50/80 transition-all">
                      <td className="p-3 font-black text-slate-900 uppercase">
                        {cls.name} {cls.arm || ''}
                      </td>
                      <td className="p-3">
                        <select
                          value={cls.sectionId || ''}
                          onChange={(e) => handleClassSectionChange(cls.id, e.target.value)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg font-black text-xs text-indigo-900"
                        >
                          <option value="">-- No Section --</option>
                          {sections.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3 text-slate-700 font-bold">{curA1}%</td>
                      <td className="p-3 text-slate-700 font-bold">{curA2}%</td>
                      <td className="p-3 text-slate-700 font-bold">{curT1}%</td>
                      <td className="p-3 text-slate-700 font-bold">{curT2}%</td>
                      <td className="p-3 text-indigo-900 font-black">{curExam}%</td>
                      <td className="p-3 font-black text-slate-900">{curCaTotal}% CA</td>
                      <td className="p-3">
                        {hasCustom ? (
                          <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-900 rounded-full font-black text-[10px] border border-indigo-200">
                            Class Override
                          </span>
                        ) : currentSec ? (
                          <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-900 rounded-full font-black text-[10px]">
                            {currentSec.name} Section
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-full font-bold text-[10px]">
                            Global Defaults
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingClassId(cls.id);
                            setClassFormData({
                              ...classFormData,
                              [cls.id]: {
                                assignment1Weight: curA1,
                                assignment2Weight: curA2,
                                test1Weight: curT1,
                                test2Weight: curT2,
                                examWeight: curExam
                              }
                            });
                          }}
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-bold text-xs"
                        >
                          Customize
                        </button>
                        {hasCustom && (
                          <button
                            type="button"
                            onClick={() => handleResetClassToDefault(cls.id)}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded font-bold text-xs inline-flex items-center gap-1"
                            title="Reset class weights to section/global defaults"
                          >
                            <RotateCcw className="w-3 h-3" /> Reset
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create Custom Section (e.g. SAT & SUN) */}
      {showSectionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 animate-scaleUp">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <h3 className="text-xl font-black text-slate-900 uppercase">Add Custom School Section</h3>
              <button
                type="button"
                onClick={() => setShowSectionModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSection} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-slate-600 mb-1">Section Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SAT & SUN, Pre-School, Islamiyyah"
                  value={sectionForm.name}
                  onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-2xl font-bold text-slate-900 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-600 mb-1">Section Code / Abbreviation</label>
                <input
                  type="text"
                  placeholder="e.g. SAT, NUR, ISL"
                  value={sectionForm.code}
                  onChange={(e) => setSectionForm({ ...sectionForm, code: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-2xl font-bold text-slate-900 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-600 mb-1">Report Card Display Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. AL-BAYYINAH BASIC SCHOOL"
                  value={sectionForm.reportName || ''}
                  onChange={(e) => setSectionForm({ ...sectionForm, reportName: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-2xl font-bold text-slate-900 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-xs font-black uppercase text-slate-700">Assessment Weights (Total Must Equal 100%)</label>
                <div className="grid grid-cols-5 gap-2 text-center text-xs font-bold">
                  <div>
                    <label className="block text-[9px] uppercase font-black text-slate-500 mb-1">Ass 1</label>
                    <input
                      type="number"
                      value={sectionForm.assignment1Weight}
                      onChange={(e) => setSectionForm({ ...sectionForm, assignment1Weight: Number(e.target.value) })}
                      className="w-full text-center py-2 bg-slate-50 border rounded-xl font-black text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase font-black text-slate-500 mb-1">Ass 2</label>
                    <input
                      type="number"
                      value={sectionForm.assignment2Weight}
                      onChange={(e) => setSectionForm({ ...sectionForm, assignment2Weight: Number(e.target.value) })}
                      className="w-full text-center py-2 bg-slate-50 border rounded-xl font-black text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase font-black text-slate-500 mb-1">Test 1</label>
                    <input
                      type="number"
                      value={sectionForm.test1Weight}
                      onChange={(e) => setSectionForm({ ...sectionForm, test1Weight: Number(e.target.value) })}
                      className="w-full text-center py-2 bg-slate-50 border rounded-xl font-black text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase font-black text-slate-500 mb-1">Test 2</label>
                    <input
                      type="number"
                      value={sectionForm.test2Weight}
                      onChange={(e) => setSectionForm({ ...sectionForm, test2Weight: Number(e.target.value) })}
                      className="w-full text-center py-2 bg-slate-50 border rounded-xl font-black text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase font-black text-slate-500 mb-1">Exam</label>
                    <input
                      type="number"
                      value={sectionForm.examWeight}
                      onChange={(e) => setSectionForm({ ...sectionForm, examWeight: Number(e.target.value) })}
                      className="w-full text-center py-2 bg-indigo-50 border border-indigo-300 rounded-xl font-black text-indigo-900"
                    />
                  </div>
                </div>
              </div>

              {/* Attendance Active Days & Rules */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black uppercase text-slate-700">Active Attendance Days *</label>
                  <div className="flex gap-1 text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setSectionForm({ ...sectionForm, attendanceDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'] })}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700"
                    >
                      Mon-Fri
                    </button>
                    <button
                      type="button"
                      onClick={() => setSectionForm({ ...sectionForm, attendanceDays: ['Saturday','Sunday'] })}
                      className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 rounded text-amber-900"
                    >
                      Sat-Sun
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {[
                    { day: 'Sunday', label: 'Sun' },
                    { day: 'Monday', label: 'Mon' },
                    { day: 'Tuesday', label: 'Tue' },
                    { day: 'Wednesday', label: 'Wed' },
                    { day: 'Thursday', label: 'Thu' },
                    { day: 'Friday', label: 'Fri' },
                    { day: 'Saturday', label: 'Sat' }
                  ].map(({ day, label }) => {
                    const activeDays = Array.isArray(sectionForm.attendanceDays) ? sectionForm.attendanceDays : [];
                    const isSelected = activeDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          const updatedDays = isSelected
                            ? activeDays.filter(d => d !== day)
                            : [...activeDays, day];
                          setSectionForm({ ...sectionForm, attendanceDays: updatedDays });
                        }}
                        className={`flex-1 py-1.5 text-xs font-black rounded-xl border transition-all ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                            : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Arrival Time</label>
                    <input
                      type="time"
                      value={sectionForm.expectedArrivalTime}
                      onChange={(e) => setSectionForm({ ...sectionForm, expectedArrivalTime: e.target.value })}
                      className="w-full text-center py-1.5 bg-slate-50 border rounded-xl font-bold text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Late Cutoff</label>
                    <input
                      type="time"
                      value={sectionForm.lateCutoffTime}
                      onChange={(e) => setSectionForm({ ...sectionForm, lateCutoffTime: e.target.value })}
                      className="w-full text-center py-1.5 bg-slate-50 border rounded-xl font-bold text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Grace (Mins)</label>
                    <input
                      type="number"
                      value={sectionForm.lateGraceMinutes}
                      onChange={(e) => setSectionForm({ ...sectionForm, lateGraceMinutes: Number(e.target.value) })}
                      className="w-full text-center py-1.5 bg-slate-50 border rounded-xl font-bold text-xs text-slate-900"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSectionModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-md"
                >
                  Create Section
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Sub-Admin Section Assignment */}
      {showAdminModal && selectedSubAdmin && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 animate-scaleUp">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase">Manage Section Access Scope</h3>
                <p className="text-xs text-slate-500 font-bold">{selectedSubAdmin.firstName} {selectedSubAdmin.lastName} (@{selectedSubAdmin.username})</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAdminModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-600 font-medium">
                Select the section(s) this user is authorized to manage. If no section is selected, the user has global access to all sections.
              </p>

              <div className="space-y-2 max-h-60 overflow-y-auto p-1">
                {sections.map(sec => {
                  const isChecked = selectedSectionIds.includes(sec.id);
                  return (
                    <label key={sec.id} className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                      isChecked ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-black' : 'bg-slate-50 border-slate-200 text-slate-700 font-bold'
                    }`}>
                      <span className="text-sm">{sec.name} ({sec.code || 'SEC'})</span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSectionIds([...selectedSectionIds, sec.id]);
                          } else {
                            setSelectedSectionIds(selectedSectionIds.filter(id => id !== sec.id));
                          }
                        }}
                        className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAdminModal(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs uppercase"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAdminSectionAssignments}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-md"
              >
                Save Section Access Scope
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SectionWeightingsConfig;
