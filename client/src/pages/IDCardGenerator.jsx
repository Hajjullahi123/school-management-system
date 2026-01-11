import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { QRCodeCanvas } from 'qrcode.react';
import { api, API_BASE_URL } from '../api';
import { toast } from '../utils/toast';
import useSchoolSettings from '../hooks/useSchoolSettings';

const IDCard = ({ data, type, schoolSettings }) => {
  const isStudent = type === 'student';
  const photoUrl = isStudent ? data.photoUrl : data.teacher?.photoUrl;
  const firstName = isStudent ? data.user?.firstName : data.firstName;
  const lastName = isStudent ? data.user?.lastName : data.lastName;
  const idNumber = isStudent ? data.admissionNumber : (data.teacher?.staffId || data.username);
  const roleTitle = isStudent ? 'STUDENT' : (data.role === 'teacher' ? 'STAFF' : data.role.toUpperCase());

  // Calculate expiry for students
  const calculateExpiryDate = (className) => {
    if (!className) return null;
    const currentYear = new Date().getFullYear();
    let yearsToAdd = 1;

    if (className.includes('JSS')) {
      if (className.includes('1')) yearsToAdd = 6;
      else if (className.includes('2')) yearsToAdd = 5;
      else if (className.includes('3')) yearsToAdd = 4;
    } else if (className.includes('SS')) {
      if (className.includes('1')) yearsToAdd = 3;
      else if (className.includes('2')) yearsToAdd = 2;
      else if (className.includes('3')) yearsToAdd = 1;
    }

    const expiryDate = new Date();
    expiryDate.setFullYear(currentYear + yearsToAdd);
    return expiryDate;
  };

  const expiryDate = isStudent ? calculateExpiryDate(data.classModel?.name) : null;

  return (
    <div className="id-card-container break-inside-avoid mb-8 mx-auto">
      <div className="flex gap-4 print:gap-8 justify-center items-start">
        {/* FRONT SIDE */}
        <div className="w-[350px] h-[550px] bg-gradient-to-br from-primary via-primary/90 to-primary/80 rounded-2xl shadow-2xl overflow-hidden relative print:shadow-none print:border print:border-gray-300">
          <div className="bg-white px-6 py-4 text-center flex items-center justify-center gap-3">
            {schoolSettings?.logoUrl && (
              <img
                src={schoolSettings.logoUrl}
                alt="School Logo"
                className="h-12 w-12 object-contain"
              />
            )}
            <div>
              <h2 className="text-lg font-bold text-primary">{schoolSettings?.schoolName || 'School Name'}</h2>
              <p className="text-xs text-gray-600">{schoolSettings?.schoolMotto || 'Excellence in Education'}</p>
              <p className="text-xs font-semibold text-primary mt-1">
                {roleTitle} ID CARD
              </p>
            </div>
          </div>

          <div className="flex justify-center mt-4">
            {photoUrl ? (
              <img
                src={`${API_BASE_URL}${photoUrl}`}
                alt="Photo"
                className="w-32 h-32 rounded-lg object-cover border-4 border-white shadow-lg"
              />
            ) : (
              <div className="w-32 h-32 rounded-lg bg-white border-4 border-white shadow-lg flex items-center justify-center">
                <span className="text-4xl font-bold text-primary">
                  {firstName?.[0]}{lastName?.[0]}
                </span>
              </div>
            )}
          </div>

          <div className="px-6 mt-4 text-white space-y-2">
            <div>
              <p className="text-xs text-white/90">Full Name</p>
              <p className="font-bold text-sm">
                {firstName} {lastName}
              </p>
            </div>

            {isStudent ? (
              <>
                <div>
                  <p className="text-xs text-white/90">Admission Number</p>
                  <p className="font-bold text-sm">{idNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-white/90">Class</p>
                  <p className="font-bold text-sm">{data.classModel?.name} {data.classModel?.arm || ''}</p>
                </div>
                <div>
                  <p className="text-xs text-white/90">Blood Group</p>
                  <p className="font-bold text-sm">{data.bloodGroup || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-white/90">Valid Until</p>
                  <p className="font-bold text-sm text-yellow-300">
                    {expiryDate ? expiryDate.toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-xs text-white/90">Staff ID</p>
                  <p className="font-bold text-sm">{idNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-white/90">Role</p>
                  <p className="font-bold text-sm capitalize">{data.role}</p>
                </div>
                {data.teacher?.specialization && (
                  <div>
                    <p className="text-xs text-white/90">Specialization</p>
                    <p className="font-bold text-sm">{data.teacher.specialization}</p>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="absolute bottom-4 left-0 right-0 flex justify-center">
            <div className="bg-white p-2 rounded">
              <QRCodeCanvas value={idNumber || 'UNKNOWN'} size={80} />
            </div>
          </div>

          {isStudent && data.parentGuardianPhone && (
            <div className="absolute bottom-2 left-4 right-4 text-center">
              <p className="text-[10px] text-white">Emergency: {data.parentGuardianPhone}</p>
            </div>
          )}
        </div>

        {/* BACK SIDE */}
        <div className="w-[350px] h-[550px] bg-white rounded-2xl shadow-2xl overflow-hidden relative border-4 border-primary print:shadow-none">
          <div className="bg-yellow-400 px-6 py-3 text-center">
            <h3 className="text-sm font-bold text-gray-900">⚠️ IMPORTANT NOTICE</h3>
          </div>

          <div className="px-6 py-8 text-gray-800 space-y-6">
            <div className="bg-primary/5 rounded-lg p-4 border-2 border-primary/20">
              <p className="text-center font-semibold text-sm mb-2 text-gray-900">
                This ID card belongs to the {isStudent ? 'student' : 'staff member'} whose name and photograph appear on the reverse side.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-red-600 text-center text-base">IF FOUND</h4>
              <p className="text-sm text-center leading-relaxed text-gray-700">
                Please return this card to:
              </p>

              <div className="bg-primary/5 rounded-lg p-4 space-y-2 border border-primary/20">
                <p className="font-bold text-sm text-primary">{schoolSettings?.schoolName || 'School Name'}</p>
                {schoolSettings?.schoolMotto && (
                  <p className="text-xs text-gray-700">{schoolSettings.schoolMotto}</p>
                )}
                {schoolSettings?.schoolAddress && (
                  <p className="text-xs text-gray-700">{schoolSettings.schoolAddress}</p>
                )}
                {schoolSettings?.schoolPhone && (
                  <p className="text-xs text-gray-700">📞 {schoolSettings.schoolPhone}</p>
                )}
              </div>

              <div className="text-center">
                <p className="text-xs italic text-gray-600">OR</p>
              </div>

              <div className="bg-gray-100 rounded-lg p-3 border border-gray-300">
                <p className="text-sm font-semibold text-gray-800 text-center">Nearest Police Station</p>
              </div>
            </div>

            <div className="absolute bottom-8 left-6 right-6">
              <div className="border-t-2 border-primary/30 pt-3">
                <div className="flex justify-between items-end">
                  <div className="text-xs">
                    <p className="text-gray-600">Authorized Signature</p>
                    <div className="h-8 flex items-end">
                      <p className="font-cursive text-sm text-gray-800">Principal</p>
                    </div>
                  </div>
                  <div className="text-xs text-right">
                    <p className="text-gray-600">Issue Date</p>
                    <p className="font-semibold text-gray-800">{new Date().toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute bottom-2 left-0 right-0 text-center">
              <p className="text-[10px] text-gray-500">This card is non-transferable</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const IDCardGenerator = () => {
  const { user } = useAuth();
  const { settings: schoolSettings } = useSchoolSettings();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('my-card'); // my-card, single-student, class, staff
  const [cardsToPrint, setCardsToPrint] = useState([]);

  // Admin Selection States
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [staffType, setStaffType] = useState('teacher'); // teacher, accountant, admin
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchClasses();
      setMode('single-student'); // Default to single student search for admin
    } else {
      fetchMyCard();
    }
  }, [user]);

  const fetchClasses = async () => {
    try {
      const response = await api.get('/api/classes');
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched classes:', data);
        setClasses(Array.isArray(data) ? data : []);
      } else {
        const errorData = await response.json();
        console.error('Failed to fetch classes:', errorData);
        toast.error(errorData.error || 'Failed to load classes');
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast.error('Connection error: Failed to load classes');
    }
  };

  const fetchMyCard = async () => {
    setLoading(true);
    try {
      if (user?.role === 'student' && user?.student?.id) {
        const response = await api.get(`/api/students/${user.student.id}`);
        if (response.ok) {
          const data = await response.json();
          setCardsToPrint([{ ...data, type: 'student' }]);
        }
      } else if (user) {
        // For teachers/staff
        setCardsToPrint([{
          ...user,
          type: 'staff',
          // Ensure teacher data is present if available
          teacher: user.teacher
        }]);
      }
    } catch (error) {
      console.error('Error fetching my card:', error);
      toast.error('Failed to load ID card');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchStudent = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setLoading(true);
    try {
      const response = await api.get('/api/students');
      if (response.ok) {
        const allStudents = await response.json();
        if (Array.isArray(allStudents)) {
          const filtered = allStudents.filter(s =>
            s.admissionNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.user.lastName.toLowerCase().includes(searchTerm.toLowerCase())
          );
          setSearchResults(filtered.map(s => ({ ...s, type: 'student' })));
          if (filtered.length === 0) toast.error('No students found');
        } else {
          setSearchResults([]);
        }
      } else {
        toast.error('Failed to fetch students');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search students');
    } finally {
      setLoading(false);
    }
  };

  const handleFetchClass = async () => {
    if (!selectedClassId) return;
    setLoading(true);
    try {
      const response = await api.get(`/api/students?classId=${selectedClassId}`);
      if (response.ok) {
        const data = await response.json();
        setCardsToPrint(Array.isArray(data) ? data.map(s => ({ ...s, type: 'student' })) : []);
        if (data.length === 0) toast.error('No students found in this class');
      } else {
        toast.error('Failed to fetch class students');
      }
    } catch (error) {
      console.error('Class fetch error:', error);
      toast.error('Failed to fetch class students');
    } finally {
      setLoading(false);
    }
  };

  const handleFetchStaff = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/users?role=${staffType}`);
      if (response.ok) {
        const data = await response.json();
        setCardsToPrint(Array.isArray(data) ? data.map(u => ({ ...u, type: 'staff' })) : []);
        if (data.length === 0) toast.error(`No ${staffType}s found`);
      } else {
        toast.error('Failed to fetch staff');
      }
    } catch (error) {
      console.error('Staff fetch error:', error);
      toast.error('Failed to fetch staff');
    } finally {
      setLoading(false);
    }
  };

  // Helper function for class card click
  const handleFetchClassById = async (classId) => {
    setLoading(true);
    try {
      const response = await api.get(`/api/students?classId=${classId}`);
      const data = await response.json();
      setCardsToPrint(data.map(s => ({ ...s, type: 'student' })));
      if (data.length === 0) toast.error('No students found in this class');
    } catch (error) {
      console.error('Class fetch error:', error);
      toast.error('Failed to fetch class students');
    } finally {
      setLoading(false);
    }
  };

  // Helper function for staff card click
  const handleFetchStaffByType = async (type) => {
    setLoading(true);
    try {
      const response = await api.get(`/api/users?role=${type}`);
      const data = await response.json();
      setCardsToPrint(data.map(u => ({ ...u, type: 'staff' })));
      if (data.length === 0) toast.error(`No ${type}s found`);
    } catch (error) {
      console.error('Staff fetch error:', error);
      toast.error('Failed to fetch staff');
    } finally {
      setLoading(false);
    }
  };

  const addToPrintQueue = (student) => {
    setCardsToPrint([student]);
  };

  const printCards = () => {
    window.print();
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6 print:hidden">
        <h1 className="text-2xl font-bold text-gray-900">ID Card Generator</h1>
        {cardsToPrint.length > 0 && (
          <button
            onClick={printCards}
            className="px-6 py-2 bg-primary text-white rounded-md hover:brightness-90 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print {cardsToPrint.length} Card{cardsToPrint.length !== 1 ? 's' : ''}
          </button>
        )}
      </div>

      {isAdmin && (
        <>
          {/* Quick Access Cards - Show when no mode is selected or mode is default */}
          {(mode === 'single-student' && cardsToPrint.length === 0 && searchResults.length === 0) && (
            <div className="mb-8 print:hidden">
              {/* Class Cards Section */}
              <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Select a Class
                </h2>
                {classes.length === 0 ? (
                  <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <p className="text-gray-600 font-medium">No classes created yet</p>
                    <p className="text-sm text-gray-500 mt-1">Create classes in Class Management first</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {classes && classes.length > 0 ? classes.map(classItem => (
                      <button
                        key={classItem.id}
                        onClick={() => {
                          setSelectedClassId(classItem.id);
                          setMode('class');
                          handleFetchClassById(classItem.id);
                        }}
                        className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg hover:bg-primary/5 transition-all border-2 border-transparent hover:border-primary group"
                      >
                        <div className="flex flex-col items-center">
                          <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/90 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                            <span className="text-2xl font-bold text-white">{classItem.name.substring(0, 3)}</span>
                          </div>
                          <h3 className="font-bold text-gray-900 text-lg">{classItem.name} {classItem.arm}</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {classItem._count?.students || 0} Students
                          </p>
                          <div className="mt-3 text-xs text-primary font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                            Click to generate ID cards →
                          </div>
                        </div>
                      </button>
                    )) : (
                      <p className="text-gray-500 col-span-full text-center py-4">No classes available</p>
                    )}
                  </div>
                )}
              </div>

              {/* Staff Cards Section */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Select Staff Type
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => {
                      setStaffType('teacher');
                      setMode('staff');
                      handleFetchStaffByType('teacher');
                    }}
                    className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg hover:bg-blue-50 transition-all border-2 border-transparent hover:border-blue-500 group"
                  >
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <h3 className="font-bold text-gray-900 text-lg">Teachers</h3>
                      <p className="text-sm text-gray-600 mt-1">All Teaching Staff</p>
                      <div className="mt-3 text-xs text-blue-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                        Click to generate ID cards →
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setStaffType('accountant');
                      setMode('staff');
                      handleFetchStaffByType('accountant');
                    }}
                    className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg hover:bg-green-50 transition-all border-2 border-transparent hover:border-green-500 group"
                  >
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="font-bold text-gray-900 text-lg">Accountants</h3>
                      <p className="text-sm text-gray-600 mt-1">Finance Staff</p>
                      <div className="mt-3 text-xs text-green-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                        Click to generate ID cards →
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setStaffType('admin');
                      setMode('staff');
                      handleFetchStaffByType('admin');
                    }}
                    className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg hover:bg-purple-50 transition-all border-2 border-transparent hover:border-purple-500 group"
                  >
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <h3 className="font-bold text-gray-900 text-lg">Administrators</h3>
                      <p className="text-sm text-gray-600 mt-1">Admin Staff</p>
                      <div className="mt-3 text-xs text-purple-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                        Click to generate ID cards →
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Divider */}
              <div className="my-8 border-t border-gray-300"></div>

              {/* Search Hint */}
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h4 className="font-semibold text-blue-900">Looking for a specific student?</h4>
                    <p className="text-sm text-blue-700 mt-1">Use the search bar below to find a student by name or admission number</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab Controls */}
          <div className="bg-white p-4 rounded-lg shadow mb-8 print:hidden">
            <div className="flex space-x-4 border-b mb-4">
              <button
                className={`pb-2 px-4 ${mode === 'single-student' ? 'border-b-2 border-primary text-primary font-bold' : 'text-gray-500'}`}
                onClick={() => { setMode('single-student'); setCardsToPrint([]); setSearchResults([]); }}
              >
                Single Student
              </button>
              <button
                className={`pb-2 px-4 ${mode === 'class' ? 'border-b-2 border-primary text-primary font-bold' : 'text-gray-500'}`}
                onClick={() => { setMode('class'); setCardsToPrint([]); }}
              >
                Entire Class
              </button>
              <button
                className={`pb-2 px-4 ${mode === 'staff' ? 'border-b-2 border-primary text-primary font-bold' : 'text-gray-500'}`}
                onClick={() => { setMode('staff'); setCardsToPrint([]); }}
              >
                Staff
              </button>
              <button
                className={`pb-2 px-4 ${mode === 'my-card' ? 'border-b-2 border-primary text-primary font-bold' : 'text-gray-500'}`}
                onClick={() => { setMode('my-card'); fetchMyCard(); }}
              >
                My Card
              </button>
            </div>

            {/* Controls based on mode */}
            {mode === 'single-student' && (
              <form onSubmit={handleSearchStudent} className="flex gap-4">
                <input
                  type="text"
                  placeholder="Search by Name or Admission Number"
                  className="flex-1 p-2 border rounded"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                  Search
                </button>
              </form>
            )}

            {mode === 'class' && (
              <div className="flex gap-4">
                <select
                  className="flex-1 p-2 border rounded"
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                >
                  <option value="">Select a Class</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name} {c.arm}</option>
                  ))}
                </select>
                <button
                  onClick={handleFetchClass}
                  disabled={!selectedClassId}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  Load Class
                </button>
              </div>
            )}

            {mode === 'staff' && (
              <div className="flex gap-4">
                <select
                  className="flex-1 p-2 border rounded"
                  value={staffType}
                  onChange={(e) => setStaffType(e.target.value)}
                >
                  <option value="teacher">Teachers</option>
                  <option value="accountant">Accountants</option>
                  <option value="admin">Admins</option>
                </select>
                <button
                  onClick={handleFetchStaff}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Load Staff
                </button>
              </div>
            )}
          </div>

          {/* Search Results for Single Student Mode */}
          {mode === 'single-student' && searchResults.length > 0 && (
            <div className="bg-white p-4 rounded-lg shadow mb-8 print:hidden">
              <h3 className="font-bold mb-4">Search Results</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchResults.map(student => (
                  <div key={student.id} className="border p-4 rounded flex justify-between items-center">
                    <div>
                      <p className="font-bold">{student.user.firstName} {student.user.lastName}</p>
                      <p className="text-sm text-gray-600">{student.admissionNumber}</p>
                      <p className="text-xs text-gray-500">{student.classModel?.name} {student.classModel?.arm}</p>
                    </div>
                    <button
                      onClick={() => addToPrintQueue(student)}
                      className="bg-primary text-white px-3 py-1 rounded text-sm hover:brightness-90"
                    >
                      Generate Card
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Cards Display Area */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading card data...</p>
        </div>
      ) : (
        <div id="print-area" className="print:block">
          {cardsToPrint.length > 0 ? (
            <div className="grid grid-cols-1 gap-8 print:block">
              {cardsToPrint.map((data, index) => (
                <div key={index} className="print:break-after-page">
                  <IDCard data={data} type={data.type} schoolSettings={schoolSettings} />
                </div>
              ))}
            </div>
          ) : (
            !isAdmin && (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <p className="text-gray-500">No ID card loaded. Please select an option above.</p>
              </div>
            )
          )}
        </div>
      )}

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .id-card-container {
            page-break-inside: avoid;
            margin-bottom: 20px;
            display: flex;
            justify-content: center;
          }
          @page {
            size: auto;
            margin: 10mm;
          }
        }
      `}</style>
    </div>
  );
};

export default IDCardGenerator;
