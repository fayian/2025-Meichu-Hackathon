// Test Smart Pomodoro AI functionality
// This file can be run in the browser console to test the AI

function testSmartPomodoroAI() {
    console.log('🧠 Testing Smart Pomodoro AI...');
    
    // Check if AI is available
    if (!window.SmartPomodoroAI) {
        console.error('❌ SmartPomodoroAI not found');
        return;
    }

    // Create AI instance
    const ai = new SmartPomodoroAI();
    console.log('✅ AI instance created');

    // Test 1: Get initial suggestion
    console.log('\n📊 Test 1: Initial Suggestion');
    const suggestion1 = ai.chooseSmart();
    console.log(`Duration: ${suggestion1.duration} minutes`);
    console.log(`Explanation: ${suggestion1.explanation}`);

    // Test 2: Update context
    console.log('\n📊 Test 2: Context Update');
    ai.setContext({
        selfReportedState: 'good',
        currentTask: { estimateMin: 45, importance: 'high' }
    });
    
    const suggestion2 = ai.chooseSmart();
    console.log(`Updated suggestion: ${suggestion2.duration} minutes`);
    console.log(`Explanation: ${suggestion2.explanation}`);

    // Test 3: Simulate completed session
    console.log('\n📊 Test 3: Session Completion');
    const sessionResult = ai.finishSession({
        completed: true,
        pauses: 1,
        userFeedback: 'just_right',
        duration: 25
    });
    
    console.log(`Break suggestion: ${sessionResult.breakSuggestion.minutes} min (${sessionResult.breakSuggestion.kind})`);
    console.log(`Reason: ${sessionResult.breakSuggestion.reason}`);
    console.log(`Session quality: ${sessionResult.sessionQuality.toFixed(2)}`);

    // Test 4: Fatigue state
    console.log('\n📊 Test 4: Fatigue State');
    console.log(ai.explainCurrentFatigue());

    // Test 5: Multiple sessions to show learning
    console.log('\n📊 Test 5: Learning Simulation');
    const sessions = [
        { duration: 25, completed: true, pauses: 0, feedback: 'just_right' },
        { duration: 30, completed: false, pauses: 3, feedback: 'too_long' },
        { duration: 20, completed: true, pauses: 1, feedback: 'too_short' },
        { duration: 25, completed: true, pauses: 0, feedback: 'just_right' }
    ];

    sessions.forEach((session, i) => {
        console.log(`\nSession ${i + 1}:`);
        const suggestion = ai.chooseSmart();
        console.log(`  AI suggested: ${suggestion.duration}min`);
        
        const result = ai.finishSession({
            completed: session.completed,
            pauses: session.pauses,
            userFeedback: session.feedback,
            duration: session.duration
        });
        
        console.log(`  Completed ${session.duration}min session (${session.feedback})`);
        console.log(`  New fatigue: ${Math.round(ai.fatigueState.ewma * 100)}%`);
    });

    // Test 6: Show final learned preferences
    console.log('\n📊 Test 6: Learned Preferences');
    console.log('Bandit arm performance:');
    ai.config.arms.forEach(arm => {
        const count = ai.banditState.counts[arm];
        const avgReward = count > 0 ? (ai.banditState.totalReward[arm] / count).toFixed(2) : 'N/A';
        console.log(`  ${arm}min: ${count} trials, avg reward: ${avgReward}`);
    });

    console.log('\n✅ Smart Pomodoro AI test completed!');
    console.log('💡 The AI should now prefer durations that performed better');
}

// Test integration with existing Pomodoro Timer
function testPomodoroIntegration() {
    console.log('\n🔗 Testing Pomodoro Integration...');
    
    if (!window.pomodoroTimer) {
        console.error('❌ PomodoroTimer not found');
        return;
    }

    if (!window.pomodoroTimer.smartAI) {
        console.error('❌ Smart AI not integrated with PomodoroTimer');
        return;
    }

    console.log('✅ Smart AI successfully integrated with PomodoroTimer');
    
    // Test smart suggestion
    const timer = window.pomodoroTimer;
    console.log('Current AI context:', timer.smartAI.currentContext);
    
    const suggestion = timer.smartAI.chooseSmart();
    console.log(`Smart suggestion: ${suggestion.duration} minutes`);
    console.log(`Explanation: ${suggestion.explanation}`);
    
    console.log('✅ Pomodoro integration test completed!');
}

// Auto-run tests when this file is loaded in console
if (typeof window !== 'undefined') {
    // Wait a moment for everything to load
    setTimeout(() => {
        testSmartPomodoroAI();
        testPomodoroIntegration();
    }, 1000);
}

// Export for manual testing
window.testSmartPomodoro = {
    testAI: testSmartPomodoroAI,
    testIntegration: testPomodoroIntegration
};