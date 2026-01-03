# 👨‍💼 ADMINISTRATOR USER GUIDE
## Darul Qur'an School Management System

---

## 📋 Table of Contents
1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Academic Setup](#academic-setup)
4. [Student Management](#student-management)
5. [Teacher Management](#teacher-management)
6. [Class Management](#class-management)
7. [Subject Management](#subject-management)
8. [Fee Management](#fee-management)
9. [Results Management](#results-management)
10. [Reports & Analytics](#reports--analytics)
11. [Best Practices](#best-practices)
12. [Troubleshooting](#troubleshooting)

---

## 🚀 Getting Started

### Your Role as Administrator
As an administrator, you have **full access** to all system features. You are responsible for:
- ✅ Setting up academic sessions and terms
- ✅ Managing students, teachers, and classes
- ✅ Configuring fee structures
- ✅ Overseeing results and reports
- ✅ System maintenance and user management

### First Login
1. **Open your browser** (Chrome, Firefox, or Edge recommended)
2. **Navigate to:** `http://localhost:5173` (or your school's URL)
3. **Enter credentials:**
   - Username: `admin`
   - Password: (provided by IT department)
4. **Click "Login"**
5. **Change password** on first login (recommended)

### Dashboard Overview
After login, you'll see:
- 📊 **Summary Cards** - Quick statistics
- 📈 **Charts** - Visual analytics
- 🔔 **Notifications** - Important alerts
- 📱 **Quick Actions** - Common tasks

---

## 📚 Academic Setup

### Setting Up Academic Sessions

**Why it's important:** Academic sessions define the school year (e.g., 2024/2025).

#### Step-by-Step:
1. **Navigate:** Sidebar → **Academic Setup**
2. **Click:** "Academic Sessions" tab
3. **Fill the form:**
   - Session Name: `2024/2025`
   - Start Date: `September 1, 2024`
   - End Date: `July 31, 2025`
4. **Click:** "Create Session"
5. **Set as Current:** Click "Set as Current" button

#### Best Practices:
- ✅ Create the session **before** the school year starts
- ✅ Only **one session** should be marked as "Current"
- ✅ Keep old sessions for historical records
- ⚠️ Don't delete sessions with existing data

### Setting Up Terms

**Why it's important:** Terms divide the academic year (First, Second, Third Term).

#### Step-by-Step:
1. **Navigate:** Sidebar → **Academic Setup**
2. **Click:** "Terms" tab
3. **Fill the form:**
   - Academic Session: Select `2024/2025`
   - Term Name: `First Term`
   - Start Date: `September 1, 2024`
   - End Date: `December 15, 2024`
4. **Click:** "Create Term"
5. **Repeat** for Second and Third Terms

#### Important Notes:
- 📅 Term dates should **not overlap**
- 🎯 Only **one term** should be current at a time
- 📝 Create all three terms at the start of the session

---

## 👨‍🎓 Student Management

### Adding Individual Students

#### Step-by-Step:
1. **Navigate:** Sidebar → **Student Management**
2. **Click:** "Add New Student" button
3. **Fill Personal Information:**
   - First Name: `Ahmed`
   - Last Name: `Ibrahim`
   - Date of Birth: `2010-05-15`
   - Gender: `Male`
   - Class: Select from dropdown
4. **Fill Parent Information:**
   - Parent/Guardian Name: `Mr. Ibrahim Hassan`
   - Parent Phone: `08012345678`
   - Parent Email: `parent@email.com`
5. **Fill Medical Information:**
   - Blood Group: `O+`
   - Genotype: `AA`
   - Disability: `None` (or specify)
6. **Fill Address Information:**
   - State of Origin: `Lagos`
   - Nationality: `Nigerian`
   - Address: `123 Main Street, Lagos`
7. **Click:** "Create Student"

#### After Creation:
- ✅ Student gets **auto-generated admission number**
- ✅ Student gets **auto-generated username** (for portal access)
- ✅ Default password is created (share with parent)
- 📸 Upload student photo (optional but recommended)

### Bulk Student Upload

**When to use:** Adding multiple students at once (e.g., new class intake).

#### Step-by-Step:
1. **Navigate:** Sidebar → **Bulk Student Upload**
2. **Download Template:**
   - Click "Download CSV Template"
   - Open in Excel or Google Sheets
3. **Fill the Template:**
   - One student per row
   - Required: firstName, lastName, classId
   - Optional: All other fields
4. **Save as CSV:**
   - File → Save As → CSV format
5. **Upload:**
   - Click "Choose File"
   - Select your CSV file
   - Click "Upload Students"
6. **Review Results:**
   - ✅ Green = Success
   - ❌ Red = Failed (with error message)
   - Fix errors and re-upload failed students

#### Common Errors:
| Error | Solution |
|-------|----------|
| "Missing required field" | Ensure firstName, lastName, classId are filled |
| "Invalid classId" | Use correct class ID from system |
| "Duplicate email" | Each email must be unique |
| "Invalid date format" | Use YYYY-MM-DD format |

### Uploading Student Photos

#### Step-by-Step:
1. **Navigate:** Sidebar → **Student Management**
2. **Find student** (use search box)
3. **Click:** "Upload Photo" icon
4. **Select image:**
   - Passport-style photo
   - Max size: 5MB
   - Format: JPG, PNG, or GIF
5. **Click:** "Upload"

#### Photo Guidelines:
- 📸 **Clear, recent photo**
- 👤 **Face clearly visible**
- 🎨 **Plain background preferred**
- 📏 **Square or portrait orientation**

---

## 👨‍🏫 Teacher Management

### Adding Teachers

#### Step-by-Step:
1. **Navigate:** Sidebar → **Teacher Management**
2. **Click:** "Add New Teacher"
3. **Fill Information:**
   - First Name: `Fatima`
   - Last Name: `Yusuf`
   - Email: `fatima.yusuf@school.edu.ng`
   - Specialization: `Mathematics`
4. **Click:** "Create Teacher"

#### After Creation:
- ✅ Teacher gets **auto-generated staff ID**
- ✅ Teacher gets **login credentials**
- 📧 Share credentials with teacher
- 🔐 Advise teacher to change password

### Assigning Teachers to Classes

**Purpose:** Link teachers to subjects they teach in specific classes.

#### Step-by-Step:
1. **Navigate:** Sidebar → **Teacher Assignments**
2. **Click:** "New Assignment"
3. **Select:**
   - Teacher: `Fatima Yusuf`
   - Subject: `Mathematics`
   - Class: `JSS 1A`
4. **Click:** "Assign"

#### Important Notes:
- 👨‍🏫 One teacher can teach **multiple subjects**
- 📚 One teacher can teach **multiple classes**
- ⚠️ Each subject-class combination should have **one teacher**

### Assigning Class Teachers

**Purpose:** Designate a teacher responsible for a specific class.

#### Step-by-Step:
1. **Navigate:** Sidebar → **Class Management**
2. **Find the class** (e.g., JSS 1A)
3. **Click:** "Edit" button
4. **Select Class Teacher** from dropdown
5. **Click:** "Update Class"

#### Class Teacher Responsibilities:
- 📋 Monitor class attendance
- 📊 Review class performance
- 👥 Manage class-specific issues
- 📝 Upload bulk students for their class

---

## 🏫 Class Management

### Creating Classes

#### Step-by-Step:
1. **Navigate:** Sidebar → **Class Management**
2. **Click:** "Add New Class"
3. **Fill Information:**
   - Class Name: `JSS 1`
   - Arm: `A` (or leave blank for no arm)
   - Class Teacher: Select from dropdown (optional)
4. **Click:** "Create Class"

#### Naming Conventions:
- **Junior Secondary:** JSS 1, JSS 2, JSS 3
- **Senior Secondary:** SS 1, SS 2, SS 3
- **Arms:** A, B, C, D (if needed)
- **Examples:** `JSS 1A`, `SS 2B`, `JSS 3`

### Editing Classes

#### Step-by-Step:
1. **Navigate:** Sidebar → **Class Management**
2. **Find the class**
3. **Click:** "Edit" button
4. **Update information**
5. **Click:** "Update Class"

### Deleting Classes

⚠️ **Warning:** Only delete classes with **no students** enrolled!

#### Step-by-Step:
1. **Navigate:** Sidebar → **Class Management**
2. **Find the class**
3. **Verify:** No students enrolled
4. **Click:** "Delete" button
5. **Confirm** deletion

---

## 📖 Subject Management

### Adding Subjects

#### Step-by-Step:
1. **Navigate:** Sidebar → **Subject Management**
2. **Click:** "Create New Subject"
3. **Fill Information:**
   - Subject Name: `Mathematics`
   - Subject Code: `MATH101` (optional)
4. **Click:** "Create Subject"

#### Common Subjects:
- Mathematics
- English Language
- Arabic Studies
- Islamic Studies
- Basic Science
- Social Studies
- Computer Studies
- Physical Education

### Editing Subjects

#### Step-by-Step:
1. **Navigate:** Sidebar → **Subject Management**
2. **Find the subject**
3. **Click:** "Edit" icon
4. **Update information**
5. **Click:** "Update Subject"

---

## 💰 Fee Management

### Setting Up Fee Structures

**Purpose:** Define how much each class should pay per term.

#### Step-by-Step:
1. **Navigate:** Sidebar → **Fee Structure Setup**
2. **Click:** "Add Fee Structure"
3. **Select:**
   - Class: `JSS 1A`
   - Academic Session: `2024/2025`
   - Term: `First Term`
   - Amount: `₦50,000`
   - Description: `First Term Fees` (optional)
4. **Click:** "Create Fee Structure"

#### Best Practices:
- 💡 Set fee structures **at the start of each term**
- 💡 Different classes can have **different fees**
- 💡 Update fees **before** term begins

### Managing Fee Records

**As Admin, you can:**
- ✅ View all student fee records
- ✅ Record payments
- ✅ Clear students for exams
- ✅ Generate fee reports
- ✅ Export fee data

#### Using Class Navigation:
1. **Navigate:** Sidebar → **Fee Management**
2. **View class cards** in "Navigate by Class" section
3. **Click on a class** (e.g., JSS 1A)
4. **View only that class's** fee records
5. **Perform actions** (record payment, clear for exam)

#### Recording a Payment:
1. **Find the student** (or select a class first)
2. **Click:** "💰 Pay" button
3. **Enter:**
   - Payment Amount: `₦25,000`
   - Payment Method: `Cash` / `Bank Transfer` / `POS`
   - Reference: Transaction ID (optional)
   - Notes: Any additional info (optional)
4. **Click:** "Record Payment"
5. **Print receipt** (optional)

#### Clearing Students for Exams:
1. **Find the student**
2. **Verify** payment status
3. **Click:** "✓ Clear" button
4. **Confirm** clearance

#### Bulk Clearance:
1. **Select multiple students** (checkboxes)
2. **Click:** "Clear Selected" button
3. **Confirm** bulk clearance

---

## 📊 Results Management

### Viewing Results

#### Step-by-Step:
1. **Navigate:** Sidebar → **Results Management**
2. **Filter by:**
   - Academic Session
   - Term
   - Class
   - Subject (optional)
3. **View results** in table format

### Approving Results

**Purpose:** Verify and approve results entered by teachers.

#### Step-by-Step:
1. **Navigate:** Sidebar → **Results Management**
2. **Review results** for accuracy
3. **Click:** "Approve" button
4. **Confirm** approval

⚠️ **Note:** Once approved, results may be locked from editing.

### Generating Report Cards

#### Step-by-Step:
1. **Navigate:** Sidebar → **Report Cards**
2. **Select:**
   - Academic Session
   - Term
   - Class
3. **Click:** "Generate Report Cards"
4. **Download PDF** or **Print**

#### Bulk Generation:
- Generate for **entire class** at once
- Download as **ZIP file**
- Print all at once

---

## 📈 Reports & Analytics

### Available Reports

#### 1. Student Performance Report
- View overall student performance
- Filter by class, term, session
- Export to Excel/PDF

#### 2. Fee Collection Report
- View fee collection statistics
- Filter by class, term
- Export to CSV

#### 3. Attendance Report (if enabled)
- View attendance statistics
- Filter by class, date range
- Export to Excel

#### 4. Class Performance Report
- Compare class performance
- View subject-wise analysis
- Identify top performers

### Exporting Data

#### Step-by-Step:
1. **Navigate** to desired report page
2. **Apply filters** as needed
3. **Click:** "Export to CSV" or "Export to PDF"
4. **Save file** to your computer

---

## ✅ Best Practices

### Daily Tasks
- [ ] Check dashboard for notifications
- [ ] Review pending approvals
- [ ] Monitor fee collection status
- [ ] Respond to teacher/parent queries

### Weekly Tasks
- [ ] Review student enrollment
- [ ] Check teacher assignments
- [ ] Monitor results entry progress
- [ ] Generate weekly reports

### Monthly Tasks
- [ ] Review fee collection reports
- [ ] Analyze student performance
- [ ] Update class information
- [ ] Backup system data

### Term Start Tasks
- [ ] Set up new term
- [ ] Configure fee structures
- [ ] Verify teacher assignments
- [ ] Send term notifications

### Term End Tasks
- [ ] Approve all results
- [ ] Generate report cards
- [ ] Archive term data
- [ ] Prepare for next term

---

## 🔒 Security Best Practices

### Password Management
- ✅ Use **strong passwords** (min. 8 characters)
- ✅ Include **letters, numbers, symbols**
- ✅ Change password **regularly** (every 3 months)
- ❌ Don't share your password
- ❌ Don't write passwords down

### Account Security
- ✅ **Log out** when done
- ✅ Don't leave computer **unattended**
- ✅ Use **secure networks** only
- ❌ Don't access from public computers

### Data Protection
- ✅ **Backup** data regularly
- ✅ Verify data before **deleting**
- ✅ Keep student information **confidential**
- ❌ Don't share sensitive data externally

---

## 🆘 Troubleshooting

### Common Issues

#### Issue: Can't Login
**Solutions:**
1. Verify username and password
2. Check CAPS LOCK is off
3. Clear browser cache
4. Try different browser
5. Contact IT support

#### Issue: Student Not Appearing
**Solutions:**
1. Check if student is in correct class
2. Verify student is active
3. Refresh the page
4. Check filters applied
5. Search by admission number

#### Issue: Can't Upload Photo
**Solutions:**
1. Check file size (max 5MB)
2. Verify file format (JPG, PNG, GIF)
3. Try different image
4. Check internet connection
5. Contact IT support

#### Issue: Results Not Showing
**Solutions:**
1. Verify correct term/session selected
2. Check if results are entered
3. Refresh the page
4. Clear filters
5. Contact teacher to enter results

### Getting Help

#### IT Support Contact:
- 📧 Email: `itsupport@school.edu.ng`
- 📱 Phone: `+234 XXX XXX XXXX`
- 🕐 Hours: Monday-Friday, 8AM-5PM

#### Before Contacting Support:
1. Note the **exact error message**
2. Note what you were **trying to do**
3. Try the **troubleshooting steps** above
4. Have your **username** ready
5. Take a **screenshot** if possible

---

## 📱 Quick Reference

### Keyboard Shortcuts
| Action | Shortcut |
|--------|----------|
| Search | `Ctrl + F` |
| Refresh | `F5` |
| Print | `Ctrl + P` |
| Save | `Ctrl + S` |

### Important Links
- 🏠 Dashboard: `/dashboard`
- 👨‍🎓 Students: `/admin/students`
- 👨‍🏫 Teachers: `/admin/teachers`
- 💰 Fees: `/accountant/fees`
- 📊 Results: `/admin/results`

### Status Indicators
| Icon/Color | Meaning |
|------------|---------|
| 🟢 Green | Active/Approved/Paid |
| 🔴 Red | Inactive/Pending/Unpaid |
| 🟡 Yellow | Warning/Partial |
| ✅ Checkmark | Completed/Verified |
| ❌ X | Failed/Rejected |

---

## 📚 Additional Resources

### Video Tutorials
- Coming soon: Video walkthroughs for each feature

### FAQs
- Check the FAQ section in the system
- Common questions answered

### Updates
- System updates announced via email
- Check changelog for new features

---

**Last Updated:** December 5, 2025  
**Version:** 1.0  
**For:** Darul Qur'an School Management System

---

## 📞 Need More Help?

Contact the IT Department:
- 📧 **Email:** itsupport@darulquran.edu.ng
- 📱 **Phone:** +234 XXX XXX XXXX
- 🕐 **Hours:** Monday-Friday, 8:00 AM - 5:00 PM

**Remember:** Your role is crucial to the smooth operation of the school. Take time to familiarize yourself with all features! 🎓✨
