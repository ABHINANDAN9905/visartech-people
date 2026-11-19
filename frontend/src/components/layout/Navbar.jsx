import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  Bell,
  Clock,
  ChevronDown,
  User,
  ShieldCheck,
  Settings,
  LogOut,
  ExternalLink,
  Search,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../common/Avatar';
import Badge from '../common/Badge';
import Dropdown from '../common/Dropdown';
import SearchInput from '../common/SearchInput';
import NotificationDropdown from '../notifications/NotificationDropdown';

export default function Navbar({
  onMobileToggle,
  onDesktopToggle,
}) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const isHRAdmin = user?.role === 'HR_ADMIN';

  // Determine current page title from path
  const routeTitles = {
    '/dashboard': isHRAdmin ? 'HR Admin Dashboard' : 'Employee Self-Service Dashboard',
    '/employees': 'Employee Directory',
    '/attendance': isHRAdmin ? 'Attendance & Shift Logs' : 'My Attendance & Punches',
    '/leaves': isHRAdmin ? 'Leave Management & Approvals' : 'My Leave Requests',
    '/tasks': isHRAdmin ? 'Tasks & Performance Tracking' : 'My Tasks & Objectives',
    '/payroll': 'Payroll & Salary Records',
    '/announcements': 'Company Announcements',
    '/feedback': 'Employee Feedback & Morale',
    '/notifications': 'Notifications Center',
    '/settings': 'System Settings',
    '/profile': 'My Employee Profile',
    '/design-system': 'Design System Showcase',
  };

  const currentTitle = routeTitles[location.pathname] || 'VISARTECH People';

  const userMenuItems = [
    {
      label: 'My Profile & Details',
      icon: User,
      onClick: () => navigate('/profile'),
    },
    {
      label: 'Security & Access',
      icon: ShieldCheck,
      onClick: () => navigate('/settings'),
    },
    {
      label: 'System Preferences',
      icon: Settings,
      onClick: () => navigate('/settings'),
    },
    { type: 'separator' },
    {
      label: 'Sign Out (Demo)',
      icon: LogOut,
      danger: true,
      onClick: () => {
        logout();
        navigate('/login', { replace: true });
      },
    },
  ];

  return (
    <header className="h-16 bg-white border-b border-brand-border sticky top-0 z-30 shadow-subtle shrink-0">
      <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Left: Mobile Toggle & Page Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onMobileToggle}
            className="p-2 rounded-xl text-slate-500 hover:text-brand-navy hover:bg-slate-100 lg:hidden focus:outline-none"
            aria-label="Open mobile navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs text-brand-text-secondary hidden sm:inline">VISARTECH /</span>
              <h1 className="text-sm sm:text-base font-bold text-brand-navy tracking-tight truncate">
                {currentTitle}
              </h1>
            </div>
          </div>
        </div>

        {/* Center: Search Field */}
        <div className="max-w-xs w-full hidden md:block">
          <SearchInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery('')}
            placeholder={isHRAdmin ? "Search records, staff, leaves..." : "Search my tasks, leaves..."}
            size="sm"
            shortcut="⌘K"
          />
        </div>

        {/* Right: Actions, Notifications, Timezone & User Profile */}
        <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
          {/* Chicago Timezone Indicator */}
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 border border-brand-border text-xs text-slate-500">
            <Clock className="w-3.5 h-3.5 text-brand-blue" />
            <span className="font-semibold text-brand-navy">CST</span>
            <span className="text-[11px] text-slate-400 font-mono">(America/Chicago)</span>
          </div>

          {/* Role Indicator Badge */}
          <Badge
            variant={isHRAdmin ? 'navy' : 'info'}
            size="sm"
            dot
            className="hidden sm:inline-flex uppercase tracking-wider text-[10px]"
          >
            {user?.roleLabel || user?.role}
          </Badge>

          {/* Dynamic Live Notifications Center */}
          <NotificationDropdown />

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          {/* User Profile Dropdown */}
          <Dropdown
            align="right"
            items={userMenuItems}
            trigger={
              <button
                type="button"
                className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-50 transition-colors text-left focus:outline-none"
                aria-label="User menu"
              >
                <Avatar name={user?.name || 'User'} size="sm" status="online" />
                <div className="hidden sm:block">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-brand-navy leading-none">
                      {user?.name || 'Demo User'}
                    </p>
                    <Badge
                      variant={isHRAdmin ? 'navy' : 'info'}
                      size="sm"
                      className="text-[9px] py-0 px-1 font-bold"
                    >
                      {isHRAdmin ? 'ADMIN' : 'STAFF'}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-brand-text-secondary mt-0.5 leading-none">
                    {user?.title || user?.roleLabel}
                  </p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
              </button>
            }
          />
        </div>
      </div>
    </header>
  );
}
