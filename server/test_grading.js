const { validateScores } = require('./utils/grading');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const school = {
    assignment1Weight: 5,
    assignment2Weight: 5,
    test1Weight: 10,
    test2Weight: 10,
    examWeight: 70
  };

  const validatedScores = validateScores(null, null, 5, 5, 22, school);
  console.log('Validated Scores:', validatedScores);
}

test();
