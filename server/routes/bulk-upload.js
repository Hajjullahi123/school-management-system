const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');
const { generateAdmissionNumber, getUniqueAdmissionNumber } = require('../utils/studentUtils');
const { createOrUpdateFeeRecordWithOpening } = require('../utils/feeCalculations');
const { generateStudentUsername, generateTeacherUsername } = require('../utils/usernameGenerator');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const ExcelJS = require('exceljs');
const xlsx = require('xlsx');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const storage = multer.memoryStorage();

async function getLogoBuffer(logoUrl) {
  try {
    if (!logoUrl) return null;
    let buffer = null;
    let ext = 'png';

    // 1. Handle Base64 Data URIs directly
    if (logoUrl.startsWith('data:image/')) {
      const matches = logoUrl.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const format = matches[1].toLowerCase();
        ext = ['png', 'jpg', 'jpeg'].includes(format) ? (format === 'jpg' ? 'jpeg' : format) : 'png';
        buffer = Buffer.from(matches[2], 'base64');
        return { buffer, ext };
      }
    }

    // 2. Handle local uploads (bypass local HTTP loopback issues by reading straight from disk)
    if (logoUrl.includes('/uploads/')) {
      const uploadsIndex = logoUrl.indexOf('/uploads/');
      const relativePath = logoUrl.substring(uploadsIndex); // e.g. "/uploads/logo.png"
      const localPath = path.join(__dirname, '..', relativePath);
      if (fs.existsSync(localPath)) {
        buffer = fs.readFileSync(localPath);
        const urlExt = relativePath.split('.').pop().toLowerCase();
        ext = ['png', 'jpg', 'jpeg'].includes(urlExt) ? (urlExt === 'jpg' ? 'jpeg' : urlExt) : 'png';
        return { buffer, ext };
      }
    }

    // 3. Fallback to external HTTP request (for remote Cloudinary, etc.)
    if (logoUrl.startsWith('http')) {
      const response = await axios.get(logoUrl, { responseType: 'arraybuffer', timeout: 10000 });
      buffer = Buffer.from(response.data, 'binary');
      const urlExt = logoUrl.split('.').pop().split('?')[0].toLowerCase();
      ext = ['png', 'jpg', 'jpeg'].includes(urlExt) ? (urlExt === 'jpg' ? 'jpeg' : urlExt) : 'png';
      return { buffer, ext };
    }

    return null;
  } catch (err) {
    console.log('Error fetching logo:', err.message);
    return null;
  }
}

async function addSchoolHeader(workbook, worksheet, school, lastColLetter, templateType) {
  // Insert 7 blank rows at top for the header area
  worksheet.spliceRows(1, 0, [], [], [], [], [], [], []);

  // --- Row 1-2: Logo + School Name ---
  worksheet.mergeCells(`A1:${lastColLetter}2`);
  const nameCell = worksheet.getCell('A1');
  nameCell.value = school.name.toUpperCase();
  nameCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  nameCell.font = { size: 18, bold: true, color: { argb: 'FF1B3A5C' } };
  nameCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2F7' } };

  // --- Row 3: Address line ---
  worksheet.mergeCells(`A3:${lastColLetter}3`);
  const addressParts = [school.address, school.phone, school.email].filter(Boolean);
  const addressCell = worksheet.getCell('A3');
  addressCell.value = addressParts.length > 0 ? addressParts.join('  |  ') : 'School Address  |  Phone  |  Email';
  addressCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  addressCell.font = { size: 10, italic: true, color: { argb: 'FF555555' } };
  addressCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2F7' } };
  worksheet.getRow(3).height = 20;

  // --- Row 4: Divider ---
  worksheet.mergeCells(`A4:${lastColLetter}4`);
  const dividerCell = worksheet.getCell('A4');
  dividerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B3A5C' } };
  worksheet.getRow(4).height = 4;

  // --- Row 5: Template type label ---
  worksheet.mergeCells(`A5:${lastColLetter}5`);
  const typeLabel = templateType === 'staff' ? 'STAFF BULK UPLOAD TEMPLATE' : 'STUDENT BULK UPLOAD TEMPLATE';
  const typeCell = worksheet.getCell('A5');
  typeCell.value = typeLabel;
  typeCell.alignment = { vertical: 'middle', horizontal: 'center' };
  typeCell.font = { size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  typeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E7D32' } };
  worksheet.getRow(5).height = 28;

  // --- Row 6: Spacer ---
  worksheet.mergeCells(`A6:${lastColLetter}6`);
  worksheet.getRow(6).height = 6;

  // --- Row 7: Empty spacer before column headers (row 8) ---
  worksheet.mergeCells(`A7:${lastColLetter}7`);
  worksheet.getRow(7).height = 6;

  // Add borders to the header block (rows 1-5)
  for (let r = 1; r <= 5; r++) {
    const row = worksheet.getRow(r);
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        right: { style: 'thin', color: { argb: 'FFD0D0D0' } }
      };
    });
  }

  // Add the school logo
  const logo = await getLogoBuffer(school?.logoUrl);
  if (logo) {
    try {
      const imageId = workbook.addImage({ buffer: logo.buffer, extension: logo.ext });
      worksheet.addImage(imageId, {
        tl: { col: 0.15, row: 0.15 },
        ext: { width: 65, height: 55 }
      });
    } catch (err) {
      console.log('Error embedding logo:', err.message);
    }
  }
}

function addInstructionsSheet(workbook, templateType) {
  const helpSheet = workbook.addWorksheet('Instructions');
  helpSheet.columns = [{ header: 'Instructions', key: 'step', width: 90 }];
  helpSheet.getRow(1).font = { bold: true, size: 13 };

  const instructions = templateType === 'student' ? [
    '1. Use the "Students Template" sheet to fill in student information.',
    '2. In the "Class ID" column, select the class from the dropdown menu (e.g., "1 - Class Name").',
    '3. Fields marked with * are required (First Name, Surname, Class ID).',
    '4. Use the drop-down menus for columns with selections (Class ID, Gender).',
    '5. Save this file as .xlsx before uploading (CSV might lose dropdowns).',
    '6. Do NOT delete or modify the header rows (rows 1-8). Start entering data from the example row below the column headers.',
    '7. The example row (first data row) can be overwritten with real data.',
    '8. Maximum of 500 students per upload.'
  ] : [
    '1. Use the "Staff Template" sheet to fill in staff information.',
    '2. Fields marked with * are required (First Name, Surname, Role).',
    '3. Select the role from the dropdown in the "Role" column.',
    '4. Available roles: teacher, admin, sub_admin, principal, accountant, examination_officer, attendance_admin.',
    '5. The "Specialization" column is only required for teachers (e.g., Mathematics, English, Science).',
    '6. Each staff member will be assigned an auto-generated username and a default password.',
    '7. Save this file as .xlsx before uploading.',
    '8. Do NOT delete or modify the header rows (rows 1-8). Start entering data from the example row below the column headers.',
    '9. The example row (first data row) can be overwritten with real data.',
    '10. Maximum of 200 staff per upload.'
  ];

  instructions.forEach(text => helpSheet.addRow({ step: text }));
}
const upload = multer({ storage: storage });

// Download Bulk Student Template (XLSX)
router.get('/template/students', authenticate, authorize(['admin', 'teacher', 'principal']), async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Students Template');

    // Get classes for ID reference - Using school-specific indexing
    const classes = await prisma.class.findMany({
      where: { schoolId: req.schoolId, isActive: true },
      orderBy: { id: 'asc' }, // Stable sort by creation order
      select: { id: true, name: true, arm: true }
    });
    const school = await prisma.school.findUnique({ where: { id: req.schoolId } });

    worksheet.columns = [
      { header: 'First Name*', key: 'firstName', width: 20 },
      { header: 'Surname*', key: 'lastName', width: 20 },
      { header: 'Other Name', key: 'middleName', width: 20 },
      { header: 'Class ID*', key: 'classId', width: 12 },
      { header: 'Class Name (Optional)', key: 'className', width: 25 },
      { header: 'Gender (Male/Female)', key: 'gender', width: 20 },
      { header: 'Parent Name', key: 'parentName', width: 25 },
      { header: 'Parent Phone', key: 'parentPhone', width: 20 },
      { header: 'Scholarship (Yes/No)', key: 'isScholarship', width: 20 },
      { header: 'Discount Amount (₦)', key: 'feeDiscount', width: 25 }
    ];

    await addSchoolHeader(workbook, worksheet, school, 'J', 'student');

    // Styling the header row (now at row 8)
    worksheet.getRow(8).font = { bold: true };
    worksheet.getRow(8).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add example row
    if (classes.length > 0) {
      worksheet.addRow({
        firstName: 'Abdullahi',
        lastName: 'Lawal',
        middleName: 'Musa',
        classId: 1, // First class in this school (Local ID)
        className: `${classes[0].name} ${classes[0].arm || ''} (ID: 1)`,
        gender: 'Male',
        parentName: 'Lawal Musa',
        parentPhone: '08000000000',
        isScholarship: 'No',
        feeDiscount: 0
      });
    }

    // Add a second sheet with Class IDs for reference
    const refSheet = workbook.addWorksheet('Class IDs Reference');
    refSheet.columns = [
      { header: 'Local ID (USE THIS)', key: 'localId', width: 20 },
      { header: 'Class Name', key: 'name', width: 30 },
      { header: 'Class Arm', key: 'arm', width: 15 },
      { header: 'Dropdown Selection', key: 'dropdown', width: 40 }
    ];
    refSheet.getRow(1).font = { bold: true };
    
    classes.forEach((c, index) => {
      refSheet.addRow({ 
        localId: index + 1, 
        name: c.name,
        arm: c.arm || 'N/A',
        dropdown: `${index + 1} - ${c.name} ${c.arm || ''}`.trim()
      });
    });

    // Add Data Validation (Dropdowns) - Processing from row 9 up to 500
    for (let i = 9; i <= 500; i++) {
      // Class ID (Column D) - Dropdown referencing the Class IDs Reference sheet
      if (classes.length > 0) {
        worksheet.getCell(`D${i}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`'Class IDs Reference'!$D$2:$D$${classes.length + 1}`]
        };
      }
      
      // Gender (Column F)
      worksheet.getCell(`F${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"Male,Female"']
      };

      // Scholarship (Column I)
      worksheet.getCell(`I${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"Yes,No"']
      };
    }

    // Add instructions sheet
    addInstructionsSheet(workbook, 'student');

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Student_Bulk_Upload_Template.xlsx');
    
    await workbook.xlsx.write(res);
  } catch (error) {
    console.error('Template generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk upload students from file
router.post('/upload', authenticate, authorize(['admin', 'teacher', 'principal']), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const studentsRaw = [];
    const headers = {};

    try {
      const workbook = xlsx.read(req.file.buffer, { type: 'buffer', cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      // Use raw: false so we get strings, but cellDates: true and raw: false formats dates
      const data = xlsx.utils.sheet_to_json(worksheet, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' });

      if (data.length > 0) {
        // Find the first non-empty row to use as header
        let headerRowIndex = 0;
        while (headerRowIndex < data.length) {
          const row = data[headerRowIndex];
          if (row && row.some(cell => cell && cell.toString().toLowerCase().includes('first name'))) {
            break;
          }
          headerRowIndex++;
        }

        if (headerRowIndex >= data.length) {
          return res.status(400).json({ error: 'No data found in file' });
        }

        const headerRow = data[headerRowIndex].map(h => (h !== undefined && h !== null) ? h.toString().toLowerCase().trim() : '');
        
        headerRow.forEach((header, colNumber) => {
          if (!header) return;
          if (header.includes('first name')) headers.firstName = colNumber;
          else if (header.includes('surname') || header.includes('last name')) headers.lastName = colNumber;
          else if (header.includes('other name') || header.includes('middle name')) headers.middleName = colNumber;
          else if (header.includes('class id')) headers.classId = colNumber;
          else if (header.includes('gender')) headers.gender = colNumber;
          else if (header.includes('genotype')) headers.genotype = colNumber;
          else if (header.includes('disability')) headers.disability = colNumber;
          else if (header === 'email' || header.includes('student email')) headers.email = colNumber;
          else if (header.includes('parent name') || header.includes('guardian name') || header.includes('father') || header.includes('mother')) headers.parentGuardianName = colNumber;
          else if (header.includes('parent phone') || header.includes('guardian phone') || header.includes('phone')) headers.parentGuardianPhone = colNumber;
          else if (header.includes('parent email') || header.includes('guardian email')) headers.parentEmail = colNumber;
          else if (header.includes('address')) headers.address = colNumber;
          else if (header.includes('date of birth') || header.includes('dob')) headers.dateOfBirth = colNumber;
          else if (header.includes('scholarship')) headers.isScholarship = colNumber;
          else if (header.includes('discount')) headers.feeDiscount = colNumber;
          else if (header.includes('password')) headers.password = colNumber;
        });

        // Parse rows starting from the row after the header
        for (let i = headerRowIndex + 1; i < data.length; i++) {
          const row = data[i];
          if (!row || row.length === 0) continue;

          const getVal = (key) => {
            const idx = headers[key];
            if (idx !== undefined && row[idx] !== undefined && row[idx] !== null) {
              return row[idx].toString().trim();
            }
            return '';
          };

          const firstName = getVal('firstName');
          const lastName = getVal('lastName');

          // Skip empty or purely decorative rows
          if (!firstName && !lastName) continue;

          studentsRaw.push({
            firstName,
            lastName,
            middleName: getVal('middleName'),
            classId: getVal('classId'),
            gender: getVal('gender'),
            genotype: getVal('genotype'),
            disability: getVal('disability'),
            email: getVal('email'),
            parentGuardianName: getVal('parentGuardianName'),
            parentGuardianPhone: getVal('parentGuardianPhone'),
            parentEmail: getVal('parentEmail'),
            address: getVal('address'),
            dateOfBirth: getVal('dateOfBirth'),
            isScholarship: getVal('isScholarship'),
            feeDiscount: getVal('feeDiscount'),
            password: getVal('password')
          });
        }
      }
    } catch (parseError) {
      console.error('File parsing error:', parseError);
      return res.status(400).json({ error: 'Failed to parse file. Please make sure you are using a valid Excel (.xlsx) or CSV file.' });
    }

    if (studentsRaw.length === 0) {
      return res.status(400).json({ error: 'No student data found in file' });
    }

    const results = { successful: [], failed: [] };
    const schoolIdInt = parseInt(req.schoolId);

    // Fetch current term once for the school
    const currentTerm = await prisma.term.findFirst({
      where: { isCurrent: true, schoolId: schoolIdInt },
      include: { academicSession: true }
    });

    // Fetch school code
    const school = await prisma.school.findUnique({ where: { id: schoolIdInt } });
    const schoolCode = school?.code || 'SCH';

    // Fetch available classes once for mapping
    const availableClasses = await prisma.class.findMany({
      where: { schoolId: schoolIdInt, isActive: true },
      orderBy: { id: 'asc' }
    });

    if (availableClasses.length === 0) {
      return res.status(400).json({ 
        error: 'No classes found for this school. Please create your classes (e.g., JSS 1, SS 1) before uploading students.' 
      });
    }

    // Determine allowed class IDs if user is a teacher
    let allowedClassIds = null;
    if (req.user.role === 'teacher') {
      const assignedClasses = await prisma.class.findMany({
        where: { classTeacherId: req.user.id, schoolId: schoolIdInt },
        select: { id: true }
      });
      allowedClassIds = new Set(assignedClasses.map(c => c.id));
    }

    for (const studentData of studentsRaw) {
      try {
        // Validate required fields
        if (!studentData.firstName || !studentData.lastName || !studentData.classId) {
          results.failed.push({
            data: studentData,
            error: `Missing required fields: ${!studentData.firstName ? 'firstName ' : ''}${!studentData.lastName ? 'lastName ' : ''}${!studentData.classId ? 'classId' : ''}`.trim()
          });
          continue;
        }

        // Fallback for parentGuardianName if missing
        if (!studentData.parentGuardianName) {
          studentData.parentGuardianName = `${studentData.lastName} Family`;
        }

        let classIdVal = studentData.classId.toString().trim();
        
        // Handle dropdown format: "1 - ClassName Arm" -> extract the number before the dash
        if (classIdVal.includes(' - ')) {
          classIdVal = classIdVal.split(' - ')[0].trim();
        }
        
        let classIdInt = parseInt(classIdVal);
        let classInfo = null;

        // 1. Try mapping from Local ID (1, 2, 3...) first
        if (!isNaN(classIdInt) && classIdInt > 0 && classIdInt <= availableClasses.length) {
          classInfo = availableClasses[classIdInt - 1];
        }

        // 2. Fallback to Database ID (for compatibility with existing files)
        if (!classInfo && !isNaN(classIdInt)) {
          classInfo = await prisma.class.findFirst({
            where: { id: classIdInt, schoolId: schoolIdInt }
          });
        }

        // 3. Fallback to Class Name matching (use original value for name matching)
        if (!classInfo && studentData.classId) {
          const classNameStr = studentData.classId.toString().trim().toLowerCase();
          classInfo = availableClasses.find(c => 
            c.name.toLowerCase().includes(classNameStr) || 
            `${c.name} ${c.arm || ''}`.toLowerCase().includes(classNameStr)
          );
        }

        if (!classInfo) {
          results.failed.push({
            data: studentData,
            error: `Invalid Class reference: "${studentData.classId}". Please use the Local ID (e.g. 1) from the reference sheet.`
          });
          continue;
        }

        const classIdIntToUse = classInfo.id;

        // Check permission for teacher
        if (allowedClassIds && !allowedClassIds.has(classIdIntToUse)) {
          results.failed.push({
            data: studentData,
            error: `Unauthorized access to class: ${classInfo.name} ${classInfo.arm || ''}`
          });
          continue;
        }

        // Prevent duplicate student creation (same name and class)
        const existingStudentCheck = await prisma.user.findFirst({
          where: {
            schoolId: schoolIdInt,
            firstName: studentData.firstName,
            lastName: studentData.lastName,
            role: 'student',
            student: {
              classId: classIdIntToUse,
              middleName: studentData.middleName || null
            }
          }
        });

        if (existingStudentCheck) {
          results.failed.push({
            data: studentData,
            error: `Student ${studentData.firstName} ${studentData.lastName} ${studentData.middleName || ''} already exists in this class. Skipping to prevent duplicates.`
          });
          continue;
        }

        const admissionYear = new Date().getFullYear();
        const admissionNumber = await generateStudentUsername(
          schoolIdInt,
          schoolCode,
          studentData.firstName,
          studentData.lastName
        );

        // Sync username with admission number
        const username = admissionNumber.toLowerCase();
        const rawPassword = studentData.password || 'student123';
        const hashedPassword = await bcrypt.hash(rawPassword, 10);

        // Check if email already exists
        let userEmailToUse = studentData.email || null;
        if (userEmailToUse) {
          const existingEmailUser = await prisma.user.findUnique({
            where: { schoolId_email: { schoolId: schoolIdInt, email: userEmailToUse } }
          });
          if (existingEmailUser) {
            userEmailToUse = null; // Prevent unique constraint violation
          }
        }

        // Database writes
        const user = await prisma.user.create({
          data: {
            schoolId: schoolIdInt,
            username,
            passwordHash: hashedPassword,
            email: userEmailToUse,
            role: 'student',
            firstName: studentData.firstName,
            lastName: studentData.lastName,
            isActive: true,
            mustChangePassword: false
          }
        });

        const student = await prisma.student.create({
          data: {
            schoolId: schoolIdInt,
            userId: user.id,
            admissionNumber,
            classId: classIdIntToUse,
            middleName: studentData.middleName,
            dateOfBirth: (studentData.dateOfBirth && !isNaN(new Date(studentData.dateOfBirth).getTime()))
              ? new Date(studentData.dateOfBirth)
              : null,
            gender: studentData.gender,
            genotype: studentData.genotype || null,
            disability: studentData.disability || 'None',
            address: studentData.address,
            parentGuardianName: studentData.parentGuardianName,
            parentGuardianPhone: studentData.parentGuardianPhone,
            parentEmail: studentData.parentEmail || null,
            nationality: 'Nigerian',
            isScholarship: studentData.isScholarship?.toLowerCase() === 'yes' || studentData.isScholarship?.toLowerCase() === 'true',
            feeDiscount: studentData.feeDiscount && !isNaN(parseFloat(studentData.feeDiscount)) ? parseFloat(studentData.feeDiscount) : 0
          }
        });

        // Auto-link to parent account by phone number
        if (studentData.parentGuardianPhone) {
          try {
            const sanitizedPhone = studentData.parentGuardianPhone.replace(/[^\d+]/g, '');
            if (sanitizedPhone.length >= 7) {
              const matchingParent = await prisma.parent.findFirst({
                where: {
                  schoolId: schoolIdInt,
                  OR: [
                    { phone: sanitizedPhone },
                    { phone: { contains: sanitizedPhone.startsWith('0') ? sanitizedPhone.substring(1) : sanitizedPhone } }
                  ]
                }
              });
              if (matchingParent) {
                await prisma.student.update({
                  where: { id: student.id },
                  data: { parentId: matchingParent.id }
                });
              }
            }
          } catch (autoLinkErr) {
            // Non-fatal — continue processing
            console.error('[BulkAutoLink] Error:', autoLinkErr.message);
          }
        }

        // Initialize Fee Record
        if (currentTerm) {
          const feeStructure = await prisma.classFeeStructure.findUnique({
            where: {
              schoolId_classId_termId_academicSessionId: {
                schoolId: schoolIdInt,
                classId: classIdIntToUse,
                termId: currentTerm.id,
                academicSessionId: currentTerm.academicSessionId
              }
            }
          });

          // Always try to create/update record if current term exists
          // This handles the case where structure might be 0 or missing (defaults to 0)
          await createOrUpdateFeeRecordWithOpening({
            schoolId: schoolIdInt,
            studentId: student.id,
            termId: currentTerm.id,
            academicSessionId: currentTerm.academicSessionId,
            expectedAmount: student.isScholarship ? 0 : Math.max(0, (feeStructure?.amount || 0) - (student.feeDiscount || 0)),
            paidAmount: 0
          });
        }

        results.successful.push({
          admissionNumber,
          username,
          name: `${studentData.firstName} ${studentData.lastName}`,
          class: `${classInfo.name} ${classInfo.arm || ''}`.trim()
        });

      } catch (err) {
        console.error(`Error importing student ${studentData.firstName} ${studentData.lastName}:`, err);
        results.failed.push({ data: studentData, error: err.message });
      }
    }

    res.json({
      message: `Import completed. ${results.successful.length} successful, ${results.failed.length} failed.`,
      successful: results.successful,
      failed: results.failed
    });

    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'BULK_IMPORT',
      resource: 'STUDENT',
      details: { successCount: results.successful.length, failedCount: results.failed.length },
      ipAddress: req.ip
    });

  } catch (error) {
    console.error('Bulk student import error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk upload students from CSV data (JSON format - Legacy)
router.post('/bulk-upload', authenticate, authorize(['admin', 'teacher', 'principal']), async (req, res) => {
  try {
    const { students } = req.body;

    if (!students || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ error: 'No student data provided' });
    }

    const results = {
      successful: [],
      failed: []
    };

    const schoolIdInt = Number(req.schoolId);
    const currentTerm = await prisma.term.findFirst({
      where: {
        isCurrent: true,
        schoolId: schoolIdInt
      },
      include: { academicSession: true }
    });

    // If user is a teacher, get their assigned classes
    let allowedClassIds = null;
    if (req.user.role === 'teacher') {
      const assignedClasses = await prisma.class.findMany({
        where: { classTeacherId: req.user.id, schoolId: schoolIdInt },
        select: { id: true }
      });
      allowedClassIds = new Set(assignedClasses.map(c => c.id));
    }

    // Fetch classes for mapping
    const availableClasses = await prisma.class.findMany({
      where: { schoolId: schoolIdInt, isActive: true },
      orderBy: { id: 'asc' }
    });

    if (availableClasses.length === 0) {
      return res.status(400).json({ 
        error: 'No classes found for this school. Please create your classes (e.g., JSS 1, SS 1) before uploading students.' 
      });
    }

    for (const studentData of students) {
      try {
        // Validate required fields
        if (!studentData.firstName || !studentData.lastName || !studentData.classId) {
          results.failed.push({
            data: studentData,
            error: 'Missing required fields (firstName, lastName, or classId)'
          });
          continue;
        }

        // Fallback for parentGuardianName if missing
        if (!studentData.parentGuardianName) {
          studentData.parentGuardianName = `${studentData.lastName} Family`;
        }

        // Check permission for teacher
        if (allowedClassIds && !allowedClassIds.has(parseInt(studentData.classId))) {
          results.failed.push({
            data: studentData,
            error: 'You are not the assigned class teacher for this class'
          });
          continue;
        }

        // Fetch school code
        const school = await prisma.school.findUnique({ where: { id: schoolIdInt } });
        const schoolCode = school?.code || 'SCH';

        let classIdVal = studentData.classId.toString().trim();
        let classIdInt = parseInt(classIdVal);
        let classInfo = null;

        // 1. Try Local ID mapping
        if (!isNaN(classIdInt) && classIdInt > 0 && classIdInt <= availableClasses.length) {
          classInfo = availableClasses[classIdInt - 1];
        }

        // 2. Fallback to Database ID
        if (!classInfo && !isNaN(classIdInt)) {
          classInfo = await prisma.class.findFirst({
            where: { id: classIdInt, schoolId: schoolIdInt }
          });
        }

        if (!classInfo) {
          results.failed.push({
            data: studentData,
            error: `Invalid class reference: ${studentData.classId}`
          });
          continue;
        }

        const classIdIntToUse = classInfo.id;

        const admissionYear = studentData.admissionYear || new Date().getFullYear();
        const className = classInfo.name;
        const classArm = classInfo.arm || '';

        const baseAdmissionNumber = generateAdmissionNumber(
          schoolCode,
          admissionYear,
          className,
          classArm
        );

        const admissionNumber = await getUniqueAdmissionNumber(prisma, baseAdmissionNumber, parseInt(studentData.classId), req.schoolId);

        // Sync username with admission number
        const username = admissionNumber.toLowerCase();

        // Create user account
        const hashedPassword = await bcrypt.hash(studentData.password || 'student123', 10);

        // Check if email already exists
        let userEmailToUse = studentData.email || null;
        if (userEmailToUse) {
          const existingEmailUser = await prisma.user.findUnique({
             where: { schoolId_email: { schoolId: schoolIdInt, email: userEmailToUse } }
          });
          if (existingEmailUser) {
            userEmailToUse = null; // Prevent unique constraint violation
          }
        }

        const user = await prisma.user.create({
          data: {
            schoolId: req.schoolId,
            username,
            passwordHash: hashedPassword,
            email: userEmailToUse,
            role: 'student',
            firstName: studentData.firstName,
            lastName: studentData.lastName,
            isActive: true,
            mustChangePassword: false
          }
        });

        // Create student profile
        const student = await prisma.student.create({
          data: {
            schoolId: req.schoolId,
            userId: user.id,
            admissionNumber,
            classId: classIdIntToUse,
            dateOfBirth: (studentData.dateOfBirth && !isNaN(new Date(studentData.dateOfBirth).getTime()))
              ? new Date(studentData.dateOfBirth)
              : null,
            gender: studentData.gender || null,
            stateOfOrigin: studentData.stateOfOrigin || null,
            nationality: studentData.nationality || 'Nigerian',
            address: studentData.address || null,
            parentGuardianName: studentData.parentGuardianName || null,
            parentGuardianPhone: studentData.parentGuardianPhone || null,
            parentEmail: studentData.parentEmail || null,
            bloodGroup: studentData.bloodGroup || null,
            genotype: studentData.genotype || null,
            disability: studentData.disability || 'None',
            isScholarship: studentData.isScholarship?.toLowerCase() === 'yes' || studentData.isScholarship?.toLowerCase() === 'true',
            feeDiscount: studentData.feeDiscount && !isNaN(parseFloat(studentData.feeDiscount)) ? parseFloat(studentData.feeDiscount) : 0
          }
        });

        // Check for active fee structure and create fee record
        // Optimization: Fetch current term once outside loop if possible, but for now inside is safer for correctness if not refactoring whole function
        // Actually, let's fetch it inside to be safe with the existing structure
        if (currentTerm) {
          const sId = Number(req.schoolId);
          const cId = classIdIntToUse;

          const feeStructure = await prisma.classFeeStructure.findUnique({
            where: {
              schoolId_classId_termId_academicSessionId: {
                schoolId: sId,
                classId: cId,
                termId: currentTerm.id,
                academicSessionId: currentTerm.academicSessionId
              }
            }
          });

          // Always try to create/update record if current term exists
          await createOrUpdateFeeRecordWithOpening({
            schoolId: sId,
            studentId: student.id,
            termId: currentTerm.id,
            academicSessionId: currentTerm.academicSessionId,
            expectedAmount: student.isScholarship ? 0 : Math.max(0, (feeStructure?.amount || 0) - (student.feeDiscount || 0)),
            paidAmount: 0
          });
        }

        results.successful.push({
          admissionNumber,
          username,
          name: `${studentData.firstName} ${studentData.lastName}`,
          class: `${className} ${classArm}`.trim()
        });

      } catch (error) {
        results.failed.push({
          data: studentData,
          error: error.message
        });
      }
    }

    res.json({
      message: `Bulk upload completed. ${results.successful.length} successful, ${results.failed.length} failed.`,
      successful: results.successful,
      failed: results.failed
    });

    // Log the bulk action
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'BULK_UPLOAD',
      resource: 'STUDENT',
      details: {
        successCount: results.successful.length,
        failedCount: results.failed.length
      },
      ipAddress: req.ip
    });

  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk upload results from CSV data
router.post('/results', authenticate, authorize(['admin', 'teacher', 'principal', 'examination_officer']), async (req, res) => {
  try {
    const { results, termId, academicSessionId, classId, subjectId } = req.body;

    if (!results || !Array.isArray(results) || results.length === 0) {
      return res.status(400).json({ error: 'No result data provided' });
    }

    if (!termId || !academicSessionId || !classId || !subjectId) {
      return res.status(400).json({ error: 'Term ID, Academic Session ID, Class ID, and Subject ID are required' });
    }

    // Fetch school settings for weights and grading
    const school = await prisma.school.findUnique({
      where: { id: req.schoolId },
      select: {
        assignment1Weight: true,
        assignment2Weight: true,
        test1Weight: true,
        test2Weight: true,
        examWeight: true,
        gradingSystem: true
      }
    });

    const {
      calculateTotalScore,
      getGrade,
      calculateClassAverage,
      calculatePositions,
      validateScores
    } = require('../utils/grading');

    // Verify teacher has permission for this subject-class combination
    if (req.user.role === 'teacher') {
      const assignment = await prisma.teacherAssignment.findFirst({
        where: {
          schoolId: req.schoolId,
          teacherId: req.user.id,
          classSubject: {
            subjectId: parseInt(subjectId),
            classId: parseInt(classId)
          }
        }
      });

      if (!assignment) {
        return res.status(403).json({ error: 'You are not assigned to teach this subject in this class' });
      }
    }

    const uploadResults = {
      successful: [],
      failed: [],
      updated: []
    };

    // Helper function to calculate grade
    const calculateGrade = (totalScore) => {
      if (totalScore >= 70) return 'A';
      if (totalScore >= 60) return 'B';
      if (totalScore >= 50) return 'C';
      if (totalScore >= 45) return 'D';
      if (totalScore >= 40) return 'E';
      return 'F';
    };

    for (const resultData of results) {
      try {
        // Validate required fields
        if (!resultData.admissionNumber) {
          uploadResults.failed.push({
            data: resultData,
            error: 'Missing admission number'
          });
          continue;
        }

        // Find student by admission number
        const student = await prisma.student.findUnique({
          where: {
            schoolId_admissionNumber: {
              schoolId: req.schoolId,
              admissionNumber: resultData.admissionNumber
            }
          },
          include: { user: true }
        });

        if (!student) {
          uploadResults.failed.push({
            data: resultData,
            error: `Student not found: ${resultData.admissionNumber}`
          });
          continue;
        }

        // Parse and validate scores using school weights
        const validatedScores = validateScores(
          resultData.assignment1,
          resultData.assignment2,
          resultData.test1,
          resultData.test2,
          resultData.exam,
          school
        );

        // Calculate total score
        const totalScore = calculateTotalScore(
          validatedScores.assignment1Score,
          validatedScores.assignment2Score,
          validatedScores.test1Score,
          validatedScores.test2Score,
          validatedScores.examScore
        );

        const grade = getGrade(totalScore, school.gradingSystem);

        // Check if result already exists
        const existingResult = await prisma.result.findUnique({
          where: {
            schoolId_studentId_subjectId_termId_academicSessionId: {
              schoolId: req.schoolId,
              studentId: student.id,
              subjectId: parseInt(subjectId),
              termId: parseInt(termId),
              academicSessionId: parseInt(academicSessionId)
            }
          }
        });

        const resultPayload = {
          schoolId: req.schoolId,
          studentId: student.id,
          academicSessionId: parseInt(academicSessionId),
          termId: parseInt(termId),
          classId: parseInt(classId),
          subjectId: parseInt(subjectId),
          ...validatedScores,
          totalScore,
          grade,
          teacherId: req.user.id,
          isSubmitted: true,
          submittedAt: new Date()
        };

        const { logAction } = require('../utils/audit');

        if (existingResult) {
          // Update existing result
          await prisma.result.update({
            where: {
              id: existingResult.id,
              schoolId: req.schoolId
            },
            data: resultPayload
          });

          uploadResults.updated.push({
            admissionNumber: resultData.admissionNumber,
            studentName: student.user ? `${student.user.firstName || ''} ${student.user.lastName || ''}`.trim() : (resultData.studentName || resultData.admissionNumber),
            totalScore,
            grade
          });

          // Log Score Audit
          logAction({
            schoolId: req.schoolId,
            userId: req.user.id,
            action: 'BULK_UPDATE_SCORE',
            resource: 'RESULT',
            details: {
              studentId: student.id,
              subjectId: parseInt(subjectId),
              termId: parseInt(termId),
              previousScores: {
                assignment1: existingResult.assignment1Score,
                assignment2: existingResult.assignment2Score,
                test1: existingResult.test1Score,
                test2: existingResult.test2Score,
                exam: existingResult.examScore,
                total: existingResult.totalScore
              },
              newScores: {
                assignment1: validatedScores.assignment1Score,
                assignment2: validatedScores.assignment2Score,
                test1: validatedScores.test1Score,
                test2: validatedScores.test2Score,
                exam: validatedScores.examScore,
                total: totalScore
              }
            },
            ipAddress: req.ip
          });
        } else {
          // Create new result
          await prisma.result.create({
            data: resultPayload
          });

          uploadResults.successful.push({
            admissionNumber: resultData.admissionNumber,
            studentName: student.user ? `${student.user.firstName || ''} ${student.user.lastName || ''}`.trim() : (resultData.studentName || resultData.admissionNumber),
            totalScore,
            grade
          });

          // Log Score Audit
          logAction({
            schoolId: req.schoolId,
            userId: req.user.id,
            action: 'BULK_CREATE_SCORE',
            resource: 'RESULT',
            details: {
              studentId: student.id,
              subjectId: parseInt(subjectId),
              termId: parseInt(termId),
              newScores: {
                assignment1: validatedScores.assignment1Score,
                assignment2: validatedScores.assignment2Score,
                test1: validatedScores.test1Score,
                test2: validatedScores.test2Score,
                exam: validatedScores.examScore,
                total: totalScore
              }
            },
            ipAddress: req.ip
          });
        }
      } catch (error) {
        uploadResults.failed.push({
          data: resultData,
          error: error.message
        });
      }
    }

    // After all results are processed, recalculate class averages and positions for this subject
    try {
      const avg = await calculateClassAverage(prisma, parseInt(classId), parseInt(subjectId), parseInt(termId), req.schoolId);

      // Update all results for this subject-class-term with the new class average
      await prisma.result.updateMany({
        where: {
          schoolId: req.schoolId,
          classId: parseInt(classId),
          subjectId: parseInt(subjectId),
          termId: parseInt(termId)
        },
        data: {
          classAverage: avg
        }
      });

      // Recalculate positions
      await calculatePositions(prisma, parseInt(classId), parseInt(subjectId), parseInt(termId), req.schoolId);
    } catch (calcError) {
      console.error('Error recalculating class stats after bulk upload:', calcError);
      // Don't fail the whole response, the scores are already saved
    }

    res.json({
      message: `Upload completed. ${uploadResults.successful.length} created, ${uploadResults.updated.length} updated, ${uploadResults.failed.length} failed.`,
      successful: uploadResults.successful,
      updated: uploadResults.updated,
      failed: uploadResults.failed
    });

    // Log the bulk action
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'BULK_UPLOAD',
      resource: 'RESULT',
      details: {
        classId: parseInt(classId),
        subjectId: parseInt(subjectId),
        termId: parseInt(termId),
        createdCount: uploadResults.successful.length,
        updatedCount: uploadResults.updated.length,
        failedCount: uploadResults.failed.length
      },
      ipAddress: req.ip
    });

  } catch (error) {
    console.error('Bulk result upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

// Download Bulk Staff Template (XLSX)
router.get('/template/staff', authenticate, authorize(['admin', 'principal']), async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Staff Template');
    const school = await prisma.school.findUnique({ where: { id: req.schoolId } });

    worksheet.columns = [
      { header: 'First Name*', key: 'firstName', width: 20 },
      { header: 'Surname*', key: 'lastName', width: 20 },
      { header: 'Other Name', key: 'middleName', width: 20 },
      { header: 'Role (Drop-down)*', key: 'role', width: 25 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Phone', key: 'phone', width: 20 },
      { header: 'Specialization (For Teachers)', key: 'specialization', width: 30 }
    ];

    await addSchoolHeader(workbook, worksheet, school, 'G', 'staff');

    // Styling the header row (now at row 8)
    worksheet.getRow(8).font = { bold: true };
    worksheet.getRow(8).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add example row
    worksheet.addRow({
      firstName: 'Amina',
      lastName: 'Ibrahim',
      middleName: '',
      role: 'teacher',
      email: 'amina@example.com',
      phone: '08000000000',
      specialization: 'Mathematics'
    });

    // Add Data Validation (Dropdowns) - Processing from row 9 up to 200
    for (let i = 9; i <= 200; i++) {
      worksheet.getCell(`D${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"teacher,admin,sub_admin,principal,accountant,examination_officer,attendance_admin"']
      };
    }

    // Add instructions sheet
    addInstructionsSheet(workbook, 'staff');

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Staff_Bulk_Upload_Template.xlsx');
    
    await workbook.xlsx.write(res);
  } catch (error) {
    console.error('Template generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk upload staff from file
router.post('/upload-staff', authenticate, authorize(['admin', 'principal']), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const staffRaw = [];
    const headers = {};

    try {
      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(worksheet, { header: 1, raw: false });

      if (data.length > 0) {
        let headerRowIndex = 0;
        while (headerRowIndex < data.length) {
          const row = data[headerRowIndex];
          if (row && row.some(cell => cell && cell.toString().toLowerCase().includes('first name'))) {
            break;
          }
          headerRowIndex++;
        }

        if (headerRowIndex >= data.length) {
          return res.status(400).json({ error: 'No data found in file' });
        }

        const headerRow = data[headerRowIndex].map(h => (h !== undefined && h !== null) ? h.toString().toLowerCase().trim() : '');
        
        headerRow.forEach((header, colNumber) => {
          if (!header) return;
          if (header.includes('first name')) headers.firstName = colNumber;
          else if (header.includes('surname') || header.includes('last name')) headers.lastName = colNumber;
          else if (header.includes('other name') || header.includes('middle name')) headers.middleName = colNumber;
          else if (header.includes('role')) headers.role = colNumber;
          else if (header === 'email' || header.includes('staff email')) headers.email = colNumber;
          else if (header.includes('phone')) headers.phone = colNumber;
          else if (header.includes('specialization')) headers.specialization = colNumber;
        });

        for (let i = headerRowIndex + 1; i < data.length; i++) {
          const row = data[i];
          if (!row || row.length === 0) continue;

          const getVal = (key) => {
            const idx = headers[key];
            if (idx !== undefined && row[idx] !== undefined && row[idx] !== null) {
              return row[idx].toString().trim();
            }
            return '';
          };

          const firstName = getVal('firstName');
          const lastName = getVal('lastName');

          if (!firstName && !lastName) continue;

          staffRaw.push({
            firstName,
            lastName,
            middleName: getVal('middleName'),
            role: getVal('role') || 'teacher',
            email: getVal('email'),
            phone: getVal('phone'),
            specialization: getVal('specialization')
          });
        }
      }
    } catch (parseError) {
      console.error('File parsing error:', parseError);
      return res.status(400).json({ error: 'Failed to parse file. Please make sure you are using a valid Excel (.xlsx) or CSV file.' });
    }

    if (staffRaw.length === 0) {
      return res.status(400).json({ error: 'No staff data found in file' });
    }

    const results = { successful: [], failed: [] };
    const schoolIdInt = parseInt(req.schoolId);

    const school = await prisma.school.findUnique({ where: { id: schoolIdInt } });
    const schoolCode = school?.code || 'SCH';
    const schoolInitials = school?.name
      ? school.name.split(' ').filter(word => word.length > 0).map(word => word[0].toUpperCase()).join('').substring(0, 3)
      : 'SCH';
    const currentYear = new Date().getFullYear();

    for (const staff of staffRaw) {
      try {
        if (!staff.firstName || !staff.lastName || !staff.role) {
          results.failed.push({
            data: staff,
            error: `Missing required fields: ${!staff.firstName ? 'firstName ' : ''}${!staff.lastName ? 'lastName ' : ''}${!staff.role ? 'role' : ''}`.trim()
          });
          continue;
        }

        const allowedRoles = ['teacher', 'admin', 'sub_admin', 'principal', 'accountant', 'examination_officer', 'attendance_admin'];
        if (!allowedRoles.includes(staff.role.toLowerCase())) {
          results.failed.push({
            data: staff,
            error: `Invalid role: ${staff.role}. Allowed: ${allowedRoles.join(', ')}`
          });
          continue;
        }

        if (['admin', 'principal', 'accountant', 'examination_officer', 'attendance_admin'].includes(staff.role.toLowerCase())) {
          const existingSingleton = await prisma.user.findFirst({
            where: { schoolId: schoolIdInt, role: staff.role.toLowerCase() }
          });
          if (existingSingleton) {
            results.failed.push({
              data: staff,
              error: `A ${staff.role} account already exists. Only one is allowed.`
            });
            continue;
          }
        }

        let finalUsername = '';
        if (staff.role.toLowerCase() === 'teacher') {
          finalUsername = await generateTeacherUsername(
            schoolIdInt,
            schoolCode,
            staff.firstName,
            staff.lastName
          );
        } else if (['admin', 'sub_admin', 'principal', 'accountant', 'examination_officer', 'attendance_admin'].includes(staff.role.toLowerCase())) {
          let position = staff.role.toLowerCase();
          if (staff.role.toLowerCase() === 'examination_officer') position = 'exam_off';
          if (staff.role.toLowerCase() === 'attendance_admin') position = 'attend_off';

          let usernameExists = true;
          while (usernameExists) {
            const randomNums = Math.floor(100 + Math.random() * 900); // 3-digit random number
            finalUsername = `${position}/${schoolInitials}@${randomNums}`;

            const existing = await prisma.user.findFirst({
              where: { username: finalUsername, schoolId: schoolIdInt }
            });
            if (!existing) usernameExists = false;
          }
        } else {
          const baseUsername = `${staff.firstName.toLowerCase()}.${staff.lastName.toLowerCase()}`.replace(/\s+/g, '');
          let usernameExists = await prisma.user.findFirst({
            where: { username: baseUsername, schoolId: schoolIdInt }
          });
          let counter = 1;
          finalUsername = baseUsername;

          while (usernameExists) {
            finalUsername = `${baseUsername}${counter}`;
            usernameExists = await prisma.user.findFirst({
              where: { username: finalUsername, schoolId: schoolIdInt }
            });
            counter++;
          }
        }

        // Auto password generation
        const lastInitial = staff.lastName.charAt(0).toUpperCase();
        const generatedPassword = `${staff.firstName}${lastInitial}@123`;
        const passwordHash = await bcrypt.hash(generatedPassword, 10);

        let userEmailToUse = staff.email || null;
        if (userEmailToUse) {
          const existingEmailUser = await prisma.user.findUnique({
            where: { schoolId_email: { schoolId: schoolIdInt, email: userEmailToUse } }
          });
          if (existingEmailUser) {
            userEmailToUse = null; 
          }
        }

        const user = await prisma.user.create({
          data: {
            schoolId: schoolIdInt,
            username: finalUsername,
            passwordHash,
            email: userEmailToUse,
            phone: staff.phone || null,
            role: staff.role.toLowerCase(),
            firstName: staff.firstName,
            lastName: staff.lastName,
            middleName: staff.middleName || null,
            isActive: true,
            mustChangePassword: false
          }
        });

        if (staff.role.toLowerCase() === 'teacher') {
          const existingTeachers = await prisma.teacher.findMany({
            where: {
              schoolId: schoolIdInt,
              staffId: { startsWith: `${schoolInitials}/${currentYear}/` }
            },
            select: { staffId: true }
          });

          let maxSequence = 0;
          const pattern = new RegExp(`${schoolInitials.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\/\\d{4}\\/(\\d{3})`);
          existingTeachers.forEach(t => {
            const match = t.staffId.match(pattern);
            if (match) {
              const seq = parseInt(match[1], 10);
              if (seq > maxSequence) maxSequence = seq;
            }
          });

          const nextSequence = String(maxSequence + 1).padStart(3, '0');
          const generatedStaffId = `${schoolInitials}/${currentYear}/${nextSequence}`;

          await prisma.teacher.create({
            data: {
              schoolId: schoolIdInt,
              userId: user.id,
              staffId: generatedStaffId,
              specialization: staff.specialization || null
            }
          });
        }

        results.successful.push({
          username: finalUsername,
          password: generatedPassword,
          name: `${staff.firstName} ${staff.lastName}`,
          role: staff.role
        });

      } catch (err) {
        console.error(`Error importing staff ${staff.firstName}:`, err);
        results.failed.push({ data: staff, error: err.message });
      }
    }

    res.json({
      message: `Import completed. ${results.successful.length} successful, ${results.failed.length} failed.`,
      successful: results.successful,
      failed: results.failed
    });

  } catch (error) {
    console.error('Bulk staff import error:', error);
    res.status(500).json({ error: error.message });
  }
});
