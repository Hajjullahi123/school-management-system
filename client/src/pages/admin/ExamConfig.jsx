import React, { useState, useEffect } from 'react';
import { toast } from '../../utils/toast';
import { api, API_BASE_URL } from '../../api';

const ExamConfig = () => {
  const [settings, setSettings] = useState({
    examMode: false,
    examModeType: 'none',
    assignment1Weight: 5,
    assignment2Weight: 5,
    test1Weight: 10,
    test2Weight: 10,
    examWeight: 70,
    gradingSystem: '[{"grade":"A","min":70,"max":100,"remark":"Excellent"},{"grade":"B","min":60,"max":69.9,"remark":"Very Good"},{"grade":"C","min":50,"max":59.9,"remark":"Good"},{"grade":"D","min":40,"max":49.9,"remark":"Pass"},{"grade":"E","min":30,"max":39.9,"remark":"Weak Pass"},{"grade":"F","min":0,"max":29.9,"remark":"Fail"}]',
    passThreshold: 40
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/api/settings');
      const data = await response.json();
      setSettings({
        examMode: data.examMode || false,
        examModeType: data.examModeType || 'none',
        assignment1Weight: data.assignment1Weight || 5,
        assignment2Weight: data.assignment2Weight || 5,
        test1Weight: data.test1Weight || 10,
        test2Weight: data.test2Weight || 10,
        examWeight: data.examWeight || 70,
        gradingSystem: data.gradingSystem || settings.gradingSystem,
        passThreshold: data.passThreshold || 40
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load exam settings');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();

    // Validate total weight equals 100
    const totalWeight = Number(settings.assignment1Weight || 0) +
      Number(settings.assignment2Weight || 0) +
      Number(settings.test1Weight || 0) +
      Number(settings.test2Weight || 0) +
      Number(settings.examWeight || 0);

    if (totalWeight !== 100) {
      toast.error(`Total assessment weight must equal 100%. Current total: ${totalWeight}%`);
      return;
    }

    setSaving(true);
    try {
      const response = await api.put('/api/settings', settings);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save settings');
      }

      toast.success('Exam configuration saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save exam settings: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const totalWeight = Number(settings.assignment1Weight || 0) +
    Number(settings.assignment2Weight || 0) +
    Number(settings.test1Weight || 0) +
    Number(settings.test2Weight || 0) +
    Number(settings.examWeight || 0);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Exam & Academic Configuration</h1>
        <p className="text-gray-600 mt-2">Configure exam mode, assessment weights, grading system, and promotion criteria</p>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-8">
        {/* Exam Mode Section */}
        <div className={`p-8 rounded-[40px] border-2 transition-all ${settings.examMode ? 'bg-indigo-50 border-indigo-200 shadow-xl shadow-indigo-100' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Examination Mode</h3>
              <p className="text-sm text-slate-500 font-bold mt-1">Activate this to monitor real-time result submission across all classes.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer scale-125">
              <input
                type="checkbox"
                name="examMode"
                checked={settings.examMode}
                onChange={handleInputChange}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {settings.examMode && (
            <div className="mt-8 pt-8 border-t border-indigo-100 animate-in fade-in slide-in-from-top-4 duration-500">
              <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4">Select Monitoring Target</label>
              <div className="flex flex-wrap gap-3">
                {[
                  { id: 'assignment1', label: '1st Assignment' },
                  { id: 'assignment2', label: '2nd Assignment' },
                  { id: 'test1', label: '1st Test' },
                  { id: 'test2', label: '2nd Test' },
                  { id: 'examination', label: 'Final Exam' },
                  { id: 'none', label: 'General Monitoring' }
                ].map(type => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setSettings(prev => ({ ...prev, examModeType: type.id }))}
                    className={`px-6 py-4 rounded-[20px] text-[11px] font-black uppercase tracking-widest transition-all ${settings.examModeType === type.id
                        ? 'bg-primary text-white shadow-2xl shadow-primary/40'
                        : 'bg-white text-slate-400 border border-slate-100 hover:border-primary/30 hover:text-primary'
                      }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Score Distribution & Monitoring Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm">
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-8">Score Distribution Weights</h3>
            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">1st Assgn (%)</label>
                  <input
                    type="number"
                    name="assignment1Weight"
                    value={settings.assignment1Weight}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 border-0 rounded-[20px] px-6 py-4 focus:ring-2 ring-primary outline-none font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">2nd Assgn (%)</label>
                  <input
                    type="number"
                    name="assignment2Weight"
                    value={settings.assignment2Weight}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 border-0 rounded-[20px] px-6 py-4 focus:ring-2 ring-primary outline-none font-bold"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">1st Test (%)</label>
                  <input
                    type="number"
                    name="test1Weight"
                    value={settings.test1Weight}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 border-0 rounded-[20px] px-6 py-4 focus:ring-2 ring-primary outline-none font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">2nd Test (%)</label>
                  <input
                    type="number"
                    name="test2Weight"
                    value={settings.test2Weight}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 border-0 rounded-[20px] px-6 py-4 focus:ring-2 ring-primary outline-none font-bold"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Final Examination (%)</label>
                <input
                  type="number"
                  name="examWeight"
                  value={settings.examWeight}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 border-0 rounded-[20px] px-6 py-4 focus:ring-2 ring-primary outline-none font-bold"
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-[40px] p-10 text-white flex flex-col justify-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-primary/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
            <h4 className="text-3xl font-black mb-6 italic tracking-tighter">Monitoring Logic</h4>
            <p className="text-slate-400 text-sm font-bold leading-relaxed mb-8">
              The tracker monitors if teachers have entered digits for the selected <span className="text-white">Monitoring Target</span>.
              For example, if <span className="text-primary font-black uppercase">1st Test</span> is active, the submission report will mark a teacher as "Pending" if any student in their class is missing a 1st Test score.
            </p>
            <div className="bg-white/5 rounded-3xl p-6 border border-white/10">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Weight Integrity</span>
                <span className={`text-xl font-black ${totalWeight === 100 ? 'text-emerald-400' : 'text-red-500 animate-pulse'}`}>
                  {totalWeight}%
                </span>
              </div>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${totalWeight === 100 ? 'bg-emerald-400' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(100, totalWeight)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Grading System */}
        <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Grading System Configuration</h3>
            <button
              type="button"
              onClick={() => {
                const current = JSON.parse(settings.gradingSystem || '[]');
                const updated = [...current, { grade: '', min: 0, max: 0, remark: '' }];
                setSettings({ ...settings, gradingSystem: JSON.stringify(updated) });
              }}
              className="text-xs font-bold text-primary bg-primary/10 px-4 py-2 rounded-full hover:bg-primary/20"
            >
              + Add Grade
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                  <th className="pb-4 pr-4">Grade</th>
                  <th className="pb-4 px-4">Min Score</th>
                  <th className="pb-4 px-4">Max Score</th>
                  <th className="pb-4 px-4">Remark</th>
                  <th className="pb-4 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {JSON.parse(settings.gradingSystem || '[]').map((item, idx) => (
                  <tr key={idx} className="group">
                    <td className="py-3 pr-4">
                      <input
                        type="text"
                        value={item.grade}
                        onChange={(e) => {
                          const current = JSON.parse(settings.gradingSystem);
                          current[idx].grade = e.target.value.toUpperCase();
                          setSettings({ ...settings, gradingSystem: JSON.stringify(current) });
                        }}
                        placeholder="A"
                        className="w-16 bg-slate-50 border-0 rounded-lg px-3 py-2 font-bold focus:ring-1 ring-primary"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        value={item.min}
                        onChange={(e) => {
                          const current = JSON.parse(settings.gradingSystem);
                          current[idx].min = parseFloat(e.target.value);
                          setSettings({ ...settings, gradingSystem: JSON.stringify(current) });
                        }}
                        className="w-20 bg-slate-50 border-0 rounded-lg px-3 py-2 focus:ring-1 ring-primary"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        value={item.max}
                        onChange={(e) => {
                          const current = JSON.parse(settings.gradingSystem);
                          current[idx].max = parseFloat(e.target.value);
                          setSettings({ ...settings, gradingSystem: JSON.stringify(current) });
                        }}
                        className="w-20 bg-slate-50 border-0 rounded-lg px-3 py-2 focus:ring-1 ring-primary"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={item.remark}
                        onChange={(e) => {
                          const current = JSON.parse(settings.gradingSystem);
                          current[idx].remark = e.target.value;
                          setSettings({ ...settings, gradingSystem: JSON.stringify(current) });
                        }}
                        placeholder="Excellent"
                        className="w-full bg-slate-50 border-0 rounded-lg px-3 py-2 focus:ring-1 ring-primary"
                      />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          const current = JSON.parse(settings.gradingSystem);
                          const updated = current.filter((_, i) => i !== idx);
                          setSettings({ ...settings, gradingSystem: JSON.stringify(updated) });
                        }}
                        className="text-red-400 hover:text-red-600 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Promotion Threshold */}
          <div className="mt-10 pt-10 border-t border-slate-50 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">Promotion Threshold</h4>
              <p className="text-xs text-slate-500 font-medium">Minimum average percentage required for a student to pass and be promoted to the next class.</p>
            </div>
            <div className="flex items-center gap-4 bg-slate-50 p-6 rounded-[30px]">
              <input
                type="range"
                min="0"
                max="100"
                name="passThreshold"
                value={settings.passThreshold}
                onChange={handleInputChange}
                className="flex-1 accent-primary"
              />
              <span className="text-2xl font-black text-primary min-w-[60px]">{settings.passThreshold}%</span>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-10">
          <button
            type="submit"
            disabled={saving || totalWeight !== 100}
            className="px-12 py-5 bg-primary text-white rounded-[24px] font-black uppercase text-[11px] tracking-[0.2em] shadow-2xl shadow-primary/40 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Synchronizing Intelligence...' : 'Save Academic Framework'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ExamConfig;
