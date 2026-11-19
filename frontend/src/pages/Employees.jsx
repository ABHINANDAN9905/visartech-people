import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  ArrowUpDown,
  Mail,
  MapPin,
  Calendar,
  Building2,
  Briefcase,
  CheckCircle2,
  Eye,
  Edit3,
  Trash2,
  ShieldCheck,
  X,
  AlertCircle,
  Inbox,
  Send
} from 'lucide-react';

import {
  getEmployees,
  fetchEmployeesFromBackend,
  addEmployee,
  updateEmployee,
  addEmployeeBackend,
  updateEmployeeBackend,
  deactivateEmployeeBackend,
  resendEmployeeInvitationBackend,
  getDirectoryStats,
  DEPARTMENTS,
  EMPLOYMENT_STATUSES,
} from '../services/employeeService';

import PageHeader from '../components/common/PageHeader';
import StatCard from '../components/common/StatCard';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Card, { CardHeader, CardTitle, CardDescription, CardBody, CardFooter } from '../components/common/Card';
import Avatar from '../components/common/Avatar';
import SearchInput from '../components/common/SearchInput';
import Dropdown from '../components/common/Dropdown';
import EmptyState from '../components/common/EmptyState';
import EmployeeFormModal from '../components/employee/EmployeeFormModal';

export default function Employees() {
  const navigate = useNavigate();

  // Employee list from service
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState({ total: 6, active: 5, onLeave: 1, inactive: 0 });

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [sortBy, setSortBy] = useState('name-asc'); // name-asc | name-desc | date-desc | date-asc

  // Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState(null);

  // Success / Feedback Alert
  const [feedbackAlert, setFeedbackAlert] = useState(null);

  // Synchronize React state with localStorage
  const syncLocalData = () => {
    setEmployees(getEmployees());
    setStats(getDirectoryStats());
  };

  // Reconcile with live backend MongoDB Atlas
  const fetchLiveEmployees = async () => {
    try {
      const res = await fetchEmployeesFromBackend();
      const liveList = Array.isArray(res) ? res : res?.employees;
      if (liveList && liveList.length > 0) {
        setEmployees(liveList);
        setStats(getDirectoryStats());
      }
    } catch (err) {
      console.warn('Could not fetch live employees from backend:', err);
    }
  };

  useEffect(() => {
    syncLocalData();
    fetchLiveEmployees();

    window.addEventListener('employees-updated', syncLocalData);
    return () => window.removeEventListener('employees-updated', syncLocalData);
  }, []);

  // Filtered and Sorted employees
  const filteredEmployees = useMemo(() => {
    return employees
      .filter((emp) => {
        // Search query
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !q ||
          emp.name.toLowerCase().includes(q) ||
          emp.email.toLowerCase().includes(q) ||
          emp.id.toLowerCase().includes(q) ||
          emp.jobTitle.toLowerCase().includes(q);

        // Department filter
        const matchesDept = selectedDept === 'All' || emp.department === selectedDept;

        // Status filter
        const matchesStatus = selectedStatus === 'All' || emp.employmentStatus === selectedStatus;

        return matchesSearch && matchesDept && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
        if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
        if (sortBy === 'date-desc') return new Date(b.joiningDate) - new Date(a.joiningDate);
        if (sortBy === 'date-asc') return new Date(a.joiningDate) - new Date(b.joiningDate);
        return 0;
      });
  }, [employees, searchQuery, selectedDept, selectedStatus, sortBy]);

  // Handle Add / Edit Submission
  const handleSaveEmployee = async (formData) => {
    try {
      if (employeeToEdit) {
        // Update existing via backend
        await updateEmployeeBackend(formData.id, formData);
        setFeedbackAlert({
          type: 'success',
          message: `Employee "${formData.firstName} ${formData.lastName}" was updated successfully.`,
        });
      } else {
        // Add new via backend
        await addEmployeeBackend(formData);
        setFeedbackAlert({
          type: 'success',
          message: `New employee "${formData.firstName} ${formData.lastName}" (${formData.id}) enrolled in directory.`,
        });
      }
      syncLocalData();
      fetchLiveEmployees();
      setIsFormModalOpen(false);
      setEmployeeToEdit(null);

      setTimeout(() => setFeedbackAlert(null), 5000);
    } catch (err) {
      setFeedbackAlert({
        type: 'error',
        message: err.message || 'Operation failed. Please verify employee details.',
      });
      setTimeout(() => setFeedbackAlert(null), 6000);
      throw err; // Re-throw to allow form modal to display inline error without closing
    }
  };

  const handleOpenAddModal = () => {
    setEmployeeToEdit(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (emp) => {
    setEmployeeToEdit(emp);
    setIsFormModalOpen(true);
  };

  const handleToggleStatus = async (emp) => {
    const nextStatus = emp.employmentStatus === 'Active' ? 'Inactive' : 'Active';
    try {
      await updateEmployeeBackend(emp.id, { employmentStatus: nextStatus });
      setFeedbackAlert({
        type: 'success',
        message: `Status for ${emp.name} updated to ${nextStatus}.`,
      });
      syncLocalData();
      fetchLiveEmployees();
      setTimeout(() => setFeedbackAlert(null), 4000);
    } catch (err) {
      setFeedbackAlert({
        type: 'error',
        message: err.message || 'Failed to update employee status.',
      });
      setTimeout(() => setFeedbackAlert(null), 5000);
    }
  };

  const handleResendInvitation = async (emp) => {
    try {
      const res = await resendEmployeeInvitationBackend(emp.id || emp.employeeId);
      setFeedbackAlert({
        type: 'success',
        message: res.message || `Invitation resent to ${emp.email}.`,
      });
      setTimeout(() => setFeedbackAlert(null), 5000);
    } catch (err) {
      setFeedbackAlert({
        type: 'error',
        message: err.message || 'Failed to resend invitation.',
      });
      setTimeout(() => setFeedbackAlert(null), 5000);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <PageHeader
        title="Employee Management"
        subtitle="Manage your organization's workforce records, credentials, and departmental structures."
        badge={
          <Badge variant="navy" size="md">
            {stats.total} Fictional Staff
          </Badge>
        }
        breadcrumbs={[
          { label: 'VISARTECH People', href: '#' },
          { label: 'Workforce', href: '#' },
          { label: 'Employee Directory' },
        ]}
        actions={
          <Button
            variant="primary"
            size="sm"
            leftIcon={UserPlus}
            onClick={handleOpenAddModal}
          >
            Add New Employee
          </Button>
        }
      />

      {/* Feedback Alert */}
      {feedbackAlert && (
        <div className="p-4 rounded-2xl bg-brand-success-light border border-brand-success/30 text-brand-success flex items-center justify-between text-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{feedbackAlert.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackAlert(null)}
            className="p-1 rounded-lg hover:bg-black/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4 Directory Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          title="Total Employees"
          value={`${stats.total}`}
          icon={Users}
          iconColor="blue"
          trend="100%"
          trendType="up"
          description="Total enrolled profiles"
        />
        <StatCard
          title="Active Workforce"
          value={`${stats.active}`}
          icon={CheckCircle2}
          iconColor="emerald"
          trend={`${Math.round((stats.active / stats.total) * 100)}%`}
          trendType="up"
          description="In good standing"
        />
        <StatCard
          title="On Approved Leave"
          value={`${stats.onLeave}`}
          icon={Calendar}
          iconColor="amber"
          trend="Temporary"
          trendType="neutral"
          description="Authorized time-off"
        />
        <StatCard
          title="Inactive Accounts"
          value={`${stats.inactive}`}
          icon={AlertCircle}
          iconColor="rose"
          trend="0%"
          trendType="neutral"
          description="Separated / archived"
        />
      </div>

      {/* Directory Table Card */}
      <Card>
        {/* Search, Filter, and Sort Bar */}
        <div className="p-4 border-b border-brand-border/80 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search Box */}
          <div className="w-full md:max-w-xs">
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery('')}
              placeholder="Search name, ID, or email..."
              size="sm"
            />
          </div>

          {/* Filters & Sort */}
          <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap justify-end text-xs">
            {/* Department Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-medium hidden sm:inline">Dept:</span>
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
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-medium hidden sm:inline">Status:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="py-1.5 px-2.5 rounded-xl border border-brand-border bg-white text-brand-text text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-blue"
              >
                <option value="All">All Statuses</option>
                {EMPLOYMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Order */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-medium hidden sm:inline">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="py-1.5 px-2.5 rounded-xl border border-brand-border bg-white text-brand-text text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-blue"
              >
                <option value="name-asc">Name (A &rarr; Z)</option>
                <option value="name-desc">Name (Z &rarr; A)</option>
                <option value="date-desc">Joining Date (Newest)</option>
                <option value="date-asc">Joining Date (Oldest)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table Content */}
        {filteredEmployees.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={Inbox}
              title="No matching employees found"
              description={`No employee records matched your search query "${searchQuery}" and selected filters.`}
              actionLabel="Clear Filters"
              onAction={() => {
                setSearchQuery('');
                setSelectedDept('All');
                setSelectedStatus('All');
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
                  <th className="py-3 px-4">Joining Date</th>
                  <th className="py-3 px-4">Employment Status</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/60">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Employee Profile (Avatar, Name, Title, Email) */}
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={emp.name}
                          size="md"
                          status={
                            emp.attendanceStatus === 'present'
                              ? 'online'
                              : emp.attendanceStatus === 'late'
                              ? 'away'
                              : 'offline'
                          }
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-brand-navy truncate">{emp.name}</p>
                          <p className="text-[11px] font-semibold text-brand-blue truncate">
                            {emp.jobTitle}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {emp.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Employee ID */}
                    <td className="py-3.5 px-4 font-mono font-bold text-brand-navy">
                      {emp.id}
                    </td>

                    {/* Department */}
                    <td className="py-3.5 px-4">
                      <Badge variant="neutral" size="sm">
                        {emp.department}
                      </Badge>
                    </td>

                    {/* Joining Date */}
                    <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                      {emp.joiningDate}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {emp.employmentStatus === 'Active' && (
                        <Badge variant="success" size="sm" dot>
                          Active
                        </Badge>
                      )}
                      {emp.employmentStatus === 'On Leave' && (
                        <Badge variant="warning" size="sm" dot>
                          On Leave
                        </Badge>
                      )}
                      {emp.employmentStatus === 'Inactive' && (
                        <Badge variant="rejected" size="sm" dot>
                          Inactive
                        </Badge>
                      )}
                    </td>

                    {/* Actions Menu */}
                    <td className="py-3.5 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={Eye}
                          onClick={() => navigate(`/employees/${emp.id}`)}
                          title="View complete employee profile"
                        >
                          Profile
                        </Button>

                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={Edit3}
                          onClick={() => handleOpenEditModal(emp)}
                          title="Edit employee record"
                        >
                          Edit
                        </Button>

                        <Dropdown
                          align="right"
                          trigger={
                            <button
                              type="button"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-brand-navy hover:bg-slate-100 transition-colors"
                              title="More options"
                            >
                              &bull;&bull;&bull;
                            </button>
                          }
                          items={[
                            {
                              label: 'View Detailed Profile',
                              icon: Eye,
                              onClick: () => navigate(`/employees/${emp.id}`),
                            },
                            {
                              label: 'Edit Credentials',
                              icon: Edit3,
                              onClick: () => handleOpenEditModal(emp),
                            },
                            {
                              label: 'Resend Invitation',
                              icon: Send,
                              onClick: () => handleResendInvitation(emp),
                            },
                            { type: 'separator' },
                            {
                              label: emp.employmentStatus === 'Active' ? 'Mark Inactive' : 'Mark Active',
                              danger: emp.employmentStatus === 'Active',
                              onClick: () => handleToggleStatus(emp),
                            },
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <CardFooter className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <span>
            Showing {filteredEmployees.length} of {employees.length} enrolled fictional employees.
          </span>
          <span className="font-semibold text-slate-400">
            localStorage synced &bull; Changes persist across sessions
          </span>
        </CardFooter>
      </Card>

      {/* Add / Edit Employee Form Modal */}
      {isFormModalOpen && (
        <EmployeeFormModal
          isOpen={isFormModalOpen}
          onClose={() => {
            setIsFormModalOpen(false);
            setEmployeeToEdit(null);
          }}
          employeeToEdit={employeeToEdit}
          onSave={handleSaveEmployee}
        />
      )}
    </div>
  );
}
