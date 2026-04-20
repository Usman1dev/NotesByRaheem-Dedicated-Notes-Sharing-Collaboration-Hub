import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardSidebar from '@/components/DashboardSidebar';
import NotificationBell from '@/components/NotificationBell';
import NotePreviewModal from '@/components/NotePreviewModal';
import { format } from 'date-fns';
import { toast } from 'sonner';

const navItems = [
  { href: '/dashboard', icon: '📊', label: 'Dashboard' },
  { href: '/courses', icon: '📚', label: 'Courses' },
  { href: '/ai-notes', icon: '🤖', label: 'AI Notes' },
  { href: '/bookmarks', icon: '🔖', label: 'Bookmarks' },
  { href: '/upload', icon: '⬆', label: 'Upload Note' },
  { href: '/chatroom', icon: '💬', label: 'Chatroom' },
  { href: '/admin', icon: '⚙', label: 'Admin Panel' },
  { href: '/admin/pending', icon: '⏳', label: 'Pending Notes' },
  { href: '/admin/courses', icon: '🎓', label: 'Manage Courses' },
];

export default function AdminDashboard() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({ pending: 0, total: 0, courses: 0, students: 0 });
  const [pendingNotes, setPendingNotes] = useState<any[]>([]);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [previewNote, setPreviewNote] = useState<any>(null);

  const extraItems = profile?.role === 'owner'
    ? [
        { href: '/owner', icon: '👑', label: 'Owner Panel' },
        { href: '/owner/users', icon: '👥', label: 'Manage Users' },
        { href: '/owner/notes', icon: '📄', label: 'All Notes' },
      ]
    : undefined;

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [notesRes, coursesRes, studentsRes] = await Promise.all([
      supabase.from('notes').select('id, status'),
      supabase.from('courses').select('id').eq('is_active', true),
      supabase.from('profiles').select('id').eq('role', 'student'),
    ]);
    const notes = notesRes.data || [];
    setStats({
      pending: notes.filter(n => n.status === 'pending').length,
      total: notes.length,
      courses: coursesRes.data?.length || 0,
      students: studentsRes.data?.length || 0,
    });

    const { data: pending } = await supabase
      .from('notes')
      .select('*, courses(code, name), profiles!notes_uploaded_by_fkey(username, full_name)')
      .eq('status', 'pending')
      .order('upload_date', { ascending: false })
      .limit(10);
    setPendingNotes(pending || []);
  };

  const approveNote = async (noteId: string) => {
    await supabase.from('notes').update({ status: 'approved', approved_by: user!.id, approval_date: new Date().toISOString() }).eq('id', noteId);
    toast.success('Note approved');
    setPreviewNote(null);
    loadData();
  };

  const rejectNote = async () => {
    if (!rejectingId) return;
    await supabase.from('notes').update({ status: 'rejected', rejection_reason: rejectReason, approved_by: user!.id, approval_date: new Date().toISOString() }).eq('id', rejectingId);
    toast.success('Note rejected');
    setRejectingId(null);
    setRejectReason('');
    setPreviewNote(null);
    loadData();
  };

  const deleteNote = async (noteId: string) => {
    if (!confirm('Delete this note permanently?')) return;
    const note = pendingNotes.find(n => n.id === noteId);
    if (note?.file_path) {
      await supabase.storage.from('notes-files').remove([note.file_path]);
    }
    await supabase.from('notes').delete().eq('id', noteId);
    toast.success('Note deleted');
    setPreviewNote(null);
    loadData();
  };

  const statCards = [
    { icon: '⏳', color: 'bg-primary/10 text-primary', value: stats.pending, label: 'Pending Notes' },
    { icon: '📚', color: 'bg-success/10 text-success', value: stats.total, label: 'Total Notes' },
    { icon: '🎓', color: 'bg-info/10 text-info', value: stats.courses, label: 'Active Courses' },
    { icon: '👥', color: 'bg-pink/10 text-pink', value: stats.students, label: 'Total Students' },
  ];

  return (
    <div className="flex min-h-screen bg-background relative z-[1]">
      <DashboardSidebar items={navItems} extraItems={extraItems} />
      <main className="flex-1 lg:ml-60 p-4 sm:p-8 pt-16 lg:pt-8">
        <div className="flex justify-between items-center mb-10 mt-2 lg:mt-0">
          <div>
            <h1 className="font-display text-4xl font-bold tracking-tight mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage notes, courses, and monitor platform activity.</p>
          </div>
          <NotificationBell />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-12">
          {statCards.map((s, i) => (
            <div key={i} className="bg-surface border border-border rounded-xl p-6 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${s.color}`}>{s.icon}</div>
              <div>
                <h3 className="text-3xl font-bold">{s.value}</h3>
                <p className="text-muted-foreground text-sm">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl font-semibold">Pending Notes for Review</h2>
          <Link to="/admin/pending" className="inline-flex items-center gap-2 py-2 px-5 rounded-lg border border-border-hover text-muted-foreground hover:text-foreground text-sm">View All</Link>
        </div>

        <div className="bg-surface border border-border rounded-xl overflow-x-auto mb-12">
          <table className="w-full border-collapse min-w-[600px]">
            <thead>
              <tr>
                <th className="text-left p-4 bg-background border-b border-border text-muted-foreground font-semibold text-xs uppercase tracking-wider">Note Title</th>
                <th className="text-left p-4 bg-background border-b border-border text-muted-foreground font-semibold text-xs uppercase tracking-wider">Course</th>
                <th className="text-left p-4 bg-background border-b border-border text-muted-foreground font-semibold text-xs uppercase tracking-wider">Uploader</th>
                <th className="text-left p-4 bg-background border-b border-border text-muted-foreground font-semibold text-xs uppercase tracking-wider">Upload Date</th>
                <th className="text-left p-4 bg-background border-b border-border text-muted-foreground font-semibold text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingNotes.length === 0 ? (
                <tr><td colSpan={5} className="p-12 text-center text-muted-foreground/50">No pending notes</td></tr>
              ) : (
                pendingNotes.map(note => (
                  <tr key={note.id} className="hover:bg-background">
                    <td className="p-4 border-b border-border">
                      <div className="font-semibold">{note.title}</div>
                    </td>
                    <td className="p-4 border-b border-border text-sm text-muted-foreground">{(note.courses as any)?.code}</td>
                    <td className="p-4 border-b border-border">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-xs font-semibold text-primary-foreground">
                          {((note.profiles as any)?.username || '?')[0].toUpperCase()}
                        </div>
                        <span className="text-sm">{(note.profiles as any)?.username}</span>
                      </div>
                    </td>
                    <td className="p-4 border-b border-border text-sm text-muted-foreground">
                      {note.upload_date ? format(new Date(note.upload_date), 'MMM d, yyyy') : '-'}
                    </td>
                    <td className="p-4 border-b border-border">
                      <div className="flex gap-2">
                        <button onClick={() => setPreviewNote(note)} className="py-1.5 px-3 rounded-lg border border-border text-muted-foreground hover:text-foreground text-sm hover:bg-background transition-colors">Preview</button>
                        <button onClick={() => approveNote(note.id)} className="py-1.5 px-4 rounded-lg bg-success text-success-foreground text-sm font-medium">Approve</button>
                        <button onClick={() => setRejectingId(note.id)} className="py-1.5 px-4 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium">Reject</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {previewNote && (
        <NotePreviewModal
          note={previewNote}
          onClose={() => setPreviewNote(null)}
          onApprove={approveNote}
          onReject={(id) => { setRejectingId(id); setPreviewNote(null); }}
          onDelete={deleteNote}
          showActions
        />
      )}

      {rejectingId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[2001] flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl p-8 max-w-[500px] w-full">
            <h3 className="font-display text-2xl font-semibold mb-4">Reject Note</h3>
            <p className="text-muted-foreground mb-4">Please provide a reason for rejecting this note:</p>
            <textarea className="w-full p-3 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-primary min-h-[100px] resize-y mb-6" value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="e.g., File format not allowed..." />
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setRejectingId(null); setRejectReason(''); }} className="py-2.5 px-5 rounded-lg border border-border-hover text-muted-foreground text-sm">Cancel</button>
              <button onClick={rejectNote} className="py-2.5 px-5 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium">Reject Note</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
