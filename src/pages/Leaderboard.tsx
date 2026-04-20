import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardSidebar from '@/components/DashboardSidebar';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import UserProfileCard from '@/components/UserProfileCard';

const navItems = [
  { href: '/dashboard', icon: '📊', label: 'Dashboard' },
  { href: '/courses', icon: '📚', label: 'Courses' },
  { href: '/bookmarks', icon: '🔖', label: 'Bookmarks' },
  { href: '/upload', icon: '⬆', label: 'Upload Note' },
  { href: '/chatroom', icon: '💬', label: 'Chatroom' },
  { href: '/leaderboard', icon: '🏆', label: 'Leaderboard' },
  { href: '/contact', icon: '✉️', label: 'Contact Owner' },
];

interface LeaderboardUser {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  approved_count: number;
  role: string;
}

export default function Leaderboard() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const extraItems = profile?.role === 'admin' || profile?.role === 'owner'
    ? [{ href: '/admin', icon: '⚙', label: 'Admin Panel' }]
    : undefined;

  const loadLeaderboard = async () => {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, role')
      .eq('is_active', true);

    if (!profiles) { setLoading(false); return; }

    const { data: notes } = await supabase
      .from('notes')
      .select('uploaded_by')
      .eq('status', 'approved');

    const countMap: Record<string, number> = {};
    (notes || []).forEach(n => {
      countMap[n.uploaded_by] = (countMap[n.uploaded_by] || 0) + 1;
    });

    const leaderboard: LeaderboardUser[] = profiles.map(p => ({
      id: p.id,
      username: p.username,
      full_name: p.full_name,
      avatar_url: p.avatar_url,
      role: p.role,
      approved_count: countMap[p.id] || 0,
    }));

    leaderboard.sort((a, b) => b.approved_count - a.approved_count);
    setUsers(leaderboard);
    setLoading(false);
  };

  useEffect(() => {
    loadLeaderboard();
    const channel = supabase
      .channel('leaderboard-notes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, () => {
        loadLeaderboard();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const getMedal = (rank: number) => {
    if (rank === 0) return '🥇';
    if (rank === 1) return '🥈';
    if (rank === 2) return '🥉';
    return null;
  };

  return (
    <div className="flex min-h-screen bg-background relative z-[1]">
      <DashboardSidebar items={navItems} extraItems={extraItems} />
      <main className="flex-1 lg:ml-60 p-4 sm:p-8 pt-16 lg:pt-8">
        <h1 className="font-display text-3xl font-bold mb-2 mt-2 lg:mt-0">Leaderboard 🏆</h1>
        <p className="text-muted-foreground mb-8">Top contributors ranked by approved notes</p>

        {loading ? (
          <div className="text-center py-20 text-muted-foreground">Loading…</div>
        ) : (
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="grid grid-cols-[3rem_1fr_6rem] sm:grid-cols-[3rem_1fr_8rem] px-6 py-3 border-b border-border text-xs text-muted-foreground uppercase tracking-wider font-medium">
              <span>#</span>
              <span>User</span>
              <span className="text-center">Approved Notes</span>
            </div>

            {users.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground/50">No users yet</div>
            ) : (
              users.map((u, i) => {
                const isMe = u.id === profile?.id;
                const initials = (u.full_name || u.username || '?')[0].toUpperCase();
                const medal = getMedal(i);

                return (
                  <div
                    key={u.id}
                    onClick={() => setSelectedUserId(u.id)}
                    className={`grid grid-cols-[3rem_1fr_6rem] sm:grid-cols-[3rem_1fr_8rem] px-6 py-4 border-b border-border last:border-b-0 items-center transition-colors cursor-pointer ${
                      isMe ? 'bg-primary/5' : 'hover:bg-background/50'
                    } ${i < 3 ? 'font-medium' : ''}`}
                  >
                    <span className="text-lg">
                      {medal || <span className="text-sm text-muted-foreground">{i + 1}</span>}
                    </span>
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-8 w-8 shrink-0">
                        {u.avatar_url ? <AvatarImage src={u.avatar_url} alt={u.username} /> : null}
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="truncate text-sm">
                          {u.full_name}
                          {isMe && <span className="ml-1.5 text-xs text-primary">(You)</span>}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">@{u.username}</div>
                      </div>
                    </div>
                    <div className="text-center">
                      <span className="font-display text-lg font-bold">{u.approved_count}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>

      {selectedUserId && <UserProfileCard userId={selectedUserId} onClose={() => setSelectedUserId(null)} />}
    </div>
  );
}
