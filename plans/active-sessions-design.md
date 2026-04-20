# Active User Tracking System Design

## Overview
Real-time active user tracking system for owner-only analytics dashboard.

## Current System Analysis
- **Existing Analytics**: Uses `page_views` table (7-day window)
- **Active Users Today**: Calculated from page views today (not real-time)
- **Owner Access**: `is_owner()` function for RLS policies
- **Dashboard**: Shows "Active Today" (daily aggregate)

## New Requirements
1. **Real-time Active Users**: Currently active users (last 2-5 minutes)
2. **User List**: Names/usernames of currently active users
3. **Advanced Analytics**: Additional owner-only metrics
4. **Replace "Active Today"**: With "Currently Active Users" display

## Database Schema

### 1. active_sessions Table
```sql
CREATE TABLE active_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id text NOT NULL, -- Unique session identifier
  last_heartbeat timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_agent text,
  ip_address inet,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Index for performance
CREATE INDEX idx_active_sessions_user_id ON active_sessions(user_id);
CREATE INDEX idx_active_sessions_last_heartbeat ON active_sessions(last_heartbeat);
CREATE INDEX idx_active_sessions_session_id ON active_sessions(session_id);

-- RLS Policies
ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own sessions
CREATE POLICY "Users can manage own sessions"
  ON active_sessions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Owners can read all active sessions
CREATE POLICY "Owners can read all active sessions"
  ON active_sessions FOR SELECT
  TO authenticated
  USING (public.is_owner(auth.uid()));
```

### 2. user_activity Table (Optional - for advanced analytics)
```sql
CREATE TABLE user_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type text NOT NULL, -- 'login', 'page_view', 'heartbeat', 'logout'
  page_path text,
  user_agent text,
  ip_address inet,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS Policies (similar to active_sessions)
```

## Session Tracking Logic

### Heartbeat Mechanism
1. **Frontend**: Send heartbeat every 30 seconds while user is active
2. **Backend**: Update `last_heartbeat` timestamp
3. **Session Timeout**: Consider inactive after 2 minutes of no heartbeat

### Session Management
```sql
-- Function to update or create session
CREATE OR REPLACE FUNCTION update_user_session(
  p_user_id uuid,
  p_session_id text,
  p_user_agent text DEFAULT NULL,
  p_ip_address inet DEFAULT NULL
) RETURNS void AS $$
BEGIN
  INSERT INTO active_sessions (user_id, session_id, last_heartbeat, user_agent, ip_address)
  VALUES (p_user_id, p_session_id, now(), p_user_agent, p_ip_address)
  ON CONFLICT (session_id) DO UPDATE
  SET last_heartbeat = now(),
      user_agent = EXCLUDED.user_agent,
      ip_address = EXCLUDED.ip_address;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up stale sessions (run periodically)
CREATE OR REPLACE FUNCTION cleanup_stale_sessions()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM active_sessions
  WHERE last_heartbeat < now() - interval '5 minutes'
  RETURNING count(*) INTO deleted_count;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
```

## Frontend Implementation

### 1. Heartbeat Service
```typescript
// src/services/heartbeatService.ts
class HeartbeatService {
  private intervalId: NodeJS.Timeout | null = null;
  private sessionId: string;
  
  start() {
    this.sessionId = crypto.randomUUID();
    this.sendHeartbeat();
    this.intervalId = setInterval(() => this.sendHeartbeat(), 30000);
  }
  
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
  
  private async sendHeartbeat() {
    // Call Supabase function to update session
  }
}
```

### 2. Page Tracker Integration
Update existing `PageTracker` component to include heartbeat functionality.

## Dashboard Updates

### 1. New Analytics Interface
```typescript
interface ActiveUser {
  user_id: string;
  full_name: string;
  username: string;
  last_active: string;
  session_duration: number;
}

interface AdvancedAnalytics {
  currentlyActiveUsers: ActiveUser[];
  activeUserCount: number;
  peakActiveTime: string;
  averageSessionDuration: number;
  userRetentionRate: number;
  // ... additional metrics
}
```

### 2. UI Components
- **Active Users Card**: Replace "Active Today" with real-time count
- **Active Users List**: Expandable list showing currently active users
- **Advanced Metrics Section**: New section for additional analytics

## Security Considerations
1. **Owner-Only Access**: All new data accessible only to owners
2. **Data Privacy**: No sensitive user information exposed
3. **Session Security**: Proper session validation
4. **Rate Limiting**: Prevent heartbeat abuse

## Performance Considerations
1. **Database Indexing**: Proper indexes for query performance
2. **Cleanup Jobs**: Regular cleanup of stale sessions
3. **Caching**: Consider caching for frequently accessed data
4. **Real-time Updates**: Use Supabase Realtime for live updates

## Migration Plan
1. Create database tables and functions
2. Implement frontend heartbeat service
3. Update OwnerDashboard with new components
4. Test thoroughly
5. Deploy migration
6. Monitor performance

## Testing Strategy
1. **Unit Tests**: Heartbeat service, session functions
2. **Integration Tests**: Database operations, RLS policies
3. **E2E Tests**: Full user flow with active tracking
4. **Performance Tests**: Load testing with multiple concurrent users