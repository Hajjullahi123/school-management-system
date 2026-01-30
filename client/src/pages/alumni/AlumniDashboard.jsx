import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { formatNumber } from '../../utils/formatters';
import { toast } from '../../utils/toast';
import { Link } from 'react-router-dom';
import useSchoolSettings from '../../hooks/useSchoolSettings';

const AlumniDashboard = () => {
  const { settings: schoolSettings } = useSchoolSettings();
  const [profile, setProfile] = useState(null);
  const [donations, setDonations] = useState([]);
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' or 'profile'

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
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [profileRes, donationsRes, storiesRes] = await Promise.all([
        api.get('/api/alumni/profile/current'),
        api.get('/api/alumni/my-donations'),
        api.get('/api/alumni/stories')
      ]);

      if (profileRes.ok) {
        const data = await profileRes.json();
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
      }

      if (donationsRes.ok) setDonations(await donationsRes.json());
      if (storiesRes.ok) setStories(await storiesRes.json());

    } catch (error) {
      console.error('Fetch dashboard error:', error);
      toast.error('Failed to load dashboard data');
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
        setActiveTab('overview');
        fetchDashboardData();
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

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );

  const schoolName = schoolSettings?.schoolName || 'Amana Academy';
  const totalDonated = donations.reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Hero Header */}
      <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden border border-gray-100 mb-8 relative">
        <div className="h-32 bg-gradient-to-r from-primary via-primary/90 to-secondary opacity-90 absolute inset-0 z-0"></div>
        <div className="relative z-10 p-8 pt-12">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
            <div className="w-32 h-32 rounded-3xl bg-white shadow-2xl border-4 border-white overflow-hidden flex items-center justify-center text-5xl font-black text-primary">
              {profile?.profilePicture ? (
                <img src={profile.profilePicture} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span>{profile?.student?.user?.firstName[0]}{profile?.student?.user?.lastName[0]}</span>
              )}
            </div>
            <div className="flex-1 text-center md:text-left pb-2">
              <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight">
                Welcome back, {profile?.student?.user?.firstName}!
              </h1>
              <p className="text-gray-500 font-bold text-lg">
                Class of {profile?.graduationYear} • <span className="text-primary italic">{schoolName}</span> Alumni
              </p>
            </div>
            <div className="flex gap-3 pb-2">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-6 py-2.5 rounded-2xl font-bold transition-all ${activeTab === 'overview' ? 'bg-primary text-white shadow-lg' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className={`px-6 py-2.5 rounded-2xl font-bold transition-all ${activeTab === 'profile' ? 'bg-primary text-white shadow-lg' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                Edit Bio
              </button>
            </div>
          </div>
        </div>
      </div>

      {activeTab === 'overview' ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-[30px] shadow-xl border border-gray-100 flex items-center gap-6">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Total Impact</p>
                <p className="text-2xl font-black text-gray-900">₦{formatNumber(totalDonated)}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-[30px] shadow-xl border border-gray-100 flex items-center gap-6">
              <div className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Graduation Year</p>
                <p className="text-2xl font-black text-gray-900">{profile?.graduationYear}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-[30px] shadow-xl border border-gray-100 flex items-center gap-6">
              <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </div>
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Alumni ID</p>
                <p className="text-2xl font-black text-gray-900 truncate">{profile?.alumniId || 'Pending'}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content: News & Stories */}
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white rounded-[35px] shadow-xl border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                  <h3 className="text-xl font-bold text-gray-900">Alumni Success Stories</h3>
                  <Link to="/alumni/stories" className="text-primary font-bold text-sm hover:underline">View All</Link>
                </div>
                <div className="p-6 space-y-6">
                  {stories.length > 0 ? stories.slice(0, 2).map((story, i) => (
                    <div key={i} className="flex gap-6 items-start group">
                      {story.imageUrl && (
                        <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 shadow-lg transition-transform group-hover:scale-105">
                          <img src={story.imageUrl} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-gray-900 text-lg mb-1 group-hover:text-primary transition-colors">{story.title}</h4>
                        <p className="text-gray-500 text-sm line-clamp-2 leading-relaxed mb-2">{story.content}</p>
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-400 italic">
                          <span>{story.alumniName}</span>
                          <span>•</span>
                          <span>Class of {story.graduationYear}</span>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-8 text-gray-400 italic">No stories published yet.</div>
                  )}
                </div>
              </div>

              {/* Donation History */}
              <div className="bg-white rounded-[35px] shadow-xl border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-50 bg-gray-50/50">
                  <h3 className="text-xl font-bold text-gray-900">Your Contributions</h3>
                </div>
                <div className="p-6">
                  <div className="overflow-hidden rounded-2xl border border-gray-50">
                    <table className="w-full">
                      <thead className="bg-gray-50/50">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Date</th>
                          <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Amount</th>
                          <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Message</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {donations.length > 0 ? donations.map((d, i) => (
                          <tr key={i} className="hover:bg-gray-50/30 transition-colors">
                            <td className="px-6 py-4 text-sm font-bold text-gray-600">{new Date(d.date).toLocaleDateString()}</td>
                            <td className="px-6 py-4 text-sm font-black text-green-600">₦{formatNumber(d.amount)}</td>
                            <td className="px-6 py-4 text-sm text-gray-500 italic">{d.message || '—'}</td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan="3" className="px-6 py-10 text-center text-gray-400 italic">You haven't made any donations yet.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar: Profile Summary & Directory */}
            <div className="space-y-8">
              <div className="bg-primary rounded-[35px] p-8 text-white shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <h3 className="text-xl font-black mb-6 relative z-10 italic underline underline-offset-4 decoration-white/30">Connect & Network</h3>
                <p className="text-white/80 text-sm mb-8 leading-relaxed relative z-10 font-medium">
                  Reconnect with former classmates and find professional opportunities within our exclusive alumni network.
                </p>
                <div className="space-y-4 relative z-10">
                  <Link to="/alumni/directory" className="w-full py-4 bg-white text-primary font-black rounded-2xl shadow-xl flex items-center justify-center gap-2 hover:bg-gray-100 transition-all border-none">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                    Alumni Directory
                  </Link>
                  <Link to="/contact" className="w-full py-4 bg-primary-dark/30 border-2 border-white/20 text-white font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-white/10 transition-all">
                    Contact Alumni Office
                  </Link>
                </div>
              </div>

              <div className="bg-white rounded-[35px] p-8 shadow-xl border border-gray-100">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Professional Card</h4>
                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                  <h4 className="text-lg font-bold text-gray-900 mb-1">{formData.currentJob || 'No Title Set'}</h4>
                  <p className="text-primary font-bold text-sm mb-4">{formData.currentCompany || 'No Company Set'}</p>
                  <p className="text-gray-500 text-xs leading-relaxed mb-6 line-clamp-3 italic">"{formData.bio || 'Your bio will appear here...'}"</p>

                  <div className="flex gap-4">
                    {formData.linkedinUrl && (
                      <a href={formData.linkedinUrl} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-blue-600 transition-colors">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
                      </a>
                    )}
                    {formData.twitterUrl && (
                      <a href={formData.twitterUrl} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-sky-500 transition-colors">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.84 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" /></svg>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Edit Profile Tab */
        <div className="bg-white rounded-[40px] shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="p-8 border-b border-gray-50 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-gray-900">Your Professional Journey</h2>
              <p className="text-gray-500 font-medium">Keep your profile updated to stay connected with the community.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {/* Career Info */}
              <div className="space-y-6">
                <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-4">Career & Skills</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Current Job Title</label>
                    <input
                      type="text" name="currentJob" value={formData.currentJob} onChange={handleChange}
                      className="w-full rounded-2xl border-gray-200 py-4 focus:ring-2 focus:ring-primary focus:border-primary transition-all font-medium placeholder:text-gray-300"
                      placeholder="e.g. Senior Software Engineer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Current Company</label>
                    <input
                      type="text" name="currentCompany" value={formData.currentCompany} onChange={handleChange}
                      className="w-full rounded-2xl border-gray-200 py-4 focus:ring-2 focus:ring-primary focus:border-primary transition-all font-medium placeholder:text-gray-300"
                      placeholder="e.g. Microsoft Corporation"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Skills</label>
                    <input
                      type="text" name="skills" value={formData.skills} onChange={handleChange}
                      className="w-full rounded-2xl border-gray-200 py-4 focus:ring-2 focus:ring-primary focus:border-primary transition-all font-medium placeholder:text-gray-300"
                      placeholder="e.g. Leadership, Strategy, Python"
                    />
                  </div>
                </div>
              </div>

              {/* Education Info */}
              <div className="space-y-6">
                <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-4">Higher Education</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">University / College</label>
                    <input
                      type="text" name="university" value={formData.university} onChange={handleChange}
                      className="w-full rounded-2xl border-gray-200 py-4 focus:ring-2 focus:ring-primary focus:border-primary transition-all font-medium placeholder:text-gray-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Course of Study</label>
                    <input
                      type="text" name="courseOfStudy" value={formData.courseOfStudy} onChange={handleChange}
                      className="w-full rounded-2xl border-gray-200 py-4 focus:ring-2 focus:ring-primary focus:border-primary transition-all font-medium placeholder:text-gray-300"
                    />
                  </div>
                  <div className="bg-gray-50 p-6 rounded-[25px] border border-gray-200 mt-6">
                    <div className="flex items-center">
                      <input
                        type="checkbox" name="isPublic" checked={formData.isPublic} onChange={handleChange}
                        className="h-5 w-5 text-primary focus:ring-primary border-gray-300 rounded-lg cursor-pointer"
                      />
                      <label className="ml-3 block text-sm font-black text-gray-900 cursor-pointer uppercase tracking-wide">Public Directory Visibility</label>
                    </div>
                    <p className="mt-2 text-xs text-gray-500 ml-8 font-medium italic">When enabled, your professional profile will be visible to other graduates for networking.</p>
                  </div>
                </div>
              </div>

              {/* Social Links */}
              <div className="md:col-span-2 space-y-6 mt-4">
                <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-4">Social Presence & Bio</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">LinkedIn Profile URL</label>
                    <input
                      type="url" name="linkedinUrl" value={formData.linkedinUrl} onChange={handleChange}
                      className="w-full rounded-2xl border-gray-200 py-4 focus:ring-2 focus:ring-primary transition-all shadow-sm"
                      placeholder="https://linkedin.com/in/..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Twitter Profile URL</label>
                    <input
                      type="url" name="twitterUrl" value={formData.twitterUrl} onChange={handleChange}
                      className="w-full rounded-2xl border-gray-200 py-4 focus:ring-2 focus:ring-primary transition-all shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Portfolio / Personal Site</label>
                    <input
                      type="url" name="portfolioUrl" value={formData.portfolioUrl} onChange={handleChange}
                      className="w-full rounded-2xl border-gray-200 py-4 focus:ring-2 focus:ring-primary transition-all shadow-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Professional Summary</label>
                  <textarea
                    name="bio" value={formData.bio} onChange={handleChange} rows="5"
                    className="w-full rounded-[25px] border-gray-200 p-6 focus:ring-2 focus:ring-primary transition-all font-medium placeholder:text-gray-300 shadow-inner"
                    placeholder="Tell us about your achievements and journey since graduation..."
                  />
                </div>
              </div>
            </div>

            <div className="mt-12 flex justify-between items-center border-t border-gray-50 pt-10">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className="text-gray-400 font-bold hover:text-gray-600 px-6 py-2 transition-colors uppercase tracking-widest text-sm"
              >
                Cancel Changes
              </button>
              <button
                type="submit" disabled={saving}
                className="bg-primary text-white font-black px-12 py-5 rounded-[22px] shadow-[0_20px_40px_rgba(15,118,110,0.3)] hover:brightness-110 active:scale-95 transition-all transform hover:-translate-y-1 disabled:opacity-50 uppercase tracking-[0.1em]"
              >
                {saving ? 'Updating System...' : 'Publish Update'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AlumniDashboard;
