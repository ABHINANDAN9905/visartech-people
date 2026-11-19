import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarCheck,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  FileText,
  Upload,
  X,
  Check,
  ChevronRight,
  Info,
  Building2,
  Trash2,
  ArrowRight
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { getEmployees, getEmployeeById } from '../../services/employeeService';
import {
  getEmployeeLeaveBalance,
  getStoredLeaveRequests,
  applyForLeave,
  cancelLeaveRequest,
  calculateLeaveDays,
  checkLeaveOverlap,
  applyLeaveBackend,
  cancelLeaveBackend,
  fetchMyLeavesFromBackend,
  fetchMyBalanceFromBackend,
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
import Input from '../common/Input';
import Select from '../common/Select';
import Textarea from '../common/Textarea';

export default function EmployeeLeaveView() {
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

  // State management
  const [balances, setBalances] = useState(() => getEmployeeLeaveBalance(employeeId));
  const [requests, setRequests] = useState(() => {
    return getStoredLeaveRequests().filter((r) => r.employeeId === employeeId);
  });

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals & Forms
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [alertFeedback, setAlertFeedback] = useState(null); // { type: 'success' | 'error', message: '' }

  // Cancel Request Confirmation Modal
  const [cancelTargetRequest, setCancelTargetRequest] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    leaveType: 'Casual',
    startDate: '',
    endDate: '',
    reason: '',
    attachmentName: '',
  });

  // Real-time calculation of requested duration
  const calculatedDays = useMemo(() => {
    return calculateLeaveDays(formData.startDate, formData.endDate);
  }, [formData.startDate, formData.endDate]);

  // Sync state on 'leaves-updated'
  useEffect(() => {
    const handleUpdate = () => {
      setBalances(getEmployeeLeaveBalance(employeeId));
      setRequests(getStoredLeaveRequests().filter((r) => r.employeeId === employeeId));
    };

    window.addEventListener('leaves-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('leaves-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [employeeId]);

  // Initial load from live backend
  useEffect(() => {
    let isMounted = true;
    async function loadBackendData() {
      try {
        const [myLeavesRes, myBalanceRes] = await Promise.all([
          fetchMyLeavesFromBackend({ employeeId }),
          fetchMyBalanceFromBackend(),
        ]);
        if (isMounted) {
          if (myLeavesRes?.leaves?.length > 0) {
            setRequests(myLeavesRes.leaves);
          }
          if (myBalanceRes) {
            setBalances(myBalanceRes);
          }
        }
      } catch (err) {
        console.warn('Backend leaves sync failed, using cached state:', err);
      }
    }
    loadBackendData();
    return () => {
      isMounted = false;
    };
  }, [employeeId]);

  // Auto-dismiss alert banner after 6 seconds
  useEffect(() => {
    if (alertFeedback) {
      const timer = setTimeout(() => setAlertFeedback(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [alertFeedback]);

  // Greeting & Chicago Time
  const greeting = useMemo(() => getChicagoGreeting(), []);
  const todayChicagoDate = useMemo(() => formatChicagoDate(), []);

  // Filtered Leave Requests
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
      const matchSearch =
        searchTerm.trim() === '' ||
        r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.leaveTypeLabel.toLowerCase().includes(searchTerm.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [requests, statusFilter, searchTerm]);

  // Form Change Handler
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  // Handle Mock File Attachment
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({ ...prev, attachmentName: file.name }));
    }
  };

  // Submit Leave Application
  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    setFormErrors({});

    const errors = {};
    if (!formData.leaveType) errors.leaveType = 'Please select a leave category.';
    if (!formData.startDate) errors.startDate = 'Start date is required.';
    if (!formData.endDate) errors.endDate = 'End date is required.';
    if (!formData.reason.trim()) errors.reason = 'Please explain the reason for your time off.';

    if (formData.startDate && formData.endDate) {
      if (new Date(formData.endDate) < new Date(formData.startDate)) {
        errors.endDate = 'End date cannot precede the start date.';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await applyLeaveBackend({
        employeeId,
        leaveType: formData.leaveType,
        startDate: formData.startDate,
        endDate: formData.endDate,
        reason: formData.reason,
      });

      if (result.success) {
        setAlertFeedback({
          type: 'success',
          message: result.message || 'Leave application successfully submitted!',
        });
        setIsApplyModalOpen(false);
        setFormData({
          leaveType: 'Casual',
          startDate: '',
          endDate: '',
          reason: '',
          attachmentName: '',
        });
        const [updatedLeaves, updatedBal] = await Promise.all([
          fetchMyLeavesFromBackend({ employeeId }),
          fetchMyBalanceFromBackend(),
        ]);
        if (updatedLeaves?.leaves) setRequests(updatedLeaves.leaves);
        if (updatedBal) setBalances(updatedBal);
      } else {
        setAlertFeedback({
          type: 'error',
          message: result.error || result.message || 'Failed to submit leave request.',
        });
      }
    } catch (err) {
      setAlertFeedback({
        type: 'error',
        message: err.message || 'Failed to submit leave request.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Execute Cancel Request
  const handleConfirmCancel = async () => {
    if (!cancelTargetRequest) return;
    try {
      const targetId = cancelTargetRequest.mongoId || cancelTargetRequest.id;
      const result = await cancelLeaveBackend(targetId);
      if (result.success) {
        setAlertFeedback({
          type: 'success',
          message: result.message || 'Leave request was cancelled.',
        });
        const [updatedLeaves, updatedBal] = await Promise.all([
          fetchMyLeavesFromBackend({ employeeId }),
          fetchMyBalanceFromBackend(),
        ]);
        if (updatedLeaves?.leaves) setRequests(updatedLeaves.leaves);
        if (updatedBal) setBalances(updatedBal);
      } else {
        setAlertFeedback({
          type: 'error',
          message: result.error || result.message || 'Failed to cancel request.',
        });
      }
    } catch (err) {
      setAlertFeedback({
        type: 'error',
        message: err.message || 'Failed to cancel request.',
      });
    } finally {
      setCancelTargetRequest(null);
    }
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

  // Leave Type Badge Helper
  const renderTypeBadge = (type) => {
    switch (type) {
      case 'Casual':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">Casual Leave</span>;
      case 'Sick':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Sick Leave</span>;
      case 'Paid':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">Paid Annual</span>;
      case 'Unpaid':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">Unpaid Leave</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">{type}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions */}
      <PageHeader
        title="Leave Management & Balances"
        subtitle={`${greeting}, ${currentEmployee.name}. Track your annual entitlements, check approval status, and apply for time off.`}
        badge={<Badge variant="primary" dot>Employee Portal</Badge>}
        breadcrumbs={[
          { label: 'Workforce', href: '#' },
          { label: 'Leave Management' },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="sm"
              leftIcon={Plus}
              onClick={() => {
                setFormErrors({});
                setIsApplyModalOpen(true);
              }}
            >
              Apply for Leave
            </Button>
          </div>
        }
      />

      {/* Global Alert Notification Banner */}
      {alertFeedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between transition-all animate-fadeIn ${
            alertFeedback.type === 'success'
              ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
              : 'bg-rose-50/90 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-3">
            {alertFeedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <p className="text-sm font-medium">{alertFeedback.message}</p>
          </div>
          <button
            onClick={() => setAlertFeedback(null)}
            className="p-1 hover:bg-black/5 rounded text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Leave Balance KPI Cards (6 Entitlement Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Total Available"
          value={`${balances.totalRemaining} Days`}
          icon={CalendarCheck}
          iconColor="blue"
          trend="Annual Pool"
          trendType="up"
          description="Paid + Casual + Sick"
        />
        <StatCard
          title="Casual Leave"
          value={`${balances.casual.remaining} / ${balances.casual.total}`}
          icon={Clock}
          iconColor="amber"
          description={`${balances.casual.used} day(s) taken`}
        />
        <StatCard
          title="Sick / Medical"
          value={`${balances.sick.remaining} / ${balances.sick.total}`}
          icon={CheckCircle2}
          iconColor="emerald"
          description={`${balances.sick.used} day(s) taken`}
        />
        <StatCard
          title="Paid Annual"
          value={`${balances.paid.remaining} / ${balances.paid.total}`}
          icon={Calendar}
          iconColor="indigo"
          description={`${balances.paid.used} day(s) taken`}
        />
        <StatCard
          title="Unpaid Records"
          value={`${balances.unpaid?.used || 0} Days`}
          icon={FileText}
          iconColor="slate"
          description="Loss of pay days"
        />
        <StatCard
          title="Pending Review"
          value={`${balances.pendingCount} Request${balances.pendingCount === 1 ? '' : 's'}`}
          icon={AlertCircle}
          iconColor="amber"
          trend={balances.pendingCount > 0 ? 'Awaiting Action' : 'All Clear'}
          trendType={balances.pendingCount > 0 ? 'neutral' : 'up'}
          description="Under review by HR"
        />
      </div>

      {/* 3. Leave Requests History & Management Table */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <CardTitle>My Leave History &amp; Requests</CardTitle>
            <CardDescription>
              Review all historical time-off applications, review notes, and pending requests.
            </CardDescription>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  statusFilter === status
                    ? 'bg-brand-navy text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {status === 'ALL' ? 'All Applications' : status.charAt(0) + status.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardBody className="p-0">
          {filteredRequests.length === 0 ? (
            <div className="py-16 text-center">
              <CalendarCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-brand-navy">No leave requests found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                {statusFilter !== 'ALL'
                  ? `You have no ${statusFilter.toLowerCase()} leave requests in this category.`
                  : 'You have not submitted any leave applications yet.'}
              </p>
              <div className="mt-4">
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={Plus}
                  onClick={() => setIsApplyModalOpen(true)}
                >
                  Apply for Time Off
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Request ID</th>
                    <th className="py-3 px-4">Leave Type</th>
                    <th className="py-3 px-4">Date Window</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Reason &amp; Reviewer Notes</th>
                    <th className="py-3 px-4">Applied Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/50 transition">
                      {/* ID */}
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-900">
                        {req.id}
                      </td>

                      {/* Type */}
                      <td className="py-3.5 px-4">
                        {renderTypeBadge(req.leaveType)}
                      </td>

                      {/* Dates */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">
                          {req.startDate} <span className="text-slate-400 font-normal">to</span> {req.endDate}
                        </div>
                      </td>

                      {/* Days */}
                      <td className="py-3.5 px-4 font-semibold text-brand-navy">
                        {req.days} Day{req.days === 1 ? '' : 's'}
                      </td>

                      {/* Reason & Reviewer Notes */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="truncate text-slate-800" title={req.reason}>
                          {req.reason}
                        </p>
                        {req.reviewerComments && (
                          <div className="mt-1 flex items-start gap-1 text-[11px] text-slate-500 bg-slate-100/80 rounded px-2 py-0.5">
                            <span className="font-semibold text-slate-700">Note:</span>
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

                      {/* Applied Date */}
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {req.appliedAt ? req.appliedAt.split('T')[0] : '--'}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {renderStatusBadge(req.status)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {req.status === 'PENDING' ? (
                          <Button
                            variant="danger-outline"
                            size="sm"
                            className="py-1 px-2.5 text-xs h-7"
                            onClick={() => setCancelTargetRequest(req)}
                          >
                            Cancel Request
                          </Button>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">
                            No actions
                          </span>
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
          <span>Showing {filteredRequests.length} of {requests.length} leave application records.</span>
          <span className="text-[11px] text-slate-400">All submissions adhere to America/Chicago work schedules.</span>
        </CardFooter>
      </Card>

      {/* 4. Modal: Apply For Leave */}
      <Modal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        title="Apply for Time Off"
        subtitle="Submit a formal leave request for HR Administrator review."
        size="lg"
      >
        <form onSubmit={handleSubmitApplication} className="space-y-4">
          {/* Leave Type Selector with Entitlement Preview */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Leave Category <span className="text-rose-500">*</span>
            </label>
            <select
              name="leaveType"
              value={formData.leaveType}
              onChange={handleFormChange}
              className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
            >
              <option value="Casual">Casual Leave ({balances.casual.remaining} days available)</option>
              <option value="Sick">Sick / Medical Leave ({balances.sick.remaining} days available)</option>
              <option value="Paid">Paid Annual Vacation ({balances.paid.remaining} days available)</option>
              <option value="Unpaid">Unpaid Leave (Loss of pay)</option>
            </select>
            {formErrors.leaveType && (
              <p className="text-rose-500 text-xs mt-1">{formErrors.leaveType}</p>
            )}
          </div>

          {/* Date Picker Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Start Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleFormChange}
                className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
              />
              {formErrors.startDate && (
                <p className="text-rose-500 text-xs mt-1">{formErrors.startDate}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                End Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                name="endDate"
                min={formData.startDate || undefined}
                value={formData.endDate}
                onChange={handleFormChange}
                className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
              />
              {formErrors.endDate && (
                <p className="text-rose-500 text-xs mt-1">{formErrors.endDate}</p>
              )}
            </div>
          </div>

          {/* Real-time Duration Preview Card */}
          {formData.startDate && formData.endDate && (
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <CalendarCheck className="w-4 h-4 text-brand-blue" />
                <span>Calculated Working Days:</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-brand-navy text-sm">
                  {calculatedDays} Business Day{calculatedDays === 1 ? '' : 's'}
                </span>
                <span className="text-slate-400 text-[11px]">(Weekends excluded)</span>
              </div>
            </div>
          )}

          {/* Reason for Leave */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Reason / Purpose <span className="text-rose-500">*</span>
            </label>
            <textarea
              name="reason"
              rows={3}
              value={formData.reason}
              onChange={handleFormChange}
              placeholder="e.g. Attending family wedding, doctor-advised recuperation, personal emergencies..."
              className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
            />
            {formErrors.reason && (
              <p className="text-rose-500 text-xs mt-1">{formErrors.reason}</p>
            )}
          </div>

          {/* Supporting Document Attachment (Mock Upload) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Supporting Attachment <span className="text-slate-400 font-normal">(Optional, e.g. Medical Certificate)</span>
            </label>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 transition">
                <Upload className="w-4 h-4 text-slate-500" />
                <span>{formData.attachmentName ? 'Change File' : 'Choose File'}</span>
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
              {formData.attachmentName ? (
                <div className="flex items-center gap-2 text-xs font-medium text-brand-navy bg-brand-blue-light/50 px-3 py-1.5 rounded-lg border border-brand-blue/20">
                  <FileText className="w-3.5 h-3.5 text-brand-blue" />
                  <span className="truncate max-w-[200px]">{formData.attachmentName}</span>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, attachmentName: '' }))}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <span className="text-slate-400 text-xs italic">No file selected</span>
              )}
            </div>
          </div>

          {/* Business Rules Callout */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-900">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-[11px]">
              <p className="font-semibold">Leave Policy Notice:</p>
              <p>Leaves will only be deducted from your entitlement quota once approved by HR Admin. Overlapping dates with existing requests are automatically rejected.</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsApplyModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
            >
              Submit Application
            </Button>
          </div>
        </form>
      </Modal>

      {/* 5. Modal: Confirm Cancellation */}
      <Modal
        isOpen={Boolean(cancelTargetRequest)}
        onClose={() => setCancelTargetRequest(null)}
        title="Cancel Leave Request"
        subtitle={`Request ID: ${cancelTargetRequest?.id}`}
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-rose-50 border border-rose-200/70 rounded-xl text-xs text-rose-900 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Are you sure you want to cancel this leave application?</p>
              <p className="mt-1 text-slate-600">
                This will mark request <strong>{cancelTargetRequest?.id}</strong> ({cancelTargetRequest?.leaveType} Leave from {cancelTargetRequest?.startDate} to {cancelTargetRequest?.endDate}) as Cancelled. Your leave balance was not deducted and will remain intact.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCancelTargetRequest(null)}
            >
              Keep Request
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleConfirmCancel}
            >
              Yes, Cancel Application
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
