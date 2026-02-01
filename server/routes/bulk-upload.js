const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');
const { generateAdmissionNumber, getUniqueAdmissionNumber } = require('../utils/studentUtils');
const { createOrUpdateFeeRecordWithOpening } = require('../utils/feeCalculations');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const ExcelJS = require('exceljs');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Download Bulk Student Template (CSV)
router.get('/template/students', authenticate, authorize(['admin', 'teacher', 'principal']), async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Students');

    // Get classes for ID reference
    const classes = await prisma.class.findMany({
      where: { schoolId: req.schoolId, isActive: true },
      select: { id: true, name: true, arm: true }
    });

    worksheet.columns = [
      { header: 'First Name*', key: 'firstName', width: 20 },
      { header: 'Last Name*', key: 'lastName', width: 20 },
      { header: 'Middle Name', key: 'middleName', width: 20 },
      { header: 'Class ID*', key: 'classId', width: 10 },
      { header: 'Class Name (Info)', key: 'className', width: 20 },
      { header: 'Gender (Male/Female)', key: 'gender', width: 15 },
      { header: 'Parent Name*', key: 'parentName', width: 25 },
      { header: 'Parent Phone*', key: 'parentPhone', width: 20 },
      { header: 'Address', key: 'address', width: 40 },
      { header: 'Date of Birth (YYYY-MM-DD)', key: 'dob', width: 20 },
      { header: 'Scholarship (Yes/No)', key: 'isScholarship', width: 20 }
    ];

    // Add example row
    if (classes.length > 0) {
      worksheet.addRow({
        firstName: 'John',
        lastName: 'Doe',
        middleName: 'Junior',
        classId: classes[0].id,
        className: `${classes[0].name} ${classes[0].arm || ''}`,
        gender: 'Male',
        parentName: 'Jane Doe',
        parentPhone: '08012345678',
        address: '123 School Road',
        dob: '2015-05-15',
        isScholarship: 'No'
      });
    }

    // Add a second sheet with Class IDs for reference
    const refSheet = workbook.addWorksheet('Class Reference');
    refSheet.columns = [
      { header: 'Class ID', key: 'id', width: 10 },
      { header: 'Class Name', key: 'name', width: 30 }
    ];
    classes.forEach(c => {
      refSheet.addRow({ id: c.id, name: `${c.name} ${c.arm || ''}` });
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=Student_Import_Template.csv');
    await workbook.csv.write(res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk upload students from file
router.post('/upload', authenticate, authorize(['admin', 'teacher', 'principal']), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const workbook = new ExcelJS.Workbook();
    if (req.file.originalname.endsWith('.csv')) {
      const stream = require('stream');
      const bufferStream = new stream.PassThrough();
      bufferStream.end(req.file.buffer);
      await workbook.csv.read(bufferStream);
    } else {
      await workbook.xlsx.load(req.file.buffer);
    }

    const worksheet = workbook.worksheets[0];
    const studentsRaw = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      studentsRaw.push({
        firstName: row.getCell(1).value?.toString()?.trim(),
        lastName: row.getCell(2).value?.toString()?.trim(),
        middleName: row.getCell(3).value?.toString()?.trim(),
        classId: row.getCell(4).value?.toString()?.trim(),
        gender: row.getCell(6).value?.toString()?.trim(),
        parentGuardianName: row.getCell(7).value?.toString()?.trim(),
        parentGuardianPhone: row.getCell(8).value?.toString()?.trim(),
        address: row.getCell(9).value?.toString()?.trim(),
        dateOfBirth: row.getCell(10).value?.toString()?.trim(),
        isScholarship: row.getCell(11).value?.toString()?.trim()
      });
    });

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

    // If user is a teacher, get their assigned classes
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
        if (!studentData.firstName || !studentData.lastName || !studentData.classId) {
          results.failed.push({
            data: studentData,
            error: `Missing required fields: ${!studentData.firstName ? 'firstName ' : ''}${!studentData.lastName ? 'lastName ' : ''}${!studentData.classId ? 'classId' : ''}`.trim()
          });
          continue;
        }

        let classIdInt = parseInt(studentData.classId);
        let classInfo = null;

        if (!isNaN(classIdInt)) {
          classInfo = await prisma.class.findFirst({
            where: { id: classIdInt, schoolId: schoolIdInt }
          });
        }

        if (!classInfo && studentData.classId) {
          const classNameStr = studentData.classId.toString().trim().toLowerCase();

          // Try to match by Arm exactly if it's "JSS 2 B" or "JSS 2B"
          // We can't easily parse all formats, so we'll try some common ones
          classInfo = await prisma.class.findFirst({
            where: {
              schoolId: schoolIdInt,
              isActive: true,
              OR: [
                { name: { contains: classNameStr } },
                {
                  AND: [
                    { name: { contains: classNameStr.split(' ')[0] } },
                    { arm: { contains: classNameStr.split(' ').pop() } }
                  ]
                }
              ]
            }
          });

          if (classInfo) {
            classIdInt = classInfo.id;
          }
        }

        if (!classInfo) {
          results.failed.push({
            data: studentData,
            error: `Invalid Class reference: "${studentData.classId}". Please use the numeric ID from the reference sheet.`
          });
          continue;
        }

        // Check permission for teacher
        if (allowedClassIds && !allowedClassIds.has(classIdInt)) {
          results.failed.push({
            data: studentData,
            error: `Unauthorized access to class ID ${classIdInt}`
          });
          continue;
        }

        const admissionYear = new Date().getFullYear();
        const baseAdmissionNumber = generateAdmissionNumber(
          admissionYear,
          classInfo.name,
          classInfo.arm || '',
          studentData.firstName,
          studentData.lastName
        );

        const admissionNumber = await getUniqueAdmissionNumber(prisma, baseAdmissionNumber, classIdInt, schoolIdInt);

        // Unique username
        const baseUsername = `${studentData.firstName.toLowerCase()}.${studentData.lastName.toLowerCase()}`;
        let username = baseUsername;
        let counter = 1;
        while (await prisma.user.findUnique({
          where: { schoolId_username: { schoolId: schoolIdInt, username } }
        })) {
          username = `${baseUsername}${counter}`;
          counter++;
        }

        const hashedPassword = await bcrypt.hash('student123', 10);

        // Database writes
        const user = await prisma.user.create({
          data: {
            schoolId: schoolIdInt,
            username,
            passwordHash: hashedPassword,
            role: 'student',
            firstName: studentData.firstName,
            lastName: studentData.lastName,
            isActive: true
          }
        });

        const student = await prisma.student.create({
          data: {
            schoolId: schoolIdInt,
            userId: user.id,
            admissionNumber,
            classId: classIdInt,
            middleName: studentData.middleName,
            dateOfBirth: (studentData.dateOfBirth && !isNaN(new Date(studentData.dateOfBirth).getTime()))
              ? new Date(studentData.dateOfBirth)
              : null,
            gender: studentData.gender,
            address: studentData.address,
            parentGuardianName: studentData.parentGuardianName,
            parentGuardianPhone: studentData.parentGuardianPhone,
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
                classId: classIdInt,
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
        where: {
          classTeacherId: req.user.id,
          schoolId: req.schoolId
        },
        select: { id: true }
      });
      allowedClassIds = new Set(assignedClasses.map(c => c.id));
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

        // Check permission for teacher
        if (allowedClassIds && !allowedClassIds.has(parseInt(studentData.classId))) {
          results.failed.push({
            data: studentData,
            error: 'You are not the assigned class teacher for this class'
          });
          continue;
        }

        // Generate admission number
        const classInfo = await prisma.class.findFirst({
          where: {
            id: parseInt(studentData.classId),
            schoolId: req.schoolId
          }
        });

        if (!classInfo) {
          results.failed.push({
            data: studentData,
            error: 'Invalid class ID'
          });
          continue;
        }

        const admissionYear = studentData.admissionYear || new Date().getFullYear();
        const className = classInfo.name;
        const classArm = classInfo.arm || '';

        const baseAdmissionNumber = generateAdmissionNumber(
          admissionYear,
          className,
          classArm,
          studentData.firstName,
          studentData.lastName
        );

        const admissionNumber = await getUniqueAdmissionNumber(prisma, baseAdmissionNumber, parseInt(studentData.classId), req.schoolId);

        // Generate username from first name and last name
        const baseUsername = `${studentData.firstName.toLowerCase()}.${studentData.lastName.toLowerCase()}`;
        let username = baseUsername;
        let counter = 1;

        // Ensure unique username
        while (await prisma.user.findUnique({
          where: {
            schoolId_username: {
              schoolId: req.schoolId,
              username
            }
          }
        })) {
          username = `${baseUsername}${counter}`;
          counter++;
        }

        // Create user account
        const hashedPassword = await bcrypt.hash(studentData.password || 'student123', 10);

        const user = await prisma.user.create({
          data: {
            schoolId: req.schoolId,
            username,
            passwordHash: hashedPassword,
            email: studentData.email || null,
            role: 'student',
            firstName: studentData.firstName,
            lastName: studentData.lastName,
            isActive: true
          }
        });

        // Create student profile
        const student = await prisma.student.create({
          data: {
            schoolId: req.schoolId,
            userId: user.id,
            admissionNumber,
            classId: parseInt(studentData.classId),
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
          const cId = Number(studentData.classId);

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
router.post('/results', authenticate, authorize(['admin', 'teacher', 'principal']), async (req, res) => {
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
