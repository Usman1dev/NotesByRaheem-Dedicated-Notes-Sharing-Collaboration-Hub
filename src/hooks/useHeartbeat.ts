import { useEffect, useRef } from 'react';
import { heartbeatService } from '../services/heartbeatService';
import { useAuth } from '../contexts/AuthContext';

/**
 * Custom hook for managing user heartbeat/session tracking
 * Integrates with PageTracker to provide real-time active user tracking
 */
export function useHeartbeat() {
  const { user, profile } = useAuth();
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartedRef = useRef<boolean>(false);

  /**
   * Start heartbeat for the current user
   */
  const startHeartbeat = async () => {
    if (!user) {
      console.log('No user available for heartbeat');
      return;
    }

    try {
      // Use username from profile if available, otherwise use user ID
      const username = profile?.username || user.id;
      heartbeatService.startSession(user.id, username);
      sessionStartedRef.current = true;
      console.log('Heartbeat session started for user:', user.id, 'username:', username);
    } catch (error) {
      console.error('Failed to start heartbeat session:', error);
    }
  };

  /**
   * Stop heartbeat for the current user
   */
  const stopHeartbeat = async () => {
    if (!sessionStartedRef.current) {
      return;
    }

    try {
      heartbeatService.stopSession();
      sessionStartedRef.current = false;
      console.log('Heartbeat session stopped');
    } catch (error) {
      console.error('Failed to stop heartbeat session:', error);
    }
  };

  /**
   * Initialize heartbeat when user is authenticated
   */
  useEffect(() => {
    console.log('useHeartbeat useEffect triggered', {
      user: user?.id,
      profile: profile?.username,
      sessionStarted: sessionStartedRef.current
    });
    
    if (!user) {
      console.log('useHeartbeat: No user, skipping');
      return;
    }

    // Start heartbeat session
    startHeartbeat();

    // Set up interval for periodic heartbeats
    heartbeatIntervalRef.current = setInterval(() => {
      if (sessionStartedRef.current) {
        console.log('Periodic heartbeat interval triggered');
        heartbeatService.sendHeartbeat().catch(error => {
          console.error('Heartbeat failed:', error);
        });
      }
    }, 30000); // Every 30 seconds

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Page became visible again, send immediate heartbeat
        if (sessionStartedRef.current) {
          console.log('Page became visible, sending heartbeat');
          heartbeatService.sendHeartbeat().catch(console.error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup on unmount or user change
    return () => {
      console.log('useHeartbeat cleanup');
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // Stop session when component unmounts or user changes
      stopHeartbeat().catch(console.error);
    };
  }, [user?.id]);

  /**
   * Manually trigger a heartbeat (useful for user actions)
   */
  const triggerHeartbeat = async () => {
    if (!sessionStartedRef.current) {
      await startHeartbeat();
    }
    
    try {
      await heartbeatService.sendHeartbeat();
      return true;
    } catch (error) {
      console.error('Manual heartbeat failed:', error);
      return false;
    }
  };

  /**
   * Check if heartbeat is currently active
   */
  const isHeartbeatActive = () => {
    return sessionStartedRef.current;
  };

  return {
    startHeartbeat,
    stopHeartbeat,
    triggerHeartbeat,
    isHeartbeatActive: isHeartbeatActive()
  };
}