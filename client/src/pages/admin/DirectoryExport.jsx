import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useSchoolSettings } from '../../hooks/useSchoolSettings';
import * as XLSX from 'xlsx';
import { Download, Users, Briefcase, ShieldCheck, GraduationCap } from 'lucide-react';
import toast from 'react-hot-toast';

const DirectoryExport = () => {
  const { user } = useAuth();
  const { settings: schoolSettings } = useSchoolSettings();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [alumni, setAlumni] = useState([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      // Fetch users
      const usersRes = await api.get('/api/users');
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData);
      }
      
      // Fetch classes to map form masters
      const classesRes = await api.get('/api/classes');
      if (classesRes.ok) {
        const classesData = await classesRes.json();
        setClasses(classesData);
      }

      // Fetch alumni explicitly
      const alumniRes = await api.get('/api/alumni/directory');
      if (alumniRes.ok) {
        const alumniData = await alumniRes.json();
        setAlumni(alumniData);
      }
    } catch (error) {
      console.error('Error fetching directory data:', error);
      toast.error('Failed to prepare directory data.');
    } finally {
      setLoading(false);
    }
  };

  const createBrandedHeader = (title) => {
    return [
      [schoolSettings?.schoolName?.toUpperCase() || 'SCHOOL DIRECTORY'],
      [schoolSettings?.schoolMotto || ''],
      [schoolSettings?.schoolAddress || ''],
      [schoolSettings?.schoolPhone ? `Phone: ${schoolSettings.schoolPhone}` : '', schoolSettings?.schoolEmail ? `Email: ${schoolSettings.schoolEmail}` : ''].filter(Boolean),
      [],
      [title.toUpperCase()],
      [`Generated on: ${new Date().toLocaleString()}`],
      []
    ];
  };

  const exportDirectory = () => {
    if (!users || users.length === 0) {
      toast.error('No data available to export.');
      return;
    }

    try {
      const wb = XLSX.utils.book_new();

      // 1. Process Students (Grouped by Class)
      const studentsRaw = users.filter(u => u.role === 'student' && u.student?.status !== 'graduated' && u.student?.status !== 'alumni');
      const studentsByClass = studentsRaw.reduce((acc, u) => {
        const className = u.student?.classModel?.name || 'Unassigned';
        if (!acc[className]) acc[className] = [];
        acc[className].push(u);
        return acc;
      }, {});

      const studentAOA = [...createBrandedHeader('Active Student Directory')];
      Object.keys(studentsByClass).sort().forEach(className => {
        studentAOA.push([`CLASS: ${className.toUpperCase()}`]);
        studentAOA.push(['S/N', 'First Name', 'Last Name', 'Admission No', 'Gender', 'Parent Phone', 'Parent Email']);
        studentsByClass[className].forEach((u, index) => {
          studentAOA.push([
            index + 1,
            u.firstName,
            u.lastName,
            u.student?.admissionNumber || 'N/A',
            u.student?.gender || 'N/A',
            u.student?.parentPhone || 'N/A',
            u.student?.parentEmail || 'N/A'
          ]);
        });
        studentAOA.push([]); // Spacer
      });
      const wsStudents = XLSX.utils.aoa_to_sheet(studentAOA);
      XLSX.utils.book_append_sheet(wb, wsStudents, 'Students');

      // 2. Process Alumni (Grouped by Graduation Year)
      const alumniByYear = alumni.reduce((acc, a) => {
        const year = a.graduationYear || 'Unknown';
        if (!acc[year]) acc[year] = [];
        acc[year].push(a);
        return acc;
      }, {});

      const alumniAOA = [...createBrandedHeader('Alumni Directory')];
      Object.keys(alumniByYear).sort((a, b) => b - a).forEach(year => {
        alumniAOA.push([`GRADUATION YEAR: ${year}`]);
        alumniAOA.push(['S/N', 'First Name', 'Last Name', 'Alumni ID', 'Email', 'Current Job', 'University']);
        alumniByYear[year].forEach((a, index) => {
          alumniAOA.push([
            index + 1,
            a.student?.user?.firstName || 'N/A',
            a.student?.user?.lastName || 'N/A',
            a.alumniId || 'N/A',
            a.student?.user?.email || a.student?.parentEmail || 'N/A',
            a.currentJob || 'N/A',
            a.university || 'N/A'
          ]);
        });
        alumniAOA.push([]); // Spacer
      });
      const wsAlumni = XLSX.utils.aoa_to_sheet(alumniAOA);
      XLSX.utils.book_append_sheet(wb, wsAlumni, 'Alumni');

      // 3. Process Staff (Teachers & Form Masters)
      const staffRaw = users.filter(u => u.role === 'teacher' || u.teacher);
      const staffAOA = [...createBrandedHeader('Staff & Form Masters')];
      staffAOA.push(['S/N', 'Full Name', 'Staff ID', 'Username', 'Specialization', 'Phone', 'Email', 'Form Master For']);
      staffRaw.forEach((u, index) => {
        const masterClasses = classes
          .filter(c => c.classTeacherId === u.id)
          .map(c => `${c.name} ${c.arm || ''}`.trim());
        
        staffAOA.push([
          index + 1,
          `${u.firstName} ${u.lastName}`,
          u.teacher?.staffId || 'N/A',
          u.username,
          u.teacher?.specialization || 'N/A',
          u.phone || 'N/A',
          u.email || 'N/A',
          masterClasses.length > 0 ? masterClasses.join(', ') : 'None'
        ]);
      });
      const wsStaff = XLSX.utils.aoa_to_sheet(staffAOA);
      XLSX.utils.book_append_sheet(wb, wsStaff, 'Staff');

      // 4. Process Admins
      const adminsRaw = users.filter(u => ['admin', 'principal', 'accountant', 'examination_officer'].includes(u.role));
      const adminAOA = [...createBrandedHeader('Administrative Officers')];
      adminAOA.push(['S/N', 'Full Name', 'Role', 'Username', 'Phone', 'Email']);
      adminsRaw.forEach((u, index) => {
        let displayRole = u.role;
        if (u.role === 'examination_officer') displayRole = 'Examination Officer';
        if (u.role === 'admin') displayRole = 'System Admin';
        if (u.role === 'principal') displayRole = 'School Principal';
        if (u.role === 'accountant') displayRole = 'System Accountant';

        adminAOA.push([
          index + 1,
          `${u.firstName} ${u.lastName}`,
          displayRole,
          u.username,
          u.phone || 'N/A',
          u.email || 'N/A'
        ]);
      });
      const wsAdmins = XLSX.utils.aoa_to_sheet(adminAOA);
      XLSX.utils.book_append_sheet(wb, wsAdmins, 'Administrators');

      // Auto-size columns loosely
      [wsStudents, wsAlumni, wsStaff, wsAdmins].forEach(ws => {
        ws['!cols'] = Array(10).fill({ wch: 20 });
      });

      // Save file
      const timestamp = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `${schoolSettings?.schoolName?.replace(/\s+/g, '_') || 'School'}_Directory_${timestamp}.xlsx`);
      
      toast.success('Directory exported successfully!');

    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('An error occurred during export.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-black text-gray-900 border-l-4 border-primary pl-3 tracking-tight">School Directory Export</h1>
          <p className="text-gray-500 mt-2 text-sm font-medium max-w-2xl">
            Download a comprehensive, branded spreadsheet containing organized lists of all students (grouped by class), staff, alumni (grouped by year), and administrators.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
            <Users size={24} />
          </div>
          <h3 className="font-black text-gray-900 text-xl mb-1">{users.filter(u => u.role === 'student' && u.student?.status !== 'graduated').length}</h3>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Active Students</p>
        </div>

        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
            <Briefcase size={24} />
          </div>
          <h3 className="font-black text-gray-900 text-xl mb-1">{users.filter(u => u.role === 'teacher' || u.teacher).length}</h3>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Staff & Faculty</p>
        </div>

        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4">
            <GraduationCap size={24} />
          </div>
          <h3 className="font-black text-gray-900 text-xl mb-1">{alumni.length}</h3>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Registered Alumni</p>
        </div>

        <div className="bg-purple-50 border border-purple-100 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-4">
            <ShieldCheck size={24} />
          </div>
          <h3 className="font-black text-gray-900 text-xl mb-1">{users.filter(u => ['admin', 'principal', 'accountant', 'examination_officer'].includes(u.role)).length}</h3>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Administrators</p>
        </div>
      </div>

      <div className="bg-white p-10 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-gray-50 text-primary rounded-full flex items-center justify-center mb-6">
          <Download size={32} />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-4 tracking-tight">Generate Branded Directory</h2>
        <p className="text-gray-500 mb-8 max-w-lg font-medium">
          The exported file will be formatted with your school's letterhead and organized into separate sheets. Students and Alumni will be automatically grouped for better readability.
        </p>
        
        <button
          onClick={exportDirectory}
          disabled={loading || users.length === 0}
          className="group relative flex items-center gap-3 bg-primary text-white px-10 py-4 rounded-xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 hover:brightness-110 active:scale-95 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none"
        >
          <Download size={18} className="group-hover:translate-y-0.5 transition-transform" />
          {loading ? 'Preparing High-Quality Data...' : 'Download Full Directory (.xlsx)'}
        </button>
        <p className="mt-4 text-[10px] text-gray-400 font-bold uppercase tracking-tighter italic">
          * Optimized for Microsoft Excel and Google Sheets
        </p>
      </div>

    </div>
  );
};

export default DirectoryExport;
