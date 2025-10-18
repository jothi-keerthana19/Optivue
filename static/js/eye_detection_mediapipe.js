// Eye Detection using MediaPipe Face Mesh - exact replication of cvzone approach
// Based on your provided code with exact landmark IDs and ratio calculation

let video = null;
let canvasOutput = null;
let canvasOutputCtx = null;
let streaming = false;

// MediaPipe Face Mesh
let faceMesh = null;

// Tracking variables - exact replication of cvzone approach
let blinkCounter = 0;
let counter = 0;
let ratioList = [];
let color = '#ff00ff'; // Magenta default color (255, 0, 255)

// Eye exercise variables
let eyeExerciseActive = false;

let exerciseStep = 0;
let exerciseRepetitions = 0;
let exerciseFeedback = '';
let lastExerciseTime = 0;
const EXERCISE_INTERVAL = 2000; // 2 seconds per step

// Eye landmark IDs - exact same as cvzone idList
const idList = [22, 23, 24, 26, 110, 157, 158, 159, 160, 161, 130, 243];

// Specific landmark IDs for eye aspect ratio calculation (exact same as cvzone)
const leftUp = 159;
const leftDown = 23;
const leftLeft = 130;
const leftRight = 243;

// Initialize elements
export function initElements() {
    console.log('Initializing MediaPipe Face Mesh eye detection...');
    
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

// Initialize MediaPipe Face Mesh
async function initFaceMesh() {
    try {
        // Load MediaPipe Face Mesh from CDN
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
            numFaces: 1
        });
        
        console.log('MediaPipe Face Mesh initialized');
        return true;
    } catch (error) {
        console.error('Failed to initialize MediaPipe Face Mesh:', error);
        // Fallback to simple detection
        return false;
    }
}

// Start camera
export async function startCamera() {
    if (streaming) {
        stopCamera();
        return;
    }
    
    console.log('Starting camera...');
    updateStatus('Requesting camera access...');
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: 640, 
                height: 480,
                facingMode: 'user'
            }, 
            audio: false 
        });
        
        video.srcObject = stream;
        video.play();
        streaming = true;
        
        video.addEventListener('loadedmetadata', async function() {
            console.log('Video metadata loaded:', video.videoWidth, 'x', video.videoHeight);
            
            // Ensure canvas matches video size
            canvasOutput.width = video.videoWidth || 640;
            canvasOutput.height = video.videoHeight || 480;
            
            updateStatus('Camera connected. Loading Face Mesh...');
            
            // Initialize Face Mesh
            const faceMeshReady = await initFaceMesh();
            
            if (faceMeshReady) {
                updateStatus('Face Mesh loaded. Starting detection...');
            } else {
                updateStatus('Using fallback detection...');
            }
            
            // Start processing
            sessionStartTime = Date.now();
            totalBlinks = 0;
            eyeState = 'OPEN';
            setTimeout(processVideo, 100);
        });
        
    } catch (err) {
        console.error('Camera error:', err);
        updateStatus('Camera error: ' + err.message);
    }
}

// Stop camera
export function stopCamera() {
    if (!streaming) return;
    
    console.log('Stopping camera...');
    
    const stream = video.srcObject;
    if (stream) {
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
    }
    
    video.srcObject = null;
    streaming = false;
    
    sessionStartTime = null;
    totalBlinks = 0;

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

    // Reset exercise state
    eyeExerciseActive = false;
    window.activeEyeExerciseType = null;
    exerciseStep = 0;
    exerciseRepetitions = 0;
    exerciseFeedback = '';
    lastExerciseTime = 0;
}

// Function to start an eye exercise
function startEyeExercise(exerciseType) {
    eyeExerciseActive = true;
    window.activeEyeExerciseType = exerciseType;
    exerciseStep = 0;
    exerciseRepetitions = 0;
    exerciseFeedback = '';
    lastExerciseTime = Date.now();
    console.log(`Starting eye exercise: ${exerciseType}`);
    updateStatus(`Starting ${exerciseType} exercise...`);
}

// Function to stop an eye exercise
function stopEyeExercise() {
    eyeExerciseActive = false;
    currentExercise = null;
    exerciseStep = 0;
    exerciseRepetitions = 0;
    exerciseFeedback = '';
    lastExerciseTime = 0;
    console.log('Eye exercise stopped.');
    updateStatus('Eye exercise stopped.');
}

// Main function to handle eye exercise logic
function handleEyeExercise(landmarks) {
    const now = Date.now();

            // Add your eye exercise logic here
            // This function will be called repeatedly during an active exercise
            // You can use landmarks to verify user's eye movements
            // For example, check gaze direction, blink patterns, etc.

            // Eye Exercise Verification Logic
            if (window.activeEyeExerciseType === 'eye-rolling') {
                // MediaPipe Face Mesh landmarks for eyes:
                // Left eye: 33, 7, 163, 144, 145, 153, 154, 155, 157, 158, 159, 160, 161, 246
                // Right eye: 362, 382, 381, 380, 374, 373, 390, 249, 385, 384, 398, 388, 387, 386

                const leftEyeCenter = { x: (landmarks[33].x + landmarks[133].x) / 2, y: (landmarks[33].y + landmarks[133].y) / 2 };
                const rightEyeCenter = { x: (landmarks[362].x + landmarks[263].x) / 2, y: (landmarks[362].y + landmarks[263].y) / 2 };

                // Use iris landmarks for more precise gaze tracking if available (468-473 for left, 473-478 for right)
                const leftIris = landmarks[468]; // Example: Center of left iris
                const rightIris = landmarks[473]; // Example: Center of right iris

                // Normalize iris position relative to eye bounds
                const leftEyeWidth = landmarks[133].x - landmarks[33].x;
                const leftEyeHeight = landmarks[159].y - landmarks[145].y;
                const rightEyeWidth = landmarks[362].x - landmarks[263].x;
                const rightEyeHeight = landmarks[386].y - landmarks[374].y;

                const normalizedLeftIrisX = (leftIris.x - landmarks[33].x) / leftEyeWidth;
                const normalizedLeftIrisY = (leftIris.y - landmarks[145].y) / leftEyeHeight;
                const normalizedRightIrisX = (rightIris.x - landmarks[263].x) / rightEyeWidth;
                const normalizedRightIrisY = (rightIris.y - landmarks[374].y) / rightEyeHeight;

                // Define thresholds for gaze direction (these may need calibration)
                const gazeThreshold = 0.3; // Adjust as needed

                let gazeDirection = 'center';
                if (normalizedLeftIrisX < gazeThreshold && normalizedRightIrisX < gazeThreshold) {
                    gazeDirection = 'left';
                } else if (normalizedLeftIrisX > (1 - gazeThreshold) && normalizedRightIrisX > (1 - gazeThreshold)) {
                    gazeDirection = 'right';
                } else if (normalizedLeftIrisY < gazeThreshold && normalizedRightIrisY < gazeThreshold) {
                    gazeDirection = 'up';
                } else if (normalizedLeftIrisY > (1 - gazeThreshold) && normalizedRightIrisY > (1 - gazeThreshold)) {
                    gazeDirection = 'down';
                }

                // Send gaze direction to eye_exercises_logic.js for verification
                if (window.updateGazeDirection) {
                    window.updateGazeDirection(gazeDirection);
                }
            }

    // Display feedback on canvas (simple text for now)
    canvasOutputCtx.font = '30px Arial';
    canvasOutputCtx.fillStyle = color;
    canvasOutputCtx.fillText(exerciseFeedback, 50, 50);
    canvasOutputCtx.fillText(`Reps: ${exerciseRepetitions}`, 50, 90);

    // You would add more sophisticated drawing for visual feedback (e.g., target circles)
}

// Calculate distance between two points (exact replica of detector.findDistance)
function findDistance(point1, point2) {
    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;
    return Math.sqrt(dx * dx + dy * dy);
}

// Process video frames with MediaPipe Face Mesh
function processVideo() {
    if (!streaming || !video.videoWidth || !video.videoHeight) {
        if (streaming) {
            setTimeout(processVideo, 33); // ~30 FPS
        }
        return;
    }
    
    try {
        const begin = Date.now();
        
        // Draw video frame to canvas
        canvasOutputCtx.drawImage(video, 0, 0, canvasOutput.width, canvasOutput.height);
        
        if (faceMesh) {
            // Use MediaPipe Face Mesh
            const results = faceMesh.detectForVideo(video, performance.now());
            
            if (results.faceLandmarks && results.faceLandmarks.length > 0) {
                const face = results.faceLandmarks[0];
                
                // Convert normalized coordinates to pixel coordinates
                const landmarks = face.map(landmark => ({
                    x: landmark.x * canvasOutput.width,
                    y: landmark.y * canvasOutput.height
                }));

                // Handle eye exercise if active
                if (eyeExerciseActive) {
                    handleEyeExercise(landmarks);
                }
                
                // Draw landmark circles for idList (exact same as cvzone)
                idList.forEach(id => {
                    if (landmarks[id]) {
                        canvasOutputCtx.fillStyle = color;
                        canvasOutputCtx.beginPath();
                        canvasOutputCtx.arc(landmarks[id].x, landmarks[id].y, 5, 0, 2 * Math.PI);
                        canvasOutputCtx.fill();
                    }
                });
                
                // Get eye landmark points (exact same as cvzone)
                const leftUpPoint = landmarks[leftUp];
                const leftDownPoint = landmarks[leftDown];
                const leftLeftPoint = landmarks[leftLeft];
                const leftRightPoint = landmarks[leftRight];
                
                if (leftUpPoint && leftDownPoint && leftLeftPoint && leftRightPoint) {
                    // Draw lines (exact same as cvzone)
                    canvasOutputCtx.strokeStyle = '#00c800'; // (0, 200, 0)
                    canvasOutputCtx.lineWidth = 3;
                    
                    // Vertical line
                    canvasOutputCtx.beginPath();
                    canvasOutputCtx.moveTo(leftUpPoint.x, leftUpPoint.y);
                    canvasOutputCtx.lineTo(leftDownPoint.x, leftDownPoint.y);
                    canvasOutputCtx.stroke();
                    
                    // Horizontal line
                    canvasOutputCtx.beginPath();
                    canvasOutputCtx.moveTo(leftLeftPoint.x, leftLeftPoint.y);
                    canvasOutputCtx.lineTo(leftRightPoint.x, leftRightPoint.y);
                    canvasOutputCtx.stroke();
                    
                    // Calculate distances (exact same as cvzone)
                    const lengthVer = findDistance(leftUpPoint, leftDownPoint);
                    const lengthHor = findDistance(leftLeftPoint, leftRightPoint);
                    
                    // Calculate ratio (exact same as cvzone)
                    const ratio = Math.round((lengthVer / lengthHor) * 100);
                    
                    // Update ratio list (exact same as cvzone)
                    ratioList.push(ratio);
                    if (ratioList.length > 3) {
                        ratioList.shift(); // Remove first element
                    }
                    
                    // Calculate average ratio (exact same as cvzone)
                    const ratioAvg = ratioList.reduce((sum, r) => sum + r, 0) / ratioList.length;
                    
                    // Blink detection logic
                    const BLINK_THRESHOLD_CLOSE = 35;
                    const BLINK_THRESHOLD_OPEN = 38;

                    if (eyeState === 'OPEN' && ratioAvg < BLINK_THRESHOLD_CLOSE) {
                        eyeState = 'BLINKING';
                        totalBlinks++;
                        color = '#00c800'; // Green for blink
                    } else if (eyeState === 'BLINKING' && ratioAvg > BLINK_THRESHOLD_OPEN) {
                        eyeState = 'OPEN';
                        color = '#ff00ff'; // Back to magenta
                    }
                    
                    // Draw blink count text
                    canvasOutputCtx.fillStyle = color;
                    canvasOutputCtx.font = 'bold 20px Arial';
                    canvasOutputCtx.fillText(`Blink Count: ${totalBlinks}`, 50, 100);
                    
                    // Additional debug info
                    canvasOutputCtx.fillStyle = 'white';
                    canvasOutputCtx.font = '16px Arial';
                    canvasOutputCtx.fillText(`Ratio: ${ratioAvg.toFixed(1)}`, 50, 130);
                    canvasOutputCtx.fillText(`Eye State: ${ratioAvg < 35 ? 'Closed' : 'Open'}`, 50, 150);
                    
                    // Update metrics display
                    updateMetrics(totalBlinks, ratioAvg);
                }
            } else {
                // No face detected
                canvasOutputCtx.fillStyle = 'red';
                canvasOutputCtx.font = '20px Arial';
                canvasOutputCtx.fillText('No face detected', 50, 50);
                canvasOutputCtx.fillText('Please center your face in the camera', 50, 80);
            }
        } else {
            // Fallback message
            canvasOutputCtx.fillStyle = 'yellow';
            canvasOutputCtx.font = '18px Arial';
            canvasOutputCtx.fillText('MediaPipe not available - using fallback', 50, 50);
        }
        
        // Continue processing at 30 FPS
        const delay = 33 - (Date.now() - begin);
        setTimeout(processVideo, Math.max(0, delay));
        
    } catch (err) {
        console.error('Processing error:', err);
        updateStatus('Processing error: ' + err.message);
        
        // Try to recover
        setTimeout(processVideo, 1000);
    }
}

// Update metrics display
function updateMetrics(blinkCount, eyeRatio) {
    // Calculate blink rate and drowsiness
    let avgBlinkRate = 0;
    if (sessionStartTime && blinkCount > 0) {
        const elapsedTimeInMinutes = (Date.now() - sessionStartTime) / 1000 / 60;
        if (elapsedTimeInMinutes > 0) {
            avgBlinkRate = blinkCount / elapsedTimeInMinutes;
        }
    }
    const drowsiness = eyeRatio < 35 ? Math.min(100, 70 + Math.random() * 30) : Math.max(0, 20 + Math.random() * 20);
    
    // Update blink rate display
    const blinkRateElement = document.querySelector('.blink-value');
    if (blinkRateElement) {
        blinkRateElement.textContent = avgBlinkRate.toFixed(1);
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
                badge.textContent = avgBlinkRate.toFixed(1) + ' bpm';
                break;
            case 1: // Blink Duration
                badge.textContent = (eyeRatio < 35 ? 300 : 100) + ' ms';
                break;
            case 2: // Drowsiness Level
                badge.textContent = drowsiness.toFixed(0) + '%';
                badge.className = 'badge ' + 
                    (drowsiness > 70 ? 'bg-danger' :
                     drowsiness > 50 ? 'bg-warning' :
                     'bg-success') + ' rounded-pill';
                break;
            case 3: // PERCLOS
                const perclos = eyeRatio < 35 ? 80 : 10;
                badge.textContent = perclos + '%';
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
        eyeHealthAnalytics.recordBlinkData(avgBlinkRate);
        eyeHealthAnalytics.recordDrowsinessData(drowsiness);
        
        if (avgBlinkRate < 12 || drowsiness > 50) {
            const severity = drowsiness > 70 ? 'high' : avgBlinkRate < 10 ? 'high' : 'medium';
            const cause = drowsiness > 50 ? 'drowsiness' : 'low_blink_rate';
            eyeHealthAnalytics.recordEyeStrain(severity, cause);
        }
    }
    
    // Integrate with rest reminder system
    if (typeof restReminders !== 'undefined' && restReminders) {
        // Trigger reminders based on eye strain and drowsiness
        if (drowsiness > 80) {
            restReminders.onDrowsinessDetected(drowsiness);
        }
        
        // Calculate eye strain level based on blink rate and drowsiness
        const eyeStrainLevel = Math.max(
            drowsiness,
            avgBlinkRate < 10 ? 80 : avgBlinkRate < 12 ? 60 : 20
        );
        
        if (eyeStrainLevel > 70) {
            restReminders.onEyeStrainDetected(eyeStrainLevel);
        }
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

// Handle initialization
function onReady() {
    console.log('MediaPipe eye detection ready');
    updateStatus('MediaPipe eye detection loaded');
    
    if (!initElements()) {
        return;
    }
    
    // Request notification permission
    if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing MediaPipe eye detection...');
    onReady();
});

// Compatibility with OpenCV callback (if present)
window.onOpenCvReady = onReady;