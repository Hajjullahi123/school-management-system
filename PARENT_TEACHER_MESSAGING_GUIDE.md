# Parent Portal Enhancements - Implementation Guide

## 🚀 What's Been Implemented

### 1. **Parent-Teacher Messaging System** ✅
- Two-way communication between parents and form masters
- Support for complaints, updates, and general messages
- Read/unread status tracking
- Message threading for replies

### 2. **Parent Access to Student Results** (To be completed)
- Access to term reports
- Cumulative reports  
- Progressive reports
- Result analytics

### 3. **Smart Student Selector** (To be completed)
- Only shows dropdown when parent has multiple children
- Auto-selects if only one child

---

## 📋 IMPORTANT: Database Migration Required

**YOU MUST RUN THIS COMMAND** before the messaging system will work:

```powershell
# Navigate to server directory
cd "c:\Users\IT-LAB\School Mn\server"

# Run the migration
npx prisma migrate dev --name add_parent_teacher_messaging

# Or if that doesn't work, try:
npm run prisma:migrate
```

This will create the `ParentTeacherMessage` table in your database.

---

## 📊 Database Changes

### New Model: `ParentTeacherMessage`

```prisma
model ParentTeacherMessage {
  id              Int      @id @default(autoincrement())
  
  // Sender & Receiver
  senderId        Int      // User ID of sender
  receiverId      Int      // User ID of receiver
  senderRole      String   // 'parent' or 'teacher'
  
  // Student Context
  studentId       Int      // Which student this is about
  
  // Message Content
  subject         String
  message         String
  messageType     String   // 'complaint', 'update', 'general', 'response'
  
  // Status
  isRead          Boolean  @default(false)
  readAt          DateTime?
  
  // Reply Threading
  parentMessageId Int?     // For threaded replies
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

---

## 🔧 Next Steps (To Be Implemented)

### Step 1: Backend Routes (messages.js)
Create `server/routes/messages.js` with endpoints:
- `POST /api/messages` - Send new message
- `GET /api/messages` - Get all messages  
- `GET /api/messages/unread-count` - Count unread
- `PUT /api/messages/:id/read` - Mark as read
- `POST /api/messages/:id/reply` - Reply to message

### Step 2: Frontend Components
Create these files:
- `client/src/pages/parent/ParentMessages.jsx` - Parent messaging interface
- `client/src/pages/teacher/TeacherMessages.jsx` - Teacher messaging interface
- `client/src/components/MessageThread.jsx` - Message display component

### Step 3: Parent Results Access
Update these files to allow parent access:
- `client/src/pages/student/TermReportCard.jsx`
- `client/src/pages/student/CumulativeReport.jsx`
- `client/src/pages/student/ProgressiveReport.jsx`
- `client/src/pages/Analytics.jsx`

Add new routes in `App.jsx`:
```javascript
// Parent access to results
<Route path="parent/term-report/:studentId" element={
  <ProtectedRoute roles={['parent']}>
    <TermReportCard />
  </ProtectedRoute>
} />
```

### Step 4: Smart Student Selector
Update `ParentAttendanceView.jsx` to:
```javascript
// Only show dropdown if multiple children
{wards.length > 1 ? (
  <select>...</select>
) : (
  <p>Viewing: {wards[0].name}</p>
)}
```

---

## 💬 Messaging System Design

### How It Works:

1. **Parent sends message to form master**
   ```
   Parent → Message → Form Master (teacherId from class)
   ```

2. **Form master replies**
   ```
   Form Master → Reply (parentMessageId set) → Parent
   ```

3. **Message Types**
   - `complaint` - Parent complaint about student
   - `update` - Teacher update to parent
   - `general` - General communication
   - `response` - Reply to previous message

### Sample Message Flow:

```
Parent: "My child has been complaining about bullying"
  ↓ (messageType: 'complaint')
Form Master: "Thank you for bringing this to my attention..."
  ↓ (messageType: 'response', parentMessageId: 1)
Parent: "Thank you for your quick response"
  ↓ (messageType: 'response', parentMessageId: 2)
```

---

## 🎨 UI Design Concept

### Parent Messages Page
```
┌──────────────────────────────────────┐
│ Messages with Form Master            │
├──────────────────────────────────────┤
│ [New Message] button                 │
│                                      │
│ Message List:                        │
│ ┌────────────────────────────────┐  │
│ │ 📧 Re: John's Attendance      │  │
│ │ From: Mr. Smith (Form Master) │  │
│ │ 2 hours ago | Unread          │  │
│ └────────────────────────────────┘  │
│                                      │
│ ┌────────────────────────────────┐  │
│ │ ✅ Bullying Complaint         │  │
│ │ To: Mr. Smith                 │  │
│ │ Yesterday | Read              │  │
│ └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

### Message Thread View
```
┌──────────────────────────────────────┐
│ ← Back to Messages                   │
│                                      │
│ Subject: John's Attendance Issue    │
│                                      │
│ ┌────────────────────────────────┐  │
│ │ You (Parent) - 2 days ago     │  │
│ │ John has been absent due to   │  │
│ │ illness...                    │  │
│ └────────────────────────────────┘  │
│                                      │
│ ┌────────────────────────────────┐  │
│ │ Mr. Smith - 1 day ago         │  │
│ │ Thank you for informing me... │  │
│ └────────────────────────────────┘  │
│                                      │
│ [Reply] button                       │
└──────────────────────────────────────┘
```

---

## 🔐 Security Considerations

1. **Authorization**
   - Parents can only message their child's form master
   - Teachers can only message parents of students in their class
   - Messages are student-specific

2. **Validation**
   - Verify student belongs to parent
   - Verify teacher is form master of student's class
   - Sanitize message content

3. **Privacy**
   - Messages are private between parent and form master
   - Other teachers cannot see messages
   - Other parents cannot see messages

---

## 📱 Features Overview

### For Parents:
✅ Send messages/complaints to form master
✅ View message history
✅ See unread message count
✅ Reply to teacher messages
✅ Access student results (to be added)
✅ View analytics (to be added)

### For Form Masters:
✅ Receive parent messages
✅ Reply to parent messages
✅ See which student the message is about
✅ Track read/unread status
✅ Message threading

---

## 📝 Sample Backend Route (To Implement)

```javascript
// server/routes/messages.js
const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

// Send message
router.post('/', authenticate, authorize(['parent', 'teacher']), async (req, res) => {
  const { receiverId, studentId, subject, message, messageType } = req.body;
  
  // Create message
  const newMessage = await prisma.parentTeacherMessage.create({
    data: {
      senderId: req.user.id,
      receiverId,
      senderRole: req.user.role,
      studentId,
      subject,
      message,
      messageType
    }
  });
  
  res.json(newMessage);
});

// Get messages
router.get('/', authenticate, authorize(['parent', 'teacher']), async (req, res) => {
  const messages = await prisma.parentTeacherMessage.findMany({
    where: {
      OR: [
        { senderId: req.user.id },
        { receiverId: req.user.id }
      ]
    },
    orderBy: { createdAt: 'desc' }
  });
  
  res.json(messages);
});

module.exports = router;
```

---

## ✅ Current Status

- [x] Database schema updated
- [x] Database migrated (Manually via script)
- [x] Backend routes created
- [x] Frontend components created
- [x] Parent results access added
- [x] Smart student selector implemented
- [x] Analytics view connected & linked

---

## 🎯 Quick Start After Migration

1. Run database migration (see command at top)
2. Restart your server
3. Implement backend routes
4. Create frontend components
5. Add routes to App.jsx
6. Test the messaging system

---

**This document will guide you through completing the parent-teacher messaging system!**
