const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');
const { getGrade: getGradeUtil, getRemark: getRemarkUtil } = require('../utils/grading');
const ExcelJS = require('exceljs');

// ============================================================
// BROADSHEET / COMPILED RESULT SHEET
// Generates an Excel workbook with all students' results for
// a given class across selected terms in a session.
// ============================================================

router.get('/download/:classId',
  authorize(['admin', 'teacher', 'principal', 'examination_officer']),
  async (req, res) => {
    try {
      const classId = parseInt(req.params.classId);
      const { academicSessionId, termIds } = req.query;

      // Input validation
      if (isNaN(classId)) {
        return res.status(400).json({ error: 'Invalid classId' });
      }
      if (!academicSessionId) {
        return res.status(400).json({ error: 'academicSessionId is required' });
      }

      const sessionId = parseInt(academicSessionId);
      if (isNaN(sessionId)) {
        return res.status(400).json({ error: 'Invalid academicSessionId' });
      }

      // termIds can be comma-separated e.g. "1,2,3" or "all"
      let selectedTermIds = [];
      if (!termIds || termIds === 'all') {
        const terms = await prisma.term.findMany({
          where: { schoolId: req.schoolId, academicSessionId: sessionId },
          orderBy: { startDate: 'asc' }
        });
        selectedTermIds = terms.map(t => t.id);
      } else {
        selectedTermIds = termIds.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
      }

      if (selectedTermIds.length === 0) {
        return res.status(400).json({ error: 'No valid terms found for this session' });
      }

      // 1. Fetch metadata
      const [classInfo, session, school, terms] = await Promise.all([
        prisma.class.findFirst({
          where: { id: classId, schoolId: req.schoolId },
          include: {
            students: {
              where: { schoolId: req.schoolId, status: 'active' },
              include: { user: { select: { firstName: true, middleName: true, lastName: true } } },
              orderBy: { admissionNumber: 'asc' }
            }
          }
        }),
        prisma.academicSession.findFirst({ where: { id: sessionId, schoolId: req.schoolId } }),
        prisma.school.findUnique({ where: { id: req.schoolId } }),
        prisma.term.findMany({
          where: { id: { in: selectedTermIds }, schoolId: req.schoolId },
          orderBy: { startDate: 'asc' }
        })
      ]);

      if (!classInfo) return res.status(404).json({ error: 'Class not found' });
      if (!session) return res.status(404).json({ error: 'Session not found' });

      // 2. Authorization check for teachers
      if (req.user.role === 'teacher') {
        const isClassTeacher = classInfo.classTeacherId === req.user.id;
        const hasAssignment = await prisma.teacherAssignment.findFirst({
          where: { teacherId: req.user.id, classSubject: { classId }, schoolId: req.schoolId }
        });
        if (!isClassTeacher && !hasAssignment) {
          return res.status(403).json({ error: 'You are not assigned to this class' });
        }
      }

      // 3. Fetch all subjects for this class
      const classSubjects = await prisma.classSubject.findMany({
        where: { classId, schoolId: req.schoolId },
        include: { subject: true },
        orderBy: { subject: { name: 'asc' } }
      });
      const subjects = classSubjects.map(cs => cs.subject);

      if (subjects.length === 0) {
        return res.status(400).json({ error: 'No subjects configured for this class. Please assign subjects first.' });
      }

      if (classInfo.students.length === 0) {
        return res.status(400).json({ error: 'No active students found in this class.' });
      }

      // 4. Fetch ALL results for this class/session/terms
      const results = await prisma.result.findMany({
        where: {
          schoolId: req.schoolId,
          classId,
          academicSessionId: sessionId,
          termId: { in: selectedTermIds }
        }
      });

      // 5. Fetch report cards for position/remark data
      const reportCards = await prisma.studentReportCard.findMany({
        where: {
          schoolId: req.schoolId,
          classId,
          academicSessionId: sessionId,
          termId: { in: selectedTermIds }
        }
      });

      // 6. Parse grading system — use centralized utility as fallback
      let gradingSystem = [];
      try {
        gradingSystem = JSON.parse(school?.gradingSystem || '[]');
      } catch { gradingSystem = []; }

      const getGrade = (score) => {
        if (score === null || score === undefined) return '-';
        // Use school-specific grading if available, else centralized utility
        if (gradingSystem.length > 0) {
          for (const g of gradingSystem) {
            if (score >= g.min && score <= (g.max || 100)) return g.grade;
          }
          return '-';
        }
        return getGradeUtil(score, gradingSystem) || '-';
      };

      const getRemark = (score) => {
        if (score === null || score === undefined) return '-';
        if (gradingSystem.length > 0) {
          for (const g of gradingSystem) {
            if (score >= g.min && score <= (g.max || 100)) return g.remark || g.grade;
          }
          return '-';
        }
        const grade = getGradeUtil(score, gradingSystem);
        return getRemarkUtil(grade, gradingSystem) || '-';
      };

      // 7. Index results and report cards
      // resultMap[studentId][termId][subjectId] = result
      const resultMap = {};
      results.forEach(r => {
        if (!resultMap[r.studentId]) resultMap[r.studentId] = {};
        if (!resultMap[r.studentId][r.termId]) resultMap[r.studentId][r.termId] = {};
        resultMap[r.studentId][r.termId][r.subjectId] = r;
      });

      // reportMap[studentId][termId] = reportCard
      const reportMap = {};
      reportCards.forEach(rc => {
        if (!reportMap[rc.studentId]) reportMap[rc.studentId] = {};
        reportMap[rc.studentId][rc.termId] = rc;
      });

      // 8. Build the Excel workbook
      const workbook = new ExcelJS.Workbook();
      const className = `${classInfo.name} ${classInfo.arm || ''}`.trim();

      const centerAlign = { vertical: 'middle', horizontal: 'center', wrapText: true };
      const leftAlign = { vertical: 'middle', horizontal: 'left' };
      const borderStyle = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' }
      };
      const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
      const subHeaderFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6E4F0' } };
      const summaryFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
      const headerFont = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      const subHeaderFont = { name: 'Arial', bold: true, size: 9 };
      const dataFont = { name: 'Arial', size: 9 };
      const titleFont = { name: 'Arial', bold: true, size: 14 };
      const subTitleFont = { name: 'Arial', bold: true, size: 11 };

      // === PER-TERM SHEETS ===
      for (const term of terms) {
        // Sanitize worksheet name (Excel limits to 31 chars, no special chars)
        const sheetName = term.name.replace(/[\\/*?[\]:]/g, '').substring(0, 31);
        const ws = workbook.addWorksheet(sheetName || `Term_${term.id}`);

        // --- Title rows ---
        const totalSubjects = subjects.length;
        const totalCols = 3 + totalSubjects + 5; // S/N, Adm No, Name, ...subjects..., Total, Avg, Grade, Position, Remark

        ws.mergeCells(1, 1, 1, totalCols);
        const titleCell = ws.getCell(1, 1);
        titleCell.value = (school?.name || 'SCHOOL').toUpperCase();
        titleCell.font = titleFont;
        titleCell.alignment = centerAlign;

        ws.mergeCells(2, 1, 2, totalCols);
        const subtitleCell = ws.getCell(2, 1);
        subtitleCell.value = `COMPILED RESULT BROADSHEET — ${session.name} — ${term.name}`;
        subtitleCell.font = subTitleFont;
        subtitleCell.alignment = centerAlign;

        ws.mergeCells(3, 1, 3, totalCols);
        const classCell = ws.getCell(3, 1);
        classCell.value = `Class: ${className}`;
        classCell.font = { name: 'Arial', bold: true, size: 10 };
        classCell.alignment = centerAlign;

        // --- Header row ---
        const headerRowNum = 5;
        const headerValues = ['S/N', 'Adm No', 'Student Name'];
        subjects.forEach(s => headerValues.push(s.name));
        headerValues.push('Total', 'Average', 'Grade', 'Position', 'Remark');

        const headerRow = ws.getRow(headerRowNum);
        headerRow.values = headerValues;
        headerRow.height = 30;
        headerRow.eachCell((cell) => {
          cell.font = headerFont;
          cell.fill = headerFill;
          cell.alignment = centerAlign;
          cell.border = borderStyle;
        });

        // Set column widths
        ws.getColumn(1).width = 5;   // S/N
        ws.getColumn(2).width = 16;  // Adm No
        ws.getColumn(3).width = 30;  // Name
        for (let i = 0; i < totalSubjects; i++) {
          ws.getColumn(4 + i).width = 10;
        }
        ws.getColumn(4 + totalSubjects).width = 10;     // Total
        ws.getColumn(5 + totalSubjects).width = 10;     // Average
        ws.getColumn(6 + totalSubjects).width = 8;      // Grade
        ws.getColumn(7 + totalSubjects).width = 10;     // Position
        ws.getColumn(8 + totalSubjects).width = 14;     // Remark

        // --- Data rows ---
        let rowNum = headerRowNum + 1;
        classInfo.students.forEach((student, idx) => {
          const row = ws.getRow(rowNum);
          const name = [student.user?.firstName, student.user?.middleName, student.user?.lastName]
            .filter(p => p && p.trim()).join(' ') || student.name || 'Unknown';

          const values = [idx + 1, student.admissionNumber, name];
          let totalScore = 0;
          let subjectCount = 0;

          subjects.forEach(subject => {
            const r = resultMap[student.id]?.[term.id]?.[subject.id];
            const score = r?.totalScore ?? null;
            values.push(score !== null ? Math.round(score * 10) / 10 : '-');
            if (score !== null) {
              totalScore += score;
              subjectCount++;
            }
          });

          const avg = subjectCount > 0 ? Math.round((totalScore / subjectCount) * 10) / 10 : null;
          const rc = reportMap[student.id]?.[term.id];

          values.push(subjectCount > 0 ? Math.round(totalScore * 10) / 10 : '-'); // Total
          values.push(avg !== null ? avg : '-');                                     // Average
          values.push(avg !== null ? getGrade(avg) : '-');                           // Grade
          // Use nullish coalescing to handle position 0 correctly
          values.push(rc?.positionInClass != null ? rc.positionInClass : '-');        // Position
          values.push(avg !== null ? getRemark(avg) : '-');                           // Remark

          row.values = values;
          row.eachCell((cell, colNum) => {
            cell.font = dataFont;
            cell.border = borderStyle;
            cell.alignment = colNum <= 3 ? leftAlign : centerAlign;
            // Highlight summary columns
            if (colNum > 3 + totalSubjects) {
              cell.fill = summaryFill;
              cell.font = { ...dataFont, bold: true };
            }
          });

          rowNum++;
        });

        // --- Subject average row ---
        const avgRow = ws.getRow(rowNum);
        avgRow.getCell(1).value = '';
        avgRow.getCell(2).value = '';
        avgRow.getCell(3).value = 'CLASS AVERAGE';
        avgRow.getCell(3).font = { ...subHeaderFont, color: { argb: 'FF1F4E79' } };

        subjects.forEach((subject, idx) => {
          const col = 4 + idx;
          const scores = classInfo.students
            .map(s => resultMap[s.id]?.[term.id]?.[subject.id]?.totalScore)
            .filter(s => s !== null && s !== undefined);
          const classAvg = scores.length > 0
            ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
            : '-';
          avgRow.getCell(col).value = classAvg;
        });

        avgRow.eachCell((cell) => {
          cell.fill = subHeaderFill;
          cell.font = subHeaderFont;
          cell.border = borderStyle;
          cell.alignment = centerAlign;
        });
      }

      // === CUMULATIVE SHEET (all terms combined) ===
      if (terms.length > 1) {
        const ws = workbook.addWorksheet('Cumulative');

        // For cumulative: show per-term averages + grand average + position + remark
        // Columns: S/N, Adm No, Name, [Term1 Avg, Term2 Avg, ...], Grand Avg, Grade, Position, Remark
        const totalCols = 3 + terms.length + 4; // 3 fixed + N terms + Grand Avg + Grade + Position + Remark

        ws.mergeCells(1, 1, 1, totalCols);
        const titleCell = ws.getCell(1, 1);
        titleCell.value = (school?.name || 'SCHOOL').toUpperCase();
        titleCell.font = titleFont;
        titleCell.alignment = centerAlign;

        ws.mergeCells(2, 1, 2, totalCols);
        const subtitleCell = ws.getCell(2, 1);
        subtitleCell.value = `CUMULATIVE BROADSHEET — ${session.name} — All Terms`;
        subtitleCell.font = subTitleFont;
        subtitleCell.alignment = centerAlign;

        ws.mergeCells(3, 1, 3, totalCols);
        const classCell = ws.getCell(3, 1);
        classCell.value = `Class: ${className}`;
        classCell.font = { name: 'Arial', bold: true, size: 10 };
        classCell.alignment = centerAlign;

        // Header
        const headerRowNum = 5;
        const headerValues = ['S/N', 'Adm No', 'Student Name'];
        terms.forEach(t => headerValues.push(`${t.name} Avg`));
        headerValues.push('Grand Avg', 'Grade', 'Position', 'Remark');

        const headerRow = ws.getRow(headerRowNum);
        headerRow.values = headerValues;
        headerRow.height = 30;
        headerRow.eachCell((cell) => {
          cell.font = headerFont;
          cell.fill = headerFill;
          cell.alignment = centerAlign;
          cell.border = borderStyle;
        });

        ws.getColumn(1).width = 5;
        ws.getColumn(2).width = 16;
        ws.getColumn(3).width = 30;
        for (let i = 0; i < terms.length; i++) ws.getColumn(4 + i).width = 14;
        ws.getColumn(4 + terms.length).width = 12;
        ws.getColumn(5 + terms.length).width = 8;
        ws.getColumn(6 + terms.length).width = 10;
        ws.getColumn(7 + terms.length).width = 14;

        // Compute cumulative data
        const cumulativeData = classInfo.students.map((student, idx) => {
          const name = [student.user?.firstName, student.user?.middleName, student.user?.lastName]
            .filter(p => p && p.trim()).join(' ') || student.name || 'Unknown';

          const termAvgs = [];
          let grandTotal = 0;
          let termCount = 0;

          terms.forEach(term => {
            let totalScore = 0;
            let subjectCount = 0;
            subjects.forEach(subject => {
              const r = resultMap[student.id]?.[term.id]?.[subject.id];
              if (r?.totalScore !== null && r?.totalScore !== undefined) {
                totalScore += r.totalScore;
                subjectCount++;
              }
            });
            const termAvg = subjectCount > 0 ? totalScore / subjectCount : null;
            termAvgs.push(termAvg);
            if (termAvg !== null) {
              grandTotal += termAvg;
              termCount++;
            }
          });

          const grandAvg = termCount > 0 ? grandTotal / termCount : null;
          return { student, name, termAvgs, grandAvg, idx };
        });

        // Sort by grandAvg descending for position assignment
        const sorted = [...cumulativeData]
          .filter(d => d.grandAvg !== null)
          .sort((a, b) => b.grandAvg - a.grandAvg);
        const positionMap = {};
        // Handle tied positions correctly
        let currentPos = 1;
        sorted.forEach((d, i) => {
          if (i > 0 && d.grandAvg < sorted[i - 1].grandAvg) {
            currentPos = i + 1;
          }
          positionMap[d.student.id] = currentPos;
        });

        // Write rows
        let rowNum = headerRowNum + 1;
        cumulativeData.forEach(d => {
          const row = ws.getRow(rowNum);
          const values = [d.idx + 1, d.student.admissionNumber, d.name];
          d.termAvgs.forEach(avg => values.push(avg !== null ? Math.round(avg * 10) / 10 : '-'));
          const grandAvgRounded = d.grandAvg !== null ? Math.round(d.grandAvg * 10) / 10 : null;
          values.push(grandAvgRounded !== null ? grandAvgRounded : '-');
          values.push(grandAvgRounded !== null ? getGrade(grandAvgRounded) : '-');
          values.push(positionMap[d.student.id] != null ? positionMap[d.student.id] : '-');
          values.push(grandAvgRounded !== null ? getRemark(grandAvgRounded) : '-');

          row.values = values;
          row.eachCell((cell, colNum) => {
            cell.font = dataFont;
            cell.border = borderStyle;
            cell.alignment = colNum <= 3 ? leftAlign : centerAlign;
            if (colNum > 3 + terms.length) {
              cell.fill = summaryFill;
              cell.font = { ...dataFont, bold: true };
            }
          });
          rowNum++;
        });
      }

      // 9. Write workbook to response
      const filename = `${className.replace(/\s+/g, '_')}_Broadsheet_${session.name.replace(/\s+/g, '_')}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      await workbook.xlsx.write(res);
      res.end();

      // 10. Audit log (non-blocking)
      logAction({
        schoolId: req.schoolId,
        userId: req.user.id,
        action: 'DOWNLOAD_BROADSHEET',
        resource: 'BROADSHEET',
        details: { classId, className, sessionId, termIds: selectedTermIds },
        ipAddress: req.ip
      }).catch(e => console.error('[Broadsheet] Audit log failed:', e));

    } catch (error) {
      console.error('[Broadsheet] Error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message || 'Failed to generate broadsheet' });
      }
    }
  }
);

module.exports = router;
