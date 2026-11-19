import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCircle2,
  CalendarCheck,
  CalendarX,
  CheckSquare,
  Megaphone,
  BadgeDollarSign,
  MessageSquare,
  Clock,
  ExternalLink,
  Check,
  Trash2,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getNotificationsForUser,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  fetchNotificationsFromBackend,
  fetchUnreadCountFromBackend,
  markNotificationReadBackend,
  markAllNotificationsReadBackend,
} from '../../services/notificationService';

export default function NotificationDropdown() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [notifications, setNotifications] = useState(() =>
    getNotificationsForUser(user)
  );
  const [unreadCount, setUnreadCount] = useState(() =>
    getUnreadCount(user)
  );

  useEffect(() => {
    let isMounted = true;
    async function syncBackendNotifications() {
      try {
        const live = await fetchNotificationsFromBackend();
        const unread = await fetchUnreadCountFromBackend();
        if (isMounted) {
          if (live && live.length > 0) setNotifications(getNotificationsForUser(user));
          if (typeof unread === 'number') setUnreadCount(unread);
        }
      } catch (err) {
        console.warn('Backend sync failed in NotificationDropdown:', err);
      }
    }
    syncBackendNotifications();

    const handleUpdate = () => {
      setNotifications(getNotificationsForUser(user));
      setUnreadCount(getUnreadCount(user));
    };

    window.addEventListener('notifications-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('notifications-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [user]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = async (notif) => {
    try {
      await markNotificationReadBackend(notif.id);
    } catch (e) {
      console.warn('Backend mark read error:', e);
    }
    markNotificationAsRead(notif.id);
    setIsOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const handleMarkAllRead = async (e) => {
    e.stopPropagation();
    try {
      await markAllNotificationsReadBackend(user?.role, user?.id);
    } catch (err) {
      console.warn('Backend mark all read error:', err);
    }
    markAllNotificationsAsRead(user);
  };

  const getIconForType = (type) => {
    switch (type) {
      case 'leave_approved':
        return <CalendarCheck className="w-4 h-4 text-emerald-600" />;
      case 'leave_rejected':
        return <CalendarX className="w-4 h-4 text-rose-600" />;
      case 'task_assigned':
        return <CheckSquare className="w-4 h-4 text-brand-blue" />;
      case 'payroll_published':
        return <BadgeDollarSign className="w-4 h-4 text-brand-navy" />;
      case 'announcement':
        return <Megaphone className="w-4 h-4 text-indigo-600" />;
      case 'feedback_response':
        return <MessageSquare className="w-4 h-4 text-amber-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-slate-500 hover:text-brand-navy hover:bg-slate-100 transition-colors focus:outline-none"
        aria-label="View notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-brand-blue text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-slate-300 ring-2 ring-white" />
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl shadow-xl bg-white ring-1 ring-slate-200 z-50 divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
          {/* Header */}
          <div className="p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-brand-navy">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[11px] font-semibold bg-brand-blue/10 text-brand-blue px-2 py-0.5 rounded-full">
                  {unreadCount} unread
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[11px] font-medium text-brand-blue hover:text-brand-navy flex items-center gap-1 transition"
              >
                <Check className="w-3 h-3" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <span>No notifications at this time.</span>
              </div>
            ) : (
              notifications.slice(0, 6).map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`p-3 text-left cursor-pointer transition flex items-start gap-3 hover:bg-slate-50 ${
                    !item.read ? 'bg-blue-50/40' : ''
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 mt-0.5">
                    {getIconForType(item.type)}
                  </div>

                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center justify-between gap-1">
                      <p
                        className={`text-xs truncate ${
                          !item.read ? 'font-bold text-brand-navy' : 'font-medium text-slate-700'
                        }`}
                      >
                        {item.title}
                      </p>
                      {!item.read && (
                        <span className="w-2 h-2 rounded-full bg-brand-blue shrink-0" />
                      )}
                    </div>

                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>

                    <p className="text-[10px] text-slate-400 flex items-center gap-1 pt-0.5">
                      <Clock className="w-3 h-3" />
                      <span>{item.formattedDate || 'Just now'}</span>
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer View All link */}
          <div className="p-2.5 bg-slate-50 rounded-b-2xl text-center">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate('/notifications');
              }}
              className="text-xs font-semibold text-brand-blue hover:text-brand-navy flex items-center justify-center gap-1.5 w-full py-1 transition"
            >
              <span>Open Notification Center</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
