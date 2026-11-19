import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Play,
  Square,
  CalendarCheck,
  CheckCircle2,
  AlertCircle,
  Calendar,
  X,
  Coffee,
  CheckSquare,
  Info,
  Activity,
  ArrowRight
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import {
  formatChicagoDate,
  formatChicagoTime,
  getChicagoGreeting,
} from '../../utils/timezone';
import {
  getActivePunch,
  checkInEmployee,
  checkOutEmployee,
  getEmployeeAttendanceHistory,
  ATTENDANCE_STATUS_TOKENS,
  checkInBackend,
  checkOutBackend,
  fetchTodayAttendanceFromBackend,
  fetchMyAttendanceFromBackend,
  fetchMySummaryFromBackend,
} from '../../services/attendanceService';

import PageHeader from '../common/PageHeader';
import StatCard from '../common/StatCard';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Card, { CardHeader, CardTitle, CardDescription, CardBody, CardFooter } from '../common/Card';

export default function EmployeeAttendanceView() {
  const { user } = useAuth();
  const empId = user?.id || user?.employeeId || 'EMP-006';

  // Greeting & Date
  const greeting = useMemo(() => getChicagoGreeting(), []);
  const todayChicagoDate = useMemo(() => formatChicagoDate(), []);

  // Live Chicago wall clock
  const [liveTime, setLiveTime] = useState(() => formatChicagoTime());

  // Active Punch State
  const [punchState, setPunchState] = useState(() => getActivePunch(empId));

  // Personal Attendance History
  const [history, setHistory] = useState(() => getEmployeeAttendanceHistory(empId));

  // Monthly Summary Metrics
  const [summaryMetrics, setSummaryMetrics] = useState(null);

  // Feedback Notification Alert
  const [alertMessage, setAlertMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Live timer tick
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTime(formatChicagoTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync with live backend on mount and when user changes
  useEffect(() => {
    let isMounted = true;

    async function loadBackendData() {
      try {
        // 1. Fetch today's live punch state
        const livePunch = await fetchTodayAttendanceFromBackend(empId);
        if (isMounted && livePunch) {
          setPunchState(livePunch);
        }

        // 2. Fetch personal history from live backend
        const myHistoryRes = await fetchMyAttendanceFromBackend({ limit: 30 });
        if (isMounted && myHistoryRes?.records?.length > 0) {
          setHistory(myHistoryRes.records);
        }

        // 3. Fetch personal summary metrics
        const summary = await fetchMySummaryFromBackend();
        if (isMounted && summary) {
          setSummaryMetrics(summary);
        }
      } catch (err) {
        console.warn('Backend sync failed, maintaining cached view:', err);
      }
    }

    loadBackendData();

    return () => {
      isMounted = false;
    };
  }, [user, empId]);

  // Listen to attendance updates
  useEffect(() => {
    const handleUpdate = () => {
      setPunchState(getActivePunch(empId));
      setHistory(getEmployeeAttendanceHistory(empId));
    };
    window.addEventListener('attendance-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('attendance-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [empId]);

  // Handle Punch In
  const handleCheckIn = async () => {
    setIsLoading(true);
    try {
      const res = await checkInBackend(user || { id: empId, name: 'Employee', department: 'Engineering' });
      setPunchState(res);
      const myHistoryRes = await fetchMyAttendanceFromBackend({ limit: 30 });
      if (myHistoryRes?.records) setHistory(myHistoryRes.records);
      setAlertMessage({
        type: 'success',
        text: `Checked in successfully at ${res.checkInDisplay} (America/Chicago). Shift is active.`,
      });
      setTimeout(() => setAlertMessage(null), 5000);
    } catch (err) {
      setAlertMessage({
        type: 'error',
        text: err.message || 'Check-in failed.',
      });
      setTimeout(() => setAlertMessage(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Punch Out
  const handleCheckOut = async () => {
    setIsLoading(true);
    try {
      const res = await checkOutBackend(user || { id: empId, name: 'Employee', department: 'Engineering' });
      setPunchState(res);
      const myHistoryRes = await fetchMyAttendanceFromBackend({ limit: 30 });
      if (myHistoryRes?.records) setHistory(myHistoryRes.records);
      setAlertMessage({
        type: 'success',
        text: `Checked out successfully at ${res.checkOutDisplay}. ${res.completedHours || 8} hours logged for today.`,
      });
      setTimeout(() => setAlertMessage(null), 5000);
    } catch (err) {
      setAlertMessage({
        type: 'error',
        text: err.message || 'Check-out failed.',
      });
      setTimeout(() => setAlertMessage(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  // Compute total weekly hours from personal history
  const totalWeeklyHours = useMemo(() => {
    return history.reduce((acc, curr) => acc + (Number(curr.totalHours) || 0), 0).toFixed(1);
  }, [history]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="My Attendance & Timesheet Console"
        subtitle={`Personal shift punches and working hours history standardized to America/Chicago (CST).`}
        badge={
          <Badge
            variant={punchState.isCheckedIn ? 'success' : 'neutral'}
            size="md"
            dot={punchState.isCheckedIn}
          >
            {punchState.isCheckedIn ? 'Checked In' : 'Checked Out'}
          </Badge>
        }
        breadcrumbs={[
          { label: 'VISARTECH People', href: '#' },
          { label: 'My Workspace', href: '#' },
          { label: 'Attendance' },
        ]}
      />

      {/* Action / Error / Success Notification */}
      {alertMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between shadow-subtle animate-in fade-in duration-150 ${
            alertMessage.type === 'error'
              ? 'bg-brand-danger-light border-brand-danger/30 text-brand-danger'
              : 'bg-brand-success-light border-brand-success/30 text-brand-success'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {alertMessage.type === 'error' ? (
              <AlertCircle className="w-5 h-5 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            )}
            <span className="font-semibold text-sm">{alertMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setAlertMessage(null)}
            className="p-1 rounded-lg hover:bg-black/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3 Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Current Shift Status"
          value={punchState.isCheckedIn ? 'Active Shift' : 'Shift Inactive'}
          icon={Clock}
          iconColor={punchState.isCheckedIn ? 'emerald' : 'blue'}
          trend={punchState.isCheckedIn ? 'On Duty' : 'Off Duty'}
          trendType={punchState.isCheckedIn ? 'up' : 'neutral'}
          description={punchState.checkInDisplay ? `Punch in: ${punchState.checkInDisplay}` : 'No active shift'}
        />
        <StatCard
          title="Weekly Hours Logged"
          value={`${totalWeeklyHours} hrs`}
          icon={CalendarCheck}
          iconColor="blue"
          trend="Target: 40 hrs"
          trendType="neutral"
          description="Mon – Fri standard cycle"
        />
        <StatCard
          title="Punctuality Score"
          value="98.5%"
          icon={CheckCircle2}
          iconColor="emerald"
          trend="On Time"
          trendType="up"
          description="Last 30 Chicago shifts"
        />
      </div>

      {/* Interactive Punch Clock Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card className="h-full flex flex-col justify-between border-brand-blue/30 shadow-md">
            <CardHeader
              action={
                <Badge
                  variant={punchState.isCheckedIn ? 'success' : 'neutral'}
                  size="sm"
                  dot={punchState.isCheckedIn}
                >
                  {punchState.isCheckedIn ? 'Live Shift' : 'Idle'}
                </Badge>
              }
            >
              <CardTitle>Attendance Punch Clock</CardTitle>
              <CardDescription>Real-time clock synchronized to America/Chicago</CardDescription>
            </CardHeader>

            <CardBody className="p-6 space-y-6">
              {/* Digital Live Wall Clock */}
              <div className="text-center p-4 rounded-2xl bg-brand-bg border border-brand-border/80 shadow-subtle">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  America/Chicago Standard Time
                </p>
                <div className="text-3xl sm:text-4xl font-mono font-extrabold text-brand-navy my-1.5">
                  {liveTime}
                </div>
                <p className="text-xs text-brand-text-secondary">{todayChicagoDate}</p>
              </div>

              {/* Punch Timestamps Breakdown */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-brand-border">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Last Check-In
                  </span>
                  <span className="font-bold text-brand-navy text-sm font-mono">
                    {punchState.checkInDisplay || '--:--'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-brand-border">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Last Check-Out
                  </span>
                  <span className="font-bold text-brand-blue text-sm font-mono">
                    {punchState.checkOutDisplay || '--:--'}
                  </span>
                </div>
              </div>

              {/* Check-In / Check-Out Controls */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button
                  variant="primary"
                  size="md"
                  leftIcon={Play}
                  onClick={handleCheckIn}
                  disabled={punchState.isCheckedIn || isLoading}
                  className={punchState.isCheckedIn || isLoading ? 'opacity-50 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 shadow-sm'}
                >
                  {isLoading && !punchState.isCheckedIn ? 'Recording...' : 'Check In'}
                </Button>
                <Button
                  variant="danger"
                  size="md"
                  leftIcon={Square}
                  onClick={handleCheckOut}
                  disabled={!punchState.isCheckedIn || isLoading}
                  className={!punchState.isCheckedIn || isLoading ? 'opacity-50 cursor-not-allowed' : 'shadow-sm'}
                >
                  {isLoading && punchState.isCheckedIn ? 'Recording...' : 'Check Out'}
                </Button>
              </div>
            </CardBody>

            <CardFooter className="text-[11px] text-slate-500 flex items-center justify-between">
              <span>Standard Shift: 9:00 AM – 5:00 PM CST</span>
              <span className="font-semibold text-slate-400">localStorage synced</span>
            </CardFooter>
          </Card>
        </div>

        {/* Shift Rules & Policies Banner */}
        <div className="lg:col-span-2">
          <Card className="h-full flex flex-col justify-between">
            <CardHeader action={<Badge variant="navy">Policy Rules</Badge>}>
              <CardTitle>Attendance Policy &amp; Status Criteria</CardTitle>
              <CardDescription>Transparent workforce tracking guidelines for VISARTECH Solutions Inc.</CardDescription>
            </CardHeader>
            <CardBody className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60">
                  <span className="font-bold text-emerald-900 block mb-1">On-Time Punch (Present)</span>
                  <p className="text-emerald-800 text-[11px] leading-relaxed">
                    Check-in between 8:30 AM and 9:15 AM CST. Full 8.0 working hours expected per workday.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/60">
                  <span className="font-bold text-amber-900 block mb-1">Late Check-In Rule</span>
                  <p className="text-amber-800 text-[11px] leading-relaxed">
                    Punches recorded after 9:15 AM CST automatically trigger a "Late" status flag for review.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/60">
                  <span className="font-bold text-indigo-900 block mb-1">Half-Day Threshold</span>
                  <p className="text-indigo-800 text-[11px] leading-relaxed">
                    Less than 4.0 logged hours in a shift marks the attendance record as "Half Day".
                  </p>
                </div>
                <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/60">
                  <span className="font-bold text-rose-900 block mb-1">Leave Reconciliation</span>
                  <p className="text-rose-800 text-[11px] leading-relaxed">
                    Approved leave requests automatically waive daily check-in obligations with "On Leave".
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-slate-600">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-brand-blue shrink-0" />
                  <span>Timestamps are recorded in UTC on backend and formatted to America/Chicago CST.</span>
                </div>
                <Badge variant="info" size="sm">CST Standard</Badge>
              </div>
            </CardBody>
            <CardFooter className="text-xs text-slate-500">
              <span>Attendance state persists automatically across page reloads.</span>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Personal Attendance History Table */}
      <Card>
        <CardHeader>
          <CardTitle>My Attendance History &amp; Timesheets</CardTitle>
          <CardDescription>Personal daily check-in, check-out, and total working duration logs.</CardDescription>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-brand-border bg-slate-50/70 text-slate-500 font-semibold uppercase text-[10px]">
                <th className="py-3 px-6">Shift Date</th>
                <th className="py-3 px-4">Check-In (CST)</th>
                <th className="py-3 px-4">Check-Out (CST)</th>
                <th className="py-3 px-4 text-center">Working Hours</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-6 text-right">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/60">
              {history.map((record) => {
                const token = ATTENDANCE_STATUS_TOKENS[record.status] || ATTENDANCE_STATUS_TOKENS.Present;
                return (
                  <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-6 font-mono font-bold text-brand-navy">
                      {record.date}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {record.checkInDisplay || '--:--'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {record.checkOutDisplay || '--:--'}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-brand-navy">
                      {record.totalHours ? `${record.totalHours} hrs` : '--'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${token.bg}`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-right text-slate-500 text-[11px]">
                      {record.note || 'Normal shift'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <CardFooter className="flex items-center justify-between text-xs text-slate-500">
          <span>Showing {history.length} attendance records for this period.</span>
          <span className="font-semibold text-slate-400">Employee Self-Service Mode</span>
        </CardFooter>
      </Card>
    </div>
  );
}
