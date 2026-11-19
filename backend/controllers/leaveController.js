import LeaveRequest from '../models/LeaveRequest.js';
import LeaveBalance from '../models/LeaveBalance.js';
import User from '../models/User.js';

/**
 * Helper to calculate inclusive days between two YYYY-MM-DD date strings
 */
function calculateDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Invalid start or end date format.');
  }
  if (start > end) {
    throw new Error('Start date cannot be after end date.');
  }
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(0.5, diffDays);
}

/**
 * @route   POST /api/leaves
 * @desc    Submit a new leave application (Employee Self-Service)
 * @access  Private (Authenticated Employee)
 */
export async function applyLeave(req, res) {
  try {
    const { leaveType, startDate, endDate, reason } = req.body || {};
    const employeeId = req.user.employeeId;

    // 1. Mandatory fields
    if (!leaveType || !startDate || !endDate || !reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Leave type, start date, end date, and reason are required.',
      });
    }

    const cleanLeaveType = leaveType.trim().toUpperCase();
    const validTypes = ['CASUAL', 'SICK', 'PAID', 'UNPAID'];
    if (!validTypes.includes(cleanLeaveType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid leave type '${leaveType}'. Must be one of: ${validTypes.join(', ')}`,
      });
    }

    // 2. Validate dates & calculate days on server
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return res.status(400).json({
        success: false,
        message: 'Dates must be formatted as YYYY-MM-DD.',
      });
    }

    let calculatedDaysCount;
    try {
      calculatedDaysCount = calculateDays(startDate, endDate);
    } catch (dateErr) {
      return res.status(400).json({
        success: false,
        message: dateErr.message,
      });
    }

    // 3. Verify available balance for paid categories
    if (cleanLeaveType !== 'UNPAID') {
      let balance = await LeaveBalance.findOne({ employeeId });
      if (!balance) {
        balance = await LeaveBalance.create({
          employeeId,
          user: req.user._id,
        });
      }

      const cat = cleanLeaveType.toLowerCase();
      const available = balance[cat]?.remaining || 0;
      if (available < calculatedDaysCount) {
        return res.status(400).json({
          success: false,
          message: `Insufficient ${cleanLeaveType} leave balance. Available: ${available} days, Requested: ${calculatedDaysCount} days.`,
        });
      }
    }

    // 4. Overlap check against existing PENDING or APPROVED leaves for this employee
    const overlapping = await LeaveRequest.findOne({
      employeeId,
      status: { $in: ['PENDING', 'APPROVED'] },
      startDate: { $lte: endDate },
      endDate: { $gte: startDate },
    });

    if (overlapping) {
      return res.status(400).json({
        success: false,
        message: `Overlapping leave request already exists between ${overlapping.startDate} and ${overlapping.endDate} (Status: ${overlapping.status}).`,
      });
    }

    // 5. Create leave request with PENDING status
    const leaveRequest = await LeaveRequest.create({
      employeeId,
      user: req.user._id,
      leaveType: cleanLeaveType,
      startDate,
      endDate,
      days: calculatedDaysCount,
      reason: reason.trim(),
      status: 'PENDING',
    });

    return res.status(201).json({
      success: true,
      message: 'Leave application submitted successfully.',
      leave: leaveRequest,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: 'Failed to submit leave application.',
      error: err.message,
    });
  }
}

/**
 * @route   GET /api/leaves/my
 * @desc    Employee views only their own leave requests with filters & pagination
 * @access  Private (Employee)
 */
export async function getMyLeaves(req, res) {
  try {
    const employeeId = req.user.employeeId;
    const { status, leaveType, startDate, endDate, page = 1, limit = 10 } = req.query;

    const filter = { employeeId };

    if (status && status !== 'ALL') {
      filter.status = status.toUpperCase();
    }
    if (leaveType && leaveType !== 'ALL') {
      filter.leaveType = leaveType.toUpperCase();
    }
    if (startDate && endDate) {
      filter.startDate = { $gte: startDate };
      filter.endDate = { $lte: endDate };
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const totalCount = await LeaveRequest.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / limitNum) || 1;

    const requests = await LeaveRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    return res.status(200).json({
      success: true,
      count: requests.length,
      totalCount,
      page: pageNum,
      totalPages,
      leaves: requests,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve personal leave requests.',
      error: err.message,
    });
  }
}

/**
 * @route   GET /api/leaves/my/balance
 * @desc    Get leave balance for logged-in employee
 * @access  Private (Employee)
 */
export async function getMyLeaveBalance(req, res) {
  try {
    const employeeId = req.user.employeeId;
    let balance = await LeaveBalance.findOne({ employeeId });

    if (!balance) {
      balance = await LeaveBalance.create({
        employeeId,
        user: req.user._id,
      });
    }

    return res.status(200).json({
      success: true,
      balance,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve personal leave balance.',
      error: err.message,
    });
  }
}

/**
 * @route   PATCH /api/leaves/:id/cancel
 * @desc    Employee cancels their own eligible pending or approved leave request
 * @access  Private (Owner Employee or HR_ADMIN)
 */
export async function cancelLeave(req, res) {
  try {
    const { id } = req.params;
    const leave = await LeaveRequest.findById(id);

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave application not found.',
      });
    }

    // Role check: Employee can cancel only their own request
    const isOwner = req.user.employeeId === leave.employeeId;
    const isAdmin = req.user.role === 'HR_ADMIN';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot cancel another colleague\'s leave request.',
      });
    }

    if (leave.status === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        message: 'Leave request is already cancelled.',
      });
    }

    if (leave.status === 'REJECTED') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a rejected leave request.',
      });
    }

    if (leave.status === 'PENDING') {
      // Direct status cancellation for pending requests (no balance deduction has occurred yet)
      const updated = await LeaveRequest.findOneAndUpdate(
        { _id: id, status: 'PENDING' },
        { $set: { status: 'CANCELLED' } },
        { new: true }
      );

      if (!updated) {
        return res.status(400).json({
          success: false,
          message: 'Leave request is no longer pending.',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Pending leave request cancelled successfully.',
        leave: updated,
      });
    }

    if (leave.status === 'APPROVED') {
      // Transition approved -> cancelled atomically and restore deducted balance
      const updated = await LeaveRequest.findOneAndUpdate(
        { _id: id, status: 'APPROVED' },
        { $set: { status: 'CANCELLED' } },
        { new: true }
      );

      if (!updated) {
        return res.status(400).json({
          success: false,
          message: 'Failed to cancel approved leave request.',
        });
      }

      // Restore balance atomically
      await LeaveBalance.restoreBalance(leave.employeeId, leave.leaveType, leave.days);

      return res.status(200).json({
        success: true,
        message: 'Approved leave request cancelled and balance restored successfully.',
        leave: updated,
      });
    }

    return res.status(400).json({
      success: false,
      message: `Cannot cancel leave with status '${leave.status}'.`,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: 'Failed to cancel leave request.',
      error: err.message,
    });
  }
}

/**
 * @route   GET /api/leaves
 * @desc    HR_ADMIN views all organization leave requests with search, filters, pagination
 * @access  Private (HR_ADMIN only)
 */
export async function getLeaves(req, res) {
  try {
    const {
      employeeId,
      department,
      leaveType,
      status,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {};

    if (employeeId && employeeId.trim()) {
      filter.employeeId = employeeId.trim().toUpperCase();
    }

    if (department && department !== 'ALL' && department.trim()) {
      const deptUsers = await User.find({ department: department.trim() }).select('employeeId');
      const deptIds = deptUsers.map((u) => u.employeeId);
      if (filter.employeeId) {
        if (!deptIds.includes(filter.employeeId)) {
          return res.status(200).json({
            success: true,
            count: 0,
            totalCount: 0,
            page: 1,
            totalPages: 1,
            leaves: [],
          });
        }
      } else {
        filter.employeeId = { $in: deptIds };
      }
    }

    if (leaveType && leaveType !== 'ALL' && leaveType.trim()) {
      filter.leaveType = leaveType.trim().toUpperCase();
    }

    if (status && status !== 'ALL' && status.trim()) {
      filter.status = status.trim().toUpperCase();
    }

    if (startDate && endDate) {
      filter.startDate = { $gte: startDate.trim() };
      filter.endDate = { $lte: endDate.trim() };
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const totalCount = await LeaveRequest.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / limitNum) || 1;

    const rawLeaves = await LeaveRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Enrich with employee metadata
    const empIds = [...new Set(rawLeaves.map((l) => l.employeeId))];
    const users = await User.find({ employeeId: { $in: empIds } }).select(
      'employeeId firstName lastName email department jobTitle'
    );
    const userMap = new Map(users.map((u) => [u.employeeId, u]));

    const leaves = rawLeaves.map((doc) => {
      const u = userMap.get(doc.employeeId);
      return {
        ...doc.toJSON(),
        employeeName: u ? `${u.firstName} ${u.lastName}` : doc.employeeId,
        department: u ? u.department : 'General',
        jobTitle: u ? u.jobTitle : '',
        email: u ? u.email : '',
      };
    });

    return res.status(200).json({
      success: true,
      count: leaves.length,
      totalCount,
      page: pageNum,
      totalPages,
      leaves,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve leave requests.',
      error: err.message,
    });
  }
}

/**
 * @route   PATCH /api/leaves/:id/approve
 * @desc    HR_ADMIN approves a pending leave request (atomically deducts balance)
 * @access  Private (HR_ADMIN only)
 */
export async function approveLeave(req, res) {
  try {
    const { id } = req.params;
    const comments = req.body?.reviewerComments || req.body?.comments || '';

    // 1. Verify request existence and PENDING status
    const leave = await LeaveRequest.findOne({ _id: id });
    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave application not found.',
      });
    }

    if (leave.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Only PENDING requests can be approved. Current status: ${leave.status}.`,
      });
    }

    // 2. Perform atomic balance deduction with race-condition prevention
    try {
      await LeaveBalance.deductBalance(leave.employeeId, leave.leaveType, leave.days);
    } catch (deductErr) {
      return res.status(400).json({
        success: false,
        message: deductErr.message,
      });
    }

    // 3. Conditional update: ensure leave is still PENDING before committing approval
    const updatedLeave = await LeaveRequest.findOneAndUpdate(
      { _id: id, status: 'PENDING' },
      {
        $set: {
          status: 'APPROVED',
          reviewedBy: `${req.user.firstName} ${req.user.lastName} (HR Administrator)`,
          reviewedAt: new Date(),
          reviewerComments: comments.trim(),
        },
      },
      { new: true }
    );

    // Rollback balance if another concurrent operation already altered status
    if (!updatedLeave) {
      await LeaveBalance.restoreBalance(leave.employeeId, leave.leaveType, leave.days);
      return res.status(400).json({
        success: false,
        message: 'Leave request is no longer pending.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Leave request approved successfully.',
      leave: updatedLeave,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: 'Failed to approve leave application.',
      error: err.message,
    });
  }
}

/**
 * @route   PATCH /api/leaves/:id/reject
 * @desc    HR_ADMIN rejects a pending leave request (does NOT deduct balance)
 * @access  Private (HR_ADMIN only)
 */
export async function rejectLeave(req, res) {
  try {
    const { id } = req.params;
    const comments = req.body?.reviewerComments || req.body?.comments || '';

    const leave = await LeaveRequest.findOne({ _id: id });
    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave application not found.',
      });
    }

    if (leave.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Only PENDING requests can be rejected. Current status: ${leave.status}.`,
      });
    }

    const updatedLeave = await LeaveRequest.findOneAndUpdate(
      { _id: id, status: 'PENDING' },
      {
        $set: {
          status: 'REJECTED',
          reviewedBy: `${req.user.firstName} ${req.user.lastName} (HR Administrator)`,
          reviewedAt: new Date(),
          reviewerComments: comments.trim(),
        },
      },
      { new: true }
    );

    if (!updatedLeave) {
      return res.status(400).json({
        success: false,
        message: 'Leave request is no longer pending.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Leave request rejected.',
      leave: updatedLeave,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: 'Failed to reject leave application.',
      error: err.message,
    });
  }
}

/**
 * @route   GET /api/leaves/stats
 * @desc    HR_ADMIN views organizational leave statistics
 * @access  Private (HR_ADMIN only)
 */
export async function getLeaveStats(req, res) {
  try {
    const totalRequests = await LeaveRequest.countDocuments();
    const pendingCount = await LeaveRequest.countDocuments({ status: 'PENDING' });
    const approvedCount = await LeaveRequest.countDocuments({ status: 'APPROVED' });
    const rejectedCount = await LeaveRequest.countDocuments({ status: 'REJECTED' });
    const cancelledCount = await LeaveRequest.countDocuments({ status: 'CANCELLED' });

    // Breakdown by leave type
    const casualCount = await LeaveRequest.countDocuments({ leaveType: 'CASUAL' });
    const sickCount = await LeaveRequest.countDocuments({ leaveType: 'SICK' });
    const paidCount = await LeaveRequest.countDocuments({ leaveType: 'PAID' });
    const unpaidCount = await LeaveRequest.countDocuments({ leaveType: 'UNPAID' });

    return res.status(200).json({
      success: true,
      stats: {
        totalRequests,
        pendingCount,
        approvedCount,
        rejectedCount,
        cancelledCount,
        byType: {
          CASUAL: casualCount,
          SICK: sickCount,
          PAID: paidCount,
          UNPAID: unpaidCount,
        },
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to calculate leave statistics.',
      error: err.message,
    });
  }
}

/**
 * @route   GET /api/leaves/balances
 * @desc    Legacy balance retrieval route (supports HR querying employee balances)
 * @access  Private
 */
export async function getLeaveBalances(req, res) {
  try {
    const targetEmployeeId =
      req.user.role === 'HR_ADMIN' && req.query.employeeId
        ? req.query.employeeId.toUpperCase()
        : req.user.employeeId;

    let balance = await LeaveBalance.findOne({ employeeId: targetEmployeeId });

    if (!balance) {
      balance = await LeaveBalance.create({
        employeeId: targetEmployeeId,
        user: req.user._id,
      });
    }

    return res.status(200).json({
      success: true,
      balance,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve leave balance.',
      error: err.message,
    });
  }
}

/**
 * @route   PUT /api/leaves/:id/status
 * @desc    Legacy alias route for approving or rejecting leave
 * @access  Private (HR_ADMIN only)
 */
export async function updateLeaveStatus(req, res) {
  const { status, reviewerComments } = req.body || {};
  if (status?.toUpperCase() === 'APPROVED') {
    req.body.reviewerComments = reviewerComments;
    return approveLeave(req, res);
  } else if (status?.toUpperCase() === 'REJECTED') {
    req.body.reviewerComments = reviewerComments;
    return rejectLeave(req, res);
  } else if (status?.toUpperCase() === 'CANCELLED') {
    return cancelLeave(req, res);
  }

  return res.status(400).json({
    success: false,
    message: 'Status must be APPROVED, REJECTED, or CANCELLED',
  });
}

export default {
  applyLeave,
  getMyLeaves,
  getMyLeaveBalance,
  cancelLeave,
  getLeaves,
  approveLeave,
  rejectLeave,
  getLeaveStats,
  getLeaveBalances,
  updateLeaveStatus,
};
