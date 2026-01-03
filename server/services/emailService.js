const nodemailer = require('nodemailer');
const prisma = require('../db');
require('dotenv').config();

/**
 * Email Service for School Management System
 * Handles all automated email notifications
 */

// Create reusable transporter
const getTransporter = async () => {
  // Try to get settings from database first
  const settings = await prisma.schoolSettings.findFirst();

  const user = settings?.emailUser || process.env.EMAIL_USER;
  const pass = settings?.emailPassword || process.env.EMAIL_PASSWORD;
  const host = settings?.emailHost;
  const port = settings?.emailPort || 465;
  const secure = settings?.emailSecure !== false;

  // Check if email is configured
  if (!user || !pass) {
    console.warn('⚠️ Email not configured. Please set SMTP settings in Admin Settings or .env');
    return null;
  }

  // If host is provided, use custom SMTP, else default to Gmail service
  if (host) {
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
  }

  // Default to Gmail if only user/pass provided (legacy/simple setup)
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
};

/**
 * Send email helper function
 */
const sendEmail = async (to, subject, html, text = null) => {
  const transporter = await getTransporter();

  if (!transporter) {
    console.warn('Email not sent - transporter not configured');
    return { success: false, error: 'Email not configured' };
  }

  try {
    const settings = await prisma.schoolSettings.findFirst();
    const fromUser = settings?.emailUser || process.env.EMAIL_USER;
    const schoolName = settings?.schoolName || process.env.SCHOOL_NAME || 'School Management System';

    const info = await transporter.sendMail({
      from: `"${schoolName}" <${fromUser}>`,
      to,
      subject,
      text: text || subject,
      html,
    });

    console.log('✅ Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email send error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 1. FEE PAYMENT CONFIRMATION EMAIL
 */
const sendPaymentConfirmation = async (paymentData) => {
  const {
    parentEmail,
    studentName,
    amount,
    paymentMethod,
    date,
    receiptNumber,
    balance,
    termName,
    sessionName,
    schoolName,
    className
  } = paymentData;

  const subject = `Payment Confirmation - ${studentName}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .payment-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .success-badge { background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: bold; margin-bottom: 20px; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .detail-label { font-weight: bold; color: #6b7280; }
        .detail-value { color: #111827; }
        .amount-highlight { font-size: 24px; color: #0d9488; font-weight: bold; text-align: center; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb; color: #6b7280; font-size: 14px; }
        .button { background: #0d9488; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>💰 Payment Received!</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Thank you for your payment</p>
        </div>
        
        <div class="content">
          <div class="success-badge">✓ Payment Confirmed</div>
          
          <p>Dear Parent/Guardian,</p>
          
          <p>This is to confirm that we have received your payment for <strong>${studentName}</strong>.</p>
          
          <div class="payment-box">
            <h3 style="margin-top: 0; color: #0d9488;">Payment Details</h3>
            
            <div class="detail-row">
              <span class="detail-label">Student Name:</span>
              <span class="detail-value">${studentName}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Class:</span>
              <span class="detail-value">${className || 'N/A'}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Academic Session:</span>
              <span class="detail-value">${sessionName || 'Current Session'}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Term:</span>
              <span class="detail-value">${termName || 'Current Term'}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Payment Date:</span>
              <span class="detail-value">${new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Payment Method:</span>
              <span class="detail-value">${paymentMethod}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Receipt Number:</span>
              <span class="detail-value"><strong>${receiptNumber || 'N/A'}</strong></span>
            </div>
            
            <div class="amount-highlight">
              Amount Paid: ₦${Number(amount).toLocaleString()}
            </div>
            
            ${balance > 0 ? `
              <div style="background: #fef3c7; padding: 15px; border-radius: 5px; margin-top: 15px;">
                <strong style="color: #92400e;">Outstanding Balance:</strong>
                <span style="font-size: 18px; color: #b45309; font-weight: bold;"> ₦${Number(balance).toLocaleString()}</span>
              </div>
            ` : `
              <div style="background: #d1fae5; padding: 15px; border-radius: 5px; margin-top: 15px; text-align: center;">
                <strong style="color: #065f46; font-size: 18px;">✓ Fees Fully Paid</strong>
              </div>
            `}
          </div>
          
          <p style="margin-top: 25px;">This email serves as your payment confirmation. Please keep it for your records.</p>
          
          <p>If you have any questions regarding this payment, please contact the school accountant.</p>
          
          <div style="text-align: center;">
            <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/login" class="button">View Full Receipt</a>
          </div>
        </div>
        
        <div class="footer">
          <strong>${schoolName || "School Management System"}</strong><br>
          This is an automated message. Please do not reply to this email.<br>
          © ${new Date().getFullYear()} All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(parentEmail, subject, html);
};

/**
 * 2. RESULT RELEASE NOTIFICATION
 */
const sendResultReleaseNotification = async (resultData) => {
  const {
    parentEmail,
    studentName,
    termName,
    sessionName,
    className,
    totalSubjects,
    averageScore,
    position,
    schoolName
  } = resultData;

  const subject = `${termName} Results Available - ${studentName}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .result-box { background: white; padding: 25px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .info-badge { background: #8b5cf6; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: bold; margin-bottom: 20px; }
        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
        .stat-box { background: #f3f4f6; padding: 15px; border-radius: 5px; text-align: center; }
        .stat-value { font-size: 24px; font-weight: bold; color: #7c3aed; }
        .stat-label { font-size: 12px; color: #6b7280; margin-top: 5px; }
        .button { background: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📊 Results Published!</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">${termName} Academic Results</p>
        </div>
        
        <div class="content">
          <div class="info-badge">🎓 Results Now Available</div>
          
          <p>Dear Parent/Guardian,</p>
          
          <p>We are pleased to inform you that the <strong>${termName}</strong> results for <strong>${studentName}</strong> have been published and are now available for viewing.</p>
          
          <div class="result-box">
            <h3 style="margin-top: 0; color: #7c3aed;">Performance Summary</h3>
            
            <div style="text-align: center; margin: 20px 0;">
              <div style="font-size: 14px; color: #6b7280; margin-bottom: 5px;">Student:</div>
              <div style="font-size: 20px; font-weight: bold; color: #111827;">${studentName}</div>
              <div style="font-size: 14px; color: #6b7280; margin-top: 5px;">${className}</div>
            </div>
            
            <div class="stats-grid">
              <div class="stat-box">
                <div class="stat-value">${totalSubjects || 'N/A'}</div>
                <div class="stat-label">SUBJECTS</div>
              </div>
              <div class="stat-box">
                <div class="stat-value">${averageScore ? averageScore.toFixed(1) + '%' : 'N/A'}</div>
                <div class="stat-label">AVERAGE SCORE</div>
              </div>
              ${position ? `
              <div class="stat-box" style="grid-column: 1 / -1;">
                <div class="stat-value">${position}</div>
                <div class="stat-label">CLASS POSITION</div>
              </div>
              ` : ''}
            </div>
            
            <div style="background: #ede9fe; padding: 15px; border-radius: 5px; margin-top: 20px; text-align: center;">
              <p style="margin: 0; color: #5b21b6; font-weight: 500;">
                📋 View complete report card with detailed subject breakdown
              </p>
            </div>
          </div>
          
          <p>To view the full term report card with detailed subject analysis, teacher remarks, and cumulative performance, please login to the school portal.</p>
          
          <div style="text-align: center;">
            <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/login" class="button">View Full Report Card</a>
          </div>
          
          <p style="margin-top: 25px; font-size: 14px; color: #6b7280;">
            <strong>Note:</strong> If you have any concerns about your child's performance, please contact the form master or visit the school office.
          </p>
        </div>
        
        <div class="footer">
          <strong>${schoolName || "School Management System"}</strong><br>
          This is an automated message. Please do not reply to this email.<br>
          © ${new Date().getFullYear()} All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(parentEmail, subject, html);
};

/**
 * 3. STUDENT ABSENCE NOTIFICATION
 */
const sendAbsenceAlert = async (absenceData) => {
  const {
    parentEmail,
    studentName,
    date,
    className,
    schoolName
  } = absenceData;

  const subject = `Absence Alert - ${studentName}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #ef4444 0%, #f87171 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .alert-box { background: white; padding: 25px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .warning-badge { background: #ef4444; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: bold; margin-bottom: 20px; }
        .button { background: #ef4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ Attendance Alert</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Student Absence Notification</p>
        </div>
        
        <div class="content">
          <div class="warning-badge">! Absence Detected</div>
          
          <p>Dear Parent/Guardian,</p>
          
          <p>This is to inform you that <strong>${studentName}</strong> was marked absent from school today.</p>
          
          <div class="alert-box">
            <h3 style="margin-top: 0; color: #ef4444;">Absence Details</h3>
            
            <p><strong>Student:</strong> ${studentName}</p>
            <p><strong>Class:</strong> ${className}</p>
            <p><strong>Date:</strong> ${new Date(date).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</p>
            
            <div style="background: #fee2e2; padding: 15px; border-radius: 5px; margin-top: 20px;">
              <p style="margin: 0; color: #991b1b;">
                <strong>Action Required:</strong> If this absence was unplanned or you have any concerns, please contact the school immediately.
              </p>
            </div>
          </div>
          
          <p>If your child was absent due to illness or other valid reasons, please inform the school and provide necessary documentation if required.</p>
          
          <div style="text-align: center;">
            <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/parent/attendance" class="button">View Attendance Record</a>
          </div>
        </div>
        
        <div class="footer">
          <strong>${schoolName || "School Management System"}</strong><br>
          For urgent matters, please contact the school office directly.<br>
          © ${new Date().getFullYear()} All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(parentEmail, subject, html);
};

/**
 * 4. FEE REMINDER EMAIL
 */
const sendFeeReminder = async (reminderData) => {
  const {
    parentEmail,
    studentName,
    balance,
    dueDate,
    termName,
    sessionName,
    className,
    schoolName
  } = reminderData;

  const subject = `Fee Payment Reminder - ${studentName}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .reminder-box { background: white; padding: 25px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .reminder-badge { background: #f59e0b; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: bold; margin-bottom: 20px; }
        .amount-box { background: #fef3c7; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
        .amount { font-size: 32px; font-weight: bold; color: #b45309; }
        .button { background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>💳 Fee Payment Reminder</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Outstanding Balance Notification</p>
        </div>
        
        <div class="content">
          <div class="reminder-badge">📅 Payment Due</div>
          
          <p>Dear Parent/Guardian,</p>
          
          <p>This is a friendly reminder that there is an outstanding fee balance for <strong>${studentName}</strong>.</p>
          
          <div class="reminder-box">
            <h3 style="margin-top: 0; color: #f59e0b;">Fee Details</h3>
            
            <p><strong>Student:</strong> ${studentName}</p>
            <p><strong>Class:</strong> ${className}</p>
            <p><strong>Term:</strong> ${termName} - ${sessionName}</p>
            ${dueDate ? `<p><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>` : ''}
            
            <div class="amount-box">
              <div style="font-size: 14px; color: #92400e; margin-bottom: 10px;">Outstanding Balance</div>
              <div class="amount">₦${Number(balance).toLocaleString()}</div>
            </div>
            
            <div style="background: #fef3c7; padding: 15px; border-radius: 5px; margin-top: 20px;">
              <p style="margin: 0; color: #92400e;">
                <strong>Please Note:</strong> Timely payment of school fees ensures uninterrupted education for your child.
              </p>
            </div>
          </div>
          
          <p>You can make payment at the school accountant's office during working hours or through our online payment options.</p>
          
          <div style="text-align: center;">
            <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/student/fees" class="button">Pay Now</a>
          </div>
          
          <p style="margin-top: 25px; font-size: 14px; color: #6b7280;">
            If you have already made this payment, please disregard this reminder and contact the accountant to update records.
          </p>
        </div>
        
        <div class="footer">
          <strong>${schoolName || "School Management System"}</strong><br>
          For payment queries, contact the school accountant.<br>
          © ${new Date().getFullYear()} All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(parentEmail, subject, html);
};

/**
 * 5. WELCOME EMAIL (New Student/Parent)
 */
const sendWelcomeEmail = async (welcomeData) => {
  const {
    parentEmail,
    studentName,
    admissionNumber,
    className,
    loginUrl,
    schoolName
  } = welcomeData;

  const subject = `Welcome to ${schoolName || 'Our School'} - ${studentName}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .welcome-box { background: white; padding: 25px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .button { background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎓 Welcome!</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">We're glad to have you</p>
        </div>
        
        <div class="content">
          <p>Dear Parent/Guardian,</p>
          
          <p>Welcome to <strong>${schoolName || 'our school'}</strong>! We are delighted to have <strong>${studentName}</strong> join our academic community.</p>
          
          <div class="welcome-box">
            <h3 style="margin-top: 0; color: #3b82f6;">Student Information</h3>
            
            <p><strong>Student Name:</strong> ${studentName}</p>
            <p><strong>Admission Number:</strong> ${admissionNumber}</p>
            <p><strong>Class:</strong> ${className}</p>
            
            <div style="background: #dbeafe; padding: 15px; border-radius: 5px; margin-top: 20px;">
              <h4 style="margin-top: 0; color: #1e40af;">Parent Portal Access</h4>
              <p style="margin: 10px 0;">You can now access the parent portal to:</p>
              <ul style="margin: 10px 0;">
                <li>View your child's academic results</li>
                <li>Check attendance records</li>
                <li>View fee statements and pay online</li>
                <li>Communicate with teachers</li>
                <li>Stay updated with school notices</li>
              </ul>
            </div>
          </div>
          
          <p>Please login to the parent portal using your registered phone number as username and the password provided to you.</p>
          
          <div style="text-align: center;">
            <a href="${loginUrl || (process.env.CLIENT_URL || 'http://localhost:5173') + '/login'}" class="button">Access Parent Portal</a>
          </div>
          
          <p style="margin-top: 25px; font-size: 14px; color: #6b7280;">
            If you have any questions or need assistance, please don't hesitate to contact the school office.
          </p>
        </div>
        
        <div class="footer">
          <strong>${schoolName || "School Management System"}</strong><br>
          Welcome to our academic family!<br>
          © ${new Date().getFullYear()} All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(parentEmail, subject, html);
};

module.exports = {
  sendEmail,
  sendPaymentConfirmation,
  sendResultReleaseNotification,
  sendAbsenceAlert,
  sendFeeReminder,
  sendWelcomeEmail
};
