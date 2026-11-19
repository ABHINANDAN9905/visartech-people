import React from 'react';
import { useAuth } from '../context/AuthContext';
import HRAdminDashboard from './admin/HRAdminDashboard';
import EmployeeDashboard from './employee/EmployeeDashboard';

export default function Dashboard() {
  const { user } = useAuth();

  if (user?.role === 'HR_ADMIN') {
    return <HRAdminDashboard />;
  }

  return <EmployeeDashboard />;
}
