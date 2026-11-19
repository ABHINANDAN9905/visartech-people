import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Users,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Search,
  Filter,
  ArrowUpDown,
  Download,
  CalendarCheck,
  ShieldCheck,
  BarChart3,
  Table as TableIcon,
  X,
  Inbox,
  Edit2,
  Save,
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

import {
  getAllAttendanceRecords,
  getTodayAttendanceMetrics,
  ATTENDANCE_STATUS_TOKENS,
  fetchAttendanceFromBackend,
  fetchAttendanceSummaryFromBackend,
  updateAttendanceBackend,
} from '../../services/attendanceService';
import { DEPARTMENTS } from '../../services/employeeService';
import { formatChicagoDate, formatChicagoTime } from '../../utils/timezone';

import PageHeader from '../common/PageHeader';
import StatCard from '../common/StatCard';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Card, { CardHeader, CardTitle, CardDescription, CardBody, CardFooter } from '../common/Card';
import Avatar from '../common/Avatar';
import SearchInput from '../common/SearchInput';
import EmptyState from '../common/EmptyState';

export default function HRAttendanceAdminView() {
  const [records, setRecords] = useState(() => getAllAttendanceRecords());
  const [metrics, setMetrics] = useState(() => getTodayAttendanceMetrics());

  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedDate, setSelectedDate] = useState('All'); // All | Today | Yesterday
  const [sortBy, setSortBy] = useState('date-desc'); // date-desc | date-asc | name-asc | hours-desc

  // Active View Tab: 'table' vs 'reports'
  const [activeView, setActiveView] = useState('table');

  // Correction Modal State
  const [editingRecord, setEditingRecord] = useState(null);
  const [editForm, setEditForm] = useState({ status: 'Present', durationHours: 8, note: '' });
  const [isSavingCorrection, setIsSavingCorrection] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);

  // Today's date in Chicago
  const todayDateStr = useMemo(() => formatChicagoDate(), []);

  // Fetch live backend records & metrics on mount
  useEffect(() => {
    let isMounted = true;
    async function loadLiveData() {
      try {
        const [attRes, sumRes] = await Promise.all([
          fetchAttendanceFromBackend({ limit: 50 }),
          fetchAttendanceSummaryFromBackend(),
        ]);
        if (isMounted) {
          if (attRes?.records?.length > 0) {
            setRecords(attRes.records);
          }
          if (sumRes) {
            setMetrics({
              totalEmployees: sumRes.totalEmployees,
              presentToday: (sumRes.presentCount || 0) + (sumRes.lateCount || 0),
              onTime: sumRes.presentCount || 0,
              late: sumRes.lateCount || 0,
              onLeave: sumRes.onLeaveCount || 0,
              halfDay: sumRes.halfDayCount || 0,
              absent: sumRes.absentCount || 0,
              currentlyCheckedIn: sumRes.currentlyCheckedIn || 0,
            });
          }
        }
      } catch (err) {
        console.warn('Backend HR attendance fetch error:', err);
      }
    }
    loadLiveData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Refresh records listener
  useEffect(() => {
    const handleUpdate = () => {
      setRecords(getAllAttendanceRecords());
      setMetrics(getTodayAttendanceMetrics());
    };
    window.addEventListener('attendance-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('attendance-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const handleOpenCorrection = (record) => {
    setEditingRecord(record);
    setEditForm({
      status: record.status || 'Present',
      durationHours: record.totalHours || 8,
      note: '',
    });
  };

  const handleSaveCorrection = async () => {
    if (!editingRecord) return;
    setIsSavingCorrection(true);
    try {
      const targetId = editingRecord.mongoId || editingRecord.id;
      const statusBackendMap = {
        Present: 'present',
        Late: 'late',
        'Half Day': 'half_day',
        'On Leave': 'on_leave',
        Absent: 'absent',
      };
      const backendStatus = statusBackendMap[editForm.status] || editForm.status.toLowerCase();

      await updateAttendanceBackend(targetId, {
        status: backendStatus,
        durationHours: Number(editForm.durationHours),
        note: editForm.note || 'HR Admin adjustment',
      });

      // Update local state
      setRecords((prev) =>
        prev.map((r) =>
          r.id === editingRecord.id
            ? {
                ...r,
                status: editForm.status,
                totalHours: Number(editForm.durationHours),
                note: editForm.note ? `Admin Correction: ${editForm.note}` : r.note,
              }
            : r
        )
      );

      setActionNotice({
        type: 'success',
        text: `Attendance record for ${editingRecord.employeeName} (${editingRecord.date}) updated successfully.`,
      });
      setEditingRecord(null);
      setTimeout(() => setActionNotice(null), 5000);
    } catch (err) {
      setActionNotice({
        type: 'error',
        text: err.message || 'Failed to update attendance record.',
      });
      setTimeout(() => setActionNotice(null), 5000);
    } finally {
      setIsSavingCorrection(false);
    }
  };

  // Filtered & Sorted records
  const filteredRecords = useMemo(() => {
    return records
      .filter((rec) => {
        // Search
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !q ||
          rec.employeeName.toLowerCase().includes(q) ||
          rec.employeeId.toLowerCase().includes(q) ||
          rec.department.toLowerCase().includes(q);

        // Department
        const matchesDept = selectedDept === 'All' || rec.department === selectedDept;

        // Status
        const matchesStatus = selectedStatus === 'All' || rec.status === selectedStatus;

        // Date
        let matchesDate = true;
        if (selectedDate === 'Today') {
          matchesDate = rec.date === '2026-11-17';
        } else if (selectedDate === 'Yesterday') {
          matchesDate = rec.date === '2026-11-16';
        }

        return matchesSearch && matchesDept && matchesStatus && matchesDate;
      })
      .sort((a, b) => {
        if (sortBy === 'date-desc') return b.date.localeCompare(a.date);
        if (sortBy === 'date-asc') return a.date.localeCompare(b.date);
        if (sortBy === 'name-asc') return a.employeeName.localeCompare(b.employeeName);
        if (sortBy === 'hours-desc') return (b.totalHours || 0) - (a.totalHours || 0);
        return 0;
      });
  }, [records, searchQuery, selectedDept, selectedStatus, selectedDate, sortBy]);

  // Analytics Chart Data
  const statusDistributionData = useMemo(() => {
    const counts = { Present: 0, Late: 0, 'On Leave': 0, 'Half Day': 0, Absent: 0 };
    filteredRecords.forEach((r) => {
      if (counts[r.status] !== undefined) counts[r.status] += 1;
      else counts.Present += 1;
    });
    return [
      { name: 'Present', value: counts.Present, color: '#16A36A' },
      { name: 'Late', value: counts.Late, color: '#E9A23B' },
      { name: 'On Leave', value: counts['On Leave'], color: '#DC5353' },
      { name: 'Half Day', value: counts['Half Day'], color: '#6366F1' },
    ].filter((d) => d.value > 0);
  }, [filteredRecords]);

  // Department-wise attendance breakdown
  const departmentTrendData = useMemo(() => {
    const map = {};
    filteredRecords.forEach((r) => {
      if (!map[r.department]) {
        map[r.department] = { dept: r.department, present: 0, late: 0, onLeave: 0 };
      }
      if (r.status === 'Present') map[r.department].present += 1;
      else if (r.status === 'Late') map[r.department].late += 1;
      else if (r.status === 'On Leave') map[r.department].onLeave += 1;
    });
    return Object.values(map);
  }, [filteredRecords]);

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <PageHeader
        title="Attendance & Working Hours Management"
        subtitle={`Organization-wide attendance rosters, timesheet audits, and shift metrics standardized to America/Chicago.`}
        badge={
          <Badge variant="navy" size="md">
            {metrics.currentlyCheckedIn} / {metrics.totalEmployees} Active On-Duty
          </Badge>
        }
        breadcrumbs={[
          { label: 'VISARTECH People', href: '#' },
          { label: 'Workforce', href: '#' },
          { label: 'Attendance Management' },
        ]}
        actions={
          <div className="flex items-center gap-2.5">
            <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs">
              <button
                type="button"
                onClick={() => setActiveView('table')}
                className={`py-1.5 px-3 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                  activeView === 'table' ? 'bg-white text-brand-navy shadow-sm' : 'text-slate-500 hover:text-brand-navy'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Roster Table</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveView('reports')}
                className={`py-1.5 px-3 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                  activeView === 'reports' ? 'bg-white text-brand-navy shadow-sm' : 'text-slate-500 hover:text-brand-navy'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Analytics &amp; Charts</span>
              </button>
            </div>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={Download}
              onClick={() => alert('Attendance report export generated for America/Chicago.')}
            >
              Export CSV
            </Button>
          </div>
        }
      />

      {/* 2. Five KPI Attendance Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Employees"
          value={`${metrics.totalEmployees}`}
          icon={Users}
          iconColor="blue"
          trend="100%"
          trendType="up"
          description="Enrolled staff"
        />
        <StatCard
          title="Present Today"
          value={`${metrics.presentToday}`}
          icon={CheckCircle2}
          iconColor="emerald"
          trend={`${metrics.onTime} On-Time`}
          trendType="up"
          description="Clocked in today"
        />
        <StatCard
          title="Late Arrivals"
          value={`${metrics.late}`}
          icon={Clock}
          iconColor="amber"
          trend="Past 9:15 AM"
          trendType="neutral"
          description="Flagged for review"
        />
        <StatCard
          title="On Approved Leave"
          value={`${metrics.onLeave}`}
          icon={Calendar}
          iconColor="rose"
          trend="Authorized"
          trendType="neutral"
          description="Elena Rostova"
        />
        <StatCard
          title="Absent (Unexcused)"
          value={`${metrics.absent}`}
          icon={AlertCircle}
          iconColor="rose"
          trend="0%"
          trendType="up"
          description="Full compliance"
        />
      </div>

      {/* Action / Error Notification */}
      {actionNotice && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between shadow-subtle ${
            actionNotice.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionNotice.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            )}
            <span className="font-semibold text-sm">{actionNotice.text}</span>
          </div>
          <button type="button" onClick={() => setActionNotice(null)} className="p-1 rounded hover:bg-black/5">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* View 1: Roster Table */}
      {activeView === 'table' && (
        <Card>
          {/* Search, Filter, and Sort Toolbar */}
          <div className="p-4 border-b border-brand-border/80 flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Search Box */}
            <div className="w-full md:max-w-xs">
              <SearchInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery('')}
                placeholder="Search staff, ID, or department..."
                size="sm"
              />
            </div>

            {/* Filters Bar */}
            <div className="flex items-center gap-2 w-full md:w-auto flex-wrap justify-end text-xs">
              {/* Date Filter */}
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="py-1.5 px-2.5 rounded-xl border border-brand-border bg-white text-brand-text text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-blue"
              >
                <option value="All">All Dates</option>
                <option value="Today">Today (Nov 17)</option>
                <option value="Yesterday">Yesterday (Nov 16)</option>
              </select>

              {/* Department Filter */}
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="py-1.5 px-2.5 rounded-xl border border-brand-border bg-white text-brand-text text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-blue"
              >
                <option value="All">All Departments</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="py-1.5 px-2.5 rounded-xl border border-brand-border bg-white text-brand-text text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-blue"
              >
                <option value="All">All Statuses</option>
                <option value="Present">Present</option>
                <option value="Late">Late</option>
                <option value="On Leave">On Leave</option>
                <option value="Half Day">Half Day</option>
              </select>

              {/* Sort Filter */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="py-1.5 px-2.5 rounded-xl border border-brand-border bg-white text-brand-text text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-blue"
              >
                <option value="date-desc">Date (Newest)</option>
                <option value="date-asc">Date (Oldest)</option>
                <option value="name-asc">Employee Name (A-Z)</option>
                <option value="hours-desc">Working Hours (High-Low)</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          {filteredRecords.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={Inbox}
                title="No attendance records matched"
                description={`No records match your query "${searchQuery}" with the selected filters.`}
                actionLabel="Reset Search Filters"
                onAction={() => {
                  setSearchQuery('');
                  setSelectedDept('All');
                  setSelectedStatus('All');
                  setSelectedDate('All');
                }}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-brand-border bg-slate-50/70 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-6">Employee Profile</th>
                    <th className="py-3 px-4">Employee ID</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Shift Date</th>
                    <th className="py-3 px-4">Check-In (CST)</th>
                    <th className="py-3 px-4">Check-Out (CST)</th>
                    <th className="py-3 px-4 text-center">Total Hours</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/60">
                  {filteredRecords.map((rec) => {
                    const token = ATTENDANCE_STATUS_TOKENS[rec.status] || ATTENDANCE_STATUS_TOKENS.Present;
                    return (
                      <tr key={rec.id} className="hover:bg-slate-50/50 transition-colors">
                        {/* Profile */}
                        <td className="py-3.5 px-6">
                          <div className="flex items-center gap-3">
                            <Avatar name={rec.employeeName} size="sm" />
                            <div>
                              <p className="font-bold text-brand-navy">{rec.employeeName}</p>
                              <p className="text-[10px] text-slate-400">{rec.note || 'Recorded'}</p>
                            </div>
                          </div>
                        </td>

                        {/* ID */}
                        <td className="py-3.5 px-4 font-mono font-bold text-brand-navy">
                          {rec.employeeId}
                        </td>

                        {/* Dept */}
                        <td className="py-3.5 px-4">
                          <Badge variant="neutral" size="sm">{rec.department}</Badge>
                        </td>

                        {/* Date */}
                        <td className="py-3.5 px-4 font-mono text-slate-600">
                          {rec.date}
                        </td>

                        {/* Check-In */}
                        <td className="py-3.5 px-4 font-mono font-semibold text-brand-navy">
                          {rec.checkInDisplay}
                        </td>

                        {/* Check-Out */}
                        <td className="py-3.5 px-4 font-mono text-slate-600">
                          {rec.checkOutDisplay}
                        </td>

                        {/* Hours */}
                        <td className="py-3.5 px-4 text-center font-bold text-brand-navy">
                          {rec.totalHours ? `${rec.totalHours} hrs` : '--'}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${token.bg}`}>
                            {rec.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-6 text-right">
                          <Button
                            variant="ghost"
                            size="xs"
                            leftIcon={Edit2}
                            onClick={() => handleOpenCorrection(rec)}
                          >
                            Edit
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <CardFooter className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
            <span>Showing {filteredRecords.length} of {records.length} total attendance records.</span>
            <span className="font-semibold text-slate-400">All timestamps recorded in UTC &bull; Rendered in America/Chicago</span>
          </CardFooter>
        </Card>
      )}

      {/* View 2: Analytics & Reports */}
      {activeView === 'reports' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Distribution Pie Chart */}
          <Card className="p-6 flex flex-col justify-between">
            <CardHeader action={<Badge variant="info">Attendance Mix</Badge>}>
              <CardTitle>Attendance Status Distribution</CardTitle>
              <CardDescription>Breakdown of present, late, on-leave, and half-day records.</CardDescription>
            </CardHeader>
            <CardBody className="py-4">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {statusDistributionData.map((entry, index) => (
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
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
            <CardFooter className="text-xs text-slate-500">
              <span>91.7% compliance rate across recorded shifts.</span>
            </CardFooter>
          </Card>

          {/* Department-wise Attendance Comparison */}
          <Card className="p-6 flex flex-col justify-between">
            <CardHeader action={<Badge variant="navy">Departmental</Badge>}>
              <CardTitle>Department Attendance Breakdown</CardTitle>
              <CardDescription>Present vs late vs leave counts by functional team.</CardDescription>
            </CardHeader>
            <CardBody className="py-4">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5EAF2" vertical={false} />
                    <XAxis dataKey="dept" stroke="#718096" fontSize={10} tickLine={false} />
                    <YAxis stroke="#718096" fontSize={11} tickLine={false} domain={[0, 4]} />
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
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    <Bar dataKey="present" name="Present" fill="#16A36A" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="late" name="Late" fill="#E9A23B" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="onLeave" name="On Leave" fill="#DC5353" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
            <CardFooter className="text-xs text-slate-500">
              <span>Engineering maintains highest overall headcount (3 staff).</span>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Attendance Correction Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Attendance Correction</h3>
                <p className="text-xs text-slate-500">
                  {editingRecord.employeeName} ({editingRecord.employeeId}) &bull; {editingRecord.date}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Attendance Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                >
                  <option value="Present">Present</option>
                  <option value="Late">Late</option>
                  <option value="Half Day">Half Day</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Absent">Absent</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Total Duration (Hours)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="24"
                  value={editForm.durationHours}
                  onChange={(e) => setEditForm({ ...editForm, durationHours: e.target.value })}
                  className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-blue font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Audit Correction Note</label>
                <textarea
                  rows="3"
                  value={editForm.note}
                  onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                  placeholder="Reason for manual adjustment (e.g., manager approval, corrected missed punch)..."
                  className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <Button variant="ghost" size="sm" onClick={() => setEditingRecord(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={Save}
                onClick={handleSaveCorrection}
                disabled={isSavingCorrection}
              >
                {isSavingCorrection ? 'Saving...' : 'Apply Correction'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
