import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { toast } from '../../utils/toast';
import { Check, RotateCcw, Save, ShieldCheck, Sparkles, Sliders, Layers } from 'lucide-react';

const SectionWeightingsConfig = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState(null);
  const [schoolDefaults, setSchoolDefaults] = useState({
    assignment1Weight: 5,
    assignment2Weight: 5,
    test1Weight: 10,
    test2Weight: 10,
    examWeight: 70
  });

  const [sectionPresets, setSectionPresets] = useState({
    primary: { assignment1Weight: 10, assignment2Weight: 10, test1Weight: 10, test2Weight: 10, examWeight: 60 },
    jss: { assignment1Weight: 5, assignment2Weight: 5, test1Weight: 10, test2Weight: 10, examWeight: 70 },
    sss: { assignment1Weight: 5, assignment2Weight: 5, test1Weight: 10, test2Weight: 10, examWeight: 70 }
  });

  const [editingClassId, setEditingClassId] = useState(null);
  const [classFormData, setClassFormData] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [settingsRes, classesRes] = await Promise.all([
        api.get('/api/settings'),
        api.get('/api/classes')
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
    } catch (e) {
      console.error('Failed to load section weightings data', e);
      toast.error('Failed to load section configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleApplySectionBatch = async (sectionKey, sectionName) => {
    const preset = sectionPresets[sectionKey];
    const total = Number(preset.assignment1Weight || 0) + Number(preset.assignment2Weight || 0) + Number(preset.test1Weight || 0) + Number(preset.test2Weight || 0) + Number(preset.examWeight || 0);

    if (total !== 100) {
      toast.error(`Total weight must equal 100%. Current total: ${total}%`);
      return;
    }

    setSavingSection(sectionKey);
    try {
      const res = await api.post('/api/classes/batch-assessment-weights', {
        sectionName,
        ...preset
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(data.message || `Applied ${sectionName.toUpperCase()} weightings successfully!`);
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to update section');
      }
    } catch (e) {
      toast.error('Unexpected error applying section weights');
    } finally {
      setSavingSection(null);
    }
  };

  const handleSaveClassWeights = async (classId) => {
    const cData = classFormData[classId];
    if (!cData) return;

    const total = Number(cData.assignment1Weight || 0) + Number(cData.assignment2Weight || 0) + Number(cData.test1Weight || 0) + Number(cData.test2Weight || 0) + Number(cData.examWeight || 0);

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
        toast.success('Class reset to global school defaults!');
        setEditingClassId(null);
        fetchData();
      } else {
        toast.error('Failed to reset class weights');
      }
    } catch (e) {
      toast.error('Error resetting class weights');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  const sectionsList = [
    { key: 'primary', name: 'Primary', label: 'Primary School (e.g. Primary 1 - 6 / Basic 1 - 6)', color: 'border-emerald-200 bg-emerald-50/40 text-emerald-900', badge: 'bg-emerald-600' },
    { key: 'jss', name: 'JSS', label: 'Junior Secondary School (e.g. JSS 1 - 3 / Basic 7 - 9)', color: 'border-indigo-200 bg-indigo-50/40 text-indigo-900', badge: 'bg-indigo-600' },
    { key: 'sss', name: 'SSS', label: 'Senior Secondary School (e.g. SSS 1 - 3 / SS 1 - 3)', color: 'border-purple-200 bg-purple-50/40 text-purple-900', badge: 'bg-purple-600' }
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Overview Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-8 rounded-[36px] shadow-2xl relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-black text-indigo-300 uppercase tracking-widest mb-4">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Section-Based Assessment Control
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tight">Section & Class Assessment Weightings</h2>
          <p className="text-slate-300 text-sm font-medium mt-2 leading-relaxed">
            Configure different CA and Examination weightings for <strong className="text-white">Primary (e.g. 40/60)</strong>, <strong className="text-white">Junior Secondary (30/70)</strong>, and <strong className="text-white">Senior Secondary (30/70)</strong> sections. You can apply weightings to all classes in a section with one click or set custom overrides for individual classes.
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
          <p className="text-xs text-slate-500 mt-0.5">Classes without custom overrides inherit these default settings.</p>
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

      {/* Section Presets Section */}
      <div className="space-y-4">
        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-600" />
          Section Quick Configurations
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {sectionsList.map((sec) => {
            const preset = sectionPresets[sec.key];
            const caTotal = Number(preset.assignment1Weight || 0) + Number(preset.assignment2Weight || 0) + Number(preset.test1Weight || 0) + Number(preset.test2Weight || 0);
            const examTotal = Number(preset.examWeight || 0);
            const grandTotal = caTotal + examTotal;

            return (
              <div key={sec.key} className={`p-6 rounded-3xl border-2 space-y-5 shadow-sm transition-all ${sec.color}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className={`px-2.5 py-1 text-[10px] font-black uppercase text-white rounded-lg ${sec.badge}`}>
                      {sec.name} Section
                    </span>
                    <h4 className="text-base font-black uppercase tracking-tight mt-2 text-slate-900">{sec.name} Assessment Preset</h4>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-slate-900">{caTotal}/{examTotal}</span>
                    <span className="block text-[10px] font-bold text-slate-500">CA / EXAM</span>
                  </div>
                </div>

                {/* Weight Inputs */}
                <div className="grid grid-cols-5 gap-2 text-center text-xs font-bold">
                  <div>
                    <label className="block text-[9px] uppercase font-black text-slate-500 mb-1">Ass 1</label>
                    <input
                      type="number"
                      value={preset.assignment1Weight}
                      onChange={(e) => setSectionPresets({
                        ...sectionPresets,
                        [sec.key]: { ...preset, assignment1Weight: Number(e.target.value) }
                      })}
                      className="w-full text-center py-1.5 bg-white border border-slate-300 rounded-xl font-black text-slate-900 focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase font-black text-slate-500 mb-1">Ass 2</label>
                    <input
                      type="number"
                      value={preset.assignment2Weight}
                      onChange={(e) => setSectionPresets({
                        ...sectionPresets,
                        [sec.key]: { ...preset, assignment2Weight: Number(e.target.value) }
                      })}
                      className="w-full text-center py-1.5 bg-white border border-slate-300 rounded-xl font-black text-slate-900 focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase font-black text-slate-500 mb-1">Test 1</label>
                    <input
                      type="number"
                      value={preset.test1Weight}
                      onChange={(e) => setSectionPresets({
                        ...sectionPresets,
                        [sec.key]: { ...preset, test1Weight: Number(e.target.value) }
                      })}
                      className="w-full text-center py-1.5 bg-white border border-slate-300 rounded-xl font-black text-slate-900 focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase font-black text-slate-500 mb-1">Test 2</label>
                    <input
                      type="number"
                      value={preset.test2Weight}
                      onChange={(e) => setSectionPresets({
                        ...sectionPresets,
                        [sec.key]: { ...preset, test2Weight: Number(e.target.value) }
                      })}
                      className="w-full text-center py-1.5 bg-white border border-slate-300 rounded-xl font-black text-slate-900 focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase font-black text-slate-500 mb-1">Exam</label>
                    <input
                      type="number"
                      value={preset.examWeight}
                      onChange={(e) => setSectionPresets({
                        ...sectionPresets,
                        [sec.key]: { ...preset, examWeight: Number(e.target.value) }
                      })}
                      className="w-full text-center py-1.5 bg-white border border-indigo-300 rounded-xl font-black text-indigo-950 focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200">
                  <span className="font-bold text-slate-600">Total: {grandTotal}%</span>
                  {grandTotal !== 100 && (
                    <span className="text-[10px] font-black text-rose-600 uppercase">Must equal 100%</span>
                  )}
                </div>

                <button
                  type="button"
                  disabled={savingSection === sec.key || grandTotal !== 100}
                  onClick={() => handleApplySectionBatch(sec.key, sec.name)}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-2xl font-black uppercase text-xs tracking-wider shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {savingSection === sec.key ? 'Applying...' : `Batch Apply to All ${sec.name} Classes`}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Class Level Detailed Overrides Table */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-slate-100">
          <div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-600" />
              Per-Class Assessment Overrides
            </h3>
            <p className="text-slate-500 text-xs font-bold mt-1">
              View and fine-tune assessment weights for individual classes across all school sections.
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

                  const curA1 = cls.assignment1Weight ?? schoolDefaults.assignment1Weight;
                  const curA2 = cls.assignment2Weight ?? schoolDefaults.assignment2Weight;
                  const curT1 = cls.test1Weight ?? schoolDefaults.test1Weight;
                  const curT2 = cls.test2Weight ?? schoolDefaults.test2Weight;
                  const curExam = cls.examWeight ?? schoolDefaults.examWeight;
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
                      <td className="p-3 text-slate-700 font-bold">{curA1}%</td>
                      <td className="p-3 text-slate-700 font-bold">{curA2}%</td>
                      <td className="p-3 text-slate-700 font-bold">{curT1}%</td>
                      <td className="p-3 text-slate-700 font-bold">{curT2}%</td>
                      <td className="p-3 text-indigo-900 font-black">{curExam}%</td>
                      <td className="p-3 font-black text-slate-900">{curCaTotal}% CA</td>
                      <td className="p-3">
                        {hasCustom ? (
                          <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-900 rounded-full font-black text-[10px] border border-indigo-200">
                            Custom Section Rule
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
                            title="Reset to global school defaults"
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
    </div>
  );
};

export default SectionWeightingsConfig;
