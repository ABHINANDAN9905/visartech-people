import User from '../models/User.js';
import { sendEmployeeInvitationEmail } from '../services/emailService.js';

/**
 * @route   GET /api/employees
 * @desc    Get paginated employees with search & filtering (HR_ADMIN only)
 * @access  Private (HR_ADMIN)
 */
export async function getEmployees(req, res) {
  try {
    const { search, department, status, page = 1, limit = 10 } = req.query;

    const query = {};

    // 1. Search across firstName, lastName, email, and employeeId
    if (search && search.trim()) {
      const q = search.trim();
      const regex = new RegExp(q, 'i');
      query.$or = [
        { firstName: regex },
        { lastName: regex },
        { email: regex },
        { employeeId: regex },
      ];
    }

    // 2. Department filter
    if (department && department !== 'All' && department.trim()) {
      query.department = department.trim();
    }

    // 3. Employment Status filter
    if (status && status !== 'All' && status.trim()) {
      query.employmentStatus = status.trim();
    }

    // 4. Pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(200, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const totalCount = await User.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limitNum) || 1;

    const employees = await User.find(query)
      .sort({ employeeId: 1 })
      .skip(skip)
      .limit(limitNum);

    return res.status(200).json({
      success: true,
      count: employees.length,
      totalCount,
      page: pageNum,
      totalPages,
      employees: employees.map((e) => e.toJSON()),
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve employee directory',
      error: err.message,
    });
  }
}

/**
 * @route   GET /api/employees/:id
 * @desc    Get employee details (HR_ADMIN can view all; EMPLOYEE can view only self)
 * @access  Private
 */
export async function getEmployeeById(req, res) {
  try {
    const { id } = req.params;
    let employee = null;

    if (id.startsWith('EMP-') || id.startsWith('ADM-')) {
      employee = await User.findOne({ employeeId: id.toUpperCase() });
    } else {
      employee = await User.findById(id);
    }

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: `Employee not found with identifier: ${id}`,
      });
    }

    // Role-based access: EMPLOYEE can view only their own profile
    if (
      req.user.role !== 'HR_ADMIN' &&
      req.user.employeeId !== employee.employeeId &&
      req.user._id.toString() !== employee._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You are not authorized to view another colleague's profile.",
      });
    }

    return res.status(200).json({
      success: true,
      employee: employee.toJSON(),
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching employee details',
      error: err.message,
    });
  }
}

/**
 * @route   POST /api/employees
 * @desc    Create new employee record (HR_ADMIN only)
 * @access  Private (HR_ADMIN)
 */
export async function createEmployee(req, res) {
  try {
    const {
      employeeId,
      firstName,
      lastName,
      email,
      password,
      role = 'EMPLOYEE',
      jobTitle,
      department,
      employmentType = 'Full-Time',
      joiningDate,
      reportingManager,
      employmentStatus = 'Active',
      phone,
      address,
      city,
      state,
    } = req.body || {};

    // 1. Mandatory fields validation
    if (!employeeId || !firstName || !lastName || !email || !jobTitle || !department) {
      return res.status(400).json({
        success: false,
        message: 'Required fields missing: employeeId, firstName, lastName, email, jobTitle, and department are mandatory.',
      });
    }

    const cleanEmployeeId = employeeId.trim().toUpperCase();
    const cleanEmail = email.trim().toLowerCase();

    // 2. Email format validation
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email address format.',
      });
    }

    // 3. Uniqueness verification for employeeId and email
    const existingId = await User.findOne({ employeeId: cleanEmployeeId });
    if (existingId) {
      return res.status(409).json({
        success: false,
        message: `Employee ID '${cleanEmployeeId}' is already assigned to another employee.`,
      });
    }

    const existingEmail = await User.findOne({ email: cleanEmail });
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: `Email address '${cleanEmail}' is already registered in the system.`,
      });
    }

    // 4. Create employee authentication account without shared default password
    const newEmployee = new User({
      employeeId: cleanEmployeeId,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: cleanEmail,
      role: role === 'HR_ADMIN' ? 'HR_ADMIN' : 'EMPLOYEE',
      jobTitle: jobTitle.trim(),
      department: department.trim(),
      employmentType,
      joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
      reportingManager: reportingManager ? reportingManager.trim() : 'Sarah Jenkins (VP of People)',
      employmentStatus,
      phone: phone ? phone.trim() : '+1 (312) 555-0100',
      address: address ? address.trim() : '100 S Wacker Dr',
      city: city ? city.trim() : 'Chicago',
      state: state ? state.trim() : 'IL',
      invitationStatus: 'PENDING',
    });

    // 5. Generate secure, single-use invitation token
    const rawInvitationToken = newEmployee.generateInvitationToken();
    await newEmployee.save();

    // 6. Send invitation link if real address and not test environment
    const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_ORIGIN || 'http://localhost:3000';
    const invitationUrl = `${frontendUrl}/accept-invitation/${rawInvitationToken}`;

    let emailSent = false;
    if (!cleanEmail.endsWith('.demo') && process.env.NODE_ENV !== 'test') {
      try {
        const emailResult = await sendEmployeeInvitationEmail({
          to: cleanEmail,
          name: `${firstName.trim()} ${lastName.trim()}`,
          employeeId: cleanEmployeeId,
          jobTitle: jobTitle.trim(),
          department: department.trim(),
          loginUrl: invitationUrl,
        });
        emailSent = emailResult.success;
      } catch (emailErr) {
        console.warn('Could not send employee invitation email:', emailErr.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: `Employee ${cleanEmployeeId} (${firstName} ${lastName}) enrolled successfully. Invitation link generated.`,
      employee: newEmployee.toJSON(),
      invitationSent: emailSent,
    });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || 'identifier';
      const duplicateMsg = field === 'email'
        ? `Email address '${req.body?.email}' is already registered in the system.`
        : `Employee ID '${req.body?.employeeId}' is already assigned to another employee.`;
      return res.status(409).json({
        success: false,
        message: duplicateMsg,
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message || 'Failed to create employee record',
      error: err.message,
    });
  }
}

/**
 * @route   PUT /api/employees/:id
 * @desc    Update employee details
 * @access  Private (HR_ADMIN for all fields, EMPLOYEE for self-service fields only)
 */
export async function updateEmployee(req, res) {
  try {
    const { id } = req.params;
    const query = id.startsWith('EMP-') || id.startsWith('ADM-')
      ? { employeeId: id.toUpperCase() }
      : { _id: id };

    const employee = await User.findOne(query);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: `Employee not found: ${id}`,
      });
    }

    const isHrAdmin = req.user.role === 'HR_ADMIN';
    const isSelf = req.user.employeeId === employee.employeeId || req.user._id.toString() === employee._id.toString();

    // 1. Authorization: user must be HR_ADMIN or updating their own record
    if (!isHrAdmin && !isSelf) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to modify this profile.',
      });
    }

    // 2. Strict Privilege Escalation Protection for Employees
    if (!isHrAdmin) {
      const restrictedFields = ['role', 'employeeId', 'employmentStatus', 'joiningDate', 'department', 'jobTitle', 'reportingManager'];
      for (const field of restrictedFields) {
        if (req.body[field] !== undefined && req.body[field] !== employee[field]) {
          return res.status(403).json({
            success: false,
            message: `Forbidden: Employees are not permitted to modify restricted field '${field}'.`,
          });
        }
      }
    }

    // 3. Final Active HR_ADMIN Protection
    if (employee.role === 'HR_ADMIN' && employee.employmentStatus === 'Active') {
      const willDemote = req.body.role && req.body.role !== 'HR_ADMIN';
      const willDeactivate = req.body.employmentStatus && req.body.employmentStatus !== 'Active';

      if (willDemote || willDeactivate) {
        const activeAdminCount = await User.countDocuments({ role: 'HR_ADMIN', employmentStatus: 'Active' });
        if (activeAdminCount <= 1) {
          return res.status(400).json({
            success: false,
            message: 'Cannot demote or deactivate the final active HR Administrator.',
          });
        }
      }
    }

    // 4. Email uniqueness validation if email is changing
    if (req.body.email && req.body.email.toLowerCase() !== employee.email) {
      const emailInUse = await User.findOne({ email: req.body.email.toLowerCase() });
      if (emailInUse) {
        return res.status(409).json({
          success: false,
          message: `Email '${req.body.email}' is already in use by another employee.`,
        });
      }
      employee.email = req.body.email.toLowerCase();
    }

    // 5. Apply fields
    const adminFields = [
      'firstName',
      'lastName',
      'jobTitle',
      'department',
      'employmentType',
      'reportingManager',
      'employmentStatus',
      'phone',
      'address',
      'city',
      'state',
      'role',
      'joiningDate',
    ];

    const selfServiceFields = ['phone', 'address', 'city', 'state', 'firstName', 'lastName'];
    const fieldsToUpdate = isHrAdmin ? adminFields : selfServiceFields;

    fieldsToUpdate.forEach((field) => {
      if (req.body[field] !== undefined) {
        employee[field] = req.body[field];
      }
    });

    // Password reset by admin
    if (req.body.password && isHrAdmin) {
      employee.passwordHash = await User.hashPassword(req.body.password);
    }

    await employee.save();

    return res.status(200).json({
      success: true,
      message: `Employee ${employee.employeeId} updated successfully.`,
      employee: employee.toJSON(),
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: 'Failed to update employee',
      error: err.message,
    });
  }
}

/**
 * @route   DELETE /api/employees/:id
 * @desc    Safely deactivate employee record (HR_ADMIN only; preserves history)
 * @access  Private (HR_ADMIN)
 */
export async function deleteEmployee(req, res) {
  try {
    const { id } = req.params;
    const query = id.startsWith('EMP-') || id.startsWith('ADM-')
      ? { employeeId: id.toUpperCase() }
      : { _id: id };

    const employee = await User.findOne(query);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: `Employee not found: ${id}`,
      });
    }

    // Final Active HR_ADMIN Protection
    if (employee.role === 'HR_ADMIN' && employee.employmentStatus === 'Active') {
      const activeAdminCount = await User.countDocuments({ role: 'HR_ADMIN', employmentStatus: 'Active' });
      if (activeAdminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot deactivate the final active HR Administrator.',
        });
      }
    }

    // Safe deactivation: mark as Terminated to preserve relational operational history
    employee.employmentStatus = 'Terminated';
    await employee.save();

    return res.status(200).json({
      success: true,
      message: `Employee ${employee.employeeId} has been safely deactivated (employmentStatus set to Terminated).`,
      employee: employee.toJSON(),
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to deactivate employee',
      error: err.message,
    });
  }
}

/**
 * @route   POST /api/employees/:id/resend-invitation
 * @desc    Resend invitation link for an employee (HR_ADMIN only)
 * @access  Private (HR_ADMIN)
 */
export async function resendEmployeeInvitation(req, res) {
  try {
    const { id } = req.params;
    const query = id.startsWith('EMP-') || id.startsWith('ADM-')
      ? { employeeId: id.toUpperCase() }
      : { _id: id };

    const employee = await User.findOne(query).select('+invitationToken +invitationExpires +invitationStatus');
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: `Employee not found with identifier: ${id}`,
      });
    }

    if (employee.role === 'HR_ADMIN') {
      return res.status(400).json({
        success: false,
        message: 'Cannot send employee invitation to an HR Administrator account.',
      });
    }

    const rawToken = employee.generateInvitationToken();
    await employee.save();

    const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_ORIGIN || 'http://localhost:3000';
    const invitationUrl = `${frontendUrl}/accept-invitation/${rawToken}`;

    let emailSent = false;
    if (!employee.email.endsWith('.demo') && process.env.NODE_ENV !== 'test') {
      try {
        const emailResult = await sendEmployeeInvitationEmail({
          to: employee.email,
          name: employee.name || `${employee.firstName} ${employee.lastName}`,
          employeeId: employee.employeeId,
          jobTitle: employee.jobTitle,
          department: employee.department,
          loginUrl: invitationUrl,
        });
        emailSent = emailResult.success;
      } catch (emailErr) {
        console.warn('Could not resend employee invitation email:', emailErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: `A fresh invitation link has been generated and sent to ${employee.email}.`,
      invitationSent: emailSent,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to resend employee invitation.',
      error: err.message,
    });
  }
}

export default {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  resendEmployeeInvitation,
};
