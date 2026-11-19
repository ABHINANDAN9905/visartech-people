import React, { useState, useEffect, useMemo } from 'react';
import {
  Megaphone,
  Plus,
  Search,
  Filter,
  Pin,
  Edit2,
  Trash2,
  Archive,
  Eye,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Send,
  AlertTriangle
} from 'lucide-react';

import PageHeader from '../common/PageHeader';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Card, { CardHeader, CardTitle, CardDescription, CardBody } from '../common/Card';
import StatCard from '../common/StatCard';
import Modal from '../common/Modal';
import SearchInput from '../common/SearchInput';
import Select from '../common/Select';

import AnnouncementModal from './AnnouncementModal';
import AnnouncementDetailModal from './AnnouncementDetailModal';

import {
  getAnnouncementsForAdmin,
  createAnnouncement,
  updateAnnouncement,
  archiveAnnouncement,
  deleteAnnouncement,
  ANNOUNCEMENT_CATEGORIES,
  fetchAnnouncementsFromBackend,
  createAnnouncementBackend,
  updateAnnouncementBackend,
  deleteAnnouncementBackend,
} from '../../services/announcementService';

export default function HRAnnouncementAdminView() {
  const [announcements, setAnnouncements] = useState(() => getAnnouncementsForAdmin());
  const [activeTab, setActiveTab] = useState('ALL'); // ALL | PUBLISHED | DRAFT | ARCHIVED
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [viewingAnnouncement, setViewingAnnouncement] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function syncBackendAnnouncements() {
      try {
        const live = await fetchAnnouncementsFromBackend();
        if (isMounted && live && live.length > 0) {
          setAnnouncements(live);
        }
      } catch (err) {
        console.warn('Backend sync failed in HRAnnouncementAdminView:', err);
      }
    }
    syncBackendAnnouncements();

    const handleUpdate = () => {
      setAnnouncements(getAnnouncementsForAdmin());
    };
    window.addEventListener('announcements-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('announcements-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Filtered announcements
  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((item) => {
      // Tab filter
      if (activeTab !== 'ALL' && item.status !== activeTab) {
        return false;
      }
      // Category filter
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) {
        return false;
      }
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title?.toLowerCase().includes(q);
        const matchesDesc = item.description?.toLowerCase().includes(q);
        const matchesAuthor = item.author?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesAuthor) return false;
      }
      return true;
    });
  }, [announcements, activeTab, categoryFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = announcements.length;
    const published = announcements.filter((a) => a.status === 'PUBLISHED').length;
    const drafts = announcements.filter((a) => a.status === 'DRAFT').length;
    const archived = announcements.filter((a) => a.status === 'ARCHIVED').length;
    return { total, published, drafts, archived };
  }, [announcements]);

  const handleSaveAnnouncement = async (formData) => {
    if (editingAnnouncement) {
      try {
        await updateAnnouncementBackend(editingAnnouncement.id, formData);
      } catch (e) {
        console.warn('Backend update announcement error:', e);
      }
      updateAnnouncement(editingAnnouncement.id, formData);
      setEditingAnnouncement(null);
    } else {
      try {
        await createAnnouncementBackend(formData);
      } catch (e) {
        console.warn('Backend create announcement error:', e);
      }
      createAnnouncement(formData);
      setIsCreateModalOpen(false);
    }
  };

  const handlePublishDraft = async (id) => {
    try {
      await updateAnnouncementBackend(id, { status: 'PUBLISHED' });
    } catch (e) {
      console.warn('Backend publish draft error:', e);
    }
    updateAnnouncement(id, { status: 'PUBLISHED' });
  };

  const handleArchive = async (id) => {
    try {
      await deleteAnnouncementBackend(id, false);
    } catch (e) {
      console.warn('Backend archive error:', e);
    }
    archiveAnnouncement(id);
  };

  const handleDeleteConfirm = async () => {
    if (deletingId) {
      try {
        await deleteAnnouncementBackend(deletingId, true);
      } catch (e) {
        console.warn('Backend delete error:', e);
      }
      deleteAnnouncement(deletingId);
      setDeletingId(null);
    }
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
      {/* Page Header */}
      <PageHeader
        title="Announcement Broadcast Hub"
        subtitle="Create, target, schedule, and archive company-wide bulletins and departmental notices."
        badge={<Badge variant="navy">HR Administration</Badge>}
        breadcrumbs={[
          { label: 'Workforce', href: '#' },
          { label: 'Announcements' }
        ]}
        actions={
          <Button
            variant="primary"
            size="sm"
            leftIcon={Plus}
            onClick={() => {
              setEditingAnnouncement(null);
              setIsCreateModalOpen(true);
            }}
          >
            Create Announcement
          </Button>
        }
      />

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          title="Total Bulletins"
          value={stats.total}
          icon={Megaphone}
          iconColor="blue"
          description="All time notices"
        />
        <StatCard
          title="Active Published"
          value={stats.published}
          icon={CheckCircle2}
          iconColor="emerald"
          description="Visible to employees"
        />
        <StatCard
          title="Drafts Pending"
          value={stats.drafts}
          icon={Clock}
          iconColor="amber"
          description="Unpublished notices"
        />
        <StatCard
          title="Archived Bulletins"
          value={stats.archived}
          icon={Archive}
          iconColor="slate"
          description="Historical records"
        />
      </div>

      {/* Tabs & Filters Bar */}
      <Card>
        <CardBody className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Status Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto text-xs font-semibold">
              {[
                { id: 'ALL', label: `All (${stats.total})` },
                { id: 'PUBLISHED', label: `Published (${stats.published})` },
                { id: 'DRAFT', label: `Drafts (${stats.drafts})` },
                { id: 'ARCHIVED', label: `Archived (${stats.archived})` }
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

            {/* Search & Category Filter */}
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="w-full sm:w-48">
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

              <div className="w-full sm:w-64">
                <SearchInput
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClear={() => setSearchQuery('')}
                  placeholder="Search announcements..."
                  size="sm"
                />
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Announcements List */}
      <div className="space-y-3">
        {filteredAnnouncements.length === 0 ? (
          <Card className="py-12 text-center">
            <Megaphone className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-brand-navy">No Announcements Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              No bulletins match your current filters. Adjust your criteria or create a new announcement.
            </p>
          </Card>
        ) : (
          filteredAnnouncements.map((item) => (
            <Card
              key={item.id}
              hoverable
              className={`p-4 transition ${
                item.pinned ? 'border-brand-blue/30 bg-blue-50/20' : ''
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                {/* Left side details */}
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                      item.pinned
                        ? 'bg-brand-blue text-white border-brand-blue'
                        : item.status === 'PUBLISHED'
                        ? 'bg-brand-blue-light/50 text-brand-blue border-brand-blue/20'
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
                      <h3
                        onClick={() => setViewingAnnouncement(item)}
                        className="font-bold text-sm sm:text-base text-brand-navy hover:text-brand-blue cursor-pointer truncate"
                      >
                        {item.title}
                      </h3>
                      {item.pinned && (
                        <span className="text-[10px] font-bold text-brand-blue uppercase bg-blue-100 px-1.5 py-0.5 rounded">
                          Pinned
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500">
                      <Badge variant={categoryColors[item.category] || 'neutral'} size="sm">
                        {item.category}
                      </Badge>

                      <Badge
                        variant={
                          item.status === 'PUBLISHED'
                            ? 'success'
                            : item.status === 'DRAFT'
                            ? 'warning'
                            : 'neutral'
                        }
                        size="sm"
                        dot
                      >
                        {item.status}
                      </Badge>

                      <span>•</span>
                      <span>Target: <strong>{item.targetAudience === 'Selected Department' ? `Dept: ${item.targetDepartment}` : item.targetAudience}</strong></span>
                      <span>•</span>
                      <span>By: {item.author}</span>
                      <span>•</span>
                      <span>Date: {item.publishDate}</span>
                    </div>
                  </div>
                </div>

                {/* Right side actions */}
                <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={Eye}
                    onClick={() => setViewingAnnouncement(item)}
                    title="View details"
                  >
                    View
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={Edit2}
                    onClick={() => {
                      setEditingAnnouncement(item);
                      setIsCreateModalOpen(true);
                    }}
                    title="Edit announcement"
                  >
                    Edit
                  </Button>

                  {item.status === 'DRAFT' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={Send}
                      onClick={() => handlePublishDraft(item.id)}
                      title="Publish to employees"
                    >
                      Publish
                    </Button>
                  )}

                  {item.status === 'PUBLISHED' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={Archive}
                      onClick={() => handleArchive(item.id)}
                      title="Archive bulletin"
                    >
                      Archive
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={Trash2}
                    onClick={() => setDeletingId(item.id)}
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                    title="Delete announcement"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Create / Edit Modal */}
      <AnnouncementModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingAnnouncement(null);
        }}
        onSubmit={handleSaveAnnouncement}
        initialData={editingAnnouncement}
        isEditing={Boolean(editingAnnouncement)}
      />

      {/* Detail Viewer Modal */}
      <AnnouncementDetailModal
        isOpen={Boolean(viewingAnnouncement)}
        onClose={() => setViewingAnnouncement(null)}
        announcement={viewingAnnouncement}
        userRole="HR_ADMIN"
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        title="Confirm Delete Announcement"
        size="sm"
      >
        <div className="space-y-4 pt-2">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-xs text-rose-800">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <p className="font-bold">Are you sure you want to delete this announcement?</p>
              <p className="mt-1">
                This action is permanent and will remove the bulletin from all employee feeds.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setDeletingId(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              leftIcon={Trash2}
              onClick={handleDeleteConfirm}
            >
              Permanently Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
