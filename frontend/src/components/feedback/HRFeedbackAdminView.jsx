import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageSquare,
  Shield,
  ShieldAlert,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  User,
  HeartHandshake,
  Star
} from 'lucide-react';

import PageHeader from '../common/PageHeader';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Card, { CardHeader, CardTitle, CardDescription, CardBody } from '../common/Card';
import StatCard from '../common/StatCard';
import SearchInput from '../common/SearchInput';
import Select from '../common/Select';

import FeedbackDetailModal from './FeedbackDetailModal';

import {
  getAllFeedbackForAdmin,
  FEEDBACK_CATEGORIES,
  FEEDBACK_STATUSES,
  fetchFeedbackFromBackend,
} from '../../services/feedbackService';

export default function HRFeedbackAdminView() {
  const [feedbackList, setFeedbackList] = useState(() => getAllFeedbackForAdmin());
  const [activeTab, setActiveTab] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function syncBackendFeedback() {
      try {
        const live = await fetchFeedbackFromBackend();
        if (isMounted && live && live.length > 0) {
          setFeedbackList(live);
        }
      } catch (err) {
        console.warn('Backend sync failed in HRFeedbackAdminView:', err);
      }
    }
    syncBackendFeedback();

    const handleUpdate = () => {
      setFeedbackList(getAllFeedbackForAdmin());
    };
    window.addEventListener('feedback-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('feedback-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Filtered list
  const filteredList = useMemo(() => {
    return feedbackList.filter((item) => {
      if (activeTab !== 'ALL' && item.status !== activeTab) {
        return false;
      }
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSubject = item.subject?.toLowerCase().includes(q);
        const matchesMessage = item.message?.toLowerCase().includes(q);
        const matchesName = item.employeeName?.toLowerCase().includes(q);
        if (!matchesSubject && !matchesMessage && !matchesName) return false;
      }
      return true;
    });
  }, [feedbackList, activeTab, categoryFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = feedbackList.length;
    const newCount = feedbackList.filter((f) => f.status === 'NEW').length;
    const underReview = feedbackList.filter((f) => f.status === 'UNDER_REVIEW').length;
    const resolved = feedbackList.filter((f) => f.status === 'RESOLVED' || f.status === 'RESPONDED').length;
    const anonymousCount = feedbackList.filter((f) => f.isAnonymous).length;
    return { total, newCount, underReview, resolved, anonymousCount };
  }, [feedbackList]);

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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Employee Feedback & Pulse Management"
        subtitle="Review, categorize, investigate, and respond to anonymous suggestions and workplace morale feedback."
        badge={<Badge variant="navy">HR Administration</Badge>}
        breadcrumbs={[
          { label: 'Workforce', href: '#' },
          { label: 'Feedback' }
        ]}
      />

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          title="Total Feedback"
          value={stats.total}
          icon={MessageSquare}
          iconColor="blue"
          description="All submissions"
        />
        <StatCard
          title="New Unreviewed"
          value={stats.newCount}
          icon={AlertCircle}
          iconColor="amber"
          description="Awaiting HR review"
        />
        <StatCard
          title="Under Review"
          value={stats.underReview}
          icon={Clock}
          iconColor="navy"
          description="In investigation"
        />
        <StatCard
          title="Resolved & Closed"
          value={stats.resolved}
          icon={CheckCircle2}
          iconColor="emerald"
          description="Responses posted"
        />
      </div>

      {/* Compliance / Privacy banner */}
      <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl flex items-center justify-between text-xs text-brand-navy">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-brand-blue shrink-0" />
          <span>
            <strong>Anonymity Guarantee:</strong> {stats.anonymousCount} submission(s) are strictly anonymous. Employee accounts, IP, and personal identifiers are excluded from the database record.
          </span>
        </div>
        <Badge variant="info" size="sm">
          Privacy Protected
        </Badge>
      </div>

      {/* Filter and Search Card */}
      <Card>
        <CardBody className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto text-xs font-semibold">
              {[
                { id: 'ALL', label: `All (${stats.total})` },
                { id: 'NEW', label: `New (${stats.newCount})` },
                { id: 'UNDER_REVIEW', label: `Under Review (${stats.underReview})` },
                { id: 'RESPONDED', label: `Responded` },
                { id: 'RESOLVED', label: `Resolved` }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-white text-brand-navy shadow-xs'
                      : 'text-slate-600 hover:text-brand-navy'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="w-full sm:w-48">
                <Select
                  name="categoryFilter"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  options={[
                    { label: 'All Categories', value: 'ALL' },
                    ...FEEDBACK_CATEGORIES.map((c) => ({ label: c, value: c }))
                  ]}
                  size="sm"
                />
              </div>

              <div className="w-full sm:w-64">
                <SearchInput
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClear={() => setSearchQuery('')}
                  placeholder="Search feedback..."
                  size="sm"
                />
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Feedback List */}
      <div className="space-y-3">
        {filteredList.length === 0 ? (
          <Card className="py-12 text-center">
            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-brand-navy">No Feedback Submissions Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              No employee submissions match your current filters.
            </p>
          </Card>
        ) : (
          filteredList.map((item) => (
            <Card
              key={item.id}
              hoverable
              onClick={() => setSelectedFeedback(item)}
              className="p-4 cursor-pointer transition hover:border-brand-blue/30"
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
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
                      <Badge variant={priorityVariants[item.priority] || 'neutral'} size="sm">
                        {item.priority}
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500">
                      <Badge variant="neutral" size="sm">
                        {item.category}
                      </Badge>
                      <span>•</span>
                      <span>
                        Submitter:{' '}
                        <strong className="text-brand-navy">
                          {item.isAnonymous ? 'Anonymous Colleague' : `${item.employeeName} (${item.employeeDepartment})`}
                        </strong>
                      </span>
                      <span>•</span>
                      <span>Date: {item.submittedAt}</span>
                      {item.internalNotes?.length > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-brand-blue font-semibold">
                            {item.internalNotes.length} Internal Note(s)
                          </span>
                        </>
                      )}
                      {item.response && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-600 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Responded
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 self-end md:self-center">
                  <Button variant="ghost" size="sm" leftIcon={Eye}>
                    Manage
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Feedback Detail / Management Modal */}
      <FeedbackDetailModal
        isOpen={Boolean(selectedFeedback)}
        onClose={() => setSelectedFeedback(null)}
        feedback={selectedFeedback}
        userRole="HR_ADMIN"
      />
    </div>
  );
}
