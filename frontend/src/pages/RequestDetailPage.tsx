import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  FileText,
  Trash2,
  Info,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import api from '../api/client';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import FileUpload from '../components/documents/FileUpload';
import MessageThread from '../components/messages/MessageThread';
import {
  RequestStatus,
  DocumentType,
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

function useCountdown(deadline: string | null) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    if (!deadline) {
      setTimeLeft('');
      return;
    }
    const update = () => {
      const now = Date.now();
      const end = new Date(deadline).getTime();
      const diff = end - now;
      if (diff <= 0) {
        setTimeLeft('Expired');
        setIsExpired(true);
        setIsUrgent(true);
        return;
      }
      setIsExpired(false);
      setIsUrgent(diff < 12 * 60 * 60 * 1000); // < 12 hours
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      if (hours >= 24) {
        const days = Math.floor(hours / 24);
        const remHours = hours % 24;
        setTimeLeft(`${days}d ${remHours}h ${minutes}m remaining`);
      } else {
        setTimeLeft(`${hours}h ${minutes}m remaining`);
      }
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [deadline]);

  return { timeLeft, isExpired, isUrgent };
}

function InfoRequestedBanner({
  infoDeadline,
  onProvideInfo,
}: {
  infoDeadline: string | null;
  onProvideInfo: (message?: string) => void;
}) {
  const { timeLeft, isExpired, isUrgent } = useCountdown(infoDeadline);
  const [responseMessage, setResponseMessage] = useState('');

  const bgClass = isExpired
    ? 'bg-red-50 border-red-300'
    : isUrgent
    ? 'bg-red-50 border-red-200'
    : 'bg-orange-50 border-orange-200';
  const iconColor = isExpired || isUrgent ? 'text-red-600' : 'text-orange-600';
  const textColor = isExpired || isUrgent ? 'text-red-800' : 'text-orange-800';
  const subColor = isExpired || isUrgent ? 'text-red-700' : 'text-orange-700';

  return (
    <div className={`mt-4 border rounded-lg p-4 ${bgClass}`}>
      <div className="flex items-start gap-3">
        {isExpired ? (
          <AlertTriangle className={`h-5 w-5 ${iconColor} mt-0.5`} />
        ) : (
          <Info className={`h-5 w-5 ${iconColor} mt-0.5`} />
        )}
        <div className="flex-1">
          <p className={`text-sm font-medium ${textColor}`}>
            {isExpired
              ? 'Deadline Expired — Action Required'
              : 'Additional Information Requested'}
          </p>
          {infoDeadline && (
            <div
              className={`inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
                isExpired
                  ? 'bg-red-100 text-red-800'
                  : isUrgent
                  ? 'bg-red-100 text-red-700'
                  : 'bg-orange-100 text-orange-700'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              {timeLeft}
              {!isExpired && (
                <span className="font-normal">
                  {' '}
                  (by{' '}
                  {new Date(infoDeadline).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                  )
                </span>
              )}
            </div>
          )}
          <p className={`text-sm ${subColor} mt-2`}>
            {isExpired
              ? 'The deadline to provide the requested information has passed. Your request may be automatically denied.'
              : 'Upload additional documents in the section below and/or provide a written response, then click "Submit Additional Info".'}
          </p>
          {!isExpired && (
            <div className="mt-3 space-y-3">
              <textarea
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                placeholder="Type your response message here (optional)..."
                rows={3}
                className="w-full rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm placeholder:text-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300"
              />
              <button
                onClick={() => onProvideInfo(responseMessage)}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition text-sm font-medium"
              >
                Submit Additional Info
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [request, setRequest] = useState<VerificationRequestDetail | null>(null);
  const [documents, setDocuments] = useState<DocType[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
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
      setError('Failed to load request details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Poll for new messages
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

  const handleUpload = async (file: File, documentType: DocumentType) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', documentType);
      await api.post(`/documents/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await fetchData();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || 'Upload failed'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    try {
      await api.delete(`/documents/${docId}`);
      await fetchData();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || 'Delete failed'
      );
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
      const url = URL.createObjectURL(response.data);
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

  const handleProvideInfo = async (responseMessage?: string) => {
    try {
      if (responseMessage?.trim()) {
        await api.post(`/messages/${id}`, { content: responseMessage.trim() });
      }
      await api.post(`/verification/requests/${id}/provide-info`);
      await fetchData();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || 'Failed to update status'
      );
    }
  };

  const handleDownloadLetter = async () => {
    if (!request?.has_letter || !request?.letter_id) return;
    try {
      const baseUrl = api.defaults.baseURL || '/api';
      window.open(`${baseUrl}/admin/letters/${request.letter_id}/download`, '_blank');
    } catch {
      setError('Failed to download letter');
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!request) return <div className="p-8 text-center text-red-600">{error || 'Not found'}</div>;

  const canUpload = [RequestStatus.DRAFT, RequestStatus.INFO_REQUESTED].includes(request.status);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {METHOD_LABELS[request.verification_method]}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  {request.investor_type} &middot; Created{' '}
                  {formatDate(request.created_at)}
                </p>
              </div>
              <StatusBadge status={request.status} />
            </div>

            {request.denial_reason && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm font-medium text-red-800">Denial Reason:</p>
                <p className="text-sm text-red-700 mt-1">{request.denial_reason}</p>
              </div>
            )}

            {request.expires_at && request.status === RequestStatus.APPROVED && (
              <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-800">
                    Verification Approved
                  </p>
                  <p className="text-sm text-green-700">
                    Valid until {formatDate(request.expires_at)}
                  </p>
                </div>
                {request.has_letter && (
                  <button
                    onClick={handleDownloadLetter}
                    className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm font-medium"
                  >
                    <Download className="h-4 w-4" />
                    Download Letter
                  </button>
                )}
              </div>
            )}

            {request.status === RequestStatus.INFO_REQUESTED && (
              <InfoRequestedBanner
                infoDeadline={request.info_deadline}
                onProvideInfo={handleProvideInfo}
              />
            )}
          </div>

          {/* Attestation Data */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Attestation Data
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

            {documents.length === 0 && (
              <p className="text-sm text-gray-500">No documents uploaded yet.</p>
            )}

            <div className="space-y-2 mb-4">
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
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownloadDoc(doc.id, doc.original_filename)}
                      className="text-indigo-600 hover:text-indigo-700"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    {canUpload && (
                      <button
                        onClick={() => handleDeleteDoc(doc.id)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {canUpload && (
              <FileUpload onUpload={handleUpload} uploading={uploading} />
            )}
          </div>
        </div>

        {/* Sidebar: Messages */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 sticky top-20">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Messages</h2>
              {request.reviewer_name && (
                <p className="text-xs text-gray-500 mt-1">
                  Reviewer: {request.reviewer_name}
                </p>
              )}
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
