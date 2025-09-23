/**
 * Example usage of the Smart Pomodoro Timer
 * 
 * This file demonstrates how to integrate the smart Pomodoro features
 * into your existing application.
 */

import React from 'react';
import PomodoroTimer from './renderer/components/PomodoroTimer';
import { usePomodoroAI } from './renderer/state/pomodoro.ai.store';

// Example: Basic integration
function App() {
  return (
    <div className="app">
      <h1>Smart Pomodoro Timer</h1>
      <PomodoroTimer />
    </div>
  );
}

// Example: Using AI hooks directly
function CustomPomodoroIntegration() {
  const { chooseSmart, setContext, resetAI } = usePomodoroAI();

  const handleStartSmartSession = () => {
    // Set current context
    setContext({
      selfReportedState: 'good',
      currentTask: {
        estimateMin: 30,
        importance: 'high'
      }
    });

    // Get smart suggestion
    const suggestion = chooseSmart();
    console.log('AI suggests:', suggestion.duration, 'minutes');
    console.log('Explanation:', suggestion.explanation);
    
    // Start your timer with suggested duration...
  };

  const handleSessionComplete = (completed: boolean, pauses: number) => {
    const { finishSession } = usePomodoroAI.getState();
    
    const result = finishSession({
      completed,
      pauses,
      userFeedback: 'just_right', // or get from user
      duration: 25
    });

    console.log('Break suggestion:', result.breakSuggestion);
    console.log('Explanation:', result.explanation);
  };

  return (
    <div>
      <button onClick={handleStartSmartSession}>
        Start Smart Session
      </button>
      <button onClick={resetAI}>
        Reset AI Learning
      </button>
    </div>
  );
}

// Example: Simulating learning over time
async function simulateLearning() {
  const store = usePomodoroAI.getState();
  
  // Initialize AI
  store.initializeAI();

  // Simulate 10 sessions with different outcomes
  const sessions = [
    { duration: 25, completed: true, pauses: 0, feedback: 'just_right' },
    { duration: 30, completed: false, pauses: 3, feedback: 'too_long' },
    { duration: 20, completed: true, pauses: 1, feedback: 'too_short' },
    { duration: 25, completed: true, pauses: 0, feedback: 'just_right' },
    { duration: 40, completed: true, pauses: 2, feedback: 'too_long' },
    { duration: 25, completed: true, pauses: 0, feedback: 'just_right' },
    { duration: 15, completed: true, pauses: 0, feedback: 'too_short' },
    { duration: 25, completed: true, pauses: 1, feedback: 'just_right' },
    { duration: 30, completed: true, pauses: 1, feedback: 'just_right' },
    { duration: 25, completed: true, pauses: 0, feedback: 'just_right' }
  ];

  for (const session of sessions) {
    console.log(`Session: ${session.duration}min`);
    
    // Get suggestion (will learn over time)
    const suggestion = store.chooseSmart();
    console.log(`AI suggested: ${suggestion.duration}min - ${suggestion.explanation}`);
    
    // Simulate session completion
    const result = store.finishSession({
      completed: session.completed,
      pauses: session.pauses,
      userFeedback: session.feedback as any,
      duration: session.duration
    });
    
    console.log('Break suggestion:', result.breakSuggestion.reason);
    console.log('Fatigue:', store.explainCurrentFatigue());
    console.log('---');
    
    // Simulate time passing
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('Learning simulation complete!');
}

// Example: Context-aware suggestions
function contextAwareExample() {
  const store = usePomodoroAI.getState();
  
  // Morning session
  store.setContext({
    timeOfDay: 'morning',
    dayOfWeek: 1, // Monday
    selfReportedState: 'good',
    currentTask: { estimateMin: 45, importance: 'high' }
  });
  
  const morningSuggestion = store.chooseSmart();
  console.log('Morning suggestion:', morningSuggestion);
  
  // Evening session (same person, different context)
  store.setContext({
    timeOfDay: 'evening',
    dayOfWeek: 1, // Monday
    selfReportedState: 'poor',
    currentTask: { estimateMin: 15, importance: 'low' }
  });
  
  const eveningSuggestion = store.chooseSmart();
  console.log('Evening suggestion:', eveningSuggestion);
}

// Example: Testing persistence
function testPersistence() {
  const store = usePomodoroAI.getState();
  
  // Make some changes
  store.chooseSmart();
  store.finishSession({ completed: true, pauses: 0, duration: 25 });
  
  // Save state
  store.saveState();
  console.log('State saved');
  
  // Reset in-memory state
  store.resetAI();
  console.log('AI reset');
  
  // Load state back
  store.loadState();
  console.log('State loaded - should restore previous learning');
}

export {
  App,
  CustomPomodoroIntegration,
  simulateLearning,
  contextAwareExample,
  testPersistence
};