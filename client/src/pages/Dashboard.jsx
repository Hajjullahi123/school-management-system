import React, { Suspense, lazy, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useSchoolSettings from '../hooks/useSchoolSettings';
import { api } from '../api';
import { lazyRetry } from '../utils/lazyRetry';

// Loading Fallback for heavy dashboard modules
const DashboardShimmer = () => (
  <div className="space-y-4 animate-pulse">
    <div className="h-32 bg-gray-200 rounded-2xl w-full"></div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl"></div>)}
    </div>
    <div className="h-64 bg-gray-50 rounded-2xl w-full"></div>
  </div>
);

// Lazy-load individual dashboard experiences
const StudentDashboard = lazyRetry(() => import('./dashboards/StudentDashboard'));
const AdminTeacherDashboard = lazyRetry(() => import('./dashboards/AdminTeacherDashboard'));
const AccountantDashboard = lazyRetry(() => import('./dashboards/AccountantDashboard'));
const ParentDashboardWrapper = lazyRetry(() => import('./dashboards/ParentDashboardWrapper'));

const Dashboard = () => {
  const { user } = useAuth();
  const { settings: schoolSettings } = useSchoolSettings();
  const navigate = useNavigate();
  const [currentTerm, setCurrentTerm] = useState(null);
  const [currentSession, setCurrentSession] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Top-level redirections
    if (user?.role === 'superadmin') {
      navigate('/dashboard/superadmin', { replace: true });
      return;
    }
    
    if (user?.role === 'admin' && schoolSettings && !schoolSettings.isSetupComplete) {
      navigate('/dashboard/settings', { replace: true });
      return;
    }

    if (user?.role === 'alumni') {
      navigate('/dashboard/alumni', { replace: true });
      return;
    }

    // Fetch shared academic context
    const fetchContext = async () => {
      try {
        const [termsRes, sessionsRes] = await Promise.all([
          api.get('/api/terms'),
          api.get('/api/academic-sessions')
        ]);

        if (termsRes.ok && sessionsRes.ok) {
          const terms = await termsRes.json();
          const sessions = await sessionsRes.json();
          setCurrentTerm(terms.find(t => t.isCurrent) || terms[0]);
          setCurrentSession(sessions.find(s => s.isCurrent) || sessions[0]);
        }
      } catch (e) {
        console.error('Academic context error:', e);
      } finally {
        setIsInitializing(false);
      }
    };

    fetchContext();
  }, [user, navigate, schoolSettings]);

  if (isInitializing) return <DashboardShimmer />;

  return (
    <div className="max-w-7xl mx-auto">
      <Suspense fallback={<DashboardShimmer />}>
        {user?.role === 'student' && (
          <StudentDashboard user={user} currentTerm={currentTerm} currentSession={currentSession} />
        )}
        
        {['admin', 'principal', 'teacher', 'attendance_admin', 'examination_officer'].includes(user?.role) && (
          <AdminTeacherDashboard user={user} schoolSettings={schoolSettings} />
        )}

        {user?.role === 'accountant' && (
          <AccountantDashboard user={user} />
        )}

        {user?.role === 'parent' && (
          <ParentDashboardWrapper />
        )}
      </Suspense>
    </div>
  );
};

export default Dashboard;
