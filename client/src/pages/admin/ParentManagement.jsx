import React, { useState, useEffect } from 'react';
import { api } from '../../api';

const ParentManagement = () => {
  const [parents, setParents] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Data
  const [createData, setCreateData] = useState({
    firstName: '', lastName: '', email: '', phone: '', address: ''
  });

  const [editData, setEditData] = useState({
    id: '', firstName: '', lastName: '', email: '', phone: '', address: ''
  });

  const [linkData, setLinkData] = useState({
    parentId: '',
    studentId: ''
  });

  const [deleteParent, setDeleteParent] = useState(null);

  useEffect(() => {
    fetchParents();
    fetchStudents();
  }, []);

  const fetchParents = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/parents');
      if (res.ok) setParents(await res.json());
    } catch (e) { alert('Error fetching parents'); }
    finally { setLoading(false); }
  };

  const fetchStudents = async () => {
    try {
      const res = await api.get('/api/students');
      if (res.ok) setStudents(await res.json());
    } catch (e) { console.error('Error fetching students'); }
  };

  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [parentCredentials, setParentCredentials] = useState(null);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/api/parents/register', createData);
      if (res.ok) {
        const data = await res.json();
        setParentCredentials({
          name: `${createData.firstName} ${createData.lastName}`,
          username: data.credentials.username,
          password: data.credentials.password
        });
        setShowCreateModal(false);
        setShowCredentialsModal(true);
        setCreateData({ firstName: '', lastName: '', email: '', phone: '', address: '' });
        fetchParents();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to register');
      }
    } catch (e) { alert('Error creating parent'); }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put(`/api/parents/${editData.id}`, {
        firstName: editData.firstName,
        lastName: editData.lastName,
        email: editData.email,
        phone: editData.phone,
        address: editData.address
      });
      if (res.ok) {
        alert('Parent updated successfully!');
        setShowEditModal(false);
        setEditData({ id: '', firstName: '', lastName: '', email: '', phone: '', address: '' });
        fetchParents();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update');
      }
    } catch (e) { alert('Error updating parent'); }
  };

  const handleDelete = async () => {
    try {
      const res = await api.delete(`/api/parents/${deleteParent.id}`);
      if (res.ok) {
        alert('Parent deleted successfully!');
        setShowDeleteModal(false);
        setDeleteParent(null);
        fetchParents();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete');
      }
    } catch (e) { alert('Error deleting parent'); }
  };

  const handleLink = async () => {
    try {
      const res = await api.post('/api/parents/link-student', linkData);
      if (res.ok) {
        alert('Student linked successfully!');
        setShowLinkModal(false);
        setLinkData({ parentId: '', studentId: '' });
        fetchParents();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to link student');
      }
    } catch (e) {
      alert('Error linking student');
    }
  };

  const handleUnlink = async (studentId) => {
    try {
      const res = await api.post('/api/parents/unlink-student', { studentId });
      if (res.ok) {
        alert('Student unlinked successfully!');
        fetchParents();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to unlink student');
      }
    } catch (e) {
      alert('Error unlinking student');
    }
  };

  const openEditModal = (parent) => {
    setEditData({
      id: parent.id,
      firstName: parent.user?.firstName || '',
      lastName: parent.user?.lastName || '',
      email: parent.user?.email || '',
      phone: parent.phone || '',
      address: parent.address || ''
    });
    setShowEditModal(true);
  };

  const openLinkModal = (parent) => {
    setLinkData({ parentId: parent.id, studentId: '' });
    setShowLinkModal(true);
  };

  const openDeleteModal = (parent) => {
    setDeleteParent(parent);
    setShowDeleteModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Parent Management</h1>
          <p className="text-gray-600 mt-1">Manage parent accounts and link students</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:brightness-90 flex items-center gap-2 font-semibold"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Register Parent
        </button>
      </div>

      {/* Parent List - Responsive with Vertical Scroll */}
      <div className="bg-white rounded-lg shadow overflow-hidden max-h-[600px] overflow-y-auto">
        <table className="w-full table-fixed divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-1/5 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parent</th>
              <th className="w-1/6 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
              <th className="w-2/5 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Wards</th>
              <th className="w-1/6 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Username</th>
              <th className="w-1/6 px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {loading ? (
              <tr><td colSpan="5" className="text-center py-8"><div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div></td></tr>
            ) : parents.length === 0 ? (
              <tr><td colSpan="5" className="text-center py-8 text-gray-500">No parents found.</td></tr>
            ) : (
              parents.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/90 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                        {p.user?.firstName?.[0]}{p.user?.lastName?.[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{p.user?.firstName} {p.user?.lastName}</div>
                        <div className="text-xs text-gray-500 truncate">{p.address || 'No address'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="text-sm text-gray-900 truncate">{p.phone}</div>
                    <div className="text-xs text-gray-500 truncate">{p.user?.email || 'No email'}</div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      {p.students?.length > 0 ? p.students.map(s => (
                        <div key={s.id} className="group relative inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full border border-indigo-200 font-medium transition-all hover:bg-indigo-100">
                          <span>{s.user?.firstName} ({s.classModel?.name})</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Unlink ${s.user?.firstName} from this parent?`)) {
                                handleUnlink(s.id);
                              }
                            }}
                            className="ml-1 hover:bg-red-500 hover:text-white rounded-full p-0.5 transition-colors"
                            title="Unlink student"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      )) : <span className="text-xs text-gray-400">No wards linked</span>}
                    </div>
                  </td>
                  <td className="px-3 py-3 hidden sm:table-cell">
                    <span className="text-sm text-gray-900 font-mono truncate block">{p.user?.username}</span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openLinkModal(p)}
                        className="text-blue-600 hover:text-blue-900 font-medium text-sm flex items-center gap-1"
                        title="Add Student"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add Student
                      </button>
                      <button
                        onClick={() => openEditModal(p)}
                        className="text-primary hover:text-primary-dark font-medium text-sm"
                        title="Edit Parent"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => openDeleteModal(p)}
                        className="text-red-600 hover:text-red-900 font-medium text-sm"
                        title="Delete Parent"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Register New Parent
            </h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">First Name *</label>
                  <input type="text" className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-primary focus:border-transparent" required
                    value={createData.firstName} onChange={e => setCreateData({ ...createData, firstName: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Last Name *</label>
                  <input type="text" className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-primary focus:border-transparent" required
                    value={createData.lastName} onChange={e => setCreateData({ ...createData, lastName: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone Number (Login Username) *</label>
                <input type="text" className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-primary focus:border-transparent" required
                  value={createData.phone} onChange={e => setCreateData({ ...createData, phone: e.target.value })} />
                <p className="text-xs text-gray-500 mt-1">This will be used as the login username</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input type="email" className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                  value={createData.email} onChange={e => setCreateData({ ...createData, email: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Address</label>
                <input type="text" className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                  value={createData.address} onChange={e => setCreateData({ ...createData, address: e.target.value })} />
              </div>
              <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
                <p className="text-xs text-blue-700">Default password: <strong>parent123</strong> (Parent will be required to change on first login)</p>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg hover:brightness-90 font-semibold">Register Parent</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Parent Information
            </h3>
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">First Name *</label>
                  <input type="text" className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-primary focus:border-transparent" required
                    value={editData.firstName} onChange={e => setEditData({ ...editData, firstName: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Last Name *</label>
                  <input type="text" className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-primary focus:border-transparent" required
                    value={editData.lastName} onChange={e => setEditData({ ...editData, lastName: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone Number *</label>
                <input type="text" className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-primary focus:border-transparent" required
                  value={editData.phone} onChange={e => setEditData({ ...editData, phone: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input type="email" className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                  value={editData.email} onChange={e => setEditData({ ...editData, email: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Address</label>
                <input type="text" className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                  value={editData.address} onChange={e => setEditData({ ...editData, address: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg hover:brightness-90 font-semibold">Update Parent</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Link Student Modal - Improved Searchable Interface */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-primary/5">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Add Student to Parent
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Select a student to link to <strong>{parents.find(p => p.id === parseInt(linkData.parentId))?.user?.firstName} {parents.find(p => p.id === parseInt(linkData.parentId))?.user?.lastName}</strong>
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowLinkModal(false);
                    setLinkData({ parentId: '', studentId: '' });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by name, admission number, or class..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={linkData.searchTerm || ''}
                  onChange={(e) => setLinkData({ ...linkData, searchTerm: e.target.value })}
                />
              </div>
            </div>

            {/* Student List */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {students
                  .filter(s => {
                    // Filter by search term
                    const searchTerm = (linkData.searchTerm || '').toLowerCase();
                    if (!searchTerm) return true;

                    const fullName = `${s.user?.firstName} ${s.user?.lastName}`.toLowerCase();
                    const admission = s.admissionNumber?.toLowerCase() || '';
                    const className = `${s.classModel?.name} ${s.classModel?.arm}`.toLowerCase();

                    return fullName.includes(searchTerm) ||
                      admission.includes(searchTerm) ||
                      className.includes(searchTerm);
                  })
                  .map(s => {
                    const isSelected = linkData.studentId === s.id.toString();
                    const isAlreadyLinked = s.parentId !== null;

                    return (
                      <div
                        key={s.id}
                        onClick={() => {
                          if (!isAlreadyLinked) {
                            setLinkData({ ...linkData, studentId: s.id.toString() });
                          }
                        }}
                        className={`
                          relative p-4 rounded-lg border-2 cursor-pointer transition-all
                          ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}
                          ${isAlreadyLinked ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                      >
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full p-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}

                        <div className="flex items-center gap-3">
                          {/* Student Avatar */}
                          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                            {s.user?.firstName?.[0]}{s.user?.lastName?.[0]}
                          </div>

                          {/* Student Info */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 truncate">
                              {s.user?.firstName} {s.user?.lastName}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {s.classModel?.name} {s.classModel?.arm}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {s.admissionNumber}
                            </p>
                          </div>

                          {/* Status Badge */}
                          {isAlreadyLinked && (
                            <div className="flex-shrink-0">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                                </svg>
                                Linked
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* No Results */}
              {students.filter(s => {
                const searchTerm = (linkData.searchTerm || '').toLowerCase();
                if (!searchTerm) return true;
                const fullName = `${s.user?.firstName} ${s.user?.lastName}`.toLowerCase();
                const admission = s.admissionNumber?.toLowerCase() || '';
                const className = `${s.classModel?.name} ${s.classModel?.arm}`.toLowerCase();
                return fullName.includes(searchTerm) || admission.includes(searchTerm) || className.includes(searchTerm);
              }).length === 0 && (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p className="text-gray-500">No students found matching your search</p>
                  </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  {linkData.studentId ? (
                    <span className="text-blue-600 font-medium">
                      ✓ Student selected
                    </span>
                  ) : (
                    <span>Select a student to link</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowLinkModal(false);
                      setLinkData({ parentId: '', studentId: '' });
                    }}
                    className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleLink}
                    disabled={!linkData.studentId}
                    className={`px-6 py-2 rounded-lg font-semibold transition-colors ${linkData.studentId
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                  >
                    Link Student
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deleteParent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">Delete Parent Account?</h3>
            </div>
            <p className="text-gray-700 mb-4">
              Are you sure you want to delete <strong>{deleteParent.user?.firstName} {deleteParent.user?.lastName}</strong>?
            </p>
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded mb-4">
              <p className="text-sm text-yellow-700">
                <strong>Warning:</strong> This will delete the parent account and unlink all students. This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold">Delete Parent</button>
            </div>
          </div>
        </div>
      )}

      {/* Parent Credentials Modal */}
      {showCredentialsModal && parentCredentials && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="text-center mb-6">
              <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Parent Account Created!</h3>
              <p className="text-gray-600">Below are the login credentials for {parentCredentials.name}</p>
            </div>

            <div className="bg-gradient-to-r from-primary/5 to-primary/10 border-2 border-primary/20 rounded-lg p-6 mb-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-1">Username (Phone Number)</label>
                  <div className="bg-white rounded-lg p-3 border border-primary/30">
                    <span className="text-lg font-mono font-bold text-gray-900">{parentCredentials.username}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-1">Temporary Password</label>
                  <div className="bg-white rounded-lg p-3 border border-primary/30">
                    <span className="text-lg font-mono font-bold text-gray-900">{parentCredentials.password}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded mb-6">
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> The parent must change this password on first login for security.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  const text = `Parent Login Credentials\n\nName: ${parentCredentials.name}\nUsername: ${parentCredentials.username}\nPassword: ${parentCredentials.password}\n\nPlease change password on first login.`;
                  navigator.clipboard.writeText(text);
                  alert('Credentials copied to clipboard!');
                }}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:brightness-90 font-semibold flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print
              </button>
              <button
                onClick={() => {
                  setShowCredentialsModal(false);
                  setParentCredentials(null);
                }}
                className="flex-1 px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParentManagement;
