import React, { useState, useEffect, useMemo } from 'react';
import {
  BadgeDollarSign,
  Download,
  FileText,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building2,
  Printer,
  Calendar,
  Lock,
  ArrowRight
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { getEmployees, getEmployeeById } from '../../services/employeeService';
import {
  getEmployeePayrollHistory,
  getEmployeeSalaryStructure,
  calculateSalaryComponents,
  formatCurrency,
  fetchMyPayrollFromBackend,
  fetchEmployeeSalaryStructureFromBackend,
} from '../../services/payrollService';
import { formatChicagoDate, getChicagoGreeting } from '../../utils/timezone';

import PageHeader from '../common/PageHeader';
import StatCard from '../common/StatCard';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Card, { CardHeader, CardTitle, CardDescription, CardBody, CardFooter } from '../common/Card';
import PayslipModal from './PayslipModal';

export default function EmployeePayrollView() {
  const { user } = useAuth();

  // Find corresponding fictional employee record (Jordan Lee - EMP-006)
  const currentEmployee = useMemo(() => {
    const list = getEmployees();
    return (
      list.find((e) => e.email === user?.email || e.id === user?.id) ||
      getEmployeeById('EMP-006') ||
      list[0]
    );
  }, [user]);

  const employeeId = currentEmployee?.id || 'EMP-006';

  // State
  const [history, setHistory] = useState(() => getEmployeePayrollHistory(employeeId));
  const [structure, setStructure] = useState(() => getEmployeeSalaryStructure(employeeId));
  const [selectedPayslip, setSelectedPayslip] = useState(null);

  // Sync state on 'payroll-updated' and fetch from backend
  useEffect(() => {
    let isMounted = true;
    async function syncBackendEmployeePayroll() {
      try {
        const liveMyRecords = await fetchMyPayrollFromBackend();
        if (isMounted && Array.isArray(liveMyRecords) && liveMyRecords.length > 0) {
          const mapped = liveMyRecords.map((r) => ({
            id: r.payrollId || r._id,
            payrollId: r.payrollId,
            payrollMonth: r.payrollMonth,
            payrollMonthLabel: r.payrollMonth === '2026-11' ? 'November 2026' : r.payrollMonth,
            employeeId: r.employeeId,
            employeeName: r.employeeName || `${user?.name || 'Jordan Lee'}`,
            department: r.department || 'Engineering',
            employeeRole: r.designation || 'Team Member',
            basicSalary: r.basicSalary,
            housingAllowance: Math.round(r.allowances * 0.6) || 0,
            otherAllowances: Math.round(r.allowances * 0.2) || 0,
            bonus: Math.round(r.allowances * 0.2) || 0,
            taxDeduction: Math.round(r.deductions * 0.8) || 0,
            otherDeductions: Math.round(r.deductions * 0.2) || 0,
            grossSalary: r.grossSalary,
            totalDeductions: r.deductions,
            netSalary: r.netSalary,
            paymentStatus: r.paymentStatus,
            disbursementDate: r.disbursementDate || `${r.payrollMonth}-30`,
            paidAt: r.paidAt,
            paymentMethod: 'Direct Deposit • Demo',
            bankName: 'JPMorgan Chase (Demo)',
            accountNumber: '•••• •••• 6192',
          }));
          setHistory(mapped);
        }
        const liveStruct = await fetchEmployeeSalaryStructureFromBackend(employeeId);
        if (isMounted && liveStruct) {
          setStructure(liveStruct);
        }
      } catch (err) {
        console.warn('Backend sync failed in EmployeePayrollView:', err);
      }
    }
    syncBackendEmployeePayroll();

    const handleUpdate = () => {
      setHistory(getEmployeePayrollHistory(employeeId));
      setStructure(getEmployeeSalaryStructure(employeeId));
    };

    window.addEventListener('payroll-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('payroll-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [employeeId]);

  // Greeting
  const greeting = useMemo(() => getChicagoGreeting(), []);
  const todayChicagoDate = useMemo(() => formatChicagoDate(), []);

  // Calculated package breakdown
  const packageCalc = useMemo(() => {
    return calculateSalaryComponents(structure);
  }, [structure]);

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions */}
      <PageHeader
        title="My Salary &amp; Payslips"
        subtitle={`${greeting}, ${currentEmployee.name}. Inspect your monthly compensation breakdowns, download official payslips, and review direct deposit details.`}
        badge={<Badge variant="primary" dot>Confidential Portal</Badge>}
        breadcrumbs={[
          { label: 'My Workspace', href: '#' },
          { label: 'Salary & Payslips' },
        ]}
      />

      {/* Confidentiality & Security Notice Bar */}
      <div className="p-4 bg-brand-navy rounded-2xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-blue-300 shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-300">
              Personal Compensation Privacy
            </span>
            <p className="text-xs text-slate-300 leading-relaxed">
              This portal is strictly encrypted and scoped to your profile (<strong>{currentEmployee.name} &bull; {employeeId}</strong>). Only you and authorized HR payroll administrators can inspect these records.
            </p>
          </div>
        </div>
        <Badge variant="navy" size="sm" className="bg-white/10 text-white border-white/20 shrink-0">
          Demo Protected
        </Badge>
      </div>

      {/* 2. Personal Compensation Package Cards (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Base Monthly Salary"
          value={formatCurrency(packageCalc.basicSalary)}
          icon={BadgeDollarSign}
          iconColor="blue"
          trend="Standard Rate"
          trendType="neutral"
          description="Contracted base salary"
        />
        <StatCard
          title="Total Monthly Allowances"
          value={formatCurrency(packageCalc.totalAllowances)}
          icon={Building2}
          iconColor="emerald"
          description={`Housing: ${formatCurrency(packageCalc.housingAllowance)}`}
        />
        <StatCard
          title="Typical Deductions"
          value={`-${formatCurrency(packageCalc.totalDeductions)}`}
          icon={FileText}
          iconColor="rose"
          description={`Tax &amp; Benefits withholding`}
        />
        <StatCard
          title="Monthly Take-Home Pay"
          value={formatCurrency(packageCalc.netSalary)}
          icon={CheckCircle2}
          iconColor="emerald"
          trend="Direct Deposit"
          trendType="up"
          description="Net deposited to bank"
        />
      </div>

      {/* 3. Direct Deposit & Bank Particulars Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-brand-navy">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Designated Bank</span>
            <span className="font-bold text-slate-900">{structure.bankName || 'Chase Bank Chicago'}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-brand-navy">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Routing Account Mask</span>
            <span className="font-mono font-bold text-slate-900">{structure.accountNumberMasked || '••••4821'}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Disbursement Schedule</span>
            <span className="font-bold text-emerald-700">Last Working Day of Month</span>
          </div>
        </div>
      </div>

      {/* 4. Historical Payslips Register Table */}
      <Card>
        <CardHeader className="border-b border-slate-100 pb-4">
          <div>
            <CardTitle>My Historical Digital Payslips</CardTitle>
            <CardDescription>
              Access and download official compensation statements for your records or tax verification.
            </CardDescription>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {history.length === 0 ? (
            <div className="py-16 text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-brand-navy">No payslips generated yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Your compensation records will appear here as each monthly payroll cycle is executed by HR.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Pay Period</th>
                    <th className="py-3 px-4">Disbursement Date</th>
                    <th className="py-3 px-4">Gross Earnings</th>
                    <th className="py-3 px-4">Total Deductions</th>
                    <th className="py-3 px-4">Net Take-Home</th>
                    <th className="py-3 px-4">Payment Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {history.map((rec) => {
                    const isPaid = rec.paymentStatus === 'PAID';

                    return (
                      <tr key={rec.id} className="hover:bg-slate-50/50 transition">
                        {/* Month */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-bold text-slate-900">{rec.payrollMonthLabel}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{rec.id}</div>
                        </td>

                        {/* Date */}
                        <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-800">
                          {rec.disbursementDate}
                        </td>

                        {/* Gross */}
                        <td className="py-3.5 px-4 whitespace-nowrap font-semibold text-brand-navy">
                          {formatCurrency(rec.grossSalary)}
                        </td>

                        {/* Deductions */}
                        <td className="py-3.5 px-4 whitespace-nowrap font-medium text-rose-600">
                          -{formatCurrency(rec.totalDeductions)}
                        </td>

                        {/* Net Pay */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="text-sm font-black text-brand-blue font-mono">
                            {formatCurrency(rec.netSalary)}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isPaid ? (
                            <Badge variant="success" dot size="sm">
                              Disbursed (Paid)
                            </Badge>
                          ) : (
                            <Badge variant="warning" dot size="sm">
                              Processing
                            </Badge>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <Button
                            variant="primary"
                            size="sm"
                            leftIcon={FileText}
                            className="h-7 px-3 text-xs"
                            onClick={() => setSelectedPayslip(rec)}
                          >
                            View &amp; Print Payslip
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
        <CardFooter className="bg-slate-50/50 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
          <span>Showing {history.length} issued compensation records.</span>
          <span className="text-[11px] text-slate-400">Currency: USD ($) &bull; America/Chicago schedules</span>
        </CardFooter>
      </Card>

      {/* 5. Payslip Modal Viewer */}
      <PayslipModal
        isOpen={Boolean(selectedPayslip)}
        onClose={() => setSelectedPayslip(null)}
        payrollRecord={selectedPayslip}
      />
    </div>
  );
}
