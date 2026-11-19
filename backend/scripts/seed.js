/**
 * Database Seed Script for VISARTECH People HRMS
 * 
 * Objectives:
 * - Seed 1 Fictional HR Administrator (Alex Morgan)
 * - Seed 6 Canonical Fictional Employees (EMP-001 to EMP-006)
 * - Seed matching Leave Balances, Attendance logs, Leave Requests, Tasks,
 *   Salary Structures, Payroll Records (2026-09, 2026-10, 2026-11),
 *   Announcements, Employee Feedback, and Notifications.
 * 
 * Rules:
 * - Idempotent: Safe to execute repeatedly without generating duplicate records.
 * - Supports '--reset' argument to wipe and cleanly reseed collections.
 * - All employee information and salary numbers are strictly fictional.
 * - Password hashes generated with bcryptjs (Admin@123 / Employee@123).
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../config/db.js';
import {
  User,
  Attendance,
  LeaveRequest,
  LeaveBalance,
  Task,
  SalaryStructure,
  PayrollRecord,
  Announcement,
  Feedback,
  Notification,
} from '../models/index.js';

dotenv.config();

const isResetMode = process.argv.includes('--reset');

export async function seedDatabase() {
  console.log('====================================================');
  console.log('VISARTECH People — MongoDB Database Seeding Routine');
  console.log('====================================================');
  console.log(`Mode: ${isResetMode ? 'CLEAN RESET & RESEED (--reset)' : 'SAFE UPSERT (IDEMPOTENT)'}`);

  await connectDB();

  try {
    if (isResetMode) {
      console.log('\n[Reset] Dropping existing collections...');
      await Promise.all([
        User.deleteMany({}),
        Attendance.deleteMany({}),
        LeaveRequest.deleteMany({}),
        LeaveBalance.deleteMany({}),
        Task.deleteMany({}),
        SalaryStructure.deleteMany({}),
        PayrollRecord.deleteMany({}),
        Announcement.deleteMany({}),
        Feedback.deleteMany({}),
        Notification.deleteMany({}),
      ]);
      console.log('[Reset] All collections cleared.');
    }

    // 1. Password Hashes (Demo credentials)
    const adminPasswordHash = await bcrypt.hash('Admin@123', 10);
    const employeePasswordHash = await bcrypt.hash('Employee@123', 10);

    // 2. Canonical Users (1 HR Admin + 6 Employees)
    console.log('\n[1/10] Seeding Users & Canonical Employees...');
    const usersToSeed = [
      {
        employeeId: 'ADM-001',
        firstName: 'Alex',
        lastName: 'Morgan',
        email: 'hr@visartech.demo',
        passwordHash: adminPasswordHash,
        role: 'HR_ADMIN',
        jobTitle: 'Head of Human Resources',
        department: 'People Operations',
        employmentType: 'Full-Time',
        joiningDate: new Date('2021-01-10'),
        reportingManager: 'Sarah Jenkins (VP of People)',
        employmentStatus: 'Active',
        phone: '+1 (312) 555-0101',
        address: '100 S Wacker Dr, Suite 1400',
        city: 'Chicago',
        state: 'IL',
      },
      {
        employeeId: 'EMP-001',
        firstName: 'Marcus',
        lastName: 'Vance',
        email: 'marcus.vance@visartech.demo',
        passwordHash: employeePasswordHash,
        role: 'EMPLOYEE',
        jobTitle: 'Lead Full Stack Architect',
        department: 'Engineering',
        employmentType: 'Full-Time',
        joiningDate: new Date('2022-03-15'),
        reportingManager: 'Sarah Jenkins (VP of People)',
        employmentStatus: 'Active',
        phone: '+1 (312) 555-0143',
        address: '452 N Michigan Ave',
        city: 'Chicago',
        state: 'IL',
      },
      {
        employeeId: 'EMP-002',
        firstName: 'Elena',
        lastName: 'Rostova',
        email: 'elena.rostova@visartech.demo',
        passwordHash: employeePasswordHash,
        role: 'EMPLOYEE',
        jobTitle: 'Senior UI/UX Designer',
        department: 'Design',
        employmentType: 'Full-Time',
        joiningDate: new Date('2022-08-01'),
        reportingManager: 'Marcus Vance (Lead Architect)',
        employmentStatus: 'Active',
        phone: '+1 (312) 555-0187',
        address: '220 W Merchandise Mart Plaza',
        city: 'Chicago',
        state: 'IL',
      },
      {
        employeeId: 'EMP-003',
        firstName: 'David',
        lastName: 'Kim',
        email: 'david.kim@visartech.demo',
        passwordHash: employeePasswordHash,
        role: 'EMPLOYEE',
        jobTitle: 'Principal Product Manager',
        department: 'Product',
        employmentType: 'Full-Time',
        joiningDate: new Date('2021-11-10'),
        reportingManager: 'Sarah Jenkins (VP of People)',
        employmentStatus: 'On Leave',
        phone: '+1 (312) 555-0155',
        address: '500 W Madison St',
        city: 'Chicago',
        state: 'IL',
      },
      {
        employeeId: 'EMP-004',
        firstName: 'Aaliyah',
        lastName: 'Patel',
        email: 'aaliyah.patel@visartech.demo',
        passwordHash: employeePasswordHash,
        role: 'EMPLOYEE',
        jobTitle: 'Talent Acquisition Lead',
        department: 'People Operations',
        employmentType: 'Full-Time',
        joiningDate: new Date('2023-02-20'),
        reportingManager: 'Alex Morgan (HR Administrator)',
        employmentStatus: 'Active',
        phone: '+1 (312) 555-0176',
        address: '111 S Wacker Dr',
        city: 'Chicago',
        state: 'IL',
      },
      {
        employeeId: 'EMP-005',
        firstName: 'Carlos',
        lastName: 'Mendez',
        email: 'carlos.mendez@visartech.demo',
        passwordHash: employeePasswordHash,
        role: 'EMPLOYEE',
        jobTitle: 'DevOps & Cloud Architect',
        department: 'Engineering',
        employmentType: 'Full-Time',
        joiningDate: new Date('2022-05-18'),
        reportingManager: 'Marcus Vance (Lead Architect)',
        employmentStatus: 'Active',
        phone: '+1 (312) 555-0119',
        address: '233 S Wacker Dr',
        city: 'Chicago',
        state: 'IL',
      },
      {
        employeeId: 'EMP-006',
        firstName: 'Jordan',
        lastName: 'Lee',
        email: 'employee1@visartech.demo',
        passwordHash: employeePasswordHash,
        role: 'EMPLOYEE',
        jobTitle: 'Full Stack Software Engineer',
        department: 'Engineering',
        employmentType: 'Full-Time',
        joiningDate: new Date('2024-01-15'),
        reportingManager: 'Marcus Vance (Lead Architect)',
        employmentStatus: 'Active',
        phone: '+1 (312) 555-0194',
        address: '600 W Adams St',
        city: 'Chicago',
        state: 'IL',
      },
    ];

    for (const u of usersToSeed) {
      await User.findOneAndUpdate(
        { employeeId: u.employeeId },
        { $setOnInsert: u },
        { upsert: true, new: true }
      );
    }
    console.log(`-> Upserted ${usersToSeed.length} users (1 HR Admin + 6 Employees).`);

    // 3. Leave Balances
    console.log('\n[2/10] Seeding Leave Balances...');
    const balancesToSeed = [
      { employeeId: 'EMP-001', casual: { total: 6, used: 1, remaining: 5 }, sick: { total: 8, used: 2, remaining: 6 }, paid: { total: 14, used: 3, remaining: 11 }, unpaid: { used: 0 } },
      { employeeId: 'EMP-002', casual: { total: 6, used: 2, remaining: 4 }, sick: { total: 8, used: 0, remaining: 8 }, paid: { total: 14, used: 4, remaining: 10 }, unpaid: { used: 0 } },
      { employeeId: 'EMP-003', casual: { total: 6, used: 3, remaining: 3 }, sick: { total: 8, used: 4, remaining: 4 }, paid: { total: 14, used: 6, remaining: 8 }, unpaid: { used: 2 } },
      { employeeId: 'EMP-004', casual: { total: 6, used: 0, remaining: 6 }, sick: { total: 8, used: 1, remaining: 7 }, paid: { total: 14, used: 2, remaining: 12 }, unpaid: { used: 0 } },
      { employeeId: 'EMP-005', casual: { total: 6, used: 1, remaining: 5 }, sick: { total: 8, used: 1, remaining: 7 }, paid: { total: 14, used: 5, remaining: 9 }, unpaid: { used: 0 } },
      { employeeId: 'EMP-006', casual: { total: 6, used: 2, remaining: 4 }, sick: { total: 8, used: 1, remaining: 7 }, paid: { total: 14, used: 3, remaining: 11 }, unpaid: { used: 0 } },
    ];

    for (const b of balancesToSeed) {
      await LeaveBalance.findOneAndUpdate(
        { employeeId: b.employeeId },
        { $set: b },
        { upsert: true }
      );
    }
    console.log(`-> Upserted ${balancesToSeed.length} leave balances.`);

    // 4. Attendance Records (Compound index employeeId + date)
    console.log('\n[3/10] Seeding Attendance Logs...');
    const todayStr = '2026-11-17';
    const yesterdayStr = '2026-11-16';
    const attendanceToSeed = [
      { employeeId: 'EMP-001', date: todayStr, checkInTime: new Date(`${todayStr}T09:02:00Z`), checkOutTime: null, durationHours: 7.5, status: 'present', checkInNote: 'Hybrid workstation' },
      { employeeId: 'EMP-002', date: todayStr, checkInTime: new Date(`${todayStr}T08:55:00Z`), checkOutTime: null, durationHours: 7.8, status: 'present', checkInNote: 'UI Design Lab' },
      { employeeId: 'EMP-003', date: todayStr, checkInTime: null, checkOutTime: null, durationHours: 0, status: 'on_leave', checkInNote: 'Approved medical leave' },
      { employeeId: 'EMP-004', date: todayStr, checkInTime: new Date(`${todayStr}T09:12:00Z`), checkOutTime: null, durationHours: 7.2, status: 'late', checkInNote: 'CTA train delay' },
      { employeeId: 'EMP-005', date: todayStr, checkInTime: new Date(`${todayStr}T08:45:00Z`), checkOutTime: null, durationHours: 8.0, status: 'present', checkInNote: 'DevOps on-call' },
      { employeeId: 'EMP-006', date: todayStr, checkInTime: new Date(`${todayStr}T09:00:00Z`), checkOutTime: null, durationHours: 7.6, status: 'present', checkInNote: 'QA Automation sprint' },
      // Yesterday records
      { employeeId: 'EMP-001', date: yesterdayStr, checkInTime: new Date(`${yesterdayStr}T09:00:00Z`), checkOutTime: new Date(`${yesterdayStr}T17:30:00Z`), durationHours: 8.5, status: 'present', checkInNote: 'Full day' },
      { employeeId: 'EMP-006', date: yesterdayStr, checkInTime: new Date(`${yesterdayStr}T08:58:00Z`), checkOutTime: new Date(`${yesterdayStr}T17:15:00Z`), durationHours: 8.2, status: 'present', checkInNote: 'Full day' },
    ];

    for (const a of attendanceToSeed) {
      await Attendance.findOneAndUpdate(
        { employeeId: a.employeeId, date: a.date },
        { $set: a },
        { upsert: true }
      );
    }
    console.log(`-> Upserted ${attendanceToSeed.length} attendance records with compound uniqueness.`);

    // 5. Leave Requests
    console.log('\n[4/10] Seeding Leave Requests...');
    const leaveRequestsToSeed = [
      { employeeId: 'EMP-001', leaveType: 'CASUAL', startDate: '2026-11-25', endDate: '2026-11-25', days: 1, reason: 'Personal appointment', status: 'APPROVED', reviewedBy: 'Alex Morgan (HR Administrator)', reviewedAt: new Date('2026-11-14T10:00:00Z'), reviewerComments: 'Approved' },
      { employeeId: 'EMP-003', leaveType: 'SICK', startDate: '2026-11-16', endDate: '2026-11-19', days: 4, reason: 'Medical recovery after procedure', status: 'APPROVED', reviewedBy: 'Alex Morgan (HR Administrator)', reviewedAt: new Date('2026-11-15T09:30:00Z'), reviewerComments: 'Take care and rest well.' },
      { employeeId: 'EMP-006', leaveType: 'PAID', startDate: '2026-12-24', endDate: '2026-12-26', days: 3, reason: 'Winter holiday vacation', status: 'PENDING', reviewedBy: null, reviewedAt: null, reviewerComments: '' },
      { employeeId: 'EMP-002', leaveType: 'CASUAL', startDate: '2026-12-05', endDate: '2026-12-05', days: 1, reason: 'Family commitment', status: 'PENDING', reviewedBy: null, reviewedAt: null, reviewerComments: '' },
    ];

    for (const l of leaveRequestsToSeed) {
      await LeaveRequest.findOneAndUpdate(
        { employeeId: l.employeeId, startDate: l.startDate, endDate: l.endDate },
        { $set: l },
        { upsert: true }
      );
    }
    console.log(`-> Upserted ${leaveRequestsToSeed.length} leave requests.`);

    // 6. Tasks
    console.log('\n[5/10] Seeding Tasks & Deliverables...');
    const tasksToSeed = [
      {
        taskId: 'TSK-101',
        title: 'Implement JWT Cookie Auth Handler',
        description: 'Build backend middleware for HTTP-only cookie extraction, refresh token rotation, and invalidation upon session termination.',
        assignedEmployeeId: 'EMP-006',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        startDate: '2026-11-12',
        dueDate: '2026-11-20',
        estimatedHours: 16,
        progress: 65,
        comments: [
          { author: 'Alex Morgan', text: 'Assigned for Sprint 24 security milestone.', createdAt: new Date('2026-11-12T09:15:00Z') },
          { author: 'Jordan Lee', text: 'JWT verification middleware drafted. Adding refresh token rotation logic today.', createdAt: new Date('2026-11-14T14:30:00Z') },
        ],
      },
      {
        taskId: 'TSK-102',
        title: 'Design System Dark Mode Tokens',
        description: 'Establish semantic color palette for dark mode contrast ratios across UI components.',
        assignedEmployeeId: 'EMP-002',
        priority: 'MEDIUM',
        status: 'IN_REVIEW',
        startDate: '2026-11-10',
        dueDate: '2026-11-18',
        estimatedHours: 12,
        progress: 90,
        comments: [
          { author: 'Elena Rostova', text: 'Tokens documented in Figma and mapped to Tailwind config.', createdAt: new Date('2026-11-15T11:00:00Z') },
        ],
      },
      {
        taskId: 'TSK-103',
        title: 'PostgreSQL to MongoDB Ingestion Pipeline',
        description: 'Build ETL migration scripts with schema validation and transaction rollbacks.',
        assignedEmployeeId: 'EMP-001',
        priority: 'HIGH',
        status: 'TODO',
        startDate: '2026-11-16',
        dueDate: '2026-11-28',
        estimatedHours: 24,
        progress: 0,
        comments: [],
      },
      {
        taskId: 'TSK-104',
        title: 'Kubernetes Cluster Autoscaling Optimization',
        description: 'Configure HPA thresholds based on 70% CPU and memory utilization on production pods.',
        assignedEmployeeId: 'EMP-005',
        priority: 'HIGH',
        status: 'COMPLETED',
        startDate: '2026-11-05',
        dueDate: '2026-11-14',
        estimatedHours: 18,
        progress: 100,
        comments: [
          { author: 'Carlos Mendez', text: 'Load tested with k6. Node scaling triggered reliably.', createdAt: new Date('2026-11-14T16:00:00Z') },
        ],
      },
    ];

    for (const t of tasksToSeed) {
      await Task.findOneAndUpdate(
        { taskId: t.taskId },
        { $set: t },
        { upsert: true }
      );
    }
    console.log(`-> Upserted ${tasksToSeed.length} tasks.`);

    // 7. Salary Structures
    console.log('\n[6/10] Seeding Fictional Salary Structures...');
    const salaryStructuresToSeed = [
      { employeeId: 'EMP-001', basicSalary: 8500, housingAllowance: 1200, otherAllowances: 500, bonus: 800, taxDeduction: 2200, otherDeductions: 300, bankName: 'JPMorgan Chase (Demo)', accountNumberMasked: '•••• •••• 4128' },
      { employeeId: 'EMP-002', basicSalary: 7200, housingAllowance: 1000, otherAllowances: 400, bonus: 400, taxDeduction: 1700, otherDeductions: 300, bankName: 'Bank of America (Demo)', accountNumberMasked: '•••• •••• 9312' },
      { employeeId: 'EMP-003', basicSalary: 8800, housingAllowance: 1200, otherAllowances: 500, bonus: 1000, taxDeduction: 2400, otherDeductions: 400, bankName: 'Citibank (Demo)', accountNumberMasked: '•••• •••• 5521' },
      { employeeId: 'EMP-004', basicSalary: 6500, housingAllowance: 900, otherAllowances: 300, bonus: 300, taxDeduction: 1500, otherDeductions: 300, bankName: 'Wells Fargo (Demo)', accountNumberMasked: '•••• •••• 7744' },
      { employeeId: 'EMP-005', basicSalary: 8000, housingAllowance: 1100, otherAllowances: 400, bonus: 500, taxDeduction: 2000, otherDeductions: 400, bankName: 'JPMorgan Chase (Demo)', accountNumberMasked: '•••• •••• 8820' },
      { employeeId: 'EMP-006', basicSalary: 4200, housingAllowance: 600, otherAllowances: 200, bonus: 300, taxDeduction: 950, otherDeductions: 150, bankName: 'Chase Bank (Demo)', accountNumberMasked: '•••• •••• 6192' },
    ];

    for (const s of salaryStructuresToSeed) {
      await SalaryStructure.findOneAndUpdate(
        { employeeId: s.employeeId },
        { $set: s },
        { upsert: true }
      );
    }
    console.log(`-> Upserted ${salaryStructuresToSeed.length} salary structures.`);

    // 8. Payroll Records (Compound Index employeeId + payrollMonth)
    console.log('\n[7/10] Seeding Historical Payroll Records...');
    const payrollMonths = ['2026-11', '2026-10', '2026-09'];
    let payrollCount = 0;

    for (const month of payrollMonths) {
      for (const s of salaryStructuresToSeed) {
        const grossSalary = s.basicSalary + s.housingAllowance + s.otherAllowances + s.bonus;
        const deductions = s.taxDeduction + s.otherDeductions;
        const netSalary = grossSalary - deductions;
        const isCurrentMonthPending = month === '2026-11' && (s.employeeId === 'EMP-002' || s.employeeId === 'EMP-004');
        const paymentStatus = isCurrentMonthPending ? 'PENDING' : 'PAID';

        const record = {
          payrollId: `PAY-${month.replace('-', '')}-${s.employeeId.replace('EMP-', '')}`,
          payrollMonth: month,
          employeeId: s.employeeId,
          basicSalary: s.basicSalary,
          allowances: s.housingAllowance + s.otherAllowances + s.bonus,
          grossSalary,
          deductions,
          netSalary,
          paymentStatus,
          disbursementDate: `${month}-30`,
          paidAt: paymentStatus === 'PAID' ? new Date(`${month}-30T15:00:00Z`) : null,
        };

        await PayrollRecord.findOneAndUpdate(
          { employeeId: record.employeeId, payrollMonth: record.payrollMonth },
          { $set: record },
          { upsert: true }
        );
        payrollCount++;
      }
    }
    console.log(`-> Upserted ${payrollCount} monthly payroll records across 3 historical cycles.`);

    // 9. Announcements
    console.log('\n[8/10] Seeding Company Announcements...');
    const announcementsToSeed = [
      {
        title: 'Company All-Hands Meeting — Q4 Townhall & Strategic Roadmap',
        description: 'Join executive leadership this Thursday at 2:00 PM CST for our comprehensive quarterly review of milestones, customer wins, and 2027 strategic growth initiatives.',
        category: 'Company Events',
        priority: 'HIGH',
        targetAudience: 'All Employees',
        targetDepartment: null,
        targetEmployeeIds: [],
        publishDate: '2026-11-15',
        expiryDate: '2026-12-01',
        author: 'Alex Morgan (HR Administrator)',
        status: 'PUBLISHED',
        pinned: true,
        readBy: ['EMP-001', 'EMP-002', 'EMP-006'],
      },
      {
        title: 'Annual Open Healthcare, Vision & Dental Enrollment 2027',
        description: 'Open enrollment for healthcare coverage and 401(k) matching is now active through November 30. Review your tiers in the portal.',
        category: 'HR Updates',
        priority: 'HIGH',
        targetAudience: 'All Employees',
        targetDepartment: null,
        targetEmployeeIds: [],
        publishDate: '2026-11-10',
        expiryDate: '2026-11-30',
        author: 'Sarah Jenkins (VP of People)',
        status: 'PUBLISHED',
        pinned: true,
        readBy: ['EMP-001', 'EMP-006'],
      },
      {
        title: 'Upcoming Thanksgiving Holiday Office Schedule',
        description: 'Offices will be closed Thursday, Nov 26 and Friday, Nov 27, 2026. On-call engineering rotations remain in effect.',
        category: 'Holidays',
        priority: 'MEDIUM',
        targetAudience: 'All Employees',
        targetDepartment: null,
        targetEmployeeIds: [],
        publishDate: '2026-11-12',
        expiryDate: '2026-11-28',
        author: 'Alex Morgan (HR Administrator)',
        status: 'PUBLISHED',
        pinned: false,
        readBy: ['EMP-006'],
      },
      {
        title: 'Engineering Pull Request Standards & SonarQube Quality Gates',
        description: 'All frontend and backend pull requests into main branches mandate automated lint verification, minimum 80% coverage, and SonarQube quality gate compliance.',
        category: 'Policy Updates',
        priority: 'HIGH',
        targetAudience: 'Selected Department',
        targetDepartment: 'Engineering',
        targetEmployeeIds: [],
        publishDate: '2026-11-08',
        expiryDate: '2026-12-31',
        author: 'Marcus Vance (Lead Architect)',
        status: 'PUBLISHED',
        pinned: false,
        readBy: ['EMP-001', 'EMP-005', 'EMP-006'],
      },
      {
        title: 'Mandatory Cyber-Security Awareness Training 2026 (Draft)',
        description: 'Interactive cyber-defense and phishing simulation training will roll out next week for all staff.',
        category: 'Important Notices',
        priority: 'MEDIUM',
        targetAudience: 'All Employees',
        targetDepartment: null,
        targetEmployeeIds: [],
        publishDate: '2026-11-20',
        expiryDate: '2026-12-22',
        author: 'Alex Morgan (HR Administrator)',
        status: 'DRAFT',
        pinned: false,
        readBy: [],
      },
    ];

    for (const ann of announcementsToSeed) {
      await Announcement.findOneAndUpdate(
        { title: ann.title },
        { $set: ann },
        { upsert: true }
      );
    }
    console.log(`-> Upserted ${announcementsToSeed.length} company announcements.`);

    // 10. Employee Feedback (Strict Anonymity verification)
    console.log('\n[9/10] Seeding Employee Feedback...');
    const feedbackToSeed = [
      {
        category: 'Workplace',
        subject: 'Ergonomic Dual Monitor Arms for Hybrid Desks',
        message: 'Would it be possible to upgrade hot-desking stations in Zone B with adjustable dual-monitor arms? Several team members experience neck strain.',
        priority: 'MEDIUM',
        isAnonymous: true,
        employeeId: null,
        employeeName: 'Anonymous Colleague',
        employeeDepartment: 'Confidential',
        status: 'UNDER_REVIEW',
        internalNotes: [
          { author: 'Alex Morgan (HR Administrator)', text: 'Requested facilities quote for 12 dual gas-spring mounts.', createdAt: new Date('2026-11-15T09:30:00Z') },
        ],
        response: {
          author: 'Alex Morgan (HR Administrator)',
          text: 'Facilities has reviewed Zone B ergonomics and ordered dual gas-spring mounts, scheduled for installation next week.',
          respondedAt: new Date('2026-11-16T14:00:00Z'),
        },
      },
      {
        category: 'Suggestions',
        subject: 'Weekly No-Meeting Focus Block on Wednesday Afternoons',
        message: 'Our sprint velocity improved significantly during quiet periods. Could we standardize a company-wide Deep Work Wednesday afternoon?',
        priority: 'HIGH',
        isAnonymous: false,
        employeeId: 'EMP-001',
        employeeName: 'Marcus Vance',
        employeeDepartment: 'Engineering',
        status: 'RESOLVED',
        internalNotes: [
          { author: 'Alex Morgan (HR Administrator)', text: 'Discussed with Sarah Jenkins and Engineering leads; unanimous agreement.', createdAt: new Date('2026-11-13T11:00:00Z') },
        ],
        response: {
          author: 'Alex Morgan (HR Administrator)',
          text: 'Marcus, great proposal! Leadership announced Wednesday Focus Hours starting Dec 1. Calendar invites will be adjusted accordingly.',
          respondedAt: new Date('2026-11-14T16:15:00Z'),
        },
      },
      {
        category: 'Technical Issues',
        subject: 'VPN Latency During Morning Standup Video Streams',
        message: 'Noticeable jitter on the Chicago gateway between 9:00 AM and 10:00 AM CST when all remote staff join standups simultaneously.',
        priority: 'HIGH',
        isAnonymous: false,
        employeeId: 'EMP-006',
        employeeName: 'Jordan Lee',
        employeeDepartment: 'Engineering',
        status: 'RESPONDED',
        internalNotes: [
          { author: 'Alex Morgan (HR Administrator)', text: 'Escalated to Carlos Mendez (DevOps & Infrastructure).', createdAt: new Date('2026-11-15T10:15:00Z') },
        ],
        response: {
          author: 'Carlos Mendez (DevOps)',
          text: 'Jordan, thanks for flagging. We expanded bandwidth allocation on the concentrator by 500Mbps; latency should now be under 25ms.',
          respondedAt: new Date('2026-11-16T11:20:00Z'),
        },
      },
    ];

    for (const f of feedbackToSeed) {
      await Feedback.findOneAndUpdate(
        { subject: f.subject },
        { $set: f },
        { upsert: true }
      );
    }
    console.log(`-> Upserted ${feedbackToSeed.length} feedback items (including verified anonymous submissions).`);

    // 11. Notifications (Partial Unique Index on eventId)
    console.log('\n[10/10] Seeding Activity Notifications...');
    const notificationsToSeed = [
      {
        recipientId: 'EMP-006',
        recipientRole: 'EMPLOYEE',
        type: 'announcement',
        title: 'New Announcement: Q4 Townhall Meeting',
        message: 'Alex Morgan published "Company All-Hands Meeting — Q4 Townhall & Strategic Roadmap".',
        link: '/announcements',
        read: false,
        eventId: 'announcement_ANN-001_EMP-006',
      },
      {
        recipientId: 'EMP-006',
        recipientRole: 'EMPLOYEE',
        type: 'payroll_published',
        title: 'November 2026 Payslip Ready',
        message: 'Your official salary disbursement statement for November 2026 is ready to view and download.',
        link: '/payroll',
        read: false,
        eventId: 'payroll_2026-11_EMP-006',
      },
      {
        recipientId: 'EMP-006',
        recipientRole: 'EMPLOYEE',
        type: 'task_assigned',
        title: 'New Task Assigned: JWT Auth Handler',
        message: 'Alex Morgan assigned you to "Implement JWT Cookie Auth Handler" in Engineering.',
        link: '/tasks',
        read: true,
        eventId: 'task_TSK-101_ASSIGNED_EMP-006',
      },
      {
        recipientId: 'HR_ADMIN',
        recipientRole: 'HR_ADMIN',
        type: 'feedback_response',
        title: 'New Feedback: Workplace Ergonomics',
        message: 'New feedback submitted in category Workplace ("Ergonomic Dual Monitor Arms").',
        link: '/feedback',
        read: false,
        eventId: 'feedback_FDB-001_NEW',
      },
      {
        recipientId: 'HR_ADMIN',
        recipientRole: 'HR_ADMIN',
        type: 'leave_approved',
        title: 'Leave Application Pending Review',
        message: 'David Kim submitted a 4-day Medical/Sick Leave request requiring review.',
        link: '/leaves',
        read: false,
        eventId: 'leave_LEAVE-002_PENDING_ADMIN',
      },
    ];

    for (const n of notificationsToSeed) {
      await Notification.findOneAndUpdate(
        { eventId: n.eventId },
        { $set: n },
        { upsert: true }
      );
    }
    console.log(`-> Upserted ${notificationsToSeed.length} notifications with eventId deduplication.`);

    console.log('\n====================================================');
    console.log('DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('====================================================');
    return true;
  } catch (err) {
    console.error('[Seed Error] Failed to complete seeding:', err);
    throw err;
  } finally {
    await disconnectDB();
  }
}

// Execute directly if run via CLI
if (process.argv[1]?.endsWith('seed.js')) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
