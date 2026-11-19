import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import HRPayrollAdminView from '../components/payroll/HRPayrollAdminView';
import EmployeePayrollView from '../components/payroll/EmployeePayrollView';
import { ShieldCheck, UserCheck, BadgeDollarSign } from 'lucide-react';

export default function Payroll() {
  const { user } = useAuth();

  // Allow toggling view mode during demo testing, defaulting to logged-in user's role
  const initialRole = user?.role === 'HR_ADMIN' ? 'HR_ADMIN' : 'EMPLOYEE';
  const [activeRoleView, setActiveRoleView] = useState(initialRole);

  // Sync if logged-in user changes
  useEffect(() => {
    setActiveRoleView(user?.role === 'HR_ADMIN' ? 'HR_ADMIN' : 'EMPLOYEE');
  }, [user?.role]);

  return (
    <div className="space-y-4">
      {/* Demo Perspective Switcher Bar */}
      <div className="bg-white border border-slate-200/80 rounded-xl px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <BadgeDollarSign className="w-4 h-4 text-brand-blue shrink-0" />
          <span>
            Active View Perspective:{' '}
            <strong className="text-brand-navy">
              {activeRoleView === 'HR_ADMIN'
                ? 'HR Administrator (Alex Morgan) — Global Operations'
                : 'Employee Self-Service (Jordan Lee) — Confidential Portal'}
            </strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveRoleView('HR_ADMIN')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeRoleView === 'HR_ADMIN'
                ? 'bg-brand-navy text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admin Payroll Operations</span>
          </button>

          <button
            onClick={() => setActiveRoleView('EMPLOYEE')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeRoleView === 'EMPLOYEE'
                ? 'bg-brand-blue text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>My Salary & Payslips</span>
          </button>
        </div>
      </div>

      {/* Render selected view */}
      {activeRoleView === 'HR_ADMIN' ? (
        <HRPayrollAdminView />
      ) : (
        <EmployeePayrollView />
      )}
    </div>
  );
}
