import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DashboardSidebar from '@/components/DashboardSidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { useWeeks } from '@/hooks/useAiNotes';
import { BookOpen, ChevronRight, Home, FolderOpen, Calendar, FileText, Clock } from 'lucide-react';

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

export default function AINotesCoursePage() {
  const { course } = useParams<{ course: string }>();
  const { user } = useAuth();
  const { weeks, loading, error } = useWeeks(course || '');

  const decodedCourse = course ? decodeURIComponent(course) : '';

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
                <BreadcrumbPage>{decodedCourse}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">{decodedCourse}</h1>
            <p className="text-muted-foreground mt-2">
              Browse weeks in this course. Select a week to view available notes.
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
                  <p>Error loading weeks: {error}</p>
                  <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
                    Retry
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : weeks.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No weeks available</h3>
                  <p className="text-muted-foreground mt-1">
                    No weeks have been created for this course yet.
                  </p>
                  <Button asChild className="mt-4">
                    <Link to="/ai-notes">Back to Courses</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {weeks.map((week) => (
                <Card key={`${week.course}-${week.lecture}`} className="group relative overflow-hidden border-border/50 hover:border-primary/30 transition-all duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5 bg-gradient-to-br from-surface to-surface/95">
                  {/* Animated gradient accent */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors duration-300">
                            <Calendar className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <BookOpen className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium text-muted-foreground truncate">{week.course}</span>
                            </div>
                            <CardTitle className="text-lg font-bold tracking-tight group-hover:text-primary transition-colors duration-300">
                              {week.chapter_title || `Week ${week.week_number || 1}`}
                            </CardTitle>
                            <CardDescription className="mt-1">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-surface2 text-sm">
                                  <FileText className="h-3.5 w-3.5" />
                                  <span className="font-medium">{week.note_count} note{week.note_count !== 1 ? 's' : ''}</span>
                                </div>
                                {week.latest_note_date && (
                                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-surface2 text-sm">
                                    <Clock className="h-3.5 w-3.5" />
                                    <span className="font-medium">
                                      {new Date(week.latest_note_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </span>
                                  </div>
                                )}
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
                          <Badge variant="outline" className="font-normal">
                            Week {week.week_number || 1}
                          </Badge>
                          <Badge variant="secondary" className="font-normal">
                            {week.note_count} note{week.note_count !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        {week.latest_note_date && (
                          <div className="flex items-center text-sm">
                            <Clock className="h-3.5 w-3.5 mr-1.5" />
                            <span>Updated {new Date(week.latest_note_date).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                      <Button asChild className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white shadow-md hover:shadow-lg transition-all duration-300">
                        <Link to={`/ai-notes/${encodeURIComponent(week.course)}/${encodeURIComponent(week.lecture)}`}>
                          <span className="font-medium">View Notes</span>
                          <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
                        </Link>
                      </Button>
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