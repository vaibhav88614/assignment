import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Filter } from 'lucide-react';
import api from '../api/client';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
  RequestStatus,
  type VerificationRequest,
  type VerificationRequestList,
} from '../types';
import { METHOD_LABELS, formatDate } from '../utils/constants';

export default function ReviewQueuePage() {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (statusFilter) params.set('status_filter', statusFilter);
        const { data } = await api.get<VerificationRequestList>(
          `/verification/review-queue?${params.toString()}`
        );
        setRequests(data.items);
      } catch {
        // handle error
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [statusFilter]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Review Queue</h1>
          <p className="text-gray-600 mt-1">
            Verification requests pending review
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All Active</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="INFO_REQUESTED">Info Requested</option>
            <option value="ADDITIONAL_INFO_PROVIDED">Info Provided</option>
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500">No requests matching this filter.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Submitted
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Reviewer
                </th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {requests.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {METHOD_LABELS[req.verification_method]}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {req.investor_type}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={req.status} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatDate(req.submitted_at)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {req.assigned_reviewer_id ? 'Assigned' : '—'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      to={`/review/${req.id}`}
                      className="text-indigo-600 hover:text-indigo-700 font-medium text-sm"
                    >
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
