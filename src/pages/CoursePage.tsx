import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import TopNav from '@/components/TopNav';
import NotePreviewModal from '@/components/NotePreviewModal';
import { toast } from 'sonner';

const CATEGORIES = [
  { key: 'lecture_slides', label: '📑 Lecture Notes & Slides', desc: 'Teacher-provided materials' },
  { key: 'student_notes', label: '✍️ Student Notes', desc: 'Handwritten/typed by students' },
  { key: 'other_resources', label: '📎 Other Resources', desc: 'Quiz solutions, exam papers, links' },
] as const;

export default function CoursePage() {
  const { user, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get('id');
  const [course, setCourse] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<number | null>(null);
  const [previewNote, setPreviewNote] = useState<any>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const isAdminOrOwner = profile?.role === 'admin' || profile?.role === 'owner';

  useEffect(() => {
    if (courseId) {
      loadCourse();
      loadNotes();
    } else {
      loadAllCourses();
    }
  }, [courseId]);

  useEffect(() => {
    if (user && courseId) loadBookmarks();
  }, [user, courseId]);

  const loadCourse = async () => {
    const { data } = await supabase.from('courses').select('*').eq('id', courseId!).single();
    if (data) setCourse(data);
  };

  const loadNotes = async () => {
    const { data } = await supabase
      .from('notes')
      .select('*, courses(code, name), profiles!notes_uploaded_by_fkey(username, full_name, id)')
      .eq('course_id', courseId!)
      .eq('status', 'approved')
      .order('upload_date', { ascending: false });
    setNotes(data || []);
  };

  const loadAllCourses = async () => {
    const { data } = await supabase.from('courses').select('*').eq('is_active', true).order('semester').order('code');
    setAllCourses(data || []);
  };

  const loadBookmarks = async () => {
    const { data } = await supabase.from('bookmarks').select('note_id').eq('user_id', user!.id);
    setBookmarkedIds(new Set((data || []).map(b => b.note_id)));
  };

  const toggleBookmark = async (noteId: string) => {
    if (!user) return;
    if (bookmarkedIds.has(noteId)) {
      await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('note_id', noteId);
      setBookmarkedIds(prev => { const n = new Set(prev); n.delete(noteId); return n; });
      toast.success('Bookmark removed');
    } else {
      await supabase.from('bookmarks').insert({ user_id: user.id, note_id: noteId } as any);
      setBookmarkedIds(prev => new Set(prev).add(noteId));
      toast.success('Bookmarked!');
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;
    const note = notes.find(n => n.id === noteId);
    if (note?.file_path) {
      await supabase.storage.from('notes-files').remove([note.file_path]);
    }
    await supabase.from('notes').delete().eq('id', noteId);
    setNotes(prev => prev.filter(n => n.id !== noteId));
    toast.success('Note deleted');
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
    if (user) {
      await (supabase.from('download_logs').insert({ note_id: note.id, user_id: user.id }) as any);
      await (supabase.from('notes').update({ download_count: (note.download_count || 0) + 1 }).eq('id', note.id) as any);
    }
  };

  const filteredNotes = notes.filter(n => {
    if (search && !n.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (activeCategory !== 'all' && (n as any).category !== activeCategory) return false;
    return true;
  });

  const notesByCategory = {
    lecture_slides: filteredNotes.filter(n => (n as any).category === 'lecture_slides' || !(n as any).category),
    student_notes: filteredNotes.filter(n => (n as any).category === 'student_notes'),
    other_resources: filteredNotes.filter(n => (n as any).category === 'other_resources'),
  };

  const renderNoteCard = (note: any) => {
    const noteProfile = note.profiles as any;
    return (
      <div key={note.id} className="bg-surface border border-border rounded-xl p-4 xs:p-5 hover:border-border-hover hover:-translate-y-0.5 transition-all">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-semibold text-sm mb-1 break-word">{note.title}</h3>
            {note.description && <p className="text-muted-foreground text-xs line-clamp-2 break-word">{note.description}</p>}
          </div>
          <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
            <button
              onClick={() => toggleBookmark(note.id)}
              className={`text-base transition-transform hover:scale-110 touch-target ${bookmarkedIds.has(note.id) ? 'text-warning' : 'text-muted-foreground/40 hover:text-warning'}`}
              aria-label={bookmarkedIds.has(note.id) ? 'Remove bookmark' : 'Bookmark'}
            >
              {bookmarkedIds.has(note.id) ? '🔖' : '🏷️'}
            </button>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
              {note.content ? 'TEXT' : note.file_type}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 mb-3 text-xs text-muted-foreground/50 flex-wrap">
          <Link to={`/user/${noteProfile?.id}`} className="hover:text-primary transition-colors touch-target">📤 {noteProfile?.username}</Link>
          <span>⬇ {note.download_count || 0}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setPreviewNote(note)} className="flex-1 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground font-medium text-xs hover:bg-background transition-all touch-target">Preview</button>
          <button onClick={() => handleDownload(note)} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-xs hover:opacity-90 transition-opacity touch-target">Download</button>
          {isAdminOrOwner && (
            <button onClick={() => handleDelete(note.id)} className="py-2 px-2.5 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 text-xs transition-all touch-target" title="Delete">🗑</button>
          )}
        </div>
      </div>
    );
  };

  // Course list view
  if (!courseId) {
    const semesters = [...new Set(allCourses.map(c => c.semester))].sort();
    const filteredCourses = selectedSemester ? allCourses.filter(c => c.semester === selectedSemester) : allCourses;

    return (
      <div className="min-h-screen bg-background relative z-[1]">
        <TopNav backTo="/dashboard" rightContent={
          <Link to="/upload" className="inline-flex items-center gap-2 py-2 px-5 rounded-lg bg-primary text-primary-foreground font-medium text-sm">Upload Note</Link>
        } />
        <div className="pt-24 px-4 xs:px-6 sm:px-8 max-w-[1100px] mx-auto pb-12">
          <h1 className="font-display text-3xl xs:text-4xl font-bold tracking-tight mb-2">Browse Courses</h1>
          <p className="text-muted-foreground mb-6 xs:mb-8">Select a course to view its notes</p>

          <div className="flex gap-2 xs:gap-3 mb-6 xs:mb-8 flex-wrap">
            <button onClick={() => setSelectedSemester(null)} className={`px-3 xs:px-4 py-2 rounded-lg text-sm font-medium transition-all touch-target ${!selectedSemester ? 'bg-primary text-primary-foreground' : 'bg-surface border border-border text-muted-foreground hover:text-foreground'}`}>All</button>
            {semesters.map(s => (
              <button key={s} onClick={() => setSelectedSemester(s)} className={`px-3 xs:px-4 py-2 rounded-lg text-sm font-medium transition-all touch-target ${selectedSemester === s ? 'bg-primary text-primary-foreground' : 'bg-surface border border-border text-muted-foreground hover:text-foreground'}`}>Sem {s}</button>
            ))}
          </div>

          <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-3 xs:gap-4">
            {filteredCourses.map(c => (
              <Link key={c.id} to={`/courses?id=${c.id}`} className="bg-surface2 border border-border rounded-lg p-4 xs:p-5 hover:border-border-hover hover:-translate-y-1 transition-all relative overflow-hidden group">
                <div className="absolute top-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: c.color_code || 'hsl(var(--primary))' }} />
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{c.icon_symbol || '📚'}</span>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{c.code}</span>
                </div>
                <h3 className="font-display font-semibold text-sm xs:text-base mb-1 break-word">{c.name}</h3>
                <p className="text-xs text-muted-foreground/50">Semester {c.semester} • {c.notes_count || 0} notes</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative z-[1]">
      <TopNav backTo="/courses" rightContent={
        <>
          <Link to="/dashboard" className="inline-flex items-center gap-2 py-2 px-4 xs:px-5 rounded-lg border border-border-hover text-muted-foreground hover:text-foreground text-sm touch-target">Dashboard</Link>
          <Link to={`/upload?course=${courseId}`} className="inline-flex items-center gap-2 py-2 px-4 xs:px-5 rounded-lg bg-primary text-primary-foreground font-medium text-sm touch-target">Upload Note</Link>
        </>
      } />

      <div className="pt-24 px-4 xs:px-6 sm:px-8 max-w-[1100px] mx-auto pb-12">
        {course && (
          <>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border bg-surface text-sm text-muted-foreground mb-4" style={{ borderColor: course.color_code, background: (course.color_code || '') + '20' }}>
              <span>{course.icon_symbol || '📚'}</span>
              <span>{course.code}</span>
            </div>
            <h1 className="font-display text-3xl xs:text-4xl font-bold tracking-tight mb-2 break-word">{course.name}</h1>
            <p className="text-muted-foreground mb-6">Semester {course.semester} • {notes.length} notes</p>
          </>
        )}

        <div className="flex gap-3 xs:gap-4 mb-6 flex-wrap">
          <input
            type="text"
            className="flex-1 min-w-0 xs:min-w-[200px] p-3 bg-surface2 border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-primary"
            placeholder="Search notes…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 mb-6 xs:mb-8 flex-wrap">
          <button onClick={() => setActiveCategory('all')} className={`px-3 xs:px-4 py-2 rounded-lg text-sm font-medium transition-all touch-target ${activeCategory === 'all' ? 'bg-primary text-primary-foreground' : 'bg-surface border border-border text-muted-foreground hover:text-foreground'}`}>All</button>
          {CATEGORIES.map(cat => (
            <button key={cat.key} onClick={() => setActiveCategory(cat.key)} className={`px-3 xs:px-4 py-2 rounded-lg text-sm font-medium transition-all touch-target ${activeCategory === cat.key ? 'bg-primary text-primary-foreground' : 'bg-surface border border-border text-muted-foreground hover:text-foreground'}`}>{cat.label}</button>
          ))}
        </div>

        {activeCategory === 'all' ? (
          // Show sections
          <>
            {CATEGORIES.map(cat => {
              const catNotes = notesByCategory[cat.key];
              if (catNotes.length === 0) return null;
              return (
                <div key={cat.key} className="mb-8 xs:mb-10">
                  <h2 className="font-display text-lg xs:text-xl font-semibold mb-1 break-word">{cat.label}</h2>
                  <p className="text-xs text-muted-foreground mb-4">{cat.desc}</p>
                  <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-3 xs:gap-4">
                    {catNotes.map(renderNoteCard)}
                  </div>
                </div>
              );
            })}
            {filteredNotes.length === 0 && (
              <div className="text-center py-12 xs:py-16 text-muted-foreground/50">No notes found</div>
            )}
          </>
        ) : (
          <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-3 xs:gap-4">
            {filteredNotes.length === 0 ? (
              <div className="col-span-full text-center py-12 xs:py-16 text-muted-foreground/50">No notes in this category</div>
            ) : filteredNotes.map(renderNoteCard)}
          </div>
        )}
      </div>

      {previewNote && <NotePreviewModal note={previewNote} onClose={() => setPreviewNote(null)} />}
    </div>
  );
}
