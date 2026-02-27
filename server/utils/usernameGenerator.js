const prisma = require('../db');

/**
 * Generates a unique alumni username in the format:
 * SCHOOL_CODE/FIRST_3_LETTERS_FIRSTNAME + FIRST_LETTER_LASTNAME/GRADUATION_YEAR
 * Example: AAM/ABDL/2026
 * 
 * @param {number} schoolId 
 * @param {string} schoolCode - e.g. "AAM"
 * @param {string} firstName - e.g. "Abdullahi"
 * @param {string} lastName - e.g. "Lawal"
 * @param {number|string} graduationYear - e.g. 2026
 * @returns {Promise<string>} Unique username
 */
async function generateAlumniUsername(schoolId, schoolCode, firstName, lastName, graduationYear) {
  const f = firstName.substring(0, 3).toUpperCase();
  const l = lastName.substring(0, 1).toUpperCase();
  const namePart = `${f}${l}`;

  // Ensure basic sanitation (remove spaces/special chars if any remain)
  const code = schoolCode.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

  let baseId = `${code}/${namePart}/${graduationYear}`;
  let uniqueId = baseId;
  let counter = 1;

  // Keep checking until we find a unique username
  while (true) {
    const existing = await prisma.user.findFirst({
      where: {
        schoolId: parseInt(schoolId),
        username: uniqueId
      }
    });

    if (!existing) {
      break;
    }

    // If exists, append counter: AAM/ABDL/2026/1
    uniqueId = `${baseId}/${counter}`;
    counter++;
  }

  return uniqueId;
}

/**
 * Generates a unique admin username in the format:
 * admin-SCHOOL_CODE-YEAR
 * Example: admin-AAM-2025
 */
async function generateAdminUsername(schoolId, schoolCode, registrationYear) {
  const code = schoolCode.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const year = registrationYear || new Date().getFullYear();

  let baseId = `admin-${code}-${year}`;
  let uniqueId = baseId;
  let counter = 1;

  while (true) {
    const existing = await prisma.user.findFirst({
      where: {
        schoolId: parseInt(schoolId),
        username: uniqueId
      }
    });

    if (!existing) break;

    uniqueId = `${baseId}-${counter}`;
    counter++;
  }

  return uniqueId;
}

/**
 * Generates a unique teacher username in the format:
 * SCHOOL_CODE/TEACHER_INITIALS/YEAR/SERIAL
 * Example: AAM/AL/2026/001
 */
async function generateTeacherUsername(schoolId, schoolCode, firstName, lastName, yearEnrolled) {
  const sCode = schoolCode.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const tInitials = (firstName[0] + lastName[0]).toUpperCase();
  const year = yearEnrolled || new Date().getFullYear();

  // Find the next serial number for this pattern
  const teachersCount = await prisma.teacher.count({
    where: { schoolId: parseInt(schoolId) }
  });

  const serial = String(teachersCount + 1).padStart(3, '0');
  let baseId = `${sCode}/${tInitials}/${year}/${serial}`;
  let uniqueId = baseId;
  let counter = 1;

  while (true) {
    const existing = await prisma.user.findFirst({
      where: {
        schoolId: parseInt(schoolId),
        username: uniqueId
      }
    });

    if (!existing) break;

    uniqueId = `${baseId}/${counter}`;
    counter++;
  }

  return uniqueId;
}

/**
 * Generates a unique student username/admission number in the format:
 * SCHOOL_CODE/STUDENT_INITIALS/YEAR/SERIAL
 * Example: AAM/JD/2026/050
 */
async function generateStudentUsername(schoolId, schoolCode, firstName, lastName, admissionYear) {
  const sCode = schoolCode.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const initials = ((firstName[0] || '') + (lastName[0] || '')).toUpperCase();
  const year = admissionYear || new Date().getFullYear();

  // Find the next serial number for this pattern across the WHOLE school
  const studentCount = await prisma.student.count({
    where: { schoolId: parseInt(schoolId) }
  });

  const serial = String(studentCount + 1).padStart(3, '0');
  let baseId = `${sCode}/${initials}/${year}/${serial}`;
  let uniqueId = baseId;
  let counter = 1;

  while (true) {
    const existing = await prisma.user.findFirst({
      where: {
        schoolId: parseInt(schoolId),
        username: uniqueId.toLowerCase()
      }
    });

    if (!existing) {
      const existingStudent = await prisma.student.findFirst({
        where: {
          schoolId: parseInt(schoolId),
          admissionNumber: uniqueId
        }
      });
      if (!existingStudent) break;
    }

    uniqueId = `${baseId}-${counter}`;
    counter++;
  }

  return uniqueId;
}

module.exports = {
  generateAlumniUsername,
  generateAdminUsername,
  generateTeacherUsername,
  generateStudentUsername
};
