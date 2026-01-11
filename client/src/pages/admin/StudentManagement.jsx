import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import PhotoUpload from '../../components/PhotoUpload';
import { api, API_BASE_URL } from '../../api';
import useSchoolSettings from '../../hooks/useSchoolSettings';

const StudentManagement = () => {
  const { settings: schoolSettings } = useSchoolSettings();
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [newStudentCredentials, setNewStudentCredentials] = useState(null);
  const [showParentCredentialsModal, setShowParentCredentialsModal] = useState(false);
  const [newParentCredentials, setNewParentCredentials] = useState(null);
  const [expandedClasses, setExpandedClasses] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    password: '',
    classId: '',
    admissionYear: new Date().getFullYear(),
    // Personal Information
    dateOfBirth: '',
    gender: '',
    stateOfOrigin: '',
    nationality: 'Nigerian',
    address: '',
    // Parent/Guardian Information
    parentGuardianName: '',
    parentGuardianPhone: '',
    parentEmail: '',
    // Medical Information
    bloodGroup: '',
    genotype: '',
    disability: 'None',
    clubs: ''
  });

  useEffect(() => {
    fetchStudents();
    fetchClasses();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await api.get('/api/students');
      if (response.ok) {
        const data = await response.json();
        setStudents(Array.isArray(data) ? data : []);
      } else {
        console.error('Failed to fetch students:', response.status);
        setStudents([]);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      setStudents([]);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await api.get('/api/classes');
      if (response.ok) {
        const data = await response.json();
        setClasses(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingStudent
        ? `/api/students/${editingStudent.id}`
        : '/api/students';

      const response = await (editingStudent
        ? api.put(url, formData)
        : api.post(url, formData));

      const result = await response.json();

      if (response.ok) {
        if (editingStudent) {
          alert('Student updated successfully!');
        } else {
          // Show credentials modal for new student
          setNewStudentCredentials({
            name: `${formData.firstName} ${formData.lastName}`,
            admissionNumber: result.credentials.admissionNumber,
            username: result.credentials.username,
            password: result.credentials.password,
            mustChangePassword: result.credentials.mustChangePassword
          });
          setShowCredentialsModal(true);
        }
        resetForm();
        fetchStudents();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error saving student:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to save student';
      alert(`Failed to save student: ${errorMessage}`);
    }
  };

  const handleEdit = (student) => {
    setEditingStudent(student);
    setFormData({
      firstName: student.user.firstName,
      middleName: student.middleName || '',
      lastName: student.user.lastName,
      email: student.user.email,
      password: '',
      classId: student.classId || '',
      admissionYear: new Date().getFullYear(),
      dateOfBirth: student.dateOfBirth ? student.dateOfBirth.split('T')[0] : '',
      gender: student.gender || '',
      stateOfOrigin: student.stateOfOrigin || '',
      nationality: student.nationality || 'Nigerian',
      address: student.address || '',
      parentGuardianName: student.parentGuardianName || '',
      parentGuardianPhone: student.parentGuardianPhone || '',
      parentEmail: student.parentEmail || '',
      bloodGroup: student.bloodGroup || '',
      genotype: student.genotype || '',
      disability: student.disability || 'None',
      clubs: student.clubs || '',
      isScholarship: student.isScholarship || false
    });
    setShowForm(true);
    // Scroll to top to show the form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this student?')) return;

    try {
      const response = await api.delete(`/api/students/${id}`);

      if (response.ok) {
        alert('Student deleted successfully!');
        fetchStudents();
      }
    } catch (error) {
      console.error('Error deleting student:', error);
      alert('Failed to delete student');
    }
  };

  const handleResetCredentials = async (student) => {
    if (!confirm(`Are you sure you want to regenerate credentials for ${student.user.firstName} ${student.user.lastName}? This will reset their password to '123456'.`)) return;

    try {
      const response = await api.post('/api/auth/reset-password', {
        userId: student.user.id,
        newPassword: '123456'
      });

      const result = await response.json();

      if (response.ok) {
        setNewStudentCredentials({
          name: `${student.user.firstName} ${student.user.lastName}`,
          admissionNumber: student.admissionNumber,
          username: result.username,
          password: result.temporaryPassword,
          mustChangePassword: true
        });
        setShowCredentialsModal(true);
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error resetting credentials:', error);
      alert('Failed to reset credentials');
    }
  };

  const handleAutoCreateParent = async (student) => {
    if (!student.parentGuardianPhone || !student.parentGuardianName) {
      alert('This student record is missing parent name or phone number. Please edit the student first.');
      return;
    }

    try {
      const response = await api.post(`/api/students/${student.id}/create-parent`);
      const data = await response.json();

      if (response.ok) {
        setNewParentCredentials({
          name: student.parentGuardianName,
          phone: student.parentGuardianPhone,
          username: data.credentials.username,
          password: data.credentials.password,
          isNewAccount: data.isNewAccount,
          studentName: student.user ? `${student.user.firstName} ${student.user.lastName}` : (student.name || 'Student')
        });
        setShowParentCredentialsModal(true);
        fetchStudents(); // Refresh list to update parentId status
      } else {
        alert(`Failed to create parent account: ${data.error}`);
      }
    } catch (error) {
      console.error('Error creating parent account:', error);
      alert('An error occurred while creating the parent account.');
    }
  };

  const downloadParentCredentials = () => {
    if (!newParentCredentials) return;

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Background card
      doc.setFillColor(249, 250, 251); // gray-50
      doc.roundedRect(20, 20, 170, 80, 3, 3, 'F');
      doc.setDrawColor(209, 213, 219); // gray-300
      doc.roundedRect(20, 20, 170, 80, 3, 3, 'S');

      // School Branding
      if (schoolSettings?.schoolName) {
        doc.setFontSize(16);
        doc.setTextColor(17, 24, 39); // gray-900
        doc.setFont('helvetica', 'bold');
        doc.text(schoolSettings.schoolName, 105, 35, { align: 'center' });
        doc.setFontSize(12);
        doc.setTextColor(75, 85, 99); // gray-600
        doc.setFont('helvetica', 'normal');
        doc.text('Parent Login Credentials', 105, 42, { align: 'center' });
      } else {
        doc.setFontSize(16);
        doc.setTextColor(17, 24, 39); // gray-900
        doc.setFont('helvetica', 'bold');
        doc.text('Parent Login Credentials', 105, 35, { align: 'center' });
      }

      // Credentials Content
      doc.setFontSize(12);
      doc.setTextColor(75, 85, 99); // gray-600

      const startX = 40;
      let startY = 55;
      const lineSpacing = 10;

      doc.text('Parent Name:', startX, startY);
      doc.setTextColor(17, 24, 39);
      doc.text(newParentCredentials.name, 90, startY);

      startY += lineSpacing;
      doc.setTextColor(75, 85, 99);
      doc.text('Ward/Student:', startX, startY);
      doc.setTextColor(17, 24, 39);
      doc.text(newParentCredentials.studentName, 90, startY);

      startY += lineSpacing;
      doc.setTextColor(75, 85, 99);
      doc.text('Username:', startX, startY);
      doc.setTextColor(17, 24, 39);
      doc.text(newParentCredentials.username, 90, startY);

      startY += lineSpacing;
      doc.setTextColor(75, 85, 99);
      doc.text('Password:', startX, startY);
      doc.setTextColor(17, 24, 39);
      doc.text(newParentCredentials.isNewAccount ? newParentCredentials.password : '(Existing Password)', 90, startY);

      // Footnote
      startY += lineSpacing + 5;
      doc.setFontSize(10);
      if (newParentCredentials.isNewAccount) {
        doc.setTextColor(180, 83, 9); // amber-600
        doc.text('Note: Password must be changed upon first login for security.', 105, startY, { align: 'center' });
      } else {
        doc.setTextColor(37, 99, 235); // blue-600
        doc.text('Note: Student linked to existing account. Use your current password.', 105, startY, { align: 'center' });
      }

      doc.save(`${newParentCredentials.name}_ParentCredentials.pdf`);
    } catch (pdfError) {
      console.error('PDF Generation Error:', pdfError);
      alert('Failed to generate PDF. Please try the Print option.');
    }
  };

  const downloadCredentials = () => {
    if (!newStudentCredentials) return;

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Background card
      doc.setFillColor(249, 250, 251); // gray-50
      doc.roundedRect(20, 20, 170, 80, 3, 3, 'F');
      doc.setDrawColor(209, 213, 219); // gray-300
      doc.roundedRect(20, 20, 170, 80, 3, 3, 'S');

      // School Branding
      if (schoolSettings?.schoolName) {
        doc.setFontSize(16);
        doc.setTextColor(17, 24, 39); // gray-900
        doc.setFont('helvetica', 'bold');
        doc.text(schoolSettings.schoolName, 105, 35, { align: 'center' });
        doc.setFontSize(12);
        doc.setTextColor(75, 85, 99); // gray-600
        doc.setFont('helvetica', 'normal');
        doc.text('Student Login Credentials', 105, 42, { align: 'center' });
      } else {
        doc.setFontSize(16);
        doc.setTextColor(17, 24, 39); // gray-900
        doc.setFont('helvetica', 'bold');
        doc.text('Student Login Credentials', 105, 35, { align: 'center' });
      }

      // Credentials Content
      doc.setFontSize(12);
      doc.setTextColor(75, 85, 99); // gray-600

      const startX = 40;
      let startY = 55;
      const lineSpacing = 10;

      doc.text('Name:', startX, startY);
      doc.setTextColor(17, 24, 39);
      doc.text(newStudentCredentials.name, 90, startY);

      startY += lineSpacing;
      doc.setTextColor(75, 85, 99);
      doc.text('Admission No:', startX, startY);
      doc.setTextColor(17, 24, 39);
      doc.text(newStudentCredentials.admissionNumber, 90, startY);

      startY += lineSpacing;
      doc.setTextColor(75, 85, 99);
      doc.text('Username:', startX, startY);
      doc.setTextColor(17, 24, 39);
      doc.text(newStudentCredentials.username, 90, startY);

      startY += lineSpacing;
      doc.setTextColor(75, 85, 99);
      doc.text('Password:', startX, startY);
      doc.setTextColor(17, 24, 39);
      doc.text(newStudentCredentials.password, 90, startY);

      if (newStudentCredentials.mustChangePassword) {
        startY += 15;
        doc.setFontSize(10);
        doc.setTextColor(217, 119, 6); // amber-600
        doc.text('âš ï¸ Student will be required to change this password on first login.', 105, startY, { align: 'center' });
      }

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175); // gray-400
      doc.text('Please keep these credentials secure.', 105, 95, { align: 'center' });

      doc.save(`credentials_${newStudentCredentials.username}.pdf`);
    } catch (error) {
      console.error('PDF Generation Error:', error);
      alert('Failed to generate PDF. Downloading text file instead.');

      // Fallback to text file
      const text = `
------------------------------------------
   STUDENT LOGIN CREDENTIALS
------------------------------------------
Name: ${newStudentCredentials.name}
Admission No: ${newStudentCredentials.admissionNumber}
Username: ${newStudentCredentials.username}
Password: ${newStudentCredentials.password}
------------------------------------------
Note: Password must be changed on first login.
------------------------------------------
    `;
      const element = document.createElement("a");
      const file = new Blob([text], { type: 'text/plain' });
      element.href = URL.createObjectURL(file);
      element.download = `credentials_${newStudentCredentials.username}.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      middleName: '',
      lastName: '',
      email: '',
      password: '',
      classId: '',
      admissionYear: new Date().getFullYear(),
      dateOfBirth: '',
      gender: '',
      stateOfOrigin: '',
      nationality: 'Nigerian',
      address: '',
      parentGuardianName: '',
      parentGuardianPhone: '',
      parentEmail: '',
      bloodGroup: '',
      genotype: '',
      disability: 'None',
      isScholarship: false
    });
    setEditingStudent(null);
    setShowForm(false);
  };

  const toggleClassExpansion = (classId) => {
    const newExpanded = new Set(expandedClasses);
    if (newExpanded.has(classId)) {
      newExpanded.delete(classId);
    } else {
      newExpanded.add(classId);
    }
    setExpandedClasses(newExpanded);
  };

  // Group students by class
  const groupedStudents = () => {
    const grouped = {};

    students.forEach(student => {
      const classKey = student.classId || 'unassigned';
      if (!grouped[classKey]) {
        grouped[classKey] = [];
      }
      grouped[classKey].push(student);
    });

    return grouped;
  };

  // Filter students by search query
  const filteredStudents = students.filter(student => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const fullName = `${student.user.firstName} ${student.user.lastName}`.toLowerCase();
    const admissionNumber = student.admissionNumber?.toLowerCase() || '';
    return fullName.includes(query) || admissionNumber.includes(query);
  });

  const getClassInfo = (classId) => {
    if (classId === 'unassigned') {
      return { name: 'Unassigned Students', arm: '', id: 'unassigned' };
    }
    // Convert classId to number if it's a string (from Object.keys())
    const numericClassId = typeof classId === 'string' && classId !== 'unassigned' ? parseInt(classId) : classId;
    return classes.find(c => c.id === numericClassId) || { name: 'Unknown Class', arm: '', id: classId };
  };

  const grouped = groupedStudents();
  const sortedClassIds = Object.keys(grouped).sort((a, b) => {
    if (a === 'unassigned') return 1;
    if (b === 'unassigned') return -1;
    const classA = getClassInfo(a);
    const classB = getClassInfo(b);
    return `${classA.name} ${classA.arm}`.localeCompare(`${classB.name} ${classB.arm}`);
  });

  const handleDownloadTemplate = () => {
    const url = `${API_BASE_URL}/api/bulk-upload/template/students`;
    const token = localStorage.getItem('token');

    fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(response => response.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Student_Import_Template.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      })
      .catch(error => {
        console.error('Download error:', error);
        alert('Failed to download template');
      });
  };

  const handleDownloadGuidancePDF = () => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(22);
    doc.setTextColor(44, 62, 80);
    doc.text('Bulk Student Upload Guidance', 105, 20, { align: 'center' });

    // Instructions
    doc.setFontSize(14);
    doc.setTextColor(52, 73, 94);
    doc.text('Step-by-Step Instructions:', 20, 35);

    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    const instructions = [
      '1. Download the CSV template from the Student Management header.',
      '2. Open the template in Excel, Google Sheets, or a text editor.',
      '3. Fill in the student data. Ensure firstName, lastName, and classId are provided.',
      '4. The "classId" MUST be numeric. Refer to the table below for correct IDs.',
      '5. Save your file as "Comma Separated Values (.csv)".',
      '6. Click "Bulk Import" on the dashboard to upload your file.'
    ];
    doc.text(instructions, 20, 45);

    // Class IDs Table
    doc.setFontSize(14);
    doc.setTextColor(52, 73, 94);
    doc.text('Official Class IDs Reference:', 20, 90);

    autoTable(doc, {
      startY: 95,
      head: [['ID (Value for CSV)', 'Class Name', 'Class Arm']],
      body: classes.map(c => [c.id, c.name, c.arm || 'N/A']),
      headStyles: { fillColor: [43, 108, 176] },
      margin: { top: 10 }
    });

    // Formatting Note
    const finalY = (doc).lastAutoTable.finalY + 15;
    doc.setFontSize(10);
    doc.setTextColor(150, 0, 0);
    doc.text('IMPORTANT: Dates must be in YYYY-MM-DD format (e.g., 2015-05-15).', 20, finalY);

    doc.save('Student_Bulk_Upload_Guide.pdf');
  };

  const handleBulkUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!confirm(`Registering students from "${file.name}". This will create user accounts and admission numbers automatically. Continue?`)) {
      e.target.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/api/bulk-upload/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      if (response.ok) {
        alert(data.message || 'Import completed successfully');
        if (data.failed && data.failed.length > 0) {
          console.error('Failed students:', data.failed);
          alert(`Warning: ${data.failed.length} students failed to import. Check console for details.`);
        }
        fetchStudents();
      } else {
        alert(`Import failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload file');
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            {students.length} {students.length === 1 ? 'student' : 'students'} registered across {Object.keys(grouped).length} {Object.keys(grouped).length === 1 ? 'group' : 'groups'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadTemplate}
            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm font-medium shadow-sm"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Template
          </button>
          <button
            onClick={handleDownloadGuidancePDF}
            className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-md hover:bg-amber-100 transition-colors flex items-center gap-2 text-sm font-bold shadow-sm"
            title="Download Upload Guide & Class IDs"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Guide
          </button>
          <label className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm font-medium shadow-sm cursor-pointer">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Bulk Import
            <input
              type="file"
              className="hidden"
              accept=".csv,.xlsx"
              onChange={handleBulkUpload}
            />
          </label>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-primary text-white px-6 py-2 rounded-md hover:brightness-90 transition-colors flex items-center gap-2 shadow-sm font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {showForm ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              )}
            </svg>
            {showForm ? 'Cancel' : 'Add Student'}
          </button>
        </div>
      </div>

      {/* Search Bar */}
      {
        !showForm && (
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search students by name or admission number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )
      }

      {/* Student Registration Form */}
      {
        showForm && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">
              {editingStudent ? 'Edit Student' : 'Register New Student'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div>
                <h4 className="font-medium text-gray-700 mb-3 border-b pb-2">Basic Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full border rounded-md px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Middle Name / Other Name
                    </label>
                    <input
                      type="text"
                      value={formData.middleName || ''}
                      onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                      className="w-full border rounded-md px-3 py-2"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full border rounded-md px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email (Optional)
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full border rounded-md px-3 py-2"
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                    <input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      className="w-full border rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full border rounded-md px-3 py-2"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">State of Origin</label>
                    <input
                      type="text"
                      value={formData.stateOfOrigin}
                      onChange={(e) => setFormData({ ...formData, stateOfOrigin: e.target.value })}
                      className="w-full border rounded-md px-3 py-2"
                      placeholder="e.g., Lagos"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nationality</label>
                    <input
                      type="text"
                      value={formData.nationality}
                      onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                      className="w-full border rounded-md px-3 py-2"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full border rounded-md px-3 py-2"
                      placeholder="Full residential address"
                    />
                  </div>
                </div>
              </div>

              {/* Academic Information */}
              <div>
                <h4 className="font-medium text-gray-700 mb-3 border-b pb-2">Academic Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Class <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.classId}
                      onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                      className="w-full border rounded-md px-3 py-2"
                      required
                    >
                      <option value="">Select Class</option>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name} {cls.arm || ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Admission Year</label>
                    <input
                      type="number"
                      value={formData.admissionYear}
                      onChange={(e) => setFormData({ ...formData, admissionYear: e.target.value })}
                      className="w-full border rounded-md px-3 py-2"
                      min="2000"
                      max={new Date().getFullYear() + 1}
                    />
                    <p className="text-xs text-gray-500 mt-1">Used for admission number generation</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Club / Society</label>
                    <input
                      list="clubs-list"
                      type="text"
                      value={formData.clubs || ''}
                      onChange={(e) => setFormData({ ...formData, clubs: e.target.value })}
                      className="w-full border rounded-md px-3 py-2"
                      placeholder="Select or type..."
                    />
                    <datalist id="clubs-list">
                      <option value="Press Club" />
                      <option value="JETS Club" />
                      <option value="Debating Club" />
                      <option value="Literary & Debating Society" />
                      <option value="Young Farmers Club" />
                      <option value="Red Cross" />
                      <option value="Scouts" />
                      <option value="Muslim Students Society" />
                      <option value="Christian Fellowship" />
                      <option value="Drama Club" />
                    </datalist>
                  </div>
                </div>
              </div>

              {/* Parent/Guardian Information */}
              <div>
                <h4 className="font-medium text-gray-700 mb-3 border-b pb-2">Parent/Guardian Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Parent/Guardian Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={formData.parentGuardianName}
                      onChange={(e) => setFormData({ ...formData, parentGuardianName: e.target.value })}
                      className="w-full border rounded-md px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Parent/Guardian Phone <span className="text-red-500">*</span></label>
                    <input
                      type="tel"
                      value={formData.parentGuardianPhone}
                      onChange={(e) => setFormData({ ...formData, parentGuardianPhone: e.target.value })}
                      className="w-full border rounded-md px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Parent Email</label>
                    <input
                      type="email"
                      value={formData.parentEmail}
                      onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                      className="w-full border rounded-md px-3 py-2"
                    />
                  </div>
                </div>
              </div>

              {/* Medical Information */}
              <div>
                <h4 className="font-medium text-gray-700 mb-3 border-b pb-2">Medical Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Blood Group</label>
                    <select
                      value={formData.bloodGroup}
                      onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                      className="w-full border rounded-md px-3 py-2"
                    >
                      <option value="">Select Blood Group</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Genotype</label>
                    <select
                      value={formData.genotype}
                      onChange={(e) => setFormData({ ...formData, genotype: e.target.value })}
                      className="w-full border rounded-md px-3 py-2"
                    >
                      <option value="">Select Genotype</option>
                      <option value="AA">AA</option>
                      <option value="AS">AS</option>
                      <option value="SS">SS</option>
                      <option value="AC">AC</option>
                      <option value="SC">SC</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Disability</label>
                    <select
                      value={formData.disability}
                      onChange={(e) => setFormData({ ...formData, disability: e.target.value })}
                      className="w-full border rounded-md px-3 py-2"
                    >
                      <option value="None">None</option>
                      <option value="Physical">Physical</option>
                      <option value="Visual">Visual</option>
                      <option value="Hearing">Hearing</option>
                      <option value="Learning">Learning</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Photo Upload (only when editing) */}
              {/* Administrative Controls */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="font-medium text-gray-700 mb-3 border-b pb-2">Administrative Actions</h4>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col md:flex-row gap-6">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isScholarship}
                        onChange={(e) => setFormData({ ...formData, isScholarship: e.target.checked })}
                        className="rounded text-primary focus:ring-primary h-4 w-4"
                      />
                      <span className="text-sm font-medium text-gray-700">Scholarship Student (Exempt from fees)</span>
                    </label>
                  </div>
                </div>
              </div>

              {editingStudent && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-3 border-b pb-2">Student Photo</h4>
                  <PhotoUpload
                    studentId={editingStudent.id}
                    currentPhotoUrl={editingStudent.photoUrl}
                    onPhotoUpload={(photoUrl) => {
                      // Update local state
                      setEditingStudent({ ...editingStudent, photoUrl });
                      // Refresh student list
                      fetchStudents();
                    }}
                  />
                </div>
              )}

              {/* Form Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <button
                  type="submit"
                  className="bg-primary text-white px-6 py-2 rounded-md hover:brightness-90 transition-colors"
                >
                  {editingStudent ? 'Update Student' : 'Register Student'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )
      }

      {/* Class-Based Student Cards */}
      {
        !showForm && (
          <div className="space-y-4">
            {sortedClassIds.map((classId) => {
              const classInfo = getClassInfo(classId);
              const classStudents = grouped[classId];
              const isExpanded = expandedClasses.has(classId);

              return (
                <div key={classId} className="bg-white rounded-lg shadow overflow-hidden">
                  <button
                    onClick={() => toggleClassExpansion(classId)}
                    className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg text-gray-800">
                        {classInfo.name} {classInfo.arm}
                      </span>
                      <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full font-medium">
                        {classStudents.length} Students
                      </span>
                    </div>
                    <svg
                      className={`w-5 h-5 text-gray-500 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-200">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admission No</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {classStudents.map((student) => (
                              <tr key={student.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    {student.photoUrl ? (
                                      <img className="h-8 w-8 rounded-full object-cover mr-3" src={`${API_BASE_URL}${student.photoUrl}`} alt="" />
                                    ) : (
                                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold mr-3">
                                        {student.user.firstName[0]}
                                      </div>
                                    )}
                                    <div className="text-sm font-medium text-gray-900">
                                      {student.user.lastName} {student.user.firstName} {student.middleName}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  <div className="flex flex-col gap-1">
                                    {student.status === 'active' ? (
                                      <span className="px-2 w-fit inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                        Active
                                      </span>
                                    ) : (
                                      <span className="px-2 w-fit inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                        {student.status}
                                      </span>
                                    )}
                                    {student.isScholarship && (
                                      <span className="px-2 w-fit inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                        Scholarship
                                      </span>
                                    )}

                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {student.admissionNumber}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {student.gender}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  <button
                                    onClick={() => handleResetCredentials(student)}
                                    className="text-amber-600 hover:text-amber-900 mr-4"
                                    title="Reset/View Credentials"
                                  >
                                    Credentials
                                  </button>
                                  {!student.parentId && student.parentGuardianPhone && (
                                    <button
                                      onClick={() => handleAutoCreateParent(student)}
                                      className="text-green-600 hover:text-green-800 mr-4"
                                      title="Create Parent Account"
                                    >
                                      Create Parent
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleEdit(student)}
                                    className="text-indigo-600 hover:text-indigo-900 mr-4"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDelete(student.id)}
                                    className="text-red-600 hover:text-red-900"
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      }

      {/* Credentials Modal */}
      {
        showCredentialsModal && newStudentCredentials && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 print:bg-white print:p-0">
            <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl print:shadow-none print:max-w-none print:w-full print:border-none" id="credentials-print-area">
              <h3 className="text-xl font-bold mb-4 text-center print:hidden">Registration Successful!</h3>
              <div className="bg-gray-50 p-4 rounded-md mb-6 space-y-2 border border-gray-200">
                <p className="flex justify-between"><span className="font-semibold text-gray-600">Name:</span> <span className="font-medium">{newStudentCredentials.name}</span></p>
                <p className="flex justify-between"><span className="font-semibold text-gray-600">Admission No:</span> <span className="font-mono bg-white px-2 rounded border">{newStudentCredentials.admissionNumber}</span></p>
                <p className="flex justify-between"><span className="font-semibold text-gray-600">Username:</span> <span className="font-mono bg-white px-2 rounded border">{newStudentCredentials.username}</span></p>
                <p className="flex justify-between"><span className="font-semibold text-gray-600">Password:</span> <span className="font-mono bg-white px-2 rounded border">{newStudentCredentials.password}</span></p>

                {newStudentCredentials.mustChangePassword && (
                  <div className="mt-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
                    âš ï¸ Student will be required to change this password on first login.
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 print:hidden">
                <button
                  onClick={() => {
                    const text = `Student Login Credentials\n\nName: ${newStudentCredentials.name}\nAdmission Number: ${newStudentCredentials.admissionNumber}\nUsername: ${newStudentCredentials.username}\nPassword: ${newStudentCredentials.password}\n\n${newStudentCredentials.mustChangePassword ? 'Note: Password must be changed on first login' : ''}`;
                    navigator.clipboard.writeText(text);
                    alert('Credentials copied to clipboard!');
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm font-semibold"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  Copy
                </button>
                <button
                  onClick={downloadCredentials}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-sm font-semibold"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </button>
                <button
                  onClick={() => window.print()}
                  className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 text-sm font-semibold print:hidden"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print
                </button>
                <button
                  onClick={() => setShowCredentialsModal(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors text-sm font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Parent Credentials Modal */}
      {
        showParentCredentialsModal && newParentCredentials && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 print:bg-white print:p-0">
            <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl print:shadow-none print:max-w-none print:w-full print:border-none" id="credentials-print-area">
              <h3 className="text-xl font-bold mb-4 text-center print:hidden">
                {newParentCredentials.isNewAccount ? 'Parent Account Created!' : 'Parent Account Linked!'}
              </h3>
              <div className="bg-gray-50 p-4 rounded-md mb-6 space-y-2 border border-gray-200">
                <p className="flex justify-between"><span className="font-semibold text-gray-600">Parent Name:</span> <span className="font-medium">{newParentCredentials.name}</span></p>
                <p className="flex justify-between"><span className="font-semibold text-gray-600">Ward:</span> <span className="font-medium">{newParentCredentials.studentName}</span></p>
                <p className="flex justify-between"><span className="font-semibold text-gray-600">Username:</span> <span className="font-mono bg-white px-2 rounded border">{newParentCredentials.username}</span></p>
                <p className="flex justify-between"><span className="font-semibold text-gray-600">Password:</span> <span className="font-mono bg-white px-2 rounded border">{newParentCredentials.isNewAccount ? newParentCredentials.password : '(Existing Password)'}</span></p>

                {newParentCredentials.isNewAccount ? (
                  <div className="mt-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
                    ⚠️ Parent will be required to change this password on first login.
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-blue-600 bg-blue-50 p-2 rounded">
                    ℹ️ This phone number is already registered. The parent can login with their existing password to manage both wards.
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 print:hidden">
                <button
                  onClick={() => {
                    const passwordText = newParentCredentials.isNewAccount ? newParentCredentials.password : '(Existing Password)';
                    const noteText = newParentCredentials.isNewAccount
                      ? 'Note: Password must be changed on first login'
                      : 'Note: This student has been linked to your existing parent account. Use your current password to login.';

                    const text = `Parent Login Credentials\n\nName: ${newParentCredentials.name}\nWard: ${newParentCredentials.studentName}\nUsername: ${newParentCredentials.username}\nPassword: ${passwordText}\n\n${noteText}`;
                    navigator.clipboard.writeText(text);
                    alert('Credentials copied to clipboard!');
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm font-semibold"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  Copy
                </button>
                <button
                  onClick={downloadParentCredentials}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-sm font-semibold"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </button>
                <button
                  onClick={() => window.print()}
                  className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 text-sm font-semibold print:hidden"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print
                </button>
                <button
                  onClick={() => setShowParentCredentialsModal(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors text-sm font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Unified Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #credentials-print-area, #credentials-print-area * {
            visibility: visible;
          }
          #credentials-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0 !important;
            padding: 10mm !important;
            background: white !important;
            border: none !important;
            box-shadow: none !important;
          }
          .print\\:hidden {
            display: none !important;
            visibility: hidden !important;
          }
        }
      `}</style>
    </div >
  );
};

export default StudentManagement;
