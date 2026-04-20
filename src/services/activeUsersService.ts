import { supabase } from '../integrations/supabase/client';
import { Database } from '../integrations/supabase/types';

export type ActiveUser = {
  user_id: string;
  full_name: string;
  username: string;
  last_active: string;
  session_duration: string;
  user_agent: string;
  browser: string;
  device_type: string;
};

export type ActiveUsersStats = {
  total_active: number;
  active_by_device: Record<string, number>;
  active_by_browser: Record<string, number>;
  peak_hour: string;
  average_session_duration: string;
};

/**
 * Service for fetching and managing currently active users data
 * Only accessible by owners
 */
class ActiveUsersService {
  /**
   * Get currently active users (real-time)
   * Only accessible by owners via RLS policies
   */
  async getCurrentlyActiveUsers(): Promise<ActiveUser[]> {
    try {
      console.log('Calling get_currently_active_users RPC...');
      const { data, error } = await supabase
        .rpc('get_currently_active_users');

      if (error) {
        console.error('Error fetching active users:', error);
        throw error;
      }

      console.log('RPC returned data:', data?.length || 0, 'rows');
      
      // Process and enhance the data
      const processed = (data || []).map(user => ({
        ...user,
        browser: this.parseBrowser(user.user_agent),
        device_type: this.parseDeviceType(user.user_agent)
      }));
      
      console.log('Processed active users:', processed.length);
      return processed;
    } catch (error) {
      console.error('Failed to fetch active users:', error);
      return [];
    }
  }

  /**
   * Get active users statistics for the dashboard
   */
  async getActiveUsersStats(): Promise<ActiveUsersStats> {
    try {
      const activeUsers = await this.getCurrentlyActiveUsers();
      
      // Calculate statistics
      const deviceCounts: Record<string, number> = {};
      const browserCounts: Record<string, number> = {};
      
      activeUsers.forEach(user => {
        deviceCounts[user.device_type] = (deviceCounts[user.device_type] || 0) + 1;
        browserCounts[user.browser] = (browserCounts[user.browser] || 0) + 1;
      });

      // Calculate average session duration
      const totalDuration = activeUsers.reduce((sum, user) => {
        const duration = this.parseDurationToMinutes(user.session_duration);
        return sum + duration;
      }, 0);
      
      const avgDuration = activeUsers.length > 0 
        ? this.formatDuration(totalDuration / activeUsers.length)
        : '0m';

      // Find peak hour (simplified - using current hour as placeholder)
      const now = new Date();
      const peakHour = `${now.getHours()}:00`;

      return {
        total_active: activeUsers.length,
        active_by_device: deviceCounts,
        active_by_browser: browserCounts,
        peak_hour: peakHour,
        average_session_duration: avgDuration
      };
    } catch (error) {
      console.error('Failed to calculate active users stats:', error);
      return {
        total_active: 0,
        active_by_device: {},
        active_by_browser: {},
        peak_hour: 'N/A',
        average_session_duration: '0m'
      };
    }
  }

  /**
   * Subscribe to real-time updates of active users
   * @param callback Function to call when active users data changes
   * @returns Unsubscribe function
   */
  subscribeToActiveUsers(callback: (users: ActiveUser[]) => void) {
    // Subscribe to active_sessions table changes
    const subscription = supabase
      .channel('active_users_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'active_sessions'
        },
        async () => {
          // When sessions change, fetch updated active users
          const users = await this.getCurrentlyActiveUsers();
          callback(users);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }

  /**
   * Parse browser from user agent string
   */
  private parseBrowser(userAgent: string): string {
    if (!userAgent) return 'Unknown';
    
    const ua = userAgent.toLowerCase();
    if (ua.includes('chrome')) return 'Chrome';
    if (ua.includes('firefox')) return 'Firefox';
    if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
    if (ua.includes('edge')) return 'Edge';
    if (ua.includes('opera')) return 'Opera';
    if (ua.includes('brave')) return 'Brave';
    
    return 'Other';
  }

  /**
   * Parse device type from user agent string
   */
  private parseDeviceType(userAgent: string): string {
    if (!userAgent) return 'Desktop';
    
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return 'Mobile';
    }
    if (ua.includes('tablet') || ua.includes('ipad')) {
      return 'Tablet';
    }
    return 'Desktop';
  }

  /**
   * Parse duration string to minutes
   */
  private parseDurationToMinutes(duration: string): number {
    // Format: "HH:MM:SS" or "MM:SS"
    const parts = duration.split(':').map(Number);
    
    if (parts.length === 3) {
      // HH:MM:SS
      return parts[0] * 60 + parts[1] + parts[2] / 60;
    } else if (parts.length === 2) {
      // MM:SS
      return parts[0] + parts[1] / 60;
    }
    
    return 0;
  }

  /**
   * Format minutes to readable duration
   */
  private formatDuration(minutes: number): string {
    if (minutes < 1) {
      return `${Math.round(minutes * 60)}s`;
    } else if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = Math.round(minutes % 60);
      return `${hours}h ${mins}m`;
    }
  }

  /**
   * Clean up stale sessions (admin/owner only)
   */
  async cleanupStaleSessions(): Promise<number> {
    try {
      const { data, error } = await supabase
        .rpc('cleanup_stale_sessions');

      if (error) {
        console.error('Error cleaning up stale sessions:', error);
        throw error;
      }

      return data || 0;
    } catch (error) {
      console.error('Failed to cleanup stale sessions:', error);
      return 0;
    }
  }
}

export const activeUsersService = new ActiveUsersService();