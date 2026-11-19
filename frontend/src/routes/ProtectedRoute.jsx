import React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import Button from '../components/common/Button';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // If unauthenticated, redirect to /login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If roles are specified and user's role is not authorized
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-6">
        <div className="w-16 h-16 rounded-2xl bg-brand-danger-light border border-brand-danger/20 flex items-center justify-center text-brand-danger mb-4 shadow-subtle">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <h2 className="text-2xl font-extrabold text-brand-navy tracking-tight mb-2">
          Access Restricted
        </h2>

        <p className="text-xs sm:text-sm text-brand-text-secondary max-w-md mb-6 leading-relaxed">
          This module is reserved exclusively for <strong className="text-brand-navy">HR Administrators</strong>. 
          You are currently signed in as <strong className="text-brand-navy">{user.name} ({user.role})</strong>.
        </p>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={ArrowLeft}
            onClick={() => navigate(-1)}
          >
            Go Back
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={Home}
            onClick={() => navigate('/dashboard')}
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return children;
}
