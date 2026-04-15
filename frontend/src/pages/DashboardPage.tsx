import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  FileCheck,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
  RequestStatus,
  UserRole,
  type VerificationRequest,
  type VerificationRequestList,
} from '../types';
import { METHOD_LABELS, formatDate } from '../utils/constants';

export default function DashboardPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        if (user?.role === UserRole.INVESTOR) {
          const { data } = await api.get<VerificationRequestList>(
            '/verification/requests'
          );
          setRequests(data.items);
        } else {
          const { data } = await api.get<VerificationRequestList>(
            '/verification/review-queue'
          );
          setRequests(data.items);
        }
      } catch {
        // Handle error
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, [user]);

  if (loading) return <LoadingSpinner />;

  const stats = {
    total: requests.length,
    active: requests.filter((r) =>
      [
        RequestStatus.SUBMITTED,
        RequestStatus.UNDER_REVIEW,
        RequestStatus.INFO_REQUESTED,
        RequestStatus.ADDITIONAL_INFO_PROVIDED,
      ].includes(r.status)
    ).length,
    approved: requests.filter((r) => r.status === RequestStatus.APPROVED).length,
    denied: requests.filter((r) => r.status === RequestStatus.DENIED).length,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {user?.role === UserRole.INVESTOR
              ? 'My Verification Requests'
              : 'Review Dashboard'}
          </h1>
          <p className="text-gray-600 mt-1">
            Welcome back, {user?.first_name}
          </p>
        </div>
        {user?.role === UserRole.INVESTOR && (
          <Link
            to="/new-request"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition font-medium"
          >
            <Plus className="h-5 w-5" />
            New Request
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total', value: stats.total, icon: FileCheck, color: 'text-gray-600' },
          { label: 'Active', value: stats.active, icon: Clock, color: 'text-yellow-600' },
          { label: 'Approved', value: stats.approved, icon: CheckCircle, color: 'text-green-600' },
          { label: 'Denied', value: stats.denied, icon: XCircle, color: 'text-red-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4"
          >
            <Icon className={`h-8 w-8 ${color}`} />
            <div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-sm text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Request List */}
      {requests.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No requests yet
          </h3>
          <p className="text-gray-600 mb-6">
            {user?.role === UserRole.INVESTOR
              ? 'Start your accredited investor verification by creating a new request.'
              : 'No requests pending review at the moment.'}
          </p>
          {user?.role === UserRole.INVESTOR && (
            <Link
              to="/new-request"
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
            >
              <Plus className="h-5 w-5" />
              Create New Request
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <Link
              key={req.id}
              to={
                user?.role === UserRole.INVESTOR
                  ? `/requests/${req.id}`
                  : `/review/${req.id}`
              }
              className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-200 hover:shadow-sm transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-gray-900">
                      {METHOD_LABELS[req.verification_method]}
                    </h3>
                    <StatusBadge status={req.status} />
                  </div>
                  <p className="text-sm text-gray-500">
                    {req.investor_type} &middot; Created{' '}
                    {formatDate(req.created_at)}
                    {req.submitted_at &&
                      ` &middot; Submitted ${formatDate(req.submitted_at)}`}
                  </p>
                </div>
                <div className="text-sm text-gray-500">
                  {req.expires_at && (
                    <span>Expires {formatDate(req.expires_at)}</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
