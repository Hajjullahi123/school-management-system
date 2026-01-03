# Qur'an Memorization Tracker

## Overview
The Qur'an Memorization Tracker is a comprehensive feature that enables Qur'an teachers to set memorization targets for classes and track individual student progress on a daily, weekly, monthly, and annual basis. The system provides role-specific interfaces for teachers, students, and parents.

## Features

### Teacher Interface (`/quran-tracker`)
**Access**: Admin, Teacher

#### Target Management
- Set class-level memorization targets
- Configure target periods: Daily, Weekly, Monthly, Termly
- Specify target types: Memorization or Revision
- Define targets by:
  - Juz (1-30)
  - Surah name
  - Ayah range
  - Page count
- Set target duration with start and end dates
- Add optional descriptions for context

#### Progress Recording
- Record daily student progress
- Capture:
  - Date of session
  - Type (Memorization/Revision)
  - Juz, Surah, and Ayah details
  - Pages covered
  - Performance status (Excellent, Good, Fair, Poor)
  - Teacher comments
- Quick access from class summary

#### Class Summary View
- Overview of all students in selected class
- Display metrics:
  - Total recorded sessions per student
  - Last activity date
  - Latest performance status
- Quick action buttons for adding progress

### Student Interface (`/quran-progress`)
**Access**: Student

#### Personal Dashboard
- **Statistics Cards**:
  - Total memorization sessions
  - Sessions this week
  - Sessions this month
  - Average performance rating

#### Class Targets View
- See all active targets set by teacher
- View target details:
  - Type and period
  - Qur'an portions (Juz, Surah, Ayah)
  - Target dates
  - Teacher's notes

#### Progress History
- Chronological list of all sessions
- Color-coded by performance:
  - 🌟 Excellent (Green)
  - ✅ Good (Blue)
  - ⚠️ Fair (Yellow)
  - ❌ Poor (Red)
- Detailed session information:
  - Date and type
  - Qur'an portions covered
  - Teacher's comments
  - Recording teacher name

### Parent Interface (`/parent/quran`)
**Access**: Parent

#### Multi-Child Support
- Dropdown selector for parents with multiple children
- Automatic selection of first child

#### Child Progress Monitoring
- Same statistics as student view
- View class targets
- Complete progress history
- Read-only access (no editing)

## Database Schema

### QuranTarget Model
```prisma
model QuranTarget {
  id                Int
  schoolId          Int
  classId           Int
  academicSessionId Int
  termId            Int
  targetType        String    // memorization, revision
  period            String    // daily, weekly, monthly, termly
  juzStart          Int?
  juzEnd            Int?
  surahStart        String?
  surahEnd          String?
  ayahStart         Int?
  ayahEnd           Int?
  pagesCount        Int?
  description       String?
  startDate         DateTime
  endDate           DateTime
  createdAt         DateTime
  updatedAt         DateTime
}
```

### QuranRecord Model
```prisma
model QuranRecord {
  id         Int
  schoolId   Int
  studentId  Int
  teacherId  Int
  date       DateTime
  type       String    // memorization, revision
  juz        Int?
  surah      String?
  ayahStart  Int?
  ayahEnd    Int?
  pages      Float?
  status     String    // Excellent, Good, Fair, Poor
  comments   String?
  createdAt  DateTime
  updatedAt  DateTime
}
```

## API Endpoints

### Targets
- `GET /api/quran-tracker/targets/:classId` - Get all targets for a class
  - Query params: `sessionId`, `termId`
- `POST /api/quran-tracker/targets` - Create new target (Admin/Teacher)
- `DELETE /api/quran-tracker/targets/:id` - Delete target (Admin/Teacher)

### Records
- `GET /api/quran-tracker/records/:studentId` - Get student's progress records
- `POST /api/quran-tracker/records` - Add progress record (Admin/Teacher)
- `GET /api/quran-tracker/class-summary/:classId` - Get class progress summary
  - Query params: `startDate`, `endDate`

## Usage Workflow

### 1. Setting Targets (Teacher)
1. Navigate to **Qur'an Tracker**
2. Select a class
3. Click **Set Target**
4. Fill in target details:
   - Select academic session and term
   - Choose target type and period
   - Specify Qur'an portions
   - Set date range
   - Add optional description
5. Click **Create Target**

### 2. Recording Progress (Teacher)
1. Navigate to **Qur'an Tracker**
2. Select a class
3. Go to **Class Summary** tab
4. Click **Add Progress** for a student (or use **Daily Records** tab)
5. Fill in session details:
   - Select student
   - Set date
   - Choose type (Memorization/Revision)
   - Enter Qur'an portions covered
   - Rate performance
   - Add comments
6. Click **Save Progress**

### 3. Viewing Progress (Student)
1. Navigate to **Qur'an Progress**
2. View personal statistics
3. Check class targets
4. Review progress history

### 4. Monitoring Child (Parent)
1. Navigate to **Qur'an Progress** (in parent menu)
2. Select child (if multiple)
3. View statistics and history

## Performance Metrics

### Status Ratings
- **Excellent**: Outstanding memorization with perfect recitation
- **Good**: Solid memorization with minor corrections
- **Fair**: Adequate memorization with several corrections
- **Poor**: Struggling with memorization, needs more practice

### Statistics Calculation
- **Total Sessions**: Count of all recorded progress entries
- **This Week**: Sessions in last 7 days
- **This Month**: Sessions in last 30 days
- **Average Performance**: Weighted average of status ratings
  - Excellent = 4 points
  - Good = 3 points
  - Fair = 2 points
  - Poor = 1 point

## Best Practices

### For Teachers
1. **Set Realistic Targets**: Consider student age and ability
2. **Regular Recording**: Record progress daily or after each session
3. **Detailed Comments**: Provide specific feedback for improvement
4. **Consistent Evaluation**: Use the same criteria for all students
5. **Review Targets**: Adjust targets based on class performance

### For Students
1. **Check Targets Regularly**: Stay aware of expectations
2. **Review Comments**: Learn from teacher feedback
3. **Track Progress**: Monitor your improvement over time
4. **Set Personal Goals**: Aim to improve your status ratings

### For Parents
1. **Regular Monitoring**: Check progress weekly
2. **Encourage Consistency**: Ensure child attends sessions
3. **Discuss with Child**: Talk about teacher comments
4. **Contact Teacher**: Reach out if concerned about progress

## Integration Points

### Related Features
- **Academic Sessions & Terms**: Targets are term-specific
- **Class Management**: Targets are class-based
- **Student Management**: Progress tied to student records
- **Teacher Assignments**: Only assigned teachers can record

### Navigation
- **Teacher Menu**: "Qur'an Tracker"
- **Student Menu**: "Qur'an Progress"
- **Parent Menu**: "Qur'an Progress"

## Future Enhancements (Potential)
- Export progress reports to PDF
- Bulk progress entry for multiple students
- Achievement badges for milestones
- Comparative analytics across classes
- SMS/Email notifications for parents
- Integration with report cards
- Qur'an recitation audio recording
- Tajweed evaluation tracking
- Hifdh (complete memorization) certification

## Technical Notes

### Frontend Components
- `client/src/pages/teacher/QuranTracker.jsx`
- `client/src/pages/student/QuranProgress.jsx`
- `client/src/pages/parent/ParentQuranView.jsx`

### Backend Routes
- `server/routes/quran-tracker.js`

### Database Migration
- Migration: `add_quran_tracker`
- Applied via: `npx prisma db push`

### Security
- All endpoints use authentication middleware
- Teacher/Admin authorization for write operations
- Students can only view their own records
- Parents can only view their children's records
- Class-based access control enforced

## Support & Troubleshooting

### Common Issues
1. **No targets showing**: Ensure targets are created for the current term
2. **Can't add progress**: Verify teacher has access to the class
3. **Student not in list**: Check student is assigned to the class
4. **Stats not updating**: Refresh the page after adding records

### Data Integrity
- All records are timestamped
- Audit trail via teacher ID in records
- Soft delete not implemented (use with caution)
- Historical data preserved across terms
