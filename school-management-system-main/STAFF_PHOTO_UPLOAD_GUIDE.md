# 📸 STAFF PHOTO UPLOAD FEATURE
## Complete Implementation Guide

---

## ✅ **WHAT WAS ADDED**

### **1. Database Update**
- ✅ Added `photoUrl` field to Teacher model
- ✅ Stores path to uploaded photo
- ✅ Same structure as Student photos

### **2. Backend API Endpoints**
- ✅ `POST /api/upload/teacher/:teacherId/photo` - Upload photo
- ✅ `DELETE /api/upload/teacher/:teacherId/photo` - Delete photo
- ✅ Automatic old photo deletion
- ✅ File validation (JPG, PNG, GIF only)
- ✅ 5MB file size limit

### **3. File Storage**
- ✅ Photos saved in: `server/uploads/teachers/`
- ✅ Unique filenames (teacher-timestamp-random.jpg)
- ✅ Automatic directory creation

---

## 🔧 **SETUP REQUIRED**

### **Step 1: Run Database Migration**

You need to update your database to add the photoUrl field:

```cmd
cd server
npx prisma migrate dev --name add_teacher_photo
```

This will:
- Add photoUrl column to Teacher table
- Update database schema
- Keep existing data safe

---

## 📸 **HOW TO USE**

### **For Admins - Uploading Teacher Photos:**

#### **Method 1: Via Teacher Management Page** (Recommended)

**You'll need to add this UI to your Teacher Management page:**

1. Go to Teacher Management
2. Find the teacher
3. Click "Upload Photo" button
4. Select passport photo (JPG/PNG)
5. Click "Upload"
6. Photo appears immediately!

#### **Method 2: Via API (Testing)**

**Using Postman or similar:**

```
POST http://localhost:3000/api/upload/teacher/1/photo
Headers:
  Authorization: Bearer YOUR_TOKEN
Body:
  form-data
  Key: photo
  Value: [Select image file]
```

---

## 🎨 **FRONTEND IMPLEMENTATION**

### **I'll create the UI for you now:**

You need to add photo upload to your Teacher Management page. Let me check if you have one:

---

## 📋 **API ENDPOINTS REFERENCE**

### **1. Upload Teacher Photo**

**Endpoint:** `POST /api/upload/teacher/:teacherId/photo`

**Authorization:** Admin only

**Request:**
- Content-Type: multipart/form-data
- Body: photo file

**Response:**
```json
{
  "message": "Photo uploaded successfully",
  "photoUrl": "/uploads/teachers/teacher-1733395200000-123456789.jpg",
  "teacher": {
    "id": 1,
    "staffId": "STAFF001",
    "photoUrl": "/uploads/teachers/teacher-1733395200000-123456789.jpg",
    "user": {
      "firstName": "Ahmed",
      "lastName": "Ibrahim",
      "email": "ahmed@school.edu.ng"
    }
  }
}
```

### **2. Delete Teacher Photo**

**Endpoint:** `DELETE /api/upload/teacher/:teacherId/photo`

**Authorization:** Admin only

**Response:**
```json
{
  "message": "Photo deleted successfully"
}
```

---

## 🖼️ **DISPLAYING PHOTOS**

### **In Teacher Profile:**

```javascript
// Get teacher data with photo
const teacher = await fetch(`/api/teachers/${teacherId}`);

// Display photo
{teacher.photoUrl ? (
  <img 
    src={`http://localhost:3000${teacher.photoUrl}`}
    alt={`${teacher.user.firstName} ${teacher.user.lastName}`}
    className="w-32 h-32 rounded-full object-cover"
  />
) : (
  <div className="w-32 h-32 rounded-full bg-gray-300 flex items-center justify-center">
    <svg>...</svg> {/* Default avatar icon */}
  </div>
)}
```

### **In ID Card:**

```javascript
// ID Card component
<div className="id-card">
  <div className="photo-section">
    {teacher.photoUrl ? (
      <img 
        src={`http://localhost:3000${teacher.photoUrl}`}
        alt="Staff Photo"
        className="w-24 h-24 object-cover"
      />
    ) : (
      <div className="w-24 h-24 bg-gray-200">
        No Photo
      </div>
    )}
  </div>
  <div className="info-section">
    <h3>{teacher.user.firstName} {teacher.user.lastName}</h3>
    <p>Staff ID: {teacher.staffId}</p>
    {/* ... more info */}
  </div>
</div>
```

---

## ✅ **TESTING CHECKLIST**

After setup, test:

- [ ] Database migration successful
- [ ] Can upload teacher photo
- [ ] Photo appears in uploads/teachers folder
- [ ] Photo URL saved in database
- [ ] Can view photo on teacher profile
- [ ] Can delete photo
- [ ] Old photo deleted when uploading new one
- [ ] File size limit works (5MB)
- [ ] Only images accepted (JPG, PNG, GIF)

---

## 🎯 **NEXT STEPS**

### **1. Run Migration** (REQUIRED)
```cmd
cd server
npx prisma migrate dev --name add_teacher_photo
```

### **2. Restart Server**
```cmd
npm start
```

### **3. Test Upload**
- Use Postman or create UI
- Upload a test photo
- Verify it works

### **4. Add UI** (I can help with this)
- Teacher Management page
- Photo upload button
- Photo display
- Delete photo option

---

## 💡 **PHOTO REQUIREMENTS**

### **Recommended:**
- **Format:** JPG or PNG
- **Size:** Under 5MB
- **Dimensions:** 300x300px or larger
- **Type:** Passport-style photo
- **Background:** Plain/solid color
- **Quality:** Clear, professional

### **File Naming:**
- Automatic: `teacher-[timestamp]-[random].jpg`
- Example: `teacher-1733395200000-123456789.jpg`
- Prevents conflicts
- Easy to identify

---

## 🔒 **SECURITY**

### **Built-in Protection:**
- ✅ Admin-only access
- ✅ File type validation
- ✅ File size limits
- ✅ Unique filenames
- ✅ Automatic cleanup on errors

### **Best Practices:**
- Only admins can upload/delete
- Photos stored outside public web root
- Served through Express static middleware
- Regular backups recommended

---

## 📁 **FILE STRUCTURE**

```
server/
├── uploads/
│   ├── students/          ← Student photos
│   │   ├── student-123.jpg
│   │   └── student-456.jpg
│   └── teachers/          ← Teacher photos (NEW!)
│       ├── teacher-789.jpg
│       └── teacher-012.jpg
├── routes/
│   └── upload.js          ← Upload endpoints
└── prisma/
    └── schema.prisma      ← Updated with photoUrl
```

---

## 🆘 **TROUBLESHOOTING**

### **Problem: Migration fails**

**Solution:**
```cmd
# Reset and try again
npx prisma migrate reset
npx prisma migrate dev --name add_teacher_photo
```

### **Problem: Can't upload photo**

**Check:**
1. Is server running?
2. Is user logged in as admin?
3. Is file under 5MB?
4. Is file JPG/PNG/GIF?
5. Does uploads/teachers folder exist?

### **Problem: Photo not displaying**

**Check:**
1. Is photoUrl in database?
2. Does file exist in uploads/teachers?
3. Is URL correct (http://localhost:3000/uploads/teachers/...)?
4. Is static middleware configured?

---

## 🎨 **SAMPLE UI CODE**

### **Teacher Photo Upload Component:**

```javascript
import { useState } from 'react';

function TeacherPhotoUpload({ teacherId, currentPhotoUrl, onPhotoUpdated }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentPhotoUrl);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);

    // Upload
    setUploading(true);
    const formData = new FormData();
    formData.append('photo', file);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:3000/api/upload/teacher/${teacherId}/photo`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        }
      );

      const data = await response.json();
      
      if (response.ok) {
        alert('Photo uploaded successfully!');
        onPhotoUpdated(data.photoUrl);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      alert('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="photo-upload">
      <div className="photo-preview">
        {preview ? (
          <img 
            src={preview.startsWith('/') ? `http://localhost:3000${preview}` : preview}
            alt="Teacher"
            className="w-32 h-32 rounded-full object-cover"
          />
        ) : (
          <div className="w-32 h-32 rounded-full bg-gray-300 flex items-center justify-center">
            <span>No Photo</span>
          </div>
        )}
      </div>
      
      <label className="upload-button">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          disabled={uploading}
          className="hidden"
        />
        <button 
          className="px-4 py-2 bg-blue-600 text-white rounded"
          disabled={uploading}
        >
          {uploading ? 'Uploading...' : 'Upload Photo'}
        </button>
      </label>
    </div>
  );
}
```

---

## 📊 **FEATURE COMPARISON**

| Feature | Student Photos | Teacher Photos |
|---------|----------------|----------------|
| **Upload Endpoint** | `/api/upload/:studentId/photo` | `/api/upload/teacher/:teacherId/photo` |
| **Storage Location** | `uploads/students/` | `uploads/teachers/` |
| **File Prefix** | `student-` | `teacher-` |
| **Access Control** | Admin only | Admin only |
| **File Size Limit** | 5MB | 5MB |
| **Allowed Types** | JPG, PNG, GIF | JPG, PNG, GIF |
| **Database Field** | `Student.photoUrl` | `Teacher.photoUrl` |

---

## 🎉 **SUMMARY**

### **What You Have Now:**

✅ **Database field** for teacher photos  
✅ **API endpoints** for upload/delete  
✅ **File storage** system  
✅ **Automatic cleanup** of old photos  
✅ **Security** (admin-only access)  
✅ **Validation** (file type, size)  

### **What You Need to Do:**

1. ⚠️ **Run migration** (required!)
2. ⚠️ **Restart server**
3. 📝 **Add UI** for photo upload (I can help!)
4. 🎨 **Display photos** on profile/ID card
5. ✅ **Test** the feature

---

## 🚀 **READY TO USE!**

The backend is complete! Just:

1. Run the migration
2. Restart server
3. Add UI (or use API directly)
4. Start uploading teacher photos!

---

**Need help adding the UI? Just ask and I'll create the Teacher Management page with photo upload!** 📸✨

**Last Updated:** December 5, 2025  
**Status:** ✅ Backend Complete - UI Pending
