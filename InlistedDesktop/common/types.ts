// Common types for the Smart Pomodoro AI system
export type Importance = 'low' | 'medium' | 'high';
export type Mood = 'good' | 'neutral' | 'poor';
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';
export type UserFeedback = 'too_short' | 'just_right' | 'too_long';

export interface CurrentTaskCtx {
  estimateMin?: number;
  importance?: Importance;
}

export interface ContextFeatures {
  timeOfDay: TimeOfDay;
  dayOfWeek: number; // 0=Sunday
  selfReportedState: Mood;
  currentTask?: CurrentTaskCtx;
}

export interface BanditDebugInfo {
  ctxBias: number;
  ranks: Record<number, number>;
  explorationChoice: boolean;
}

export interface SmartSuggestion {
  duration: number;
  explanation: string;
}

export interface BreakSuggestion {
  kind: 'short' | 'long';
  minutes: number;
  reason: string;
}

export interface SessionResult {
  completed: boolean;
  pauses: number;
  userFeedback?: UserFeedback;
  duration: number;
}

// Bandit state interfaces
export interface BanditConfig {
  epsilon: number;
  arms: number[];
  contextWeights: Record<string, number>;
}

export interface BanditState {
  counts: Record<number, number>;
  rewards: Record<number, number>;
  totalReward: Record<number, number>;
  config: BanditConfig;
}

export interface FatigueState {
  ewma: number;
  alpha: number;
}

// Persistence interface
export interface PomodoroAIState {
  bandit: BanditState;
  fatigue: FatigueState;
  lastUpdated: number;
}