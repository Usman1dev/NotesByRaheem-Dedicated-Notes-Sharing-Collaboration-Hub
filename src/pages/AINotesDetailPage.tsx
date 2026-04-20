import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DashboardSidebar from '@/components/DashboardSidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { useAiNote, useAiNoteManagement } from '@/hooks/useAiNotes';
import { AiNoteRenderer, AiNotesSidebar } from '@/components/ai-notes';
import { Home, FolderOpen, FileText, Calendar, User, ArrowLeft, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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

export default function AINotesDetailPage() {
  const { course, lecture, noteId } = useParams<{ course: string; lecture: string; noteId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { note, loading, error } = useAiNote(noteId || null);
  const { deleteNote, loading: deleteLoading, error: deleteError } = useAiNoteManagement();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const decodedCourse = course ? decodeURIComponent(course) : '';
  const decodedLecture = lecture ? decodeURIComponent(lecture) : '';

  const isOwner = user && note && note.owner_id === user.id;

  const handleDelete = async () => {
    if (!noteId || !note) return;
    
    try {
      setIsDeleting(true);
      await deleteNote(noteId);
      toast.success('Note deleted successfully');
      navigate(`/ai-notes/${encodeURIComponent(decodedCourse)}/${encodeURIComponent(decodedLecture)}`);
    } catch (err) {
      toast.error('Failed to delete note');
      console.error('Error deleting note:', err);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
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
                <BreadcrumbLink asChild>
                  <Link to={`/ai-notes/${encodeURIComponent(decodedCourse)}/${encodeURIComponent(decodedLecture)}`}>
                    {decodedLecture}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Note</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="mb-6 flex flex-wrap gap-2">
            <Button asChild variant="outline" className="mb-4">
              <Link to={`/ai-notes/${encodeURIComponent(decodedCourse)}/${encodeURIComponent(decodedLecture)}`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Notes
              </Link>
            </Button>
            
            {isOwner && note && (
              <Button
                variant="destructive"
                className="mb-4"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {isDeleting ? 'Deleting...' : 'Delete Note'}
              </Button>
            )}
          </div>

          {loading ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </div>
            </div>
          ) : error ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-destructive">
                  <p>Error loading note: {error}</p>
                  <div className="flex gap-2 justify-center mt-4">
                    <Button variant="outline" onClick={() => window.location.reload()}>
                      Retry
                    </Button>
                    <Button asChild>
                      <Link to={`/ai-notes/${encodeURIComponent(decodedCourse)}/${encodeURIComponent(decodedLecture)}`}>
                        Back to Notes
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : !note ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">Note not found</h3>
                  <p className="text-muted-foreground mt-1">
                    The requested note could not be found or has been deleted.
                  </p>
                  <div className="flex gap-2 justify-center mt-4">
                    <Button asChild variant="outline">
                      <Link to={`/ai-notes/${encodeURIComponent(decodedCourse)}/${encodeURIComponent(decodedLecture)}`}>
                        Back to Notes
                      </Link>
                    </Button>
                    <Button asChild>
                      <Link to="/ai-notes">Browse All Notes</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{note.title}</h1>
                {note.content.description && (
                  <p className="text-muted-foreground mt-2">{note.content.description}</p>
                )}
                
                <div className="flex flex-wrap gap-3 mt-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1 bg-muted/30 px-3 py-1.5 rounded-lg">
                    <FolderOpen className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate max-w-[150px] sm:max-w-none">Course: {note.course}</span>
                  </div>
                  <div className="flex items-center gap-1 bg-muted/30 px-3 py-1.5 rounded-lg">
                    <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate max-w-[150px] sm:max-w-none">Week: {note.lecture}</span>
                  </div>
                  <div className="flex items-center gap-1 bg-muted/30 px-3 py-1.5 rounded-lg">
                    <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>Created: {new Date(note.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1 bg-muted/30 px-3 py-1.5 rounded-lg">
                    <User className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate max-w-[150px] sm:max-w-none">Title: {note.chapter_title}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col lg:flex-row gap-6">
                {/* Main Content */}
                <div className="lg:w-3/4">
                  <div className="bg-surface border border-border rounded-lg p-4 md:p-6">
                    <h2 className="text-xl font-semibold mb-6 pb-3 border-b border-border">Note Content</h2>
                    <AiNoteRenderer content={note.content} />
                  </div>
                </div>

                {/* Sidebar */}
                <div className="lg:w-1/4">
                  <div className="sticky top-24">
                    <AiNotesSidebar content={note.content} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Sections</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {note.content?.sections?.length || 0}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Blocks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {note.content?.sections?.reduce((total, section) => total + (section.blocks?.length || 0), 0) || 0}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Created</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-medium">
                      {new Date(note.created_at).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the note
                  "{note?.title}" from the database.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Note'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </main>
    </div>
  );
}