import React, { useState, useEffect } from 'react';
import { 
  FolderPlus, Plus, Trash2, Edit2, Check, X, Eye, EyeOff, 
  RotateCcw, ChevronDown, ChevronRight, BookOpen, Sparkles, AlertTriangle
} from 'lucide-react';
import { api } from '../../api';
import { toast } from '../../utils/toast';

const EarlyYearsDomainConfig = () => {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedDomains, setExpandedDomains] = useState({});
  
  // New Domain Form State
  const [showAddDomainModal, setShowAddDomainModal] = useState(false);
  const [newDomainData, setNewDomainData] = useState({ name: '', code: '', sortOrder: '' });
  const [submittingDomain, setSubmittingDomain] = useState(false);

  // Edit Domain State
  const [editingDomainId, setEditingDomainId] = useState(null);
  const [editDomainData, setEditDomainData] = useState({ name: '', code: '', sortOrder: '' });

  // Add Sub-domain State
  const [activeDomainForSkill, setActiveDomainForSkill] = useState(null);
  const [newSkillData, setNewSkillData] = useState({ name: '', description: '', sortOrder: '' });
  const [submittingSkill, setSubmittingSkill] = useState(false);

  // Edit Sub-domain State
  const [editingSkillId, setEditingSkillId] = useState(null);
  const [editSkillData, setEditSkillData] = useState({ name: '', description: '', sortOrder: '' });

  // Reset loading
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    fetchDomains();
  }, []);

  const fetchDomains = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/early-years/domains');
      if (res.ok) {
        const data = await res.json();
        const domainList = Array.isArray(data) ? data : [];
        setDomains(domainList);
        
        // Auto expand all domains initially
        const expandedMap = {};
        domainList.forEach(d => { expandedMap[d.id] = true; });
        setExpandedDomains(expandedMap);
      } else {
        toast.error('Failed to load early years domains');
      }
    } catch (error) {
      console.error('Error fetching early years domains:', error);
      toast.error('Unexpected error loading domains');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (domainId) => {
    setExpandedDomains(prev => ({
      ...prev,
      [domainId]: !prev[domainId]
    }));
  };

  // ================= DOMAIN HANDLERS =================
  const handleAddDomain = async (e) => {
    e.preventDefault();
    if (!newDomainData.name.trim()) {
      return toast.error('Domain name is required');
    }

    setSubmittingDomain(true);
    try {
      const res = await api.post('/api/early-years/domains', {
        name: newDomainData.name.trim(),
        code: newDomainData.code.trim() || null,
        sortOrder: newDomainData.sortOrder ? parseInt(newDomainData.sortOrder) : domains.length + 1
      });

      if (res.ok) {
        toast.success('Domain created successfully!');
        setNewDomainData({ name: '', code: '', sortOrder: '' });
        setShowAddDomainModal(false);
        fetchDomains();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to create domain');
      }
    } catch (error) {
      toast.error('Unexpected error creating domain');
    } finally {
      setSubmittingDomain(false);
    }
  };

  const handleStartEditDomain = (domain) => {
    setEditingDomainId(domain.id);
    setEditDomainData({
      name: domain.name,
      code: domain.code || '',
      sortOrder: domain.sortOrder || 0
    });
  };

  const handleSaveEditDomain = async (domainId) => {
    if (!editDomainData.name.trim()) {
      return toast.error('Domain name cannot be empty');
    }

    try {
      const res = await api.put(`/api/early-years/domains/${domainId}`, {
        name: editDomainData.name.trim(),
        code: editDomainData.code.trim() || null,
        sortOrder: parseInt(editDomainData.sortOrder) || 0
      });

      if (res.ok) {
        toast.success('Domain updated!');
        setEditingDomainId(null);
        fetchDomains();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to update domain');
      }
    } catch (error) {
      toast.error('Unexpected error updating domain');
    }
  };

  const handleToggleDomainActive = async (domain) => {
    try {
      const res = await api.put(`/api/early-years/domains/${domain.id}`, {
        isActive: !domain.isActive
      });
      if (res.ok) {
        toast.success(`Domain ${!domain.isActive ? 'activated' : 'deactivated'}`);
        fetchDomains();
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleDeleteDomain = async (domain) => {
    const confirmMsg = `Are you sure you want to delete "${domain.name}" and ALL its sub-domains?\n\nThis action cannot be undone.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await api.delete(`/api/early-years/domains/${domain.id}`);
      if (res.ok) {
        toast.success('Domain deleted');
        fetchDomains();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to delete domain');
      }
    } catch (error) {
      toast.error('Unexpected error deleting domain');
    }
  };

  // ================= SUB-DOMAIN / SKILL HANDLERS =================
  const handleAddSkill = async (e, domainId) => {
    e.preventDefault();
    if (!newSkillData.name.trim()) {
      return toast.error('Sub-domain skill name is required');
    }

    setSubmittingSkill(true);
    try {
      const targetDomain = domains.find(d => d.id === domainId);
      const nextSort = (targetDomain?.skills?.length || 0) + 1;

      const res = await api.post(`/api/early-years/domains/${domainId}/skills`, {
        name: newSkillData.name.trim(),
        description: newSkillData.description.trim() || null,
        sortOrder: newSkillData.sortOrder ? parseInt(newSkillData.sortOrder) : nextSort
      });

      if (res.ok) {
        toast.success('Sub-domain skill added!');
        setNewSkillData({ name: '', description: '', sortOrder: '' });
        setActiveDomainForSkill(null);
        fetchDomains();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to add skill');
      }
    } catch (error) {
      toast.error('Unexpected error adding skill');
    } finally {
      setSubmittingSkill(false);
    }
  };

  const handleStartEditSkill = (skill) => {
    setEditingSkillId(skill.id);
    setEditSkillData({
      name: skill.name,
      description: skill.description || '',
      sortOrder: skill.sortOrder || 0
    });
  };

  const handleSaveEditSkill = async (skillId) => {
    if (!editSkillData.name.trim()) {
      return toast.error('Skill name cannot be empty');
    }

    try {
      const res = await api.put(`/api/early-years/skills/${skillId}`, {
        name: editSkillData.name.trim(),
        description: editSkillData.description.trim() || null,
        sortOrder: parseInt(editSkillData.sortOrder) || 0
      });

      if (res.ok) {
        toast.success('Sub-domain skill updated!');
        setEditingSkillId(null);
        fetchDomains();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to update skill');
      }
    } catch (error) {
      toast.error('Unexpected error updating skill');
    }
  };

  const handleToggleSkillActive = async (skill) => {
    try {
      const res = await api.put(`/api/early-years/skills/${skill.id}`, {
        isActive: !skill.isActive
      });
      if (res.ok) {
        toast.success(`Skill ${!skill.isActive ? 'activated' : 'deactivated'}`);
        fetchDomains();
      }
    } catch (error) {
      toast.error('Failed to update skill status');
    }
  };

  const handleDeleteSkill = async (skill) => {
    if (!window.confirm(`Delete sub-domain skill "${skill.name}"?`)) return;

    try {
      const res = await api.delete(`/api/early-years/skills/${skill.id}`);
      if (res.ok) {
        toast.success('Sub-domain skill deleted');
        fetchDomains();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to delete skill');
      }
    } catch (error) {
      toast.error('Unexpected error deleting skill');
    }
  };

  // ================= RESET DEFAULTS =================
  const handleResetDefaults = async () => {
    const msg = 'WARNING: Resetting will restore standard Early Years domains & sub-domains from the template. Any custom domains created will be replaced.\n\nContinue?';
    if (!window.confirm(msg)) return;

    setResetting(true);
    try {
      const res = await api.post('/api/early-years/domains/reset');
      if (res.ok) {
        toast.success('Domains & sub-domains reset to standard defaults!');
        fetchDomains();
      } else {
        toast.error('Failed to reset defaults');
      }
    } catch (error) {
      toast.error('Unexpected error resetting defaults');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Early Years Domains & Learning Outcomes
            </h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Configure parent domains (e.g., 01 General Info) and child sub-domain skills evaluated on Progress Reports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleResetDefaults}
            disabled={resetting}
            className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded-lg border border-amber-200 dark:border-amber-700 transition"
            title="Reset to template defaults"
          >
            <RotateCcw className={`w-4 h-4 ${resetting ? 'animate-spin' : ''}`} />
            Reset Defaults
          </button>

          <button
            onClick={() => setShowAddDomainModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition"
          >
            <FolderPlus className="w-4 h-4" />
            Add Parent Domain
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="p-12 text-center text-gray-500 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent mb-3"></div>
          <p>Loading Early Years domains...</p>
        </div>
      ) : domains.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
          <Sparkles className="w-12 h-12 text-indigo-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No Domains Configured</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto mt-1 mb-4">
            Click below to initialize standard default domains & sub-domains from the Early Years Progress Report.
          </p>
          <button
            onClick={handleResetDefaults}
            className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow"
          >
            Seed Template Defaults
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {domains.map((domain, domainIdx) => {
            const isExpanded = expandedDomains[domain.id];
            const isEditing = editingDomainId === domain.id;

            return (
              <div
                key={domain.id}
                className={`bg-white dark:bg-gray-800 rounded-xl border transition shadow-sm overflow-hidden ${
                  !domain.isActive
                    ? 'border-gray-200 dark:border-gray-700 opacity-60'
                    : 'border-indigo-100 dark:border-gray-700'
                }`}
              >
                {/* Domain Header Row */}
                <div className="p-4 bg-gray-50/70 dark:bg-gray-800/80 flex items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button
                      onClick={() => toggleExpand(domain.id)}
                      className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-gray-700 transition"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5" />
                      ) : (
                        <ChevronRight className="w-5 h-5" />
                      )}
                    </button>

                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1 max-w-xl">
                        <input
                          type="text"
                          value={editDomainData.code}
                          onChange={(e) => setEditDomainData({ ...editDomainData, code: e.target.value })}
                          placeholder="Code (e.g. 01)"
                          className="w-20 px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                        <input
                          type="text"
                          value={editDomainData.name}
                          onChange={(e) => setEditDomainData({ ...editDomainData, name: e.target.value })}
                          placeholder="Domain Name"
                          className="flex-1 px-3 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white font-semibold"
                        />
                        <input
                          type="number"
                          value={editDomainData.sortOrder}
                          onChange={(e) => setEditDomainData({ ...editDomainData, sortOrder: e.target.value })}
                          placeholder="Sort"
                          className="w-16 px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                        <button
                          onClick={() => handleSaveEditDomain(domain.id)}
                          className="p-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition"
                          title="Save Domain"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingDomainId(null)}
                          className="p-1.5 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 dark:bg-gray-600 dark:text-gray-200 transition"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5">
                        <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300">
                          {domain.code || `Domain ${domainIdx + 1}`}
                        </span>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">
                          {domain.name}
                        </h3>
                        <span className="text-xs text-gray-400 font-medium">
                          ({domain.skills?.length || 0} skills)
                        </span>
                        {!domain.isActive && (
                          <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                            Inactive
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right Header Actions */}
                  {!isEditing && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setActiveDomainForSkill(activeDomainForSkill === domain.id ? null : domain.id)}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 rounded transition"
                        title="Add sub-domain skill"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Skill
                      </button>

                      <button
                        onClick={() => handleStartEditDomain(domain)}
                        className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-gray-200/50 dark:hover:bg-gray-700 rounded transition"
                        title="Edit Domain Name"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleToggleDomainActive(domain)}
                        className={`p-1.5 rounded transition ${
                          domain.isActive
                            ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
                            : 'text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                        title={domain.isActive ? 'Deactivate Domain' : 'Activate Domain'}
                      >
                        {domain.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>

                      <button
                        onClick={() => handleDeleteDomain(domain)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition"
                        title="Delete Domain"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Domain Body - Sub-domains List */}
                {isExpanded && (
                  <div className="p-4 space-y-3">
                    {/* Add Skill Inline Form */}
                    {activeDomainForSkill === domain.id && (
                      <form
                        onSubmit={(e) => handleAddSkill(e, domain.id)}
                        className="p-3 bg-indigo-50/60 dark:bg-indigo-950/20 rounded-lg border border-indigo-200 dark:border-indigo-800 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300">
                            New Sub-domain Skill for {domain.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => setActiveDomainForSkill(null)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                          <div className="sm:col-span-6">
                            <input
                              type="text"
                              required
                              value={newSkillData.name}
                              onChange={(e) => setNewSkillData({ ...newSkillData, name: e.target.value })}
                              placeholder="Sub-domain Skill Name (e.g. Knows full name)"
                              className="w-full px-3 py-1.5 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                          </div>
                          <div className="sm:col-span-4">
                            <input
                              type="text"
                              value={newSkillData.description}
                              onChange={(e) => setNewSkillData({ ...newSkillData, description: e.target.value })}
                              placeholder="Description / Guidance (Optional)"
                              className="w-full px-3 py-1.5 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <button
                              type="submit"
                              disabled={submittingSkill}
                              className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded shadow-sm transition"
                            >
                              {submittingSkill ? 'Adding...' : 'Save Skill'}
                            </button>
                          </div>
                        </div>
                      </form>
                    )}

                    {/* Sub-domains Table / List */}
                    {!domain.skills || domain.skills.length === 0 ? (
                      <p className="text-xs text-gray-400 italic py-2 text-center">
                        No sub-domain skills added yet under this category. Click "+ Add Skill" above to add one.
                      </p>
                    ) : (
                      <div className="divide-y divide-gray-100 dark:divide-gray-700/50 border border-gray-100 dark:border-gray-700 rounded-lg overflow-hidden">
                        {domain.skills.map((skill, sIdx) => {
                          const isSkillEditing = editingSkillId === skill.id;

                          return (
                            <div
                              key={skill.id}
                              className={`p-2.5 flex items-center justify-between gap-3 text-sm transition ${
                                !skill.isActive
                                  ? 'bg-gray-50/50 dark:bg-gray-900/30 opacity-50'
                                  : 'hover:bg-gray-50 dark:hover:bg-gray-750'
                              }`}
                            >
                              {isSkillEditing ? (
                                <div className="flex items-center gap-2 flex-1">
                                  <input
                                    type="text"
                                    value={editSkillData.name}
                                    onChange={(e) => setEditSkillData({ ...editSkillData, name: e.target.value })}
                                    className="flex-1 px-2 py-1 border text-sm rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                  />
                                  <input
                                    type="text"
                                    value={editSkillData.description}
                                    onChange={(e) => setEditSkillData({ ...editSkillData, description: e.target.value })}
                                    placeholder="Description"
                                    className="w-1/3 px-2 py-1 border text-sm rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                  />
                                  <button
                                    onClick={() => handleSaveEditSkill(skill.id)}
                                    className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setEditingSkillId(null)}
                                    className="p-1 bg-gray-300 text-gray-700 dark:bg-gray-600 dark:text-gray-200 rounded"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <span className="text-xs text-gray-400 font-mono w-5 text-right">
                                    {sIdx + 1}.
                                  </span>
                                  <span className="font-medium text-gray-800 dark:text-gray-200 truncate">
                                    {skill.name}
                                  </span>
                                  {skill.description && (
                                    <span className="text-xs text-gray-400 truncate max-w-xs">
                                      — {skill.description}
                                    </span>
                                  )}
                                  {!skill.isActive && (
                                    <span className="px-1.5 py-0.5 text-[9px] uppercase font-bold tracking-wider rounded bg-red-50 text-red-600">
                                      Hidden
                                    </span>
                                  )}
                                </div>
                              )}

                              {!isSkillEditing && (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => handleStartEditSkill(skill)}
                                    className="p-1 text-gray-400 hover:text-indigo-600 rounded transition"
                                    title="Edit Sub-domain Skill"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleToggleSkillActive(skill)}
                                    className={`p-1 rounded transition ${
                                      skill.isActive ? 'text-emerald-600' : 'text-gray-300'
                                    }`}
                                    title={skill.isActive ? 'Hide Skill' : 'Show Skill'}
                                  >
                                    {skill.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSkill(skill)}
                                    className="p-1 text-gray-400 hover:text-red-600 rounded transition"
                                    title="Delete Sub-domain Skill"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Domain Modal */}
      {showAddDomainModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-xl border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-indigo-600" />
                Add New Parent Domain
              </h3>
              <button
                onClick={() => setShowAddDomainModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddDomain} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Domain Code / Prefix (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 06 or LITERACY"
                  value={newDomainData.code}
                  onChange={(e) => setNewDomainData({ ...newDomainData, code: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Domain Category Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 06 ISLAMIC & MORAL DEVELOPMENT"
                  value={newDomainData.name}
                  onChange={(e) => setNewDomainData({ ...newDomainData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Display Position / Sort Order
                </label>
                <input
                  type="number"
                  placeholder="e.g. 6"
                  value={newDomainData.sortOrder}
                  onChange={(e) => setNewDomainData({ ...newDomainData, sortOrder: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowAddDomainModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDomain}
                  className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                >
                  {submittingDomain ? 'Creating...' : 'Create Domain'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EarlyYearsDomainConfig;
