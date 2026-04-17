import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { UserRole, NotificationType } from '../../types';
import type { AppNotification } from '../../types';
import { LogOut, ShieldCheck, Menu, X, Bell, CheckCheck, MessageSquare, CheckCircle2, XCircle, AlertCircle, Send, UserPlus } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

function notificationIcon(type: NotificationType) {
  switch (type) {
    case NotificationType.NEW_MESSAGE:
      return <MessageSquare className="h-4 w-4 text-indigo-500" />;
    case NotificationType.REQUEST_APPROVED:
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case NotificationType.REQUEST_DENIED:
      return <XCircle className="h-4 w-4 text-red-500" />;
    case NotificationType.INFO_REQUESTED:
      return <AlertCircle className="h-4 w-4 text-orange-500" />;
    case NotificationType.INFO_PROVIDED:
      return <Send className="h-4 w-4 text-cyan-500" />;
    case NotificationType.REQUEST_SUBMITTED:
      return <Send className="h-4 w-4 text-blue-500" />;
    case NotificationType.REQUEST_ASSIGNED:
      return <UserPlus className="h-4 w-4 text-amber-500" />;
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function Header() {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAllRead, markAsRead } = useNotifications();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    };
    if (bellOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [bellOpen]);

  const handleNotificationClick = async (n: AppNotification) => {
    if (!n.is_read) await markAsRead([n.id]);
    setBellOpen(false);
    if (n.request_id) {
      if (user?.role === UserRole.INVESTOR) {
        navigate(`/requests/${n.request_id}`);
      } else {
        navigate(`/review/${n.request_id}`);
      }
    }
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `relative text-sm font-medium transition-colors ${
      isActive
        ? 'text-indigo-600'
        : 'text-slate-600 hover:text-slate-900'
    } after:absolute after:-bottom-[22px] after:left-0 after:right-0 after:h-[2px] after:rounded-full ${
      isActive ? 'after:bg-indigo-600' : 'after:bg-transparent'
    }`;

  const roleStyles: Record<string, string> = {
    INVESTOR: 'bg-sky-50 text-sky-700 ring-sky-200',
    REVIEWER: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    ADMIN: 'bg-purple-50 text-purple-700 ring-purple-200',
  };

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link
            to="/"
            className="flex items-center gap-2.5 group"
            aria-label="AccredVerify home"
          >
            <span className="relative inline-flex items-center justify-center h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-sm ring-1 ring-indigo-500/20">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span className="text-lg font-semibold tracking-tight text-slate-900">
              AccredVerify
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-7">
            {!user && (
              <>
                <NavLink to="/" end className={navLinkClass}>
                  Home
                </NavLink>
                <NavLink to="/login" className={navLinkClass}>
                  Login
                </NavLink>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1.5 bg-gradient-to-b from-indigo-500 to-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm hover:shadow-md hover:brightness-105 transition"
                >
                  Get Started
                </Link>
              </>
            )}
            {user && (
              <>
                {user.role !== UserRole.INVESTOR && (
                  <NavLink to="/dashboard" className={navLinkClass}>
                    Dashboard
                  </NavLink>
                )}
                {(user.role === UserRole.REVIEWER ||
                  user.role === UserRole.ADMIN) && (
                  <NavLink to="/review-queue" className={navLinkClass}>
                    Review Queue
                  </NavLink>
                )}
                {user.role === UserRole.ADMIN && (
                  <NavLink to="/admin" className={navLinkClass}>
                    Admin
                  </NavLink>
                )}
                <div className="flex items-center gap-3 ml-3 pl-5 border-l border-slate-200">
                  {/* Notification Bell */}
                  <div className="relative" ref={bellRef}>
                    <button
                      onClick={() => setBellOpen((v) => !v)}
                      className="relative p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition"
                      aria-label="Notifications"
                    >
                      <Bell className="h-5 w-5" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 ring-2 ring-white">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </button>

                    {/* Dropdown */}
                    {bellOpen && (
                      <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-slate-200 shadow-xl z-50 overflow-hidden animate-fade-in">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                          <h3 className="text-sm font-semibold text-slate-900">
                            Notifications
                          </h3>
                          {unreadCount > 0 && (
                            <button
                              onClick={async () => { await markAllRead(); }}
                              className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                            >
                              <CheckCheck className="h-3.5 w-3.5" />
                              Mark all read
                            </button>
                          )}
                        </div>
                        <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                          {notifications.length === 0 ? (
                            <div className="px-4 py-8 text-center">
                              <Bell className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                              <p className="text-sm text-slate-400">No notifications yet</p>
                            </div>
                          ) : (
                            notifications.slice(0, 20).map((n) => (
                              <button
                                key={n.id}
                                onClick={() => handleNotificationClick(n)}
                                className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-slate-50 transition ${
                                  !n.is_read ? 'bg-indigo-50/40' : ''
                                }`}
                              >
                                <div className="mt-0.5 shrink-0">
                                  {notificationIcon(n.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className={`text-sm truncate ${!n.is_read ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                                      {n.title}
                                    </p>
                                    {!n.is_read && (
                                      <span className="h-2 w-2 rounded-full bg-indigo-500 shrink-0" />
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-500 truncate mt-0.5">
                                    {n.message}
                                  </p>
                                  <p className="text-[10px] text-slate-400 mt-1">
                                    {timeAgo(n.created_at)}
                                  </p>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 text-slate-700 flex items-center justify-center text-xs font-semibold ring-1 ring-slate-300">
                      {user.first_name?.[0]}
                      {user.last_name?.[0]}
                    </div>
                    <div className="flex flex-col leading-tight">
                      <span className="text-sm font-medium text-slate-800">
                        {user.first_name} {user.last_name}
                      </span>
                      <span
                        className={`inline-flex items-center self-start text-[10px] font-semibold tracking-wide px-1.5 py-0.5 rounded ring-1 ${
                          roleStyles[user.role] ??
                          'bg-slate-50 text-slate-600 ring-slate-200'
                        }`}
                      >
                        {user.role}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition"
                    title="Logout"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </>
            )}
          </nav>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 -mr-2 text-slate-600 rounded-lg hover:bg-slate-100"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="md:hidden pb-4 pt-2 space-y-1 border-t border-slate-100 animate-fade-in">
            {!user && (
              <>
                <Link to="/" className="block px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-lg text-sm" onClick={() => setMobileOpen(false)}>Home</Link>
                <Link to="/login" className="block px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-lg text-sm" onClick={() => setMobileOpen(false)}>Login</Link>
                <Link to="/register" className="block px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium" onClick={() => setMobileOpen(false)}>Get Started</Link>
              </>
            )}
            {user && (
              <>
                {user.role !== UserRole.INVESTOR && (
                  <Link to="/dashboard" className="block px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-lg text-sm" onClick={() => setMobileOpen(false)}>Dashboard</Link>
                )}
                {(user.role === UserRole.REVIEWER || user.role === UserRole.ADMIN) && (
                  <Link to="/review-queue" className="block px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-lg text-sm" onClick={() => setMobileOpen(false)}>Review Queue</Link>
                )}
                {user.role === UserRole.ADMIN && (
                  <Link to="/admin" className="block px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-lg text-sm" onClick={() => setMobileOpen(false)}>Admin</Link>
                )}
                <button onClick={() => { handleLogout(); setMobileOpen(false); }} className="block w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm">
                  Logout
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
