import { useEffect, useState } from 'react';
import { Users, FileCheck, Award } from 'lucide-react';
import api from '../api/client';
import LoadingSpinner from '../components/common/LoadingSpinner';
import type { AdminStats, User, VerificationLetter } from '../types';
import { UserRole } from '../types';
import { formatDate } from '../utils/constants';

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
      try {
        const [statsRes, usersRes, lettersRes] = await Promise.all([
          api.get<AdminStats>('/admin/stats'),
          api.get<User[]>('/admin/users'),
          api.get<VerificationLetter[]>('/admin/letters'),
        ]);
        setStats(statsRes.data);
        setUsers(usersRes.data);
        setLetters(lettersRes.data);
      } catch {
        // handle error
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    try {
      await api.patch(`/admin/users/${userId}`, {
        is_active: !currentActive,
      });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, is_active: !currentActive } : u
        )
      );
    } catch {
      // handle error
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      await api.patch(`/admin/users/${userId}`, { role: newRole });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
    } catch {
      // handle error
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Admin Dashboard
      </h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-8 w-fit">
        {(['overview', 'users', 'letters'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition ${
              activeTab === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-6">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <Users className="h-8 w-8 text-indigo-600 mb-3" />
              <h3 className="text-sm text-gray-500">Users by Role</h3>
              <div className="mt-2 space-y-1">
                {Object.entries(stats.users_by_role).map(([role, count]) => (
                  <div
                    key={role}
                    className="flex justify-between text-sm"
                  >
                    <span className="text-gray-700">{role}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <FileCheck className="h-8 w-8 text-green-600 mb-3" />
              <h3 className="text-sm text-gray-500">Requests by Status</h3>
              <div className="mt-2 space-y-1">
                {Object.entries(stats.requests_by_status).map(
                  ([status, count]) => (
                    <div
                      key={status}
                      className="flex justify-between text-sm"
                    >
                      <span className="text-gray-700">{status}</span>
                      <span className="font-semibold">{count}</span>
                    </div>
                  )
                )}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <Award className="h-8 w-8 text-amber-600 mb-3" />
              <h3 className="text-sm text-gray-500">Letters Issued</h3>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats.total_letters_issued}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Users */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Active
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {u.first_name} {u.last_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {u.email}
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={u.role}
                      onChange={(e) =>
                        handleRoleChange(u.id, e.target.value as UserRole)
                      }
                      className="rounded border border-gray-300 px-2 py-1 text-xs"
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
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        u.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {u.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatDate(u.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Letters */}
      {activeTab === 'letters' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {letters.length === 0 ? (
            <p className="p-8 text-center text-gray-500">
              No letters issued yet.
            </p>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Letter #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Investor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Issued
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Expires
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Valid
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {letters.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-mono font-medium text-indigo-600">
                      {l.letter_number}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {l.investor_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {l.verification_method.replace(/_/g, ' ')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(l.issued_at)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(l.expires_at)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          l.is_valid
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
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
