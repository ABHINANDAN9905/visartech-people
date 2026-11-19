import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageSquare,
  Send,
  Shield,
  ShieldAlert,
  Clock,
  CheckCircle2,
  Lock,
  Eye,
  Info,
  HelpCircle,
  Sparkles
} from 'lucide-react';

import PageHeader from '../common/PageHeader';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Card, { CardHeader, CardTitle, CardDescription, CardBody } from '../common/Card';
import StatCard from '../common/StatCard';
import Input from '../common/Input';
import Textarea from '../common/Textarea';
import Select from '../common/Select';

import FeedbackDetailModal from './FeedbackDetailModal';

import { useAuth } from '../../context/AuthContext';
import { getEmployees } from '../../services/employeeService';
import {
  getFeedbackForEmployee,
  submitFeedback,
  FEEDBACK_CATEGORIES,
  FEEDBACK_PRIORITIES,
  submitFeedbackBackend,
} from '../../services/feedbackService';

export default function EmployeeFeedbackView() {
  const { user } = useAuth();

  // Find employee record for Jordan Lee (EMP-006)
  const currentEmployee = useMemo(() => {
    const list = getEmployees();
    return (
      list.find((e) => e.email === user?.email || e.id === user?.id) ||
      list.find((e) => e.id === 'EMP-006') ||
      list[0]
    );
  }, [user]);

  const employeeId = currentEmployee?.id || 'EMP-006';

  const [activeTab, setActiveTab] = useState('SUBMIT'); // SUBMIT | HISTORY
  const [feedbackHistory, setFeedbackHistory] = useState(() =>
    getFeedbackForEmployee(employeeId)
  );

  // Form State
  const [category, setCategory] = useState('Workplace');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);

  useEffect(() => {
    const handleUpdate = () => {
      setFeedbackHistory(getFeedbackForEmployee(employeeId));
    };
    window.addEventListener('feedback-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('feedback-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [employeeId]);

  const validate = () => {
    const errs = {};
    if (!subject.trim()) errs.subject = 'Subject is required.';
    if (!message.trim()) errs.message = 'Please provide details in your message.';
    if (message.trim().length < 10) errs.message = 'Feedback message must be at least 10 characters.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await submitFeedbackBackend({
        category,
        subject,
        message,
        priority,
        isAnonymous,
      });
    } catch (err) {
      console.warn('Backend feedback submit error:', err);
    }

    submitFeedback({
      category,
      subject,
      message,
      priority,
      isAnonymous,
      employee: currentEmployee
    });

    setSubject('');
    setMessage('');
    setPriority('MEDIUM');
    setIsAnonymous(false);
    setSubmitSuccess(true);
    setErrors({});
    setTimeout(() => setSubmitSuccess(false), 5000);
  };

  const statusVariants = {
    NEW: 'warning',
    UNDER_REVIEW: 'info',
    RESPONDED: 'navy',
    RESOLVED: 'success'
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Employee Voice & Feedback Center"
        subtitle={`Welcome, ${currentEmployee?.name || 'Jordan Lee'}. Share your constructive feedback, suggestions, and workplace ideas with HR safely.`}
        badge={<Badge variant="info">Employee Portal</Badge>}
        breadcrumbs={[
          { label: 'Company', href: '#' },
          { label: 'Feedback' }
        ]}
      />

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('SUBMIT')}
          className={`pb-2.5 text-xs sm:text-sm font-semibold transition border-b-2 flex items-center gap-1.5 ${
            activeTab === 'SUBMIT'
              ? 'border-brand-blue text-brand-blue'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Submit New Feedback</span>
        </button>

        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`pb-2.5 text-xs sm:text-sm font-semibold transition border-b-2 flex items-center gap-1.5 ${
            activeTab === 'HISTORY'
              ? 'border-brand-blue text-brand-blue'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>My Submissions & Responses ({feedbackHistory.length})</span>
        </button>
      </div>

      {activeTab === 'SUBMIT' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Submit Feedback or Workplace Suggestion</CardTitle>
                <CardDescription>
                  Your thoughts help shape company culture and working environment.
                </CardDescription>
              </CardHeader>

              <CardBody className="p-5">
                {submitSuccess && (
                  <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Thank you! Your feedback has been safely submitted to HR and will be reviewed promptly.
                    </span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Category & Priority */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Select
                      label="Category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      options={FEEDBACK_CATEGORIES.map((c) => ({ label: c, value: c }))}
                      required
                    />

                    <Select
                      label="Priority"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      options={FEEDBACK_PRIORITIES.map((p) => ({
                        label: `${p} Priority`,
                        value: p
                      }))}
                      required
                    />
                  </div>

                  {/* Subject */}
                  <Input
                    label="Subject / Topic"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Ergonomic Dual Monitor Arms for Hybrid Desks"
                    error={errors.subject}
                    required
                  />

                  {/* Message */}
                  <Textarea
                    label="Detailed Feedback or Suggestion"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your suggestion, concern, or observation in detail. Suggest actionable solutions if possible..."
                    rows={5}
                    error={errors.message}
                    required
                  />

                  {/* Anonymous Toggle Box */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isAnonymous ? (
                          <ShieldAlert className="w-4 h-4 text-amber-600" />
                        ) : (
                          <Shield className="w-4 h-4 text-brand-blue" />
                        )}
                        <label
                          htmlFor="anonymous-toggle"
                          className="text-xs font-bold text-brand-navy cursor-pointer"
                        >
                          Submit this feedback anonymously
                        </label>
                      </div>

                      <input
                        type="checkbox"
                        id="anonymous-toggle"
                        checked={isAnonymous}
                        onChange={(e) => setIsAnonymous(e.target.checked)}
                        className="rounded border-slate-300 text-brand-blue focus:ring-brand-blue w-4 h-4 cursor-pointer"
                      />
                    </div>

                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      {isAnonymous ? (
                        <span className="text-amber-800 font-medium">
                          <strong>Anonymous Mode Activated:</strong> Your name, employee ID, and user account metadata are completely stripped from the database record. HR will receive this message as &quot;Anonymous Colleague&quot;.
                        </span>
                      ) : (
                        <span>
                          Submit as <strong>{currentEmployee?.name}</strong> ({currentEmployee?.department}). HR will be able to follow up directly with you.
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Submit Button */}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-slate-400">
                      Feedback is confidential and protected by company policy.
                    </span>

                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      leftIcon={Send}
                    >
                      Send Feedback
                    </Button>
                  </div>
                </form>
              </CardBody>
            </Card>
          </div>

          {/* Privacy & Guidelines Sidebar */}
          <div className="space-y-4">
            <Card className="bg-brand-blue-light/30 border-brand-blue/20 p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-brand-navy mb-2">
                <Lock className="w-4 h-4 text-brand-blue" />
                <span>Our Privacy & Anonymity Pledge</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mb-3">
                VISARTECH People values open, candid dialogue. When you select Anonymous submission:
              </p>
              <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
                <li>No employee ID or email is stored in the feedback record.</li>
                <li>Your browser tracks your submission ID locally so you can monitor progress without linking your profile in HR reports.</li>
                <li>No IP address or workstation fingerprint is logged.</li>
              </ul>
            </Card>

            <Card className="p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-brand-navy">
                <HelpCircle className="w-4 h-4 text-brand-blue" />
                <span>Feedback Categories Guide</span>
              </div>
              <div className="text-xs text-slate-600 space-y-1.5">
                <p><strong>Workplace:</strong> Facilities, ergonomic gear, seating, amenities.</p>
                <p><strong>Management:</strong> Team communication, leadership support, processes.</p>
                <p><strong>Work Environment:</strong> Focus blocks, meeting policies, culture.</p>
                <p><strong>Suggestions:</strong> Innovations, tools, wellness ideas.</p>
                <p><strong>Technical Issues:</strong> Tooling, VPN, software access.</p>
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'HISTORY' && (
        <div className="space-y-3">
          {feedbackHistory.length === 0 ? (
            <Card className="py-12 text-center">
              <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-brand-navy">No Feedback Submissions Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                You haven&apos;t submitted any feedback from this account. Use the form above to share your ideas with HR.
              </p>
            </Card>
          ) : (
            feedbackHistory.map((item) => (
              <Card
                key={item.id}
                hoverable
                onClick={() => setSelectedFeedback(item)}
                className="p-4 cursor-pointer transition hover:border-brand-blue/30"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                        item.isAnonymous
                          ? 'bg-amber-50 text-amber-600 border-amber-200'
                          : 'bg-brand-blue/10 text-brand-blue border-brand-blue/20'
                      }`}
                    >
                      {item.isAnonymous ? (
                        <ShieldAlert className="w-5 h-5" />
                      ) : (
                        <MessageSquare className="w-5 h-5" />
                      )}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-sm sm:text-base text-brand-navy hover:text-brand-blue truncate">
                          {item.subject}
                        </h3>
                        <Badge variant={statusVariants[item.status] || 'neutral'} size="sm" dot>
                          {item.status.replace('_', ' ')}
                        </Badge>
                        {item.isAnonymous && (
                          <Badge variant="warning" size="sm">
                            Anonymous
                          </Badge>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {item.message}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500">
                        <Badge variant="neutral" size="sm">
                          {item.category}
                        </Badge>
                        <span>•</span>
                        <span>Submitted: {item.submittedAt}</span>
                        {item.response && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-600 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              HR Responded ({item.response.author})
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 self-end sm:self-center">
                    <Button variant="ghost" size="sm" leftIcon={Eye}>
                      View Response
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Viewer Modal */}
      <FeedbackDetailModal
        isOpen={Boolean(selectedFeedback)}
        onClose={() => setSelectedFeedback(null)}
        feedback={selectedFeedback}
        userRole="EMPLOYEE"
      />
    </div>
  );
}
