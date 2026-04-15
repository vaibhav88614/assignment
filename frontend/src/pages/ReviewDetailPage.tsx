import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  FileText,
  PlayCircle,
} from 'lucide-react';
import api from '../api/client';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import MessageThread from '../components/messages/MessageThread';
import {
  RequestStatus,
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

  if (loading) return <LoadingSpinner />;
  if (!request) return <div className="p-8 text-center text-red-600">{error || 'Not found'}</div>;

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
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Queue
      </Link>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Request info + Documents */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {METHOD_LABELS[request.verification_method]}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  {request.investor_name} ({request.investor_email})
                </p>
                <p className="text-sm text-gray-500">
                  {request.investor_type} &middot; Submitted{' '}
                  {formatDate(request.submitted_at)}
                </p>
              </div>
              <StatusBadge status={request.status} />
            </div>

            {/* Action Buttons */}
            {canReview && (
              <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
                {needsClaim ? (
                  <button
                    onClick={() =>
                      handleTransition(RequestStatus.UNDER_REVIEW)
                    }
                    disabled={actionLoading}
                    className="inline-flex items-center gap-2 bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 disabled:opacity-50 transition text-sm font-medium"
                  >
                    <PlayCircle className="h-4 w-4" />
                    Claim & Start Review
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() =>
                        handleTransition(RequestStatus.APPROVED)
                      }
                      disabled={actionLoading}
                      className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition text-sm font-medium"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => setShowDeny(true)}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 transition text-sm font-medium"
                    >
                      <XCircle className="h-4 w-4" />
                      Deny
                    </button>
                    <button
                      onClick={() => setShowRequestInfo(true)}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-50 transition text-sm font-medium"
                    >
                      <AlertCircle className="h-4 w-4" />
                      Request More Info
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Deny Dialog */}
            {showDeny && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm font-medium text-red-800 mb-2">
                  Denial Reason (required):
                </p>
                <textarea
                  value={denialReason}
                  onChange={(e) => setDenialReason(e.target.value)}
                  className="w-full rounded-lg border border-red-300 px-3 py-2 text-sm focus:ring-2 focus:ring-red-500"
                  rows={3}
                  placeholder="Explain why this request is being denied..."
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() =>
                      handleTransition(RequestStatus.DENIED, denialReason)
                    }
                    disabled={!denialReason.trim() || actionLoading}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
                  >
                    Confirm Denial
                  </button>
                  <button
                    onClick={() => setShowDeny(false)}
                    className="border border-gray-300 px-4 py-2 rounded-lg text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Request Info Dialog */}
            {showRequestInfo && (
              <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-sm font-medium text-orange-800 mb-2">
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
                      className="text-xs bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full hover:bg-orange-200 transition"
                    >
                      {tmpl.label}
                    </button>
                  ))}
                </div>
                <textarea
                  value={infoMessage}
                  onChange={(e) => setInfoMessage(e.target.value)}
                  className="w-full rounded-lg border border-orange-300 px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
                  rows={4}
                  placeholder="Describe what additional documents or information you need..."
                />
                {/* Deadline selector */}
                <div className="mt-3 flex items-center gap-3">
                  <label className="text-sm font-medium text-orange-800">
                    Response deadline:
                  </label>
                  <select
                    value={deadlineHours}
                    onChange={(e) => setDeadlineHours(Number(e.target.value))}
                    className="rounded-lg border border-orange-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-orange-500"
                  >
                    <option value={24}>24 hours</option>
                    <option value={48}>48 hours</option>
                    <option value={72}>72 hours</option>
                    <option value={120}>5 days</option>
                    <option value={168}>7 days</option>
                  </select>
                </div>
                <p className="text-xs text-orange-600 mt-1">
                  If the investor doesn't respond within {deadlineHours} hours, the request will be automatically denied.
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
                    className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
                  >
                    Send Request ({deadlineHours}h deadline)
                  </button>
                  <button
                    onClick={() => setShowRequestInfo(false)}
                    className="border border-gray-300 px-4 py-2 rounded-lg text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Attestation */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Self-Attestation Data
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {request.self_attestation_data &&
                Object.entries(request.self_attestation_data).map(
                  ([key, val]) => (
                    <div key={key} className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">
                        {key.replace(/_/g, ' ')}
                      </p>
                      <p className="font-medium text-gray-900 mt-0.5">
                        {String(val)}
                      </p>
                    </div>
                  )
                )}
            </div>
          </div>

          {/* Documents */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Documents ({documents.length})
            </h2>
            {documents.length === 0 ? (
              <p className="text-sm text-gray-500">No documents uploaded.</p>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 bg-gray-50 rounded-lg p-3"
                  >
                    <FileText className="h-5 w-5 text-gray-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {doc.original_filename}
                      </p>
                      <p className="text-xs text-gray-500">
                        {DOCUMENT_TYPE_LABELS[doc.document_type]} &middot;{' '}
                        {formatFileSize(doc.file_size)} &middot;{' '}
                        {formatDate(doc.uploaded_at)}
                      </p>
                    </div>
                    <a
                      href={`/api/documents/download/${doc.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-700"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Messages */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 sticky top-20">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">
                Communication Thread
              </h2>
            </div>
            <MessageThread
              messages={messages}
              onSend={handleSendMessage}
              sending={sending}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
