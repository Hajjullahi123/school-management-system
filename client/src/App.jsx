import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import StudentList from './pages/StudentList';
import ResultManager from './pages/ResultManager';
import ReportCard from './pages/ReportCard';
import LandingPage from './pages/LandingPage';
import NewsEvents from './pages/NewsEvents';
import Gallery from './pages/Gallery';
import Analytics from './pages/Analytics';
import AdvancedAnalytics from './pages/admin/AdvancedAnalytics';
import ThemeController from './components/ThemeController';

import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import ResultEntry from './pages/teacher/ResultEntry';
import TermReportCard from './pages/student/TermReportCard';
import CumulativeReport from './pages/student/CumulativeReport';
import ProgressiveReport from './pages/student/ProgressiveReport';
import UserManagement from './pages/admin/UserManagement';
import StudentManagement from './pages/admin/StudentManagement';
import AcademicSetup from './pages/admin/AcademicSetup';
import ClassManagement from './pages/admin/ClassManagement';
import AlumniManagement from './pages/admin/AlumniManagement';
import SubjectManagement from './pages/admin/SubjectManagement';
import TeacherAssignments from './pages/admin/TeacherAssignments';
import ClassSubjects from './pages/admin/ClassSubjects';
import PromotionManager from './pages/admin/PromotionManager';
import PromotionHistory from './pages/admin/PromotionHistory';
import AlumniPortal from './pages/AlumniPortal';
import AlumniDirectory from './pages/AlumniDirectory';
import AlumniDashboard from './pages/alumni/AlumniDashboard';
import AlumniLogin from './pages/AlumniLogin';

import BulkResultUpload from './pages/teacher/BulkResultUpload';
import BulkReportDownload from './pages/teacher/BulkReportDownload';
import FeeManagement from './pages/accountant/FeeManagement';
import FeeStructureSetup from './pages/admin/FeeStructureSetup';
import ExamCardGenerator from './pages/student/ExamCardGenerator';
import IDCardGenerator from './pages/IDCardGenerator';
import TeacherProfile from './pages/teacher/TeacherProfile';
import Settings from './pages/admin/Settings';
import SystemSettings from './pages/admin/SystemSettings';
import StudentFees from './pages/student/StudentFees';
import PaymentVerify from './pages/student/PaymentVerify';
import MyClass from './pages/teacher/MyClass';
import ChangePassword from './pages/ChangePassword';
import PasswordReset from './pages/admin/PasswordReset';

import Attendance from './pages/teacher/Attendance';
import Timetable from './pages/Timetable';
import NoticeBoard from './pages/admin/NoticeBoard';
import NewsEventsManagement from './pages/admin/NewsEventsManagement';
import GalleryManagement from './pages/admin/GalleryManagement';
import Homework from './pages/Homework';
import LearningResources from './pages/LearningResources';
import ParentManagement from './pages/admin/ParentManagement';
import StudentProfile from './pages/student/StudentProfile';
import ParentAttendanceView from './pages/parent/ParentAttendanceView';
import ParentMessages from './pages/parent/ParentMessages';
import TeacherMessages from './pages/teacher/TeacherMessages';
import CBTManagement from './pages/cbt/CBTManagement';
import CBTPortal from './pages/cbt/CBTPortal';
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
import QuranTracker from './pages/teacher/QuranTracker';
import QuranProgress from './pages/student/QuranProgress';
import ParentQuranView from './pages/parent/ParentQuranView';
import DashboardLogin from './pages/DashboardLogin';


function App() {
  return (
    <AuthProvider>
      <ThemeController />
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/news-events" element={<NewsEvents />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/alumni" element={<AlumniPortal />} />
          <Route path="/alumni/directory" element={<AlumniDirectory />} />
          <Route path="/alumni/login" element={<AlumniLogin />} />
          <Route path="/superadmin" element={<Navigate to="/dashboard/superadmin" replace />} />

          {/* 404 Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />

          {/* Protected School Landing Page - After Login */}
          <Route path="/school-home" element={
            <ProtectedRoute>
              <LandingPage />
            </ProtectedRoute>
          } />

          {/* New Intermediate Login Page */}
          <Route path="/verify-dashboard" element={
            <ProtectedRoute>
              <DashboardLogin />
            </ProtectedRoute>
          } />

          {/* Protected Routes - Personal Dashboards */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="students" element={<StudentList />} />
            <Route path="results" element={<ResultManager />} />
            <Route path="report-card" element={<ReportCard />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="advanced-analytics" element={<AdvancedAnalytics />} />
            <Route path="class-analytics" element={<AdvancedAnalytics />} />

            {/* Teacher Routes */}
            <Route path="result-entry" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <ResultEntry />
              </ProtectedRoute>
            } />
            <Route path="attendance" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <Attendance />
              </ProtectedRoute>
            } />
            <Route path="timetable" element={
              <ProtectedRoute roles={['admin', 'teacher', 'student', 'parent']}>
                <Timetable />
              </ProtectedRoute>
            } />
            <Route path="homework" element={
              <ProtectedRoute roles={['admin', 'teacher', 'student']}>
                <Homework />
              </ProtectedRoute>
            } />
            <Route path="resources" element={
              <ProtectedRoute roles={['admin', 'teacher', 'student']}>
                <LearningResources />
              </ProtectedRoute>
            } />
            <Route path="bulk-result-upload" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <BulkResultUpload />
              </ProtectedRoute>
            } />
            <Route path="bulk-report-download" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <BulkReportDownload />
              </ProtectedRoute>
            } />
            <Route path="cbt-management" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <CBTManagement />
              </ProtectedRoute>
            } />
            <Route path="teacher/messages" element={
              <ProtectedRoute roles={['teacher']}>
                <TeacherMessages />
              </ProtectedRoute>
            } />
            <Route path="quran-tracker" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <QuranTracker />
              </ProtectedRoute>
            } />

            {/* Student Routes */}
            <Route path="term-report" element={
              <ProtectedRoute roles={['admin', 'student', 'teacher', 'parent']}>
                <TermReportCard />
              </ProtectedRoute>
            } />
            <Route path="cumulative-report" element={
              <ProtectedRoute roles={['admin', 'student', 'teacher', 'parent']}>
                <CumulativeReport />
              </ProtectedRoute>
            } />
            <Route path="progressive-report" element={
              <ProtectedRoute roles={['admin', 'student', 'teacher']}>
                <ProgressiveReport />
              </ProtectedRoute>
            } />
            <Route path="exam-card" element={
              <ProtectedRoute roles={['student', 'admin', 'accountant', 'teacher']}>
                <ExamCardGenerator />
              </ProtectedRoute>
            } />
            <Route path="quran-progress" element={
              <ProtectedRoute roles={['student']}>
                <QuranProgress />
              </ProtectedRoute>
            } />
            <Route path="id-card" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <IDCardGenerator />
              </ProtectedRoute>
            } />
            <Route path="profile" element={
              <ProtectedRoute roles={['teacher']}>
                <TeacherProfile />
              </ProtectedRoute>
            } />
            <Route path="student/profile" element={
              <ProtectedRoute roles={['student']}>
                <StudentProfile />
              </ProtectedRoute>
            } />
            <Route path="my-class" element={
              <ProtectedRoute roles={['teacher']}>
                <MyClass />
              </ProtectedRoute>
            } />
            <Route path="student/fees" element={
              <ProtectedRoute roles={['student']}>
                <StudentFees />
              </ProtectedRoute>
            } />
            <Route path="student/fees/verify" element={
              <ProtectedRoute roles={['student']}>
                <PaymentVerify />
              </ProtectedRoute>
            } />
            <Route path="cbt-portal" element={
              <ProtectedRoute roles={['student']}>
                <CBTPortal />
              </ProtectedRoute>
            } />
            <Route path="alumni/dashboard" element={
              <ProtectedRoute roles={['student', 'admin']}>
                <AlumniDashboard />
              </ProtectedRoute>
            } />

            {/* Parent Routes */}
            <Route path="parent/attendance" element={
              <ProtectedRoute roles={['parent']}>
                <ParentAttendanceView />
              </ProtectedRoute>
            } />
            <Route path="parent/messages" element={
              <ProtectedRoute roles={['parent']}>
                <ParentMessages />
              </ProtectedRoute>
            } />
            <Route path="parent/quran" element={
              <ProtectedRoute roles={['parent']}>
                <ParentQuranView />
              </ProtectedRoute>
            } />

            {/* Accountant Routes */}
            <Route path="fees" element={
              <ProtectedRoute roles={['admin', 'accountant']}>
                <FeeManagement />
              </ProtectedRoute>
            } />
            <Route path="fee-structure" element={
              <ProtectedRoute roles={['admin', 'accountant']}>
                <FeeStructureSetup />
              </ProtectedRoute>
            } />

            {/* Admin Routes */}
            <Route path="users" element={
              <ProtectedRoute roles={['admin']}>
                <UserManagement />
              </ProtectedRoute>
            } />
            <Route path="student-management" element={
              <ProtectedRoute roles={['admin']}>
                <StudentManagement />
              </ProtectedRoute>
            } />
            <Route path="promotions" element={
              <ProtectedRoute roles={['admin']}>
                <PromotionManager />
              </ProtectedRoute>
            } />
            <Route path="promotion-history" element={
              <ProtectedRoute roles={['admin']}>
                <PromotionHistory />
              </ProtectedRoute>
            } />
            <Route path="academic-setup" element={
              <ProtectedRoute roles={['admin']}>
                <AcademicSetup />
              </ProtectedRoute>
            } />
            <Route path="class-management" element={
              <ProtectedRoute roles={['admin']}>
                <ClassManagement />
              </ProtectedRoute>
            } />
            <Route path="subject-management" element={
              <ProtectedRoute roles={['admin']}>
                <SubjectManagement />
              </ProtectedRoute>
            } />
            <Route path="teacher-assignments" element={
              <ProtectedRoute roles={['admin']}>
                <TeacherAssignments />
              </ProtectedRoute>
            } />
            <Route path="class-subjects" element={
              <ProtectedRoute roles={['admin']}>
                <ClassSubjects />
              </ProtectedRoute>
            } />

            <Route path="manage-notices" element={
              <ProtectedRoute roles={['admin']}>
                <NoticeBoard />
              </ProtectedRoute>
            } />
            <Route path="manage-parents" element={
              <ProtectedRoute roles={['admin']}>
                <ParentManagement />
              </ProtectedRoute>
            } />
            <Route path="alumni-management" element={
              <ProtectedRoute roles={['admin']}>
                <AlumniManagement />
              </ProtectedRoute>
            } />
            <Route path="advanced-analytics" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <AdvancedAnalytics />
              </ProtectedRoute>
            } />
            <Route path="settings" element={
              <ProtectedRoute roles={['admin']}>
                <Settings />
              </ProtectedRoute>
            } />
            <Route path="system-settings" element={
              <ProtectedRoute roles={['admin']}>
                <SystemSettings />
              </ProtectedRoute>
            } />
            <Route path="news-events-management" element={
              <ProtectedRoute roles={['admin']}>
                <NewsEventsManagement />
              </ProtectedRoute>
            } />
            <Route path="gallery-management" element={
              <ProtectedRoute roles={['admin']}>
                <GalleryManagement />
              </ProtectedRoute>
            } />
            <Route path="password-reset" element={
              <ProtectedRoute roles={['admin']}>
                <PasswordReset />
              </ProtectedRoute>
            } />

            <Route path="superadmin" element={
              <ProtectedRoute roles={['superadmin']}>
                <SuperAdminDashboard />
              </ProtectedRoute>
            } />

            {/* Common Routes - All authenticated users */}
            <Route path="change-password" element={<ChangePassword />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
