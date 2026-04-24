import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useSchoolSettings } from '../../hooks/useSchoolSettings';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Download, Users, Briefcase, ShieldCheck, GraduationCap, FileDown } from 'lucide-react';
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
      const [usersRes, classesRes, alumniRes] = await Promise.all([
        api.get('/api/users'),
        api.get('/api/classes'),
        api.get('/api/alumni/directory')
      ]);

      if (usersRes.ok) setUsers(await usersRes.json());
      if (classesRes.ok) setClasses(await classesRes.json());
      if (alumniRes.ok) setAlumni(await alumniRes.json());
    } catch (error) {
      console.error('Error fetching directory data:', error);
      toast.error('Failed to prepare directory data.');
    } finally {
      setLoading(false);
    }
  };

  const applyBrandedHeader = (worksheet, title) => {
    // School Name
    const schoolRow = worksheet.addRow([schoolSettings?.schoolName?.toUpperCase() || 'SCHOOL DIRECTORY']);
    schoolRow.font = { name: 'Arial Black', size: 16, bold: true };
    schoolRow.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.mergeCells(`A${schoolRow.number}:G${schoolRow.number}`);

    // Motto
    const mottoRow = worksheet.addRow([schoolSettings?.schoolMotto || '']);
    mottoRow.font = { italic: true, size: 10 };
    mottoRow.alignment = { horizontal: 'center' };
    worksheet.mergeCells(`A${mottoRow.number}:G${mottoRow.number}`);

    // Address
    const addressRow = worksheet.addRow([schoolSettings?.schoolAddress || '']);
    addressRow.font = { size: 9 };
    addressRow.alignment = { horizontal: 'center' };
    worksheet.mergeCells(`A${addressRow.number}:G${addressRow.number}`);

    // Contact
    const contactText = [
      schoolSettings?.schoolPhone ? `Phone: ${schoolSettings.schoolPhone}` : '',
      schoolSettings?.schoolEmail ? `Email: ${schoolSettings.schoolEmail}` : ''
    ].filter(Boolean).join(' | ');
    const contactRow = worksheet.addRow([contactText]);
    contactRow.font = { size: 9, bold: true };
    contactRow.alignment = { horizontal: 'center' };
    worksheet.mergeCells(`A${contactRow.number}:G${contactRow.number}`);

    worksheet.addRow([]); // Spacer

    // Title
    const titleRow = worksheet.addRow([title.toUpperCase()]);
    titleRow.font = { size: 12, bold: true, color: { argb: 'FF1E40AF' } }; // Blue color
    titleRow.alignment = { horizontal: 'center' };
    worksheet.mergeCells(`A${titleRow.number}:G${titleRow.number}`);

    // Timestamp
    const timeRow = worksheet.addRow([`Generated on: ${new Date().toLocaleString()}`]);
    timeRow.font = { size: 8, color: { argb: 'FF6B7280' } };
    timeRow.alignment = { horizontal: 'center' };
    worksheet.mergeCells(`A${timeRow.number}:G${timeRow.number}`);

    worksheet.addRow([]); // Spacer
    return worksheet;
  };

  const formatTableHeader = (row) => {
    row.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E40AF' }
      };
      cell.alignment = { horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  };

  const exportDirectory = async (category = 'all') => {
    if (!users || users.length === 0) {
      toast.error('No data available to export.');
      return;
    }

    try {
      setLoading(true);
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'School Management System';
      workbook.lastModifiedBy = user?.username;
      workbook.created = new Date();

      // 1. Students Sheet
      if (category === 'all' || category === 'students') {
        const ws = workbook.addWorksheet('Students');
        applyBrandedHeader(ws, 'Active Student Directory');
        
        const studentsRaw = users.filter(u => u.role === 'student' && u.student?.status !== 'graduated' && u.student?.status !== 'alumni');
        const studentsByClass = studentsRaw.reduce((acc, u) => {
          const className = u.student?.classModel?.name || 'Unassigned';
          if (!acc[className]) acc[className] = [];
          acc[className].push(u);
          return acc;
        }, {});

        Object.keys(studentsByClass).sort().forEach(className => {
          const classRow = ws.addRow([`CLASS: ${className.toUpperCase()}`]);
          classRow.font = { bold: true, size: 11 };
          classRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
          
          const headerRow = ws.addRow(['S/N', 'First Name', 'Last Name', 'Admission No', 'Gender', 'Parent Phone', 'Parent Email']);
          formatTableHeader(headerRow);

          studentsByClass[className].forEach((u, index) => {
            ws.addRow([
              index + 1,
              u.firstName,
              u.lastName,
              u.student?.admissionNumber || 'N/A',
              u.student?.gender || 'N/A',
              u.student?.parentPhone || 'N/A',
              u.student?.parentEmail || 'N/A'
            ]);
          });
          ws.addRow([]); // Spacer
        });
        ws.columns = Array(7).fill({ width: 20 });
      }

      // 2. Alumni Sheet
      if (category === 'all' || category === 'alumni') {
        const ws = workbook.addWorksheet('Alumni');
        applyBrandedHeader(ws, 'Alumni Directory');

        const alumniByYear = alumni.reduce((acc, a) => {
          const year = a.graduationYear || 'Unknown';
          if (!acc[year]) acc[year] = [];
          acc[year].push(a);
          return acc;
        }, {});

        Object.keys(alumniByYear).sort((a, b) => b - a).forEach(year => {
          const yearRow = ws.addRow([`GRADUATION YEAR: ${year}`]);
          yearRow.font = { bold: true };
          yearRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };

          const headerRow = ws.addRow(['S/N', 'First Name', 'Last Name', 'Alumni ID', 'Email', 'Current Job', 'University']);
          formatTableHeader(headerRow);

          alumniByYear[year].forEach((a, index) => {
            ws.addRow([
              index + 1,
              a.student?.user?.firstName || 'N/A',
              a.student?.user?.lastName || 'N/A',
              a.alumniId || 'N/A',
              a.student?.user?.email || a.student?.parentEmail || 'N/A',
              a.currentJob || 'N/A',
              a.university || 'N/A'
            ]);
          });
          ws.addRow([]); // Spacer
        });
        ws.columns = Array(7).fill({ width: 22 });
      }

      // 3. Staff Sheet
      if (category === 'all' || category === 'staff') {
        const ws = workbook.addWorksheet('Staff');
        applyBrandedHeader(ws, 'Staff & Faculty Directory');

        const staffRaw = users.filter(u => u.role === 'teacher' || u.teacher);
        const headerRow = ws.addRow(['S/N', 'Full Name', 'Staff ID', 'Username', 'Specialization', 'Phone', 'Email', 'Form Master For']);
        formatTableHeader(headerRow);

        staffRaw.forEach((u, index) => {
          const masterClasses = classes
            .filter(c => c.classTeacherId === u.id)
            .map(c => `${c.name} ${c.arm || ''}`.trim());
          
          ws.addRow([
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
        ws.columns = Array(8).fill({ width: 20 });
      }

      // 4. Admins Sheet
      if (category === 'all' || category === 'admins') {
        const ws = workbook.addWorksheet('Administrators');
        applyBrandedHeader(ws, 'Administrative Officers');

        const adminsRaw = users.filter(u => ['admin', 'principal', 'accountant', 'examination_officer'].includes(u.role));
        const headerRow = ws.addRow(['S/N', 'Full Name', 'Role', 'Username', 'Phone', 'Email']);
        formatTableHeader(headerRow);

        adminsRaw.forEach((u, index) => {
          let displayRole = u.role === 'examination_officer' ? 'Examination Officer' :
                           u.role === 'admin' ? 'System Admin' :
                           u.role === 'principal' ? 'School Principal' :
                           u.role === 'accountant' ? 'System Accountant' : u.role;

          ws.addRow([
            index + 1,
            `${u.firstName} ${u.lastName}`,
            displayRole,
            u.username,
            u.phone || 'N/A',
            u.email || 'N/A'
          ]);
        });
        ws.columns = Array(6).fill({ width: 25 });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const filename = `${schoolSettings?.schoolName?.replace(/\s+/g, '_') || 'School'}_${category}_Directory_${new Date().toISOString().split('T')[0]}.xlsx`;
      saveAs(new Blob([buffer]), filename);
      toast.success(`${category.charAt(0).toUpperCase() + category.slice(1)} directory exported!`);

    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('An error occurred during export.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-black text-gray-900 border-l-4 border-primary pl-3 tracking-tight">School Directory Export</h1>
          <p className="text-gray-500 mt-2 text-sm font-medium max-w-2xl">
            Generate high-quality, formatted reports with school letterheads. Download individual categories or the full system directory.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="group bg-white border border-gray-100 rounded-3xl p-6 flex flex-col items-center justify-center text-center hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Users size={28} />
          </div>
          <h3 className="font-black text-gray-900 text-2xl mb-1">{users.filter(u => u.role === 'student' && u.student?.status !== 'graduated').length}</h3>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Active Students</p>
          <button 
            onClick={() => exportDirectory('students')}
            className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all active:scale-95"
          >
            <FileDown size={14} /> Download List
          </button>
        </div>

        <div className="group bg-white border border-gray-100 rounded-3xl p-6 flex flex-col items-center justify-center text-center hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Briefcase size={28} />
          </div>
          <h3 className="font-black text-gray-900 text-2xl mb-1">{users.filter(u => u.role === 'teacher' || u.teacher).length}</h3>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Staff & Faculty</p>
          <button 
            onClick={() => exportDirectory('staff')}
            className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all active:scale-95"
          >
            <FileDown size={14} /> Download List
          </button>
        </div>

        <div className="group bg-white border border-gray-100 rounded-3xl p-6 flex flex-col items-center justify-center text-center hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-300">
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <GraduationCap size={28} />
          </div>
          <h3 className="font-black text-gray-900 text-2xl mb-1">{alumni.length}</h3>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Registered Alumni</p>
          <button 
            onClick={() => exportDirectory('alumni')}
            className="flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 hover:text-white transition-all active:scale-95"
          >
            <FileDown size={14} /> Download List
          </button>
        </div>

        <div className="group bg-white border border-gray-100 rounded-3xl p-6 flex flex-col items-center justify-center text-center hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300">
          <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <ShieldCheck size={28} />
          </div>
          <h3 className="font-black text-gray-900 text-2xl mb-1">{users.filter(u => ['admin', 'principal', 'accountant', 'examination_officer'].includes(u.role)).length}</h3>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Administrators</p>
          <button 
            onClick={() => exportDirectory('admins')}
            className="flex items-center gap-2 bg-purple-50 text-purple-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-purple-600 hover:text-white transition-all active:scale-95"
          >
            <FileDown size={14} /> Download List
          </button>
        </div>
      </div>

      <div className="bg-white p-10 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-gray-50 text-primary rounded-full flex items-center justify-center mb-6">
          <Download size={40} />
        </div>
        <h2 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">Full System Directory</h2>
        <p className="text-gray-500 mb-8 max-w-lg font-medium">
          Download the complete school database in a single workbook with separated, high-quality sheets.
        </p>
        
        <button
          onClick={() => exportDirectory('all')}
          disabled={loading || users.length === 0}
          className="group relative flex items-center gap-3 bg-primary text-white px-12 py-5 rounded-2xl font-black uppercase tracking-widest text-sm shadow-2xl shadow-primary/30 hover:brightness-110 active:scale-95 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none"
        >
          <Download size={20} className="group-hover:translate-y-0.5 transition-transform" />
          {loading ? 'Generating High-Quality Report...' : 'Download Full Workbook (.xlsx)'}
        </button>
      </div>

    </div>
  );
};

export default DirectoryExport;
