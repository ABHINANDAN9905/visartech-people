import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Clock,
  CalendarCheck,
  CheckSquare,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Plus,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  UserCheck,
  Building2,
  Megaphone,
  Briefcase,
  Check,
  X,
  Eye,
  Info,
  Sparkles,
  FileText,
  BadgeAlert
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
} from 'recharts';

import { useAuth } from '../../context/AuthContext';
import {
  getChicagoGreeting,
  formatChicagoDate,
  formatChicagoTime,
} from '../../utils/timezone';
import {
  getEmployees,
  getDirectoryStats,
  fetchEmployeesFromBackend,
} from '../../services/employeeService';
import {
  getStoredLeaveRequests,
  approveLeaveRequest,
  rejectLeaveRequest,
  fetchLeavesFromBackend,
  fetchLeaveStatsFromBackend,
  approveLeaveBackend,
  rejectLeaveBackend,
} from '../../services/leaveService';
import { getTaskStats, fetchTaskStatsFromBackend } from '../../services/taskService';
import { fetchAttendanceSummaryFromBackend } from '../../services/attendanceService';
import { fetchPayrollStatsFromBackend } from '../../services/payrollService';
import { fetchAnnouncementsFromBackend } from '../../services/announcementService';
import {
  ATTENDANCE_WEEKLY_TREND,
  TASK_STATUS_DISTRIBUTION,
  RECENT_ACTIVITIES,
} from '../../data/hrDashboardData';

import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Card, { CardHeader, CardTitle, CardDescription, CardBody, CardFooter } from '../../components/common/Card';
import Avatar from '../../components/common/Avatar';
import Modal from '../../components/common/Modal';

export default function HRAdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // State management for interactive leave approvals
  const [leaveRequests, setLeaveRequests] = useState(() => getStoredLeaveRequests());
  const [selectedLeaveAction, setSelectedLeaveAction] = useState(null); // { request, action: 'approve' | 'reject' }
  const [reviewNote, setReviewNote] = useState('');
  const [feedbackAlert, setFeedbackAlert] = useState(null); // { type: 'success' | 'error', message: '' }

  // State for employee profile preview modal
  const [previewEmployee, setPreviewEmployee] = useState(null);

  // Timezone dynamic strings
  const greeting = useMemo(() => getChicagoGreeting(), []);
  const todayChicagoDate = useMemo(() => formatChicagoDate(), []);

  // Centralized employee dataset
  const [employees, setEmployees] = useState(() => getEmployees());
  const [directoryStats, setDirectoryStats] = useState(() => getDirectoryStats());
  const [taskStats, setTaskStats] = useState(() => getTaskStats());
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [leaveStats, setLeaveStats] = useState(null);
  const [payrollStats, setPayrollStats] = useState(null);
  const [recentAnnouncements, setRecentAnnouncements] = useState([]);

  // Fetch live backend metrics on mount
  useEffect(() => {
    let isMounted = true;
    async function loadLiveDashboard() {
      try {
        const [empRes, attRes, leavesRes, leaveStatsRes, taskRes, payrollRes, annRes] = await Promise.all([
          fetchEmployeesFromBackend().catch(() => null),
          fetchAttendanceSummaryFromBackend().catch(() => null),
          fetchLeavesFromBackend({ limit: 10 }).catch(() => null),
          fetchLeaveStatsFromBackend().catch(() => null),
          fetchTaskStatsFromBackend().catch(() => null),
          fetchPayrollStatsFromBackend().catch(() => null),
          fetchAnnouncementsFromBackend().catch(() => null),
        ]);
        if (isMounted) {
          if (empRes?.employees?.length > 0) {
            setEmployees(empRes.employees);
            setDirectoryStats(getDirectoryStats());
          }
          if (attRes) {
            setAttendanceSummary(attRes);
          }
          if (leavesRes?.leaves?.length > 0) {
            setLeaveRequests(leavesRes.leaves);
          }
          if (leaveStatsRes) {
            setLeaveStats(leaveStatsRes);
          }
          if (taskRes) {
            setTaskStats(taskRes);
          }
          if (payrollRes) {
            setPayrollStats(payrollRes);
          }
          if (annRes?.announcements) {
            setRecentAnnouncements(annRes.announcements);
          }
        }
      } catch (err) {
        console.warn('Dashboard live backend sync failed:', err);
      }
    }
    loadLiveDashboard();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const refreshData = () => {
      setEmployees(getEmployees());
      setDirectoryStats(getDirectoryStats());
      setLeaveRequests(getStoredLeaveRequests());
      setTaskStats(getTaskStats());
    };
    window.addEventListener('employees-updated', refreshData);
    window.addEventListener('leaves-updated', refreshData);
    window.addEventListener('tasks-updated', refreshData);
    window.addEventListener('storage', refreshData);
    return () => {
      window.removeEventListener('employees-updated', refreshData);
      window.removeEventListener('leaves-updated', refreshData);
      window.removeEventListener('tasks-updated', refreshData);
      window.removeEventListener('storage', refreshData);
    };
  }, []);

  // Dynamic KPI calculations from centralized employee dataset & live backend aggregates
  const totalEmployeesCount = attendanceSummary?.totalEmployees ?? directoryStats.total;
  const presentEmployeesCount = attendanceSummary
    ? ((attendanceSummary.presentCount || 0) + (attendanceSummary.lateCount || 0))
    : employees.filter((e) => e.attendanceStatus === 'present' || e.attendanceStatus === 'late').length;
  const onLeaveEmployeesCount = attendanceSummary?.onLeaveCount ?? directoryStats.onLeave;
  const pendingLeavesCount = leaveStats?.pendingRequests ?? leaveRequests.filter((r) => r.status?.toUpperCase() === 'PENDING').length;
  const activeTasksCount = taskStats ? (taskStats.todo + taskStats.inProgress + (taskStats.inReview || 0)) : 0;
  const completedTasksCount = taskStats ? taskStats.completed : 0;

  // Handle Leave Action Confirmation
  const handleConfirmLeaveAction = async () => {
    if (!selectedLeaveAction) return;

    const { request, action } = selectedLeaveAction;
    try {
      let result;
      if (action === 'approve') {
        result = await approveLeaveBackend(request.id, reviewNote);
      } else {
        result = await rejectLeaveBackend(request.id, reviewNote);
      }

      if (result.success) {
        setFeedbackAlert({
          type: 'success',
          message: result.message || `Leave request for ${request.employeeName} was successfully processed.`,
        });
        const [leavesRes, leaveStatsRes] = await Promise.all([
          fetchLeavesFromBackend({ limit: 10 }),
          fetchLeaveStatsFromBackend(),
        ]);
        if (leavesRes?.leaves) setLeaveRequests(leavesRes.leaves);
        if (leaveStatsRes) setLeaveStats(leaveStatsRes);
      } else {
        setFeedbackAlert({
          type: 'error',
          message: result.error || 'Failed to process leave action.',
        });
      }
    } catch (err) {
      setFeedbackAlert({
        type: 'error',
        message: err.message || 'Failed to process leave action.',
      });
    }

    // Reset modal state
    setSelectedLeaveAction(null);
    setReviewNote('');

    // Auto-clear alert after 5 seconds
    setTimeout(() => {
      setFeedbackAlert(null);
    }, 5000);
  };

  return (
    <div className="space-y-8">
      {/* 1. Dashboard Header */}
      <PageHeader
        title={`${greeting}, ${user?.name || 'Alex Morgan'}`}
        subtitle={`HR Administrator Portal for VISARTECH Solutions Inc. ${todayChicagoDate} (America/Chicago).`}
        badge={
          <Badge variant="navy" size="md" dot>
            HR_ADMIN Active
          </Badge>
        }
        breadcrumbs={[
          { label: 'VISARTECH People', href: '#' },
          { label: 'Administration', href: '#' },
          { label: 'HR Dashboard' },
        ]}
        actions={
          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={CalendarCheck}
              onClick={() => navigate('/leaves')}
            >
              Review Leaves
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={Plus}
              onClick={() => navigate('/employees')}
            >
              Add Employee
            </Button>
          </div>
        }
      />

      {/* Demo Notice Alert */}
      {feedbackAlert ? (
        <div className="p-4 rounded-2xl bg-brand-success-light border border-brand-success/30 text-brand-success flex items-center justify-between text-xs animate-in fade-in duration-200 shadow-subtle">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span className="font-semibold text-sm">{feedbackAlert.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackAlert(null)}
            className="p-1 rounded-lg hover:bg-emerald-100 text-emerald-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-[#101B35] to-[#1A294C] rounded-2xl p-5 sm:p-6 text-white border border-[#1A294C] shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-brand-blue flex items-center justify-center shrink-0 shadow-md">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] uppercase font-extrabold tracking-wider text-[#60A5FA]">
                  Executive HR Overview
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                  Demo Mode
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold">
                Workforce Metrics &amp; Operational Health
              </h2>
              <p className="text-xs text-slate-300 mt-0.5 max-w-2xl leading-relaxed">
                Displaying real-time records for 6 fictional employees. Timestamps standardized to America/Chicago CST.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/10 text-slate-200 border border-white/15">
              Chicago CST: {formatChicagoTime()}
            </span>
          </div>
        </div>
      )}

      {/* 2. Six Professional KPI Statistics Cards */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Key Workforce Performance Indicators
          </h2>
          <span className="text-[11px] font-semibold text-slate-400">
            * All figures represent fictional demo data
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard
            title="Total Staff"
            value={`${totalEmployeesCount}`}
            icon={Users}
            iconColor="blue"
            trend="100%"
            trendType="up"
            description="Active profiles"
          />
          <StatCard
            title="Present Today"
            value={`${presentEmployeesCount} / 6`}
            icon={UserCheck}
            iconColor="emerald"
            trend="83.3%"
            trendType="up"
            description="Checked in"
          />
          <StatCard
            title="On Leave"
            value={`${onLeaveEmployeesCount}`}
            icon={Calendar}
            iconColor="amber"
            trend="1 Medical"
            trendType="neutral"
            description="Elena Rostova"
          />
          <StatCard
            title="Pending Leaves"
            value={`${pendingLeavesCount}`}
            icon={CalendarCheck}
            iconColor={pendingLeavesCount > 0 ? 'rose' : 'emerald'}
            trend={pendingLeavesCount > 0 ? 'Action Needed' : 'Cleared'}
            trendType={pendingLeavesCount > 0 ? 'down' : 'up'}
            description="Awaiting review"
          />
          <StatCard
            title="Active Tasks"
            value={`${activeTasksCount}`}
            icon={CheckSquare}
            iconColor="blue"
            trend="Sprint 24"
            trendType="neutral"
            description="In progress &amp; QA"
          />
          <StatCard
            title="Completed Tasks"
            value={`${completedTasksCount}`}
            icon={CheckCircle2}
            iconColor="emerald"
            trend="+4 this week"
            trendType="up"
            description="60% sprint velocity"
          />
        </div>
      </section>

      {/* 3. Attendance Overview & Recharts Bar Chart */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Chart */}
        <div className="lg:col-span-2">
          <Card className="h-full flex flex-col justify-between">
            <CardHeader
              action={
                <Badge variant="info" size="sm">
                  Weekly Log (CST)
                </Badge>
              }
            >
              <CardTitle>Attendance Distribution Trend</CardTitle>
              <CardDescription>
                Daily attendance, late arrivals, and approved leaves for the current week.
              </CardDescription>
            </CardHeader>
            <CardBody className="pt-2 pb-6">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={ATTENDANCE_WEEKLY_TREND}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5EAF2" vertical={false} />
                    <XAxis
                      dataKey="day"
                      stroke="#718096"
                      fontSize={12}
                      tickLine={false}
                      axisLine={{ stroke: '#E5EAF2' }}
                    />
                    <YAxis
                      stroke="#718096"
                      fontSize={12}
                      tickLine={false}
                      axisLine={{ stroke: '#E5EAF2' }}
                      domain={[0, 6]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#101B35',
                        border: 'none',
                        borderRadius: '0.75rem',
                        color: '#FFFFFF',
                        fontSize: '12px',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)',
                      }}
                      itemStyle={{ color: '#FFFFFF' }}
                    />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ paddingBottom: '12px', fontSize: '12px' }}
                    />
                    <Bar dataKey="present" name="Present" fill="#356AE6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="late" name="Late Arrivals" fill="#E9A23B" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="onLeave" name="On Leave" fill="#DC5353" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
            <CardFooter className="text-xs text-slate-500 flex items-center justify-between">
              <span>Standard shift hours: 9:00 AM – 5:00 PM CST</span>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-brand-blue"
                onClick={() => navigate('/attendance')}
              >
                Detailed Attendance Console &rarr;
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Live Shift Roster Status */}
        <div>
          <Card className="h-full flex flex-col justify-between">
            <CardHeader action={<Badge variant="success" dot size="sm">Live</Badge>}>
              <CardTitle>Today's Shift Status</CardTitle>
              <CardDescription>Live check-in log (America/Chicago)</CardDescription>
            </CardHeader>
            <CardBody className="p-4 space-y-3">
              {employees.map((emp) => (
                <div
                  key={emp.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 hover:bg-slate-50 border border-brand-border/60 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar name={emp.name} size="sm" status={emp.attendanceStatus === 'present' ? 'online' : emp.attendanceStatus === 'late' ? 'away' : 'offline'} />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-brand-navy truncate">{emp.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{emp.role}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {emp.attendanceStatus === 'present' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {emp.checkInTime}
                      </span>
                    ) : emp.attendanceStatus === 'late' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        Late ({emp.checkInTime})
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        Medical Leave
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </CardBody>
            <CardFooter>
              <span className="text-[11px] text-slate-500">5 out of 6 members checked in today.</span>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* 4. Leave Request Overview with Interactive Approve/Reject Actions */}
      <section>
        <Card id="leave-requests">
          <CardHeader
            action={
              <Badge variant={pendingLeavesCount > 0 ? 'warning' : 'success'} size="sm" dot>
                {pendingLeavesCount} Pending Review
              </Badge>
            }
          >
            <CardTitle>Leave Requests &amp; Approvals</CardTitle>
            <CardDescription>
              Review and act on submitted time-off requests. Actions update statistics and tables in real time.
            </CardDescription>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-brand-border bg-slate-50/70 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-6">Employee</th>
                  <th className="py-3 px-4">Leave Type</th>
                  <th className="py-3 px-4">Schedule Dates</th>
                  <th className="py-3 px-4 text-center">Duration</th>
                  <th className="py-3 px-4">Current Status</th>
                  <th className="py-3 px-6 text-right">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/60">
                {leaveRequests.map((req) => {
                  const isPending = req.status?.toUpperCase() === 'PENDING';
                  const st = req.status?.toUpperCase();
                  return (
                    <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Employee */}
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-3">
                          <Avatar name={req.employeeName} size="sm" />
                          <div>
                            <p className="font-bold text-brand-navy">{req.employeeName}</p>
                            <p className="text-[10px] text-slate-400">{req.employeeRole}</p>
                          </div>
                        </div>
                      </td>

                      {/* Leave Type */}
                      <td className="py-3.5 px-4 font-semibold text-brand-text">
                        {req.leaveType}
                      </td>

                      {/* Schedule */}
                      <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                        {req.startDate} &rarr; {req.endDate}
                      </td>

                      {/* Duration */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-brand-navy">{req.days}</span>{' '}
                        <span className="text-[10px] text-slate-400">
                          {req.days === 1 ? 'day' : 'days'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {st === 'APPROVED' && (
                          <Badge variant="success" size="sm" dot>
                            Approved
                          </Badge>
                        )}
                        {st === 'REJECTED' && (
                          <Badge variant="rejected" size="sm" dot>
                            Rejected
                          </Badge>
                        )}
                        {st === 'PENDING' && (
                          <Badge variant="pending" size="sm" dot>
                            Pending Review
                          </Badge>
                        )}
                        {st === 'CANCELLED' && (
                          <Badge variant="neutral" size="sm">
                            Cancelled
                          </Badge>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-6 text-right">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              className="text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                              leftIcon={Check}
                              onClick={() => setSelectedLeaveAction({ request: req, action: 'approve' })}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                              leftIcon={X}
                              onClick={() => setSelectedLeaveAction({ request: req, action: 'reject' })}
                            >
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            Reviewed ({req.status})
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <CardFooter className="flex items-center justify-between text-xs text-slate-500">
            <span>Showing all {leaveRequests.length} recorded leave submissions.</span>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-brand-blue"
              onClick={() => navigate('/leaves')}
            >
              Full Leave Policy &amp; Ledger &rarr;
            </Button>
          </CardFooter>
        </Card>
      </section>

      {/* 5. Employee Overview Table */}
      <section>
        <Card>
          <CardHeader
            action={
              <Button
                variant="primary"
                size="sm"
                leftIcon={Plus}
                onClick={() => navigate('/employees')}
              >
                Add Staff Member
              </Button>
            }
          >
            <CardTitle>Company Workforce Directory (6 Fictional Staff)</CardTitle>
            <CardDescription>
              Complete staff roster, active departments, attendance, and sprint workload status.
            </CardDescription>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-brand-border bg-slate-50/70 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-6">Employee Profile</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Today's Attendance</th>
                  <th className="py-3 px-4">Sprint Tasks</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/60">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-3">
                        <Avatar name={emp.name} size="md" status={emp.attendanceStatus === 'present' ? 'online' : emp.attendanceStatus === 'late' ? 'away' : 'offline'} />
                        <div>
                          <p className="font-bold text-brand-navy">{emp.name}</p>
                          <p className="text-[11px] text-brand-blue font-medium">{emp.role}</p>
                          <p className="text-[10px] text-slate-400">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-brand-text">
                      <Badge variant="neutral" size="sm">
                        {emp.department}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4">
                      {emp.attendanceStatus === 'present' && (
                        <Badge variant="success" size="sm" dot>
                          Present ({emp.checkInTime})
                        </Badge>
                      )}
                      {emp.attendanceStatus === 'late' && (
                        <Badge variant="warning" size="sm" dot>
                          Late ({emp.checkInTime})
                        </Badge>
                      )}
                      {emp.attendanceStatus === 'on_leave' && (
                        <Badge variant="rejected" size="sm" dot>
                          On Approved Leave
                        </Badge>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {emp.taskStatusSummary}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={Eye}
                        onClick={() => setPreviewEmployee(emp)}
                      >
                        View Profile
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <CardFooter className="flex items-center justify-between text-xs text-slate-500">
            <span>6 out of 6 technology staff profiles active.</span>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-brand-blue"
              onClick={() => navigate('/employees')}
            >
              Open Complete Employee Hub &rarr;
            </Button>
          </CardFooter>
        </Card>
      </section>

      {/* 6. Task Performance & Recent Activity (Split Grid) */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Performance Recharts Visualization */}
        <Card className="flex flex-col justify-between">
          <CardHeader action={<Badge variant="navy">Sprint 24</Badge>}>
            <CardTitle>Task &amp; Performance Distribution</CardTitle>
            <CardDescription>
              Sprint deliverables breakdown across all engineering &amp; design workstreams.
            </CardDescription>
          </CardHeader>
          <CardBody className="py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-6">
              {/* Pie Chart */}
              <div className="h-52 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={TASK_STATUS_DISTRIBUTION}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {TASK_STATUS_DISTRIBUTION.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#101B35',
                        border: 'none',
                        borderRadius: '0.75rem',
                        color: '#FFFFFF',
                        fontSize: '12px',
                      }}
                      itemStyle={{ color: '#FFFFFF' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Breakdown Legend List */}
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-brand-success" />
                    <span className="text-xs font-bold text-emerald-900">Completed Tasks</span>
                  </div>
                  <span className="text-sm font-extrabold text-emerald-800">12 (60%)</span>
                </div>

                <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-brand-blue" />
                    <span className="text-xs font-bold text-blue-900">In Progress</span>
                  </div>
                  <span className="text-sm font-extrabold text-blue-800">6 (30%)</span>
                </div>

                <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-brand-danger" />
                    <span className="text-xs font-bold text-rose-900">Overdue Review</span>
                  </div>
                  <span className="text-sm font-extrabold text-rose-800">2 (10%)</span>
                </div>
              </div>
            </div>
          </CardBody>
          <CardFooter className="flex items-center justify-between text-xs text-slate-500">
            <span>20 total sprint stories assigned to date.</span>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-brand-blue"
              onClick={() => navigate('/tasks')}
            >
              Manage Tasks &rarr;
            </Button>
          </CardFooter>
        </Card>

        {/* Recent Activity Timeline */}
        <Card className="flex flex-col justify-between">
          <CardHeader action={<Badge variant="info">Live Feed</Badge>}>
            <CardTitle>Recent Workplace Activity</CardTitle>
            <CardDescription>
              Real-time audit log of check-ins, requests, and announcements (America/Chicago).
            </CardDescription>
          </CardHeader>
          <CardBody className="p-5 space-y-4">
            {RECENT_ACTIVITIES.map((act) => (
              <div key={act.id} className="flex items-start gap-3.5 group">
                <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-brand-navy shadow-subtle group-hover:bg-brand-blue group-hover:text-white transition-colors">
                  {act.type === 'check_in' && <Clock className="w-4 h-4 text-brand-blue group-hover:text-white" />}
                  {act.type === 'check_in_late' && <BadgeAlert className="w-4 h-4 text-brand-warning group-hover:text-white" />}
                  {act.type === 'leave_request' && <CalendarCheck className="w-4 h-4 text-brand-navy group-hover:text-white" />}
                  {act.type === 'task_complete' && <CheckCircle2 className="w-4 h-4 text-brand-success group-hover:text-white" />}
                  {act.type === 'announcement' && <Megaphone className="w-4 h-4 text-brand-blue group-hover:text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-brand-navy truncate">{act.title}</p>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0">
                      {act.timestamp}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{act.description}</p>
                </div>
              </div>
            ))}
          </CardBody>
          <CardFooter className="text-xs text-slate-500">
            <span>Audit events preserved in UTC on backend, rendered in CST.</span>
          </CardFooter>
        </Card>
      </section>

      {/* 7. Live Payroll Summary & Recent Announcements (Split Grid) */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Payroll Summary Card */}
        <Card className="flex flex-col justify-between">
          <CardHeader
            action={
              <Badge variant="navy" size="sm">
                {payrollStats?.processedMonth || 'November 2026'}
              </Badge>
            }
          >
            <CardTitle>Payroll &amp; Compensation Status</CardTitle>
            <CardDescription>
              Aggregated salary disbursements and payment statuses from live payroll registry.
            </CardDescription>
          </CardHeader>
          <CardBody className="p-5 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-brand-border">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Net Payroll</span>
                <p className="text-lg font-extrabold text-brand-navy mt-1">
                  ${((payrollStats?.totalNet || 39800)).toLocaleString()}
                </p>
                <span className="text-[10px] text-slate-500">6 Salaried Employees</span>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
                <span className="text-[10px] uppercase font-bold text-emerald-800">Paid Vouchers</span>
                <p className="text-lg font-extrabold text-emerald-700 mt-1">
                  {payrollStats?.paidCount ?? 6}
                </p>
                <span className="text-[10px] text-emerald-600">Direct Deposit</span>
              </div>
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-100">
                <span className="text-[10px] uppercase font-bold text-amber-800">Pending Pay</span>
                <p className="text-lg font-extrabold text-amber-700 mt-1">
                  {payrollStats?.pendingCount ?? 0}
                </p>
                <span className="text-[10px] text-amber-600">Ready to Disburse</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-blue/10 text-brand-blue flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-brand-navy">Monthly Cycle Status</p>
                  <p className="text-[11px] text-slate-500">
                    Gross compensation of ${((payrollStats?.totalGross || 48500)).toLocaleString()} with automated tax deductions.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-xs shrink-0"
                onClick={() => navigate('/payroll')}
              >
                Payroll Console
              </Button>
            </div>
          </CardBody>
          <CardFooter className="flex items-center justify-between text-xs text-slate-500">
            <span>Direct deposit compliance verified for State of Illinois.</span>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-brand-blue"
              onClick={() => navigate('/payroll')}
            >
              Manage Salary Structures &rarr;
            </Button>
          </CardFooter>
        </Card>

        {/* Company Announcements Broadcasts Card */}
        <Card className="flex flex-col justify-between">
          <CardHeader
            action={
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-brand-blue"
                onClick={() => navigate('/announcements')}
              >
                Manage Bulletins &rarr;
              </Button>
            }
          >
            <CardTitle>Company Announcements</CardTitle>
            <CardDescription>
              Broadcasted notices visible to employees across teams.
            </CardDescription>
          </CardHeader>
          <CardBody className="p-5 space-y-3">
            {recentAnnouncements.length > 0 ? (
              recentAnnouncements.slice(0, 3).map((ann) => (
                <div
                  key={ann._id || ann.id}
                  className="p-3 rounded-xl bg-slate-50/70 hover:bg-slate-50 border border-brand-border/70 transition-all flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Megaphone className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-brand-navy truncate">{ann.title}</p>
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{ann.description || ann.content}</p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Audience: {ann.targetAudience} &bull; {ann.publishDate ? new Date(ann.publishDate).toLocaleDateString() : 'Active'}
                      </p>
                    </div>
                  </div>
                  <Badge variant={ann.priority === 'HIGH' ? 'danger' : 'neutral'} size="sm">
                    {ann.priority || 'NORMAL'}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                <Megaphone className="w-6 h-6 mx-auto mb-2 opacity-50" />
                No active announcements published yet.
              </div>
            )}
          </CardBody>
          <CardFooter className="flex items-center justify-between text-xs text-slate-500">
            <span>Read tracking active across all published notices.</span>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-brand-blue"
              onClick={() => navigate('/announcements')}
            >
              Publish New Bulletin &rarr;
            </Button>
          </CardFooter>
        </Card>
      </section>

      {/* 8. Quick Actions Navigation Grid */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-brand-navy tracking-tight">
            Administrative Shortcuts
          </h2>
          <p className="text-xs text-brand-text-secondary">
            Jump directly into core management modules.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {[
            { label: 'Add Employee', icon: Users, path: '/employees', color: 'text-brand-blue bg-blue-50' },
            { label: 'View Attendance', icon: Clock, path: '/attendance', color: 'text-emerald-600 bg-emerald-50' },
            { label: 'Review Leaves', icon: CalendarCheck, path: '/leaves', color: 'text-amber-600 bg-amber-50' },
            { label: 'Manage Tasks', icon: CheckSquare, path: '/tasks', color: 'text-brand-navy bg-slate-100' },
            { label: 'New Announcement', icon: Megaphone, path: '/announcements', color: 'text-indigo-600 bg-indigo-50' },
          ].map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                type="button"
                onClick={() => navigate(action.path)}
                className="p-4 rounded-2xl bg-white border border-brand-border shadow-card hover:shadow-md hover:border-slate-300 transition-all text-left flex flex-col justify-between gap-3 group focus:outline-none focus:ring-2 focus:ring-brand-blue"
              >
                <div className={`w-10 h-10 rounded-xl ${action.color} flex items-center justify-center shrink-0 transition-transform group-hover:scale-105`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-bold text-brand-navy group-hover:text-brand-blue transition-colors">
                    {action.label}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-brand-blue group-hover:translate-x-0.5 transition-all" />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Leave Approval / Rejection Confirmation Modal */}
      {selectedLeaveAction && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedLeaveAction(null)}
          title={
            selectedLeaveAction.action === 'approve'
              ? 'Approve Leave Application'
              : 'Reject Leave Application'
          }
          description={`Review request for ${selectedLeaveAction.request.employeeName} (${selectedLeaveAction.request.leaveType})`}
          footer={
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedLeaveAction(null)}
              >
                Cancel
              </Button>
              <Button
                variant={selectedLeaveAction.action === 'approve' ? 'primary' : 'danger'}
                size="sm"
                leftIcon={selectedLeaveAction.action === 'approve' ? Check : X}
                onClick={handleConfirmLeaveAction}
              >
                {selectedLeaveAction.action === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
              </Button>
            </>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Applicant:</span>
                <span className="font-bold text-brand-navy">{selectedLeaveAction.request.employeeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Leave Dates:</span>
                <span className="font-mono text-brand-navy">
                  {selectedLeaveAction.request.startDate} to {selectedLeaveAction.request.endDate} ({selectedLeaveAction.request.days} days)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Reason Stated:</span>
                <span className="text-slate-700 italic">"{selectedLeaveAction.request.reason}"</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-brand-text mb-1.5">
                Administrative Remarks / Notes (Optional)
              </label>
              <textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder={
                  selectedLeaveAction.action === 'approve'
                    ? 'e.g. Approved. Ensure handoff document is logged in Jira.'
                    : 'e.g. Please reschedule due to Q4 customer release window.'
                }
                rows={2}
                className="w-full rounded-xl bg-white text-xs text-brand-text border border-brand-border p-3 focus:outline-none focus:ring-2 focus:ring-brand-blue"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Employee Profile Quick Preview Modal */}
      {previewEmployee && (
        <Modal
          isOpen={true}
          onClose={() => setPreviewEmployee(null)}
          title="Fictional Employee Profile"
          description={`Details for ${previewEmployee.name} (${previewEmployee.id})`}
          footer={
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                const targetId = previewEmployee.id;
                setPreviewEmployee(null);
                navigate(`/employees/${targetId}`);
              }}
            >
              Open Full Employee Profile
            </Button>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <Avatar name={previewEmployee.name} size="xl" status={previewEmployee.attendanceStatus === 'present' ? 'online' : 'offline'} />
              <div>
                <h3 className="text-base font-bold text-brand-navy">{previewEmployee.name}</h3>
                <p className="text-xs font-semibold text-brand-blue">{previewEmployee.role}</p>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">{previewEmployee.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-brand-border bg-white">
                <span className="text-[10px] uppercase font-bold text-slate-400">Department</span>
                <p className="text-xs font-bold text-brand-navy mt-0.5">{previewEmployee.department}</p>
              </div>
              <div className="p-3 rounded-xl border border-brand-border bg-white">
                <span className="text-[10px] uppercase font-bold text-slate-400">Shift Check-in</span>
                <p className="text-xs font-bold text-brand-navy mt-0.5">{previewEmployee.checkInTime || 'On Leave'}</p>
              </div>
              <div className="p-3 rounded-xl border border-brand-border bg-white">
                <span className="text-[10px] uppercase font-bold text-slate-400">Active Tasks</span>
                <p className="text-xs font-bold text-brand-navy mt-0.5">{previewEmployee.taskStatusSummary}</p>
              </div>
              <div className="p-3 rounded-xl border border-brand-border bg-white">
                <span className="text-[10px] uppercase font-bold text-slate-400">Timezone</span>
                <p className="text-xs font-bold text-brand-navy mt-0.5">America/Chicago (CST)</p>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
