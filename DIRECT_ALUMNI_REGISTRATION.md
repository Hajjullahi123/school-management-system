# Direct Alumni Registration Feature

## Overview
Added the ability to register alumni directly in the system without requiring them to have been previously registered as students. This addresses the scenario where alumni who graduated before the system was implemented need to be added to the alumni portal.

## Changes Made

### Backend (`server/routes/alumni.js`)

#### New Endpoint: `/api/alumni/admin/register-direct`
- **Method**: POST
- **Authentication**: Required (Admin only)
- **Purpose**: Register a new alumni with full details

**Request Body Fields**:
```javascript
{
  // Personal Information
  firstName: string (required),
  lastName: string (required),
  middleName: string (optional),
  email: string (optional, auto-generated if not provided),
  dateOfBirth: date (optional),
  gender: string (optional),
  stateOfOrigin: string (optional),
  nationality: string (optional, default: "Nigerian"),
  address: string (optional),
  
  // Academic Information
  graduationYear: number (required),
  classGraduated: string (optional),
  
  // Alumni Professional Information
  currentJob: string (optional),
  currentCompany: string (optional),
  university: string (optional),
  courseOfStudy: string (optional),
  bio: string (optional),
  linkedinUrl: string (optional),
  twitterUrl: string (optional),
  portfolioUrl: string (optional),
  skills: string (optional, comma-separated),
  achievements: string (optional),
  
  // Parent/Guardian Info (optional, for records)
  parentGuardianName: string (optional),
  parentGuardianPhone: string (optional),
  parentEmail: string (optional),
  
  // Medical Info (optional, for records)
  bloodGroup: string (optional),
  genotype: string (optional),
  disability: string (optional, default: "None")
}
```

**Response**:
```javascript
{
  alumni: { /* Alumni record with nested student and user data */ },
  credentials: {
    username: string,  // Auto-generated Alumni ID
    password: string,  // Auto-generated random password
    email: string      // Email address used
  }
}
```

**Process**:
1. Validates required fields (firstName, lastName, graduationYear)
2. Generates unique admission number
3. Creates Alumni ID in format: `AL/{year}/{admissionNumber}`
4. Creates User account with role 'alumni'
5. Creates Student record with status 'alumni'
6. Creates Alumni record with all provided information
7. Returns credentials for the alumni to access the portal

### Frontend (`client/src/pages/admin/AlumniManagement.jsx`)

#### New Features:
1. **Registration Method Toggle**: 
   - Two modes: "Promote Existing Student" and "Register New Alumni"
   - Clearly labeled with descriptions

2. **Comprehensive Registration Form**:
   - **Basic Information**: First name, middle name, last name, email
   - **Personal Information**: Date of birth, gender, state of origin, address
   - **Academic Information**: Graduation year, class graduated from
   - **Professional Information**: Current job, company, university, course of study, bio, skills
   - **Social Links** (collapsible): LinkedIn, Twitter, Portfolio URLs

3. **Credential Display**:
   - Shows generated username (Alumni ID)
   - Shows auto-generated password
   - Can be printed for distribution to alumni

#### State Management:
- `registrationMethod`: Tracks which mode is active ('promotion' or 'direct')
- `directRegForm`: Stores all form data for direct registration
- Enhanced credential modal to work with both methods

## Benefits

1. **Flexibility**: Admins can now register alumni who graduated before the system existed
2. **Complete Records**: Capture comprehensive alumni information during registration
3. **Dual Mode**: Existing promotion workflow is preserved alongside new direct registration
4. **User Experience**: Clear visual distinction between the two registration methods
5. **Professional Data**: Can capture alumni's current career and education information upfront

## Usage

### For Promotion (Existing Method):
1. Click "+ Create Alumni" button
2. Select "Promote Existing Student"
3. Enter the student's internal ID
4. Enter graduation year
5. Click "Promote to Alumni"

### For Direct Registration (New Method):
1. Click "+ Create Alumni" button
2. Select "Register New Alumni"
3. Fill in the comprehensive form with alumni details
4. Click "Register Alumni"
5. Credentials are automatically generated and displayed
6. Alumni can use these credentials to access the Alumni Portal

## Technical Notes

- All three records (User, Student, Alumni) are created in a single database transaction
- Admission numbers are auto-generated sequentially
- Alumni IDs follow the format: `AL/{graduationYear}/{admissionNumber}`
- Email: Auto-generated as `{firstname}.{lastname}@alumni.school` if not provided
- Password: 8-character random string, must be changed on first login
- The student status is set to 'alumni' to maintain database consistency

## Future Enhancements

Potential improvements:
- Bulk alumni import from CSV/Excel
- Photo upload during registration
- Document attachment (certificates, testimonials)
- Email notification to alumni with credentials
- Integration with alumni verification process
