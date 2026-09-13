# Testing Direct Alumni Registration

## Prerequisites
- Server and client should be running
- You should be logged in as an admin

## Test Steps

### Test 1: Direct Alumni Registration (New Feature)

1. **Navigate to Alumni Management**
   - Go to Admin Dashboard → Alumni Management

2. **Click "+ Create Alumni" button**

3. **Select "Register New Alumni" mode**
   - You should see two toggle buttons
   - Click on "Register New Alumni"
   - The form should expand showing comprehensive fields

4. **Fill in the form**:
   - **Required fields**:
     - First Name: "John"
     - Last Name: "Doe"
     - Graduation Year: 2020
   
   - **Optional fields** (test some):
     - Email: "john.doe@example.com" (or leave empty to test auto-generation)
     - Date of Birth: "1995-06-15"
     - Gender: "Male"
     - Current Job: "Software Engineer"
     - Current Company: "Tech Corp"
     - University: "University of Lagos"
     - Skills: "Programming, Leadership, Public Speaking"
     -Bio: "Test alumni with diverse skills"

5. **Submit the form**
   - Click "Register Alumni"
   - Wait for the response

6. **Verify Credentials Modal**
   - A modal should appear showing:
     - Username (Alumni ID in format: AL/2020/XXXX)
     - Auto-generated password
     - Email address
   - **IMPORTANT**: Copy these credentials before closing

7. **Verify Alumni was created**
   - Check the Alumni Directory
   - Look for "John Doe" under "Class of 2020"
   - Click to expand the year group
   - Verify the alumni appears in the table

8. **Test Generated Credentials**
   - Log out
   - Go to Alumni Portal login
   - Try logging in with the generated credentials
   - Should be prompted to change password on first login

### Test 2: Promotion Method (Existing Feature - Should Still Work)

1. **Click "+ Create Alumni" again**

2. **Select "Promote Existing Student" mode**
   - The form should be simpler (only Student ID and Graduation Year)

3. **Fill in the form**:
   - Student ID: [Enter an existing student's internal ID]
   - Graduation Year: Current year

4. **Submit**
   - Click "Promote to Alumni"
   - Should get success message
   - Verify the student now appears in Alumni Directory

### Expected Behaviors

#### Direct Registration:
- ✅ Creates user account with 'alumni' role
- ✅ Creates student record with status 'alumni'
- ✅ Creates alumni record with all provided information
- ✅ Generates unique Alumni ID (AL/YYYY/XXXX format)
- ✅ Auto-generates email if not provided
- ✅ Auto-generates random 8-character password
- ✅ Displays credentials in modal after registration
- ✅ Alumni appears in directory under correct graduation year

#### Promotion:
- ✅ Updates existing student's status to 'alumni'
- ✅ Creates alumni record linked to student
- ✅ Uses existing student information
- ✅ Student no longer appears in active student list

### Common Issues to Check

1. **Validation Errors**:
   - Try submitting without required fields
   - Should show appropriate error messages

2. **Duplicate Prevention**:
   - Try promoting the same student twice
   - Should show error: "This student is already an alumni"

3. **Auto-generation**:
   - Submit direct registration without email
   - Email should be auto-generated as: `firstname.lastname@alumni.school`

4. **Form Reset**:
   - After successful registration, open the modal again
   - Form should be cleared and ready for new entry

### Database Verification (Optional)

If you have database access, verify:

```sql
-- Check the new alumni record
SELECT * FROM Alumni 
WHERE alumniId LIKE 'AL/2020/%' 
ORDER BY createdAt DESC 
LIMIT 1;

-- Check the associated student record
SELECT * FROM Student 
WHERE status = 'alumni' 
ORDER BY createdAt DESC 
LIMIT 1;

-- Check the user account
SELECT * FROM User 
WHERE role = 'alumni' 
ORDER BY createdAt DESC 
LIMIT 1;
```

### UI Verification Checklist

- [ ] Registration method toggle is visible and functional
- [ ] Both modes display appropriate forms
- [ ] Form has proper sections (Basic, Personal, Academic, Professional)
- [ ] Social Links section is collapsible
- [ ] Required fields are marked with red asterisk (*)
- [ ] Cancel button closes modal
- [ ] Submit button shows appropriate loading state
- [ ] Credentials modal displays after successful registration
- [ ] Print button works in credentials modal
- [ ] Alumni appears in correct year group in directory

## Success Criteria

The feature is working correctly if:
1. ✅ Admin can register completely new alumni not in the system
2. ✅ Admin can still promote existing students (old method works)
3. ✅ Credentials are generated and displayed
4. ✅ Alumni can log in with generated credentials
5. ✅ Alumni data appears correctly in the directory
6. ✅ Both registration methods work without conflicts
