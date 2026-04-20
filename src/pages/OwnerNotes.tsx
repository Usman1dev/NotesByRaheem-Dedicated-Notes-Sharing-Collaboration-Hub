import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardSidebar from '@/components/DashboardSidebar';
import NotePreviewModal from '@/components/NotePreviewModal';
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
  { href: '/owner', icon: '👑', label: 'Owner Panel' },
  { href: '/owner/users', icon: '👥', label: 'Manage Users' },
  { href: '/owner/notes', icon: '📄', label: 'All Notes' },
];

export default function OwnerNotes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({ total: 0, approved: 0, pending: 0, rejected: 0 });
  const [previewNote, setPreviewNote] = useState<any>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [notesRes, coursesRes] = await Promise.all([
      supabase.from('notes').select('*, courses(code, name), profiles!notes_uploaded_by_fkey(username, full_name)').order('upload_date', { ascending: false }),
      supabase.from('courses').select('id, code, name'),
    ]);
    const all = notesRes.data || [];
    setNotes(all);
    setCourses(coursesRes.data || []);
    setStats({
      total: all.length,
      approved: all.filter(n => n.status === 'approved').length,
      pending: all.filter(n => n.status === 'pending').length,
      rejected: all.filter(n => n.status === 'rejected').length,
    });
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
    if (statusFilter && n.status !== statusFilter) return false;
    if (courseFilter && n.course_id !== courseFilter) return false;
    if (search && !n.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex min-h-screen bg-background relative z-[1]">
      <DashboardSidebar items={navItems} />
      <main className="flex-1 lg:ml-60 p-4 sm:p-8 pt-16 lg:pt-8">
        <h1 className="font-display text-4xl font-bold tracking-tight mb-2 mt-2 lg:mt-0">All Notes</h1>
        <p className="text-muted-foreground mb-8">Manage all notes across the platform.</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total', value: stats.total },
            { label: 'Approved', value: stats.approved },
            { label: 'Pending', value: stats.pending },
            { label: 'Rejected', value: stats.rejected },
          ].map((s, i) => (
            <div key={i} className="bg-surface border border-border rounded-xl p-5 hover:border-border-hover transition-colors">
              <div className="text-muted-foreground text-sm mb-1">{s.label}</div>
              <div className="font-display text-3xl font-bold">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="bg-surface border border-border rounded-xl p-6 mb-8 flex flex-wrap gap-4">
          <div>
            <label className="text-muted-foreground text-sm block mb-1">Status:</label>
            <select className="p-2.5 bg-surface2 border border-border rounded-lg text-foreground text-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label className="text-muted-foreground text-sm block mb-1">Course:</label>
            <select className="p-2.5 bg-surface2 border border-border rounded-lg text-foreground text-sm" value={courseFilter} onChange={e => setCourseFilter(e.target.value)}>
              <option value="">All</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-muted-foreground text-sm block mb-1">Search:</label>
            <input className="w-full p-2.5 bg-surface2 border border-border rounded-lg text-foreground text-sm" placeholder="Search by title..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl overflow-x-auto">
          <table className="w-full border-collapse min-w-[800px]">
            <thead>
              <tr>
                {['Title', 'Type', 'Course', 'Uploader', 'Status', 'Date', 'Actions'].map(h => (
                  <th key={h} className="text-left p-4 bg-surface2 border-b border-border text-muted-foreground font-semibold text-xs uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="p-12 text-center text-muted-foreground/50">No notes found</td></tr>
              ) : filtered.map(note => (
                <tr key={note.id} className="hover:bg-surface2">
                  <td className="p-4 border-b border-border">
                    <div className="font-semibold">{note.title}</div>
                    {note.description && <div className="text-sm text-muted-foreground line-clamp-1">{note.description}</div>}
                  </td>
                  <td className="p-4 border-b border-border">
                    <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">{note.content ? 'TEXT' : note.file_type}</span>
                  </td>
                  <td className="p-4 border-b border-border">
                    <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">{(note.courses as any)?.code}</span>
                  </td>
                  <td className="p-4 border-b border-border text-sm">{(note.profiles as any)?.username}</td>
                  <td className="p-4 border-b border-border">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                      note.status === 'approved' ? 'bg-success/15 text-success' :
                      note.status === 'rejected' ? 'bg-destructive/15 text-destructive' :
                      'bg-warning/15 text-warning'
                    }`}>{note.status}</span>
                  </td>
                  <td className="p-4 border-b border-border text-sm text-muted-foreground">{note.upload_date ? format(new Date(note.upload_date), 'MMM d, yyyy') : '-'}</td>
                  <td className="p-4 border-b border-border">
                    <div className="flex gap-2">
                      <button onClick={() => setPreviewNote(note)} className="w-9 h-9 rounded-lg flex items-center justify-center border border-border text-muted-foreground hover:bg-primary/10 hover:border-primary hover:text-primary transition-all" title="Preview">👁</button>
                      {note.status === 'pending' && (
                        <button onClick={() => approveNote(note.id)} className="w-9 h-9 rounded-lg flex items-center justify-center border border-border text-muted-foreground hover:bg-success/10 hover:border-success hover:text-success transition-all" title="Approve">✓</button>
                      )}
                      <button onClick={() => deleteNote(note.id)} className="w-9 h-9 rounded-lg flex items-center justify-center border border-border text-muted-foreground hover:bg-destructive/10 hover:border-destructive hover:text-destructive transition-all" title="Delete">✕</button>
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
