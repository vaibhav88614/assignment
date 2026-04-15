import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import type { Message as MessageType } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface MessageThreadProps {
  messages: MessageType[];
  onSend: (content: string) => Promise<void>;
  sending?: boolean;
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
      <div className="flex-1 overflow-y-auto space-y-3 p-4 max-h-96">
        {messages.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">
            No messages yet. Start the conversation.
          </p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.is_system_message
                ? 'justify-center'
                : msg.sender_id === user?.id
                ? 'justify-end'
                : 'justify-start'
            }`}
          >
            {msg.is_system_message ? (
              <div className="bg-gray-100 text-gray-500 text-xs px-3 py-1.5 rounded-full max-w-md">
                {msg.content}
              </div>
            ) : (
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                  msg.sender_id === user?.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-xs font-medium mb-1 opacity-70">
                  {msg.sender_name} ({msg.sender_role})
                </p>
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                <p className="text-xs mt-1 opacity-50">
                  {new Date(msg.created_at).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-gray-200 p-3 flex gap-2"
      >
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          disabled={sending}
        />
        <button
          type="submit"
          disabled={sending || !content.trim()}
          className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
