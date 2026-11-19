import Feedback from '../models/Feedback.js';

/**
 * Ensures strict privacy scrubbing on any feedback object returned
 */
function sanitizeFeedback(doc) {
  const obj = typeof doc.toJSON === 'function' ? doc.toJSON() : { ...doc };
  if (obj.isAnonymous) {
    obj.employeeId = null;
    obj.employeeName = 'Anonymous Colleague';
    obj.employeeDepartment = 'Confidential';
  }
  return obj;
}

/**
 * @route   GET /api/feedback
 * @desc    Get feedback entries (HR_ADMIN only)
 * @access  Private (HR_ADMIN only)
 */
export async function getFeedback(req, res) {
  try {
    const {
      category,
      priority,
      status,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {};

    if (category && category !== 'ALL') {
      filter.category = category;
    }

    if (priority && priority !== 'ALL') {
      filter.priority = priority.toUpperCase();
    }

    if (status && status !== 'ALL') {
      filter.status = status.toUpperCase();
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    if (search && search.trim()) {
      const term = search.trim();
      filter.$or = [
        { subject: { $regex: term, $options: 'i' } },
        { message: { $regex: term, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 20);
    const skip = (pageNum - 1) * limitNum;

    const totalCount = await Feedback.countDocuments(filter);
    const rawItems = await Feedback.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const feedback = rawItems.map(sanitizeFeedback);

    return res.status(200).json({
      success: true,
      count: feedback.length,
      totalCount,
      page: pageNum,
      totalPages: Math.ceil(totalCount / limitNum),
      feedback,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve feedback.',
      error: err.message,
    });
  }
}

/**
 * @route   GET /api/feedback/:id
 * @desc    Get detailed feedback entry (HR_ADMIN only)
 * @access  Private (HR_ADMIN only)
 */
export async function getFeedbackById(req, res) {
  try {
    const { id } = req.params;
    const item = await Feedback.findById(id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Feedback entry not found.',
      });
    }

    return res.status(200).json({
      success: true,
      feedback: sanitizeFeedback(item),
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve feedback entry.',
      error: err.message,
    });
  }
}

/**
 * @route   POST /api/feedback
 * @desc    Submit employee feedback (named or strictly anonymous)
 * @access  Private
 */
export async function submitFeedback(req, res) {
  try {
    const {
      category = 'Workplace',
      subject,
      message,
      priority = 'MEDIUM',
      isAnonymous = false,
    } = req.body || {};

    // 1. Mandatory field validation
    if (!subject || !subject.trim() || !message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Subject and message are required.',
      });
    }

    // 2. Length validation
    if (subject.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Subject must be at least 3 characters.',
      });
    }

    if (message.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Feedback message must be at least 5 characters.',
      });
    }

    // 3. Category validation
    const validCategories = [
      'Workplace',
      'Management',
      'Work Environment',
      'Suggestions',
      'Technical Issues',
      'Other',
    ];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Invalid feedback category '${category}'. Allowed values: ${validCategories.join(', ')}`,
      });
    }

    const cleanAnonymous = Boolean(isAnonymous);

    const newFeedback = await Feedback.create({
      category,
      subject: subject.trim(),
      message: message.trim(),
      priority: ['LOW', 'MEDIUM', 'HIGH'].includes(priority) ? priority : 'MEDIUM',
      isAnonymous: cleanAnonymous,
      employeeId: cleanAnonymous ? null : req.user.employeeId,
      employeeName: cleanAnonymous ? 'Anonymous Colleague' : `${req.user.firstName} ${req.user.lastName}`,
      employeeDepartment: cleanAnonymous ? 'Confidential' : req.user.department,
      status: 'NEW',
    });

    return res.status(201).json({
      success: true,
      message: cleanAnonymous
        ? 'Feedback submitted anonymously. Submitter identity is strictly preserved and omitted.'
        : 'Feedback submitted successfully.',
      feedback: sanitizeFeedback(newFeedback),
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: 'Failed to submit feedback.',
      error: err.message,
    });
  }
}

/**
 * @route   PATCH /api/feedback/:id/status
 * @route   POST /api/feedback/:id/response
 * @desc    Update feedback status and optionally attach response or internal note (HR_ADMIN only)
 * @access  Private (HR_ADMIN only)
 */
export async function updateFeedbackStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, text, responseText, noteText } = req.body || {};

    const item = await Feedback.findById(id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Feedback entry not found.',
      });
    }

    // Update status if provided
    if (status) {
      const validStatuses = ['NEW', 'UNDER_REVIEW', 'RESPONDED', 'RESOLVED'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid feedback status '${status}'. Allowed values: ${validStatuses.join(', ')}`,
        });
      }
      item.status = status;
    }

    // Attach administrative response if provided
    const resContent = text || responseText;
    if (resContent && typeof resContent === 'string' && resContent.trim()) {
      item.response = {
        author: `${req.user.firstName} ${req.user.lastName} (HR Administrator)`,
        text: resContent.trim(),
        respondedAt: new Date(),
      };
      if (!status) {
        item.status = 'RESPONDED';
      }
    }

    // Attach internal note if provided
    if (noteText && typeof noteText === 'string' && noteText.trim()) {
      item.internalNotes.push({
        author: `${req.user.firstName} ${req.user.lastName} (HR Administrator)`,
        text: noteText.trim(),
        createdAt: new Date(),
      });
    }

    await item.save();

    return res.status(200).json({
      success: true,
      message: 'Feedback updated successfully.',
      feedback: sanitizeFeedback(item),
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: 'Failed to update feedback.',
      error: err.message,
    });
  }
}

export default {
  getFeedback,
  getFeedbackById,
  submitFeedback,
  updateFeedbackStatus,
};
