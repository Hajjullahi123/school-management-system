const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');
const ExcelJS = require('exceljs');

// Helper to generate Excel Scoresheet
async function generateExcel(res, titleData, studentData, filename, weights) {
  const w = weights || {
    assignment1Weight: 5,
    assignment2Weight: 5,
    test1Weight: 10,
    test2Weight: 10,
    examWeight: 70
  };
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Scoresheet');

  // 1. Setup Columns
  worksheet.columns = [
    { key: 'sn', width: 6 },
    { key: 'admissionNumber', width: 20 },
    { key: 'studentName', width: 35 },
    { key: 'ass1', width: 12 },
    { key: 'ass2', width: 12 },
    { key: 'test1', width: 12 },
    { key: 'test2', width: 12 },
    { key: 'exam', width: 12 },
    { key: 'total', width: 12 }
  ];

  // 2. Styles
  const centerStyle = { vertical: 'middle', horizontal: 'center' };
  const titleFont = { name: 'Arial', size: 16, bold: true };
  const subTitleFont = { name: 'Arial', size: 12, bold: true };
  const boldFont = { bold: true };
  const borderStyle = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };

  // 3. Headers
  worksheet.mergeCells('A1:I1');
  worksheet.getCell('A1').value = titleData.schoolName || "SCHOOL MANAGEMENT SYSTEM";
  worksheet.getCell('A1').font = titleFont;
  worksheet.getCell('A1').alignment = centerStyle;

  worksheet.mergeCells('A2:I2');
  worksheet.getCell('A2').value = 'SCORESHEET';
  worksheet.getCell('A2').font = subTitleFont;
  worksheet.getCell('A2').alignment = centerStyle;

  worksheet.mergeCells('A3:I3');
  worksheet.getCell('A3').value = `Session: ${titleData.session}   |   Term: ${titleData.term}`;
  worksheet.getCell('A3').font = boldFont;
  worksheet.getCell('A3').alignment = centerStyle;

  worksheet.mergeCells('A4:I4');
  worksheet.getCell('A4').value = `Class: ${titleData.className}   |   Subject: ${titleData.subjectName}`;
  worksheet.getCell('A4').font = boldFont;
  worksheet.getCell('A4').alignment = centerStyle;

  worksheet.mergeCells('A5:I5');
  worksheet.getCell('A5').value = `Teacher: ${titleData.teacherName}`;
  worksheet.getCell('A5').alignment = centerStyle;

  // Table Header Row
  const headerRow = worksheet.getRow(7);
  headerRow.values = [
    'S/N', 'Admission No', 'Student Name',
    `Assign 1 (${w.assignment1Weight})`, `Assign 2 (${w.assignment2Weight})`,
    `Test 1 (${w.test1Weight})`, `Test 2 (${w.test2Weight})`,
    `Exam (${w.examWeight})`, 'Total (100)'
  ];
  headerRow.font = boldFont;
  headerRow.eachCell((cell) => {
    cell.border = borderStyle;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    cell.alignment = centerStyle;
  });

  // 4. Data Rows
  let currentRow = 8;
  studentData.forEach((student, index) => {
    const row = worksheet.getRow(currentRow);

    // Total Formula: SUM(D:H) for current row
    const totalFormula = { formula: `SUM(D${currentRow}:H${currentRow})` };

    row.values = [
      index + 1,
      student.admissionNumber,
      student.name,
      student.ass1 || null,
      student.ass2 || null,
      student.test1 || null,
      student.test2 || null,
      student.exam || null,
      totalFormula
    ];

    // Styling
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.border = borderStyle;
      if (colNumber !== 3) { // Center everything except Name
        cell.alignment = { horizontal: 'center' };
      }
    });

    // Unlocking Input Cells (D, E, F, G, H)
    [4, 5, 6, 7, 8].forEach(col => {
      row.getCell(col).protection = { locked: false };
    });

    currentRow++;
  });

  // 5. Data Validation
  const lastRow = currentRow - 1;
  if (lastRow >= 8) {
    // Assignment 1
    worksheet.dataValidations.add(`D8:D${lastRow}`, {
      type: 'decimal', operator: 'between', formulae: [0, w.assignment1Weight],
      showErrorMessage: true, errorTitle: 'Invalid Score', error: `Max score is ${w.assignment1Weight}`
    });
    // Assignment 2
    worksheet.dataValidations.add(`E8:E${lastRow}`, {
      type: 'decimal', operator: 'between', formulae: [0, w.assignment2Weight],
      showErrorMessage: true, errorTitle: 'Invalid Score', error: `Max score is ${w.assignment2Weight}`
    });
    // Test 1
    worksheet.dataValidations.add(`F8:F${lastRow}`, {
      type: 'decimal', operator: 'between', formulae: [0, w.test1Weight],
      showErrorMessage: true, errorTitle: 'Invalid Score', error: `Max score is ${w.test1Weight}`
    });
    // Test 2
    worksheet.dataValidations.add(`G8:G${lastRow}`, {
      type: 'decimal', operator: 'between', formulae: [0, w.test2Weight],
      showErrorMessage: true, errorTitle: 'Invalid Score', error: `Max score is ${w.test2Weight}`
    });
    // Exam
    worksheet.dataValidations.add(`H8:H${lastRow}`, {
      type: 'decimal', operator: 'between', formulae: [0, w.examWeight],
      showErrorMessage: true, errorTitle: 'Invalid Score', error: `Max score is ${w.examWeight}`
    });
  }

  // 6. Add Instructions Sheet
  const helpSheet = workbook.addWorksheet('Instructions');
  helpSheet.columns = [{ header: 'Step', key: 'step', width: 80 }];
  [
    '1. Use the "Scoresheet" sheet to fill in student scores.',
    `2. Maximum scores for this subject are: Assign 1 (${w.assignment1Weight}), Assign 2 (${w.assignment2Weight}), Test 1 (${w.test1Weight}), Test 2 (${w.test2Weight}), Exam (${w.examWeight}).`,
    '3. Do not modify the "Admission No" or "Student Name" columns.',
    '4. The "Total" column uses a formula to calculate automatically.',
    '5. Once filled, save this file and upload it back to the Bulk Result Upload page.'
  ].forEach(text => helpSheet.addRow({ step: text }));
  helpSheet.getRow(1).font = boldFont;

  // 7. Protect Sheet
  await worksheet.protect('school123', {
    selectLockedCells: true,
    selectUnlockedCells: true,
    formatCells: false,
  });

  // 7. Write Response
  const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);

  await workbook.xlsx.write(res);
  res.end();
}

// Route: Get available scoresheets for a teacher
router.get('/teacher/:teacherId', authenticate, authorize(['admin', 'teacher', 'examination_officer']), async (req, res) => {
  try {
    const teacherId = parseInt(req.params.teacherId);

    // Authorization Check
    if (req.user.role !== 'admin' && req.user.role !== 'examination_officer' && req.user.id !== teacherId) {
      return res.status(403).json({ error: 'Unauthorized access to these scoresheets' });
    }

    const termId = parseInt(req.query.termId);
    const academicSessionId = parseInt(req.query.academicSessionId);

    let classSubjectPairs;

    if (req.user.role === 'examination_officer' || req.user.role === 'admin') {
      // Examination officer & admin: get ALL class-subject pairs for the school
      const classSubjects = await prisma.classSubject.findMany({
        where: { schoolId: req.schoolId },
        include: {
          class: {
            include: {
              _count: {
                select: {
                  students: { where: { schoolId: req.schoolId } }
                }
              }
            }
          },
          subject: true
        }
      });
      classSubjectPairs = classSubjects.map(cs => ({
        class: cs.class,
        subject: cs.subject
      }));
    } else {
      // Teacher: get only assigned class-subject pairs
      const assignments = await prisma.teacherAssignment.findMany({
        where: {
          teacherId,
          schoolId: req.schoolId
        },
        include: {
          classSubject: {
            include: {
              class: {
                include: {
                  _count: {
                    select: {
                      students: { where: { schoolId: req.schoolId } }
                    }
                  }
                }
              },
              subject: true
            }
          }
        }
      });
      classSubjectPairs = assignments.map(a => ({
        class: a.classSubject.class,
        subject: a.classSubject.subject
      }));
    }

    const scoresheets = await Promise.all(classSubjectPairs.map(async pair => {
      // Get count of students who have at least one score component entered
      const resultCount = await prisma.result.count({
        where: {
          schoolId: req.schoolId,
          classId: pair.class.id,
          subjectId: pair.subject.id,
          termId: termId || undefined,
          academicSessionId: academicSessionId || undefined,
          OR: [
            { assignment1Score: { not: null } },
            { assignment2Score: { not: null } },
            { test1Score: { not: null } },
            { test2Score: { not: null } },
            { examScore: { not: null } }
          ]
        }
      });

      return {
        classId: pair.class.id,
        subjectId: pair.subject.id,
        className: `${pair.class.name} ${pair.class.arm || ''}`.trim(),
        subjectName: pair.subject.name,
        studentCount: pair.class._count.students,
        recordedCount: resultCount,
        isCompleted: resultCount > 0 && resultCount >= pair.class._count.students,
        filename: `${pair.class.name}_${pair.subject.name}_Scoresheet.xlsx`.replace(/\s+/g, '_')
      };
    }));

    res.json(scoresheets);
  } catch (error) {
    console.error('Error fetching scoresheets:', error);
    res.status(500).json({ error: 'Failed to fetch scoresheets' });
  }
});

// Route: Generate and Download Excel Scoresheet
router.get('/class/:classId/subject/:subjectId', authenticate, authorize(['admin', 'teacher', 'examination_officer', 'principal']), async (req, res) => {
  try {
    const classId = parseInt(req.params.classId);
    const subjectId = parseInt(req.params.subjectId);
    const { termId, academicSessionId } = req.query;

    console.log(`[Scoresheet] Download requested by User ${req.user.id} (${req.user.role}) for Class ${classId}, Subject ${subjectId}, Term ${termId}, Session ${academicSessionId}`);

    if (!termId || !academicSessionId) {
      console.warn(`[Scoresheet] Missing parameters: termId=${termId}, academicSessionId=${academicSessionId}`);
      return res.status(400).json({ error: 'Missing termId or academicSessionId' });
    }

    // 1. Fetch Metadata
    const [classInfo, subject, term, session, school] = await Promise.all([
      prisma.class.findFirst({
        where: {
          id: classId,
          schoolId: req.schoolId
        },
        include: {
          students: {
            where: { schoolId: req.schoolId, status: 'active' }, // Only active students in template
            include: { user: true },
            orderBy: { admissionNumber: 'asc' }
          }
        }
      }),
      prisma.subject.findFirst({
        where: {
          id: subjectId,
          schoolId: req.schoolId
        }
      }),
      prisma.term.findFirst({
        where: {
          id: parseInt(termId),
          schoolId: req.schoolId
        }
      }),
      prisma.academicSession.findFirst({
        where: {
          id: parseInt(academicSessionId),
          schoolId: req.schoolId
        }
      }),
      prisma.school.findUnique({
        where: { id: req.schoolId }
      })
    ]);

    if (!classInfo) {
      console.warn(`[Scoresheet] Class ${classId} not found for school ${req.schoolId}`);
      return res.status(404).json({ error: 'Class not found' });
    }
    if (!subject) {
      console.warn(`[Scoresheet] Subject ${subjectId} not found for school ${req.schoolId}`);
      return res.status(404).json({ error: 'Subject not found' });
    }
    if (!term || !session) {
      console.warn(`[Scoresheet] Term or Session not found`);
      return res.status(404).json({ error: 'Term or Academic Session not found' });
    }

    // 2. Authorization Check (Admin, Exam Officer, Principal or the Assigned Teacher)
    if (!['admin', 'examination_officer', 'principal'].includes(req.user.role)) {
      // Check if current user is assigned to this class and subject
      const userAssignment = await prisma.teacherAssignment.findFirst({
        where: {
          classSubject: {
            classId,
            subjectId,
            schoolId: req.schoolId
          },
          teacherId: req.user.id,
          schoolId: req.schoolId
        }
      });

      if (!userAssignment) {
        console.warn(`[Scoresheet] Unauthorized: User ${req.user.id} is not assigned to Class ${classId} Subject ${subjectId}`);
        return res.status(403).json({ error: 'You are not assigned to this subject/class' });
      }
    }

    // 3. Prepare Data
    // Get assigned teacher(s) name(s) for the header
    const assignments = await prisma.teacherAssignment.findMany({
      where: {
        classSubject: { classId, subjectId },
        schoolId: req.schoolId
      },
      include: { teacher: true }
    });

    const teacherNames = assignments.length > 0
      ? assignments.map(a => `${a.teacher.firstName} ${a.teacher.lastName}`).join(', ')
      : 'Unassigned';

    const className = `${classInfo.name} ${classInfo.arm || ''}`.trim();
    const filename = `${className.replace(/\s+/g, '_')}_${subject.name.replace(/\s+/g, '_')}_Scoresheet.xlsx`;

    const titleData = {
      schoolName: school?.name || 'School Management System',
      session: session?.name || 'Unknown Session',
      term: term?.name || 'Unknown Term',
      className,
      subjectName: subject.name,
      teacherName: teacherNames
    };

    // 3.5 Fetch Existing Results to include in sheet
    const results = await prisma.result.findMany({
      where: {
        schoolId: req.schoolId,
        classId,
        subjectId,
        termId: parseInt(termId),
        academicSessionId: parseInt(academicSessionId)
      }
    });

    const resultsMap = {};
    results.forEach(r => {
      resultsMap[r.studentId] = r;
    });

    const studentData = classInfo.students.map(s => {
      const r = resultsMap[s.id];
      return {
        admissionNumber: s.admissionNumber,
        name: s.user ? `${s.user.firstName} ${s.user.lastName}` : (s.name || 'Unknown student'),
        ass1: r?.assignment1Score,
        ass2: r?.assignment2Score,
        test1: r?.test1Score,
        test2: r?.test2Score,
        exam: r?.examScore
      };
    });

    console.log(`[Scoresheet] Generating Excel for ${studentData.length} students...`);

    // 4. Generate
    await generateExcel(res, titleData, studentData, filename, school);

    // 5. Log download (Non-blocking)
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'DOWNLOAD_SCORESHEET',
      resource: 'SCORESHEET',
      details: {
        classId,
        subjectId,
        className,
        subjectName: subject.name,
        termId: parseInt(termId),
        academicSessionId: parseInt(academicSessionId)
      },
      ipAddress: req.ip
    }).catch(e => console.error('[Scoresheet] Audit log failed:', e));

    console.log(`[Scoresheet] Download complete for Class ${classId} Subject ${subjectId}`);

  } catch (error) {
    console.error('Download Error:', error);
    // If headers haven't been sent, send JSON error. Otherwise, stream is corrupt.
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'An internal server error occurred during scoresheet generation.' });
    }
  }
});

module.exports = router;
