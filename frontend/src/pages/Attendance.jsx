import React from 'react';
import { useAuth } from '../context/AuthContext';
import HRAttendanceAdminView from '../components/attendance/HRAttendanceAdminView';
import EmployeeAttendanceView from '../components/attendance/EmployeeAttendanceView';

export default function Attendance() {
  const { user } = useAuth();

  // Role segregation: HR_ADMIN gets organizational roster & reports; EMPLOYEE gets personal punch clock
  if (user?.role === 'HR_ADMIN') {
    return <HRAttendanceAdminView />;
  }

  return <EmployeeAttendanceView />;
}
