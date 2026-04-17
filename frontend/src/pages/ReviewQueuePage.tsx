import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Filter, ChevronRight, Inbox, CheckCircle2, Clock } from 'lucide-react';
import api from '../api/client';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
  RequestStatus,
  type VerificationRequest,
  type VerificationRequestList,
} from '../types';
import { METHOD_LABELS, formatDate } from '../utils/constants';

type QueueTab = 'active' | 'completed';

export default function ReviewQueuePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<QueueTab>('active');
  const statusFilter = searchParams.get('status_filter') ?? '';

  const setStatusFilter = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set('status_filter', value);
    else next.delete('status_filter');
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (tab === 'completed') {
          params.set('include_completed', 'true');
        }
        if (statusFilter && tab === 'active') params.set('status_filter', statusFilter);
        const { data } = await api.get<VerificationRequestList>(
          `/verification/review-queue?${params.toString()}`
        );
        if (tab === 'completed') {
          setRequests(data.items.filter((r) =>
            [RequestStatus.APPROVED, RequestStatus.DENIED, RequestStatus.EXPIRED].includes(r.status)
          ));
        } else {
          setRequests(data.items);
        }
      } catch {
        // handle error
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [statusFilter, tab]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Review Queue
          </h1>
          <p className="text-slate-500 mt-1.5 text-sm">
            {tab === 'active' ? 'Verification requests pending reviewer action.' : 'Completed verification requests.'}
          </p>
        </div>
        {tab === 'active' && (
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm bg-transparent focus:outline-none text-slate-700 pr-1"
            >
              <option value="">All Active</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="INFO_REQUESTED">Info Requested</option>
              <option value="ADDITIONAL_INFO_PROVIDED">Info Provided</option>
            </select>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit">
        {([
          { key: 'active' as QueueTab, label: 'Active', icon: Clock },
          { key: 'completed' as QueueTab, label: 'Completed', icon: CheckCircle2 },
        ]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition ${
              tab === key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner label="Loading queue" />
      ) : requests.length === 0 ? (
        <div className="card p-14 text-center">
          <div className="mx-auto mb-5 h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center">
            <Inbox className="h-7 w-7 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1">
            {tab === 'completed' ? 'No completed requests' : 'Queue is empty'}
          </h3>
          <p className="text-sm text-slate-500">
            {tab === 'completed' ? 'Approved and denied requests will appear here.' : 'No requests matching this filter.'}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50/60 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Method
                </th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  {tab === 'completed' ? 'Outcome' : 'Status'}
                </th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  {tab === 'completed' ? 'Decision Date' : 'Submitted'}
                </th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Reviewer
                </th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map((req) => (
                <tr
                  key={req.id}
                  className="hover:bg-slate-50/60 transition group"
                >
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">
                    {METHOD_LABELS[req.verification_method]}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {req.investor_type}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={req.status} />
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {tab === 'completed' ? formatDate(req.reviewed_at) : formatDate(req.submitted_at)}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {req.assigned_reviewer_id ? (
                      <span className="inline-flex items-center gap-1.5 text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Assigned
                      </span>
                    ) : (
                      <span className="text-slate-400">Unassigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      to={`/review/${req.id}`}
                      className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-medium text-sm group-hover:translate-x-0.5 transition"
                    >
                      Review
                      <ChevronRight className="h-4 w-4" />
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
