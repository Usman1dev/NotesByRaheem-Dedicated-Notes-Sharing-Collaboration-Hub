import { supabase } from '../integrations/supabase/client';
import { Database } from '../integrations/supabase/types';

export type NotificationType = 
  | 'note_uploaded'
  | 'note_approved'
  | 'note_rejected'
  | 'new_note_in_course'
  | 'system'
  | 'announcement'
  | 'note_pending_review'
  | 'badge';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, any>;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

export interface NotificationSummary {
  total_notifications: number;
  unread_count: number;
  latest_notification: string | null;
}

export interface NotificationFilters {
  limit?: number;
  offset?: number;
  is_read?: boolean;
  type?: NotificationType;
}

/**
 * Service for managing user notifications with real-time updates
 */
class NotificationService {
  /**
   * Get notifications for the current user with optional filters
   */
  async getNotifications(filters: NotificationFilters = {}): Promise<Notification[]> {
    try {
      const { limit = 50, offset = 0, is_read, type } = filters;
      
      let query = supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // Apply filters if provided
      if (is_read !== undefined) {
        query = query.eq('is_read', is_read);
      }
      
      if (type) {
        query = query.eq('type', type);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching notifications:', error);
        throw error;
      }

      return (data || []) as Notification[];
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      return [];
    }
  }

  /**
   * Get unread notification count for the current user
   */
  async getUnreadCount(): Promise<number> {
    try {
      const { data, error } = await supabase
        .rpc('get_unread_notification_count', { p_user_id: (await this.getCurrentUserId()) });

      if (error) {
        console.error('Error fetching unread count:', error);
        throw error;
      }

      return data || 0;
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
      return 0;
    }
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('mark_notification_as_read', { p_notification_id: notificationId });

      if (error) {
        console.error('Error marking notification as read:', error);
        throw error;
      }

      return data || false;
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      return false;
    }
  }

  /**
   * Mark all notifications as read for the current user
   */
  async markAllAsRead(): Promise<number> {
    try {
      const { data, error } = await supabase
        .rpc('mark_all_notifications_as_read', { p_user_id: (await this.getCurrentUserId()) });

      if (error) {
        console.error('Error marking all notifications as read:', error);
        throw error;
      }

      return data || 0;
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      return 0;
    }
  }

  /**
   * Get notification summary for the current user
   */
  async getSummary(): Promise<NotificationSummary> {
    try {
      const { data: summaryData, error: summaryError } = await supabase
        .from('user_notification_summary')
        .select('*')
        .eq('user_id', (await this.getCurrentUserId()))
        .single();

      if (summaryError) {
        console.error('Error fetching notification summary:', summaryError);
        throw summaryError;
      }

      if (summaryData) {
        return {
          total_notifications: summaryData.total_notifications || 0,
          unread_count: summaryData.unread_count || 0,
          latest_notification: summaryData.latest_notification
        };
      }

      // Fallback if view doesn't have data
      const unreadCount = await this.getUnreadCount();
      const notifications = await this.getNotifications({ limit: 1 });
      
      return {
        total_notifications: 0, // We'd need a separate query for this
        unread_count: unreadCount,
        latest_notification: notifications[0]?.created_at || null
      };
    } catch (error) {
      console.error('Failed to fetch notification summary:', error);
      return {
        total_notifications: 0,
        unread_count: 0,
        latest_notification: null
      };
    }
  }

  /**
   * Subscribe to real-time notification updates
   * @param callback Function to call when notifications change
   * @returns Unsubscribe function
   */
  subscribeToNotifications(callback: (notifications: Notification[]) => void): () => void {
    const currentUserId = this.getCurrentUserIdSync();
    
    if (!currentUserId) {
      console.warn('No user ID available for notification subscription');
      return () => {};
    }

    // Subscribe to notifications table changes for this user
    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUserId}`
        },
        async (payload) => {
          console.log('Notification change detected:', payload);
          // Refresh notifications when any change occurs
          const notifications = await this.getNotifications();
          callback(notifications);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  /**
   * Subscribe to unread count changes
   * @param callback Function to call when unread count changes
   * @returns Unsubscribe function
   */
  subscribeToUnreadCount(callback: (count: number) => void): () => void {
    const currentUserId = this.getCurrentUserIdSync();
    
    if (!currentUserId) {
      console.warn('No user ID available for unread count subscription');
      return () => {};
    }

    // Poll for unread count changes (Supabase Realtime doesn't support function changes)
    const pollInterval = setInterval(async () => {
      const count = await this.getUnreadCount();
      callback(count);
    }, 10000); // Poll every 10 seconds

    // Initial call
    this.getUnreadCount().then(callback);

    return () => {
      clearInterval(pollInterval);
    };
  }

  /**
   * Get icon for notification type
   */
  getNotificationIcon(type: NotificationType): string {
    const icons: Record<NotificationType, string> = {
      note_uploaded: '📤',
      note_approved: '✅',
      note_rejected: '❌',
      new_note_in_course: '📝',
      system: '⚙️',
      announcement: '📢',
      note_pending_review: '👁️',
      badge: '🏆'
    };
    
    return icons[type] || '🔔';
  }

  /**
   * Get text color for notification type
   */
  getNotificationColor(type: NotificationType): string {
    const colors: Record<NotificationType, string> = {
      note_uploaded: 'text-blue-600',
      note_approved: 'text-green-600',
      note_rejected: 'text-red-600',
      new_note_in_course: 'text-purple-600',
      system: 'text-gray-600',
      announcement: 'text-orange-600',
      note_pending_review: 'text-amber-600',
      badge: 'text-pink-600'
    };
    
    return colors[type] || 'text-gray-600';
  }

  /**
   * Get background color for notification type (for icon backgrounds)
   */
  getNotificationBackgroundColor(type: NotificationType): string {
    const bgColors: Record<NotificationType, string> = {
      note_uploaded: 'bg-blue-100 dark:bg-blue-900/30',
      note_approved: 'bg-green-100 dark:bg-green-900/30',
      note_rejected: 'bg-red-100 dark:bg-red-900/30',
      new_note_in_course: 'bg-purple-100 dark:bg-purple-900/30',
      system: 'bg-gray-100 dark:bg-gray-800',
      announcement: 'bg-orange-100 dark:bg-orange-900/30',
      note_pending_review: 'bg-amber-100 dark:bg-amber-900/30',
      badge: 'bg-pink-100 dark:bg-pink-900/30'
    };
    
    return bgColors[type] || 'bg-gray-100 dark:bg-gray-800';
  }

  /**
   * Format relative time (e.g., "2 minutes ago")
   */
  formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'just now';
    if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
    if (diffHour < 24) return `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`;
    if (diffDay < 7) return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`;
    
    // For older dates, show actual date
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: diffDay > 365 ? 'numeric' : undefined
    });
  }

  /**
   * Check if notification has action button (e.g., "Review now")
   */
  hasActionButton(notification: Notification): boolean {
    // Simplify: all note_pending_review notifications have action button
    return notification.type === 'note_pending_review';
  }

  /**
   * Get action button text for notification
   */
  getActionButtonText(notification: Notification): string | null {
    if (!this.hasActionButton(notification)) return null;
    
    switch (notification.type) {
      case 'note_pending_review':
        return 'Review now';
      case 'announcement':
        return 'View announcement';
      case 'note_approved':
        return 'View note';
      case 'new_note_in_course':
        return 'View course';
      default:
        return null;
    }
  }

  /**
   * Get action URL for notification
   */
  getActionUrl(notification: Notification): string | null {
    switch (notification.type) {
      case 'note_pending_review':
        return '/admin/pending';
      case 'announcement':
        return '/announcements';
      case 'note_approved':
      case 'note_rejected':
        // Redirect to course page where the note is located
        return notification.data?.course_id ? `/courses?id=${notification.data.course_id}` : '/dashboard';
      case 'new_note_in_course':
        // Redirect to course page with query parameter format
        return notification.data?.course_id ? `/courses?id=${notification.data.course_id}` : '/courses';
      case 'note_uploaded':
        return '/dashboard'; // Author's dashboard
      case 'system':
        return '/dashboard';
      case 'badge':
        return '/profile';
      default:
        return '/dashboard';
    }
  }

  /**
   * Helper to get current user ID (async)
   */
  private async getCurrentUserId(): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      throw new Error('No authenticated user');
    }
    return session.user.id;
  }

  /**
   * Helper to get current user ID (sync - for subscriptions)
   */
  private getCurrentUserIdSync(): string | null {
    // This is a simplified version - in a real app, you might store this in context
    const session = supabase.auth.getSession();
    // Note: This is not truly sync, but works for our subscription setup
    // In a real implementation, you'd get this from auth context
    return localStorage.getItem('supabase.auth.token') ? 
      JSON.parse(localStorage.getItem('supabase.auth.token') || '{}').user?.id || null : null;
  }
}

// Export the class and a singleton instance
export { NotificationService };
export const notificationService = new NotificationService();