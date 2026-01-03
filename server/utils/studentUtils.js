/**
 * Utility functions for student management
 */

/**
 * Generate admission number from year, class, and student name
 * Format: YEAR-CLASS-INITIALS
 * Example: 2024-SS1A-JD (for John Doe in SS 1 A, admitted in 2024)
 * 
 * @param {number} admissionYear - Year of admission
 * @param {string} className - Class name (e.g., "SS 1")
 * @param {string} classArm - Class arm (e.g., "A")
 * @param {string} firstName - Student's first name
 * @param {string} lastName - Student's last name
 * @returns {string} Generated admission number
 */
function generateAdmissionNumber(admissionYear, className, classArm, firstName, lastName) {
  // Get year
  const year = admissionYear || new Date().getFullYear();

  // Format class: remove spaces and combine with arm
  const classCode = className.replace(/\s+/g, '') + (classArm || '');

  // Get initials from first and last name
  const firstInitial = firstName?.charAt(0)?.toUpperCase() || '';
  const lastInitial = lastName?.charAt(0)?.toUpperCase() || '';
  const initials = firstInitial + lastInitial;

  // Combine: YEAR-CLASS-INITIALS
  return `${year}-${classCode}-${initials}`;
}

/**
 * Check if admission number already exists and add sequential number
 * Format: YEAR-CLASS-INITIALS-NN (e.g., 2025-JSS1A-AA-01)
 * 
 * @param {object} prisma - Prisma client instance
 * @param {string} baseAdmissionNumber - Base admission number (YEAR-CLASS-INITIALS)
 * @param {number} classId - Class ID to count students
 * @param {number} schoolId - School ID for multi-tenancy
 * @returns {Promise<string>} Unique admission number with sequential number
 */
async function getUniqueAdmissionNumber(prisma, baseAdmissionNumber, classId, schoolId) {
  // Convert classId to integer if it's provided and valid
  const parsedClassId = classId ? parseInt(classId) : null;
  const classIdInt = parsedClassId && !isNaN(parsedClassId) ? parsedClassId : null;

  // Count existing students in this school/class to determine the next number
  const studentCount = await prisma.student.count({
    where: {
      schoolId: schoolId,
      ...(classIdInt && { classId: classIdInt })
    }
  });

  // Start from the next number (studentCount + 1)
  let counter = studentCount + 1;
  let admissionNumber = `${baseAdmissionNumber}-${String(counter).padStart(2, '0')}`;

  // Check if admission number exists in this school
  while (true) {
    const existing = await prisma.student.findFirst({
      where: {
        schoolId: schoolId,
        admissionNumber
      }
    });

    if (!existing) {
      return admissionNumber;
    }

    // Try next number if exists
    counter++;
    admissionNumber = `${baseAdmissionNumber}-${String(counter).padStart(2, '0')}`;
  }
}

/**
 * Validate blood group
 */
function isValidBloodGroup(bloodGroup) {
  const validGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  return validGroups.includes(bloodGroup);
}

/**
 * Validate genotype
 */
function isValidGenotype(genotype) {
  const validGenotypes = ['AA', 'AS', 'SS', 'AC', 'SC'];
  return validGenotypes.includes(genotype);
}

module.exports = {
  generateAdmissionNumber,
  getUniqueAdmissionNumber,
  isValidBloodGroup,
  isValidGenotype
};
