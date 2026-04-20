# User Session Tracking and Cleanup Implementation

## Overview
Implementation of the heartbeat-based session tracking system and automated cleanup of stale sessions.

## Core Components

### 1. Heartbeat Service (Frontend)
**File:** `src/services/heartbeatService.ts`

#### Responsibilities:
- Send periodic heartbeats to keep sessions alive
- Create new sessions on user login/activity
- Clean up sessions on user logout/page unload
- Handle network connectivity issues

#### Implementation Details:
```typescript
import { supabase } from '@/integrations/supabase/client';

class HeartbeatService {
  private intervalId: NodeJS.Timeout | null = null;
  private sessionId: string;
  private userId: string | null = null;
  private isActive = false;
  private heartbeatInterval = 30000; // 30 seconds
  private maxRetries = 3;
  private retryCount = 0;

  constructor() {
    this.sessionId = crypto.randomUUID();
    this.setupPageVisibilityListener();
    this.setupNetworkListener();
  }

  // Start heartbeat for a user
  start(userId: string) {
    if (this.isActive) {
      console.warn('Heartbeat already active');
      return;
    }

    this.userId = userId;
    this.isActive = true;
    
    // Send initial heartbeat immediately
    this.sendHeartbeat();
    
    // Start periodic heartbeats
    this.intervalId = setInterval(() => {
      this.sendHeartbeat();
    }, this.heartbeatInterval);
    
    console.log(`Heartbeat started for user ${userId}`);
  }

  // Stop heartbeat
  stop() {
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

  // Send heartbeat to server
  private async sendHeartbeat() {
    if (!this.userId || !this.isActive) return;

    try {
      const userAgent = navigator.userAgent;
      
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
        console.debug('Heartbeat sent successfully');
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
```

### 2. React Hook for Heartbeat
**File:** `src/hooks/useHeartbeat.ts`

```typescript
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { heartbeatService } from '@/services/heartbeatService';

export function useHeartbeat() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) {
      heartbeatService.stop();
      return;
    }

    // Start heartbeat when user is authenticated
    heartbeatService.start(user.id);

    // Clean up on unmount
    return () => {
      heartbeatService.stop();
    };
  }, [user?.id]);

  return heartbeatService.getStatus();
}
```

### 3. Update PageTracker Component
**File:** `src/components/PageTracker.tsx`

Add heartbeat integration to existing page tracker:
```typescript
import { useHeartbeat } from '@/hooks/useHeartbeat';

function PageTracker() {
  const heartbeatStatus = useHeartbeat();
  
  // Existing page tracking logic...
  
  // Optional: Log heartbeat status for debugging
  useEffect(() => {
    console.debug('Heartbeat status:', heartbeatStatus);
  }, [heartbeatStatus]);
  
  return null; // PageTracker doesn't render anything
}
```

### 4. Database Cleanup Functions
**File:** SQL functions for session cleanup

#### 4.1 Stale Session Cleanup Function
```sql
-- Enhanced cleanup function with logging
CREATE OR REPLACE FUNCTION public.cleanup_stale_sessions()
RETURNS TABLE (
  deleted_count integer,
  oldest_deleted timestamptz,
  newest_deleted timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_records RECORD;
BEGIN
  -- Delete stale sessions and return statistics
  RETURN QUERY
  WITH deleted AS (
    DELETE FROM public.active_sessions
    WHERE last_heartbeat < now() - interval '5 minutes'
    RETURNING id, user_id, last_heartbeat, created_at
  )
  SELECT 
    COUNT(*)::integer as deleted_count,
    MIN(last_heartbeat) as oldest_deleted,
    MAX(last_heartbeat) as newest_deleted
  FROM deleted;
END;
$$;
```

#### 4.2 Session Statistics Function
```sql
-- Function to get session statistics
CREATE OR REPLACE FUNCTION public.get_session_statistics()
RETURNS TABLE (
  total_sessions integer,
  active_sessions integer,
  stale_sessions integer,
  avg_session_duration interval,
  max_session_duration interval
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT 
    COUNT(*)::integer as total_sessions,
    COUNT(CASE WHEN last_heartbeat > now() - interval '2 minutes' THEN 1 END)::integer as active_sessions,
    COUNT(CASE WHEN last_heartbeat < now() - interval '5 minutes' THEN 1 END)::integer as stale_sessions,
    AVG(now() - created_at) as avg_session_duration,
    MAX(now() - created_at) as max_session_duration
  FROM public.active_sessions;
$$;
```

### 5. Automated Cleanup Job
#### Option A: Supabase Edge Function (Recommended)
**File:** `supabase/functions/cleanup-sessions/index.ts`

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req: Request) => {
  try {
    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const { createClient } = await import('npm:@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Run cleanup
    const { data, error } = await supabase.rpc('cleanup_stale_sessions');
    
    if (error) {
      throw error;
    }
    
    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      stats: data?.[0] || {},
      message: `Cleaned up ${data?.[0]?.deleted_count || 0} stale sessions`
    };
    
    // Log the cleanup
    console.log(JSON.stringify(result));
    
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Cleanup failed:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
```

#### Option B: Database Trigger (Simpler)
```sql
-- Create a trigger to clean up old sessions on insert
CREATE OR REPLACE FUNCTION public.cleanup_on_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Clean up sessions older than 1 hour periodically
  IF (random() < 0.01) THEN -- ~1% of inserts trigger cleanup
    PERFORM public.cleanup_stale_sessions();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_cleanup_on_insert
  AFTER INSERT ON public.active_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_on_insert();
```

### 6. Monitoring and Alerting

#### 6.1 Health Check Endpoint
```typescript
// src/services/sessionHealthService.ts
export class SessionHealthService {
  static async checkHealth(): Promise<SessionHealth> {
    const { data: stats, error } = await supabase
      .rpc('get_session_statistics');
    
    if (error) {
      return {
        status: 'unhealthy',
        message: 'Failed to fetch session statistics',
        error: error.message
      };
    }
    
    const health: SessionHealth = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      statistics: stats?.[0] || {},
      warnings: []
    };
    
    // Add warnings for potential issues
    if (stats?.[0]?.stale_sessions > 100) {
      health.warnings.push(`High number of stale sessions: ${stats[0].stale_sessions}`);
      health.status = 'degraded';
    }
    
    if (stats?.[0]?.max_session_duration > interval '24 hours') {
      health.warnings.push(`Unusually long session detected: ${stats[0].max_session_duration}`);
    }
    
    return health;
  }
}

interface SessionHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  statistics: any;
  warnings: string[];
  error?: string;
}
```

#### 6.2 Dashboard Health Widget
Add to OwnerDashboard:
```jsx
{/* Session Health Monitor */}
<div className="bg-surface border border-border rounded-xl p-6 mb-6">
  <h3 className="font-display text-lg font-semibold mb-4">🩺 Session Health</h3>
  
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    <div className="bg-background border border-border rounded-lg p-4">
      <div className="text-sm text-muted-foreground mb-1">Active Sessions</div>
      <div className="font-display text-xl font-bold">
        {sessionHealth?.statistics?.active_sessions ?? '--'}
      </div>
    </div>
    
    <div className="bg-background border border-border rounded-lg p-4">
      <div className="text-sm text-muted-foreground mb-1">Stale Sessions</div>
      <div className="font-display text-xl font-bold">
        {sessionHealth?.statistics?.stale_sessions ?? '--'}
      </div>
    </div>
    
    <div className="bg-background border border-border rounded-lg p-4">
      <div className="text-sm text-muted-foreground mb-1">Avg Duration</div>
      <div className="font-display text-xl font-bold">
        {sessionHealth?.statistics?.avg_session_duration 
          ? `${Math.round(extractMinutes(sessionHealth.statistics.avg_session_duration))}m`
          : '--'}
      </div>
    </div>
    
    <div className="bg-background border border-border rounded-lg p-4">
      <div className="text-sm text-muted-foreground mb-1">Health Status</div>
      <div className={`font-display text-xl font-bold ${
        sessionHealth?.status === 'healthy' ? 'text-green-500' :
        sessionHealth?.status === 'degraded' ? 'text-yellow-500' :
        'text-red-500'
      }`}>
        {sessionHealth?.status?.toUpperCase() ?? '--'}
      </div>
    </div>
  </div>
  
  {sessionHealth?.warnings && sessionHealth.warnings.length > 0 && (
    <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
      <div className="text-sm font-medium text-yellow-700 mb-1">⚠️ Warnings</div>
      <ul className="text-sm text-yellow-600 list-disc list-inside">
        {sessionHealth.warnings.map((warning, i) => (
          <li key={i}>{warning}</li>
        ))}
      </ul>
    </div>
  )}
</div>
```

### 7. Testing Strategy

#### 7.1 Unit Tests
```typescript
// __tests__/services/heartbeatService.test.ts
describe('HeartbeatService', () => {
  let heartbeatService: HeartbeatService;
  
  beforeEach(() => {
    heartbeatService = new HeartbeatService();
  });
  
  test('should start and stop heartbeat', () => {
    const userId = 'test-user-123';
    heartbeatService.start(userId);
    expect(heartbeatService.getStatus().isActive).toBe(true);
    
    heartbeatService.stop();
    expect(heartbeatService.getStatus().isActive).toBe(false);
  });
  
  test('should handle network failures', async () => {
    // Mock failed API call
    // Test retry logic
  });
});
```

#### 7.2 Integration Tests
- Test heartbeat → database update flow
- Test session cleanup functionality
- Test real-time updates in dashboard

#### 7.3 E2E Tests
- Multiple users active simultaneously
- Network disconnection/reconnection
- Long-running sessions
- Cleanup job execution

### 8. Deployment Checklist

- [ ] Deploy database functions and triggers
- [ ] Deploy Edge Function for automated cleanup
- [ ] Configure cron job for cleanup (every 5 minutes)
- [ ] Deploy frontend heartbeat service
- [ ] Update PageTracker component
- [ ] Add session health monitoring to dashboard
- [ ] Set up alerting for session health issues
- [ ] Test in staging environment
- [ ] Monitor performance impact

### 9. Performance Considerations

1. **Database Indexing**: Ensure `active_sessions` table has proper indexes
2. **Cleanup Frequency**: Balance cleanup frequency with performance impact
3. **Heartbeat Interval**: 30 seconds provides good balance of accuracy vs load
4. **Batch Operations**: Cleanup in batches to avoid table locks
5. **Connection Pooling**: Ensure sufficient database connections

### 10. Security Considerations

1. **Authentication**: All heartbeat calls require valid user session
2. **Authorization**: Users can only update their own sessions
3. **Rate Limiting**: Implement rate limits on heartbeat endpoints
4. **Session Validation**: Validate session ownership on each heartbeat
5. **Data Privacy**: No sensitive data in session records

### 11. Monitoring Metrics

1. **Heartbeat Success Rate**: Percentage of successful heartbeats
2. **Session Count**: Active vs stale session counts
3. **Cleanup Performance**: Time taken for cleanup operations
4. **Database Load**: Impact on database performance
5. **Error Rates**: Frequency of heartbeat/cleanup errors

### 12. Rollback Plan

If issues arise:
1. Disable heartbeat service via feature flag
2. Stop cleanup cron jobs
3. Manually clean up `active_sessions` table if needed
4. Revert to previous analytics implementation
5. Gradual re-enablement after fixes