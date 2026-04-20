import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardSidebar from '@/components/DashboardSidebar';
import NotePreviewModal from '@/components/NotePreviewModal';
import NotificationBell from '@/components/NotificationBell';
import { format } from 'date-fns';
import { toast } from 'sonner';

const navItems = [
  { href: '/dashboard', icon: '📊', label: 'Dashboard' },
  { href: '/courses', icon: '📚', label: 'Courses' },
  { href: '/bookmarks', icon: '🔖', label: 'Bookmarks' },
  { href: '/upload', icon: '⬆', label: 'Upload Note' },
  { href: '/chatroom', icon: '💬', label: 'Chatroom' },
  { href: '/admin', icon: '⚙', label: 'Admin Panel' },
  { href: '/admin/pending', icon: '⏳', label: 'Pending Notes' },
  { href: '/admin/courses', icon: '🎓', label: 'Manage Courses' },
];

export default function AdminPending() {
  const { user, profile } = useAuth();
  const [notes, setNotes] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [courseFilter, setCourseFilter] = useState('');
  const [search, setSearch] = useState('');
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
    const [notesRes, coursesRes] = await Promise.all([
      supabase.from('notes').select('*, courses(code, name), profiles!notes_uploaded_by_fkey(username, full_name)').eq('status', 'pending').order('upload_date', { ascending: false }),
      supabase.from('courses').select('id, code, name'),
    ]);
    setNotes(notesRes.data || []);
    setCourses(coursesRes.data || []);
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
    const note = notes.find(n => n.id === noteId);
    if (note?.file_path) {
      await supabase.storage.from('notes-files').remove([note.file_path]);
    }
    await supabase.from('notes').delete().eq('id', noteId);
    toast.success('Note deleted');
    setPreviewNote(null);
    loadData();
  };

  const filtered = notes.filter(n => {
    if (courseFilter && n.course_id !== courseFilter) return false;
    if (search && !n.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex min-h-screen bg-background relative z-[1]">
      <DashboardSidebar items={navItems} extraItems={extraItems} />
      <main className="flex-1 lg:ml-60 p-4 sm:p-8 pt-16 lg:pt-8">
        <div className="flex justify-between items-center mb-8 mt-2 lg:mt-0">
          <div>
            <h1 className="font-display text-4xl font-bold tracking-tight mb-2">Pending Notes</h1>
            <p className="text-muted-foreground">Review and approve or reject uploaded notes.</p>
          </div>
          <NotificationBell />
        </div>

        <div className="flex gap-4 mb-8 flex-wrap items-end">
          <div>
            <label className="text-muted-foreground text-sm block mb-1">Course:</label>
            <select className="p-2.5 bg-surface2 border border-border rounded-lg text-foreground text-sm" value={courseFilter} onChange={e => setCourseFilter(e.target.value)}>
              <option value="">All Courses</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-muted-foreground text-sm block mb-1">Search:</label>
            <input className="p-2.5 bg-surface2 border border-border rounded-lg text-foreground text-sm" placeholder="Title..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl overflow-x-auto">
          <table className="w-full border-collapse min-w-[700px]">
            <thead>
              <tr>
                {['Note Title', 'Type', 'Course', 'Uploader', 'Upload Date', 'Actions'].map(h => (
                  <th key={h} className="text-left p-4 bg-background border-b border-border text-muted-foreground font-semibold text-xs uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-12 text-center text-muted-foreground/50">No pending notes</td></tr>
              ) : filtered.map(note => (
                <tr key={note.id} className="hover:bg-background">
                  <td className="p-4 border-b border-border font-semibold">{note.title}</td>
                  <td className="p-4 border-b border-border">
                    <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">{note.content ? 'TEXT' : note.file_type}</span>
                  </td>
                  <td className="p-4 border-b border-border text-sm text-muted-foreground">{(note.courses as any)?.code}</td>
                  <td className="p-4 border-b border-border text-sm">{(note.profiles as any)?.username}</td>
                  <td className="p-4 border-b border-border text-sm text-muted-foreground">{note.upload_date ? format(new Date(note.upload_date), 'MMM d, yyyy') : '-'}</td>
                  <td className="p-4 border-b border-border">
                    <div className="flex gap-2">
                      <button onClick={() => setPreviewNote(note)} className="py-1.5 px-4 rounded-lg border border-border text-muted-foreground hover:text-foreground text-sm font-medium hover:bg-background transition-colors">Preview</button>
                      <button onClick={() => approveNote(note.id)} className="py-1.5 px-4 rounded-lg bg-success text-success-foreground text-sm font-medium">Approve</button>
                      <button onClick={() => setRejectingId(note.id)} className="py-1.5 px-4 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium">Reject</button>
                    </div>
                  </td>
                </tr>
              ))}
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
            <textarea className="w-full p-3 bg-background border border-border rounded-lg text-foreground text-sm min-h-[100px] mb-6" value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Reason for rejection..." />
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setRejectingId(null); setRejectReason(''); }} className="py-2.5 px-5 rounded-lg border border-border-hover text-muted-foreground text-sm">Cancel</button>
              <button onClick={rejectNote} className="py-2.5 px-5 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium">Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
