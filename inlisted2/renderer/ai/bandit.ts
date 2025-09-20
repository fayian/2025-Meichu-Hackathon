import { 
  BanditState, 
  BanditConfig, 
  ContextFeatures, 
  BanditDebugInfo 
} from '../../common/types';

// Default configuration for the multi-armed bandit
const DEFAULT_CONFIG: BanditConfig = {
  epsilon: 0.1, // 10% exploration rate
  arms: [15, 20, 25, 30, 40, 50], // Focus durations in minutes
  contextWeights: {
    // Small bias weights for contextual features
    'morning': 0.03,
    'afternoon': 0.01,
    'evening': -0.02,
    'night': -0.05,
    'monday': 0.02,
    'friday': -0.01,
    'good_mood': 0.05,
    'poor_mood': -0.03,
    'high_importance': 0.02,
    'low_importance': -0.01
  }
};

/**
 * Initialize a new bandit state with default values
 */
export function initBandit(
  arms: number[] = DEFAULT_CONFIG.arms, 
  config: Partial<BanditConfig> = {}
): BanditState {
  const fullConfig = { ...DEFAULT_CONFIG, ...config, arms };
  
  const state: BanditState = {
    counts: {},
    rewards: {},
    totalReward: {},
    config: fullConfig
  };

  // Initialize all arms with zero counts and rewards
  arms.forEach((arm: number) => {
    state.counts[arm] = 0;
    state.rewards[arm] = 0;
    state.totalReward[arm] = 0;
  });

  return state;
}

/**
 * Calculate contextual bias for an arm based on current context
 */
function calculateContextBias(arm: number, ctx: ContextFeatures, weights: Record<string, number>): number {
  let bias = 0;
  const { timeOfDay, dayOfWeek, selfReportedState, currentTask } = ctx;

  // Time of day bias
  bias += weights[timeOfDay] || 0;

  // Day of week bias (convert to name)
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  bias += weights[dayNames[dayOfWeek]] || 0;

  // Mood bias
  bias += weights[`${selfReportedState}_mood`] || 0;

  // Task importance bias
  if (currentTask?.importance) {
    bias += weights[`${currentTask.importance}_importance`] || 0;
  }

  // Duration-specific bias (longer durations get slight penalty for poor mood)
  if (selfReportedState === 'poor' && arm > 30) {
    bias -= 0.02;
  }

  // Morning boost for longer sessions
  if (timeOfDay === 'morning' && arm >= 25) {
    bias += 0.01;
  }

  return bias;
}

/**
 * Choose an arm using ε-greedy strategy with contextual bias
 */
export function chooseArm(
  state: BanditState, 
  ctx?: ContextFeatures
): { arm: number; debug: BanditDebugInfo } {
  const { arms, epsilon, contextWeights } = state.config;
  
  // Calculate average rewards and contextual adjustments for each arm
  const ranks: Record<number, number> = {};
  let bestArm = arms[0];
  let bestValue = -Infinity;

  arms.forEach(arm => {
    const count = state.counts[arm];
    const avgReward = count > 0 ? state.totalReward[arm] / count : 0.5; // Optimistic initial value
    
    // Add contextual bias if context is provided
    const ctxBias = ctx ? calculateContextBias(arm, ctx, contextWeights) : 0;
    const adjustedValue = avgReward + ctxBias;
    
    ranks[arm] = adjustedValue;
    
    if (adjustedValue > bestValue) {
      bestValue = adjustedValue;
      bestArm = arm;
    }
  });

  // ε-greedy decision: explore with probability ε, exploit otherwise
  const shouldExplore = Math.random() < epsilon;
  const chosenArm = shouldExplore 
    ? arms[Math.floor(Math.random() * arms.length)]
    : bestArm;

  const ctxBias = ctx ? calculateContextBias(chosenArm, ctx, contextWeights) : 0;

  return {
    arm: chosenArm,
    debug: {
      ctxBias,
      ranks,
      explorationChoice: shouldExplore
    }
  };
}

/**
 * Update bandit state with reward from completed session
 */
export function updateBandit(
  state: BanditState,
  arm: number,
  reward: number
): BanditState {
  // Clamp reward between 0 and 1
  const clampedReward = Math.max(0, Math.min(1, reward));
  
  const newState = {
    ...state,
    counts: { ...state.counts },
    rewards: { ...state.rewards },
    totalReward: { ...state.totalReward }
  };

  newState.counts[arm] += 1;
  newState.totalReward[arm] += clampedReward;
  newState.rewards[arm] = newState.totalReward[arm] / newState.counts[arm];

  return newState;
}

/**
 * Calculate reward based on session completion and user feedback
 */
export function calculateReward(
  completed: boolean,
  pauses: number,
  userFeedback?: 'too_short' | 'just_right' | 'too_long'
): number {
  let reward = 0;

  if (completed) {
    // Base reward for completion
    reward = 1.0 - Math.min(0.1 * pauses, 0.4);
  } else {
    // No reward for incomplete sessions
    reward = 0.0;
  }

  // Adjust based on user feedback
  if (userFeedback) {
    switch (userFeedback) {
      case 'too_short':
        reward -= 0.15;
        break;
      case 'just_right':
        reward += 0.1;
        break;
      case 'too_long':
        reward -= 0.2;
        break;
    }
  }

  return Math.max(0, Math.min(1, reward));
}

/**
 * Generate explanation for why a particular arm was chosen
 */
export function explainSuggestion(
  state: BanditState,
  chosenArm: number,
  ctx: ContextFeatures | undefined,
  debug: BanditDebugInfo
): string {
  const count = state.counts[chosenArm];
  const avgReward = count > 0 ? state.rewards[chosenArm] : 0.5;
  
  // Find second best arm for comparison
  const sortedArms = Object.entries(debug.ranks)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .map(([arm]) => parseInt(arm));
  
  const secondBest = sortedArms[1];
  const secondBestReward = state.counts[secondBest] > 0 ? state.rewards[secondBest] : 0.5;

  let explanation = `Recommended ${chosenArm} min: `;
  
  if (count > 0) {
    explanation += `avg score ${avgReward.toFixed(2)} over ${count} trial${count === 1 ? '' : 's'}`;
    
    if (secondBest && Math.abs(avgReward - secondBestReward) > 0.05) {
      explanation += `; better than ${secondBest} min (${secondBestReward.toFixed(2)})`;
    }
  } else {
    explanation += `exploring new duration`;
  }

  // Explain contextual bias if significant
  if (ctx && Math.abs(debug.ctxBias) > 0.02) {
    const biasDirection = debug.ctxBias > 0 ? 'adds' : 'reduces';
    const biasAmount = Math.abs(debug.ctxBias).toFixed(2);
    explanation += `. ${ctx.timeOfDay.charAt(0).toUpperCase() + ctx.timeOfDay.slice(1)} context ${biasDirection} ${biasAmount}`;
  }

  if (debug.explorationChoice) {
    explanation += ` (exploring)`;
  }

  return explanation + '.';
}

/**
 * Serialize bandit state for persistence
 */
export function serializeBandit(state: BanditState): string {
  return JSON.stringify(state);
}

/**
 * Deserialize bandit state from persistence
 */
export function deserializeBandit(data: string): BanditState {
  try {
    const parsed = JSON.parse(data);
    // Validate structure and provide defaults if needed
    if (!parsed.config || !parsed.counts || !parsed.rewards || !parsed.totalReward) {
      throw new Error('Invalid bandit state structure');
    }
    return parsed;
  } catch (error) {
    console.warn('Failed to deserialize bandit state, using defaults:', error);
    return initBandit();
  }
}