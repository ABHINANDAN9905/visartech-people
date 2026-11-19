import React, { useState, useEffect, useMemo } from 'react';
import {
  BadgeDollarSign,
  Download,
  Plus,
  ShieldCheck,
  FileText,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  ArrowUpDown,
  Building2,
  User,
  Sliders,
  Printer,
  TrendingUp,
  PieChart as PieIcon,
  BarChart3,
  Edit,
  Eye,
  Check,
  X,
  AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';

import { useAuth } from '../../context/AuthContext';
import { getEmployees } from '../../services/employeeService';
import {
  getStoredPayrollRecords,
  getStoredSalaryStructures,
  getPayrollKPIs,
  getPayrollReportData,
  formatCurrency,
  updatePaymentStatus,
  generateMonthlyPayroll,
  configureSalaryStructure,
  calculateSalaryComponents,
  fetchPayrollFromBackend,
  fetchSalaryStructuresFromBackend,
  processPayrollPaymentBackend,
  generateMonthlyPayrollBackend,
  configureSalaryStructureBackend,
} from '../../services/payrollService';
import { formatChicagoDate, getChicagoGreeting } from '../../utils/timezone';

import PageHeader from '../common/PageHeader';
import StatCard from '../common/StatCard';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Card, { CardHeader, CardTitle, CardDescription, CardBody, CardFooter } from '../common/Card';
import Modal from '../common/Modal';
import Avatar from '../common/Avatar';
import SearchInput from '../common/SearchInput';
import Input from '../common/Input';
import PayslipModal from './PayslipModal';

export default function HRPayrollAdminView() {
  const { user } = useAuth();

  // Active Tab
  const [activeTab, setActiveTab] = useState('register'); // 'register' | 'structures' | 'reports'

  // Selected Payroll Month
  const [selectedMonth, setSelectedMonth] = useState('2026-11');

  // Centralized State
  const [records, setRecords] = useState(() => getStoredPayrollRecords());
  const [structures, setStructures] = useState(() => getStoredSalaryStructures());
  const [kpis, setKpis] = useState(() => getPayrollKPIs(selectedMonth));
  const [reportData, setReportData] = useState(() => getPayrollReportData());
  const [employees, setEmployees] = useState(() => getEmployees());

  // Filters for Table
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('NET_DESC'); // 'NET_DESC' | 'NET_ASC' | 'NAME_ASC'

  // Modals
  const [activePayslipRecord, setActivePayslipRecord] = useState(null);
  const [isRunPayrollModalOpen, setIsRunPayrollModalOpen] = useState(false);
  const [editStructureTarget, setEditStructureTarget] = useState(null); // structure object

  // Form states
  const [runMonthInput, setRunMonthInput] = useState('2026-11');
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionAlert, setActionAlert] = useState(null); // { type: 'success' | 'error', message: '' }

  // Sync state on 'payroll-updated'
  useEffect(() => {
    let isMounted = true;
    async function syncBackendPayroll() {
      try {
        const liveRecords = await fetchPayrollFromBackend(selectedMonth === 'ALL' ? null : selectedMonth);
        if (isMounted && liveRecords && liveRecords.length > 0) {
          setRecords(liveRecords);
        }
        const liveStructures = await fetchSalaryStructuresFromBackend();
        if (isMounted && liveStructures && liveStructures.length > 0) {
          const structMap = {};
          liveStructures.forEach((s) => {
            structMap[s.employeeId] = s;
          });
          setStructures(structMap);
        }
      } catch (err) {
        console.warn('Backend sync failed in HRPayrollAdminView:', err);
      }
    }
    syncBackendPayroll();

    const handleUpdate = () => {
      setRecords(getStoredPayrollRecords());
      setStructures(getStoredSalaryStructures());
      setKpis(getPayrollKPIs(selectedMonth));
      setReportData(getPayrollReportData());
      setEmployees(getEmployees());
    };

    window.addEventListener('payroll-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('payroll-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [selectedMonth]);

  // Auto-dismiss alert
  useEffect(() => {
    if (actionAlert) {
      const timer = setTimeout(() => setActionAlert(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [actionAlert]);

  // Greeting
  const greeting = useMemo(() => getChicagoGreeting(), []);

  // Filtered & Sorted Records
  const filteredRecords = useMemo(() => {
    return records
      .filter((r) => {
        const matchMonth = selectedMonth === 'ALL' || r.payrollMonth === selectedMonth;
        const matchDept = departmentFilter === 'ALL' || r.department === departmentFilter;
        const matchStatus = statusFilter === 'ALL' || r.paymentStatus === statusFilter;
        const matchSearch =
          searchTerm.trim() === '' ||
          r.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.id.toLowerCase().includes(searchTerm.toLowerCase());

        return matchMonth && matchDept && matchStatus && matchSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'NET_DESC') return b.netSalary - a.netSalary;
        if (sortBy === 'NET_ASC') return a.netSalary - b.netSalary;
        if (sortBy === 'NAME_ASC') return a.employeeName.localeCompare(b.employeeName);
        return 0;
      });
  }, [records, selectedMonth, departmentFilter, statusFilter, searchTerm, sortBy]);

  // Handle Payment Status Toggle
  const handleTogglePaymentStatus = async (payrollRecord) => {
    setIsProcessing(true);
    if (payrollRecord.paymentStatus === 'PENDING') {
      try {
        await processPayrollPaymentBackend(payrollRecord.payrollId || payrollRecord.id);
      } catch (err) {
        console.warn('Backend payment status update error:', err);
      }
    }
    const newStatus = payrollRecord.paymentStatus === 'PAID' ? 'PENDING' : 'PAID';
    const result = updatePaymentStatus(payrollRecord.id, newStatus, 'HR_ADMIN');
    setIsProcessing(false);

    if (result.success) {
      setActionAlert({ type: 'success', message: result.message });
    } else {
      setActionAlert({ type: 'error', message: result.error });
    }
  };

  // Handle Batch Payroll Generation
  const handleRunPayrollSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      await generateMonthlyPayrollBackend(runMonthInput);
    } catch (err) {
      console.warn('Backend batch generation error:', err);
    }

    const result = generateMonthlyPayroll(
      runMonthInput,
      null,
      `${user?.name || 'Alex Morgan'} (HR Administrator)`
    );

    setIsProcessing(false);

    if (result.success) {
      setActionAlert({ type: 'success', message: result.message });
      setSelectedMonth(runMonthInput);
      setIsRunPayrollModalOpen(false);
    } else {
      setActionAlert({ type: 'error', message: result.error });
    }
  };

  // Handle Salary Structure Save
  const handleSaveStructureSubmit = async (e) => {
    e.preventDefault();
    if (!editStructureTarget) return;

    setIsProcessing(true);
    try {
      await configureSalaryStructureBackend(editStructureTarget);
    } catch (err) {
      console.warn('Backend save structure error:', err);
    }

    const result = configureSalaryStructure(editStructureTarget.employeeId, editStructureTarget);
    setIsProcessing(false);

    if (result.success) {
      setActionAlert({ type: 'success', message: result.message });
      setEditStructureTarget(null);
    } else {
      setActionAlert({ type: 'error', message: result.error });
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Payroll ID',
      'Month',
      'Employee ID',
      'Employee Name',
      'Department',
      'Designation',
      'Basic Salary',
      'Housing Allowance',
      'Other Allowances',
      'Bonus',
      'Gross Salary',
      'Tax Deduction',
      'Other Deductions',
      'Total Deductions',
      'Net Salary',
      'Payment Status',
      'Disbursement Date'
    ];

    const rows = filteredRecords.map((r) => [
      `"${r.id}"`,
      `"${r.payrollMonthLabel}"`,
      `"${r.employeeId}"`,
      `"${r.employeeName}"`,
      `"${r.department}"`,
      `"${r.employeeRole}"`,
      r.basicSalary,
      r.housingAllowance,
      r.otherAllowances,
      r.bonus,
      r.grossSalary,
      r.taxDeduction,
      r.otherDeductions,
      r.totalDeductions,
      r.netSalary,
      `"${r.paymentStatus}"`,
      `"${r.disbursementDate}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `visartech_payroll_register_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Preview structure calculation in modal
  const editPreviewCalc = useMemo(() => {
    if (!editStructureTarget) return null;
    return calculateSalaryComponents(editStructureTarget);
  }, [editStructureTarget]);

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions */}
      <PageHeader
        title="Payroll & Compensation Operations"
        subtitle={`${greeting}, ${user?.name || 'Alex'}. Supervise workforce salary disbursements, configure entitlement structures, and audit compensation analytics.`}
        badge={<Badge variant="primary" dot>HR Administrator</Badge>}
        breadcrumbs={[
          { label: 'Administration', href: '#' },
          { label: 'Payroll & Salaries' },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              leftIcon={Download}
              onClick={handleExportCSV}
            >
              Export Register (CSV)
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={Sliders}
              onClick={() => setActiveTab('structures')}
            >
              Salary Packages
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={BadgeDollarSign}
              onClick={() => setIsRunPayrollModalOpen(true)}
            >
              Run Monthly Payroll
            </Button>
          </div>
        }
      />

      {/* Global Alert Notification Banner */}
      {actionAlert && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between transition-all animate-fadeIn ${
            actionAlert.type === 'success'
              ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
              : 'bg-rose-50/90 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-3">
            {actionAlert.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <p className="text-sm font-medium">{actionAlert.message}</p>
          </div>
          <button
            onClick={() => setActionAlert(null)}
            className="p-1 hover:bg-black/5 rounded text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. 6 Financial KPI Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Active Workforce"
          value={`${kpis.totalEmployees} Members`}
          icon={User}
          iconColor="blue"
          description={`Cycle: ${selectedMonth}`}
        />
        <StatCard
          title="Total Gross Payroll"
          value={formatCurrency(kpis.totalGross)}
          icon={BadgeDollarSign}
          iconColor="blue"
          trend="Monthly Base"
          trendType="neutral"
          description="Basic + Allowances + Bonus"
        />
        <StatCard
          title="Total Deductions"
          value={formatCurrency(kpis.totalDeductions)}
          icon={FileText}
          iconColor="rose"
          description="Tax &amp; Benefit Withholdings"
        />
        <StatCard
          title="Total Net Payroll"
          value={formatCurrency(kpis.totalNet)}
          icon={CheckCircle2}
          iconColor="emerald"
          trend="Disbursement Net"
          trendType="up"
          description="Take-Home Pay Pool"
        />
        <StatCard
          title="Disbursed (Paid)"
          value={formatCurrency(kpis.paidPayroll)}
          icon={CheckCircle2}
          iconColor="emerald"
          trend={`${kpis.paidCount} Staff Paid`}
          trendType="up"
          description="ACH transfers completed"
        />
        <StatCard
          title="Pending Disbursement"
          value={formatCurrency(kpis.pendingPayroll)}
          icon={Clock}
          iconColor="amber"
          trend={kpis.pendingCount > 0 ? `${kpis.pendingCount} Pending` : 'All Disbursed'}
          trendType={kpis.pendingCount > 0 ? 'down' : 'up'}
          description="Awaiting release sign-off"
        />
      </div>

      {/* 3. Navigation Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex items-center gap-6 text-sm font-semibold">
          <button
            onClick={() => setActiveTab('register')}
            className={`pb-3 relative transition flex items-center gap-2 ${
              activeTab === 'register'
                ? 'text-brand-blue border-b-2 border-brand-blue'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <BadgeDollarSign className="w-4 h-4" />
            <span>Monthly Payroll Register</span>
            <span className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded-full font-bold">
              {filteredRecords.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('structures')}
            className={`pb-3 relative transition flex items-center gap-2 ${
              activeTab === 'structures'
                ? 'text-brand-blue border-b-2 border-brand-blue'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Salary Package Structures</span>
            <span className="bg-blue-100 text-brand-blue text-xs px-2 py-0.5 rounded-full font-bold">
              6
            </span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`pb-3 relative transition flex items-center gap-2 ${
              activeTab === 'reports'
                ? 'text-brand-blue border-b-2 border-brand-blue'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Compensation Reports &amp; Analytics</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: Monthly Payroll Register */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'register' && (
        <Card>
          <CardHeader className="flex flex-col gap-4 border-b border-slate-100 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle>Disbursement Register</CardTitle>
                <CardDescription>
                  Review itemized monthly compensation components, inspect digital payslips, and sign off disbursements.
                </CardDescription>
              </div>

              {/* Month Selector Pills */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                {['2026-11', '2026-10', '2026-09'].map((m) => (
                  <button
                    key={m}
                    onClick={() => setSelectedMonth(m)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                      selectedMonth === m
                        ? 'bg-brand-navy text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {m === '2026-11' ? 'Nov 2026' : m === '2026-10' ? 'Oct 2026' : 'Sep 2026'}
                  </button>
                ))}
              </div>
            </div>

            {/* Sub-Filters: Search, Department, Status, Sorting */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              <SearchInput
                placeholder="Search by employee, ID, or title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClear={() => setSearchTerm('')}
              />

              {/* Department */}
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="text-xs rounded-xl border border-slate-200 px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              >
                <option value="ALL">All Departments</option>
                <option value="Engineering">Engineering</option>
                <option value="Product & Design">Product &amp; Design</option>
                <option value="Infrastructure">Infrastructure</option>
                <option value="QA">QA</option>
              </select>

              {/* Status */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs rounded-xl border border-slate-200 px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              >
                <option value="ALL">All Payment Statuses</option>
                <option value="PAID">Disbursed (Paid)</option>
                <option value="PENDING">Pending Processing</option>
              </select>

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-xs rounded-xl border border-slate-200 px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              >
                <option value="NET_DESC">Net Salary: High to Low</option>
                <option value="NET_ASC">Net Salary: Low to High</option>
                <option value="NAME_ASC">Employee Name: A to Z</option>
              </select>
            </div>
          </CardHeader>

          <CardBody className="p-0">
            {filteredRecords.length === 0 ? (
              <div className="py-16 text-center">
                <BadgeDollarSign className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-brand-navy">No payroll records found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  No records match your selected month or search filters. Click "Run Monthly Payroll" to generate records.
                </p>
                <div className="mt-4">
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={BadgeDollarSign}
                    onClick={() => setIsRunPayrollModalOpen(true)}
                  >
                    Run Monthly Payroll
                  </Button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">Basic Pay</th>
                      <th className="py-3 px-4">Allowances</th>
                      <th className="py-3 px-4">Bonus</th>
                      <th className="py-3 px-4">Gross Salary</th>
                      <th className="py-3 px-4">Deductions</th>
                      <th className="py-3 px-4">Net Salary</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredRecords.map((rec) => {
                      const isPaid = rec.paymentStatus === 'PAID';

                      return (
                        <tr key={rec.id} className="hover:bg-slate-50/50 transition">
                          {/* Employee */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <Avatar name={rec.employeeName} size="sm" />
                              <div>
                                <div className="font-bold text-slate-900">{rec.employeeName}</div>
                                <div className="text-[11px] text-slate-400 font-mono">
                                  {rec.employeeId} &bull; {rec.employeeRole}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Department */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700 font-medium">
                              {rec.department}
                            </span>
                          </td>

                          {/* Basic */}
                          <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-800">
                            {formatCurrency(rec.basicSalary)}
                          </td>

                          {/* Allowances */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                            +{formatCurrency(rec.totalAllowances)}
                          </td>

                          {/* Bonus */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                            {rec.bonus > 0 ? `+${formatCurrency(rec.bonus)}` : '$0.00'}
                          </td>

                          {/* Gross */}
                          <td className="py-3.5 px-4 whitespace-nowrap font-semibold text-brand-navy">
                            {formatCurrency(rec.grossSalary)}
                          </td>

                          {/* Deductions */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-rose-600 font-medium">
                            -{formatCurrency(rec.totalDeductions)}
                          </td>

                          {/* Net Salary */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="text-sm font-black text-brand-blue font-mono">
                              {formatCurrency(rec.netSalary)}
                            </span>
                          </td>

                          {/* Payment Status */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {isPaid ? (
                              <Badge variant="success" dot size="sm">
                                Disbursed
                              </Badge>
                            ) : (
                              <Badge variant="warning" dot size="sm">
                                Pending
                              </Badge>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2.5 text-xs"
                                leftIcon={FileText}
                                onClick={() => setActivePayslipRecord(rec)}
                                title="Open Payslip & PDF"
                              >
                                Payslip
                              </Button>

                              <Button
                                variant={isPaid ? 'secondary' : 'success'}
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => handleTogglePaymentStatus(rec)}
                                title={isPaid ? 'Mark as Pending' : 'Mark as Disbursed'}
                              >
                                {isPaid ? 'Mark Pending' : 'Mark Paid'}
                              </Button>
                            </div>
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
            <span>Showing {filteredRecords.length} records for cycle {selectedMonth}.</span>
            <span className="text-[11px] text-slate-400">All amounts calculated in USD ($)</span>
          </CardFooter>
        </Card>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: Salary Package Structure Management */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'structures' && (
        <Card>
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle>Workforce Compensation &amp; Package Structures</CardTitle>
            <CardDescription>
              Configure base salaries, housing allowances, bonuses, and tax withholding brackets for all employees.
            </CardDescription>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Base Salary</th>
                    <th className="py-3 px-4">Housing</th>
                    <th className="py-3 px-4">Other Allowances</th>
                    <th className="py-3 px-4">Bonus</th>
                    <th className="py-3 px-4">Tax (Demo)</th>
                    <th className="py-3 px-4">Other Ded.</th>
                    <th className="py-3 px-4">Net Monthly</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {employees.map((emp) => {
                    const struct = structures[emp.id] || {
                      basicSalary: 6000,
                      housingAllowance: 1000,
                      otherAllowances: 400,
                      bonus: 0,
                      taxDeduction: 1200,
                      otherDeductions: 300,
                    };
                    const calc = calculateSalaryComponents(struct);

                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={emp.name} size="sm" />
                            <div>
                              <div className="font-bold text-slate-900">{emp.name}</div>
                              <div className="text-[11px] text-slate-400 font-mono">
                                {emp.id} &bull; {emp.jobTitle}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700 font-medium">
                            {emp.department}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap font-semibold text-slate-900">
                          {formatCurrency(calc.basicSalary)}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                          +{formatCurrency(calc.housingAllowance)}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                          +{formatCurrency(calc.otherAllowances)}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                          +{formatCurrency(calc.bonus)}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap text-rose-600">
                          -{formatCurrency(calc.taxDeduction)}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap text-rose-600">
                          -{formatCurrency(calc.otherDeductions)}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="text-sm font-black text-brand-blue font-mono">
                            {formatCurrency(calc.netSalary)}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <Button
                            variant="primary"
                            size="sm"
                            className="h-7 px-2.5 text-xs"
                            leftIcon={Edit}
                            onClick={() => setEditStructureTarget({ ...struct, employeeId: emp.id })}
                          >
                            Configure Package
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: Reports & Compensation Analytics */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Chart 1: Monthly Payroll Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Historical Monthly Payroll Velocity</CardTitle>
                <CardDescription>Comparison of Gross Earnings vs Take-Home Net disbursements.</CardDescription>
              </CardHeader>
              <CardBody className="p-4">
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData.monthlyTrend} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5EAF2" />
                      <XAxis dataKey="month" stroke="#718096" fontSize={11} tickLine={false} />
                      <YAxis
                        stroke="#718096"
                        fontSize={11}
                        tickLine={false}
                        tickFormatter={(v) => `$${v / 1000}k`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#101B35',
                          borderRadius: '12px',
                          color: '#fff',
                          fontSize: '12px',
                          border: 'none',
                        }}
                        formatter={(val) => formatCurrency(val)}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Bar dataKey="gross" name="Gross Payroll" fill="#101B35" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="net" name="Net Payroll" fill="#356AE6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="deductions" name="Total Deductions" fill="#DC5353" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardBody>
            </Card>

            {/* Chart 2: Department-wise Payroll Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Departmental Payroll Allocation</CardTitle>
                <CardDescription>Current month net salary commitment by functional team.</CardDescription>
              </CardHeader>
              <CardBody className="p-4">
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={reportData.departmentDistribution}
                      layout="vertical"
                      margin={{ top: 10, right: 20, left: 40, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5EAF2" />
                      <XAxis
                        type="number"
                        stroke="#718096"
                        fontSize={11}
                        tickLine={false}
                        tickFormatter={(v) => `$${v / 1000}k`}
                      />
                      <YAxis
                        type="category"
                        dataKey="department"
                        stroke="#718096"
                        fontSize={11}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#101B35',
                          borderRadius: '12px',
                          color: '#fff',
                          fontSize: '12px',
                          border: 'none',
                        }}
                        formatter={(val) => formatCurrency(val)}
                      />
                      <Bar dataKey="net" name="Net Payroll" fill="#16A36A" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardBody>
            </Card>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Chart 3: Paid vs Pending Donut */}
            <Card>
              <CardHeader>
                <CardTitle>Disbursement Execution Status (Nov 2026)</CardTitle>
                <CardDescription>Ratio of finalized ACH deposits vs pending processing.</CardDescription>
              </CardHeader>
              <CardBody className="p-4">
                <div className="h-64 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={reportData.statusAllocation}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={95}
                        paddingAngle={3}
                      >
                        {reportData.statusAllocation.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#101B35',
                          borderRadius: '12px',
                          color: '#fff',
                          fontSize: '12px',
                          border: 'none',
                        }}
                        formatter={(val) => formatCurrency(val)}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardBody>
            </Card>

            {/* Chart 4: Salary Component Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Organization Compensation Components</CardTitle>
                <CardDescription>Aggregate monthly volume by compensation allowance and deduction.</CardDescription>
              </CardHeader>
              <CardBody className="p-4">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData.componentBreakdown} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5EAF2" />
                      <XAxis dataKey="component" stroke="#718096" fontSize={10} tickLine={false} />
                      <YAxis stroke="#718096" fontSize={11} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#101B35',
                          borderRadius: '12px',
                          color: '#fff',
                          fontSize: '12px',
                          border: 'none',
                        }}
                        formatter={(val) => formatCurrency(val)}
                      />
                      <Bar dataKey="amount" name="Total Volume" radius={[4, 4, 0, 0]}>
                        {reportData.componentBreakdown.map((entry, index) => (
                          <Cell key={`comp-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardBody>
            </Card>

          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. MODAL: Run Monthly Payroll */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={isRunPayrollModalOpen}
        onClose={() => setIsRunPayrollModalOpen(false)}
        title="Execute Monthly Payroll Cycle"
        subtitle="Batch generate salary records and disbursement vouchers for all active workforce members."
        size="md"
      >
        <form onSubmit={handleRunPayrollSubmit} className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
            <span className="font-bold text-brand-navy block">Payroll Cycle Details</span>
            <p className="text-slate-600 leading-relaxed">
              Generating payroll calculates individual gross pay, applies itemized allowances, calculates demo withholdings, and stages vouchers in <strong>PENDING</strong> status for HR sign-off.
            </p>
            <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-[11px] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
              <span><strong>Duplicate Protection:</strong> Employees who already have a payroll record for the chosen month will be automatically skipped.</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Select Payroll Cycle Month <span className="text-rose-500">*</span>
            </label>
            <select
              value={runMonthInput}
              onChange={(e) => setRunMonthInput(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
            >
              <option value="2026-11">November 2026 (Current Cycle)</option>
              <option value="2026-12">December 2026 (Year-End Cycle)</option>
              <option value="2027-01">January 2027 (New Year Cycle)</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsRunPayrollModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isProcessing}
            >
              Generate Monthly Payroll
            </Button>
          </div>
        </form>
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* 5. MODAL: Configure Salary Structure */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={Boolean(editStructureTarget)}
        onClose={() => setEditStructureTarget(null)}
        title={`Configure Salary Package: ${editStructureTarget?.employeeName}`}
        subtitle="Set base pay, housing allowance, bonus brackets, and benefit deductions."
        size="lg"
      >
        {editStructureTarget && (
          <form onSubmit={handleSaveStructureSubmit} className="space-y-4">
            
            {/* Calculation Preview Banner */}
            {editPreviewCalc && (
              <div className="p-4 bg-brand-blue-light/50 border border-brand-blue/20 rounded-xl grid grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Gross Salary</span>
                  <span className="font-extrabold text-brand-navy text-sm">
                    {formatCurrency(editPreviewCalc.grossSalary)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Deductions</span>
                  <span className="font-extrabold text-rose-600 text-sm">
                    -{formatCurrency(editPreviewCalc.totalDeductions)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Calculated Net Pay</span>
                  <span className="font-black text-brand-blue text-sm">
                    {formatCurrency(editPreviewCalc.netSalary)}
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Base Monthly Salary ($)"
                type="number"
                min="0"
                step="50"
                required
                value={editStructureTarget.basicSalary}
                onChange={(e) =>
                  setEditStructureTarget((p) => ({ ...p, basicSalary: Math.max(0, Number(e.target.value)) }))
                }
              />

              <Input
                label="Housing Allowance ($)"
                type="number"
                min="0"
                step="50"
                value={editStructureTarget.housingAllowance}
                onChange={(e) =>
                  setEditStructureTarget((p) => ({ ...p, housingAllowance: Math.max(0, Number(e.target.value)) }))
                }
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Other Regular Allowances ($)"
                type="number"
                min="0"
                step="50"
                value={editStructureTarget.otherAllowances}
                onChange={(e) =>
                  setEditStructureTarget((p) => ({ ...p, otherAllowances: Math.max(0, Number(e.target.value)) }))
                }
              />

              <Input
                label="Target Performance Bonus ($)"
                type="number"
                min="0"
                step="50"
                value={editStructureTarget.bonus}
                onChange={(e) =>
                  setEditStructureTarget((p) => ({ ...p, bonus: Math.max(0, Number(e.target.value)) }))
                }
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-3">
              <Input
                label="Tax Withholding Bracket ($) [Demo]"
                type="number"
                min="0"
                step="50"
                value={editStructureTarget.taxDeduction}
                onChange={(e) =>
                  setEditStructureTarget((p) => ({ ...p, taxDeduction: Math.max(0, Number(e.target.value)) }))
                }
              />

              <Input
                label="401(k) / Benefit Deductions ($)"
                type="number"
                min="0"
                step="50"
                value={editStructureTarget.otherDeductions}
                onChange={(e) =>
                  setEditStructureTarget((p) => ({ ...p, otherDeductions: Math.max(0, Number(e.target.value)) }))
                }
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditStructureTarget(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isProcessing}
              >
                Save Compensation Package
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* 6. Payslip View & Print Modal */}
      <PayslipModal
        isOpen={Boolean(activePayslipRecord)}
        onClose={() => setActivePayslipRecord(null)}
        payrollRecord={activePayslipRecord}
      />
    </div>
  );
}
