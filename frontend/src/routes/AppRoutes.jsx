import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import MainLayout from '../components/layout/MainLayout';

// Login and 404 are small and always needed — keep eager
import Login from '../pages/Login';
import NotFound from '../pages/NotFound';

// All authenticated pages are lazy-loaded for route-level code splitting.
// Each page becomes its own chunk, reducing initial JS parse time.
const Dashboard          = lazy(() => import('../pages/Dashboard'));
const Employees          = lazy(() => import('../pages/Employees'));
const EmployeeProfile    = lazy(() => import('../pages/EmployeeProfile'));
const Attendance         = lazy(() => import('../pages/Attendance'));
const Leaves             = lazy(() => import('../pages/Leaves'));
const Tasks              = lazy(() => import('../pages/Tasks'));
const Payroll            = lazy(() => import('../pages/Payroll'));
const Announcements      = lazy(() => import('../pages/Announcements'));
const Feedback           = lazy(() => import('../pages/Feedback'));
const Notifications      = lazy(() => import('../pages/Notifications'));
const SettingsPage       = lazy(() => import('../pages/Settings'));
const Profile            = lazy(() => import('../pages/Profile'));
const DesignSystemPreview = lazy(() => import('../pages/DesignSystemPreview'));
const VerifyEmail        = lazy(() => import('../pages/VerifyEmail'));
const AcceptInvitation   = lazy(() => import('../pages/AcceptInvitation'));

// Minimal loading fallback — matches the app's dark background to avoid flash
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Loading…</p>
      </div>
    </div>
  );
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/accept-invitation/:token" element={<AcceptInvitation />} />
        <Route path="/accept-invitation" element={<AcceptInvitation />} />

        {/* Authenticated Application Shell */}
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          {/* Default route redirect to dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Universal Modules (Accessible to HR_ADMIN & EMPLOYEE) */}
          <Route path="/dashboard"      element={<Dashboard />} />
          <Route path="/attendance"     element={<Attendance />} />
          <Route path="/leaves"         element={<Leaves />} />
          <Route path="/tasks"          element={<Tasks />} />
          <Route path="/payroll"        element={<Payroll />} />
          <Route path="/announcements"  element={<Announcements />} />
          <Route path="/feedback"       element={<Feedback />} />
          <Route path="/notifications"  element={<Notifications />} />
          <Route path="/settings"       element={<SettingsPage />} />
          <Route path="/profile"        element={<Profile />} />
          <Route path="/design-system"  element={<DesignSystemPreview />} />

          {/* HR_ADMIN Exclusive Modules */}
          <Route
            path="/employees"
            element={
              <ProtectedRoute allowedRoles={['HR_ADMIN']}>
                <Employees />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employees/:id"
            element={
              <ProtectedRoute allowedRoles={['HR_ADMIN']}>
                <EmployeeProfile />
              </ProtectedRoute>
            }
          />

          {/* 404 Catch-All within Layout */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
