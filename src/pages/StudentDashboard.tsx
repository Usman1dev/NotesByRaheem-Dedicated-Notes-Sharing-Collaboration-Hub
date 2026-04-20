import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardSidebar from '@/components/DashboardSidebar';
import NotificationBell from '@/components/NotificationBell';
import { format } from 'date-fns';

const navItems = [
  { href: '/dashboard', icon: '📊', label: 'Dashboard' },
  { href: '/courses', icon: '📚', label: 'Courses' },
  { href: '/ai-notes', icon: '🤖', label: 'AI Notes' },
  { href: '/bookmarks', icon: '🔖', label: 'Bookmarks' },
  { href: '/upload', icon: '⬆', label: 'Upload Note' },
  { href: '/chatroom', icon: '💬', label: 'Chatroom' },
  { href: '/study-timer', icon: '⏱️', label: 'Study Timer' },
  { href: '/leaderboard', icon: '🏆', label: 'Leaderboard' },
  { href: '/contact', icon: '✉️', label: 'Contact Owner' },
];

export default function StudentDashboard() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ uploaded: 0, approved: 0, bookmarks: 0 });
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [uploads, setUploads] = useState<any[]>([]);
  const [expandedAnn, setExpandedAnn] = useState<string | null>(null);

  const extraItems = profile?.role === 'admin' || profile?.role === 'owner'
    ? [{ href: '/admin', icon: '⚙', label: 'Admin Panel' }]
    : undefined;

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    const [notesRes, bookmarksRes, announcementsRes] = await Promise.all([
      supabase.from('notes').select('id, status').eq('uploaded_by', user!.id),
      supabase.from('bookmarks').select('id').eq('user_id', user!.id),
      supabase.from('announcements').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(10),
    ]);

    const notes = notesRes.data || [];
    setStats({
      uploaded: notes.length,
      approved: notes.filter(n => n.status === 'approved').length,
      bookmarks: bookmarksRes.data?.length || 0,
    });
    setAnnouncements(announcementsRes.data || []);

    const { data: recentUploads } = await supabase
      .from('notes')
      .select('*, courses(code, name)')
      .eq('uploaded_by', user!.id)
      .order('upload_date', { ascending: false })
      .limit(5);
    setUploads(recentUploads || []);
  };

  const memberSince = profile?.created_at ? format(new Date(profile.created_at), 'MMM yyyy') : '-';

  return (
    <div className="flex min-h-screen bg-background relative z-[1]">
      <DashboardSidebar items={navItems} extraItems={extraItems} />
      <main className="flex-1 lg:ml-60 p-3 xs:p-4 sm:p-6 md:p-8 pt-16 lg:pt-8">
        <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center mb-6 md:mb-8 gap-4 mt-2 lg:mt-0">
          <div>
            <h1 className="font-display text-2xl xs:text-3xl font-bold">Hey {profile?.full_name || profile?.username} 👋</h1>
            <p className="text-muted-foreground text-sm xs:text-base">Role: {profile?.role} • Roll: {profile?.roll_number || 'N/A'}</p>
          </div>
          <div className="flex items-center gap-2 xs:gap-3 w-full xs:w-auto">
            <NotificationBell />
            <Link to="/upload" className="inline-flex items-center gap-2 py-2.5 xs:py-3.5 px-4 xs:px-7 rounded-[10px] bg-primary text-primary-foreground font-medium text-xs xs:text-sm w-full xs:w-auto justify-center">
              ⬆ Upload a Note
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-3 xs:gap-4 mb-8 md:mb-10">
          {[
            { icon: '📄', color: 'primary', value: stats.uploaded, label: 'Notes Uploaded' },
            { icon: '✓', color: 'success', value: stats.approved, label: 'Notes Approved' },
            { icon: '🔖', color: 'info', value: stats.bookmarks, label: 'Bookmarks', href: '/bookmarks' },
            { icon: '📅', color: 'pink', value: memberSince, label: 'Member Since' },
          ].map((s: any, i) => (
            <div key={i} onClick={() => s.href && navigate(s.href)} className={`bg-surface border border-border rounded-xl p-4 xs:p-6 flex items-center gap-3 xs:gap-4 hover:border-border-hover transition-colors ${s.href ? 'cursor-pointer' : ''}`}>
              <div className={`w-10 h-10 xs:w-12 xs:h-12 rounded-lg flex items-center justify-center text-xl xs:text-2xl bg-${s.color}/10 text-${s.color}`}>
                {s.icon}
              </div>
              <div>
                <div className="font-display text-2xl xs:text-3xl font-bold leading-none">{s.value}</div>
                <div className="text-xs text-muted-foreground/60 uppercase tracking-widest mt-1">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Announcements */}
        <section className="mb-8 md:mb-10">
          <h2 className="font-display text-lg xs:text-xl font-semibold mb-3 xs:mb-4">Announcements</h2>
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            {announcements.length === 0 ? (
              <div className="p-6 xs:p-8 md:p-12 text-center text-muted-foreground/50">No announcements</div>
            ) : (
              announcements.map((a) => (
                <div
                  key={a.id}
                  className="px-4 xs:px-6 py-4 xs:py-5 border-b border-border last:border-b-0 cursor-pointer hover:bg-background/50 transition-colors"
                  onClick={() => setExpandedAnn(expandedAnn === a.id ? null : a.id)}
                >
                  <div className="flex flex-col xs:flex-row xs:justify-between xs:items-center gap-2 xs:gap-0">
                    <div className="font-medium text-sm xs:text-base break-word">{a.title}</div>
                    <div className="flex items-center gap-2 xs:gap-3">
                      <span className="text-xs text-muted-foreground/50">{a.created_at ? format(new Date(a.created_at), 'MMM d, yyyy') : ''}</span>
                      <span className="text-muted-foreground text-sm">{expandedAnn === a.id ? '▲' : '▼'}</span>
                    </div>
                  </div>
                  {expandedAnn === a.id && (
                    <div className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed break-word">
                      {a.content}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {/* Recent Uploads */}
        <section>
          <h2 className="font-display text-lg xs:text-xl font-semibold mb-3 xs:mb-4">Your Recent Uploads</h2>
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            {uploads.length === 0 ? (
              <div className="p-6 xs:p-8 md:p-12 text-center text-muted-foreground/50">You haven't uploaded any notes yet.</div>
            ) : (
              <div className="table-container">
                {uploads.map((u) => (
                  <div key={u.id} className="px-4 xs:px-6 py-4 xs:py-5 border-b border-border last:border-b-0 flex flex-col xs:flex-row xs:justify-between xs:items-center gap-2 xs:gap-0">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm xs:text-base break-word">{u.title}</div>
                      <div className="text-xs xs:text-sm text-muted-foreground break-word">{(u.courses as any)?.code} - {(u.courses as any)?.name}</div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium uppercase tracking-wider mt-1 xs:mt-0 ${
                      u.status === 'approved' ? 'bg-success/10 text-success' :
                      u.status === 'rejected' ? 'bg-destructive/10 text-destructive' :
                      'bg-warning/10 text-warning'
                    }`}>
                      {u.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
