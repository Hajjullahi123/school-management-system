import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api, API_BASE_URL } from '../../api';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    phone: '',
    firstName: '',
    lastName: '',
    role: 'teacher',
    admissionNumber: '', // for student
    staffId: '', // for teacher
    specialization: '', // for teacher
    isActive: true,
    classId: '',
    parentEmail: '',
    parentPhone: '',
    dateOfBirth: '',
    gender: '',
    stateOfOrigin: '',
    nationality: 'Nigerian',
    address: '',
    bloodGroup: '',
    genotype: '',
    disability: 'None',
    isScholarship: false,
    parentGuardianName: ''
  });

  const { user: currentUser } = useAuth();
  const location = useLocation();
  const [classes, setClasses] = useState([]);
  const [expandedRoles, setExpandedRoles] = useState({});
  const [filter, setFilter] = useState('all'); // all, student, teacher, admin
  const [searchTerm, setSearchTerm] = useState('');
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [generatedCredentials, setGeneratedCredentials] = useState(null);
  const handlePrintCredentials = () => {
    const originalTitle = document.title;
    if (generatedCredentials?.username) {
      document.title = `${generatedCredentials.username}_Credentials`;
    }
    window.print();
    document.title = originalTitle;
  };

  useEffect(() => {
    fetchUsers();
    fetchClasses();

    // Read role from URL if present
    const params = new URLSearchParams(location.search);
    const roleParam = params.get('role');
    if (roleParam) {
      setFilter(roleParam);
      setExpandedRoles(prev => ({ ...prev, [roleParam]: true }));
    }
  }, [location.search]);

  const fetchClasses = async () => {
    try {
      const response = await api.get('/api/classes');
      if (response.ok) {
        const data = await response.json();
        setClasses(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(Array.isArray(data) ? data : []);
      } else {
        console.error('Failed to fetch users:', response.status);
        setUsers([]);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setUsers([]);
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
        const dataToSend = { ...formData };
        if (!dataToSend.password) delete dataToSend.password;
        // Include new photo if selected
        if (photoFile && photoPreview.startsWith('data:')) {
          dataToSend.photoUrl = photoPreview;
        }
        response = await api.put(`/api/users/${editingUser.id}`, dataToSend);
      } else {
        const dataToSend = { ...formData };
        if (photoPreview && photoPreview.startsWith('data:')) {
          dataToSend.photoUrl = photoPreview;
        }
        response = await api.post('/api/users', dataToSend);
      }

      if (response.ok) {
        const result = await response.json();
        const isAdminRole = ['admin', 'principal', 'accountant', 'examination_officer', 'attendance_admin', 'teacher'].includes(result.role);

        if (result.generatedCredentials && (isAdminRole || !editingUser)) {
          setGeneratedCredentials({
            name: `${result.firstName} ${result.lastName}`,
            ...result.generatedCredentials
          });
        } else if (!editingUser) {
          alert(`✅ User created successfully!\n\nName: ${result.firstName} ${result.lastName}\nUsername: ${result.username}\nRole: ${result.role.toUpperCase()}`);
        } else {
          alert('User updated successfully!');
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
      password: '',
      email: user.email || '',
      phone: user.phone || '',
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      admissionNumber: user.student?.admissionNumber || '',
      staffId: user.teacher?.staffId || '',
      specialization: user.teacher?.specialization || '',
      isActive: user.isActive,
      // Additional student fields for edit
      dateOfBirth: user.student?.dateOfBirth ? user.student.dateOfBirth.split('T')[0] : '',
      gender: user.student?.gender || '',
      stateOfOrigin: user.student?.stateOfOrigin || '',
      nationality: user.student?.nationality || 'Nigerian',
      address: user.student?.address || '',
      bloodGroup: user.student?.bloodGroup || '',
      genotype: user.student?.genotype || '',
      disability: user.student?.disability || 'None',
      isScholarship: user.student?.isScholarship || false,
      parentGuardianName: user.student?.parentGuardianName || '',
      classId: user.student?.classId || '',
      parentEmail: user.student?.parentEmail || '',
      parentPhone: user.student?.parentPhone || ''
    });
    setShowModal(true);
    if (user.photoUrl) {
      setPhotoPreview(user.photoUrl.startsWith('data:') || user.photoUrl.startsWith('http') ? user.photoUrl : `${API_BASE_URL}${user.photoUrl}`);
    } else {
      setPhotoPreview(null);
    }
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
    setPhotoPreview(null);
    setPhotoFile(null);
    setFormData({
      username: '',
      password: '',
      email: '',
      phone: '',
      firstName: '',
      lastName: '',
      role: 'teacher',
      isActive: true,
      classId: '',
      parentEmail: '',
      parentPhone: '',
      dateOfBirth: '',
      gender: '',
      stateOfOrigin: '',
      nationality: 'Nigerian',
      address: '',
      bloodGroup: '',
      genotype: '',
      disability: 'None',
      isScholarship: false,
      parentGuardianName: ''
    });
  };

  // Helper: build a full display name from available name parts, filtering blanks
  const getDisplayName = (user) => {
    const parts = [
      user.firstName,
      user.student?.middleName,
      user.lastName
    ].filter(part => part && part.trim() !== '');
    return parts.join(' ') || user.username || '(No Name)';
  };

  // Helper: get initials from whatever name parts exist
  const getInitials = (user) => {
    const name = getDisplayName(user);
    const words = name.split(' ').filter(w => w.length > 0);
    if (words.length >= 2) return `${words[0][0]}${words[words.length - 1][0]}`;
    if (words.length === 1) return words[0][0];
    return '?';
  };

  const filteredUsers = users.filter(user => {
    const matchesRole = filter === 'all' || user.role === filter;
    const fullName = getDisplayName(user).toLowerCase();
    const matchesSearch =
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fullName.includes(searchTerm.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const toggleRole = (role) => {
    setExpandedRoles(prev => ({
      ...prev,
      [role]: !prev[role]
    }));
  };

  return (
    <div className="space-y-6 print:m-0 print:p-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2 print:hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight leading-none mb-1">Users Management</h1>
          <p className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-widest">System Access Control Hub</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Link
            to="/dashboard/bulk-student-upload"
            className="flex-1 sm:flex-none bg-amber-500 text-white px-4 py-3 rounded-2xl hover:brightness-110 flex items-center justify-center shadow-lg transition-all active:scale-95 text-[10px] font-black uppercase tracking-widest"
          >
            <svg className="w-4 h-4 mr-2 shrink-0 font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import
          </Link>
          <button
            onClick={() => setShowModal(true)}
            className="flex-1 sm:flex-none bg-primary text-white px-4 py-3 rounded-2xl hover:brightness-110 flex items-center justify-center shadow-lg transition-all active:scale-95 text-[10px] font-black uppercase tracking-widest"
          >
            <svg className="w-4 h-4 mr-2 shrink-0 font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
            </svg>
            Add New
          </button>
        </div>
      </div>

      <div className="bg-white p-3 sm:p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
        <div className="flex-1 relative group">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search users..."
            className="w-full border-2 border-gray-100 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-sm font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="border-2 border-gray-100 rounded-xl px-4 py-2.5 bg-gray-50 font-black text-[10px] uppercase tracking-widest text-gray-700 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all cursor-pointer"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">Global Catalog</option>
          <option value="admin">Administrators</option>
          <option value="examination_officer">Exam Officers</option>
          <option value="attendance_admin">Attendance Hub</option>
          <option value="teacher">Instructors</option>
          <option value="accountant">Audit/Account</option>
          <option value="principal">Head Office</option>
          <option value="parent">Guardians</option>
          <option value="student">Academy Pool</option>
        </select>
      </div>

      <div className="space-y-10">
        {loading ? (
          <div className="flex justify-center items-center h-64 bg-white rounded-2xl shadow-sm">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          ['admin', 'examination_officer', 'attendance_admin', 'principal', 'teacher', 'accountant', 'parent', 'student'].map(role => {
            const usersInRole = filteredUsers.filter(u => {
              if (role === 'parent') {
                return u.role === 'parent' || u.parent;
              }
              return u.role === role;
            });
            if (filter !== 'all' && filter !== role) return null;
            if (usersInRole.length === 0 && filter !== role) return null;

            const isExpanded = expandedRoles[role] || (filter !== 'all' && filter === role);

            return (
              <div key={role} className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 transition-all hover:shadow-2xl">
                {/* Category Header - Clickable for toggle */}
                <div
                  onClick={() => toggleRole(role)}
                  className={`px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between sm:items-center cursor-pointer select-none transition-colors border-b border-white/10 ${role === 'admin' ? 'bg-indigo-600 hover:bg-indigo-700' :
                    role === 'examination_officer' ? 'bg-cyan-600 hover:bg-cyan-700' :
                      role === 'attendance_admin' ? 'bg-fuchsia-600 hover:bg-fuchsia-700' :
                        role === 'principal' ? 'bg-purple-600 hover:bg-purple-700' :
                          role === 'teacher' ? 'bg-blue-600 hover:bg-blue-700' :
                            role === 'accountant' ? 'bg-amber-600 hover:bg-amber-700' :
                              role === 'parent' ? 'bg-rose-600 hover:bg-rose-700' :
                                'bg-emerald-600 hover:bg-emerald-700'
                    } text-white`}
                >
                  <div className="flex items-center gap-3 mb-3 sm:mb-0">
                    <span className="p-2 bg-white/20 rounded-lg shrink-0">
                      {role === 'admin' ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                      ) : role === 'examination_officer' ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      ) : role === 'attendance_admin' ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                      ) : role === 'principal' ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                      ) : role === 'teacher' ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                      ) : role === 'accountant' ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      ) : role === 'parent' ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      )}
                    </span>
                    <h2 className="text-sm sm:text-lg font-black uppercase tracking-widest leading-none">Catalog: {role}s</h2>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="bg-white/20 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                      {usersInRole.length} Members
                    </div>
                    <svg
                      className={`w-6 h-6 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                      <thead className="bg-gray-50/50">
                        <tr>
                          <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">User Profile</th>
                          <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Role Specifics</th>
                          <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                          <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-50">
                        {usersInRole.length === 0 ? (
                          <tr>
                            <td colSpan="4" className="px-6 py-10 text-center text-gray-400 italic">No {role}s found matching your search...</td>
                          </tr>
                        ) : (
                          usersInRole.map((user) => (
                            <tr key={user.id} className="hover:bg-gray-50 transition-colors group">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className={`h-11 w-11 rounded-2xl flex items-center justify-center text-white font-black shadow-lg transform transition-transform group-hover:rotate-6 overflow-hidden ${role === 'admin' ? 'bg-indigo-500' :
                                    role === 'examination_officer' ? 'bg-cyan-500' :
                                      role === 'attendance_admin' ? 'bg-fuchsia-500' :
                                        role === 'principal' ? 'bg-purple-500' :
                                          role === 'teacher' ? 'bg-blue-500' :
                                            role === 'accountant' ? 'bg-amber-500' :
                                              role === 'parent' ? 'bg-rose-500' :
                                                'bg-emerald-500'
                                    }`}>
                                    {(() => {
                                      const photoUrl = user.photoUrl || user.student?.photoUrl || user.teacher?.photoUrl;
                                      return photoUrl ? (
                                        <img src={photoUrl.startsWith('data:') || photoUrl.startsWith('http') ? photoUrl : `${API_BASE_URL}${photoUrl}`} alt="" className="w-full h-full object-cover" />
                                      ) : (
                                        <span>{getInitials(user)}</span>
                                      );
                                    })()}
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-black text-gray-900 uppercase tracking-tighter">{getDisplayName(user)}</div>
                                    <div className="text-xs text-gray-400 font-mono">@{user.username}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {role === 'student' && (
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1.5"><span className="text-[10px] font-black bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">ADM</span> {user.student?.admissionNumber}</div>
                                    <div className="flex items-center gap-1.5"><span className="text-[10px] font-black bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">CLASS</span> {user.student?.classModel?.name || '---'}</div>
                                  </div>
                                )}
                                {role === 'teacher' && (
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1.5"><span className="text-[10px] font-black bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">STAFF</span> {user.teacher?.staffId}</div>
                                    <div className="flex items-center gap-1.5"><span className="text-[10px] font-black bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">FLD</span> {user.teacher?.specialization || 'General'}</div>
                                  </div>
                                )}
                                {role === 'accountant' && <div className="text-amber-700 font-bold text-xs bg-amber-50 px-3 py-1 rounded-full w-fit border border-amber-100 tracking-tight">FINANCIAL DEPT</div>}
                                {role === 'principal' && (
                                  <div className="space-y-1">
                                    <div className="text-purple-700 font-bold text-xs bg-purple-50 px-3 py-1 rounded-full w-fit border border-purple-100 tracking-tight text-center">ACADEMIC PRINCIPAL</div>
                                    <div className="flex items-center gap-1.5"><span className="text-[10px] font-black bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">USER</span> {user.username}</div>
                                  </div>
                                )}
                                {role === 'admin' && <div className="text-indigo-700 font-bold text-xs bg-indigo-50 px-3 py-1 rounded-full w-fit border border-indigo-100 tracking-tight">SYSTEM ADMIN</div>}
                                {role === 'attendance_admin' && <div className="text-fuchsia-700 font-bold text-xs bg-fuchsia-50 px-3 py-1 rounded-full w-fit border border-fuchsia-100 tracking-tight text-center">ATTENDANCE & ACCESS</div>}
                                {role === 'parent' && (
                                  <div className="space-y-1">
                                    <div className="text-rose-700 font-bold text-xs bg-rose-50 px-3 py-1 rounded-full w-fit border border-rose-100 tracking-tight">GUARDIAN ACCOUNT</div>
                                    {user.parent?.students?.length > 0 && (
                                      <div className="flex flex-col gap-1 mt-1">
                                        {user.parent.students.map(student => (
                                          <div key={student.id} className="flex items-center gap-1.5" title="Linked Ward">
                                            <span className="text-[10px] font-black bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">WARD</span>
                                            <span className="text-xs text-gray-600 truncate max-w-[150px]">{[student.user?.firstName, student.user?.lastName].filter(p => p && p.trim()).join(' ') || '(Unknown)'}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <span className={`px-3 py-1 inline-flex text-[10px] leading-5 font-black rounded-full border ${user.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                                  }`}>
                                  {user.isActive ? 'ACTIVE' : 'LOCKED'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex justify-end gap-2">
                                  {role === 'student' && (
                                    <Link
                                      to="/dashboard/student-management"
                                      state={{ search: user.student?.admissionNumber }}
                                      className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                      title="Manage Full Profile"
                                    >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0c0 .884-.896 1.75-2.129 2.25M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    </Link>
                                  )}
                                  {user.id !== currentUser?.id && (
                                    <button onClick={() => handleDelete(user.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-all" title="Delete">
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm overflow-y-auto h-full w-full z-[100] flex items-center justify-center p-4">
          <div className="relative bg-white shadow-2xl rounded-[2.5rem] w-full max-w-sm sm:max-w-md p-6 sm:p-10 transform animate-in zoom-in-95 duration-300 border border-gray-100 my-8">
            <div className="flex justify-between items-center mb-8">
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
              <div className="flex items-center space-x-4 mb-4 bg-gray-50/50 p-4 rounded-2xl border-2 border-dashed border-gray-100">
                <div className="flex-shrink-0">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-16 h-16 rounded-full object-cover border-2 border-primary" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Profile Photo (Optional)</label>
                  <input type="file" accept="image/*" onChange={handlePhotoChange} className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-all" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Account Category</label>
                <select name="role" value={formData.role} onChange={handleInputChange} className="w-full border-2 border-gray-100 rounded-2xl py-3 px-4 bg-gray-50 font-black focus:ring-4 focus:ring-primary/10 outline-none appearance-none transition-all">
                  <option value="teacher">Instructor / Teacher</option>
                  <option value="examination_officer">Examination Officer</option>
                  <option value="attendance_admin">Attendance & Access Admin</option>
                  <option value="principal">School Principal</option>
                  <option value="accountant">Financial Accountant</option>
                  <option value="admin">System Admin</option>
                </select>
                {/* Singleton role warning */}
                {!editingUser && ['admin', 'principal', 'accountant', 'examination_officer', 'attendance_admin'].includes(formData.role) && (() => {
                  const roleLabel = formData.role === 'admin' ? 'System Admin' : formData.role === 'principal' ? 'School Principal' : formData.role === 'examination_officer' ? 'Examination Officer' : formData.role === 'attendance_admin' ? 'Attendance & Access Admin' : 'Financial Accountant';
                  const already = users.some(u => u.role === formData.role);
                  return already ? (
                    <div className="mt-2 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                      <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                      <p className="text-[11px] font-bold text-red-700">A <span className="uppercase">{roleLabel}</span> account already exists for this school. Only one is allowed.</p>
                    </div>
                  ) : null;
                })()}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">First Name</label>
                  <input type="text" name="firstName" required value={formData.firstName} onChange={handleInputChange} placeholder="Enter first name" className="w-full border-2 border-gray-100 rounded-2xl py-3 px-4 focus:ring-4 focus:ring-primary/10 outline-none font-black transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Last Name</label>
                  <input type="text" name="lastName" required value={formData.lastName} onChange={handleInputChange} placeholder="Enter last name" className="w-full border-2 border-gray-100 rounded-2xl py-3 px-4 focus:ring-4 focus:ring-primary/10 outline-none font-black transition-all" />
                </div>
              </div>
              {editingUser && (
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Identifier @Username</label>
                  <input type="text" name="username" required value={formData.username} onChange={handleInputChange} className="w-full border-2 border-gray-100 rounded-2xl py-3 px-4 bg-gray-100 font-black outline-none" />
                </div>
              )}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Secure Password</label>
                <input type="password" name="password" value={formData.password} onChange={handleInputChange} autoComplete="new-password" placeholder={editingUser ? "••••••••" : "Enter secure password"} className="w-full border-2 border-gray-100 rounded-2xl py-3 px-4 focus:ring-4 focus:ring-primary/10 outline-none font-black transition-all" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Email Connection</label>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} autoComplete="off" placeholder="user@example.com" className="w-full border-2 border-gray-100 rounded-2xl py-3 px-4 focus:ring-4 focus:ring-primary/10 outline-none font-black transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Phone Number</label>
                  <input type="text" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="08012345678" className="w-full border-2 border-gray-100 rounded-2xl py-3 px-4 focus:ring-4 focus:ring-primary/10 outline-none font-black transition-all" />
                </div>
              </div>

              {/* Student Specific Fields */}
              {formData.role === 'student' && (
                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <h4 className="text-[10px] font-black text-primary uppercase tracking-widest ml-1">Student Particulars</h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Admission Number</label>
                      <input type="text" name="admissionNumber" value={formData.admissionNumber} onChange={handleInputChange} className="w-full border-2 border-gray-100 rounded-2xl py-3 px-4 focus:ring-4 focus:ring-primary/10 outline-none font-black" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Class</label>
                      <select name="classId" value={formData.classId} onChange={handleInputChange} className="w-full border-2 border-gray-100 rounded-2xl py-3 px-4 focus:ring-4 focus:ring-primary/10 outline-none font-black">
                        <option value="">Unassigned</option>
                        {classes.map(c => (
                          <option key={c.id} value={c.id}>{c.name} {c.arm}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Parent Name</label>
                      <input type="text" name="parentGuardianName" value={formData.parentGuardianName} onChange={handleInputChange} className="w-full border-2 border-gray-100 rounded-2xl py-3 px-4 focus:ring-4 focus:ring-primary/10 outline-none font-black" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Parent Phone</label>
                      <input type="text" name="parentPhone" value={formData.parentPhone} onChange={handleInputChange} className="w-full border-2 border-gray-100 rounded-2xl py-3 px-4 focus:ring-4 focus:ring-primary/10 outline-none font-black" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Parent Email</label>
                    <input type="email" name="parentEmail" value={formData.parentEmail} onChange={handleInputChange} className="w-full border-2 border-gray-100 rounded-2xl py-3 px-4 focus:ring-4 focus:ring-primary/10 outline-none font-black" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Gender</label>
                      <select name="gender" value={formData.gender} onChange={handleInputChange} className="w-full border-2 border-gray-100 rounded-2xl py-3 px-4 focus:ring-4 focus:ring-primary/10 outline-none font-black">
                        <option value="">Select</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">DOB</label>
                      <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleInputChange} className="w-full border-2 border-gray-100 rounded-2xl py-3 px-4 focus:ring-4 focus:ring-primary/10 outline-none font-black" />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 py-2 bg-blue-50/50 p-4 rounded-2xl border-2 border-dashed border-blue-100">
                    <input type="checkbox" id="isScholarship" checked={formData.isScholarship} onChange={(e) => setFormData(prev => ({ ...prev, isScholarship: e.target.checked }))} className="w-6 h-6 accent-primary rounded-lg" />
                    <label htmlFor="isScholarship" className="text-xs font-black text-blue-700 uppercase tracking-tight">On Scholarship (Fees Exempt)</label>
                  </div>
                </div>
              )}
              {(formData.role === 'teacher' || (editingUser && editingUser.role === 'teacher')) && (
                <>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Specialization / Subject Area</label>
                    <input
                      type="text"
                      name="specialization"
                      value={formData.specialization}
                      onChange={handleInputChange}
                      placeholder="e.g., Mathematics, English, Science"
                      className="w-full border-2 border-gray-100 rounded-2xl py-3 px-4 focus:ring-4 focus:ring-primary/10 outline-none font-black transition-all"
                    />
                  </div>
                </>
              )}
              {editingUser && (
                <div className="flex items-center gap-3 py-2 bg-gray-50 p-4 rounded-2xl border-2 border-dashed border-gray-100">
                  <input type="checkbox" id="isActive" checked={formData.isActive} onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))} className="w-6 h-6 accent-primary rounded-lg" />
                  <label htmlFor="isActive" className="text-sm font-black text-gray-700 uppercase tracking-tight">Active Status Locked</label>
                </div>
              )}
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={closeModal} className="flex-1 bg-gray-100 text-gray-600 font-black py-4 rounded-2xl hover:bg-gray-200 transition-all uppercase text-xs tracking-widest">Cancel</button>
                <button
                  type="submit"
                  disabled={!editingUser && ['admin', 'principal', 'accountant', 'examination_officer', 'attendance_admin'].includes(formData.role) && users.some(u => u.role === formData.role)}
                  className="flex-1 bg-primary text-white font-black py-4 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20 uppercase text-xs tracking-widest disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
                >Confirm</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {generatedCredentials && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-[100] p-4 print:hidden">
          <div className="bg-white p-10 rounded-[3rem] w-full max-w-sm shadow-2xl relative border-4 border-primary/20">
            <h2 className="text-3xl font-black mb-1 text-center text-primary uppercase tracking-tighter">Accredited!</h2>
            <p className="text-center text-gray-400 text-[10px] font-black uppercase tracking-[0.3em] mb-10">Access Protocol Ready</p>
            <div className="space-y-6 mb-10">
              <div className="text-center">
                <p className="text-[10px] font-black text-gray-300 uppercase mb-1">Target Account</p>
                <p className="text-xl font-black text-gray-800 uppercase leading-none">{generatedCredentials.name}</p>
              </div>
              <div className="bg-gray-50 p-6 rounded-[2rem] text-center border-2 border-gray-100">
                <p className="text-[10px] font-black text-primary uppercase mb-2">Handle</p>
                <p className="text-2xl font-black font-mono tracking-tighter mb-4">{generatedCredentials.username}</p>
                <p className="text-[10px] font-black text-rose-500 uppercase mb-2">Secret Code</p>
                <p className="text-4xl font-black font-mono tracking-widest text-rose-600">{generatedCredentials.password}</p>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={handlePrintCredentials} className="w-full bg-primary text-white py-5 rounded-3xl font-black text-lg shadow-2xl shadow-primary/30 hover:scale-[1.03] transition-all">PRINT PASS</button>
              <button onClick={() => setGeneratedCredentials(null)} className="w-full text-gray-400 font-black py-3 uppercase text-[10px] tracking-widest hover:text-gray-600 transition-colors">Dismiss Information</button>
            </div>
          </div>
        </div>
      )}

      {/* Print-only View */}
      {generatedCredentials && (
        <div className="hidden print:block print:absolute print:inset-0 print:bg-white print:z-[9999]">
          <div className="p-10 text-gray-900 border-[8px] border-primary/10 rounded-[3rem] bg-white h-auto max-w-3xl mx-auto mt-10">
            <div className="flex justify-between items-end mb-12 border-b-4 border-gray-100 pb-6">
              <div>
                <h1 className="text-5xl font-black uppercase tracking-tighter mb-2">Security ID</h1>
                <p className="text-primary font-black tracking-[0.4em] uppercase text-xs">Official System Credentials</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Generation Date</p>
                <p className="text-lg font-black">{new Date().toLocaleDateString()}</p>
              </div>
            </div>

            <div className="flex gap-8 mb-12">
              <div className="flex-1 bg-gray-50 p-8 rounded-[2rem]">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Account Holder</p>
                <p className="text-2xl font-black text-gray-900 uppercase tracking-tighter break-all">{generatedCredentials?.name}</p>
              </div>
              <div className="flex-1 bg-gray-50 p-8 rounded-[2rem]">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Access Role</p>
                <p className="text-2xl font-black text-primary uppercase tracking-tighter">{generatedCredentials?.role}</p>
              </div>
            </div>

            <div className="bg-gray-900 text-white p-12 rounded-[3rem] text-center shadow-inner">
              <p className="text-[10px] font-black text-white/30 uppercase mb-8 tracking-[1em]">Authentication Payload</p>
              <div className="flex gap-6 mb-2">
                <div className="flex-1 border-r border-white/10 px-4">
                  <p className="text-[10px] font-black uppercase opacity-40 mb-2">Username</p>
                  <p className="text-xl font-mono font-black tracking-tighter break-all">{generatedCredentials?.username}</p>
                </div>
                <div className="flex-1 px-4">
                  <p className="text-[10px] font-black uppercase opacity-40 mb-2">Access Key</p>
                  <p className="text-xl font-mono font-black text-rose-400 tracking-[0.2em] break-all">{generatedCredentials?.password}</p>
                </div>
              </div>
            </div>

            <div className="mt-12 text-center">
              <p className="text-[10px] font-black text-gray-400 uppercase max-w-sm mx-auto leading-relaxed">Please update your password immediately after initial login. Keep this document in a safe environment.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
