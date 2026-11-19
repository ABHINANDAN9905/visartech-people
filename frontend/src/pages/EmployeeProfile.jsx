import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Briefcase,
  Building2,
  MapPin,
  Clock,
  CheckSquare,
  CalendarCheck,
  Edit3,
  User,
  ShieldCheck,
  CheckCircle2,
  Activity,
  Layers,
  Inbox
} from 'lucide-react';

import {
  getEmployeeById,
  updateEmployee,
  fetchEmployeeByIdFromBackend,
  updateEmployeeBackend
} from '../services/employeeService';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Card, { CardHeader, CardTitle, CardDescription, CardBody, CardFooter } from '../components/common/Card';
import Avatar from '../components/common/Avatar';
import EmployeeFormModal from '../components/employee/EmployeeFormModal';
import EmptyState from '../components/common/EmptyState';

export default function EmployeeProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // overview | personal | employment | work | activity
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [successNotice, setSuccessNotice] = useState(null);

  useEffect(() => {
    if (id) {
      const data = getEmployeeById(id);
      if (data) setEmployee(data);

      fetchEmployeeByIdFromBackend(id)
        .then((liveData) => {
          if (liveData) {
            setEmployee(liveData);
          }
        })
        .catch((err) => {
          console.warn('Backend fetch for employee failed, using cached profile:', err);
        });
    }
  }, [id]);

  if (!employee) {
    return (
      <div className="py-12">
        <EmptyState
          icon={Inbox}
          title="Employee Profile Not Found"
          description={`No employee record exists for ID "${id}". It may have been removed or entered incorrectly.`}
          actionLabel="Back to Employee Directory"
          actionIcon={ArrowLeft}
          onAction={() => navigate('/employees')}
        />
      </div>
    );
  }

  const handleSaveEdit = async (updatedData) => {
    try {
      const updated = await updateEmployeeBackend(employee.id, updatedData);
      setEmployee(updated);
      setSuccessNotice(`Employee profile for ${updated.name || `${updated.firstName} ${updated.lastName}`} updated successfully.`);
      setTimeout(() => setSuccessNotice(null), 5000);
    } catch (err) {
      alert(err.message || 'Failed to update employee profile');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Page Header */}
      <PageHeader
        title={employee.name}
        subtitle={`${employee.jobTitle} &bull; ${employee.department} Department &bull; ID: ${employee.id}`}
        badge={
          <Badge
            variant={
              employee.employmentStatus === 'Active'
                ? 'success'
                : employee.employmentStatus === 'On Leave'
                ? 'warning'
                : 'rejected'
            }
            size="md"
            dot
          >
            {employee.employmentStatus}
          </Badge>
        }
        breadcrumbs={[
          { label: 'VISARTECH People', href: '#' },
          { label: 'Employee Directory', href: '/employees' },
          { label: employee.id },
        ]}
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={ArrowLeft}
              onClick={() => navigate('/employees')}
            >
              Back to Directory
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={Edit3}
              onClick={() => setIsEditModalOpen(true)}
            >
              Edit Employee
            </Button>
          </div>
        }
      />

      {/* Success Notification */}
      {successNotice && (
        <div className="p-4 rounded-2xl bg-brand-success-light border border-brand-success/30 text-brand-success flex items-center justify-between text-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{successNotice}</span>
          </div>
        </div>
      )}

      {/* Hero Overview Card */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Avatar name={employee.name} size="xl" status={employee.attendanceStatus === 'present' ? 'online' : employee.attendanceStatus === 'late' ? 'away' : 'offline'} />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-brand-navy">{employee.name}</h2>
                <Badge variant="navy" size="sm" className="font-mono">
                  {employee.id}
                </Badge>
              </div>
              <p className="text-sm font-semibold text-brand-blue">{employee.jobTitle}</p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  {employee.department}
                </span>
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {employee.email}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {employee.city}, {employee.state}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-slate-50 border border-brand-border text-xs text-slate-600 font-medium">
              Shift: <strong className="text-brand-navy">9:00 AM – 5:00 PM CST</strong>
            </span>
          </div>
        </div>
      </Card>

      {/* Profile Section Tabs */}
      <div className="border-b border-brand-border flex items-center gap-2 overflow-x-auto text-xs font-semibold">
        {[
          { id: 'overview', label: 'A. Overview & Work Summary' },
          { id: 'personal', label: 'B. Personal Information' },
          { id: 'employment', label: 'C. Employment Details' },
          { id: 'activity', label: 'D. Recent Workplace Activity' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`py-3 px-4 border-b-2 font-medium transition-colors whitespace-nowrap focus:outline-none ${
              activeTab === tab.id
                ? 'border-brand-blue text-brand-blue font-bold'
                : 'border-transparent text-slate-500 hover:text-brand-navy'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Overview & Work Summary */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Work Summary KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5">
              <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase mb-2">
                <span>Attendance Punctuality</span>
                <Clock className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-brand-navy">{employee.workSummary?.attendanceRate || '98%'}</p>
              <p className="text-[11px] text-slate-500 mt-1">Based on monthly logs</p>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase mb-2">
                <span>Active Assigned Tasks</span>
                <CheckSquare className="w-4 h-4 text-brand-blue" />
              </div>
              <p className="text-2xl font-bold text-brand-navy">{employee.workSummary?.assignedTasks || 3}</p>
              <p className="text-[11px] text-slate-500 mt-1">Sprint 24 backlog</p>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase mb-2">
                <span>Tasks Completed</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-brand-navy">{employee.workSummary?.completedTasks || 12}</p>
              <p className="text-[11px] text-slate-500 mt-1">Resolved deliverables</p>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase mb-2">
                <span>Leave Balance</span>
                <CalendarCheck className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-2xl font-bold text-brand-navy">{employee.workSummary?.leaveBalance || 14} Days</p>
              <p className="text-[11px] text-slate-500 mt-1">Casual, Sick &amp; Annual</p>
            </Card>
          </div>

          {/* Quick Snapshot */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Role Summary</CardTitle>
                <CardDescription>Primary job focus &amp; reporting hierarchy.</CardDescription>
              </CardHeader>
              <CardBody className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-brand-border/60">
                  <span className="text-slate-500">Designation:</span>
                  <span className="font-bold text-brand-navy">{employee.jobTitle}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-brand-border/60">
                  <span className="text-slate-500">Department:</span>
                  <span className="font-bold text-brand-navy">{employee.department}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-brand-border/60">
                  <span className="text-slate-500">Reporting Manager:</span>
                  <span className="font-bold text-brand-navy">{employee.reportingManager}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Contract Type:</span>
                  <Badge variant="neutral" size="sm">{employee.employmentType}</Badge>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Today's Shift Status</CardTitle>
                <CardDescription>Current check-in and location status.</CardDescription>
              </CardHeader>
              <CardBody className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-brand-border/60">
                  <span className="text-slate-500">Check-in Punch:</span>
                  <span className="font-mono font-bold text-brand-navy">{employee.checkInTime || 'On Leave'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-brand-border/60">
                  <span className="text-slate-500">Operating Timezone:</span>
                  <span className="font-mono text-brand-navy">America/Chicago (CST)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-brand-border/60">
                  <span className="text-slate-500">Station / Office:</span>
                  <span className="font-bold text-brand-navy">Chicago Hybrid Hub</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Status Verification:</span>
                  <Badge variant="success" size="sm" dot>Active in Directory</Badge>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 2: Personal Information */}
      {activeTab === 'personal' && (
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Confidential employee contact and biographical details.</CardDescription>
          </CardHeader>
          <CardBody className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="space-y-3.5">
              <div className="p-3 rounded-xl bg-slate-50 border border-brand-border">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Work Email Address</span>
                <span className="font-mono font-bold text-brand-navy text-sm">{employee.email}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-brand-border">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Primary Phone Number</span>
                <span className="font-mono font-bold text-brand-navy text-sm">{employee.phone}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-brand-border">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Date of Birth</span>
                <span className="font-mono text-brand-navy text-sm">{employee.dateOfBirth}</span>
              </div>
            </div>

            <div className="space-y-3.5">
              <div className="p-3 rounded-xl bg-slate-50 border border-brand-border">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Gender Identity</span>
                <span className="font-bold text-brand-navy text-sm">{employee.gender || 'Not specified'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-brand-border">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Residential Address</span>
                <span className="font-bold text-brand-navy text-sm">{employee.address}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-brand-border">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">City, State &amp; Country</span>
                <span className="font-bold text-brand-navy text-sm">{employee.city}, {employee.state}, {employee.country}</span>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Tab 3: Employment Details */}
      {activeTab === 'employment' && (
        <Card>
          <CardHeader>
            <CardTitle>Employment &amp; Organizational Structure</CardTitle>
            <CardDescription>Department assignment, hiring records, and reporting line.</CardDescription>
          </CardHeader>
          <CardBody className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="space-y-3.5">
              <div className="p-3 rounded-xl bg-slate-50 border border-brand-border">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Company Employee ID</span>
                <span className="font-mono font-bold text-brand-blue text-sm">{employee.id}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-brand-border">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Department</span>
                <span className="font-bold text-brand-navy text-sm">{employee.department}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-brand-border">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Official Job Designation</span>
                <span className="font-bold text-brand-navy text-sm">{employee.jobTitle}</span>
              </div>
            </div>

            <div className="space-y-3.5">
              <div className="p-3 rounded-xl bg-slate-50 border border-brand-border">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Joining Date</span>
                <span className="font-mono font-bold text-brand-navy text-sm">{employee.joiningDate}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-brand-border">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Employment Classification</span>
                <span className="font-bold text-brand-navy text-sm">{employee.employmentType}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-brand-border">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Reporting Manager</span>
                <span className="font-bold text-brand-navy text-sm">{employee.reportingManager}</span>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Tab 4: Recent Activity */}
      {activeTab === 'activity' && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Workplace Activity &amp; Audit Log</CardTitle>
            <CardDescription>Chronological events recorded for {employee.name}.</CardDescription>
          </CardHeader>
          <CardBody className="space-y-3.5">
            {employee.recentActivities && employee.recentActivities.length > 0 ? (
              employee.recentActivities.map((act, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-brand-border">
                  <div className="w-8 h-8 rounded-lg bg-brand-blue/10 text-brand-blue flex items-center justify-center shrink-0">
                    {act.type === 'check_in' && <Clock className="w-4 h-4" />}
                    {act.type === 'task' && <CheckSquare className="w-4 h-4" />}
                    {act.type === 'leave' && <CalendarCheck className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-brand-navy">{act.text}</p>
                    <span className="text-[10px] text-slate-400 font-mono">{act.date}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic">No recent activity logs recorded for this employee.</p>
            )}
          </CardBody>
        </Card>
      )}

      {/* Edit Employee Modal */}
      {isEditModalOpen && (
        <EmployeeFormModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          employeeToEdit={employee}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
}
