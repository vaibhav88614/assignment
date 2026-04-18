import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Download,
  FileText,
  PlayCircle,
  Mail,
  User as UserIcon,
  Calendar,
  UserPlus,
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/common/StatusBadge';
import StatusStepper from '../components/common/StatusStepper';
import LoadingSpinner from '../components/common/LoadingSpinner';
import MessageThread from '../components/messages/MessageThread';
import {
  RequestStatus,
  UserRole,
  type VerificationRequestDetail,
  type Document as DocType,
  type Message,
} from '../types';
import {
  METHOD_LABELS,
  DOCUMENT_TYPE_LABELS,
  formatDate,
  formatFileSize,
} from '../utils/constants';

export default function ReviewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [request, setRequest] = useState<VerificationRequestDetail | null>(null);
  const [documents, setDocuments] = useState<DocType[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [denialReason, setDenialReason] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [deadlineHours, setDeadlineHours] = useState(48);
  const [showDeny, setShowDeny] = useState(false);
  const [showRequestInfo, setShowRequestInfo] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [reviewers, setReviewers] = useState<{ id: string; first_name: string; last_name: string; email: string; active_reviews: number }[]>([]);
  const [selectedReviewer, setSelectedReviewer] = useState('');
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [reqRes, docsRes, msgsRes] = await Promise.all([
        api.get<VerificationRequestDetail>(`/verification/requests/${id}`),
        api.get<{ items: DocType[] }>(`/documents/${id}`),
        api.get<{ items: Message[] }>(`/messages/${id}`),
      ]);
      setRequest(reqRes.data);
      setDocuments(docsRes.data.items);
      setMessages(msgsRes.data.items);
    } catch {
      setError('Failed to load request');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Mark as read
  useEffect(() => {
    if (id) {
      localStorage.setItem(`lastSeen:${id}`, new Date().toISOString());
    }
  }, [id]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const { data } = await api.get<{ items: Message[] }>(`/messages/${id}`);
        setMessages(data.items);
      } catch {
        // silent
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [id]);

  const handleTransition = async (
    newStatus: RequestStatus,
    denialReasonText?: string,
    messageText?: string,
    deadlineHrs?: number
  ) => {
    setActionLoading(true);
    setError('');
    try {
      await api.post(`/verification/requests/${id}/transition`, {
        new_status: newStatus,
        denial_reason: denialReasonText || null,
        message: messageText || null,
        deadline_hours: deadlineHrs || null,
      });
      await fetchData();
      setShowDeny(false);
      setShowRequestInfo(false);
      setDenialReason('');
      setInfoMessage('');
      setDeadlineHours(48);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || 'Action failed'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendMessage = async (content: string) => {
    setSending(true);
    try {
      await api.post(`/messages/${id}`, { content });
      await fetchData();
    } catch {
      setError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleDownloadDoc = async (docId: string, filename: string) => {
    try {
      const response = await api.get(`/documents/download/${docId}`, {
        responseType: 'blob',
      });
      const blob = response.data as Blob;
      if (blob.type === 'application/json') {
        const text = await blob.text();
        const parsed = JSON.parse(text);
        setError(parsed.detail || 'Download failed');
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setError('Failed to download document');
    }
  };

  const handleShowAssign = async () => {
    setShowAssign(true);
    try {
      const { data } = await api.get<typeof reviewers>('/admin/reviewers');
      setReviewers(data);
      if (data.length > 0) {
        // Pre-select the reviewer with fewest active reviews
        const sorted = [...data].sort((a, b) => a.active_reviews - b.active_reviews);
        setSelectedReviewer(sorted[0].id);
      }
    } catch {
      setError('Failed to load reviewers');
    }
  };

  const handleAssignReviewer = async () => {
    if (!selectedReviewer) return;
    setActionLoading(true);
    setError('');
    try {
      await api.post(`/admin/requests/${id}/assign`, { reviewer_id: selectedReviewer });
      await fetchData();
      setShowAssign(false);
      setSelectedReviewer('');
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || 'Failed to assign reviewer'
      );
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <LoadingSpinner label="Loading request" />;
  if (!request)
    return (
      <div className="max-w-lg mx-auto mt-16 card p-8 text-center">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
        <p className="text-red-600 text-sm">{error || 'Request not found'}</p>
      </div>
    );

  const isAdmin = user?.role === UserRole.ADMIN;

  const canReview = [
    RequestStatus.SUBMITTED,
    RequestStatus.UNDER_REVIEW,
    RequestStatus.ADDITIONAL_INFO_PROVIDED,
  ].includes(request.status);

  const needsClaim =
    request.status === RequestStatus.SUBMITTED ||
    (request.status === RequestStatus.ADDITIONAL_INFO_PROVIDED &&
      !request.assigned_reviewer_id);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        to="/review-queue"
        className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-900 mb-5 text-sm font-medium transition group"
      >
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition" />
        Back to Queue
      </Link>

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2 animate-fade-in">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Request info + Documents */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div className="card p-6">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div className="min-w-0">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  {METHOD_LABELS[request.verification_method]}
                </h1>
                <div className="mt-3 space-y-1.5 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-3.5 w-3.5 text-slate-400" />
                    <span className="font-medium text-slate-800">
                      {request.investor_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    <span>{request.investor_email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>
                      {request.investor_type} &middot; Submitted{' '}
                      {formatDate(request.submitted_at)}
                    </span>
                  </div>
                </div>
              </div>
              <StatusBadge status={request.status} size="md" />
            </div>

            {/* Status Stepper */}
            <div className="mt-5 pt-5 border-t border-slate-100">
              <StatusStepper status={request.status} />
            </div>

            {/* Denial reason (if denied) */}
            {request.status === RequestStatus.DENIED && request.denial_reason && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                {request.denial_reason.startsWith('Automatically denied') && (
                  <div className="inline-flex items-center gap-1.5 mb-2 text-xs font-semibold bg-red-100 text-red-800 ring-1 ring-red-200 px-2 py-1 rounded-full">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Rejected due to missing the document deadline
                  </div>
                )}
                <p className="text-sm font-medium text-red-800">Denial Reason:</p>
                <p className="text-sm text-red-700 mt-1">{request.denial_reason}</p>
              </div>
            )}

            {/* Action Buttons */}
            {canReview && (
              <div className="flex flex-wrap gap-2.5 pt-5 border-t border-slate-100">
                {needsClaim ? (
                  isAdmin ? (
                    <button
                      onClick={handleShowAssign}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-2 bg-gradient-to-b from-amber-500 to-amber-600 text-white px-4 py-2 rounded-lg hover:brightness-105 disabled:opacity-50 transition text-sm font-medium shadow-sm"
                    >
                      <UserPlus className="h-4 w-4" />
                      Assign to Reviewer
                    </button>
                  ) : (
                    <button
                      onClick={() =>
                        handleTransition(RequestStatus.UNDER_REVIEW)
                      }
                      disabled={actionLoading}
                      className="inline-flex items-center gap-2 bg-gradient-to-b from-amber-500 to-amber-600 text-white px-4 py-2 rounded-lg hover:brightness-105 disabled:opacity-50 transition text-sm font-medium shadow-sm"
                    >
                      <PlayCircle className="h-4 w-4" />
                      Claim & Start Review
                    </button>
                  )
                ) : (
                  !isAdmin && (
                    <>
                      <button
                        onClick={() =>
                          handleTransition(RequestStatus.APPROVED)
                        }
                        disabled={actionLoading}
                        className="inline-flex items-center gap-2 bg-gradient-to-b from-emerald-500 to-emerald-600 text-white px-5 py-2.5 rounded-lg hover:brightness-105 disabled:opacity-50 transition text-sm font-semibold shadow-sm"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => setShowRequestInfo((v) => !v)}
                        disabled={actionLoading}
                        className="inline-flex items-center gap-2 border border-orange-300 bg-orange-50 text-orange-700 px-4 py-2 rounded-lg hover:bg-orange-100 disabled:opacity-50 transition text-sm font-medium"
                      >
                        <AlertCircle className="h-4 w-4" />
                        Request More Info
                      </button>
                      <button
                        onClick={() => setShowDeny((v) => !v)}
                        disabled={actionLoading}
                        className="inline-flex items-center gap-2 border border-red-200 text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 disabled:opacity-50 transition text-sm font-medium"
                      >
                        <XCircle className="h-4 w-4" />
                        Deny
                    </button>
                  </>
                  )
                )}
              </div>
            )}

            {/* Deny Dialog */}
            {showDeny && (
              <div className="mt-5 bg-red-50 border border-red-200 rounded-xl p-4 animate-fade-in">
                <p className="text-sm font-semibold text-red-800 mb-2">
                  Denial reason <span className="font-normal text-red-600">(required)</span>
                </p>
                <textarea
                  value={denialReason}
                  onChange={(e) => setDenialReason(e.target.value)}
                  className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm placeholder:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-300"
                  rows={3}
                  placeholder="Explain why this request is being denied..."
                />
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() =>
                      handleTransition(RequestStatus.DENIED, denialReason)
                    }
                    disabled={!denialReason.trim() || actionLoading}
                    className="bg-gradient-to-b from-red-500 to-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:brightness-105 disabled:opacity-50 shadow-sm"
                  >
                    Confirm Denial
                  </button>
                  <button
                    onClick={() => setShowDeny(false)}
                    className="border border-slate-200 bg-white text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Request Info Dialog */}
            {showRequestInfo && (
              <div className="mt-5 bg-orange-50 border border-orange-200 rounded-xl p-4 animate-fade-in">
                <p className="text-sm font-semibold text-orange-800 mb-2">
                  What additional information is needed?
                </p>
                {/* Quick templates */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {[
                    {
                      label: 'Invalid Documents',
                      text: `The documents you uploaded for your verification request are invalid or irrelevant. Please upload the required documents (e.g., tax returns, W-2 forms, brokerage statements, or CPA letter) within the deadline shown below, otherwise your request will be denied.`,
                    },
                    {
                      label: 'Incomplete Info',
                      text: 'The information provided is incomplete. Please upload additional supporting documents that clearly demonstrate your accredited investor status within the deadline shown below, or your request will be denied.',
                    },
                    {
                      label: 'Unreadable Docs',
                      text: 'One or more uploaded documents are unreadable or of poor quality. Please re-upload clear, legible copies within the deadline shown below, otherwise your request will be denied.',
                    },
                  ].map((tmpl) => (
                    <button
                      key={tmpl.label}
                      onClick={() => setInfoMessage(tmpl.text)}
                      className="text-xs bg-white border border-orange-200 text-orange-700 px-2.5 py-1 rounded-full hover:bg-orange-100 transition"
                    >
                      {tmpl.label}
                    </button>
                  ))}
                </div>
                <textarea
                  value={infoMessage}
                  onChange={(e) => setInfoMessage(e.target.value)}
                  className="w-full rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm placeholder:text-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300"
                  rows={4}
                  placeholder="Describe what additional documents or information you need..."
                />
                {/* Deadline selector */}
                <div className="mt-3 flex items-center gap-3 flex-wrap">
                  <label className="text-sm font-medium text-orange-800">
                    Response deadline
                  </label>
                  <select
                    value={deadlineHours}
                    onChange={(e) => setDeadlineHours(Number(e.target.value))}
                    className="rounded-lg border border-orange-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  >
                    <option value={24}>24 hours</option>
                    <option value={48}>48 hours</option>
                    <option value={72}>72 hours</option>
                    <option value={120}>5 days</option>
                    <option value={168}>7 days</option>
                  </select>
                </div>
                <p className="text-xs text-orange-600 mt-2">
                  If the investor doesn't respond within {deadlineHours} hours, the
                  request will be automatically denied.
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() =>
                      handleTransition(
                        RequestStatus.INFO_REQUESTED,
                        undefined,
                        infoMessage,
                        deadlineHours
                      )
                    }
                    disabled={!infoMessage.trim() || actionLoading}
                    className="bg-gradient-to-b from-orange-500 to-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:brightness-105 disabled:opacity-50 shadow-sm"
                  >
                    Send Request ({deadlineHours}h)
                  </button>
                  <button
                    onClick={() => setShowRequestInfo(false)}
                    className="border border-slate-200 bg-white text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Assign Reviewer Dialog (Admin only) */}
            {showAssign && (
              <div className="mt-5 bg-indigo-50 border border-indigo-200 rounded-xl p-4 animate-fade-in">
                <p className="text-sm font-semibold text-indigo-800 mb-3">
                  Assign a Reviewer
                </p>
                {reviewers.length === 0 ? (
                  <p className="text-sm text-indigo-600">Loading reviewers...</p>
                ) : (
                  <>
                    <div className="space-y-2 mb-3">
                      {reviewers
                        .sort((a, b) => a.active_reviews - b.active_reviews)
                        .map((rev) => (
                          <label
                            key={rev.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                              selectedReviewer === rev.id
                                ? 'bg-white border-indigo-400 ring-2 ring-indigo-200'
                                : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name="reviewer"
                              value={rev.id}
                              checked={selectedReviewer === rev.id}
                              onChange={() => setSelectedReviewer(rev.id)}
                              className="accent-indigo-600"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900">
                                {rev.first_name} {rev.last_name}
                              </p>
                              <p className="text-xs text-slate-500">{rev.email}</p>
                            </div>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              rev.active_reviews === 0
                                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                                : rev.active_reviews <= 3
                                ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                                : 'bg-red-50 text-red-700 ring-1 ring-red-200'
                            }`}>
                              {rev.active_reviews} active
                            </span>
                          </label>
                        ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleAssignReviewer}
                        disabled={!selectedReviewer || actionLoading}
                        className="bg-gradient-to-b from-indigo-500 to-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:brightness-105 disabled:opacity-50 shadow-sm"
                      >
                        Assign Reviewer
                      </button>
                      <button
                        onClick={() => setShowAssign(false)}
                        className="border border-slate-200 bg-white text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Attestation */}
          <div className="card p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">
              Self-Attestation Data
            </h2>
            <div className="grid sm:grid-cols-2 gap-2.5">
              {request.self_attestation_data &&
                Object.entries(request.self_attestation_data).map(
                  ([key, val]) => (
                    <div
                      key={key}
                      className="bg-slate-50/70 border border-slate-100 rounded-lg px-3.5 py-3"
                    >
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        {key.replace(/_/g, ' ')}
                      </p>
                      <p className="font-medium text-slate-900 mt-1 text-sm">
                        {String(val)}
                      </p>
                    </div>
                  )
                )}
            </div>
          </div>

          {/* Documents */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-900">
                Documents
              </h2>
              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {documents.length}
              </span>
            </div>
            {documents.length === 0 ? (
              <p className="text-sm text-slate-500">No documents uploaded.</p>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 bg-slate-50/60 hover:bg-slate-50 border border-slate-100 rounded-lg px-3.5 py-2.5 transition"
                  >
                    <div className="h-9 w-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {doc.original_filename}
                      </p>
                      <p className="text-xs text-slate-500">
                        {DOCUMENT_TYPE_LABELS[doc.document_type]} &middot;{' '}
                        {formatFileSize(doc.file_size)} &middot;{' '}
                        {formatDate(doc.uploaded_at)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDownloadDoc(doc.id, doc.original_filename)}
                      className="text-indigo-600 hover:text-indigo-700 p-1.5 rounded-lg hover:bg-indigo-50 transition"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Messages (only after claiming) */}
        {request.status !== RequestStatus.SUBMITTED && (
          <div className="lg:col-span-1">
            <div className="card sticky top-20 overflow-hidden">
              <div className="px-4 py-3.5 border-b border-slate-100 bg-slate-50/40">
                <h2 className="font-semibold text-slate-900 text-sm">
                  Communication Thread
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Messages and status updates between investor and reviewer
                </p>
              </div>
              <MessageThread
                messages={messages}
                onSend={handleSendMessage}
                sending={sending}
                readOnly={isAdmin}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
