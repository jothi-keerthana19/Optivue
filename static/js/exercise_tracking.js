// Exercise-Specific Tracking System
// Integrates with enhanced_eye_detection.js for real-time exercise verification

class ExerciseTracker {
    constructor() {
        this.currentExercise = null;
        this.exerciseData = {
            gazeHistory: [],
            blinkHistory: [],
            headPoseHistory: [],
            stepProgress: [],
            feedback: []
        };
        this.calibration = {
            gazeZones: {},
            thresholds: {
                gazeAccuracy: 0.7,
                blinkIntensity: 0.8,
                headStability: 0.85
            }
        };
        this.isTracking = false;
    }

    // Start tracking a specific exercise
    startExercise(exerciseType) {
        this.currentExercise = exerciseType;
        this.resetData();
        this.isTracking = true;
        console.log(`Started tracking: ${exerciseType}`);
    }

    // Stop tracking
    stopExercise() {
        this.isTracking = false;
        const results = this.generateResults();
        this.resetData();
        return results;
    }

    // Reset tracking data
    resetData() {
        this.exerciseData = {
            gazeHistory: [],
            blinkHistory: [],
            headPoseHistory: [],
            stepProgress: [],
            feedback: []
        };
    }

    // Main tracking function - called from enhanced_eye_detection.js
    trackExercise(landmarks, blinkData, gazeData) {
        if (!this.isTracking || !this.currentExercise) return;

        const timestamp = Date.now();
        
        // Store current frame data
        this.exerciseData.gazeHistory.push({
            x: gazeData.x,
            y: gazeData.y,
            zone: gazeData.zone,
            timestamp: timestamp
        });

        this.exerciseData.blinkHistory.push({
            isBlinking: blinkData.isBlinking,
            intensity: blinkData.intensity,
            timestamp: timestamp
        });

        this.exerciseData.headPoseHistory.push({
            tilt: this.calculateHeadTilt(landmarks),
            rotation: this.calculateHeadRotation(landmarks),
            stability: this.calculateHeadStability(landmarks),
            timestamp: timestamp
        });

        // Exercise-specific verification
        const verification = this.verifyExerciseStep(landmarks, gazeData, blinkData);
        this.exerciseData.stepProgress.push(verification);

        // Generate real-time feedback
        const feedback = this.generateRealTimeFeedback(verification);
        this.exerciseData.feedback.push({
            message: feedback,
            timestamp: timestamp,
            step: this.getCurrentStep()
        });

        // Limit history size
        this.limitHistorySize();

        return {
            verification: verification,
            feedback: feedback
        };
    }

    // Exercise-specific verification functions
    verifyExerciseStep(landmarks, gazeData, blinkData) {
        switch (this.currentExercise) {
            case 'twenty-twenty-twenty':
                return this.verifyTwentyTwentyTwenty(gazeData);
            case 'focus-change':
                return this.verifyFocusChange(gazeData);
            case 'eye-rolling':
                return this.verifyEyeRolling(landmarks, gazeData);
            case 'palming':
                return this.verifyPalming(blinkData);
            case 'figure-eight':
                return this.verifyFigureEight(gazeData);
            default:
                return { accuracy: 0, message: 'Unknown exercise' };
        }
    }

    // 20-20-20 Exercise Verification
    verifyTwentyTwentyTwenty(gazeData) {
        const nearZone = { x: 0.3, y: 0.3, width: 0.4, height: 0.4 };
        const farZone = { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };
        
        const isNear = this.isInZone(gazeData, nearZone);
        const isFar = this.isInZone(gazeData, farZone);
        
        const recentGaze = this.exerciseData.gazeHistory.slice(-10);
        const nearTime = recentGaze.filter(g => this.isInZone(g, nearZone)).length / 10;
        const farTime = recentGaze.filter(g => this.isInZone(g, farZone)).length / 10;
        
        const accuracy = Math.max(nearTime, farTime);
        
        return {
            accuracy: accuracy,
            nearFocusTime: nearTime * 20,
            farFocusTime: farTime * 20,
            message: accuracy > 0.7 ? 'Good focus switching' : 'Try to focus more deliberately'
        };
    }

    // Focus Change Exercise Verification
    verifyFocusChange(gazeData) {
        const leftZone = { x: 0.1, y: 0.4, width: 0.2, height: 0.2 };
        const rightZone = { x: 0.7, y: 0.4, width: 0.2, height: 0.2 };
        const centerZone = { x: 0.4, y: 0.4, width: 0.2, height: 0.2 };
        
        const recentGaze = this.exerciseData.gazeHistory.slice(-20);
        const transitions = this.countZoneTransitions(recentGaze, [leftZone, centerZone, rightZone]);
        
        const accuracy = Math.min(transitions / 5, 1.0); // Expect at least 5 transitions
        
        return {
            accuracy: accuracy,
            transitions: transitions,
            message: transitions >= 5 ? 'Excellent focus changes' : `Complete ${5 - transitions} more focus changes`
        };
    }

    // Eye Rolling Exercise Verification
    verifyEyeRolling(landmarks, gazeData) {
        const leftEye = landmarks[468]; // Left iris
        const rightEye = landmarks[473]; // Right iris
        
        if (!leftEye || !rightEye) return { accuracy: 0, message: 'Cannot detect eyes' };
        
        // Calculate angular movement
        const eyeCenter = {
            x: (leftEye.x + rightEye.x) / 2,
            y: (leftEye.y + rightEye.y) / 2
        };
        
        const recentGaze = this.exerciseData.gazeHistory.slice(-30);
        const angularCoverage = this.calculateAngularCoverage(recentGaze, eyeCenter);
        
        const accuracy = Math.min(angularCoverage / 360, 1.0);
        
        return {
            accuracy: accuracy,
            coverage: angularCoverage,
            message: accuracy > 0.7 ? 'Good eye rolling motion' : 'Try to roll your eyes more completely'
        };
    }

    // Palming Exercise Verification
    verifyPalming(blinkData) {
        const recentBlinks = this.exerciseData.blinkHistory.slice(-10);
        const eyesClosed = recentBlinks.filter(b => b.isBlinking).length / 10;
        
        const accuracy = eyesClosed > 0.8 ? 1.0 : eyesClosed;
        
        return {
            accuracy: accuracy,
            eyesClosedTime: eyesClosed * 10,
            message: eyesClosed > 0.8 ? 'Eyes properly closed' : 'Close your eyes completely'
        };
    }

    // Figure Eight Exercise Verification
    verifyFigureEight(gazeData) {
        const centerX = 0.5;
        const centerY = 0.5;
        const radius = 0.3;
        
        const recentGaze = this.exerciseData.gazeHistory.slice(-40);
        const figureEightPath = this.calculateFigureEightPath(recentGaze, centerX, centerY, radius);
        
        const accuracy = Math.min(figureEightPath / 360, 1.0);
        
        return {
            accuracy: accuracy,
            pathCompleteness: figureEightPath,
            message: accuracy > 0.6 ? 'Good figure eight motion' : 'Follow the complete figure eight path'
        };
    }

    // Utility functions
    isInZone(gaze, zone) {
        return gaze.x >= zone.x && gaze.x <= zone.x + zone.width &&
               gaze.y >= zone.y && gaze.y <= zone.y + zone.height;
    }

    countZoneTransitions(gazeHistory, zones) {
        let transitions = 0;
        let lastZone = null;
        
        for (const gaze of gazeHistory) {
            const currentZone = zones.findIndex(zone => this.isInZone(gaze, zone));
            if (currentZone !== lastZone && currentZone !== -1) {
                transitions++;
                lastZone = currentZone;
            }
        }
        
        return transitions;
    }

    calculateAngularCoverage(gazeHistory, center) {
        if (gazeHistory.length < 5) return 0;
        
        let minAngle = 360;
        let maxAngle = 0;
        
        for (const gaze of gazeHistory) {
            const angle = Math.atan2(gaze.y - center.y, gaze.x - center.x) * 180 / Math.PI;
            minAngle = Math.min(minAngle, angle);
            maxAngle = Math.max(maxAngle, angle);
        }
        
        return maxAngle - minAngle;
    }

    calculateFigureEightPath(gazeHistory, centerX, centerY, radius) {
        if (gazeHistory.length < 10) return 0;
        
        let totalDistance = 0;
        let lastPoint = null;
        
        for (const gaze of gazeHistory) {
            const x = (gaze.x - centerX) / radius;
            const y = (gaze.y - centerY) / radius;
            
            // Check if point is on figure eight path
            const onPath = Math.abs(x * x - y * y) < 0.5;
            
            if (onPath && lastPoint) {
                const distance = Math.sqrt(
                    Math.pow(gaze.x - lastPoint.x, 2) + Math.pow(gaze.y - lastPoint.y, 2)
                );
                totalDistance += distance;
            }
            
            if (onPath) lastPoint = gaze;
        }
        
        return totalDistance * 100; // Scale factor
    }

    calculateHeadTilt(landmarks) {
        // Simplified head tilt calculation using nose and eye positions
        const nose = landmarks[1]; // Nose tip
        const leftEye = landmarks[468];
        const rightEye = landmarks[473];
        
        if (!nose || !leftEye || !rightEye) return 0;
        
        const eyeLine = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);
        return eyeLine * 180 / Math.PI;
    }

    calculateHeadRotation(landmarks) {
        // Calculate head rotation based on eye positions
        const leftEye = landmarks[468];
        const rightEye = landmarks[473];
        
        if (!leftEye || !rightEye) return 0;
        
        const rotation = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);
        return rotation * 180 / Math.PI;
    }

    calculateHeadStability(landmarks) {
        const recentPoses = this.exerciseData.headPoseHistory.slice(-5);
        if (recentPoses.length < 2) return 1.0;
        
        const variance = recentPoses.reduce((sum, pose) => {
            return sum + Math.pow(pose.tilt - recentPoses[0].tilt, 2);
        }, 0) / recentPoses.length;
        
        return Math.max(1.0 - (variance / 100), 0);
    }

    generateRealTimeFeedback(verification) {
        if (verification.accuracy > 0.8) {
            return "Excellent! Keep up the good form.";
        } else if (verification.accuracy > 0.6) {
            return "Good progress. Try to be more precise.";
        } else {
            return verification.message || "Focus on the exercise instructions.";
        }
    }

    getCurrentStep() {
        return Math.floor(this.exerciseData.stepProgress.length / 10);
    }

    limitHistorySize() {
        const maxSize = 100;
        Object.keys(this.exerciseData).forEach(key => {
            if (Array.isArray(this.exerciseData[key])) {
                while (this.exerciseData[key].length > maxSize) {
                    this.exerciseData[key].shift();
                }
            }
        });
    }

    generateResults() {
        const totalSteps = this.exerciseData.stepProgress.length;
        const averageAccuracy = totalSteps > 0 
            ? this.exerciseData.stepProgress.reduce((sum, step) => sum + step.accuracy, 0) / totalSteps 
            : 0;

        return {
            exerciseType: this.currentExercise,
            totalSteps: totalSteps,
            averageAccuracy: averageAccuracy,
            completionRate: Math.min(totalSteps / 50, 1.0), // Assuming 50 steps per exercise
            feedback: this.exerciseData.feedback.slice(-5),
            recommendations: this.generateRecommendations(averageAccuracy)
        };
    }

    generateRecommendations(accuracy) {
        const recommendations = [];
        
        if (accuracy < 0.5) {
            recommendations.push("Practice the exercise slowly and deliberately");
            recommendations.push("Use the visual guides for better accuracy");
        } else if (accuracy < 0.7) {
            recommendations.push("Focus on maintaining consistent movements");
            recommendations.push("Try to complete full range of motion");
        } else {
            recommendations.push("Excellent form! You can increase speed slightly");
            recommendations.push("Consider adding more repetitions");
        }
        
        return recommendations;
    }
}

// Global exercise tracker instance
const exerciseTracker = new ExerciseTracker();

// Integration with enhanced_eye_detection.js
function integrateWithEyeDetection() {
    // This function should be called from enhanced_eye_detection.js
    // whenever exercise tracking is active
    window.trackExercise = function(landmarks, blinkData, gazeData) {
        return exerciseTracker.trackExercise(landmarks, blinkData, gazeData);
    };
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ExerciseTracker, exerciseTracker };
}