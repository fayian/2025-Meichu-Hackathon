# Inlisted Smart Pomodoro Timer - AI Coding Assistant Instructions

## Project Overview

**Inlisted** is an Electron-based productivity application with a **Smart Pomodoro Timer** that uses AI to learn from user behavior and provide adaptive focus/break recommendations. The app combines traditional Pomodoro techniques with machine learning to optimize productivity over time.

### Architecture

- **Main Process**: `main.js` - Electron main process with electron-store persistence
- **Renderer Process**: Vanilla JS transitioning to React + TypeScript
- **AI Engine**: Multi-armed bandit + EWMA fatigue tracking
- **State Management**: Zustand for AI learning state
- **Persistence**: electron-store (primary), localStorage (fallback)
- **UI**: HTML/CSS with planned React components

## Key Components & Patterns

### 1. AI Learning System (`renderer/ai/`)

**Multi-Armed Bandit** (`bandit.ts`):
- ε-greedy algorithm selects optimal focus durations from `[15, 20, 25, 30, 40, 50]` minutes  
- Rewards: `1.0` for completed sessions, penalized by pauses and user feedback
- Context-aware bias using time-of-day, mood, task importance (small weights ~0.01-0.05)
- Explainable: `explainSuggestion()` returns data-backed reasoning

**Fatigue Tracking** (`fatigue.ts`):
- EWMA (α=0.3) tracks cumulative fatigue from session quality
- Break suggestions: short (5-7min) if fatigue < 0.6, long (10-15min) otherwise
- Session quality derived from completion rate, pauses, user feedback

### 2. State Management (`renderer/state/pomodoro.ai.store.ts`)

**Zustand Store Pattern**:
```typescript
const { chooseSmart, finishSession, setContext, resetAI } = usePomodoroAI();

// Get AI suggestion
const suggestion = chooseSmart(); // Returns {duration, explanation}

// Complete session with learning
const { breakSuggestion, explanation } = finishSession({
  completed: true,
  pauses: 2, 
  userFeedback: 'just_right',
  duration: 25
});
```

**Context Features**:
- `timeOfDay`: morning/afternoon/evening/night (auto-detected)
- `dayOfWeek`: 0-6 (auto-detected)  
- `selfReportedState`: good/neutral/poor (user input)
- `currentTask`: {estimateMin, importance} (user input)

### 3. Persistence Layer

**electron-store Integration**:
- Main process handles IPC: `save-ai-state`, `load-ai-state`, `clear-ai-state`
- Automatic fallback to localStorage during development
- State includes bandit counts/rewards, fatigue EWMA, last updated timestamp

### 4. UI Components (`renderer/components/`)

**Smart Timer Features**:
- Context panel for mood/task input
- "Smart Suggestion" button with expandable explanations
- Real-time user feedback buttons ("Too short", "Just right", "Too long")
- Session completion modal with break recommendations
- Fatigue indicator with explanation on click

## Development Workflows

### Adding New Learning Features

1. **Extend types** in `common/types.ts`
2. **Update bandit context bias** in `bandit.ts` `calculateContextBias()`
3. **Modify reward calculation** in `calculateReward()` or `calculateSessionQuality()`
4. **Update UI** to collect new context data
5. **Test learning** using `examples/usage-examples.tsx` simulation functions

### Testing AI Learning

```typescript
import { simulateLearning } from './examples/usage-examples';
await simulateLearning(); // Runs 10 sessions, shows learning progression
```

### Debugging AI Decisions

The `explainSuggestion()` function provides transparency:
- Shows historical performance of chosen duration
- Compares against second-best option  
- Explains contextual bias impact
- Indicates if choice was exploration vs exploitation

## Installation & Setup

```bash
npm install  # Install dependencies including electron-store, zustand, react
npm run build  # Compile TypeScript
npm run dev  # Run in development mode with DevTools
```

**Dependencies**:
- `electron-store@^8.2.0` - Persistent AI state storage
- `zustand@^4.4.7` - AI learning state management  
- `react@^18.2.0` + `@types/react` - UI components
- `typescript@^5.3.3` - Type safety

## Project-Specific Conventions

### Naming Patterns
- AI modules: `bandit.ts`, `fatigue.ts` (lowercase, descriptive)
- React components: `PomodoroTimer.tsx` (PascalCase)
- Store hooks: `usePomodoroAI`, `useSmartSuggestion` (camelCase with 'use' prefix)

### Code Organization
- `/common/types.ts` - Shared TypeScript interfaces
- `/renderer/ai/` - Pure AI logic (no React dependencies)
- `/renderer/state/` - Zustand stores with React integration
- `/renderer/components/` - React UI components
- `/examples/` - Usage examples and testing utilities

### Error Handling
- AI functions return safe defaults if persistence fails
- Rewards/fatigue values clamped to [0,1] range
- Graceful degradation: localStorage fallback if electron-store unavailable

### Performance Considerations
- Bandit calculations are O(n) where n = number of arms (6 durations)
- State persistence triggered only after session completion
- Context updates are debounced to avoid excessive re-renders

## Integration Points

### Existing Pomodoro Logic
The current `scripts/pomodoro.js` vanilla implementation should be gradually replaced with React components. Key integration points:

- Timer state management (duration, isRunning, pauses)
- Notification system via `window.electronAPI.showNotification()`
- Audio feedback using Web Audio API
- Modal dialogs for session completion

### External APIs (Planned)
- **Google Calendar**: Task duration estimates from calendar events
- **Logi Action SDK**: Hardware button integration for quick feedback
- **WebSocket API**: Real-time synchronization across devices

## Common Development Tasks

### Adding New Context Features
```typescript
// 1. Extend ContextFeatures interface
interface ContextFeatures {
  newFeature: 'option1' | 'option2';
  // ... existing fields
}

// 2. Update context bias calculation
function calculateContextBias(arm: number, ctx: ContextFeatures, weights: Record<string, number>): number {
  let bias = 0;
  // ... existing calculations
  bias += weights[`${ctx.newFeature}_feature`] || 0;
  return bias;
}

// 3. Add UI input in PomodoroTimer component
// 4. Update setContext() calls
```

### Modifying Learning Algorithm
- Adjust ε (exploration rate) in `DEFAULT_CONFIG.epsilon`
- Change reward penalties in `calculateReward()`
- Modify fatigue impact in `calculateSessionQuality()`
- Update context bias weights in `DEFAULT_CONFIG.contextWeights`

### Debugging Learning Issues
1. Use browser DevTools to inspect Zustand state
2. Check electron-store persistence: main process logs
3. Run simulation functions to verify learning progression
4. Use `explainSuggestion()` to understand AI reasoning

---

## Quick Reference

**Key Files to Understand**:
- `common/types.ts` - All TypeScript interfaces
- `renderer/ai/bandit.ts` - Core learning algorithm  
- `renderer/state/pomodoro.ai.store.ts` - State management + persistence
- `renderer/components/PomodoroTimer.tsx` - Main UI component

**Essential Functions**:
- `chooseSmart()` - Get AI duration recommendation
- `finishSession()` - Record session results and update learning
- `setContext()` - Update contextual features for better suggestions
- `explainSuggestion()` - Get human-readable explanation of AI choice

This AI system learns continuously from user behavior to provide increasingly personalized Pomodoro suggestions while maintaining full transparency about its decision-making process.