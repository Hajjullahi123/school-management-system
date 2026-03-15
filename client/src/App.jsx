import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ThemeController from './components/ThemeController';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Standard imports for base/immediate routes to prevent flickering
import MarketingHome from './pages/MarketingHome';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

// Lazy load almost everything else to drastically reduce initial bundle size
const StudentList = React.lazy(() => import('./pages/StudentList'));
const ResultManager = React.lazy(() => import('./pages/ResultManager'));
const ReportCard = React.lazy(() => import('./pages/ReportCard'));
const LandingPage = React.lazy(() => import('./pages/LandingPage'));
const Contact = React.lazy(() => import('./pages/Contact'));
const NewsEvents = React.lazy(() => import('./pages/NewsEvents'));
const Gallery = React.lazy(() => import('./pages/Gallery'));
const Analytics = React.lazy(() => import('./pages/Analytics'));
const AdvancedAnalytics = React.lazy(() => import('./pages/admin/AdvancedAnalytics'));
const ExamSubmissionTracker = React.lazy(() => import('./pages/admin/ExamSubmissionTracker'));
const AttendanceTracker = React.lazy(() => import('./pages/admin/AttendanceTracker'));

const ResultEntry = React.lazy(() => import('./pages/teacher/ResultEntry'));
const TermReportCard = React.lazy(() => import('./pages/student/TermReportCard'));
const CumulativeReport = React.lazy(() => import('./pages/student/CumulativeReport'));
const ProgressiveReport = React.lazy(() => import('./pages/student/ProgressiveReport'));
const UserManagement = React.lazy(() => import('./pages/admin/UserManagement'));
const StudentManagement = React.lazy(() => import('./pages/admin/StudentManagement'));
const BulkStudentUpload = React.lazy(() => import('./pages/admin/BulkStudentUpload'));
const AcademicSetup = React.lazy(() => import('./pages/admin/AcademicSetup'));
const ClassManagement = React.lazy(() => import('./pages/admin/ClassManagement'));
const AlumniManagement = React.lazy(() => import('./pages/admin/AlumniManagement'));
const SubjectManagement = React.lazy(() => import('./pages/admin/SubjectManagement'));
const TeacherAssignments = React.lazy(() => import('./pages/admin/TeacherAssignments'));
const ClassSubjects = React.lazy(() => import('./pages/admin/ClassSubjects'));
const PromotionManager = React.lazy(() => import('./pages/admin/PromotionManager'));
const PromotionHistory = React.lazy(() => import('./pages/admin/PromotionHistory'));
const PeriodSetup = React.lazy(() => import('./pages/admin/PeriodSetup'));
const AlumniPortal = React.lazy(() => import('./pages/AlumniPortal'));
const AlumniDirectory = React.lazy(() => import('./pages/AlumniDirectory'));
const AlumniDashboard = React.lazy(() => import('./pages/alumni/AlumniDashboard'));
const AlumniLogin = React.lazy(() => import('./pages/AlumniLogin'));
const TeacherAvailability = React.lazy(() => import('./pages/admin/TeacherAvailability'));

const BulkResultUpload = React.lazy(() => import('./pages/teacher/BulkResultUpload'));
const BulkReportDownload = React.lazy(() => import('./pages/teacher/BulkReportDownload'));
const FeeManagement = React.lazy(() => import('./pages/accountant/FeeManagement'));
const FeeStructureSetup = React.lazy(() => import('./pages/admin/FeeStructureSetup'));
const MiscellaneousFees = React.lazy(() => import('./pages/admin/MiscellaneousFees'));
const MiscFeePayments = React.lazy(() => import('./pages/admin/MiscFeePayments'));
const ExamCardGenerator = React.lazy(() => import('./pages/student/ExamCardGenerator'));
const ExamCardManagement = React.lazy(() => import('./pages/admin/ExamCardManagement'));
const IDCardGenerator = React.lazy(() => import('./pages/IDCardGenerator'));
const TeacherProfile = React.lazy(() => import('./pages/teacher/TeacherProfile'));
const Settings = React.lazy(() => import('./pages/admin/Settings'));
const SystemSettings = React.lazy(() => import('./pages/admin/SystemSettings'));
const StudentFees = React.lazy(() => import('./pages/student/StudentFees'));
const PaymentVerify = React.lazy(() => import('./pages/student/PaymentVerify'));
const MyClass = React.lazy(() => import('./pages/teacher/MyClass'));
const ChangePassword = React.lazy(() => import('./pages/ChangePassword'));
const PasswordReset = React.lazy(() => import('./pages/admin/PasswordReset'));

const Attendance = React.lazy(() => import('./pages/teacher/Attendance'));
const HolidayManager = React.lazy(() => import('./pages/admin/HolidayManager'));
const Timetable = React.lazy(() => import('./pages/Timetable'));
const NoticeBoard = React.lazy(() => import('./pages/admin/NoticeBoard'));
const NewsEventsManagement = React.lazy(() => import('./pages/admin/NewsEventsManagement'));
const GalleryManagement = React.lazy(() => import('./pages/admin/GalleryManagement'));
const Homework = React.lazy(() => import('./pages/Homework'));
const LearningResources = React.lazy(() => import('./pages/LearningResources'));
const ParentManagement = React.lazy(() => import('./pages/admin/ParentManagement'));
const StudentProfile = React.lazy(() => import('./pages/student/StudentProfile'));
const ParentDashboard = React.lazy(() => import('./pages/parent/ParentDashboard'));
const ParentAttendanceView = React.lazy(() => import('./pages/parent/ParentAttendanceView'));

const ParentMessages = React.lazy(() => import('./pages/parent/ParentMessages'));
const TeacherMessages = React.lazy(() => import('./pages/teacher/TeacherMessages'));
const CBTManagement = React.lazy(() => import('./pages/cbt/CBTManagement'));
const CBTPortal = React.lazy(() => import('./pages/cbt/CBTPortal'));
const CBTQuestionBank = React.lazy(() => import('./pages/cbt/CBTQuestionBank'));
const ArrivalScanner = React.lazy(() => import('./pages/admin/ArrivalScanner'));
const StaffAttendanceReport = React.lazy(() => import('./pages/admin/StaffAttendanceReport'));
const SuperAdminDashboard = React.lazy(() => import('./pages/superadmin/SuperAdminDashboard'));
const LicenseManagement = React.lazy(() => import('./pages/superadmin/LicenseManagement'));
const QuranTracker = React.lazy(() => import('./pages/teacher/QuranTracker'));
const QuranProgress = React.lazy(() => import('./pages/student/QuranProgress'));
const ParentQuranView = React.lazy(() => import('./pages/parent/ParentQuranView'));
const DashboardLogin = React.lazy(() => import('./pages/DashboardLogin'));
const Billing = React.lazy(() => import('./pages/admin/Billing'));
const ExamConfig = React.lazy(() => import('./pages/admin/ExamConfig'));
const DemoRedirect = React.lazy(() => import('./pages/DemoRedirect'));

const TranscriptView = React.lazy(() => import('./pages/admin/TranscriptView'));
const CertificateView = React.lazy(() => import('./pages/admin/CertificateView'));
const TestimonialView = React.lazy(() => import('./pages/admin/TestimonialView'));
const BulkCertificateView = React.lazy(() => import('./pages/admin/BulkCertificateView'));
const BulkTestimonialView = React.lazy(() => import('./pages/admin/BulkTestimonialView'));
const HistoryBulkCertificateView = React.lazy(() => import('./pages/admin/HistoryBulkCertificateView'));
const HistoryBulkTestimonialView = React.lazy(() => import('./pages/admin/HistoryBulkTestimonialView'));

const TranscriptVerification = React.lazy(() => import('./pages/TranscriptVerification'));
const CertificateVerification = React.lazy(() => import('./pages/CertificateVerification'));
const TestimonialVerification = React.lazy(() => import('./pages/TestimonialVerification'));

// Global Loading Fallback
const LoadingFallback = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    <p className="mt-4 text-gray-500 font-medium font-sans">Loading page assets...</p>
  </div>
);

// Route switch: admin/exam officer get the management page, students get the generator
function ExamCardSwitch() {
  // Access user role from localStorage token to decide which component
  try {
    const token = localStorage.getItem('token');
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (['admin', 'examination_officer', 'accountant'].includes(payload.role)) {
        return <ExamCardManagement />;
      }
    }
  } catch (e) { }
  return <ExamCardGenerator />;
}

function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" reverseOrder={false} />
      <ThemeController />
      <BrowserRouter>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<MarketingHome />} />
            <Route path="/login" element={<Login />} />
            <Route path="/news-events" element={<NewsEvents />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/:schoolSlug" element={<LandingPage />} />
            <Route path="/:schoolSlug/login" element={<Login />} />
            <Route path="/alumni" element={<AlumniPortal />} />
            <Route path="/alumni/directory" element={<AlumniDirectory />} />
            <Route path="/alumni/login" element={<AlumniLogin />} />
            <Route path="/demo" element={<DemoRedirect />} />
            <Route path="/verify/transcript/:studentId" element={<TranscriptVerification />} />
            <Route path="/verify/certificate/:certificateNumber" element={<CertificateVerification />} />
            <Route path="/verify/testimonial/:testimonialNumber" element={<TestimonialVerification />} />
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
              <Route path="parent-view" element={
                <ProtectedRoute roles={['admin', 'parent', 'principal']}>
                  <ParentDashboard />
                </ProtectedRoute>
              } />
              <Route path="analytics" element={<Analytics />} />
              <Route path="advanced-analytics" element={<AdvancedAnalytics />} />
              <Route path="class-analytics" element={<AdvancedAnalytics />} />
              <Route path="attendance-tracker" element={
                <ProtectedRoute roles={['admin', 'principal', 'examination_officer']}>
                  <AttendanceTracker />
                </ProtectedRoute>
              } />
              <Route path="exam-tracker" element={
                <ProtectedRoute roles={['admin', 'principal', 'examination_officer']}>
                  <ExamSubmissionTracker />
                </ProtectedRoute>
              } />

              {/* Teacher Routes */}
              <Route path="result-entry" element={
                <ProtectedRoute roles={['admin', 'teacher', 'principal', 'examination_officer']}>
                  <ResultEntry />
                </ProtectedRoute>
              } />
              <Route path="attendance" element={
                <ProtectedRoute roles={['admin', 'teacher', 'principal']}>
                  <Attendance />
                </ProtectedRoute>
              } />
              <Route path="timetable" element={
                <ProtectedRoute roles={['admin', 'teacher', 'student', 'parent', 'principal', 'examination_officer']}>
                  <Timetable />
                </ProtectedRoute>
              } />
              <Route path="homework" element={
                <ProtectedRoute roles={['admin', 'teacher', 'student', 'principal']}>
                  <Homework />
                </ProtectedRoute>
              } />
              <Route path="resources" element={
                <ProtectedRoute roles={['admin', 'teacher', 'student', 'principal']}>
                  <LearningResources />
                </ProtectedRoute>
              } />
              <Route path="bulk-result-upload" element={
                <ProtectedRoute roles={['admin', 'teacher', 'principal', 'examination_officer']}>
                  <BulkResultUpload />
                </ProtectedRoute>
              } />
              <Route path="bulk-report-download" element={
                <ProtectedRoute roles={['admin', 'teacher', 'principal', 'examination_officer']}>
                  <BulkReportDownload />
                </ProtectedRoute>
              } />
              <Route path="cbt-management" element={
                <ProtectedRoute roles={['admin', 'teacher', 'principal', 'examination_officer']}>
                  <CBTManagement />
                </ProtectedRoute>
              } />
              <Route path="cbt-bank" element={
                <ProtectedRoute roles={['admin', 'teacher', 'principal', 'examination_officer']}>
                  <CBTQuestionBank />
                </ProtectedRoute>
              } />
              <Route path="gate-scan" element={
                <ProtectedRoute roles={['admin', 'principal', 'teacher', 'examination_officer']}>
                  <ArrivalScanner />
                </ProtectedRoute>
              } />
              <Route path="users" element={
                <ProtectedRoute roles={['admin', 'principal']}>
                  <UserManagement />
                </ProtectedRoute>
              } />
              <Route path="bulk-student-upload" element={
                <ProtectedRoute roles={['admin', 'principal']}>
                  <BulkStudentUpload />
                </ProtectedRoute>
              } />
              <Route path="staff-attendance" element={
                <ProtectedRoute roles={['admin', 'principal', 'examination_officer']}>
                  <StaffAttendanceReport />
                </ProtectedRoute>
              } />
              <Route path="teacher/messages" element={
                <ProtectedRoute roles={['admin', 'teacher', 'principal']}>
                  <TeacherMessages />
                </ProtectedRoute>
              } />
              <Route path="quran-tracker" element={
                <ProtectedRoute roles={['admin', 'teacher', 'principal']}>
                  <QuranTracker />
                </ProtectedRoute>
              } />

              {/* Student Routes */}
              <Route path="term-report" element={
                <ProtectedRoute roles={['admin', 'student', 'teacher', 'parent', 'principal', 'examination_officer']}>
                  <TermReportCard />
                </ProtectedRoute>
              } />
              <Route path="cumulative-report" element={
                <ProtectedRoute roles={['admin', 'student', 'teacher', 'parent', 'principal', 'examination_officer']}>
                  <CumulativeReport />
                </ProtectedRoute>
              } />
              <Route path="progressive-report" element={
                <ProtectedRoute roles={['admin', 'student', 'teacher', 'parent', 'principal', 'examination_officer']}>
                  <ProgressiveReport />
                </ProtectedRoute>
              } />
              <Route path="exam-card" element={
                <ProtectedRoute roles={['student', 'admin', 'accountant', 'teacher', 'examination_officer']}>
                  <ExamCardSwitch />
                </ProtectedRoute>
              } />
              <Route path="quran-progress" element={
                <ProtectedRoute roles={['student']}>
                  <QuranProgress />
                </ProtectedRoute>
              } />
              <Route path="id-card" element={
                <ProtectedRoute roles={['admin', 'teacher', 'student', 'examination_officer']}>
                  <IDCardGenerator />
                </ProtectedRoute>
              } />
              <Route path="profile" element={
                <ProtectedRoute roles={['admin', 'teacher', 'principal', 'examination_officer']}>
                  <TeacherProfile />
                </ProtectedRoute>
              } />
              <Route path="student/profile" element={
                <ProtectedRoute roles={['student', 'parent', 'principal']}>
                  <StudentProfile />
                </ProtectedRoute>
              } />
              <Route path="my-class" element={
                <ProtectedRoute roles={['admin', 'teacher', 'principal']}>
                  <MyClass />
                </ProtectedRoute>
              } />
              <Route path="student/fees" element={
                <ProtectedRoute roles={['student', 'parent', 'principal']}>
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
              <Route path="alumni" element={
                <ProtectedRoute roles={['alumni', 'admin']}>
                  <AlumniDashboard />
                </ProtectedRoute>
              } />

              {/* Parent Routes */}
              <Route path="parent/attendance" element={
                <ProtectedRoute roles={['admin', 'parent', 'principal']}>
                  <ParentAttendanceView />
                </ProtectedRoute>
              } />
              <Route path="parent/messages" element={
                <ProtectedRoute roles={['admin', 'parent', 'principal']}>
                  <ParentMessages />
                </ProtectedRoute>
              } />
              <Route path="parent/quran" element={
                <ProtectedRoute roles={['admin', 'parent', 'principal']}>
                  <ParentQuranView />
                </ProtectedRoute>
              } />

              {/* Accountant Routes */}
              <Route path="fees" element={
                <ProtectedRoute roles={['admin', 'accountant', 'principal']}>
                  <FeeManagement />
                </ProtectedRoute>
              } />
              <Route path="fee-structure" element={
                <ProtectedRoute roles={['admin', 'accountant', 'principal']}>
                  <FeeStructureSetup />
                </ProtectedRoute>
              } />
              <Route path="misc-fees" element={
                <ProtectedRoute roles={['admin', 'accountant', 'principal']}>
                  <MiscellaneousFees />
                </ProtectedRoute>
              } />
              <Route path="misc-fee-payments" element={
                <ProtectedRoute roles={['admin', 'accountant', 'principal']}>
                  <MiscFeePayments />
                </ProtectedRoute>
              } />

              {/* Admin Routes */}
              <Route path="users" element={
                <ProtectedRoute roles={['admin', 'principal']}>
                  <UserManagement />
                </ProtectedRoute>
              } />
              <Route path="student-management" element={
                <ProtectedRoute roles={['admin', 'principal']}>
                  <StudentManagement />
                </ProtectedRoute>
              } />
              <Route path="promotions" element={
                <ProtectedRoute roles={['admin', 'principal', 'examination_officer']}>
                  <PromotionManager />
                </ProtectedRoute>
              } />
              <Route path="holidays" element={
                <ProtectedRoute roles={['admin', 'principal', 'examination_officer']}>
                  <HolidayManager />
                </ProtectedRoute>
              } />
              <Route path="promotion-history" element={
                <ProtectedRoute roles={['admin', 'principal', 'examination_officer']}>
                  <PromotionHistory />
                </ProtectedRoute>
              } />
              <Route path="academic-setup" element={
                <ProtectedRoute roles={['admin', 'principal']}>
                  <AcademicSetup />
                </ProtectedRoute>
              } />
              <Route path="class-management" element={
                <ProtectedRoute roles={['admin', 'principal']}>
                  <ClassManagement />
                </ProtectedRoute>
              } />
              <Route path="period-setup" element={
                <ProtectedRoute roles={['admin', 'principal']}>
                  <PeriodSetup />
                </ProtectedRoute>
              } />
              <Route path="subject-management" element={
                <ProtectedRoute roles={['admin', 'principal']}>
                  <SubjectManagement />
                </ProtectedRoute>
              } />
              <Route path="teacher-assignments" element={
                <ProtectedRoute roles={['admin', 'principal']}>
                  <TeacherAssignments />
                </ProtectedRoute>
              } />
              <Route path="teacher-availability" element={
                <ProtectedRoute roles={['admin', 'principal']}>
                  <TeacherAvailability />
                </ProtectedRoute>
              } />
              <Route path="class-subjects" element={
                <ProtectedRoute roles={['admin', 'principal']}>
                  <ClassSubjects />
                </ProtectedRoute>
              } />

              <Route path="manage-notices" element={
                <ProtectedRoute roles={['admin', 'principal', 'examination_officer']}>
                  <NoticeBoard />
                </ProtectedRoute>
              } />
              <Route path="manage-parents" element={
                <ProtectedRoute roles={['admin', 'principal']}>
                  <ParentManagement />
                </ProtectedRoute>
              } />
              <Route path="alumni-management" element={
                <ProtectedRoute roles={['admin', 'principal', 'examination_officer']}>
                  <AlumniManagement />
                </ProtectedRoute>
              } />
              <Route path="transcript/:studentId" element={
                <ProtectedRoute roles={['admin', 'principal']}>
                  <TranscriptView />
                </ProtectedRoute>
              } />
              <Route path="certificate/:studentId" element={
                <ProtectedRoute roles={['admin', 'principal']}>
                  <CertificateView />
                </ProtectedRoute>
              } />
              <Route path="testimonial/:studentId" element={
                <ProtectedRoute roles={['admin', 'principal']}>
                  <TestimonialView />
                </ProtectedRoute>
              } />
              <Route path="bulk-certificates/:year" element={
                <ProtectedRoute roles={['admin', 'principal']}>
                  <BulkCertificateView />
                </ProtectedRoute>
              } />
              <Route path="bulk-testimonials/:year" element={
                <ProtectedRoute roles={['admin', 'principal']}>
                  <BulkTestimonialView />
                </ProtectedRoute>
              } />
              <Route path="history-bulk-certificates/:classId/:sessionId" element={
                <ProtectedRoute roles={['admin', 'principal']}>
                  <HistoryBulkCertificateView />
                </ProtectedRoute>
              } />
              <Route path="history-bulk-testimonials/:classId/:sessionId" element={
                <ProtectedRoute roles={['admin', 'principal']}>
                  <HistoryBulkTestimonialView />
                </ProtectedRoute>
              } />
              <Route path="advanced-analytics" element={
                <ProtectedRoute roles={['admin', 'teacher', 'principal', 'examination_officer']}>
                  <AdvancedAnalytics />
                </ProtectedRoute>
              } />
              <Route path="settings" element={
                <ProtectedRoute roles={['admin']}>
                  <Settings />
                </ProtectedRoute>
              } />
              <Route path="billing" element={
                <ProtectedRoute roles={['admin']}>
                  <Billing />
                </ProtectedRoute>
              } />
              <Route path="system-settings" element={
                <ProtectedRoute roles={['admin']}>
                  <SystemSettings />
                </ProtectedRoute>
              } />
              <Route path="news-events-management" element={
                <ProtectedRoute roles={['admin', 'principal', 'examination_officer']}>
                  <NewsEventsManagement />
                </ProtectedRoute>
              } />
              <Route path="gallery-management" element={
                <ProtectedRoute roles={['admin', 'principal', 'examination_officer']}>
                  <GalleryManagement />
                </ProtectedRoute>
              } />
              <Route path="password-reset" element={
                <ProtectedRoute roles={['admin', 'principal']}>
                  <PasswordReset />
                </ProtectedRoute>
              } />
              <Route path="exam-tracker" element={
                <ProtectedRoute roles={['admin', 'principal', 'examination_officer']}>
                  <ExamSubmissionTracker />
                </ProtectedRoute>
              } />
              <Route path="exam-config" element={
                <ProtectedRoute roles={['admin', 'principal', 'examination_officer']}>
                  <ExamConfig />
                </ProtectedRoute>
              } />

              <Route path="superadmin" element={
                <ProtectedRoute roles={['superadmin']}>
                  <SuperAdminDashboard />
                </ProtectedRoute>
              } />

              <Route path="license-management" element={
                <ProtectedRoute roles={['superadmin']}>
                  <LicenseManagement />
                </ProtectedRoute>
              } />

              {/* Common Routes - All authenticated users */}
              <Route path="change-password" element={<ChangePassword />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider >
  );
}

export default App;
