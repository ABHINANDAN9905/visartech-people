import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckSquare,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Filter,
  Search,
  ChevronDown,
  User,
  Building2,
  Trash2,
  Edit,
  Eye,
  MessageSquare,
  Send,
  TrendingUp,
  Award,
  Target,
  ShieldCheck,
  AlertTriangle,
  ArrowUpDown,
  X,
  Check
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell
} from 'recharts';

import { useAuth } from '../../context/AuthContext';
import { getEmployees, getEmployeeById } from '../../services/employeeService';
import {
  getStoredTasks,
  getTaskStats,
  getEmployeePerformanceSummary,
  getStoredPerformanceReviews,
  createTask,
  updateTask,
  deleteTask,
  addTaskComment,
  createPerformanceReview,
  isTaskOverdue,
  createTaskBackend,
  updateTaskBackend,
  deleteTaskBackend,
  addTaskCommentBackend,
  fetchTasksFromBackend,
  fetchTaskStatsFromBackend,
} from '../../services/taskService';
import { formatChicagoDate, formatChicagoTime, getChicagoGreeting } from '../../utils/timezone';

import PageHeader from '../common/PageHeader';
import StatCard from '../common/StatCard';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Card, { CardHeader, CardTitle, CardDescription, CardBody, CardFooter } from '../common/Card';
import Modal from '../common/Modal';
import Avatar from '../common/Avatar';
import SearchInput from '../common/SearchInput';
import Input from '../common/Input';
import Select from '../common/Select';
import Textarea from '../common/Textarea';

export default function HRTaskAdminView() {
  const { user } = useAuth();

  // Active Tab
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' | 'performance' | 'reviews'

  // Centralized State
  const [tasks, setTasks] = useState(() => getStoredTasks());
  const [stats, setStats] = useState(() => getTaskStats());
  const [employees, setEmployees] = useState(() => getEmployees());
  const [perfSummary, setPerfSummary] = useState(() => getEmployeePerformanceSummary());
  const [reviews, setReviews] = useState(() => getStoredPerformanceReviews());

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('ALL');
  const [filterEmployee, setFilterEmployee] = useState('ALL');
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [sortOrder, setSortOrder] = useState('ASC'); // 'ASC' | 'DESC'

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [detailTaskTarget, setDetailTaskTarget] = useState(null); // task object
  const [editTaskTarget, setEditTaskTarget] = useState(null); // task object
  const [deleteTaskTarget, setDeleteTaskTarget] = useState(null); // task object

  // Form State: Create Task
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    instructions: '',
    assignedEmployeeId: 'EMP-001',
    priority: 'MEDIUM',
    startDate: '2026-11-17',
    dueDate: '2026-11-24',
    estimatedHours: 16,
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionAlert, setActionAlert] = useState(null); // { type: 'success' | 'error', message: '' }

  // Form State: Performance Review
  const [reviewForm, setReviewForm] = useState({
    employeeId: 'EMP-001',
    reviewPeriod: 'Q4 2026',
    ratingScore: 4.5,
    strengths: '',
    areasForImprovement: '',
    goals: '',
    reviewNotes: '',
  });

  // Comment Input state inside details modal
  const [newCommentText, setNewCommentText] = useState('');

  // Sync state on 'tasks-updated'
  useEffect(() => {
    const handleUpdate = () => {
      setTasks(getStoredTasks());
      setStats(getTaskStats());
      setEmployees(getEmployees());
      setPerfSummary(getEmployeePerformanceSummary());
      setReviews(getStoredPerformanceReviews());
    };

    window.addEventListener('tasks-updated', handleUpdate);
    window.addEventListener('employees-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('tasks-updated', handleUpdate);
      window.removeEventListener('employees-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Fetch live tasks and stats on mount
  useEffect(() => {
    let isMounted = true;
    async function loadLiveData() {
      try {
        const [tasksRes, statsRes] = await Promise.all([
          fetchTasksFromBackend(),
          fetchTaskStatsFromBackend(),
        ]);
        if (isMounted) {
          if (tasksRes?.tasks?.length > 0) setTasks(tasksRes.tasks);
          if (statsRes) setStats(statsRes);
        }
      } catch (err) {
        console.warn('Backend tasks load failed, using cached state:', err);
      }
    }
    loadLiveData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Update detailTaskTarget if tasks refresh
  useEffect(() => {
    if (detailTaskTarget) {
      const refreshed = tasks.find((t) => t.id === detailTaskTarget.id);
      if (refreshed) setDetailTaskTarget(refreshed);
    }
  }, [tasks]);

  // Auto-dismiss alert
  useEffect(() => {
    if (actionAlert) {
      const timer = setTimeout(() => setActionAlert(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [actionAlert]);

  // Greeting
  const greeting = useMemo(() => getChicagoGreeting(), []);
  const todayChicagoDate = useMemo(() => formatChicagoDate(), []);

  // Filtered & Sorted Tasks
  const filteredTasks = useMemo(() => {
    return tasks
      .filter((t) => {
        const matchSearch =
          searchTerm.trim() === '' ||
          t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.assignedEmployeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.description.toLowerCase().includes(searchTerm.toLowerCase());

        const matchDept = filterDept === 'ALL' || t.department === filterDept;
        const matchEmp = filterEmployee === 'ALL' || t.assignedEmployeeId === filterEmployee;
        const matchPri = filterPriority === 'ALL' || t.priority === filterPriority;
        const matchSta = filterStatus === 'ALL' || t.status === filterStatus;

        return matchSearch && matchDept && matchEmp && matchPri && matchSta;
      })
      .sort((a, b) => {
        const dateA = new Date(a.dueDate).getTime();
        const dateB = new Date(b.dueDate).getTime();
        return sortOrder === 'ASC' ? dateA - dateB : dateB - dateA;
      });
  }, [tasks, searchTerm, filterDept, filterEmployee, filterPriority, filterStatus, sortOrder]);

  // Handle Create Task Form
  const handleCreateTaskSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});

    const errors = {};
    if (!taskForm.title.trim()) errors.title = 'Task title is required.';
    if (!taskForm.description.trim()) errors.description = 'Task description is required.';
    if (!taskForm.assignedEmployeeId) errors.assignedEmployeeId = 'Select an employee.';
    if (!taskForm.startDate) errors.startDate = 'Start date is required.';
    if (!taskForm.dueDate) errors.dueDate = 'Due date is required.';
    if (taskForm.startDate && taskForm.dueDate && taskForm.dueDate < taskForm.startDate) {
      errors.dueDate = 'Due date cannot precede start date.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createTaskBackend({
        ...taskForm,
      });

      if (result.success) {
        setActionAlert({ type: 'success', message: result.message || 'Task created successfully.' });
        setIsCreateModalOpen(false);
        setTaskForm({
          title: '',
          description: '',
          instructions: '',
          assignedEmployeeId: 'EMP-001',
          priority: 'MEDIUM',
          startDate: '2026-11-17',
          dueDate: '2026-11-24',
          estimatedHours: 16,
        });
        const fresh = await fetchTasksFromBackend();
        if (fresh?.tasks) setTasks(fresh.tasks);
      } else {
        setActionAlert({ type: 'error', message: result.error || result.message });
      }
    } catch (err) {
      setActionAlert({ type: 'error', message: err.message || 'Failed to create task.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Edit Task Form
  const handleEditTaskSubmit = async (e) => {
    e.preventDefault();
    if (!editTaskTarget) return;

    setIsSubmitting(true);
    try {
      const targetId = editTaskTarget.mongoId || editTaskTarget.taskId || editTaskTarget.id;
      const result = await updateTaskBackend(targetId, editTaskTarget);

      if (result.success) {
        setActionAlert({ type: 'success', message: result.message || 'Task updated successfully.' });
        setEditTaskTarget(null);
        const fresh = await fetchTasksFromBackend();
        if (fresh?.tasks) setTasks(fresh.tasks);
      } else {
        setActionAlert({ type: 'error', message: result.error || result.message });
      }
    } catch (err) {
      setActionAlert({ type: 'error', message: err.message || 'Failed to update task.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Quick Sign-Off as Completed
  const handleSignOffTask = async (task) => {
    try {
      const targetId = task.mongoId || task.taskId || task.id;
      const result = await updateTaskBackend(targetId, { status: 'COMPLETED', progress: 100 });

      if (result.success) {
        setActionAlert({
          type: 'success',
          message: `Task ${task.taskId || task.id} (${task.title}) has been signed off and marked COMPLETED.`,
        });
        const fresh = await fetchTasksFromBackend();
        if (fresh?.tasks) setTasks(fresh.tasks);
      }
    } catch (err) {
      setActionAlert({ type: 'error', message: err.message || 'Failed to sign off task.' });
    }
  };

  // Handle Delete Confirmation
  const handleConfirmDelete = async () => {
    if (!deleteTaskTarget) return;
    try {
      const targetId = deleteTaskTarget.mongoId || deleteTaskTarget.taskId || deleteTaskTarget.id;
      const result = await deleteTaskBackend(targetId);
      if (result.success) {
        setActionAlert({ type: 'success', message: result.message || 'Task deleted successfully.' });
        const fresh = await fetchTasksFromBackend();
        if (fresh?.tasks) setTasks(fresh.tasks);
      }
    } catch (err) {
      setActionAlert({ type: 'error', message: err.message || 'Failed to delete task.' });
    } finally {
      setDeleteTaskTarget(null);
    }
  };

  // Handle Comment Submission in Detail Modal
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!detailTaskTarget || !newCommentText.trim()) return;

    try {
      const targetId = detailTaskTarget.mongoId || detailTaskTarget.taskId || detailTaskTarget.id;
      await addTaskCommentBackend(targetId, {
        authorName: user?.name || 'Alex Morgan',
        authorRole: 'HR_ADMIN',
        text: newCommentText.trim(),
      });
      setNewCommentText('');
      const fresh = await fetchTasksFromBackend();
      if (fresh?.tasks) setTasks(fresh.tasks);
    } catch (err) {
      console.warn('Failed to post comment to backend:', err);
    }
  };

  // Handle Performance Review Submission
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewForm.strengths.trim() || !reviewForm.goals.trim()) {
      setActionAlert({
        type: 'error',
        message: 'Please complete all required fields (Strengths, Development Goals).',
      });
      return;
    }

    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 350));

    const ratingLabel =
      reviewForm.ratingScore >= 4.5
        ? `Exceeds Expectations (${reviewForm.ratingScore} / 5.0)`
        : reviewForm.ratingScore >= 3.5
        ? `Proficient Performer (${reviewForm.ratingScore} / 5.0)`
        : `Needs Improvement (${reviewForm.ratingScore} / 5.0)`;

    const result = createPerformanceReview({
      ...reviewForm,
      rating: ratingLabel,
      reviewedBy: `${user?.name || 'Alex Morgan'} (Head of HR)`,
    });

    setIsSubmitting(false);

    if (result.success) {
      setActionAlert({ type: 'success', message: result.message });
      setIsReviewModalOpen(false);
      setReviewForm({
        employeeId: 'EMP-001',
        reviewPeriod: 'Q4 2026',
        ratingScore: 4.5,
        strengths: '',
        areasForImprovement: '',
        goals: '',
        reviewNotes: '',
      });
    } else {
      setActionAlert({ type: 'error', message: result.error });
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

  // Department Task Distribution Chart Data
  const deptChartData = useMemo(() => {
    const depts = ['Engineering', 'Product & Design', 'Infrastructure', 'QA'];
    return depts.map((d) => {
      const deptTasks = tasks.filter((t) => t.department === d);
      return {
        department: d,
        completed: deptTasks.filter((t) => t.status === 'COMPLETED').length,
        inProgress: deptTasks.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'IN_REVIEW').length,
        todo: deptTasks.filter((t) => t.status === 'TODO').length,
      };
    });
  }, [tasks]);

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions */}
      <PageHeader
        title="Tasks & Performance Operations"
        subtitle={`${greeting}, ${user?.name || 'Alex'}. Supervise workforce deliverables, assign development milestones, and conduct performance appraisals.`}
        badge={<Badge variant="primary" dot>HR Administrator</Badge>}
        breadcrumbs={[
          { label: 'Workforce', href: '#' },
          { label: 'Tasks & Performance' },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              leftIcon={Award}
              onClick={() => setIsReviewModalOpen(true)}
            >
              Performance Review
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={Plus}
              onClick={() => {
                setFormErrors({});
                setIsCreateModalOpen(true);
              }}
            >
              Assign New Task
            </Button>
          </div>
        }
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

      {/* 2. 6 Task Statistics KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Total Tasks"
          value={`${stats.total} Tasks`}
          icon={CheckSquare}
          iconColor="blue"
          description="Active Sprint Pipeline"
        />
        <StatCard
          title="To Do"
          value={`${stats.todo} Backlog`}
          icon={Clock}
          iconColor="slate"
          description="Unstarted items"
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
          icon={AlertCircle}
          iconColor="amber"
          trend={stats.inReview > 0 ? 'Ready for sign-off' : 'Zero backlog'}
          trendType={stats.inReview > 0 ? 'neutral' : 'up'}
          description="Awaiting HR/Lead review"
        />
        <StatCard
          title="Completed"
          value={`${stats.completed} Done`}
          icon={CheckCircle2}
          iconColor="emerald"
          description="Fully signed off"
        />
        <StatCard
          title="Overdue Tasks"
          value={`${stats.overdue} Overdue`}
          icon={AlertTriangle}
          iconColor="rose"
          trend={stats.overdue > 0 ? 'Action Needed' : 'On Schedule'}
          trendType={stats.overdue > 0 ? 'down' : 'up'}
          description="Past scheduled deadline"
        />
      </div>

      {/* 3. Navigation Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex items-center gap-6 text-sm font-semibold">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`pb-3 relative transition flex items-center gap-2 ${
              activeTab === 'tasks'
                ? 'text-brand-blue border-b-2 border-brand-blue'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>Task Directory &amp; Assignments</span>
            <span className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded-full font-bold">
              {stats.total}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('performance')}
            className={`pb-3 relative transition flex items-center gap-2 ${
              activeTab === 'performance'
                ? 'text-brand-blue border-b-2 border-brand-blue'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Team Operational Performance</span>
          </button>

          <button
            onClick={() => setActiveTab('reviews')}
            className={`pb-3 relative transition flex items-center gap-2 ${
              activeTab === 'reviews'
                ? 'text-brand-blue border-b-2 border-brand-blue'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Performance Reviews</span>
            <span className="bg-blue-100 text-brand-blue text-xs px-2 py-0.5 rounded-full font-bold">
              {reviews.length}
            </span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: Task Directory & Management Table */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'tasks' && (
        <Card>
          <CardHeader className="flex flex-col gap-4 border-b border-slate-100 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle>Workforce Deliverables &amp; Objectives</CardTitle>
                <CardDescription>
                  Monitor task velocity, update priorities, and sign off deliverables across all departments.
                </CardDescription>
              </div>

              {/* Status Filter Quick Pills */}
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
                      ? 'All'
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
            </div>

            {/* Filter Controls Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
              <SearchInput
                placeholder="Search tasks, IDs or descriptions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClear={() => setSearchTerm('')}
              />

              {/* Department Filter */}
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="text-xs rounded-xl border border-slate-200 px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              >
                <option value="ALL">All Departments</option>
                <option value="Engineering">Engineering</option>
                <option value="Product & Design">Product &amp; Design</option>
                <option value="Infrastructure">Infrastructure</option>
                <option value="QA">QA</option>
              </select>

              {/* Employee Filter */}
              <select
                value={filterEmployee}
                onChange={(e) => setFilterEmployee(e.target.value)}
                className="text-xs rounded-xl border border-slate-200 px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              >
                <option value="ALL">All Assignees (6)</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.id})
                  </option>
                ))}
              </select>

              {/* Priority Filter */}
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="text-xs rounded-xl border border-slate-200 px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              >
                <option value="ALL">All Priorities</option>
                <option value="URGENT">Urgent</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>

              {/* Due Date Sort Toggle */}
              <button
                onClick={() => setSortOrder((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'))}
                className="inline-flex items-center justify-between text-xs rounded-xl border border-slate-200 px-3 py-2 bg-white text-slate-700 hover:bg-slate-50 transition"
              >
                <span className="flex items-center gap-1.5 font-medium">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  Sort Due Date
                </span>
                <span className="text-[11px] font-bold text-brand-blue">
                  {sortOrder === 'ASC' ? 'Earliest First' : 'Latest First'}
                </span>
              </button>
            </div>
          </CardHeader>

          <CardBody className="p-0">
            {filteredTasks.length === 0 ? (
              <div className="py-16 text-center">
                <CheckSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-brand-navy">No tasks found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  No records match your active search and filter combinations.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4">Task ID &amp; Title</th>
                      <th className="py-3 px-4">Assigned Member</th>
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Schedule &amp; Deadline</th>
                      <th className="py-3 px-4">Progress</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {filteredTasks.map((task) => {
                      const overdue = isTaskOverdue(task);

                      return (
                        <tr key={task.id} className="hover:bg-slate-50/50 transition">
                          {/* Title & ID */}
                          <td className="py-3.5 px-4 max-w-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[11px] font-bold text-slate-400">
                                {task.id}
                              </span>
                              {overdue && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                                  OVERDUE
                                </span>
                              )}
                            </div>
                            <p
                              className="font-bold text-slate-900 mt-0.5 cursor-pointer hover:text-brand-blue truncate"
                              title={task.title}
                              onClick={() => setDetailTaskTarget(task)}
                            >
                              {task.title}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate mt-0.5" title={task.description}>
                              {task.description}
                            </p>
                          </td>

                          {/* Assignee */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <Avatar name={task.assignedEmployeeName} size="sm" />
                              <div>
                                <div className="font-bold text-slate-900">
                                  {task.assignedEmployeeName}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  {task.department}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Priority */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {renderPriorityBadge(task.priority)}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {renderStatusBadge(task.status)}
                          </td>

                          {/* Schedule */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div
                              className={`font-semibold ${
                                overdue ? 'text-rose-600 font-bold' : 'text-slate-800'
                              }`}
                            >
                              Due: {task.dueDate}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              Est: {task.estimatedHours} hrs • Start: {task.startDate}
                            </div>
                          </td>

                          {/* Progress */}
                          <td className="py-3.5 px-4 whitespace-nowrap min-w-[120px]">
                            <div className="flex items-center justify-between text-[11px] mb-1">
                              <span className="font-semibold text-brand-navy">{task.progress}%</span>
                              {task.comments?.length > 0 && (
                                <span className="text-slate-400 flex items-center gap-0.5">
                                  <MessageSquare className="w-3 h-3" />
                                  {task.comments.length}
                                </span>
                              )}
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-1.5 rounded-full transition-all duration-300 ${
                                  task.status === 'COMPLETED'
                                    ? 'bg-emerald-500'
                                    : task.progress > 70
                                    ? 'bg-brand-blue'
                                    : 'bg-amber-400'
                                }`}
                                style={{ width: `${task.progress}%` }}
                              />
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {task.status === 'IN_REVIEW' && (
                                <Button
                                  variant="success"
                                  size="sm"
                                  className="h-7 px-2.5 text-xs"
                                  leftIcon={Check}
                                  onClick={() => handleSignOffTask(task)}
                                  title="Sign off deliverables as Completed"
                                >
                                  Sign Off
                                </Button>
                              )}

                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => setDetailTaskTarget(task)}
                                title="Inspect Activity & Comments"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-600" />
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => setEditTaskTarget({ ...task })}
                                title="Edit Task"
                              >
                                <Edit className="w-3.5 h-3.5 text-slate-600" />
                              </Button>

                              <Button
                                variant="danger-outline"
                                size="sm"
                                className="h-7 px-2 text-xs text-rose-500 hover:text-rose-700"
                                onClick={() => setDeleteTaskTarget(task)}
                                title="Delete Task"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
          <CardFooter className="bg-slate-50/50 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span>Showing {filteredTasks.length} of {tasks.length} total company tasks.</span>
            <span className="text-[11px] text-slate-400">America/Chicago (CST) delivery schedules</span>
          </CardFooter>
        </Card>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: Team Performance & Operational Metrics */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          {/* Important Operational Notice Disclaimer */}
          <div className="p-4 bg-blue-50/80 border border-brand-blue/20 rounded-2xl flex items-start gap-3.5 text-xs text-slate-700">
            <ShieldCheck className="w-5 h-5 text-brand-blue shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-brand-navy text-sm">Operational Task Delivery Indicators</p>
              <p className="mt-0.5 leading-relaxed text-slate-600">
                These operational indicators quantify sprint velocity, milestone delivery on-time rates, and active task progress across departments.
                They are used for capacity planning and workload rebalancing, and are <strong>not definitive employee performance ratings</strong>, which are evaluated qualitatively through holistic quarterly reviews.
              </p>
            </div>
          </div>

          {/* Department Velocity Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Departmental Task Velocity</CardTitle>
              <CardDescription>
                Distribution of completed, active, and backlog deliverables by functional group.
              </CardDescription>
            </CardHeader>
            <CardBody className="p-4">
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5EAF2" />
                    <XAxis dataKey="department" stroke="#718096" fontSize={11} tickLine={false} />
                    <YAxis stroke="#718096" fontSize={11} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#101B35',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '12px',
                        border: 'none',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="completed" name="Completed" fill="#16A36A" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="inProgress" name="In Progress / Review" fill="#356AE6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="todo" name="To Do" fill="#CBD5E1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>

          {/* Employee Operational Indicators Table */}
          <Card>
            <CardHeader>
              <CardTitle>Workforce Operational Delivery Summary</CardTitle>
              <CardDescription>
                Calculated in real-time from active and historical task records.
              </CardDescription>
            </CardHeader>
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4 text-center">Assigned</th>
                      <th className="py-3 px-4 text-center">Completed</th>
                      <th className="py-3 px-4 text-center">In Progress</th>
                      <th className="py-3 px-4 text-center">Overdue</th>
                      <th className="py-3 px-4 text-center">On-Time Rate</th>
                      <th className="py-3 px-4 text-right">Avg Progress</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {perfSummary.map((emp) => (
                      <tr key={emp.employeeId} className="hover:bg-slate-50/50 transition">
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={emp.employeeName} size="sm" />
                            <div>
                              <div className="font-bold text-slate-900">{emp.employeeName}</div>
                              <div className="text-[11px] text-slate-400 font-mono">{emp.employeeId}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700 font-medium">
                            {emp.department}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                          {emp.assignedTasks}
                        </td>

                        <td className="py-3.5 px-4 text-center font-bold text-emerald-600">
                          {emp.completedTasks}
                        </td>

                        <td className="py-3.5 px-4 text-center font-bold text-brand-blue">
                          {emp.inProgressTasks}
                        </td>

                        <td className="py-3.5 px-4 text-center font-bold">
                          {emp.overdueTasks > 0 ? (
                            <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded font-bold">
                              {emp.overdueTasks}
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {emp.onTimeCompletionRate}%
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <span className="font-bold text-slate-900">{emp.averageProgress}%</span>
                            <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-brand-blue h-1.5 rounded-full"
                                style={{ width: `${emp.averageProgress}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: Performance Evaluations & Reviews */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'reviews' && (
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <CardTitle>Formal Performance Evaluations</CardTitle>
              <CardDescription>
                Qualitative appraisal records, developmental goals, and 360-degree feedback notes (Restricted to HR Administrator).
              </CardDescription>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={Plus}
              onClick={() => setIsReviewModalOpen(true)}
            >
              Conduct Performance Review
            </Button>
          </CardHeader>
          <CardBody className="p-0">
            <div className="divide-y divide-slate-100">
              {reviews.map((rev) => (
                <div key={rev.id} className="p-5 hover:bg-slate-50/50 transition">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5">
                      <Avatar name={rev.employeeName} size="md" />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">{rev.employeeName}</h4>
                          <span className="text-xs text-slate-400 font-mono">({rev.employeeId})</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700 font-medium">
                            {rev.department}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{rev.jobTitle}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-brand-blue border border-brand-blue/20">
                        {rev.rating}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">{rev.reviewPeriod}</span>
                    </div>
                  </div>

                  {/* Review Qualitative Content Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/70 text-xs">
                    <div>
                      <span className="font-bold text-emerald-800 block mb-1">Key Strengths</span>
                      <p className="text-slate-700 leading-relaxed">{rev.strengths}</p>
                    </div>
                    <div>
                      <span className="font-bold text-amber-800 block mb-1">Areas for Development</span>
                      <p className="text-slate-700 leading-relaxed">{rev.areasForImprovement}</p>
                    </div>
                    <div>
                      <span className="font-bold text-brand-navy block mb-1">Upcoming Goals</span>
                      <p className="text-slate-700 leading-relaxed">{rev.goals}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 text-[11px] text-slate-400">
                    <span>Evaluated by: <strong>{rev.reviewedBy}</strong></span>
                    <span>Review Date: {rev.reviewDate}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. MODAL: Create New Task */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Assign New Task"
        subtitle="Create an operational deliverable with start date, deadline, and assigned workforce member."
        size="lg"
      >
        <form onSubmit={handleCreateTaskSubmit} className="space-y-4">
          <Input
            label="Task Title"
            required
            placeholder="e.g. Implement Webhook Dispatcher for Payroll Events"
            value={taskForm.title}
            onChange={(e) => setTaskForm((p) => ({ ...p, title: e.target.value }))}
            error={formErrors.title}
          />

          <Textarea
            label="Task Description"
            required
            rows={3}
            placeholder="Detailed deliverable scope, technical requirements, and acceptance criteria..."
            value={taskForm.description}
            onChange={(e) => setTaskForm((p) => ({ ...p, description: e.target.value }))}
            error={formErrors.description}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Assigned Employee <span className="text-rose-500">*</span>
              </label>
              <select
                value={taskForm.assignedEmployeeId}
                onChange={(e) => setTaskForm((p) => ({ ...p, assignedEmployeeId: e.target.value }))}
                className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              >
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} — {e.department} ({e.jobTitle})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Priority Tier <span className="text-rose-500">*</span>
              </label>
              <select
                value={taskForm.priority}
                onChange={(e) => setTaskForm((p) => ({ ...p, priority: e.target.value }))}
                className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              >
                <option value="LOW">Low (Standard backlog)</option>
                <option value="MEDIUM">Medium (Current sprint)</option>
                <option value="HIGH">High (Urgent milestone)</option>
                <option value="URGENT">Urgent (Critical blocker)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              type="date"
              label="Start Date"
              required
              value={taskForm.startDate}
              onChange={(e) => setTaskForm((p) => ({ ...p, startDate: e.target.value }))}
              error={formErrors.startDate}
            />

            <Input
              type="date"
              label="Due Date"
              required
              value={taskForm.dueDate}
              onChange={(e) => setTaskForm((p) => ({ ...p, dueDate: e.target.value }))}
              error={formErrors.dueDate}
            />

            <Input
              type="number"
              label="Estimated Hours"
              min={1}
              max={200}
              value={taskForm.estimatedHours}
              onChange={(e) => setTaskForm((p) => ({ ...p, estimatedHours: e.target.value }))}
            />
          </div>

          <Textarea
            label="Optional Instructions & Acceptance Criteria"
            rows={2}
            placeholder="e.g. Target <50ms query execution time. Ensure lint checks pass."
            value={taskForm.instructions}
            onChange={(e) => setTaskForm((p) => ({ ...p, instructions: e.target.value }))}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
            >
              Create &amp; Assign Task
            </Button>
          </div>
        </form>
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* 5. MODAL: Edit Task */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={Boolean(editTaskTarget)}
        onClose={() => setEditTaskTarget(null)}
        title={`Edit Task: ${editTaskTarget?.id}`}
        subtitle="Update milestone specifications, reassign ownership, or modify deadlines."
        size="lg"
      >
        {editTaskTarget && (
          <form onSubmit={handleEditTaskSubmit} className="space-y-4">
            <Input
              label="Task Title"
              required
              value={editTaskTarget.title}
              onChange={(e) => setEditTaskTarget((p) => ({ ...p, title: e.target.value }))}
            />

            <Textarea
              label="Description"
              required
              rows={3}
              value={editTaskTarget.description}
              onChange={(e) => setEditTaskTarget((p) => ({ ...p, description: e.target.value }))}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Employee</label>
                <select
                  value={editTaskTarget.assignedEmployeeId}
                  onChange={(e) => setEditTaskTarget((p) => ({ ...p, assignedEmployeeId: e.target.value }))}
                  className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} — {e.department} ({e.jobTitle})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                <select
                  value={editTaskTarget.status}
                  onChange={(e) => setEditTaskTarget((p) => ({ ...p, status: e.target.value }))}
                  className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                >
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="IN_REVIEW">In Review</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
                <select
                  value={editTaskTarget.priority}
                  onChange={(e) => setEditTaskTarget((p) => ({ ...p, priority: e.target.value }))}
                  className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <Input
                type="date"
                label="Due Date"
                required
                value={editTaskTarget.dueDate}
                onChange={(e) => setEditTaskTarget((p) => ({ ...p, dueDate: e.target.value }))}
              />

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Progress ({editTaskTarget.progress}%)</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={editTaskTarget.progress}
                  onChange={(e) => setEditTaskTarget((p) => ({ ...p, progress: Number(e.target.value) }))}
                  className="w-full mt-2 accent-brand-blue"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditTaskTarget(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSubmitting}
              >
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* 6. MODAL: Task Details & Activity Stream */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={Boolean(detailTaskTarget)}
        onClose={() => setDetailTaskTarget(null)}
        title={detailTaskTarget?.title || 'Task Details'}
        subtitle={`Task ID: ${detailTaskTarget?.id} • Created by ${detailTaskTarget?.createdBy}`}
        size="lg"
      >
        {detailTaskTarget && (
          <div className="space-y-5">
            {/* Metadata Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs">
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Assignee</span>
                <span className="font-bold text-slate-900">{detailTaskTarget.assignedEmployeeName}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Priority</span>
                {renderPriorityBadge(detailTaskTarget.priority)}
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Status</span>
                {renderStatusBadge(detailTaskTarget.status)}
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Deadline</span>
                <span className="font-bold text-slate-900">{detailTaskTarget.dueDate}</span>
              </div>
            </div>

            {/* Description */}
            <div>
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Description &amp; Deliverable Scope
              </h5>
              <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed">
                {detailTaskTarget.description}
              </div>
            </div>

            {/* Instructions if any */}
            {detailTaskTarget.instructions && (
              <div>
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Technical Acceptance Criteria
                </h5>
                <div className="p-3 bg-blue-50/50 rounded-xl border border-brand-blue/20 text-xs text-slate-800 leading-relaxed">
                  {detailTaskTarget.instructions}
                </div>
              </div>
            )}

            {/* Progress Slider */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700">Completion Velocity</span>
                <span className="text-brand-blue font-bold">{detailTaskTarget.progress}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-brand-blue h-2 rounded-full transition-all duration-300"
                  style={{ width: `${detailTaskTarget.progress}%` }}
                />
              </div>
            </div>

            {/* Comments & Activity Stream */}
            <div>
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Activity Feed &amp; Comments ({detailTaskTarget.comments?.length || 0})
              </h5>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {detailTaskTarget.comments?.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No notes or comments logged yet.</p>
                ) : (
                  detailTaskTarget.comments?.map((c) => (
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
              <form onSubmit={handleAddComment} className="mt-3 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Post an operational update or feedback note..."
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  className="flex-1 text-xs rounded-xl border border-slate-200 px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                />
                <Button type="submit" variant="primary" size="sm" leftIcon={Send}>
                  Post
                </Button>
              </form>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setDetailTaskTarget(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* 7. MODAL: Delete Task Confirmation */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={Boolean(deleteTaskTarget)}
        onClose={() => setDeleteTaskTarget(null)}
        title="Remove Task"
        subtitle={`Task ID: ${deleteTaskTarget?.id}`}
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Are you sure you want to delete this task?</p>
              <p className="mt-1 text-slate-600">
                This will permanently remove <strong>{deleteTaskTarget?.title}</strong> assigned to {deleteTaskTarget?.assignedEmployeeName}. This action cannot be undone.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteTaskTarget(null)}>
              Keep Task
            </Button>
            <Button variant="danger" size="sm" onClick={handleConfirmDelete}>
              Yes, Delete Task
            </Button>
          </div>
        </div>
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* 8. MODAL: Conduct Performance Review */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        title="Conduct Performance Review"
        subtitle="Record qualitative appraisal evaluations, developmental feedback, and upcoming goals."
        size="lg"
      >
        <form onSubmit={handleReviewSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Select Employee <span className="text-rose-500">*</span>
              </label>
              <select
                value={reviewForm.employeeId}
                onChange={(e) => setReviewForm((p) => ({ ...p, employeeId: e.target.value }))}
                className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              >
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} — {e.department} ({e.jobTitle})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Evaluation Cycle <span className="text-rose-500">*</span>
              </label>
              <select
                value={reviewForm.reviewPeriod}
                onChange={(e) => setReviewForm((p) => ({ ...p, reviewPeriod: e.target.value }))}
                className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              >
                <option value="Q4 2026">Q4 2026 (Year-End Review)</option>
                <option value="Q1 2027">Q1 2027 (Upcoming Cycle)</option>
                <option value="Annual 2026">Annual 2026 Comprehensive</option>
                <option value="Mid-Year 2026">Mid-Year 2026</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Overall Appraisal Score: <span className="text-brand-blue font-bold text-sm">{reviewForm.ratingScore} / 5.0</span>
            </label>
            <input
              type="range"
              min="1.0"
              max="5.0"
              step="0.1"
              value={reviewForm.ratingScore}
              onChange={(e) => setReviewForm((p) => ({ ...p, ratingScore: Number(e.target.value) }))}
              className="w-full accent-brand-blue"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>1.0 (Needs Support)</span>
              <span>3.0 (Meets Standards)</span>
              <span>5.0 (Exceeds Expectations)</span>
            </div>
          </div>

          <Textarea
            label="Key Strengths & High-Impact Contributions"
            required
            rows={2}
            placeholder="e.g. Excellent architectural leadership, robust zero-downtime releases, active mentoring..."
            value={reviewForm.strengths}
            onChange={(e) => setReviewForm((p) => ({ ...p, strengths: e.target.value }))}
          />

          <Textarea
            label="Areas for Professional Development"
            rows={2}
            placeholder="e.g. Enhance automated stress-testing, delegate junior code review triage..."
            value={reviewForm.areasForImprovement}
            onChange={(e) => setReviewForm((p) => ({ ...p, areasForImprovement: e.target.value }))}
          />

          <Textarea
            label="Agreed Next Quarter Objectives &amp; Goals"
            required
            rows={2}
            placeholder="e.g. Lead migration to MongoDB sharded cluster, publish React component documentation..."
            value={reviewForm.goals}
            onChange={(e) => setReviewForm((p) => ({ ...p, goals: e.target.value }))}
          />

          <Textarea
            label="General Evaluation Notes (Optional)"
            rows={2}
            placeholder="Confidential summary remarks for the employee profile..."
            value={reviewForm.reviewNotes}
            onChange={(e) => setReviewForm((p) => ({ ...p, reviewNotes: e.target.value }))}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsReviewModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
            >
              Submit Evaluation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
