import { useState, useEffect } from 'react';
import { useTimer, formatTime } from '@/contexts/TimerContext';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Play, 
  Pause, 
  SkipForward, 
  X, 
  Minimize2, 
  Maximize2,
  Clock
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface PersistentTimerPanelProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  defaultExpanded?: boolean;
}

export default function PersistentTimerPanel({
  position = 'bottom-right',
  defaultExpanded = true,
}: PersistentTimerPanelProps) {
  const { 
    isRunning, 
    isPaused, 
    timeRemaining, 
    currentSession,
    sessionsCompleted,
    totalStudyTime,
    toggleTimer,
    skipSession,
    stopTimer
  } = useTimer();
  
  const location = useLocation();
  const isMobile = useIsMobile();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isVisible, setIsVisible] = useState(false);
  
  // Determine if we should show the panel based on user's feedback:
  // 1. Only show if timer is active (running or paused)
  // 2. Only show if NOT on the timer page itself
  useEffect(() => {
    const isTimerActive = isRunning || isPaused || timeRemaining < (25 * 60); // If timer has been started
    const isOnTimerPage = location.pathname.includes('/study-timer');
    
    // Show panel if timer is active AND we're not on the timer page
    const shouldShow = isTimerActive && !isOnTimerPage;
    setIsVisible(shouldShow);
    
    // On mobile, default to minimized if panel is shown
    if (shouldShow && isMobile) {
      setIsExpanded(false);
    }
  }, [isRunning, isPaused, timeRemaining, location.pathname, isMobile]);
  
  // Position classes
  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
  };
  
  // Session colors
  const sessionColors = {
    work: 'border-primary/30 bg-primary/5',
    short_break: 'border-green-500/30 bg-green-500/5',
    long_break: 'border-blue-500/30 bg-blue-500/5',
  };
  
  // Session labels
  const sessionLabels = {
    work: 'Work',
    short_break: 'Break',
    long_break: 'Long Break',
  };
  
  // If not visible, don't render anything
  if (!isVisible) {
    return null;
  }
  
  // Minimized view (just a small floating button)
  if (!isExpanded) {
    return (
      <div className={`fixed ${positionClasses[position]} z-[9999]`}>
        <Button
          variant="outline"
          size="icon"
          className={`h-12 w-12 rounded-full shadow-lg ${
            isRunning ? 'bg-primary text-primary-foreground' : 
            isPaused ? 'bg-yellow-500/20 border-yellow-500/30' : 
            'bg-surface border-border'
          }`}
          onClick={() => setIsExpanded(true)}
        >
          <div className="relative">
            <Clock className="h-5 w-5" />
            {isRunning && (
              <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
            )}
          </div>
        </Button>
      </div>
    );
  }
  
  // Expanded view
  return (
    <div className={`fixed ${positionClasses[position]} z-[9999]`}>
      <Card className={`w-80 shadow-2xl border ${sessionColors[currentSession]} backdrop-blur-sm bg-background/95`}>
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${
                isRunning ? 'bg-green-500 animate-pulse' : 
                isPaused ? 'bg-yellow-500' : 
                'bg-gray-400'
              }`}></div>
              <span className="text-sm font-medium">Study Timer</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsExpanded(false)}
              >
                <Minimize2 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={stopTimer}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          {/* Timer display */}
          <div className="text-center mb-4">
            <div className="text-3xl font-mono font-bold mb-1">
              {formatTime(timeRemaining)}
            </div>
            <div className={`text-sm font-medium ${
              currentSession === 'work' ? 'text-primary' : 
              currentSession === 'short_break' ? 'text-green-500' : 
              'text-blue-500'
            }`}>
              {sessionLabels[currentSession]} • Session {sessionsCompleted + 1}
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="h-1.5 bg-surface2 rounded-full overflow-hidden mb-4">
            <div 
              className={`h-full transition-all duration-1000 ${
                currentSession === 'work' ? 'bg-primary' : 
                currentSession === 'short_break' ? 'bg-green-500' : 
                'bg-blue-500'
              }`}
              style={{ 
                width: `${((25 * 60 - timeRemaining) / (25 * 60)) * 100}%` 
              }}
            ></div>
          </div>
          
          {/* Controls */}
          <div className="flex gap-2 mb-3">
            <Button
              variant={isRunning ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={toggleTimer}
            >
              {isRunning ? (
                <>
                  <Pause className="h-3 w-3 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-3 w-3 mr-2" />
                  {isPaused ? 'Resume' : 'Start'}
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={skipSession}
            >
              <SkipForward className="h-3 w-3" />
            </Button>
          </div>
          
          {/* Stats */}
          <div className="text-xs text-muted-foreground flex justify-between">
            <span>Today: {formatTime(totalStudyTime)}</span>
            <span>{sessionsCompleted} sessions</span>
          </div>
          
          {/* Mobile-only: Add a handle for dragging on mobile */}
          {isMobile && (
            <div className="absolute top-1 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="h-1 w-12 bg-border/50 rounded-full"></div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}