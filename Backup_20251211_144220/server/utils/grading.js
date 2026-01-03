/**
 * Grading Utilities for DARUL QUR'AN Result Management System
 * 
 * Score Components:
 * - Assignment 1: 5%
 * - Assignment 2: 5%
 * - Test 1: 10%
 * - Test 2: 10%
 * - Examination: 70%
 * Total: 100%
 */

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

/**
 * Determine grade based on total score
 * A: 70-100, B: 60-69, C: 50-59, D: 40-49, E: 30-39, F: 0-29
 */
function getGrade(totalScore) {
  if (totalScore >= 70) return 'A';
  if (totalScore >= 60) return 'B';
  if (totalScore >= 50) return 'C';
  if (totalScore >= 40) return 'D';
  if (totalScore >= 30) return 'E';
  return 'F';
}

/**
 * Get remark based on grade
 */
function getRemark(grade) {
  const remarks = {
    'A': 'Excellent',
    'B': 'Very Good',
    'C': 'Good',
    'D': 'Pass',
    'E': 'Weak Pass',
    'F': 'Fail'
  };
  return remarks[grade] || 'N/A';
}

/**
 * Validate score component (ensure within max limits)
 */
function validateScoreComponent(score, maxScore, componentName) {
  if (score === null || score === undefined) return null;

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
function validateScores(assignment1, assignment2, test1, test2, exam) {
  return {
    assignment1Score: validateScoreComponent(assignment1, 5, 'Assignment 1'),
    assignment2Score: validateScoreComponent(assignment2, 5, 'Assignment 2'),
    test1Score: validateScoreComponent(test1, 10, 'Test 1'),
    test2Score: validateScoreComponent(test2, 10, 'Test 2'),
    examScore: validateScoreComponent(exam, 70, 'Examination')
  };
}

/**
 * Calculate class average for a subject
 */
async function calculateClassAverage(prisma, classId, subjectId, termId) {
  const results = await prisma.result.findMany({
    where: {
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
async function calculatePositions(prisma, classId, subjectId, termId) {
  // Get all results for this subject, sorted by total score descending
  const results = await prisma.result.findMany({
    where: {
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
async function calculateStudentTermAverage(prisma, studentId, termId) {
  const results = await prisma.result.findMany({
    where: {
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
async function calculateStudentSessionAverage(prisma, studentId, academicSessionId) {
  const results = await prisma.result.findMany({
    where: {
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
 * Determine if student should be promoted (average >= 40%)
 */
function shouldPromote(sessionAverage) {
  return sessionAverage >= 40;
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
