import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardSidebar from '@/components/DashboardSidebar';
import NotePreviewModal from '@/components/NotePreviewModal';
import { toast } from 'sonner';

const navItems = [
  { href: '/dashboard', icon: '📊', label: 'Dashboard' },
  { href: '/courses', icon: '📚', label: 'Courses' },
  { href: '/bookmarks', icon: '🔖', label: 'Bookmarks' },
  { href: '/upload', icon: '⬆', label: 'Upload Note' },
  { href: '/chatroom', icon: '💬', label: 'Chatroom' },
];

export default function BookmarksPage() {
  const { user, profile } = useAuth();
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewNote, setPreviewNote] = useState<any>(null);

  const extraItems = profile?.role === 'admin' || profile?.role === 'owner'
    ? [{ href: '/admin', icon: '⚙', label: 'Admin Panel' }]
    : undefined;

  useEffect(() => {
    if (user) loadBookmarks();
  }, [user]);

  const loadBookmarks = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('bookmarks')
      .select('*, notes(*, courses(code, name), profiles!notes_uploaded_by_fkey(username, full_name))')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });
    setBookmarks(data || []);
    setLoading(false);
  };

  const removeBookmark = async (bookmarkId: string) => {
    await supabase.from('bookmarks').delete().eq('id', bookmarkId);
    setBookmarks(prev => prev.filter(b => b.id !== bookmarkId));
    toast.success('Bookmark removed');
  };

  const handleDownload = async (note: any) => {
    if (note.content) {
      const blob = new Blob([note.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = note.file_name || note.title + '.txt';
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const { data } = await supabase.storage.from('notes-files').createSignedUrl(note.file_path, 60);
      if (data?.signedUrl) window.open(data.signedUrl, '_blank');
    }
  };

  return (
    <div className="flex min-h-screen bg-background relative z-[1]">
      <DashboardSidebar items={navItems} extraItems={extraItems} />
      <main className="flex-1 lg:ml-60 p-4 sm:p-8 pt-16 lg:pt-8">
        <div className="mb-8 mt-2 lg:mt-0">
          <h1 className="font-display text-3xl font-bold">Your Bookmarks 🔖</h1>
          <p className="text-muted-foreground">{bookmarks.length} bookmarked notes</p>
        </div>

        {loading ? (
          <div className="text-center py-20 text-muted-foreground">Loading...</div>
        ) : bookmarks.length === 0 ? (
          <div className="bg-surface border border-border rounded-xl p-12 text-center text-muted-foreground/50">
            No bookmarks yet. Browse courses and bookmark notes you want to save.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bookmarks.map(bm => {
              const note = bm.notes;
              if (!note) return null;
              return (
                <div key={bm.id} className="bg-surface border border-border rounded-xl p-6 hover:border-border-hover transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-semibold mb-1 truncate">{note.title}</h3>
                      <p className="text-sm text-muted-foreground">{(note.courses as any)?.code} - {(note.courses as any)?.name}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium ml-2">
                      {note.content ? 'TEXT' : note.file_type}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mb-4 text-xs text-muted-foreground/50">
                    <span>📤 {(note.profiles as any)?.username}</span>
                    <span>⬇ {note.download_count || 0}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setPreviewNote(note)} className="flex-1 py-2.5 rounded-lg border border-border text-muted-foreground hover:text-foreground font-medium text-sm hover:bg-background transition-all">
                      Preview
                    </button>
                    <button onClick={() => handleDownload(note)} className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity">
                      Download
                    </button>
                    <button onClick={() => removeBookmark(bm.id)} className="py-2.5 px-3 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 text-sm transition-all" title="Remove bookmark">
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {previewNote && (
          <NotePreviewModal note={previewNote} onClose={() => setPreviewNote(null)} />
        )}
      </main>
    </div>
  );
}
