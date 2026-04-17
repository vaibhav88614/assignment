import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import api from '../api/client';
import { useAuth } from './AuthContext';
import type { AppNotification, NotificationListResponse } from '../types';

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (ids?: string[]) => Promise<void>;
  markAllRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Generate ding sound using Web Audio API — no external file needed
function playDing() {
  try {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5
    oscillator.frequency.setValueAtTime(1320, ctx.currentTime + 0.08); // E6
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.4);

    // Cleanup
    setTimeout(() => ctx.close(), 500);
  } catch {
    // Audio not available (e.g. no user gesture yet) — silently skip
  }
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const prevUnreadCount = useRef(0);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await api.get<NotificationListResponse>('/notifications');
      setNotifications(data.items);
      setUnreadCount(data.unread_count);
    } catch {
      // silent — don't break the app if notifications fail
    }
  }, [user]);

  // Play ding when unread count increases
  useEffect(() => {
    if (unreadCount > prevUnreadCount.current && prevUnreadCount.current >= 0) {
      playDing();
    }
    prevUnreadCount.current = unreadCount;
  }, [unreadCount]);

  // Poll every 15 seconds
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      prevUnreadCount.current = 0;
      return;
    }

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [user, fetchNotifications]);

  const markAsRead = useCallback(
    async (ids?: string[]) => {
      try {
        await api.post('/notifications/read', {
          notification_ids: ids || null,
        });
        await fetchNotifications();
      } catch {
        // silent
      }
    },
    [fetchNotifications]
  );

  const markAllRead = useCallback(async () => {
    await markAsRead();
  }, [markAsRead]);

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, markAsRead, markAllRead, refresh: fetchNotifications }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
