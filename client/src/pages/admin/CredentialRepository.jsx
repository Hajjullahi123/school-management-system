import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useSchoolSettings } from '../../hooks/useSchoolSettings';
import toast from 'react-hot-toast';
import { Search, Printer, Filter, Shield, Key, User, Download, Eye, EyeOff } from 'lucide-react';

const CredentialRepository = () => {
  const { user } = useAuth();
  const { settings: schoolSettings } = useSchoolSettings();
  const [students, setStudents] = useState([]);
  const [parents, setParents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewType, setViewType] = useState('students'); // 'students' or 'parents'
  const [selectedClass, setSelectedClass] = useState('all');
  const [showPasswords, setShowPasswords] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [studentsRes, classesRes, parentsRes] = await Promise.all([
        api.get('/api/students'),
        api.get('/api/classes'),
        api.get('/api/parents')
      ]);

      if (studentsRes.ok) {
        const studentsData = await studentsRes.json();
        setStudents(Array.isArray(studentsData) ? studentsData : []);
      }
      
      if (classesRes.ok) {
        const classesData = await classesRes.json();
        setClasses(Array.isArray(classesData) ? classesData : []);
      }

      if (parentsRes.ok) {
        const parentsData = await parentsRes.json();
        setParents(Array.isArray(parentsData) ? parentsData : []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load credentials repository');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (id) => {
    setShowPasswords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const filteredData = viewType === 'students' 
    ? students.filter(student => {
        const matchesSearch = 
          `${student.user?.firstName} ${student.user?.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
          student.admissionNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          student.user?.username?.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesClass = selectedClass === 'all' || student.classId?.toString() === selectedClass;
        return matchesSearch && matchesClass;
      })
    : parents.filter(parent => {
        const matchesSearch = 
          `${parent.user?.firstName} ${parent.user?.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
          parent.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          parent.user?.username?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
      });

  const handlePrint = () => {
    window.print();
  };

  const getClassName = (classId) => {
    if (!classId) return 'Unassigned';
    const foundClass = classes.find(c => c.id === classId || c.id === parseInt(classId));
    return foundClass ? `${foundClass.name} ${foundClass.arm || ''}` : 'Unknown Class';
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium animate-pulse">Loading Credential Repository...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header - Hidden on Print */}
      <div className="print:hidden space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Shield className="w-5 h-5 text-indigo-600" />
              </div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Credential Repository</h1>
            </div>
            <p className="text-gray-500 text-sm font-medium">
              View and print {viewType} login credentials in bulk for distribution.
            </p>
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
          >
            <Printer size={20} />
            Print All Filtered
          </button>
        </div>

        {/* View Switcher */}
        <div className="flex p-1 bg-gray-100 rounded-2xl w-full sm:w-fit">
          <button
            onClick={() => setViewType('students')}
            className={`flex-1 sm:flex-none px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${
              viewType === 'students' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Students
          </button>
          <button
            onClick={() => setViewType('parents')}
            className={`flex-1 sm:flex-none px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${
              viewType === 'parents' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Parents
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="relative col-span-1 md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={`Search by name, ${viewType === 'students' ? 'admission no' : 'phone'}, or username...`}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {viewType === 'students' && (
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                <option value="all">All Classes</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name} {c.arm}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Stats - Hidden on Print */}
      <div className="print:hidden flex gap-4 overflow-x-auto pb-2">
        <div className="bg-white px-4 py-2 rounded-full border border-gray-200 text-xs font-bold text-gray-600 flex items-center gap-2 whitespace-nowrap">
          <User size={14} className="text-blue-500" />
          Showing {filteredData.length} {viewType.charAt(0).toUpperCase() + viewType.slice(1)}
        </div>
        <div className="bg-white px-4 py-2 rounded-full border border-gray-200 text-xs font-bold text-gray-600 flex items-center gap-2 whitespace-nowrap">
          <Key size={14} className="text-amber-500" />
          Passwords Masked by Default
        </div>
      </div>

      {/* Credentials Grid - Screen View */}
      <div className="print:hidden grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredData.length > 0 ? (
          filteredData.map(item => (
            <div key={item.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:border-indigo-200 transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-black">
                  {item.user?.firstName?.[0]}{item.user?.lastName?.[0]}
                </div>
                <button 
                  onClick={() => togglePasswordVisibility(item.id)}
                  className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                >
                  {showPasswords[item.id] ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <h3 className="font-bold text-gray-900 truncate">{item.user?.firstName} {item.user?.lastName}</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-4">
                {viewType === 'students' 
                  ? `${getClassName(item.classId)} • ${item.admissionNumber}`
                  : `Parent Portal • ${item.phone}`
                }
              </p>
              
              <div className="space-y-2">
                <div className="bg-gray-50 rounded-lg p-2 flex justify-between items-center">
                  <span className="text-[9px] font-black text-gray-400 uppercase">Username</span>
                  <span className="text-xs font-mono font-bold text-gray-700">{item.user?.username}</span>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 flex justify-between items-center">
                  <span className="text-[9px] font-black text-gray-400 uppercase">Password</span>
                  <span className="text-xs font-mono font-bold text-gray-700">
                    {showPasswords[item.id] 
                      ? (viewType === 'students' ? (item.user?.tempPassword || '123456') : 'parent123') 
                      : '••••••••'
                    }
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">No matching {viewType} found</h3>
            <p className="text-gray-500">Adjust your search or filters to find specific credentials.</p>
          </div>
        )}
      </div>

      {/* PRINT AREA - Visible only when printing */}
      <div className="hidden print:block font-sans">
        <div className="text-center mb-10 pb-5 border-b-2 border-gray-200">
          <h1 className="text-3xl font-black uppercase tracking-tighter text-gray-900 mb-2">
            {schoolSettings?.schoolName || 'EduTechAI School Manager'}
          </h1>
          <h2 className="text-xl font-bold text-gray-600 italic">{viewType.charAt(0).toUpperCase() + viewType.slice(1)} Login Credentials Repository</h2>
          <p className="text-xs text-gray-400 mt-2">Generated on {new Date().toLocaleDateString()} • {viewType === 'students' && (selectedClass === 'all' ? 'All Classes' : classes.find(c => c.id.toString() === selectedClass)?.name)}</p>
        </div>

        <div className="grid grid-cols-2 gap-0 border-l border-t border-gray-300">
          {filteredData.map(item => (
            <div key={item.id} className="p-6 border-r border-b border-gray-300 min-h-[140px] flex flex-col justify-between break-inside-avoid shadow-inner relative">
              <div className="absolute top-2 right-2 opacity-[0.05] pointer-events-none">
                 <Shield size={60} />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                   <h3 className="text-base font-black uppercase text-gray-900 leading-none">
                     {item.user?.firstName} {item.user?.lastName}
                   </h3>
                   <span className="text-[10px] font-mono font-bold bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                     {viewType === 'students' ? item.admissionNumber : item.phone}
                   </span>
                </div>
                <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-4">
                  Type: {viewType === 'students' ? `Student (${getClassName(item.classId)})` : 'Parent Guardian'}
                </p>
                
                <div className="space-y-2 mt-auto">
                  <div className="flex justify-between border-b border-gray-100 py-1">
                    <span className="text-[10px] uppercase font-black text-gray-400">Username:</span>
                    <span className="text-xs font-mono font-bold text-gray-800">{item.user?.username}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 py-1">
                    <span className="text-[10px] uppercase font-black text-gray-400">Password:</span>
                    <span className="text-xs font-mono font-bold text-gray-800">
                      {viewType === 'students' ? (item.user?.tempPassword || '123456') : 'parent123'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-2 border-t border-gray-50">
                 <p className="text-[8px] italic text-gray-400 leading-tight">
                    Visit {window.location.origin}/login to access your dashboard. Please change your password after your first login for security.
                 </p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-10 text-center text-[10px] text-gray-400 italic">
          &copy; {new Date().getFullYear()} {schoolSettings?.schoolName}. Standard security policies apply. Logins are tracked for safety.
        </div>
      </div>

      <style jsx="true">{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 15mm;
          }
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact;
          }
          .print-grid {
             display: grid;
             grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  );
};

export default CredentialRepository;
