# School Management System - Complete User Guide

## Table of Contents
1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [User Roles & Permissions](#user-roles--permissions)
4. [Super Admin Guide](#super-admin-guide)
5. [Admin Guide](#admin-guide)
6. [Teacher Guide](#teacher-guide)
7. [Student Guide](#student-guide)
8. [Parent Guide](#parent-guide)
9. [Accountant Guide](#accountant-guide)
10. [Public Features](#public-features)
11. [Troubleshooting](#troubleshooting)

---

## Introduction

### What is the School Management System?

This is a comprehensive web-based platform designed to streamline all aspects of school administration, from student enrollment to academic performance tracking, financial management, and parent-teacher communication.

### Key Features
- **Multi-tenant Architecture**: Support for multiple schools on one platform
- **Role-Based Access Control**: Different interfaces for different user types
- **Academic Management**: Results, report cards, timetables, attendance
- **Financial Management**: Fee collection, payment tracking, online payments
- **Communication**: Parent-teacher messaging, notices, announcements
- **Qur'an Memorization Tracking**: Specialized Islamic education features
- **Computer-Based Testing (CBT)**: Online examination system
- **Alumni Management**: Graduate tracking and engagement
- **Public Portal**: Landing page, news, events, gallery

### System Requirements
- **For Users**: Modern web browser (Chrome, Firefox, Safari, Edge)
- **Internet Connection**: Stable internet for optimal performance
- **Device**: Desktop, laptop, tablet, or smartphone

---

## Getting Started

### Accessing the System

1. **Public Landing Page**: Navigate to your school's URL (e.g., `https://yourschool.com/landing`)
2. **Login Page**: Click "Login" or navigate to `https://yourschool.com/login`
3. **Enter Credentials**: Use your assigned username and password

### First-Time Login

1. You will receive login credentials from your school administrator
2. Default password format: Usually your admission number or staff ID
3. **Change Password**: Go to Settings → Change Password after first login
4. **Update Profile**: Complete your profile information

### Navigation

- **Sidebar Menu**: Main navigation on the left side
- **Dashboard**: Overview and quick stats
- **User Menu**: Top-right corner for profile and logout
- **Breadcrumbs**: Shows your current location in the system

---

## User Roles & Permissions

### Role Hierarchy

1. **Super Admin**: Platform-wide control, manages multiple schools
2. **Admin**: Full school management access
3. **Teacher**: Academic and class management
4. **Accountant**: Financial management
5. **Student**: View own academic information
6. **Parent**: Monitor child's progress
7. **Alumni**: Access alumni portal

### Permission Matrix

| Feature | Super Admin | Admin | Teacher | Accountant | Student | Parent |
|---------|-------------|-------|---------|------------|---------|--------|
| User Management | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Student Management | ✓ | ✓ | View | ✗ | Own | Children |
| Results Entry | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| View Results | ✓ | ✓ | ✓ | ✗ | Own | Children |
| Fee Management | ✓ | ✓ | ✗ | ✓ | View Own | View Children |
| Attendance | ✓ | ✓ | ✓ | ✗ | View Own | View Children |
| Timetable | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ |
| Messages | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ |
| Reports | ✓ | ✓ | ✓ | ✗ | Own | Children |

---

## Super Admin Guide

### Overview
Super Admins manage the entire platform and can create and manage multiple schools.

### Key Responsibilities
1. School creation and management
2. License management
3. Platform-wide settings
4. System monitoring

### School Management

#### Creating a New School
1. Navigate to **Super Admin Dashboard**
2. Click **"Create New School"**
3. Fill in school details:
   - School Name
   - Unique Slug (URL identifier)
   - Contact Information
   - Address
4. Click **"Create School"**

#### Managing School Licenses
1. Go to **License Management**
2. Select a school
3. Configure:
   - Package Type (Basic, Standard, Premium)
   - Maximum Students
   - Expiry Date
   - License Key
4. Click **"Update License"**

#### Activating/Deactivating Schools
1. Navigate to **School List**
2. Find the school
3. Toggle **"Active"** status
4. Confirm action

### Platform Settings
- **Global Configurations**: System-wide defaults
- **Security Settings**: Password policies, session timeouts
- **Email Templates**: Platform-wide email configurations

---

## Admin Guide

### Dashboard Overview
The admin dashboard provides:
- Total students, teachers, and staff
- Current academic session and term
- Recent activities
- Quick action buttons

### Academic Setup

#### 1. Academic Sessions
**Purpose**: Define school years (e.g., 2023/2024)

**Steps**:
1. Navigate to **Academic Setup** → **Sessions**
2. Click **"Add Session"**
3. Enter session name (e.g., "2023/2024")
4. Set start and end dates
5. Mark as current if applicable
6. Click **"Save"**

#### 2. Terms
**Purpose**: Define academic terms within a session

**Steps**:
1. Go to **Academic Setup** → **Terms**
2. Click **"Add Term"**
3. Select academic session
4. Enter term name (e.g., "First Term")
5. Set start and end dates
6. Mark as current if applicable
7. Click **"Save"**

#### 3. Class Management
**Purpose**: Create and organize classes

**Steps**:
1. Navigate to **Class Management**
2. Click **"Add Class"**
3. Enter class details:
   - Name (e.g., "JSS 1")
   - Arm (e.g., "A", "B")
   - Expected number of subjects
4. Assign class teacher (optional)
5. Click **"Save"**

#### 4. Subject Management
**Purpose**: Define subjects taught in the school

**Steps**:
1. Go to **Subject Management**
2. Click **"Add Subject"**
3. Enter subject name
4. Select category (Core, Elective, etc.)
5. Click **"Save"**

#### 5. Class-Subject Assignment
**Purpose**: Link subjects to specific classes

**Steps**:
1. Navigate to **Class Subjects**
2. Select a class
3. Click **"Assign Subjects"**
4. Check subjects to assign
5. Click **"Save Assignments"**

### User Management

#### Creating Users

**For Teachers**:
1. Go to **User Management**
2. Click **"Add User"**
3. Fill in details:
   - First Name, Last Name
   - Email, Phone
   - Username
   - Role: Teacher
4. Click **"Create User"**
5. Note the generated password
6. Share credentials securely

**For Students**:
1. Navigate to **Student Management**
2. Click **"Add Student"**
3. Complete registration form:
   - Personal Information
   - Parent/Guardian Details
   - Class Assignment
   - Admission Number (auto-generated or manual)
4. Click **"Register Student"**
5. Credentials are auto-generated

**For Parents**:
1. Go to **Parent Management**
2. Click **"Add Parent"**
3. Enter parent details
4. Link to student(s)
5. Click **"Create Parent Account"**

#### Managing Users
- **Edit**: Click edit icon next to user
- **Delete**: Click delete icon (use with caution)
- **Reset Password**: Use password reset feature
- **Activate/Deactivate**: Toggle user status

### Teacher Assignments

**Purpose**: Assign teachers to subjects and classes

**Steps**:
1. Navigate to **Teacher Assignments**
2. Select a teacher
3. Click **"Add Assignment"**
4. Choose:
   - Class
   - Subject
   - Academic Session
   - Term
5. Click **"Assign"**

### Student Promotion

**Purpose**: Move students to next class or graduate them

**Steps**:
1. Go to **Promotion Manager**
2. Select current class
3. Choose promotion type:
   - **Promote All**: Move entire class
   - **Selective**: Choose specific students
   - **Graduate**: Mark as alumni
4. Select destination class (if promoting)
5. Click **"Execute Promotion"**

### Fee Structure Setup

**Purpose**: Define fees for each class and term

**Steps**:
1. Navigate to **Fee Structure**
2. Click **"Add Fee Structure"**
3. Select:
   - Class
   - Academic Session
   - Term
4. Enter fee components:
   - Tuition Fee
   - Development Levy
   - Exam Fee
   - Other Fees
5. Set total amount
6. Click **"Save Structure"**

### Notice Board

**Purpose**: Post announcements for the school community

**Steps**:
1. Go to **Notice Board**
2. Click **"Create Notice"**
3. Enter:
   - Title
   - Content
   - Target Audience (All, Teachers, Students, Parents)
   - Priority (Normal, Important, Urgent)
4. Set expiry date (optional)
5. Click **"Publish"**

### News & Events Management

**Purpose**: Manage school news and upcoming events

**Creating News**:
1. Navigate to **News & Events**
2. Click **"Add News"**
3. Fill in:
   - Title
   - Content
   - Featured Image
   - Type: News
4. Set publish status
5. Click **"Save"**

**Creating Events**:
1. Click **"Add Event"**
2. Enter:
   - Event Title
   - Description
   - Event Date
   - Location
   - Image
3. Set publish status
4. Click **"Save"**

### Gallery Management

**Purpose**: Showcase school activities through photos

**Steps**:
1. Go to **Gallery Management**
2. Click **"Upload Images"**
3. Select images (multiple allowed)
4. Add:
   - Title for each image
   - Description
   - Category
5. Click **"Upload"**

### System Settings

#### School Branding
1. Navigate to **Settings** → **Branding**
2. Upload school logo
3. Set school colors:
   - Primary Color
   - Secondary Color
   - Accent Color
4. Enter school information:
   - Name
   - Motto
   - Address
   - Contact Details
5. Click **"Save Changes"**

#### Payment Integration
1. Go to **Settings** → **Payment Gateway**
2. Enable online payments
3. Configure Paystack or Flutterwave:
   - Public Key
   - Secret Key
4. Test connection
5. Click **"Save"**

#### Email Configuration
1. Navigate to **Settings** → **Email**
2. Enter SMTP details:
   - Host
   - Port
   - Username
   - Password
3. Test email sending
4. Click **"Save"**

---

## Teacher Guide

### Dashboard
Your dashboard shows:
- Classes assigned to you
- Upcoming lessons
- Pending result entries
- Recent messages from parents

### Attendance Management

**Taking Attendance**:
1. Navigate to **Attendance**
2. Select:
   - Class
   - Date
   - Subject (optional)
3. Mark students as:
   - Present (P)
   - Absent (A)
   - Late (L)
   - Excused (E)
4. Add remarks if needed
5. Click **"Submit Attendance"**

**Viewing Attendance Reports**:
1. Go to **Attendance** → **Reports**
2. Select class and date range
3. View statistics
4. Download report (Excel/PDF)

### Result Entry

#### Single Student Entry
1. Navigate to **Result Entry**
2. Select:
   - Academic Session
   - Term
   - Class
   - Subject
3. Choose student
4. Enter scores:
   - Assignment 1 (10 marks)
   - Test 1 (10 marks)
   - Test 2 (10 marks)
   - Exam (70 marks)
5. System auto-calculates:
   - Total Score
   - Grade
   - Remark
6. Click **"Save Result"**

#### Bulk Upload
1. Go to **Bulk Result Upload**
2. Download scoresheet template
3. Fill in Excel with student scores
4. Upload completed file
5. Review preview
6. Click **"Submit Results"**

### Timetable

**Viewing Your Timetable**:
1. Navigate to **Timetable**
2. Your assigned classes and periods are displayed
3. Filter by day or class

### My Class

**Purpose**: Manage your assigned class

**Features**:
1. View all students in your class
2. Check attendance statistics
3. View class performance
4. Send messages to parents
5. Generate class reports

### CBT Management

**Creating an Exam**:
1. Navigate to **CBT Management**
2. Click **"Create Exam"**
3. Fill in details:
   - Exam Title
   - Subject
   - Class
   - Duration (minutes)
   - Total Marks
   - Exam Type (Test, Exam)
   - Start Date/Time
   - End Date/Time
4. Click **"Create"**

**Adding Questions**:
1. Select the exam
2. Click **"Add Questions"**
3. For each question:
   - Enter question text
   - Add 4 options (A, B, C, D)
   - Mark correct answer
   - Set marks
4. Click **"Save Question"**
5. Repeat for all questions

**Publishing Exam**:
1. Review all questions
2. Click **"Publish Exam"**
3. Students can now access it

**Viewing Results**:
1. Go to exam details
2. Click **"View Results"**
3. See student scores
4. Download results
5. **Import to Records**: Transfer CBT scores to main result system

### Qur'an Memorization Tracker

**Setting Targets**:
1. Navigate to **Qur'an Tracker**
2. Select a class
3. Click **"Set Target"**
4. Configure:
   - Academic Session & Term
   - Target Type (Memorization/Revision)
   - Period (Daily/Weekly/Monthly/Termly)
   - Qur'an Portions (Juz, Surah, Ayah, Pages)
   - Date Range
   - Description
5. Click **"Create Target"**

**Recording Progress**:
1. Go to **Qur'an Tracker** → **Class Summary**
2. Click **"Add Progress"** for a student
3. Enter:
   - Date
   - Type (Memorization/Revision)
   - Portions covered
   - Performance Status (Excellent/Good/Fair/Poor)
   - Comments
4. Click **"Save Progress"**

**Viewing Class Summary**:
- See all students' progress
- Total sessions per student
- Last activity date
- Latest performance status

### Parent Messages

**Sending Messages**:
1. Navigate to **Parent Messages**
2. Click **"New Message"**
3. Select parent or student
4. Enter subject and message
5. Click **"Send"**

**Replying to Messages**:
1. Click on received message
2. Type your reply
3. Click **"Send Reply"**

### Report Card Generation

**Generating Reports**:
1. Go to **Bulk Report Download**
2. Select:
   - Academic Session
   - Term
   - Class
   - Report Type (Term/Cumulative/Progressive)
3. Click **"Generate Reports"**
4. Download ZIP file with all reports

---

## Student Guide

### Dashboard
Your dashboard displays:
- Current academic session and term
- Recent results
- Upcoming exams
- Announcements

### My Profile

**Updating Profile**:
1. Navigate to **My Profile**
2. View your information
3. Upload passport photo:
   - Click **"Upload Photo"**
   - Select image (JPG/PNG, max 5MB)
   - Crop if needed
   - Click **"Save"**
4. Update contact information (if allowed)

### Viewing Results

**Term Report Card**:
1. Go to **Term Report**
2. Select:
   - Academic Session
   - Term
3. Click **"Generate Report"**
4. View your:
   - Subject scores
   - Total marks
   - Average
   - Position in class
   - Grade
   - Teacher's remarks
5. Download or print report

**Cumulative Report**:
- Shows performance across multiple terms
- Tracks progress over time

**Progressive Report**:
- Detailed subject-by-subject analysis
- Identifies strengths and weaknesses

### Timetable

**Viewing Your Timetable**:
1. Navigate to **Timetable**
2. View your class schedule
3. See subjects and periods for each day

### Exam Card

**Generating Exam Card**:
1. Go to **Exam Card**
2. Select:
   - Academic Session
   - Term
3. Click **"Generate Card"**
4. View subjects you're registered for
5. Download/Print exam card

### My Fees

**Checking Fee Status**:
1. Navigate to **My Fees**
2. View:
   - Total fee for current term
   - Amount paid
   - Balance
   - Payment history
3. See payment breakdown

**Making Online Payment**:
1. Click **"Pay Now"**
2. Enter amount to pay
3. Choose payment method:
   - Paystack (Card/Bank Transfer)
   - Flutterwave
4. Complete payment
5. Receive confirmation
6. Download receipt

### CBT Portal

**Taking an Exam**:
1. Navigate to **CBT Portal**
2. View available exams
3. Click **"Start Exam"** when ready
4. Read instructions carefully
5. Answer questions:
   - Select one option per question
   - Navigate using Next/Previous
   - Flag questions for review
6. Click **"Submit Exam"** when done
7. Confirm submission
8. View your score immediately

**Tips for CBT**:
- Ensure stable internet connection
- Don't refresh the page during exam
- Submit before time runs out
- Review flagged questions before submitting

### Qur'an Progress

**Viewing Your Progress**:
1. Navigate to **Qur'an Progress**
2. View statistics:
   - Total sessions
   - This week's sessions
   - This month's sessions
   - Average performance
3. Check class targets
4. Review your progress history:
   - Date of each session
   - Portions covered
   - Performance rating
   - Teacher's comments

### Homework & Resources

**Accessing Homework**:
1. Go to **Homework**
2. View assigned tasks
3. Download attachments
4. Submit completed work (if enabled)

**Learning Resources**:
1. Navigate to **Resources**
2. Browse by subject
3. Download study materials

---

## Parent Guide

### Dashboard
Your dashboard shows:
- Children's information
- Recent results
- Fee status
- Unread messages

### Viewing Child's Results

**Accessing Reports**:
1. Navigate to **Term Report**
2. Select child (if multiple)
3. Choose:
   - Academic Session
   - Term
4. Click **"View Report"**
5. Review performance
6. Download report

### Attendance Monitoring

**Checking Attendance**:
1. Go to **View Attendance**
2. Select child
3. Choose date range
4. View:
   - Days present
   - Days absent
   - Attendance percentage
   - Detailed daily records

### Fee Management

**Viewing Fee Status**:
1. Navigate to **My Children's Fees**
2. Select child
3. View:
   - Fee structure
   - Amount paid
   - Balance
   - Payment history

**Making Payments**:
1. Click **"Pay Fees"**
2. Select child
3. Enter amount
4. Choose payment method
5. Complete transaction
6. Download receipt

### Parent-Teacher Communication

**Sending Messages**:
1. Go to **Messages**
2. Click **"New Message"**
3. Select teacher or subject
4. Enter message
5. Click **"Send"**

**Reading Messages**:
1. View inbox
2. Click on message to read
3. Reply if needed

### Qur'an Progress Monitoring

**Viewing Child's Progress**:
1. Navigate to **Qur'an Progress**
2. Select child (if multiple)
3. View:
   - Statistics (sessions, performance)
   - Class targets
   - Complete progress history
   - Teacher's comments

---

## Accountant Guide

### Dashboard
Your dashboard displays:
- Total fees collected
- Outstanding fees
- Recent payments
- Payment statistics

### Fee Management

**Recording Manual Payments**:
1. Navigate to **Fee Management**
2. Click **"Record Payment"**
3. Search for student
4. Enter:
   - Amount paid
   - Payment method (Cash/Bank Transfer/Cheque)
   - Reference number
   - Date
5. Click **"Save Payment"**

**Viewing Payment History**:
1. Go to **Payment History**
2. Filter by:
   - Date range
   - Class
   - Payment status
3. View detailed records
4. Export to Excel

**Generating Fee Reports**:
1. Navigate to **Reports**
2. Select report type:
   - Collection Summary
   - Outstanding Fees
   - Class-wise Collection
3. Choose date range
4. Click **"Generate"**
5. Download report

### Payment Verification

**Verifying Online Payments**:
1. Go to **Payment Verification**
2. View pending verifications
3. Check payment details
4. Confirm or reject
5. Add remarks if needed

### Fee Structure Management

**Setting Up Fee Structure**:
1. Navigate to **Fee Structure**
2. Click **"Add Structure"**
3. Select class and term
4. Enter fee components
5. Set total amount
6. Click **"Save"**

---

## Public Features

### Landing Page

**Accessing the Landing Page**:
- Navigate to `/landing` route
- No login required

**Features**:
1. **Hero Section**: Rotating school images
2. **About Section**: School information
3. **Top Performers**: Best students showcase
4. **Latest News**: Recent updates
5. **Upcoming Events**: School calendar
6. **Gallery**: Photo gallery
7. **Contact Information**: School details
8. **Quick Links**: Login, Admission, etc.

### News & Events

**Viewing News**:
1. Navigate to **News & Events**
2. Browse published news
3. Click to read full article
4. Filter by category

**Viewing Events**:
1. See upcoming events
2. View event details
3. Add to calendar

### Gallery

**Browsing Photos**:
1. Navigate to **Gallery**
2. View photo albums
3. Click to enlarge
4. Navigate through images

### Alumni Portal

**Accessing Alumni Features**:
1. Login with alumni credentials
2. Navigate to **Alumni Dashboard**
3. Features:
   - Update profile
   - View alumni directory
   - Attend alumni events
   - Make donations
   - Share success stories

---

## Troubleshooting

### Common Issues

#### Cannot Login
**Problem**: Invalid username or password

**Solutions**:
1. Verify credentials are correct
2. Check CAPS LOCK is off
3. Contact admin for password reset
4. Clear browser cache and cookies

#### Forgot Password
**Steps**:
1. Click **"Forgot Password"** on login page
2. Enter your email or username
3. Check email for reset link
4. Click link and set new password
5. Login with new password

#### Page Not Loading
**Solutions**:
1. Check internet connection
2. Refresh the page (F5 or Ctrl+R)
3. Clear browser cache
4. Try a different browser
5. Contact IT support

#### Cannot Upload Files
**Possible Causes**:
1. File too large (check size limits)
2. Wrong file format
3. Slow internet connection

**Solutions**:
1. Compress large files
2. Use supported formats (JPG, PNG, PDF, etc.)
3. Wait for stable connection
4. Try uploading again

#### Results Not Showing
**Checks**:
1. Verify correct session and term selected
2. Confirm results have been entered by teacher
3. Check if results are published
4. Contact teacher or admin

#### Payment Not Reflecting
**Steps**:
1. Check payment confirmation email
2. Note transaction reference
3. Wait 24 hours for processing
4. Contact accountant with reference number
5. Provide proof of payment

### Getting Help

#### Contact Support
- **Email**: support@yourschool.com
- **Phone**: School office number
- **In-Person**: Visit school office

#### Reporting Bugs
1. Note the exact error message
2. Document steps to reproduce
3. Take screenshots if possible
4. Report to IT administrator

---

## Best Practices

### For All Users

1. **Security**:
   - Never share your password
   - Logout after each session
   - Change password regularly
   - Use strong passwords

2. **Data Entry**:
   - Double-check information before saving
   - Use proper formatting
   - Save work frequently

3. **Communication**:
   - Be professional in messages
   - Respond promptly
   - Use clear, concise language

### For Administrators

1. **Regular Backups**: Ensure data is backed up daily
2. **User Training**: Provide adequate training to users
3. **Data Verification**: Regularly audit entered data
4. **System Updates**: Keep system updated
5. **Security Audits**: Review user permissions regularly

### For Teachers

1. **Timely Entry**: Enter results before deadlines
2. **Accuracy**: Verify all scores before submission
3. **Communication**: Keep parents informed
4. **Attendance**: Mark attendance daily
5. **Backup**: Keep offline copies of important data

### For Students

1. **Regular Checks**: Monitor your results and fees
2. **Timely Payments**: Pay fees before deadlines
3. **Exam Preparation**: Review timetable and prepare
4. **Profile Updates**: Keep contact information current

### For Parents

1. **Regular Monitoring**: Check child's progress weekly
2. **Communication**: Respond to teacher messages
3. **Fee Payments**: Pay fees on time
4. **Engagement**: Attend parent-teacher meetings

---

## Appendix

### Glossary

- **Academic Session**: School year (e.g., 2023/2024)
- **Term**: Division of academic session (usually 3 per session)
- **Admission Number**: Unique student identifier
- **CBT**: Computer-Based Testing
- **Cumulative Report**: Multi-term performance report
- **Progressive Report**: Detailed subject analysis
- **Fee Structure**: Breakdown of fees per class/term

### Keyboard Shortcuts

- **Ctrl + S**: Save (where applicable)
- **Ctrl + P**: Print
- **Ctrl + F**: Search on page
- **Esc**: Close modal/dialog
- **Tab**: Navigate form fields

### File Format Support

**Images**:
- JPG, JPEG, PNG
- Maximum size: 5MB

**Documents**:
- PDF, DOC, DOCX
- Maximum size: 10MB

**Spreadsheets**:
- XLS, XLSX, CSV
- Maximum size: 5MB

---

## Conclusion

This comprehensive guide covers all major features of the School Management System. For additional support or feature requests, please contact your system administrator.

**Document Version**: 1.0  
**Last Updated**: December 2024  
**Prepared By**: School Management System Team

---

*For the latest updates and additional resources, visit your school's portal or contact the IT department.*
