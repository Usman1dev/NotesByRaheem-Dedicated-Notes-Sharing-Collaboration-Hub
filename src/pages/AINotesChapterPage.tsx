import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DashboardSidebar from '@/components/DashboardSidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { useNotes, useAiNoteManagement } from '@/hooks/useAiNotes';
import { BookOpen, ChevronRight, Home, Calendar, FileText, Trash2, Clock, User } from 'lucide-react';
import { toast } from 'sonner';

const navItems = [
  { href: '/dashboard', icon: '📊', label: 'Dashboard' },
  { href: '/courses', icon: '📚', label: 'Courses' },
  { href: '/bookmarks', icon: '🔖', label: 'Bookmarks' },
  { href: '/upload', icon: '⬆', label: 'Upload Note' },
  { href: '/chatroom', icon: '💬', label: 'Chatroom' },
  { href: '/ai-notes', icon: '🤖', label: 'AI Notes' },
  { href: '/study-timer', icon: '⏱️', label: 'Study Timer' },
  { href: '/leaderboard', icon: '🏆', label: 'Leaderboard' },
];

export default function AINotesChapterPage() {
  const { course, lecture } = useParams<{ course: string; lecture: string }>();
  const { user } = useAuth();
  const { notes, loading, error } = useNotes(course || '', lecture || '');
  const { deleteNote, loading: deleteLoading, error: deleteError } = useAiNoteManagement();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const decodedCourse = course ? decodeURIComponent(course) : '';
  const decodedLecture = lecture ? decodeURIComponent(lecture) : '';

  const handleDelete = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
      return;
    }
    
    try {
      setDeletingId(noteId);
      await deleteNote(noteId);
      toast.success('Note deleted successfully');
      // The note list will refresh automatically because the hook will refetch
    } catch (err) {
      toast.error('Failed to delete note');
      console.error('Error deleting note:', err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex min-h-screen bg-background relative z-[1]">
      <DashboardSidebar items={navItems} />
      
      <main className="flex-1 lg:ml-60 p-4 sm:p-8 pt-16 lg:pt-8">
        <div className="max-w-6xl mx-auto">
          <Breadcrumb className="mb-6">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/ai-notes">
                    <Home className="h-4 w-4 mr-1" />
                    AI Notes
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to={`/ai-notes/${encodeURIComponent(decodedCourse)}`}>
                    {decodedCourse}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{decodedLecture}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">{decodedLecture}</h1>
            <p className="text-muted-foreground mt-2">
              Browse AI-generated notes in this week. Select a note to view its full content.
            </p>
            <div className="mt-2 text-sm text-muted-foreground">
              Course: {decodedCourse}
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2 mt-2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : error ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-destructive">
                  <p>Error loading notes: {error}</p>
                  <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
                    Retry
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : notes.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No notes available</h3>
                  <p className="text-muted-foreground mt-1">
                    No notes have been created for this chapter yet.
                  </p>
                  <div className="flex gap-2 justify-center mt-4">
                    <Button asChild variant="outline">
                      <Link to={`/ai-notes/${encodeURIComponent(decodedCourse)}`}>Back to Weeks</Link>
                    </Button>
                    <Button asChild>
                      <Link to="/ai-notes">Back to Courses</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {notes.map((note) => (
                <Card key={note.id} className="group relative overflow-hidden border-border/50 hover:border-primary/30 transition-all duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5 bg-gradient-to-br from-surface to-surface/95">
                  {/* Animated gradient accent */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  
                  {/* Corner accent for owner notes */}
                  {user && note.owner_id === user.id && (
                    <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-primary/20 to-transparent rounded-bl-full"></div>
                  )}
                  
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors duration-300">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg font-bold tracking-tight group-hover:text-primary transition-colors duration-300 truncate">
                              {note.title}
                            </CardTitle>
                            <CardDescription className="mt-1">
                              <div className="flex items-center gap-3 flex-wrap">
                                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-surface2 text-sm">
                                  <BookOpen className="h-3.5 w-3.5" />
                                  <span className="font-medium truncate">{note.course}</span>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-surface2 text-sm">
                                  <Calendar className="h-3.5 w-3.5" />
                                  <span className="font-medium">Week {note.lecture}</span>
                                </div>
                              </div>
                            </CardDescription>
                          </div>
                        </div>
                      </div>
                      <div className="p-2 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-all duration-300 group-hover:scale-110">
                        <ChevronRight className="h-5 w-5 text-primary group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="text-sm text-muted-foreground">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2" />
                            <span>Created {new Date(note.created_at).toLocaleDateString()}</span>
                          </div>
                          <Badge variant="outline" className="font-normal">
                            {note.id.substring(0, 6)}...
                          </Badge>
                        </div>
                        {user && note.owner_id === user.id && (
                          <div className="flex items-center text-sm text-primary">
                            <User className="h-3.5 w-3.5 mr-1.5" />
                            <span className="font-medium">Your Note</span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Button asChild className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white shadow-md hover:shadow-lg transition-all duration-300">
                          <Link to={`/ai-notes/${encodeURIComponent(note.course)}/${encodeURIComponent(note.lecture)}/${note.id}`}>
                            <span className="font-medium">View Note</span>
                            <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
                          </Link>
                        </Button>
                        {user && note.owner_id === user.id && (
                          <Button
                            variant="destructive"
                            size="sm"
                            className="w-full bg-gradient-to-r from-destructive/90 to-destructive/80 hover:from-destructive hover:to-destructive/90 text-white shadow-md hover:shadow-lg transition-all duration-300"
                            onClick={() => handleDelete(note.id)}
                            disabled={deletingId === note.id}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                            {deletingId === note.id ? 'Deleting...' : 'Delete Note'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}