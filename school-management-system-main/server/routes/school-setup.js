const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');
const ExcelJS = require('exceljs');
const xlsx = require('xlsx');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Reuse the logo and header helpers
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

async function addSchoolHeader(workbook, worksheet, school, lastColLetter) {
  worksheet.spliceRows(1, 0, [], [], [], [], [], [], []);

  // Row 1-2: School Name
  worksheet.mergeCells(`A1:${lastColLetter}2`);
  const nameCell = worksheet.getCell('A1');
  nameCell.value = school.name.toUpperCase();
  nameCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  nameCell.font = { size: 18, bold: true, color: { argb: 'FF1B3A5C' } };
  nameCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2F7' } };

  // Row 3: Address | Phone | Email
  worksheet.mergeCells(`A3:${lastColLetter}3`);
  const addressParts = [school.address, school.phone, school.email].filter(Boolean);
  const addressCell = worksheet.getCell('A3');
  addressCell.value = addressParts.length > 0 ? addressParts.join('  |  ') : '';
  addressCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  addressCell.font = { size: 10, italic: true, color: { argb: 'FF555555' } };
  addressCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2F7' } };
  worksheet.getRow(3).height = 20;

  // Row 4: Divider
  worksheet.mergeCells(`A4:${lastColLetter}4`);
  worksheet.getCell('A4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B3A5C' } };
  worksheet.getRow(4).height = 4;

  // Row 5: Template Label
  worksheet.mergeCells(`A5:${lastColLetter}5`);
  const typeCell = worksheet.getCell('A5');
  typeCell.value = 'SCHOOL SETUP TEMPLATE';
  typeCell.alignment = { vertical: 'middle', horizontal: 'center' };
  typeCell.font = { size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  typeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E7D32' } };
  worksheet.getRow(5).height = 28;

  // Row 6-7: Spacers
  worksheet.mergeCells(`A6:${lastColLetter}6`);
  worksheet.getRow(6).height = 6;
  worksheet.mergeCells(`A7:${lastColLetter}7`);
  worksheet.getRow(7).height = 6;

  // Logo
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

// =============================================
// DOWNLOAD SCHOOL SETUP TEMPLATE
// =============================================
router.get('/template', authenticate, authorize(['admin', 'principal']), async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const school = await prisma.school.findUnique({ where: { id: req.schoolId } });

    // ---- SHEET 1: Session & Terms ----
    const sessionSheet = workbook.addWorksheet('Session & Terms');
    sessionSheet.columns = [
      { header: 'Field', key: 'field', width: 30 },
      { header: 'Value', key: 'value', width: 35 },
      { header: 'Format / Notes', key: 'notes', width: 40 }
    ];

    // Style header
    sessionSheet.getRow(1).font = { bold: true, size: 12 };
    sessionSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B3A5C' } };
    sessionSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };

    const sessionFields = [
      { field: 'Session Name*', value: '', notes: 'e.g. 2025-2026 or 2024/2025' },
      { field: 'Session Start Date*', value: '', notes: 'Format: YYYY-MM-DD' },
      { field: 'Session End Date*', value: '', notes: 'Format: YYYY-MM-DD' },
      { field: '', value: '', notes: '' },
      { field: 'Term 1 Name*', value: '', notes: 'e.g. First Term, 1st Term' },
      { field: 'Term 1 Start Date*', value: '', notes: 'Format: YYYY-MM-DD' },
      { field: 'Term 1 End Date*', value: '', notes: 'Format: YYYY-MM-DD' },
      { field: 'Term 1 Next Term Begins', value: '', notes: 'Optional' },
      { field: '', value: '', notes: '' },
      { field: 'Term 2 Name', value: '', notes: 'Leave blank if only 1 term' },
      { field: 'Term 2 Start Date', value: '', notes: 'Format: YYYY-MM-DD' },
      { field: 'Term 2 End Date', value: '', notes: 'Format: YYYY-MM-DD' },
      { field: 'Term 2 Next Term Begins', value: '', notes: 'Optional' },
      { field: '', value: '', notes: '' },
      { field: 'Term 3 Name', value: '', notes: 'Leave blank if only 2 terms' },
      { field: 'Term 3 Start Date', value: '', notes: 'Format: YYYY-MM-DD' },
      { field: 'Term 3 End Date', value: '', notes: 'Format: YYYY-MM-DD' },
      { field: 'Term 3 Next Term Begins', value: '', notes: 'Optional' },
      { field: '', value: '', notes: '' },
      { field: 'Set As Current Term*', value: '', notes: 'Must match one of the term names above' }
    ];

    sessionFields.forEach(row => {
      const r = sessionSheet.addRow(row);
      if (row.field && row.field.includes('*')) {
        r.getCell(1).font = { bold: true, color: { argb: 'FFC62828' } };
      }
    });

    // Protect the sheet so only the value column can be edited
    sessionSheet.protect('schoolsetup', { selectLockedCells: true, selectUnlockedCells: true });

    // Format the cells and enforce validation
    for (let i = 2; i <= sessionFields.length + 1; i++) {
      const field = sessionFields[i - 2];
      const valueCell = sessionSheet.getCell(`B${i}`);
      
      // Unlock the value cell for user input
      if (field.field !== '') {
        valueCell.protection = { locked: false };
      }

      if (field.notes) {
        sessionSheet.getCell(`C${i}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF9C4' } };
      }

      // Enforce Date format
      if (field.notes && field.notes.includes('YYYY-MM-DD')) {
        valueCell.numFmt = 'yyyy-mm-dd';
        valueCell.dataValidation = {
          type: 'date',
          operator: 'greaterThan',
          formula1: new Date('1900-01-01'),
          showErrorMessage: true,
          errorTitle: 'Invalid Date Format',
          error: 'Please enter a valid date. Excel will format it to YYYY-MM-DD automatically.'
        };
      }
    }

    // ---- SHEET 2: Classes & Setup ----
    const classSheet = workbook.addWorksheet('Classes & Setup');
    classSheet.columns = [
      { header: 'Class Name*', key: 'className', width: 20 },
      { header: 'Arm', key: 'arm', width: 10 },
      { header: 'Subjects (comma-separated)*', key: 'subjects', width: 55 },
      { header: 'Term 1 Fee (₦)', key: 'term1Fee', width: 18 },
      { header: 'Term 2 Fee (₦)', key: 'term2Fee', width: 18 },
      { header: 'Term 3 Fee (₦)', key: 'term3Fee', width: 18 },
      { header: 'Fee Description', key: 'feeDescription', width: 30 }
    ];

    await addSchoolHeader(workbook, classSheet, school, 'G');

    // Style header row (row 8)
    classSheet.getRow(8).font = { bold: true };
    classSheet.getRow(8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    // Example rows
    classSheet.addRow({
      className: 'PP1',
      arm: 'A',
      subjects: 'Mathematics, English, Arabic, Islamic Studies, Science',
      term1Fee: 25000,
      term2Fee: 25000,
      term3Fee: 25000,
      feeDescription: 'Tuition Fee'
    });
    classSheet.addRow({
      className: 'PRI1',
      arm: 'A',
      subjects: 'Mathematics, English, Arabic, Islamic Studies, Science, Social Studies',
      term1Fee: 30000,
      term2Fee: 28000,
      term3Fee: 28000,
      feeDescription: 'Tuition Fee'
    });

    // ---- SHEET 3: Instructions ----
    const helpSheet = workbook.addWorksheet('Instructions');
    helpSheet.columns = [{ header: 'School Setup Instructions', key: 'step', width: 100 }];
    helpSheet.getRow(1).font = { bold: true, size: 14, color: { argb: 'FF1B3A5C' } };

    const instructions = [
      '',
      '📋 HOW TO USE THIS TEMPLATE',
      '═══════════════════════════════════════════════════',
      '',
      '🔹 SHEET 1: "Session & Terms"',
      '   • Fill in your Academic Session name and dates (e.g., 2025-2026).',
      '   • Define up to 3 terms with their start and end dates.',
      '   • Mark which term should be set as the "Current Term".',
      '   • Fields marked with * are required.',
      '   • All dates must be in YYYY-MM-DD format (e.g., 2025-09-01).',
      '',
      '🔹 SHEET 2: "Classes & Setup"',
      '   • Each row represents ONE class to be created.',
      '   • Class Name: The name of the class (e.g., PP1, NUR1, PRI1, JSS 1).',
      '   • Arm: Optional class arm/section (e.g., A, B, Gold). Leave blank for single section.',
      '   • Subjects: List all subjects for this class, separated by commas.',
      '   • Term 1, 2, 3 Fee: The tuition fee for this class per term. Leave blank if not setting fees.',
      '   • Fee Description: Optional label (e.g., "Tuition Fee", "School Fees").',
      '',
      '⚙️ WHAT HAPPENS WHEN YOU UPLOAD',
      '   1. Academic Session is created (or reused if it already exists).',
      '   2. Terms are created under the session.',
      '   3. Classes are created (existing ones are skipped, not duplicated).',
      '   4. Subjects are created school-wide (reused if they already exist).',
      '   5. Subjects are linked to their respective classes.',
      '   6. Fee structures are set for each term if specified in the columns.',
      '',
      '✅ SAFETY',
      '   • This process ONLY adds new data. It never deletes or overwrites existing records.',
      '   • If a class, subject, or session already exists, it will be reused — not duplicated.',
      '   • All data is fully editable later through the admin dashboard.',
      '',
      '⚠️ IMPORTANT NOTES',
      '   • Set up your Academic Session and Current Term BEFORE uploading students.',
      '   • The example rows in "Classes & Setup" can be overwritten with your real data.',
      '   • Save this file as .xlsx before uploading.',
      '   • You can upload this template multiple times safely — duplicates will be skipped.'
    ];

    instructions.forEach(text => helpSheet.addRow({ step: text }));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=School_Setup_Template.xlsx');
    await workbook.xlsx.write(res);
  } catch (error) {
    console.error('School setup template generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// PROCESS SCHOOL SETUP UPLOAD
// =============================================
router.post('/upload', authenticate, authorize(['admin', 'principal']), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const schoolIdInt = parseInt(req.schoolId);
    const results = {
      session: null,
      terms: [],
      classes: [],
      subjects: [],
      classSubjects: [],
      feeStructures: [],
      errors: []
    };

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer', cellDates: true });

    // ==================
    // PARSE SHEET 1: Session & Terms
    // ==================
    let sessionName = '', sessionStart = '', sessionEnd = '';
    let terms = [];
    let currentTermName = '';

    const sessionSheetName = workbook.SheetNames.find(n => n.toLowerCase().includes('session'));
    if (sessionSheetName) {
      const sessionData = xlsx.utils.sheet_to_json(workbook.Sheets[sessionSheetName], { header: 1, raw: false, dateNF: 'yyyy-mm-dd' });
      
      const fieldMap = {};
      for (const row of sessionData) {
        if (row[0] && row[1] !== undefined && row[1] !== null) {
          const key = row[0].toString().trim().toLowerCase();
          const val = row[1].toString().trim();
          fieldMap[key] = val;
        }
      }

      sessionName = fieldMap['session name*'] || fieldMap['session name'] || '';
      sessionStart = fieldMap['session start date*'] || fieldMap['session start date'] || '';
      sessionEnd = fieldMap['session end date*'] || fieldMap['session end date'] || '';
      currentTermName = fieldMap['set as current term*'] || fieldMap['set as current term'] || '';

      // Parse up to 3 terms
      for (let t = 1; t <= 3; t++) {
        const tName = fieldMap[`term ${t} name*`] || fieldMap[`term ${t} name`] || '';
        const tStart = fieldMap[`term ${t} start date*`] || fieldMap[`term ${t} start date`] || '';
        const tEnd = fieldMap[`term ${t} end date*`] || fieldMap[`term ${t} end date`] || '';
        const tNext = fieldMap[`term ${t} next term begins`] || '';
        if (tName && tStart && tEnd) {
          terms.push({ name: tName, startDate: tStart, endDate: tEnd, nextTermBeginsDate: tNext || null });
        }
      }
    }

    // ==================
    // PARSE SHEET 2: Classes & Setup
    // ==================
    let classRows = [];
    const classSheetName = workbook.SheetNames.find(n => n.toLowerCase().includes('class'));
    if (classSheetName) {
      const classData = xlsx.utils.sheet_to_json(workbook.Sheets[classSheetName], { header: 1, raw: false });

      // Find header row (contains "class name")
      let headerIdx = 0;
      for (let i = 0; i < classData.length; i++) {
        const row = classData[i];
        if (row && row.some(cell => cell && cell.toString().toLowerCase().includes('class name'))) {
          headerIdx = i;
          break;
        }
      }

      const headers = {};
      if (classData[headerIdx]) {
        classData[headerIdx].forEach((h, idx) => {
          if (!h) return;
          const hl = h.toString().toLowerCase().trim();
          if (hl.includes('class name')) headers.className = idx;
          else if (hl.includes('arm')) headers.arm = idx;
          else if (hl.includes('subject')) headers.subjects = idx;
          else if (hl.includes('term 1 fee')) headers.term1Fee = idx;
          else if (hl.includes('term 2 fee')) headers.term2Fee = idx;
          else if (hl.includes('term 3 fee')) headers.term3Fee = idx;
          else if (hl.includes('fee amount') || hl.includes('fee')) {
            if (headers.feeAmount === undefined && !hl.includes('term 1') && !hl.includes('term 2') && !hl.includes('term 3')) {
              headers.feeAmount = idx;
            }
          }
          else if (hl.includes('description')) headers.feeDescription = idx;
        });
      }

      for (let i = headerIdx + 1; i < classData.length; i++) {
        const row = classData[i];
        if (!row || row.length === 0) continue;
        const getVal = (key) => {
          const idx = headers[key];
          return idx !== undefined && row[idx] !== undefined && row[idx] !== null ? row[idx].toString().trim() : '';
        };
        const className = getVal('className');
        if (!className) continue;

        classRows.push({
          className,
          arm: getVal('arm') || null,
          subjects: getVal('subjects'),
          feeAmount: getVal('feeAmount'),
          term1Fee: getVal('term1Fee'),
          term2Fee: getVal('term2Fee'),
          term3Fee: getVal('term3Fee'),
          feeDescription: getVal('feeDescription') || 'School Fees'
        });
      }
    }

    // ==================
    // PROCESS: Create everything in order
    // ==================

    // 1. Create Academic Session
    let academicSession = null;
    if (sessionName && sessionStart && sessionEnd) {
      const startDate = new Date(sessionStart);
      const endDate = new Date(sessionEnd);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        results.errors.push('Invalid session dates. Use YYYY-MM-DD format.');
      } else {
        academicSession = await prisma.academicSession.upsert({
          where: { schoolId_name: { schoolId: schoolIdInt, name: sessionName } },
          update: { startDate, endDate },
          create: { schoolId: schoolIdInt, name: sessionName, startDate, endDate, isCurrent: true }
        });
        results.session = { id: academicSession.id, name: academicSession.name, status: 'created/updated' };

        // Set all other sessions as not current
        await prisma.academicSession.updateMany({
          where: { schoolId: schoolIdInt, id: { not: academicSession.id } },
          data: { isCurrent: false }
        });
      }
    }

    // 2. Create Terms
    if (academicSession && terms.length > 0) {
      // First, set all existing terms as not current
      await prisma.term.updateMany({
        where: { schoolId: schoolIdInt },
        data: { isCurrent: false }
      });

      for (const term of terms) {
        try {
          const tStartDate = new Date(term.startDate);
          const tEndDate = new Date(term.endDate);
          const tNextDate = term.nextTermBeginsDate ? new Date(term.nextTermBeginsDate) : null;
          
          if (isNaN(tStartDate.getTime()) || isNaN(tEndDate.getTime())) {
            results.errors.push(`Invalid dates for term: ${term.name}`);
            continue;
          }

          const isCurrent = term.name.toLowerCase() === currentTermName.toLowerCase();

          const createdTerm = await prisma.term.upsert({
            where: {
              schoolId_academicSessionId_name: {
                schoolId: schoolIdInt,
                academicSessionId: academicSession.id,
                name: term.name
              }
            },
            update: {
              startDate: tStartDate,
              endDate: tEndDate,
              nextTermBeginsDate: tNextDate && !isNaN(tNextDate.getTime()) ? tNextDate : null,
              isCurrent
            },
            create: {
              schoolId: schoolIdInt,
              academicSessionId: academicSession.id,
              name: term.name,
              startDate: tStartDate,
              endDate: tEndDate,
              nextTermBeginsDate: tNextDate && !isNaN(tNextDate.getTime()) ? tNextDate : null,
              isCurrent
            }
          });

          results.terms.push({ id: createdTerm.id, name: createdTerm.name, isCurrent, status: 'created/updated' });
        } catch (err) {
          results.errors.push(`Error creating term "${term.name}": ${err.message}`);
        }
      }
    }

    // Find the current term for fee structure
    const currentTerm = await prisma.term.findFirst({
      where: { schoolId: schoolIdInt, isCurrent: true },
      include: { academicSession: true }
    });

    // 3. Create Classes, Subjects, ClassSubjects, and Fee Structures
    const subjectCache = {}; // cache for reusing existing subjects { name: id }

    for (const row of classRows) {
      try {
        // 3a. Create or find Class
        const classData = {
          schoolId: schoolIdInt,
          name: row.className,
          arm: row.arm || 'A',
          isActive: true
        };

        let classRecord = await prisma.class.findFirst({
          where: {
            schoolId: schoolIdInt,
            name: row.className,
            arm: row.arm || 'A'
          }
        });

        if (!classRecord) {
          classRecord = await prisma.class.create({ data: classData });
          results.classes.push({ id: classRecord.id, name: `${row.className} ${row.arm || 'A'}`, status: 'created' });
        } else {
          results.classes.push({ id: classRecord.id, name: `${row.className} ${row.arm || 'A'}`, status: 'already exists' });
        }

        // 3b. Parse and create Subjects
        if (row.subjects) {
          const subjectNames = row.subjects.split(',').map(s => s.trim()).filter(Boolean);

          for (const subName of subjectNames) {
            const subKey = subName.toLowerCase();

            if (!subjectCache[subKey]) {
              // Find or create the subject
              let subjectRecord = await prisma.subject.findFirst({
                where: { schoolId: schoolIdInt, name: { equals: subName, mode: 'insensitive' } }
              });

              if (!subjectRecord) {
                // Generate a unique code from the name
                const baseCode = subName.substring(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, '');
                let code = baseCode || 'SUBJ';
                let suffix = 1;
                while (await prisma.subject.findFirst({ where: { schoolId: schoolIdInt, code } })) {
                  code = `${baseCode.substring(0, 3)}${suffix++}`;
                }

                subjectRecord = await prisma.subject.create({
                  data: { schoolId: schoolIdInt, name: subName, code }
                });
                results.subjects.push({ id: subjectRecord.id, name: subName, status: 'created' });
              }
              subjectCache[subKey] = subjectRecord.id;
            }

            // 3c. Link Subject to Class (ClassSubject)
            const subjectId = subjectCache[subKey];
            const existingLink = await prisma.classSubject.findUnique({
              where: {
                schoolId_classId_subjectId: {
                  schoolId: schoolIdInt,
                  classId: classRecord.id,
                  subjectId
                }
              }
            });

            if (!existingLink) {
              await prisma.classSubject.create({
                data: { schoolId: schoolIdInt, classId: classRecord.id, subjectId }
              });
              results.classSubjects.push({ class: row.className, subject: subName, status: 'linked' });
            }
          }
        }

        // 3d. Set Fee Structure
        const sessionTerms = await prisma.term.findMany({
          where: { schoolId: schoolIdInt, academicSessionId: academicSession.id },
          orderBy: { startDate: 'asc' }
        });

        const processFee = async (termRecord, amountVal) => {
          if (!termRecord || !amountVal || parseFloat(amountVal) <= 0) return;
          const amount = parseFloat(amountVal);
          
          await prisma.classFeeStructure.upsert({
            where: {
              schoolId_classId_termId_academicSessionId: {
                schoolId: schoolIdInt,
                classId: classRecord.id,
                termId: termRecord.id,
                academicSessionId: termRecord.academicSessionId
              }
            },
            update: { amount, description: row.feeDescription },
            create: {
              schoolId: schoolIdInt,
              classId: classRecord.id,
              termId: termRecord.id,
              academicSessionId: termRecord.academicSessionId,
              amount,
              description: row.feeDescription
            }
          });
          results.feeStructures.push({
            class: `${row.className} ${row.arm || 'A'}`,
            amount,
            term: termRecord.name,
            status: 'set'
          });
        };

        if (row.term1Fee || row.term2Fee || row.term3Fee) {
          if (row.term1Fee && sessionTerms[0]) await processFee(sessionTerms[0], row.term1Fee);
          if (row.term2Fee && sessionTerms[1]) await processFee(sessionTerms[1], row.term2Fee);
          if (row.term3Fee && sessionTerms[2]) await processFee(sessionTerms[2], row.term3Fee);
        } else if (row.feeAmount && currentTerm && parseFloat(row.feeAmount) > 0) {
          await processFee(currentTerm, row.feeAmount);
        } else if (row.feeAmount && !currentTerm) {
          results.errors.push(`Fee skipped for ${row.className}: No current term found. Session/Terms may not have been created.`);
        }

      } catch (err) {
        results.errors.push(`Error processing class "${row.className}": ${err.message}`);
      }
    }

    // Summary
    const summary = {
      message: 'School setup completed!',
      session: results.session,
      termsCreated: results.terms.length,
      classesCreated: results.classes.filter(c => c.status === 'created').length,
      classesSkipped: results.classes.filter(c => c.status === 'already exists').length,
      subjectsCreated: results.subjects.length,
      subjectsLinked: results.classSubjects.length,
      feeStructuresSet: results.feeStructures.length,
      errors: results.errors,
      details: results
    };

    // Log the action
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'SCHOOL_SETUP',
      resource: 'SYSTEM',
      details: {
        session: results.session?.name,
        terms: results.terms.length,
        classes: results.classes.length,
        subjects: results.subjects.length
      },
      ipAddress: req.ip
    });

    res.json(summary);

  } catch (error) {
    console.error('School setup upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
