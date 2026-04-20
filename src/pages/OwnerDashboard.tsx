import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardSidebar from '@/components/DashboardSidebar';
import NotificationBell from '@/components/NotificationBell';
import { toast } from 'sonner';
import { format, subDays, startOfDay } from 'date-fns';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { activeUsersService, type ActiveUser, type ActiveUsersStats } from '@/services/activeUsersService';

const navItems = [
  { href: '/dashboard', icon: '📊', label: 'Dashboard' },
  { href: '/courses', icon: '📚', label: 'Courses' },
  { href: '/ai-notes', icon: '🤖', label: 'AI Notes' },
  { href: '/bookmarks', icon: '🔖', label: 'Bookmarks' },
  { href: '/upload', icon: '⬆', label: 'Upload Note' },
  { href: '/owner/ai-notes', icon: '🤖', label: 'Upload AI Notes' },
  { href: '/chatroom', icon: '💬', label: 'Chatroom' },
  { href: '/admin', icon: '⚙', label: 'Admin Panel' },
  { href: '/admin/pending', icon: '⏳', label: 'Pending Notes' },
  { href: '/admin/courses', icon: '🎓', label: 'Manage Courses' },
  { href: '/owner', icon: '👑', label: 'Owner Panel' },
  { href: '/owner/users', icon: '👥', label: 'Manage Users' },
  { href: '/owner/notes', icon: '📄', label: 'All Notes' },
];

interface AnalyticsData {
  activeUsersToday: number;
  activeUsersWeek: number;
  totalPageViews: number;
  topPages: { path: string; count: number }[];
  recentVisitors: { user_id: string; full_name: string; username: string; path: string; created_at: string; user_agent: string }[];
  browserBreakdown: { browser: string; count: number }[];
  bannedUsers: number;
}

function parseBrowser(ua: string): string {
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
  return 'Other';
}

export default function OwnerDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ users: 0, notes: 0, downloads: 0, pending: 0, courses: 0 });
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnContent, setNewAnnContent] = useState('');
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<string | null>(null);
  const [convoMessages, setConvoMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [currentlyActiveUsers, setCurrentlyActiveUsers] = useState<ActiveUser[]>([]);
  const [activeUsersStats, setActiveUsersStats] = useState<ActiveUsersStats | null>(null);
  const [isLoadingActiveUsers, setIsLoadingActiveUsers] = useState(false);

  useEffect(() => {
    loadData();
    loadAnalytics();
    loadCurrentlyActiveUsers();
  }, []);

  // Subscribe to real-time active users updates
  useEffect(() => {
    const unsubscribe = activeUsersService.subscribeToActiveUsers((users) => {
      setCurrentlyActiveUsers(users);
      calculateActiveUsersStats(users);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const loadAnalytics = async () => {
    const today = startOfDay(new Date()).toISOString();
    const weekAgo = subDays(new Date(), 7).toISOString();

    // Get page views
    const { data: pageViews } = await supabase
      .from('page_views')
      .select('*')
      .gte('created_at', weekAgo)
      .order('created_at', { ascending: false });

    if (!pageViews) return;

    // Get profiles for user info
    const userIds = [...new Set(pageViews.map(pv => pv.user_id).filter(Boolean))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, username')
      .in('id', userIds);
    const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));

    // Active users today
    const todayViews = pageViews.filter(pv => pv.created_at >= today);
    const activeToday = new Set(todayViews.map(pv => pv.user_id)).size;
    const activeWeek = new Set(pageViews.map(pv => pv.user_id)).size;

    // Top pages
    const pageCounts: Record<string, number> = {};
    pageViews.forEach(pv => {
      pageCounts[pv.path] = (pageCounts[pv.path] || 0) + 1;
    });
    const topPages = Object.entries(pageCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([path, count]) => ({ path, count }));

    // Browser breakdown
    const browserCounts: Record<string, number> = {};
    pageViews.forEach(pv => {
      const browser = parseBrowser(pv.user_agent || '');
      browserCounts[browser] = (browserCounts[browser] || 0) + 1;
    });
    const browserBreakdown = Object.entries(browserCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([browser, count]) => ({ browser, count }));

    // Recent visitors
    const recentVisitors = pageViews.slice(0, 20).map(pv => ({
      user_id: pv.user_id,
      full_name: profileMap[pv.user_id]?.full_name || 'Unknown',
      username: profileMap[pv.user_id]?.username || 'unknown',
      path: pv.path,
      created_at: pv.created_at,
      user_agent: pv.user_agent || '',
    }));

    // Banned users count
    const { data: bannedData } = await supabase
      .from('profiles')
      .select('id')
      .eq('is_banned', true);

    setAnalytics({
      activeUsersToday: activeToday,
      activeUsersWeek: activeWeek,
      totalPageViews: pageViews.length,
      topPages,
      recentVisitors,
      browserBreakdown,
      bannedUsers: bannedData?.length || 0,
    });
  };

  const loadCurrentlyActiveUsers = async () => {
    setIsLoadingActiveUsers(true);
    try {
      console.log('Loading currently active users...');
      const users = await activeUsersService.getCurrentlyActiveUsers();
      console.log('Loaded active users:', users.length, users);
      setCurrentlyActiveUsers(users);
      calculateActiveUsersStats(users);
    } catch (error) {
      console.error('Failed to load currently active users:', error);
      toast.error('Failed to load active users data');
    } finally {
      setIsLoadingActiveUsers(false);
    }
  };

  const calculateActiveUsersStats = (users: ActiveUser[]) => {
    const deviceCounts: Record<string, number> = {};
    const browserCounts: Record<string, number> = {};
    
    users.forEach(user => {
      deviceCounts[user.device_type] = (deviceCounts[user.device_type] || 0) + 1;
      browserCounts[user.browser] = (browserCounts[user.browser] || 0) + 1;
    });

    // Calculate average session duration
    const totalDuration = users.reduce((sum, user) => {
      const duration = parseDurationToMinutes(user.session_duration);
      return sum + duration;
    }, 0);
    
    const avgDuration = users.length > 0
      ? formatDuration(totalDuration / users.length)
      : '0m';

    // Find peak hour (simplified - using current hour as placeholder)
    const now = new Date();
    const peakHour = `${now.getHours()}:00`;

    setActiveUsersStats({
      total_active: users.length,
      active_by_device: deviceCounts,
      active_by_browser: browserCounts,
      peak_hour: peakHour,
      average_session_duration: avgDuration
    });
  };

  const parseDurationToMinutes = (duration: string): number => {
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
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 1) {
      return `${Math.round(minutes * 60)}s`;
    } else if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = Math.round(minutes % 60);
      return `${hours}h ${mins}m`;
    }
  };

  const loadData = async () => {
    const [usersRes, notesRes, downloadsRes, coursesRes, annRes] = await Promise.all([
      supabase.from('profiles').select('id'),
      supabase.from('notes').select('id, status'),
      supabase.from('download_logs').select('id'),
      supabase.from('courses').select('id').eq('is_active', true),
      supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(10),
    ]);
    const notes = notesRes.data || [];
    setStats({
      users: usersRes.data?.length || 0,
      notes: notes.length,
      downloads: downloadsRes.data?.length || 0,
      pending: notes.filter(n => n.status === 'pending').length,
      courses: coursesRes.data?.length || 0,
    });
    setAnnouncements(annRes.data || []);

    const { data: dms } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`sender_id.eq.${user!.id},receiver_id.eq.${user!.id}`)
      .order('created_at', { ascending: false });

    if (dms) {
      const userIds = new Set<string>();
      dms.forEach(m => {
        const otherId = m.sender_id === user!.id ? m.receiver_id : m.sender_id;
        userIds.add(otherId);
      });
      const { data: profiles } = await supabase.from('profiles').select('id, username, full_name, avatar_url, role').in('id', Array.from(userIds));
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));

      const convos = Array.from(userIds).map(uid => {
        const userMsgs = dms.filter(m => m.sender_id === uid || m.receiver_id === uid);
        const unread = userMsgs.filter(m => m.receiver_id === user!.id && !m.is_read).length;
        return { userId: uid, profile: profileMap[uid], lastMessage: userMsgs[0], unread };
      });
      setConversations(convos);
    }
  };

  const createAnnouncement = async () => {
    if (!newAnnTitle.trim() || !newAnnContent.trim()) { toast.error('Title and content required'); return; }
    await supabase.from('announcements').insert({ title: newAnnTitle.trim(), content: newAnnContent.trim(), created_by: user!.id });
    toast.success('Announcement created');
    setNewAnnTitle('');
    setNewAnnContent('');
    loadData();
  };

  const openConversation = async (userId: string) => {
    setSelectedConvo(userId);
    const { data } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`and(sender_id.eq.${user!.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${user!.id})`)
      .order('created_at', { ascending: true });
    setConvoMessages(data || []);

    await supabase
      .from('direct_messages')
      .update({ is_read: true })
      .eq('sender_id', userId)
      .eq('receiver_id', user!.id)
      .eq('is_read', false);

    setConversations(prev => prev.map(c => c.userId === userId ? { ...c, unread: 0 } : c));
  };

  const sendReply = async () => {
    if (!replyText.trim() || !selectedConvo) return;
    await supabase.from('direct_messages').insert({
      sender_id: user!.id,
      receiver_id: selectedConvo,
      content: replyText.trim(),
    });
    setReplyText('');
    openConversation(selectedConvo);
  };

  const deleteAnnouncement = async (id: string) => {
    if (!confirm('Delete this announcement?')) return;
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Announcement deleted');
    loadData();
  };

  const statCards = [
    { icon: '👥', value: stats.users, label: 'Total Users' },
    { icon: '📚', value: stats.notes, label: 'Total Notes' },
    { icon: '⬇️', value: stats.downloads, label: 'Total Downloads' },
    { icon: '⏳', value: stats.pending, label: 'Pending Notes' },
    { icon: '🎓', value: stats.courses, label: 'Active Courses' },
  ];

  return (
    <div className="flex min-h-screen bg-background relative z-[1]">
      <DashboardSidebar items={navItems} />
      <main className="flex-1 lg:ml-60 p-4 sm:p-8 pt-16 lg:pt-8">
        <div className="flex justify-between items-center mb-12 mt-2 lg:mt-0">
          <div>
            <h1 className="font-display text-4xl font-bold tracking-tight mb-2">Owner Dashboard</h1>
            <p className="text-muted-foreground">Complete overview of the platform.</p>
          </div>
          <NotificationBell />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6 mb-12">
          {statCards.map((s, i) => (
            <div key={i} className="bg-surface border border-border rounded-xl p-6 flex items-center gap-4 hover:-translate-y-1 hover:border-primary transition-all">
              <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center text-2xl text-primary-foreground">{s.icon}</div>
              <div>
                <div className="font-display text-3xl font-bold leading-none">{s.value}</div>
                <div className="text-muted-foreground text-sm">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Currently Active Users Section - Moved up above Top Pages and Browser Usage */}
        <div className="bg-surface border border-border rounded-xl p-6 mb-6">
          <h2 className="font-display text-2xl font-semibold mb-6">👥 Currently Active Users</h2>
          
          {isLoadingActiveUsers ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-muted-foreground mt-2">Loading active users...</p>
            </div>
          ) : currentlyActiveUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="text-4xl mb-2">👤</div>
              <p>No users are currently active</p>
              <p className="text-sm mt-1">Users will appear here when they're actively using the site</p>
            </div>
          ) : (
            <>
              {/* Active Users Stats */}
              {activeUsersStats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  <div className="bg-background border border-border rounded-lg p-4">
                    <div className="text-sm text-muted-foreground mb-1">Avg. Session</div>
                    <div className="font-display text-xl font-bold">{activeUsersStats.average_session_duration}</div>
                  </div>
                  <div className="bg-background border border-border rounded-lg p-4">
                    <div className="text-sm text-muted-foreground mb-1">Peak Hour</div>
                    <div className="font-display text-xl font-bold">{activeUsersStats.peak_hour}</div>
                  </div>
                  <div className="bg-background border border-border rounded-lg p-4">
                    <div className="text-sm text-muted-foreground mb-1">Mobile Users</div>
                    <div className="font-display text-xl font-bold">
                      {activeUsersStats.active_by_device['Mobile'] || 0}
                    </div>
                  </div>
                  <div className="bg-background border border-border rounded-lg p-4">
                    <div className="text-sm text-muted-foreground mb-1">Desktop Users</div>
                    <div className="font-display text-xl font-bold">
                      {activeUsersStats.active_by_device['Desktop'] || 0}
                    </div>
                  </div>
                </div>
              )}

              {/* Active Users List */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[600px]">
                  <thead>
                    <tr>
                      {['User', 'Username', 'Device', 'Browser', 'Last Active', 'Session Duration'].map(h => (
                        <th key={h} className="text-left p-3 bg-background border-b border-border text-muted-foreground font-semibold text-xs uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {currentlyActiveUsers.map((user, i) => (
                      <tr key={i} className="hover:bg-background">
                        <td className="p-3 border-b border-border text-sm">
                          <div className="font-medium">{user.full_name}</div>
                        </td>
                        <td className="p-3 border-b border-border text-sm text-muted-foreground">
                          @{user.username}
                        </td>
                        <td className="p-3 border-b border-border text-sm">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${user.device_type === 'Mobile' ? 'bg-blue-500/10 text-blue-500' : user.device_type === 'Desktop' ? 'bg-green-500/10 text-green-500' : 'bg-purple-500/10 text-purple-500'}`}>
                            {user.device_type === 'Mobile' ? '📱' : user.device_type === 'Desktop' ? '💻' : '📊'}
                            {user.device_type}
                          </span>
                        </td>
                        <td className="p-3 border-b border-border text-sm">
                          <span className="inline-flex items-center gap-1">
                            {user.browser === 'Chrome' && '🌐'}
                            {user.browser === 'Firefox' && '🦊'}
                            {user.browser === 'Safari' && '🍎'}
                            {user.browser === 'Edge' && '🔷'}
                            {user.browser}
                          </span>
                        </td>
                        <td className="p-3 border-b border-border text-sm text-muted-foreground">
                          {format(new Date(user.last_active), 'h:mm a')}
                        </td>
                        <td className="p-3 border-b border-border text-sm">
                          <span className="inline-flex items-center gap-1 text-green-500">
                            ⏱️ {user.session_duration}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Real-time indicator */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span>Real-time updates active</span>
                </div>
                <button
                  onClick={loadCurrentlyActiveUsers}
                  className="text-sm px-3 py-1 bg-surface2 hover:bg-surface3 rounded-lg transition-colors"
                >
                  Refresh
                </button>
              </div>
            </>
          )}
        </div>

        {analytics && (
          <div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Pages */}
              <div className="bg-surface border border-border rounded-xl p-6">
                <h3 className="font-display text-lg font-semibold mb-4">Top Pages (7d)</h3>
                {analytics.topPages.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No data yet</p>
                ) : (
                  <div className="space-y-2">
                    {analytics.topPages.map((p, i) => (
                      <div key={i} className="flex justify-between items-center py-2 border-b border-border last:border-b-0">
                        <span className="text-sm font-mono truncate">{p.path}</span>
                        <span className="text-sm font-medium ml-2 shrink-0">{p.count} views</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Browser Breakdown */}
              <div className="bg-surface border border-border rounded-xl p-6">
                <h3 className="font-display text-lg font-semibold mb-4">Browser Usage (7d)</h3>
                {analytics.browserBreakdown.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No data yet</p>
                ) : (
                  <div className="space-y-3">
                    {analytics.browserBreakdown.map((b, i) => {
                      const pct = analytics.totalPageViews > 0 ? Math.round((b.count / analytics.totalPageViews) * 100) : 0;
                      return (
                        <div key={i}>
                          <div className="flex justify-between text-sm mb-1">
                            <span>{b.browser}</span>
                            <span className="text-muted-foreground">{pct}% ({b.count})</span>
                          </div>
                          <div className="h-2 bg-surface2 rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Visitors */}
            <div className="bg-surface border border-border rounded-xl p-6 mt-6">
              <h3 className="font-display text-lg font-semibold mb-4">Recent Activity</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[600px]">
                  <thead>
                    <tr>
                      {['User', 'Page', 'Browser', 'Time'].map(h => (
                        <th key={h} className="text-left p-3 bg-background border-b border-border text-muted-foreground font-semibold text-xs uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.recentVisitors.length === 0 ? (
                      <tr><td colSpan={4} className="p-8 text-center text-muted-foreground/50">No activity yet</td></tr>
                    ) : analytics.recentVisitors.map((v, i) => (
                      <tr key={i} className="hover:bg-background">
                        <td className="p-3 border-b border-border text-sm">
                          <div className="font-medium">{v.full_name}</div>
                          <div className="text-xs text-muted-foreground">@{v.username}</div>
                        </td>
                        <td className="p-3 border-b border-border text-sm font-mono">{v.path}</td>
                        <td className="p-3 border-b border-border text-sm">{parseBrowser(v.user_agent)}</td>
                        <td className="p-3 border-b border-border text-sm text-muted-foreground">
                          {format(new Date(v.created_at), 'MMM d, h:mm a')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Direct Messages */}
        <div className="bg-surface border border-border rounded-xl p-6 mb-12">
          <h2 className="font-display text-2xl font-semibold mb-6">Direct Messages</h2>
          <div className="flex gap-4" style={{ minHeight: '400px' }}>
            <div className="w-72 shrink-0 border-r border-border pr-4 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="text-center text-muted-foreground py-8 text-sm">No messages yet</div>
              ) : conversations.map(c => (
                <div
                  key={c.userId}
                  onClick={() => openConversation(c.userId)}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer mb-1 transition-colors ${selectedConvo === c.userId ? 'bg-primary/10 border border-primary/20' : 'hover:bg-surface2'}`}
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    {c.profile?.avatar_url && <AvatarImage src={c.profile.avatar_url} />}
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">{(c.profile?.full_name || '?')[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{c.profile?.full_name || c.profile?.username}</div>
                    <div className="text-xs text-muted-foreground truncate">{c.lastMessage?.content?.slice(0, 30)}</div>
                  </div>
                  {c.unread > 0 && (
                    <span className="bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center shrink-0">{c.unread}</span>
                  )}
                </div>
              ))}
            </div>

            <div className="flex-1 flex flex-col">
              {!selectedConvo ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">Select a conversation</div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2">
                    {convoMessages.map(m => {
                      const isMine = m.sender_id === user!.id;
                      return (
                        <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] rounded-xl px-4 py-3 ${isMine ? 'bg-primary text-primary-foreground' : 'bg-background border border-border'}`}>
                            <div className="text-sm whitespace-pre-wrap">{m.content}</div>
                            <div className={`text-xs mt-1 ${isMine ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                              {m.created_at ? format(new Date(m.created_at), 'MMM d, h:mm a') : ''}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-3">
                    <input
                      className="flex-1 p-3 bg-background border border-border rounded-lg text-foreground text-sm"
                      placeholder="Type a reply..."
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendReply()}
                    />
                    <button onClick={sendReply} className="py-2.5 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Send</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Announcements */}
        <div className="bg-surface border border-border rounded-xl p-6">
          <h2 className="font-display text-2xl font-semibold mb-6">Announcements</h2>
          {announcements.map(a => (
            <div key={a.id} className="bg-background border border-border rounded-lg p-4 mb-4 flex items-start justify-between">
              <div className="flex-1">
                <div className="font-semibold mb-1">{a.title}</div>
                <div className="text-sm text-muted-foreground">{a.content}</div>
              </div>
              <button
                onClick={() => deleteAnnouncement(a.id)}
                className="ml-3 text-destructive hover:text-destructive/80 text-sm shrink-0"
                title="Delete announcement"
              >
                🗑️
              </button>
            </div>
          ))}
          <div className="bg-background border border-dashed border-border rounded-lg p-6 text-center">
            <input className="w-full p-3 bg-surface2 border border-border rounded-lg text-foreground text-sm mb-3" placeholder="Announcement title..." value={newAnnTitle} onChange={e => setNewAnnTitle(e.target.value)} />
            <textarea className="w-full p-3 bg-surface2 border border-border rounded-lg text-foreground text-sm mb-4 min-h-[80px]" placeholder="Content..." value={newAnnContent} onChange={e => setNewAnnContent(e.target.value)} />
            <button onClick={createAnnouncement} className="py-2.5 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Post Announcement</button>
          </div>
        </div>
      </main>
    </div>
  );
}
