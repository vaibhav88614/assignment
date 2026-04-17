import { useEffect, useState } from 'react';
import {
  Users,
  FileCheck,
  Award,
  TrendingUp,
  UserCheck,
  ShieldCheck,
  Briefcase,
  LayoutDashboard,
  Users as UsersIcon,
  Award as AwardIcon,
} from 'lucide-react';
import api from '../api/client';
import LoadingSpinner from '../components/common/LoadingSpinner';
import type { AdminStats, User, VerificationLetter } from '../types';
import { RequestStatus, UserRole } from '../types';
import {
  formatDate,
  STATUS_COLORS,
  STATUS_DOTS,
  STATUS_LABELS,
} from '../utils/constants';

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [letters, setLetters] = useState<VerificationLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'letters'>(
    'overview'
  );

  useEffect(() => {
    const fetchAll = async () => {
      const [statsRes, usersRes, lettersRes] = await Promise.allSettled([
        api.get<AdminStats>('/admin/stats'),
        api.get<User[]>('/admin/users'),
        api.get<VerificationLetter[]>('/admin/letters'),
      ]);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
      if (usersRes.status === 'fulfilled') setUsers(usersRes.value.data);
      if (lettersRes.status === 'fulfilled') setLetters(lettersRes.value.data);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const [adminError, setAdminError] = useState<string | null>(null);

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    try {
      setAdminError(null);
      await api.patch(`/admin/users/${userId}`, {
        is_active: !currentActive,
      });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, is_active: !currentActive } : u
        )
      );
    } catch (err: unknown) {
      setAdminError(
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || 'Failed to update user status'
      );
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      setAdminError(null);
      await api.patch(`/admin/users/${userId}`, { role: newRole });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
    } catch (err: unknown) {
      setAdminError(
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || 'Failed to update user role'
      );
    }
  };

  if (loading) return <LoadingSpinner label="Loading admin data" />;

  const dismissError = () => setAdminError(null);

  const totalUsers = stats
    ? Object.values(stats.users_by_role).reduce((a, b) => a + b, 0)
    : 0;
  const totalRequests = stats
    ? Object.values(stats.requests_by_status).reduce((a, b) => a + b, 0)
    : 0;
  const activeRequests = stats
    ? [
        RequestStatus.SUBMITTED,
        RequestStatus.UNDER_REVIEW,
        RequestStatus.INFO_REQUESTED,
        RequestStatus.ADDITIONAL_INFO_PROVIDED,
      ].reduce((sum, s) => sum + (stats.requests_by_status[s] || 0), 0)
    : 0;
  const approvedRequests = stats
    ? stats.requests_by_status[RequestStatus.APPROVED] || 0
    : 0;
  const approvalRate =
    totalRequests > 0
      ? Math.round(
          ((stats?.requests_by_status[RequestStatus.APPROVED] || 0) /
            Math.max(
              1,
              (stats?.requests_by_status[RequestStatus.APPROVED] || 0) +
                (stats?.requests_by_status[RequestStatus.DENIED] || 0)
            )) *
            100
        )
      : 0;

  const roleMeta: Record<
    string,
    { icon: typeof Users; accent: string; bg: string; text: string }
  > = {
    INVESTOR: {
      icon: Briefcase,
      accent: 'bg-sky-500',
      bg: 'bg-sky-50',
      text: 'text-sky-700',
    },
    REVIEWER: {
      icon: UserCheck,
      accent: 'bg-indigo-500',
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
    },
    ADMIN: {
      icon: ShieldCheck,
      accent: 'bg-purple-500',
      bg: 'bg-purple-50',
      text: 'text-purple-700',
    },
  };

  const tabs = [
    { key: 'overview', label: 'Overview', icon: LayoutDashboard },
    { key: 'users', label: 'Users', icon: UsersIcon },
    { key: 'letters', label: 'Letters', icon: AwardIcon },
  ] as const;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Admin Dashboard
          </h1>
          <p className="text-slate-500 mt-1.5 text-sm">
            Platform-wide metrics, user management, and letter registry.
          </p>
        </div>
      </div>

      {adminError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <span className="text-sm text-red-700">{adminError}</span>
          <button onClick={dismissError} className="text-red-400 hover:text-red-600 text-xs ml-4">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100/70 rounded-xl p-1 mb-8 w-fit ring-1 ring-slate-200/70">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === key
                ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-6 animate-fade-in">
          {/* Top KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Total Users"
              value={totalUsers}
              icon={Users}
              iconBg="bg-indigo-100 text-indigo-600"
            />
            <KpiCard
              label="Total Requests"
              value={totalRequests}
              icon={FileCheck}
              iconBg="bg-slate-100 text-slate-600"
            />
            <KpiCard
              label="Active"
              value={activeRequests}
              icon={TrendingUp}
              iconBg="bg-amber-100 text-amber-600"
              sublabel="in progress"
            />
            <KpiCard
              label="Letters Issued"
              value={stats.total_letters_issued}
              icon={Award}
              iconBg="bg-emerald-100 text-emerald-600"
              sublabel={`${approvedRequests} approved`}
            />
          </div>

          {/* Two-column breakdown */}
          <div className="grid lg:grid-cols-2 gap-5">
            {/* Users by Role */}
            <div className="card p-6">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Users by Role
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Distribution across {totalUsers} total accounts
                  </p>
                </div>
                <span className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-indigo-50 text-indigo-600">
                  <Users className="h-4 w-4" />
                </span>
              </div>
              <div className="space-y-3">
                {Object.entries(stats.users_by_role).map(([role, count]) => {
                  const meta =
                    roleMeta[role] ?? {
                      icon: Users,
                      accent: 'bg-slate-400',
                      bg: 'bg-slate-100',
                      text: 'text-slate-700',
                    };
                  const pct =
                    totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0;
                  const Icon = meta.icon;
                  return (
                    <div key={role}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center justify-center h-6 w-6 rounded-md ${meta.bg} ${meta.text}`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                          <span className="text-sm font-medium text-slate-700">
                            {role}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-sm font-semibold text-slate-900 tabular-nums">
                            {count}
                          </span>
                          <span className="text-[11px] text-slate-400 tabular-nums">
                            {pct}%
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${meta.accent} rounded-full transition-all`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Requests by Status */}
            <div className="card p-6">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Requests by Status
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Current pipeline across {totalRequests} requests
                  </p>
                </div>
                <span className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600">
                  <FileCheck className="h-4 w-4" />
                </span>
              </div>
              <div className="space-y-2">
                {Object.entries(stats.requests_by_status)
                  .sort(([, a], [, b]) => b - a)
                  .map(([status, count]) => {
                    const st = status as RequestStatus;
                    const pct =
                      totalRequests > 0
                        ? Math.round((count / totalRequests) * 100)
                        : 0;
                    return (
                      <div
                        key={status}
                        className="flex items-center gap-3 py-1.5"
                      >
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium min-w-[140px] ${
                            STATUS_COLORS[st] ??
                            'bg-slate-50 text-slate-700 ring-1 ring-slate-200'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              STATUS_DOTS[st] ?? 'bg-slate-400'
                            }`}
                          />
                          {STATUS_LABELS[st] ?? status}
                        </span>
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              STATUS_DOTS[st] ?? 'bg-slate-400'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-slate-900 tabular-nums w-8 text-right">
                          {count}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Lower row: Letters + Approval rate */}
          <div className="grid lg:grid-cols-3 gap-5">
            <div className="card p-6 lg:col-span-2 bg-gradient-to-br from-indigo-50/60 via-white to-white">
              <div className="flex items-start gap-4">
                <span className="inline-flex items-center justify-center h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-sm">
                  <Award className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-slate-900">
                    Verification Letters
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 mb-4">
                    Formal letters issued to approved investors
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold tracking-tight text-slate-900 tabular-nums">
                      {stats.total_letters_issued}
                    </span>
                    <span className="text-sm text-slate-500">
                      total issued
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-base font-semibold text-slate-900">
                Approval Rate
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Of all decided requests
              </p>
              <div className="mt-5 flex items-center gap-4">
                {/* Circular gauge */}
                <div className="relative h-20 w-20 shrink-0">
                  <svg
                    viewBox="0 0 36 36"
                    className="h-20 w-20 -rotate-90"
                  >
                    <circle
                      cx="18"
                      cy="18"
                      r="15.5"
                      className="fill-none stroke-slate-100"
                      strokeWidth="3"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.5"
                      className="fill-none stroke-emerald-500 transition-all"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray={`${approvalRate} 100`}
                      pathLength={100}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-slate-900 tabular-nums">
                      {approvalRate}%
                    </span>
                  </div>
                </div>
                <div className="text-xs text-slate-500 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {stats.requests_by_status[RequestStatus.APPROVED] || 0}{' '}
                    approved
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    {stats.requests_by_status[RequestStatus.DENIED] || 0} denied
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users */}
      {activeTab === 'users' && (
        <div className="card overflow-hidden animate-fade-in">
          {users.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">
              No users found.
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50/60 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 text-slate-700 flex items-center justify-center text-xs font-semibold ring-1 ring-slate-300">
                          {u.first_name?.[0]}
                          {u.last_name?.[0]}
                        </div>
                        <span className="text-sm font-medium text-slate-900">
                          {u.first_name} {u.last_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {u.email}
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={u.role}
                        onChange={(e) =>
                          handleRoleChange(u.id, e.target.value as UserRole)
                        }
                        className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                      >
                        {Object.values(UserRole).map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleActive(u.id, u.is_active)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ring-1 transition ${
                          u.is_active
                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100'
                            : 'bg-red-50 text-red-700 ring-red-200 hover:bg-red-100'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            u.is_active ? 'bg-emerald-500' : 'bg-red-500'
                          }`}
                        />
                        {u.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {formatDate(u.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Letters */}
      {activeTab === 'letters' && (
        <div className="card overflow-hidden animate-fade-in">
          {letters.length === 0 ? (
            <div className="p-14 text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                <Award className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500">
                No letters issued yet.
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50/60 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Letter #
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Investor
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Issued
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Expires
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Validity
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {letters.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-6 py-4 text-sm font-mono font-semibold text-indigo-600">
                      {l.letter_number}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">
                      {l.investor_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {l.verification_method.replace(/_/g, ' ').toLowerCase()}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {formatDate(l.issued_at)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {formatDate(l.expires_at)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ring-1 ${
                          l.is_valid
                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                            : 'bg-slate-100 text-slate-500 ring-slate-200'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            l.is_valid ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        {l.is_valid ? 'Valid' : 'Expired'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

type IconType = typeof Users;

function KpiCard({
  label,
  value,
  icon: Icon,
  iconBg,
  sublabel,
}: {
  label: string;
  value: number;
  icon: IconType;
  iconBg: string;
  sublabel?: string;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
            {label}
          </p>
          <p className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1.5 tabular-nums">
            {value}
          </p>
          {sublabel && (
            <p className="text-xs text-slate-500 mt-1">{sublabel}</p>
          )}
        </div>
        <span
          className={`inline-flex items-center justify-center h-10 w-10 rounded-xl ${iconBg}`}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}
