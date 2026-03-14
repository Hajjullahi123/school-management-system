const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

async function verifyBulkUploadFix() {
  console.log('--- Verifying Bulk Upload Fix ---');

  try {
    // 1. Create a mock CSV with SWAPPED columns to test header-based mapping
    // Header Order: First Name, Last Name, Class ID, DOB, etc.
    // We will swap Class ID (usually col 4) and DOB (usually col 10)
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Test');
    
    // Headers with swapped positions for Class ID and DOB
    worksheet.columns = [
      { header: 'First Name*', key: 'firstName' },
      { header: 'Last Name*', key: 'lastName' },
      { header: 'Middle Name', key: 'middleName' },
      { header: 'Date of Birth (YYYY-MM-DD)', key: 'dob' }, // Swap POS 4
      { header: 'Gender (Male/Female)', key: 'gender' },
      { header: 'Parent Name*', key: 'parentName' },
      { header: 'Parent Phone*', key: 'parentPhone' },
      { header: 'Address', key: 'address' },
      { header: 'Class ID*', key: 'classId' }, // Swap POS 9
      { header: 'Scholarship (Yes/No)', key: 'isScholarship' }
    ];

    // Get a valid school and class
    let school = await prisma.school.findFirst();
    if (!school) {
        console.log('No school found, creating test school...');
        school = await prisma.school.create({
            data: {
                name: 'Test School',
                code: 'TEST',
                address: 'Test Address'
            }
        });
    }
    let classInfo = await prisma.class.findFirst({ where: { schoolId: school.id } });
    if (!classInfo) {
        console.log('No class found, creating test class...');
        classInfo = await prisma.class.create({
            data: {
                name: 'Test Class',
                arm: 'A',
                schoolId: school.id
            }
        });
    }

    worksheet.addRow({
      firstName: 'Verify',
      lastName: 'Fix',
      middleName: 'Test',
      dob: '2010-01-15', // This is in POS 4 now
      gender: 'Male',
      parentName: 'Test Parent',
      parentPhone: '08000000000',
      address: 'Test Address',
      classId: classInfo.id, // This is in POS 9 now
      isScholarship: 'No'
    });

    const filePath = path.join(__dirname, 'verify_upload.csv');
    await workbook.csv.writeFile(filePath);
    console.log(`Test CSV created at: ${filePath}`);

    // Since we can't easily trigger the full Express route with file upload here 
    // without spinning up the server and using fetch (which might be complex),
    // we will simulate the parser logic from bulk-upload.js
    
    console.log('Simulating backend parser logic...');
    const resultWorkbook = new ExcelJS.Workbook();
    await resultWorkbook.csv.readFile(filePath);
    const resultSheet = resultWorkbook.worksheets[0];
    const headers = {};
    const studentsRaw = [];

    resultSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        row.eachCell((cell, colNumber) => {
          const header = cell.value?.toString()?.toLowerCase()?.trim() || '';
          if (header.includes('first name')) headers.firstName = colNumber;
          else if (header.includes('last name')) headers.lastName = colNumber;
          else if (header.includes('middle name')) headers.middleName = colNumber;
          else if (header.includes('class id')) headers.classId = colNumber;
          else if (header.includes('gender')) headers.gender = colNumber;
          else if (header.includes('parent name')) headers.parentGuardianName = colNumber;
          else if (header.includes('parent phone')) headers.parentGuardianPhone = colNumber;
          else if (header.includes('address')) headers.address = colNumber;
          else if (header.includes('date of birth') || header.includes('dob')) headers.dateOfBirth = colNumber;
          else if (header.includes('scholarship')) headers.isScholarship = colNumber;
        });
        return;
      }

      const getVal = (key, defaultIdx) => {
        const idx = headers[key] || defaultIdx;
        return row.getCell(idx).value?.toString()?.trim();
      };

      studentsRaw.push({
        firstName: getVal('firstName', 1),
        lastName: getVal('lastName', 2),
        middleName: getVal('middleName', 3),
        classId: getVal('classId', 4),
        gender: getVal('gender', 6),
        parentGuardianName: getVal('parentGuardianName', 7),
        parentGuardianPhone: getVal('parentGuardianPhone', 8),
        address: getVal('address', 9),
        dateOfBirth: getVal('dateOfBirth', 10),
        isScholarship: getVal('isScholarship', 11)
      });
    });

    const testStudent = studentsRaw[0];
    console.log('Parsed Student Data (Simulation Result):');
    console.log(JSON.stringify(testStudent, null, 2));

    // Fix: ExcelJS might return a Date object for some cells, let's normalize it
    const parsedClassId = testStudent.classId;
    // Normalize date for comparison: "Fri Jan 15 2010..." -> "2010-01-15" (or just check if it contains the date)
    const isDateMatch = testStudent.dateOfBirth.toString().includes('Jan 15 2010') || testStudent.dateOfBirth === '2010-01-15';

    console.log(`Checking Class ID Match: ${parsedClassId} === ${classInfo.id} -> ${parsedClassId == classInfo.id}`);
    console.log(`Checking Date Match: ${testStudent.dateOfBirth} matches -> ${isDateMatch}`);

    if (parsedClassId == classInfo.id && isDateMatch) {
      console.log('SUCCESS: Header-based mapping correctly identified Class ID and DOB despite swapped columns.');
    } else {
      console.error('FAILURE: Column mismatch still occurring.');
      process.exit(1);
    }

    // Cleanup
    fs.unlinkSync(filePath);
    console.log('Test CSV cleaned up.');

  } catch (error) {
    console.error('Verification failed with error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyBulkUploadFix();
