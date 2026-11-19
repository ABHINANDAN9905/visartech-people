import Task from '../models/Task.js';
import User from '../models/User.js';

// Allowed workflow state transitions
const ALLOWED_TRANSITIONS = {
  TODO: ['TODO', 'IN_PROGRESS'],
  IN_PROGRESS: ['IN_PROGRESS', 'IN_REVIEW', 'TODO'],
  IN_REVIEW: ['IN_REVIEW', 'COMPLETED', 'IN_PROGRESS'],
  COMPLETED: ['COMPLETED', 'IN_PROGRESS'], // Reopening
};

/**
 * Returns current business date in YYYY-MM-DD for America/Chicago timezone
 */
function getTodayChicagoDate() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

/**
 * Helper to compute overdue status relative to America/Chicago
 */
function checkIsOverdue(dueDate, status) {
  if (status === 'COMPLETED') return false;
  const today = getTodayChicagoDate();
  return Boolean(dueDate && dueDate < today);
}

/**
 * @route   POST /api/tasks
 * @desc    Create a new task (HR_ADMIN only)
 * @access  Private (HR_ADMIN only)
 */
export async function createTask(req, res) {
  try {
    const {
      title,
      description,
      assignedEmployeeId,
      priority = 'MEDIUM',
      startDate,
      dueDate,
      estimatedHours = 8,
    } = req.body || {};

    // 1. Mandatory fields
    if (!title || !description || !assignedEmployeeId || !startDate || !dueDate) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, assigned employee, start date, and due date are required.',
      });
    }

    // 2. Validate assigned employee existence and active status
    const cleanEmpId = assignedEmployeeId.trim().toUpperCase();
    const assignedUser = await User.findOne({
      employeeId: cleanEmpId,
      employmentStatus: 'Active',
    });

    if (!assignedUser) {
      return res.status(400).json({
        success: false,
        message: `Assigned employee '${cleanEmpId}' does not exist or is not actively employed.`,
      });
    }

    // 3. Validate dates
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(dueDate)) {
      return res.status(400).json({
        success: false,
        message: 'Dates must be formatted as YYYY-MM-DD.',
      });
    }

    if (startDate > dueDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date cannot be after due date.',
      });
    }

    // 4. Validate Priority
    const cleanPriority = priority.trim().toUpperCase();
    const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
    if (!validPriorities.includes(cleanPriority)) {
      return res.status(400).json({
        success: false,
        message: `Invalid priority '${priority}'. Allowed values: ${validPriorities.join(', ')}`,
      });
    }

    // 5. Generate unique taskId
    const latest = await Task.findOne({ taskId: /^TSK-\d+$/ }).sort({ taskId: -1 });
    let nextNum = 101;
    if (latest && latest.taskId) {
      const match = latest.taskId.match(/^TSK-(\d+)$/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }
    const taskId = `TSK-${nextNum}`;

    const newTask = await Task.create({
      taskId,
      title: title.trim(),
      description: description.trim(),
      assignedEmployeeId: cleanEmpId,
      assignedUser: assignedUser._id,
      priority: cleanPriority,
      startDate,
      dueDate,
      estimatedHours: estimatedHours ? Math.max(0, Number(estimatedHours)) : 8,
      progress: 0,
      status: 'TODO',
      comments: [
        {
          author: `${req.user.firstName} ${req.user.lastName}`,
          text: `Task created and assigned to ${cleanEmpId}`,
          createdAt: new Date(),
        },
      ],
    });

    return res.status(201).json({
      success: true,
      message: 'Task created successfully.',
      task: {
        ...newTask.toJSON(),
        isOverdue: false,
        assignedEmployeeName: `${assignedUser.firstName} ${assignedUser.lastName}`,
        department: assignedUser.department,
      },
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: 'Failed to create task.',
      error: err.message,
    });
  }
}

/**
 * @route   GET /api/tasks
 * @desc    HR_ADMIN views organizational tasks with filters, search, and pagination
 * @access  Private (HR_ADMIN only)
 */
export async function getTasks(req, res) {
  try {
    const {
      employeeId,
      department,
      status,
      priority,
      dueDate,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {};

    if (employeeId && employeeId.trim()) {
      filter.assignedEmployeeId = employeeId.trim().toUpperCase();
    }

    if (department && department !== 'ALL' && department.trim()) {
      const deptUsers = await User.find({ department: department.trim() }).select('employeeId');
      const deptIds = deptUsers.map((u) => u.employeeId);
      if (filter.assignedEmployeeId) {
        if (!deptIds.includes(filter.assignedEmployeeId)) {
          return res.status(200).json({
            success: true,
            count: 0,
            totalCount: 0,
            page: 1,
            totalPages: 1,
            tasks: [],
          });
        }
      } else {
        filter.assignedEmployeeId = { $in: deptIds };
      }
    }

    if (status && status !== 'ALL' && status.trim()) {
      filter.status = status.trim().toUpperCase();
    }

    if (priority && priority !== 'ALL' && priority.trim()) {
      filter.priority = priority.trim().toUpperCase();
    }

    if (dueDate && dueDate.trim()) {
      filter.dueDate = dueDate.trim();
    }

    if (search && search.trim()) {
      const q = search.trim();
      const regex = new RegExp(q, 'i');
      filter.$or = [{ title: regex }, { description: regex }, { taskId: regex }];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const totalCount = await Task.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / limitNum) || 1;

    const rawTasks = await Task.find(filter)
      .sort({ dueDate: 1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Enrich with employee details & overdue calculation
    const empIds = [...new Set(rawTasks.map((t) => t.assignedEmployeeId))];
    const users = await User.find({ employeeId: { $in: empIds } }).select(
      'employeeId firstName lastName email department jobTitle'
    );
    const userMap = new Map(users.map((u) => [u.employeeId, u]));

    const tasks = rawTasks.map((t) => {
      const u = userMap.get(t.assignedEmployeeId);
      return {
        ...t.toJSON(),
        assignedEmployeeName: u ? `${u.firstName} ${u.lastName}` : t.assignedEmployeeId,
        department: u ? u.department : 'Engineering',
        jobTitle: u ? u.jobTitle : '',
        isOverdue: checkIsOverdue(t.dueDate, t.status),
      };
    });

    return res.status(200).json({
      success: true,
      count: tasks.length,
      totalCount,
      page: pageNum,
      totalPages,
      tasks,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve organizational tasks.',
      error: err.message,
    });
  }
}

/**
 * @route   GET /api/tasks/my
 * @desc    Employee views only tasks assigned to them
 * @access  Private (Employee)
 */
export async function getMyTasks(req, res) {
  try {
    const employeeId = req.user.employeeId;
    const { status, priority, page = 1, limit = 20 } = req.query;

    const filter = { assignedEmployeeId: employeeId };

    if (status && status !== 'ALL' && status.trim()) {
      filter.status = status.trim().toUpperCase();
    }

    if (priority && priority !== 'ALL' && priority.trim()) {
      filter.priority = priority.trim().toUpperCase();
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const totalCount = await Task.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / limitNum) || 1;

    const rawTasks = await Task.find(filter)
      .sort({ dueDate: 1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const tasks = rawTasks.map((t) => ({
      ...t.toJSON(),
      assignedEmployeeName: `${req.user.firstName} ${req.user.lastName}`,
      department: req.user.department,
      isOverdue: checkIsOverdue(t.dueDate, t.status),
    }));

    return res.status(200).json({
      success: true,
      count: tasks.length,
      totalCount,
      page: pageNum,
      totalPages,
      tasks,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve personal tasks.',
      error: err.message,
    });
  }
}

/**
 * @route   GET /api/tasks/:id
 * @desc    Get task details (HR_ADMIN can view all, EMPLOYEE can view only self)
 * @access  Private
 */
export async function getTaskById(req, res) {
  try {
    const { id } = req.params;
    const query = id.startsWith('TSK-') ? { taskId: id.toUpperCase() } : { _id: id };

    const task = await Task.findOne(query);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: `Task not found with identifier: ${id}`,
      });
    }

    // Role check: Employee can view only their own assigned task
    if (req.user.role !== 'HR_ADMIN' && task.assignedEmployeeId !== req.user.employeeId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot view tasks assigned to another colleague.',
      });
    }

    const assignedUser = await User.findOne({ employeeId: task.assignedEmployeeId }).select(
      'employeeId firstName lastName email department jobTitle'
    );

    return res.status(200).json({
      success: true,
      task: {
        ...task.toJSON(),
        assignedEmployeeName: assignedUser ? `${assignedUser.firstName} ${assignedUser.lastName}` : task.assignedEmployeeId,
        department: assignedUser ? assignedUser.department : '',
        jobTitle: assignedUser ? assignedUser.jobTitle : '',
        isOverdue: checkIsOverdue(task.dueDate, task.status),
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve task details.',
      error: err.message,
    });
  }
}

/**
 * @route   PUT /api/tasks/:id
 * @desc    Update task details (HR_ADMIN can update all, EMPLOYEE updates status/progress/comments)
 * @access  Private
 */
export async function updateTask(req, res) {
  try {
    const { id } = req.params;
    const query = id.startsWith('TSK-') ? { taskId: id.toUpperCase() } : { _id: id };

    const task = await Task.findOne(query);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: `Task not found: ${id}`,
      });
    }

    const isHrAdmin = req.user.role === 'HR_ADMIN';
    const isAssignedEmployee = task.assignedEmployeeId === req.user.employeeId;

    if (!isHrAdmin && !isAssignedEmployee) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot modify tasks assigned to another colleague.',
      });
    }

    // 1. Employee restriction: cannot change assignment or administrative fields
    if (!isHrAdmin) {
      const restrictedFields = [
        'assignedEmployeeId',
        'title',
        'description',
        'priority',
        'startDate',
        'dueDate',
        'estimatedHours',
      ];
      for (const field of restrictedFields) {
        if (req.body[field] !== undefined && req.body[field] !== task[field]) {
          return res.status(403).json({
            success: false,
            message: `Forbidden: Employees are not permitted to modify restricted field '${field}'.`,
          });
        }
      }
    }

    // 2. Progress percentage validation
    if (req.body.progress !== undefined) {
      const prog = Number(req.body.progress);
      if (isNaN(prog) || prog < 0 || prog > 100) {
        return res.status(400).json({
          success: false,
          message: 'Progress percentage must be between 0 and 100.',
        });
      }
      task.progress = prog;
    }

    // 3. Status Transition Workflow Validation
    // Workflow: TODO -> IN_PROGRESS -> IN_REVIEW -> COMPLETED
    if (req.body.status !== undefined) {
      const nextStatus = req.body.status.trim().toUpperCase();
      const validStatuses = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED'];
      if (!validStatuses.includes(nextStatus)) {
        return res.status(400).json({
          success: false,
          message: `Invalid task status '${req.body.status}'. Allowed values: ${validStatuses.join(', ')}`,
        });
      }

      const permitted = ALLOWED_TRANSITIONS[task.status] || [];
      if (!permitted.includes(nextStatus)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status transition from '${task.status}' to '${nextStatus}'. Permitted transitions: ${permitted.join(', ')}`,
        });
      }

      // Rule: COMPLETED task requires 100% progress
      if (nextStatus === 'COMPLETED') {
        if (req.body.progress !== undefined && Number(req.body.progress) !== 100) {
          return res.status(400).json({
            success: false,
            message: 'COMPLETED task requires 100% progress.',
          });
        }
        task.progress = 100;
      }

      task.status = nextStatus;
    }

    // 4. HR Admin modifications for administrative fields
    if (isHrAdmin) {
      if (req.body.title) task.title = req.body.title.trim();
      if (req.body.description) task.description = req.body.description.trim();
      if (req.body.priority) task.priority = req.body.priority.trim().toUpperCase();
      if (req.body.startDate) task.startDate = req.body.startDate.trim();
      if (req.body.dueDate) task.dueDate = req.body.dueDate.trim();
      if (req.body.estimatedHours !== undefined) task.estimatedHours = Math.max(0, Number(req.body.estimatedHours));

      if (req.body.assignedEmployeeId && req.body.assignedEmployeeId.toUpperCase() !== task.assignedEmployeeId) {
        const newEmpId = req.body.assignedEmployeeId.trim().toUpperCase();
        const newAssignedUser = await User.findOne({
          employeeId: newEmpId,
          employmentStatus: 'Active',
        });
        if (!newAssignedUser) {
          return res.status(400).json({
            success: false,
            message: `Cannot assign task: employee '${newEmpId}' does not exist or is not actively employed.`,
          });
        }
        task.assignedEmployeeId = newEmpId;
        task.assignedUser = newAssignedUser._id;
      }
    }

    // 5. Appending Comments if provided in update payload
    if (req.body.comment && typeof req.body.comment === 'string' && req.body.comment.trim()) {
      task.comments.push({
        author: `${req.user.firstName} ${req.user.lastName}`,
        text: req.body.comment.trim(),
        createdAt: new Date(),
      });
    }

    await task.save();

    return res.status(200).json({
      success: true,
      message: 'Task updated successfully.',
      task: {
        ...task.toJSON(),
        isOverdue: checkIsOverdue(task.dueDate, task.status),
      },
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: 'Failed to update task.',
      error: err.message,
    });
  }
}

/**
 * @route   DELETE /api/tasks/:id
 * @desc    Delete a task (HR_ADMIN only)
 * @access  Private (HR_ADMIN only)
 */
export async function deleteTask(req, res) {
  try {
    const { id } = req.params;
    const query = id.startsWith('TSK-') ? { taskId: id.toUpperCase() } : { _id: id };

    const task = await Task.findOneAndDelete(query);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: `Task not found with identifier: ${id}`,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Task ${task.taskId} deleted successfully.`,
      task,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete task.',
      error: err.message,
    });
  }
}

/**
 * @route   POST /api/tasks/:id/comments
 * @desc    Add comment to a task (HR Admin or assigned Employee)
 * @access  Private
 */
export async function addTaskComment(req, res) {
  try {
    const { id } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Comment text is required.',
      });
    }

    const query = id.startsWith('TSK-') ? { taskId: id.toUpperCase() } : { _id: id };
    const task = await Task.findOne(query);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found.',
      });
    }

    // Role check: User must be HR_ADMIN or assigned employee
    if (req.user.role !== 'HR_ADMIN' && task.assignedEmployeeId !== req.user.employeeId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot comment on tasks assigned to another colleague.',
      });
    }

    task.comments.push({
      author: `${req.user.firstName} ${req.user.lastName}`,
      text: text.trim(),
      createdAt: new Date(),
    });

    await task.save();

    return res.status(200).json({
      success: true,
      message: 'Comment added successfully.',
      task: {
        ...task.toJSON(),
        isOverdue: checkIsOverdue(task.dueDate, task.status),
      },
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: 'Failed to add comment.',
      error: err.message,
    });
  }
}

/**
 * @route   GET /api/tasks/stats
 * @desc    Organizational task and performance metrics (HR_ADMIN only)
 * @access  Private (HR_ADMIN only)
 */
export async function getTaskStats(req, res) {
  try {
    const today = getTodayChicagoDate();

    const totalTasks = await Task.countDocuments();
    const todoCount = await Task.countDocuments({ status: 'TODO' });
    const inProgressCount = await Task.countDocuments({ status: 'IN_PROGRESS' });
    const inReviewCount = await Task.countDocuments({ status: 'IN_REVIEW' });
    const completedCount = await Task.countDocuments({ status: 'COMPLETED' });

    const overdueCount = await Task.countDocuments({
      status: { $ne: 'COMPLETED' },
      dueDate: { $lt: today },
    });

    const completionRate =
      totalTasks > 0 ? parseFloat(((completedCount / totalTasks) * 100).toFixed(1)) : 0;

    // Priority breakdown
    const lowCount = await Task.countDocuments({ priority: 'LOW' });
    const mediumCount = await Task.countDocuments({ priority: 'MEDIUM' });
    const highCount = await Task.countDocuments({ priority: 'HIGH' });
    const urgentCount = await Task.countDocuments({ priority: 'URGENT' });

    // Workload and operational performance indicators per active employee
    const activeEmployees = await User.find({ employmentStatus: 'Active' }).select(
      'employeeId firstName lastName department jobTitle'
    );
    const allTasks = await Task.find();

    const employeeWorkload = activeEmployees.map((emp) => {
      const empTasks = allTasks.filter((t) => t.assignedEmployeeId === emp.employeeId);
      const assignedCount = empTasks.length;
      const completed = empTasks.filter((t) => t.status === 'COMPLETED').length;
      const inProg = empTasks.filter(
        (t) => t.status === 'IN_PROGRESS' || t.status === 'IN_REVIEW'
      ).length;
      const overdue = empTasks.filter(
        (t) => t.dueDate < today && t.status !== 'COMPLETED'
      ).length;
      const rate =
        assignedCount > 0 ? parseFloat(((completed / assignedCount) * 100).toFixed(1)) : 0;

      return {
        employeeId: emp.employeeId,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        department: emp.department,
        jobTitle: emp.jobTitle,
        assignedCount,
        totalAssigned: assignedCount,
        completedCount: completed,
        completed,
        inProgressCount: inProg,
        overdueCount: overdue,
        overdue,
        completionRate: rate,
      };
    });

    return res.status(200).json({
      success: true,
      stats: {
        total: totalTasks,
        totalTasks,
        todo: todoCount,
        todoCount,
        inProgress: inProgressCount,
        inProgressCount,
        inReview: inReviewCount,
        inReviewCount,
        completed: completedCount,
        completedCount,
        overdue: overdueCount,
        overdueCount,
        completionRate,
        byPriority: {
          LOW: lowCount,
          MEDIUM: mediumCount,
          HIGH: highCount,
          URGENT: urgentCount,
        },
        employeeWorkload,
      },
      employeeWorkload,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to compute task statistics.',
      error: err.message,
    });
  }
}

export default {
  createTask,
  getTasks,
  getMyTasks,
  getTaskById,
  updateTask,
  deleteTask,
  addTaskComment,
  getTaskStats,
  checkIsOverdue,
};
