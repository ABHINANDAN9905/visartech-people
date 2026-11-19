import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Search,
  MessageSquare,
  Send,
  TrendingUp,
  Award,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Sliders,
  Check,
  X,
  Play,
  RotateCcw
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { getEmployees, getEmployeeById } from '../../services/employeeService';
import {
  getStoredTasks,
  getTaskStats,
  getEmployeePerformanceSummary,
  getStoredPerformanceReviews,
  updateTask,
  addTaskComment,
  isTaskOverdue,
  updateTaskBackend,
  addTaskCommentBackend,
  fetchMyTasksFromBackend,
} from '../../services/taskService';
import { formatChicagoDate, formatChicagoTime, getChicagoGreeting } from '../../utils/timezone';

import PageHeader from '../common/PageHeader';
import StatCard from '../common/StatCard';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Card, { CardHeader, CardTitle, CardDescription, CardBody, CardFooter } from '../common/Card';
import Modal from '../common/Modal';
import SearchInput from '../common/SearchInput';

export default function EmployeeTaskView() {
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

  // State
  const [tasks, setTasks] = useState(() => {
    return getStoredTasks().filter((t) => t.assignedEmployeeId === employeeId);
  });
  const [stats, setStats] = useState(() => getTaskStats(employeeId));
  const [perfSummary, setPerfSummary] = useState(() => getEmployeePerformanceSummary(employeeId));
  const [myReviews, setMyReviews] = useState(() => {
    return getStoredPerformanceReviews().filter((r) => r.employeeId === employeeId);
  });

  // Filters
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [selectedTaskTarget, setSelectedTaskTarget] = useState(null); // task object
  const [commentInput, setCommentInput] = useState('');
  const [progressDraft, setProgressDraft] = useState(0);
  const [statusDraft, setStatusDraft] = useState('TODO');
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionAlert, setActionAlert] = useState(null); // { type: 'success' | 'error', message: '' }

  // Sync state on 'tasks-updated'
  useEffect(() => {
    const handleUpdate = () => {
      setTasks(getStoredTasks().filter((t) => t.assignedEmployeeId === employeeId));
      setStats(getTaskStats(employeeId));
      setPerfSummary(getEmployeePerformanceSummary(employeeId));
      setMyReviews(getStoredPerformanceReviews().filter((r) => r.employeeId === employeeId));
    };

    window.addEventListener('tasks-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('tasks-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [employeeId]);

  // Load personal tasks from live backend on mount
  useEffect(() => {
    let isMounted = true;
    async function loadBackendTasks() {
      try {
        const res = await fetchMyTasksFromBackend({ employeeId });
        if (isMounted && res?.tasks?.length > 0) {
          setTasks(res.tasks);
        }
      } catch (err) {
        console.warn('Backend tasks sync failed, using cached view:', err);
      }
    }
    loadBackendTasks();
    return () => {
      isMounted = false;
    };
  }, [employeeId]);

  // Sync modal draft when target changes
  useEffect(() => {
    if (selectedTaskTarget) {
      const fresh = getStoredTasks().find((t) => t.id === selectedTaskTarget.id);
      if (fresh) {
        setSelectedTaskTarget(fresh);
        setProgressDraft(fresh.progress);
        setStatusDraft(fresh.status);
      }
    }
  }, [tasks]);

  // Auto-dismiss alert banner
  useEffect(() => {
    if (actionAlert) {
      const timer = setTimeout(() => setActionAlert(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [actionAlert]);

  // Greeting
  const greeting = useMemo(() => getChicagoGreeting(), []);
  const todayChicagoDate = useMemo(() => formatChicagoDate(), []);

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchStatus = filterStatus === 'ALL' || t.status === filterStatus;
      const matchSearch =
        searchTerm.trim() === '' ||
        t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [tasks, filterStatus, searchTerm]);

  // Quick Status Transition (e.g. from table/card directly)
  const handleQuickStatusChange = async (task, newStatus) => {
    setIsUpdating(true);
    try {
      const updates = { status: newStatus };
      if (newStatus === 'IN_REVIEW' && task.progress < 90) {
        updates.progress = 95;
      }
      if (newStatus === 'COMPLETED') {
        updates.progress = 100;
      }

      const targetId = task.mongoId || task.taskId || task.id;
      const result = await updateTaskBackend(targetId, updates);

      if (result.success) {
        setActionAlert({
          type: 'success',
          message: `Task ${task.taskId || task.id} updated to ${newStatus.replace('_', ' ')}.`,
        });
        const fresh = await fetchMyTasksFromBackend({ employeeId });
        if (fresh?.tasks) setTasks(fresh.tasks);
      } else {
        setActionAlert({ type: 'error', message: result.error || result.message });
      }
    } catch (err) {
      setActionAlert({ type: 'error', message: err.message || 'Failed to update status.' });
    } finally {
      setIsUpdating(false);
    }
  };

  // Submit Task Updates in Modal
  const handleSaveWorkspaceUpdates = async (e) => {
    e.preventDefault();
    if (!selectedTaskTarget) return;

    setIsUpdating(true);
    try {
      const targetId = selectedTaskTarget.mongoId || selectedTaskTarget.taskId || selectedTaskTarget.id;
      const updates = { progress: Number(progressDraft), status: statusDraft };
      if (statusDraft === 'COMPLETED') {
        updates.progress = 100;
      }

      const result = await updateTaskBackend(targetId, updates);

      if (result.success) {
        setActionAlert({
          type: 'success',
          message: `Progress on ${selectedTaskTarget.taskId || selectedTaskTarget.id} saved successfully (${updates.progress}%).`,
        });
        setSelectedTaskTarget(null);
        const fresh = await fetchMyTasksFromBackend({ employeeId });
        if (fresh?.tasks) setTasks(fresh.tasks);
      } else {
        setActionAlert({ type: 'error', message: result.error || result.message });
      }
    } catch (err) {
      setActionAlert({ type: 'error', message: err.message || 'Failed to save task progress.' });
    } finally {
      setIsUpdating(false);
    }
  };

  // Post Comment
  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!selectedTaskTarget || !commentInput.trim()) return;

    try {
      const targetId = selectedTaskTarget.mongoId || selectedTaskTarget.taskId || selectedTaskTarget.id;
      await addTaskCommentBackend(targetId, {
        authorName: currentEmployee.name,
        authorRole: 'EMPLOYEE',
        text: commentInput.trim(),
      });
      setCommentInput('');
      const fresh = await fetchMyTasksFromBackend({ employeeId });
      if (fresh?.tasks) setTasks(fresh.tasks);
    } catch (err) {
      console.warn('Failed to post comment to backend:', err);
    }
  };

  // Priority Badge Helper
  const renderPriorityBadge = (priority) => {
    switch (priority) {
      case 'URGENT':
        return <Badge variant="danger" dot>Urgent</Badge>;
      case 'HIGH':
        return <Badge variant="warning" dot>High</Badge>;
      case 'MEDIUM':
        return <Badge variant="primary">Medium</Badge>;
      case 'LOW':
        return <Badge variant="neutral">Low</Badge>;
      default:
        return <Badge variant="neutral">{priority}</Badge>;
    }
  };

  // Status Badge Helper
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge variant="success" dot>Completed</Badge>;
      case 'IN_REVIEW':
        return <Badge variant="warning" dot>In Review</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="primary" dot>In Progress</Badge>;
      case 'TODO':
        return <Badge variant="neutral">To Do</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions */}
      <PageHeader
        title="My Tasks &amp; Deliverables"
        subtitle={`${greeting}, ${currentEmployee.name}. Track your engineering milestones, update deliverable progress, and collaborate with team leads.`}
        badge={<Badge variant="primary" dot>{currentEmployee.department} Team</Badge>}
        breadcrumbs={[
          { label: 'Workforce', href: '#' },
          { label: 'Tasks & Performance' },
        ]}
      />

      {/* Global Alert Notification Banner */}
      {actionAlert && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between transition-all animate-fadeIn ${
            actionAlert.type === 'success'
              ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
              : 'bg-rose-50/90 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-3">
            {actionAlert.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <p className="text-sm font-medium">{actionAlert.message}</p>
          </div>
          <button
            onClick={() => setActionAlert(null)}
            className="p-1 hover:bg-black/5 rounded text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Personal Task KPI Cards (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Assigned to Me"
          value={`${stats.total} Tasks`}
          icon={CheckSquare}
          iconColor="blue"
          description="Personal backlog &amp; active"
        />
        <StatCard
          title="In Progress"
          value={`${stats.inProgress} Active`}
          icon={TrendingUp}
          iconColor="blue"
          trend="Sprint Focus"
          trendType="up"
          description="Under active execution"
        />
        <StatCard
          title="In Review"
          value={`${stats.inReview} Pending`}
          icon={Clock}
          iconColor="amber"
          trend={stats.inReview > 0 ? 'Submitted' : 'Ready'}
          trendType="neutral"
          description="Awaiting HR Admin sign-off"
        />
        <StatCard
          title="Completed"
          value={`${stats.completed} Done`}
          icon={CheckCircle2}
          iconColor="emerald"
          trend={`${perfSummary.onTimeCompletionRate}% on-time`}
          trendType="up"
          description="Successfully delivered"
        />
      </div>

      {/* 3. Task Management Card */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <CardTitle>My Work Queue</CardTitle>
            <CardDescription>
              Click any task to record progress velocity, view technical instructions, or post milestone comments.
            </CardDescription>
          </div>

          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {['ALL', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  filterStatus === st
                    ? 'bg-brand-navy text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === 'ALL'
                  ? 'All Tasks'
                  : st === 'TODO'
                  ? 'To Do'
                  : st === 'IN_PROGRESS'
                  ? 'In Progress'
                  : st === 'IN_REVIEW'
                  ? 'In Review'
                  : 'Completed'}
              </button>
            ))}
          </div>
        </CardHeader>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="max-w-md">
            <SearchInput
              placeholder="Search your assigned tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClear={() => setSearchTerm('')}
            />
          </div>
        </div>

        <CardBody className="p-0">
          {filteredTasks.length === 0 ? (
            <div className="py-16 text-center">
              <CheckSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-brand-navy">No tasks in this category</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                You have no items matching the selected status or search query.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredTasks.map((task) => {
                const overdue = isTaskOverdue(task);

                return (
                  <div
                    key={task.id}
                    className="p-4 hover:bg-slate-50/60 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    {/* Left: Title & Metadata */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[11px] font-bold text-slate-400">
                          {task.id}
                        </span>
                        {renderPriorityBadge(task.priority)}
                        {renderStatusBadge(task.status)}
                        {overdue && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                            OVERDUE
                          </span>
                        )}
                      </div>

                      <h4
                        className="text-sm font-bold text-slate-900 cursor-pointer hover:text-brand-blue truncate"
                        title={task.title}
                        onClick={() => setSelectedTaskTarget(task)}
                      >
                        {task.title}
                      </h4>

                      <p className="text-xs text-slate-500 line-clamp-2 mt-0.5" title={task.description}>
                        {task.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 mt-2 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <strong className={overdue ? 'text-rose-600' : 'text-slate-600'}>
                            Deadline: {task.dueDate}
                          </strong>
                        </span>
                        <span>Est: {task.estimatedHours} hrs</span>
                        {task.comments?.length > 0 && (
                          <span className="flex items-center gap-1 text-slate-600">
                            <MessageSquare className="w-3.5 h-3.5 text-brand-blue" />
                            {task.comments.length} updates logged
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Progress & Status Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 shrink-0">
                      {/* Progress bar visual */}
                      <div className="w-36">
                        <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-1">
                          <span>Progress</span>
                          <span className="text-brand-blue">{task.progress}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              task.status === 'COMPLETED'
                                ? 'bg-emerald-500'
                                : task.progress > 70
                                ? 'bg-brand-blue'
                                : 'bg-amber-400'
                            }`}
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Allowed Status Transition Buttons */}
                      <div className="flex items-center gap-2">
                        {task.status === 'TODO' && (
                          <Button
                            variant="primary"
                            size="sm"
                            leftIcon={Play}
                            className="h-8 text-xs"
                            onClick={() => handleQuickStatusChange(task, 'IN_PROGRESS')}
                          >
                            Start Task
                          </Button>
                        )}

                        {task.status === 'IN_PROGRESS' && (
                          <Button
                            variant="success"
                            size="sm"
                            leftIcon={Check}
                            className="h-8 text-xs"
                            onClick={() => handleQuickStatusChange(task, 'IN_REVIEW')}
                          >
                            Submit for Review
                          </Button>
                        )}

                        {task.status === 'IN_REVIEW' && (
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={RotateCcw}
                            className="h-8 text-xs text-slate-600"
                            onClick={() => handleQuickStatusChange(task, 'IN_PROGRESS')}
                            title="Recall to In-Progress for additional revisions"
                          >
                            Recall
                          </Button>
                        )}

                        {task.status === 'COMPLETED' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Signed Off
                          </span>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 text-xs text-slate-600"
                          onClick={() => setSelectedTaskTarget(task)}
                        >
                          Workspace
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
        <CardFooter className="bg-slate-50/50 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
          <span>Showing {filteredTasks.length} of {tasks.length} assigned engineering deliverables.</span>
          <span className="text-[11px] text-slate-400">Task ownership and deadlines administered by HR</span>
        </CardFooter>
      </Card>

      {/* 4. Performance Appraisal & Feedback History */}
      {myReviews.length > 0 && (
        <Card>
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-brand-blue" />
              <div>
                <CardTitle>My Performance Appraisals &amp; Evaluations</CardTitle>
                <CardDescription>
                  Formal managerial feedback records, strengths assessment, and agreed career goals.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            <div className="divide-y divide-slate-100">
              {myReviews.map((rev) => (
                <div key={rev.id} className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{rev.reviewPeriod} Evaluation</span>
                      <span className="text-xs text-slate-400 font-mono">({rev.id})</span>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-brand-blue border border-brand-blue/20">
                      {rev.rating}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/70 text-xs">
                    <div>
                      <span className="font-bold text-emerald-800 block mb-1">Key Strengths</span>
                      <p className="text-slate-700 leading-relaxed">{rev.strengths}</p>
                    </div>
                    <div>
                      <span className="font-bold text-amber-800 block mb-1">Development Focus</span>
                      <p className="text-slate-700 leading-relaxed">{rev.areasForImprovement}</p>
                    </div>
                    <div>
                      <span className="font-bold text-brand-navy block mb-1">Agreed Goals</span>
                      <p className="text-slate-700 leading-relaxed">{rev.goals}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 text-[11px] text-slate-400">
                    <span>Reviewed by: <strong>{rev.reviewedBy}</strong></span>
                    <span>Review Date: {rev.reviewDate}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* 5. MODAL: Task Workspace & Progress Updater */}
      <Modal
        isOpen={Boolean(selectedTaskTarget)}
        onClose={() => setSelectedTaskTarget(null)}
        title={selectedTaskTarget?.title || 'Task Workspace'}
        subtitle={`Task ID: ${selectedTaskTarget?.id} • Assigned to ${currentEmployee.name}`}
        size="lg"
      >
        {selectedTaskTarget && (
          <div className="space-y-5">
            {/* Metadata Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Priority</span>
                {renderPriorityBadge(selectedTaskTarget.priority)}
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Current Status</span>
                {renderStatusBadge(selectedTaskTarget.status)}
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Scheduled Deadline</span>
                <span className="font-bold text-slate-900">{selectedTaskTarget.dueDate}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Estimated Scope</span>
                <span className="font-bold text-slate-900">{selectedTaskTarget.estimatedHours} Hours</span>
              </div>
            </div>

            {/* Description */}
            <div>
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Description &amp; Acceptance Scope
              </h5>
              <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed">
                {selectedTaskTarget.description}
              </div>
            </div>

            {/* Technical Instructions */}
            {selectedTaskTarget.instructions && (
              <div>
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Manager Instructions
                </h5>
                <div className="p-3 bg-blue-50/50 rounded-xl border border-brand-blue/20 text-xs text-slate-800 leading-relaxed">
                  {selectedTaskTarget.instructions}
                </div>
              </div>
            )}

            {/* Interactive Progress & Status Form */}
            <form onSubmit={handleSaveWorkspaceUpdates} className="space-y-4 bg-slate-50/80 p-4 rounded-xl border border-slate-200">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Update Deliverable Velocity
              </h5>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>Current Completion:</span>
                    <span className="text-brand-blue text-sm">{progressDraft}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={progressDraft}
                    disabled={selectedTaskTarget.status === 'COMPLETED'}
                    onChange={(e) => setProgressDraft(Number(e.target.value))}
                    className="w-full accent-brand-blue"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>0% (Not Started)</span>
                    <span>50% (Midway)</span>
                    <span>100% (Finished)</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Update Task Status
                  </label>
                  <select
                    value={statusDraft}
                    disabled={selectedTaskTarget.status === 'COMPLETED'}
                    onChange={(e) => setStatusDraft(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    {selectedTaskTarget.status === 'TODO' && (
                      <>
                        <option value="TODO">To Do</option>
                        <option value="IN_PROGRESS">In Progress (Start Task)</option>
                      </>
                    )}
                    {selectedTaskTarget.status === 'IN_PROGRESS' && (
                      <>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="IN_REVIEW">In Review (Submit for Approval)</option>
                        <option value="TODO">To Do (Return to Backlog)</option>
                      </>
                    )}
                    {selectedTaskTarget.status === 'IN_REVIEW' && (
                      <>
                        <option value="IN_REVIEW">In Review</option>
                        <option value="IN_PROGRESS">In Progress (Recall for edits)</option>
                      </>
                    )}
                    {selectedTaskTarget.status === 'COMPLETED' && (
                      <option value="COMPLETED">Completed (Signed Off)</option>
                    )}
                  </select>
                </div>
              </div>

              {selectedTaskTarget.status !== 'COMPLETED' ? (
                <div className="flex justify-end pt-1">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={isUpdating}
                  >
                    Save Progress Updates
                  </Button>
                </div>
              ) : (
                <p className="text-[11px] text-emerald-700 font-semibold italic">
                  This task was signed off as completed by HR Administration. Modifying status is locked.
                </p>
              )}
            </form>

            {/* Comments & Activity Stream */}
            <div>
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Activity Feed &amp; Progress Updates ({selectedTaskTarget.comments?.length || 0})
              </h5>

              <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                {selectedTaskTarget.comments?.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No notes or updates logged yet.</p>
                ) : (
                  selectedTaskTarget.comments?.map((c) => (
                    <div key={c.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-900 flex items-center gap-1.5">
                          {c.authorName}
                          <span className="text-[10px] font-normal px-1.5 py-0.2 bg-slate-200 text-slate-600 rounded">
                            {c.authorRole}
                          </span>
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {c.createdAt ? c.createdAt.split('T')[0] : ''}
                        </span>
                      </div>
                      <p className="text-slate-700 leading-relaxed">{c.text}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment Input */}
              <form onSubmit={handlePostComment} className="mt-3 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Post progress notes or link pull requests..."
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  className="flex-1 text-xs rounded-xl border border-slate-200 px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                />
                <Button type="submit" variant="primary" size="sm" leftIcon={Send}>
                  Post Update
                </Button>
              </form>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setSelectedTaskTarget(null)}>
                Close Workspace
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
