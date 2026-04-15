import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { LogOut, Shield, Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-indigo-600" />
            <span className="text-xl font-bold text-gray-900">
              AccredVerify
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            {!user && (
              <>
                <Link to="/" className="text-gray-600 hover:text-gray-900">
                  Home
                </Link>
                <Link
                  to="/login"
                  className="text-gray-600 hover:text-gray-900"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
                >
                  Get Started
                </Link>
              </>
            )}
            {user && (
              <>
                <Link
                  to="/dashboard"
                  className="text-gray-600 hover:text-gray-900"
                >
                  Dashboard
                </Link>
                {user.role === UserRole.INVESTOR && (
                  <Link
                    to="/new-request"
                    className="text-gray-600 hover:text-gray-900"
                  >
                    New Request
                  </Link>
                )}
                {(user.role === UserRole.REVIEWER ||
                  user.role === UserRole.ADMIN) && (
                  <Link
                    to="/review-queue"
                    className="text-gray-600 hover:text-gray-900"
                  >
                    Review Queue
                  </Link>
                )}
                {user.role === UserRole.ADMIN && (
                  <Link
                    to="/admin"
                    className="text-gray-600 hover:text-gray-900"
                  >
                    Admin
                  </Link>
                )}
                <div className="flex items-center gap-3 ml-4 pl-4 border-l border-gray-200">
                  <span className="text-sm text-gray-500">
                    {user.first_name} {user.last_name}
                  </span>
                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                    {user.role}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="text-gray-400 hover:text-gray-600"
                    title="Logout"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              </>
            )}
          </nav>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-gray-600"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="md:hidden pb-4 space-y-2">
            {!user && (
              <>
                <Link to="/" className="block px-3 py-2 text-gray-600 hover:bg-gray-50 rounded" onClick={() => setMobileOpen(false)}>Home</Link>
                <Link to="/login" className="block px-3 py-2 text-gray-600 hover:bg-gray-50 rounded" onClick={() => setMobileOpen(false)}>Login</Link>
                <Link to="/register" className="block px-3 py-2 bg-indigo-600 text-white rounded" onClick={() => setMobileOpen(false)}>Get Started</Link>
              </>
            )}
            {user && (
              <>
                <Link to="/dashboard" className="block px-3 py-2 text-gray-600 hover:bg-gray-50 rounded" onClick={() => setMobileOpen(false)}>Dashboard</Link>
                {user.role === UserRole.INVESTOR && (
                  <Link to="/new-request" className="block px-3 py-2 text-gray-600 hover:bg-gray-50 rounded" onClick={() => setMobileOpen(false)}>New Request</Link>
                )}
                {(user.role === UserRole.REVIEWER || user.role === UserRole.ADMIN) && (
                  <Link to="/review-queue" className="block px-3 py-2 text-gray-600 hover:bg-gray-50 rounded" onClick={() => setMobileOpen(false)}>Review Queue</Link>
                )}
                {user.role === UserRole.ADMIN && (
                  <Link to="/admin" className="block px-3 py-2 text-gray-600 hover:bg-gray-50 rounded" onClick={() => setMobileOpen(false)}>Admin</Link>
                )}
                <button onClick={() => { handleLogout(); setMobileOpen(false); }} className="block w-full text-left px-3 py-2 text-red-600 hover:bg-gray-50 rounded">
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
