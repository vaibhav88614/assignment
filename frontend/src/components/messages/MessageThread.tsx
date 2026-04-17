import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import type { Message as MessageType } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface MessageThreadProps {
  messages: MessageType[];
  onSend: (content: string) => Promise<void>;
  sending?: boolean;
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
}: MessageThreadProps) {
  const [content, setContent] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    await onSend(content.trim());
    setContent('');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-3 p-4 max-h-[28rem]">
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
        <div ref={bottomRef} />
      </div>

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
    </div>
  );
}
