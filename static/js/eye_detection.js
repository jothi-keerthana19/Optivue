
// Eye Detection using OpenCV.js with Face Mesh Landmarks for Blink Detection

let video = null;
let canvasOutput = null;
let canvasOutputCtx = null;
let src = null;
let dstC1 = null;
let dstC3 = null;
let dstC4 = null;
let streaming = false;

let faceClassifier = null;
let eyeClassifier = null;

let blinkCount = 0;
let counter = 0;
let ratioList = [];
let lastEyeState = 'open';
let eyeClosedFrames = 0;
let lastBlinkTime = Date.now();
let blinkRates = [];

let drowsinessLevel = 0;
let lastAlertTime = 0;

// Track if OpenCV has been initialized to prevent double initialization
let isOpenCVInitialized = false;

// Eye aspect ratio tracking variables (similar to cvzone approach)
let eyeAspectRatios = [];
let blinkThreshold = 35; // Similar to the ratio threshold in cvzone code
let blinkFrameCounter = 0;
let isBlinking = false;

// Initialize the video and canvas elements
function initElements() {
    video = document.getElementById('videoInput');
    canvasOutput = document.getElementById('canvasOutput');

    if (!canvasOutput) {
        console.error('Canvas output element not found');
        return;
    }

    // Set initial canvas size
    canvasOutput.width = 640;  // Default width
    canvasOutput.height = 480; // Default height

    canvasOutputCtx = canvasOutput.getContext('2d');

    // Clear the canvas
    canvasOutputCtx.clearRect(0, 0, canvasOutput.width, canvasOutput.height);

    // Add status text while loading OpenCV
    canvasOutputCtx.font = '18px Arial';
    canvasOutputCtx.fillStyle = 'white';
    canvasOutputCtx.fillText('Loading OpenCV...', 20, 40);
}

// Setup event listeners for UI elements
function setupEventListeners() {
    const trackingButton = document.querySelector('.tracking-toggle');
    if (trackingButton) {
        trackingButton.addEventListener('click', function() {
            const isStarting = this.innerHTML.includes('Start');

            if (isStarting) {
                this.innerHTML = '<i class="bi bi-stop-circle"></i> Stop Tracking';
                startCamera();

                // Update status badge
                const statusBadge = document.querySelector('.tracking-status');
                if (statusBadge) {
                    statusBadge.className = 'badge bg-success tracking-status';
                    statusBadge.textContent = 'Tracking Active';
                }
            } else {
                this.innerHTML = '<i class="bi bi-play-circle"></i> Start Tracking';
                stopCamera();

                // Update status badge
                const statusBadge = document.querySelector('.tracking-status');
                if (statusBadge) {
                    statusBadge.className = 'badge bg-secondary tracking-status';
                    statusBadge.textContent = 'Tracking Stopped';
                }
            }
        });
    }
}

// Start the video capture
function startCamera() {
    if (!streaming) {
        updateStatus('Requesting camera access...');

        // Check if getUserMedia is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            updateStatus('Camera access not supported in this browser');
            return;
        }

        navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 640 }, 
                height: { ideal: 480 },
                facingMode: 'user' 
            }, 
            audio: false 
        })
        .then(function(stream) {
            video.srcObject = stream;

            video.addEventListener('loadedmetadata', function() {
                console.log('Video metadata loaded:', video.videoWidth, 'x', video.videoHeight);

                // Update canvas size to match video
                canvasOutput.width = video.videoWidth || 640;
                canvasOutput.height = video.videoHeight || 480;

                updateStatus('Camera connected. Loading models...');
                loadClassifiers();
            }, { once: true });

            video.play().then(() => {
                streaming = true;
                console.log('Video started successfully');
            }).catch(err => {
                console.error('Error starting video:', err);
                updateStatus('Error starting video: ' + err.message);
            });
        })
        .catch(function(err) {
            console.error('Camera access error:', err);
            let errorMessage = 'Camera access denied';

            if (err.name === 'NotFoundError') {
                errorMessage = 'No camera found';
            } else if (err.name === 'NotAllowedError') {
                errorMessage = 'Camera access denied. Please allow camera access and refresh.';
            } else if (err.name === 'NotReadableError') {
                errorMessage = 'Camera is being used by another application';
            }

            updateStatus(errorMessage);
        });
    }
}

// Stop the video capture
function stopCamera() {
    if (streaming) {
        const stream = video.srcObject;
        const tracks = stream.getTracks();

        tracks.forEach(function(track) {
            track.stop();
        });

        video.srcObject = null;
        streaming = false;

        // Clean up OpenCV resources
        if (src) {
            src.delete();
            dstC1.delete();
            dstC3.delete();
            if (dstC4) dstC4.delete();
            src = null;
            dstC1 = null;
            dstC3 = null;
            dstC4 = null;
        }

        // Reset blink detection variables
        ratioList = [];
        eyeAspectRatios = [];
        blinkFrameCounter = 0;
        isBlinking = false;
        counter = 0;

        updateStatus('Camera stopped');

        // Clear canvas
        canvasOutputCtx.clearRect(0, 0, canvasOutput.width, canvasOutput.height);

        // Update UI elements
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
}

// Load the face and eye classifiers
function loadClassifiers() {
    updateStatus('Loading face classifier...');

    try {
        // Load the face classifier
        faceClassifier = new cv.CascadeClassifier();
        faceClassifier.load('haarcascade_frontalface_alt2');

        updateStatus('Loading eye classifier...');

        // Load the eye classifier
        eyeClassifier = new cv.CascadeClassifier();
        eyeClassifier.load('haarcascade_eye');

        updateStatus('Classifiers loaded. Starting detection...');

        // Start processing
        setTimeout(processVideo, 0);
    } catch (error) {
        console.error('Error loading classifiers:', error);
        updateStatus('Error loading classifiers. Using backup method...');

        // Try alternative loading method
        loadClassifiersAlternative();
    }
}

// Alternative method for loading classifiers
function loadClassifiersAlternative() {
    updateStatus('Loading classifiers (alternative method)...');

    // Create classifiers without explicit loading
    faceClassifier = new cv.CascadeClassifier();
    eyeClassifier = new cv.CascadeClassifier();

    // Load using the embedded OpenCV data
    if (typeof cv !== 'undefined' && cv.FS) {
        try {
            faceClassifier.load('haarcascade_frontalface_alt2');
            eyeClassifier.load('haarcascade_eye');

            updateStatus('Classifiers loaded successfully. Starting detection...');
            setTimeout(processVideo, 0);
        } catch (e) {
            console.error('Alternative loading failed:', e);
            updateStatus('Failed to load classifiers. Camera detection unavailable.');
        }
    } else {
        updateStatus('OpenCV not fully loaded. Please refresh the page.');
    }
}

// Process video frames for eye detection
function processVideo() {
    if (!streaming) {
        return;
    }

    try {
        const begin = Date.now();

        // Ensure video dimensions are valid
        if (!video.videoWidth || !video.videoHeight) {
            setTimeout(processVideo, 100);
            return;
        }

        // Create matrices with proper error handling
        try {
            if (!src || src.rows !== video.videoHeight || src.cols !== video.videoWidth) {
                // Clean up existing matrices
                if (src) {
                    src.delete();
                    dstC1.delete();
                    dstC3.delete();
                    if (dstC4) dstC4.delete();
                }

                // Create new matrices with exact video dimensions
                src = new cv.Mat(video.videoHeight, video.videoWidth, cv.CV_8UC4);
                dstC1 = new cv.Mat(video.videoHeight, video.videoWidth, cv.CV_8UC1);
                dstC3 = new cv.Mat(video.videoHeight, video.videoWidth, cv.CV_8UC3);
                dstC4 = new cv.Mat(video.videoHeight, video.videoWidth, cv.CV_8UC4);
            }

            // Create a temporary canvas to capture video frame
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = video.videoWidth;
            tempCanvas.height = video.videoHeight;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(video, 0, 0);

            // Get image data and create Mat
            const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
            src.data.set(imageData.data);

            // Convert to grayscale
            cv.cvtColor(src, dstC1, cv.COLOR_RGBA2GRAY);

            // Detect faces
            let faces = new cv.RectVector();
            faceClassifier.detectMultiScale(dstC1, faces, 1.1, 3, 0);

            let faceDetected = faces.size() > 0;
            let currentRatio = 50; // Default ratio when no eyes detected

            for (let i = 0; i < faces.size(); ++i) {
                const face = faces.get(i);
                const faceROI = dstC1.roi(face);

                // Draw face rectangle
                const point1 = new cv.Point(face.x, face.y);
                const point2 = new cv.Point(face.x + face.width, face.y + face.height);
                cv.rectangle(src, point1, point2, [0, 255, 0, 255], 2);

                // Detect eyes
                let eyes = new cv.RectVector();
                eyeClassifier.detectMultiScale(faceROI, eyes, 1.1, 3, 0);

                if (eyes.size() >= 2) {
                    // Use the first two detected eyes
                    const leftEye = eyes.get(0);
                    const rightEye = eyes.get(1);

                    // Calculate eye aspect ratios (simplified approach)
                    const leftEyeRatio = (leftEye.height / leftEye.width) * 100;
                    const rightEyeRatio = (rightEye.height / rightEye.width) * 100;
                    currentRatio = (leftEyeRatio + rightEyeRatio) / 2;

                    // Draw eye rectangles
                    const leftEyePoint1 = new cv.Point(face.x + leftEye.x, face.y + leftEye.y);
                    const leftEyePoint2 = new cv.Point(face.x + leftEye.x + leftEye.width, face.y + leftEye.y + leftEye.height);
                    cv.rectangle(src, leftEyePoint1, leftEyePoint2, [255, 0, 0, 255], 2);

                    const rightEyePoint1 = new cv.Point(face.x + rightEye.x, face.y + rightEye.y);
                    const rightEyePoint2 = new cv.Point(face.x + rightEye.x + rightEye.width, face.y + rightEye.y + rightEye.height);
                    cv.rectangle(src, rightEyePoint1, rightEyePoint2, [255, 0, 0, 255], 2);

                    // Draw lines for eye measurement (similar to cvzone)
                    cv.line(src, 
                           new cv.Point(face.x + leftEye.x, face.y + leftEye.y + leftEye.height/2),
                           new cv.Point(face.x + leftEye.x + leftEye.width, face.y + leftEye.y + leftEye.height/2),
                           [0, 200, 0, 255], 2);
                    cv.line(src,
                           new cv.Point(face.x + leftEye.x + leftEye.width/2, face.y + leftEye.y),
                           new cv.Point(face.x + leftEye.x + leftEye.width/2, face.y + leftEye.y + leftEye.height),
                           [0, 200, 0, 255], 2);
                }

                faceROI.delete();
                eyes.delete();
            }

            // Blink detection logic (inspired by cvzone approach)
            ratioList.push(currentRatio);
            if (ratioList.length > 3) {
                ratioList.shift();
            }

            const ratioAvg = ratioList.reduce((a, b) => a + b, 0) / ratioList.length;

            // Blink detection similar to cvzone logic
            let blinkColor = [255, 0, 255, 255]; // Default magenta

            if (ratioAvg < blinkThreshold && counter === 0) {
                blinkCount++;
                blinkColor = [0, 200, 0, 255]; // Green when blink detected
                counter = 1;

                const currentTime = Date.now();
                const timeSinceLastBlink = currentTime - lastBlinkTime;

                if (timeSinceLastBlink > 500) { // At least 500ms between blinks
                    const instantBlinkRate = 60000 / timeSinceLastBlink;
                    blinkRates.push(instantBlinkRate);

                    if (blinkRates.length > 10) {
                        blinkRates.shift();
                    }
                }

                lastBlinkTime = currentTime;
                console.log(`Blink detected! Count: ${blinkCount}, Ratio: ${ratioAvg.toFixed(1)}`);
            }

            if (counter !== 0) {
                counter++;
                if (counter > 10) {
                    counter = 0;
                    blinkColor = [255, 0, 255, 255]; // Back to magenta
                }
            }

            // Calculate average blink rate
            let avgBlinkRate = blinkRates.length > 0 
                ? blinkRates.reduce((a, b) => a + b, 0) / blinkRates.length 
                : 0;

            // Display blink count with colored background (similar to cvzone)
            const textBg = new cv.Rect(50, 70, 200, 40);
            cv.rectangle(src, textBg, blinkColor, -1);
            cv.putText(src, `Blink Count: ${blinkCount}`, new cv.Point(60, 95),
                      cv.FONT_HERSHEY_SIMPLEX, 0.7, [255, 255, 255, 255], 2);

            // Display additional info
            cv.putText(src, `Ratio: ${ratioAvg.toFixed(1)}`, new cv.Point(20, 130),
                      cv.FONT_HERSHEY_SIMPLEX, 0.5, [255, 255, 255, 255], 1);
            cv.putText(src, `Face: ${faceDetected ? 'Yes' : 'No'}`, new cv.Point(20, 150),
                      cv.FONT_HERSHEY_SIMPLEX, 0.5, [255, 255, 255, 255], 1);
            cv.putText(src, `Blink Rate: ${avgBlinkRate.toFixed(1)} bpm`, new cv.Point(20, 170),
                      cv.FONT_HERSHEY_SIMPLEX, 0.5, [255, 255, 255, 255], 1);

            // Calculate drowsiness
            if (avgBlinkRate < 10 || counter > 15) {
                drowsinessLevel = Math.min(100, drowsinessLevel + 5);
            } else {
                drowsinessLevel = Math.max(0, drowsinessLevel - 2);
            }

            // Show alerts if needed
            const now = Date.now();
            if (drowsinessLevel > 70 && now - lastAlertTime > 10000) {
                showNotification('Drowsiness Alert!', 'You appear to be drowsy. Take a break!');
                lastAlertTime = now;
            }

            // Update UI
            updateMetrics(avgBlinkRate, drowsinessLevel, faceDetected ? 2 : 0, counter);

            // Display result
            cv.imshow('canvasOutput', src);

            // Clean up
            faces.delete();

        } catch (matError) {
            console.error('Matrix operation error:', matError);
            // Don't propagate the error, just continue
        }

        // Schedule next frame
        const delay = 1000/30 - (Date.now() - begin);
        setTimeout(processVideo, delay > 0 ? delay : 0);

    } catch (err) {
        console.error('Processing error:', err);
        setTimeout(processVideo, 100);
    }
}

// Update metrics display
function updateMetrics(blinkRate, drowsiness, eyesDetected, blinkFrames) {
    const blinkRateElement = document.querySelector('.blink-value');
    if (blinkRateElement) {
        blinkRateElement.textContent = blinkRate.toFixed(1);
    }

    const drowsinessElement = document.querySelector('.drowsiness-value');
    if (drowsinessElement) {
        drowsinessElement.textContent = drowsiness.toFixed(0) + '%';
        drowsinessElement.parentElement.style.backgroundColor = 
            drowsiness > 70 ? 'rgba(220, 53, 69, 0.8)' :
            drowsiness > 50 ? 'rgba(255, 193, 7, 0.8)' :
            'rgba(0, 0, 0, 0.5)';
    }

    document.querySelectorAll('.list-group-item .badge').forEach((badge, index) => {
        switch (index) {
            case 0:
                badge.textContent = blinkRate.toFixed(1) + ' bpm';
                break;
            case 1:
                badge.textContent = (blinkFrames * 33).toFixed(0) + ' ms';
                break;
            case 2:
                badge.textContent = drowsiness.toFixed(0) + '%';
                badge.className = 'badge ' + 
                    (drowsiness > 70 ? 'bg-danger' :
                     drowsiness > 50 ? 'bg-warning' :
                     'bg-success') + ' rounded-pill';
                break;
            case 3:
                const perclos = Math.min(100, blinkFrames * 3);
                badge.textContent = perclos.toFixed(0) + '%';
                break;
        }
    });

    // Update total blink count display
    const totalBlinksElement = document.querySelector('.total-blinks');
    if (totalBlinksElement) {
        totalBlinksElement.textContent = blinkCount;
    }
    
    // Send data to analytics system if available
    if (typeof eyeHealthAnalytics !== 'undefined' && eyeHealthAnalytics) {
        eyeHealthAnalytics.recordBlinkData(blinkRate);
        eyeHealthAnalytics.recordDrowsinessData(drowsiness);
        
        // Record eye strain event if conditions are met
        if (blinkRate < 12 || drowsiness > 50) {
            const severity = drowsiness > 70 ? 'high' : blinkRate < 10 ? 'high' : 'medium';
            const cause = drowsiness > 50 ? 'drowsiness' : 'low_blink_rate';
            eyeHealthAnalytics.recordEyeStrain(severity, cause);
        }
    }
}

// Show notification
function showNotification(title, message) {
    if (!("Notification" in window)) {
        alert("This browser does not support desktop notifications");
        return;
    }

    if (Notification.permission === "granted") {
        new Notification(title, { body: message });
    } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(function (permission) {
            if (permission === "granted") {
                new Notification(title, { body: message });
            }
        });
    }

    const alertsContainer = document.getElementById('alertsContainer');
    if (alertsContainer) {
        const alertElement = document.createElement('div');
        alertElement.className = 'alert alert-danger alert-dismissible fade show';
        alertElement.innerHTML = `
            <strong>${title}</strong> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;

        alertsContainer.appendChild(alertElement);
        setTimeout(() => {
            alertElement.classList.remove('show');
            setTimeout(() => alertElement.remove(), 150);
        }, 5000);
    }
}

// Update status message
function updateStatus(message) {
    console.log('Status:', message);
    const statusElement = document.getElementById('status');
    if (statusElement) {
        statusElement.textContent = message;
    }

    if (canvasOutput && canvasOutputCtx) {
        canvasOutputCtx.clearRect(0, 0, canvasOutput.width, canvasOutput.height);
        canvasOutputCtx.font = '18px Arial';
        canvasOutputCtx.fillStyle = 'white';
        canvasOutputCtx.fillText(message, 20, 40);
    }
}

// Handle OpenCV.js loaded event
function onOpenCvReady() {
    // Prevent multiple initializations
    if (isOpenCVInitialized) {
        console.log('OpenCV already initialized, skipping...');
        return;
    }

    console.log('OpenCV.js is ready');
    isOpenCVInitialized = true;

    // Wait a bit for OpenCV to fully initialize
    setTimeout(() => {
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.textContent = 'OpenCV.js loaded successfully. Click Start Tracking to begin.';
        }

        if (canvasOutput && canvasOutputCtx) {
            canvasOutputCtx.clearRect(0, 0, canvasOutput.width, canvasOutput.height);
            canvasOutputCtx.font = '18px Arial';
            canvasOutputCtx.fillStyle = 'white';
            canvasOutputCtx.fillText('OpenCV.js loaded successfully. Click Start Tracking to begin.', 20, 40);
        }

        console.log('OpenCV initialization complete');
    }, 100);
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing elements...');
    initElements();
    setupEventListeners();

    // Set up OpenCV loading check
    const checkOpenCVInterval = setInterval(() => {
        if (typeof cv !== 'undefined' && cv.Mat && !isOpenCVInitialized) {
            console.log('OpenCV now available');
            clearInterval(checkOpenCVInterval);
            onOpenCvReady();
        }
    }, 100);

    // Timeout after 10 seconds
    setTimeout(() => {
        clearInterval(checkOpenCVInterval);
        if (!isOpenCVInitialized) {
            console.error('OpenCV failed to load within 10 seconds');
            updateStatus('Failed to load OpenCV. Please refresh the page.');
        }
    }, 10000);
});
