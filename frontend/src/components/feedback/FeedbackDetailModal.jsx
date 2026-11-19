import React, { useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Textarea from '../common/Textarea';
import Select from '../common/Select';
import {
  MessageSquare,
  Shield,
  ShieldAlert,
  User,
  Calendar,
  Clock,
  Send,
  Lock,
  CheckCircle2,
  FileText,
  AlertCircle
} from 'lucide-react';
import {
  updateFeedbackStatus,
  addInternalNote,
  respondToFeedback,
  FEEDBACK_STATUSES,
  updateFeedbackStatusBackend,
} from '../../services/feedbackService';

export default function FeedbackDetailModal({
  isOpen,
  onClose,
  feedback,
  userRole = 'HR_ADMIN'
}) {
  const [internalNoteText, setInternalNoteText] = useState('');
  const [responseText, setResponseText] = useState('');
  const [responseStatus, setResponseStatus] = useState('RESOLVED');
  const [currentStatus, setCurrentStatus] = useState(feedback?.status || 'NEW');

  if (!feedback) return null;

  const isHRAdmin = userRole === 'HR_ADMIN';

  const statusVariants = {
    NEW: 'warning',
    UNDER_REVIEW: 'info',
    RESPONDED: 'navy',
    RESOLVED: 'success'
  };

  const priorityVariants = {
    HIGH: 'danger',
    MEDIUM: 'warning',
    LOW: 'neutral'
  };

  const handleStatusChange = async (newStat) => {
    setCurrentStatus(newStat);
    try {
      await updateFeedbackStatusBackend(feedback.id, { status: newStat });
    } catch (e) {
      console.warn('Backend feedback status update error:', e);
    }
    updateFeedbackStatus(feedback.id, newStat);
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!internalNoteText.trim()) return;
    try {
      await updateFeedbackStatusBackend(feedback.id, { noteText: internalNoteText.trim() });
    } catch (e) {
      console.warn('Backend note error:', e);
    }
    addInternalNote(feedback.id, {
      author: 'Alex Morgan (HR Administrator)',
      text: internalNoteText.trim()
    });
    setInternalNoteText('');
  };

  const handleSendResponse = async (e) => {
    e.preventDefault();
    if (!responseText.trim()) return;
    try {
      await updateFeedbackStatusBackend(feedback.id, {
        status: responseStatus,
        text: responseText.trim(),
      });
    } catch (e) {
      console.warn('Backend response error:', e);
    }
    respondToFeedback(feedback.id, {
      author: 'Alex Morgan (HR Administrator)',
      text: responseText.trim(),
      resolveStatus: responseStatus
    });
    setResponseText('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-brand-blue shrink-0" />
          <span className="truncate">{feedback.subject}</span>
        </div>
      }
      size="lg"
    >
      <div className="space-y-4 pt-2">
        {/* Status & Priority Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Badge variant={statusVariants[feedback.status] || 'neutral'} size="sm" dot>
              {feedback.status.replace('_', ' ')}
            </Badge>

            <Badge variant={priorityVariants[feedback.priority] || 'neutral'} size="sm">
              {feedback.priority} Priority
            </Badge>

            <Badge variant="neutral" size="sm">
              {feedback.category}
            </Badge>
          </div>

          {isHRAdmin && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Update Status:</span>
              <div className="w-36">
                <Select
                  value={feedback.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  options={FEEDBACK_STATUSES.map((s) => ({
                    label: s.replace('_', ' '),
                    value: s
                  }))}
                  size="sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* Submitter & Metadata Box */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {feedback.isAnonymous ? (
                <div className="flex items-center gap-1.5 text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                  <span>Anonymous Colleague</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-brand-navy font-semibold">
                  <User className="w-3.5 h-3.5 text-brand-blue" />
                  <span>
                    {feedback.employeeName} ({feedback.employeeDepartment})
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-slate-500">
              <Calendar className="w-3.5 h-3.5" />
              <span>Submitted: {feedback.submittedAt}</span>
            </div>
          </div>

          {feedback.isAnonymous && (
            <p className="text-[11px] text-amber-800 bg-amber-100/60 p-2 rounded-lg border border-amber-200/60 flex items-start gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
              <span>
                <strong>Confidential Submission:</strong> Submitter identity, email, and user account metadata are completely scrubbed by design.
              </span>
            </p>
          )}
        </div>

        {/* Feedback Message */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-brand-navy">Feedback Message</label>
          <div className="p-3.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line shadow-2xs">
            {feedback.message}
          </div>
        </div>

        {/* Existing HR Response */}
        {feedback.response && (
          <div className="p-3.5 bg-brand-blue-light/40 border border-brand-blue/30 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-brand-navy">
              <span className="flex items-center gap-1.5 text-brand-blue">
                <CheckCircle2 className="w-4 h-4 text-brand-blue" />
                Response from {feedback.response.author}
              </span>
              <span className="text-[11px] text-slate-500 font-normal">
                {feedback.response.respondedAt}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {feedback.response.text}
            </p>
          </div>
        )}

        {/* HR Admin Internal Notes (Admin Only) */}
        {isHRAdmin && (
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <label className="text-xs font-semibold text-brand-navy flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-brand-blue" />
              HR Internal Notes ({feedback.internalNotes?.length || 0})
              <span className="text-[10px] text-slate-400 font-normal">
                (Visible only to HR Administrators)
              </span>
            </label>

            {feedback.internalNotes && feedback.internalNotes.length > 0 ? (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {feedback.internalNotes.map((note) => (
                  <div
                    key={note.id}
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-semibold text-brand-navy">{note.author}</span>
                      <span>{note.createdAt}</span>
                    </div>
                    <p className="text-slate-700">{note.text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No internal notes added yet.</p>
            )}

            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={internalNoteText}
                onChange={(e) => setInternalNoteText(e.target.value)}
                placeholder="Add confidential internal note..."
                className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-blue"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAddNote}
                disabled={!internalNoteText.trim()}
              >
                Add Note
              </Button>
            </div>
          </div>
        )}

        {/* HR Admin Response Form (Admin Only) */}
        {isHRAdmin && (
          <div className="space-y-2 pt-3 border-t border-slate-200">
            <label className="text-xs font-semibold text-brand-navy flex items-center justify-between">
              <span>{feedback.response ? 'Update Administrative Response' : 'Respond to Feedback'}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-500 font-normal">Mark Status as:</span>
                <select
                  value={responseStatus}
                  onChange={(e) => setResponseStatus(e.target.value)}
                  className="px-2 py-0.5 text-xs bg-slate-50 border border-slate-200 rounded font-semibold text-brand-navy"
                >
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="RESPONDED">RESPONDED</option>
                  <option value="UNDER_REVIEW">UNDER REVIEW</option>
                </select>
              </div>
            </label>

            <Textarea
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              placeholder={
                feedback.isAnonymous
                  ? 'Write a public resolution note or organizational update...'
                  : `Write a response to ${feedback.employeeName}...`
              }
              rows={3}
            />

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-500">
                {feedback.isAnonymous
                  ? 'Note: This response will be posted as the public resolution for this feedback.'
                  : `Submitting will send a notification to ${feedback.employeeName}.`}
              </span>
              <Button
                variant="primary"
                size="sm"
                leftIcon={Send}
                onClick={handleSendResponse}
                disabled={!responseText.trim()}
              >
                Submit Response
              </Button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-slate-200">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
