import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { QRCodeCanvas } from 'qrcode.react';
import { api, API_BASE_URL } from '../api';
import { toast } from '../utils/toast';
import useSchoolSettings from '../hooks/useSchoolSettings';
import { formatDateVerbose } from '../utils/formatters';

const IDCard = ({ data, type, schoolSettings }) => {
  const isStudent = type === 'student';
  const photoUrl = isStudent 
    ? (data.user?.photoUrl || data.photoUrl) 
    : (data.photoUrl || data.teacher?.photoUrl);
  const firstName = isStudent ? (data.user?.firstName || data.name?.split(' ')[0] || 'Student') : data.firstName;
  const lastName = isStudent ? (data.user?.lastName || data.name?.split(' ').slice(1).join(' ') || '') : data.lastName;
  const middleName = isStudent ? (data.middleName || '') : data.middleName;
  const idNumber = isStudent ? data.admissionNumber : (data.teacher?.staffId || data.username);
  const roleTitle = isStudent ? 'STUDENT' : (data.role === 'teacher' ? 'STAFF' : data.role.toUpperCase());

  // Status Badge Color
  const statusColor = isStudent ? 'bg-green-500' : 'bg-blue-500';

  return (
    <div className="id-card-container break-inside-avoid mb-12 mx-auto transition-transform hover:scale-[1.02] duration-300 px-4">
        {/* Mobile Scroll Hint */}
        <div className="md:hidden flex items-center justify-center gap-2 mb-4 text-primary font-bold text-xs uppercase tracking-widest animate-pulse no-print">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
            Scroll or Swipe to see Back Side
        </div>

      <div className="flex flex-col md:flex-row gap-8 justify-center items-start print:flex-row print:gap-12 overflow-x-auto no-scrollbar pb-6 print:overflow-visible">
        {/* FRONT SIDE */}
        <div className="w-full max-w-[360px] min-w-[300px] h-[580px] rounded-[2.5rem] overflow-hidden relative shadow-[0_20px_50px_rgba(0,0,0,0.2)] bg-slate-50 border border-gray-200 print:shadow-none flex-shrink-0">

          {/* Top Decorative Header */}
          <div className="h-48 bg-primary relative overflow-hidden">
            {/* Abstract Background Patterns */}
            <div className="absolute inset-0 opacity-20">
              <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="absolute -top-10 -right-10 w-48 h-48 text-white fill-current">
                <path d="M44.7,-76.4C58.1,-69.2,69.5,-57.4,77.4,-44C85.3,-30.6,89.7,-15.3,89.5,-0.1C89.3,15.1,84.5,30.2,76.3,43.3C68.1,56.4,56.5,67.5,43,75.4C29.5,83.3,14.7,88.1,-0.1,88.3C-15,88.5,-30,84.1,-43.5,76.1C-57.1,68.2,-69.2,56.7,-77.2,43.1C-85.2,29.5,-89,13.8,-88.7,-1.8C-88.4,-17.4,-84,-32.8,-75.4,-45.9C-66.8,-59,-54,-69.8,-40.1,-76.6C-26.2,-83.4,-13.1,-86.2,0.8,-87.6C14.7,-89,29.3,-89,44.7,-76.4Z" transform="translate(100 100)" />
              </svg>
              <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="absolute -bottom-10 -left-10 w-32 h-32 text-white fill-current">
                <path d="M41.5,-73.4C54.1,-67.2,64.8,-56.3,72.4,-43.5C80,-30.7,84.5,-16.1,84.1,-1.5C83.7,13.1,78.4,27.7,70,40C61.6,52.3,50,62.3,37,69.3C24,76.3,11.6,80.3,-0.6,81.4C-12.8,82.5,-25.6,80.7,-37.8,74.5C-50,68.3,-61.6,57.7,-69.6,44.9C-77.5,32.1,-81.9,17.1,-81.6,2.1C-81.2,-12.9,-76.2,-27.9,-67.5,-40.4C-58.8,-52.9,-46.4,-62.9,-33.2,-69.1C-20,-75.3,-6,-77.7,8.3,-79.1C22.6,-80.5,35.2,-79.6,41.5,-73.4Z" transform="translate(100 100)" />
              </svg>
            </div>
            
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent"></div>
            
            <div className="relative z-10 p-6 flex flex-col items-center">
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
                {schoolSettings?.logoUrl && (
                  <img src={schoolSettings.logoUrl} alt="" className="h-6 w-6 object-contain brightness-110" />
                )}
                <span className="text-white text-[10px] font-bold tracking-widest uppercase">
                  {schoolSettings?.schoolName || 'ACADEMY PORTAL'}
                </span>
              </div>
            </div>
          </div>

          {/* Photo Section */}
          <div className="flex justify-center -mt-20 relative z-20">
            <div className="relative">
              <div className="w-40 h-40 rounded-full border-[6px] border-white shadow-xl overflow-hidden bg-gray-100">
                {photoUrl ? (
                  <img src={photoUrl.startsWith('data:') || photoUrl.startsWith('http') ? photoUrl : `${API_BASE_URL}${photoUrl}`} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200">
                    <span className="text-4xl font-black text-gray-400">{firstName?.[0]}{lastName?.[0]}</span>
                  </div>
                )}
              </div>
              {/* Verified Badge */}
              <div className={`absolute bottom-2 right-2 ${statusColor} text-white p-1.5 rounded-full border-4 border-white shadow-lg`}>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          {/* Identity Section */}
          <div className="p-6 text-center">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-tight">
              {firstName} {middleName || ''} <br /> {lastName}
            </h1>
            <div className="mt-2 inline-block px-4 py-1 bg-primary/10 rounded-full">
              <span className="text-xs font-black text-primary uppercase tracking-widest">{roleTitle}</span>
            </div>
          </div>

          {/* Details Table */}
          <div className="px-8 mt-2 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">ID NUMBER</p>
                <p className="text-sm font-bold text-gray-800">{idNumber}</p>
              </div>
              {isStudent ? (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">CLASS</p>
                  <p className="text-sm font-bold text-gray-800">{data.classModel?.name} {data.classModel?.arm || ''}</p>
                </div>
              ) : (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">BLOOD GROUP</p>
                  <p className="text-sm font-bold text-red-600">{data.bloodGroup || 'O+'}</p>
                </div>
              )}
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 flex items-center justify-between border border-gray-100">
              <div className="flex flex-col">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">EXPIRES ON</p>
                <p className="text-sm font-black text-primary">
                  {isStudent ? 'SEPT 2026' : 'PERMANENT'}
                </p>
              </div>
              <div className="bg-white p-1 rounded-lg border border-gray-100 shadow-sm">
                <QRCodeCanvas value={idNumber || 'UNKNOWN'} size={50} bgAlpha={0} />
              </div>
            </div>
          </div>

          {/* Footer Bar */}
          <div className="absolute bottom-0 left-0 right-0 h-2 bg-primary"></div>
        </div>

        {/* BACK SIDE */}
        <div className="w-full max-w-[360px] min-w-[300px] h-[580px] rounded-[2.5rem] bg-white border-2 border-primary/20 overflow-hidden relative shadow-2xl print:shadow-none flex-shrink-0">
          {/* Top Branding Section */}
          <div className="bg-slate-50 p-8 border-b border-gray-100">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center p-2">
                {schoolSettings?.logoUrl ? (
                  <img src={schoolSettings.logoUrl} alt="" className="object-contain" />
                ) : (
                  <svg className="text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.394 2.827a1 1 0 00-.788 0l-7 3a1 1 0 000 1.848l7 3a1 1 0 00.788 0l7-3a1 1 0 000-1.848l-7-3zM14 9.528v2.708l-3.147 1.35a1 1 0 01-.853 0L6.714 12.031l-.224-.096a1 1 0 11.758-1.848L10 11.512l2.224-.953 1.776-.731z" />
                  </svg>
                )}
              </div>
              <div>
                <h3 className="text-xs font-black text-primary leading-tight uppercase tracking-tight">
                  {schoolSettings?.schoolName || 'INSTITUTION IDENTITY'}
                </h3>
              </div>
            </div>
            <p className="text-[11px] text-gray-500 font-medium italic">
              "Excellence in faith and academics"
            </p>
          </div>

          <div className="p-8 space-y-6">
            <div className="bg-red-50/50 rounded-2xl p-5 border border-red-100">
              <h4 className="text-red-700 font-black text-xs uppercase mb-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                Legal Terms
              </h4>
              <p className="text-[10px] text-gray-600 leading-relaxed font-medium">
                This identity card is strictly for identification. If lost, please return it to the nearest Police Station or contact the school office immediately. Unauthorized use is punishable by law.
              </p>
            </div>

            <div className="space-y-4">
              <h4 className="text-gray-900 font-bold text-xs uppercase letter-widest">Office Location</h4>
              <div className="space-y-3">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-gray-50 rounded-lg shrink-0">📍</div>
                  <p className="text-[10px] text-gray-600 font-bold leading-tight">
                    {schoolSettings?.schoolAddress || 'School Headquarters, Nigeria'}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-gray-50 rounded-lg shrink-0">📞</div>
                  <p className="text-[10px] text-gray-600 font-bold">{schoolSettings?.schoolPhone || '+234 XXX XXX XXXX'}</p>
                </div>
              </div>
            </div>

            {/* Signature Area */}
            <div className="pt-8 border-t border-dashed border-gray-200 mt-12">
               <div className="flex justify-between items-end">
                  <div className="text-center">
                    <div className="h-12 flex items-center justify-center italic text-primary font-black text-sm">
                      Admin
                    </div>
                    <div className="w-32 border-t border-gray-900 mx-auto mt-1"></div>
                    <p className="text-[8px] font-bold text-gray-400 mt-1 uppercase">Principal Sign</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-bold text-gray-400 uppercase">Registered Date</p>
                    <p className="text-[10px] font-black text-gray-900">{formatDateVerbose(new Date())}</p>
                  </div>
               </div>
            </div>
          </div>
          
          <div className="absolute bottom-4 left-0 right-0 text-center">
            <p className="text-[10px] font-bold text-gray-300">Property of {schoolSettings?.schoolName || 'Institution'}</p>
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
            (s.user?.firstName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.user?.lastName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.name || '').toLowerCase().includes(searchTerm.toLowerCase())
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

  // Helper function for staff card click
  const handleFetchStaffByType = async (type) => {
    setLoading(true);
    try {
      const response = await api.get(`/api/users?role=${type}`);
      if (response.ok) {
        const data = await response.json();
        setCardsToPrint(Array.isArray(data) ? data.map(u => ({ ...u, type: 'staff' })) : []);
        if (data.length === 0) toast.error(`No ${type}s found`);
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
                  className="bg-primary text-white px-8 py-2 rounded-xl font-bold shadow-lg hover:brightness-90 disabled:opacity-50 transition-all active:scale-95"
                >
                  Generate for Class
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
                  className="bg-primary text-white px-8 py-2 rounded-xl font-bold shadow-lg hover:brightness-90 transition-all active:scale-95"
                >
                  Generate for Staff
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
                      <p className="font-bold">{(student.user?.firstName || student.name?.split(' ')[0] || 'Student')} {(student.user?.lastName || student.name?.split(' ').slice(1).join(' ') || '')}</p>
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
