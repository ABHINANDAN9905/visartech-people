import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCircle2,
  CalendarCheck,
  CalendarX,
  CheckSquare,
  Megaphone,
  BadgeDollarSign,
  MessageSquare,
  Clock,
  ExternalLink,
  Check,
  Trash2,
  Filter,
  Search,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Card, { CardHeader, CardTitle, CardDescription, CardBody } from '../components/common/Card';
import StatCard from '../components/common/StatCard';
import Select from '../components/common/Select';
import SearchInput from '../components/common/SearchInput';

import { useAuth } from '../context/AuthContext';
import {
  getNotificationsForUser,
  getUnreadCount,
  markNotificationAsRead,
  markNotificationAsUnread,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
  fetchNotificationsFromBackend,
  markNotificationReadBackend,
  markAllNotificationsReadBackend,
} from '../services/notificationService';

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Perspective switcher
  const initialRole = user?.role === 'HR_ADMIN' ? 'HR_ADMIN' : 'EMPLOYEE';
  const [activeRoleView, setActiveRoleView] = useState(initialRole);

  useEffect(() => {
    setActiveRoleView(user?.role === 'HR_ADMIN' ? 'HR_ADMIN' : 'EMPLOYEE');
  }, [user?.role]);

  const [notifications, setNotifications] = useState(() =>
    getNotificationsForUser(user, activeRoleView)
  );

  const [activeTab, setActiveTab] = useState('ALL'); // ALL | UNREAD
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let isMounted = true;
    async function syncBackendNotifications() {
      try {
        const live = await fetchNotificationsFromBackend();
        if (isMounted && live && live.length > 0) {
          setNotifications(getNotificationsForUser(user, activeRoleView));
        }
      } catch (err) {
        console.warn('Backend sync failed in Notifications:', err);
      }
    }
    syncBackendNotifications();

    const handleUpdate = () => {
      setNotifications(getNotificationsForUser(user, activeRoleView));
    };
    handleUpdate();
    window.addEventListener('notifications-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('notifications-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [user, activeRoleView]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      if (activeTab === 'UNREAD' && item.read) return false;
      if (typeFilter !== 'ALL' && item.type !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title?.toLowerCase().includes(q);
        const matchesMsg = item.message?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesMsg) return false;
      }
      return true;
    });
  }, [notifications, activeTab, typeFilter, searchQuery]);

  const stats = useMemo(() => {
    const total = notifications.length;
    const unread = notifications.filter((n) => !n.read).length;
    const read = total - unread;
    return { total, unread, read };
  }, [notifications]);

  const getIconForType = (type) => {
    switch (type) {
      case 'leave_approved':
        return <CalendarCheck className="w-5 h-5 text-emerald-600" />;
      case 'leave_rejected':
        return <CalendarX className="w-5 h-5 text-rose-600" />;
      case 'task_assigned':
        return <CheckSquare className="w-5 h-5 text-brand-blue" />;
      case 'payroll_published':
        return <BadgeDollarSign className="w-5 h-5 text-brand-navy" />;
      case 'announcement':
        return <Megaphone className="w-5 h-5 text-indigo-600" />;
      case 'feedback_response':
        return <MessageSquare className="w-5 h-5 text-amber-600" />;
      default:
        return <Bell className="w-5 h-5 text-slate-500" />;
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'leave_approved':
      case 'leave_rejected':
        return 'Leave Update';
      case 'task_assigned':
        return 'Task & Performance';
      case 'payroll_published':
        return 'Compensation';
      case 'announcement':
        return 'Announcement';
      case 'feedback_response':
        return 'Feedback & Morale';
      default:
        return 'Alert';
    }
  };

  return (
    <div className="space-y-6">
      {/* Demo Perspective Switcher Bar */}
      <div className="bg-white border border-slate-200/80 rounded-xl px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Bell className="w-4 h-4 text-brand-blue shrink-0" />
          <span>
            Active View Perspective:{' '}
            <strong className="text-brand-navy">
              {activeRoleView === 'HR_ADMIN'
                ? 'HR Administrator (Alex Morgan) — Global Alerts'
                : 'Employee Self-Service (Jordan Lee) — Personal Notifications'}
            </strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveRoleView('HR_ADMIN')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeRoleView === 'HR_ADMIN'
                ? 'bg-brand-navy text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admin Alert Feed</span>
          </button>

          <button
            onClick={() => setActiveRoleView('EMPLOYEE')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeRoleView === 'EMPLOYEE'
                ? 'bg-brand-blue text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Employee Personal Feed</span>
          </button>
        </div>
      </div>

      {/* Page Header */}
      <PageHeader
        title="Notifications & Activity Alerts"
        subtitle="Real-time operational alerts for tasks, leaves, payroll notices, company announcements, and employee feedback."
        badge={<Badge variant="info">Activity Stream</Badge>}
        breadcrumbs={[
          { label: 'System', href: '#' },
          { label: 'Notifications' }
        ]}
        actions={
          <div className="flex gap-2">
            {stats.unread > 0 && (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={Check}
                onClick={async () => {
                  try {
                    await markAllNotificationsReadBackend(user?.role, user?.id);
                  } catch (e) {
                    console.warn('Backend mark all read error:', e);
                  }
                  markAllNotificationsAsRead(user, activeRoleView);
                }}
              >
                Mark All Read
              </Button>
            )}
            {stats.total > 0 && (
              <Button
                variant="ghost"
                size="sm"
                leftIcon={Trash2}
                onClick={() => clearAllNotifications(user, activeRoleView)}
                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
              >
                Clear All
              </Button>
            )}
          </div>
        }
      />

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Notifications"
          value={stats.total}
          icon={Bell}
          iconColor="blue"
          description="System notices"
        />
        <StatCard
          title="Unread Alerts"
          value={stats.unread}
          icon={Clock}
          iconColor="amber"
          description="Requires attention"
        />
        <StatCard
          title="Read & Archived"
          value={stats.read}
          icon={CheckCircle2}
          iconColor="emerald"
          description="Reviewed notifications"
        />
      </div>

      {/* Tabs and Filters */}
      <Card>
        <CardBody className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto text-xs font-semibold">
              <button
                onClick={() => setActiveTab('ALL')}
                className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                  activeTab === 'ALL'
                    ? 'bg-white text-brand-navy shadow-xs'
                    : 'text-slate-600 hover:text-brand-navy'
                }`}
              >
                All ({stats.total})
              </button>
              <button
                onClick={() => setActiveTab('UNREAD')}
                className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                  activeTab === 'UNREAD'
                    ? 'bg-white text-brand-navy shadow-xs'
                    : 'text-slate-600 hover:text-brand-navy'
                }`}
              >
                Unread ({stats.unread})
              </button>
            </div>

            {/* Type Filter & Search */}
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="w-full sm:w-48">
                <Select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  options={[
                    { label: 'All Event Types', value: 'ALL' },
                    { label: 'Announcements', value: 'announcement' },
                    { label: 'Tasks', value: 'task_assigned' },
                    { label: 'Leaves', value: 'leave_approved' },
                    { label: 'Payroll', value: 'payroll_published' },
                    { label: 'Feedback', value: 'feedback_response' }
                  ]}
                  size="sm"
                />
              </div>

              <div className="w-full sm:w-64">
                <SearchInput
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClear={() => setSearchQuery('')}
                  placeholder="Search alerts..."
                  size="sm"
                />
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <Card className="py-12 text-center">
            <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-brand-navy">No Notifications Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              You are all caught up! No notifications match your selected filters.
            </p>
          </Card>
        ) : (
          filteredNotifications.map((item) => (
            <Card
              key={item.id}
              className={`p-4 transition ${
                !item.read
                  ? 'border-brand-blue/30 bg-blue-50/20 ring-1 ring-brand-blue/20'
                  : 'bg-white'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 mt-0.5">
                    {getIconForType(item.type)}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3
                        className={`text-sm sm:text-base ${
                          !item.read ? 'font-bold text-brand-navy' : 'font-medium text-slate-700'
                        }`}
                      >
                        {item.title}
                      </h3>
                      {!item.read && (
                        <Badge variant="warning" size="sm" dot>
                          Unread
                        </Badge>
                      )}
                      <Badge variant="neutral" size="sm">
                        {getTypeLabel(item.type)}
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {item.message}
                    </p>

                    <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{item.formattedDate || 'Recent'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {item.link && (
                    <Button
                      variant="primary"
                      size="sm"
                      rightIcon={ExternalLink}
                      onClick={async () => {
                        try {
                          await markNotificationReadBackend(item.id);
                        } catch (e) {
                          console.warn('Backend mark read error:', e);
                        }
                        markNotificationAsRead(item.id);
                        navigate(item.link);
                      }}
                    >
                      View
                    </Button>
                  )}

                  {!item.read ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        try {
                          await markNotificationReadBackend(item.id);
                        } catch (e) {
                          console.warn('Backend mark read error:', e);
                        }
                        markNotificationAsRead(item.id);
                      }}
                      title="Mark as read"
                    >
                      Mark Read
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markNotificationAsUnread(item.id)}
                      title="Mark as unread"
                    >
                      Mark Unread
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={Trash2}
                    onClick={() => deleteNotification(item.id)}
                    className="text-slate-400 hover:text-rose-600"
                    title="Delete notification"
                  />
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
