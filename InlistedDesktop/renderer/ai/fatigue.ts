import { FatigueState, BreakSuggestion } from '../../common/types';

/**
 * Initialize fatigue tracking with EWMA (Exponentially Weighted Moving Average)
 */
export function initFatigue(alpha: number = 0.3): FatigueState {
  return {
    ewma: 0.5, // Start with neutral fatigue
    alpha: Math.max(0.1, Math.min(1.0, alpha)) // Clamp alpha between 0.1 and 1.0
  };
}

/**
 * Update fatigue level based on session quality
 * sessionQuality: 0.0 = terrible session (high fatigue), 1.0 = excellent session (low fatigue)
 */
export function updateFatigue(
  currentFatigue: FatigueState,
  sessionQuality: number
): FatigueState {
  // Clamp session quality between 0 and 1
  const quality = Math.max(0, Math.min(1, sessionQuality));
  
  // Convert session quality to fatigue impact
  // High quality session (0.8-1.0) reduces fatigue
  // Low quality session (0.0-0.4) increases fatigue
  let fatigueImpact: number;
  
  if (quality >= 0.8) {
    // Excellent session: significant fatigue reduction
    fatigueImpact = 0.2;
  } else if (quality >= 0.6) {
    // Good session: moderate fatigue reduction
    fatigueImpact = 0.4;
  } else if (quality >= 0.4) {
    // Mediocre session: slight fatigue increase
    fatigueImpact = 0.6;
  } else {
    // Poor session: significant fatigue increase
    fatigueImpact = 0.8;
  }
  
  // Apply EWMA update: new_value = alpha * new_observation + (1 - alpha) * current_value
  const newEwma = currentFatigue.alpha * fatigueImpact + (1 - currentFatigue.alpha) * currentFatigue.ewma;
  
  return {
    ...currentFatigue,
    ewma: Math.max(0, Math.min(1, newEwma)) // Clamp between 0 and 1
  };
}

/**
 * Suggest break duration based on current fatigue level
 */
export function suggestBreak(fatigue: FatigueState): BreakSuggestion {
  const { ewma } = fatigue;
  
  if (ewma < 0.6) {
    // Low fatigue: short break
    const minutes = Math.floor(Math.random() * 3) + 5; // 5-7 minutes
    return {
      kind: 'short',
      minutes,
      reason: `Low fatigue level (${(ewma * 100).toFixed(0)}%) - a short ${minutes}-minute break should refresh you.`
    };
  } else {
    // High fatigue: longer break
    const minutes = Math.floor(Math.random() * 6) + 10; // 10-15 minutes
    return {
      kind: 'long',
      minutes,
      reason: `High fatigue level (${(ewma * 100).toFixed(0)}%) - take a longer ${minutes}-minute break to recover properly.`
    };
  }
}

/**
 * Get a human-readable explanation of the current fatigue state
 */
export function explainFatigue(fatigue: FatigueState): string {
  const { ewma } = fatigue;
  const percentage = Math.round(ewma * 100);
  
  let description: string;
  if (ewma < 0.3) {
    description = 'feeling fresh and energized';
  } else if (ewma < 0.6) {
    description = 'moderately tired but still productive';
  } else if (ewma < 0.8) {
    description = 'quite fatigued and may need longer breaks';
  } else {
    description = 'very tired and should consider stopping soon';
  }
  
  return `Current fatigue: ${percentage}% - you're ${description}.`;
}

/**
 * Calculate session quality based on completion, pauses, and user feedback
 * This mirrors the reward calculation but focuses on fatigue impact
 */
export function calculateSessionQuality(
  completed: boolean,
  pauses: number,
  userFeedback?: 'too_short' | 'just_right' | 'too_long',
  duration: number = 25
): number {
  let quality = 0.5; // Neutral baseline
  
  if (completed) {
    // Base quality for completion
    quality = 0.8 - Math.min(0.1 * pauses, 0.3); // Max penalty of 0.3 for pauses
    
    // Bonus for completing without pauses
    if (pauses === 0) {
      quality += 0.2;
    }
  } else {
    // Incomplete session: poor quality
    quality = 0.2;
    
    // Slightly better if they at least tried (had some pauses)
    if (pauses > 0) {
      quality += 0.1;
    }
  }
  
  // Adjust based on user feedback
  if (userFeedback) {
    switch (userFeedback) {
      case 'just_right':
        quality += 0.2; // Perfect duration boosts quality
        break;
      case 'too_short':
        quality -= 0.1; // Slightly frustrating
        break;
      case 'too_long':
        quality -= 0.3; // Very draining
        break;
    }
  }
  
  // Duration-based adjustment (very long sessions are more tiring)
  if (duration > 40) {
    quality -= 0.1;
  }
  
  return Math.max(0, Math.min(1, quality));
}

/**
 * Provide personalized break suggestions based on time of day and fatigue
 */
export function getPersonalizedBreakAdvice(
  fatigue: FatigueState,
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'
): string {
  const baseSuggestion = suggestBreak(fatigue);
  
  const activities = {
    morning: ['stretching', 'light walk', 'hydrate', 'look out the window'],
    afternoon: ['quick walk', 'healthy snack', 'deep breathing', 'stand and stretch'],
    evening: ['gentle stretching', 'herbal tea', 'dim the lights', 'light snack'],
    night: ['avoid screens', 'prepare for sleep', 'gentle breathing', 'dim lighting']
  };
  
  const timeActivities = activities[timeOfDay];
  const randomActivity = timeActivities[Math.floor(Math.random() * timeActivities.length)];
  
  return `${baseSuggestion.reason} Consider ${randomActivity} during your break.`;
}

/**
 * Serialize fatigue state for persistence
 */
export function serializeFatigue(state: FatigueState): string {
  return JSON.stringify(state);
}

/**
 * Deserialize fatigue state from persistence
 */
export function deserializeFatigue(data: string): FatigueState {
  try {
    const parsed = JSON.parse(data);
    if (typeof parsed.ewma !== 'number' || typeof parsed.alpha !== 'number') {
      throw new Error('Invalid fatigue state structure');
    }
    return {
      ewma: Math.max(0, Math.min(1, parsed.ewma)),
      alpha: Math.max(0.1, Math.min(1, parsed.alpha))
    };
  } catch (error) {
    console.warn('Failed to deserialize fatigue state, using defaults:', error);
    return initFatigue();
  }
}