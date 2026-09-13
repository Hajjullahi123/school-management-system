# School Management System - Quick Start Guide

## 🚀 Easy Setup (No PowerShell Issues!)

### Step 1: Install Dependencies
1. Navigate to `c:\Users\IT-LAB\School Mn`
2. **Double-click `install.bat`**
3. Wait for installation to complete (may take a few minutes)

### Step 2: Start the Application
1. **Double-click `start.bat`**
2. Two command windows will open:
   - **Server** (runs on http://localhost:3000)
   - **Client** (runs on http://localhost:5173)
3. Wait a few seconds for both to start
4. Your browser should automatically open, or manually go to: **http://localhost:5173**

### Step 3: Stop the Application
- Press `Ctrl+C` in each command window
- Or simply close both windows

---

## 📱 Using the New Features

### 1. Analytics Dashboard
- Click **Analytics** in the sidebar
- View charts for class/subject performance
- See top performers and students at risk

### 2. Bulk Upload Results
- Go to **Results** page
- Click **Bulk Upload** tab
- Download sample CSV template
- Fill with data and upload

### 3. Filter Results
- On **Results** page
- Use search box to find students
- Filter by subject, exam, or class
- Click "Clear Filters" to reset

### 4. Export PDF Report Cards
- Go to **Report Card** page
- Select student and exam
- Click **Download PDF**
- PDF saves automatically

### 5. Email Report Cards
- On **Report Card** page
- Click **Email Settings** to configure SMTP
- Generate a report card
- Click **Email Report**
- Enter recipient email and send

---

## 🔧 Troubleshooting

**If install.bat fails:**
- Make sure you have Node.js installed
- Check your internet connection
- Try running as Administrator

**If start.bat doesn't work:**
- Make sure you ran `install.bat` first
- Check if ports 3000 and 5173 are available
- Close any other applications using these ports

**If the browser doesn't open:**
- Manually navigate to http://localhost:5173
- Wait 10-15 seconds after starting for everything to load

---

## 📊 Sample Data for Testing

### Create Test Students
1. Go to **Students** page
2. Add a few students with different classes

### Add Subjects
1. Go to **Results** page
2. Add subjects: Mathematics, English, Science, etc.

### Create Exams
1. On **Results** page
2. Add exams: Mid-Term, Final, etc.

### Enter Results
- Use **Manual Entry** for individual results
- Use **Bulk Upload** for multiple results at once

### Generate Reports
1. Go to **Report Card**
2. Select student and exam
3. View, download PDF, or email

---

## ✨ You're All Set!

Your school management system is now fully equipped with:
- ✅ Analytics and reporting
- ✅ Bulk operations
- ✅ Advanced filtering
- ✅ PDF export
- ✅ Email integration

Enjoy using your enhanced school management system!
