import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  CalendarCheck,
  CheckSquare,
  BadgeDollarSign,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  CheckCircle2,
  Calendar,
  Sparkles,
  Megaphone,
  MessageSquare,
  Play,
  Square,
  Plus,
  AlertCircle,
  Check,
  X,
  User,
  Coffee,
  Activity,
  Layers,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import {
  getChicagoGreeting,
  formatChicagoDate,
  formatChicagoTime,
  getChicagoNow,
} from '../../utils/timezone';
import {
  getActivePunch,
  checkInEmployee,
  checkOutEmployee,
  checkInBackend,
  checkOutBackend,
  fetchTodayAttendanceFromBackend,
} from '../../services/attendanceService';
import {
  getEmployeeLeaveBalance,
  fetchMyBalanceFromBackend,
  fetchMyLeavesFromBackend,
} from '../../services/leaveService';
import {
  fetchAnnouncementsFromBackend,
  markAnnouncementReadBackend,
} from '../../services/announcementService';
import { fetchMyPayrollFromBackend } from '../../services/payrollService';
import { getStoredTasks, updateTask, updateTaskBackend, fetchMyTasksFromBackend } from '../../services/taskService';
import {
  INITIAL_EMPLOYEE_ATTENDANCE,
  EMPLOYEE_LEAVE_BALANCES,
  EMPLOYEE_RECENT_LEAVES,
  INITIAL_EMPLOYEE_TASKS,
  UPCOMING_HOLIDAYS,
  EMPLOYEE_ANNOUNCEMENTS,
} from '../../data/employeeDashboardData';

import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Card, { CardHeader, CardTitle, CardDescription, CardBody, CardFooter } from '../../components/common/Card';
import Avatar from '../../components/common/Avatar';

const ATTENDANCE_STORAGE_KEY = 'visartech_employee_attendance';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Dynamic Chicago greeting and current date
  const greeting = useMemo(() => getChicagoGreeting(), []);
  const todayChicagoDate = useMemo(() => formatChicagoDate(), []);

  // Live Chicago wall clock
  const [currentTimeDisplay, setCurrentTimeDisplay] = useState(() => formatChicagoTime());

  // Interactive Attendance State (hydrated from localStorage)
  const [attendance, setAttendance] = useState(() => {
    try {
      const saved = localStorage.getItem(ATTENDANCE_STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_EMPLOYEE_ATTENDANCE;
    } catch {
      return INITIAL_EMPLOYEE_ATTENDANCE;
    }
  });

  // Interactive Tasks State synced with centralized Task Service
  const empId = user?.id || 'EMP-006';
  const [tasks, setTasks] = useState(() => {
    const all = getStoredTasks();
    const my = all.filter((t) => t.assignedEmployeeId === empId);
    return my.length > 0 ? my : INITIAL_EMPLOYEE_TASKS;
  });

  // Dynamic Leave Balances from Leave Service
  const [liveLeaveBalances, setLiveLeaveBalances] = useState(() =>
    getEmployeeLeaveBalance(empId)
  );

  // Recent leave applications
  const [recentLeaves, setRecentLeaves] = useState(() => EMPLOYEE_RECENT_LEAVES);

  // Recent payslip
  const [myPayroll, setMyPayroll] = useState(null);

  useEffect(() => {
    const handleSync = () => {
      setLiveLeaveBalances(getEmployeeLeaveBalance(empId));
      const all = getStoredTasks();
      const my = all.filter((t) => t.assignedEmployeeId === empId);
      if (my.length > 0) setTasks(my);
    };
    window.addEventListener('leaves-updated', handleSync);
    window.addEventListener('tasks-updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('leaves-updated', handleSync);
      window.removeEventListener('tasks-updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [user, empId]);

  // Interactive Announcements State (read/unread toggles)
  const [announcements, setAnnouncements] = useState(EMPLOYEE_ANNOUNCEMENTS);

  // Notification / Alert Banner
  const [actionAlert, setActionAlert] = useState(null);

  // Working Hours calculation
  const [elapsedDuration, setElapsedDuration] = useState('7h 45m');

  // Live Clock effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeDisplay(formatChicagoTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Save attendance to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(attendance));
    } catch (err) {
      console.error('Failed to persist demo attendance:', err);
    }
  }, [attendance]);

  // Synchronize with live backend on mount
  useEffect(() => {
    let isMounted = true;
    async function syncBackendData() {
      try {
        const [livePunch, liveTasks, liveBalance, liveLeaves, livePayroll, liveAnnouncements] = await Promise.all([
          fetchTodayAttendanceFromBackend(empId).catch(() => null),
          fetchMyTasksFromBackend().catch(() => null),
          fetchMyBalanceFromBackend().catch(() => null),
          fetchMyLeavesFromBackend().catch(() => null),
          fetchMyPayrollFromBackend().catch(() => null),
          fetchAnnouncementsFromBackend().catch(() => null),
        ]);

        if (isMounted) {
          if (livePunch) {
            setAttendance((prev) => ({
              ...prev,
              isCheckedIn: livePunch.isCheckedIn,
              checkInTime: livePunch.checkInTime,
              checkInDisplayTime: livePunch.checkInDisplay,
              checkOutTime: livePunch.checkOutTime,
              checkOutDisplayTime: livePunch.checkOutDisplay,
              status: livePunch.status || prev.status,
              totalHoursCompletedToday: livePunch.completedHours || prev.totalHoursCompletedToday,
            }));
          }
          if (Array.isArray(liveTasks) && liveTasks.length > 0) {
            setTasks(liveTasks.map((t) => ({
              id: t._id || t.id,
              taskId: t.taskId,
              title: t.title,
              description: t.description,
              assignedEmployeeId: t.assignedEmployeeId,
              status: t.status,
              priority: t.priority,
              dueDate: t.dueDate,
              progress: t.progress,
              estimatedHours: t.estimatedHours,
              actualHours: t.actualHours,
              project: t.project || 'Engineering',
            })));
          }
          if (liveBalance) {
            setLiveLeaveBalances((prev) => ({
              ...prev,
              casual: liveBalance.casual || prev.casual,
              sick: liveBalance.sick || prev.sick,
              paid: liveBalance.annual || liveBalance.paid || prev.paid,
              totalRemaining:
                (liveBalance.casual?.remaining || 0) +
                (liveBalance.sick?.remaining || 0) +
                ((liveBalance.annual?.remaining || liveBalance.paid?.remaining) || 0),
            }));
          }
          if (liveLeaves?.leaves?.length > 0) {
            setRecentLeaves(liveLeaves.leaves);
          }
          if (Array.isArray(livePayroll) && livePayroll.length > 0) {
            setMyPayroll(livePayroll[0]);
          }
          if (liveAnnouncements?.announcements?.length > 0) {
            setAnnouncements(liveAnnouncements.announcements.map((a) => ({
              id: a._id || a.id,
              title: a.title,
              preview: a.description || a.content,
              author: 'People Operations',
              date: a.publishDate ? new Date(a.publishDate).toLocaleDateString() : 'Today',
              isUnread: !(a.readBy && a.readBy.includes(empId)),
            })));
          }
        }
      } catch (err) {
        console.warn('Backend sync error in employee dashboard:', err);
      }
    }
    syncBackendData();
    return () => {
      isMounted = false;
    };
  }, [empId]);

  // Compute live elapsed working duration
  useEffect(() => {
    if (attendance.isCheckedIn && attendance.checkInTime) {
      const updateElapsed = () => {
        const checkInMs = new Date(attendance.checkInTime).getTime();
        const nowMs = new Date().getTime();
        const diffMs = Math.max(0, nowMs - checkInMs);

        // Standard simulation: 7 hours base offset + actual session mins
        const totalMinutes = Math.floor(diffMs / 60000) + (7 * 60 + 45);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        setElapsedDuration(`${hours}h ${minutes}m`);
      };

      updateElapsed();
      const interval = setInterval(updateElapsed, 60000);
      return () => clearInterval(interval);
    } else {
      setElapsedDuration(attendance.totalHoursCompletedToday ? `${attendance.totalHoursCompletedToday}h 00m` : '0h 00m');
    }
  }, [attendance]);

  // Check In Handler
  const handleCheckIn = async () => {
    try {
      const res = await checkInBackend(user || { id: 'EMP-006', name: 'Jordan Lee', department: 'Engineering' });
      setAttendance({
        ...attendance,
        isCheckedIn: true,
        checkInTime: res.checkInTime,
        checkInDisplayTime: res.checkInDisplay,
        checkOutTime: null,
        checkOutDisplayTime: null,
        status: res.status,
      });

      setActionAlert({
        type: 'success',
        message: `Successfully checked in at ${res.checkInDisplay} (America/Chicago). Your shift is now active.`,
      });

      setTimeout(() => setActionAlert(null), 5000);
    } catch (err) {
      setActionAlert({
        type: 'error',
        message: err.message || 'Check-in failed.',
      });
      setTimeout(() => setActionAlert(null), 5000);
    }
  };

  // Check Out Handler
  const handleCheckOut = async () => {
    try {
      const res = await checkOutBackend(user || { id: 'EMP-006', name: 'Jordan Lee', department: 'Engineering' });
      setAttendance({
        ...attendance,
        isCheckedIn: false,
        checkOutTime: res.checkOutTime,
        checkOutDisplayTime: res.checkOutDisplay,
        status: res.status,
        totalHoursCompletedToday: res.completedHours || 8,
      });

      setActionAlert({
        type: 'success',
        message: `Shift completed! Successfully checked out at ${res.checkOutDisplay}. ${res.completedHours || 8} hours recorded.`,
      });

      setTimeout(() => setActionAlert(null), 5000);
    } catch (err) {
      setActionAlert({
        type: 'error',
        message: err.message || 'Check-out failed.',
      });
      setTimeout(() => setActionAlert(null), 5000);
    }
  };

  // Task Status Update Handler
  const handleTaskStatusChange = async (taskId, newStatus) => {
    try {
      await updateTaskBackend(taskId, { status: newStatus });
    } catch (err) {
      console.warn('Backend task update failed, falling back to local:', err);
    }
    const res = updateTask(taskId, { status: newStatus }, 'EMPLOYEE', empId);
    if (res.success) {
      setTasks((prevTasks) =>
        prevTasks.map((t) => (t.id === taskId || t._id === taskId ? { ...t, status: newStatus } : t))
      );
      setActionAlert({
        type: 'success',
        message: `Task status updated to "${newStatus.replace('_', ' ')}".`,
      });
    } else {
      setActionAlert({
        type: 'error',
        message: res.error || 'Failed to update task status.',
      });
    }
    setTimeout(() => setActionAlert(null), 4000);
  };

  // Mark announcement read
  const handleToggleAnnouncement = async (id) => {
    try {
      await markAnnouncementReadBackend(id);
    } catch (err) {
      console.warn('Mark announcement read error in backend:', err);
    }
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isUnread: false } : a))
    );
  };

  // Dynamic counts for tasks
  const completedTasksCount = tasks.filter((t) => t.status === 'COMPLETED').length;
  const activeTasksCount = tasks.filter((t) => t.status !== 'COMPLETED').length;
  const totalLeaveBalance = liveLeaveBalances.totalRemaining;

  return (
    <div className="space-y-8">
      {/* 1. Employee Dashboard Header */}
      <PageHeader
        title={`${greeting}, ${user?.name || 'Jordan Lee'}`}
        subtitle={`${user?.title || 'Full Stack Software Engineer'} &bull; ${user?.department || 'Engineering'} Department &bull; ${todayChicagoDate}.`}
        badge={
          <Badge variant="info" size="md" dot>
            EMPLOYEE Self-Service
          </Badge>
        }
        breadcrumbs={[
          { label: 'VISARTECH People', href: '#' },
          { label: 'My Workspace', href: '#' },
          { label: 'Personal Dashboard' },
        ]}
        actions={
          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={CalendarCheck}
              onClick={() => navigate('/leaves')}
            >
              Apply for Leave
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={Clock}
              onClick={() => navigate('/attendance')}
            >
              Timesheet &amp; Attendance
            </Button>
          </div>
        }
      />

      {/* Action / Success Feedback Alert */}
      {actionAlert && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between shadow-subtle animate-in fade-in duration-200 ${
            actionAlert.type === 'error'
              ? 'bg-brand-danger-light border-brand-danger/30 text-brand-danger'
              : 'bg-brand-success-light border-brand-success/30 text-brand-success'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {actionAlert.type === 'error' ? (
              <AlertCircle className="w-5 h-5 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            )}
            <span className="font-semibold text-sm">{actionAlert.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionAlert(null)}
            className="p-1 rounded-lg hover:bg-black/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Employee Identity Card */}
      <div className="bg-gradient-to-r from-[#101B35] to-[#1A294C] rounded-2xl p-5 sm:p-6 text-white border border-[#1A294C] shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <Avatar name={user?.name || 'Jordan Lee'} size="lg" status="online" />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] uppercase font-extrabold tracking-wider text-[#60A5FA]">
                Staff Self-Service Workspace
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                Fictional Profile
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold">
              {user?.name} &bull; {user?.title}
            </h2>
            <p className="text-xs text-slate-300 mt-0.5 max-w-xl leading-relaxed">
              Your personalized workspace for shift attendance punches, leave balances, assigned engineering tasks, and team notices.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="bg-white/10 text-white border-white/20 hover:bg-white/20 shrink-0"
            leftIcon={User}
            onClick={() => navigate('/profile')}
          >
            View My Profile
          </Button>
        </div>
      </div>

      {/* 2. Personal Statistics Cards (6 Cards) */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Personal Performance &amp; Entitlements
          </h2>
          <span className="text-[11px] font-semibold text-slate-400">
            * Sample demo figures
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard
            title="Month Attendance"
            value="21 / 22"
            icon={Clock}
            iconColor="emerald"
            trend="95.4%"
            trendType="up"
            description="On-time shifts"
          />
          <StatCard
            title="Leave Balance"
            value={`${totalLeaveBalance} Days`}
            icon={CalendarCheck}
            iconColor="blue"
            trend="Available"
            trendType="up"
            description="Casual, Sick &amp; Paid"
          />
          <StatCard
            title="Pending Requests"
            value={`${liveLeaveBalances.pendingCount} Request${liveLeaveBalances.pendingCount === 1 ? '' : 's'}`}
            icon={Calendar}
            iconColor="amber"
            trend={liveLeaveBalances.pendingCount > 0 ? "In Review" : "No Pending"}
            trendType={liveLeaveBalances.pendingCount > 0 ? "neutral" : "up"}
            description={liveLeaveBalances.pendingCount > 0 ? "Awaiting HR decision" : "All requests settled"}
          />
          <StatCard
            title="Assigned Tasks"
            value={`${activeTasksCount}`}
            icon={CheckSquare}
            iconColor="navy"
            trend="Sprint 24"
            trendType="neutral"
            description="Active tickets"
          />
          <StatCard
            title="Completed Tasks"
            value={`${completedTasksCount}`}
            icon={CheckCircle2}
            iconColor="emerald"
            trend={`+${completedTasksCount}`}
            trendType="up"
            description="Done this sprint"
          />
          <StatCard
            title="Upcoming Holiday"
            value="Nov 26"
            icon={Coffee}
            iconColor="blue"
            trend="In 9 days"
            trendType="neutral"
            description="Thanksgiving Day"
          />
        </div>
      </section>

      {/* 3. Interactive Attendance Widget & Leave Summary (Split Grid) */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Functional Attendance Punch Widget */}
        <div className="lg:col-span-1">
          <Card className="h-full flex flex-col justify-between border-brand-blue/30 shadow-md">
            <CardHeader
              action={
                <Badge
                  variant={attendance.isCheckedIn ? 'success' : 'neutral'}
                  size="sm"
                  dot={attendance.isCheckedIn}
                >
                  {attendance.status}
                </Badge>
              }
            >
              <CardTitle>Attendance Punch Widget</CardTitle>
              <CardDescription>Real-time CST shift clock (America/Chicago)</CardDescription>
            </CardHeader>

            <CardBody className="p-6 space-y-6">
              {/* Digital Clock Display */}
              <div className="text-center p-4 rounded-2xl bg-brand-bg border border-brand-border/80 shadow-subtle">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Current Chicago Time (CST)
                </p>
                <div className="text-3xl font-mono font-extrabold text-brand-navy my-1">
                  {currentTimeDisplay}
                </div>
                <p className="text-xs text-brand-text-secondary">{todayChicagoDate}</p>
              </div>

              {/* Shift Stats */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-brand-border">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Check-In Time
                  </span>
                  <span className="font-bold text-brand-navy text-sm">
                    {attendance.checkInDisplayTime || '--:--'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-brand-border">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Logged Duration
                  </span>
                  <span className="font-bold text-brand-blue text-sm">
                    {elapsedDuration}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button
                  variant="primary"
                  size="md"
                  leftIcon={Play}
                  onClick={handleCheckIn}
                  disabled={attendance.isCheckedIn}
                  className={attendance.isCheckedIn ? 'opacity-50 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 shadow-sm'}
                >
                  Check In
                </Button>
                <Button
                  variant="danger"
                  size="md"
                  leftIcon={Square}
                  onClick={handleCheckOut}
                  disabled={!attendance.isCheckedIn}
                  className={!attendance.isCheckedIn ? 'opacity-50 cursor-not-allowed' : 'shadow-sm'}
                >
                  Check Out
                </Button>
              </div>
            </CardBody>

            <CardFooter className="text-[11px] text-slate-500 flex items-center justify-between">
              <span>Shift: 9:00 AM – 5:00 PM CST</span>
              <span className="font-semibold text-slate-400">localStorage synced</span>
            </CardFooter>
          </Card>
        </div>

        {/* 4. Leave Summary & Balances */}
        <div className="lg:col-span-2">
          <Card className="h-full flex flex-col justify-between">
            <CardHeader
              action={
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={Plus}
                  onClick={() => navigate('/leaves')}
                >
                  Apply for Leave
                </Button>
              }
            >
              <CardTitle>My Leave Entitlements &amp; History</CardTitle>
              <CardDescription>
                Allocated annual allowances, used days, and recent request status.
              </CardDescription>
            </CardHeader>

            <CardBody className="space-y-6">
              {/* Leave Balances Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100 flex flex-col justify-between">
                  <span className="text-xs font-bold text-blue-900">Casual Leave (CL)</span>
                  <div className="mt-2">
                    <span className="text-2xl font-extrabold text-brand-blue">
                      {liveLeaveBalances.casual?.remaining ?? 4}
                    </span>
                    <span className="text-xs text-slate-500 ml-1">/ {liveLeaveBalances.casual?.total ?? 6} Days Left</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-1.5 mt-2">
                    <div
                      className="bg-brand-blue h-1.5 rounded-full"
                      style={{
                        width: `${Math.min(100, Math.round(((liveLeaveBalances.casual?.remaining ?? 4) / (liveLeaveBalances.casual?.total || 6)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-100 flex flex-col justify-between">
                  <span className="text-xs font-bold text-emerald-900">Sick / Medical (SL)</span>
                  <div className="mt-2">
                    <span className="text-2xl font-extrabold text-brand-success">
                      {liveLeaveBalances.sick?.remaining ?? 5}
                    </span>
                    <span className="text-xs text-slate-500 ml-1">/ {liveLeaveBalances.sick?.total ?? 8} Days Left</span>
                  </div>
                  <div className="w-full bg-emerald-200 rounded-full h-1.5 mt-2">
                    <div
                      className="bg-brand-success h-1.5 rounded-full"
                      style={{
                        width: `${Math.min(100, Math.round(((liveLeaveBalances.sick?.remaining ?? 5) / (liveLeaveBalances.sick?.total || 8)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-100 flex flex-col justify-between">
                  <span className="text-xs font-bold text-indigo-900">Annual Paid Leave (PL)</span>
                  <div className="mt-2">
                    <span className="text-2xl font-extrabold text-indigo-700">
                      {liveLeaveBalances.paid?.remaining ?? (liveLeaveBalances.annual?.remaining ?? 7)}
                    </span>
                    <span className="text-xs text-slate-500 ml-1">/ {liveLeaveBalances.paid?.total ?? (liveLeaveBalances.annual?.total ?? 14)} Days Left</span>
                  </div>
                  <div className="w-full bg-indigo-200 rounded-full h-1.5 mt-2">
                    <div
                      className="bg-indigo-600 h-1.5 rounded-full"
                      style={{
                        width: `${Math.min(100, Math.round(((liveLeaveBalances.paid?.remaining ?? 7) / (liveLeaveBalances.paid?.total || 14)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Recent Requests Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Recent Time-Off Applications
                  </p>
                  <span className="text-xs text-slate-500">{recentLeaves.filter(r => (r.status || '').toUpperCase() === 'PENDING').length} pending review</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-brand-border bg-slate-50/70 text-slate-500 font-semibold uppercase text-[10px]">
                        <th className="py-2.5 px-4">Leave Type</th>
                        <th className="py-2.5 px-4">Dates</th>
                        <th className="py-2.5 px-4 text-center">Days</th>
                        <th className="py-2.5 px-4">Reason</th>
                        <th className="py-2.5 px-4 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/60">
                      {recentLeaves.slice(0, 3).map((l) => (
                        <tr key={l.id || l._id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 font-bold text-brand-navy">{l.leaveType || l.type}</td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                            {l.startDate} &rarr; {l.endDate}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-brand-navy">
                            {l.days}
                          </td>
                          <td className="py-3 px-4 text-slate-500 truncate max-w-xs">
                            {l.reason}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {(l.status || '').toUpperCase() === 'APPROVED' && (
                              <Badge variant="success" size="sm" dot>Approved</Badge>
                            )}
                            {(l.status || '').toUpperCase() === 'PENDING' && (
                              <Badge variant="pending" size="sm" dot>In Review</Badge>
                            )}
                            {(l.status || '').toUpperCase() === 'REJECTED' && (
                              <Badge variant="rejected" size="sm" dot>Declined</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardBody>

            <CardFooter className="flex items-center justify-between text-xs text-slate-500">
              <span>Leave cycles reset on December 31.</span>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-brand-blue"
                onClick={() => navigate('/leaves')}
              >
                View Full Leave Calendar &rarr;
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* 5. My Tasks Section (Interactive Demo Status Updater) */}
      <section>
        <Card>
          <CardHeader
            action={
              <Badge variant="info" size="sm">
                Sprint 24 &bull; {completedTasksCount}/{tasks.length} Done
              </Badge>
            }
          >
            <CardTitle>My Sprint Deliverables &amp; Tasks</CardTitle>
            <CardDescription>
              Update your task execution status in real time. Changes reflect immediately across personal sprint metrics.
            </CardDescription>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-brand-border bg-slate-50/70 text-slate-500 font-semibold uppercase text-[10px]">
                  <th className="py-3 px-6">Task Title &amp; Scope</th>
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-6 text-right">Execution Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/60">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-6">
                      <div className="min-w-0">
                        <p className="font-bold text-brand-navy">{task.title}</p>
                        <p className="text-[11px] text-slate-500 line-clamp-1">{task.description}</p>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-medium text-slate-700">
                      <Badge variant="neutral" size="sm">{task.project}</Badge>
                    </td>

                    <td className="py-3.5 px-4">
                      {task.priority === 'High' && (
                        <Badge variant="danger" size="sm">High Priority</Badge>
                      )}
                      {task.priority === 'Medium' && (
                        <Badge variant="warning" size="sm">Medium</Badge>
                      )}
                      {task.priority === 'Low' && (
                        <Badge variant="neutral" size="sm">Low</Badge>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                      {task.dueDate}
                    </td>

                    <td className="py-3.5 px-6 text-right">
                      {/* Interactive Status Selector */}
                      <select
                        value={task.status}
                        onChange={(e) => handleTaskStatusChange(task.id, e.target.value)}
                        className={`text-xs font-bold rounded-lg px-2.5 py-1 border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-blue ${
                          task.status === 'COMPLETED'
                            ? 'bg-brand-success-light text-brand-success border-brand-success/30'
                            : task.status === 'IN_PROGRESS'
                            ? 'bg-brand-blue-light text-brand-blue border-brand-blue/30'
                            : task.status === 'IN_REVIEW'
                            ? 'bg-brand-warning-light text-brand-warning border-brand-warning/30'
                            : 'bg-slate-100 text-slate-700 border-slate-300'
                        }`}
                      >
                        <option value="TODO">To Do</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="IN_REVIEW">In Review</option>
                        <option value="COMPLETED">Completed</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <CardFooter className="flex items-center justify-between text-xs text-slate-500">
            <span>You have {activeTasksCount} active tasks scheduled for this cycle.</span>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-brand-blue"
              onClick={() => navigate('/tasks')}
            >
              Open Full Kanban Board &rarr;
            </Button>
          </CardFooter>
        </Card>
      </section>

      {/* 6 & 7. Announcements, Holidays, and Recent Activity (Split Grid) */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 6. Company Announcements Panel */}
        <div className="lg:col-span-2">
          <Card className="h-full flex flex-col justify-between">
            <CardHeader
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-brand-blue"
                  onClick={() => navigate('/announcements')}
                >
                  View All &rarr;
                </Button>
              }
            >
              <CardTitle>Company Broadcasts &amp; Notices</CardTitle>
              <CardDescription>Official announcements published by People Operations.</CardDescription>
            </CardHeader>

            <CardBody className="p-5 space-y-3.5">
              {announcements.map((ann) => (
                <div
                  key={ann.id}
                  onClick={() => handleToggleAnnouncement(ann.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    ann.isUnread
                      ? 'bg-blue-50/50 border-blue-200 shadow-subtle'
                      : 'bg-white border-brand-border/70 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-brand-blue/10 text-brand-blue flex items-center justify-center shrink-0 border border-brand-blue/20">
                        <Megaphone className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <h4 className="text-xs font-bold text-brand-navy">{ann.title}</h4>
                          {ann.isUnread && (
                            <span className="w-2 h-2 rounded-full bg-brand-blue animate-pulse" title="Unread" />
                          )}
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-1">{ann.preview}</p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {ann.author} &bull; {ann.date}
                        </p>
                      </div>
                    </div>

                    <span className="text-[10px] text-brand-blue font-semibold shrink-0">
                      {ann.isUnread ? 'Mark Read' : 'Read'}
                    </span>
                  </div>
                </div>
              ))}
            </CardBody>

            <CardFooter className="text-xs text-slate-500">
              <span>Click any announcement to toggle its read/unread indicator.</span>
            </CardFooter>
          </Card>
        </div>

        {/* 7. Upcoming Holidays & Recent Activity */}
        <div className="space-y-6">
          {/* Upcoming Holidays Card */}
          <Card>
            <CardHeader action={<Badge variant="info" size="sm">2026 / 2027</Badge>}>
              <CardTitle>Upcoming Holidays</CardTitle>
              <CardDescription>Scheduled company office closures</CardDescription>
            </CardHeader>
            <CardBody className="p-4 space-y-2.5">
              {UPCOMING_HOLIDAYS.slice(0, 3).map((h) => (
                <div
                  key={h.name}
                  className="p-2.5 rounded-xl bg-slate-50 border border-brand-border flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-bold text-brand-navy">{h.name}</p>
                    <p className="text-[10px] text-slate-400">{h.date}</p>
                  </div>
                  <Badge variant="neutral" size="sm">{h.daysLeft}</Badge>
                </div>
              ))}
            </CardBody>
          </Card>

          {/* Recent Personal Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Personal timeline audit</CardDescription>
            </CardHeader>
            <CardBody className="p-4 space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-brand-navy">Checked In for Shift</p>
                  <p className="text-[10px] text-slate-500">Today at {attendance.checkInDisplayTime || '09:15 AM CST'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-brand-navy">Sprint Deliverable Completed</p>
                  <p className="text-[10px] text-slate-500">Unit Tests for Leave Calculations</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <CalendarCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-brand-navy">Leave Application Submitted</p>
                  <p className="text-[10px] text-slate-500">Dec 24-26 Annual Vacation (Pending)</p>
                </div>
              </div>
            </CardBody>
          </Card>
          {/* Latest Payslip Summary Card */}
          <Card>
            <CardHeader
              action={
                <Badge variant={myPayroll?.paymentStatus === 'PAID' ? 'success' : 'pending'} size="sm">
                  {myPayroll?.paymentStatus || 'PAID'}
                </Badge>
              }
            >
              <CardTitle>Latest Payslip Summary</CardTitle>
              <CardDescription>
                {myPayroll?.payrollMonth ? `Cycle: ${myPayroll.payrollMonth}` : 'Current Month: November 2026'}
              </CardDescription>
            </CardHeader>
            <CardBody className="p-4 space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-brand-border">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Net Take-Home Pay</span>
                  <p className="text-xl font-extrabold text-brand-navy">
                    ${((myPayroll?.netSalary || 6800)).toLocaleString()}
                  </p>
                </div>
                <Badge variant="navy" size="sm">Direct Deposit</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-slate-50/70 border border-slate-200">
                  <span className="text-[10px] text-slate-500">Gross Salary</span>
                  <p className="font-bold text-slate-700">${((myPayroll?.grossSalary || 8500)).toLocaleString()}</p>
                </div>
                <div className="p-2 rounded-lg bg-slate-50/70 border border-slate-200">
                  <span className="text-[10px] text-slate-500">Deductions</span>
                  <p className="font-bold text-slate-700">${((myPayroll?.deductions || 1700)).toLocaleString()}</p>
                </div>
              </div>
            </CardBody>
            <CardFooter className="flex items-center justify-between text-xs text-slate-500">
              <span>Disbursed via automated bank transfer</span>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-brand-blue"
                onClick={() => navigate('/payroll')}
              >
                View Full Payslip &rarr;
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* 8. Quick Actions Navigation Grid */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-brand-navy tracking-tight">
            Employee Quick Actions
          </h2>
          <p className="text-xs text-brand-text-secondary">
            Quickly navigate across your employee self-service tools.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {[
            { label: 'Apply for Leave', icon: CalendarCheck, path: '/leaves', color: 'text-brand-blue bg-blue-50' },
            { label: 'View Attendance', icon: Clock, path: '/attendance', color: 'text-emerald-600 bg-emerald-50' },
            { label: 'My Sprint Tasks', icon: CheckSquare, path: '/tasks', color: 'text-amber-600 bg-amber-50' },
            { label: 'My Profile', icon: User, path: '/profile', color: 'text-brand-navy bg-slate-100' },
            { label: 'Announcements', icon: Megaphone, path: '/announcements', color: 'text-indigo-600 bg-indigo-50' },
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
    </div>
  );
}
