// Analytics AI Service - Statistical Analysis and Predictions
// This module provides AI-powered insights without external dependencies

/**
 * Linear Regression Implementation
 * Used for trend analysis and performance predictions
 */
class LinearRegression {
  constructor(x, y) {
    if (x.length !== y.length || x.length === 0) {
      throw new Error('Invalid data for regression');
    }

    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    // Calculate slope (m) and intercept (b) for y = mx + b
    this.slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    this.intercept = (sumY - this.slope * sumX) / n;

    // Calculate R-squared (goodness of fit)
    const yMean = sumY / n;
    const ssTotal = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const ssResidual = y.reduce((sum, yi, i) => {
      const predicted = this.predict(x[i]);
      return sum + Math.pow(yi - predicted, 2);
    }, 0);
    this.rSquared = 1 - (ssResidual / ssTotal);
  }

  predict(x) {
    return this.slope * x + this.intercept;
  }
}

/**
 * Statistical Utilities
 */
const Stats = {
  mean(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  },

  median(arr) {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  },

  standardDeviation(arr) {
    const mean = this.mean(arr);
    const squaredDiffs = arr.map(x => Math.pow(x - mean, 2));
    const variance = this.mean(squaredDiffs);
    return Math.sqrt(variance);
  },

  percentile(arr, p) {
    const sorted = [...arr].sort((a, b) => a - b);
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  },

  zScore(value, arr) {
    const mean = this.mean(arr);
    const sd = this.standardDeviation(arr);
    return sd === 0 ? 0 : (value - mean) / sd;
  }
};

/**
 * Performance Predictor
 * Predicts student's next term performance based on historical data
 */
async function predictPerformance(prisma, studentId, schoolId) {
  try {
    // Get student's historical results in this school
    const results = await prisma.result.findMany({
      where: {
        studentId: parseInt(studentId),
        schoolId: schoolId
      },
      include: {
        term: true,
        subject: true
      },
      orderBy: { createdAt: 'asc' }
    });

    if (results.length < 2) {
      return {
        prediction: null,
        confidence: 0,
        message: 'Insufficient data for prediction. At least 2 terms of results required.'
      };
    }

    // Group by subject and calculate trends
    const subjectPredictions = {};
    const subjects = [...new Set(results.map(r => r.subjectId))];

    subjects.forEach(subjectId => {
      const subjectResults = results
        .filter(r => r.subjectId === subjectId)
        .map((r, index) => ({ x: index + 1, y: r.totalScore || 0 }));

      if (subjectResults.length >= 2) {
        const x = subjectResults.map(r => r.x);
        const y = subjectResults.map(r => r.y);

        const regression = new LinearRegression(x, y);
        const nextPrediction = regression.predict(x.length + 1);

        const subject = results.find(r => r.subjectId === subjectId)?.subject;

        subjectPredictions[subject?.name || `Subject ${subjectId}`] = {
          predicted: Math.max(0, Math.min(100, nextPrediction)),
          confidence: regression.rSquared,
          trend: regression.slope > 0 ? 'improving' : regression.slope < 0 ? 'declining' : 'stable',
          currentAverage: Stats.mean(y)
        };
      }
    });

    // Calculate overall prediction
    const predictions = Object.values(subjectPredictions);
    const overallPrediction = Stats.mean(predictions.map(p => p.predicted));
    const overallConfidence = Stats.mean(predictions.map(p => p.confidence));

    return {
      overallPrediction: overallPrediction.toFixed(2),
      confidence: (overallConfidence * 100).toFixed(1),
      subjectPredictions,
      recommendation: overallPrediction >= 70 ? 'Excellent trajectory! Keep up the good work.' :
        overallPrediction >= 60 ? 'Good progress. Focus on weaker subjects for improvement.' :
          overallPrediction >= 50 ? 'Moderate performance. Additional support recommended.' :
            'Intervention needed. Consider extra classes or tutoring.'
    };
  } catch (error) {
    console.error('Prediction error:', error);
    throw error;
  }
}

/**
 * At-Risk Student Detector
 * Identifies students who need intervention
 */
async function identifyAtRiskStudents(prisma, schoolId, classId = null, termId = null) {
  try {
    const whereClause = { schoolId };
    if (classId) whereClause.student = {
      classId: parseInt(classId),
      schoolId: schoolId
    };
    if (termId) whereClause.termId = parseInt(termId);

    const results = await prisma.result.groupBy({
      by: ['studentId'],
      where: whereClause,
      _avg: {
        totalScore: true
      },
      _count: {
        id: true
      }
    });

    const atRiskStudents = [];

    for (const result of results) {
      const avgScore = result._avg.totalScore || 0;
      const student = await prisma.student.findFirst({
        where: {
          id: result.studentId,
          schoolId: schoolId
        },
        include: {
          user: { select: { firstName: true, lastName: true } },
          classModel: true
        }
      });

      if (!student) continue;

      // Get student's trend
      const studentResults = await prisma.result.findMany({
        where: {
          studentId: result.studentId,
          schoolId: schoolId
        },
        orderBy: { createdAt: 'asc' },
        take: 5
      });

      const scores = studentResults.map(r => r.totalScore || 0);
      const trend = scores.length >= 2 ?
        (scores[scores.length - 1] - scores[0]) / scores.length : 0;

      // Risk scoring: multiple factors
      let riskScore = 0;
      if (avgScore < 40) riskScore += 3; // Failing
      else if (avgScore < 50) riskScore += 2; // At risk
      else if (avgScore < 60) riskScore += 1; // Needs improvement

      if (trend < -5) riskScore += 2; // Declining trend
      else if (trend < 0) riskScore += 1; // Slight decline

      if (riskScore >= 3) {
        atRiskStudents.push({
          studentId: student.id,
          name: `${student.user.firstName} ${student.user.lastName}`,
          admissionNumber: student.admissionNumber,
          class: student.classModel ? `${student.classModel.name} ${student.classModel.arm}` : 'N/A',
          averageScore: avgScore.toFixed(2),
          trend: trend.toFixed(2),
          riskLevel: riskScore >= 4 ? 'High' : riskScore >= 3 ? 'Medium' : 'Low',
          interventionNeeded: true,
          recommendations: [
            avgScore < 40 ? 'Immediate academic intervention required' : null,
            trend < -5 ? 'Investigate cause of declining performance' : null,
            'Schedule parent-teacher conference',
            'Consider peer tutoring or extra classes'
          ].filter(Boolean)
        });
      }
    }

    return atRiskStudents.sort((a, b) => {
      const riskOrder = { High: 3, Medium: 2, Low: 1 };
      return riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
    });
  } catch (error) {
    console.error('At-risk detection error:', error);
    throw error;
  }
}

/**
 * Personalized Study Recommendations
 * Generates tailored study advice based on student performance
 */
async function generateRecommendations(prisma, studentId, schoolId) {
  try {
    const results = await prisma.result.findMany({
      where: {
        studentId: parseInt(studentId),
        schoolId: schoolId
      },
      include: { subject: true },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    if (results.length === 0) {
      return { message: 'No results available for recommendations' };
    }

    // Group by subject
    const subjectPerformance = {};
    results.forEach(r => {
      const subjectName = r.subject?.name || 'Unknown';
      if (!subjectPerformance[subjectName]) {
        subjectPerformance[subjectName] = [];
      }
      subjectPerformance[subjectName].push(r.totalScore || 0);
    });

    // Analyze each subject
    const analysis = Object.entries(subjectPerformance).map(([subject, scores]) => {
      const avg = Stats.mean(scores);
      const recent = scores[0];
      const trend = scores.length > 1 ? recent - scores[scores.length - 1] : 0;

      return {
        subject,
        average: avg.toFixed(2),
        recentScore: recent,
        trend: trend.toFixed(2),
        status: avg >= 70 ? 'strong' : avg >= 60 ? 'good' : avg >= 50 ? 'fair' : 'weak'
      };
    });

    // Sort to identify strengths and weaknesses
    const weakSubjects = analysis.filter(a => parseFloat(a.average) < 60).sort((a, b) => a.average - b.average);
    const strongSubjects = analysis.filter(a => parseFloat(a.average) >= 70).sort((a, b) => b.average - a.average);

    const recommendations = {
      focusAreas: weakSubjects.slice(0, 3).map(s => ({
        subject: s.subject,
        priority: 'High',
        suggestedHours: 2,
        reason: `Average score: ${s.average}%. Needs significant improvement.`
      })),

      strengths: strongSubjects.slice(0, 3).map(s => ({
        subject: s.subject,
        performance: s.average,
        message: 'Maintain current level'
      })),

      studyPlan: {
        totalWeeklyHours: Math.max(10, weakSubjects.length * 2),
        distribution: analysis.map(a => ({
          subject: a.subject,
          recommendedHours: a.status === 'weak' ? 3 : a.status === 'fair' ? 2 : 1
        }))
      },

      generalAdvice: [
        weakSubjects.length > 3 ? 'Consider reducing extracurricular activities to focus on studies' : null,
        'Create a consistent study schedule',
        'Seek help from teachers for challenging subjects',
        strongSubjects.length > 0 ? `Leverage your strength in ${strongSubjects[0].subject} to build confidence` : null
      ].filter(Boolean)
    };

    return recommendations;
  } catch (error) {
    console.error('Recommendation error:', error);
    throw error;
  }
}

module.exports = {
  LinearRegression,
  Stats,
  predictPerformance,
  identifyAtRiskStudents,
  generateRecommendations
};
