const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const ExcelJS = require('exceljs');

// Helper to generate Excel Scoresheet
async function generateExcel(res, titleData, studentData, filename) {
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
  worksheet.getCell('A1').value = "DARUL QUR'AN SCHOOL MANAGEMENT SYSTEM";
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
    'Assign 1 (5)', 'Assign 2 (5)', 'Test 1 (10)', 'Test 2 (10)', 'Exam (70)', 'Total (100)'
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
      null, null, null, null, null,
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
    // 0-5 for Assignments
    ['D', 'E'].forEach(col => {
      worksheet.dataValidations.add(`${col}8:${col}${lastRow}`, {
        type: 'decimal', operator: 'between', formulae: [0, 5],
        showErrorMessage: true, errorTitle: 'Invalid Score', error: 'Max score is 5'
      });
    });
    // 0-10 for Tests
    ['F', 'G'].forEach(col => {
      worksheet.dataValidations.add(`${col}8:${col}${lastRow}`, {
        type: 'decimal', operator: 'between', formulae: [0, 10],
        showErrorMessage: true, errorTitle: 'Invalid Score', error: 'Max score is 10'
      });
    });
    // 0-70 for Exam
    worksheet.dataValidations.add(`H8:H${lastRow}`, {
      type: 'decimal', operator: 'between', formulae: [0, 70],
      showErrorMessage: true, errorTitle: 'Invalid Score', error: 'Max score is 70'
    });
  }

  // 6. Protect Sheet
  await worksheet.protect('school123', {
    selectLockedCells: true,
    selectUnlockedCells: true,
    formatCells: false,
  });

  // 7. Write Response
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  await workbook.xlsx.write(res);
  res.end();
}

// Route: Get available scoresheets for a teacher
router.get('/teacher/:teacherId', authenticate, authorize(['admin', 'teacher']), async (req, res) => {
  try {
    const teacherId = parseInt(req.params.teacherId);

    // Authorization Check
    if (req.user.role !== 'admin' && req.user.id !== teacherId) {
      return res.status(403).json({ error: 'Unauthorized access to these scoresheets' });
    }

    const assignments = await prisma.teacherAssignment.findMany({
      where: { teacherId },
      include: {
        class: {
          include: { _count: { select: { students: true } } }
        },
        subject: true
      },
      orderBy: { class: { name: 'asc' } }
    });

    const scoresheets = assignments.map(a => ({
      classId: a.classId,
      subjectId: a.subjectId,
      className: `${a.class.name} ${a.class.arm || ''}`.trim(),
      subjectName: a.subject.name,
      studentCount: a.class._count.students,
      filename: `${a.class.name}_${a.subject.name}_Scoresheet.xlsx`.replace(/\s+/g, '_')
    }));

    res.json(scoresheets);
  } catch (error) {
    console.error('Error fetching scoresheets:', error);
    res.status(500).json({ error: 'Failed to fetch scoresheets' });
  }
});

// Route: Generate and Download Excel Scoresheet
router.get('/class/:classId/subject/:subjectId', authenticate, authorize(['admin', 'teacher']), async (req, res) => {
  try {
    const classId = parseInt(req.params.classId);
    const subjectId = parseInt(req.params.subjectId);
    const { termId, academicSessionId } = req.query;

    if (!termId || !academicSessionId) {
      return res.status(400).json({ error: 'Missing termId or academicSessionId' });
    }

    // 1. Fetch Metadata
    const [classInfo, subject, term, session] = await Promise.all([
      prisma.class.findUnique({
        where: { id: classId },
        include: {
          students: {
            include: { user: true },
            orderBy: { admissionNumber: 'asc' }
          }
        }
      }),
      prisma.subject.findUnique({ where: { id: subjectId } }),
      prisma.term.findUnique({ where: { id: parseInt(termId) } }),
      prisma.academicSession.findUnique({ where: { id: parseInt(academicSessionId) } })
    ]);

    if (!classInfo) return res.status(404).json({ error: 'Class not found' });
    if (!subject) return res.status(404).json({ error: 'Subject not found' });

    // 2. Fetch Teacher info (Assignee)
    const assignment = await prisma.teacherAssignment.findFirst({
      where: { classId, subjectId },
      include: { teacher: true }
    });

    // Check if requester is authorized (Admin or the Assigned Teacher)
    if (req.user.role !== 'admin') {
      if (!assignment || assignment.teacherId !== req.user.id) {
        return res.status(403).json({ error: 'You are not assigned to this subject/class' });
      }
    }

    // 3. Prepare Data
    const teacherName = assignment
      ? `${assignment.teacher.firstName} ${assignment.teacher.lastName}`
      : 'Unassigned';

    const className = `${classInfo.name} ${classInfo.arm || ''}`.trim();
    const filename = `${className.replace(/\s+/g, '_')}_${subject.name.replace(/\s+/g, '_')}_Scoresheet.xlsx`;

    const titleData = {
      session: session?.name || 'Unknown Session',
      term: term?.name || 'Unknown Term',
      className,
      subjectName: subject.name,
      teacherName
    };

    const studentData = classInfo.students.map(s => ({
      admissionNumber: s.admissionNumber,
      name: `${s.user.firstName} ${s.user.lastName}`
    }));

    // 4. Generate
    await generateExcel(res, titleData, studentData, filename);

  } catch (error) {
    console.error('Download Error:', error);
    // If headers haven't been sent, send JSON error. Otherwise, stream is corrupt.
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

module.exports = router;
