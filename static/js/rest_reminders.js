// Gentle Micro-Animation Rest Reminders
// Provides subtle visual cues for break reminders without being disruptive

export class RestReminderSystem {
    constructor() {
        this.reminderInterval = 20 * 60 * 1000; // 20 minutes (20-20-20 rule)
        this.lastReminderTime = Date.now();
        this.isActive = false;
        this.animationId = null;
        this.reminderElement = null;
        this.breathingElement = null;
        this.pulseElement = null;
        this.audioContext = null;
        this.audioEnabled = false; // Disable audio for now due to browser issues
        this.reminderTimer = null; // Store the interval timer
        this.initialized = false;

        this.init();
        // this.initAudio(); // Disabled for now
    }

    init() {
        // Prevent multiple initializations
        if (this.initialized) {
            console.log('Rest reminder system already initialized');
            return;
        }

        this.createReminderElements();
        this.startReminderTimer();
        this.setupVisibilityHandlers();
        this.initialized = true;
        console.log('Rest reminder system initialized');
    }

    setupVisibilityHandlers() {
        // Handle page visibility changes for background operation
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                console.log('Page is now in background mode');
                // Continue running in background
            } else {
                console.log('Page is now visible again');
                // Resume normal operation
            }
        });

        // Handle page unload
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    }

    cleanup() {
        if (this.reminderTimer) {
            clearTimeout(this.reminderTimer);
            this.reminderTimer = null;
        }
        this.initialized = false;
    }

    initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log('Audio context initialized');
        } catch (error) {
            console.warn('Audio not available:', error);
            this.audioEnabled = false;
        }
    }

    playNotificationSound(type = 'gentle') {
        if (!this.audioEnabled || !this.audioContext) return;

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            // Different sounds for different notification types
            switch (type) {
                case 'gentle':
                    // Soft bell sound
                    oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
                    oscillator.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 0.5);
                    gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
                    oscillator.type = 'sine';
                    break;

                case 'reminder':
                    // Two-tone chime
                    oscillator.frequency.setValueAtTime(523, this.audioContext.currentTime); // C5
                    oscillator.frequency.setValueAtTime(659, this.audioContext.currentTime + 0.2); // E5
                    gainNode.gain.setValueAtTime(0.15, this.audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.4);
                    oscillator.type = 'triangle';
                    break;

                case 'urgent':
                    // Alert tone
                    oscillator.frequency.setValueAtTime(880, this.audioContext.currentTime);
                    gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
                    oscillator.type = 'square';
                    break;
            }

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.5);

        } catch (error) {
            console.warn('Error playing notification sound:', error);
        }
    }

    createReminderElements() {
        // Create gentle reminder overlay
        this.reminderElement = document.createElement('div');
        this.reminderElement.id = 'restReminderOverlay';
        this.reminderElement.className = 'rest-reminder-overlay';
        this.reminderElement.innerHTML = `
            <div class="reminder-content">
                <div class="breathing-circle" id="breathingCircle">
                    <div class="breathing-inner"></div>
                </div>
                <div class="reminder-text">
                    <h3>Time for a break</h3>
                    <p>Look at something 20 feet away for 20 seconds</p>
                    <div class="reminder-timer" id="reminderTimer">20</div>
                </div>
                <div class="reminder-actions">
                    <button class="btn btn-primary btn-sm" id="startBreakBtn">
                        Start Break
                    </button>
                    <button class="btn btn-outline-secondary btn-sm" id="snoozeBtn">
                        Snooze 5min
                    </button>
                    <button class="btn btn-outline-danger btn-sm" id="dismissBtn">
                        Dismiss
                    </button>
                </div>
            </div>
        `;

        // Create subtle pulse indicator
        this.pulseElement = document.createElement('div');
        this.pulseElement.id = 'restPulseIndicator';
        this.pulseElement.className = 'rest-pulse-indicator';
        this.pulseElement.innerHTML = `
            <div class="pulse-ring"></div>
            <div class="pulse-dot">
                <i class="bi bi-eye"></i>
            </div>
        `;

        // Add CSS styles
        this.addStyles();

        // Append to body (hidden initially)
        document.body.appendChild(this.reminderElement);
        document.body.appendChild(this.pulseElement);

        this.breathingElement = document.getElementById('breathingCircle');

        // Add click handlers for reminder actions
        this.reminderElement.querySelector('#startBreakBtn').onclick = () => {
            this.startBreakTimer();
        };
        this.reminderElement.querySelector('#snoozeBtn').onclick = () => {
            this.snoozeReminder();
        };
        this.reminderElement.querySelector('#dismissBtn').onclick = () => {
            this.dismissReminder();
        };
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .rest-reminder-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: none;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                opacity: 0;
                transition: opacity 0.5s ease-in-out;
            }

            .rest-reminder-overlay.show {
                display: flex;
                opacity: 1;
            }

            .reminder-content {
                background: white;
                border-radius: 15px;
                padding: 2rem;
                text-align: center;
                max-width: 400px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            }

            .breathing-circle {
                width: 100px;
                height: 100px;
                border: 3px solid #007bff;
                border-radius: 50%;
                margin: 0 auto 2rem auto;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: breathe 4s infinite ease-in-out;
            }

            .breathing-inner {
                width: 70px;
                height: 70px;
                background: rgba(0, 123, 255, 0.1);
                border-radius: 50%;
                animation: breathe-inner 4s infinite ease-in-out;
            }

            @keyframes breathe {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.2); }
            }

            @keyframes breathe-inner {
                0%, 100% { transform: scale(1); opacity: 0.3; }
                50% { transform: scale(0.8); opacity: 0.8; }
            }

            .reminder-text h3 {
                color: #333;
                margin-bottom: 1rem;
            }

            .reminder-text p {
                color: #666;
                margin-bottom: 1.5rem;
            }

            .reminder-timer {
                font-size: 3rem;
                font-weight: bold;
                color: #007bff;
                margin: 1rem 0;
            }

            .reminder-actions {
                display: flex;
                gap: 0.5rem;
                justify-content: center;
                flex-wrap: wrap;
            }

            .rest-pulse-indicator {
                position: fixed;
                top: 20px;
                right: 20px;
                width: 60px;
                height: 60px;
                z-index: 9998;
                cursor: pointer;
                display: none;
            }

            .rest-pulse-indicator.show {
                display: block;
            }

            .pulse-ring {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                border: 3px solid #007bff;
                border-radius: 50%;
                animation: pulse-ring 2s infinite;
            }

            .pulse-dot {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 40px;
                height: 40px;
                background: #007bff;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 16px;
            }

            @keyframes pulse-ring {
                0% {
                    transform: scale(0.8);
                    opacity: 1;
                }
                100% {
                    transform: scale(1.5);
                    opacity: 0;
                }
            }

            @keyframes slideInDown {
                from {
                    transform: translateY(-100px);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }

            /* Gentle screen tint for eye strain relief */
            .eye-strain-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(255, 193, 7, 0.05);
                pointer-events: none;
                z-index: 999;
                opacity: 0;
                transition: opacity 1s ease-in-out;
            }

            .eye-strain-overlay.active {
                opacity: 1;
            }

            /* Responsive design */
            @media (max-width: 768px) {
                .reminder-content {
                    margin: 1rem;
                    padding: 1.5rem;
                }

                .reminder-actions {
                    flex-direction: column;
                }

                .rest-pulse-indicator {
                    top: 10px;
                    right: 10px;
                    width: 40px;
                    height: 40px;
                }

                .pulse-dot {
                    width: 25px;
                    height: 25px;
                    font-size: 12px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    startReminderTimer() {
        // Clear any existing timer to prevent duplicates
        if (this.reminderTimer) {
            clearInterval(this.reminderTimer);
            this.reminderTimer = null;
        }

        // Get user's reminder setting from localStorage or use default
        const userReminderSetting = localStorage.getItem('reminderInterval');
        if (userReminderSetting) {
            this.reminderInterval = parseInt(userReminderSetting) * 60000; // Convert minutes to milliseconds
            console.log(`Using custom reminder interval: ${userReminderSetting} minutes`);
        }

        // Set initial time to now
        this.lastReminderTime = Date.now();

        // Use setTimeout instead of setInterval for more precise timing
        const scheduleNextReminder = () => {
            if (this.reminderTimer) {
                clearTimeout(this.reminderTimer);
            }
            
            this.reminderTimer = setTimeout(() => {
                if (!this.isActive) {
                    this.showGentleReminder();
                    this.lastReminderTime = Date.now();
                }
                // Schedule the next reminder
                scheduleNextReminder();
            }, this.reminderInterval);
        };

        scheduleNextReminder();
        console.log(`Rest reminder timer started - ${this.reminderInterval / 60000} minutes interval`);
    }

    showGentleReminder() {
        // Prevent multiple reminders if one is already active
        if (this.isActive || this.pulseElement.classList.contains('show')) {
            return;
        }

        // Show subtle pulse indicator first
        this.showPulseIndicator();

        // After 30 seconds, show full reminder if not acknowledged
        setTimeout(() => {
            if (this.pulseElement.classList.contains('show') && !this.isActive) {
                this.showFullReminder();
            }
        }, 30000);
    }

    showPulseIndicator() {
        this.pulseElement.classList.add('show');

        // Play gentle notification sound
        this.playNotificationSound('gentle');

        // Add click handler to show full reminder
        this.pulseElement.onclick = () => {
            this.showFullReminder();
        };

        // Auto-hide after 60 seconds if not clicked
        setTimeout(() => {
            this.hidePulseIndicator();
        }, 60000);
    }

    hidePulseIndicator() {
        this.pulseElement.classList.remove('show');
        this.pulseElement.onclick = null;
    }

    showFullReminder() {
        this.hidePulseIndicator();
        this.reminderElement.classList.add('show');
        this.isActive = true;

        // Play reminder sound
        this.playNotificationSound('reminder');

        // Record reminder in analytics
        if (typeof eyeHealthAnalytics !== 'undefined' && eyeHealthAnalytics) {
            eyeHealthAnalytics.recordAlert('rest_reminder', 'Time for a break - 20-20-20 rule');
        }

        // Show breathing animation
        this.startBreathingAnimation();
    }

    startBreathingAnimation() {
        if (this.breathingElement) {
            this.breathingElement.style.animationDuration = '4s';
        }
    }

    startBreakTimer() {
        this.hideFullReminder();
        this.startTwentySecondBreak();
    }

    startTwentySecondBreak() {
        // Create break timer overlay
        const breakOverlay = document.createElement('div');
        breakOverlay.className = 'rest-reminder-overlay show';
        breakOverlay.innerHTML = `
            <div class="reminder-content">
                <div class="breathing-circle">
                    <div class="breathing-inner"></div>
                </div>
                <div class="reminder-text">
                    <h3>Look away from your screen</h3>
                    <p>Focus on something at least 20 feet away</p>
                    <div class="reminder-timer" id="breakTimer">20</div>
                    <p><small>Relax your eyes and blink naturally</small></p>
                </div>
                <button class="btn btn-outline-secondary btn-sm" onclick="this.parentElement.parentElement.parentElement.remove()">
                    End Break Early
                </button>
            </div>
        `;

        document.body.appendChild(breakOverlay);

        // Add gentle eye strain relief overlay
        this.addEyeStrainRelief();

        // Start countdown
        let timeLeft = 20;
        const timerElement = breakOverlay.querySelector('#breakTimer');

        const countdown = setInterval(() => {
            timeLeft--;
            timerElement.textContent = timeLeft;

            if (timeLeft <= 0) {
                clearInterval(countdown);
                this.completeBreak(breakOverlay);
            }
        }, 1000);
    }

    addEyeStrainRelief() {
        const strainOverlay = document.createElement('div');
        strainOverlay.className = 'eye-strain-overlay';
        document.body.appendChild(strainOverlay);

        // Gradually apply tint
        setTimeout(() => {
            strainOverlay.classList.add('active');
        }, 100);

        // Remove after break
        setTimeout(() => {
            strainOverlay.classList.remove('active');
            setTimeout(() => {
                strainOverlay.remove();
            }, 1000);
        }, 20000);
    }

    completeBreak(breakOverlay) {
        breakOverlay.innerHTML = `
            <div class="reminder-content">
                <div style="font-size: 3rem; color: #28a745; margin-bottom: 1rem;">✓</div>
                <h3>Great job!</h3>
                <p>Your eyes are refreshed. Keep up the healthy habits!</p>
                <button class="btn btn-success" onclick="this.parentElement.parentElement.parentElement.remove()">
                    Continue Working
                </button>
            </div>
        `;

        // Auto-close after 3 seconds
        setTimeout(() => {
            breakOverlay.remove();
        }, 3000);

        // Record break completion
        if (typeof eyeHealthAnalytics !== 'undefined' && eyeHealthAnalytics) {
            eyeHealthAnalytics.healthMetrics.breaksTaken++;
        }
    }

    snoozeReminder() {
        this.hideFullReminder();
        this.lastReminderTime = Date.now() + (5 * 60 * 1000); // Add 5 minutes

        // Show snooze confirmation
        this.showSnoozeConfirmation();
    }

    showSnoozeConfirmation() {
        const notification = document.createElement('div');
        notification.className = 'alert alert-info';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 10000;
            animation: slideInDown 0.3s ease-out;
        `;
        notification.innerHTML = `
            <i class="bi bi-clock"></i> Reminder snoozed for 5 minutes
            <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
        `;

        document.body.appendChild(notification);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    dismissReminder() {
        this.hideFullReminder();
        this.lastReminderTime = Date.now();
    }

    hideFullReminder() {
        this.reminderElement.classList.remove('show');
        this.isActive = false;
    }

    // Method to manually trigger reminder (for testing)
    triggerReminder() {
        // Only trigger if not already showing a reminder
        if (!this.isActive && !this.pulseElement.classList.contains('show')) {
            this.showGentleReminder();
        }
    }

    // Method to adjust reminder interval
    setReminderInterval(minutes) {
        this.reminderInterval = minutes * 60 * 1000;
        localStorage.setItem('reminderInterval', minutes);

        // Reset the timer with new interval
        this.lastReminderTime = Date.now();
        this.startReminderTimer();

        console.log(`Reminder interval set to ${minutes} minutes`);
    }

    // Cleanup method
    destroy() {
        if (this.reminderTimer) {
            clearInterval(this.reminderTimer);
            this.reminderTimer = null;
        }

        if (this.reminderElement && this.reminderElement.parentNode) {
            this.reminderElement.parentNode.removeChild(this.reminderElement);
        }

        if (this.pulseElement && this.pulseElement.parentNode) {
            this.pulseElement.parentNode.removeChild(this.pulseElement);
        }
    }

    // Integration with eye tracking for smart reminders
    onEyeStrainDetected(level) {
        if (level > 70 && !this.isActive) {
            // Immediate gentle reminder for high eye strain
            this.showPulseIndicator();
        }
    }

    onDrowsinessDetected(level) {
        if (level > 80 && !this.isActive) {
            // Urgent break suggestion for high drowsiness
            this.showFullReminder();
        }
    }
}

// Singleton pattern - only create one instance
window.RestReminderSystem = RestReminderSystem;

// Initialize rest reminder system with singleton pattern
if (!window.restReminders) {
    // Only initialize once when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            if (!window.restReminders) {
                window.restReminders = new RestReminderSystem();
                console.log('Rest reminder system singleton created');
            }
        });
    } else {
        // DOM already loaded
        if (!window.restReminders) {
            window.restReminders = new RestReminderSystem();
            console.log('Rest reminder system singleton created');
        }
    }
} else {
    console.log('Rest reminder system already exists, reusing instance');
}

// Export for integration with other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RestReminderSystem;
}