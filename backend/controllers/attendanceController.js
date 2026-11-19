import Attendance from '../models/Attendance.js';
import User from '../models/User.js';

/**
 * Returns current business date in 'YYYY-MM-DD' format for America/Chicago timezone
 */
export function getTodayChicagoDate(dateObj = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(dateObj);
}

/**
 * Extracts 24-hour hour and minute in America/Chicago timezone
 */
export function getChicagoTimeParts(dateObj = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });
  const parts = formatter.formatToParts(dateObj);
  let hour = 0;
  let minute = 0;
  let second = 0;
  for (const p of parts) {
    if (p.type === 'hour') hour = parseInt(p.value, 10);
    if (p.type === 'minute') minute = parseInt(p.value, 10);
    if (p.type === 'second') second = parseInt(p.value, 10);
  }
  return { hour, minute, second };
}

/**
 * @route   POST /api/attendance/check-in
 * @desc    Employee checks in for the current business day (America/Chicago)
 * @access  Private (Authenticated Employee/Admin)
 */
export async function checkIn(req, res) {
  try {
    const employeeId = req.user.employeeId;
    const now = new Date();
    const today = getTodayChicagoDate(now);
    const { note } = req.body || {};

    // 1. Prevent duplicate check-in for the same employee and date
    const existing = await Attendance.findOne({ employeeId, date: today });
    if (existing && existing.checkInTime) {
      return res.status(409).json({
        success: false,
        message: 'You have already checked in for today.',
        record: existing,
      });
    }

    // 2. Determine attendance status based on Chicago business shift rules
    // Shift starts at 09:00 AM CST; Grace period is 15 minutes (late if after 09:15 AM)
    const { hour, minute } = getChicagoTimeParts(now);
    const isLate = hour > 9 || (hour === 9 && minute > 15);
    const status = isLate ? 'late' : 'present';

    // 3. Create or update record
    let record;
    if (existing) {
      existing.checkInTime = now;
      existing.status = status;
      existing.checkInNote = note ? note.trim() : (isLate ? 'Late arrival' : 'On-time arrival');
      existing.user = req.user._id;
      await existing.save();
      record = existing;
    } else {
      record = await Attendance.create({
        employeeId,
        user: req.user._id,
        date: today,
        checkInTime: now,
        status,
        checkInNote: note ? note.trim() : (isLate ? 'Late arrival' : 'On-time arrival'),
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Check-in recorded successfully.',
      record,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: 'Check-in failed.',
      error: err.message,
    });
  }
}

/**
 * @route   POST /api/attendance/check-out
 * @desc    Employee checks out for the current business day
 * @access  Private (Authenticated Employee/Admin)
 */
export async function checkOut(req, res) {
  try {
    const employeeId = req.user.employeeId;
    const now = new Date();
    const today = getTodayChicagoDate(now);

    // 1. Require a valid active check-in record for today
    const existing = await Attendance.findOne({ employeeId, date: today });
    if (!existing || !existing.checkInTime) {
      return res.status(400).json({
        success: false,
        message: 'Cannot check out without an active check-in for today.',
      });
    }

    // 2. Prevent duplicate check-out
    if (existing.checkOutTime) {
      return res.status(409).json({
        success: false,
        message: 'You have already checked out for today.',
        record: existing,
      });
    }

    // 3. Validate checkout sequence and calculate working duration accurately
    const checkInMs = new Date(existing.checkInTime).getTime();
    const checkOutMs = now.getTime();
    if (checkOutMs < checkInMs) {
      return res.status(400).json({
        success: false,
        message: 'Check-out time cannot be earlier than check-in time.',
      });
    }

    const durationHours = parseFloat(((checkOutMs - checkInMs) / (1000 * 60 * 60)).toFixed(2));
    existing.checkOutTime = now;
    existing.durationHours = durationHours;

    // If working duration is under 4 hours and not on leave, flag as half_day
    if (durationHours < 4 && existing.status !== 'on_leave') {
      existing.status = 'half_day';
    }

    await existing.save();

    return res.status(200).json({
      success: true,
      message: 'Check-out recorded successfully.',
      record: existing,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: 'Check-out failed.',
      error: err.message,
    });
  }
}

/**
 * @route   GET /api/attendance/today
 * @desc    Get today's attendance status for logged-in user
 * @access  Private
 */
export async function getTodayAttendance(req, res) {
  try {
    const today = getTodayChicagoDate();
    const record = await Attendance.findOne({
      employeeId: req.user.employeeId,
      date: today,
    });

    return res.status(200).json({
      success: true,
      date: today,
      record: record || null,
      isCheckedIn: Boolean(record && record.checkInTime && !record.checkOutTime),
      isCheckedOut: Boolean(record && record.checkOutTime),
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch today's attendance status.",
      error: err.message,
    });
  }
}

/**
 * @route   GET /api/attendance/my
 * @desc    Employee views only their own attendance history with date filtering & pagination
 * @access  Private (Employee or HR Admin viewing self)
 */
export async function getMyAttendance(req, res) {
  try {
    const employeeId = req.user.employeeId;
    const { startDate, endDate, status, page = 1, limit = 10 } = req.query;

    const filter = { employeeId };

    if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      filter.date = { $gte: startDate };
    } else if (endDate) {
      filter.date = { $lte: endDate };
    }

    if (status && status !== 'All') {
      filter.status = status.toLowerCase();
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const totalCount = await Attendance.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / limitNum) || 1;

    const records = await Attendance.find(filter)
      .sort({ date: -1, checkInTime: -1 })
      .skip(skip)
      .limit(limitNum);

    return res.status(200).json({
      success: true,
      count: records.length,
      totalCount,
      page: pageNum,
      totalPages,
      attendance: records,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve personal attendance history.',
      error: err.message,
    });
  }
}

/**
 * @route   GET /api/attendance/my/summary
 * @desc    Return present, late, absent, half-day, and total working hours for logged-in employee
 * @access  Private
 */
export async function getMyAttendanceSummary(req, res) {
  try {
    const employeeId = req.user.employeeId;
    const { startDate, endDate, month } = req.query;

    const filter = { employeeId };

    if (month) {
      filter.date = { $regex: new RegExp(`^${month}`) };
    } else if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    }

    const records = await Attendance.find(filter);

    let present = 0;
    let late = 0;
    let half_day = 0;
    let on_leave = 0;
    let absent = 0;
    let totalWorkingHours = 0;

    for (const r of records) {
      if (r.status === 'present') present++;
      else if (r.status === 'late') late++;
      else if (r.status === 'half_day') half_day++;
      else if (r.status === 'on_leave') on_leave++;
      else if (r.status === 'absent') absent++;

      totalWorkingHours += r.durationHours || 0;
    }

    const workingDays = present + late + half_day;
    const averageHoursPerDay = workingDays > 0 ? parseFloat((totalWorkingHours / workingDays).toFixed(2)) : 0;

    return res.status(200).json({
      success: true,
      summary: {
        totalRecords: records.length,
        present,
        late,
        half_day,
        on_leave,
        absent,
        totalWorkingHours: parseFloat(totalWorkingHours.toFixed(2)),
        averageHoursPerDay,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to compute attendance summary metrics.',
      error: err.message,
    });
  }
}

/**
 * @route   GET /api/attendance
 * @desc    HR_ADMIN views organization-wide attendance with search, department, status, and date filters
 * @access  Private (HR_ADMIN only)
 */
export async function getAttendance(req, res) {
  try {
    const {
      employeeId,
      department,
      status,
      date,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {};

    // 1. Employee ID filter
    if (employeeId && employeeId.trim()) {
      filter.employeeId = employeeId.trim().toUpperCase();
    }

    // 2. Department filter (resolves employees in that department)
    if (department && department !== 'All' && department.trim()) {
      const deptUsers = await User.find({ department: department.trim() }).select('employeeId');
      const deptEmpIds = deptUsers.map((u) => u.employeeId);
      if (filter.employeeId) {
        if (!deptEmpIds.includes(filter.employeeId)) {
          // Empty result if requested employee does not belong to specified department
          return res.status(200).json({
            success: true,
            count: 0,
            totalCount: 0,
            page: 1,
            totalPages: 1,
            attendance: [],
          });
        }
      } else {
        filter.employeeId = { $in: deptEmpIds };
      }
    }

    // 3. Status filter
    if (status && status !== 'All' && status.trim()) {
      filter.status = status.trim().toLowerCase();
    }

    // 4. Date filtering
    if (date && date.trim()) {
      filter.date = date.trim();
    } else if (startDate && endDate) {
      filter.date = { $gte: startDate.trim(), $lte: endDate.trim() };
    } else if (startDate) {
      filter.date = { $gte: startDate.trim() };
    } else if (endDate) {
      filter.date = { $lte: endDate.trim() };
    }

    // 5. Pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const totalCount = await Attendance.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / limitNum) || 1;

    const rawRecords = await Attendance.find(filter)
      .sort({ date: -1, checkInTime: -1 })
      .skip(skip)
      .limit(limitNum);

    // 6. Enrich with employee metadata (Name, Department, Job Title)
    const empIds = [...new Set(rawRecords.map((r) => r.employeeId))];
    const users = await User.find({ employeeId: { $in: empIds } }).select(
      'employeeId firstName lastName email department jobTitle'
    );
    const userMap = new Map(users.map((u) => [u.employeeId, u]));

    const attendance = rawRecords.map((doc) => {
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
      count: attendance.length,
      totalCount,
      page: pageNum,
      totalPages,
      attendance,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve organization attendance roster.',
      error: err.message,
    });
  }
}

/**
 * @route   GET /api/attendance/summary
 * @desc    HR_ADMIN views organization-wide attendance metrics
 * @access  Private (HR_ADMIN only)
 */
export async function getAttendanceSummary(req, res) {
  try {
    const { date } = req.query;
    const targetDate = date && date.trim() ? date.trim() : getTodayChicagoDate();

    const totalEmployees = await User.countDocuments({ employmentStatus: 'Active' });
    const records = await Attendance.find({ date: targetDate });

    let presentCount = 0;
    let lateCount = 0;
    let halfDayCount = 0;
    let onLeaveCount = 0;
    let totalHoursLogged = 0;
    let currentlyCheckedIn = 0;

    for (const r of records) {
      if (r.status === 'present') presentCount++;
      else if (r.status === 'late') lateCount++;
      else if (r.status === 'half_day') halfDayCount++;
      else if (r.status === 'on_leave') onLeaveCount++;

      if (r.checkInTime && !r.checkOutTime) {
        currentlyCheckedIn++;
      }

      totalHoursLogged += r.durationHours || 0;
    }

    const accountedFor = presentCount + lateCount + halfDayCount + onLeaveCount;
    const absentCount = Math.max(0, totalEmployees - accountedFor);
    const activeWorkingCount = presentCount + lateCount + halfDayCount;
    const averageHours = activeWorkingCount > 0
      ? parseFloat((totalHoursLogged / activeWorkingCount).toFixed(2))
      : 0;

    return res.status(200).json({
      success: true,
      date: targetDate,
      summary: {
        totalEmployees,
        presentCount,
        lateCount,
        halfDayCount,
        onLeaveCount,
        absentCount,
        currentlyCheckedIn,
        totalHoursLogged: parseFloat(totalHoursLogged.toFixed(2)),
        averageHours,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to compute organization attendance summary.',
      error: err.message,
    });
  }
}

/**
 * @route   PUT /api/attendance/:id
 * @desc    HR_ADMIN corrects an attendance record with audit trail validation
 * @access  Private (HR_ADMIN only)
 */
export async function updateAttendance(req, res) {
  try {
    const { id } = req.params;
    const { status, checkInTime, checkOutTime, durationHours, note } = req.body || {};

    const record = await Attendance.findById(id);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: `Attendance record not found with ID: ${id}`,
      });
    }

    // 1. Status validation
    if (status) {
      const validStatuses = ['present', 'late', 'half_day', 'on_leave', 'absent'];
      if (!validStatuses.includes(status.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: `Invalid status '${status}'. Must be one of: ${validStatuses.join(', ')}`,
        });
      }
      record.status = status.toLowerCase();
    }

    // 2. Timestamps and sequence validation
    let newCheckIn = record.checkInTime;
    let newCheckOut = record.checkOutTime;

    if (checkInTime !== undefined) {
      newCheckIn = checkInTime ? new Date(checkInTime) : null;
      if (checkInTime && isNaN(newCheckIn.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid check-in timestamp format.',
        });
      }
      record.checkInTime = newCheckIn;
    }

    if (checkOutTime !== undefined) {
      newCheckOut = checkOutTime ? new Date(checkOutTime) : null;
      if (checkOutTime && isNaN(newCheckOut.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid check-out timestamp format.',
        });
      }
      record.checkOutTime = newCheckOut;
    }

    // 3. Sequence check: checkout must be >= checkin
    if (newCheckIn && newCheckOut) {
      if (newCheckOut.getTime() < newCheckIn.getTime()) {
        return res.status(400).json({
          success: false,
          message: 'Check-out time cannot be earlier than check-in time.',
        });
      }
      // Recompute working duration automatically unless explicitly supplied
      const computedDuration = parseFloat(
        ((newCheckOut.getTime() - newCheckIn.getTime()) / (1000 * 60 * 60)).toFixed(2)
      );
      record.durationHours = durationHours !== undefined ? Number(durationHours) : computedDuration;
    } else if (durationHours !== undefined) {
      if (Number(durationHours) < 0) {
        return res.status(400).json({
          success: false,
          message: 'Duration hours cannot be negative.',
        });
      }
      record.durationHours = Number(durationHours);
    }

    // 4. Audit trail notes
    if (note) {
      record.checkInNote = record.checkInNote
        ? `${record.checkInNote} | Admin Correction: ${note.trim()}`
        : `Admin Correction: ${note.trim()}`;
    }

    await record.save();

    return res.status(200).json({
      success: true,
      message: 'Attendance record updated successfully.',
      record,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: 'Failed to update attendance record.',
      error: err.message,
    });
  }
}

export default {
  checkIn,
  checkOut,
  getTodayAttendance,
  getMyAttendance,
  getMyAttendanceSummary,
  getAttendance,
  getAttendanceSummary,
  updateAttendance,
  getTodayChicagoDate,
  getChicagoTimeParts,
};
