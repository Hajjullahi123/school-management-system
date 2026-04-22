const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');
const { generateAdmissionNumber, getUniqueAdmissionNumber } = require('../utils/studentUtils');
const { createOrUpdateFeeRecordWithOpening } = require('../utils/feeCalculations');
const { generateStudentUsername } = require('../utils/usernameGenerator');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const ExcelJS = require('exceljs');
const xlsx = require('xlsx');
const storage = multer.memoryStorage();
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

    worksheet.columns = [
      { header: 'First Name*', key: 'firstName', width: 20 },
      { header: 'Last Name*', key: 'lastName', width: 20 },
      { header: 'Middle Name', key: 'middleName', width: 20 },
      { header: 'Class ID*', key: 'classId', width: 12 },
      { header: 'Class Name (Optional)', key: 'className', width: 25 },
      { header: 'Gender (Male/Female)', key: 'gender', width: 20 },
      { header: 'Genotype (Drop-down)', key: 'genotype', width: 20 },
      { header: 'Disability (Drop-down)', key: 'disability', width: 25 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Parent Name*', key: 'parentName', width: 25 },
      { header: 'Parent Phone', key: 'parentPhone', width: 20 },
      { header: 'Address', key: 'address', width: 40 },
      { header: 'Date of Birth (YYYY-MM-DD)', key: 'dob', width: 25 },
      { header: 'Scholarship (Yes/No)', key: 'isScholarship', width: 20 }
    ];

    // Styling the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
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
        genotype: 'AA',
        disability: 'None',
        email: 'abdulllawal@example.com',
        parentName: 'Lawal Musa',
        parentPhone: '08000000000',
        address: '123 School Road',
        dob: '2015-05-15',
        isScholarship: 'No'
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

    // Add Data Validation (Dropdowns) - Processing from row 2 up to 500
    for (let i = 2; i <= 500; i++) {
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
      
      // Genotype (Column G)
      worksheet.getCell(`G${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"AA,AS,AC,SS,SC,CC"']
      };
      // Disability (Column H)
      worksheet.getCell(`H${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"None,Visual,Hearing,Physical,Intellectual,Other"']
      };
      // Scholarship (Column N)
      worksheet.getCell(`N${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"Yes,No"']
      };
    }

    // Add instructions sheet
    const helpSheet = workbook.addWorksheet('Instructions');
    helpSheet.columns = [{ header: 'Step', key: 'step', width: 80 }];
    [
      '1. Use the "Students Template" sheet to fill in student information.',
      '2. In the "Class ID" column, select the class from the dropdown menu (e.g., "1 - Class Name").',
      '3. Fields marked with * are required (First Name, Last Name, Class ID, Parent Name).',
      '4. Date of Birth must follow the format YYYY-MM-DD (e.g., 2012-10-25).',
      '5. Use the drop-down menus for columns with selections (Class ID, Gender, Genotype, Disability, Scholarship).',
      '6. Save this file as .xlsx before uploading (CSV might lose dropdowns).'
    ].forEach(text => helpSheet.addRow({ step: text }));

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
        // Map headers
        const headerRow = data[0].map(h => (h !== undefined && h !== null) ? h.toString().toLowerCase().trim() : '');
        
        headerRow.forEach((header, colNumber) => {
          if (header.includes('first name')) headers.firstName = colNumber;
          else if (header.includes('last name')) headers.lastName = colNumber;
          else if (header.includes('middle name')) headers.middleName = colNumber;
          else if (header.includes('class id')) headers.classId = colNumber;
          else if (header.includes('gender')) headers.gender = colNumber;
          else if (header.includes('genotype')) headers.genotype = colNumber;
          else if (header.includes('disability')) headers.disability = colNumber;
          else if (header === 'email' || header.includes('student email')) headers.email = colNumber;
          else if (header.includes('parent name') || header.includes('guardian name')) headers.parentGuardianName = colNumber;
          else if (header.includes('parent phone') || header.includes('guardian phone')) headers.parentGuardianPhone = colNumber;
          else if (header.includes('parent email') || header.includes('guardian email')) headers.parentEmail = colNumber;
          else if (header.includes('address')) headers.address = colNumber;
          else if (header.includes('date of birth') || header.includes('dob')) headers.dateOfBirth = colNumber;
          else if (header.includes('scholarship')) headers.isScholarship = colNumber;
        });

        // Parse rows
        for (let i = 1; i < data.length; i++) {
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
            isScholarship: getVal('isScholarship')
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

    // Determine allowed class IDs if user is a teacher
    let allowedClassIds = null;
    if (req.user.role === 'teacher') {
      const assignedClasses = await prisma.class.findMany({
        where: { classTeacherId: req.user.id, schoolId: req.schoolId },
        select: { id: true }
      });
      allowedClassIds = new Set(assignedClasses.map(c => c.id));
    }

    for (const studentData of studentsRaw) {
      try {
        // Validate required fields
        if (!studentData.firstName || !studentData.lastName || !studentData.classId || !studentData.parentGuardianName) {
          results.failed.push({
            data: studentData,
            error: `Missing required fields: ${!studentData.firstName ? 'firstName ' : ''}${!studentData.lastName ? 'lastName ' : ''}${!studentData.classId ? 'classId ' : ''}${!studentData.parentGuardianName ? 'parentGuardianName' : ''}`.trim()
          });
          continue;
        }

        let classIdVal = studentData.classId.toString().trim();
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

        // 3. Fallback to Class Name matching
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

        const admissionYear = new Date().getFullYear();
        const admissionNumber = await generateStudentUsername(
          schoolIdInt,
          schoolCode,
          studentData.firstName,
          studentData.lastName,
          admissionYear
        );

        // Sync username with admission number
        const username = admissionNumber.toLowerCase();

        const hashedPassword = await bcrypt.hash('student123', 10);

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
            isScholarship: studentData.isScholarship?.toLowerCase() === 'yes' || studentData.isScholarship?.toLowerCase() === 'true'
          }
        });

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
            expectedAmount: student.isScholarship ? 0 : (feeStructure?.amount || 0),
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
        where: { classTeacherId: req.user.id, schoolId: req.schoolId },
        select: { id: true }
      });
      allowedClassIds = new Set(assignedClasses.map(c => c.id));
    }

    // Fetch classes for mapping
    const availableClasses = await prisma.class.findMany({
      where: { schoolId: schoolIdInt, isActive: true },
      orderBy: { id: 'asc' }
    });

    for (const studentData of students) {
      try {
        // Validate required fields
        if (!studentData.firstName || !studentData.lastName || !studentData.classId || !studentData.parentGuardianName) {
          results.failed.push({
            data: studentData,
            error: 'Missing required fields (firstName, lastName, classId, or parentGuardianName)'
          });
          continue;
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
            isScholarship: studentData.isScholarship?.toLowerCase() === 'yes' || studentData.isScholarship?.toLowerCase() === 'true'
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
            expectedAmount: student.isScholarship ? 0 : (feeStructure?.amount || 0),
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
            studentName: `${student.user.firstName} ${student.user.lastName}`,
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
            studentName: `${student.user.firstName} ${student.user.lastName}`,
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
