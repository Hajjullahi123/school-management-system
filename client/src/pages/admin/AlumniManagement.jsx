import React, { useState, useEffect, useRef } from 'react';
import { api, API_BASE_URL } from '../../api';
import { formatNumber } from '../../utils/formatters';
import { useSchoolSettings } from '../../hooks/useSchoolSettings';
import AlumniIDCard from '../../components/AlumniIDCard';
import { useReactToPrint } from 'react-to-print';

const AlumniManagement = () => {
  const { settings: schoolSettings } = useSchoolSettings();
  const [activeTab, setActiveTab] = useState('directory');
  const [alumniList, setAlumniList] = useState([]);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [selectedAlumni, setSelectedAlumni] = useState(null);
  const [editingDonation, setEditingDonation] = useState(null);
  const [generatedCredentials, setGeneratedCredentials] = useState(null);
  const [editingAlumni, setEditingAlumni] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [expandedYears, setExpandedYears] = useState({});
  const [registrationMethod, setRegistrationMethod] = useState('promotion'); // 'promotion' or 'direct'

  // Form States
  const [createForm, setCreateForm] = useState({ studentId: '', graduationYear: new Date().getFullYear(), alumniId: '' });
  const [donationForm, setDonationForm] = useState({ donorName: '', amount: '', message: '', isAnonymous: false, alumniId: '' });

  // Direct Registration Form State
  const [directRegForm, setDirectRegForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    dateOfBirth: '',
    gender: '',
    stateOfOrigin: '',
    nationality: 'Nigerian',
    address: '',
    graduationYear: new Date().getFullYear(),
    classGraduated: '',
    currentJob: '',
    currentCompany: '',
    university: '',
    courseOfStudy: '',
    bio: '',
    linkedinUrl: '',
    twitterUrl: '',
    portfolioUrl: '',
    skills: '',
    achievements: '',
    parentGuardianName: '',
    parentGuardianPhone: '',
    parentEmail: '',
    bloodGroup: '',
    genotype: '',
    disability: 'None'
  });

  const componentRef = useRef();
  const credentialPrintRef = useRef();

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
  });

  const handlePrintCredentials = useReactToPrint({
    contentRef: credentialPrintRef,
  });

  useEffect(() => {
    fetchAlumni();
    fetchDonations();
  }, []);

  const fetchAlumni = async () => {
    setLoading(true);
    try {
      const sId = schoolSettings?.schoolId;
      const res = await api.get(`/api/alumni/directory${sId ? `?school=${sId}` : ''}`);
      if (res.ok) setAlumniList(await res.json());
    } catch (error) {
      console.error('Error fetching alumni:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDonations = async () => {
    try {
      const res = await api.get('/api/alumni/donations');
      if (res.ok) setDonations(await res.json());
    } catch (err) { console.error(err); }
  };

  const handleCreateAlumni = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/api/alumni/admin/create', createForm);
      if (res.ok) {
        alert('Alumni created successfully!');
        setShowCreateModal(false);
        fetchAlumni();
        setCreateForm({ studentId: '', graduationYear: new Date().getFullYear(), alumniId: '' });
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create');
      }
    } catch (err) {
      alert('Error creating alumni');
    }
  };

  const handleDirectRegistration = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/api/alumni/admin/register-direct', directRegForm);
      const data = await res.json();

      if (res.ok) {
        // Show credentials modal
        setGeneratedCredentials({
          username: data.credentials.username,
          password: data.credentials.password,
          name: `${directRegForm.firstName} ${directRegForm.lastName}`,
          email: data.credentials.email
        });

        alert('Alumni registered successfully!');
        setShowCreateModal(false);
        fetchAlumni();

        // Reset form
        setDirectRegForm({
          firstName: '',
          middleName: '',
          lastName: '',
          email: '',
          dateOfBirth: '',
          gender: '',
          stateOfOrigin: '',
          nationality: 'Nigerian',
          address: '',
          graduationYear: new Date().getFullYear(),
          classGraduated: '',
          currentJob: '',
          currentCompany: '',
          university: '',
          courseOfStudy: '',
          bio: '',
          linkedinUrl: '',
          twitterUrl: '',
          portfolioUrl: '',
          skills: '',
          achievements: '',
          parentGuardianName: '',
          parentGuardianPhone: '',
          parentEmail: '',
          bloodGroup: '',
          genotype: '',
          disability: 'None'
        });
      } else {
        alert(data.error || 'Failed to register alumni');
      }
    } catch (err) {
      console.error('Error registering alumni:', err);
      alert('Error registering alumni');
    }
  };

  const handleGenerateCredentials = async (studentId) => {
    console.log('Generate credentials clicked for student ID:', studentId);
    if (!confirm('Generate/Reset credentials for this alumni?')) {
      console.log('User cancelled confirmation');
      return;
    }
    console.log('Starting credential generation API call...');
    try {
      const res = await api.post('/api/alumni/admin/generate-credentials', { studentId });
      console.log('API response status:', res.status);
      const data = await res.json();
      console.log('API response data:', data);
      if (res.ok) {
        setGeneratedCredentials({
          username: data.username,
          password: data.password,
          name: alumniList.find(a => a.student.id === studentId)?.student?.user?.firstName || 'Alumni'
        });
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error('Error generating credentials:', err);
      alert('Error generating credentials');
    }
  };

  const handleRecordDonation = async (e) => {
    e.preventDefault();
    try {
      let res;
      if (editingDonation) {
        res = await api.put(`/api/alumni/donation/${editingDonation.id}`, donationForm);
      } else {
        res = await api.post('/api/alumni/donation', donationForm);
      }

      if (res.ok) {
        alert(editingDonation ? 'Donation updated!' : 'Donation recorded!');
        setShowDonationModal(false);
        setEditingDonation(null);
        fetchDonations();
        setDonationForm({ donorName: '', amount: '', message: '', isAnonymous: false, alumniId: '' });
      }
    } catch (error) {
      alert('Failed to save donation');
    }
  };

  const handleDeleteDonation = async (id) => {
    if (!confirm('Are you sure you want to delete this donation?')) return;
    try {
      const res = await api.delete(`/api/alumni/donation/${id}`);
      if (res.ok) {
        fetchDonations();
        alert('Donation deleted');
      }
    } catch (error) {
      alert('Failed to delete');
    }
  };

  const openDonationModal = (donation = null) => {
    if (donation) {
      setEditingDonation(donation);
      setDonationForm({
        donorName: donation.donorName,
        amount: donation.amount,
        message: donation.message || '',
        isAnonymous: donation.isAnonymous,
        alumniId: donation.alumniId || ''
      });
    } else {
      setEditingDonation(null);
      setDonationForm({ donorName: '', amount: '', message: '', isAnonymous: false, alumniId: '' });
    }
    setShowDonationModal(true);
  };

  const handleEditAlumni = (alumni) => {
    setEditingAlumni({
      id: alumni.id,
      currentJob: alumni.currentJob || '',
      currentCompany: alumni.currentCompany || '',
      university: alumni.university || '',
      courseOfStudy: alumni.courseOfStudy || '',
      bio: alumni.bio || '',
      linkedinUrl: alumni.linkedinUrl || '',
      twitterUrl: alumni.twitterUrl || '',
      portfolioUrl: alumni.portfolioUrl || '',
      skills: alumni.skills || '',
      achievements: alumni.achievements || '',
      profilePicture: alumni.profilePicture || ''
    });
    setShowEditModal(true);
  };

  const handleUpdateAlumni = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put(`/api/alumni/${editingAlumni.id}`, editingAlumni);
      if (res.ok) {
        alert('Alumni profile updated successfully!');
        setShowEditModal(false);
        setEditingAlumni(null);
        fetchAlumni();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update');
      }
    } catch (err) {
      alert('Error updating alumni profile');
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setUploadingPhoto(true);
    const formData = new FormData();
    formData.append('photo', file);

    try {
      const response = await api.post(`/api/alumni/${editingAlumni.id}/photo`, formData, {
        headers: {
          // Let browser set Content-Type for FormData
        }
      });

      if (response.ok) {
        const data = await response.json();
        const fullPhotoUrl = `${API_BASE_URL}${data.photoUrl}`;
        setEditingAlumni({ ...editingAlumni, profilePicture: fullPhotoUrl });
        alert('Photo uploaded successfully!');
        // Refresh alumni list to show updated photo
        fetchAlumni();
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to upload photo');
      }
    } catch (error) {
      console.error('Photo upload error:', error);
      alert('Error uploading photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const filteredAlumni = alumniList.filter(a =>
    a.student?.user?.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.student?.user?.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.alumniId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group alumni by graduation year
  const alumniByYear = filteredAlumni.reduce((groups, alumni) => {
    const year = alumni.graduationYear;
    if (!groups[year]) {
      groups[year] = [];
    }
    groups[year].push(alumni);
    return groups;
  }, {});

  // Sort years in descending order (newest first)
  const sortedYears = Object.keys(alumniByYear).sort((a, b) => b - a);

  const toggleYear = (year) => {
    setExpandedYears(prev => ({
      ...prev,
      [year]: !prev[year]
    }));
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Alumni Management System</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-primary">
          <h3 className="text-gray-500 text-sm font-medium">Total Alumni</h3>
          <p className="text-3xl font-bold mt-2">{alumniList.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
          <h3 className="text-gray-500 text-sm font-medium">Total Donations</h3>
          <p className="text-3xl font-bold mt-2">
            ₦{formatNumber(donations.reduce((acc, curr) => acc + curr.amount, 0))}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-yellow-500">
          <h3 className="text-gray-500 text-sm font-medium">Recent Activity</h3>
          <p className="text-lg font-semibold mt-2">{donations.length} new donations</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 border-b mb-6">
        <button
          onClick={() => setActiveTab('directory')}
          className={`pb-2 px-4 ${activeTab === 'directory' ? 'border-b-2 border-primary text-primary font-medium' : 'text-gray-500'}`}
        >
          Alumni Directory
        </button>
        <button
          onClick={() => setActiveTab('donations')}
          className={`pb-2 px-4 ${activeTab === 'donations' ? 'border-b-2 border-primary text-primary font-medium' : 'text-gray-500'}`}
        >
          Donations & Funds
        </button>
      </div>

      {/* Directory Tab */}
      {activeTab === 'directory' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <input
              type="text"
              placeholder="Search alumni..."
              className="border rounded-md px-4 py-2 w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-primary text-white px-4 py-2 rounded-md hover:bg-opacity-90"
            >
              + Create Alumni
            </button>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : sortedYears.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No alumni found</div>
            ) : (
              sortedYears.map(year => (
                <div key={year} className="border rounded-lg overflow-hidden">
                  {/* Year Header - Clickable */}
                  <button
                    onClick={() => toggleYear(year)}
                    className="w-full bg-gray-50 hover:bg-gray-100 px-6 py-4 flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <svg
                        className={`w-5 h-5 text-gray-600 transition-transform ${expandedYears[year] ? 'rotate-90' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <h3 className="text-lg font-semibold text-gray-800">
                        Class of {year}
                      </h3>
                      <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                        {alumniByYear[year].length} {alumniByYear[year].length === 1 ? 'Alumni' : 'Alumni'}
                      </span>
                    </div>
                  </button>

                  {/* Alumni Table - Expandable */}
                  {expandedYears[year] && (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Profile</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Alumni ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Generate/Reset</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {alumniByYear[year].map((alumni) => (
                            <tr key={alumni.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center text-primary font-bold">
                                    {alumni.student.user.firstName[0]}{alumni.student.user.lastName[0]}
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-gray-900">
                                      {alumni.student.user.firstName} {alumni.student.user.lastName}
                                    </div>
                                    <div className="text-sm text-gray-500">{alumni.currentJob || 'No job listed'}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">{alumni.alumniId || '-'}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {alumni.student.user.username && alumni.student.user.username === alumni.alumniId ? (
                                  <button
                                    onClick={() => handleGenerateCredentials(alumni.student.id)}
                                    className="text-orange-600 hover:text-orange-900 text-sm font-medium"
                                  >
                                    Reset
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleGenerateCredentials(alumni.student.id)}
                                    className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                                  >
                                    Generate
                                  </button>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button
                                  onClick={() => handleEditAlumni(alumni)}
                                  className="text-blue-600 hover:text-blue-900 mr-4"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedAlumni(alumni);
                                    setTimeout(handlePrint, 100);
                                  }}
                                  className="text-primary hover:text-primary-dark"
                                >
                                  Print ID
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Donation Modal */}
      {activeTab === 'donations' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Donation History</h3>
            <button
              onClick={() => openDonationModal()}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
            >
              + Record Donation
            </button>
          </div>
          <div className="space-y-4">
            {donations.map(donation => (
              <div key={donation.id} className="border p-4 rounded-lg flex justify-between items-center">
                <div>
                  <p className="font-bold text-gray-800">{donation.isAnonymous ? 'Anonymous' : donation.donorName}</p>
                  <p className="text-sm text-gray-600">{donation.message || 'No message'}</p>
                  <p className="text-xs text-gray-400">{new Date(donation.date).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xl font-bold text-green-600">₦{formatNumber(donation.amount)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openDonationModal(donation)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteDonation(donation.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hidden Print Components - Positioned off-screen to ensure they render for printing */}
      <div className="print-content" style={{ position: 'absolute', top: '-10000px', left: '-10000px' }}>
        <div ref={componentRef} className="p-8">
          {selectedAlumni && <AlumniIDCard alumni={selectedAlumni} schoolSettings={schoolSettings} />}
        </div>

        {/* Printable Credential Slip */}
        <div ref={credentialPrintRef} className="p-8 font-sans">
          {generatedCredentials && (
            <div className="border border-gray-300 p-8 max-w-lg mx-auto text-center rounded-lg">
              <div className="mb-4">
                <h1 className="text-2xl font-bold uppercase">{schoolSettings?.schoolName || 'School Name'}</h1>
                <p className="text-gray-500">Alumni Portal Credentials</p>
              </div>
              <hr className="my-4 border-gray-200" />
              <div className="text-left space-y-4 my-6">
                <div>
                  <p className="text-sm text-gray-500 uppercase">Username / Alumni ID</p>
                  <p className="text-xl font-mono font-bold">{generatedCredentials.username}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 uppercase">Password</p>
                  <p className="text-xl font-mono font-bold bg-gray-100 p-2 rounded inline-block">
                    {generatedCredentials.password}
                  </p>
                </div>
              </div>
              <div className="mt-8 text-sm text-gray-500">
                <p>Please log in and change your password immediately.</p>
                <p className="mt-2">Visit the Alumni Portal to access your benefits.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Credentials Modal */}
      {generatedCredentials && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96 text-center">
            <div className="mb-4 text-green-600">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-2">Credentials Generated</h2>
            <p className="text-gray-600 mb-6">A new password has been generated for this alumni.</p>

            <div className="bg-gray-50 p-4 rounded-md mb-6 text-left">
              <div className="mb-2">
                <span className="text-xs text-gray-500 uppercase block">Username</span>
                <span className="font-mono font-bold">{generatedCredentials.username}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase block">Password</span>
                <span className="font-mono font-bold select-all">{generatedCredentials.password}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={handlePrintCredentials}
                className="w-full bg-primary text-white py-2 rounded-md hover:brightness-90 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Slip
              </button>
              <button
                onClick={() => setGeneratedCredentials(null)}
                className="w-full text-gray-500 py-2 hover:bg-gray-100 rounded-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto p-4">
          <div className="bg-white p-6 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Add Alumni</h2>

            {/* Registration Method Toggle */}
            <div className="mb-6 border rounded-lg p-4 bg-gray-50">
              <label className="block text-sm font-medium mb-3">Registration Method</label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setRegistrationMethod('promotion')}
                  className={`flex-1 p-3 rounded-md border-2 transition-colors ${registrationMethod === 'promotion'
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'border-gray-300 bg-white hover:border-primary/50'
                    }`}
                >
                  <div className="text-center">
                    <div className="font-semibold">Promote Existing Student</div>
                    <div className="text-xs mt-1">For students already in the system</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setRegistrationMethod('direct')}
                  className={`flex-1 p-3 rounded-md border-2 transition-colors ${registrationMethod === 'direct'
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'border-gray-300 bg-white hover:border-primary/50'
                    }`}
                >
                  <div className="text-center">
                    <div className="font-semibold">Register New Alumni</div>
                    <div className="text-xs mt-1">For alumni not previously in the system</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Promotion Form */}
            {registrationMethod === 'promotion' && (
              <form onSubmit={handleCreateAlumni}>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Student ID (Internal)</label>
                  <input
                    type="number"
                    required
                    className="w-full border p-2 rounded"
                    value={createForm.studentId}
                    onChange={e => setCreateForm({ ...createForm, studentId: e.target.value })}
                    placeholder="e.g., 123"
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter the internal database ID of the student</p>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Graduation Year</label>
                  <input
                    type="number"
                    required
                    className="w-full border p-2 rounded"
                    value={createForm.graduationYear}
                    onChange={e => setCreateForm({ ...createForm, graduationYear: e.target.value })}
                    min="1950"
                    max={new Date().getFullYear() + 5}
                  />
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-primary text-white rounded hover:brightness-90">Promote to Alumni</button>
                </div>
              </form>
            )}

            {/* Direct Registration Form */}
            {registrationMethod === 'direct' && (
              <form onSubmit={handleDirectRegistration} className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h4 className="font-medium text-gray-700 mb-3 border-b pb-2">Basic Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full border rounded-md px-3 py-2"
                        value={directRegForm.firstName}
                        onChange={e => setDirectRegForm({ ...directRegForm, firstName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Middle Name</label>
                      <input
                        type="text"
                        className="w-full border rounded-md px-3 py-2"
                        value={directRegForm.middleName}
                        onChange={e => setDirectRegForm({ ...directRegForm, middleName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full border rounded-md px-3 py-2"
                        value={directRegForm.lastName}
                        onChange={e => setDirectRegForm({ ...directRegForm, lastName: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email (Optional)</label>
                      <input
                        type="email"
                        className="w-full border rounded-md px-3 py-2"
                        value={directRegForm.email}
                        onChange={e => setDirectRegForm({ ...directRegForm, email: e.target.value })}
                        placeholder="Auto-generated if empty"
                      />
                    </div>
                  </div>
                </div>

                {/* Personal Information */}
                <div>
                  <h4 className="font-medium text-gray-700 mb-3 border-b pb-2">Personal Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                      <input
                        type="date"
                        className="w-full border rounded-md px-3 py-2"
                        value={directRegForm.dateOfBirth}
                        onChange={e => setDirectRegForm({ ...directRegForm, dateOfBirth: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                      <select
                        className="w-full border rounded-md px-3 py-2"
                        value={directRegForm.gender}
                        onChange={e => setDirectRegForm({ ...directRegForm, gender: e.target.value })}
                      >
                        <option value="">Select</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">State of Origin</label>
                      <input
                        type="text"
                        className="w-full border rounded-md px-3 py-2"
                        value={directRegForm.stateOfOrigin}
                        onChange={e => setDirectRegForm({ ...directRegForm, stateOfOrigin: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                      <input
                        type="text"
                        className="w-full border rounded-md px-3 py-2"
                        value={directRegForm.address}
                        onChange={e => setDirectRegForm({ ...directRegForm, address: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Academic Information */}
                <div>
                  <h4 className="font-medium text-gray-700 mb-3 border-b pb-2">Academic Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Graduation Year <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        className="w-full border rounded-md px-3 py-2"
                        value={directRegForm.graduationYear}
                        onChange={e => setDirectRegForm({ ...directRegForm, graduationYear: e.target.value })}
                        min="1950"
                        max={new Date().getFullYear() + 5}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Class Graduated From</label>
                      <input
                        type="text"
                        className="w-full border rounded-md px-3 py-2"
                        value={directRegForm.classGraduated}
                        onChange={e => setDirectRegForm({ ...directRegForm, classGraduated: e.target.value })}
                        placeholder="e.g., SS3 A"
                      />
                    </div>
                  </div>
                </div>

                {/* Alumni Professional Information */}
                <div>
                  <h4 className="font-medium text-gray-700 mb-3 border-b pb-2">Professional Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Current Job</label>
                      <input
                        type="text"
                        className="w-full border rounded-md px-3 py-2"
                        value={directRegForm.currentJob}
                        onChange={e => setDirectRegForm({ ...directRegForm, currentJob: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Current Company</label>
                      <input
                        type="text"
                        className="w-full border rounded-md px-3 py-2"
                        value={directRegForm.currentCompany}
                        onChange={e => setDirectRegForm({ ...directRegForm, currentCompany: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">University</label>
                      <input
                        type="text"
                        className="w-full border rounded-md px-3 py-2"
                        value={directRegForm.university}
                        onChange={e => setDirectRegForm({ ...directRegForm, university: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Course of Study</label>
                      <input
                        type="text"
                        className="w-full border rounded-md px-3 py-2"
                        value={directRegForm.courseOfStudy}
                        onChange={e => setDirectRegForm({ ...directRegForm, courseOfStudy: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                      <textarea
                        className="w-full border rounded-md px-3 py-2"
                        rows="3"
                        value={directRegForm.bio}
                        onChange={e => setDirectRegForm({ ...directRegForm, bio: e.target.value })}
                        placeholder="Brief biography..."
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Skills (comma separated)</label>
                      <input
                        type="text"
                        className="w-full border rounded-md px-3 py-2"
                        value={directRegForm.skills}
                        onChange={e => setDirectRegForm({ ...directRegForm, skills: e.target.value })}
                        placeholder="e.g., Programming, Design, Marketing"
                      />
                    </div>
                  </div>
                </div>

                {/* Social Links - Collapsible */}
                <details className="bg-gray-50 p-4 rounded-lg">
                  <summary className="cursor-pointer font-medium text-gray-700">Social Links (Optional)</summary>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
                      <input
                        type="url"
                        className="w-full border rounded-md px-3 py-2"
                        value={directRegForm.linkedinUrl}
                        onChange={e => setDirectRegForm({ ...directRegForm, linkedinUrl: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Twitter URL</label>
                      <input
                        type="url"
                        className="w-full border rounded-md px-3 py-2"
                        value={directRegForm.twitterUrl}
                        onChange={e => setDirectRegForm({ ...directRegForm, twitterUrl: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Portfolio URL</label>
                      <input
                        type="url"
                        className="w-full border rounded-md px-3 py-2"
                        value={directRegForm.portfolioUrl}
                        onChange={e => setDirectRegForm({ ...directRegForm, portfolioUrl: e.target.value })}
                      />
                    </div>
                  </div>
                </details>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-primary text-white rounded hover:brightness-90 transition-colors"
                  >
                    Register Alumni
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {showDonationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-xl font-bold mb-4">{editingDonation ? 'Edit Donation' : 'Record Donation'}</h2>
            <form onSubmit={handleRecordDonation}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-gray-700">Select Alumni (Optional)</label>
                <select
                  className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                  value={donationForm.alumniId}
                  onChange={e => {
                    const id = e.target.value;
                    const alum = alumniList.find(a => a.id.toString() === id);
                    if (alum) {
                      setDonationForm({
                        ...donationForm,
                        alumniId: id,
                        donorName: `${alum.student.user.firstName} ${alum.student.user.lastName}`
                      });
                    } else {
                      setDonationForm({ ...donationForm, alumniId: '', donorName: '' });
                    }
                  }}
                >
                  <option value="">-- External Donor / Not Listed --</option>
                  {(Array.isArray(alumniList) ? [...alumniList] : []).sort((a, b) => a.student.user.firstName.localeCompare(b.student.user.firstName)).map(a => (
                    <option key={a.id} value={a.id}>
                      {a.student.user.firstName} {a.student.user.lastName} (Class of {a.graduationYear})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-500 mt-1 italic">Picking an alumni ensures the donation appears on their private dashboard.</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Donor Name</label>
                <input
                  type="text"
                  required
                  className="w-full border p-2 rounded"
                  value={donationForm.donorName}
                  onChange={e => setDonationForm({ ...donationForm, donorName: e.target.value })}
                  placeholder="e.g. John Doe"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Amount (₦)</label>
                <input
                  type="number"
                  required
                  className="w-full border p-2 rounded"
                  value={donationForm.amount}
                  onChange={e => setDonationForm({ ...donationForm, amount: e.target.value })}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Message</label>
                <textarea
                  className="w-full border p-2 rounded"
                  value={donationForm.message}
                  onChange={e => setDonationForm({ ...donationForm, message: e.target.value })}
                />
              </div>
              <div className="mb-4 flex items-center">
                <input
                  type="checkbox"
                  id="anon"
                  className="mr-2"
                  checked={donationForm.isAnonymous}
                  onChange={e => setDonationForm({ ...donationForm, isAnonymous: e.target.checked })}
                />
                <label htmlFor="anon" className="text-sm">Anonymous Donation</label>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setShowDonationModal(false)} className="px-4 py-2 text-gray-600">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded">Record</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Alumni Modal */}
      {showEditModal && editingAlumni && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white p-6 rounded-lg w-[600px] max-h-[90vh] overflow-y-auto m-4">
            <h2 className="text-xl font-bold mb-4">Edit Alumni Profile</h2>
            <form onSubmit={handleUpdateAlumni}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Bio</label>
                  <textarea
                    className="w-full border p-2 rounded"
                    rows="3"
                    value={editingAlumni.bio}
                    onChange={e => setEditingAlumni({ ...editingAlumni, bio: e.target.value })}
                    placeholder="Brief bio about the alumni"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Current Job</label>
                  <input
                    type="text"
                    className="w-full border p-2 rounded"
                    value={editingAlumni.currentJob}
                    onChange={e => setEditingAlumni({ ...editingAlumni, currentJob: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Current Company</label>
                  <input
                    type="text"
                    className="w-full border p-2 rounded"
                    value={editingAlumni.currentCompany}
                    onChange={e => setEditingAlumni({ ...editingAlumni, currentCompany: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">University</label>
                  <input
                    type="text"
                    className="w-full border p-2 rounded"
                    value={editingAlumni.university}
                    onChange={e => setEditingAlumni({ ...editingAlumni, university: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Course of Study</label>
                  <input
                    type="text"
                    className="w-full border p-2 rounded"
                    value={editingAlumni.courseOfStudy}
                    onChange={e => setEditingAlumni({ ...editingAlumni, courseOfStudy: e.target.value })}
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Skills (comma separated)</label>
                  <input
                    type="text"
                    className="w-full border p-2 rounded"
                    value={editingAlumni.skills}
                    onChange={e => setEditingAlumni({ ...editingAlumni, skills: e.target.value })}
                    placeholder="e.g., Programming, Design, Marketing"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Achievements</label>
                  <textarea
                    className="w-full border p-2 rounded"
                    rows="2"
                    value={editingAlumni.achievements}
                    onChange={e => setEditingAlumni({ ...editingAlumni, achievements: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">LinkedIn URL</label>
                  <input
                    type="url"
                    className="w-full border p-2 rounded"
                    value={editingAlumni.linkedinUrl}
                    onChange={e => setEditingAlumni({ ...editingAlumni, linkedinUrl: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Twitter URL</label>
                  <input
                    type="url"
                    className="w-full border p-2 rounded"
                    value={editingAlumni.twitterUrl}
                    onChange={e => setEditingAlumni({ ...editingAlumni, twitterUrl: e.target.value })}
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Portfolio URL</label>
                  <input
                    type="url"
                    className="w-full border p-2 rounded"
                    value={editingAlumni.portfolioUrl}
                    onChange={e => setEditingAlumni({ ...editingAlumni, portfolioUrl: e.target.value })}
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Profile Picture</label>
                  {editingAlumni.profilePicture && (
                    <div className="mb-2">
                      <img
                        src={editingAlumni.profilePicture}
                        alt="Current profile"
                        className="w-24 h-24 object-cover rounded border"
                      />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="w-full border p-2 rounded"
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhoto}
                  />
                  {uploadingPhoto && <p className="text-sm text-gray-500 mt-1">Uploading...</p>}
                  <p className="text-xs text-gray-500 mt-1">Max file size: 5MB. Supported: JPG, PNG, GIF</p>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingAlumni(null);
                  }}
                  className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded hover:brightness-90">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlumniManagement;
