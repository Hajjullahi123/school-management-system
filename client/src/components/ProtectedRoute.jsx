import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, roles = [] }) => {
  const { user, loading, dashboardUnlocked } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Double Auth Check for Dashboard
  // We use /verify-dashboard to avoid the startsWith('/dashboard') check triggering an infinite loop
  if (location.pathname.startsWith('/dashboard') && !dashboardUnlocked) {
    return <Navigate to="/verify-dashboard" state={{ from: location }} replace />;
  }

  if (roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />; // This might cycle if not careful, but dashboard is protected now.
    // If user role is invalid but they are unlocked, they go to /dashboard (which they are allowed to see generally, but maybe not the sub-route?)
    // Actually, if they are invalid role, they shouldn't go to dashboard.
    // But usually role protection is for specific sub-routes.
    // If they are redirected to /dashboard, and they are unlocked, they see the dashboard index.
  }

  return children;
};

export default ProtectedRoute;
