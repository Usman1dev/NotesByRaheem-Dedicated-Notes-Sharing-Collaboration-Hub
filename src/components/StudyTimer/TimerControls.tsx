import { useTimer } from '@/contexts/TimerContext';
import { Button } from '@/components/ui/button';
import { Play, Pause, SkipForward, RotateCcw, Square } from 'lucide-react';

interface TimerControlsProps {
  showLabels?: boolean;
  compact?: boolean;
  className?: string;
}

export default function TimerControls({ 
  showLabels = true,
  compact = false,
  className = ''
}: TimerControlsProps) {
  const { 
    isRunning, 
    isPaused, 
    startTimer, 
    pauseTimer, 
    stopTimer, 
    resetTimer, 
    skipSession,
    toggleTimer 
  } = useTimer();
  
  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {/* Toggle button (Play/Pause/Resume) */}
        <Button
          size="icon"
          variant={isRunning ? "default" : "outline"}
          onClick={toggleTimer}
          className="h-10 w-10"
        >
          {isRunning ? (
            isPaused ? (
              <Play className="h-4 w-4" />
            ) : (
              <Pause className="h-4 w-4" />
            )
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
        
        {/* Skip button */}
        <Button
          size="icon"
          variant="outline"
          onClick={skipSession}
          className="h-10 w-10"
        >
          <SkipForward className="h-4 w-4" />
        </Button>
        
        {/* Reset button */}
        <Button
          size="icon"
          variant="outline"
          onClick={resetTimer}
          className="h-10 w-10"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
    );
  }
  
  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      {/* Main toggle button */}
      <Button
        size={showLabels ? "default" : "icon"}
        variant={isRunning ? "default" : "outline"}
        onClick={toggleTimer}
        className={`${isRunning ? 'bg-primary' : ''} ${!showLabels ? 'h-12 w-12' : 'px-6'}`}
      >
        {isRunning ? (
          isPaused ? (
            <>
              <Play className="h-4 w-4 mr-2" />
              {showLabels && 'Resume'}
            </>
          ) : (
            <>
              <Pause className="h-4 w-4 mr-2" />
              {showLabels && 'Pause'}
            </>
          )
        ) : (
          <>
            <Play className="h-4 w-4 mr-2" />
            {showLabels && 'Start'}
          </>
        )}
      </Button>
      
      {/* Skip button */}
      <Button
        size={showLabels ? "default" : "icon"}
        variant="outline"
        onClick={skipSession}
        className={!showLabels ? 'h-12 w-12' : 'px-6'}
      >
        <SkipForward className="h-4 w-4 mr-2" />
        {showLabels && 'Skip'}
      </Button>
      
      {/* Stop button */}
      <Button
        size={showLabels ? "default" : "icon"}
        variant="outline"
        onClick={stopTimer}
        className={!showLabels ? 'h-12 w-12' : 'px-6'}
      >
        <Square className="h-4 w-4 mr-2" />
        {showLabels && 'Stop'}
      </Button>
      
      {/* Reset button */}
      <Button
        size={showLabels ? "default" : "icon"}
        variant="outline"
        onClick={resetTimer}
        className={!showLabels ? 'h-12 w-12' : 'px-6'}
      >
        <RotateCcw className="h-4 w-4 mr-2" />
        {showLabels && 'Reset'}
      </Button>
    </div>
  );
}