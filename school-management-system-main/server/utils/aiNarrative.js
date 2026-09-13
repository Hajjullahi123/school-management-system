const AIQueryHandler = require('../services/AIQueryHandler');
const prisma = require('../db');

/**
 * Generates an AI-powered performance narrative for a student
 * @param {Object} data - Student result data (name, gender, subjects, attendance)
 * @param {Object} school - School details (AI keys)
 * @returns {Promise<string>} - The generated narrative
 */
async function generateAINarrative(data, school) {
  try {
    const aiHandler = new AIQueryHandler({
      geminiApiKey: school.geminiApiKey,
      groqApiKey: school.groqApiKey
    });

    const studentName = data.student?.name || 'The student';
    const gender = (data.student?.gender || '').toLowerCase();
    const pronoun = gender === 'female' ? 'she' : gender === 'male' ? 'he' : 'the student';
    const possessive = gender === 'female' ? 'her' : gender === 'male' ? 'his' : 'their';

    const subjectGrades = (data.subjects || [])
      .map(s => `${s.name}: ${s.grade} (${s.total}%)`)
      .join(', ');

    const attendanceInfo = data.attendance 
      ? `Attendance: ${data.attendance.present}/${data.attendance.total} days (${data.attendance.percentage}%)`
      : '';

    const average = data.termAverage ? `${data.termAverage.toFixed(1)}%` : 'N/A';

    const prompt = `You are an AI academic advisor for a school. 
Write a warm, professional, and detailed performance narrative for a student's term report.

Student Data:
- Name: ${studentName}
- Gender: ${gender}
- Average Score: ${average}
- Subject Grades: ${subjectGrades}
- ${attendanceInfo}

Rules:
1. Speak in the third person (use ${pronoun}, ${possessive}).
2. Be encouraging but honest. Mention strengths (subjects with high grades) and areas for improvement (subjects with lower grades).
3. If attendance is high, commend it. If low, mention it as a factor.
4. Keep the total length between 3 to 4 sentences.
5. Do NOT use placeholders. Do NOT sign the message.
6. Use professional academic language.

Respond with ONLY the narrative text.`;

    const narrative = await aiHandler.generate(prompt, false);
    return narrative.trim();
  } catch (error) {
    console.error('[AI NARRATIVE] Error generating:', error);
    throw new Error('Failed to generate AI narrative: ' + error.message);
  }
}

module.exports = { generateAINarrative };
