import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import {
  Building2,
  LayoutDashboard,
  Users,
  Clock,
  CalendarCheck,
  CheckSquare,
  BadgeDollarSign,
  Megaphone,
  MessageSquare,
  Settings,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  UserCheck,
  Palette,
  LogOut,
  User,
  Bell,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getDirectoryStats, getEmployees } from '../../services/employeeService';
import { getLeaveSystemStats, getEmployeeLeaveBalance } from '../../services/leaveService';
import { getTaskStats } from '../../services/taskService';
import { getUnreadCount } from '../../services/notificationService';
import Avatar from '../common/Avatar';
import Badge from '../common/Badge';

export default function Sidebar({
  isCollapsed = false,
  onToggleCollapse,
  isMobileOpen = false,
  onMobileClose,
}) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isHRAdmin = user?.role === 'HR_ADMIN';

  // Dynamic directory statistics from centralized employee dataset
  const [stats, setStats] = React.useState(() => getDirectoryStats());
  const [leaveStats, setLeaveStats] = React.useState(() => getLeaveSystemStats());
  const [taskStats, setTaskStats] = React.useState(() => getTaskStats());
  const [empLeaveBalance, setEmpLeaveBalance] = React.useState(() => {
    const list = getEmployees();
    const currentEmp = list.find((e) => e.email === user?.email || e.id === user?.id) || list[0];
    return getEmployeeLeaveBalance(currentEmp?.id || 'EMP-006');
  });
  const [empTaskStats, setEmpTaskStats] = React.useState(() => {
    const list = getEmployees();
    const currentEmp = list.find((e) => e.email === user?.email || e.id === user?.id) || list[0];
    return getTaskStats(currentEmp?.id || 'EMP-006');
  });

  const [notifCount, setNotifCount] = React.useState(() => getUnreadCount(user));

  React.useEffect(() => {
    const handleUpdate = () => {
      setStats(getDirectoryStats());
      setLeaveStats(getLeaveSystemStats());
      setTaskStats(getTaskStats());
      setNotifCount(getUnreadCount(user));
      const list = getEmployees();
      const currentEmp = list.find((e) => e.email === user?.email || e.id === user?.id) || list[0];
      setEmpLeaveBalance(getEmployeeLeaveBalance(currentEmp?.id || 'EMP-006'));
      setEmpTaskStats(getTaskStats(currentEmp?.id || 'EMP-006'));
    };
    window.addEventListener('employees-updated', handleUpdate);
    window.addEventListener('leaves-updated', handleUpdate);
    window.addEventListener('tasks-updated', handleUpdate);
    window.addEventListener('payroll-updated', handleUpdate);
    window.addEventListener('notifications-updated', handleUpdate);
    window.addEventListener('announcements-updated', handleUpdate);
    window.addEventListener('feedback-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('employees-updated', handleUpdate);
      window.removeEventListener('leaves-updated', handleUpdate);
      window.removeEventListener('tasks-updated', handleUpdate);
      window.removeEventListener('payroll-updated', handleUpdate);
      window.removeEventListener('notifications-updated', handleUpdate);
      window.removeEventListener('announcements-updated', handleUpdate);
      window.removeEventListener('feedback-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [user]);

  const empActiveTasks = empTaskStats.todo + empTaskStats.inProgress + empTaskStats.inReview;

  // Navigation sections configured based on active user role
  const adminSections = [
    {
      title: 'OVERVIEW',
      items: [
        { path: '/dashboard', label: 'Admin Dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'WORKFORCE',
      items: [
        { path: '/employees', label: 'Employees Directory', icon: Users, badge: `${stats.total}` },
        { path: '/attendance', label: 'Attendance & Hours', icon: Clock },
        { path: '/leaves', label: 'Leave Approvals', icon: CalendarCheck, badge: leaveStats.pending > 0 ? `${leaveStats.pending}` : undefined },
        { path: '/tasks', label: 'Tasks & Performance', icon: CheckSquare, badge: taskStats.inReview > 0 ? `${taskStats.inReview} Review` : undefined },
      ],
    },
    {
      title: 'ADMINISTRATION',
      items: [
        { path: '/payroll', label: 'Payroll & Salaries', icon: BadgeDollarSign },
        { path: '/announcements', label: 'Announcements', icon: Megaphone },
        { path: '/feedback', label: 'Employee Feedback', icon: MessageSquare },
      ],
    },
    {
      title: 'SYSTEM',
      items: [
        { path: '/notifications', label: 'Activity Alerts', icon: Bell, badge: notifCount > 0 ? `${notifCount}` : undefined },
        { path: '/profile', label: 'My Profile', icon: User },
        { path: '/settings', label: 'System Settings', icon: Settings },
        { path: '/design-system', label: 'Design System', icon: Palette, badge: 'UI' },
      ],
    },
  ];

  const employeeSections = [
    {
      title: 'OVERVIEW',
      items: [
        { path: '/dashboard', label: 'My Dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'MY WORKSPACE',
      items: [
        { path: '/attendance', label: 'My Attendance', icon: Clock },
        { path: '/leaves', label: 'Leave Management', icon: CalendarCheck, badge: `${empLeaveBalance.totalRemaining} Days` },
        { path: '/tasks', label: 'My Tasks & Goals', icon: CheckSquare, badge: empActiveTasks > 0 ? `${empActiveTasks}` : undefined },
        { path: '/payroll', label: 'My Salary & Payslips', icon: BadgeDollarSign },
      ],
    },
    {
      title: 'COMPANY',
      items: [
        { path: '/announcements', label: 'Announcements', icon: Megaphone },
        { path: '/feedback', label: 'Employee Feedback', icon: MessageSquare },
      ],
    },
    {
      title: 'ACCOUNT',
      items: [
        { path: '/notifications', label: 'My Alerts', icon: Bell, badge: notifCount > 0 ? `${notifCount}` : undefined },
        { path: '/profile', label: 'My Profile', icon: User },
        { path: '/settings', label: 'System Settings', icon: Settings },
        { path: '/design-system', label: 'UI Components', icon: Palette },
      ],
    },
  ];

  const navigationSections = isHRAdmin ? adminSections : employeeSections;

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onMobileClose}
          className="fixed inset-0 z-40 bg-brand-navy/60 backdrop-blur-sm lg:hidden transition-opacity duration-200"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={clsx(
          'fixed top-0 bottom-0 left-0 z-40 bg-[#101B35] text-white flex flex-col border-r border-[#1A294C] transition-all duration-300 ease-in-out select-none shadow-xl lg:shadow-none',
          // Desktop collapsed vs expanded
          isCollapsed ? 'lg:w-20' : 'lg:w-64',
          // Mobile open vs closed
          isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-[#1A294C] shrink-0">
          <NavLink
            to="/dashboard"
            onClick={onMobileClose}
            className="flex items-center gap-3 overflow-hidden group focus:outline-none"
          >
            <div className="w-10 h-10 rounded-xl bg-brand-blue flex items-center justify-center shadow-md shrink-0 group-hover:bg-brand-blue-hover transition-colors">
              <Building2 className="w-5 h-5 text-white" />
            </div>

            {(!isCollapsed || isMobileOpen) && (
              <div className="truncate">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-base tracking-tight text-white">
                    VISARTECH
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-brand-blue/20 text-[#60A5FA] border border-brand-blue/30 leading-none">
                    People
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium truncate leading-none mt-1">
                  One Platform. Every Operation.
                </p>
              </div>
            )}
          </NavLink>

          {/* Mobile close button */}
          <button
            type="button"
            onClick={onMobileClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 lg:hidden focus:outline-none"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role Pill Banner */}
        {(!isCollapsed || isMobileOpen) && (
          <div className="px-3 pt-3 pb-1">
            <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isHRAdmin ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <UserCheck className="w-4 h-4 text-brand-blue shrink-0" />
                )}
                <div className="truncate">
                  <p className="text-[11px] font-bold text-white leading-none">
                    {user?.roleLabel || user?.role}
                  </p>
                  <p className="text-[10px] text-slate-400 leading-none mt-0.5">
                    {isHRAdmin ? 'Full Admin Access' : 'Employee Access'}
                  </p>
                </div>
              </div>
              <Badge
                variant={isHRAdmin ? 'navy' : 'info'}
                size="sm"
                className="text-[9px] py-0 px-1 border-white/10"
              >
                DEMO
              </Badge>
            </div>
          </div>
        )}

        {/* Navigation Sections */}
        <nav className="flex-1 px-3 py-3 space-y-5 overflow-y-auto overflow-x-hidden">
          {navigationSections.map((section) => (
            <div key={section.title} className="space-y-1">
              {/* Section Header */}
              {(!isCollapsed || isMobileOpen) ? (
                <div className="px-3 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  {section.title}
                </div>
              ) : (
                <div className="w-full flex justify-center py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                </div>
              )}

              {/* Navigation Items */}
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <div key={item.path} className="relative group">
                    <NavLink
                      to={item.path}
                      onClick={onMobileClose}
                      className={clsx(
                        'flex items-center rounded-xl text-xs font-semibold transition-all duration-150',
                        isCollapsed && !isMobileOpen
                          ? 'justify-center p-2.5'
                          : 'justify-between px-3.5 py-2.5 gap-3',
                        isActive
                          ? 'bg-brand-blue text-white shadow-sm font-bold'
                          : 'text-slate-300 hover:bg-white/5 hover:text-white'
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon
                          className={clsx(
                            'shrink-0 transition-colors',
                            isCollapsed && !isMobileOpen ? 'w-5 h-5' : 'w-4 h-4',
                            isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                          )}
                        />
                        {(!isCollapsed || isMobileOpen) && (
                          <span className="truncate">{item.label}</span>
                        )}
                      </div>

                      {(!isCollapsed || isMobileOpen) && item.badge && (
                        <span
                          className={clsx(
                            'px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0',
                            isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-brand-blue/20 text-[#93C5FD]'
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </NavLink>

                    {/* Tooltip when desktop sidebar is collapsed */}
                    {isCollapsed && !isMobileOpen && (
                      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-[#172033] text-white text-xs font-semibold rounded-lg shadow-xl border border-slate-700 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                        <div className="flex items-center gap-2">
                          <span>{item.label}</span>
                          {item.badge && (
                            <span className="px-1.5 py-0.2 rounded-full bg-brand-blue text-[10px] text-white font-bold">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer Area: User Profile & Collapse Toggle */}
        <div className="p-3 border-t border-[#1A294C] bg-[#0E162B] shrink-0 space-y-2">
          {/* User Profile Card with Logout CTA */}
          <div
            className={clsx(
              'flex items-center rounded-xl bg-white/5 border border-white/5 transition-all',
              isCollapsed && !isMobileOpen ? 'justify-center p-2' : 'p-2.5 gap-3'
            )}
          >
            <Avatar name={user?.name || 'User'} size="sm" status="online" />

            {(!isCollapsed || isMobileOpen) && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">{user?.name}</p>
                <p className="text-[10px] text-slate-400 truncate">
                  {user?.title || user?.roleLabel}
                </p>
              </div>
            )}

            {(!isCollapsed || isMobileOpen) && (
              <button
                type="button"
                onClick={logout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-brand-danger hover:bg-white/10 transition-colors focus:outline-none"
                title="Sign out of demo session"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Desktop Collapse / Expand Button */}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="w-full hidden lg:flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors focus:outline-none"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            ) : (
              <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                <ChevronLeft className="w-4 h-4" />
                <span>Collapse Sidebar</span>
              </div>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
