# Implementation Plan: Real-Time Active User Monitoring

## Phase 1: Database Setup
1. **Apply Migration**: Run the SQL migration to create `active_sessions` table and functions
2. **Test Database Functions**: Verify all functions work correctly
3. **Set Up Cleanup Job**: Configure periodic cleanup of stale sessions

## Phase 2: Frontend Heartbeat Service
### File: `src/services/heartbeatService.ts`
```typescript
import { supabase } from '@/integrations/supabase/client';

class HeartbeatService {
  private intervalId: NodeJS.Timeout | null = null;
  private sessionId: string;
  private isActive = false;

  constructor() {
    this.sessionId = crypto.randomUUID();
  }

  start(userId: string) {
    if (this.isActive) return;
    
    this.isActive = true;
    this.sendHeartbeat(userId);
    
    // Send heartbeat every 30 seconds
    this.intervalId = setInterval(() => {
      this.sendHeartbeat(userId);
    }, 30000);
    
    // Clean up on page unload
    window.addEventListener('beforeunload', () => this.stop());
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    if (this.isActive && this.sessionId) {
      this.endSession();
    }
    
    this.isActive = false;
  }

  private async sendHeartbeat(userId: string) {
    try {
      const userAgent = navigator.userAgent;
      // Note: IP address would need to be obtained from a backend service
      
      const { error } = await supabase.rpc('update_user_session', {
        p_user_id: userId,
        p_session_id: this.sessionId,
        p_user_agent: userAgent
      });

      if (error) {
        console.warn('Heartbeat failed:', error.message);
      }
    } catch (error) {
      console.error('Heartbeat error:', error);
    }
  }

  private async endSession() {
    try {
      await supabase.rpc('end_user_session', {
        p_session_id: this.sessionId
      });
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  }
}

export const heartbeatService = new HeartbeatService();
```

### File: `src/hooks/useHeartbeat.ts`
```typescript
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { heartbeatService } from '@/services/heartbeatService';

export function useHeartbeat() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    heartbeatService.start(user.id);

    return () => {
      heartbeatService.stop();
    };
  }, [user?.id]);
}
```

## Phase 3: Update PageTracker Component
### File: `src/components/PageTracker.tsx` (update existing)
Add heartbeat integration to the existing page tracker:
```typescript
// Add to existing PageTracker component
import { useHeartbeat } from '@/hooks/useHeartbeat';

function PageTracker() {
  useHeartbeat(); // Start heartbeat when component mounts
  
  // Existing page tracking logic...
}
```

## Phase 4: Owner Dashboard Analytics Service
### File: `src/services/activeUsersService.ts`
```typescript
import { supabase } from '@/integrations/supabase/client';

export interface ActiveUser {
  user_id: string;
  full_name: string;
  username: string;
  last_active: string;
  session_duration: number;
  user_agent: string;
  activity_status: string;
}

export interface ActiveUsersData {
  activeUserCount: number;
  totalSessions: number;
  avgSessionDuration: number;
  activeUsers: ActiveUser[];
}

export class ActiveUsersService {
  static async getCurrentlyActiveUsers(): Promise<ActiveUsersData> {
    try {
      // Get aggregate data
      const { data: aggregateData, error: aggregateError } = await supabase
        .from('owner_active_users')
        .select('*')
        .single();

      if (aggregateError) throw aggregateError;

      // Get detailed user list
      const { data: userDetails, error: detailsError } = await supabase
        .from('owner_active_users_detail')
        .select('*');

      if (detailsError) throw detailsError;

      return {
        activeUserCount: aggregateData?.active_user_count || 0,
        totalSessions: aggregateData?.total_sessions || 0,
        avgSessionDuration: aggregateData?.avg_session_duration_seconds || 0,
        activeUsers: (userDetails || []).map(user => ({
          user_id: user.user_id,
          full_name: user.full_name,
          username: user.username,
          last_active: user.last_heartbeat,
          session_duration: user.session_duration_seconds,
          user_agent: user.user_agent,
          activity_status: user.activity_status
        }))
      };
    } catch (error) {
      console.error('Failed to fetch active users:', error);
      return {
        activeUserCount: 0,
        totalSessions: 0,
        avgSessionDuration: 0,
        activeUsers: []
      };
    }
  }

  static subscribeToActiveUsers(callback: (data: ActiveUsersData) => void) {
    // Use Supabase Realtime for live updates
    const channel = supabase
      .channel('active-users')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'active_sessions'
        },
        async () => {
          const data = await this.getCurrentlyActiveUsers();
          callback(data);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}
```

## Phase 5: Advanced Analytics Features
### File: `src/services/advancedAnalyticsService.ts`
```typescript
import { supabase } from '@/integrations/supabase/client';

export interface AdvancedAnalytics {
  peakActivityTime: string;
  userRetentionRate: number;
  newVsReturningUsers: {
    new: number;
    returning: number;
  };
  popularPages: Array<{
    path: string;
    views: number;
    activeUsers: number;
  }>;
  deviceBreakdown: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
}

export class AdvancedAnalyticsService {
  static async getAdvancedAnalytics(): Promise<AdvancedAnalytics> {
    // Implement advanced analytics queries
    // This would require additional database views/functions
    
    return {
      peakActivityTime: '14:30',
      userRetentionRate: 0.75,
      newVsReturningUsers: {
        new: 5,
        returning: 15
      },
      popularPages: [
        { path: '/dashboard', views: 120, activeUsers: 8 },
        { path: '/courses', views: 85, activeUsers: 6 }
      ],
      deviceBreakdown: {
        desktop: 12,
        mobile: 6,
        tablet: 2
      }
    };
  }
}
```

## Phase 6: Testing Strategy
1. **Unit Tests**: 
   - Heartbeat service
   - Active users service
   - Database functions
2. **Integration Tests**:
   - Full heartbeat flow
   - Dashboard data fetching
   - Real-time updates
3. **E2E Tests**:
   - Multiple users active simultaneously
   - Session timeout behavior
   - Owner dashboard updates

## Phase 7: Deployment Checklist
- [ ] Apply database migration
- [ ] Deploy updated frontend code
- [ ] Configure cleanup cron job (optional)
- [ ] Test in staging environment
- [ ] Monitor performance metrics
- [ ] Verify owner-only access

## Security Considerations
1. **Authentication**: All heartbeat calls require authenticated user
2. **Authorization**: Only owners can view active users data
3. **Data Privacy**: No sensitive information exposed
4. **Rate Limiting**: Implement heartbeat rate limits
5. **Session Validation**: Validate session ownership

## Performance Optimizations
1. **Database Indexing**: Ensure proper indexes on `active_sessions`
2. **Query Optimization**: Use materialized views for complex analytics
3. **Caching**: Cache active users data with short TTL
4. **Batch Updates**: Consider batch heartbeat updates
5. **Cleanup Efficiency**: Optimize stale session cleanup

## Monitoring & Alerting
1. **Metrics to Monitor**:
   - Active sessions count
   - Heartbeat success rate
   - Cleanup job performance
   - Database query performance
2. **Alerts**:
   - Sudden drop in active users
   - Heartbeat failure rate > 5%
   - Cleanup job failures
   - High database load