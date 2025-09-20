// Image Q&A functionality
class ImageQA {
    constructor() {
        this.currentScreenshot = null;
        this.chatHistory = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadChatHistory();
    }

    setupEventListeners() {
        // Screenshot capture button
        document.getElementById('captureScreenBtn').addEventListener('click', () => {
            this.captureScreen();
        });

        // Send question button
        document.getElementById('sendQuestionBtn').addEventListener('click', () => {
            this.sendQuestion();
        });

        // Enter key in question input
        document.getElementById('questionInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendQuestion();
            }
        });

        // Clear chat button (can be added to UI later)
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'l') {
                this.clearChat();
            }
        });
    }

    async captureScreen() {
        try {
            // Show loading state
            const captureBtn = document.getElementById('captureScreenBtn');
            const originalText = captureBtn.innerHTML;
            captureBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 截取中...';
            captureBtn.disabled = true;

            // Use Electron's screen capture API if available
            if (window.electronAPI && window.electronAPI.captureScreen) {
                const result = await window.electronAPI.captureScreen();
                if (result.success) {
                    this.handleScreenshotSuccess(result.imageData);
                } else {
                    throw new Error(result.message || '截圖失敗');
                }
            } else {
                // Fallback: Use Web API for screen capture (requires user permission)
                await this.captureScreenWebAPI();
            }

        } catch (error) {
            console.error('Screenshot capture failed:', error);
            this.handleScreenshotError(error.message);
        } finally {
            // Reset button state
            const captureBtn = document.getElementById('captureScreenBtn');
            captureBtn.innerHTML = '<i class="fas fa-camera"></i> 截取螢幕';
            captureBtn.disabled = false;
        }
    }

    async captureScreenWebAPI() {
        try {
            // Request screen sharing permission
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: { mediaSource: 'screen' }
            });

            // Create video element to capture frame
            const videoElement = document.createElement('video');
            videoElement.srcObject = stream;
            videoElement.play();

            // Wait for video to load
            await new Promise(resolve => {
                videoElement.addEventListener('loadedmetadata', resolve);
            });

            // Create canvas and capture frame
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;
            
            ctx.drawImage(videoElement, 0, 0);
            
            // Convert to image data
            const imageData = canvas.toDataURL('image/png');
            
            // Stop the stream
            stream.getTracks().forEach(track => track.stop());
            
            this.handleScreenshotSuccess(imageData);

        } catch (error) {
            if (error.name === 'NotAllowedError') {
                throw new Error('需要螢幕錄製權限才能截圖');
            } else {
                throw new Error('截圖失敗：' + error.message);
            }
        }
    }

    handleScreenshotSuccess(imageData) {
        this.currentScreenshot = imageData;
        
        // Show screenshot preview
        const preview = document.getElementById('screenshotPreview');
        const imageElement = document.getElementById('screenshotImage');
        
        imageElement.src = imageData;
        preview.style.display = 'block';
        
        // Enable question input
        document.getElementById('questionInput').disabled = false;
        document.getElementById('sendQuestionBtn').disabled = false;
        document.getElementById('questionInput').placeholder = '輸入您的問題...';
        
        // Add system message to chat
        this.addMessageToChat('system', '截圖已完成！現在您可以針對這張圖片提問了。');
        
        window.inlistedApp.showNotification('截圖成功', '您現在可以針對截圖提問了');
    }

    handleScreenshotError(errorMessage) {
        this.addMessageToChat('system', `截圖失敗：${errorMessage}`);
        window.inlistedApp.showNotification('截圖失敗', errorMessage);
    }

    async sendQuestion() {
        const questionInput = document.getElementById('questionInput');
        const question = questionInput.value.trim();
        
        if (!question) {
            alert('請輸入問題');
            return;
        }

        if (!this.currentScreenshot) {
            alert('請先截取螢幕');
            return;
        }

        // Add user question to chat
        this.addMessageToChat('user', question);
        questionInput.value = '';

        // Show typing indicator
        const typingId = this.addTypingIndicator();

        try {
            // Send to LLM API (placeholder implementation)
            const response = await this.queryLLM(question, this.currentScreenshot);
            
            // Remove typing indicator and add response
            this.removeTypingIndicator(typingId);
            this.addMessageToChat('ai', response);

        } catch (error) {
            console.error('LLM query failed:', error);
            this.removeTypingIndicator(typingId);
            this.addMessageToChat('system', '抱歉，無法處理您的問題。請稍後再試。');
        }
    }

    async queryLLM(question, imageData) {
        // Placeholder for LLM API integration
        // In a real implementation, you would send the question and image to your LLM service
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Mock responses based on question content
        const mockResponses = {
            '這是什麼': '根據截圖，我可以看到這是一個應用程式介面。但是目前這是一個模擬回應，實際的LLM整合功能正在開發中。',
            '如何': '這看起來像是一個操作界面的截圖。在實際的LLM整合完成後，我將能夠提供更詳細的操作指導。',
            '解釋': '基於這張截圖，我能夠看到介面的結構。不過目前這是預設回應，真正的圖片分析功能將在LLM API整合後提供。',
            'default': '感謝您的提問！目前圖片問答功能的後端LLM整合正在開發中。這是一個模擬回應，未來將整合真正的AI圖片分析能力，為您提供準確的答案。'
        };

        // Find matching response or use default
        let response = mockResponses.default;
        for (const keyword in mockResponses) {
            if (keyword !== 'default' && question.includes(keyword)) {
                response = mockResponses[keyword];
                break;
            }
        }

        return response;
    }

    addMessageToChat(type, content) {
        const chatContainer = document.getElementById('chatContainer');
        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${type}`;
        
        const timestamp = new Date().toLocaleTimeString('zh-TW', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        if (type === 'user') {
            messageElement.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <p>${content}</p>
                    <small style="opacity: 0.7; margin-left: 1rem; flex-shrink: 0;">${timestamp}</small>
                </div>
            `;
        } else if (type === 'ai') {
            messageElement.innerHTML = `
                <div style="display: flex; align-items: flex-start; gap: 0.5rem;">
                    <i class="fas fa-robot" style="margin-top: 0.25rem; color: #3498db;"></i>
                    <div style="flex: 1;">
                        <p>${content}</p>
                        <small style="opacity: 0.7;">${timestamp}</small>
                    </div>
                </div>
            `;
        } else {
            messageElement.innerHTML = `<p>${content}</p>`;
        }

        chatContainer.appendChild(messageElement);
        chatContainer.scrollTop = chatContainer.scrollHeight;

        // Save to chat history
        this.chatHistory.push({
            type,
            content,
            timestamp: new Date().toISOString(),
            screenshot: type === 'user' ? this.currentScreenshot : null
        });
        this.saveChatHistory();
    }

    addTypingIndicator() {
        const chatContainer = document.getElementById('chatContainer');
        const typingElement = document.createElement('div');
        const typingId = Date.now();
        
        typingElement.className = 'chat-message ai typing-indicator';
        typingElement.id = `typing-${typingId}`;
        typingElement.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-robot" style="color: #3498db;"></i>
                <div style="display: flex; gap: 0.25rem;">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        `;

        chatContainer.appendChild(typingElement);
        chatContainer.scrollTop = chatContainer.scrollHeight;

        return typingId;
    }

    removeTypingIndicator(typingId) {
        const typingElement = document.getElementById(`typing-${typingId}`);
        if (typingElement) {
            typingElement.remove();
        }
    }

    clearChat() {
        if (confirm('確定要清除所有對話記錄嗎？')) {
            document.getElementById('chatContainer').innerHTML = `
                <div class="chat-message system">
                    <p>歡迎使用圖片問答功能！請先截取螢幕，然後輸入您的問題。</p>
                </div>
            `;
            this.chatHistory = [];
            this.currentScreenshot = null;
            this.saveChatHistory();
            
            // Reset UI state
            document.getElementById('screenshotPreview').style.display = 'none';
            document.getElementById('questionInput').disabled = true;
            document.getElementById('sendQuestionBtn').disabled = true;
            document.getElementById('questionInput').placeholder = '請先截取螢幕...';
        }
    }

    saveChatHistory() {
        // Only save recent history to avoid storage bloat
        const recentHistory = this.chatHistory.slice(-50);
        localStorage.setItem('image-qa-history', JSON.stringify(recentHistory));
    }

    loadChatHistory() {
        const saved = localStorage.getItem('image-qa-history');
        if (saved) {
            try {
                this.chatHistory = JSON.parse(saved);
                // Optionally restore chat display
                // this.restoreChatDisplay();
            } catch (error) {
                console.error('Failed to load chat history:', error);
            }
        }
    }

    // Method for future WebSocket integration with LLM service
    async connectToLLMService() {
        // TODO: Implement WebSocket connection to LLM service
        console.log('LLM service connection placeholder');
        window.inlistedApp.showNotification('功能開發中', 'LLM服務整合功能正在開發中');
    }
}

// Add CSS for typing indicator animation
const style = document.createElement('style');
style.textContent = `
    .typing-indicator {
        opacity: 0.8;
    }
    
    .typing-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: #3498db;
        animation: typing 1.4s infinite ease-in-out;
    }
    
    .typing-dot:nth-child(1) { animation-delay: -0.32s; }
    .typing-dot:nth-child(2) { animation-delay: -0.16s; }
    .typing-dot:nth-child(3) { animation-delay: 0s; }
    
    @keyframes typing {
        0%, 80%, 100% {
            transform: scale(0);
            opacity: 0.5;
        }
        40% {
            transform: scale(1);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.imageQA = new ImageQA();
});