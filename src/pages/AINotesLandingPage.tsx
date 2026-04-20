import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DashboardSidebar from '@/components/DashboardSidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useCourses } from '@/hooks/useAiNotes';
import { BookOpen, ChevronRight, Calendar, FileText } from 'lucide-react';

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

export default function AINotesLandingPage() {
  const { user } = useAuth();
  const { courses, loading, error } = useCourses();

  return (
    <div className="flex min-h-screen bg-background relative z-[1]">
      <DashboardSidebar items={navItems} />
      
      <main className="flex-1 lg:ml-60 p-4 sm:p-8 pt-16 lg:pt-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">AI Notes</h1>
            <p className="text-muted-foreground mt-2">
              Browse AI-generated notes organized by course. Select a course to view available chapters.
            </p>
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
                  <p>Error loading courses: {error}</p>
                  <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
                    Retry
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : courses.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No courses available</h3>
                  <p className="text-muted-foreground mt-1">
                    No AI notes have been uploaded yet. Check back later or upload some notes.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <Card key={course.course} className="group relative overflow-hidden border-border/50 hover:border-primary/30 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/10 bg-gradient-to-br from-surface to-surface/95">
                  {/* Animated gradient border */}
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  
                  {/* Corner accent */}
                  <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-primary/20 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  
                  <CardHeader className="pb-3 relative z-10">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors duration-300">
                            <BookOpen className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-xl font-bold tracking-tight group-hover:text-primary transition-colors duration-300">
                              {course.course_name || course.course}
                            </CardTitle>
                            {course.course_name && course.course_name !== course.course && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {course.course}
                              </p>
                            )}
                          </div>
                        </div>
                        <CardDescription className="mt-1">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-surface2 text-sm">
                              <FileText className="h-3.5 w-3.5" />
                              <span className="font-medium">{course.note_count} note{course.note_count !== 1 ? 's' : ''}</span>
                            </div>
                            {course.latest_note_date && (
                              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-surface2 text-sm">
                                <Calendar className="h-3.5 w-3.5" />
                                <span className="font-medium">
                                  {new Date(course.latest_note_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              </div>
                            )}
                          </div>
                        </CardDescription>
                      </div>
                      <div className="p-2 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-all duration-300 group-hover:scale-110">
                        <ChevronRight className="h-5 w-5 text-primary group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center text-muted-foreground">
                          <Calendar className="h-4 w-4 mr-2" />
                          <span>
                            {course.latest_note_date ? `Updated ${new Date(course.latest_note_date).toLocaleDateString()}` : 'No notes yet'}
                          </span>
                        </div>
                        <Badge variant="outline" className="font-normal">
                          {course.note_count > 0 ? 'Active' : 'Empty'}
                        </Badge>
                      </div>
                      <div className="pt-2">
                        <Button asChild className="w-full group/btn bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white shadow-md hover:shadow-lg transition-all duration-300">
                          <Link to={`/ai-notes/${encodeURIComponent(course.course)}`}>
                            <span className="font-medium">Explore Course</span>
                            <ChevronRight className="h-4 w-4 ml-2 group-hover/btn:translate-x-1.5 transition-transform duration-300" />
                          </Link>
                        </Button>
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