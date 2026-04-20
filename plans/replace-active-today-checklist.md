# Replace "Active Today" with "Currently Active Users" - Implementation Checklist

## Overview
Replace the existing "Active Today" analytics card with a real-time "Currently Active Users" display that shows:
1. Real-time count of currently active users (last 2 minutes)
2. Live status indicator
3. Average session duration
4. Connection to real-time updates

## Current Implementation (to be replaced)
**Location:** `src/pages/OwnerDashboard.tsx`, lines 252-256
```jsx
<div className="bg-surface border border-border rounded-xl p-5">
  <div className="text-2xl mb-1">🟢</div>
  <div className="font-display text-2xl font-bold">{analytics.activeUsersToday}</div>
  <div className="text-xs text-muted-foreground">Active Today</div>
</div>
```

## New Implementation
```jsx
<div className="bg-surface border border-border rounded-xl p-5">
  <div className="flex items-center justify-between mb-2">
    <div className="text-2xl">👥</div>
    <div className={`text-xs px-2 py-1 rounded-full ${isRealTimeActive ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20 text-gray-500'}`}>
      {isRealTimeActive ? 'LIVE' : 'OFFLINE'}
    </div>
  </div>
  <div className="font-display text-2xl font-bold">
    {activeUsers?.activeUserCount ?? '--'}
  </div>
  <div className="text-xs text-muted-foreground">Currently Active Users</div>
  {activeUsers?.avgSessionDuration && (
    <div className="text-xs text-muted-foreground mt-1">
      Avg: {Math.round(activeUsers.avgSessionDuration / 60)}min
    </div>
  )}
</div>
```

## Required Changes

### 1. State Management Updates
- [ ] Add `activeUsers` state to store currently active users data
- [ ] Add `isRealTimeActive` state to track real-time connection status
- [ ] Update `AnalyticsData` interface to include `currentlyActiveUsers` field

### 2. Data Loading Functions
- [ ] Create `loadActiveUsers()` function to fetch currently active users
- [ ] Create `subscribeToActiveUsers()` function for real-time updates
- [ ] Add cleanup function for real-time subscription

### 3. useEffect Updates
- [ ] Call `loadActiveUsers()` in useEffect
- [ ] Set up real-time subscription in useEffect
- [ ] Clean up subscription on component unmount

### 4. UI Component Updates
- [ ] Replace the existing "Active Today" card with new design
- [ ] Add conditional rendering for loading/error states
- [ ] Ensure proper styling matches existing design system

### 5. Real-time Integration
- [ ] Implement Supabase Realtime subscription for `active_sessions` table
- [ ] Update `activeUsers` state when real-time events occur
- [ ] Handle connection/disconnection states

### 6. Error Handling
- [ ] Add error handling for failed data loading
- [ ] Implement fallback display when real-time is unavailable
- [ ] Add loading states during initial fetch

## Step-by-Step Implementation

### Step 1: Update Interfaces
```typescript
// Add to existing AnalyticsData interface or create new interface
interface ActiveUsersData {
  activeUserCount: number;
  totalSessions: number;
  avgSessionDuration: number;
  activeUsers: Array<{
    user_id: string;
    full_name: string;
    username: string;
    last_active: string;
    session_duration: number;
    user_agent: string;
    activity_status: string;
  }>;
}

// Update component state
const [activeUsers, setActiveUsers] = useState<ActiveUsersData | null>(null);
const [isRealTimeActive, setIsRealTimeActive] = useState(false);
```

### Step 2: Create Data Service
```typescript
// src/services/activeUsersService.ts
export class ActiveUsersService {
  static async getCurrentlyActiveUsers(): Promise<ActiveUsersData> {
    // Implementation from implementation-plan.md
  }

  static subscribeToActiveUsers(callback: (data: ActiveUsersData) => void) {
    // Implementation from implementation-plan.md
  }
}
```

### Step 3: Update useEffect
```typescript
useEffect(() => {
  // Load initial data
  loadActiveUsers();
  
  // Set up real-time subscription
  const unsubscribe = ActiveUsersService.subscribeToActiveUsers((data) => {
    setActiveUsers(data);
    setIsRealTimeActive(true);
  });
  
  // Clean up on unmount
  return () => {
    unsubscribe?.();
    setIsRealTimeActive(false);
  };
}, []);
```

### Step 4: Replace UI Component
Replace the existing card with the new implementation shown above.

### Step 5: Add Loading State
```jsx
<div className="font-display text-2xl font-bold">
  {activeUsers ? activeUsers.activeUserCount : (
    <span className="text-muted-foreground">Loading...</span>
  )}
</div>
```

### Step 6: Add Error State
```jsx
{error && (
  <div className="text-xs text-red-500 mt-1">
    Failed to load active users
  </div>
)}
```

## Testing Checklist

### Functional Tests
- [ ] Card displays correct count of currently active users
- [ ] Real-time updates work when users become active/inactive
- [ ] "LIVE" indicator shows when real-time is connected
- [ ] "OFFLINE" indicator shows when real-time is disconnected
- [ ] Average session duration displays correctly
- [ ] Loading state shows during initial fetch
- [ ] Error state shows when data fails to load
- [ ] Card styling matches existing design system

### Integration Tests
- [ ] Real-time subscription connects/disconnects properly
- [ ] Data updates trigger UI re-renders
- [ ] Multiple simultaneous users tracked correctly
- [ ] Session timeout (2 minutes) works correctly

### Performance Tests
- [ ] Real-time updates don't cause performance issues
- [ ] Memory leaks from subscriptions are prevented
- [ ] Cleanup functions work correctly

### Edge Cases
- [ ] No active users (shows 0)
- [ ] Network disconnection/reconnection
- [ ] Database connection issues
- [ ] User permissions (non-owner shouldn't see this)

## Rollback Plan
If issues arise:
1. Revert to showing "Active Today" (daily aggregate) instead of real-time
2. Keep the same card design but use `analytics.activeUsersToday` data
3. Remove real-time subscription code
4. Keep the new service functions for future use

## Success Criteria
- [ ] "Active Today" label changed to "Currently Active Users"
- [ ] Real-time user count updates automatically
- [ ] Live status indicator works
- [ ] Average session duration shows when available
- [ ] No breaking changes to existing functionality
- [ ] Performance remains acceptable
- [ ] All tests pass

## Dependencies
1. Database migration for `active_sessions` table must be applied first
2. Heartbeat service must be implemented and running
3. Supabase Realtime must be enabled for the `active_sessions` table

## Timeline
This should be implemented after:
- [ ] Database schema is created
- [ ] Heartbeat service is implemented
- [ ] Active users service is created

And before:
- [ ] Advanced analytics features are added
- [ ] Final testing phase