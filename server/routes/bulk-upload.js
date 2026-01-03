const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');
const { generateAdmissionNumber, getUniqueAdmissionNumber } = require('../utils/studentUtils');
const bcrypt = require('bcryptjs');

// Bulk upload students from CSV data
router.post('/bulk-upload', authenticate, authorize(['admin', 'teacher']), async (req, res) => {
  try {
    const { students } = req.body;

    if (!students || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ error: 'No student data provided' });
    }

    const results = {
      successful: [],
      failed: []
    };

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
            dateOfBirth: studentData.dateOfBirth ? new Date(studentData.dateOfBirth) : null,
            gender: studentData.gender || null,
            stateOfOrigin: studentData.stateOfOrigin || null,
            nationality: studentData.nationality || 'Nigerian',
            address: studentData.address || null,
            parentGuardianName: studentData.parentGuardianName || null,
            parentGuardianPhone: studentData.parentGuardianPhone || null,
            parentEmail: studentData.parentEmail || null,
            bloodGroup: studentData.bloodGroup || null,
            genotype: studentData.genotype || null,
            disability: studentData.disability || 'None'
          }
        });

        // Check for active fee structure and create fee record
        // Optimization: Fetch current term once outside loop if possible, but for now inside is safer for correctness if not refactoring whole function
        // Actually, let's fetch it inside to be safe with the existing structure
        const currentTerm = await prisma.term.findFirst({
          where: {
            isCurrent: true,
            schoolId: req.schoolId
          },
          include: { academicSession: true }
        });

        if (currentTerm) {
          const feeStructure = await prisma.classFeeStructure.findUnique({
            where: {
              schoolId_classId_termId_academicSessionId: {
                schoolId: req.schoolId,
                classId: parseInt(studentData.classId),
                termId: currentTerm.id,
                academicSessionId: currentTerm.academicSessionId
              }
            }
          });

          if (feeStructure) {
            await prisma.feeRecord.create({
              data: {
                schoolId: req.schoolId,
                studentId: student.id,
                termId: currentTerm.id,
                academicSessionId: currentTerm.academicSessionId,
                expectedAmount: feeStructure.amount,
                paidAmount: 0,
                balance: feeStructure.amount,
                isClearedForExam: true
              }
            });
          }
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
router.post('/results', authenticate, authorize(['admin', 'teacher']), async (req, res) => {
  try {
    const { results, termId, academicSessionId, classId, subjectId } = req.body;

    if (!results || !Array.isArray(results) || results.length === 0) {
      return res.status(400).json({ error: 'No result data provided' });
    }

    if (!termId || !academicSessionId || !classId || !subjectId) {
      return res.status(400).json({ error: 'Term ID, Academic Session ID, Class ID, and Subject ID are required' });
    }

    // Verify teacher has permission for this subject-class combination
    if (req.user.role === 'teacher') {
      const assignment = await prisma.teacherAssignment.findFirst({
        where: {
          schoolId: req.schoolId,
          teacherId: req.user.id,
          subjectId: parseInt(subjectId),
          classId: parseInt(classId)
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

        // Parse and validate scores
        const assignment1Score = resultData.assignment1 ? parseFloat(resultData.assignment1) : null;
        const assignment2Score = resultData.assignment2 ? parseFloat(resultData.assignment2) : null;
        const test1Score = resultData.test1 ? parseFloat(resultData.test1) : null;
        const test2Score = resultData.test2 ? parseFloat(resultData.test2) : null;
        const examScore = resultData.exam ? parseFloat(resultData.exam) : null;

        // Validate score ranges
        if (assignment1Score !== null && (assignment1Score < 0 || assignment1Score > 5)) {
          uploadResults.failed.push({
            data: resultData,
            error: '1st Assignment score must be between 0 and 5'
          });
          continue;
        }

        if (assignment2Score !== null && (assignment2Score < 0 || assignment2Score > 5)) {
          uploadResults.failed.push({
            data: resultData,
            error: '2nd Assignment score must be between 0 and 5'
          });
          continue;
        }

        if (test1Score !== null && (test1Score < 0 || test1Score > 10)) {
          uploadResults.failed.push({
            data: resultData,
            error: '1st Test score must be between 0 and 10'
          });
          continue;
        }

        if (test2Score !== null && (test2Score < 0 || test2Score > 10)) {
          uploadResults.failed.push({
            data: resultData,
            error: '2nd Test score must be between 0 and 10'
          });
          continue;
        }

        if (examScore !== null && (examScore < 0 || examScore > 70)) {
          uploadResults.failed.push({
            data: resultData,
            error: 'Examination score must be between 0 and 70'
          });
          continue;
        }

        // Calculate total score
        const totalScore = (assignment1Score || 0) + (assignment2Score || 0) +
          (test1Score || 0) + (test2Score || 0) + (examScore || 0);

        const grade = calculateGrade(totalScore);

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
          assignment1Score,
          assignment2Score,
          test1Score,
          test2Score,
          examScore,
          totalScore,
          grade,
          teacherId: req.user.id,
          isSubmitted: true,
          submittedAt: new Date()
        };

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
        }

      } catch (error) {
        uploadResults.failed.push({
          data: resultData,
          error: error.message
        });
      }
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
