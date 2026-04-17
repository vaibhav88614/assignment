import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { LogOut, ShieldCheck, Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
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
                <NavLink to="/dashboard" className={navLinkClass}>
                  Dashboard
                </NavLink>
                {user.role === UserRole.INVESTOR && (
                  <NavLink to="/new-request" className={navLinkClass}>
                    New Request
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
                <Link to="/dashboard" className="block px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-lg text-sm" onClick={() => setMobileOpen(false)}>Dashboard</Link>
                {user.role === UserRole.INVESTOR && (
                  <Link to="/new-request" className="block px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-lg text-sm" onClick={() => setMobileOpen(false)}>New Request</Link>
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
