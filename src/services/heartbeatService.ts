import { supabase } from '@/integrations/supabase/client';

class HeartbeatService {
  private intervalId: NodeJS.Timeout | null = null;
  private sessionId: string;
  private userId: string | null = null;
  private username: string | null = null;
  private isActive = false;
  private heartbeatInterval = 30000; // 30 seconds
  private maxRetries = 3;
  private retryCount = 0;

  constructor() {
    this.sessionId = crypto.randomUUID();
    this.setupPageVisibilityListener();
    this.setupNetworkListener();
  }

  // Start heartbeat for a user (public method)
  startSession(userId: string, username?: string) {
    if (this.isActive) {
      console.warn('Heartbeat already active');
      return;
    }

    this.userId = userId;
    this.username = username || null;
    this.isActive = true;
    
    console.log(`Heartbeat started for user ${userId}, session ID: ${this.sessionId}`);
    
    // Send initial heartbeat immediately
    this.sendHeartbeat();
    
    // Start periodic heartbeats
    this.intervalId = setInterval(() => {
      this.sendHeartbeat();
    }, this.heartbeatInterval);
  }

  // Alias for startSession (backward compatibility)
  start(userId: string) {
    this.startSession(userId);
  }

  // Stop heartbeat (public method)
  stopSession() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    if (this.isActive && this.sessionId && this.userId) {
      this.endSession();
    }
    
    this.isActive = false;
    this.retryCount = 0;
    console.log('Heartbeat stopped');
  }

  // Alias for stopSession (backward compatibility)
  stop() {
    this.stopSession();
  }

  // Send heartbeat to server (public method)
  async sendHeartbeat() {
    if (!this.userId || !this.isActive) {
      console.log('Heartbeat skipped: no user ID or not active', { userId: this.userId, isActive: this.isActive });
      return;
    }

    try {
      const userAgent = navigator.userAgent;
      console.log('Sending heartbeat for user:', this.userId, 'session:', this.sessionId);
      
      const { error } = await supabase.rpc('update_user_session', {
        p_user_id: this.userId,
        p_session_id: this.sessionId,
        p_user_agent: userAgent
      });

      if (error) {
        console.warn('Heartbeat failed:', error.message);
        this.handleHeartbeatFailure();
      } else {
        this.retryCount = 0; // Reset retry count on success
        console.log('Heartbeat sent successfully for user:', this.userId);
      }
    } catch (error) {
      console.error('Heartbeat error:', error);
      this.handleHeartbeatFailure();
    }
  }

  // End session on server
  private async endSession() {
    try {
      await supabase.rpc('end_user_session', {
        p_session_id: this.sessionId
      });
      console.log('Session ended successfully');
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  }

  // Handle heartbeat failure with retry logic
  private handleHeartbeatFailure() {
    this.retryCount++;
    
    if (this.retryCount >= this.maxRetries) {
      console.error('Max retries reached, stopping heartbeat');
      this.stop();
      
      // Attempt to restart after a delay
      setTimeout(() => {
        if (this.userId) {
          console.log('Attempting to restart heartbeat...');
          this.start(this.userId);
        }
      }, 60000); // Retry after 1 minute
    }
  }

  // Handle page visibility changes
  private setupPageVisibilityListener() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Page is hidden, could reduce heartbeat frequency
        console.debug('Page hidden');
      } else {
        // Page is visible again, ensure heartbeat is active
        console.debug('Page visible');
        if (this.userId && !this.isActive) {
          this.start(this.userId);
        }
      }
    });
  }

  // Handle network connectivity changes
  private setupNetworkListener() {
    window.addEventListener('online', () => {
      console.log('Network connection restored');
      if (this.userId && !this.isActive) {
        this.start(this.userId);
      }
    });

    window.addEventListener('offline', () => {
      console.log('Network connection lost');
      this.stop();
    });
  }

  // Get current session status
  getStatus() {
    return {
      isActive: this.isActive,
      sessionId: this.sessionId,
      userId: this.userId,
      retryCount: this.retryCount
    };
  }
}

export const heartbeatService = new HeartbeatService();