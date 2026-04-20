import { useState } from 'react';
import { useTimer } from '@/contexts/TimerContext';
import TimerDisplay from '@/components/StudyTimer/TimerDisplay';
import TimerControls from '@/components/StudyTimer/TimerControls';
import TimerSettings from '@/components/StudyTimer/TimerSettings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  BarChart3, 
  Settings as SettingsIcon,
  History,
  Target,
  Trophy
} from 'lucide-react';
import TopNav from '@/components/TopNav';
import { useIsMobile } from '@/hooks/use-mobile';

export default function StudyTimerPage() {
  const { 
    sessionsCompleted, 
    totalStudyTime, 
    getDailyStats,
    getWeeklyStats,
    sessionHistory 
  } = useTimer();
  const isMobile = useIsMobile();
  
  const dailyStats = getDailyStats();
  const weeklyStats = getWeeklyStats();
  
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };
  
  return (
    <div className="min-h-screen bg-background">
      <TopNav backTo="/dashboard" />
      
      <div className="max-w-6xl mx-auto pt-20 px-4 pb-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Clock className="h-8 w-8" />
            Study Timer
          </h1>
          <p className="text-muted-foreground mt-2">
            Use the Pomodoro technique to stay focused and productive
          </p>
        </div>
        {/* Main Timer Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Left: Timer Display & Controls */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Pomodoro Timer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center">
                {/* Large Timer Display */}
                <div className="mb-8">
                  <TimerDisplay size="large" showSessionType showProgress />
                </div>
                
                {/* Controls */}
                <div className="mb-8">
                  <TimerControls showLabels={!isMobile} />
                </div>
                
                {/* Quick Stats */}
                <div className="grid grid-cols-2 xs:grid-cols-4 gap-4 w-full max-w-md">
                  <div className="bg-surface2 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold">{sessionsCompleted}</div>
                    <div className="text-xs text-muted-foreground">Sessions</div>
                  </div>
                  <div className="bg-surface2 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold">{formatTime(totalStudyTime)}</div>
                    <div className="text-xs text-muted-foreground">Today</div>
                  </div>
                  <div className="bg-surface2 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold">{dailyStats.workSessions}</div>
                    <div className="text-xs text-muted-foreground">Work</div>
                  </div>
                  <div className="bg-surface2 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold">{dailyStats.breakSessions}</div>
                    <div className="text-xs text-muted-foreground">Breaks</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Right: Settings Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TimerSettings />
            </CardContent>
          </Card>
        </div>
        
        {/* Tabs for Stats & History */}
        <Tabs defaultValue="stats" className="w-full">
          <TabsList className="grid grid-cols-3 mb-6">
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Statistics
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
            <TabsTrigger value="goals" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Goals
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="stats">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Daily Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Study Time</span>
                    <span className="font-semibold">{formatTime(dailyStats.totalStudyTime)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Sessions Completed</span>
                    <span className="font-semibold">{dailyStats.sessionsCompleted}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Average Session</span>
                    <span className="font-semibold">{formatTime(dailyStats.averageSessionLength)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Focus Ratio</span>
                    <span className="font-semibold">
                      {dailyStats.workSessions > 0 
                        ? `${Math.round((dailyStats.workSessions / (dailyStats.workSessions + dailyStats.breakSessions)) * 100)}%`
                        : '0%'
                      }
                    </span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Weekly Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Study Time</span>
                    <span className="font-semibold">{formatTime(weeklyStats.totalStudyTime)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Sessions Completed</span>
                    <span className="font-semibold">{weeklyStats.sessionsCompleted}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Daily Average</span>
                    <span className="font-semibold">{formatTime(weeklyStats.dailyAverage)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Best Day</span>
                    <span className="font-semibold">{formatTime(weeklyStats.bestDay.time)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Session History</CardTitle>
              </CardHeader>
              <CardContent>
                {sessionHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No sessions recorded yet.</p>
                    <p className="text-sm">Start a timer to begin tracking your study sessions!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[...sessionHistory].reverse().slice(0, 10).map((session) => {
                      const date = new Date(session.endTime);
                      const sessionTypeColors = {
                        work: 'bg-primary/10 text-primary border-primary/20',
                        short_break: 'bg-green-500/10 text-green-600 border-green-500/20',
                        long_break: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
                      };
                      
                      return (
                        <div 
                          key={session.id} 
                          className={`flex items-center justify-between p-3 rounded-lg border ${sessionTypeColors[session.type]}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`h-3 w-3 rounded-full ${
                              session.type === 'work' ? 'bg-primary' :
                              session.type === 'short_break' ? 'bg-green-500' :
                              'bg-blue-500'
                            }`}></div>
                            <div>
                              <div className="font-medium">
                                {session.type === 'work' ? 'Work Session' :
                                 session.type === 'short_break' ? 'Short Break' : 'Long Break'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {date.toLocaleDateString()} • {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">{formatTime(session.duration)}</div>
                            {session.notes && (
                              <div className="text-xs text-muted-foreground truncate max-w-[120px]">
                                {session.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="goals">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Study Goals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Daily Goal</span>
                    <span className="text-sm text-muted-foreground">
                      {dailyStats.sessionsCompleted}/8 sessions
                    </span>
                  </div>
                  <div className="h-2 bg-surface2 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all"
                      style={{ width: `${Math.min(100, (dailyStats.sessionsCompleted / 8) * 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Complete 8 Pomodoro sessions (4 hours) per day
                  </p>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Weekly Goal</span>
                    <span className="text-sm text-muted-foreground">
                      {weeklyStats.sessionsCompleted}/40 sessions
                    </span>
                  </div>
                  <div className="h-2 bg-surface2 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 transition-all"
                      style={{ width: `${Math.min(100, (weeklyStats.sessionsCompleted / 40) * 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Complete 40 Pomodoro sessions (20 hours) per week
                  </p>
                </div>
                
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                    <span className="font-medium">Achievements</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className={`p-3 rounded-lg border text-center ${
                      dailyStats.sessionsCompleted >= 4 
                        ? 'bg-yellow-500/10 border-yellow-500/30' 
                        : 'bg-surface2 border-border'
                    }`}>
                      <div className="text-lg font-bold">Half Day</div>
                      <div className="text-xs">Complete 4 sessions</div>
                      <div className="text-xs mt-1">
                        {dailyStats.sessionsCompleted >= 4 ? '✅ Achieved' : `${4 - dailyStats.sessionsCompleted} to go`}
                      </div>
                    </div>
                    <div className={`p-3 rounded-lg border text-center ${
                      dailyStats.sessionsCompleted >= 8 
                        ? 'bg-yellow-500/10 border-yellow-500/30' 
                        : 'bg-surface2 border-border'
                    }`}>
                      <div className="text-lg font-bold">Full Day</div>
                      <div className="text-xs">Complete 8 sessions</div>
                      <div className="text-xs mt-1">
                        {dailyStats.sessionsCompleted >= 8 ? '✅ Achieved' : `${8 - dailyStats.sessionsCompleted} to go`}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Help Section */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p className="mb-2">
            💡 <strong>Tip:</strong> The timer will continue running even when you navigate to other pages.
            Look for the floating timer panel in the bottom-right corner!
          </p>
          <p>
            The Pomodoro Technique: 25 minutes of focused work followed by a 5-minute break.
            After 4 work sessions, take a longer 15-30 minute break.
          </p>
        </div>
      </div>
    </div>
  );
}