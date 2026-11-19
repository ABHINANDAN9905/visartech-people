import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import Textarea from '../common/Textarea';
import Select from '../common/Select';
import Badge from '../common/Badge';
import {
  Megaphone,
  Pin,
  Users,
  Building2,
  Calendar,
  AlertCircle,
  FileCheck2,
  CheckCircle2,
  Send
} from 'lucide-react';
import { getEmployees } from '../../services/employeeService';
import {
  ANNOUNCEMENT_CATEGORIES,
  ANNOUNCEMENT_AUDIENCES,
  ANNOUNCEMENT_PRIORITIES
} from '../../services/announcementService';

export default function AnnouncementModal({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  isEditing = false
}) {
  const employees = getEmployees();
  const departments = ['Engineering', 'Design', 'Product', 'Marketing', 'Quality Assurance', 'HR'];

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'General',
    priority: 'MEDIUM',
    targetAudience: 'All Employees',
    targetDepartment: 'Engineering',
    targetEmployeeIds: [],
    expiryDate: '',
    pinned: false,
    status: 'PUBLISHED'
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        category: initialData.category || 'General',
        priority: initialData.priority || 'MEDIUM',
        targetAudience: initialData.targetAudience || 'All Employees',
        targetDepartment: initialData.targetDepartment || 'Engineering',
        targetEmployeeIds: initialData.targetEmployeeIds || [],
        expiryDate: initialData.expiryDate || '',
        pinned: Boolean(initialData.pinned),
        status: initialData.status || 'PUBLISHED'
      });
    } else {
      setFormData({
        title: '',
        description: '',
        category: 'General',
        priority: 'MEDIUM',
        targetAudience: 'All Employees',
        targetDepartment: 'Engineering',
        targetEmployeeIds: [],
        expiryDate: '',
        pinned: false,
        status: 'PUBLISHED'
      });
    }
    setErrors({});
  }, [initialData, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleToggleEmployee = (empId) => {
    setFormData((prev) => {
      const ids = prev.targetEmployeeIds || [];
      const updated = ids.includes(empId)
        ? ids.filter((id) => id !== empId)
        : [...ids, empId];
      return { ...prev, targetEmployeeIds: updated };
    });
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.title?.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!formData.description?.trim()) {
      newErrors.description = 'Description is required';
    }
    if (
      formData.targetAudience === 'Selected Employees' &&
      (!formData.targetEmployeeIds || formData.targetEmployeeIds.length === 0)
    ) {
      newErrors.targetEmployeeIds = 'Select at least one employee recipient';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (targetStatus) => {
    if (!validate()) return;
    onSubmit({
      ...formData,
      status: targetStatus || formData.status
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Announcement' : 'Post New Announcement'}
      description="Publish enterprise updates, policy changes, or event notices to your workforce."
      size="lg"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(formData.status);
        }}
        className="space-y-4 pt-2"
      >
        {/* Title */}
        <Input
          label="Announcement Title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="e.g. Q4 Townhall & Strategic Product Roadmap"
          error={errors.title}
          required
        />

        {/* Category & Priority */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            options={ANNOUNCEMENT_CATEGORIES.map((c) => ({ label: c, value: c }))}
            required
          />

          <Select
            label="Priority Level"
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            options={ANNOUNCEMENT_PRIORITIES.map((p) => ({
              label: p === 'HIGH' ? 'High Priority' : p === 'MEDIUM' ? 'Standard Priority' : 'Low Priority',
              value: p
            }))}
            required
          />
        </div>

        {/* Target Audience */}
        <div className="space-y-2">
          <Select
            label="Target Audience"
            name="targetAudience"
            value={formData.targetAudience}
            onChange={handleChange}
            options={ANNOUNCEMENT_AUDIENCES.map((a) => ({ label: a, value: a }))}
            helperText="Specify who can view and receive notification for this bulletin."
            required
          />

          {formData.targetAudience === 'Selected Department' && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <label className="text-xs font-semibold text-brand-navy flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-brand-blue" />
                Target Department
              </label>
              <Select
                name="targetDepartment"
                value={formData.targetDepartment}
                onChange={handleChange}
                options={departments.map((d) => ({ label: d, value: d }))}
              />
            </div>
          )}

          {formData.targetAudience === 'Selected Employees' && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <label className="text-xs font-semibold text-brand-navy flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-brand-blue" />
                Select Individual Employees ({formData.targetEmployeeIds.length} selected)
              </label>
              {errors.targetEmployeeIds && (
                <p className="text-xs text-rose-600 font-medium">{errors.targetEmployeeIds}</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                {employees.map((emp) => {
                  const checked = formData.targetEmployeeIds.includes(emp.id);
                  return (
                    <label
                      key={emp.id}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition ${
                        checked
                          ? 'bg-brand-blue-light/50 border-brand-blue text-brand-navy font-semibold'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleToggleEmployee(emp.id)}
                        className="rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
                      />
                      <span className="truncate">
                        {emp.name} ({emp.department})
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Expiry Date */}
        <Input
          type="date"
          label="Expiry Date (Optional)"
          name="expiryDate"
          value={formData.expiryDate}
          onChange={handleChange}
          helperText="Announcement will be automatically archived after this date."
        />

        {/* Description */}
        <Textarea
          label="Announcement Content"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Write the full announcement message, details, links, or instructions..."
          rows={5}
          error={errors.description}
          required
        />

        {/* Pin to top */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="pinned"
            name="pinned"
            checked={formData.pinned}
            onChange={handleChange}
            className="rounded border-slate-300 text-brand-blue focus:ring-brand-blue w-4 h-4 cursor-pointer"
          />
          <label htmlFor="pinned" className="text-xs font-medium text-slate-700 cursor-pointer flex items-center gap-1">
            <Pin className="w-3.5 h-3.5 text-brand-blue" />
            Pin this announcement to the top of the feed
          </label>
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handleSubmit('DRAFT')}
            >
              Save as Draft
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              leftIcon={Send}
              onClick={() => handleSubmit('PUBLISHED')}
            >
              {isEditing ? 'Update & Publish' : 'Publish Announcement'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
