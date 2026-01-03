# 👨‍🏫 TEACHER USER GUIDE
## Darul Qur'an School Management System

---

## 📋 Table of Contents
1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Viewing Your Assignments](#viewing-your-assignments)
4. [Entering Student Results](#entering-student-results)
5. [Bulk Results Upload](#bulk-results-upload)
6. [Viewing Student Information](#viewing-student-information)
7. [Class Teacher Features](#class-teacher-features)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

---

## 🚀 Getting Started

### Your Role as a Teacher
As a teacher, you can:
- ✅ View your subject and class assignments
- ✅ Enter and update student results
- ✅ Upload results in bulk (CSV)
- ✅ View student information
- ✅ Generate class reports
- ✅ Upload students (if you're a class teacher)

### First Login

#### Step-by-Step:
1. **Open your browser** (Chrome, Firefox, or Edge)
2. **Go to:** `http://localhost:5173` (or your school's URL)
3. **Enter your credentials:**
   - Username: (provided by admin)
   - Password: (provided by admin)
4. **Click "Login"**

#### After First Login:
⚠️ **IMPORTANT:** Change your password immediately!

1. **Click** your name (top-right corner)
2. **Select** "Change Password"
3. **Enter:**
   - Current Password
   - New Password (min. 8 characters)
   - Confirm New Password
4. **Click** "Update Password"

### Dashboard Overview

After login, you'll see:
- 📚 **Your Assignments** - Subjects and classes you teach
- 👨‍🎓 **Student Count** - Total students in your classes
- 📊 **Results Status** - How many results you've entered
- 🔔 **Notifications** - Important alerts

---

## 📚 Viewing Your Assignments

### What are Assignments?
Assignments show which **subjects** you teach in which **classes**.

**Example:**
- Mathematics → JSS 1A
- Mathematics → JSS 1B
- English Language → JSS 2A

### Viewing Your Assignments

#### Step-by-Step:
1. **Navigate:** Sidebar → **My Assignments**
2. **View list** of all your assignments
3. **See:**
   - Subject name
   - Class name
   - Number of students

### Understanding the Assignment Card

```
┌─────────────────────────────┐
│ Mathematics                 │ ← Subject
│ JSS 1A                      │ ← Class
│ 28 Students                 │ ← Student count
│                             │
│ [Enter Results] [View]      │ ← Actions
└─────────────────────────────┘
```

---

## 📝 Entering Student Results

### Understanding the Grading System

**Total: 100 Marks** broken down as:
- 📝 **Assignment 1:** 5 marks
- 📝 **Assignment 2:** 5 marks
- 📋 **Test 1:** 10 marks
- 📋 **Test 2:** 10 marks
- 📖 **Exam:** 70 marks

**Total Score = Sum of all components**

### Grade Scale
| Score Range | Grade |
|-------------|-------|
| 70-100 | A |
| 60-69 | B |
| 50-59 | C |
| 45-49 | D |
| 40-44 | E |
| 0-39 | F |

### Entering Results (Individual)

#### Step-by-Step:
1. **Navigate:** Sidebar → **Result Entry**
2. **Select:**
   - Academic Session: `2024/2025`
   - Term: `First Term`
   - Class: `JSS 1A`
   - Subject: `Mathematics`
3. **Click:** "Load Students"
4. **For each student, enter scores:**
   - Assignment 1: `4` (out of 5)
   - Assignment 2: `5` (out of 5)
   - Test 1: `8` (out of 10)
   - Test 2: `9` (out of 10)
   - Exam: `65` (out of 70)
5. **Total automatically calculated:** `91`
6. **Grade automatically assigned:** `A`
7. **Click:** "Save Results"

### Important Notes

#### ✅ DO:
- Enter scores **accurately**
- Double-check **before saving**
- Save **frequently** (don't lose work)
- Enter results **before deadline**

#### ❌ DON'T:
- Enter scores **above maximum**
- Leave required fields **blank**
- Wait until **last minute**
- Enter results for **wrong class/subject**

### Editing Results

**Can you edit?** Yes, but only **before** admin approves!

#### Step-by-Step:
1. **Navigate:** Sidebar → **Result Entry**
2. **Select** session, term, class, subject
3. **Click:** "Load Students"
4. **Modify** scores as needed
5. **Click:** "Update Results"

⚠️ **Warning:** Once admin approves, you **cannot edit**!

---

## 📊 Bulk Results Upload

### When to Use Bulk Upload
- ✅ You have results in **Excel/CSV**
- ✅ Entering for **many students**
- ✅ Want to **save time**
- ✅ Have results from **another system**

### Step-by-Step Guide

#### 1. Download Template
1. **Navigate:** Sidebar → **Bulk Results Upload**
2. **Click:** "Download CSV Template"
3. **Save** to your computer

#### 2. Fill the Template

**Open in Excel or Google Sheets**

The template has these columns:
- `admissionNumber` - Student's admission number
- `assignment1Score` - Score out of 5
- `assignment2Score` - Score out of 5
- `test1Score` - Score out of 10
- `test2Score` - Score out of 10
- `examScore` - Score out of 70

**Example:**
```
admissionNumber,assignment1Score,assignment2Score,test1Score,test2Score,examScore
2024-JSS1A-AI,4,5,8,9,65
2024-JSS1A-FY,5,4,9,8,68
2024-JSS1A-MH,3,4,7,8,60
```

#### 3. Important Rules
- ✅ Use **exact admission numbers**
- ✅ Don't change **column headers**
- ✅ Enter **numbers only** (no text)
- ✅ Respect **maximum scores**
- ✅ Save as **CSV format**

#### 4. Upload the File
1. **Navigate:** Sidebar → **Bulk Results Upload**
2. **Select:**
   - Academic Session
   - Term
   - Class
   - Subject
3. **Click:** "Choose File"
4. **Select** your CSV file
5. **Click:** "Upload Results"

#### 5. Review Upload Results

You'll see:
- ✅ **Green (Success):** Results uploaded
- ❌ **Red (Failed):** Error occurred

**For failed entries:**
- Read the **error message**
- Fix the **issue** in your CSV
- **Re-upload** failed entries

### Common Upload Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Student not found" | Wrong admission number | Verify admission number |
| "Score exceeds maximum" | Score too high | Check maximum for each component |
| "Invalid CSV format" | Wrong file format | Save as CSV, not Excel |
| "Missing required field" | Empty cell | Fill all required scores |
| "Duplicate entry" | Student listed twice | Remove duplicate row |

---

## 👨‍🎓 Viewing Student Information

### Viewing Student List

#### Step-by-Step:
1. **Navigate:** Sidebar → **My Students**
2. **Select a class** you teach
3. **View list** of all students
4. **See:**
   - Student name
   - Admission number
   - Photo (if uploaded)
   - Contact information

### Viewing Individual Student

#### Step-by-Step:
1. **Navigate:** Sidebar → **My Students**
2. **Click** on a student's name
3. **View details:**
   - Personal information
   - Parent/Guardian details
   - Class information
   - Fee status
   - Results history

### Searching for Students

#### Using Search Box:
1. **Type** student name or admission number
2. **Results filter** automatically
3. **Click** on student to view details

---

## 👔 Class Teacher Features

### If You're a Class Teacher

You have **additional responsibilities** and **extra features**:

#### Additional Features:
- ✅ Upload students for your class
- ✅ View class performance reports
- ✅ Monitor class attendance (if enabled)
- ✅ Manage class-specific issues

### Uploading Students (Class Teachers Only)

#### Step-by-Step:
1. **Navigate:** Sidebar → **Bulk Student Upload**
2. **Download** CSV template
3. **Fill student information:**
   - firstName, lastName (required)
   - classId (your class ID)
   - Other optional fields
4. **Save as CSV**
5. **Upload** the file
6. **Review** results

⚠️ **Note:** You can only upload students for **your assigned class**!

### Viewing Class Performance

#### Step-by-Step:
1. **Navigate:** Sidebar → **Class Performance**
2. **Select:**
   - Academic Session
   - Term
3. **View:**
   - Subject-wise performance
   - Top performers
   - Students needing help
   - Class average

---

## ✅ Best Practices

### Result Entry Best Practices

#### Before Entering Results:
- [ ] Verify you have the **correct class**
- [ ] Check you selected the **right subject**
- [ ] Confirm the **term and session**
- [ ] Have all **student scores** ready

#### While Entering Results:
- [ ] Enter scores **carefully**
- [ ] Double-check **each entry**
- [ ] Save **periodically** (every 10 students)
- [ ] Watch for **error messages**

#### After Entering Results:
- [ ] Review **all entries**
- [ ] Check for **missing scores**
- [ ] Verify **totals are correct**
- [ ] Submit **before deadline**

### Time Management

#### Daily Tasks:
- [ ] Check dashboard for notifications
- [ ] Respond to admin messages
- [ ] Review pending results

#### Weekly Tasks:
- [ ] Enter results for completed assessments
- [ ] Review student performance
- [ ] Update any corrections

#### Monthly Tasks:
- [ ] Complete all result entries
- [ ] Review class performance
- [ ] Prepare for next assessment

### Communication

#### With Admin:
- ✅ Report technical issues **promptly**
- ✅ Ask questions if **unsure**
- ✅ Submit results **on time**
- ✅ Respond to **notifications**

#### With Students/Parents:
- ✅ Results are **confidential**
- ❌ Don't share results **publicly**
- ❌ Don't discuss results **on social media**
- ✅ Direct queries to **admin**

---

## 🔒 Security & Privacy

### Password Security

#### Strong Password Tips:
- ✅ At least **8 characters**
- ✅ Mix of **letters, numbers, symbols**
- ✅ Not your **name or birthday**
- ✅ Unique (not used elsewhere)

#### Password Don'ts:
- ❌ Don't share with **anyone**
- ❌ Don't write it down
- ❌ Don't use same password **everywhere**
- ❌ Don't tell students

### Data Privacy

#### Student Information:
- ✅ Keep **confidential**
- ✅ Access only **when needed**
- ✅ Don't share **externally**
- ✅ Report **security concerns**

#### Results:
- ✅ Enter **accurately**
- ✅ Keep **private**
- ✅ Don't discuss **publicly**
- ✅ Follow school **policy**

### Account Security

#### Best Practices:
- ✅ **Log out** when done
- ✅ Don't leave computer **unattended**
- ✅ Use **school computers** when possible
- ✅ Report **suspicious activity**

---

## 🆘 Troubleshooting

### Common Issues & Solutions

#### Issue: Can't See My Assignments
**Solutions:**
1. Verify you're logged in as **teacher**
2. Check with admin if assignments are **set up**
3. Refresh the page
4. Clear browser cache
5. Contact admin

#### Issue: Can't Enter Results
**Solutions:**
1. Check if you're assigned to that **subject/class**
2. Verify correct **term and session** selected
3. Check if results are **already approved**
4. Try different browser
5. Contact admin

#### Issue: Scores Not Saving
**Solutions:**
1. Check **internet connection**
2. Verify scores are **within limits**
3. Ensure all **required fields** filled
4. Try saving **one student** at a time
5. Contact IT support

#### Issue: Bulk Upload Failing
**Solutions:**
1. Check **CSV format** (not Excel)
2. Verify **column headers** match template
3. Check **admission numbers** are correct
4. Ensure scores **don't exceed maximum**
5. Upload **smaller batches**

#### Issue: Student Not in List
**Solutions:**
1. Verify student is **enrolled** in class
2. Check if student is **active**
3. Confirm you're viewing **correct class**
4. Contact admin to verify **enrollment**

### Error Messages

| Error Message | What It Means | What To Do |
|---------------|---------------|------------|
| "Unauthorized" | Not logged in or no permission | Log in again or contact admin |
| "Score exceeds maximum" | Entered score too high | Check maximum for that component |
| "Student not found" | Invalid admission number | Verify admission number |
| "Results already approved" | Can't edit approved results | Contact admin if changes needed |
| "Network error" | Internet connection issue | Check connection and retry |

---

## 📱 Quick Reference

### Maximum Scores
| Component | Maximum |
|-----------|---------|
| Assignment 1 | 5 |
| Assignment 2 | 5 |
| Test 1 | 10 |
| Test 2 | 10 |
| Exam | 70 |
| **TOTAL** | **100** |

### Grade Scale
| Score | Grade |
|-------|-------|
| 70-100 | A |
| 60-69 | B |
| 50-59 | C |
| 45-49 | D |
| 40-44 | E |
| 0-39 | F |

### Important Pages
| Feature | Location |
|---------|----------|
| Dashboard | `/teacher/dashboard` |
| My Assignments | `/teacher/assignments` |
| Result Entry | `/teacher/results` |
| Bulk Upload | `/teacher/bulk-results` |
| My Students | `/teacher/students` |

### Keyboard Shortcuts
| Action | Shortcut |
|--------|----------|
| Save | `Ctrl + S` |
| Refresh | `F5` |
| Search | `Ctrl + F` |
| Next Field | `Tab` |

---

## 💡 Tips & Tricks

### Efficient Result Entry

#### Tip 1: Use Tab Key
- Press `Tab` to move to **next field**
- Faster than using mouse
- Keeps hands on keyboard

#### Tip 2: Prepare Scores First
- Have all scores **written down**
- Organize by **student order**
- Reduces **entry time**

#### Tip 3: Save Frequently
- Save after every **10 students**
- Prevents **data loss**
- Quick recovery if **error occurs**

#### Tip 4: Use Bulk Upload for Large Classes
- Faster for **30+ students**
- Less **typing errors**
- Can prepare **offline**

### Avoiding Common Mistakes

#### Mistake 1: Wrong Class/Subject
**Prevention:**
- Always **verify selection** before entering
- Check **class name** carefully
- Confirm **subject** is correct

#### Mistake 2: Exceeding Maximum Scores
**Prevention:**
- Remember **maximum** for each component
- Double-check **before entering**
- Use **calculator** if unsure

#### Mistake 3: Missing Students
**Prevention:**
- Count **total students** before starting
- Check for **missing names**
- Verify **all students** have scores

#### Mistake 4: Late Submission
**Prevention:**
- Note the **deadline**
- Start **early**
- Don't wait until **last day**

---

## 📞 Getting Help

### When to Contact Admin

Contact admin if:
- ❓ You can't access your assignments
- ❓ Student list is incorrect
- ❓ You need to edit approved results
- ❓ Class/subject assignment is wrong
- ❓ You need additional training

### When to Contact IT Support

Contact IT support if:
- 🔧 System is not loading
- 🔧 You can't log in
- 🔧 Errors keep appearing
- 🔧 Upload keeps failing
- 🔧 Page is broken/not displaying

### Contact Information

#### School Admin:
- 📧 **Email:** admin@darulquran.edu.ng
- 📱 **Phone:** +234 XXX XXX XXXX
- 🕐 **Hours:** Monday-Friday, 8AM-5PM

#### IT Support:
- 📧 **Email:** itsupport@darulquran.edu.ng
- 📱 **Phone:** +234 XXX XXX XXXX
- 🕐 **Hours:** Monday-Friday, 8AM-5PM

### Before Contacting Support

Please:
1. Note the **exact error message**
2. Note what you were **trying to do**
3. Try **troubleshooting steps** above
4. Have your **username** ready
5. Take a **screenshot** if possible

---

## 📚 FAQs

### Q: Can I enter results for subjects I don't teach?
**A:** No, you can only enter results for subjects and classes assigned to you.

### Q: What if I make a mistake after saving?
**A:** You can edit results before admin approval. After approval, contact admin.

### Q: How do I know if my results are approved?
**A:** Check the status indicator. Approved results show a green checkmark.

### Q: Can I see other teachers' results?
**A:** No, you can only see results for subjects you teach.

### Q: What's the deadline for entering results?
**A:** Check with admin. Usually 1 week after exams end.

### Q: Can I download my class results?
**A:** Yes, use the "Export" button on the results page.

### Q: What if a student is absent for an exam?
**A:** Enter "0" or leave blank, then notify admin.

### Q: Can I enter results on my phone?
**A:** Yes, but desktop/laptop is recommended for easier entry.

---

## 🎓 Remember

### Your Responsibilities:
- ✅ Enter results **accurately**
- ✅ Meet **deadlines**
- ✅ Maintain **confidentiality**
- ✅ Report **issues promptly**

### Your Rights:
- ✅ Request **training** if needed
- ✅ Report **technical issues**
- ✅ Ask **questions**
- ✅ Access **support**

---

**Last Updated:** December 5, 2025  
**Version:** 1.0  
**For:** Darul Qur'an School Management System

---

**Thank you for your dedication to student success! Your accurate and timely result entry helps students and parents track academic progress. If you have any questions, don't hesitate to reach out for help.** 🎓✨
