// Enhanced Eye Detection with Both Eyes, Gaze Tracking, and Background Support
// Based on MediaPipe Face Mesh with comprehensive eye analysis

let video = null;
let canvasOutput = null;
let canvasOutputCtx = null;
let streaming = false;

// Export streaming status for global access
window.getStreamingStatus = () => streaming;

// MediaPipe Face Mesh
let faceMesh = null;

// Enhanced tracking variables
let blinkCounter = 0;
let counter = 0;
let ratioList = [];
let color = '#ff00ff';
let startTime = Date.now(); // Track when tracking starts

// Both eyes tracking
let leftEyeRatioList = [];
let rightEyeRatioList = [];
let leftEyeBlinks = 0;
let rightEyeBlinks = 0;
let totalBlinks = 0;

// Gaze tracking variables
let gazeHistory = [];
let currentGazeDirection = { x: 0, y: 0 };
let gazeCalibrationPoints = [];
let isGazeCalibrated = false;

// Background operation support
let isBackgroundMode = false;
let backgroundWorker = null;

// Ensure camera is released on page unload
window.addEventListener('beforeunload', () => {
    if (streaming) {
        stopCamera();
    }
});

// Eye landmark IDs for both eyes
const leftEyeLandmarks = [362, 380, 374, 263, 386, 385];
const rightEyeLandmarks = [33, 159, 158, 133, 153, 145];

// Additional landmarks for gaze tracking
const gazePoints = {
    noseTip: 1,
    leftEyeCenter: 468,
    rightEyeCenter: 473,
    leftPupil: 468,
    rightPupil: 473
};

// All tracking landmark IDs
const allLandmarkIds = [22, 23, 24, 26, 110, 157, 158, 159, 160, 161, 130, 243, 
                       362, 374, 386, 387, 388, 466, 263, 249, 390, 373, 374, 380, 381, 382];

// Initialize elements
export function initElements() {
    console.log('Initializing enhanced eye detection...');

    video = document.getElementById('videoInput');
    canvasOutput = document.getElementById('canvasOutput');

    if (!canvasOutput) {
        console.error('Canvas output element not found');
        return false;
    }

    canvasOutput.width = 640;
    canvasOutput.height = 480;
    canvasOutputCtx = canvasOutput.getContext('2d');

    canvasOutputCtx.fillStyle = '#000';
    canvasOutputCtx.fillRect(0, 0, canvasOutput.width, canvasOutput.height);

    // Initialize background worker
    initBackgroundWorker();

    return true;
}

// Initialize background worker for continuous operation
function initBackgroundWorker() {
    if (typeof Worker !== 'undefined') {
        const workerCode = `
            let isRunning = false;
            let interval = null;

            self.onmessage = function(e) {
                if (e.data.command === 'start') {
                    isRunning = true;
                    interval = setInterval(() => {
                        if (isRunning) {
                            self.postMessage({type: 'heartbeat', timestamp: Date.now()});
                        }
                    }, 1000);
                } else if (e.data.command === 'stop') {
                    isRunning = false;
                    if (interval) clearInterval(interval);
                }
            };
        `;

        const blob = new Blob([workerCode], { type: 'application/javascript' });
        backgroundWorker = new Worker(URL.createObjectURL(blob));

        backgroundWorker.onmessage = function(e) {
            if (e.data.type === 'heartbeat' && isBackgroundMode) {
                // Continue processing in background
                if (streaming && document.hidden) {
                    processVideoBackground();
                }
            }
        };
    }

    // Setup visibility change handler for background operation
    setupVisibilityHandlers();
}

// Setup visibility change handlers for background operation
function setupVisibilityHandlers() {
    document.addEventListener('visibilitychange', function() {
        if (document.hidden && isBackgroundMode && streaming) {
            console.log('Page hidden - continuing in background mode');
            if (backgroundWorker) {
                backgroundWorker.postMessage({ command: 'start' });
            }
        } else if (!document.hidden) {
            console.log('Page visible - stopping background processing');
            if (backgroundWorker) {
                backgroundWorker.postMessage({ command: 'stop' });
            }
        }
    });
}

// Process video frames in background mode (without UI updates)
function processVideoBackground() {
    if (!streaming || !video.videoWidth || !video.videoHeight) {
        return;
    }

    try {
        if (faceMesh) {
            const results = faceMesh.detectForVideo(video, performance.now());

            if (results.faceLandmarks && results.faceLandmarks.length > 0) {
                const face = results.faceLandmarks[0];
                const landmarks = face.map(landmark => ({
                    x: landmark.x * canvasOutput.width,
                    y: landmark.y * canvasOutput.height
                }));

                // Process both eyes for metrics
                const leftEyeRatio = calculateEyeAspectRatio(landmarks, leftEyeLandmarks);
                const rightEyeRatio = calculateEyeAspectRatio(landmarks, rightEyeLandmarks);
                
                // Update ratio lists for both eyes
                leftEyeRatioList.push(leftEyeRatio);
                rightEyeRatioList.push(rightEyeRatio);

                if (leftEyeRatioList.length > 3) leftEyeRatioList.shift();
                if (rightEyeRatioList.length > 3) rightEyeRatioList.shift();

                // Calculate average ratios
                const leftAvgRatio = leftEyeRatioList.reduce((a, b) => a + b, 0) / leftEyeRatioList.length;
                const rightAvgRatio = rightEyeRatioList.reduce((a, b) => a + b, 0) / rightEyeRatioList.length;
                const overallRatio = (leftAvgRatio + rightAvgRatio) / 2;

                // Blink detection for both eyes
                const EAR_THRESHOLD = 0.25;
                const leftEyeClosed = leftAvgRatio < EAR_THRESHOLD;
                const rightEyeClosed = rightAvgRatio < EAR_THRESHOLD;
                const bothEyesClosed = leftEyeClosed && rightEyeClosed;
                
                // Initialize eye tracking state if not exists
                if (!window.eyeTrackingState) {
                    window.eyeTrackingState = {
                        eyesClosed: false,
                        eyesClosedTime: 0,
                        lastBlinkTime: Date.now(),
                        blinkCount: 0
                    };
                }
                
                // Store totalBlinks in window object for global access
                window.totalBlinks = totalBlinks;
                
                // Blink detection logic
                if (bothEyesClosed || (leftAvgRatio < 0.2 && rightAvgRatio < 0.2)) {
                    if (!window.eyeTrackingState.eyesClosed) {
                        window.eyeTrackingState.eyesClosed = true;
                        window.eyeTrackingState.eyesClosedTime = Date.now();
                    }
                } else {
                    if (window.eyeTrackingState.eyesClosed) {
                        window.eyeTrackingState.eyesClosed = false;
                        const blinkDuration = Date.now() - window.eyeTrackingState.eyesClosedTime;
                        const timeSinceLastBlink = Date.now() - window.eyeTrackingState.lastBlinkTime;
                        
                        // Only count as blink if duration is within reasonable range
                        if (blinkDuration > 50 && blinkDuration < 400 && timeSinceLastBlink > 300) {
                            totalBlinks++;
                            window.totalBlinks = totalBlinks;
                            window.eyeTrackingState.lastBlinkTime = Date.now();
                            
                            // Update metrics in background
                            if (typeof updateEnhancedMetrics === 'function') {
                                updateEnhancedMetrics(totalBlinks, overallRatio, leftAvgRatio, rightAvgRatio);
                            }
                        }
                    }
                }

                // Store latest eye data for periodic updates
                window.latestEyeData = { overallRatio, leftAvgRatio, rightAvgRatio };

                // Calculate drowsiness and eye strain levels
                const drowsinessLevel = overallRatio < 0.2 ? 80 : (overallRatio < 0.25 ? 40 : 20);
                const blinkRate = calculateBlinkRate(totalBlinks);
                const normalBlinkRate = 15;
                const eyeStrainLevel = blinkRate < normalBlinkRate * 0.7 ? 70 : (blinkRate < normalBlinkRate * 0.9 ? 40 : 20);

                // Send data to server periodically only when streaming
                if (streaming) {
                    sendDataToServer({
                        blink_rate: blinkRate,
                        eye_ratio: overallRatio,
                        left_ratio: leftAvgRatio,
                        right_ratio: rightAvgRatio,
                        drowsiness_level: drowsinessLevel,
                        eye_strain_level: eyeStrainLevel,
                        timestamp: new Date().toISOString()
                    });
                }

                // Check for alerts in background
                checkForAlerts(drowsinessLevel, eyeStrainLevel, blinkRate);

                console.log('Background processing - Blinks:', totalBlinks, 'Drowsiness:', drowsinessLevel, 'Eye Strain:', eyeStrainLevel);
            }
        }
    } catch (error) {
        console.error('Error in background processing:', error);
    }
}

// Check for alerts and trigger notifications
function checkForAlerts(drowsinessLevel, eyeStrainLevel, blinkRate) {
    const now = Date.now();
    
    // Initialize alert cooldown tracking
    if (!window.alertCooldowns) {
        window.alertCooldowns = {
            drowsiness: 0,
            eyeStrain: 0,
            blinkRate: 0
        };
    }

    // High drowsiness alert (level > 60)
    if (drowsinessLevel > 60 && now - window.alertCooldowns.drowsiness > 30000) {
        window.alertCooldowns.drowsiness = now;
        triggerAlert('drowsiness', 'High drowsiness detected! Please take a break.');
    }
    
    // High eye strain alert (level > 50)
    if (eyeStrainLevel > 50 && now - window.alertCooldowns.eyeStrain > 30000) {
        window.alertCooldowns.eyeStrain = now;
        triggerAlert('eyeStrain', 'High eye strain detected! Consider resting your eyes.');
    }
    
    // Low blink rate alert (below 10 bpm)
    if (blinkRate < 10 && now - window.alertCooldowns.blinkRate > 60000) {
        window.alertCooldowns.blinkRate = now;
        triggerAlert('blinkRate', 'Low blink rate detected (' + blinkRate.toFixed(1) + ' bpm). Remember to blink regularly.');
    }
}

// Trigger alert notification
function triggerAlert(type, message) {
    console.log('ALERT:', message);
    
    // Use browser notification if available
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('EyeCareAI Alert', {
            body: message,
            icon: '/static/favicon.ico',
            tag: 'eyecare-alert'
        });
    }
    
    // Also log to console and potentially send to server
    if (typeof window.breakReminderSystem !== 'undefined') {
        window.breakReminderSystem.showNotification(message, 'warning');
    }
}

// Send eye tracking data to server
function sendDataToServer(eyeData) {
    // Don't send data too frequently - throttle to every 2 seconds
    if (!sendDataToServer.lastSent || Date.now() - sendDataToServer.lastSent > 2000) {
        sendDataToServer.lastSent = Date.now();
        
        // Debug: Always log when this function is called
        console.log('📤 Sending live metrics to server:', eyeData);
        
        // Validate eye metrics before sending
        if (!eyeData || typeof eyeData !== 'object') {
            console.error('❌ Invalid eye data provided to sendDataToServer');
            return;
        }
        
        // Calculate session duration
        const sessionDuration = Math.floor((Date.now() - startTime) / 1000);
        
        // Prepare data for the new API endpoint
        const dataToSend = {
            blink_rate: eyeData.blink_rate || 15.0,
            drowsiness_level: eyeData.drowsiness_level || 25.0,
            eye_strain_level: eyeData.eye_strain_level || 30.0,
            focus_score: eyeData.focus_score || 75.0,
            session_duration: sessionDuration,
            timestamp: new Date().toISOString()
        };
        
        // Validate ranges
        dataToSend.blink_rate = Math.max(0, Math.min(50, dataToSend.blink_rate));
        dataToSend.drowsiness_level = Math.max(0, Math.min(100, dataToSend.drowsiness_level));
        dataToSend.eye_strain_level = Math.max(0, Math.min(100, dataToSend.eye_strain_level));
        dataToSend.focus_score = Math.max(0, Math.min(100, dataToSend.focus_score));
        
        try {
            fetch('/api/store-live-metrics', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(dataToSend)
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.status !== 'success') {
                    console.warn('❌ Failed to store live metrics:', data.error);
                } else {
                    console.log('✅ Live metrics stored successfully for user:', data.user_id);
                }
            })
            .catch(error => {
                console.error('❌ Error storing live metrics:', error);
            });
        } catch (error) {
            console.error('❌ Error in sendDataToServer:', error);
        }
    }
}

// Function to update status messages on the UI
function updateStatus(message) {
    const statusElement = document.getElementById('status');
    const statusBadge = document.querySelector('.tracking-status');
    
    if (statusElement) {
        statusElement.textContent = message;
    }
    
    if (statusBadge) {
        statusBadge.textContent = message;
        // You might want to change the class based on the message content
        if (message.includes('Error') || message.includes('denied')) {
            statusBadge.className = 'badge bg-danger tracking-status';
        } else if (message.includes('connected') || message.includes('loaded') || message.includes('detection')) {
            statusBadge.className = 'badge bg-success tracking-status';
        } else {
            statusBadge.className = 'badge bg-info tracking-status';
        }
    }
    console.log('Status:', message);
}

// Initialize MediaPipe Face Mesh
async function initFaceMesh() {
    try {
        const vision = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3');

        const filesetResolver = await vision.FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );

        faceMesh = await vision.FaceLandmarker.createFromOptions(filesetResolver, {
            baseOptions: {
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
                delegate: "GPU"
            },
            outputFaceBlendshapes: false,
            runningMode: "VIDEO",
            numFaces: 1,
            refineFaceLandmarks: true
        });

        console.log('Enhanced MediaPipe Face Mesh initialized');
        return true;
    } catch (error) {
        console.error('Failed to initialize MediaPipe Face Mesh:', error);
        return false;
    }
}

// Process video frames for eye detection
function processVideo() {
    if (!streaming || !video.videoWidth || !video.videoHeight) {
        if (streaming) {
            setTimeout(processVideo, 33);
        }
        return;
    }

    try {
        const begin = Date.now();

        // Skip drawing if in background mode and page is hidden
        if (!document.hidden || !isBackgroundMode) {
            canvasOutputCtx.drawImage(video, 0, 0, canvasOutput.width, canvasOutput.height);
        }

        if (faceMesh) {
            const results = faceMesh.detectForVideo(video, performance.now());

            if (results.faceLandmarks && results.faceLandmarks.length > 0) {
                const face = results.faceLandmarks[0];

                const landmarks = face.map(landmark => ({
                    x: landmark.x * canvasOutput.width,
                    y: landmark.y * canvasOutput.height
                }));

                // Process both eyes
                const leftEyeRatio = calculateEyeAspectRatio(landmarks, leftEyeLandmarks);
                const rightEyeRatio = calculateEyeAspectRatio(landmarks, rightEyeLandmarks);
                
                // Calculate eye centers for visualization
                const leftEyeCenter = calculateEyeCenter(landmarks, leftEyeLandmarks);
                const rightEyeCenter = calculateEyeCenter(landmarks, rightEyeLandmarks);

                // Update ratio lists for both eyes
                leftEyeRatioList.push(leftEyeRatio);
                rightEyeRatioList.push(rightEyeRatio);

                if (leftEyeRatioList.length > 3) leftEyeRatioList.shift();
                if (rightEyeRatioList.length > 3) rightEyeRatioList.shift();

                // Calculate average ratios
                const leftAvgRatio = leftEyeRatioList.reduce((a, b) => a + b, 0) / leftEyeRatioList.length;
                const rightAvgRatio = rightEyeRatioList.reduce((a, b) => a + b, 0) / rightEyeRatioList.length;
                const overallRatio = (leftAvgRatio + rightAvgRatio) / 2;

                // Blink detection for both eyes (EAR threshold for closed eyes is typically around 0.2-0.25)
                const EAR_THRESHOLD = 0.25; // Adjusted threshold for better accuracy
                const leftEyeClosed = leftAvgRatio < EAR_THRESHOLD;
                const rightEyeClosed = rightAvgRatio < EAR_THRESHOLD;
                const bothEyesClosed = leftEyeClosed && rightEyeClosed;
                
                // Static variables for blink detection state
                if (!window.eyeTrackingState) {
                    window.eyeTrackingState = {
                        eyesClosed: false,
                        eyesClosedTime: 0,
                        lastBlinkTime: Date.now(),
                        blinkCount: 0
                    };
                }
                
                // Store totalBlinks in window object for global access
                window.totalBlinks = totalBlinks;
                
                // Blink detection logic with improved sensitivity and proper counting
                if (bothEyesClosed || (leftAvgRatio < 0.2 && rightAvgRatio < 0.2)) {
                    // Both eyes are closed (potential blink)
                    if (!window.eyeTrackingState.eyesClosed) {
                        window.eyeTrackingState.eyesClosed = true;
                        window.eyeTrackingState.eyesClosedTime = Date.now();
                        color = '#ff0000'; // Red when eyes closed
                        console.log("Eyes closed detected - Left:", leftAvgRatio.toFixed(3), "Right:", rightAvgRatio.toFixed(3));
                    }
                } else {
                    // Eyes are open
                    if (window.eyeTrackingState.eyesClosed) {
                        // Eyes just reopened - count as a blink if duration is reasonable
                        window.eyeTrackingState.eyesClosed = false;
                        const blinkDuration = Date.now() - window.eyeTrackingState.eyesClosedTime;
                        const timeSinceLastBlink = Date.now() - window.eyeTrackingState.lastBlinkTime;
                        
                        console.log(`Potential blink - Duration: ${blinkDuration}ms, Time since last: ${timeSinceLastBlink}ms`);
                        
                        // Count as valid blink if duration and timing are reasonable
                        if (blinkDuration >= 50 && blinkDuration <= 500 && timeSinceLastBlink >= 200) {
                            totalBlinks++;
                            window.totalBlinks = totalBlinks;
                            blinkCounter = totalBlinks;
                            color = '#00c800'; // Green for successful blink
                            window.eyeTrackingState.lastBlinkTime = Date.now();
                            window.eyeTrackingState.lastBlinkDuration = blinkDuration; // Store last blink duration
                            
                            console.log(`✓ BLINK COUNTED! Total blinks: ${totalBlinks}, Duration: ${blinkDuration}ms`);
                            
                            // Update metrics immediately after each blink
                            if (typeof updateEnhancedMetrics === 'function') {
                                updateEnhancedMetrics(totalBlinks, overallRatio, leftAvgRatio, rightAvgRatio);
                            }
                            
                            // Force UI update for blink counter
                            const blinkCountElements = document.querySelectorAll('.blink-count, .total-blinks');
                            blinkCountElements.forEach(el => {
                                if (el) el.textContent = totalBlinks;
                            });
                        } else {
                            console.log(`✗ Blink rejected - Duration: ${blinkDuration}ms, Time since last: ${timeSinceLastBlink}ms`);
                        }
                    }
                }
                
                // Ensure metrics update periodically even without blinks
                if (!window.metricsUpdateInterval) {
                    window.metricsUpdateInterval = setInterval(() => {
                        if (typeof updateEnhancedMetrics === 'function' && window.latestEyeData) {
                            const { overallRatio, leftAvgRatio, rightAvgRatio } = window.latestEyeData;
                            updateEnhancedMetrics(window.totalBlinks || 0, overallRatio, leftAvgRatio, rightAvgRatio);
                        }
                    }, 2000);
                }
                window.latestEyeData = { overallRatio, leftAvgRatio, rightAvgRatio };
                
                // Reset color after a while
                if (color !== '#ff00ff') {
                    setTimeout(() => { color = '#ff00ff'; }, 500);
                }

                // Calculate gaze direction
                currentGazeDirection = calculateGazeDirection(landmarks);
                gazeHistory.push({
                    ...currentGazeDirection,
                    timestamp: Date.now()
                });

                if (gazeHistory.length > 30) gazeHistory.shift();

                // Only draw if not in background mode
                if (!document.hidden || !isBackgroundMode) {
                    // Enhanced visualization for accurate eye tracking
                    // Draw eye contours
                    canvasOutputCtx.lineWidth = 2;
                    
                    // Draw left eye contour
                    if (leftEyeLandmarks.length > 0 && leftEyeLandmarks.every(l => landmarks[l])) {
                        canvasOutputCtx.beginPath();
                        const leftEyeColor = leftAvgRatio < 0.25 ? 'red' : 'green';
                        canvasOutputCtx.strokeStyle = leftEyeColor;
                        const firstPoint = landmarks[leftEyeLandmarks[0]];
                        canvasOutputCtx.moveTo(firstPoint.x, firstPoint.y);
                        
                        for (const landmark of leftEyeLandmarks) {
                            const point = landmarks[landmark];
                            canvasOutputCtx.lineTo(point.x, point.y);
                        }
                        canvasOutputCtx.closePath();
                        canvasOutputCtx.stroke();
                        
                        // Fill left eye with semi-transparent color
                        canvasOutputCtx.fillStyle = leftEyeColor + '50'; // 50% transparency
                        canvasOutputCtx.fill();
                    }
                    
                    // Draw right eye contour
                    if (rightEyeLandmarks.length > 0 && rightEyeLandmarks.every(l => landmarks[l])) {
                        canvasOutputCtx.beginPath();
                        const rightEyeColor = rightAvgRatio < 0.25 ? 'red' : 'green';
                        canvasOutputCtx.strokeStyle = rightEyeColor;
                        const firstPoint = landmarks[rightEyeLandmarks[0]];
                        canvasOutputCtx.moveTo(firstPoint.x, firstPoint.y);
                        
                        for (const landmark of rightEyeLandmarks) {
                            const point = landmarks[landmark];
                            canvasOutputCtx.lineTo(point.x, point.y);
                        }
                        canvasOutputCtx.closePath();
                        canvasOutputCtx.stroke();
                        
                        // Fill right eye with semi-transparent color
                        canvasOutputCtx.fillStyle = rightEyeColor + '50'; // 50% transparency
                        canvasOutputCtx.fill();
                    }
                    
                    // Draw pupil centers for more accurate tracking
                    canvasOutputCtx.fillStyle = 'blue';
                    if (leftEyeCenter) {
                        canvasOutputCtx.beginPath();
                        canvasOutputCtx.arc(leftEyeCenter.x, leftEyeCenter.y, 5, 0, 2 * Math.PI);
                        canvasOutputCtx.fill();
                    }
                    
                    if (rightEyeCenter) {
                        canvasOutputCtx.beginPath();
                        canvasOutputCtx.arc(rightEyeCenter.x, rightEyeCenter.y, 5, 0, 2 * Math.PI);
                        canvasOutputCtx.fill();
                    }
                    
                    // Add blink counter text directly on screen
                    canvasOutputCtx.font = '16px Arial';
                    canvasOutputCtx.fillStyle = 'white';
                    canvasOutputCtx.strokeStyle = 'black';
                    canvasOutputCtx.lineWidth = 1;
                    const blinkText = `Blinks: ${totalBlinks}`;
                    canvasOutputCtx.strokeText(blinkText, 10, 30);
                    canvasOutputCtx.fillText(blinkText, 10, 30);
                }

                // Update metrics
                if (typeof updateEnhancedMetrics === 'function') {
                    updateEnhancedMetrics(totalBlinks, overallRatio, leftAvgRatio, rightAvgRatio);
                }

            } else if (!document.hidden || !isBackgroundMode) {
                // No face detected but UI is visible - show message
                canvasOutputCtx.fillStyle = 'red';
                canvasOutputCtx.font = '20px Arial';
                canvasOutputCtx.fillText('No face detected', 50, 50);
            }
        }

        const delay = 33 - (Date.now() - begin);
        setTimeout(processVideo, Math.max(0, delay));

    } catch (err) {
        console.error('Processing error:', err);
        updateStatus('Processing error: ' + err.message);
        setTimeout(processVideo, 1000);
    }
}

// Start camera with enhanced features
export async function startCamera() {
    if (streaming) {
        stopCamera();
        return;
    }

    // Reset tracking metrics
    startTime = Date.now();
    totalBlinks = 0;
    
    console.log('Starting enhanced camera...');
    updateStatus('Requesting camera access...');

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: 'user'
            },
            audio: false
        });

        video.srcObject = stream;
        video.play();
        streaming = true;

        video.addEventListener('loadedmetadata', async function() {
            console.log('Video metadata loaded:', video.videoWidth, 'x', video.videoHeight);

            canvasOutput.width = video.videoWidth || 640;
            canvasOutput.height = video.videoHeight || 480;

            updateStatus('Camera connected. Loading Enhanced Face Mesh...');

            const faceMeshReady = await initFaceMesh();

            if (faceMeshReady) {
                updateStatus('Enhanced Face Mesh loaded. Starting detection...');
                // Start background worker
                if (backgroundWorker) {
                    backgroundWorker.postMessage({command: 'start'});
                }
            } else {
                updateStatus('Using fallback detection...');
            }

            setTimeout(processVideo, 100);
        });

        // Update UI to show tracking is active
        const trackingButton = document.querySelector('.tracking-toggle');
        if (trackingButton) {
            const icon = trackingButton.querySelector('i');
            if (icon) {
                icon.classList.remove('bi-play-circle');
                icon.classList.add('bi-stop-circle');
            }
            trackingButton.innerHTML = '<i class="bi bi-stop-circle"></i> Stop Tracking';
        }

        const statusBadge = document.querySelector('.tracking-status');
        if (statusBadge) {
            statusBadge.className = 'badge bg-success tracking-status';
            statusBadge.textContent = 'Tracking Active';
        }

    } catch (err) {
        console.error('Error accessing camera:', err);
        updateStatus(`Camera access denied or error: ${err.name}. Please ensure camera permissions are granted.`);
        streaming = false;
        
        // Update UI to show error state
        const statusBadge = document.querySelector('.tracking-status');
        if (statusBadge) {
            statusBadge.className = 'badge bg-danger tracking-status';
            statusBadge.textContent = 'Camera Error';
        }
    }
}

// Stop camera
export function stopCamera() {
    if (!streaming) return;

    console.log('Stopping enhanced camera...');

    const stream = video.srcObject;
    if (stream) {
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
    }

    video.srcObject = null;
    streaming = false;
    isBackgroundMode = false;

    // Stop background worker
    if (backgroundWorker) {
        backgroundWorker.postMessage({command: 'stop'});
    }

    // Clear metrics update interval
    if (window.metricsUpdateInterval) {
        clearInterval(window.metricsUpdateInterval);
        window.metricsUpdateInterval = null;
    }

    canvasOutputCtx.fillStyle = '#000';
    canvasOutputCtx.fillRect(0, 0, canvasOutput.width, canvasOutput.height);

    updateStatus('Camera stopped');

    const trackingButton = document.querySelector('.tracking-toggle');
    if (trackingButton) {
        const icon = trackingButton.querySelector('i');
        if (icon) {
            icon.classList.remove('bi-stop-circle');
            icon.classList.add('bi-play-circle');
        }
        trackingButton.innerHTML = '<i class="bi bi-play-circle"></i> Start Tracking';
    }

    const statusBadge = document.querySelector('.tracking-status');
    if (statusBadge) {
        statusBadge.className = 'badge bg-secondary tracking-status';
        statusBadge.textContent = 'Tracking Stopped';
    }
}

// Calculate distance between two points
function findDistance(point1, point2) {
    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;
    return Math.sqrt(dx * dx + dy * dy);
}

// Calculate eye aspect ratio for a specific eye
function calculateEyeAspectRatio(landmarks, eyeLandmarks) {
    // eyeLandmarks is now an array of landmark indices
    // P1, P2, P3, P4, P5, P6 are specific eye landmark points
    // P1: horizontal left (eyeLandmarks[0])
    // P2: vertical upper-inner (eyeLandmarks[1])
    // P3: vertical upper-outer (eyeLandmarks[2])
    // P4: horizontal right (eyeLandmarks[3])
    // P5: vertical lower-outer (eyeLandmarks[4])
    // P6: vertical lower-inner (eyeLandmarks[5])

    const p1 = landmarks[eyeLandmarks[0]];
    const p2 = landmarks[eyeLandmarks[1]];
    const p3 = landmarks[eyeLandmarks[2]];
    const p4 = landmarks[eyeLandmarks[3]];
    const p5 = landmarks[eyeLandmarks[4]];
    const p6 = landmarks[eyeLandmarks[5]];

    if (!p1 || !p2 || !p3 || !p4 || !p5 || !p6) {
        return 0;
    }

    const verticalDistance1 = findDistance(p2, p6);
    const verticalDistance2 = findDistance(p3, p5);
    const horizontalDistance = findDistance(p1, p4);

    // EAR formula: (verticalDistance1 + verticalDistance2) / (2.0 * horizontalDistance)
    return (verticalDistance1 + verticalDistance2) / (2.0 * horizontalDistance);
}

// Calculate eye center point
function calculateEyeCenter(landmarks, eyeLandmarks) {
    if (!landmarks || eyeLandmarks.length < 4) return null;
    
    // Get the eye landmark points
    const points = eyeLandmarks.map(index => landmarks[index]);
    if (points.some(p => !p)) return null; // If any point is missing, return null
    
    // Calculate center as average of all points
    let sumX = 0;
    let sumY = 0;
    
    for (const point of points) {
        sumX += point.x;
        sumY += point.y;
    }
    
    return {
        x: sumX / points.length,
        y: sumY / points.length
    };
}

// Calculate gaze direction
function calculateGazeDirection(landmarks) {
    const leftEyeCenter = landmarks[gazePoints.leftEyeCenter];
    const rightEyeCenter = landmarks[gazePoints.rightEyeCenter];
    const noseTip = landmarks[gazePoints.noseTip];

    if (!leftEyeCenter || !rightEyeCenter || !noseTip) {
        return { x: 0, y: 0, confidence: 0, zone: 'none', warning: null };
    }

    // Calculate eye center
    const eyeCenter = {
        x: (leftEyeCenter.x + rightEyeCenter.x) / 2,
        y: (leftEyeCenter.y + rightEyeCenter.y) / 2
    };

    // Calculate gaze vector relative to nose
    const gazeVector = {
        x: eyeCenter.x - noseTip.x,
        y: eyeCenter.y - noseTip.y
    };

    // Normalize to screen coordinates
    const gazeDirection = {
        x: (gazeVector.x / canvasOutput.width) * 100,
        y: (gazeVector.y / canvasOutput.height) * 100,
        confidence: 0.8
    };

    // Add useful zone detection and health warnings
    const zones = getScreenZones(gazeDirection.x, gazeDirection.y);
    gazeDirection.zone = zones.current;
    gazeDirection.zoneName = zones.name;
    gazeDirection.warning = zones.warning;
    gazeDirection.timeInZone = zones.timeInZone;

    return gazeDirection;
}

function getScreenZones(x, y) {
    // Track time spent in each zone for health monitoring
    if (!window.gazeZoneTracker) {
        window.gazeZoneTracker = {
            center: { time: 0, lastEnter: 0 },
            up: { time: 0, lastEnter: 0 },
            down: { time: 0, lastEnter: 0 },
            left: { time: 0, lastEnter: 0 },
            right: { time: 0, lastEnter: 0 },
            currentZone: 'center',
            lastZoneChange: Date.now(),
            warnings: []
        };
    }

    const tracker = window.gazeZoneTracker;
    const now = Date.now();

    // Determine current zone based on gaze direction
    let currentZone = 'center';
    let zoneName = 'Center Screen';
    let warning = null;

    if (y < -15) {
        currentZone = 'up';
        zoneName = 'Looking Up';
    } else if (y > 15) {
        currentZone = 'down';
        zoneName = 'Looking Down';
        warning = 'Neck strain risk - screen too low';
    } else if (x < -20) {
        currentZone = 'left';
        zoneName = 'Looking Left';
    } else if (x > 20) {
        currentZone = 'right';
        zoneName = 'Looking Right';
    }

    // Update time tracking
    if (tracker.currentZone !== currentZone) {
        // Record time spent in previous zone
        if (tracker.lastZoneChange > 0) {
            const timeSpent = now - tracker.lastZoneChange;
            tracker[tracker.currentZone].time += timeSpent;
            
            // Add warning if spent too long in one zone
            if (timeSpent > 30000) { // 30 seconds
                tracker.warnings.push(`Spent ${Math.round(timeSpent/1000)}s looking ${tracker.currentZone}`);
            }
        }
        
        tracker.currentZone = currentZone;
        tracker.lastZoneChange = now;
        tracker[currentZone].lastEnter = now;
    }

    return {
        current: currentZone,
        name: zoneName,
        warning: warning,
        timeInZone: tracker[currentZone].time + (now - tracker.lastZoneChange)
    };
}

// Function to update enhanced metrics with both eyes data
function updateEnhancedMetrics(totalBlinks, overallRatio, leftEyeRatio, rightEyeRatio) {
    console.log("Updating enhanced metrics with totalBlinks:", totalBlinks);
    console.log(`📊 Metrics - Blinks: ${totalBlinks}, Overall: ${overallRatio.toFixed(3)}, Left: ${leftEyeRatio.toFixed(3)}, Right: ${rightEyeRatio.toFixed(3)}`);
    
    // Make sure we have a global reference to totalBlinks
    window.totalBlinks = totalBlinks;
    
    // Calculate blink rate (blinks per minute)
    const blinkRate = calculateBlinkRate(totalBlinks);
    
    // Calculate drowsiness level (0-100 percentage scale)
    const drowsinessLevel = overallRatio < 0.2 ? 80 : (overallRatio < 0.25 ? 40 : 20);
    
    // Calculate eye strain level based on blink rate and ratio (0-100 percentage scale)
    const normalBlinkRate = 15; // Average person blinks 15-20 times per minute
    const eyeStrainLevel = blinkRate < normalBlinkRate * 0.7 ? 70 : (blinkRate < normalBlinkRate * 0.9 ? 40 : 20);
    
    // Prepare metrics object
    const metrics = {
        blinkRate: blinkRate,
        eyeRatio: overallRatio,
        leftEyeRatio: leftEyeRatio,
        rightEyeRatio: rightEyeRatio,
        drowsinessLevel: drowsinessLevel,
        eyeStrainLevel: eyeStrainLevel,
        totalBlinks: totalBlinks,
        timestamp: Date.now() // Add timestamp for tracking
    };
    
    // Store metrics history
    if (!window.metricsHistory) window.metricsHistory = [];
    window.metricsHistory.push(metrics);
    
    // Keep only last 100 metrics
    if (window.metricsHistory.length > 100) {
        window.metricsHistory.shift();
    }
    
    // Update UI with metrics
    updateMetricsDisplay(metrics);
    
    // Send data to server for storage (with proper throttling)
    const now = Date.now();
    const timeSinceLastSent = window.lastDataSent ? now - window.lastDataSent : 99999;
    
    console.log(`🔄 Data sending check: lastSent=${window.lastDataSent}, timeSince=${timeSinceLastSent}ms, threshold=2000ms`);
    
    if (!window.lastDataSent || timeSinceLastSent > 2000) {
        const dataToSend = {
            blink_rate: metrics.blinkRate,
            eye_ratio: metrics.eyeRatio,
            left_ratio: leftEyeRatio,
            right_ratio: rightEyeRatio,
            drowsiness_level: metrics.drowsinessLevel,
            eye_strain_level: metrics.eyeStrainLevel,
            eye_closure_duration: window.eyeTrackingState && window.eyeTrackingState.lastBlinkDuration ? window.eyeTrackingState.lastBlinkDuration / 1000 : 0.3,
            timestamp: new Date().toISOString()
        };
        
        console.log(`🚀 Preparing to send data to server:`, dataToSend);
        
        // Send to server immediately for real-time storage
        sendDataToServer(dataToSend);
        window.lastDataSent = now;
    } else {
        console.log(`⏳ Throttling data send: ${timeSinceLastSent}ms < 2000ms`);
    }
    
    // Force update every 2 seconds even without blinks
    if (!window.metricsUpdateInterval) {
        console.log('🔄 Setting up metrics update interval (2 seconds)');
        window.metricsUpdateInterval = setInterval(() => {
            console.log('⏰ Interval triggered - forcing metrics update');
            updateEnhancedMetrics(window.totalBlinks || 0, overallRatio, leftEyeRatio, rightEyeRatio);
        }, 2000);
        
        // Also send a test transmission immediately to verify connectivity
        console.log('🧪 Testing immediate data transmission on first run...');
        
        // First check if user is authenticated
        fetch('/api/session-test', {
            method: 'GET',
            credentials: 'include'
        })
        .then(response => response.json())
        .then(sessionData => {
            console.log('🔐 Session check result:', sessionData);
            if (!sessionData.authenticated) {
                console.error('❌ User not authenticated - data will not be sent');
                alert('Please log in to start eye tracking data storage.');
                return;
            }
            
            // User is authenticated, proceed with test transmission
            setTimeout(() => {
                const testData = {
                    blink_rate: metrics.blinkRate,
                    eye_ratio: metrics.eyeRatio,
                    left_ratio: leftEyeRatio,
                    right_ratio: rightEyeRatio,
                    drowsiness_level: metrics.drowsinessLevel,
                    eye_strain_level: metrics.eyeStrainLevel,
                    eye_closure_duration: 0.3,
                    timestamp: new Date().toISOString()
                };
                console.log('🧪 Sending test data immediately:', testData);
                sendDataToServer(testData);
            }, 1000);
        })
        .catch(error => {
            console.error('❌ Error checking session:', error);
        });
    }
    
    // Return metrics for potential further use
    return metrics;
}

function updateMetricsDisplay(metrics) {
    console.log("Updating metrics display:", metrics);
    
    // Update all UI metrics using proper IDs for better reliability
    const blinkRateElement = document.getElementById('blinkRateValue');
    const blinkDurationElement = document.getElementById('blinkDurationValue');
    const drowsinessElement = document.getElementById('drowsinessValue');
    const perclosElement = document.getElementById('perclosValue');
    const totalBlinksElement = document.getElementById('totalBlinksValue');
    const eyeStrainElement = document.getElementById('eyeStrainValue');
    
    // Update blink rate (in bpm) with null check
    if (blinkRateElement) {
        blinkRateElement.textContent = metrics.blinkRate.toFixed(1) + ' bpm';
        blinkRateElement.className = 'badge rounded-pill ' + 
            (metrics.blinkRate < 12 ? 'bg-danger' : 
            (metrics.blinkRate < 15 ? 'bg-warning' : 'bg-primary'));
    }
    
    // Update blink duration (calculate from actual blink detection) with null check
    if (blinkDurationElement) {
        // Use actual blink duration if available, otherwise default
        const avgBlinkDuration = window.eyeTrackingState && window.eyeTrackingState.lastBlinkDuration ? 
            window.eyeTrackingState.lastBlinkDuration : 300;
        blinkDurationElement.textContent = (avgBlinkDuration / 1000).toFixed(2) + 's';
        blinkDurationElement.className = 'badge rounded-pill bg-primary';
    }
    
    // Update drowsiness level (as percentage) - use the actual metrics value with null check
    const drowsinessPercent = metrics.drowsinessLevel;
    if (drowsinessElement) {
        drowsinessElement.textContent = drowsinessPercent.toFixed(1) + '%';
        // Update color based on level
        drowsinessElement.className = 'badge rounded-pill ' + 
            (drowsinessPercent > 60 ? 'bg-danger' : 
            (drowsinessPercent > 30 ? 'bg-warning' : 'bg-success'));
    }
    
    // Update PERCLOS (percentage of eye closure) with null check
    const perclosValue = Math.min(100, Math.max(0, (1 - metrics.eyeRatio / 0.3) * 100));
    if (perclosElement) {
        perclosElement.textContent = Math.round(perclosValue) + '%';
    }
    
    // Update total blinks with null check
    if (totalBlinksElement) {
        totalBlinksElement.textContent = metrics.totalBlinks;
        // Force DOM update by changing another property
        totalBlinksElement.style.fontWeight = metrics.totalBlinks % 2 === 0 ? 'normal' : 'bold';
    }
        
    // Update eye strain level with null check
    if (eyeStrainElement) {
        eyeStrainElement.textContent = metrics.eyeStrainLevel.toFixed(1) + '%';
        // Update color based on level
        eyeStrainElement.className = 'badge rounded-pill ' + 
            (metrics.eyeStrainLevel > 60 ? 'bg-danger' : 
            (metrics.eyeStrainLevel > 40 ? 'bg-warning' : 'bg-success'));
    }
    
    // Session duration is handled by a separate timer in live_tracking.html
    // We don't update it here as it's managed by the session timer
    
    // Update overlay metrics with null checks
    const blinkValueElements = document.querySelectorAll('.blink-value');
    const drowsinessValueElements = document.querySelectorAll('.drowsiness-value');
    
    blinkValueElements.forEach(el => {
        if (el) el.textContent = metrics.blinkRate.toFixed(1);
    });
    
    drowsinessValueElements.forEach(el => {
        if (el) el.textContent = metrics.drowsinessLevel.toFixed(1) + '%';
    });
    
    // Update status badge with null check
    const statusBadge = document.querySelector('.tracking-status');
    if (statusBadge) {
        statusBadge.className = 'badge tracking-status ' + 
            (metrics.drowsinessLevel > 60 ? 'bg-danger' : 
            (metrics.drowsinessLevel > 30 ? 'bg-warning' : 'bg-success'));
        statusBadge.textContent = 'Tracking Active';
    }

    // Update break reminder system with percentage-based levels
    if (window.breakReminderSystem) {
        window.breakReminderSystem.updateEyeMetrics(metrics.eyeStrainLevel, metrics.drowsinessLevel);
    }
    
    // Force UI update with null check
    const metricsContainer = document.getElementById('metricsContainer');
    if (metricsContainer) {
        metricsContainer.style.opacity = 0.99;
        setTimeout(() => {
            metricsContainer.style.opacity = 1;
        }, 50);
    }
}

// Export functions for global access
window.startEyeTracking = startCamera;
window.stopEyeTracking = stopCamera;
window.getStreamingStatus = () => streaming;

// Export streaming variable
Object.defineProperty(window, 'isTracking', {
    get: function() { return streaming; }
});

// Helper function to calculate blink rate
function calculateBlinkRate(totalBlinks) {
    // Use total blinks and elapsed time for more accurate rate
    const elapsedMinutes = (Date.now() - startTime) / (1000 * 60);
    // Prevent division by zero and ensure minimum time elapsed
    if (elapsedMinutes < 0.1) return 0;
    return totalBlinks / elapsedMinutes;
}

// Helper function to calculate average eye ratio
function calculateAverageEyeRatio() {
    if (ratioList.length === 0) return 0;
    return ratioList.reduce((a, b) => a + b, 0) / ratioList.length;
}

// Helper function to calculate drowsiness level
function calculateDrowsinessLevel() {
    const recentRatios = ratioList.slice(-30); // Last 30 frames
    if (recentRatios.length === 0) return 0;
    
    const avgRatio = recentRatios.reduce((a, b) => a + b, 0) / recentRatios.length;
    const threshold = 0.25;
    
    return avgRatio < threshold ? ((threshold - avgRatio) / threshold) * 100 : 0;
}

// Function to detect face landmarks using MediaPipe Face Mesh
async function detectFaceLandmarks() {
    if (!faceMesh || !video) {
        console.warn('Face Mesh not initialized or video not available.');
        return null;
    }

    const results = faceMesh.detectForVideo(video, performance.now());

    if (results.faceLandmarks && results.faceLandmarks.length > 0) {
        const face = results.faceLandmarks[0];
        const landmarks = face.map(landmark => ({
            x: landmark.x * (video.videoWidth || 640),
            y: landmark.y * (video.videoHeight || 480),
            z: landmark.z // Include z-coordinate if available
        }));
        return landmarks;
    }
    return null;
}