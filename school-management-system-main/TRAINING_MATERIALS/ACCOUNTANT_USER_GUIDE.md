# 💰 ACCOUNTANT USER GUIDE
## Darul Qur'an School Management System

---

## 📋 Table of Contents
1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Fee Management](#fee-management)
4. [Class-Based Navigation](#class-based-navigation)
5. [Recording Payments](#recording-payments)
6. [Payment History](#payment-history)
7. [Clearing Students for Exams](#clearing-students-for-exams)
8. [Generating Reports](#generating-reports)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

---

## 🚀 Getting Started

### Your Role as Accountant
As an accountant, you are responsible for:
- ✅ Managing student fee records
- ✅ Recording all payments
- ✅ Clearing students for examinations
- ✅ Generating fee reports
- ✅ Monitoring fee collection
- ✅ Tracking outstanding balances

### First Login

#### Step-by-Step:
1. **Open your browser** (Chrome, Firefox, or Edge recommended)
2. **Navigate to:** `http://localhost:5173` (or your school's URL)
3. **Enter credentials:**
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

Your dashboard shows:
- 💰 **Total Expected** - All fees expected this term
- ✅ **Total Collected** - All fees received
- ⚠️ **Outstanding** - Fees yet to be paid
- 👥 **Cleared Students** - Students cleared for exams
- ⏳ **Pending Clearance** - Students awaiting clearance

---

## 💰 Fee Management

### Understanding Fee Records

Each student has a **fee record** for each term containing:
- **Expected Amount** - How much they should pay
- **Paid Amount** - How much they've paid
- **Balance** - Outstanding amount
- **Clearance Status** - Cleared for exam or not

### Accessing Fee Management

#### Step-by-Step:
1. **Navigate:** Sidebar → **Fee Management**
2. **View:**
   - Current term and session
   - Summary statistics
   - Class navigation cards
   - Student fee records

### Fee Management Page Layout

```
┌─────────────────────────────────────────┐
│ Fee Management                          │
│ First Term - 2024/2025                  │
├─────────────────────────────────────────┤
│ [Summary Cards]                         │
│ Total Expected | Collected | Balance    │
├─────────────────────────────────────────┤
│ 📚 Navigate by Class                    │
│ [All Classes] [JSS 1A] [JSS 1B] ...    │
├─────────────────────────────────────────┤
│ [Search] [Filters] [Actions]            │
├─────────────────────────────────────────┤
│ [Student Fee Records Table]             │
└─────────────────────────────────────────┘
```

---

## 📚 Class-Based Navigation

### What is Class Navigation?

**NEW FEATURE!** 🎉

Instead of scrolling through all students, you can now:
- Click on a **class card** to view only that class
- See **statistics** for each class
- Quickly **switch** between classes
- View **all classes** together

### Using Class Navigation

#### Step 1: View Class Cards
After opening Fee Management, scroll to **"📚 Navigate by Class"** section.

You'll see cards for:
- **All Classes** (default view)
- **JSS 1A**, **JSS 1B**, **JSS 2A**, etc.

#### Step 2: Understanding Class Cards

Each card shows:
```
┌─────────────────────────┐
│ JSS 1A          ✓       │ ← Selected (teal border)
├─────────────────────────┤
│ Students:     28        │
│ Expected:  ₦840,000     │ ← Blue
│ Collected: ₦672,000     │ ← Green
│ Balance:   ₦168,000     │ ← Red
├─────────────────────────┤
│ Cleared:   22           │ ← Green
│ Pending:   6            │ ← Orange
├─────────────────────────┤
│ ████████░░ 80%          │ ← Progress bar
└─────────────────────────┘
```

#### Step 3: Select a Class
1. **Click** on any class card (e.g., "JSS 1A")
2. **Card highlights** in teal color
3. **Student list filters** to show only that class
4. **Banner appears:** "📌 Viewing: JSS 1A - Showing 28 students"

#### Step 4: Return to All Classes
- **Click** the "All Classes" card, OR
- **Click** "View All Classes" button (top-right)

### Benefits of Class Navigation

✅ **Faster Access** - One click to any class  
✅ **Visual Overview** - See all class stats at once  
✅ **Better Organization** - Work on one class at a time  
✅ **Progress Tracking** - Visual progress bars  
✅ **Efficient Workflow** - Less scrolling and searching  

---

## 💵 Recording Payments

### When to Record Payments

Record a payment whenever:
- Student pays **full fees**
- Student makes **partial payment**
- Student pays via **any method** (cash, transfer, POS, etc.)

### Payment Methods Supported

- 💵 **Cash** - Physical cash payment
- 🏦 **Bank Transfer** - Direct bank transfer
- 💳 **POS** - Card payment via POS terminal
- 📄 **Cheque** - Payment by cheque
- 🌐 **Online** - Online payment gateway

### Recording a Payment (Step-by-Step)

#### Method 1: From Student List

1. **Find the student:**
   - Use search box, OR
   - Select their class first, OR
   - Scroll through list

2. **Click** "💰 Pay" button next to student

3. **Payment form appears** showing:
   - Student name
   - Admission number
   - Expected amount
   - Current balance

4. **Fill payment details:**
   - **Payment Amount:** `₦25,000`
   - **Payment Method:** Select from dropdown
   - **Reference Number:** (optional) Transaction ID, cheque number
   - **Notes:** (optional) Any additional information

5. **Click** "Record Payment"

6. **Receipt prompt appears:**
   - Click "Yes" to print receipt
   - Click "No" to skip

7. **Payment recorded!**
   - Balance updates automatically
   - Payment appears in history
   - Statistics update

#### Method 2: Bulk Class Processing

1. **Select a class** using class navigation
2. **Work through students** one by one
3. **Record payments** as they come
4. **Monitor progress** on class card

### Payment Receipt

After recording payment, you can:
- **Print receipt** immediately
- **View receipt** from payment history
- **Reprint receipt** anytime

Receipt includes:
- Student information
- Payment amount
- Payment method
- Reference number
- Date and time
- Receipt number

---

## 📜 Payment History

### Viewing Payment History

#### For Individual Student:

1. **Find the student** in fee records
2. **Click** "📜 History" button
3. **View all payments** made by student

Payment history shows:
- **Amount** paid
- **Payment method** used
- **Date and time** of payment
- **Reference number** (if provided)
- **Notes** (if any)
- **Who recorded** the payment

#### Printing Old Receipts:

1. **Open payment history**
2. **Find the payment**
3. **Click** "Print Receipt" button

---

## ✅ Clearing Students for Exams

### What is Exam Clearance?

**Exam clearance** means:
- Student has paid **sufficient fees**
- Student is **allowed** to sit for exams
- Student can **collect exam card**

### Clearance Criteria

⚠️ **Important:** Check school policy!

Common criteria:
- Paid **at least 50%** of fees, OR
- Paid **full fees**, OR
- Has **payment plan** approved by admin

### Clearing Individual Students

#### Step-by-Step:

1. **Find the student**
2. **Verify payment status:**
   - Check paid amount
   - Check balance
   - Confirm meets criteria
3. **Click** "✓ Clear" button
4. **Confirm** clearance
5. **Student cleared!**
   - Status changes to "✓ Cleared"
   - Student can collect exam card

### Bulk Clearance

**When to use:** Clearing multiple students at once.

#### Step-by-Step:

1. **Select students:**
   - Use checkboxes next to student names
   - Select all in class (checkbox in header)

2. **Click** "Clear Selected" button

3. **Review confirmation:**
   - Shows number of students
   - Warns to verify payment status

4. **Click** "Confirm Bulk Clear"

5. **All selected students cleared!**

### Revoking Clearance

⚠️ **Admin only** - Contact admin if clearance needs to be revoked.

---

## 📊 Generating Reports

### Available Reports

#### 1. Fee Collection Summary
Shows overall statistics:
- Total expected
- Total collected
- Total outstanding
- Collection percentage

#### 2. Class-wise Report
Shows statistics per class:
- Expected per class
- Collected per class
- Outstanding per class
- Cleared vs pending students

#### 3. Student Fee Report
Shows individual student records:
- Student details
- Expected amount
- Paid amount
- Balance
- Clearance status

### Exporting Data

#### Export to CSV:

1. **Navigate:** Fee Management page
2. **Apply filters** (if needed):
   - Select specific class
   - Filter by status
3. **Click** "Export to CSV" button
4. **File downloads** automatically
5. **Open in Excel** or Google Sheets

#### What's Included in Export:
- Admission number
- Student name
- Class
- Expected amount
- Paid amount
- Balance
- Clearance status

### Using Exported Data

You can use exported data to:
- Create **custom reports** in Excel
- Share with **admin** or **management**
- **Archive** for records
- **Analyze** payment trends
- **Identify** defaulters

---

## ✅ Best Practices

### Daily Tasks

#### Morning Routine:
- [ ] Log in to system
- [ ] Check dashboard summary
- [ ] Review pending payments
- [ ] Check notifications

#### During the Day:
- [ ] Record payments as they come
- [ ] Print receipts for all payments
- [ ] Update student clearances
- [ ] Respond to payment queries

#### End of Day:
- [ ] Verify all payments recorded
- [ ] Generate daily report
- [ ] Reconcile with cash/bank
- [ ] Log out securely

### Weekly Tasks

- [ ] Review outstanding balances
- [ ] Follow up with defaulters
- [ ] Generate weekly report
- [ ] Update admin on collection status
- [ ] Clear eligible students for exams

### Monthly Tasks

- [ ] Generate monthly report
- [ ] Analyze payment trends
- [ ] Identify payment patterns
- [ ] Report to management
- [ ] Archive monthly data

### Term Tasks

#### Start of Term:
- [ ] Verify fee structures set
- [ ] Create fee records for all students
- [ ] Send fee notifications
- [ ] Prepare payment schedule

#### Mid-Term:
- [ ] Review collection progress
- [ ] Send reminders to defaulters
- [ ] Clear students for mid-term exams
- [ ] Generate mid-term report

#### End of Term:
- [ ] Final clearances for exams
- [ ] Generate final report
- [ ] Reconcile all payments
- [ ] Archive term data
- [ ] Prepare for next term

---

## 💡 Tips for Efficient Fee Management

### Tip 1: Use Class Navigation
- Work on **one class** at a time
- Complete **all payments** for that class
- Move to **next class**
- More **organized** and **efficient**

### Tip 2: Record Payments Immediately
- Don't **delay** recording
- Record **as payment is made**
- Reduces **errors** and **confusion**
- Keeps records **up-to-date**

### Tip 3: Always Print Receipts
- Give **receipt** to every payer
- Keep **copy** for records
- Prevents **disputes**
- Professional **service**

### Tip 4: Use Reference Numbers
- For **bank transfers**: Transaction ID
- For **POS**: Transaction reference
- For **cheques**: Cheque number
- For **online**: Payment reference
- Helps **track** and **verify** payments

### Tip 5: Add Notes for Special Cases
- **Partial payment** plans
- **Scholarship** students
- **Sibling discounts**
- **Special arrangements**
- Helps **remember** context

### Tip 6: Regular Reconciliation
- Match **system records** with **bank**
- Verify **cash** on hand
- Check for **discrepancies**
- Report **issues** immediately

### Tip 7: Monitor Progress Bars
- **Green bars** = Good collection
- **Red/low bars** = Need attention
- Focus on **classes** with low collection
- **Prioritize** follow-ups

---

## 🔒 Security & Accuracy

### Handling Money

#### Best Practices:
- ✅ Count **carefully**
- ✅ Give **correct change**
- ✅ Issue **receipt** immediately
- ✅ Keep cash **secure**
- ✅ Bank money **regularly**

#### Don'ts:
- ❌ Don't leave cash **unattended**
- ❌ Don't take money **home**
- ❌ Don't lend school **money**
- ❌ Don't accept **damaged notes**

### Data Security

#### Password Security:
- ✅ Use **strong password**
- ✅ Change **regularly**
- ❌ Don't **share** password
- ❌ Don't write it **down**

#### System Security:
- ✅ **Log out** when done
- ✅ Don't leave computer **unattended**
- ✅ Lock screen if **stepping away**
- ✅ Use **school computers** only

### Accuracy

#### Double-Check:
- ✅ Payment **amount**
- ✅ Student **name**
- ✅ Payment **method**
- ✅ Reference **number**

#### Before Saving:
- ✅ Verify all **details**
- ✅ Check **calculations**
- ✅ Confirm with **payer**
- ✅ Then **save**

---

## 🆘 Troubleshooting

### Common Issues

#### Issue: Student Not in List
**Solutions:**
1. Check if student is **enrolled**
2. Verify **correct term/session** selected
3. Try **searching** by admission number
4. Contact **admin** to verify enrollment

#### Issue: Can't Record Payment
**Solutions:**
1. Check **internet connection**
2. Verify student has **fee record**
3. Ensure amount is **valid** (not negative)
4. Try **refreshing** page
5. Contact **IT support**

#### Issue: Payment Not Showing in History
**Solutions:**
1. **Refresh** the page
2. Check if payment was **saved**
3. Verify **correct student**
4. Check **internet** was stable
5. Contact **IT support** if missing

#### Issue: Can't Clear Student
**Solutions:**
1. Verify student has **fee record**
2. Check if already **cleared**
3. Ensure you have **permission**
4. Try **refreshing** page
5. Contact **admin**

#### Issue: Export Not Working
**Solutions:**
1. Check **browser** allows downloads
2. Try different **browser**
3. Disable **pop-up blocker**
4. Check **internet connection**
5. Contact **IT support**

### Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| "Fee record not found" | Student has no fee record | Contact admin to create record |
| "Invalid amount" | Amount is negative or too large | Enter valid positive amount |
| "Network error" | Internet connection issue | Check connection and retry |
| "Unauthorized" | Not logged in or no permission | Log in again or contact admin |
| "Payment failed" | Payment couldn't be saved | Check details and retry |

---

## 📱 Quick Reference

### Payment Methods
| Method | When to Use | Reference Required? |
|--------|-------------|---------------------|
| Cash | Physical cash | No |
| Bank Transfer | Bank payment | Yes (Transaction ID) |
| POS | Card payment | Yes (Transaction ref) |
| Cheque | Cheque payment | Yes (Cheque number) |
| Online | Online gateway | Yes (Payment ref) |

### Status Indicators
| Status | Color | Meaning |
|--------|-------|---------|
| ✓ Cleared | Green | Cleared for exam |
| ✗ Not Cleared | Red | Not cleared |
| Fully Paid | Green | Balance = ₦0 |
| Partial | Yellow | Some payment made |
| Not Paid | Red | No payment |

### Keyboard Shortcuts
| Action | Shortcut |
|--------|----------|
| Search | `Ctrl + F` |
| Refresh | `F5` |
| Print | `Ctrl + P` |
| Save | `Ctrl + S` |

### Important Pages
| Feature | Location |
|---------|----------|
| Dashboard | `/accountant/dashboard` |
| Fee Management | `/accountant/fees` |
| Reports | `/accountant/reports` |

---

## 📞 Getting Help

### When to Contact Admin

Contact admin for:
- ❓ Fee structure issues
- ❓ Student enrollment questions
- ❓ Policy clarifications
- ❓ Special payment arrangements
- ❓ Clearance policy questions

### When to Contact IT Support

Contact IT support for:
- 🔧 System not loading
- 🔧 Can't log in
- 🔧 Errors appearing
- 🔧 Features not working
- 🔧 Data not saving

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
1. Note **exact error message**
2. Note what you were **trying to do**
3. Try **troubleshooting steps**
4. Have your **username** ready
5. Take **screenshot** if possible

---

## 📚 FAQs

**Q: Can I edit a payment after recording?**  
A: No, payments cannot be edited. Contact admin if correction needed.

**Q: What if I record wrong amount?**  
A: Contact admin immediately to void the payment and record correctly.

**Q: Can I clear a student with outstanding balance?**  
A: Check school policy. Usually requires admin approval for special cases.

**Q: How do I handle partial payments?**  
A: Record each payment separately. System tracks total automatically.

**Q: What if parent disputes payment?**  
A: Check payment history, show receipt, escalate to admin if needed.

**Q: Can I delete a fee record?**  
A: No, only admin can delete. Contact admin if needed.

**Q: How do I handle refunds?**  
A: Contact admin. Refunds require special approval and processing.

**Q: What if system is slow?**  
A: Check internet connection, try refreshing, contact IT if persists.

---

**Last Updated:** December 5, 2025  
**Version:** 1.0  
**For:** Darul Qur'an School Management System

---

**Thank you for your diligent work in managing school finances! Your accuracy and attention to detail ensure smooth school operations. If you have questions, don't hesitate to ask for help.** 💰✨
