/**
 * Advanced Break Reminder System
 * Integrates with real-time eye tracking to provide intelligent break notifications
 */

export class BreakReminderSystem {
    constructor() {
        this.reminderInterval = 20 * 60 * 1000; // 20 minutes default
        this.breakDuration = 20 * 1000; // 20 seconds break
        this.isActive = false;
        this.lastBreakTime = Date.now();
        this.eyeStrainLevel = 0;
        this.drowsinessLevel = 0;
        this.reminderTimer = null;
        this.notificationQueue = [];
        
        this.init();
    }
    
    init() {
        this.createNotificationContainer();
        this.loadUserSettings();
        this.startReminderSystem();
    }
    
    createNotificationContainer() {
        if (document.getElementById('break-notifications')) return;
        
        const container = document.createElement('div');
        container.id = 'break-notifications';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 350px;
        `;
        document.body.appendChild(container);
    }
    
    loadUserSettings() {
        // Get reminder interval from user settings
        const savedInterval = localStorage.getItem('breakReminderInterval');
        if (savedInterval) {
            this.reminderInterval = parseInt(savedInterval) * 60 * 1000;
        }
    }
    
    startReminderSystem() {
        if (this.isActive) return;
        
        this.isActive = true;
        this.scheduleNextReminder();
        console.log('Break reminder system started');
    }
    
    stopReminderSystem() {
        this.isActive = false;
        if (this.reminderTimer) {
            clearTimeout(this.reminderTimer);
            this.reminderTimer = null;
        }
        console.log('Break reminder system stopped');
    }
    
    scheduleNextReminder() {
        if (!this.isActive) return;
        
        if (this.reminderTimer) {
            clearTimeout(this.reminderTimer);
        }
        
        this.reminderTimer = setTimeout(() => {
            this.triggerBreakReminder();
        }, this.reminderInterval);
    }
    
    triggerBreakReminder() {
        const timeSinceLastBreak = Date.now() - this.lastBreakTime;
        const shouldShowReminder = timeSinceLastBreak >= this.reminderInterval;
        
        if (!shouldShowReminder) {
            this.scheduleNextReminder();
            return;
        }
        
        // Check eye strain level to determine reminder urgency
        const urgency = this.calculateReminderUrgency();
        
        if (urgency === 'high') {
            this.showUrgentBreakReminder();
        } else if (urgency === 'medium') {
            this.showStandardBreakReminder();
        } else {
            this.showGentleBreakReminder();
        }
        
        // Send reminder to server
        this.sendBreakReminderToServer();
        
        this.scheduleNextReminder();
    }
    
    calculateReminderUrgency() {
        // High urgency if drowsiness or eye strain is above 60%
        if (this.drowsinessLevel >= 60 || this.eyeStrainLevel >= 60) {
            return 'high';
        }
        // Medium urgency if drowsiness or eye strain is above 40%
        else if (this.drowsinessLevel >= 40 || this.eyeStrainLevel >= 40) {
            return 'medium';
        }
        // Low urgency otherwise
        return 'low';
    }

    showUrgentBreakReminder() {
        const notification = this.createNotification(
            'URGENT: Eye Break Required!',
            'High eye strain and drowsiness detected. Take a break immediately.',
            'danger',
            30000, // 30 seconds
            true // vibrate
        );
        
        this.addBreakActions(notification, 'urgent');
    }
    
    showStandardBreakReminder() {
        const notification = this.createNotification(
            '20-20-20 Break Time',
            'Time for your eye health break. Look at something 20 feet away for 20 seconds.',
            'warning',
            15000, // 15 seconds
            false
        );
        
        this.addBreakActions(notification, 'standard');
    }
    
    showGentleBreakReminder() {
        const notification = this.createNotification(
            'Gentle Reminder',
            'Consider taking a quick eye break to prevent strain.',
            'info',
            10000, // 10 seconds
            false
        );
        
        this.addBreakActions(notification, 'gentle');
    }
    
    createNotification(title, message, type, duration, vibrate) {
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} alert-dismissible fade show break-reminder`;
        notification.style.cssText = `
            margin-bottom: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            border-left: 4px solid ${type === 'danger' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#17a2b8'};
        `;
        
        notification.innerHTML = `
            <div class="d-flex align-items-start">
                <div class="flex-grow-1">
                    <h6 class="alert-heading mb-1">${title}</h6>
                    <p class="mb-2">${message}</p>
                    <div class="break-actions"></div>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        const container = document.getElementById('break-notifications');
        container.appendChild(notification);
        
        // Auto-remove after duration
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, duration);
        
        // Vibrate if urgent and supported
        if (vibrate && 'vibrate' in navigator) {
            navigator.vibrate([200, 100, 200, 100, 200]);
        }
        
        return notification;
    }
    
    addBreakActions(notification, urgency) {
        const actionsContainer = notification.querySelector('.break-actions');
        
        const takeBreakBtn = document.createElement('button');
        takeBreakBtn.className = 'btn btn-sm btn-primary me-2';
        takeBreakBtn.textContent = 'Take Break';
        takeBreakBtn.onclick = () => this.startGuidedBreak(notification);
        
        const snoozeBtn = document.createElement('button');
        snoozeBtn.className = 'btn btn-sm btn-outline-secondary';
        snoozeBtn.textContent = urgency === 'urgent' ? 'Snooze 5min' : 'Snooze 10min';
        snoozeBtn.onclick = () => this.snoozeReminder(urgency === 'urgent' ? 5 : 10, notification);
        
        actionsContainer.appendChild(takeBreakBtn);
        if (urgency !== 'urgent') {
            actionsContainer.appendChild(snoozeBtn);
        }
    }
    
    startGuidedBreak(notification) {
        // Remove the notification
        notification.remove();
        
        // Create break overlay
        const overlay = document.createElement('div');
        overlay.id = 'break-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, rgba(34, 193, 195, 0.9) 0%, rgba(253, 187, 45, 0.9) 100%);
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            text-align: center;
        `;
        
        overlay.innerHTML = `
            <div class="break-content">
                <h1 class="mb-4">👁️ Eye Break Time</h1>
                <div class="break-timer mb-4">
                    <div class="circular-progress">
                        <span class="timer-display">20</span>
                    </div>
                </div>
                <h3 class="mb-3">20-20-20 Rule</h3>
                <p class="lead mb-4">Look at something 20 feet away for 20 seconds</p>
                <div class="break-instructions">
                    <p>🏠 Find a window or distant object</p>
                    <p>👀 Focus on something far away</p>
                    <p>🧘 Breathe deeply and relax your eyes</p>
                </div>
                <button class="btn btn-light btn-lg mt-3" onclick="breakReminderSystem.endBreak()">
                    End Break Early
                </button>
            </div>
        `;
        
        document.body.appendChild(overlay);
        this.startBreakTimer(overlay);
        this.lastBreakTime = Date.now();
    }
    
    startBreakTimer(overlay) {
        const timerDisplay = overlay.querySelector('.timer-display');
        let timeLeft = 20;
        
        const timer = setInterval(() => {
            timeLeft--;
            timerDisplay.textContent = timeLeft;
            
            if (timeLeft <= 0) {
                clearInterval(timer);
                this.endBreak();
            }
        }, 1000);
        
        // Store timer for early termination
        overlay.breakTimer = timer;
    }
    
    endBreak() {
        const overlay = document.getElementById('break-overlay');
        if (overlay) {
            if (overlay.breakTimer) {
                clearInterval(overlay.breakTimer);
            }
            overlay.remove();
        }
        
        // Show completion message
        this.createNotification(
            'Break Complete!',
            'Great job! Your eyes should feel refreshed.',
            'success',
            3000,
            false
        );
        
        this.lastBreakTime = Date.now();
    }
    
    snoozeReminder(minutes, notification) {
        notification.remove();
        
        // Add snooze time to next reminder
        const snoozeTime = minutes * 60 * 1000;
        if (this.reminderTimer) {
            clearTimeout(this.reminderTimer);
            this.reminderTimer = setTimeout(() => {
                this.triggerBreakReminder();
            }, snoozeTime);
        }
        
        this.createNotification(
            'Reminder Snoozed',
            `Next break reminder in ${minutes} minutes.`,
            'info',
            3000,
            false
        );
    }
    
    updateEyeMetrics(eyeStrainLevel, drowsinessLevel) {
        this.eyeStrainLevel = eyeStrainLevel;
        this.drowsinessLevel = drowsinessLevel;
        
        // Trigger immediate break if critical levels
        // Using the new thresholds for high drowsiness (>60%) or high eye strain (>60%)
        if (drowsinessLevel >= 60 || eyeStrainLevel >= 60) {
            this.triggerBreakReminder();
        }
    }
    
    sendBreakReminderToServer() {
        const urgency = this.calculateReminderUrgency();
        fetch('/api/break-reminder', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                eye_strain_level: this.eyeStrainLevel,
                drowsiness_level: this.drowsinessLevel,
                urgency: urgency,
                timestamp: new Date().toISOString()
            })
        }).catch(error => console.log('Break reminder logging failed:', error));
    }
    
    // Method to show notifications that can be called from other modules
    showNotification(message, type = 'info') {
        this.createNotification(
            type === 'warning' ? 'Warning' : 'Notification',
            message,
            type === 'warning' ? 'warning' : 'info',
            5000,
            false
        );
    }
    
    setReminderInterval(minutes) {
        this.reminderInterval = minutes * 60 * 1000;
        localStorage.setItem('breakReminderInterval', minutes);
        
        // Restart timer with new interval
        if (this.isActive) {
            this.scheduleNextReminder();
        }
    }
}

// Global instance with singleton pattern
let breakReminderSystem = null;

// Initialize only once
if (!window.breakReminderSystemInitialized) {
    breakReminderSystem = new BreakReminderSystem();
    window.breakReminderSystemInitialized = true;
    window.breakReminderSystem = breakReminderSystem;
} else {
    breakReminderSystem = window.breakReminderSystem;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BreakReminderSystem;
}