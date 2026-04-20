import { useTimer, formatTime } from '@/contexts/TimerContext';

interface TimerDisplayProps {
  size?: 'small' | 'medium' | 'large';
  showSessionType?: boolean;
  showProgress?: boolean;
  className?: string;
}

export default function TimerDisplay({ 
  size = 'medium', 
  showSessionType = true,
  showProgress = true,
  className = ''
}: TimerDisplayProps) {
  const { 
    timeRemaining, 
    currentSession, 
    getSessionProgress,
    isRunning,
    isPaused 
  } = useTimer();
  
  const progress = getSessionProgress();
  
  // Size-based styling
  const sizeClasses = {
    small: 'text-2xl',
    medium: 'text-4xl',
    large: 'text-6xl'
  };
  
  const sessionLabels = {
    work: 'Work Session',
    short_break: 'Short Break',
    long_break: 'Long Break'
  };
  
  const sessionColors = {
    work: 'text-primary',
    short_break: 'text-green-500',
    long_break: 'text-blue-500'
  };
  
  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Timer display */}
      <div className={`font-mono font-bold ${sizeClasses[size]} ${sessionColors[currentSession]} mb-2`}>
        {formatTime(timeRemaining)}
      </div>
      
      {/* Status indicators */}
      <div className="flex items-center gap-2 mb-3">
        <div className={`h-2 w-2 rounded-full ${isRunning ? 'animate-pulse' : ''} ${
          isRunning ? 'bg-green-500' : 
          isPaused ? 'bg-yellow-500' : 
          'bg-gray-400'
        }`}></div>
        <span className="text-sm text-muted-foreground">
          {isRunning ? 'Running' : isPaused ? 'Paused' : 'Stopped'}
        </span>
      </div>
      
      {/* Session type */}
      {showSessionType && (
        <div className={`text-sm font-medium mb-3 ${sessionColors[currentSession]}`}>
          {sessionLabels[currentSession]}
        </div>
      )}
      
      {/* Progress bar */}
      {showProgress && (
        <div className="w-full max-w-xs">
          <div className="h-2 bg-surface2 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${
                currentSession === 'work' ? 'bg-primary' : 
                currentSession === 'short_break' ? 'bg-green-500' : 
                'bg-blue-500'
              }`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="text-xs text-muted-foreground mt-1 text-center">
            {Math.round(progress)}% complete
          </div>
        </div>
      )}
    </div>
  );
}