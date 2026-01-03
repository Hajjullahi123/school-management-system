const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

// Email configuration endpoint
router.post('/send-report', async (req, res) => {
  try {
    const { to, subject, reportData, smtpConfig } = req.body;

    if (!smtpConfig || !smtpConfig.host || !smtpConfig.user || !smtpConfig.pass) {
      return res.status(400).json({
        error: 'SMTP configuration required. Please configure email settings first.'
      });
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port || 587,
      secure: smtpConfig.port === 465,
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.pass
      }
    });

    // Generate HTML email content
    const htmlContent = generateReportHTML(reportData);

    // Send email
    const info = await transporter.sendMail({
      from: smtpConfig.user,
      to: to,
      subject: subject || 'Student Report Card',
      html: htmlContent
    });

    res.json({
      success: true,
      message: 'Email sent successfully',
      messageId: info.messageId
    });
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({
      error: error.message || 'Failed to send email'
    });
  }
});

// Test SMTP configuration
router.post('/test-config', async (req, res) => {
  try {
    const { smtpConfig } = req.body;

    if (!smtpConfig || !smtpConfig.host || !smtpConfig.user || !smtpConfig.pass) {
      return res.status(400).json({
        error: 'Complete SMTP configuration required'
      });
    }

    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port || 587,
      secure: smtpConfig.port === 465,
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.pass
      }
    });

    // Verify connection
    await transporter.verify();

    res.json({
      success: true,
      message: 'SMTP configuration is valid'
    });
  } catch (error) {
    console.error('SMTP test error:', error);
    res.status(500).json({
      error: 'Invalid SMTP configuration: ' + error.message
    });
  }
});

// Helper function to generate HTML email content
function generateReportHTML(reportData) {
  const { student, exam, results, summary } = reportData;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
        .info-section { margin: 20px 0; }
        .info-row { display: flex; margin: 10px 0; }
        .info-label { font-weight: bold; width: 150px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background: #f4f4f4; font-weight: bold; }
        .summary { background: #f9fafb; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .grade { display: inline-block; padding: 4px 12px; border-radius: 4px; font-weight: bold; }
        .grade-a-plus, .grade-a { background: #d1fae5; color: #065f46; }
        .grade-b, .grade-c { background: #dbeafe; color: #1e40af; }
        .grade-d { background: #fef3c7; color: #92400e; }
        .grade-f { background: #fee2e2; color: #991b1b; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Student Report Card</h1>
        </div>

        <div class="info-section">
          <h2>Student Information</h2>
          <div class="info-row">
            <div class="info-label">Name:</div>
            <div>${student.name}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Roll Number:</div>
            <div>${student.rollNo}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Class:</div>
            <div>${student.class}</div>
          </div>
        </div>

        <div class="info-section">
          <h2>Exam Information</h2>
          <div class="info-row">
            <div class="info-label">Exam:</div>
            <div>${exam.name}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Date:</div>
            <div>${new Date(exam.date).toLocaleDateString()}</div>
          </div>
        </div>

        <h2>Subject-wise Performance</h2>
        <table>
          <thead>
            <tr>
              <th>Subject</th>
              <th>Code</th>
              <th>Marks Obtained</th>
              <th>Max Marks</th>
              <th>Grade</th>
            </tr>
          </thead>
          <tbody>
            ${results.map(result => `
              <tr>
                <td>${result.subject}</td>
                <td>${result.subjectCode || '-'}</td>
                <td>${result.marks}</td>
                <td>100</td>
                <td><span class="grade grade-${result.grade.toLowerCase().replace('+', '-plus')}">${result.grade}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="summary">
          <h2>Performance Summary</h2>
          <div class="info-row">
            <div class="info-label">Total Marks:</div>
            <div>${summary.totalMarks} / ${summary.maxMarks}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Percentage:</div>
            <div>${summary.percentage}%</div>
          </div>
          <div class="info-row">
            <div class="info-label">Overall Grade:</div>
            <div><span class="grade grade-${summary.overallGrade.toLowerCase().replace('+', '-plus')}">${summary.overallGrade}</span></div>
          </div>
          <div class="info-row">
            <div class="info-label">Status:</div>
            <div style="font-weight: bold; color: ${parseFloat(summary.percentage) >= 50 ? '#059669' : '#dc2626'}">
              ${parseFloat(summary.percentage) >= 50 ? 'PASS' : 'FAIL'}
            </div>
          </div>
        </div>

        <p style="margin-top: 30px; color: #666; font-size: 14px;">
          This is an automated email from the School Management System.
        </p>
      </div>
    </body>
    </html>
  `;
}

module.exports = router;
