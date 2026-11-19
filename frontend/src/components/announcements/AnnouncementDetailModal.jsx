import React from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Badge from '../common/Badge';
import {
  Megaphone,
  Pin,
  Calendar,
  User,
  Users,
  Building2,
  Clock,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export default function AnnouncementDetailModal({
  isOpen,
  onClose,
  announcement,
  onMarkAsRead = null,
  isRead = false,
  userRole = 'EMPLOYEE'
}) {
  if (!announcement) return null;

  const categoryColors = {
    'Company Events': 'info',
    'HR Updates': 'navy',
    'Holidays': 'success',
    'Policy Updates': 'warning',
    'Important Notices': 'danger',
    'General': 'neutral'
  };

  const priorityBadges = {
    HIGH: { variant: 'danger', label: 'High Priority' },
    MEDIUM: { variant: 'warning', label: 'Standard Priority' },
    LOW: { variant: 'neutral', label: 'Low Priority' }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          {announcement.pinned && (
            <Pin className="w-4 h-4 text-brand-blue fill-brand-blue shrink-0" />
          )}
          <span className="text-base font-bold text-brand-navy">
            {announcement.title}
          </span>
        </div>
      }
      size="lg"
    >
      <div className="space-y-4 pt-2">
        {/* Meta badges row */}
        <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-slate-200">
          <Badge variant={categoryColors[announcement.category] || 'neutral'}>
            {announcement.category}
          </Badge>

          <Badge variant={priorityBadges[announcement.priority]?.variant || 'neutral'}>
            {priorityBadges[announcement.priority]?.label || announcement.priority}
          </Badge>

          {announcement.status === 'DRAFT' && (
            <Badge variant="warning">Draft (Unpublished)</Badge>
          )}

          {announcement.status === 'ARCHIVED' && (
            <Badge variant="neutral">Archived</Badge>
          )}

          {isRead && userRole === 'EMPLOYEE' && (
            <Badge variant="success" dot>
              Read
            </Badge>
          )}
        </div>

        {/* Metadata Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-brand-blue shrink-0" />
            <span>
              Author: <strong className="text-brand-navy">{announcement.author}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-brand-blue shrink-0" />
            <span>
              Published: <strong className="text-brand-navy">{announcement.publishDate}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-brand-blue shrink-0" />
            <span>
              Audience:{' '}
              <strong className="text-brand-navy">
                {announcement.targetAudience === 'Selected Department'
                  ? `Department: ${announcement.targetDepartment}`
                  : announcement.targetAudience === 'Selected Employees'
                  ? `${announcement.targetEmployeeIds?.length || 0} Targeted Employees`
                  : 'All Employees'}
              </strong>
            </span>
          </div>

          {announcement.expiryDate && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Expires: <strong className="text-brand-navy">{announcement.expiryDate}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="py-2 text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-white border border-slate-100 rounded-xl p-4 shadow-2xs">
          {announcement.description}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          <div>
            {!isRead && onMarkAsRead && userRole === 'EMPLOYEE' && (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={CheckCircle2}
                onClick={() => {
                  onMarkAsRead(announcement.id);
                }}
              >
                Mark as Read
              </Button>
            )}
          </div>

          <Button variant="primary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
