import React, { useState, useEffect } from 'react';
import {
  FiBriefcase, FiUsers, FiUserCheck, FiShield, FiPlus,
  FiTrash2, FiActivity, FiSearch, FiKey, FiGlobe, FiAlertCircle,
  FiPrinter, FiUnlock, FiFacebook, FiInstagram, FiMessageCircle, FiLink,
  FiPower
} from 'react-icons/fi';
import { toast } from '../../utils/toast';
import { apiCall } from '../../api';

const SuperAdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [schools, setSchools] = useState([]);
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showModal, setShowModal] = useState(false);
  const [newSchool, setNewSchool] = useState({
    name: '',
    slug: '',
    email: '',
    phone: '',
    address: ''
  });
  const [globalSettings, setGlobalSettings] = useState({
    facebookUrl: '',
    instagramUrl: '',
    whatsappUrl: '',
    websiteUrl: '',
    contactPhone: '',
    contactEmail: ''
  });
  const [updatingSettings, setUpdatingSettings] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!isMounted) return;

      try {
        setLoading(true);
        const t = Date.now();
        const [statsRes, schoolsRes, auditsRes, settingsRes] = await Promise.all([
          apiCall(`/api/superadmin/stats?t=${t}`),
          apiCall(`/api/superadmin/schools?t=${t}`),
          apiCall(`/api/superadmin/audit?limit=50&t=${t}`),
          apiCall(`/api/superadmin/global-settings?t=${t}`)
        ]);

        if (!isMounted) return;

        console.log('Fetched SuperAdmin Data:', statsRes.data);
        setStats(statsRes.data);
        setSchools(schoolsRes.data);
        setAudits(auditsRes.data.logs);
        if (settingsRes.data) {
          setGlobalSettings(settingsRes.data);
        }
      } catch (error) {
        if (isMounted) {
          toast.error('Failed to fetch global data');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const t = Date.now();
      const [statsRes, schoolsRes, auditsRes, settingsRes] = await Promise.all([
        apiCall(`/api/superadmin/stats?t=${t}`),
        apiCall(`/api/superadmin/schools?t=${t}`),
        apiCall(`/api/superadmin/audit?limit=50&t=${t}`),
        apiCall(`/api/superadmin/global-settings?t=${t}`)
      ]);
      console.log('Fetched SuperAdmin Data:', statsRes.data);
      setStats(statsRes.data);
      setSchools(schoolsRes.data);
      setAudits(auditsRes.data.logs);
      if (settingsRes.data) {
        setGlobalSettings(settingsRes.data);
      }
    } catch (error) {
      toast.error('Failed to fetch global data');
    } finally {
      setLoading(false);
    }
  };

  const [creating, setCreating] = useState(false);
  const handleCreateSchool = async (e) => {
    e.preventDefault();
    console.log('Attempting to create school:', newSchool);
    try {
      setCreating(true);
      const res = await apiCall('/api/superadmin/schools', {
        method: 'POST',
        body: JSON.stringify(newSchool)
      });
      console.log('Create School Response:', res.data);
      const creds = res.data.credentials;
      alert(
        `SUCCESS: ${newSchool.name} initialized!\n\n` +
        `DEFAULT ADMIN CREDENTIALS:\n` +
        `--------------------------\n` +
        `School Slug: ${creds.schoolSlug}\n` +
        `Username: ${creds.username}\n` +
        `Password: ${creds.password}\n\n` +
        `Please provide these credentials to the school administrator.`
      );
      setShowModal(false);
      setNewSchool({ name: '', slug: '', email: '', phone: '', address: '' });

      // Force reload to sync
      window.location.reload();
    } catch (error) {
      console.error('Create School Crash:', error);
      toast.error(error.response?.data?.error || 'Failed to create school');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteSchool = async (id, name) => {
    if (!window.confirm(`Are you absolutely sure you want to delete ${name}? This will wipe ALL data for this school.`)) return;
    try {
      await apiCall(`/api/superadmin/schools/${id}`, { method: 'DELETE' });
      toast.success('School deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete school');
    }
  };

  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [selectedSchoolForLicense, setSelectedSchoolForLicense] = useState(null);
  const [licenseData, setLicenseData] = useState({
    packageType: 'basic',
    maxStudents: 500
  });

  const [generatedKey, setGeneratedKey] = useState(null);
  const [generatingLicense, setGeneratingLicense] = useState(false);
  const handleIssueLicenseSubmit = async (e) => {
    e.preventDefault();
    console.log('Generating license for:', selectedSchoolForLicense?.name);
    try {
      setGeneratingLicense(true);
      const payload = {
        schoolName: selectedSchoolForLicense.name,
        contactEmail: selectedSchoolForLicense.email || '',
        contactPhone: selectedSchoolForLicense.phone || '',
        packageType: licenseData.packageType,
        maxStudents: parseInt(licenseData.maxStudents)
      };

      const res = await apiCall('/api/license/generate', { method: 'POST', body: JSON.stringify(payload) });
      const key = res.data.license.licenseKey;
      console.log('License generated:', key);
      setGeneratedKey(key);
      toast.success('License generated successfully!');

      try {
        await navigator.clipboard.writeText(key);
        toast.info('License Key copied to clipboard');
      } catch (err) {
        console.warn('Clipboard access denied');
      }
      fetchData();
    } catch (error) {
      console.error('License Generation Error:', error);
      toast.error('Failed to generate license');
    } finally {
      setGeneratingLicense(false);
    }
  };

  const [showCredsModal, setShowCredsModal] = useState(false);
  const [resetCreds, setResetCreds] = useState(null);
  const [reseting, setReseting] = useState(false);

  const handleImpersonate = async (schoolId) => {
    try {
      const confirm = window.confirm("You are about to log in as the administrator of this school. Your current super-admin session will be replaced. Proceed?");
      if (!confirm) return;

      const res = await apiCall(`/api/superadmin/impersonate/${schoolId}`, { method: 'POST' });
      const { token, user } = res.data;

      // Wipe and rebuild session
      localStorage.clear();
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      const slug = user.school?.slug || user.schoolSlug;
      if (slug) {
        localStorage.setItem('schoolSlug', slug);
      }

      toast.success(`Redirecting to ${user.schoolName} Admin Portal...`);
      setTimeout(() => {
        window.location.href = '/';
      }, 500);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Impersonation failed');
    }
  };

  const handleResetAdminCreds = async (id, name) => {
    if (!window.confirm(`Are you sure you want to regenerate the admin password for ${name}? A new secure random password will be created.`)) return;
    try {
      setReseting(true);
      const res = await apiCall(`/api/superadmin/schools/${id}/reset-admin`, { method: 'POST' });
      setResetCreds({ ...res.data.credentials, schoolName: name });
      setShowCredsModal(true);
      toast.success('Admin credentials reset');
    } catch (error) {
      toast.error('Failed to reset credentials');
    } finally {
      setReseting(false);
    }
  };

  const handleToggleActivation = async (id, name, currentStatus) => {
    const action = currentStatus ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} ${name}?`)) return;

    try {
      const res = await apiCall(`/api/superadmin/schools/${id}/toggle-activation`, { method: 'POST' });
      toast.success(res.data.message);
      setSchools(prev => prev.map(s => s.id === id ? { ...s, isActivated: res.data.isActivated } : s));
    } catch (error) {
      toast.error('Failed to update school status');
    }
  };

  const handleUpdateGlobalSettings = async (e) => {
    e.preventDefault();
    try {
      setUpdatingSettings(true);
      await apiCall('/api/superadmin/global-settings', {
        method: 'POST',
        body: JSON.stringify(globalSettings)
      });
      toast.success('Platform settings updated successfully!');
    } catch (error) {
      toast.error('Failed to update settings');
    } finally {
      setUpdatingSettings(false);
    }
  };

  const handlePrintCreds = () => {
    window.print();
  };

  if (loading && !stats) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto bg-gray-50/50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Super Admin Dashboard</h1>
          <p className="mt-1 text-gray-500">Global system oversight and multi-tenant management</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition-all duration-200 transform hover:scale-[1.02]"
        >
          <FiPlus className="mr-2" /> Add New School
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatCard icon={<FiGlobe className="text-blue-600" />} label="Total Schools" value={stats?.schools} bgColor="bg-blue-100" />
        <StatCard icon={<FiUsers className="text-indigo-600" />} label="Total Users" value={stats?.users} bgColor="bg-indigo-100" />
        <StatCard icon={<FiUserCheck className="text-emerald-600" />} label="Active Students" value={stats?.students} bgColor="bg-emerald-100" />
        <StatCard icon={<FiShield className="text-amber-600" />} label="Audit Actions" value={stats?.audits} bgColor="bg-amber-100" />
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100 bg-gray-50/50">
          <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<FiActivity />} label="Overview" />
          <TabButton active={activeTab === 'schools'} onClick={() => setActiveTab('schools')} icon={<FiBriefcase />} label="School Management" />
          <TabButton active={activeTab === 'platform'} onClick={() => setActiveTab('platform')} icon={<FiGlobe />} label="Platform" />
          <TabButton active={activeTab === 'audits'} onClick={() => setActiveTab('audits')} icon={<FiShield />} label="Global Log" />
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Schools Section */}
                <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-800 flex items-center"><FiGlobe className="mr-2" /> Recent Schools</h3>
                    <button onClick={() => setActiveTab('schools')} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">View All</button>
                  </div>
                  <div className="space-y-3">
                    {schools.slice(0, 5).map(s => (
                      <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                        <div>
                          <p className="font-semibold text-gray-800">{s.name}</p>
                          <p className="text-xs text-gray-500">{s.slug}.school.com</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${s.isActivated ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {s.isActivated ? 'Activated' : 'Inactive'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* System Activity Section */}
                <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-800 flex items-center"><FiShield className="mr-2" /> Global Activity</h3>
                    <button onClick={() => setActiveTab('audits')} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">View All</button>
                  </div>
                  <div className="space-y-4">
                    {audits.map(log => (
                      <div key={log.id} className="flex gap-4 items-start border-l-2 border-indigo-100 pl-4 py-1">
                        <div className="min-w-[80px]">
                          <p className="text-[10px] font-bold text-gray-400">{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            {log.user?.firstName || 'System'} <span className="text-indigo-500 font-bold">{log.action}</span> {log.resource.toLowerCase().replace('_', ' ')}
                          </p>
                          <p className="text-[10px] text-gray-400">School: {log.school?.name || 'Global'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Growth Analysis Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Most Active */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                  <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center">
                    <FiActivity className="mr-2 text-indigo-500" /> High User Activity
                  </h4>
                  <div className="space-y-3">
                    {stats?.growthInsights?.mostActive?.map((s, idx) => (
                      <div key={s.id} className="flex items-center justify-between group">
                        <div className="flex items-center">
                          <span className="w-6 text-xs text-gray-300 font-bold">{idx + 1}</span>
                          <span className="text-sm font-medium text-gray-700 truncate max-w-[150px]">{s.name}</span>
                        </div>
                        <span className="text-xs font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                          {s._count.users} Users
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quota Alarms */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                  <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center">
                    <FiAlertCircle className="mr-2 text-amber-500" /> Approaching Quota
                  </h4>
                  <div className="space-y-3">
                    {stats?.growthInsights?.approachingQuota?.length > 0 ? (
                      stats.growthInsights.approachingQuota.map(s => (
                        <div key={s.id} className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-gray-700 truncate">{s.name}</span>
                            <span className="text-amber-600">{s.usage}%</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-amber-500 h-full transition-all" style={{ width: `${s.usage}%` }}></div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-400 italic py-4 text-center">All schools well within capacity</p>
                    )}
                  </div>
                </div>

                {/* Expiry Alerts */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                  <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center">
                    <FiKey className="mr-2 text-rose-500" /> Expiring Soon
                  </h4>
                  <div className="space-y-3">
                    {stats?.growthInsights?.expiringSoon?.length > 0 ? (
                      stats.growthInsights.expiringSoon.map(s => (
                        <div key={s.id} className="flex items-center justify-between p-2 bg-rose-50 rounded-lg border border-rose-100 group hover:bg-rose-600 transition-colors cursor-pointer">
                          <div className="max-w-[140px]">
                            <p className="text-sm font-bold text-rose-700 group-hover:text-white truncate">{s.name}</p>
                            <p className="text-[10px] text-rose-500 group-hover:text-rose-200">Expires: {new Date(s.expiresAt).toLocaleDateString()}</p>
                          </div>
                          <FiAlertCircle className="text-rose-400 group-hover:text-white" />
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-400 italic py-4 text-center">No licenses expiring in next 30 days</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'schools' && (
            <div className="overflow-x-auto animate-in slide-in-from-bottom-5 duration-500">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">School Name</th>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">License Status</th>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Usage Stats</th>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {schools.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold mr-3 shadow-sm">
                            {s.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-gray-800">{s.name}</p>
                            <p className="text-xs text-gray-400 font-medium">{s.email || 'No email'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        {s.isActivated ? (
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 w-fit">
                              Pro - {s.packageType}
                            </span>
                            <p className="text-[10px] text-gray-400 font-bold tracking-tight">KEY: {s.licenseKey?.slice(0, 8)}...</p>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                            Unlicensed
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-4">
                          <div className="text-center">
                            <p className="text-xs font-bold text-gray-800">{s._count.students}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase">Students</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs font-bold text-gray-800">{s._count.teachers}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase">Staff</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedSchoolForLicense(s);
                              setShowLicenseModal(true);
                              setGeneratedKey(null);
                            }}
                            title="Issue License"
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-indigo-100"
                          >
                            <FiKey className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleImpersonate(s.id)}
                            title="Troubleshooting Login"
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-emerald-100"
                          >
                            <FiUserCheck className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleResetAdminCreds(s.id)}
                            title="Reset Admin Password"
                            className={`p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors border border-amber-100 ${reseting ? 'opacity-50' : ''}`}
                            disabled={reseting}
                          >
                            <FiUnlock className={`w-4 h-4 ${reseting ? 'animate-pulse' : ''}`} />
                          </button>
                          <button
                            onClick={() => handleToggleActivation(s.id, s.name, s.isActivated)}
                            title={s.isActivated ? "Deactivate School" : "Activate School"}
                            className={`p-1.5 rounded-lg transition-colors border ${s.isActivated
                              ? 'text-rose-600 hover:bg-rose-50 border-rose-100'
                              : 'text-emerald-600 hover:bg-emerald-50 border-emerald-100'
                              }`}
                          >
                            <FiPower className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              console.log('Deleting school:', s.name);
                              handleDeleteSchool(s.id, s.name);
                            }}
                            className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete School"
                          >
                            <FiTrash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'platform' && (
            <div className="max-w-2xl mx-auto animate-in slide-in-from-left-5 duration-500">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-6 text-white text-center">
                  <FiGlobe className="w-12 h-12 mx-auto mb-3 opacity-80" />
                  <h3 className="text-xl font-bold">EduTechAI Global Infrastructure</h3>
                  <p className="text-indigo-100 text-sm">Manage the primary contact gateways for the platform</p>
                </div>

                <form onSubmit={handleUpdateGlobalSettings} className="p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                        <FiFacebook className="text-blue-600" /> Facebook Profile URL
                      </label>
                      <input
                        type="url"
                        value={globalSettings.facebookUrl || ''}
                        onChange={e => setGlobalSettings({ ...globalSettings, facebookUrl: e.target.value })}
                        placeholder="https://facebook.com/your-username"
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-indigo-600 transition-all text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                        <FiInstagram className="text-pink-600" /> Instagram Profile URL
                      </label>
                      <input
                        type="url"
                        value={globalSettings.instagramUrl || ''}
                        onChange={e => setGlobalSettings({ ...globalSettings, instagramUrl: e.target.value })}
                        placeholder="https://instagram.com/your-username"
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-indigo-600 transition-all text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                        <FiMessageCircle className="text-green-600" /> WhatsApp Link
                      </label>
                      <input
                        type="url"
                        value={globalSettings.whatsappUrl || ''}
                        onChange={e => setGlobalSettings({ ...globalSettings, whatsappUrl: e.target.value })}
                        placeholder="https://wa.me/2348033448456"
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-indigo-600 transition-all text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                        <FiLink className="text-indigo-600" /> Personal Website
                      </label>
                      <input
                        type="url"
                        value={globalSettings.websiteUrl || ''}
                        onChange={e => setGlobalSettings({ ...globalSettings, websiteUrl: e.target.value })}
                        placeholder="https://your-portfolio.com"
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-indigo-600 transition-all text-sm"
                      />
                    </div>
                  </div>
                  <div className="pt-6 border-t border-gray-100 flex justify-center">
                    <button
                      type="submit"
                      disabled={updatingSettings}
                      className={`px-12 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-xl shadow-gray-200 flex items-center gap-3 ${updatingSettings ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {updatingSettings ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <FiGlobe />
                      )}
                      Sync Global Platform Links
                    </button>
                  </div>
                </form>
              </div>

              <div className="mt-8 bg-amber-50 rounded-2xl p-6 border border-amber-100 flex gap-4">
                <FiAlertCircle className="text-amber-600 w-6 h-6 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-bold text-amber-800 mb-1">Impact Analysis</p>
                  <p className="text-amber-700 opacity-80 leading-relaxed">
                    Updating these links affects the **Primary Login Gateway**. Changes are reflected immediately for all users system-wide. Ensure links are full absolute URLs starting with **https://**.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'audits' && (
            <div className="animate-in slide-in-from-right-5 duration-500">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">System-Wide Activity Log</h3>
                  <p className="text-xs text-gray-500">Real-time chronicle of all administrative actions across the platform</p>
                </div>
                <button
                  onClick={fetchData}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all text-gray-600"
                  title="Refresh Logs"
                >
                  <FiActivity className={loading ? 'animate-pulse' : ''} />
                </button>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-100 uppercase text-[10px] font-bold text-gray-500 tracking-widest">
                      <th className="px-6 py-4">Timestamp</th>
                      <th className="px-6 py-4">Actor</th>
                      <th className="px-6 py-4">School</th>
                      <th className="px-6 py-4">Action Type</th>
                      <th className="px-6 py-4">Resource</th>
                      <th className="px-6 py-4 text-right">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {audits && audits.length > 0 ? (
                      audits.map((log) => (
                        <tr key={log.id} className="hover:bg-indigo-50/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-gray-700">{new Date(log.createdAt).toLocaleDateString()}</span>
                              <span className="text-[10px] text-gray-400 font-medium lowercase">{new Date(log.createdAt).toLocaleTimeString()}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-black text-gray-600 border border-gray-200">
                                {log.user?.firstName?.[0] || 'S'}
                              </div>
                              <div>
                                <p className="font-bold text-gray-800">{log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System'}</p>
                                <p className="text-[10px] text-gray-400 font-bold uppercase">{log.user?.role || 'Service'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100">
                              {log.school?.name || 'Central Platform'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-tighter ${log.action === 'CREATE' ? 'bg-emerald-100 text-emerald-700' :
                              log.action === 'DELETE' ? 'bg-rose-100 text-rose-700' :
                                'bg-amber-100 text-amber-700'
                              }`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <code className="text-[11px] font-bold text-gray-500">{log.resource}</code>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-[10px] font-mono text-gray-400">{log.ipAddress || '—'}</span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="px-6 py-20 text-center">
                          <FiShield className="w-12 h-12 mx-auto text-gray-200 mb-3" />
                          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No activity records found</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Issuing License Modal */}
      {showLicenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-amber-600 p-6 text-white">
              <h3 className="text-xl font-bold flex items-center"><FiKey className="mr-2" /> Issue School License</h3>
              <p className="text-amber-100 text-xs">Generating key for: {selectedSchoolForLicense?.name}</p>
            </div>
            {generatedKey ? (
              <div className="p-6 space-y-4">
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-2">LICENSE KEY GENERATED</p>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={generatedKey}
                      className="flex-1 bg-white border border-emerald-200 rounded-lg px-3 py-2 font-mono text-sm font-bold text-gray-800"
                      onClick={(e) => e.target.select()}
                    />
                  </div>
                  <p className="text-[10px] text-emerald-500 mt-2 font-medium flex items-center gap-1">
                    <FiAlertCircle size={10} /> Double-click the box above to select the full key for manual copy.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedKey);
                      toast.success('Key copied!');
                    }}
                    className="flex-1 py-2 px-4 rounded-lg bg-emerald-600 text-white font-bold text-sm"
                  >
                    Copy to Clipboard
                  </button>
                  <button
                    onClick={() => setShowLicenseModal(false)}
                    className="flex-1 py-2 px-4 rounded-lg bg-gray-100 text-gray-600 font-bold text-sm"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleIssueLicenseSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Package Type</label>
                  <select
                    value={licenseData.packageType}
                    onChange={e => setLicenseData({ ...licenseData, packageType: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="basic">Basic (Small Schools)</option>
                    <option value="standard">Standard (Growth)</option>
                    <option value="premium">Premium (Unlimited)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Max Student Quota</label>
                  <input
                    type="number"
                    value={licenseData.maxStudents}
                    onChange={e => setLicenseData({ ...licenseData, maxStudents: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-indigo-600"
                  />
                  <p className="text-[10px] text-gray-400 mt-1 italic">*Use -1 for unlimited students</p>
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" disabled={generatingLicense} onClick={() => setShowLicenseModal(false)} className="flex-1 py-2 px-4 rounded-lg bg-gray-100 text-gray-600 font-bold text-sm">Cancel</button>
                  <button
                    type="submit"
                    disabled={generatingLicense}
                    className={`flex-1 py-2 px-4 rounded-lg bg-amber-600 text-white font-bold text-sm shadow-lg shadow-amber-200 ${generatingLicense ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {generatingLicense ? 'Generating...' : 'Generate Key'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Create School Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-indigo-600 p-6 text-white">
              <h3 className="text-2xl font-bold flex items-center"><FiGlobe className="mr-3" /> Register New School</h3>
              <p className="text-indigo-100 text-sm opacity-80">Initialize a new multi-tenant environment</p>
            </div>
            <form onSubmit={handleCreateSchool} className="p-8 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Official School Name</label>
                  <input required value={newSchool.name} onChange={e => setNewSchool({ ...newSchool, name: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-indigo-600 transition-all font-medium" placeholder="E.g. Royal Academy" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Unique Slug</label>
                  <div className="flex">
                    <input required value={newSchool.slug} onChange={e => setNewSchool({ ...newSchool, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })} className="w-full px-4 py-3 rounded-l-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-indigo-600 transition-all font-mono" placeholder="royal-academy" />
                    <span className="px-3 py-3 bg-gray-200 rounded-r-xl border border-l-0 border-gray-200 text-xs font-bold text-gray-500 flex items-center">.app</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Contact Email</label>
                  <input type="email" value={newSchool.email} onChange={e => setNewSchool({ ...newSchool, email: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-indigo-600 transition-all" placeholder="admin@royal.com" />
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 px-6 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-colors">Cancel</button>
                <button
                  type="submit"
                  disabled={creating}
                  className={`flex-1 py-3 px-6 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all ${creating ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {creating ? 'Launching...' : 'Launch School'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Credentials Viewing/Printing Modal */}
      {showCredsModal && resetCreds && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 print:p-0 print:bg-white">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden print:shadow-none print:w-full print:max-w-none">
            <div className="bg-amber-600 p-6 text-white print:bg-white print:text-black print:border-b-2 print:border-gray-200">
              <h3 className="text-xl font-bold flex items-center"><FiUnlock className="mr-2 print:hidden" /> Admin Credentials</h3>
              <p className="text-amber-100 text-xs print:text-black">Official Login Details for {resetCreds.schoolName}</p>
            </div>

            <div className="p-8 space-y-6 print:p-10">
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 print:bg-white print:border-gray-200">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">School URL Slug</p>
                  <p className="text-lg font-mono font-bold text-gray-800">{resetCreds.schoolSlug}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 print:bg-white print:border-gray-200">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Administrator Username</p>
                  <p className="text-lg font-mono font-bold text-gray-800">{resetCreds.username}</p>
                </div>
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 print:bg-white print:border-gray-200">
                  <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1 print:text-gray-400">Default Password</p>
                  <p className="text-2xl font-mono font-bold text-amber-700 print:text-black">{resetCreds.password}</p>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg flex items-start gap-3 print:hidden">
                <FiAlertCircle className="text-blue-600 mt-1 flex-shrink-0" />
                <p className="text-[11px] text-blue-700 leading-relaxed font-medium">
                  Please hand over these credentials to the school administrator.
                  Advise them to change their password immediately upon first login.
                </p>
              </div>

              <div className="flex gap-3 print:hidden">
                <button
                  onClick={() => setShowCredsModal(false)}
                  className="flex-1 py-3 px-6 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={handlePrintCreds}
                  className="flex-1 py-3 px-6 rounded-xl bg-gray-900 text-white font-bold hover:bg-black shadow-lg flex items-center justify-center gap-2"
                >
                  <FiPrinter /> Print Slip
                </button>
              </div>

              <div className="hidden print:block text-center pt-20 border-t border-dashed border-gray-300">
                <p className="text-sm font-bold text-gray-800">System Generated Credential Slip</p>
                <p className="text-[10px] text-gray-400 mt-1">Generated by Super Admin on {new Date().toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          body * { visibility: hidden; }
          .print\\:block, .print\\:block * { visibility: visible; }
          .fixed.inset-0.z-\\[60\\] { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%; 
            height: auto;
            visibility: visible !important;
            background: white !important;
          }
          .bg-white { visibility: visible !important; }
          .p-8, .p-10 { visibility: visible !important; }
          .space-y-6, .space-y-4 { visibility: visible !important; }
          div, p { visibility: visible !important; }
        }
      `}} />
    </div>
  );
};

const StatCard = ({ icon, label, value, bgColor }) => (
  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-5 transition-all duration-300 hover:shadow-md hover:-translate-y-1">
    <div className={`p-4 rounded-2xl ${bgColor}`}>
      {React.cloneElement(icon, { size: 28 })}
    </div>
    <div>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
      <h4 className="text-3xl font-extrabold text-gray-900">{value?.toLocaleString() || '0'}</h4>
    </div>
  </div>
);

const TabButton = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex items-center px-8 py-4 text-sm font-bold transition-all border-b-2 ${active ? 'text-indigo-600 border-indigo-600 bg-white' : 'text-gray-400 border-transparent hover:text-gray-500'
      }`}
  >
    <span className="mr-2">{icon}</span>
    {label}
  </button>
);

export default SuperAdminDashboard;
