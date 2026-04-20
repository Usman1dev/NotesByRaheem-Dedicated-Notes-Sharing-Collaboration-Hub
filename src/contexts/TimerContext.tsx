import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';

// Types
export type SessionType = 'work' | 'short_break' | 'long_break';

export interface SessionRecord {
  id: string;
  type: SessionType;
  duration: number; // in seconds
  startTime: number; // timestamp
  endTime: number; // timestamp
  notes?: string;
}

export interface TimerSettings {
  workDuration: number; // in minutes
  shortBreakDuration: number; // in minutes
  longBreakDuration: number; // in minutes
  longBreakInterval: number; // sessions before long break
  autoStartBreaks: boolean;
  autoStartWork: boolean;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
}

export interface TimerState {
  isRunning: boolean;
  isPaused: boolean;
  currentSession: SessionType;
  timeRemaining: number; // in seconds
  sessionsCompleted: number;
  totalStudyTime: number; // in seconds
  currentSessionStartTime: number | null;
  sessionHistory: SessionRecord[];
  settings: TimerSettings;
}

export interface TimerContextType extends TimerState {
  // Actions
  startTimer: () => void;
  pauseTimer: () => void;
  stopTimer: () => void;
  resetTimer: () => void;
  skipSession: () => void;
  toggleTimer: () => void;
  
  // Settings
  updateSettings: (settings: Partial<TimerSettings>) => void;
  resetSettings: () => void;
  
  // Session management
  addSessionNote: (note: string) => void;
  clearHistory: () => void;
  
  // Statistics
  getDailyStats: () => DailyStats;
  getWeeklyStats: () => WeeklyStats;
  getSessionProgress: () => number; // 0-100%
}

export interface DailyStats {
  totalStudyTime: number;
  sessionsCompleted: number;
  workSessions: number;
  breakSessions: number;
  averageSessionLength: number;
}

export interface WeeklyStats {
  totalStudyTime: number;
  sessionsCompleted: number;
  dailyAverage: number;
  bestDay: { date: string; time: number };
}

// Default settings
const DEFAULT_SETTINGS: TimerSettings = {
  workDuration: 25, // 25 minutes
  shortBreakDuration: 5, // 5 minutes
  longBreakDuration: 15, // 15 minutes
  longBreakInterval: 4, // every 4 sessions
  autoStartBreaks: false, // Changed from true to false to match test expectations
  autoStartWork: false,
  soundEnabled: true,
  notificationsEnabled: true,
};

// Local storage keys
const STORAGE_KEYS = {
  TIMER_STATE: 'pomodoro_timer_state',
  TIMER_SETTINGS: 'pomodoro_timer_settings',
  SESSION_HISTORY: 'pomodoro_session_history',
};

const TimerContext = createContext<TimerContextType | null>(null);

// Helper functions
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const getSessionDuration = (sessionType: SessionType, settings: TimerSettings): number => {
  switch (sessionType) {
    case 'work': return settings.workDuration * 60;
    case 'short_break': return settings.shortBreakDuration * 60;
    case 'long_break': return settings.longBreakDuration * 60;
  }
};

const getNextSessionType = (currentSession: SessionType, sessionsCompleted: number, settings: TimerSettings): SessionType => {
  if (currentSession === 'work') {
    // After work session, decide break type
    const nextBreakNumber = sessionsCompleted + 1;
    return nextBreakNumber % settings.longBreakInterval === 0 ? 'long_break' : 'short_break';
  } else {
    // After break, go to work
    return 'work';
  }
};

export function TimerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TimerState>(() => {
    // Try to load from localStorage
    const savedState = localStorage.getItem(STORAGE_KEYS.TIMER_STATE);
    const savedSettings = localStorage.getItem(STORAGE_KEYS.TIMER_SETTINGS);
    const savedHistory = localStorage.getItem(STORAGE_KEYS.SESSION_HISTORY);
    
    const settings = savedSettings ? JSON.parse(savedSettings) : DEFAULT_SETTINGS;
    
    if (savedState) {
      const parsed = JSON.parse(savedState);
      return {
        ...parsed,
        settings,
        sessionHistory: savedHistory ? JSON.parse(savedHistory) : [],
      };
    }
    
    return {
      isRunning: false,
      isPaused: false,
      currentSession: 'work',
      timeRemaining: settings.workDuration * 60,
      sessionsCompleted: 0,
      totalStudyTime: 0,
      currentSessionStartTime: null,
      sessionHistory: [],
      settings,
    };
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Save to localStorage whenever state changes
  useEffect(() => {
    const { sessionHistory, ...stateWithoutHistory } = state;
    localStorage.setItem(STORAGE_KEYS.TIMER_STATE, JSON.stringify(stateWithoutHistory));
    localStorage.setItem(STORAGE_KEYS.TIMER_SETTINGS, JSON.stringify(state.settings));
    localStorage.setItem(STORAGE_KEYS.SESSION_HISTORY, JSON.stringify(sessionHistory));
  }, [state]);

  // Timer tick logic
  const tick = useCallback(() => {
    setState(prev => {
      if (prev.timeRemaining <= 1) {
        // Session completed
        const sessionDuration = getSessionDuration(prev.currentSession, prev.settings);
        const sessionEndTime = Date.now();
        
        // Record completed session
        const sessionRecord: SessionRecord = {
          id: Date.now().toString(),
          type: prev.currentSession,
          duration: sessionDuration,
          startTime: prev.currentSessionStartTime || sessionEndTime - sessionDuration * 1000,
          endTime: sessionEndTime,
        };

        const newSessionHistory = [...prev.sessionHistory, sessionRecord];
        
        // Calculate new total study time
        const newTotalStudyTime = prev.totalStudyTime + 
          (prev.currentSession === 'work' ? sessionDuration : 0);
        
        // Determine next session
        const nextSessionType = getNextSessionType(
          prev.currentSession,
          prev.sessionsCompleted + (prev.currentSession === 'work' ? 1 : 0),
          prev.settings
        );
        
        const nextSessionDuration = getSessionDuration(nextSessionType, prev.settings);
        
        // Auto-start next session based on settings
        const shouldAutoStart = 
          (prev.currentSession === 'work' && prev.settings.autoStartBreaks) ||
          (prev.currentSession !== 'work' && prev.settings.autoStartWork);
        
        // Send notification if enabled
        if (prev.settings.notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
          const sessionName = prev.currentSession === 'work' ? 'Work session' : 
                            prev.currentSession === 'short_break' ? 'Short break' : 'Long break';
          new Notification(`Pomodoro Timer - ${sessionName} completed!`, {
            body: `Time for ${nextSessionType === 'work' ? 'work' : 'a break'}`,
            icon: '/favicon.svg',
          });
        }
        
        return {
          ...prev,
          isRunning: shouldAutoStart,
          currentSession: nextSessionType,
          timeRemaining: nextSessionDuration,
          sessionsCompleted: prev.sessionsCompleted + (prev.currentSession === 'work' ? 1 : 0),
          totalStudyTime: newTotalStudyTime,
          currentSessionStartTime: shouldAutoStart ? Date.now() : null,
          sessionHistory: newSessionHistory,
        };
      }
      
      // Normal tick - decrement time
      return {
        ...prev,
        timeRemaining: prev.timeRemaining - 1,
      };
    });
  }, [state.settings]);

  // Manage interval
  useEffect(() => {
    if (state.isRunning && !state.isPaused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(tick, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state.isRunning, state.isPaused, tick]);

  // Request notification permission on mount
  useEffect(() => {
    if (state.settings.notificationsEnabled && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [state.settings.notificationsEnabled]);

  // Actions
  const startTimer = useCallback(() => {
    setState(prev => ({
      ...prev,
      isRunning: true,
      isPaused: false,
      currentSessionStartTime: Date.now(),
    }));
  }, []);

  const pauseTimer = useCallback(() => {
    setState(prev => ({
      ...prev,
      isRunning: false,
      isPaused: true,
    }));
  }, []);

  const stopTimer = useCallback(() => {
    setState(prev => ({
      ...prev,
      isRunning: false,
      isPaused: false,
      currentSession: 'work',
      timeRemaining: prev.settings.workDuration * 60,
      currentSessionStartTime: null,
    }));
  }, []);

  const resetTimer = useCallback(() => {
    setState(prev => ({
      ...prev,
      isRunning: false,
      isPaused: false,
      currentSession: 'work',
      timeRemaining: prev.settings.workDuration * 60,
      currentSessionStartTime: null,
    }));
  }, []);

  const skipSession = useCallback(() => {
    setState(prev => {
      const nextSessionType = getNextSessionType(
        prev.currentSession,
        prev.sessionsCompleted,
        prev.settings
      );
      const nextSessionDuration = getSessionDuration(nextSessionType, prev.settings);
      
      return {
        ...prev,
        currentSession: nextSessionType,
        timeRemaining: nextSessionDuration,
        sessionsCompleted: prev.sessionsCompleted + (prev.currentSession === 'work' ? 1 : 0),
        currentSessionStartTime: prev.isRunning ? Date.now() : null,
      };
    });
  }, []);

  const toggleTimer = useCallback(() => {
    setState(prev => {
      if (prev.isRunning && !prev.isPaused) {
        // Running → Pause
        return {
          ...prev,
          isRunning: false,
          isPaused: true,
          currentSessionStartTime: null,
        };
      } else if (prev.isPaused) {
        // Paused → Resume
        return {
          ...prev,
          isRunning: true,
          isPaused: false,
          currentSessionStartTime: Date.now() - (prev.settings.workDuration * 60 - prev.timeRemaining) * 1000,
        };
      } else {
        // Stopped → Start
        return {
          ...prev,
          isRunning: true,
          isPaused: false,
          currentSessionStartTime: Date.now(),
        };
      }
    });
  }, []);

  // Settings
  const updateSettings = useCallback((newSettings: Partial<TimerSettings>) => {
    setState(prev => {
      const updatedSettings = { ...prev.settings, ...newSettings };
      
      // If current session duration changed, update time remaining
      let updatedTimeRemaining = prev.timeRemaining;
      if (newSettings.workDuration !== undefined && prev.currentSession === 'work') {
        updatedTimeRemaining = newSettings.workDuration * 60;
      } else if (newSettings.shortBreakDuration !== undefined && prev.currentSession === 'short_break') {
        updatedTimeRemaining = newSettings.shortBreakDuration * 60;
      } else if (newSettings.longBreakDuration !== undefined && prev.currentSession === 'long_break') {
        updatedTimeRemaining = newSettings.longBreakDuration * 60;
      }
      
      return {
        ...prev,
        settings: updatedSettings,
        timeRemaining: updatedTimeRemaining,
      };
    });
  }, []);

  const resetSettings = useCallback(() => {
    setState(prev => ({
      ...prev,
      settings: DEFAULT_SETTINGS,
      timeRemaining: DEFAULT_SETTINGS.workDuration * 60,
      currentSession: 'work',
    }));
  }, []);

  // Session management
  const addSessionNote = useCallback((note: string) => {
    setState(prev => {
      if (prev.sessionHistory.length === 0) return prev;
      
      const updatedHistory = [...prev.sessionHistory];
      const lastSession = updatedHistory[updatedHistory.length - 1];
      lastSession.notes = note;
      
      return {
        ...prev,
        sessionHistory: updatedHistory,
      };
    });
  }, []);

  const clearHistory = useCallback(() => {
    setState(prev => ({
      ...prev,
      sessionHistory: [],
      totalStudyTime: 0,
      sessionsCompleted: 0,
    }));
  }, []);

  // Statistics
  const getDailyStats = useCallback((): DailyStats => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();
    
    const todaysSessions = state.sessionHistory.filter(
      session => session.endTime >= todayStart
    );
    
    const workSessions = todaysSessions.filter(s => s.type === 'work');
    const breakSessions = todaysSessions.filter(s => s.type !== 'work');
    
    const totalStudyTime = workSessions.reduce((sum, session) => sum + session.duration, 0);
    
    return {
      totalStudyTime,
      sessionsCompleted: workSessions.length,
      workSessions: workSessions.length,
      breakSessions: breakSessions.length,
      averageSessionLength: workSessions.length > 0 ? totalStudyTime / workSessions.length : 0,
    };
  }, [state.sessionHistory]);

  const getWeeklyStats = useCallback((): WeeklyStats => {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const weeklySessions = state.sessionHistory.filter(
      session => session.endTime >= oneWeekAgo
    );
    
    const workSessions = weeklySessions.filter(s => s.type === 'work');
    const totalStudyTime = workSessions.reduce((sum, session) => sum + session.duration, 0);
    
    // Group by day for best day calculation
    const dailyTotals: Record<string, number> = {};
    workSessions.forEach(session => {
      const date = new Date(session.endTime).toDateString();
      dailyTotals[date] = (dailyTotals[date] || 0) + session.duration;
    });
    
    let bestDay = { date: '', time: 0 };
    Object.entries(dailyTotals).forEach(([date, time]) => {
      if (time > bestDay.time) {
        bestDay = { date, time };
      }
    });
    
    return {
      totalStudyTime,
      sessionsCompleted: workSessions.length,
      dailyAverage: workSessions.length > 0 ? totalStudyTime / 7 : 0,
      bestDay,
    };
  }, [state.sessionHistory]);

  const getSessionProgress = useCallback((): number => {
    const totalDuration = getSessionDuration(state.currentSession, state.settings);
    if (totalDuration === 0) return 100;
    return ((totalDuration - state.timeRemaining) / totalDuration) * 100;
  }, [state.currentSession, state.timeRemaining, state.settings]);

  const contextValue: TimerContextType = {
    ...state,
    startTimer,
    pauseTimer,
    stopTimer,
    resetTimer,
    skipSession,
    toggleTimer,
    updateSettings,
    resetSettings,
    addSessionNote,
    clearHistory,
    getDailyStats,
    getWeeklyStats,
    getSessionProgress,
  };

  return (
    <TimerContext.Provider value={contextValue}>
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
}

// Export helper functions for use elsewhere
export { formatTime, getSessionDuration, getNextSessionType };