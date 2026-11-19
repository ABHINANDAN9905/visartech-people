import React, { useState, useEffect, useMemo } from 'react';
import {
  Megaphone,
  Search,
  Filter,
  Pin,
  Eye,
  CheckCircle2,
  Clock,
  Sparkles,
  BookOpen
} from 'lucide-react';

import PageHeader from '../common/PageHeader';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Card, { CardHeader, CardTitle, CardDescription, CardBody } from '../common/Card';
import StatCard from '../common/StatCard';
import SearchInput from '../common/SearchInput';
import Select from '../common/Select';

import AnnouncementDetailModal from './AnnouncementDetailModal';

import { useAuth } from '../../context/AuthContext';
import { getEmployees } from '../../services/employeeService';
import {
  getAnnouncementsForEmployee,
  markAnnouncementAsRead,
  ANNOUNCEMENT_CATEGORIES,
  fetchAnnouncementsFromBackend,
  markAnnouncementReadBackend,
} from '../../services/announcementService';

export default function EmployeeAnnouncementView() {
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
  const department = currentEmployee?.department || 'Engineering';

  const [announcements, setAnnouncements] = useState(() =>
    getAnnouncementsForEmployee(employeeId, department)
  );
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function syncBackendAnnouncements() {
      try {
        const live = await fetchAnnouncementsFromBackend();
        if (isMounted && live && live.length > 0) {
          setAnnouncements(getAnnouncementsForEmployee(employeeId, department));
        }
      } catch (err) {
        console.warn('Backend sync failed in EmployeeAnnouncementView:', err);
      }
    }
    syncBackendAnnouncements();

    const handleUpdate = () => {
      setAnnouncements(getAnnouncementsForEmployee(employeeId, department));
    };
    window.addEventListener('announcements-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('announcements-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [employeeId, department]);

  // Scoped filtered announcements
  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((item) => {
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title?.toLowerCase().includes(q);
        const matchesDesc = item.description?.toLowerCase().includes(q);
        const matchesAuthor = item.author?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesAuthor) return false;
      }
      return true;
    });
  }, [announcements, categoryFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = announcements.length;
    const unread = announcements.filter(
      (a) => !Array.isArray(a.readBy) || !a.readBy.includes(employeeId)
    ).length;
    const pinned = announcements.filter((a) => a.pinned).length;
    return { total, unread, pinned };
  }, [announcements, employeeId]);

  const handleOpenAnnouncement = (item) => {
    setSelectedAnnouncement(item);
    // Mark as read on backend and locally
    markAnnouncementReadBackend(item.id, employeeId);
  };

  const categoryColors = {
    'Company Events': 'info',
    'HR Updates': 'navy',
    'Holidays': 'success',
    'Policy Updates': 'warning',
    'Important Notices': 'danger',
    'General': 'neutral'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Company Bulletins & Notices"
        subtitle={`Welcome, ${currentEmployee?.name || 'Jordan Lee'} (${department}). Stay up to date with executive notices, departmental policies, and holiday schedules.`}
        badge={<Badge variant="info">Employee Portal</Badge>}
        breadcrumbs={[
          { label: 'Company', href: '#' },
          { label: 'Announcements' }
        ]}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Active Bulletins"
          value={stats.total}
          icon={Megaphone}
          iconColor="blue"
          description="Targeted to your role & dept"
        />
        <StatCard
          title="Unread Notices"
          value={stats.unread}
          icon={Sparkles}
          iconColor="amber"
          description="Pending your review"
        />
        <StatCard
          title="Pinned Priorities"
          value={stats.pinned}
          icon={Pin}
          iconColor="navy"
          description="Key organizational updates"
        />
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardBody className="p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="w-full sm:w-60">
              <Select
                name="categoryFilter"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                options={[
                  { label: 'All Categories', value: 'ALL' },
                  ...ANNOUNCEMENT_CATEGORIES.map((c) => ({ label: c, value: c }))
                ]}
                size="sm"
              />
            </div>

            <div className="w-full sm:w-72">
              <SearchInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery('')}
                placeholder="Search bulletins..."
                size="sm"
              />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Feed of Announcements */}
      <div className="space-y-3">
        {filteredAnnouncements.length === 0 ? (
          <Card className="py-12 text-center">
            <Megaphone className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-brand-navy">No Bulletins Available</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              You are completely caught up! No active company announcements match your current filter.
            </p>
          </Card>
        ) : (
          filteredAnnouncements.map((item) => {
            const isRead = Array.isArray(item.readBy) && item.readBy.includes(employeeId);

            return (
              <Card
                key={item.id}
                hoverable
                onClick={() => handleOpenAnnouncement(item)}
                className={`p-4 cursor-pointer transition ${
                  item.pinned
                    ? 'border-brand-blue/30 bg-blue-50/20'
                    : !isRead
                    ? 'border-brand-blue/40 bg-white ring-1 ring-brand-blue/20'
                    : ''
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                        item.pinned
                          ? 'bg-brand-blue text-white border-brand-blue'
                          : !isRead
                          ? 'bg-brand-blue/10 text-brand-blue border-brand-blue/30'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                    >
                      {item.pinned ? (
                        <Pin className="w-5 h-5 fill-white" />
                      ) : (
                        <Megaphone className="w-5 h-5" />
                      )}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-sm sm:text-base text-brand-navy hover:text-brand-blue truncate">
                          {item.title}
                        </h3>
                        {item.pinned && (
                          <span className="text-[10px] font-bold text-brand-blue uppercase bg-blue-100 px-1.5 py-0.5 rounded">
                            Pinned
                          </span>
                        )}
                        {!isRead ? (
                          <Badge variant="warning" size="sm" dot>
                            Unread
                          </Badge>
                        ) : (
                          <Badge variant="neutral" size="sm">
                            Read
                          </Badge>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500">
                        <Badge variant={categoryColors[item.category] || 'neutral'} size="sm">
                          {item.category}
                        </Badge>
                        <span>•</span>
                        <span>Published: {item.publishDate}</span>
                        <span>•</span>
                        <span>Author: {item.author}</span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 self-end sm:self-center">
                    <Button variant="ghost" size="sm" leftIcon={BookOpen}>
                      Read
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Reader Modal */}
      <AnnouncementDetailModal
        isOpen={Boolean(selectedAnnouncement)}
        onClose={() => setSelectedAnnouncement(null)}
        announcement={selectedAnnouncement}
        onMarkAsRead={(id) => markAnnouncementAsRead(id, employeeId)}
        isRead={
          Boolean(
            selectedAnnouncement &&
            Array.isArray(selectedAnnouncement.readBy) &&
            selectedAnnouncement.readBy.includes(employeeId)
          )
        }
        userRole="EMPLOYEE"
      />
    </div>
  );
}
