import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import PhotoUpload from '../../components/PhotoUpload';
import { api, API_BASE_URL } from '../../api';
import useSchoolSettings from '../../hooks/useSchoolSettings';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const loadImage = (url) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = url;
  });
};

const StudentManagement = () => {
  const { settings: schoolSettings } = useSchoolSettings();
  const navigate = useNavigate();
  const { isDemo } = useAuth();
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
  const [bulkUploadResults, setBulkUploadResults] = useState(null);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

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
            name: `${formData.firstName} ${formData.lastName} ${formData.middleName || ''}`.trim(),
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
    
    const legacyNameParts = (student.name || '').trim().split(/\s+/);
    const hasUserNames = !!(student.user?.firstName || student.user?.lastName);
    
    let recoveredFirstName = student.user?.firstName || '';
    let recoveredMiddleName = student.middleName || '';
    let recoveredLastName = student.user?.lastName || '';

    if (!hasUserNames && legacyNameParts.length > 0 && legacyNameParts[0] !== '') {
      if (legacyNameParts.length === 1) {
        recoveredFirstName = legacyNameParts[0];
      } else if (legacyNameParts.length === 2) {
        recoveredFirstName = legacyNameParts[0];
        recoveredLastName = legacyNameParts[1];
      } else {
        recoveredFirstName = legacyNameParts[0];
        recoveredMiddleName = legacyNameParts.slice(1, -1).join(' ');
        recoveredLastName = legacyNameParts[legacyNameParts.length - 1];
      }
    }

    setFormData({
      firstName: recoveredFirstName,
      middleName: recoveredMiddleName,
      lastName: recoveredLastName,
      email: student.user?.email || '',
      admissionNumber: student.admissionNumber || '',
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
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to delete student');
      }
    } catch (error) {
      console.error('Error deleting student:', error);
      alert('Failed to delete student');
    }
  };

  const handleResetCredentials = async (student) => {
    if (!student.user) {
      alert('This student does not have an active user account.');
      return;
    }
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
        doc.text('Note: Student will be required to change this password on first login.', 105, startY, { align: 'center' });
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

    // Sort students alphabetically within each class
    Object.keys(grouped).forEach(classKey => {
      grouped[classKey].sort((a, b) => {
        const nameA = a.user ? `${a.user.firstName} ${a.user.lastName} ${a.middleName || ''}`.trim().toLowerCase() : (a.name || a.middleName || `unknown student (${a.admissionNumber})`).toLowerCase();
        const nameB = b.user ? `${b.user.firstName} ${b.user.lastName} ${b.middleName || ''}`.trim().toLowerCase() : (b.name || b.middleName || `unknown student (${b.admissionNumber})`).toLowerCase();
        return nameA.localeCompare(nameB);
      });
    });

    return grouped;
  };

  // Filter students by search query
  const filteredStudents = students.filter(student => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const fullName = student.user ? `${student.user.firstName} ${student.user.lastName} ${student.middleName || ''}`.toLowerCase() : (student.name || student.middleName || `unknown student (${student.admissionNumber})`).toLowerCase();
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

  const handleDownloadTemplate = async () => {
    const url = `${API_BASE_URL}/api/bulk-upload/template/students`;
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to download template');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `Student_Bulk_Upload_Template.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      a.remove();
      toast.success('Template downloaded successfully');
    } catch (error) {
      console.error('Download error:', error);
      toast.error(error.message || 'Failed to download template');
    }
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
      '1. Download the Excel (.xlsx) template from the Student Management header.',
      '2. Open the template in Excel or Google Sheets.',
      '3. Fill in the student data. First Name, Surname, and Class ID are REQUIRED.',
      '4. The "Class ID" column MUST use the Numeric ID from the table below.',
      '5. For the "Scholarship" column, use "Yes" for scholarship students and "No" for others.',
      '6. Save your file as Excel (.xlsx) or Comma Separated Values (.csv).',
      '7. Click "Bulk Import" on the dashboard to upload your file.'
    ];
    doc.text(instructions, 20, 45);

    // Class IDs Table
    doc.setFontSize(14);
    doc.setTextColor(52, 73, 94);
    doc.text('Official Class IDs Reference:', 20, 90);

    autoTable(doc, {
      startY: 95,
      head: [['ID (Value for Template)', 'Class Name', 'Class Arm']],
      body: classes.map((c, index) => [index + 1, c.name, c.arm || 'N/A']),
      headStyles: { fillColor: [43, 108, 176] },
      margin: { top: 10 }
    });

    // Formatting Note
    const finalY = (doc).lastAutoTable.finalY + 15;
    doc.setFontSize(10);
    doc.setTextColor(150, 0, 0);
    doc.text('IMPORTANT: Date of Birth must be in YYYY-MM-DD format (e.g., 2015-05-15).', 20, finalY);

    doc.save('Student_Bulk_Upload_Guide.pdf');
  };

  const handleDownloadPrintableForm = async () => {
    const doc = new jsPDF();
    const primaryColor = schoolSettings?.primaryColor || '#1e40af';

    // Add Logo if available
    if (schoolSettings?.logoUrl) {
      try {
        const logoImg = await loadImage(schoolSettings.logoUrl);
        doc.addImage(logoImg, 'PNG', 20, 10, 25, 25);
      } catch (error) {
        console.error('Error adding logo to PDF:', error);
      }
    }

    // Header Section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(primaryColor);
    doc.text(schoolSettings?.schoolName || 'SCHOOL NAME', 105, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100);
    doc.text(schoolSettings?.schoolMotto || 'Motto goes here', 105, 26, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(schoolSettings?.schoolAddress || 'Address, City, State', 105, 32, { align: 'center' });
    doc.text(`Phone: ${schoolSettings?.schoolPhone || ''} | Email: ${schoolSettings?.schoolEmail || ''}`, 105, 36, { align: 'center' });

    doc.setLineWidth(0.5);
    doc.setDrawColor(primaryColor);
    doc.line(20, 42, 190, 42);

    // Passport Photo Box
    doc.setDrawColor(180);
    doc.setLineWidth(0.2);
    doc.rect(160, 7, 30, 32);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150);
    doc.text('AFFIX', 175, 20, { align: 'center' });
    doc.text('PASSPORT', 175, 23, { align: 'center' });
    doc.text('HERE', 175, 26, { align: 'center' });

    // Form Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('STUDENT ADMISSION / ENROLLMENT FORM', 105, 52, { align: 'center' });

    // Instruction
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('Instructions: Please fill this form in BLOCK LETTERS. Return to the School Admin upon completion.', 105, 58, { align: 'center' });

    let y = 70;
    const drawSectionHeader = (title, currentY) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setFillColor(240, 240, 240);
      doc.rect(20, currentY - 5, 170, 7, 'F');
      doc.setTextColor(primaryColor);
      doc.text(title, 25, currentY);
      return currentY + 12;
    };

    const drawField = (label, currentY, width = 170) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(50);
      doc.text(label, 20, currentY);
      doc.setDrawColor(200);
      doc.setLineWidth(0.1);
      doc.line(20, currentY + 2, 20 + width, currentY + 2);
      return currentY + 10;
    };

    // Personal Information
    y = drawSectionHeader('PERSONAL INFORMATION', y);
    y = drawField('First Name:', y, 170);
    y = drawField('Surname:', y, 170);
    y = drawField('Other Name:', y, 170);

    // Row 1: Gender & DOB
    doc.setFont('helvetica', 'bold');
    doc.text('Gender (Male/Female):', 20, y);
    doc.line(20, y + 2, 90, y + 2);
    doc.text('Date of Birth (YYYY-MM-DD):', 100, y);
    doc.line(100, y + 2, 190, y + 2);
    y += 12;

    // Row 2: Genotype & Disability
    doc.text('Genotype (AA, AS, SS, etc):', 20, y);
    doc.line(20, y + 2, 90, y + 2);
    doc.text('Disability (if any):', 100, y);
    doc.line(100, y + 2, 190, y + 2);
    y += 12;

    y = drawField('Student Email (Optional):', y, 170);
    y = drawField('Home Address:', y, 170);
    y = drawField('Home Address (Contd):', y, 170);

    // Parent Information
    y += 5;
    y = drawSectionHeader('PARENT / GUARDIAN INFORMATION', y);
    y = drawField("Full Name:", y, 170);
    y = drawField("Phone Number:", y, 170);
    y = drawField("Email Address:", y, 170);

    // Academic Information
    y += 5;
    y = drawSectionHeader('ACADEMIC INFORMATION', y);
    y = drawField("Intended Class:", y, 170);

    doc.text('Scholarship Eligibility (Yes/No):', 20, y);
    doc.line(20, y + 2, 90, y + 2);
    y += 20;

    // Consent section
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('Declaration: I hereby certify that the information provided above is true and correct to the best of my knowledge.', 20, y);
    y += 15;

    doc.setFont('helvetica', 'bold');
    doc.text('Parent/Guardian Signature: ___________________________', 20, y);
    doc.text('Date: _______________', 140, y);

    y += 25;
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.rect(20, y, 170, 30);
    doc.setFontSize(9);
    doc.text('OFFICIAL USE ONLY', 105, y + 6, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text('Admission No: ____________________', 25, y + 14);
    doc.text('Class Assigned: ___________________', 25, y + 22);
    doc.text('Admin Signature: __________________', 110, y + 22);

    doc.save(`Admission_Form_${schoolSettings?.schoolName?.replace(/\s+/g, '_') || 'Student'}.pdf`);
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
      setIsUploading(true);
      const response = await fetch(`${API_BASE_URL}/api/bulk-upload/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      setBulkUploadResults(data);
      setShowBulkUploadModal(true);
      if (response.ok) {
        fetchStudents();
      } else {
        alert(`Import failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload file');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Student Management</h1>
          <p className="text-[10px] sm:text-xs text-gray-500 mt-1 font-bold uppercase tracking-widest">
            {students.length} Total Students • {Object.keys(grouped).length} Classes
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <button
            onClick={handleDownloadTemplate}
            className="flex-1 sm:flex-none bg-white border border-gray-200 text-gray-600 px-3 py-2 rounded-xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-sm"
          >
            <svg className="w-4 h-4 text-gray-400 font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Template
          </button>
          <button
            onClick={handleDownloadGuidancePDF}
            className="flex-1 sm:flex-none bg-amber-50 border border-amber-100 text-amber-600 px-3 py-2 rounded-xl hover:bg-amber-100 transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-sm"
            title="Download Upload Guide & Class IDs"
          >
            <svg className="w-4 h-4 font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Guide
          </button>
          <button
            onClick={handleDownloadPrintableForm}
            className="flex-1 sm:flex-none bg-indigo-50 border border-indigo-100 text-indigo-600 px-3 py-2 rounded-xl hover:bg-indigo-100 transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-sm"
            title="Download Printable Admission Form"
          >
            <svg className="w-4 h-4 font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Download Form
          </button>
          <button
            onClick={() => navigate('/dashboard/credential-repository')}
            className="flex-1 sm:flex-none bg-emerald-50 border border-emerald-100 text-emerald-600 px-3 py-2 rounded-xl hover:bg-emerald-100 transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-sm"
            title="View All Student Credentials"
          >
            <svg className="w-4 h-4 font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            Credential Repo
          </button>
          <div className="relative group w-full sm:w-auto">
            <button className={`w-full sm:w-auto px-3 py-2 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-sm transition-all ${isUploading ? 'bg-emerald-600 text-white cursor-wait' : 'bg-white border border-gray-200 text-emerald-600 hover:bg-emerald-50'}`} disabled={isUploading}>
              <svg className={`w-4 h-4 font-bold ${isUploading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              {isUploading ? 'Uploading...' : 'Import Students'}
            </button>
            {!isUploading && (
              <input
                type="file"
                className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                accept=".csv,.xlsx"
                onChange={handleBulkUpload}
              />
            )}
          </div>
          <button
            onClick={() => {
              if (isDemo) {
                toast.error('Registration is disabled in demo mode');
                return;
              }
              setShowForm(!showForm);
              if (!showForm) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className={`w-full sm:w-auto ${isDemo ? 'opacity-75 cursor-not-allowed bg-gray-400' : 'bg-primary'} text-white px-5 py-3 rounded-xl hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 text-[10px] font-black uppercase tracking-widest`}
          >
            <svg className="w-4 h-4 font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {showForm ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
              )}
            </svg>
            {showForm ? 'Cancel Registration' : (isDemo ? 'Add Student (Demo)' : 'Add Student')}
          </button>
        </div>
      </div>

      {/* Student Registration Form - Moved to TOP for visibility */}
      {
        showForm && (
          <div className="bg-white p-6 rounded-2xl shadow-xl border-2 border-primary/10 mb-8 animate-in slide-in-from-top duration-500 overflow-hidden relative">
             {/* Decorative Background Element */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl"></div>
            
            <div className="flex justify-between items-center mb-8 pb-4 border-b relative z-10">
              <div>
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">
                  {editingStudent ? 'Update Student Record' : 'Register New Student'}
                </h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Please fill in all required fields marked with *</p>
              </div>
              <button 
                onClick={resetForm}
                className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-xl transition-all"
                title="Discard Changes"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-10 relative z-10">
              {/* Basic Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-widest mb-6">
                   <div className="w-8 h-px bg-primary/20"></div>
                   Basic Identification
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      First Name <span className="text-red-500 font-black">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold text-gray-700"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Other Name
                    </label>
                    <input
                      type="text"
                      value={formData.middleName || ''}
                      onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold text-gray-700"
                      placeholder="Optional"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Surname <span className="text-red-500 font-black">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold text-gray-700"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold text-gray-700"
                      placeholder="Auto-generated if empty"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Admission Number <span className="text-red-500 font-black">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.admissionNumber}
                      onChange={(e) => setFormData({ ...formData, admissionNumber: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold text-gray-700"
                      required={!editingStudent}
                      placeholder={editingStudent ? "Current: " + editingStudent.admissionNumber : "Auto-generated if empty"}
                    />
                  </div>
                </div>
              </div>

              {/* Personal Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-indigo-600 font-black uppercase text-[10px] tracking-widest mb-6">
                   <div className="w-8 h-px bg-indigo-600/20"></div>
                   Personal Background
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Date of Birth</label>
                    <input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold text-gray-700"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Gender</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold text-gray-700 appearance-none"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">State of Origin</label>
                    <input
                      type="text"
                      value={formData.stateOfOrigin}
                      onChange={(e) => setFormData({ ...formData, stateOfOrigin: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold text-gray-700"
                    />
                  </div>
                  <div className="space-y-1 lg:col-span-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Home Address</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold text-gray-700"
                    />
                  </div>
                </div>
              </div>

              {/* Academic & Parent Info */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Academic */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-emerald-600 font-black uppercase text-[10px] tracking-widest mb-6">
                     <div className="w-8 h-px bg-emerald-600/20"></div>
                     Academic Placement
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Class Placement <span className="text-red-500 font-black">*</span>
                      </label>
                      <select
                        value={formData.classId}
                        onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold text-gray-700 appearance-none"
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
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Admission Year</label>
                      <input
                        type="number"
                        value={formData.admissionYear}
                        onChange={(e) => setFormData({ ...formData, admissionYear: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold text-gray-700"
                      />
                    </div>
                  </div>
                </div>


                {/* Parent */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-amber-600 font-black uppercase text-[10px] tracking-widest mb-6">
                     <div className="w-8 h-px bg-amber-600/20"></div>
                     Parent/Guardian Details
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Full Name</label>
                      <input
                        type="text"
                        value={formData.parentGuardianName}
                        onChange={(e) => setFormData({ ...formData, parentGuardianName: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold text-gray-700"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone Number</label>
                      <input
                        type="text"
                        value={formData.parentGuardianPhone}
                        onChange={(e) => setFormData({ ...formData, parentGuardianPhone: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold text-gray-700"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Administrative & Media Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-rose-600 font-black uppercase text-[10px] tracking-widest mb-6">
                   <div className="w-8 h-px bg-rose-600/20"></div>
                   Administrative & Media
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <label className="flex items-center space-x-3 cursor-pointer group p-4 bg-rose-50/30 border border-rose-100 rounded-2xl hover:bg-rose-50 transition-all">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={formData.isScholarship}
                          onChange={(e) => setFormData({ ...formData, isScholarship: e.target.checked })}
                          className="peer sr-only"
                        />
                        <div className="w-10 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-rose-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-rose-900 uppercase tracking-tight">Scholarship Status</span>
                        <span className="text-[10px] text-rose-600 font-bold uppercase tracking-widest">Exempt student from all tuition fees</span>
                      </div>
                    </label>
                  </div>

                  {editingStudent && (
                    <div className="bg-gray-50/50 p-4 rounded-2xl border border-dashed border-gray-200">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Update Student Photo</h4>
                      <PhotoUpload
                        studentId={editingStudent.id}
                        currentPhotoUrl={editingStudent.photoUrl}
                        onPhotoUpload={(photoUrl) => {
                          setEditingStudent({ ...editingStudent, photoUrl });
                          fetchStudents();
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-8 border-t">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-8 py-3 rounded-xl border border-gray-200 text-gray-500 font-black uppercase text-[10px] tracking-widest hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-10 py-4 rounded-xl bg-primary text-white font-black uppercase text-[10px] tracking-widest hover:brightness-110 shadow-xl shadow-primary/20 active:scale-95 transition-all"
                >
                  {editingStudent ? 'Update Student Record' : 'Complete Registration'}
                </button>
              </div>
            </form>
          </div>
        )
      }

      {/* Action Guidance */}
      <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-6 mb-2 w-full">
        <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
          <div className="bg-emerald-100 p-3 rounded-2xl flex-shrink-0">
            <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="space-y-2 flex-1 text-center sm:text-left">
            <h3 className="text-base font-black text-emerald-900 uppercase tracking-widest">Student Onboarding Instructions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="bg-white/50 p-4 rounded-xl border border-emerald-100/50">
                <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase mb-3">Option 1: Bulk Import</span>
                <p className="text-xs text-emerald-800 leading-relaxed font-medium">
                  Download the <span className="font-bold italic">Excel Template</span>, fill it with student records using the numeric IDs from the <span className="font-bold italic text-amber-700 text-[10px]">Download Guide</span>, and click <span className="font-bold italic">Import Students</span> to finish.
                </p>
              </div>
              <div className="bg-white/50 p-4 rounded-xl border border-emerald-100/50">
                <span className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase mb-3">Option 2: Manual Registration</span>
                <p className="text-xs text-emerald-800 leading-relaxed font-medium">
                  Click the <span className="font-bold italic text-primary">+ Add Student</span> button above to register students one by one through the digital enrollment form.
                </p>
              </div>
            </div>
            <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl space-y-2">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-red-700 flex items-center gap-2">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Registration Requirements
              </h4>
              <ul className="text-[10px] font-bold text-red-600 space-y-1 list-disc list-inside uppercase tracking-tight">
                <li>Classes must be created before students can be added</li>
                <li>Parent/Guardian Name is required</li>
                <li>Parent/Guardian phone number is recommended for automated account creation</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      {
        !showForm && (
          <div className="bg-white p-3 sm:p-5 rounded-2xl shadow-sm border border-gray-100">
            <div className="relative group">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by name or admission number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-sm font-medium"
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
                                    {(() => {
                                      const photo = student.user?.photoUrl || student.photoUrl;
                                      return photo ? (
                                        <img className="h-8 w-8 rounded-full object-cover mr-3" src={photo.startsWith('data:') || photo.startsWith('http') ? photo : `${API_BASE_URL}${photo}`} alt="" />
                                      ) : (
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold mr-3">
                                          {(student.user?.firstName?.[0] || student.name?.[0] || student.middleName?.[0] || '?').toUpperCase()}
                                        </div>
                                      );
                                    })()}
                                    <div className="text-sm font-medium text-gray-900">
                                      {(() => {
                                        const fName = (student.user?.firstName || '').trim();
                                        const mName = (student.middleName || '').trim();
                                        const lName = (student.user?.lastName || '').trim();
                                        const legacyName = (student.name || '').trim();
                                        
                                        // If we have any User names, construct the full name from them
                                        if (fName || lName) {
                                          return (
                                            <div className="flex flex-col">
                                              <span>{`${fName} ${mName} ${lName}`.replace(/\s+/g, ' ').trim()}</span>
                                              {(!fName || !lName) && (
                                                <span className="text-[10px] text-orange-500 font-bold uppercase tracking-tight">
                                                  Incomplete Profile (Missing {!fName ? 'Firstname' : 'Surname'})
                                                </span>
                                              )}
                                              {student.parentGuardianName && (
                                                <span className="text-[10px] text-gray-500 italic">
                                                  Parent: {student.parentGuardianName}
                                                </span>
                                              )}
                                            </div>
                                          );
                                        }
                                        
                                        // Fallback to legacy name
                                        if (legacyName) return (
                                          <div className="flex flex-col">
                                            <span>{legacyName}</span>
                                            {student.parentGuardianName && (
                                              <span className="text-[10px] text-gray-500 italic">
                                                Parent: {student.parentGuardianName}
                                              </span>
                                            )}
                                          </div>
                                        );
                                        
                                        // Final fallback to middle name only
                                        if (mName) return (
                                          <div className="flex flex-col">
                                            <span>{mName}</span>
                                            <span className="text-[10px] text-red-500 font-bold uppercase tracking-tight">
                                              Only Middle Name Found
                                            </span>
                                            {student.parentGuardianName && (
                                              <span className="text-[10px] text-gray-500 italic">
                                                Parent: {student.parentGuardianName}
                                              </span>
                                            )}
                                          </div>
                                        );

                                        return `Unknown Student (${student.admissionNumber})`;
                                      })()}
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
                                  {!student.parentId && (
                                    <button
                                      onClick={() => handleAutoCreateParent(student)}
                                      className="text-green-600 hover:text-green-800 mr-4"
                                      title="Create Parent Account"
                                    >
                                      Create Parent
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      if (isDemo) {
                                        toast.error('Modifications restricted in demo mode');
                                        return;
                                      }
                                      handleEdit(student);
                                    }}
                                    className={`${isDemo ? 'text-gray-400 cursor-not-allowed' : 'text-indigo-600 hover:text-indigo-900'} mr-4`}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (isDemo) {
                                        toast.error('Deletions restricted in demo mode');
                                        return;
                                      }
                                      handleDelete(student.id);
                                    }}
                                    className={`${isDemo ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:text-red-900'}`}
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl max-w-sm w-full p-8 shadow-2xl animate-in zoom-in-95 duration-300" id="credentials-print-area">
              <h3 className="text-xl font-bold mb-4 text-center print:hidden">Registration Successful!</h3>
              <div className="bg-gray-50 p-4 rounded-md mb-6 space-y-2 border border-gray-200">
                <p className="flex justify-between"><span className="font-semibold text-gray-600">Name:</span> <span className="font-medium">{newStudentCredentials.name}</span></p>
                <p className="flex justify-between"><span className="font-semibold text-gray-600">Admission No:</span> <span className="font-mono bg-white px-2 rounded border">{newStudentCredentials.admissionNumber}</span></p>
                <p className="flex justify-between"><span className="font-semibold text-gray-600">Username:</span> <span className="font-mono bg-white px-2 rounded border">{newStudentCredentials.username}</span></p>
                <p className="flex justify-between"><span className="font-semibold text-gray-600">Password:</span> <span className="font-mono bg-white px-2 rounded border">{newStudentCredentials.password}</span></p>
                {newStudentCredentials.mustChangePassword && (
                  <div className="mt-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
                    ALERT: Student will be required to change this password on first login.
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl max-w-sm w-full p-8 shadow-2xl animate-in zoom-in-95 duration-300" id="credentials-print-area">
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

      {/* Bulk Upload Results Modal */}
      {showBulkUploadModal && bulkUploadResults && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50/50">
              <h3 className="text-xl font-bold text-gray-900">Import Results</h3>
              <button onClick={() => setShowBulkUploadModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-600 font-medium">Successful</p>
                  <p className="text-3xl font-bold text-green-700">{bulkUploadResults.successful?.length || 0}</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-600 font-medium">Failed</p>
                  <p className="text-3xl font-bold text-red-700">{bulkUploadResults.failed?.length || 0}</p>
                </div>
              </div>

              {bulkUploadResults.failed && bulkUploadResults.failed.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Failed Records Details
                  </h4>
                  <div className="bg-gray-50 rounded-lg border divide-y overflow-hidden">
                    {bulkUploadResults.failed.map((failure, idx) => (
                      <div key={idx} className="p-4 bg-white hover:bg-red-50/30 transition-colors">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-gray-900">
                              {failure.data?.firstName} {failure.data?.lastName}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              Class Ref: {failure.data?.classId || 'N/A'} | Parent: {failure.data?.parentGuardianPhone || 'N/A'}
                            </p>
                          </div>
                          <span className="bg-red-100 text-red-700 text-[10px] px-2 py-1 rounded uppercase font-bold tracking-wider">
                            Error
                          </span>
                        </div>
                        <p className="text-sm text-red-600 mt-2 font-medium bg-red-50 p-2 rounded-md border border-red-100 italic">
                          " {failure.error} "
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {bulkUploadResults.successful && bulkUploadResults.successful.length > 0 && (
                <div className="pt-4 mt-4 border-t">
                  <p className="text-sm text-gray-500 italic">
                    All {bulkUploadResults.successful.length} successfully imported students have been assigned the default password: <span className="font-bold">student123</span>
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowBulkUploadModal(false)}
                className="bg-primary text-white px-8 py-2 rounded-lg font-bold shadow-lg hover:brightness-90 transition-all active:scale-95"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

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
