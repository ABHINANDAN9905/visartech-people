import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Calendar,
  Filter,
  Search,
  Download,
  Check,
  X,
  FileText,
  User,
  Building2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Eye,
  Info,
  CalendarDays,
  Users,
  Briefcase
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { getEmployees } from '../../services/employeeService';
import {
  getStoredLeaveRequests,
  getStoredLeaveBalances,
  getLeaveSystemStats,
  getEmployeeLeaveBalance,
  approveLeaveRequest,
  rejectLeaveRequest,
  getApprovedLeavesForCalendar,
  fetchLeavesFromBackend,
  fetchLeaveStatsFromBackend,
  approveLeaveBackend,
  rejectLeaveBackend,
} from '../../services/leaveService';
import {
  formatChicagoDate,
  formatChicagoTime,
  getChicagoGreeting
} from '../../utils/timezone';

import PageHeader from '../common/PageHeader';
import StatCard from '../common/StatCard';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Card, { CardHeader, CardTitle, CardDescription, CardBody, CardFooter } from '../common/Card';
import Modal from '../common/Modal';
import Avatar from '../common/Avatar';
import SearchInput from '../common/SearchInput';

export default function HRLeaveAdminView() {
  const { user } = useAuth();

  // Active Tab
  const [activeTab, setActiveTab] = useState('requests'); // 'requests' | 'calendar' | 'balances'

  // Centralized State
  const [requests, setRequests] = useState(() => getStoredLeaveRequests());
  const [stats, setStats] = useState(() => getLeaveSystemStats());
  const [employees, setEmployees] = useState(() => getEmployees());
  const [balancesMap, setBalancesMap] = useState(() => getStoredLeaveBalances());

  // Filters for Table
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Calendar State
  const [calendarMonth, setCalendarMonth] = useState('2026-11'); // YYYY-MM
  const [calendarDept, setCalendarDept] = useState('All');

  // Review Modal State
  const [reviewModalTarget, setReviewModalTarget] = useState(null); // request object
  const [reviewerNote, setReviewerNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null); // { type: 'success' | 'error', message: '' }

  // Calendar event inspector modal
  const [selectedCalendarEvent, setSelectedCalendarEvent] = useState(null);

  // Sync state on 'leaves-updated'
  useEffect(() => {
    const handleUpdate = () => {
      setRequests(getStoredLeaveRequests());
      setStats(getLeaveSystemStats());
      setEmployees(getEmployees());
      setBalancesMap(getStoredLeaveBalances());
    };

    window.addEventListener('leaves-updated', handleUpdate);
    window.addEventListener('employees-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('leaves-updated', handleUpdate);
      window.removeEventListener('employees-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Fetch live backend leave requests & metrics on mount
  useEffect(() => {
    let isMounted = true;
    async function loadLiveData() {
      try {
        const [leavesRes, statsRes] = await Promise.all([
          fetchLeavesFromBackend({ limit: 50 }),
          fetchLeaveStatsFromBackend(),
        ]);
        if (isMounted) {
          if (leavesRes?.leaves?.length > 0) {
            setRequests(leavesRes.leaves);
          }
          if (statsRes) {
            setStats(statsRes);
          }
        }
      } catch (err) {
        console.warn('Backend HR leaves fetch error:', err);
      }
    }
    loadLiveData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Auto-dismiss alert banner
  useEffect(() => {
    if (actionFeedback) {
      const timer = setTimeout(() => setActionFeedback(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [actionFeedback]);

  // Greeting
  const greeting = useMemo(() => getChicagoGreeting(), []);
  const todayChicagoDate = useMemo(() => formatChicagoDate(), []);

  // Filtered Requests Table
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
      const matchDept = departmentFilter === 'ALL' || r.department === departmentFilter;
      const matchType = typeFilter === 'ALL' || r.leaveType === typeFilter;
      const matchSearch =
        searchTerm.trim() === '' ||
        r.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.reason.toLowerCase().includes(searchTerm.toLowerCase());
      return matchStatus && matchDept && matchType && matchSearch;
    });
  }, [requests, statusFilter, departmentFilter, typeFilter, searchTerm]);

  // Handle Approve Action
  const handleApprove = async () => {
    if (!reviewModalTarget) return;
    setIsProcessing(true);
    try {
      const targetId = reviewModalTarget.mongoId || reviewModalTarget.id;
      const result = await approveLeaveBackend(targetId, reviewerNote);

      if (result.success) {
        setActionFeedback({
          type: 'success',
          message: result.message || `Leave request ${reviewModalTarget.id} approved successfully.`,
        });
        setReviewModalTarget(null);
        setReviewerNote('');
        const [leavesRes, statsRes] = await Promise.all([
          fetchLeavesFromBackend({ limit: 50 }),
          fetchLeaveStatsFromBackend(),
        ]);
        if (leavesRes?.leaves) setRequests(leavesRes.leaves);
        if (statsRes) setStats(statsRes);
      } else {
        setActionFeedback({
          type: 'error',
          message: result.error || result.message || 'Failed to approve request.',
        });
      }
    } catch (err) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'Failed to approve request.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Reject Action
  const handleReject = async () => {
    if (!reviewModalTarget) return;

    if (!reviewerNote.trim()) {
      setActionFeedback({
        type: 'error',
        message: 'Please provide a reason or note explaining why this leave request is being declined.',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const targetId = reviewModalTarget.mongoId || reviewModalTarget.id;
      const result = await rejectLeaveBackend(targetId, reviewerNote);

      if (result.success) {
        setActionFeedback({
          type: 'success',
          message: result.message || `Leave request ${reviewModalTarget.id} was declined.`,
        });
        setReviewModalTarget(null);
        setReviewerNote('');
        const [leavesRes, statsRes] = await Promise.all([
          fetchLeavesFromBackend({ limit: 50 }),
          fetchLeaveStatsFromBackend(),
        ]);
        if (leavesRes?.leaves) setRequests(leavesRes.leaves);
        if (statsRes) setStats(statsRes);
      } else {
        setActionFeedback({
          type: 'error',
          message: result.error || result.message || 'Failed to reject request.',
        });
      }
    } catch (err) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'Failed to reject request.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // CSV Export Functionality
  const handleExportCSV = () => {
    const headers = ['Request ID', 'Employee ID', 'Employee Name', 'Department', 'Leave Type', 'Start Date', 'End Date', 'Days', 'Status', 'Reason', 'Reviewer Comments'];
    const rows = requests.map((r) => [
      `"${r.id}"`,
      `"${r.employeeId}"`,
      `"${r.employeeName}"`,
      `"${r.department}"`,
      `"${r.leaveType}"`,
      `"${r.startDate}"`,
      `"${r.endDate}"`,
      r.days,
      `"${r.status}"`,
      `"${(r.reason || '').replace(/"/g, '""')}"`,
      `"${(r.reviewerComments || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `visartech_leave_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Status Badge Helper
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return <Badge variant="success" dot>Approved</Badge>;
      case 'PENDING':
        return <Badge variant="warning" dot>Pending Review</Badge>;
      case 'REJECTED':
        return <Badge variant="danger" dot>Declined</Badge>;
      case 'CANCELLED':
        return <Badge variant="neutral">Cancelled</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  // Leave Type Tag Helper
  const renderTypeTag = (type) => {
    switch (type) {
      case 'Casual':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">Casual</span>;
      case 'Sick':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Sick</span>;
      case 'Paid':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">Paid Annual</span>;
      case 'Unpaid':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">Unpaid</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">{type}</span>;
    }
  };

  // -------------------------------------------------------------
  // Calendar Matrix Generator (November / December 2026)
  // -------------------------------------------------------------
  const calendarData = useMemo(() => {
    const [yearStr, monthStr] = calendarMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10); // 1-indexed

    // Days in month
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDayIndex = new Date(year, month - 1, 1).getDay(); // 0 = Sun

    const approvedLeaves = getApprovedLeavesForCalendar(calendarDept, calendarMonth);

    const days = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayDate = new Date(year, month - 1, day);
      const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;

      // Find approved leaves covering this date
      const leavesOnDate = approvedLeaves.filter((r) => {
        return dateStr >= r.startDate && dateStr <= r.endDate;
      });

      days.push({
        dayNumber: day,
        dateStr,
        isWeekend,
        leaves: leavesOnDate,
      });
    }

    return { days, firstDayIndex, daysInMonth, year, month };
  }, [calendarMonth, calendarDept, requests]);

  return (
    <div className="space-y-6">
      {/* 1. Header & Quick Actions */}
      <PageHeader
        title="Leave Approvals & Scheduling"
        subtitle={`${greeting}, ${user?.name || 'Alex'}. Supervise employee time-off requests, manage entitlement pools, and oversee company leave schedules.`}
        badge={
          <Badge variant={stats.pending > 0 ? 'warning' : 'success'} dot>
            {stats.pending > 0 ? `${stats.pending} Pending Review` : 'All Caught Up'}
          </Badge>
        }
        breadcrumbs={[
          { label: 'Workforce', href: '#' },
          { label: 'Leave Management' },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              leftIcon={Download}
              onClick={handleExportCSV}
            >
              Export CSV
            </Button>
            {stats.pending > 0 && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={CheckCircle2}
                onClick={() => {
                  const firstPending = requests.find((r) => r.status === 'PENDING');
                  if (firstPending) {
                    setReviewModalTarget(firstPending);
                    setReviewerNote('');
                  }
                }}
              >
                Review Pending ({stats.pending})
              </Button>
            )}
          </div>
        }
      />

      {/* Global Alert Notification Banner */}
      {actionFeedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between transition-all animate-fadeIn ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
              : 'bg-rose-50/90 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-3">
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <p className="text-sm font-medium">{actionFeedback.message}</p>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="p-1 hover:bg-black/5 rounded text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Submissions"
          value={`${stats.total} Requests`}
          icon={CalendarCheck}
          iconColor="blue"
          description="Organization-wide records"
        />
        <StatCard
          title="Pending Approvals"
          value={`${stats.pending} Action Needed`}
          icon={Clock}
          iconColor="amber"
          trend={stats.pending > 0 ? 'Requires Review' : 'Zero Backlog'}
          trendType={stats.pending > 0 ? 'neutral' : 'up'}
          description="Awaiting HR decision"
        />
        <StatCard
          title="Approved Leaves"
          value={`${stats.approved} Approved`}
          icon={CheckCircle2}
          iconColor="emerald"
          trend="Deducted"
          trendType="up"
          description="Balances updated"
        />
        <StatCard
          title="Declined / Cancelled"
          value={`${stats.rejected + stats.cancelled} Inactive`}
          icon={XCircle}
          iconColor="rose"
          description={`${stats.rejected} rejected, ${stats.cancelled} cancelled`}
        />
      </div>

      {/* 3. Main Navigation Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex items-center gap-6 text-sm font-semibold">
          <button
            onClick={() => setActiveTab('requests')}
            className={`pb-3 relative transition flex items-center gap-2 ${
              activeTab === 'requests'
                ? 'text-brand-blue border-b-2 border-brand-blue'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <CalendarCheck className="w-4 h-4" />
            <span>Leave Requests &amp; Approvals</span>
            {stats.pending > 0 && (
              <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-bold">
                {stats.pending}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('calendar')}
            className={`pb-3 relative transition flex items-center gap-2 ${
              activeTab === 'calendar'
                ? 'text-brand-blue border-b-2 border-brand-blue'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>Organization Leave Calendar</span>
          </button>

          <button
            onClick={() => setActiveTab('balances')}
            className={`pb-3 relative transition flex items-center gap-2 ${
              activeTab === 'balances'
                ? 'text-brand-blue border-b-2 border-brand-blue'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Staff Entitlement Pools</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* TAB 1: Leave Requests Table & Action Center */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === 'requests' && (
        <Card>
          <CardHeader className="flex flex-col gap-4 border-b border-slate-100 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle>Workforce Time-Off Submissions</CardTitle>
                <CardDescription>
                  Review employee applications, examine reason details, and process approvals.
                </CardDescription>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1.5">
                {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                      statusFilter === st
                        ? 'bg-brand-navy text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st === 'ALL' ? 'All' : st.charAt(0) + st.slice(1).toLowerCase()}
                    {st === 'PENDING' && stats.pending > 0 && ` (${stats.pending})`}
                  </button>
                ))}
              </div>
            </div>

            {/* Sub-Filters: Search & Dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <SearchInput
                placeholder="Search by employee name, ID or keyword..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClear={() => setSearchTerm('')}
              />

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

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="text-xs rounded-xl border border-slate-200 px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              >
                <option value="ALL">All Leave Categories</option>
                <option value="Casual">Casual Leave</option>
                <option value="Sick">Sick / Medical Leave</option>
                <option value="Paid">Paid Annual Vacation</option>
                <option value="Unpaid">Unpaid Leave</option>
              </select>
            </div>
          </CardHeader>

          <CardBody className="p-0">
            {filteredRequests.length === 0 ? (
              <div className="py-16 text-center">
                <CalendarCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-brand-navy">No requests matching criteria</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Try adjusting your department filter, status category, or search term.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">Leave Category</th>
                      <th className="py-3 px-4">Date Window &amp; Duration</th>
                      <th className="py-3 px-4">Reason &amp; Notes</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {filteredRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/50 transition">
                        {/* Employee */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <Avatar name={req.employeeName} size="sm" />
                            <div>
                              <div className="font-bold text-slate-900">{req.employeeName}</div>
                              <div className="text-[11px] text-slate-400 font-mono">{req.employeeId} • {req.employeeRole}</div>
                            </div>
                          </div>
                        </td>

                        {/* Department */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            {req.department}
                          </span>
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {renderTypeTag(req.leaveType)}
                        </td>

                        {/* Dates */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-semibold text-slate-900">
                            {req.startDate} <span className="text-slate-400 font-normal">to</span> {req.endDate}
                          </div>
                          <div className="text-[11px] text-brand-blue font-semibold mt-0.5">
                            {req.days} Business Day{req.days === 1 ? '' : 's'}
                          </div>
                        </td>

                        {/* Reason */}
                        <td className="py-3.5 px-4 max-w-xs">
                          <p className="truncate text-slate-800" title={req.reason}>
                            {req.reason}
                          </p>
                          {req.reviewerComments && (
                            <div className="mt-1 flex items-start gap-1 text-[11px] text-slate-500 bg-slate-100/90 rounded px-2 py-0.5">
                              <span className="font-semibold text-slate-700">Review Note:</span>
                              <span className="truncate" title={req.reviewerComments}>
                                {req.reviewerComments}
                              </span>
                            </div>
                          )}
                          {req.attachment && (
                            <div className="mt-1 flex items-center gap-1 text-[11px] text-brand-blue font-medium">
                              <FileText className="w-3 h-3" />
                              <span>{req.attachment}</span>
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {renderStatusBadge(req.status)}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {req.status === 'PENDING' ? (
                            <Button
                              variant="primary"
                              size="sm"
                              className="py-1 px-3 text-xs h-7"
                              onClick={() => {
                                setReviewModalTarget(req);
                                setReviewerNote('');
                              }}
                            >
                              Review &amp; Action
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="py-1 px-2.5 text-xs h-7 text-slate-500"
                              onClick={() => {
                                setReviewModalTarget(req);
                                setReviewerNote(req.reviewerComments || '');
                              }}
                            >
                              Inspect Details
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
          <CardFooter className="bg-slate-50/50 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span>Showing {filteredRequests.length} of {requests.length} total leave requests.</span>
            <span className="text-[11px] text-slate-400">Chicago Standard Timezone (CST) enforced</span>
          </CardFooter>
        </Card>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* TAB 2: Organization Leave Calendar */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === 'calendar' && (
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <CardTitle>Team Absence &amp; Vacation Calendar</CardTitle>
              <CardDescription>
                Visual schedule of approved leaves across all company departments.
              </CardDescription>
            </div>

            {/* Calendar Controls */}
            <div className="flex items-center gap-3">
              {/* Department Selector */}
              <select
                value={calendarDept}
                onChange={(e) => setCalendarDept(e.target.value)}
                className="text-xs rounded-xl border border-slate-200 px-3 py-1.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              >
                <option value="All">All Departments</option>
                <option value="Engineering">Engineering</option>
                <option value="Product & Design">Product &amp; Design</option>
                <option value="Infrastructure">Infrastructure</option>
                <option value="QA">QA</option>
              </select>

              {/* Month Navigator */}
              <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
                <button
                  onClick={() => setCalendarMonth('2026-11')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                    calendarMonth === '2026-11' ? 'bg-white text-brand-navy shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Nov 2026
                </button>
                <button
                  onClick={() => setCalendarMonth('2026-12')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                    calendarMonth === '2026-12' ? 'bg-white text-brand-navy shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Dec 2026
                </button>
              </div>
            </div>
          </CardHeader>

          <CardBody className="p-4">
            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>

            {/* Calendar Month Grid */}
            <div className="grid grid-cols-7 gap-2">
              {/* Padding offset for first day */}
              {Array.from({ length: calendarData.firstDayIndex }).map((_, i) => (
                <div
                  key={`pad-${i}`}
                  className="min-h-[100px] rounded-xl bg-slate-50/40 border border-transparent p-2 text-slate-300 text-xs"
                />
              ))}

              {/* Actual Month Days */}
              {calendarData.days.map((day) => {
                const isToday = day.dateStr === '2026-11-17';

                return (
                  <div
                    key={day.dateStr}
                    className={`min-h-[110px] rounded-xl border p-2 flex flex-col justify-between transition ${
                      isToday
                        ? 'bg-blue-50/40 border-brand-blue ring-1 ring-brand-blue/30'
                        : day.isWeekend
                        ? 'bg-slate-50/60 border-slate-200/60'
                        : 'bg-white border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    {/* Day Number Header */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold ${
                          isToday
                            ? 'w-6 h-6 rounded-full bg-brand-blue text-white flex items-center justify-center -ml-1'
                            : day.isWeekend
                            ? 'text-slate-400'
                            : 'text-slate-700'
                        }`}
                      >
                        {day.dayNumber}
                      </span>
                      {isToday && (
                        <span className="text-[10px] font-bold text-brand-blue uppercase">Today</span>
                      )}
                    </div>

                    {/* Approved Leave Badges */}
                    <div className="space-y-1 mt-1">
                      {day.leaves.map((leave) => (
                        <button
                          key={`${day.dateStr}-${leave.id}`}
                          onClick={() => setSelectedCalendarEvent(leave)}
                          className="w-full text-left p-1 rounded-md text-[11px] font-medium truncate flex items-center gap-1 transition bg-brand-navy text-white hover:bg-brand-navy/90"
                          title={`${leave.employeeName} (${leave.leaveType} Leave)`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              leave.leaveType === 'Paid'
                                ? 'bg-blue-400'
                                : leave.leaveType === 'Sick'
                                ? 'bg-emerald-400'
                                : 'bg-amber-400'
                            }`}
                          />
                          <span className="truncate">{leave.employeeName.split(' ')[0]} ({leave.leaveType})</span>
                        </button>
                      ))}
                    </div>

                    <div className="text-[10px] text-slate-400 text-right">
                      {day.leaves.length > 0 && `${day.leaves.length} off`}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardBody>
          <CardFooter className="bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-4 text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Paid Vacation
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Sick / Medical
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Casual / Personal
              </span>
            </div>
            <span>Click any leave marker on calendar to view approval details.</span>
          </CardFooter>
        </Card>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* TAB 3: Staff Entitlement Pools */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === 'balances' && (
        <Card>
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle>Organization Entitlement Quotas &amp; Balances</CardTitle>
            <CardDescription>
              Annual leave pools allocated across all 6 fictional employee records.
            </CardDescription>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Casual Leave</th>
                    <th className="py-3 px-4">Sick Leave</th>
                    <th className="py-3 px-4">Paid Vacation</th>
                    <th className="py-3 px-4">Unpaid Taken</th>
                    <th className="py-3 px-4">Total Available</th>
                    <th className="py-3 px-4 text-right">Pending Review</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {employees.map((emp) => {
                    const balance = balancesMap[emp.id] || {
                      casual: { total: 6, used: 0, remaining: 6 },
                      sick: { total: 8, used: 0, remaining: 8 },
                      paid: { total: 14, used: 0, remaining: 14 },
                      unpaid: { used: 0 },
                    };
                    const totalRemaining =
                      balance.casual.remaining + balance.sick.remaining + balance.paid.remaining;
                    const pendingForEmp = requests.filter(
                      (r) => r.employeeId === emp.id && r.status === 'PENDING'
                    ).length;

                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <Avatar name={emp.name} size="sm" />
                            <div>
                              <div className="font-bold text-slate-900">{emp.name}</div>
                              <div className="text-[11px] text-slate-400 font-mono">{emp.id} • {emp.jobTitle}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700 font-medium">
                            {emp.department}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-semibold text-slate-900">{balance.casual.remaining}</span>
                          <span className="text-slate-400 text-[11px]"> / {balance.casual.total}</span>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-semibold text-slate-900">{balance.sick.remaining}</span>
                          <span className="text-slate-400 text-[11px]"> / {balance.sick.total}</span>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-semibold text-slate-900">{balance.paid.remaining}</span>
                          <span className="text-slate-400 text-[11px]"> / {balance.paid.total}</span>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-500">
                          {balance.unpaid?.used || 0} Day(s)
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-blue-50 text-brand-blue border border-brand-blue/20">
                            {totalRemaining} Days
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {pendingForEmp > 0 ? (
                            <Badge variant="warning" dot>
                              {pendingForEmp} Pending
                            </Badge>
                          ) : (
                            <span className="text-slate-400 text-[11px]">None</span>
                          )}
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

      {/* ------------------------------------------------------------------ */}
      {/* 4. MODAL: Review & Action Leave Request */}
      {/* ------------------------------------------------------------------ */}
      <Modal
        isOpen={Boolean(reviewModalTarget)}
        onClose={() => {
          setReviewModalTarget(null);
          setReviewerNote('');
        }}
        title={
          reviewModalTarget?.status === 'PENDING'
            ? 'Review Leave Application'
            : `Leave Request Details: ${reviewModalTarget?.id}`
        }
        subtitle={`Submitted on ${reviewModalTarget?.appliedAt ? reviewModalTarget.appliedAt.split('T')[0] : '--'}`}
        size="lg"
      >
        {reviewModalTarget && (
          <div className="space-y-5">
            {/* Employee Summary Card */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar name={reviewModalTarget.employeeName} size="md" />
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{reviewModalTarget.employeeName}</h4>
                  <p className="text-xs text-slate-500">
                    {reviewModalTarget.employeeId} • {reviewModalTarget.employeeRole} • {reviewModalTarget.department}
                  </p>
                </div>
              </div>
              <div>{renderStatusBadge(reviewModalTarget.status)}</div>
            </div>

            {/* Leave Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3 rounded-xl border border-slate-200/80 text-xs">
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Leave Category</span>
                <span className="font-bold text-slate-900">{reviewModalTarget.leaveTypeLabel || reviewModalTarget.leaveType}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Duration</span>
                <span className="font-bold text-brand-blue">{reviewModalTarget.days} Business Day(s)</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Start Date</span>
                <span className="font-bold text-slate-900">{reviewModalTarget.startDate}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">End Date</span>
                <span className="font-bold text-slate-900">{reviewModalTarget.endDate}</span>
              </div>
            </div>

            {/* Applicant Reason */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Applicant Reason</label>
              <div className="p-3 bg-slate-50/80 border border-slate-200/70 rounded-xl text-xs text-slate-800 leading-relaxed">
                {reviewModalTarget.reason}
              </div>
            </div>

            {/* Supporting Attachment if any */}
            {reviewModalTarget.attachment && (
              <div className="flex items-center gap-2 p-2.5 bg-blue-50/60 border border-brand-blue/20 rounded-xl text-xs text-brand-navy">
                <FileText className="w-4 h-4 text-brand-blue shrink-0" />
                <span className="font-semibold">Attached File:</span>
                <span className="underline cursor-pointer">{reviewModalTarget.attachment}</span>
              </div>
            )}

            {/* Current Balance & Deduction Forecast */}
            {reviewModalTarget.status === 'PENDING' && (
              <div className="p-3 bg-brand-blue-light/40 border border-brand-blue/20 rounded-xl text-xs space-y-1">
                <div className="flex items-center justify-between text-brand-navy font-semibold">
                  <span>Balance Impact Upon Approval:</span>
                  <span>
                    Deduct {reviewModalTarget.days} day(s) from {reviewModalTarget.leaveType} Pool
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Business Rule: Rejecting or cancelling this request will NOT alter the employee quota.
                </p>
              </div>
            )}

            {/* Reviewer Comments Form */}
            {reviewModalTarget.status === 'PENDING' ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reviewer Notes / Feedback <span className="text-slate-400 font-normal">(Required if declining)</span>
                </label>
                <textarea
                  rows={2}
                  value={reviewerNote}
                  onChange={(e) => setReviewerNote(e.target.value)}
                  placeholder="e.g. Approved. Project tasks handed over to team / Please reschedule due to sprint deadline..."
                  className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                />
              </div>
            ) : (
              reviewModalTarget.reviewerComments && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Recorded Reviewer Notes
                  </label>
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700">
                    <p className="font-medium">{reviewModalTarget.reviewerComments}</p>
                    {reviewModalTarget.reviewedBy && (
                      <p className="text-[11px] text-slate-400 mt-1">
                        Reviewed by {reviewModalTarget.reviewedBy} on {reviewModalTarget.reviewedAt?.split('T')[0]}
                      </p>
                    )}
                  </div>
                </div>
              )
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setReviewModalTarget(null);
                  setReviewerNote('');
                }}
              >
                Close
              </Button>

              {reviewModalTarget.status === 'PENDING' && (
                <div className="flex items-center gap-3">
                  <Button
                    variant="danger-outline"
                    size="sm"
                    leftIcon={XCircle}
                    isLoading={isProcessing}
                    onClick={handleReject}
                  >
                    Decline Request
                  </Button>
                  <Button
                    variant="success"
                    size="sm"
                    leftIcon={CheckCircle2}
                    isLoading={isProcessing}
                    onClick={handleApprove}
                  >
                    Approve Request
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* 5. MODAL: Calendar Event Inspection */}
      <Modal
        isOpen={Boolean(selectedCalendarEvent)}
        onClose={() => setSelectedCalendarEvent(null)}
        title="Scheduled Absence Record"
        subtitle={`Approved Leave: ${selectedCalendarEvent?.id}`}
        size="md"
      >
        {selectedCalendarEvent && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/70">
              <Avatar name={selectedCalendarEvent.employeeName} size="md" />
              <div>
                <h4 className="text-sm font-bold text-slate-900">{selectedCalendarEvent.employeeName}</h4>
                <p className="text-xs text-slate-500">
                  {selectedCalendarEvent.employeeId} • {selectedCalendarEvent.department}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between border-b pb-1.5 border-slate-100">
                <span className="text-slate-500">Category:</span>
                <span className="font-semibold text-slate-800">{selectedCalendarEvent.leaveTypeLabel || selectedCalendarEvent.leaveType}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5 border-slate-100">
                <span className="text-slate-500">Window:</span>
                <span className="font-semibold text-slate-800">{selectedCalendarEvent.startDate} to {selectedCalendarEvent.endDate}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5 border-slate-100">
                <span className="text-slate-500">Duration:</span>
                <span className="font-semibold text-brand-navy">{selectedCalendarEvent.days} Business Days</span>
              </div>
              <div className="flex justify-between border-b pb-1.5 border-slate-100">
                <span className="text-slate-500">Reason:</span>
                <span className="text-slate-700 italic max-w-[240px] text-right">{selectedCalendarEvent.reason}</span>
              </div>
              {selectedCalendarEvent.reviewerComments && (
                <div className="flex justify-between pb-1.5">
                  <span className="text-slate-500">Approval Note:</span>
                  <span className="text-emerald-700 font-medium max-w-[240px] text-right">{selectedCalendarEvent.reviewerComments}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedCalendarEvent(null)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
