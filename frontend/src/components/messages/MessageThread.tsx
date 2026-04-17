import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, CheckCircle2 } from 'lucide-react';
import type { Message as MessageType } from '../../types';
import { RequestStatus, DocumentType } from '../../types';
import { useAuth } from '../../context/AuthContext';
import FileUpload from '../documents/FileUpload';

interface MessageThreadProps {
  messages: MessageType[];
  onSend: (content: string) => Promise<void>;
  sending?: boolean;
  requestStatus?: RequestStatus;
  onProvideInfo?: (message?: string) => Promise<void>;
  onUpload?: (file: File, documentType: DocumentType) => Promise<void>;
  uploading?: boolean;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function MessageThread({
  messages,
  onSend,
  sending,
  requestStatus,
  onProvideInfo,
  onUpload,
  uploading,
}: MessageThreadProps) {
  const [content, setContent] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  const [sendError, setSendError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    try {
      setSendError(null);
      await onSend(content.trim());
      setContent('');
    } catch {
      setSendError('Failed to send message. Please try again.');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div ref={containerRef} className="flex-1 overflow-y-auto space-y-3 p-4 max-h-[28rem]">
        {messages.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-10">
            No messages yet. Start the conversation.
          </p>
        )}
        {messages.map((msg) => {
          const mine = msg.sender_id === user?.id;
          if (msg.is_system_message) {
            return (
              <div key={msg.id} className="flex justify-center">
                <div className="bg-slate-100 text-slate-500 text-[11px] px-3 py-1 rounded-full max-w-md">
                  {msg.content}
                </div>
              </div>
            );
          }
          return (
            <div
              key={msg.id}
              className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-sm px-3.5 py-2.5 rounded-2xl shadow-sm ${
                  mine
                    ? 'bg-gradient-to-b from-indigo-500 to-indigo-600 text-white rounded-br-md'
                    : 'bg-white border border-slate-200 text-slate-900 rounded-bl-md'
                }`}
              >
                <p
                  className={`text-[11px] font-semibold mb-0.5 ${
                    mine ? 'text-white/80' : 'text-slate-500'
                  }`}
                >
                  {msg.sender_name}{' '}
                  <span className="font-normal opacity-80">
                    ({msg.sender_role})
                  </span>
                </p>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {msg.content}
                </p>
                <p
                  className={`text-[10px] mt-1 ${
                    mine ? 'text-white/60' : 'text-slate-400'
                  }`}
                >
                  {formatTime(msg.created_at)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {sendError && (
        <div className="mx-3 mt-2 text-xs text-red-600 bg-red-50 rounded px-2 py-1">{sendError}</div>
      )}

      {/* File upload area for info-requested mode */}
      {showUpload && onUpload && (
        <div className="border-t border-slate-100 p-3 bg-orange-50/50">
          <FileUpload onUpload={onUpload} uploading={uploading} />
        </div>
      )}

      {/* Info-requested mode: orange-tinted input with Submit Response */}
      {requestStatus === RequestStatus.INFO_REQUESTED && onProvideInfo ? (
        <div className={`border-t-2 border-orange-300 p-3 bg-orange-50/60`}>
          <div className="flex items-center gap-1.5 mb-2">
            <div className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-[11px] font-semibold text-orange-700 uppercase tracking-wider">
              Response Required
            </span>
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!content.trim()) return;
              try {
                setSendError(null);
                await onProvideInfo(content.trim());
                setContent('');
                setShowUpload(false);
              } catch {
                setSendError('Failed to submit response. Please try again.');
              }
            }}
            className="flex flex-col gap-2"
          >
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Describe the additional information you're providing..."
              className="w-full rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm placeholder:text-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 resize-none"
              rows={3}
              disabled={sending}
            />
            <div className="flex items-center gap-2">
              {onUpload && (
                <button
                  type="button"
                  onClick={() => setShowUpload((v) => !v)}
                  className={`inline-flex items-center gap-1.5 border px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    showUpload
                      ? 'border-orange-300 bg-orange-100 text-orange-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Paperclip className="h-3.5 w-3.5" />
                  Attach Files
                </button>
              )}
              <div className="flex-1" />
              <button
                type="submit"
                disabled={sending || !content.trim()}
                className="inline-flex items-center gap-1.5 bg-gradient-to-b from-orange-500 to-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:brightness-105 disabled:opacity-50 transition shadow-sm"
              >
                <CheckCircle2 className="h-4 w-4" />
                Submit Response
              </button>
            </div>
          </form>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="border-t border-slate-100 p-3 flex gap-2 bg-white"
        >
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 focus:bg-white transition"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !content.trim()}
            className="bg-gradient-to-b from-indigo-500 to-indigo-700 text-white p-2 rounded-lg hover:brightness-105 disabled:opacity-50 transition shadow-sm"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      )}
    </div>
  );
}
