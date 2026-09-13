# Password Management System

## Overview
The School Management System now includes a comprehensive password management solution that allows users to change their passwords and administrators to reset passwords for users who have forgotten their credentials.

---

## 🔐 Features

### 1. **Change Password** (All Users)
**Route:** `/change-password`  
**Access:** All authenticated users (Admin, Teacher, Student, Accountant)

#### Features:
- ✅ User-friendly interface with real-time validation
- ✅ Password strength indicator (Weak, Medium, Strong)
- ✅ Password match verification
- ✅ Current password verification
- ✅ Security tips and guidelines
- ✅ Responsive design

#### How to Use:
1. Navigate to "Change Password" from your profile menu
2. Enter your current password
3. Enter your new password (minimum 6 characters)
4. Confirm your new password
5. Click "Change Password"
6. Success message will appear when password is changed

#### Password Requirements:
- Minimum 6 characters (8+ recommended)
- Must be different from current password
- Stronger passwords include:
  - Mix of uppercase and lowercase letters
  - Numbers
  - Special characters

---

### 2. **Password Reset** (Admin Only)
**Route:** `/password-reset`  
**Access:** Administrators only

#### Features:
- ✅ Search and filter all users
- ✅ Reset password for any user
- ✅ Random password generator
- ✅ Printable credentials card
- ✅ Copy credentials to clipboard
- ✅ Automatic temporary password flag

#### How to Use:
1. Navigate to "Password Reset" from admin menu
2. Search for the user (by name, username, or email)
3. Click "Reset Password" button next to the user
4. Enter a new temporary password or generate a random one
5. Click "Reset Password" to confirm
6. A credentials card will appear with:
   - User's name and role
   - Username
   - New temporary password
7. **Print or copy the credentials** to provide to the user

#### Important Notes:
- The new password is **temporary**
- User will be **required to change** it on next login
- Old password becomes invalid immediately
- Always provide credentials to the user securely

---

## 🎯 Use Cases

### **Scenario 1: User Wants to Change Their Password**
1. User logs in with current credentials
2. Navigates to **Change Password** page
3. Enters current password and new password
4. Successfully changes password
5. Can immediately log in with new password

### **Scenario 2: User Forgot Their Password**
1. User contacts administrator
2. Admin navigates to **Password Reset** page
3. Admin searches for the user
4. Admin resets password and prints/copies credentials
5. Admin provides new credentials to user **securely**
6. User logs in with temporary password
7. User is **forced to change password** immediately
8. User sets their own permanent password

### **Scenario 3: First-Time Student Login**
1. Student receives credentials from admin (admission)
2. Student logs in with default password (123456)
3. System forces student to change password
4. Student sets own secure password
5. Student can now access system normally

---

## 🔒 Security Features

### **Authentication**
- All password operations require authentication
- Only admins can reset other users' passwords
- Current password verification for password changes

### **Password Hashing**
- All passwords are hashed using **bcrypt** (12 rounds)
- Passwords are never stored in plain text
- Hashing is one-way (cannot be reversed)

### **Force Password Change**
- Default passwords require immediate change
- Reset passwords are marked as temporary
- Users must change temporary passwords on next login

### **Password Validation**
- Minimum 6 characters enforced
- Frontend and backend validation
- Real-time feedback on password strength

---

## 📋 API Endpoints

### **1. Change Password**
```
POST /api/auth/change-password
```

**Request Body:**
```json
{
  "currentPassword": "oldpass123",
  "newPassword": "newSecurePass123"
}
```

**Response (Success):**
```json
{
  "message": "Password changed successfully"
}
```

**Response (Error - Wrong Current Password):**
```json
{
  "error": "Current password is incorrect"
}
```

### **2. Reset Password (Admin Only)**
```
POST /api/auth/reset-password
```

**Request Body:**
```json
{
  "userId": 123,
  "newPassword": "tempPass123"
}
```

**Response (Success):**
```json
{
  "message": "Password reset successfully",
  "username": "JD-SS1A-2025",
  "temporaryPassword": "tempPass123"
}
```

**Response (Error - Not Admin):**
```json
{
  "error": "Only administrators can reset passwords"
}
```

---

## 🎨 User Interface

### **Change Password Page**
- Clean, modern design with teal color scheme
- User profile header with avatar
- Password strength indicator with color coding:
  - Red: Weak (≤2 criteria)
  - Yellow: Medium (3 criteria)
  - Green: Strong (≥4 criteria)
- Real-time password match validation
- Security tips panel
- Loading state during submission
- Success/error message display

### **Password Reset Page (Admin)**
- Searchable user table
- Role-based color badges:
  - Red: Admin
  - Blue: Teacher
  - Green: Student
  - Purple: Accountant
- Random password generator button
- Printable credentials modal
- Copy to clipboard functionality
- Print-optimized layout

---

## 🔧 Technical Implementation

### **Frontend**
- **Location:** 
  - `/client/src/pages/ChangePassword.jsx`
  - `/client/src/pages/admin/PasswordReset.jsx`
- **Framework:** React with Hooks
- **Styling:** Tailwind CSS
- **State Management:** useState, useEffect
- **API Calls:** Custom `api` helper (with auth headers)

### **Backend**
- **Location:** `/server/routes/auth.js`
- **Endpoints:**
  - `POST /api/auth/change-password` (authenticated users)
  - `POST /api/auth/reset-password` (admin only)
- **Security:** bcrypt password hashing (12 rounds)
- **Middleware:** JWT authentication, role-based authorization

### **Database**
- **Table:** `User`
- **Fields:**
  - `passwordHash` (bcrypt hashed password)
  - `mustChangePassword` (boolean flag for temporary passwords)

---

## 📱 Navigation

### **Access Change Password:**
1. **From User Menu:** Click profile icon → "Change Password"
2. **Direct URL:** `/change-password`

### **Access Password Reset (Admin):**
1. **From Admin Menu:** System → "Password Reset"
2. **Direct URL:** `/password-reset`

---

## ⚠️ Important Warnings

### **For Administrators:**
1. Always provide reset credentials **securely** (in person, encrypted email, etc.)
2. Never share reset credentials via unsecured channels
3. Verify user identity before resetting password
4. Keep printed credentials secure or destroy after delivery
5. Monitor password reset activities for security

### **For Users:**
1. Never share your password with anyone
2. Change default/temporary passwords immediately
3. Use strong passwords (8+ characters)
4. Don't reuse passwords from other systems
5. Contact admin if you suspect unauthorized access

---

## 🐛 Troubleshooting

### **"Current password is incorrect"**
- **Cause:** You entered the wrong current password
- **Solution:** Double-check your current password or contact admin for reset

### **"Password must be at least 6 characters"**
- **Cause:** New password is too short
- **Solution:** Choose a password with 6 or more characters

### **"Only administrators can reset passwords"**
- **Cause:** Non-admin user trying to access password reset
- **Solution:** Contact administrator for password reset

### **"User not found"**
- **Cause:** Invalid user ID in reset request
- **Solution:** Refresh the page and try again

---

## 🚀 Future Enhancements (Optional)

Consider implementing:
1. **Email Password Reset:** Send reset link via email
2. **Security Questions:** Alternative password recovery method
3. **Password History:** Prevent reusing last N passwords
4. **Two-Factor Authentication:** Extra security layer
5. **Password Expiration:** Force password changes periodically
6. **Login Attempt Tracking:** Monitor failed login attempts
7. **Password Complexity Rules:** Enforce stricter requirements
8. **Self-Service Password Reset:** For users with verified email

---

## 📊 Statistics & Monitoring

Admins can track:
- Total password resets performed
- Users who haven't changed default passwords
- Password change frequency
- Failed password change attempts

---

## 📞 Support

If you encounter any issues:
1. Check this documentation first
2. Contact your system administrator
3. Verify your internet connection
4. Clear browser cache and try again

---

**Version:** 1.0  
**Last Updated:** December 2025  
**Developed By:** School Management System Team
