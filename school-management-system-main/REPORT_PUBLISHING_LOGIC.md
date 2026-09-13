# Report Publishing & Access Control Logic

This document outlines the implementation of the result publishing system, which ensures that report cards are only accessible to students and parents after being explicitly published by the Class Form Master or an Administrator.

## Overview
- **Default State:** All results are unpublished (`isResultPublished = false`) by default.
- **Publishing Authority:** Only **Admins** and the assigned **Form Master (Class Teacher)** can publish results.
- **Access Control:** Students and Parents get a "Result Not Published" error if they try to view reports for an unpublished class.

## Features

### 1. Database Schema
- **Model:** `Class`
- **Field:** `isResultPublished` (Boolean, Default: `false`)

### 2. Publishing Interface
#### For Teachers (Form Masters)
- **Page:** `My Class Management` (`/my-class`)
- **Action:** A "Publish Results" / "Unpublish Results" button is available in the header.
- **Logic:** Toggles the status for the teacher's assigned class.

#### For Admins
- **Page:** `Class Management` (`/class-management`) -> Click on a Class Card
- **Action:** A "Publish Results" button is available in the class detail view header.
- **Logic:** Admins can toggle this for ANY class.

### 3. Report Access (Students & Parents)
#### Term Report (`/term-report`)
- **Student View:** Automatically checks the student's class status.
- **Parent View:** Parents select a child. The system checks that specific child's class status.
- **Restriction:** If `isResultPublished` is false, a 403 Forbidden error is returned with the message: *"The result for this class has not been published by the Form Master yet."*

#### Cumulative Report (`/cumulative-report`)
- Same restrictions apply as Term Report.

### 4. Code References
- **Backend Routes:**
  - `server/routes/classes.js`: Handle `PUT /:id/publish-results`
  - `server/routes/reports.js`: Check `isResultPublished` in `GET /term/...` and `GET /cumulative/...`
- **Frontend Pages:**
  - `client/src/pages/admin/ClassManagement.jsx`
  - `client/src/pages/teacher/MyClass.jsx`
  - `client/src/pages/student/TermReportCard.jsx`
  - `client/src/pages/student/CumulativeReport.jsx`

## How to Use
1. **Prepare Results:** Teachers upload and verify results.
2. **Publish:** When ready, the Form Master goes to "My Class" and clicks "Publish Results".
3. **Notify:** Optionally notify parents (via the messaging feature) that results are out.
4. **View:** Parents/Students can now successfully generate and download their report cards.
