/**
 * Centralized Tasks & Performance Management Service for VISARTECH People
 * Single Source of Truth for Workforce Tasks, Deliverables, Status Transitions, and Performance Reviews.
 * 
 * Architecture:
 * - Persistent demo storage via localStorage (visartech_tasks, visartech_performance_reviews)
 * - Explicitly modular & API-ready for immediate migration to MongoDB / Express backend.
 * - Business Rules:
 *    * Role-based permissions: HR_ADMIN can create, edit, reassign, delete, and conduct performance reviews.
 *    * EMPLOYEE can only view their own tasks, update status (within allowed workflow), adjust progress %, and add comments.
 *    * Status Workflow: TODO -> IN_PROGRESS -> IN_REVIEW -> COMPLETED
 *    * Due date >= Start date validation
 *    * Overdue detection relative to America/Chicago current date (2026-11-17)
 *    * Performance indicators calculated from actual task deliveries, clearly labelled as operational indicators.
 */

import { getEmployees, getEmployeeById } from './employeeService.js';
import { formatChicagoDate, getChicagoNow } from '../utils/timezone.js';
import { createNotification } from './notificationService.js';
import api from './apiClient.js';

const STORAGE_KEY_TASKS = 'visartech_tasks_records';
const STORAGE_KEY_REVIEWS = 'visartech_performance_reviews';

// Current Chicago reference date for overdue calculation
export const REFERENCE_DATE = '2026-11-17';

// -------------------------------------------------------------
// Seed Initial Tasks (Across all 6 canonical employees)
// -------------------------------------------------------------
export const INITIAL_TASKS = [
  {
    id: 'TSK-101',
    title: 'Implement JWT Cookie Auth Handler',
    description: 'Build backend middleware for HTTP-only cookie extraction, refresh token rotation, and invalidation upon session termination.',
    instructions: 'Ensure secure samesite=lax flags and unit tests covering expired token interception.',
    assignedEmployeeId: 'EMP-006',
    assignedEmployeeName: 'Jordan Lee',
    assignedEmployeeRole: 'Full Stack Software Engineer',
    department: 'Engineering',
    priority: 'HIGH', // LOW | MEDIUM | HIGH | URGENT
    status: 'IN_PROGRESS', // TODO | IN_PROGRESS | IN_REVIEW | COMPLETED
    startDate: '2026-11-12',
    dueDate: '2026-11-20',
    estimatedHours: 16,
    progress: 65,
    createdBy: 'Alex Morgan (HR Administrator)',
    createdAt: '2026-11-12T09:00:00Z',
    completedAt: null,
    comments: [
      {
        id: 'c-1',
        authorName: 'Alex Morgan',
        authorRole: 'HR_ADMIN',
        text: 'Assigned for Sprint 24 security milestone.',
        createdAt: '2026-11-12T09:15:00Z',
      },
      {
        id: 'c-2',
        authorName: 'Jordan Lee',
        authorRole: 'EMPLOYEE',
        text: 'JWT verification middleware structure drafted. Adding refresh token rotation logic today.',
        createdAt: '2026-11-15T14:30:00Z',
      },
    ],
  },
  {
    id: 'TSK-102',
    title: 'Responsive Employee Directory Table',
    description: 'Ensure mobile viewports stack table rows into cards seamlessly without horizontal overflow.',
    instructions: 'Test on iOS Safari and Chrome Android dev tools emulation.',
    assignedEmployeeId: 'EMP-006',
    assignedEmployeeName: 'Jordan Lee',
    assignedEmployeeRole: 'Full Stack Software Engineer',
    department: 'Engineering',
    priority: 'MEDIUM',
    status: 'TODO',
    startDate: '2026-11-14',
    dueDate: '2026-11-22',
    estimatedHours: 12,
    progress: 10,
    createdBy: 'Alex Morgan (HR Administrator)',
    createdAt: '2026-11-14T10:00:00Z',
    completedAt: null,
    comments: [
      {
        id: 'c-3',
        authorName: 'Alex Morgan',
        authorRole: 'HR_ADMIN',
        text: 'Elena provided Figma mobile specs in Design System v2.4.',
        createdAt: '2026-11-14T10:05:00Z',
      },
    ],
  },
  {
    id: 'TSK-103',
    title: 'Chicago Timezone Punch-Clock Widget',
    description: 'Integrate real-time America/Chicago clock and persistent attendance punch actions with server sync.',
    instructions: 'Verify zero drift when browser tab is backgrounded for over 15 minutes.',
    assignedEmployeeId: 'EMP-006',
    assignedEmployeeName: 'Jordan Lee',
    assignedEmployeeRole: 'Full Stack Software Engineer',
    department: 'Engineering',
    priority: 'URGENT',
    status: 'IN_REVIEW',
    startDate: '2026-11-15',
    dueDate: '2026-11-18',
    estimatedHours: 8,
    progress: 90,
    createdBy: 'Alex Morgan (HR Administrator)',
    createdAt: '2026-11-15T08:30:00Z',
    completedAt: null,
    comments: [
      {
        id: 'c-4',
        authorName: 'Jordan Lee',
        authorRole: 'EMPLOYEE',
        text: 'Punch clock and late grace threshold tests passing. Ready for HR Admin review and sign-off.',
        createdAt: '2026-11-17T11:00:00Z',
      },
    ],
  },
  {
    id: 'TSK-104',
    title: 'Automated Unit Tests for Leave Calculations',
    description: 'Write Jest assertions verifying balance deduction and boundary checks for all leave categories.',
    instructions: 'Include test suites for casual, sick, and paid quota exhaustion.',
    assignedEmployeeId: 'EMP-006',
    assignedEmployeeName: 'Jordan Lee',
    assignedEmployeeRole: 'Full Stack Software Engineer',
    department: 'Engineering',
    priority: 'MEDIUM',
    status: 'COMPLETED',
    startDate: '2026-11-05',
    dueDate: '2026-11-10',
    estimatedHours: 14,
    progress: 100,
    createdBy: 'Alex Morgan (HR Administrator)',
    createdAt: '2026-11-05T09:00:00Z',
    completedAt: '2026-11-09T16:30:00Z',
    comments: [
      {
        id: 'c-5',
        authorName: 'Jordan Lee',
        authorRole: 'EMPLOYEE',
        text: 'All 24 test suites executed with 100% assertion coverage.',
        createdAt: '2026-11-09T16:25:00Z',
      },
      {
        id: 'c-6',
        authorName: 'Alex Morgan',
        authorRole: 'HR_ADMIN',
        text: 'Verified and signed off. Great work on automated test coverage.',
        createdAt: '2026-11-09T16:30:00Z',
      },
    ],
  },
  {
    id: 'TSK-105',
    title: 'Database Sharding & Read-Replica Topology',
    description: 'Architect scalable MongoDB replica set with primary-secondary failover and latency benchmarks.',
    instructions: 'Target read query latency under 12ms for employee directories.',
    assignedEmployeeId: 'EMP-001',
    assignedEmployeeName: 'Marcus Vance',
    assignedEmployeeRole: 'Lead Full Stack Architect',
    department: 'Engineering',
    priority: 'URGENT',
    status: 'IN_PROGRESS',
    startDate: '2026-11-08',
    dueDate: '2026-11-19',
    estimatedHours: 30,
    progress: 75,
    createdBy: 'Alex Morgan (HR Administrator)',
    createdAt: '2026-11-08T09:00:00Z',
    completedAt: null,
    comments: [
      {
        id: 'c-7',
        authorName: 'Marcus Vance',
        authorRole: 'EMPLOYEE',
        text: 'Secondary replica benchmarked at 8.4ms in local VPC.',
        createdAt: '2026-11-16T15:00:00Z',
      },
    ],
  },
  {
    id: 'TSK-106',
    title: 'API Gateway Rate Limiting & Threat Shield',
    description: 'Deploy Redis-based token bucket rate limiter to prevent API abuse and brute-force authentication spikes.',
    instructions: 'Limit auth endpoints to 10 attempts per minute per IP.',
    assignedEmployeeId: 'EMP-001',
    assignedEmployeeName: 'Marcus Vance',
    assignedEmployeeRole: 'Lead Full Stack Architect',
    department: 'Engineering',
    priority: 'HIGH',
    status: 'TODO',
    startDate: '2026-11-16',
    dueDate: '2026-11-25',
    estimatedHours: 20,
    progress: 0,
    createdBy: 'Alex Morgan (HR Administrator)',
    createdAt: '2026-11-16T11:00:00Z',
    completedAt: null,
    comments: [],
  },
  {
    id: 'TSK-107',
    title: 'Figma Design System Token Library v2.5',
    description: 'Standardize spacing, typography scales, and accessible color contrasts across all SaaS modules.',
    instructions: 'Export JSON design tokens for direct CSS variable consumption.',
    assignedEmployeeId: 'EMP-002',
    assignedEmployeeName: 'Elena Rostova',
    assignedEmployeeRole: 'Senior Product Designer',
    department: 'Product & Design',
    priority: 'HIGH',
    status: 'COMPLETED',
    startDate: '2026-11-01',
    dueDate: '2026-11-12',
    estimatedHours: 25,
    progress: 100,
    createdBy: 'Alex Morgan (HR Administrator)',
    createdAt: '2026-11-01T09:00:00Z',
    completedAt: '2026-11-11T14:00:00Z',
    comments: [
      {
        id: 'c-8',
        authorName: 'Elena Rostova',
        authorRole: 'EMPLOYEE',
        text: 'Design tokens v2.5 published and handed over to frontend engineering.',
        createdAt: '2026-11-11T13:50:00Z',
      },
    ],
  },
  {
    id: 'TSK-108',
    title: 'Mobile Drawer & Navigation Accessibility Audit',
    description: 'Conduct WCAG 2.1 AA compliance audit on mobile drawer interactions, keyboard navigation, and ARIA labels.',
    instructions: 'Ensure focus trap works properly when mobile sidebar drawer opens.',
    assignedEmployeeId: 'EMP-002',
    assignedEmployeeName: 'Elena Rostova',
    assignedEmployeeRole: 'Senior Product Designer',
    department: 'Product & Design',
    priority: 'MEDIUM',
    status: 'IN_PROGRESS',
    startDate: '2026-11-10',
    dueDate: '2026-11-16', // Overdue since 2026-11-16 < 2026-11-17
    estimatedHours: 10,
    progress: 50,
    createdBy: 'Alex Morgan (HR Administrator)',
    createdAt: '2026-11-10T10:00:00Z',
    completedAt: null,
    comments: [
      {
        id: 'c-9',
        authorName: 'Alex Morgan',
        authorRole: 'HR_ADMIN',
        text: 'Please prioritize completion following medical leave return.',
        createdAt: '2026-11-16T09:00:00Z',
      },
    ],
  },
  {
    id: 'TSK-109',
    title: 'Kubernetes Cluster Auto-Scaler Configuration',
    description: 'Fine-tune HPA triggers based on CPU and memory percentiles with pre-warmed pod pools.',
    instructions: 'Scale up under 45 seconds when load exceeds 75% capacity.',
    assignedEmployeeId: 'EMP-003',
    assignedEmployeeName: 'David Chen',
    assignedEmployeeRole: 'DevOps & Cloud Engineer',
    department: 'Infrastructure',
    priority: 'URGENT',
    status: 'IN_REVIEW',
    startDate: '2026-11-11',
    dueDate: '2026-11-18',
    estimatedHours: 18,
    progress: 95,
    createdBy: 'Alex Morgan (HR Administrator)',
    createdAt: '2026-11-11T09:00:00Z',
    completedAt: null,
    comments: [
      {
        id: 'c-10',
        authorName: 'David Chen',
        authorRole: 'EMPLOYEE',
        text: 'Load tests performed with k6. Node scaling triggered reliably at 72% CPU threshold.',
        createdAt: '2026-11-17T09:30:00Z',
      },
    ],
  },
  {
    id: 'TSK-110',
    title: 'Automated Daily Database Backup & DR Test',
    description: 'Schedule automated snapshot dumps to encrypted cloud storage with weekly integrity verification.',
    instructions: 'Run restoration dry-run in staging environment.',
    assignedEmployeeId: 'EMP-003',
    assignedEmployeeName: 'David Chen',
    assignedEmployeeRole: 'DevOps & Cloud Engineer',
    department: 'Infrastructure',
    priority: 'HIGH',
    status: 'TODO',
    startDate: '2026-11-15',
    dueDate: '2026-11-24',
    estimatedHours: 16,
    progress: 0,
    createdBy: 'Alex Morgan (HR Administrator)',
    createdAt: '2026-11-15T11:00:00Z',
    completedAt: null,
    comments: [],
  },
  {
    id: 'TSK-111',
    title: 'Frontend Code-Splitting & Bundle Optimization',
    description: 'Implement lazy dynamic imports for secondary routes to reduce initial JavaScript bundle chunk sizes.',
    instructions: 'Verify bundle size under 300kB gzipped for core layout bundle.',
    assignedEmployeeId: 'EMP-004',
    assignedEmployeeName: 'Maya Patel',
    assignedEmployeeRole: 'Frontend Software Engineer',
    department: 'Engineering',
    priority: 'MEDIUM',
    status: 'IN_PROGRESS',
    startDate: '2026-11-13',
    dueDate: '2026-11-21',
    estimatedHours: 12,
    progress: 40,
    createdBy: 'Alex Morgan (HR Administrator)',
    createdAt: '2026-11-13T10:00:00Z',
    completedAt: null,
    comments: [
      {
        id: 'c-11',
        authorName: 'Maya Patel',
        authorRole: 'EMPLOYEE',
        text: 'Analyzing Rollup chunk visualizer to split out Recharts and date-fns modules.',
        createdAt: '2026-11-16T16:00:00Z',
      },
    ],
  },
  {
    id: 'TSK-112',
    title: 'End-to-End Regression Test Suite for Leaves',
    description: 'Write Cypress/Playwright automation scripts covering full apply -> approve -> balance deduction flow.',
    instructions: 'Include negative assertions for overlapping leave applications.',
    assignedEmployeeId: 'EMP-005',
    assignedEmployeeName: 'Liam Novak',
    assignedEmployeeRole: 'QA Automation Specialist',
    department: 'QA',
    priority: 'HIGH',
    status: 'COMPLETED',
    startDate: '2026-11-04',
    dueDate: '2026-11-14',
    estimatedHours: 22,
    progress: 100,
    createdBy: 'Alex Morgan (HR Administrator)',
    createdAt: '2026-11-04T09:00:00Z',
    completedAt: '2026-11-13T16:00:00Z',
    comments: [
      {
        id: 'c-12',
        authorName: 'Liam Novak',
        authorRole: 'EMPLOYEE',
        text: 'All 18 regression scenarios passed on staging pipeline with zero flakes.',
        createdAt: '2026-11-13T15:45:00Z',
      },
    ],
  },
];

// -------------------------------------------------------------
// Seed Initial Performance Reviews
// -------------------------------------------------------------
export const INITIAL_PERFORMANCE_REVIEWS = [
  {
    id: 'REV-2026-001',
    employeeId: 'EMP-001',
    employeeName: 'Marcus Vance',
    department: 'Engineering',
    jobTitle: 'Lead Full Stack Architect',
    reviewPeriod: 'Q3 2026',
    rating: 'Exceeds Expectations (4.8 / 5.0)',
    ratingScore: 4.8,
    strengths: 'Exemplary technical leadership, core architectural resilience, and proactive cross-team mentorship.',
    areasForImprovement: 'Delegate lower-level code review queues to senior frontend engineers to preserve focus on core distributed systems.',
    goals: 'Lead the 2027 enterprise microservices transition and draft formal architecture RFC guidelines.',
    reviewNotes: 'Outstanding quarterly contributions. Marcus delivered the sharded replica set and centralized schema infrastructure ahead of schedule.',
    reviewDate: '2026-10-15',
    reviewedBy: 'Alex Morgan (Head of Human Resources)',
  },
  {
    id: 'REV-2026-002',
    employeeId: 'EMP-006',
    employeeName: 'Jordan Lee',
    department: 'Engineering',
    jobTitle: 'Full Stack Software Engineer',
    reviewPeriod: 'Q3 2026',
    rating: 'Strong Performer (4.5 / 5.0)',
    ratingScore: 4.5,
    strengths: 'Rapid full-stack feature delivery, high attention to UX/UI details, and reliable timezone synchronization handling.',
    areasForImprovement: 'Expand backend performance profiling and automated stress-testing for high-concurrency API endpoints.',
    goals: 'Take complete ownership of the Tasks & Performance Management module and integrate Recharts operational dashboards.',
    reviewNotes: 'Jordan continues to demonstrate rapid growth and delivered core employee self-service modules with zero regression bugs.',
    reviewDate: '2026-10-18',
    reviewedBy: 'Alex Morgan (Head of Human Resources)',
  },
  {
    id: 'REV-2026-003',
    employeeId: 'EMP-002',
    employeeName: 'Elena Rostova',
    department: 'Product & Design',
    jobTitle: 'Senior Product Designer',
    reviewPeriod: 'Q3 2026',
    rating: 'Exceeds Expectations (4.7 / 5.0)',
    ratingScore: 4.7,
    strengths: 'World-class design system token standardization and exceptional SaaS visual aesthetics.',
    areasForImprovement: 'Establish formal UX design handoff documentation for external contractors.',
    goals: 'Deliver WCAG 2.1 AA certified accessibility guidelines for all mobile and desktop layouts.',
    reviewNotes: 'Elena established the foundational Linear/Stripe design language for VISARTECH People, elevating user satisfaction.',
    reviewDate: '2026-10-20',
    reviewedBy: 'Alex Morgan (Head of Human Resources)',
  },
];

// -------------------------------------------------------------
// Storage Accessors (Simulated API Layer)
// -------------------------------------------------------------

export function getStoredTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TASKS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(INITIAL_TASKS));
      return INITIAL_TASKS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_TASKS;
  }
}

export function saveStoredTasks(tasks) {
  try {
    localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks));
    window.dispatchEvent(new Event('tasks-updated'));
  } catch (err) {
    console.error('Error persisting tasks:', err);
  }
}

export function getStoredPerformanceReviews() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REVIEWS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_REVIEWS, JSON.stringify(INITIAL_PERFORMANCE_REVIEWS));
      return INITIAL_PERFORMANCE_REVIEWS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_PERFORMANCE_REVIEWS;
  }
}

export function saveStoredPerformanceReviews(reviews) {
  try {
    localStorage.setItem(STORAGE_KEY_REVIEWS, JSON.stringify(reviews));
    window.dispatchEvent(new Event('tasks-updated'));
  } catch (err) {
    console.error('Error persisting performance reviews:', err);
  }
}

// -------------------------------------------------------------
// Helper: Overdue Calculation
// -------------------------------------------------------------
export function isTaskOverdue(task, refDate = REFERENCE_DATE) {
  if (task.status === 'COMPLETED') return false;
  if (!task.dueDate) return false;
  return task.dueDate < refDate;
}

// -------------------------------------------------------------
// Task Statistics & Metrics
// -------------------------------------------------------------
export function getTaskStats(employeeId = null) {
  const allTasks = getStoredTasks();
  const tasks = employeeId
    ? allTasks.filter((t) => t.assignedEmployeeId === employeeId)
    : allTasks;

  const total = tasks.length;
  const todo = tasks.filter((t) => t.status === 'TODO').length;
  const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const inReview = tasks.filter((t) => t.status === 'IN_REVIEW').length;
  const completed = tasks.filter((t) => t.status === 'COMPLETED').length;
  const overdue = tasks.filter((t) => isTaskOverdue(t)).length;

  return {
    total,
    todo,
    inProgress,
    inReview,
    completed,
    overdue,
  };
}

// -------------------------------------------------------------
// Operational Performance Indicators
// -------------------------------------------------------------
export function getEmployeePerformanceSummary(employeeId = null) {
  const allTasks = getStoredTasks();
  const employees = getEmployees();

  const calculateForSingle = (empId) => {
    const empTasks = allTasks.filter((t) => t.assignedEmployeeId === empId);
    const assigned = empTasks.length;
    const completed = empTasks.filter((t) => t.status === 'COMPLETED').length;
    const inProgress = empTasks.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'IN_REVIEW').length;
    const overdue = empTasks.filter((t) => isTaskOverdue(t)).length;

    // Completed on time: completedAt <= dueDate or dueDate >= REFERENCE_DATE
    const completedOnTime = empTasks.filter((t) => {
      if (t.status !== 'COMPLETED') return false;
      if (!t.completedAt) return true;
      const compDate = t.completedAt.split('T')[0];
      return compDate <= t.dueDate;
    }).length;

    const onTimeRate = completed > 0 ? Math.round((completedOnTime / completed) * 100) : 100;
    const avgProgress = assigned > 0
      ? Math.round(empTasks.reduce((acc, t) => acc + (t.progress || 0), 0) / assigned)
      : 0;

    return {
      employeeId: empId,
      assignedTasks: assigned,
      completedTasks: completed,
      inProgressTasks: inProgress,
      overdueTasks: overdue,
      onTimeCompletionRate: onTimeRate,
      averageProgress: avgProgress,
    };
  };

  if (employeeId) {
    return calculateForSingle(employeeId);
  }

  // Return table across all canonical employees
  return employees.map((emp) => {
    const metrics = calculateForSingle(emp.id);
    return {
      ...metrics,
      employeeName: emp.name,
      department: emp.department,
      jobTitle: emp.jobTitle,
      email: emp.email,
    };
  });
}

// -------------------------------------------------------------
// Task CRUD Operations
// -------------------------------------------------------------

/**
 * Create a new task (HR_ADMIN only)
 */
export function createTask({
  title,
  description,
  assignedEmployeeId,
  priority = 'MEDIUM',
  startDate,
  dueDate,
  estimatedHours = 8,
  instructions = '',
  createdBy = 'Alex Morgan (HR Administrator)',
}) {
  // 1. Validation
  if (!title?.trim()) {
    return { success: false, error: 'Task title is required.' };
  }
  if (!description?.trim()) {
    return { success: false, error: 'Task description is required.' };
  }
  if (!assignedEmployeeId) {
    return { success: false, error: 'Please select an assigned employee.' };
  }
  if (!startDate || !dueDate) {
    return { success: false, error: 'Both start date and due date are required.' };
  }
  if (dueDate < startDate) {
    return { success: false, error: 'Due date cannot precede start date.' };
  }

  const employee = getEmployeeById(assignedEmployeeId);
  if (!employee) {
    return { success: false, error: 'Selected employee does not exist.' };
  }

  const tasks = getStoredTasks();
  const nextNumber = tasks.length + 101;
  const newId = `TSK-${nextNumber}`;

  const newTask = {
    id: newId,
    title: title.trim(),
    description: description.trim(),
    instructions: instructions.trim(),
    assignedEmployeeId,
    assignedEmployeeName: employee.name,
    assignedEmployeeRole: employee.jobTitle,
    department: employee.department,
    priority: priority.toUpperCase(),
    status: 'TODO',
    startDate,
    dueDate,
    estimatedHours: Number(estimatedHours) || 8,
    progress: 0,
    createdBy,
    createdAt: new Date().toISOString(),
    completedAt: null,
    comments: [
      {
        id: `c-${Date.now()}`,
        authorName: createdBy.split(' (')[0],
        authorRole: 'HR_ADMIN',
        text: `Task created and assigned to ${employee.name}.`,
        createdAt: new Date().toISOString(),
      },
    ],
  };

  const updatedTasks = [newTask, ...tasks];
  saveStoredTasks(updatedTasks);

  // Dispatch notification to assigned employee
  createNotification({
    recipientId: assignedEmployeeId,
    recipientRole: 'EMPLOYEE',
    type: 'task_assigned',
    title: `New Task: ${newTask.title.slice(0, 35)}...`,
    message: `${createdBy} assigned you to "${newTask.title}".`,
    link: '/tasks',
    eventId: `task_${newTask.id}_ASSIGNED_${assignedEmployeeId}`
  });

  return {
    success: true,
    task: newTask,
    message: `Task ${newId} created and assigned to ${employee.name} successfully.`,
  };
}

/**
 * Update an existing task
 * Enforces role permissions and valid status transitions.
 */
export function updateTask(taskId, updates, userRole = 'HR_ADMIN', userId = null) {
  const tasks = getStoredTasks();
  const index = tasks.findIndex((t) => t.id === taskId);

  if (index === -1) {
    return { success: false, error: 'Task not found.' };
  }

  const targetTask = tasks[index];

  // Role validation
  if (userRole === 'EMPLOYEE') {
    // Employee can only update own task
    if (userId && targetTask.assignedEmployeeId !== userId) {
      return { success: false, error: 'You are only authorized to update your own assigned tasks.' };
    }

    // Disallow employee from modifying admin-controlled fields
    const disallowedFields = ['assignedEmployeeId', 'title', 'dueDate', 'startDate', 'estimatedHours', 'priority', 'instructions'];
    for (const field of disallowedFields) {
      if (updates[field] !== undefined && updates[field] !== targetTask[field]) {
        return {
          success: false,
          error: `Employees are not permitted to alter HR Admin-controlled field '${field}'.`,
        };
      }
    }

    // Status transition validation for Employee
    if (updates.status && updates.status !== targetTask.status) {
      const allowedTransitions = {
        TODO: ['IN_PROGRESS'],
        IN_PROGRESS: ['TODO', 'IN_REVIEW'],
        IN_REVIEW: ['IN_PROGRESS'], // Recall if revisions needed; Admin signs off COMPLETED
        COMPLETED: [], // Once completed, only Admin can reopen
      };

      const validTargets = allowedTransitions[targetTask.status] || [];
      if (!validTargets.includes(updates.status)) {
        return {
          success: false,
          error: `Invalid status transition from '${targetTask.status}' to '${updates.status}'. Allowed: ${validTargets.join(', ') || 'None'}.`,
        };
      }
    }
  }

  // Handle completion timestamp if status becomes COMPLETED
  let completedAt = targetTask.completedAt;
  if (updates.status === 'COMPLETED' && targetTask.status !== 'COMPLETED') {
    completedAt = new Date().toISOString();
  } else if (updates.status && updates.status !== 'COMPLETED') {
    completedAt = null;
  }

  // Progress synchronization
  let progress = updates.progress !== undefined ? Number(updates.progress) : targetTask.progress;
  if (updates.status === 'COMPLETED') {
    progress = 100;
  } else if (updates.status === 'TODO' && updates.progress === undefined) {
    progress = 0;
  }

  // If assignedEmployeeId changes (HR_ADMIN only), update employee metadata
  let employeeMeta = {};
  if (updates.assignedEmployeeId && updates.assignedEmployeeId !== targetTask.assignedEmployeeId) {
    const emp = getEmployeeById(updates.assignedEmployeeId);
    if (emp) {
      employeeMeta = {
        assignedEmployeeId: emp.id,
        assignedEmployeeName: emp.name,
        assignedEmployeeRole: emp.jobTitle,
        department: emp.department,
      };
    }
  }

  const updatedTask = {
    ...targetTask,
    ...updates,
    ...employeeMeta,
    progress: Math.min(100, Math.max(0, progress)),
    completedAt,
    updatedAt: new Date().toISOString(),
  };

  tasks[index] = updatedTask;
  saveStoredTasks(tasks);

  return {
    success: true,
    task: updatedTask,
    message: `Task ${taskId} updated successfully.`,
  };
}

/**
 * Add a comment or progress note to a task
 */
export function addTaskComment(taskId, { authorName, authorRole, text }) {
  if (!text?.trim()) {
    return { success: false, error: 'Comment text cannot be empty.' };
  }

  const tasks = getStoredTasks();
  const index = tasks.findIndex((t) => t.id === taskId);

  if (index === -1) {
    return { success: false, error: 'Task not found.' };
  }

  const newComment = {
    id: `c-${Date.now()}`,
    authorName: authorName || 'Team Member',
    authorRole: authorRole || 'EMPLOYEE',
    text: text.trim(),
    createdAt: new Date().toISOString(),
  };

  tasks[index].comments = [...(tasks[index].comments || []), newComment];
  saveStoredTasks(tasks);

  return {
    success: true,
    comment: newComment,
    message: 'Comment added to task activity feed.',
  };
}

/**
 * Delete a task (HR_ADMIN only)
 */
export function deleteTask(taskId) {
  const tasks = getStoredTasks();
  const filtered = tasks.filter((t) => t.id !== taskId);

  if (filtered.length === tasks.length) {
    return { success: false, error: 'Task not found.' };
  }

  saveStoredTasks(filtered);
  return {
    success: true,
    message: `Task ${taskId} was permanently removed.`,
  };
}

// -------------------------------------------------------------
// Performance Reviews CRUD (HR_ADMIN only)
// -------------------------------------------------------------
export function createPerformanceReview({
  employeeId,
  reviewPeriod,
  rating,
  ratingScore = 4.0,
  strengths,
  areasForImprovement,
  goals,
  reviewNotes,
  reviewedBy = 'Alex Morgan (Head of Human Resources)',
}) {
  if (!employeeId || !reviewPeriod || !strengths?.trim() || !goals?.trim()) {
    return {
      success: false,
      error: 'Please complete all required review fields (Employee, Period, Strengths, Goals).',
    };
  }

  const employee = getEmployeeById(employeeId);
  if (!employee) {
    return { success: false, error: 'Employee not found.' };
  }

  const reviews = getStoredPerformanceReviews();
  const nextId = `REV-2026-${String(reviews.length + 101).padStart(3, '0')}`;

  const newReview = {
    id: nextId,
    employeeId,
    employeeName: employee.name,
    department: employee.department,
    jobTitle: employee.jobTitle,
    reviewPeriod,
    rating: rating || 'Proficient Performer (4.0 / 5.0)',
    ratingScore: Number(ratingScore) || 4.0,
    strengths: strengths.trim(),
    areasForImprovement: areasForImprovement?.trim() || 'Continue current trajectory.',
    goals: goals.trim(),
    reviewNotes: reviewNotes?.trim() || 'Quarterly evaluation completed.',
    reviewDate: new Date().toISOString().split('T')[0],
    reviewedBy,
  };

  const updatedReviews = [newReview, ...reviews];
  saveStoredPerformanceReviews(updatedReviews);

  return {
    success: true,
    review: newReview,
    message: `Performance evaluation recorded for ${employee.name} (${reviewPeriod}).`,
  };
}

/**
 * Fetch tasks live from MongoDB Atlas backend API (HR Admin)
 */
export async function fetchTasksFromBackend(params = {}) {
  try {
    const query = new URLSearchParams();
    if (params.department && params.department !== 'ALL') query.set('department', params.department);
    if (params.status && params.status !== 'ALL') query.set('status', params.status);
    if (params.priority && params.priority !== 'ALL') query.set('priority', params.priority);
    if (params.employeeId) query.set('employeeId', params.employeeId);
    if (params.page) query.set('page', params.page);
    if (params.limit) query.set('limit', params.limit);
    if (params.search) query.set('search', params.search);

    const qs = query.toString();
    const endpoint = `/tasks${qs ? `?${qs}` : ''}`;
    const res = await api.get(endpoint);

    if (res.success && Array.isArray(res.tasks)) {
      const employees = getEmployees();
      const mapped = res.tasks.map((t) => {
        const emp = employees.find((e) => e.id === t.assignedEmployeeId) || {};
        return {
          id: t.taskId || t._id,
          mongoId: t._id,
          taskId: t.taskId,
          title: t.title,
          description: t.description,
          assignedEmployeeId: t.assignedEmployeeId,
          assignedEmployeeName: t.assignedEmployeeName || emp.name || t.assignedEmployeeId,
          department: t.department || emp.department || 'Engineering',
          jobTitle: t.jobTitle || emp.jobTitle || '',
          priority: t.priority,
          status: t.status,
          startDate: t.startDate,
          dueDate: t.dueDate,
          estimatedHours: t.estimatedHours || 8,
          progress: t.progress || 0,
          isOverdue: Boolean(t.isOverdue),
          comments: t.comments || [],
          createdAt: t.createdAt || new Date().toISOString(),
        };
      });

      if (mapped.length > 0) {
        saveStoredTasks(mapped);
        window.dispatchEvent(new Event('tasks-updated'));
      }
      return {
        tasks: mapped,
        totalCount: res.totalCount || mapped.length,
        page: res.page || 1,
        totalPages: res.totalPages || 1,
      };
    }
  } catch (err) {
    console.warn('Backend tasks fetch error, using local fallback:', err);
  }
  const fallback = getStoredTasks();
  return {
    tasks: fallback,
    totalCount: fallback.length,
    page: 1,
    totalPages: 1,
  };
}

/**
 * Fetch employee's personal assigned tasks from live backend
 */
export async function fetchMyTasksFromBackend(params = {}) {
  try {
    const query = new URLSearchParams();
    if (params.status && params.status !== 'ALL') query.set('status', params.status);
    if (params.priority && params.priority !== 'ALL') query.set('priority', params.priority);
    if (params.page) query.set('page', params.page);
    if (params.limit) query.set('limit', params.limit);

    const qs = query.toString();
    const endpoint = `/tasks/my${qs ? `?${qs}` : ''}`;
    const res = await api.get(endpoint);

    if (res.success && Array.isArray(res.tasks)) {
      const mapped = res.tasks.map((t) => ({
        id: t.taskId || t._id,
        mongoId: t._id,
        taskId: t.taskId,
        title: t.title,
        description: t.description,
        assignedEmployeeId: t.assignedEmployeeId,
        assignedEmployeeName: t.assignedEmployeeName,
        department: t.department || 'Engineering',
        priority: t.priority,
        status: t.status,
        startDate: t.startDate,
        dueDate: t.dueDate,
        estimatedHours: t.estimatedHours || 8,
        progress: t.progress || 0,
        isOverdue: Boolean(t.isOverdue),
        comments: t.comments || [],
        createdAt: t.createdAt || new Date().toISOString(),
      }));
      return {
        tasks: mapped,
        totalCount: res.totalCount || mapped.length,
        page: res.page || 1,
        totalPages: res.totalPages || 1,
      };
    }
  } catch (err) {
    console.warn('Backend personal tasks fetch error:', err);
  }
  const fallback = getStoredTasks().filter((t) => t.assignedEmployeeId === (params.employeeId || 'EMP-006'));
  return {
    tasks: fallback,
    totalCount: fallback.length,
    page: 1,
    totalPages: 1,
  };
}

/**
 * Fetch single task details by ID from backend
 */
export async function fetchTaskByIdFromBackend(id) {
  try {
    const res = await api.get(`/tasks/${id}`);
    if (res.success && res.task) {
      return res.task;
    }
  } catch (err) {
    console.warn('Backend fetch task by ID error:', err);
  }
  return null;
}

/**
 * Fetch organization task statistics for HR Admin
 */
export async function fetchTaskStatsFromBackend() {
  try {
    const res = await api.get('/tasks/stats');
    if (res.success && res.stats) {
      return res.stats;
    }
  } catch (err) {
    console.warn('Backend task stats fetch error:', err);
  }
  return getTaskStats();
}

/**
 * Create task via live backend API with fallback
 */
export async function createTaskBackend(taskData) {
  try {
    const res = await api.post('/tasks', {
      title: taskData.title,
      description: taskData.description,
      assignedEmployeeId: taskData.assignedEmployeeId,
      priority: taskData.priority,
      startDate: taskData.startDate,
      dueDate: taskData.dueDate,
      estimatedHours: taskData.estimatedHours,
    });
    if (res.success && res.task) {
      await fetchTasksFromBackend();
      window.dispatchEvent(new Event('tasks-updated'));
      return { success: true, task: res.task, message: 'Task created successfully.' };
    } else if (res.message) {
      throw new Error(res.message);
    }
  } catch (err) {
    if (!err.isOffline) {
      throw err;
    }
  }
  return createTask(taskData);
}

/**
 * Update task via live backend API with fallback
 */
export async function updateTaskBackend(id, updateData) {
  try {
    const res = await api.put(`/tasks/${id}`, updateData);
    if (res.success && res.task) {
      await fetchTasksFromBackend();
      window.dispatchEvent(new Event('tasks-updated'));
      return { success: true, task: res.task, message: 'Task updated successfully.' };
    } else if (res.message) {
      throw new Error(res.message);
    }
  } catch (err) {
    if (!err.isOffline) {
      throw err;
    }
  }
  return updateTask(id, updateData);
}

/**
 * Delete task via live backend API
 */
export async function deleteTaskBackend(id) {
  try {
    const res = await api.delete(`/tasks/${id}`);
    if (res.success) {
      await fetchTasksFromBackend();
      window.dispatchEvent(new Event('tasks-updated'));
      return { success: true, message: 'Task deleted successfully.' };
    } else if (res.message) {
      throw new Error(res.message);
    }
  } catch (err) {
    if (!err.isOffline) {
      throw err;
    }
  }
  return deleteTask(id);
}

/**
 * Add comment to task via live backend API with fallback
 */
export async function addTaskCommentBackend(id, comment) {
  try {
    const text = typeof comment === 'string' ? comment : comment?.text;
    const res = await api.post(`/tasks/${id}/comments`, { text });
    if (res.success && res.task) {
      await fetchTasksFromBackend();
      window.dispatchEvent(new Event('tasks-updated'));
      return { success: true, task: res.task };
    } else if (res.message) {
      throw new Error(res.message);
    }
  } catch (err) {
    if (!err.isOffline) {
      throw err;
    }
  }
  return addTaskComment(id, comment);
}
