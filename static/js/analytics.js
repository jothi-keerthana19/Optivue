// Eye Health Analytics Module
// Provides comprehensive analysis of eye health metrics

export class Analytics {
    constructor() {
        this.sessionData = {
            sessionStart: new Date(),
            blinkData: [],
            drowsinessData: [],
            screenTimeData: [],
            eyeStrainEvents: [],
            alertsTriggered: [],
            exerciseCompletion: [],
            gazeData: [],
            tbut: [], // Tear Breakup Time data
            eyeDryness: [], // Eye dryness measurements
            blinkQuality: [] // Blink quality assessments
        };

        this.healthMetrics = {
            avgBlinkRate: 0,
            blinkRateVariability: 0,
            drowsinessScore: 0,
            eyeStrainLevel: 0,
            screenTimeToday: 0,
            breaksTaken: 0,
            exercisesCompleted: 0,
            avgTBUT: 0, // Average Tear Breakup Time
            eyeDrynessLevel: 0, // Eye dryness severity
            blinkQualityScore: 100 // Blink quality (0-100)
        };

        this.healthThresholds = {
            normalBlinkRate: { min: 12, max: 20 },
            lowBlinkRate: { min: 8, max: 12 },
            highDrowsiness: 70,
            moderateDrowsiness: 50,
            maxScreenTime: 8 * 60 * 60 * 1000, // 8 hours in milliseconds
            breakInterval: 20 * 60 * 1000 // 20 minutes in milliseconds
        };

        this.loadStoredData();
        this.startAnalytics();
    }

    // Fetch and display analytics data
    async fetchAndDisplayAnalytics() {
        try {
            // Try to fetch from the correct endpoint
            const response = await fetch('/api/analytics');
            
            // Check if response is ok before proceeding
            if (!response.ok) {
                console.warn(`API returned ${response.status}, using local data instead`);
                // Use local data when API returns error
                this.updateAnalyticsDashboard({
                    blinkRate: this.healthMetrics.avgBlinkRate || 0,
                    totalBlinks: window.totalBlinks || 0,
                    eyeStrainLevel: this.healthMetrics.eyeStrainLevel || 'Low',
                    drowsinessLevel: this.healthMetrics.drowsinessScore || 'Normal'
                });
                return; // Exit early
            }
            
            // Check if response is JSON before parsing
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                console.warn('Response is not JSON, using default data');
                // Use default data when response is not JSON
                this.updateAnalyticsDashboard({
                    blinkRate: this.healthMetrics.avgBlinkRate || 0,
                    totalBlinks: window.totalBlinks || 0,
                    eyeStrainLevel: this.healthMetrics.eyeStrainLevel || 'Low',
                    drowsinessLevel: this.healthMetrics.drowsinessScore || 'Normal'
                });
            } else {
                const data = await response.json();
                console.log('Analytics data received:', data);
                // Update UI with analytics data
                this.updateAnalyticsDashboard(data);
            }
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
            // Use local data when fetch fails completely
            this.updateAnalyticsDashboard({
                blinkRate: this.healthMetrics.avgBlinkRate || 0,
                totalBlinks: window.totalBlinks || 0,
                eyeStrainLevel: this.healthMetrics.eyeStrainLevel || 'Low',
                drowsinessLevel: this.healthMetrics.drowsinessScore || 'Normal'
            });
        }
        
        // Schedule next update regardless of success/failure
        setTimeout(() => this.fetchAndDisplayAnalytics(), 5000);
    }
    
    // Update analytics dashboard with data
    updateAnalyticsDashboard(data) {
        // Update UI elements with analytics data
        // This would be implemented based on the UI structure
        console.log('Updating dashboard with:', data);
    }
    
    // Load stored data from localStorage
    loadStoredData() {
        const stored = localStorage.getItem('eyeHealthHistory');
        if (stored) {
            try {
                const data = JSON.parse(stored);
                this.healthMetrics = { ...this.healthMetrics, ...data.metrics };
                this.sessionData = { ...this.sessionData, ...data.session };
            } catch (e) {
                console.warn('Error loading stored analytics data:', e);
            }
        }
    }

    // Save data to localStorage
    saveData() {
        const dataToSave = {
            metrics: this.healthMetrics,
            session: this.sessionData,
            lastUpdated: new Date()
        };
        localStorage.setItem('eyeHealthHistory', JSON.stringify(dataToSave));
    }

    // Start analytics collection
    startAnalytics() {
        // Update analytics every 5 seconds
        setInterval(() => {
            this.updateAnalytics();
        }, 5000);

        // Save data every minute
        setInterval(() => {
            this.saveData();
        }, 60000);
    }

    // Record blink data
    recordBlinkData(blinkRate, timestamp = new Date()) {
        this.sessionData.blinkData.push({
            rate: blinkRate,
            timestamp: timestamp
        });

        // Keep only last 100 blink measurements
        if (this.sessionData.blinkData.length > 100) {
            this.sessionData.blinkData.shift();
        }

        this.calculateBlinkMetrics();
    }

    // Record drowsiness data
    recordDrowsinessData(drowsinessLevel, timestamp = new Date()) {
        this.sessionData.drowsinessData.push({
            level: drowsinessLevel,
            timestamp: timestamp
        });

        // Keep only last 100 drowsiness measurements
        if (this.sessionData.drowsinessData.length > 100) {
            this.sessionData.drowsinessData.shift();
        }

        this.calculateDrowsinessMetrics();
    }

    // Record screen time
    recordScreenTime(duration, timestamp = new Date()) {
        this.sessionData.screenTimeData.push({
            duration: duration,
            timestamp: timestamp
        });

        this.healthMetrics.screenTimeToday += duration;
    }

    // Record eye strain event
    recordEyeStrain(severity, cause, timestamp = new Date()) {
        this.sessionData.eyeStrainEvents.push({
            severity: severity,
            cause: cause,
            timestamp: timestamp
        });

        this.calculateEyeStrainLevel();
    }

    // Record alert triggered
    recordAlert(type, message, timestamp = new Date()) {
        this.sessionData.alertsTriggered.push({
            type: type,
            message: message,
            timestamp: timestamp
        });
    }

    // Record gaze data
    recordGazeData(gazeDirection, timestamp = new Date()) {
        this.sessionData.gazeData.push({
            x: gazeDirection.x,
            y: gazeDirection.y,
            confidence: gazeDirection.confidence,
            timestamp: timestamp
        });

        // Keep only last 100 gaze measurements
        if (this.sessionData.gazeData.length > 100) {
            this.sessionData.gazeData.shift();
        }
    }

    // Record Tear Breakup Time (TBUT)
    recordTBUT(tbutValue, timestamp = new Date()) {
        this.sessionData.tbut.push({
            value: tbutValue,
            timestamp: timestamp
        });

        // Keep only last 50 TBUT measurements
        if (this.sessionData.tbut.length > 50) {
            this.sessionData.tbut.shift();
        }

        this.calculateTBUTMetrics();
    }

    // Record eye dryness level
    recordEyeDryness(drynessLevel, cause = 'unknown', timestamp = new Date()) {
        this.sessionData.eyeDryness.push({
            level: drynessLevel,
            cause: cause,
            timestamp: timestamp
        });

        // Keep only last 100 measurements
        if (this.sessionData.eyeDryness.length > 100) {
            this.sessionData.eyeDryness.shift();
        }

        this.calculateEyeDrynessMetrics();
    }

    // Record blink quality
    recordBlinkQuality(quality, completeness, timestamp = new Date()) {
        this.sessionData.blinkQuality.push({
            quality: quality,
            completeness: completeness,
            timestamp: timestamp
        });

        // Keep only last 100 measurements
        if (this.sessionData.blinkQuality.length > 100) {
            this.sessionData.blinkQuality.shift();
        }

        this.calculateBlinkQualityMetrics();
    }

    // Calculate blink rate metrics
    calculateBlinkMetrics() {
        if (this.sessionData.blinkData.length === 0) return;

        const rates = this.sessionData.blinkData.map(d => d.rate);
        this.healthMetrics.avgBlinkRate = rates.reduce((a, b) => a + b, 0) / rates.length;

        // Calculate variability (standard deviation)
        const mean = this.healthMetrics.avgBlinkRate;
        const variance = rates.reduce((sum, rate) => sum + Math.pow(rate - mean, 2), 0) / rates.length;
        this.healthMetrics.blinkRateVariability = Math.sqrt(variance);
    }

    // Calculate drowsiness metrics
    calculateDrowsinessMetrics() {
        if (this.sessionData.drowsinessData.length === 0) return;

        const levels = this.sessionData.drowsinessData.map(d => d.level);
        this.healthMetrics.drowsinessScore = levels.reduce((a, b) => a + b, 0) / levels.length;
    }

    // Calculate eye strain level
    calculateEyeStrainLevel() {
        const recentEvents = this.sessionData.eyeStrainEvents.filter(
            event => new Date() - event.timestamp < 60 * 60 * 1000 // Last hour
        );

        this.healthMetrics.eyeStrainLevel = Math.min(100, recentEvents.length * 10);
    }

    // Calculate TBUT metrics
    calculateTBUTMetrics() {
        if (this.sessionData.tbut.length === 0) return;

        const values = this.sessionData.tbut.map(d => d.value);
        this.healthMetrics.avgTBUT = values.reduce((a, b) => a + b, 0) / values.length;
    }

    // Calculate eye dryness metrics
    calculateEyeDrynessMetrics() {
        if (this.sessionData.eyeDryness.length === 0) return;

        const levels = this.sessionData.eyeDryness.map(d => d.level);
        this.healthMetrics.eyeDrynessLevel = levels.reduce((a, b) => a + b, 0) / levels.length;
    }

    // Calculate blink quality metrics
    calculateBlinkQualityMetrics() {
        if (this.sessionData.blinkQuality.length === 0) return;

        const qualities = this.sessionData.blinkQuality.map(d => d.quality);
        this.healthMetrics.blinkQualityScore = qualities.reduce((a, b) => a + b, 0) / qualities.length;
    }

    // Update overall analytics
    updateAnalytics() {
        this.calculateBlinkMetrics();
        this.calculateDrowsinessMetrics();
        this.calculateEyeStrainLevel();
        this.calculateTBUTMetrics();
        this.calculateEyeDrynessMetrics();
        this.calculateBlinkQualityMetrics();
    }

    // Generate health insights
    generateHealthInsights() {
        const insights = {
            overall: this.getOverallHealthScore(),
            recommendations: [],
            warnings: [],
            trends: this.getHealthTrends(),
            achievements: this.getAchievements()
        };

        // Blink rate insights
        if (this.healthMetrics.avgBlinkRate < this.healthThresholds.normalBlinkRate.min) {
            insights.warnings.push({
                type: 'low_blink_rate',
                message: `Your blink rate (${this.healthMetrics.avgBlinkRate.toFixed(1)} bpm) is below normal. This may indicate dry eyes or eye strain.`,
                severity: 'medium'
            });
            insights.recommendations.push({
                type: 'blink_exercise',
                message: 'Practice conscious blinking exercises to improve tear distribution.',
                action: 'Start Eye Exercises'
            });
        }

        // Drowsiness insights
        if (this.healthMetrics.drowsinessScore > this.healthThresholds.highDrowsiness) {
            insights.warnings.push({
                type: 'high_drowsiness',
                message: `High drowsiness level detected (${this.healthMetrics.drowsinessScore.toFixed(0)}%). Consider taking a break.`,
                severity: 'high'
            });
            insights.recommendations.push({
                type: 'break_time',
                message: 'Take a 10-15 minute break away from screens.',
                action: 'Schedule Break'
            });
        }

        // Screen time insights
        if (this.healthMetrics.screenTimeToday > this.healthThresholds.maxScreenTime) {
            insights.warnings.push({
                type: 'excessive_screen_time',
                message: `Screen time today exceeds recommended limits (${(this.healthMetrics.screenTimeToday / (60 * 60 * 1000)).toFixed(1)} hours).`,
                severity: 'medium'
            });
            insights.recommendations.push({
                type: 'reduce_screen_time',
                message: 'Consider reducing screen time or taking more frequent breaks.',
                action: 'Set Screen Time Limits'
            });
        }

        // Eye strain insights
        if (this.healthMetrics.eyeStrainLevel > 50) {
            insights.warnings.push({
                type: 'eye_strain',
                message: `Elevated eye strain detected (${this.healthMetrics.eyeStrainLevel}%). Your eyes may need rest.`,
                severity: 'medium'
            });
            insights.recommendations.push({
                type: 'eye_rest',
                message: 'Follow the 20-20-20 rule: every 20 minutes, look at something 20 feet away for 20 seconds.',
                action: 'Start 20-20-20 Exercise'
            });
        }

        // TBUT insights
        if (this.healthMetrics.avgTBUT > 0 && this.healthMetrics.avgTBUT < 8) {
            insights.warnings.push({
                type: 'low_tbut',
                message: `Low Tear Breakup Time detected (${this.healthMetrics.avgTBUT.toFixed(1)}s). This may indicate dry eyes.`,
                severity: 'high'
            });
            insights.recommendations.push({
                type: 'artificial_tears',
                message: 'Consider using artificial tears and take more frequent breaks.',
                action: 'Learn About Dry Eyes'
            });
        }

        // Eye dryness insights
        if (this.healthMetrics.eyeDrynessLevel > 70) {
            insights.warnings.push({
                type: 'severe_dryness',
                message: `Severe eye dryness detected (${this.healthMetrics.eyeDrynessLevel.toFixed(0)}%). Immediate action needed.`,
                severity: 'high'
            });
            insights.recommendations.push({
                type: 'immediate_relief',
                message: 'Stop screen work immediately and use lubricating eye drops.',
                action: 'Emergency Eye Care'
            });
        } else if (this.healthMetrics.eyeDrynessLevel > 50) {
            insights.warnings.push({
                type: 'moderate_dryness',
                message: `Moderate eye dryness detected (${this.healthMetrics.eyeDrynessLevel.toFixed(0)}%). Take preventive measures.`,
                severity: 'medium'
            });
            insights.recommendations.push({
                type: 'preventive_care',
                message: 'Increase blink frequency and consider using a humidifier.',
                action: 'Dry Eye Prevention'
            });
        }

        // Blink quality insights
        if (this.healthMetrics.blinkQualityScore < 70) {
            insights.warnings.push({
                type: 'poor_blink_quality',
                message: `Poor blink quality detected (${this.healthMetrics.blinkQualityScore.toFixed(0)}%). Incomplete blinks may cause dry eyes.`,
                severity: 'medium'
            });
            insights.recommendations.push({
                type: 'blink_training',
                message: 'Practice complete, deliberate blinking exercises.',
                action: 'Start Blink Training'
            });
        }

        return insights;
    }

    // Calculate overall health score (0-100)
    getOverallHealthScore() {
        let score = 100;

        // Deduct points for poor blink rate
        if (this.healthMetrics.avgBlinkRate < this.healthThresholds.normalBlinkRate.min) {
            score -= 20;
        }

        // Deduct points for high drowsiness
        if (this.healthMetrics.drowsinessScore > this.healthThresholds.moderateDrowsiness) {
            score -= (this.healthMetrics.drowsinessScore - this.healthThresholds.moderateDrowsiness) * 0.5;
        }

        // Deduct points for eye strain
        score -= this.healthMetrics.eyeStrainLevel * 0.3;

        // Deduct points for excessive screen time
        if (this.healthMetrics.screenTimeToday > this.healthThresholds.maxScreenTime) {
            score -= 15;
        }

        return Math.max(0, Math.round(score));
    }

    // Get health trends
    getHealthTrends() {
        const trends = {
            blinkRate: this.getTrend(this.sessionData.blinkData, 'rate'),
            drowsiness: this.getTrend(this.sessionData.drowsinessData, 'level'),
            eyeStrain: this.getEyeStrainTrend()
        };

        return trends;
    }

    // Calculate trend for a specific metric
    getTrend(data, field) {
        if (data.length < 2) return 'stable';

        const recent = data.slice(-10); // Last 10 measurements
        const older = data.slice(-20, -10); // Previous 10 measurements

        if (older.length === 0) return 'stable';

        const recentAvg = recent.reduce((sum, item) => sum + item[field], 0) / recent.length;
        const olderAvg = older.reduce((sum, item) => sum + item[field], 0) / older.length;

        const change = ((recentAvg - olderAvg) / olderAvg) * 100;

        if (change > 10) return 'increasing';
        if (change < -10) return 'decreasing';
        return 'stable';
    }

    // Get eye strain trend
    getEyeStrainTrend() {
        const recentEvents = this.sessionData.eyeStrainEvents.filter(
            event => new Date() - event.timestamp < 60 * 60 * 1000 // Last hour
        );

        const olderEvents = this.sessionData.eyeStrainEvents.filter(
            event => {
                const hoursDiff = (new Date() - event.timestamp) / (60 * 60 * 1000);
                return hoursDiff >= 1 && hoursDiff < 2; // 1-2 hours ago
            }
        );

        if (recentEvents.length > olderEvents.length) return 'increasing';
        if (recentEvents.length < olderEvents.length) return 'decreasing';
        return 'stable';
    }

    // Get achievements
    getAchievements() {
        const achievements = [];

        // Blink rate achievement
        if (this.healthMetrics.avgBlinkRate >= this.healthThresholds.normalBlinkRate.min && 
            this.healthMetrics.avgBlinkRate <= this.healthThresholds.normalBlinkRate.max) {
            achievements.push({
                type: 'healthy_blink_rate',
                title: 'Healthy Blink Rate',
                description: 'Maintaining a healthy blink rate helps prevent dry eyes.',
                icon: '👁️'
            });
        }

        // Low drowsiness achievement
        if (this.healthMetrics.drowsinessScore < this.healthThresholds.moderateDrowsiness) {
            achievements.push({
                type: 'alert_and_focused',
                title: 'Alert & Focused',
                description: 'Staying alert helps maintain productivity and safety.',
                icon: '⚡'
            });
        }

        // Exercise completion achievement
        if (this.healthMetrics.exercisesCompleted >= 3) {
            achievements.push({
                type: 'exercise_enthusiast',
                title: 'Exercise Enthusiast',
                description: 'Regular eye exercises help maintain eye health.',
                icon: '🏃‍♂️'
            });
        }

        return achievements;
    }

    // Get daily summary
    getDailySummary() {
        return {
            date: new Date().toLocaleDateString(),
            sessionDuration: new Date() - this.sessionData.sessionStart,
            avgBlinkRate: this.healthMetrics.avgBlinkRate,
            drowsinessScore: this.healthMetrics.drowsinessScore,
            eyeStrainLevel: this.healthMetrics.eyeStrainLevel,
            screenTime: this.healthMetrics.screenTimeToday,
            breaksTaken: this.healthMetrics.breaksTaken,
            exercisesCompleted: this.healthMetrics.exercisesCompleted,
            alertsTriggered: this.sessionData.alertsTriggered.length,
            overallScore: this.getOverallHealthScore()
        };
    }

    // Export analytics data
    exportData() {
        const exportData = {
            metrics: this.healthMetrics,
            sessionData: this.sessionData,
            insights: this.generateHealthInsights(),
            summary: this.getDailySummary(),
            exportDate: new Date()
        };

        return exportData;
    }

    // Reset all metrics
    resetMetrics() {
        this.sessionData = {
            sessionStart: new Date(),
            blinkData: [],
            drowsinessData: [],
            screenTimeData: [],
            eyeStrainEvents: [],
            alertsTriggered: [],
            exerciseCompletion: [],
            gazeData: [],
            tbut: [],
            eyeDryness: [],
            blinkQuality: []
        };

        this.healthMetrics = {
            avgBlinkRate: 0,
            blinkRateVariability: 0,
            drowsinessScore: 0,
            eyeStrainLevel: 0,
            screenTimeToday: 0,
            breaksTaken: 0,
            exercisesCompleted: 0,
            avgTBUT: 0,
            eyeDrynessLevel: 0,
            blinkQualityScore: 100
        };
    }
}