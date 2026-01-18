/**
 * Grading Utilities for DARUL QUR'AN Result Management System
 * 
 * Default Score Components (Can be overridden by school settings):
 * - Assignment 1: 5%
 * - Assignment 2: 5%
 * - Test 1: 10%
 * - Test 2: 10%
 * - Examination: 70%
 * Total: 100%
 */

const DEFAULT_WEIGHTS = {
  assignment1Weight: 5,
  assignment2Weight: 5,
  test1Weight: 10,
  test2Weight: 10,
  examWeight: 70
};

/**
 * Calculate total score from components
 */
function calculateTotalScore(assignment1, assignment2, test1, test2, exam) {
  const a1 = assignment1 || 0;
  const a2 = assignment2 || 0;
  const t1 = test1 || 0;
  const t2 = test2 || 0;
  const ex = exam || 0;

  return a1 + a2 + t1 + t2 + ex;
}

const DEFAULT_GRADING_SYSTEM = [
  { grade: 'A', min: 70, max: 100, remark: 'Excellent' },
  { grade: 'B', min: 60, max: 69.9, remark: 'Very Good' },
  { grade: 'C', min: 50, max: 59.9, remark: 'Good' },
  { grade: 'D', min: 40, max: 49.9, remark: 'Pass' },
  { grade: 'E', min: 30, max: 39.9, remark: 'Weak Pass' },
  { grade: 'F', min: 0, max: 29.9, remark: 'Fail' }
];

/**
 * Determine grade based on total score
 */
function getGrade(totalScore, gradingSystem = null) {
  let scale = DEFAULT_GRADING_SYSTEM;
  if (gradingSystem) {
    try {
      scale = typeof gradingSystem === 'string' ? JSON.parse(gradingSystem) : gradingSystem;
    } catch (e) {
      console.error('Error parsing grading system, using default');
    }
  }

  const found = scale.find(s => totalScore >= s.min && totalScore <= (s.max || 100));
  return found ? found.grade : 'F';
}

/**
 * Get remark based on grade
 */
function getRemark(grade, gradingSystem = null) {
  let scale = DEFAULT_GRADING_SYSTEM;
  if (gradingSystem) {
    try {
      scale = typeof gradingSystem === 'string' ? JSON.parse(gradingSystem) : gradingSystem;
    } catch (e) {
      console.error('Error parsing grading system, using default');
    }
  }

  const found = scale.find(s => s.grade === grade);
  return found ? found.remark : (grade === 'F' ? 'Fail' : 'N/A');
}

/**
 * Validate score component (ensure within max limits)
 */
function validateScoreComponent(score, maxScore, componentName) {
  if (score === null || score === undefined || score === '') return null;

  const numScore = parseFloat(score);

  if (isNaN(numScore)) {
    throw new Error(`${componentName} must be a valid number`);
  }

  if (numScore < 0) {
    throw new Error(`${componentName} cannot be negative`);
  }

  if (numScore > maxScore) {
    throw new Error(`${componentName} cannot exceed ${maxScore}`);
  }

  return numScore;
}

/**
 * Validate all score components
 */
function validateScores(assignment1, assignment2, test1, test2, exam, weights = DEFAULT_WEIGHTS) {
  return {
    assignment1Score: validateScoreComponent(assignment1, weights.assignment1Weight, 'Assignment 1'),
    assignment2Score: validateScoreComponent(assignment2, weights.assignment2Weight, 'Assignment 2'),
    test1Score: validateScoreComponent(test1, weights.test1Weight, 'Test 1'),
    test2Score: validateScoreComponent(test2, weights.test2Weight, 'Test 2'),
    examScore: validateScoreComponent(exam, weights.examWeight, 'Examination')
  };
}

/**
 * Calculate class average for a subject
 */
async function calculateClassAverage(prisma, classId, subjectId, termId, schoolId) {
  const results = await prisma.result.findMany({
    where: {
      schoolId,
      classId,
      subjectId,
      termId
    },
    select: {
      totalScore: true
    }
  });

  if (results.length === 0) return 0;

  const sum = results.reduce((acc, r) => acc + r.totalScore, 0);
  return sum / results.length;
}

/**
 * Calculate and update positions for a subject in a class
 */
async function calculatePositions(prisma, classId, subjectId, termId, schoolId) {
  // Get all results for this subject, sorted by total score descending
  const results = await prisma.result.findMany({
    where: {
      schoolId,
      classId,
      subjectId,
      termId
    },
    orderBy: {
      totalScore: 'desc'
    },
    select: {
      id: true,
      totalScore: true
    }
  });

  // Assign positions
  let currentPosition = 1;
  let previousScore = null;
  let studentsWithSameScore = 0;

  for (let i = 0; i < results.length; i++) {
    const result = results[i];

    if (previousScore !== null && result.totalScore < previousScore) {
      currentPosition += studentsWithSameScore;
      studentsWithSameScore = 1;
    } else {
      studentsWithSameScore++;
    }

    await prisma.result.update({
      where: { id: result.id },
      data: { positionInClass: currentPosition }
    });

    previousScore = result.totalScore;
  }
}

/**
 * Calculate student's average for a term (all subjects)
 */
async function calculateStudentTermAverage(prisma, studentId, termId, schoolId) {
  const results = await prisma.result.findMany({
    where: {
      schoolId,
      studentId,
      termId
    },
    select: {
      totalScore: true
    }
  });

  if (results.length === 0) return 0;

  const sum = results.reduce((acc, r) => acc + r.totalScore, 0);
  return sum / results.length;
}

/**
 * Calculate student's cumulative average across all three terms
 */
async function calculateStudentSessionAverage(prisma, studentId, academicSessionId, schoolId) {
  const results = await prisma.result.findMany({
    where: {
      schoolId,
      studentId,
      academicSessionId
    },
    select: {
      totalScore: true
    }
  });

  if (results.length === 0) return 0;

  const sum = results.reduce((acc, r) => acc + r.totalScore, 0);
  return sum / results.length;
}

/**
 * Determine if student should be promoted
 */
function shouldPromote(sessionAverage, threshold = 40) {
  return sessionAverage >= threshold;
}

module.exports = {
  calculateTotalScore,
  getGrade,
  getRemark,
  validateScoreComponent,
  validateScores,
  calculateClassAverage,
  calculatePositions,
  calculateStudentTermAverage,
  calculateStudentSessionAverage,
  shouldPromote
};
