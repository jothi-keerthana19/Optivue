// Fixed Eye Detection using OpenCV.js
// This version addresses matrix operation errors and ensures proper face/eye detection

let video = null;
let canvasOutput = null;
let canvasOutputCtx = null;
let streaming = false;

// OpenCV variables
let src = null;
let gray = null;
let faceClassifier = null;
let eyeClassifier = null;

// Tracking variables
let blinkCount = 0;
let lastEyeState = 'open';
let eyeClosedFrames = 0;
let lastBlinkTime = Date.now();
let blinkRates = [];
let drowsinessLevel = 0;
let lastAlertTime = 0;

// Initialize elements
function initElements() {
    console.log('Initializing elements...');
    
    video = document.getElementById('videoInput');
    canvasOutput = document.getElementById('canvasOutput');
    
    if (!canvasOutput) {
        console.error('Canvas output element not found');
        return false;
    }
    
    // Set canvas dimensions
    canvasOutput.width = 640;
    canvasOutput.height = 480;
    canvasOutputCtx = canvasOutput.getContext('2d');
    
    // Clear canvas
    canvasOutputCtx.fillStyle = '#000';
    canvasOutputCtx.fillRect(0, 0, canvasOutput.width, canvasOutput.height);
    
    return true;
}

// Start camera
function startCamera() {
    if (streaming) {
        stopCamera();
        return;
    }
    
    console.log('Starting camera...');
    updateStatus('Requesting camera access...');
    
    navigator.mediaDevices.getUserMedia({ 
        video: { 
            width: 640, 
            height: 480,
            facingMode: 'user'
        }, 
        audio: false 
    })
    .then(function(stream) {
        video.srcObject = stream;
        video.play();
        streaming = true;
        
        video.addEventListener('loadedmetadata', function() {
            console.log('Video metadata loaded:', video.videoWidth, 'x', video.videoHeight);
            
            // Update canvas size to match video
            canvasOutput.width = video.videoWidth;
            canvasOutput.height = video.videoHeight;
            
            updateStatus('Camera connected. Loading models...');
            loadClassifiers();
        });
        
        video.addEventListener('loadeddata', function() {
            console.log('Video data loaded');
        });
        
    })
    .catch(function(err) {
        console.error('Camera error:', err);
        updateStatus('Camera error: ' + err.message);
    });
}

// Stop camera
function stopCamera() {
    if (!streaming) return;
    
    console.log('Stopping camera...');
    
    const stream = video.srcObject;
    if (stream) {
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
    }
    
    video.srcObject = null;
    streaming = false;
    
    // Clean up OpenCV matrices
    if (src && !src.isDeleted()) {
        src.delete();
        src = null;
    }
    if (gray && !gray.isDeleted()) {
        gray.delete();
        gray = null;
    }
    
    // Clear canvas
    canvasOutputCtx.fillStyle = '#000';
    canvasOutputCtx.fillRect(0, 0, canvasOutput.width, canvasOutput.height);
    
    updateStatus('Camera stopped');
    
    // Update UI
    const trackingButton = document.querySelector('.tracking-toggle');
    if (trackingButton) {
        trackingButton.innerHTML = '<i class="bi bi-play-circle"></i> Start Tracking';
    }
    
    const statusBadge = document.querySelector('.tracking-status');
    if (statusBadge) {
        statusBadge.className = 'badge bg-secondary tracking-status';
        statusBadge.textContent = 'Tracking Stopped';
    }
}

// Load classifiers
function loadClassifiers() {
    try {
        updateStatus('Loading face classifier...');
        
        // Create classifiers
        faceClassifier = new cv.CascadeClassifier();
        eyeClassifier = new cv.CascadeClassifier();
        
        // Load face classifier
        const faceCascadePath = 'haarcascade_frontalface_alt2';
        faceClassifier.load(faceCascadePath);
        
        updateStatus('Loading eye classifier...');
        
        // Load eye classifier
        const eyeCascadePath = 'haarcascade_eye';
        eyeClassifier.load(eyeCascadePath);
        
        updateStatus('Classifiers loaded. Starting detection...');
        
        // Start processing
        setTimeout(processVideo, 100);
        
    } catch (error) {
        console.error('Error loading classifiers:', error);
        updateStatus('Error loading classifiers: ' + error.message);
    }
}

// Process video frames
function processVideo() {
    if (!streaming || !video.videoWidth || !video.videoHeight) {
        if (streaming) {
            setTimeout(processVideo, 100);
        }
        return;
    }
    
    try {
        const begin = Date.now();
        
        // Initialize matrices only once
        if (!src) {
            src = new cv.Mat(video.videoHeight, video.videoWidth, cv.CV_8UC4);
            gray = new cv.Mat(video.videoHeight, video.videoWidth, cv.CV_8UC1);
        }
        
        // Capture frame from video
        const cap = new cv.VideoCapture(video);
        cap.read(src);
        
        // Convert to grayscale
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
        
        // Detect faces
        let faces = new cv.RectVector();
        let eyes = new cv.RectVector();
        
        faceClassifier.detectMultiScale(gray, faces, 1.1, 3, 0, new cv.Size(30, 30));
        
        let eyesDetected = 0;
        let eyesOpen = 0;
        
        // Process each face
        for (let i = 0; i < faces.size(); i++) {
            const face = faces.get(i);
            
            // Draw face rectangle (green)
            const facePoint1 = new cv.Point(face.x, face.y);
            const facePoint2 = new cv.Point(face.x + face.width, face.y + face.height);
            cv.rectangle(src, facePoint1, facePoint2, [0, 255, 0, 255], 2);
            
            // Add face label
            cv.putText(src, 'Face', new cv.Point(face.x, face.y - 10), 
                      cv.FONT_HERSHEY_SIMPLEX, 0.5, [0, 255, 0, 255], 1);
            
            // Extract face region for eye detection
            const faceROI = gray.roi(face);
            
            // Detect eyes in face region
            eyeClassifier.detectMultiScale(faceROI, eyes, 1.1, 3, 0, new cv.Size(15, 15));
            
            eyesDetected = eyes.size();
            
            // Process each eye
            for (let j = 0; j < eyes.size(); j++) {
                const eye = eyes.get(j);
                
                // Convert eye coordinates to global coordinates
                const eyeX = face.x + eye.x;
                const eyeY = face.y + eye.y;
                
                // Draw eye rectangle (blue)
                const eyePoint1 = new cv.Point(eyeX, eyeY);
                const eyePoint2 = new cv.Point(eyeX + eye.width, eyeY + eye.height);
                cv.rectangle(src, eyePoint1, eyePoint2, [255, 0, 0, 255], 2);
                
                // Determine if eye is open or closed based on aspect ratio
                const aspectRatio = eye.width / eye.height;
                if (aspectRatio > 2.5) {
                    eyesOpen++;
                    cv.putText(src, 'Open', new cv.Point(eyeX, eyeY - 5), 
                              cv.FONT_HERSHEY_SIMPLEX, 0.4, [0, 255, 0, 255], 1);
                } else {
                    cv.putText(src, 'Closed', new cv.Point(eyeX, eyeY - 5), 
                              cv.FONT_HERSHEY_SIMPLEX, 0.4, [255, 0, 0, 255], 1);
                }
            }
            
            faceROI.delete();
        }
        
        // Blink detection logic
        const currentEyeState = (eyesOpen >= Math.ceil(eyesDetected / 2)) ? 'open' : 'closed';
        
        if (currentEyeState === 'closed' && lastEyeState === 'open') {
            eyeClosedFrames = 1;
        } else if (currentEyeState === 'closed') {
            eyeClosedFrames++;
        } else if (currentEyeState === 'open' && lastEyeState === 'closed') {
            // Blink detected
            if (eyeClosedFrames >= 2 && eyeClosedFrames <= 10) {
                blinkCount++;
                const now = Date.now();
                const timeDiff = now - lastBlinkTime;
                
                if (timeDiff > 0) {
                    const blinkRate = 60000 / timeDiff;
                    blinkRates.push(blinkRate);
                    
                    if (blinkRates.length > 10) {
                        blinkRates.shift();
                    }
                }
                lastBlinkTime = now;
            }
            eyeClosedFrames = 0;
        }
        
        lastEyeState = currentEyeState;
        
        // Calculate average blink rate
        let avgBlinkRate = 0;
        if (blinkRates.length > 0) {
            avgBlinkRate = blinkRates.reduce((a, b) => a + b, 0) / blinkRates.length;
        }
        
        // Calculate drowsiness
        if (avgBlinkRate < 10 || eyeClosedFrames > 15) {
            drowsinessLevel = Math.min(100, drowsinessLevel + 2);
        } else {
            drowsinessLevel = Math.max(0, drowsinessLevel - 1);
        }
        
        // Check for alerts
        const now = Date.now();
        if (drowsinessLevel > 70 && now - lastAlertTime > 10000) {
            showNotification('Drowsiness Alert!', 'You appear to be drowsy. Take a break!');
            lastAlertTime = now;
        } else if (avgBlinkRate < 12 && avgBlinkRate > 0 && now - lastAlertTime > 30000) {
            showNotification('Low Blink Rate', 'Your blink rate is low. Remember to blink more frequently.');
            lastAlertTime = now;
        }
        
        // Update metrics display
        updateMetrics(avgBlinkRate, drowsinessLevel, eyesDetected, eyeClosedFrames);
        
        // Add status text on canvas
        cv.putText(src, `Faces: ${faces.size()} Eyes: ${eyesDetected} Blinks: ${blinkCount}`, 
                  new cv.Point(10, 30), cv.FONT_HERSHEY_SIMPLEX, 0.6, [255, 255, 255, 255], 2);
        
        cv.putText(src, `Blink Rate: ${avgBlinkRate.toFixed(1)} bpm`, 
                  new cv.Point(10, 60), cv.FONT_HERSHEY_SIMPLEX, 0.6, [255, 255, 255, 255], 2);
        
        cv.putText(src, `Drowsiness: ${drowsinessLevel.toFixed(0)}%`, 
                  new cv.Point(10, 90), cv.FONT_HERSHEY_SIMPLEX, 0.6, [255, 255, 255, 255], 2);
        
        // Display result
        cv.imshow('canvasOutput', src);
        
        // Clean up vectors
        faces.delete();
        eyes.delete();
        
        // Continue processing
        const delay = 1000 / 30 - (Date.now() - begin);
        setTimeout(processVideo, Math.max(0, delay));
        
    } catch (err) {
        console.error('Processing error:', err);
        updateStatus('Processing error: ' + err.message);
        
        // Try to recover
        setTimeout(processVideo, 1000);
    }
}

// Update metrics display
function updateMetrics(blinkRate, drowsiness, eyesDetected, eyeClosedFrames) {
    // Update blink rate display
    const blinkRateElement = document.querySelector('.blink-value');
    if (blinkRateElement) {
        blinkRateElement.textContent = blinkRate.toFixed(1);
    }
    
    // Update drowsiness display
    const drowsinessElement = document.querySelector('.drowsiness-value');
    if (drowsinessElement) {
        drowsinessElement.textContent = drowsiness.toFixed(0) + '%';
        
        // Update color based on drowsiness level
        const parent = drowsinessElement.parentElement;
        if (parent) {
            if (drowsiness > 70) {
                parent.style.backgroundColor = 'rgba(220, 53, 69, 0.8)';
            } else if (drowsiness > 50) {
                parent.style.backgroundColor = 'rgba(255, 193, 7, 0.8)';
            } else {
                parent.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            }
        }
    }
    
    // Update side panel metrics
    document.querySelectorAll('.list-group-item .badge').forEach((badge, index) => {
        switch (index) {
            case 0: // Blink Rate
                badge.textContent = blinkRate.toFixed(1) + ' bpm';
                break;
            case 1: // Blink Duration
                badge.textContent = (eyeClosedFrames * 33).toFixed(0) + ' ms';
                break;
            case 2: // Drowsiness Level
                badge.textContent = drowsiness.toFixed(0) + '%';
                badge.className = 'badge ' + 
                    (drowsiness > 70 ? 'bg-danger' :
                     drowsiness > 50 ? 'bg-warning' :
                     'bg-success') + ' rounded-pill';
                break;
            case 3: // PERCLOS
                const perclos = Math.min(100, eyeClosedFrames * 3);
                badge.textContent = perclos.toFixed(0) + '%';
                break;
        }
    });
    
    // Update total blink count
    const totalBlinksElement = document.querySelector('.total-blinks');
    if (totalBlinksElement) {
        totalBlinksElement.textContent = blinkCount;
    }
    
    // Send data to analytics if available
    if (typeof eyeHealthAnalytics !== 'undefined' && eyeHealthAnalytics) {
        eyeHealthAnalytics.recordBlinkData(blinkRate);
        eyeHealthAnalytics.recordDrowsinessData(drowsiness);
        
        if (blinkRate < 12 || drowsiness > 50) {
            const severity = drowsiness > 70 ? 'high' : blinkRate < 10 ? 'high' : 'medium';
            const cause = drowsiness > 50 ? 'drowsiness' : 'low_blink_rate';
            eyeHealthAnalytics.recordEyeStrain(severity, cause);
        }
    }
}

// Show notification
function showNotification(title, message) {
    // Browser notification
    if ("Notification" in window) {
        if (Notification.permission === "granted") {
            new Notification(title, { body: message });
        } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then(function (permission) {
                if (permission === "granted") {
                    new Notification(title, { body: message });
                }
            });
        }
    }
    
    // Visual notification
    const alertsContainer = document.getElementById('alertsContainer');
    if (alertsContainer) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-warning alert-dismissible fade show';
        alertDiv.innerHTML = `
            <strong>${title}</strong> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        alertsContainer.appendChild(alertDiv);
        
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }
    
    // Record alert in analytics
    if (typeof eyeHealthAnalytics !== 'undefined' && eyeHealthAnalytics) {
        eyeHealthAnalytics.recordAlert(title.toLowerCase().replace(/\s+/g, '_'), message);
    }
}

// Update status message
function updateStatus(message) {
    console.log('Status:', message);
    
    const statusElement = document.getElementById('status');
    if (statusElement) {
        statusElement.textContent = message;
    }
}

// Handle OpenCV ready
function onOpenCvReady() {
    console.log('OpenCV.js is ready');
    updateStatus('OpenCV.js loaded');
    
    if (!initElements()) {
        return;
    }
    
    // Handle camera toggle button
    const trackingButton = document.querySelector('.tracking-toggle');
    if (trackingButton) {
        trackingButton.addEventListener('click', function() {
            if (!streaming) {
                startCamera();
                this.innerHTML = '<i class="bi bi-pause-circle"></i> Pause Tracking';
                
                const statusBadge = document.querySelector('.tracking-status');
                if (statusBadge) {
                    statusBadge.className = 'badge bg-success tracking-status';
                    statusBadge.textContent = 'Tracking Active';
                }
            } else {
                stopCamera();
                this.innerHTML = '<i class="bi bi-play-circle"></i> Start Tracking';
                
                const statusBadge = document.querySelector('.tracking-status');
                if (statusBadge) {
                    statusBadge.className = 'badge bg-secondary tracking-status';
                    statusBadge.textContent = 'Tracking Stopped';
                }
            }
        });
    }
    
    // Request notification permission
    if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing elements...');
    
    // Check if OpenCV is already loaded
    if (typeof cv !== 'undefined') {
        console.log('OpenCV.js is ready');
        onOpenCvReady();
    } else {
        console.log('Waiting for OpenCV.js to load...');
    }
});

// Global function for OpenCV callback
window.onOpenCvReady = onOpenCvReady;