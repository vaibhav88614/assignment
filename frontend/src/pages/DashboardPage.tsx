import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  FileCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  ListChecks,
  UserCheck,
  Inbox,
  MessageSquare,
  Timer,
  ArrowUpRight,
  Sparkles,
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

type ReviewerFilter = 'all' | 'unclaimed' | 'mine' | 'completed';

function relativeTime(iso: string | null): string {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function daysBetween(iso: string | null): number | null {
  if (!iso) return null;
  const days = Math.floor(
    (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24)
  );
  return days;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<ReviewerFilter>('all');

  const isReviewer =
    user?.role === UserRole.REVIEWER || user?.role === UserRole.ADMIN;

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      setError('');
      try {
        if (user?.role === UserRole.INVESTOR) {
          const { data } = await api.get<VerificationRequestList>(
            '/verification/requests'
          );
          setRequests(data.items);
        } else {
          const { data } = await api.get<VerificationRequestList>(
            '/verification/review-queue?include_completed=true&page_size=100'
          );
          setRequests(data.items);
        }
      } catch (err: unknown) {
        setRequests([]);
        setError(
          (err as { response?: { data?: { detail?: string } } })?.response?.data
            ?.detail || 'Failed to load requests. Please make sure the backend is running.'
        );
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, [user]);

  const stats = useMemo(() => {
    const base = {
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
      unclaimed: requests.filter(
        (r) => !r.assigned_reviewer_id && r.status === RequestStatus.SUBMITTED
      ).length,
      mine: requests.filter((r) => r.assigned_reviewer_id === user?.id).length,
      infoRequested: requests.filter(
        (r) => r.status === RequestStatus.INFO_REQUESTED
      ).length,
    };
    return base;
  }, [requests, user?.id]);

  const filteredRequests = useMemo(() => {
    if (!isReviewer) return requests;
    switch (filter) {
      case 'unclaimed':
        return requests.filter(
          (r) => !r.assigned_reviewer_id && r.status === RequestStatus.SUBMITTED
        );
      case 'mine':
        return requests.filter((r) => r.assigned_reviewer_id === user?.id);
      case 'completed':
        return requests.filter((r) =>
          [
            RequestStatus.APPROVED,
            RequestStatus.DENIED,
            RequestStatus.EXPIRED,
          ].includes(r.status)
        );
      case 'all':
      default:
        return requests;
    }
  }, [requests, filter, isReviewer, user?.id]);

  if (loading) return <LoadingSpinner label="Loading your requests" />;

  const approvalRate =
    stats.approved + stats.denied > 0
      ? Math.round((stats.approved / (stats.approved + stats.denied)) * 100)
      : 0;

  // Investor stat cards (unchanged structure, refined visuals live on the page)
  const investorStatCards = [
    {
      label: 'Total',
      value: stats.total,
      icon: FileCheck,
      iconBg: 'bg-slate-100 text-slate-600',
      ring: '',
    },
    {
      label: 'Active',
      value: stats.active,
      icon: Clock,
      iconBg: 'bg-amber-100 text-amber-600',
      ring: 'ring-1 ring-amber-100',
    },
    {
      label: 'Approved',
      value: stats.approved,
      icon: CheckCircle2,
      iconBg: 'bg-emerald-100 text-emerald-600',
      ring: 'ring-1 ring-emerald-100',
    },
    {
      label: 'Denied',
      value: stats.denied,
      icon: XCircle,
      iconBg: 'bg-red-100 text-red-600',
      ring: 'ring-1 ring-red-100',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-8">
        <div>
          {isReviewer && (
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 bg-indigo-50 ring-1 ring-indigo-100 px-2 py-0.5 rounded-full mb-2">
              <Sparkles className="h-3 w-3" />
              Reviewer workspace
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            {user?.role === UserRole.INVESTOR
              ? 'My Verification Requests'
              : 'Review Dashboard'}
          </h1>
          <p className="text-slate-500 mt-1.5 text-sm">
            Welcome back,{' '}
            <span className="font-medium text-slate-700">{user?.first_name}</span>.{' '}
            {user?.role === UserRole.INVESTOR
              ? "Here's an overview of your verification requests."
              : stats.unclaimed > 0
              ? `You have ${stats.unclaimed} unclaimed request${
                  stats.unclaimed === 1 ? '' : 's'
                } waiting.`
              : 'Your queue is clear. Nice work.'}
          </p>
        </div>
        {user?.role === UserRole.INVESTOR ? (
          <Link
            to="/new-request"
            className="inline-flex items-center gap-1.5 bg-gradient-to-b from-indigo-500 to-indigo-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm hover:shadow-md hover:brightness-105 transition self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            New Request
          </Link>
        ) : (
          <Link
            to="/review-queue"
            className="inline-flex items-center gap-1.5 bg-gradient-to-b from-indigo-500 to-indigo-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm hover:shadow-md hover:brightness-105 transition self-start sm:self-auto"
          >
            <ListChecks className="h-4 w-4" />
            Open Review Queue
          </Link>
        )}
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* REVIEWER VIEW */}
      {isReviewer ? (
        <>
          {/* Reviewer KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <ReviewerKpi
              label="Unclaimed"
              value={stats.unclaimed}
              icon={Inbox}
              accent="from-orange-50 to-white"
              iconBg="bg-orange-100 text-orange-600"
              to="/review-queue?status_filter=SUBMITTED"
              hint="Submitted · needs a reviewer"
              highlight={stats.unclaimed > 0}
            />
            <ReviewerKpi
              label="Assigned to me"
              value={stats.mine}
              icon={UserCheck}
              accent="from-indigo-50 to-white"
              iconBg="bg-indigo-100 text-indigo-600"
              hint="Currently owned by you"
              onClick={() => setFilter('mine')}
            />
            <ReviewerKpi
              label="Awaiting info"
              value={stats.infoRequested}
              icon={MessageSquare}
              accent="from-amber-50 to-white"
              iconBg="bg-amber-100 text-amber-600"
              hint="Investors owe documents"
            />
            <ReviewerKpi
              label="Approval rate"
              value={`${approvalRate}%`}
              icon={CheckCircle2}
              accent="from-emerald-50 to-white"
              iconBg="bg-emerald-100 text-emerald-600"
              hint={`${stats.approved} approved · ${stats.denied} denied`}
            />
          </div>

          {/* Secondary summary strip */}
          <div className="card p-4 mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <SummaryStat
              label="Total in system"
              value={stats.total}
              dot="bg-slate-400"
            />
            <SummaryStat label="Active" value={stats.active} dot="bg-amber-500" />
            <SummaryStat
              label="Approved"
              value={stats.approved}
              dot="bg-emerald-500"
            />
            <SummaryStat label="Denied" value={stats.denied} dot="bg-red-500" />
          </div>

          {/* Filter chips */}
          <div className="flex items-center gap-2 mb-4 overflow-x-auto">
            {(
              [
                { key: 'all', label: 'All', count: stats.total },
                { key: 'unclaimed', label: 'Unclaimed', count: stats.unclaimed },
                { key: 'mine', label: 'My assignments', count: stats.mine },
                {
                  key: 'completed',
                  label: 'Completed',
                  count: stats.approved + stats.denied,
                },
              ] as const
            ).map(({ key, label, count }) => {
              const active = filter === key;
              return (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
                    active
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {label}
                  <span
                    className={`tabular-nums text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                      active
                        ? 'bg-white/15 text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* List */}
          <ReviewerList
            requests={filteredRequests}
            currentUserId={user?.id}
            filter={filter}
          />
        </>
      ) : (
        // INVESTOR VIEW
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {investorStatCards.map(({ label, value, icon: Icon, iconBg, ring }) => (
              <div
                key={label}
                className={`card p-5 flex items-center gap-4 ${ring}`}
              >
                <div
                  className={`h-11 w-11 rounded-xl flex items-center justify-center ${iconBg}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-semibold tracking-tight text-slate-900">
                    {value}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-slate-500 font-medium">
                    {label}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {requests.length === 0 ? (
            <div className="card p-14 text-center">
              <div className="mx-auto mb-5 h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center">
                <AlertCircle className="h-7 w-7 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1.5">
                No requests yet
              </h3>
              <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
                Start your accredited investor verification by creating a new request.
              </p>
              <Link
                to="/new-request"
                className="inline-flex items-center gap-1.5 bg-gradient-to-b from-indigo-500 to-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm hover:brightness-105 transition"
              >
                <Plus className="h-4 w-4" />
                Create New Request
              </Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              {requests.map((req) => (
                <Link
                  key={req.id}
                  to={`/requests/${req.id}`}
                  className="card card-hover block p-5 group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                        <h3 className="font-semibold text-slate-900">
                          {METHOD_LABELS[req.verification_method]}
                        </h3>
                        <StatusBadge status={req.status} />
                      </div>
                      <p className="text-xs text-slate-500">
                        {req.investor_type} &middot; Created{' '}
                        {formatDate(req.created_at)}
                        {req.submitted_at &&
                          ` · Submitted ${formatDate(req.submitted_at)}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      {req.expires_at && (
                        <span className="whitespace-nowrap">
                          Expires {formatDate(req.expires_at)}
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ————————————————— Reviewer helpers ————————————————— */

interface ReviewerKpiProps {
  label: string;
  value: number | string;
  icon: typeof Inbox;
  iconBg: string;
  accent: string;
  hint?: string;
  to?: string;
  onClick?: () => void;
  highlight?: boolean;
}

function ReviewerKpi({
  label,
  value,
  icon: Icon,
  iconBg,
  accent,
  hint,
  to,
  onClick,
  highlight,
}: ReviewerKpiProps) {
  const body = (
    <div
      className={`card p-5 bg-gradient-to-br ${accent} ${
        highlight ? 'ring-2 ring-orange-200' : ''
      } ${to || onClick ? 'card-hover cursor-pointer' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
            {label}
          </p>
          <p className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1 tabular-nums">
            {value}
          </p>
          {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
        </div>
        <span
          className={`inline-flex items-center justify-center h-10 w-10 rounded-xl ${iconBg}`}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
      {(to || onClick) && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-end text-[11px] font-medium text-indigo-600">
          {to ? 'Open queue' : 'Filter list'}
          <ArrowUpRight className="h-3 w-3 ml-1" />
        </div>
      )}
    </div>
  );

  if (to) return <Link to={to}>{body}</Link>;
  if (onClick)
    return (
      <button type="button" onClick={onClick} className="text-left w-full">
        {body}
      </button>
    );
  return body;
}

function SummaryStat({
  label,
  value,
  dot,
}: {
  label: string;
  value: number;
  dot: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-900 tabular-nums">
        {value}
      </span>
    </div>
  );
}

function ReviewerList({
  requests,
  currentUserId,
  filter,
}: {
  requests: VerificationRequest[];
  currentUserId?: string;
  filter: ReviewerFilter;
}) {
  if (requests.length === 0) {
    const emptyCopy: Record<ReviewerFilter, { title: string; body: string }> = {
      all: {
        title: 'No requests yet',
        body: 'Requests will appear here as investors submit them.',
      },
      unclaimed: {
        title: 'Nothing unclaimed',
        body: 'All submitted requests already have a reviewer.',
      },
      mine: {
        title: 'No requests assigned to you',
        body: 'Claim a request from the queue to see it here.',
      },
      completed: {
        title: 'No completed requests yet',
        body: 'Approved and denied requests will show here.',
      },
    };
    const copy = emptyCopy[filter];
    return (
      <div className="card p-14 text-center">
        <div className="mx-auto mb-5 h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center">
          <Inbox className="h-7 w-7 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-1.5">
          {copy.title}
        </h3>
        <p className="text-sm text-slate-500 max-w-sm mx-auto">{copy.body}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {requests.map((req) => {
        const mine = req.assigned_reviewer_id === currentUserId;
        const unclaimed =
          !req.assigned_reviewer_id && req.status === RequestStatus.SUBMITTED;
        const pendingDays = daysBetween(req.submitted_at);
        const isStale = pendingDays !== null && pendingDays >= 3;

        return (
          <Link
            key={req.id}
            to={`/review/${req.id}`}
            className="card card-hover block p-5 group"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <h3 className="font-semibold text-slate-900">
                    {METHOD_LABELS[req.verification_method]}
                  </h3>
                  <StatusBadge status={req.status} />
                  {mine && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 px-1.5 py-0.5 rounded-full">
                      <UserCheck className="h-3 w-3" />
                      Mine
                    </span>
                  )}
                  {unclaimed && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-orange-50 text-orange-700 ring-1 ring-orange-200 px-1.5 py-0.5 rounded-full">
                      <Inbox className="h-3 w-3" />
                      Unclaimed
                    </span>
                  )}
                  {isStale && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-red-50 text-red-700 ring-1 ring-red-200 px-1.5 py-0.5 rounded-full">
                      <Timer className="h-3 w-3" />
                      {pendingDays}d pending
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  {req.investor_type} &middot; Submitted{' '}
                  {req.submitted_at
                    ? relativeTime(req.submitted_at)
                    : formatDate(req.created_at)}
                  {req.info_deadline &&
                    req.status === RequestStatus.INFO_REQUESTED &&
                    ` · Deadline ${formatDate(req.info_deadline)}`}
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                {req.expires_at &&
                  req.status === RequestStatus.APPROVED && (
                    <span className="whitespace-nowrap">
                      Expires {formatDate(req.expires_at)}
                    </span>
                  )}
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition" />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
