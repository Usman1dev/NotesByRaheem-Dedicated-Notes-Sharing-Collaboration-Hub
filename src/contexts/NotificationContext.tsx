import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { NotificationService } from '../services/notificationService';
import { Notification, NotificationSummary, NotificationFilters } from '../services/notificationService';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  summary: NotificationSummary | null;
  isLoading: boolean;
  error: string | null;
  refreshNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  loadMore: () => Promise<void>;
  hasMore: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const notificationService = new NotificationService();

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [summary, setSummary] = useState<NotificationSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [offset, setOffset] = useState<number>(0);
  const limit = 20;

  const loadNotifications = async (reset = false) => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const currentOffset = reset ? 0 : offset;
      const filters: NotificationFilters = {
        limit,
        offset: currentOffset,
      };
      
      const newNotifications = await notificationService.getNotifications(filters);
      
      if (reset) {
        setNotifications(newNotifications);
        setOffset(limit);
      } else {
        setNotifications(prev => [...prev, ...newNotifications]);
        setOffset(prev => prev + limit);
      }
      
      setHasMore(newNotifications.length === limit);
    } catch (err) {
      console.error('Failed to load notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    if (!user) return;
    
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      console.error('Failed to load unread count:', err);
    }
  };

  const loadSummary = async () => {
    if (!user) return;
    
    try {
      const summaryData = await notificationService.getSummary();
      setSummary(summaryData);
    } catch (err) {
      console.error('Failed to load notification summary:', err);
    }
  };

  const refreshNotifications = async () => {
    await Promise.all([
      loadNotifications(true),
      loadUnreadCount(),
      loadSummary()
    ]);
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      
      // Update local state
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, is_read: true, read_at: new Date().toISOString() }
            : notification
        )
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      // Update summary
      if (summary) {
        setSummary({
          ...summary,
          unread_count: Math.max(0, summary.unread_count - 1)
        });
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      throw err;
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      
      // Update local state
      setNotifications(prev =>
        prev.map(notification => ({
          ...notification,
          is_read: true,
          read_at: notification.read_at || new Date().toISOString()
        }))
      );
      
      // Update unread count
      setUnreadCount(0);
      
      // Update summary
      if (summary) {
        setSummary({
          ...summary,
          unread_count: 0
        });
      }
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
      throw err;
    }
  };

  const loadMore = async () => {
    if (!hasMore || isLoading) return;
    await loadNotifications(false);
  };

  // Initial load
  useEffect(() => {
    if (user) {
      refreshNotifications();
    } else {
      // Reset state when user logs out
      setNotifications([]);
      setUnreadCount(0);
      setSummary(null);
      setOffset(0);
      setHasMore(true);
    }
  }, [user]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    // Subscribe to new notifications
    const unsubscribeNotifications = notificationService.subscribeToNotifications(
      (notifications) => {
        setNotifications(notifications);
        // Update unread count based on the new notifications
        const unread = notifications.filter(n => !n.is_read).length;
        setUnreadCount(unread);
      }
    );

    // Subscribe to unread count changes
    const unsubscribeUnreadCount = notificationService.subscribeToUnreadCount(
      (count) => {
        setUnreadCount(count);
      }
    );

    return () => {
      unsubscribeNotifications();
      unsubscribeUnreadCount();
    };
  }, [user]);

  const value = {
    notifications,
    unreadCount,
    summary,
    isLoading,
    error,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    loadMore,
    hasMore
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}