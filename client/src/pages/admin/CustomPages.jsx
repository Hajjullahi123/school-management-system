import React, { useState, useEffect } from 'react';
import { apiCall, api } from '../../api';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiLink, FiCheck, FiX, FiLayout, FiGlobe, FiBookOpen, FiUsers, FiSave } from 'react-icons/fi';
import useSchoolSettings from '../../hooks/useSchoolSettings';
import ReactMarkdown from 'react-markdown';

const CustomPages = () => {
  const { settings, refreshSettings } = useSchoolSettings();
  const [pages, setPages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPage, setEditingPage] = useState(null);
  const [theme, setTheme] = useState('classic');
  const [isSavingTheme, setIsSavingTheme] = useState(false);
  const [aboutUsText, setAboutUsText] = useState('');
  const [testimonials, setTestimonials] = useState([]);
  const [isSavingContent, setIsSavingContent] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    isActive: true
  });

  useEffect(() => {
    fetchPages();
    fetchThemeSettings();
  }, []);

  const fetchPages = async () => {
    try {
      const res = await apiCall('/api/custom-pages/admin');
      setPages(res.data);
    } catch (error) {
      toast.error('Failed to load pages');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchThemeSettings = async () => {
    try {
      const res = await api.get('/api/settings');
      const data = await res.json();
      setTheme(data.websiteTheme || 'classic');
      setAboutUsText(data.aboutUsText || '');
      if (data.testimonialsText) {
        const parsed = data.testimonialsText.split('\n')
          .filter(l => l.trim().length > 0)
          .map(line => {
            const parts = line.split('|').map(s => s.trim());
            return {
              name: parts[0] || '',
              subtitle: parts[1] || '',
              stars: parts[2] || '5',
              quote: parts[3] || ''
            };
          });
        setTestimonials(parsed);
      } else {
        setTestimonials([]);
      }
    } catch (err) {
      console.error('Failed to load theme settings:', err);
    }
  };

  const handleSaveContent = async (e) => {
    e.preventDefault();
    setIsSavingContent(true);
    const loadingToast = toast.loading('Saving website content...');
    try {
      // Fetch fresh settings first
      const res = await api.get('/api/settings');
      const settingsData = await res.json();
      
      // Strip massive base64 file payloads to prevent request body size limit issues
      delete settingsData.logoUrl;
      delete settingsData.principalSignatureUrl;
      delete settingsData.brochureFileUrl;
      delete settingsData.admissionGuideFileUrl;
      
      // Serialize testimonials
      const serializedTestimonials = testimonials
        .map(t => {
          const cleanName = (t.name || '').replace(/\|/g, '').replace(/\n/g, ' ').trim();
          const cleanSubtitle = (t.subtitle || '').replace(/\|/g, '').replace(/\n/g, ' ').trim();
          const cleanStars = (t.stars || '5').trim();
          const cleanQuote = (t.quote || '').replace(/\|/g, '').replace(/\n/g, ' ').trim();
          return `${cleanName} | ${cleanSubtitle} | ${cleanStars} | ${cleanQuote}`;
        })
        .filter(line => line.trim().length > 0)
        .join('\n');
      
      // Update values
      settingsData.aboutUsText = aboutUsText;
      settingsData.testimonialsText = serializedTestimonials;
      
      const saveRes = await api.put('/api/settings', settingsData);
      if (saveRes.ok) {
        toast.success('Website copywriting & testimonials saved successfully!', { id: loadingToast });
        refreshSettings(); // Refresh settings hook context
      } else {
        const errorData = await saveRes.json();
        toast.error(errorData.error || 'Failed to save website content', { id: loadingToast });
      }
    } catch (err) {
      console.error('Error saving content:', err);
      toast.error('Error occurred while saving content settings', { id: loadingToast });
    } finally {
      setIsSavingContent(false);
    }
  };

  const handleThemeChange = async (newTheme) => {
    setTheme(newTheme);
    setIsSavingTheme(true);
    const loadingToast = toast.loading('Saving website theme...');
    try {
      // Fetch fresh settings first
      const res = await api.get('/api/settings');
      const settingsData = await res.json();
      
      // Strip massive base64 file payloads to prevent request body size limit issues
      delete settingsData.logoUrl;
      delete settingsData.principalSignatureUrl;
      delete settingsData.brochureFileUrl;
      delete settingsData.admissionGuideFileUrl;
      
      // Set the new theme
      settingsData.websiteTheme = newTheme;
      
      const saveRes = await api.put('/api/settings', settingsData);
      if (saveRes.ok) {
        toast.success('Website layout theme updated successfully!', { id: loadingToast });
        refreshSettings(); // Refresh settings hook context
      } else {
        const errorData = await saveRes.json();
        toast.error(errorData.error || 'Failed to save website theme', { id: loadingToast });
      }
    } catch (err) {
      console.error('Error saving theme:', err);
      toast.error('Error occurred while saving theme settings', { id: loadingToast });
    } finally {
      setIsSavingTheme(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Auto-generate slug from title if slug hasn't been manually edited
    if (name === 'title' && !editingPage) {
      const autoSlug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      setFormData(prev => ({
        ...prev,
        title: value,
        slug: autoSlug
      }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const openModal = (page = null) => {
    if (page) {
      setEditingPage(page);
      setFormData({
        title: page.title,
        slug: page.slug,
        content: page.content,
        isActive: page.isActive
      });
    } else {
      setEditingPage(null);
      setFormData({
        title: '',
        slug: '',
        content: '',
        isActive: true
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPage(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.slug || !formData.content) {
      return toast.error('Please fill all required fields');
    }

    try {
      if (editingPage) {
        await api.put(`/api/custom-pages/admin/${editingPage.id}`, formData);
        toast.success('Page updated successfully');
      } else {
        await api.post('/api/custom-pages/admin', formData);
        toast.success('Page created successfully');
      }
      closeModal();
      fetchPages();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save page');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this page? This action cannot be undone.')) return;

    try {
      await apiCall(`/api/custom-pages/admin/${id}`, 'DELETE');
      toast.success('Page deleted');
      fetchPages();
    } catch (error) {
      toast.error('Failed to delete page');
    }
  };

  const copyLink = (slug) => {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/${settings?.slug}/page/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Public link copied to clipboard!');
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading website customization panel...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto text-left">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Webpages & Themes</h1>
          <p className="text-sm text-gray-500 mt-1">Manage public website themes, layouts, and custom pages for your school portal.</p>
        </div>
      </div>

      {/* Theme Customization Section */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
        <div className="flex items-center gap-3 mb-1">
          <FiLayout className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-black text-gray-900">Website Theme & Layout</h3>
        </div>
        <p className="text-sm text-gray-500 mb-6">Choose the visual style, layout structure, and premium features for your public website homepage.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Theme Option 1: Classic */}
          <button 
            type="button"
            disabled={isSavingTheme}
            onClick={() => handleThemeChange('classic')}
            className={`p-5 rounded-2xl border-2 text-left transition-all duration-300 relative focus:outline-none flex flex-col justify-between h-full ${
              theme === 'classic' 
                ? 'border-primary bg-primary/[0.02] shadow-md' 
                : 'border-gray-100 hover:border-gray-300 bg-white hover:shadow-sm'
            }`}
          >
            <div>
              <div className="flex justify-between items-start mb-3">
                <span className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center border text-gray-400">
                  🏛️
                </span>
                {theme === 'classic' && (
                  <span className="bg-primary text-white text-xs px-2.5 py-0.5 rounded-full font-bold shadow-sm shadow-primary/20">Active Theme</span>
                )}
              </div>
              <h4 className="font-bold text-gray-900 text-sm mb-1">Classic Theme</h4>
              <p className="text-xs text-gray-500 leading-relaxed">A traditional school portal design with an elegant side-by-side header, motto banner, core information section, about text, and footer linkages.</p>
            </div>
          </button>

          {/* Theme Option 2: Modern */}
          <button 
            type="button"
            disabled={isSavingTheme}
            onClick={() => handleThemeChange('modern')}
            className={`p-5 rounded-2xl border-2 text-left transition-all duration-300 relative focus:outline-none flex flex-col justify-between h-full ${
              theme === 'modern' 
                ? 'border-primary bg-primary/[0.02] shadow-md' 
                : 'border-gray-100 hover:border-gray-300 bg-white hover:shadow-sm'
            }`}
          >
            <div>
              <div className="flex justify-between items-start mb-3">
                <span className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center border text-gray-400">
                  ✨
                </span>
                {theme === 'modern' && (
                  <span className="bg-primary text-white text-xs px-2.5 py-0.5 rounded-full font-bold shadow-sm shadow-primary/20">Active Theme</span>
                )}
              </div>
              <h4 className="font-bold text-gray-900 text-sm mb-1">Modern Premium Theme</h4>
              <p className="text-xs text-gray-500 leading-relaxed">A feature-rich, dynamic template containing an infinite news ticker marquee, overlapping statistics counters, step-by-step admissions roadmaps, real-time Google Location maps, and newsletter signup actions.</p>
            </div>
          </button>
        </div>
      </div>

      {/* Website Copywriting & Testimonials Section */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8 space-y-6">
        <div className="border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3 mb-1">
            <FiBookOpen className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-black text-gray-900">Website Content Management</h3>
          </div>
          <p className="text-sm text-gray-500">
            Publish dynamic copy and reviews directly onto your public website homepage. Write rich explanations and showcase school success.
          </p>
        </div>

        <form onSubmit={handleSaveContent} className="space-y-6">
          {/* About Us / Principal's Message */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-800">
              About Us / Principal's Message (Markdown Supported)
            </label>
            <div className="bg-primary/[0.02] border border-primary/10 rounded-xl p-4 mb-3">
              <h5 className="font-bold text-xs text-primary mb-1">ℹ️ How it works:</h5>
              <p className="text-xs text-gray-600 leading-relaxed">
                This section displays prominently on the public homepage. Introduce your school, state your academic philosophy, or include a welcome message from the Principal. 
                <br />
                <strong>Supports Markdown formatting:</strong> Use <code># Heading</code> for titles, <code>**text**</code> for <strong>bold</strong>, <code>*text*</code> for <em>italics</em>, and standard hyphens <code>-</code> for list bullet points.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <textarea
                value={aboutUsText}
                onChange={(e) => setAboutUsText(e.target.value)}
                rows="8"
                placeholder="Write a welcoming message or about us text..."
                className="w-full border border-gray-300 rounded-xl px-4 py-3 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-mono text-sm resize-none"
              ></textarea>
              <div className="w-full h-full min-h-[12rem] max-h-[16rem] overflow-y-auto border border-gray-200 rounded-xl bg-gray-50/50 p-4 prose prose-sm max-w-none shadow-inner">
                {aboutUsText ? (
                  <ReactMarkdown>{aboutUsText}</ReactMarkdown>
                ) : (
                  <span className="text-gray-400 text-xs italic">Live markdown preview will appear here...</span>
                )}
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Parent Testimonials */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-gray-800">
              Parent Testimonials
            </label>
            <div className="bg-primary/[0.02] border border-primary/10 rounded-xl p-4 mb-3">
              <h5 className="font-bold text-xs text-primary mb-1">ℹ️ How it works:</h5>
              <p className="text-xs text-gray-600 leading-relaxed">
                Testimonials appear as an elegant, sliding carousel on the public website homepage. Positive feedback from parents builds high trust with prospective families.
                <br />
                Include the parent's full name, a subtitle (e.g. "Parent of 3 students" or "Alumni Parent"), a star rating, and a heartfelt quote describing their experience at the school.
              </p>
            </div>

            <div className="space-y-4">
              {testimonials.map((t, i) => {
                const updateTestimonialField = (field, val) => {
                  setTestimonials(prev => {
                    const updated = [...prev];
                    updated[i] = { ...updated[i], [field]: val };
                    return updated;
                  });
                };

                return (
                  <div key={i} className="border border-gray-200 p-5 rounded-2xl bg-gray-50/50 hover:bg-gray-50 transition-all flex flex-col gap-4 shadow-sm relative group">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <FiUsers className="text-primary w-4 h-4" />
                        <h4 className="font-bold text-gray-800 text-sm">Testimonial #{i + 1}</h4>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setTestimonials(prev => prev.filter((_, idx) => idx !== i))} 
                        className="text-red-500 hover:text-red-700 text-xs font-bold uppercase tracking-wider transition-colors"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Parent Name</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Mrs. Maryam Alabi" 
                          value={t.name} 
                          onChange={e => updateTestimonialField('name', e.target.value)} 
                          className="border border-gray-300 rounded-xl px-4 py-2 w-full text-sm outline-none focus:ring-2 focus:ring-primary/20" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Subtitle / Context</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Parent of JSS2 Student" 
                          value={t.subtitle} 
                          onChange={e => updateTestimonialField('subtitle', e.target.value)} 
                          className="border border-gray-300 rounded-xl px-4 py-2 w-full text-sm outline-none focus:ring-2 focus:ring-primary/20" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Rating</label>
                        <select 
                          value={t.stars} 
                          onChange={e => updateTestimonialField('stars', e.target.value)} 
                          className="border border-gray-300 rounded-xl px-4 py-2 w-full text-sm outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                        >
                          <option value="5">⭐⭐⭐⭐⭐ (5 Stars)</option>
                          <option value="4">⭐⭐⭐⭐ (4 Stars)</option>
                          <option value="3">⭐⭐⭐ (3 Stars)</option>
                          <option value="2">⭐⭐ (2 Stars)</option>
                          <option value="1">⭐ (1 Star)</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Review Quote / Statement</label>
                      <textarea 
                        placeholder="e.g. Albayyinah School has provided a stellar mix of Islamic values and top-notch academics..." 
                        value={t.quote} 
                        onChange={e => updateTestimonialField('quote', e.target.value)} 
                        className="border border-gray-300 rounded-xl px-4 py-2 w-full text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none" 
                        rows="2"
                      ></textarea>
                    </div>
                  </div>
                );
              })}

              <button 
                type="button" 
                onClick={() => setTestimonials(prev => [...prev, { name: '', subtitle: 'Parent', stars: '5', quote: '' }])} 
                className="w-full border-2 border-dashed border-gray-300 text-gray-500 hover:text-primary hover:border-primary px-4 py-3 rounded-2xl text-sm font-bold hover:bg-primary/[0.01] transition-all flex items-center justify-center gap-2"
              >
                + Add Testimonial Card
              </button>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={isSavingContent}
              className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 text-sm"
            >
              <FiSave className="w-4 h-4" />
              {isSavingContent ? 'Saving Content...' : 'Save Website Content'}
            </button>
          </div>
        </form>
      </div>

      {/* Website Custom Pages List */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <FiGlobe className="w-5 h-5 text-primary" />
            <div>
              <h3 className="text-lg font-black text-gray-900">Custom Webpages</h3>
              <p className="text-xs text-gray-400 mt-0.5">Define additional custom sub-pages (e.g. Admission Policies, Core History, Facilities) to show on your public menu.</p>
            </div>
          </div>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-xl font-bold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 text-sm"
          >
            <FiPlus /> Add Custom Page
          </button>
        </div>

        {pages.length === 0 ? (
          <div className="border border-dashed border-gray-200 rounded-2xl p-12 text-center">
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <FiLink className="w-5 h-5 text-gray-400" />
            </div>
            <h4 className="text-base font-bold text-gray-900 mb-1">No Custom Pages Yet</h4>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mb-4">Create informational pages like "Facilities" or "Admission Guidelines" to link on your public website menu.</p>
            <button onClick={() => openModal()} className="text-primary text-xs font-bold hover:underline">
              + Create first webpage
            </button>
          </div>
        ) : (
          <div className="border border-gray-100 rounded-xl overflow-hidden shadow-inner">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Page Title</th>
                  <th className="px-6 py-4">URL Path</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pages.map((page) => (
                  <tr key={page.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900 text-sm">{page.title}</td>
                    <td className="px-6 py-4 text-xs text-gray-500 font-mono">/page/{page.slug}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${page.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {page.isActive ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-3">
                      <button onClick={() => copyLink(page.slug)} className="text-gray-400 hover:text-primary transition-colors" title="Copy Public Link">
                        <FiLink className="w-5 h-5 inline" />
                      </button>
                      <button onClick={() => openModal(page)} className="text-gray-400 hover:text-blue-500 transition-colors" title="Edit">
                        <FiEdit2 className="w-5 h-5 inline" />
                      </button>
                      <button onClick={() => handleDelete(page.id)} className="text-gray-400 hover:text-red-500 transition-colors" title="Delete">
                        <FiTrash2 className="w-5 h-5 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Editor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-black text-gray-900">{editingPage ? 'Edit Page' : 'Create New Page'}</h2>
              <button onClick={closeModal} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <FiX className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Page Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    placeholder="e.g. Admissions Policy"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">URL Slug *</label>
                  <input
                    type="text"
                    name="slug"
                    value={formData.slug}
                    onChange={handleInputChange}
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-mono text-sm"
                    placeholder="e.g. admissions-policy"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 flex justify-between">
                  <span>Page Content (Markdown format) *</span>
                  <a href="https://www.markdownguide.org/cheat-sheet/" target="_blank" rel="noreferrer" className="text-primary text-xs hover:underline font-normal">Markdown Guide</a>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-96">
                  {/* Editor */}
                  <textarea
                    name="content"
                    value={formData.content}
                    onChange={handleInputChange}
                    required
                    className="w-full h-full border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-mono text-sm resize-none"
                    placeholder="Write your page content here... You can use # for headings, **bold**, and *italics*."
                  ></textarea>
                  
                  {/* Live Preview */}
                  <div className="w-full h-full border border-gray-300 rounded-lg bg-gray-50/80 p-4 overflow-y-auto prose prose-sm max-w-none shadow-inner">
                    {formData.content ? (
                      <ReactMarkdown>{formData.content}</ReactMarkdown>
                    ) : (
                      <div className="text-gray-400 h-full flex flex-col items-center justify-center text-center">
                        <svg className="w-8 h-8 mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        Live Preview
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 col-span-2">
                <input
                  type="checkbox"
                  id="isActive"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                  className="rounded text-primary focus:ring-primary w-4 h-4"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Publish this page immediately (visible on public site)</label>
              </div>
            </form>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button type="button" onClick={closeModal} className="px-5 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded-lg transition-colors">
                Cancel
              </button>
              <button onClick={handleSubmit} className="px-5 py-2 bg-primary hover:bg-primary-dark text-white font-bold rounded-lg shadow-md transition-colors flex items-center gap-2">
                <FiCheck /> Save Page
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomPages;
