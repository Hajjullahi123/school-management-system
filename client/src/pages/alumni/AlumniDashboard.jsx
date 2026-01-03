import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { toast } from '../../utils/toast';
import useSchoolSettings from '../../hooks/useSchoolSettings';

const AlumniDashboard = () => {
  const { settings: schoolSettings } = useSchoolSettings();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // ... rest of state logic ...
  const [formData, setFormData] = useState({
    currentJob: '',
    currentCompany: '',
    university: '',
    courseOfStudy: '',
    bio: '',
    isPublic: true,
    linkedinUrl: '',
    twitterUrl: '',
    portfolioUrl: '',
    skills: '',
    achievements: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      // We'll get the studentId from the user context or a special "my-profile" endpoint
      // For now, let's assume the backend handles "profile" for the logged in user
      const response = await api.get('/api/alumni/profile/current'); // Need to adjust backend for this
      const data = await response.json();
      setProfile(data);
      setFormData({
        currentJob: data.currentJob || '',
        currentCompany: data.currentCompany || '',
        university: data.university || '',
        courseOfStudy: data.courseOfStudy || '',
        bio: data.bio || '',
        isPublic: data.isPublic ?? true,
        linkedinUrl: data.linkedinUrl || '',
        twitterUrl: data.twitterUrl || '',
        portfolioUrl: data.portfolioUrl || '',
        skills: data.skills || '',
        achievements: data.achievements || ''
      });
    } catch (error) {
      console.error('Fetch profile error:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await api.put('/api/alumni/profile', formData);
      if (response.ok) {
        toast.success('Profile updated successfully!');
      } else {
        const err = await response.json();
        throw new Error(err.error || 'Update failed');
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-center">Loading dashboard...</div>;

  const schoolName = schoolSettings?.schoolName || 'Amana Academy';
  const schoolInitials = schoolName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 mb-8">
        <div className="p-8 bg-gradient-to-r from-primary to-secondary text-white relative">
          {/* Back to Home Integrated */}
          <div className="mb-6">
            <a
              href="/landing"
              className="inline-flex items-center gap-2 text-white/80 hover:text-white font-bold transition-all group"
            >
              <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Home
            </a>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="w-24 h-24 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-4xl font-bold border border-white/30">
                {profile?.student?.user?.firstName[0]}{profile?.student?.user?.lastName[0]}
              </div>
              <div>
                <h1 className="text-3xl font-extrabold">{profile?.student?.user?.firstName} {profile?.student?.user?.lastName}</h1>
                <p className="text-white/80 mt-1">Class of {profile?.graduationYear} • {schoolName} Alumni</p>
              </div>
            </div>

            {/* School Branding in Hero */}
            <div className="hidden md:flex flex-col items-end">
              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-lg overflow-hidden mb-2">
                {schoolSettings?.logoUrl ? (
                  <img src={schoolSettings.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                ) : (
                  <span className="text-xl font-bold text-primary">{schoolInitials}</span>
                )}
              </div>
              <span className="text-xs font-bold tracking-widest opacity-60 uppercase">Alma Mater</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Career Info */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-gray-900 border-b pb-2">Career Information</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Job Title</label>
                <input
                  type="text" name="currentJob" value={formData.currentJob} onChange={handleChange}
                  className="w-full rounded-xl border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                  placeholder="e.g. Software Engineer"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Company</label>
                <input
                  type="text" name="currentCompany" value={formData.currentCompany} onChange={handleChange}
                  className="w-full rounded-xl border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                  placeholder="e.g. Google"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Skills (Comma separated)</label>
                <input
                  type="text" name="skills" value={formData.skills} onChange={handleChange}
                  className="w-full rounded-xl border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                  placeholder="e.g. React, Python, Leadership"
                />
              </div>
            </div>

            {/* Education Info */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-gray-900 border-b pb-2">Higher Education</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">University / College</label>
                <input
                  type="text" name="university" value={formData.university} onChange={handleChange}
                  className="w-full rounded-xl border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                  placeholder="e.g. University of Lagos"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course of Study</label>
                <input
                  type="text" name="courseOfStudy" value={formData.courseOfStudy} onChange={handleChange}
                  className="w-full rounded-xl border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                  placeholder="e.g. Computer Science"
                />
              </div>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="flex items-center">
                  <input
                    type="checkbox" name="isPublic" checked={formData.isPublic} onChange={handleChange}
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm font-bold text-gray-900">Show profile in public directory</label>
                </div>
                <p className="mt-1 text-xs text-gray-500 ml-6">When enabled, your career info will be visible to other graduates.</p>
              </div>
            </div>

            {/* Links & Bio */}
            <div className="md:col-span-2 space-y-6">
              <h3 className="text-lg font-bold text-gray-900 border-b pb-2">Social & Bio</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
                  <input
                    type="url" name="linkedinUrl" value={formData.linkedinUrl} onChange={handleChange}
                    className="w-full rounded-xl border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Twitter URL</label>
                  <input
                    type="url" name="twitterUrl" value={formData.twitterUrl} onChange={handleChange}
                    className="w-full rounded-xl border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Portfolio/Website URL</label>
                  <input
                    type="url" name="portfolioUrl" value={formData.portfolioUrl} onChange={handleChange}
                    className="w-full rounded-xl border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bio / Professional Summary</label>
                <textarea
                  name="bio" value={formData.bio} onChange={handleChange} rows="4"
                  className="w-full rounded-xl border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                  placeholder="Tell us about your journey since graduation..."
                />
              </div>
            </div>
          </div>

          <div className="mt-10 flex justify-end">
            <button
              type="submit" disabled={saving}
              className="bg-primary text-white font-bold px-10 py-3 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl flex items-start space-x-4">
        <div className="bg-blue-600 p-2 rounded-lg text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <div>
          <h4 className="text-blue-900 font-bold mb-1">Why complete your profile?</h4>
          <p className="text-blue-700 text-sm leading-relaxed">
            A complete profile helps current students find mentors and allows your former classmates to reach out for professional opportunities.
            All your data is secure and you remain in control of your privacy settings.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AlumniDashboard;
