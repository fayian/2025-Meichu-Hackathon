import React, { useState, useEffect, useCallback } from 'react';
import { 
  useSmartSuggestion, 
  useSessionCompletion, 
  useAIManagement 
} from '../state/pomodoro.ai.store';
import { 
  ContextFeatures, 
  Mood, 
  Importance, 
  UserFeedback 
} from '../../common/types';

interface PomodoroTimerProps {
  className?: string;
}

const PomodoroTimer: React.FC<PomodoroTimerProps> = ({ className = '' }) => {
  // AI hooks
  const { chooseSmart, lastSuggestion, setContext, currentContext } = useSmartSuggestion();
  const { finishSession, lastBreakSuggestion, explainCurrentFatigue } = useSessionCompletion();
  const { resetAI, isInitialized, initializeAI } = useAIManagement();

  // Timer state
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes default
  const [originalTime, setOriginalTime] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [pauses, setPauses] = useState(0);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  // UI state
  const [showExplanation, setShowExplanation] = useState(false);
  const [showSessionComplete, setShowSessionComplete] = useState(false);
  const [userFeedback, setUserFeedback] = useState<UserFeedback | undefined>();
  const [currentTaskEstimate, setCurrentTaskEstimate] = useState<number>(25);
  const [currentTaskImportance, setCurrentTaskImportance] = useState<Importance>('medium');

  // Initialize AI on mount
  useEffect(() => {
    if (!isInitialized) {
      initializeAI();
    }
  }, [isInitialized, initializeAI]);

  // Update context when relevant state changes
  useEffect(() => {
    setContext({
      selfReportedState: currentContext.selfReportedState,
      currentTask: {
        estimateMin: currentTaskEstimate,
        importance: currentTaskImportance
      }
    });
  }, [currentTaskEstimate, currentTaskImportance, setContext, currentContext.selfReportedState]);

  // Timer effect
  useEffect(() => {
    if (isRunning && !isPaused && timeLeft > 0) {
      const id = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      setIntervalId(id);
      return () => clearInterval(id);
    } else {
      if (intervalId) {
        clearInterval(intervalId);
        setIntervalId(null);
      }
    }
  }, [isRunning, isPaused, timeLeft]);

  const handleTimerComplete = useCallback(() => {
    setIsRunning(false);
    setIsPaused(false);
    
    const sessionResult = {
      completed: true,
      pauses,
      userFeedback,
      duration: Math.floor(originalTime / 60)
    };

    const result = finishSession(sessionResult);
    setShowSessionComplete(true);
    
    // Reset for next session
    setPauses(0);
    setUserFeedback(undefined);
    
    // Play completion sound
    playNotificationSound();
    
    // Show notification
    if ((window as any).electronAPI?.showNotification) {
      (window as any).electronAPI.showNotification(
        'Pomodoro Complete!',
        `${Math.floor(originalTime / 60)}-minute session finished. ${result.breakSuggestion.reason}`
      );
    }
  }, [pauses, userFeedback, originalTime, finishSession]);

  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 1);
    } catch (error) {
      console.warn('Could not play notification sound:', error);
    }
  };

  const startTimer = () => {
    if (timeLeft <= 0) {
      setTimeLeft(originalTime);
    }
    setIsRunning(true);
    setIsPaused(false);
  };

  const pauseTimer = () => {
    if (isRunning && !isPaused) {
      setIsPaused(true);
      setPauses(prev => prev + 1);
    } else if (isPaused) {
      setIsPaused(false);
    }
  };

  const resetTimer = () => {
    setIsRunning(false);
    setIsPaused(false);
    setTimeLeft(originalTime);
    setPauses(0);
    setUserFeedback(undefined);
  };

  const setCustomTime = (minutes: number) => {
    if (!isRunning || confirm('Timer is running. Set new time?')) {
      const seconds = minutes * 60;
      setTimeLeft(seconds);
      setOriginalTime(seconds);
      setIsRunning(false);
      setIsPaused(false);
      setPauses(0);
    }
  };

  const handleSmartSuggestion = () => {
    const suggestion = chooseSmart();
    setCustomTime(suggestion.duration);
    setShowExplanation(true);
  };

  const handleUserFeedback = (feedback: UserFeedback) => {
    setUserFeedback(feedback);
    
    // If session is not complete, record partial session
    if (isRunning || isPaused) {
      const sessionResult = {
        completed: false,
        pauses,
        userFeedback: feedback,
        duration: Math.floor(originalTime / 60)
      };
      finishSession(sessionResult);
    }
  };

  const handleSessionCompleteClose = () => {
    setShowSessionComplete(false);
    setShowExplanation(false);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = originalTime > 0 ? 1 - (timeLeft / originalTime) : 0;

  return (
    <div className={`pomodoro-timer ${className}`}>
      {/* Context Panel */}
      <div className="context-panel">
        <div className="context-item">
          <label>Mood:</label>
          <select 
            value={currentContext.selfReportedState} 
            onChange={(e) => setContext({ selfReportedState: e.target.value as Mood })}
          >
            <option value="good">😊 Good</option>
            <option value="neutral">😐 Neutral</option>
            <option value="poor">😞 Poor</option>
          </select>
        </div>
        
        <div className="context-item">
          <label>Task Estimate (min):</label>
          <input
            type="number"
            min="5"
            max="120"
            value={currentTaskEstimate}
            onChange={(e) => setCurrentTaskEstimate(parseInt(e.target.value) || 25)}
          />
        </div>
        
        <div className="context-item">
          <label>Importance:</label>
          <select 
            value={currentTaskImportance} 
            onChange={(e) => setCurrentTaskImportance(e.target.value as Importance)}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      {/* Timer Display */}
      <div className="timer-display">
        <div className="timer-circle" style={{ '--progress': progress } as any}>
          <div className="timer-text">
            <div className="time">{formatTime(timeLeft)}</div>
            <div className="duration-label">{Math.floor(originalTime / 60)} min session</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="timer-controls">
        <button 
          className="btn btn-primary" 
          onClick={startTimer}
          disabled={isRunning && !isPaused}
        >
          {isRunning && !isPaused ? '⏱️ Running...' : 
           isPaused ? '▶️ Resume' : '▶️ Start'}
        </button>
        
        <button 
          className="btn btn-secondary" 
          onClick={pauseTimer}
          disabled={!isRunning}
        >
          {isPaused ? '▶️ Resume' : '⏸️ Pause'}
        </button>
        
        <button className="btn btn-danger" onClick={resetTimer}>
          🔄 Reset
        </button>
      </div>

      {/* Smart Suggestion */}
      <div className="smart-suggestion">
        <button className="btn btn-smart" onClick={handleSmartSuggestion}>
          🧠 Smart Suggestion
        </button>
        
        {lastSuggestion && (
          <div className="suggestion-result">
            <div className="suggested-duration">
              Suggested: {lastSuggestion.duration} minutes
            </div>
            <button 
              className="explanation-toggle"
              onClick={() => setShowExplanation(!showExplanation)}
            >
              {showExplanation ? '▼' : '▶'} Why?
            </button>
            
            {showExplanation && (
              <div className="explanation">
                {lastSuggestion.explanation}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Preset Durations */}
      <div className="preset-durations">
        <h4>Quick Set:</h4>
        <div className="preset-buttons">
          {[15, 20, 25, 30, 40, 50].map(minutes => (
            <button
              key={minutes}
              className="preset-btn"
              onClick={() => setCustomTime(minutes)}
            >
              {minutes}m
            </button>
          ))}
        </div>
      </div>

      {/* User Feedback (when running) */}
      {(isRunning || isPaused) && (
        <div className="user-feedback">
          <h4>How does this duration feel?</h4>
          <div className="feedback-buttons">
            <button 
              className={`feedback-btn ${userFeedback === 'too_short' ? 'active' : ''}`}
              onClick={() => handleUserFeedback('too_short')}
            >
              ⏱️ Too Short
            </button>
            <button 
              className={`feedback-btn ${userFeedback === 'just_right' ? 'active' : ''}`}
              onClick={() => handleUserFeedback('just_right')}
            >
              ✅ Just Right
            </button>
            <button 
              className={`feedback-btn ${userFeedback === 'too_long' ? 'active' : ''}`}
              onClick={() => handleUserFeedback('too_long')}
            >
              ⏰ Too Long
            </button>
          </div>
        </div>
      )}

      {/* Fatigue Display */}
      <div className="fatigue-display">
        <button 
          className="fatigue-info"
          onClick={() => alert(explainCurrentFatigue())}
        >
          💪 Energy Level
        </button>
      </div>

      {/* Session Complete Modal */}
      {showSessionComplete && lastBreakSuggestion && (
        <div className="modal session-complete-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>🎉 Session Complete!</h3>
              <button className="close" onClick={handleSessionCompleteClose}>×</button>
            </div>
            
            <div className="session-stats">
              <p><strong>Duration:</strong> {Math.floor(originalTime / 60)} minutes</p>
              <p><strong>Pauses:</strong> {pauses}</p>
              {userFeedback && (
                <p><strong>Your feedback:</strong> {userFeedback.replace('_', ' ')}</p>
              )}
            </div>

            <div className="break-suggestion">
              <h4>Recommended Break:</h4>
              <div className="break-details">
                <span className="break-duration">
                  {lastBreakSuggestion.minutes} minutes 
                  ({lastBreakSuggestion.kind} break)
                </span>
                <p className="break-reason">{lastBreakSuggestion.reason}</p>
              </div>
            </div>

            <div className="modal-actions">
              <button 
                className="btn btn-primary"
                onClick={() => {
                  setCustomTime(lastBreakSuggestion.minutes);
                  handleSessionCompleteClose();
                }}
              >
                Start Break Timer
              </button>
              <button 
                className="btn btn-secondary"
                onClick={handleSessionCompleteClose}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Management */}
      <div className="ai-management">
        <button 
          className="btn btn-warning reset-ai-btn"
          onClick={() => {
            if (confirm('Reset all AI learning? This cannot be undone.')) {
              resetAI();
              alert('AI learning has been reset.');
            }
          }}
        >
          🔄 Reset AI
        </button>
      </div>
    </div>
  );
};

export default PomodoroTimer;