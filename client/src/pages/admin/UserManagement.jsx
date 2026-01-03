import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';
import { useReactToPrint } from 'react-to-print';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    firstName: '',
    lastName: '',
    role: 'teacher',
    admissionNumber: '', // for student
    staffId: '', // for teacher
    specialization: '' // for teacher
  });
  const [filter, setFilter] = useState('all'); // all, student, teacher, admin
  const [searchTerm, setSearchTerm] = useState('');
  const [generatedCredentials, setGeneratedCredentials] = useState(null);
  const credentialPrintRef = useRef();

  const handlePrintCredentials = useReactToPrint({
    contentRef: credentialPrintRef,
  });

  const { user: currentUser } = useAuth();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let response;
      if (editingUser) {
        // Remove password if empty during edit to avoid overwriting with empty string
        const dataToSend = { ...formData };
        if (!dataToSend.password) delete dataToSend.password;

        response = await api.put(`/api/users/${editingUser.id}`, dataToSend);
      } else {
        response = await api.post('/api/users', formData);
      }

      if (response.ok) {
        const result = await response.json();

        // Check if credentials were auto-generated (for teachers)
        if (result.generatedCredentials) {
          setGeneratedCredentials({
            name: `${result.firstName} ${result.lastName}`,
            ...result.generatedCredentials
          });
        } else {
          alert(editingUser ? 'User updated successfully!' : `✅ User created successfully!\n\nName: ${result.firstName} ${result.lastName}\nUsername: ${result.username}\nRole: ${result.role.toUpperCase()}`);
        }
        closeModal();
        fetchUsers();
      } else {
        const error = await response.json();
        alert(error.error || `Failed to ${editingUser ? 'update' : 'create'} user`);
      }
    } catch (error) {
      console.error('Error saving user:', error);
      alert(`Error ${editingUser ? 'updating' : 'creating'} user`);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '', // Don't show hash
      email: user.email || '',
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      admissionNumber: user.student?.admissionNumber || '',
      staffId: user.teacher?.staffId || '',
      specialization: user.teacher?.specialization || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (userId) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

    try {
      const response = await api.delete(`/api/users/${userId}`);
      if (response.ok) {
        alert('User deleted successfully');
        fetchUsers();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({
      username: '',
      password: '',
      email: '',
      firstName: '',
      lastName: '',
      role: 'teacher',
      admissionNumber: '',
      staffId: '',
      specialization: ''
    });
  };

  const filteredUsers = users.filter(user => {
    const matchesRole = filter === 'all' || user.role === filter;
    const matchesSearch =
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRole && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-primary text-white px-4 py-2 rounded-md hover:brightness-90 flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add New User
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow flex gap-4 items-center">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search users..."
            className="w-full border rounded-md px-3 py-2"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="border rounded-md px-3 py-2"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All Roles</option>
          <option value="student">Students</option>
          <option value="teacher">Teachers</option>
          <option value="accountant">Accountants</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white shadow sm:rounded-lg w-full">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center">Loading...</td>
                </tr>
              ) : filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {user.firstName[0]}{user.lastName[0]}
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                        user.role === 'teacher' ? 'bg-blue-100 text-blue-800' :
                          user.role === 'accountant' ? 'bg-orange-100 text-orange-800' :
                            'bg-green-100 text-green-800'}`}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.role === 'student' && (
                      <div>
                        <div>Adm: {user.student?.admissionNumber}</div>
                        <div>Class: {user.student?.classModel?.name || 'Unassigned'}</div>
                      </div>
                    )}
                    {user.role === 'teacher' && (
                      <div>
                        <div>Staff ID: {user.teacher?.staffId}</div>
                        <div>Spec: {user.teacher?.specialization}</div>
                      </div>
                    )}
                    {user.role === 'accountant' && <div>School Accountant</div>}
                    {user.role === 'admin' && <div>System Administrator</div>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(user)}
                      className="text-primary hover:text-primary mr-4"
                    >
                      Edit
                    </button>
                    {user.id !== currentUser?.id && (
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add User Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">{editingUser ? 'Edit User' : 'Add New User'}</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Role</label>
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                    >
                      <option value="teacher">Teacher</option>
                      <option value="accountant">Accountant</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">First Name</label>
                      <input
                        type="text"
                        name="firstName"
                        required
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Last Name</label>
                      <input
                        type="text"
                        name="lastName"
                        required
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                      />
                    </div>
                  </div>

                  {/* Hide username for new users - auto-generated */}
                  {editingUser && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Username</label>
                      <input
                        type="text"
                        name="username"
                        required
                        value={formData.username}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                      />
                    </div>
                  )}

                  {/* Hide password for new users - auto-generated */}
                  {editingUser && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Password
                      </label>
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                        placeholder="Leave blank to keep current"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email (Optional)</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                    />
                  </div>

                  {/* Teacher-specific fields */}
                  {formData.role === 'teacher' && (
                    <>
                      {/* Hide Staff ID for new teachers - auto-generated */}
                      {editingUser && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Staff ID</label>
                          <input
                            type="text"
                            name="staffId"
                            value={formData.staffId}
                            onChange={handleInputChange}
                            className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3 bg-gray-100"
                            readOnly
                          />
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Specialization</label>
                        <input
                          type="text"
                          name="specialization"
                          value={formData.specialization}
                          onChange={handleInputChange}
                          className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                        />
                      </div>
                    </>
                  )}

                  <div className="flex justify-end gap-3 mt-4">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-primary text-white px-4 py-2 rounded-md hover:brightness-90"
                    >
                      {editingUser ? 'Update User' : 'Create User'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* User Credentials Modal */}
      {generatedCredentials && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg w-96">
            <h2 className="text-2xl font-bold mb-6 text-center text-primary">{generatedCredentials.role} Credentials</h2>
            <div className="space-y-4 mb-6">
              <div className="bg-gray-50 p-4 rounded">
                <p className="text-sm text-gray-600">Name</p>
                <p className="font-bold">{generatedCredentials.name}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded">
                <p className="text-sm text-gray-600">Username</p>
                <p className="font-bold font-mono">{generatedCredentials.username}</p>
              </div>
              {generatedCredentials.staffId && (
                <div className="bg-gray-50 p-4 rounded">
                  <p className="text-sm text-gray-600">Staff ID</p>
                  <p className="font-bold font-mono">{generatedCredentials.staffId}</p>
                </div>
              )}
              <div className="bg-yellow-50 border border-yellow-300 p-4 rounded">
                <p className="text-sm text-gray-600">Password</p>
                <p className="font-bold text-xl font-mono text-red-600">{generatedCredentials.password}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-6 text-center">⚠️ Save these credentials securely</p>
            <div className="flex gap-3">
              <button onClick={handlePrintCredentials} className="flex-1 bg-primary text-white py-2 px-4 rounded hover:brightness-90">
                Print
              </button>
              <button onClick={() => setGeneratedCredentials(null)} className="flex-1 bg-gray-200 py-2 px-4 rounded hover:bg-gray-300">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Credentials */}
      <div style={{ position: "absolute", top: "-10000px" }} className="print-content">
        <div ref={credentialPrintRef} className="p-8">
          <h1 className="text-2xl font-bold mb-6">{generatedCredentials?.role} Login Credentials</h1>
          <div className="border-2 border-gray-300 p-6 rounded">
            <p className="mb-2">Name: <strong>{generatedCredentials?.name}</strong></p>
            <p className="mb-2">Username: <strong>{generatedCredentials?.username}</strong></p>
            {generatedCredentials?.staffId && (
              <p className="mb-2">Staff ID: <strong>{generatedCredentials.staffId}</strong></p>
            )}
            <p className="mb-4">Password: <strong className="text-2xl">{generatedCredentials?.password}</strong></p>
            <p className="text-sm text-gray-500">Generated: {new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
