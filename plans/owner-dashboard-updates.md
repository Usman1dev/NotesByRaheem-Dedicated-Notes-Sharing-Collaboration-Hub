# OwnerDashboard Updates Plan

## Current Structure Analysis
The OwnerDashboard currently has:
1. **Stat Cards Section** (lines 235-244): Shows various metrics
2. **Analytics Section** (lines 247-349): Shows analytics data including:
   - Active Today (card)
   - Active This Week (card)
   - Page Views (7d) (card)
   - Banned Users (card)
   - Top Pages (7d) section
   - Browser Usage section
   - Recent Activity table

## Required Changes

### 1. Update Analytics Interface
**File:** `src/pages/OwnerDashboard.tsx`

#### Current Interface (lines 23-31):
```typescript
interface AnalyticsData {
  activeUsersToday: number;
  activeUsersWeek: number;
  totalPageViews: number;
  topPages: { path: string; count: number }[];
  recentVisitors: any[];
  browserBreakdown: { browser: string; count: number }[];
  bannedUsers: number;
}
```

#### New Interface:
```typescript
interface ActiveUser {
  user_id: string;
  full_name: string;
  username: string;
  last_active: string;
  session_duration: number;
  user_agent: string;
  activity_status: string;
}

interface ActiveUsersData {
  activeUserCount: number;
  totalSessions: number;
  avgSessionDuration: number;
  activeUsers: ActiveUser[];
}

interface AdvancedAnalytics {
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

interface AnalyticsData {
  // Keep existing fields
  activeUsersToday: number;
  activeUsersWeek: number;
  totalPageViews: number;
  topPages: { path: string; count: number }[];
  recentVisitors: any[];
  browserBreakdown: { browser: string; count: number }[];
  bannedUsers: number;
  
  // Add new fields
  currentlyActiveUsers: ActiveUsersData;
  advancedAnalytics: AdvancedAnalytics;
}
```

### 2. Update State Management
**Current state (line 44):**
```typescript
const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
```

**Add new states:**
```typescript
const [activeUsers, setActiveUsers] = useState<ActiveUsersData | null>(null);
const [advancedAnalytics, setAdvancedAnalytics] = useState<AdvancedAnalytics | null>(null);
const [isRealTimeActive, setIsRealTimeActive] = useState(false);
```

### 3. Add New Data Loading Functions

#### Function to load active users:
```typescript
const loadActiveUsers = async () => {
  try {
    const data = await ActiveUsersService.getCurrentlyActiveUsers();
    setActiveUsers(data);
  } catch (error) {
    console.error('Failed to load active users:', error);
  }
};

const subscribeToActiveUsers = () => {
  const unsubscribe = ActiveUsersService.subscribeToActiveUsers((data) => {
    setActiveUsers(data);
  });
  return unsubscribe;
};
```

#### Function to load advanced analytics:
```typescript
const loadAdvancedAnalytics = async () => {
  try {
    const data = await AdvancedAnalyticsService.getAdvancedAnalytics();
    setAdvancedAnalytics(data);
  } catch (error) {
    console.error('Failed to load advanced analytics:', error);
  }
};
```

### 4. Update useEffect Hooks
**Current useEffect (lines 52-55):**
```typescript
useEffect(() => {
  loadAnalytics();
  loadData();
}, []);
```

**Updated useEffect:**
```typescript
useEffect(() => {
  loadAnalytics();
  loadData();
  loadActiveUsers();
  loadAdvancedAnalytics();
  
  // Subscribe to real-time updates
  const unsubscribe = subscribeToActiveUsers();
  setIsRealTimeActive(true);
  
  return () => {
    unsubscribe?.();
    setIsRealTimeActive(false);
  };
}, []);
```

### 5. Update Stat Cards Section
**Current statCards (lines 218-226):**
```typescript
const statCards = [
  { icon: '👥', label: 'Total Users', value: totalUsers },
  { icon: '📚', label: 'Total Courses', value: totalCourses },
  { icon: '📝', label: 'Total Notes', value: totalNotes },
  { icon: '💬', label: 'Total Messages', value: totalMessages },
  { icon: '📊', label: 'Analytics Ready', value: analytics ? 'Yes' : 'No' },
];
```

**Updated statCards:**
```typescript
const statCards = [
  { icon: '👥', label: 'Total Users', value: totalUsers },
  { icon: '📚', label: 'Total Courses', value: totalCourses },
  { icon: '📝', label: 'Total Notes', value: totalNotes },
  { icon: '💬', label: 'Total Messages', value: totalMessages },
  { 
    icon: isRealTimeActive ? '🟢' : '🔴', 
    label: 'Active Users', 
    value: activeUsers?.activeUserCount ?? '--' 
  },
];
```

### 6. Replace "Active Today" Card with "Currently Active Users"

**Current card (lines 252-256):**
```jsx
<div className="bg-surface border border-border rounded-xl p-5">
  <div className="text-2xl mb-1">🟢</div>
  <div className="font-display text-2xl font-bold">{analytics.activeUsersToday}</div>
  <div className="text-xs text-muted-foreground">Active Today</div>
</div>
```

**New card design:**
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

### 7. Add Active Users List Section
**Add after the analytics cards section (before Top Pages):**
```jsx
{/* Currently Active Users List */}
{activeUsers && activeUsers.activeUsers.length > 0 && (
  <div className="bg-surface border border-border rounded-xl p-6 mb-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-display text-lg font-semibold">👥 Currently Active Users</h3>
      <div className="text-sm text-muted-foreground">
        Updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
    
    <div className="overflow-x-auto">
      <table className="w-full border-collapse min-w-[600px]">
        <thead>
          <tr>
            {['User', 'Status', 'Duration', 'Last Active', 'Device'].map(h => (
              <th key={h} className="text-left p-3 bg-background border-b border-border text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {activeUsers.activeUsers.map((user, i) => (
            <tr key={i} className="hover:bg-background">
              <td className="p-3 border-b border-border text-sm">
                <div className="font-medium">{user.full_name}</div>
                <div className="text-xs text-muted-foreground">@{user.username}</div>
              </td>
              <td className="p-3 border-b border-border text-sm">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  user.activity_status === 'Very Active' ? 'bg-green-100 text-green-800' :
                  user.activity_status === 'Active' ? 'bg-blue-100 text-blue-800' :
                  user.activity_status === 'Idle' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {user.activity_status}
                </span>
              </td>
              <td className="p-3 border-b border-border text-sm">
                {Math.round(user.session_duration / 60)} min
              </td>
              <td className="p-3 border-b border-border text-sm text-muted-foreground">
                {format(new Date(user.last_active), 'h:mm a')}
              </td>
              <td className="p-3 border-b border-border text-sm">
                {user.user_agent?.includes('Mobile') ? '📱 Mobile' : '💻 Desktop'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    
    <div className="mt-4 text-sm text-muted-foreground">
      Total: {activeUsers.activeUserCount} users • {activeUsers.totalSessions} sessions
    </div>
  </div>
)}
```

### 8. Add Advanced Analytics Section
**Add after the Currently Active Users List:**
```jsx
{/* Advanced Analytics */}
{advancedAnalytics && (
  <div className="bg-surface border border-border rounded-xl p-6 mb-6">
    <h3 className="font-display text-lg font-semibold mb-4">📈 Advanced Analytics</h3>
    
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-background border border-border rounded-lg p-4">
        <div className="text-sm text-muted-foreground mb-1">Peak Activity</div>
        <div className="font-display text-xl font-bold">{advancedAnalytics.peakActivityTime}</div>
      </div>
      
      <div className="bg-background border border-border rounded-lg p-4">
        <div className="text-sm text-muted-foreground mb-1">Retention Rate</div>
        <div className="font-display text-xl font-bold">
          {Math.round(advancedAnalytics.userRetentionRate * 100)}%
        </div>
      </div>
      
      <div className="bg-background border border-border rounded-lg p-4">
        <div className="text-sm text-muted-foreground mb-1">New Users</div>
        <div className="font-display text-xl font-bold">
          {advancedAnalytics.newVsReturningUsers.new}
        </div>
      </div>
      
      <div className="bg-background border border-border rounded-lg p-4">
        <div className="text-sm text-muted-foreground mb-1">Returning Users</div>
        <div className="font-display text-xl font-bold">
          {advancedAnalytics.newVsReturningUsers.returning}
        </div>
      </div>
    </div>
    
    {/* Device Breakdown */}
    <div className="mb-6">
      <h4 className="font-medium mb-3">Device Breakdown</h4>
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="flex justify-between text-sm mb-1">
            <span>Desktop</span>
            <span>{advancedAnalytics.deviceBreakdown.desktop}</span>
          </div>
          <div className="h-2 bg-surface2 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(advancedAnalytics.deviceBreakdown.desktop / 20) * 100}%` }} />
          </div>
        </div>
        
        <div className="flex-1">
          <div className="flex justify-between text-sm mb-1">
            <span>Mobile</span>
            <span>{advancedAnalytics.deviceBreakdown.mobile}</span>
          </div>
          <div className="h-2 bg-surface2 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full" style={{ width: `${(advancedAnalytics.deviceBreakdown.mobile / 20) * 100}%` }} />
          </div>
        </div>
        
        <div className="flex-1">
          <div className="flex justify-between text-sm mb-1">
            <span>Tablet</span>
            <span>{advancedAnalytics.deviceBreakdown.tablet}</span>
          </div>
          <div className="h-2 bg-surface2 rounded-full overflow-hidden">
            <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(advancedAnalytics.deviceBreakdown.tablet / 20) * 100}%` }} />
          </div>
        </div>
      </div>
    </div>
    
    {/* Popular Pages with Active Users */}
    <div>
      <h4 className="font-medium mb-3">Popular Pages (with Active Users)</h4>
      <div className="space-y-3">
        {advancedAnalytics.popularPages.map((page, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="text-sm font-medium truncate">{page.path}</div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">{page.views} views</div>
              <div className="text-sm text-green-500">{page.activeUsers} active</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
)}
```

### 9. Update Imports
**Add these imports at the top of the file:**
```typescript
import { ActiveUsersService, type ActiveUsersData, type ActiveUser } from '@/services/activeUsersService';
import { AdvancedAnalyticsService, type AdvancedAnalytics } from '@/services/advancedAnalyticsService';
```

### 10. File Organization
Create new service files:
1. `src/services/activeUsersService.ts` - Active users data fetching
2. `src/services/advancedAnalyticsService.ts` - Advanced analytics
3. `src/services/heartbeatService.ts` - Heartbeat mechanism
4. `src/hooks/useHeartbeat.ts` - React hook for heartbeat

### 11. CSS Updates
Add any necessary CSS classes for the new components (most should use existing Tailwind classes).

## Implementation Order
1. Create service files first
2. Update interfaces and state
3. Add new data loading functions
4. Update useEffect hooks
5. Update stat cards
6. Replace "Active Today" card
7. Add Currently Active Users List
8. Add Advanced Analytics section
9. Test each component
10. Verify real-time updates work

## Testing Checklist
- [ ] Active users data loads correctly
- [ ] Real-time updates work
- [ ] "Currently Active Users" card shows correct count
- [ ] Active users list displays correctly
- [ ] Advanced analytics section loads
- [ ] All existing functionality still works
- [ ] Mobile responsiveness maintained
- [ ] Error handling works (no data scenarios)
- [ ] Performance acceptable with real-time updates