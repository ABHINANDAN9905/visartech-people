import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Briefcase, 
  Building2, 
  MapPin, 
  ShieldCheck, 
  Check, 
  X, 
  AlertCircle 
} from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import Select from '../common/Select';
import {
  DEPARTMENTS,
  EMPLOYMENT_TYPES,
  EMPLOYMENT_STATUSES,
  MANAGERS,
  getNextEmployeeId,
} from '../../services/employeeService';

export default function EmployeeFormModal({
  isOpen,
  onClose,
  employeeToEdit = null, // if null -> Add mode, else Edit mode
  onSave,
}) {
  const isEditMode = !!employeeToEdit;

  const initialFormState = {
    id: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: 'Prefer not to say',
    jobTitle: '',
    department: 'Engineering',
    employmentType: 'Full-Time',
    joiningDate: new Date().toISOString().split('T')[0],
    reportingManager: 'Marcus Vance (Lead Architect)',
    employmentStatus: 'Active',
    address: '',
    city: 'Chicago',
    state: 'IL',
    country: 'United States',
  };

  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [confirmStep, setConfirmStep] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);

  useEffect(() => {
    if (employeeToEdit) {
      setFormData({
        ...initialFormState,
        ...employeeToEdit,
      });
    } else {
      // Auto-suggest next sequential employee ID (e.g. EMP-007)
      setFormData({
        ...initialFormState,
        id: getNextEmployeeId(),
      });
    }
    setErrors({});
    setServerError(null);
    setIsSubmitting(false);
    setConfirmStep(false);
  }, [employeeToEdit, isOpen]);

  const validate = () => {
    const newErrors = {};

    if (!formData.id.trim()) newErrors.id = 'Employee ID is required';
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please provide a valid work email';
    }

    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
    if (!formData.jobTitle.trim()) newErrors.jobTitle = 'Job title is required';
    if (!formData.address.trim()) newErrors.address = 'Street address is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.state.trim()) newErrors.state = 'State is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setServerError(null);
    if (!validate()) return;
    setConfirmStep(true);
  };

  const handleFinalConfirm = async () => {
    if (isSubmitting) return; // Prevent duplicate POST requests
    setIsSubmitting(true);
    setServerError(null);

    try {
      await onSave(formData);
      setIsSubmitting(false);
      onClose();
    } catch (err) {
      setIsSubmitting(false);
      const isTimeout =
        err.isTimeout ||
        err.name === 'AbortError' ||
        err.message?.toLowerCase().includes('timed out') ||
        err.message?.toLowerCase().includes('timeout');

      const userMessage = isTimeout
        ? 'Server is waking up from sleep mode. Please wait a few moments and try again.'
        : (err.message || 'Operation failed. Please verify employee details.');

      setServerError(userMessage);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isSubmitting && onClose()}
      title={isEditMode ? `Edit Employee — ${employeeToEdit.name}` : 'Add New Fictional Employee'}
      description={
        confirmStep
          ? 'Please review and confirm the employee information below.'
          : 'Complete the employment and personal records for this fictional staff member.'
      }
      maxWidth="max-w-2xl"
      footer={
        confirmStep ? (
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setConfirmStep(false);
                setServerError(null);
              }}
              disabled={isSubmitting}
            >
              Back to Edit
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={Check}
              onClick={handleFinalConfirm}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Enrolling Employee...' : 'Confirm & Save to Directory'}
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={Check}
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isEditMode ? 'Save Employee Changes' : 'Create Employee Record'}
            </Button>
          </>
        )
      }
    >
      {/* Inline Server / Validation Error Notice */}
      {serverError && (
        <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-start gap-2.5 text-xs animate-in fade-in duration-150">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Validation / Operation Error</p>
            <p className="text-[11px] text-red-700 mt-0.5">{serverError}</p>
          </div>
        </div>
      )}

      {confirmStep ? (
        /* Confirmation Summary View */
        <div className="space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-brand-blue-light border border-brand-blue/30 text-brand-navy flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-brand-blue shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Review Employee Details</p>
              <p className="text-slate-600 mt-0.5">
                Confirming will securely enroll this employee in the cloud database, trigger onboarding invitations, and update real-time directory metrics.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 border border-brand-border">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Full Name</span>
              <p className="font-bold text-brand-navy text-sm">{formData.firstName} {formData.lastName}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Employee ID</span>
              <p className="font-mono font-bold text-brand-blue text-sm">{formData.id}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Job Designation</span>
              <p className="font-medium text-brand-navy">{formData.jobTitle}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Department</span>
              <p className="font-medium text-brand-navy">{formData.department}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Email</span>
              <p className="font-mono text-slate-600">{formData.email}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Employment Status</span>
              <p className="font-bold text-brand-navy">{formData.employmentStatus}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Workplace Location</span>
              <p className="text-slate-600">{formData.city}, {formData.state}, {formData.country}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Reporting Manager</span>
              <p className="text-slate-600">{formData.reportingManager}</p>
            </div>
          </div>
        </div>
      ) : (
        /* Edit / Create Form View */
        <form onSubmit={handleSubmit} className="space-y-6 max-h-[65vh] overflow-y-auto px-1">
          {/* Section 1: Personal Information */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 pb-1 border-b border-brand-border">
              <User className="w-3.5 h-3.5 text-brand-blue" />
              1. Personal Information
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="First Name"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="e.g. Liam"
                error={errors.firstName}
              />
              <Input
                label="Last Name"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="e.g. Novak"
                error={errors.lastName}
              />
              <Input
                label="Work Email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="username@visartech.demo"
                error={errors.email}
                leftIcon={Mail}
              />
              <Input
                label="Phone Number"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 (312) 555-0100"
                error={errors.phone}
                leftIcon={Phone}
              />
              <Input
                label="Date of Birth"
                type="date"
                required
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                error={errors.dateOfBirth}
              />
              <Select
                label="Gender (Optional)"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                options={[
                  'Male',
                  'Female',
                  'Non-Binary',
                  'Prefer not to say',
                ]}
              />
            </div>
          </div>

          {/* Section 2: Employment Information */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 pb-1 border-b border-brand-border">
              <Briefcase className="w-3.5 h-3.5 text-brand-blue" />
              2. Employment Information
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Employee ID"
                required
                value={formData.id}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                placeholder="EMP-007"
                disabled={isEditMode}
                error={errors.id}
                helperText={isEditMode ? 'Employee ID cannot be altered.' : 'Unique company identifier.'}
              />
              <Input
                label="Job Designation"
                required
                value={formData.jobTitle}
                onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                placeholder="e.g. Cloud Security Analyst"
                error={errors.jobTitle}
              />
              <Select
                label="Assigned Department"
                required
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                options={DEPARTMENTS}
              />
              <Select
                label="Employment Type"
                required
                value={formData.employmentType}
                onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                options={EMPLOYMENT_TYPES}
              />
              <Input
                label="Joining Date"
                type="date"
                required
                value={formData.joiningDate}
                onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
              />
              <Select
                label="Reporting Manager"
                required
                value={formData.reportingManager}
                onChange={(e) => setFormData({ ...formData, reportingManager: e.target.value })}
                options={MANAGERS}
              />
              <div className="sm:col-span-2">
                <Select
                  label="Employment Status"
                  required
                  value={formData.employmentStatus}
                  onChange={(e) => setFormData({ ...formData, employmentStatus: e.target.value })}
                  options={EMPLOYMENT_STATUSES}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Contact & Address */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 pb-1 border-b border-brand-border">
              <MapPin className="w-3.5 h-3.5 text-brand-blue" />
              3. Contact &amp; Workplace Address
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Input
                  label="Street Address"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g. 233 S Wacker Dr"
                  error={errors.address}
                />
              </div>
              <Input
                label="City"
                required
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Chicago"
                error={errors.city}
              />
              <Input
                label="State / Province"
                required
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="IL"
                error={errors.state}
              />
              <div className="sm:col-span-2">
                <Input
                  label="Country"
                  required
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="United States"
                />
              </div>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}
