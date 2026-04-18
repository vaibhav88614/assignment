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
  Mail,
  AlertTriangle,
  Eye,
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

function hasUnread(req: VerificationRequest): boolean {
  if (!req.last_message_at || req.message_count === 0) return false;
  const lastSeen = localStorage.getItem(`lastSeen:${req.id}`);
  if (!lastSeen) return true;
  return new Date(req.last_message_at).getTime() > new Date(lastSeen).getTime();
}

function isDeadlineDenial(reason: string | null): boolean {
  return !!reason && reason.startsWith('Automatically denied');
}

type ReviewerFilter = 'all' | 'unclaimed' | 'mine' | 'accepted' | 'rejected' | 'info_requested' | 'under_review';

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

type InvestorFilter = 'all' | 'active' | 'approved' | 'denied';

export default function DashboardPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<ReviewerFilter>('all');
  const [investorFilter, setInvestorFilter] = useState<InvestorFilter>('all');

  const isReviewer =
    user?.role === UserRole.REVIEWER || user?.role === UserRole.ADMIN;

  // Expose unread count for Header polling
  const unreadCount = useMemo(
    () => requests.filter(hasUnread).length,
    [requests]
  );

  // Store unread count so Header can read it
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('unread-count', { detail: unreadCount }));
  }, [unreadCount]);

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
      underReview: requests.filter(
        (r) => r.status === RequestStatus.UNDER_REVIEW
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
      case 'accepted':
        return requests.filter((r) => r.status === RequestStatus.APPROVED);
      case 'rejected':
        return requests.filter((r) => r.status === RequestStatus.DENIED);
      case 'info_requested':
        return requests.filter((r) => r.status === RequestStatus.INFO_REQUESTED);
      case 'under_review':
        return requests.filter((r) => r.status === RequestStatus.UNDER_REVIEW);
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

  const denialRate =
    stats.approved + stats.denied > 0
      ? Math.round((stats.denied / (stats.approved + stats.denied)) * 100)
      : 0;

  // Filtered investor requests
  const investorFiltered = (() => {
    switch (investorFilter) {
      case 'active':
        return requests.filter((r) =>
          [RequestStatus.SUBMITTED, RequestStatus.UNDER_REVIEW, RequestStatus.INFO_REQUESTED, RequestStatus.ADDITIONAL_INFO_PROVIDED].includes(r.status)
        );
      case 'approved':
        return requests.filter((r) => r.status === RequestStatus.APPROVED);
      case 'denied':
        return requests.filter((r) => r.status === RequestStatus.DENIED);
      default:
        return requests;
    }
  })();

  // Investor stat cards — now clickable
  const investorStatCards: { label: string; value: number; icon: typeof FileCheck; iconBg: string; ring: string; filterKey: InvestorFilter }[] = [
    {
      label: 'Total',
      value: stats.total,
      icon: FileCheck,
      iconBg: 'bg-slate-100 text-slate-600',
      ring: '',
      filterKey: 'all',
    },
    {
      label: 'Active',
      value: stats.active,
      icon: Clock,
      iconBg: 'bg-amber-100 text-amber-600',
      ring: 'ring-1 ring-amber-100',
      filterKey: 'active' as InvestorFilter,
    },
    {
      label: 'Approved',
      value: stats.approved,
      icon: CheckCircle2,
      iconBg: 'bg-emerald-100 text-emerald-600',
      ring: 'ring-1 ring-emerald-100',
      filterKey: 'approved' as InvestorFilter,
    },
    {
      label: 'Denied',
      value: stats.denied,
      icon: XCircle,
      iconBg: 'bg-red-100 text-red-600',
      ring: 'ring-1 ring-red-100',
      filterKey: 'denied' as InvestorFilter,
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
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
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
            {user?.role !== UserRole.ADMIN && (
              <ReviewerKpi
                label="Assigned to me"
                value={stats.mine}
                icon={UserCheck}
                accent="from-indigo-50 to-white"
                iconBg="bg-indigo-100 text-indigo-600"
                hint="Currently owned by you"
                onClick={() => setFilter('mine')}
              />
            )}
            <ReviewerKpi
              label="Under Review"
              value={stats.underReview}
              icon={Eye}
              accent="from-blue-50 to-white"
              iconBg="bg-blue-100 text-blue-600"
              hint="Currently being reviewed"
              onClick={() => setFilter('under_review')}
            />
            <ReviewerKpi
              label="Awaiting info"
              value={stats.infoRequested}
              icon={MessageSquare}
              accent="from-amber-50 to-white"
              iconBg="bg-amber-100 text-amber-600"
              hint="Investors owe documents"
              onClick={() => setFilter('info_requested')}
            />
            {user?.role === UserRole.ADMIN && (
              <>
                <ReviewerKpi
                  label="Approval rate"
                  value={`${approvalRate}%`}
                  icon={CheckCircle2}
                  accent="from-emerald-50 to-white"
                  iconBg="bg-emerald-100 text-emerald-600"
                  hint={`${stats.approved} approved`}
                  onClick={() => setFilter('accepted')}
                />
                <ReviewerKpi
                  label="Denial rate"
                  value={`${denialRate}%`}
                  icon={XCircle}
                  accent="from-red-50 to-white"
                  iconBg="bg-red-100 text-red-600"
                  hint={`${stats.denied} denied`}
                  onClick={() => setFilter('rejected')}
                />
              </>
            )}
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
                { key: 'all' as ReviewerFilter, label: 'All', count: stats.total },
                { key: 'unclaimed' as ReviewerFilter, label: 'Unclaimed', count: stats.unclaimed },
                ...(user?.role !== UserRole.ADMIN ? [{ key: 'mine' as ReviewerFilter, label: 'My assignments', count: stats.mine }] : []),
                { key: 'under_review' as ReviewerFilter, label: 'Under Review', count: stats.underReview },
                { key: 'info_requested' as ReviewerFilter, label: 'Awaiting Info', count: stats.infoRequested },
                { key: 'accepted' as ReviewerFilter, label: 'Accepted', count: stats.approved },
                { key: 'rejected' as ReviewerFilter, label: 'Rejected', count: stats.denied },
              ]
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
            filter={filter}
          />
        </>
      ) : (
        // INVESTOR VIEW
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {investorStatCards.map(({ label, value, icon: Icon, iconBg, filterKey }) => {
              const active = investorFilter === filterKey;
              return (
                <button
                  key={label}
                  onClick={() => setInvestorFilter(filterKey)}
                  className={`card p-5 flex items-center gap-4 text-left transition-all cursor-pointer ${
                    active
                      ? 'ring-2 ring-indigo-400 shadow-md'
                      : 'hover:shadow-sm hover:ring-1 hover:ring-slate-200'
                  }`}
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
                </button>
              );
            })}
          </div>

          {/* Active filter label */}
          {investorFilter !== 'all' && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-medium text-slate-500">
                Showing: <span className="text-slate-800 capitalize">{investorFilter}</span> ({investorFiltered.length})
              </span>
              <button
                onClick={() => setInvestorFilter('all')}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Clear filter
              </button>
            </div>
          )}

          {investorFiltered.length === 0 ? (
            <div className="card p-14 text-center">
              <div className="mx-auto mb-5 h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center">
                <AlertCircle className="h-7 w-7 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1.5">
                {investorFilter === 'all' ? 'No requests yet' : `No ${investorFilter} requests`}
              </h3>
              <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
                {investorFilter === 'all'
                  ? 'Start your accredited investor verification by creating a new request.'
                  : 'Try a different filter or create a new request.'}
              </p>
              {investorFilter === 'all' && (
                <Link
                  to="/new-request"
                  className="inline-flex items-center gap-1.5 bg-gradient-to-b from-indigo-500 to-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm hover:brightness-105 transition"
                >
                  <Plus className="h-4 w-4" />
                  Create New Request
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {investorFiltered.map((req) => {
                const unread = hasUnread(req);
                return (
                  <Link
                    key={req.id}
                    to={`/requests/${req.id}`}
                    className={`card card-hover block p-5 group ${unread ? 'ring-1 ring-indigo-200 bg-indigo-50/30' : ''}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                          <h3 className="font-semibold text-slate-900">
                            {METHOD_LABELS[req.verification_method]}
                          </h3>
                          <StatusBadge status={req.status} />
                          {req.status === RequestStatus.DENIED && isDeadlineDenial(req.denial_reason) && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-red-50 text-red-700 ring-1 ring-red-200 px-1.5 py-0.5 rounded-full">
                              <AlertTriangle className="h-3 w-3" />
                              Rejected due to missing the document deadline
                            </span>
                          )}
                          {unread && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200 px-1.5 py-0.5 rounded-full">
                              <Mail className="h-3 w-3" />
                              New message
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          {req.investor_type} &middot; Created{' '}
                          {formatDate(req.created_at)}
                          {req.submitted_at &&
                            ` · Submitted ${formatDate(req.submitted_at)}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        {req.status === RequestStatus.APPROVED && req.expires_at && (
                          <span className="whitespace-nowrap">
                            Expires {formatDate(req.expires_at)}
                          </span>
                        )}
                        {req.status === RequestStatus.INFO_REQUESTED && req.info_deadline && (
                          <span className="inline-flex items-center gap-1 whitespace-nowrap text-orange-600 font-medium">
                            <Clock className="h-3 w-3" />
                            Deadline {formatDate(req.info_deadline)}
                          </span>
                        )}
                        {unread && (
                          <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 animate-pulse shrink-0" />
                        )}
                        <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition" />
                      </div>
                    </div>
                  </Link>
                );
              })}
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
  filter,
}: {
  requests: VerificationRequest[];
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
      accepted: {
        title: 'No accepted requests yet',
        body: 'Approved requests will show here.',
      },
      rejected: {
        title: 'No rejected requests yet',
        body: 'Denied requests will show here.',
      },
      info_requested: {
        title: 'No requests awaiting info',
        body: 'Requests waiting for investor response will appear here.',
      },
      under_review: {
        title: 'No requests under review',
        body: 'Requests currently being reviewed will appear here.',
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
        const unclaimed =
          !req.assigned_reviewer_id && req.status === RequestStatus.SUBMITTED;
        const pendingDays = daysBetween(req.submitted_at);
        const isStale = pendingDays !== null && pendingDays >= 3 && req.status === RequestStatus.INFO_REQUESTED;
        const unread = hasUnread(req);
        const isCompleted = [RequestStatus.APPROVED, RequestStatus.DENIED, RequestStatus.EXPIRED].includes(req.status);

        return (
          <Link
            key={req.id}
            to={`/review/${req.id}`}
            className={`card card-hover block p-5 group ${unread ? 'ring-1 ring-indigo-200 bg-indigo-50/30' : ''}`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <h3 className="font-semibold text-slate-900">
                    {METHOD_LABELS[req.verification_method]}
                  </h3>
                  <StatusBadge status={req.status} />
                  {req.status === RequestStatus.DENIED && isDeadlineDenial(req.denial_reason) && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-red-50 text-red-700 ring-1 ring-red-200 px-1.5 py-0.5 rounded-full">
                      <AlertTriangle className="h-3 w-3" />
                      Rejected due to missing the document deadline
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
                  {unread && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200 px-1.5 py-0.5 rounded-full">
                      <Mail className="h-3 w-3" />
                      New message
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
                  {isCompleted && req.reviewed_at &&
                    ` · Decided ${formatDate(req.reviewed_at)}`}
                  {isCompleted && req.denial_reason &&
                    ` · Reason: ${req.denial_reason.substring(0, 50)}${req.denial_reason.length > 50 ? '…' : ''}`}
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                {req.expires_at &&
                  req.status === RequestStatus.APPROVED && (
                    <span className="whitespace-nowrap">
                      Expires {formatDate(req.expires_at)}
                    </span>
                  )}
                {unread && (
                  <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 animate-pulse shrink-0" />
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
