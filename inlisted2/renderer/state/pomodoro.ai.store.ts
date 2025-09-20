import { create } from 'zustand';
import { 
  ContextFeatures, 
  SmartSuggestion, 
  BreakSuggestion, 
  SessionResult, 
  PomodoroAIState,
  BanditDebugInfo 
} from '../../common/types';
import {
  initBandit,
  chooseArm,
  updateBandit,
  calculateReward,
  explainSuggestion,
  serializeBandit,
  deserializeBandit
} from '../ai/bandit';
import {
  initFatigue,
  updateFatigue,
  suggestBreak,
  explainFatigue,
  calculateSessionQuality,
  getPersonalizedBreakAdvice,
  serializeFatigue,
  deserializeFatigue
} from '../ai/fatigue';

interface PomodoroAIStore {
  // Current state
  banditState: ReturnType<typeof initBandit>;
  fatigueState: ReturnType<typeof initFatigue>;
  currentContext: ContextFeatures;
  lastSuggestion: SmartSuggestion | null;
  lastBreakSuggestion: BreakSuggestion | null;
  isInitialized: boolean;

  // Actions
  initializeAI: () => void;
  setContext: (context: Partial<ContextFeatures>) => void;
  chooseSmart: () => SmartSuggestion;
  finishSession: (result: SessionResult) => { breakSuggestion: BreakSuggestion; explanation: string };
  resetAI: () => void;
  explainCurrentFatigue: () => string;
  
  // Persistence
  saveState: () => void;
  loadState: () => void;
}

// Helper function to get current time of day
function getCurrentTimeOfDay(): ContextFeatures['timeOfDay'] {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

// Helper function to get current day of week
function getCurrentDayOfWeek(): number {
  return new Date().getDay(); // 0 = Sunday
}

// Default context
const getDefaultContext = (): ContextFeatures => ({
  timeOfDay: getCurrentTimeOfDay(),
  dayOfWeek: getCurrentDayOfWeek(),
  selfReportedState: 'neutral',
  currentTask: undefined
});

// Storage key for persistence
const STORAGE_KEY = 'pomodoro-ai-state';

export const usePomodoroAI = create<PomodoroAIStore>((set, get) => ({
  // Initial state
  banditState: initBandit(),
  fatigueState: initFatigue(),
  currentContext: getDefaultContext(),
  lastSuggestion: null,
  lastBreakSuggestion: null,
  isInitialized: false,

  // Initialize the AI system
  initializeAI: () => {
    const store = get();
    if (!store.isInitialized) {
      store.loadState();
      set({ 
        isInitialized: true,
        currentContext: getDefaultContext() // Refresh context on init
      });
    }
  },

  // Update context (partial updates allowed)
  setContext: (contextUpdate: Partial<ContextFeatures>) => {
    set(state => ({
      currentContext: { 
        ...state.currentContext, 
        ...contextUpdate,
        // Always refresh time-based context
        timeOfDay: getCurrentTimeOfDay(),
        dayOfWeek: getCurrentDayOfWeek()
      }
    }));
  },

  // Get smart duration suggestion
  chooseSmart: (): SmartSuggestion => {
    const { banditState, currentContext } = get();
    
    const { arm, debug } = chooseArm(banditState, currentContext);
    const explanation = explainSuggestion(banditState, arm, currentContext, debug);
    
    const suggestion: SmartSuggestion = {
      duration: arm,
      explanation
    };

    set({ lastSuggestion: suggestion });
    return suggestion;
  },

  // Process completed session and get break recommendation
  finishSession: (result: SessionResult) => {
    const { banditState, fatigueState, currentContext } = get();
    
    // Calculate reward for bandit learning
    const reward = calculateReward(result.completed, result.pauses, result.userFeedback);
    
    // Update bandit with session result
    const newBanditState = updateBandit(banditState, result.duration, reward);
    
    // Calculate session quality for fatigue tracking
    const sessionQuality = calculateSessionQuality(
      result.completed, 
      result.pauses, 
      result.userFeedback, 
      result.duration
    );
    
    // Update fatigue state
    const newFatigueState = updateFatigue(fatigueState, sessionQuality);
    
    // Get break suggestion
    const breakSuggestion = suggestBreak(newFatigueState);
    const personalizedAdvice = getPersonalizedBreakAdvice(newFatigueState, currentContext.timeOfDay);
    
    // Update state
    set({
      banditState: newBanditState,
      fatigueState: newFatigueState,
      lastBreakSuggestion: breakSuggestion
    });
    
    // Save updated state
    get().saveState();
    
    return {
      breakSuggestion,
      explanation: personalizedAdvice
    };
  },

  // Reset all AI learning
  resetAI: () => {
    const newBanditState = initBandit();
    const newFatigueState = initFatigue();
    
    set({
      banditState: newBanditState,
      fatigueState: newFatigueState,
      lastSuggestion: null,
      lastBreakSuggestion: null
    });
    
    // Clear persisted state
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    
    // If electron-store is available, clear it too
    if ((window as any).electronAPI?.clearAIState) {
      (window as any).electronAPI.clearAIState();
    }
  },

  // Get current fatigue explanation
  explainCurrentFatigue: (): string => {
    const { fatigueState } = get();
    return explainFatigue(fatigueState);
  },

  // Save state to persistence
  saveState: () => {
    const { banditState, fatigueState } = get();
    
    const stateToSave: PomodoroAIState = {
      bandit: banditState,
      fatigue: fatigueState,
      lastUpdated: Date.now()
    };

    // Try electron-store first, fall back to localStorage
    if ((window as any).electronAPI?.saveAIState) {
      (window as any).electronAPI.saveAIState(stateToSave);
    } else if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
      } catch (error) {
        console.warn('Failed to save AI state to localStorage:', error);
      }
    }
  },

  // Load state from persistence
  loadState: () => {
    let loadedState: PomodoroAIState | null = null;

    // Try electron-store first, fall back to localStorage
    if ((window as any).electronAPI?.loadAIState) {
      loadedState = (window as any).electronAPI.loadAIState();
    } else if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) {
          loadedState = JSON.parse(saved);
        }
      } catch (error) {
        console.warn('Failed to load AI state from localStorage:', error);
      }
    }

    if (loadedState) {
      try {
        // Validate and restore state
        const banditState = loadedState.bandit || initBandit();
        const fatigueState = loadedState.fatigue || initFatigue();
        
        set({
          banditState,
          fatigueState
        });
        
        console.log('AI state loaded successfully');
      } catch (error) {
        console.warn('Failed to restore AI state, using defaults:', error);
        // State will remain as initialized defaults
      }
    }
  }
}));

// Helper hook for getting suggestion with automatic initialization
export const useSmartSuggestion = () => {
  const store = usePomodoroAI();
  
  // Auto-initialize on first use
  if (!store.isInitialized) {
    store.initializeAI();
  }
  
  return {
    chooseSmart: store.chooseSmart,
    lastSuggestion: store.lastSuggestion,
    setContext: store.setContext,
    currentContext: store.currentContext
  };
};

// Helper hook for session completion
export const useSessionCompletion = () => {
  const store = usePomodoroAI();
  
  return {
    finishSession: store.finishSession,
    lastBreakSuggestion: store.lastBreakSuggestion,
    explainCurrentFatigue: store.explainCurrentFatigue
  };
};

// Helper hook for AI management
export const useAIManagement = () => {
  const store = usePomodoroAI();
  
  return {
    resetAI: store.resetAI,
    isInitialized: store.isInitialized,
    initializeAI: store.initializeAI
  };
};