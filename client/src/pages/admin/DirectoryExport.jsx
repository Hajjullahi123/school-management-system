import React, { useState, useEffect } from 'react';
import { api } from '../../../api';
import { useAuth } from '../../../context/AuthContext';
import * as XLSX from 'xlsx';
import { Download } from 'lucide-react';
import toast from 'react-hot-toast';

const DirectoryExport = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [classes, setClasses] = useState([]);

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
    } catch (error) {
      console.error('Error fetching directory data:', error);
      toast.error('Failed to prepare directory data.');
    } finally {
      setLoading(false);
    }
  };

  const exportDirectory = () => {
    if (!users || users.length === 0) {
      toast.error('No data available to export.');
      return;
    }

    try {
      // 1. Process Students
      const studentsRaw = users.filter(u => u.role === 'student');
      const studentsData = studentsRaw.map(u => ({
        'First Name': u.firstName,
        'Last Name': u.lastName,
        'Full Name': `${u.firstName} ${u.lastName}`,
        'Admission Number': u.student?.admissionNumber || 'N/A',
        'Username': u.username,
        'Class': u.student?.classModel?.name || 'Unassigned',
        'Gender': u.student?.gender || 'N/A',
        'Parent Email': u.student?.parentEmail || 'N/A',
        'Parent Phone': u.student?.parentPhone || 'N/A'
      }));

      // 2. Process Staff (Teachers & Form Masters)
      const staffRaw = users.filter(u => u.role === 'teacher' || u.teacher);
      const staffData = staffRaw.map(u => {
        // Find if this teacher is a form master for any class
        const masterClasses = classes
          .filter(c => c.classTeacherId === u.id)
          .map(c => `${c.name} ${c.arm || ''}`.trim());
        
        return {
          'First Name': u.firstName,
          'Last Name': u.lastName,
          'Full Name': `${u.firstName} ${u.lastName}`,
          'Staff ID': u.teacher?.staffId || 'N/A',
          'Username': u.username,
          'Specialization': u.teacher?.specialization || 'N/A',
          'Phone': u.phone || 'N/A',
          'Email': u.email || 'N/A',
          'Is Form Master For': masterClasses.length > 0 ? masterClasses.join(', ') : 'None'
        };
      });

      // 3. Process Admins & Principals
      const adminsRaw = users.filter(u => ['admin', 'principal', 'accountant', 'examination_officer'].includes(u.role));
      const adminsData = adminsRaw.map(u => {
        let displayRole = u.role;
        if (u.role === 'examination_officer') displayRole = 'Examination Officer';
        if (u.role === 'admin') displayRole = 'System Admin';
        if (u.role === 'principal') displayRole = 'School Principal';
        if (u.role === 'accountant') displayRole = 'System Accountant';

        return {
          'First Name': u.firstName,
          'Last Name': u.lastName,
          'Full Name': `${u.firstName} ${u.lastName}`,
          'Role': displayRole,
          'Username': u.username,
          'Phone': u.phone || 'N/A',
          'Email': u.email || 'N/A'
        };
      });

      // Create a workbook
      const wb = XLSX.utils.book_new();

      // Ensure lists are not empty to avoid empty sheet errors
      const addSheet = (dataArray, sheetName) => {
        if (dataArray.length === 0) {
           dataArray = [{ 'No Data': 'No records found for this category' }];
        }
        const ws = XLSX.utils.json_to_sheet(dataArray);
        
        // Auto-size columns loosely
        const cols = Object.keys(dataArray[0]).map(() => ({ wch: 20 }));
        ws['!cols'] = cols;
        
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      };

      addSheet(studentsData, 'All Students');
      addSheet(staffData, 'Staff & Form Masters');
      addSheet(adminsData, 'Administrators');

      // Save file
      const timestamp = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `School_Directory_Export_${timestamp}.xlsx`);
      
      toast.success('Directory exported successfully!');

    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('An error occurred during export.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 border-l-4 border-primary pl-3">School Directory Export</h1>
          <p className="text-gray-500 mt-2 text-sm max-w-2xl">
            Download a comprehensive spreadsheet containing organized lists of all students, staff, form masters, and administrators registered in the system.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h3 className="font-bold text-gray-900 text-lg mb-1">{users.filter(u => u.role === 'student').length}</h3>
          <p className="text-sm font-medium text-gray-600">Total Students</p>
        </div>

        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-6 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="font-bold text-gray-900 text-lg mb-1">{users.filter(u => u.role === 'teacher').length}</h3>
          <p className="text-sm font-medium text-gray-600">Total Teachers & Staff</p>
        </div>

        <div className="bg-purple-50 border border-purple-100 rounded-xl p-6 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h3 className="font-bold text-gray-900 text-lg mb-1">{users.filter(u => ['admin', 'principal', 'accountant', 'examination_officer'].includes(u.role)).length}</h3>
          <p className="text-sm font-medium text-gray-600">Administrators</p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Generate Excel Report</h2>
        <p className="text-gray-600 mb-8 max-w-lg">
          Click the button below to download the complete directory. The downloaded Excel file will contain separate sheets for students, staff, and administrators.
        </p>
        
        <button
          onClick={exportDirectory}
          disabled={loading || users.length === 0}
          className="flex items-center gap-2 bg-primary text-white px-8 py-3 rounded-lg font-bold shadow-md hover:bg-primary-dark transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          <Download size={20} />
          {loading ? 'Preparing Data...' : 'Download Full Directory (.xlsx)'}
        </button>
      </div>

    </div>
  );
};

export default DirectoryExport;
