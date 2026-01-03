# Sample CSV Files for Testing Bulk Upload

I've created sample CSV files in the `c:\Users\IT-LAB\School Mn` folder that you can use to test the bulk upload feature.

## 📁 Sample Files Created

### 1. **sample_results.csv** - Mid-Term Exam Results
Contains results for 3 students (STU001, STU002, STU003) across 4 subjects:
- Mathematics (MATH)
- English (ENG)
- Science (SCI)
- History (HIST)

### 2. **sample_results_final.csv** - Final Exam Results
Contains final exam results for the same 3 students across 3 subjects.

## 🧪 How to Test Bulk Upload

### Step 1: Prepare the System
Before uploading the CSV files, you need to create the required data:

1. **Add Students** (Go to Students page):
   - Name: "John Doe", Roll No: "STU001", Class: "Grade 10"
   - Name: "Jane Smith", Roll No: "STU002", Class: "Grade 10"
   - Name: "Bob Johnson", Roll No: "STU003", Class: "Grade 10"

2. **Add Subjects** (Go to Results page):
   - Mathematics, Code: "MATH"
   - English, Code: "ENG"
   - Science, Code: "SCI"
   - History, Code: "HIST"

3. **Add Exams** (Go to Results page):
   - Name: "Mid-Term Exam", Date: (any date)
   - Name: "Final Exam", Date: (any date)

### Step 2: Upload the CSV
1. Go to **Results** page
2. Click **Bulk Upload** tab
3. Click "Choose File" and select `sample_results.csv`
4. Click **Upload Results**
5. You should see: "Successfully Uploaded: 12" (3 students × 4 subjects)

### Step 3: Verify the Results
1. Go to **Results** page → **Manual Entry** tab
2. Scroll down to see all the uploaded results in the table
3. Try filtering by student, subject, or exam

### Step 4: Test Analytics
1. Go to **Analytics** page
2. You should now see:
   - Class performance chart
   - Subject performance chart
   - Grade distribution
   - Top performers list

### Step 5: Generate Report Cards
1. Go to **Report Card** page
2. Select "John Doe (STU001)" and "Mid-Term Exam"
3. Click **Generate Report**
4. Try **Download PDF** or **Email Report**

## 📝 CSV Format Reference

```csv
rollNo,subjectCode,examName,marks
STU001,MATH,Mid-Term Exam,85
```

**Columns:**
- `rollNo` - Student's roll number (must exist in system)
- `subjectCode` - Subject code or name (must exist in system)
- `examName` - Exam name (must exist in system)
- `marks` - Marks obtained (0-100)

## ✨ Tips

- The system will validate each row and report errors with line numbers
- If a result already exists, it will be updated (not duplicated)
- You can upload the same file multiple times safely
- Create your own CSV files following this format for real data

## 🎯 What to Expect

After uploading `sample_results.csv`:
- ✅ 12 results will be created
- ✅ Analytics charts will show data
- ✅ You can filter and search results
- ✅ Report cards will be available for all 3 students
- ✅ You can export PDFs and send emails

Enjoy testing your school management system!
