import React, { useState, useEffect } from 'react';
import { apiCall } from '../../utils/api';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiLink, FiCheck, FiX } from 'react-icons/fi';
import useSchoolSettings from '../../hooks/useSchoolSettings';
import ReactMarkdown from 'react-markdown';

const CustomPages = () => {
  const { settings } = useSchoolSettings();
  const [pages, setPages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPage, setEditingPage] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    isActive: true
  });

  useEffect(() => {
    fetchPages();
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
        await apiCall(`/api/custom-pages/admin/${editingPage.id}`, 'PUT', formData);
        toast.success('Page updated successfully');
      } else {
        await apiCall('/api/custom-pages/admin', 'POST', formData);
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
    return <div className="p-8 text-center text-gray-500">Loading custom pages...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Website Pages</h1>
          <p className="text-sm text-gray-500 mt-1">Manage custom informational pages for your public website.</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
        >
          <FiPlus /> Create New Page
        </button>
      </div>

      {pages.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiLink className="w-6 h-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">No Custom Pages</h3>
          <p className="text-gray-500 max-w-sm mx-auto mb-6">Create pages like "Admissions Policy", "History", or "Contact" to provide more information on your public website.</p>
          <button onClick={() => openModal()} className="text-primary font-bold hover:underline">
            + Create your first page
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Page Title</th>
                <th className="px-6 py-4">URL Slug</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pages.map((page) => (
                <tr key={page.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-gray-900">{page.title}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-mono">/page/{page.slug}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${page.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {page.isActive ? 'Active' : 'Draft'}
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
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:border-primary focus:ring-primary"
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
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:border-primary focus:ring-primary font-mono text-sm"
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
                    className="w-full h-full border-gray-300 rounded-lg shadow-sm focus:border-primary focus:ring-primary font-mono text-sm p-4 resize-none"
                    placeholder="Write your page content here... You can use # for headings, **bold**, and *italics*."
                  ></textarea>
                  
                  {/* Live Preview */}
                  <div className="w-full h-full border border-gray-200 rounded-lg bg-gray-50 p-4 overflow-y-auto prose prose-sm max-w-none">
                    {formData.content ? (
                      <ReactMarkdown>{formData.content}</ReactMarkdown>
                    ) : (
                      <div className="text-gray-400 h-full flex items-center justify-center text-center">Live Preview</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
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
