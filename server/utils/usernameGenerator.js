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

module.exports = {
  generateAlumniUsername
};
