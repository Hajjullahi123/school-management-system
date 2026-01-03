import React, { useState, useEffect } from 'react';
import { toast } from '../../utils/toast';
import { API_BASE_URL } from '../../api';

const NewsEventsManagement = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'news',
    eventDate: '',
    isPublished: false
  });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/news-events/all`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const url = editing
        ? `${API_BASE_URL}/api/news-events/${editing.id}`
        : `${API_BASE_URL}/api/news-events`;

      const response = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success(editing ? 'Updated successfully!' : 'Created successfully!');
        setShowForm(false);
        setEditing(null);
        setFormData({ title: '', content: '', type: 'news', eventDate: '', isPublished: false });
        fetchItems();
      } else {
        toast.error('Operation failed');
      }
    } catch (error) {
      toast.error('Error occurred');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this item?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/news-events/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        toast.success('Deleted successfully!');
        fetchItems();
      }
    } catch (error) {
      toast.error('Delete failed');
    }
  };

  const togglePublish = async (item) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/news-events/${item.id}/publish`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ isPublished: !item.isPublished })
      });

      if (response.ok) {
        toast.success(item.isPublished ? 'Unpublished' : 'Published!');
        fetchItems();
      }
    } catch (error) {
      toast.error('Failed to toggle publish');
    }
  };

  const startEdit = (item) => {
    setEditing(item);
    setFormData({
      title: item.title,
      content: item.content,
      type: item.type,
      eventDate: item.eventDate ? item.eventDate.split('T')[0] : '',
      isPublished: item.isPublished
    });
    setShowForm(true);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">News & Events Management</h1>
        <button
          onClick={() => {
            setShowForm(true);
            setEditing(null);
            setFormData({ title: '', content: '', type: 'news', eventDate: '', isPublished: false });
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Add New
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editing ? 'Edit' : 'Create'} Item</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="news">News</option>
                  <option value="event">Event</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Content</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full border rounded px-3 py-2 h-32"
                  required
                />
              </div>

              {formData.type === 'event' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Event Date</label>
                  <input
                    type="date"
                    value={formData.eventDate}
                    onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              )}

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="publish"
                  checked={formData.isPublished}
                  onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="publish" className="text-sm">Publish immediately</label>
              </div>

              <div className="flex gap-2 pt-4">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                  {editing ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditing(null);
                  }}
                  className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Items List */}
      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <div className="p-8 text-center">Loading...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No items yet. Create one!</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Title</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Author</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${item.type === 'news' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                      {item.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">{item.title}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {item.User.firstName} {item.User.lastName}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${item.isPublished ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                      {item.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => togglePublish(item)}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {item.isPublished ? 'Unpublish' : 'Publish'}
                      </button>
                      <button
                        onClick={() => startEdit(item)}
                        className="text-sm text-yellow-600 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-sm text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default NewsEventsManagement;
