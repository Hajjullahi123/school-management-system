# Computer Based Test (CBT) System - User Guide & Use Cases

This document outlines the workflows and use cases for the newly implemented Computer Based Test (CBT) module.

## 1. Overview
The CBT module allows the school to conduct online examinations. 
*   **Teachers** can create exams, manage question banks, and view automated results.
*   **Students** can take exams within a timed interface and receive instant feedback.

---

## 2. Teacher / Admin Use Cases

### Use Case A: Creating a New Exam
**Goal**: Schedule a new test for a specific class and subject.
**Steps**:
1.  Log in as **Admin** or **Teacher**.
2.  Navigate to **CBT / Exams** in the sidebar.
3.  Click the **+ Create New Exam** button.
4.  Fill in the exam details:
    *   **Title**: e.g., "Mathematics Mid-Term Assessment".
    *   **Class**: Select the target class (e.g., JSS 1).
    *   **Subject**: Select the subject (e.g., Mathematics).
    *   **Duration**: Set the time limit in minutes (e.g., 45).
    *   **Total Marks**: Define the total score (e.g., 100).
    *   **Dates** (Optional): Set start/end windows for availability.
5.  Click **Create Exam**.

### Use Case B: Managing Questions
**Goal**: Add multiple-choice questions to an existing exam.
**Steps**:
1.  From the **CBT / Exams** list, locate the exam.
2.  Click **Manage Questions**.
3.  On the left panel (**Add Question**):
    *   **Question Text**: Type the question (e.g., "Solve for x: 2x + 4 = 10").
    *   **Options**: Fill in options A, B, C, and D.
    *   **Correct Option**: Select the radio button corresponding to the right answer.
    *   **Points**: Assign marks for this question (e.g., 5).
4.  Click **Add Question**.
5.  Repeat for all questions. The right panel shows a preview of all added questions.

### Use Case C: Publishing an Exam
**Goal**: Make the exam visible to students.
**Conditions**: An exam is initially created in "Draft" mode (Yellow status).
**Steps**:
1.  In the **CBT / Exams** list, look at the **Status** column.
2.  Click the **Draft** button.
3.  The status will change to **Published** (Green). Students can now see it.
4.  *To hide it again, click the Published button to revert to Draft.*

### Use Case D: Viewing Result Sheets
**Goal**: Analyze student performance.
**Steps**:
1.  In the **CBT / Exams** list, find the exam.
2.  Click the **Results** link (usually in blue).
3.  View the table displaying:
    *   Student Name & Admission Number.
    *   Score & Percentage.
    *   Submission Date.

---

## 3. Student Use Cases

### Use Case E: Taking an Exam
**Goal**: Complete an assigned test.
**Steps**:
1.  Log in as a **Student**.
2.  Navigate to **Online Exams** in the sidebar.
3.  Locate an exam listed as "Available".
4.  Click **Start Exam**.
5.  **The Interface**:
    *   **Timer**: A countdown appears at the top right.
    *   **Navigation**: Use the sidebar to jump between questions or "Next/Previous" buttons.
    *   **Selection**: Click an option (A-D) to select your answer.
6.  Click **Finish & Submit** when done.
    *   *Note: If the timer runs out, the exam auto-submits.*

### Use Case F: Checking Results
**Goal**: See performance feedback.
**Steps**:
1.  Immediately after submission, a Result Summary is displayed showing the Score and Percentage.
2.  Alternatively, go to **Online Exams**. Completed exams will show "Completed" status and the final score.

---

## 4. End-to-End Test Scenario (Walkthrough)

**Scenario**: *JSS 1 Intro Tech Quiz*

1.  **Teacher Action**:
    *   Creates exam "Intro Tech Quiz 1".
    *   Adds Question 1: "What is a pixel?" (Options provided, Answer A selected, 5 marks).
    *   Adds Question 2: "Which device is an input device?" (Options provided, Answer Mouse selected, 5 marks).
    *   Publishes the exam.

2.  **Student Action**:
    *   Logs in, sees "Intro Tech Quiz 1".
    *   Starts exam.
    *   Selects A for Q1.
    *   Selects Mouse for Q2.
    *   Submits.

3.  **Outcome**:
    *   Student sees "100% - Great Job!".
    *   Teacher checks results and sees "Student X: 10/10 (100%)".
