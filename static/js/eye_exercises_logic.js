// Exercise definitions
const exercises = {
    'twenty-twenty-twenty': {
        name: '20-20-20 Exercise',
        description: 'Every 20 minutes, look at something 20 feet away for 20 seconds.',
        duration: 120, // 2 minutes in seconds
        steps: [
            { text: 'Find an object about 20 feet away to focus on', duration: 10, tracking: { type: 'gaze_zone', target: 'far' } },
            { text: 'Look at the object and focus on its details', duration: 20, tracking: { type: 'gaze_zone', target: 'far', accuracy: 0.8 } },
            { text: 'Slowly blink 5 times while maintaining focus', duration: 10, tracking: { type: 'blink_count', target: 5 } },
            { text: 'Close your eyes and rest for 5 seconds', duration: 5, tracking: { type: 'eyes_closed', accuracy: 0.9 } },
            { text: 'Open your eyes and focus on the object again', duration: 20, tracking: { type: 'gaze_zone', target: 'far', accuracy: 0.8 } },
            { text: 'Look at something nearby for 10 seconds', duration: 10, tracking: { type: 'gaze_zone', target: 'near', accuracy: 0.8 } },
            { text: 'Look back at the distant object for 20 seconds', duration: 20, tracking: { type: 'gaze_zone', target: 'far', accuracy: 0.8 } },
            { text: 'Blink rapidly for 5 seconds', duration: 5, tracking: { type: 'blink_rapid', accuracy: 0.7 } },
            { text: 'Close your eyes and rest', duration: 20, tracking: { type: 'eyes_closed', accuracy: 0.9 } }
        ],
        trackingZones: {
            far: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 },
            near: { x: 0.3, y: 0.3, width: 0.4, height: 0.4 }
        },
        animation: function(step) {
            const animationDiv = document.getElementById('animation');

            // This function will be called by WebGazer to get the expected gaze
            window.getCurrentExpectedGaze = function() {
                if (currentExercise && currentStepIndex < currentExercise.steps.length) {
                    return currentExercise.steps[currentStepIndex].expectedGaze;
                }
                return null;
            };
            
            if (step === 0) {
                // Initialize animation
                animationDiv.innerHTML = `
                    <div class="position-relative">
                        <i class="bi bi-person" style="font-size: 3rem; color: #3a86ff; position: absolute; left: 20px; top: 50px;"></i>
                        <i class="bi bi-arrow-right" style="font-size: 2rem; color: #777; position: absolute; left: 80px; top: 55px;"></i>
                        <i class="bi bi-tree" style="font-size: 3rem; color: #2a9d8f; position: absolute; right: 20px; top: 50px;"></i>
                        <div style="margin-top: 120px;">Look at something 20 feet away</div>
                    </div>
                `;
            } else if (step === 1 || step === 4 || step === 6) {
                // Focus on distant object
                animationDiv.innerHTML = `
                    <div class="position-relative">
                        <i class="bi bi-person" style="font-size: 3rem; color: #3a86ff; position: absolute; left: 20px; top: 50px;"></i>
                        <i class="bi bi-arrow-right" style="font-size: 2rem; color: #777; position: absolute; left: 80px; top: 55px;"></i>
                        <i class="bi bi-tree" style="font-size: 3rem; color: #2a9d8f; position: absolute; right: 20px; top: 50px;"></i>
                        <div class="position-absolute" style="right: 30px; top: 30px; width: 40px; height: 40px; border: 2px solid red; border-radius: 50%; animation: pulse 1s infinite;"></div>
                        <div style="margin-top: 120px;">Focus on the distant object</div>
                    </div>
                `;
            } else if (step === 2) {
                // Blink while focusing
                animationDiv.innerHTML = `
                    <div class="position-relative">
                        <i class="bi bi-person" style="font-size: 3rem; color: #3a86ff; position: absolute; left: 20px; top: 50px;"></i>
                        <i class="bi bi-arrow-right" style="font-size: 2rem; color: #777; position: absolute; left: 80px; top: 55px;"></i>
                        <i class="bi bi-tree" style="font-size: 3rem; color: #2a9d8f; position: absolute; right: 20px; top: 50px;"></i>
                        <div style="margin-top: 120px;">Blink slowly 5 times</div>
                    </div>
                `;
            } else if (step === 3 || step === 8) {
                // Close eyes and rest
                animationDiv.innerHTML = `
                    <div class="position-relative">
                        <i class="bi bi-person" style="font-size: 3rem; color: #3a86ff; position: absolute; left: 20px; top: 50px;"></i>
                        <div style="position: absolute; left: 25px; top: 55px; width: 30px; height: 8px; background-color: #3a86ff; border-radius: 5px;"></div>
                        <div style="margin-top: 120px;">Close your eyes and rest</div>
                    </div>
                `;
            } else if (step === 5) {
                // Look at something nearby
                animationDiv.innerHTML = `
                    <div class="position-relative">
                        <i class="bi bi-person" style="font-size: 3rem; color: #3a86ff; position: absolute; left: 20px; top: 50px;"></i>
                        <i class="bi bi-arrow-right" style="font-size: 2rem; color: #777; position: absolute; left: 80px; top: 55px;"></i>
                        <i class="bi bi-book" style="font-size: 2rem; color: #e76f51; position: absolute; left: 120px; top: 55px;"></i>
                        <div class="position-absolute" style="left: 125px; top: 45px; width: 30px; height: 30px; border: 2px solid red; border-radius: 50%; animation: pulse 1s infinite;"></div>
                        <div style="margin-top: 120px;">Look at something nearby</div>
                    </div>
                `;
            } else if (step === 7) {
                // Blink rapidly
                animationDiv.innerHTML = `
                    <div class="position-relative">
                        <i class="bi bi-person" style="font-size: 3rem; color: #3a86ff; position: absolute; left: 20px; top: 50px;"></i>
                        <div style="position: absolute; left: 25px; top: 55px; width: 30px; height: 8px; background-color: #3a86ff; border-radius: 5px; animation: blink 0.5s infinite;"></div>
                        <div style="margin-top: 120px;">Blink rapidly</div>
                    </div>
                `;
            }
        }
    },
    'focus-change': {
        name: 'Focus Change Exercise',
        description: 'Alternating focus between near and far objects to exercise eye muscles.',
        duration: 180, // 3 minutes in seconds
        steps: [
            { text: 'Hold your thumb about 10 inches from your face', duration: 10, tracking: { type: 'setup' } },
            { text: 'Focus on your thumb for 10 seconds', duration: 10, tracking: { type: 'gaze_zone', target: 'near', accuracy: 0.8 } },
            { text: 'Look at something in the distance for 10 seconds', duration: 10, tracking: { type: 'gaze_zone', target: 'far', accuracy: 0.8 } },
            { text: 'Return focus to your thumb for 10 seconds', duration: 10, tracking: { type: 'gaze_zone', target: 'near', accuracy: 0.8 } },
            { text: 'Look at the distant object again for 10 seconds', duration: 10, tracking: { type: 'gaze_zone', target: 'far', accuracy: 0.8 } },
            { text: 'Repeat this cycle 5 more times', duration: 100, tracking: { type: 'focus_cycles', target: 5, accuracy: 0.7 } },
            { text: 'Close your eyes and rest for 30 seconds', duration: 30, tracking: { type: 'eyes_closed', accuracy: 0.9 } }
        ],
        trackingZones: {
            near: { x: 0.3, y: 0.4, width: 0.2, height: 0.2 },
            far: { x: 0.7, y: 0.4, width: 0.2, height: 0.2 }
        },
        animation: function(step) {
            const animationDiv = document.getElementById('animation');
            
            if (step === 0) {
                animationDiv.innerHTML = `
                    <div class="position-relative">
                        <i class="bi bi-person" style="font-size: 3rem; color: #3a86ff; position: absolute; left: 50px; top: 50px;"></i>
                        <i class="bi bi-hand-thumbs-up" style="font-size: 2rem; color: #e76f51; position: absolute; left: 120px; top: 55px;"></i>
                        <div style="margin-top: 120px;">Hold your thumb about 10 inches from your face</div>
                    </div>
                `;
            } else if (step === 1 || step === 3) {
                // Focus on thumb
                animationDiv.innerHTML = `
                    <div class="position-relative">
                        <i class="bi bi-person" style="font-size: 3rem; color: #3a86ff; position: absolute; left: 50px; top: 50px;"></i>
                        <i class="bi bi-hand-thumbs-up" style="font-size: 2rem; color: #e76f51; position: absolute; left: 120px; top: 55px;"></i>
                        <div class="position-absolute" style="left: 125px; top: 45px; width: 30px; height: 30px; border: 2px solid red; border-radius: 50%; animation: pulse 1s infinite;"></div>
                        <div style="margin-top: 120px;">Focus on your thumb</div>
                    </div>
                `;
            } else if (step === 2 || step === 4) {
                // Focus on distant object
                animationDiv.innerHTML = `
                    <div class="position-relative">
                        <i class="bi bi-person" style="font-size: 3rem; color: #3a86ff; position: absolute; left: 50px; top: 50px;"></i>
                        <i class="bi bi-hand-thumbs-up" style="font-size: 2rem; color: #777; position: absolute; left: 120px; top: 55px;"></i>
                        <i class="bi bi-tree" style="font-size: 3rem; color: #2a9d8f; position: absolute; right: 50px; top: 50px;"></i>
                        <div class="position-absolute" style="right: 60px; top: 40px; width: 40px; height: 40px; border: 2px solid red; border-radius: 50%; animation: pulse 1s infinite;"></div>
                        <div style="margin-top: 120px;">Look at something in the distance</div>
                    </div>
                `;
            } else if (step === 5) {
                // Repeat cycle animation
                animationDiv.innerHTML = `
                    <div class="position-relative">
                        <i class="bi bi-person" style="font-size: 3rem; color: #3a86ff; position: absolute; left: 50px; top: 50px;"></i>
                        <i class="bi bi-hand-thumbs-up" style="font-size: 2rem; color: #e76f51; position: absolute; left: 120px; top: 55px;"></i>
                        <i class="bi bi-tree" style="font-size: 3rem; color: #2a9d8f; position: absolute; right: 50px; top: 50px;"></i>
                        <div class="position-absolute" style="left: 160px; top: 60px; font-size: 2rem; color: #777;">⟷</div>
                        <div style="margin-top: 120px;">Alternate focus between near and far</div>
                    </div>
                `;
            } else if (step === 6) {
                // Rest
                animationDiv.innerHTML = `
                    <div class="position-relative">
                        <i class="bi bi-person" style="font-size: 3rem; color: #3a86ff; position: absolute; left: 50px; top: 50px;"></i>
                        <div style="position: absolute; left: 55px; top: 55px; width: 30px; height: 8px; background-color: #3a86ff; border-radius: 5px;"></div>
                        <div style="margin-top: 120px;">Close your eyes and rest</div>
                    </div>
                `;
            }
        }
    },
    'eye-rolling': {
        name: 'Eye Rolling Exercise',
        description: 'Roll your eyes in different directions to relieve muscle tension.',
        duration: 120, // 2 minutes
        steps: [
            { text: 'Look up as far as you can', duration: 10, tracking: { type: 'gaze_direction', target: 'up', accuracy: 0.7 } },
            { text: 'Roll your eyes clockwise slowly for 30 seconds', duration: 30, tracking: { type: 'circular_motion', direction: 'clockwise', accuracy: 0.6 } },
            { text: 'Look down as far as you can', duration: 10, tracking: { type: 'gaze_direction', target: 'down', accuracy: 0.7 } },
            { text: 'Roll your eyes counter-clockwise slowly for 30 seconds', duration: 30, tracking: { type: 'circular_motion', direction: 'counter-clockwise', accuracy: 0.6 } },
            { text: 'Close your eyes and rest for 20 seconds', duration: 20, tracking: { type: 'eyes_closed', accuracy: 0.9 } }
        ],
        trackingDirections: {
            up: { x: 0.5, y: 0.1, tolerance: 0.2 },
            down: { x: 0.5, y: 0.9, tolerance: 0.2 },
            left: { x: 0.1, y: 0.5, tolerance: 0.2 },
            right: { x: 0.9, y: 0.5, tolerance: 0.2 }
        },
        animation: function(step) {
            const animationDiv = document.getElementById('animation');
            
            if (step === 0) {
                animationDiv.innerHTML = `
                    <div class="position-relative">
                        <i class="bi bi-person" style="font-size: 3rem; color: #3a86ff; position: absolute; left: 50px; top: 50px;"></i>
                        <i class="bi bi-arrow-up" style="font-size: 2rem; color: #777; position: absolute; left: 60px; top: 20px;"></i>
                        <div style="margin-top: 120px;">Look up</div>
                    </div>
                `;
            } else if (step === 1) {
                animationDiv.innerHTML = `
                    <div class="position-relative">
                        <i class="bi bi-person" style="font-size: 3rem; color: #3a86ff; position: absolute; left: 50px; top: 50px;"></i>
                        <i class="bi bi-arrow-clockwise" style="font-size: 3rem; color: #777; position: absolute; left: 50px; top: 40px; animation: spin-clockwise 2s infinite linear;"></i>
                        <div style="margin-top: 120px;">Roll eyes clockwise</div>
                    </div>
                `;
            }
        },
        verification: function(gazeDirection) {
            // Logic for Eye Rolling Exercise verification
            // This is a simplified example. Real implementation would track a sequence of movements.
            const currentStep = currentExerciseStep;
            const expectedDirection = exercises[currentExerciseType].steps[currentStep].expectedGaze;

            if (expectedDirection && gazeDirection === expectedDirection) {
                console.log(`Correct gaze: ${gazeDirection}`);
                // Provide positive visual feedback
                document.getElementById('exerciseVisual').style.borderColor = 'green';
            } else if (expectedDirection) {
                console.log(`Incorrect gaze: ${gazeDirection}, expected: ${expectedDirection}`);
                // Provide negative visual feedback
                document.getElementById('exerciseVisual').style.borderColor = 'red';
            }
        }
    },
    'palming': {
        name: 'Palming Exercise',
        description: 'Cover your closed eyes with warm palms to relax eye muscles.',
        duration: 300, // 5 minutes
        steps: [
            { text: 'Rub your palms together to generate warmth', duration: 10, tracking: { type: 'setup' } },
            { text: 'Gently cup your warm palms over your closed eyes', duration: 10, tracking: { type: 'hands_position', accuracy: 0.8 } },
            { text: 'Ensure no light seeps through. Relax and breathe deeply.', duration: 280, tracking: { type: 'eyes_closed', accuracy: 0.9 } },
            { text: 'Slowly remove your hands and open your eyes', duration: 10, tracking: { type: 'eyes_open', accuracy: 0.8 } }
        ],
        animation: function(step) {
            const animationDiv = document.getElementById('animation');
            
            if (step === 0) {
                animationDiv.innerHTML = `
                    <div class="position-relative">
                        <i class="bi bi-hand-thumbs-up" style="font-size: 3rem; color: #e76f51; position: absolute; left: 40px; top: 50px;"></i>
                        <i class="bi bi-hand-thumbs-up" style="font-size: 3rem; color: #e76f51; position: absolute; left: 80px; top: 50px; transform: scaleX(-1);"></i>
                        <div style="margin-top: 120px;">Rub palms together</div>
                    </div>
                `;
            } else if (step === 1 || step === 2) {
                animationDiv.innerHTML = `
                    <div class="position-relative">
                        <i class="bi bi-person" style="font-size: 3rem; color: #3a86ff; position: absolute; left: 50px; top: 50px;"></i>
                        <i class="bi bi-hand-index-fill" style="font-size: 3rem; color: #e76f51; position: absolute; left: 30px; top: 40px; transform: rotate(45deg);"></i>
                        <i class="bi bi-hand-index-fill" style="font-size: 3rem; color: #e76f51; position: absolute; left: 70px; top: 40px; transform: rotate(-45deg) scaleX(-1);"></i>
                        <div style="margin-top: 120px;">Cup palms over eyes</div>
                    </div>
                `;
            } else if (step === 3) {
                animationDiv.innerHTML = `
                    <div class="position-relative">
                        <i class="bi bi-person" style="font-size: 3rem; color: #3a86ff; position: absolute; left: 50px; top: 50px;"></i>
                        <div style="margin-top: 120px;">Slowly open eyes</div>
                    </div>
                `;
            }
        }
    },
    'figure-eight': {
        name: 'Figure Eight Exercise',
        description: 'Trace an imaginary figure 8 with your eyes to improve tracking.',
        duration: 120, // 2 minutes
        steps: [
            { text: 'Imagine a large figure eight on the floor about 10 feet in front of you', duration: 10, tracking: { type: 'setup' } },
            { text: 'Slowly trace the figure eight with your eyes for 30 seconds', duration: 30, tracking: { type: 'figure_eight', direction: 'forward', accuracy: 0.6 } },
            { text: 'Reverse the direction and trace the figure eight for another 30 seconds', duration: 30, tracking: { type: 'figure_eight', direction: 'reverse', accuracy: 0.6 } },
            { text: 'Close your eyes and rest for 20 seconds', duration: 20, tracking: { type: 'eyes_closed', accuracy: 0.9 } }
        ],
        animation: function(step) {
            const animationDiv = document.getElementById('animation');
            
            if (step === 0) {
                animationDiv.innerHTML = `
                    <div class="position-relative">
                        <i class="bi bi-person" style="font-size: 3rem; color: #3a86ff; position: absolute; left: 50px; top: 50px;"></i>
                        <i class="bi bi-infinity" style="font-size: 5rem; color: #777; position: absolute; left: 40px; top: 30px;"></i>
                        <div style="margin-top: 120px;">Imagine a figure eight</div>
                    </div>
                `;
            } else if (step === 1) {
                animationDiv.innerHTML = `
                    <div class="position-relative">
                        <i class="bi bi-person" style="font-size: 3rem; color: #3a86ff; position: absolute; left: 50px; top: 50px;"></i>
                        <i class="bi bi-infinity" style="font-size: 5rem; color: #777; position: absolute; left: 40px; top: 30px; animation: trace-figure-eight 2s infinite linear;"></i>
                        <div style="margin-top: 120px;">Trace figure eight clockwise</div>
                    </div>
                `;
            } else if (step === 2) {
                animationDiv.innerHTML = `
                    <div class="position-relative">
                        <i class="bi bi-person" style="font-size: 3rem; color: #3a86ff; position: absolute; left: 50px; top: 50px;"></i>
                        <i class="bi bi-infinity" style="font-size: 5rem; color: #777; position: absolute; left: 40px; top: 30px; animation: trace-figure-eight-reverse 2s infinite linear;"></i>
                        <div style="margin-top: 120px;">Trace figure eight counter-clockwise</div>
                    </div>
                `;
            } else if (step === 3) {
                animationDiv.innerHTML = `
                    <div class="position-relative">
                        <i class="bi bi-person" style="font-size: 3rem; color: #3a86ff; position: absolute; left: 50px; top: 50px;"></i>
                        <div style="position: absolute; left: 55px; top: 55px; width: 30px; height: 8px; background-color: #3a86ff; border-radius: 5px;"></div>
                        <div style="margin-top: 120px;">Close your eyes and rest</div>
                    </div>
                `;
            }
        }
    }
};

// DOM elements
const startExerciseBtn = document.getElementById('startExerciseBtn');
const pauseExerciseBtn = document.getElementById('pauseExerciseBtn');
const resetExerciseBtn = document.getElementById('resetExerciseBtn');
const timerDisplay = document.getElementById('timerDisplay');
const exerciseNameDisplay = document.getElementById('exerciseName');
const exerciseDescriptionDisplay = document.getElementById('exerciseDescription');
const exerciseProgress = document.getElementById('exerciseProgress');
const currentStepText = document.getElementById('currentStepText');
const currentStepSpan = document.getElementById('currentStep');
const totalStepsSpan = document.getElementById('totalSteps');
const exerciseList = document.getElementById('exerciseList');
const animationContainer = document.getElementById('animation');

// Exercise state
window.activeEyeExerciseType = 'twenty-twenty-twenty'; // Default exercise
window.currentExercise = exercises['twenty-twenty-twenty'];
window.currentStepIndex = 0;
let timeLeftInStep = 0;
let totalTimeElapsed = 0;
let timerInterval;
let isPaused = false;
let trackingActive = false;
let trackingResults = [];

// Function to update UI based on current exercise and step
function updateUI() {
    exerciseNameDisplay.textContent = currentExercise.name;
    exerciseDescriptionDisplay.textContent = currentExercise.description;
    totalStepsSpan.textContent = currentExercise.steps.length;
    currentStepSpan.textContent = currentStepIndex + 1;
    currentStepText.textContent = currentExercise.steps[currentStepIndex].text;
    
    // Update progress bar
    const progressPercentage = (totalTimeElapsed / currentExercise.duration) * 100;
    exerciseProgress.style.width = `${progressPercentage}%`;

    // Update timer display
    const minutes = Math.floor(totalTimeElapsed / 60);
    const seconds = totalTimeElapsed % 60;
    timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    // Update animation
    currentExercise.animation(currentStepIndex);
    
    // Update tracking for current step
    const step = currentExercise.steps[currentStepIndex];
    if (trackingActive && step.tracking) {
        updateTrackingFeedback(step.tracking);
    }
}

// Function to start the exercise
function startExercise(exerciseKey) {
    window.activeEyeExerciseType = exerciseKey;
     currentExercise = exercises[exerciseKey];
    if (!currentExercise) return;

    // Enable/disable buttons
    startExerciseBtn.disabled = true;
    pauseExerciseBtn.disabled = false;
    resetExerciseBtn.disabled = false;

    if (isPaused) {
        isPaused = false;
    } else {
        window.currentStepIndex = 0;
        totalTimeElapsed = 0;
        timeLeftInStep = window.currentExercise.steps[window.currentStepIndex].duration;
        updateUI();
        // Call the global startEyeExercise from eye_detection_mediapipe.js
        if (window.startEyeExercise) {
            window.startEyeExercise();
        }
    }
    
    // Start exercise tracking
    if (typeof exerciseTracker !== 'undefined') {
        exerciseTracker.startExercise(window.activeEyeExerciseType);
        trackingActive = true;
        startTracking();
    }

    timerInterval = setInterval(() => {
        if (isPaused) return;

        timeLeftInStep--;
        totalTimeElapsed++;

        if (timeLeftInStep <= 0) {
            currentStepIndex++;
            if (currentStepIndex < currentExercise.steps.length) {
                timeLeftInStep = currentExercise.steps[currentStepIndex].duration;
            } else {
                // Exercise finished
                clearInterval(timerInterval);
                endExercise();
                return;
            }
        }
        updateUI();
    }, 1000);
}

// Function to pause the exercise
function pauseExercise() {
    isPaused = true;
    clearInterval(timerInterval);
    startExerciseBtn.disabled = false;
    pauseExerciseBtn.disabled = true;
    // Call the global stopEyeExercise from eye_detection_mediapipe.js
    if (window.stopEyeExercise) {
        window.stopEyeExercise();
    }
}

// Function to reset the exercise
function resetExercise() {
    clearInterval(timerInterval);
    
    // Stop tracking if active
    if (trackingActive && typeof exerciseTracker !== 'undefined') {
        exerciseTracker.stopExercise();
    }
    
    isPaused = false;
    window.currentStepIndex = 0;
    totalTimeElapsed = 0;
    timeLeftInStep = window.currentExercise.steps[window.currentStepIndex].duration;
    trackingActive = false;
    trackingResults = [];
    
    updateUI();
    startExerciseBtn.disabled = false;
    pauseExerciseBtn.disabled = true;
    resetExerciseBtn.disabled = true;
    
    // Call the global stopEyeExercise from eye_detection_mediapipe.js
    if (window.stopEyeExercise) {
        window.stopEyeExercise();
    }
}

// Function to end the exercise (called when timer runs out)
function endExercise() {
    window.activeEyeExerciseType = null;
    clearInterval(timerInterval);
    startExerciseBtn.disabled = false;
    pauseExerciseBtn.disabled = true;
    resetExerciseBtn.disabled = true;
    currentStepText.textContent = 'Exercise Completed!';
    exerciseProgress.style.width = '100%';
    
    // Stop tracking
    if (trackingActive && typeof exerciseTracker !== 'undefined') {
        const results = exerciseTracker.stopExercise();
        trackingResults = results;
        displayTrackingResults(results);
    }
    
    // Call the global stopEyeExercise from eye_detection_mediapipe.js
    if (window.stopEyeExercise) {
        window.stopEyeExercise();
    }
    
    // Send performance data to backend with tracking data
    sendExercisePerformance(currentExerciseKey, 1, 0.8, 0.9, 100); // Example data
    trackingActive = false;
}

// Function to send exercise performance data to the backend
async function sendExercisePerformance(exerciseType, repetitions, smoothnessScore, focusStability, pointsAwarded) {
    try {
        const response = await fetch('/api/record-eye-exercise-performance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                exercise_type: exerciseType,
                repetitions: repetitions,
                smoothness_score: smoothnessScore,
                focus_stability: focusStability,
                points_awarded: pointsAwarded
            })
        });
        const data = await response.json();
        if (data.status === 'success') {
            console.log('Eye exercise performance recorded successfully:', data.message);
        } else {
            console.error('Failed to record eye exercise performance:', data.message);
        }
    } catch (error) {
        console.error('Error sending eye exercise performance:', error);
    }
}

// Tracking functions
function startTracking() {
    if (typeof exerciseTracker !== 'undefined') {
        console.log('Exercise tracking started for:', window.activeEyeExerciseType);
        console.log('getCurrentGazeData available:', typeof window.getCurrentGazeData);
        console.log('getCurrentBlinkData available:', typeof window.getCurrentBlinkData);
        
        // Start tracking interval
        const trackingInterval = setInterval(() => {
            if (!trackingActive) {
                clearInterval(trackingInterval);
                return;
            }
            
            // Get current tracking data from eye detection
            const gazeData = window.getCurrentGazeData ? window.getCurrentGazeData() : null;
            const blinkData = window.getCurrentBlinkData ? window.getCurrentBlinkData() : null;
            
            console.log('Tracking data - gaze:', gazeData, 'blink:', blinkData);
            
            if (gazeData && blinkData) {
                const result = exerciseTracker.trackExercise(null, blinkData, gazeData);
                console.log('Exercise tracking result:', result);
            } else {
                console.log('Missing tracking data');
            }
        }, 100); // Check every 100ms
    }
}

function updateTrackingFeedback(trackingConfig) {
    if (!trackingFeedback) return;
    
    const step = currentExercise.steps[currentStepIndex];
    const feedback = getCurrentTrackingFeedback();
    
    if (feedback) {
        trackingFeedback.textContent = feedback.message;
        trackingFeedback.className = `alert mt-3 ${feedback.class}`;
        trackingFeedback.style.display = 'block';
    }
}

function getCurrentTrackingFeedback() {
    if (!trackingActive || !currentExercise) return null;
    
    const step = currentExercise.steps[currentStepIndex];
    if (!step.tracking) return null;
    
    // Get latest tracking data
    if (typeof exerciseTracker !== 'undefined') {
        const data = exerciseTracker.exerciseData;
        const recentFeedback = data.feedback.slice(-1)[0];
        
        if (recentFeedback) {
            let cssClass = 'alert-info';
            if (recentFeedback.message.includes('Excellent') || recentFeedback.message.includes('Good')) {
                cssClass = 'alert-success';
            } else if (recentFeedback.message.includes('Try') || recentFeedback.message.includes('Focus')) {
                cssClass = 'alert-warning';
            }
            
            return {
                message: recentFeedback.message,
                class: cssClass
            };
        }
    }
    
    return {
        message: `Focus on: ${step.text}`,
        class: 'alert-info'
    };
}

function displayTrackingResults(results) {
    const resultsDiv = document.createElement('div');
    resultsDiv.className = 'card mt-3';
    resultsDiv.innerHTML = `
        <div class="card-header">
            <h5>Exercise Tracking Results</h5>
        </div>
        <div class="card-body">
            <p><strong>Average Accuracy:</strong> ${Math.round(results.averageAccuracy * 100)}%</p>
            <p><strong>Total Steps:</strong> ${results.totalSteps}</p>
            <p><strong>Completion Rate:</strong> ${Math.round(results.completionRate * 100)}%</p>
            ${results.recommendations.map(rec => `<p class="text-muted">• ${rec}</p>`).join('')}
        </div>
    `;
    
    const completeDiv = document.getElementById('exercise-complete');
    completeDiv.appendChild(resultsDiv);
}

// Modified save function to include tracking data
function saveExerciseHistory(exerciseName, duration, trackingData = null) {
    const history = JSON.parse(localStorage.getItem('exerciseHistory') || '[]');
    const entry = {
        name: exerciseName,
        duration: duration,
        date: new Date().toISOString(),
        trackingData: trackingData
    };
    
    history.unshift(entry);
    if (history.length > 50) history.pop();
    
    localStorage.setItem('exerciseHistory', JSON.stringify(history));
    
    // Send to backend with tracking data
    fetch('/api/exercise-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
    }).catch(err => console.error('Failed to save exercise data:', err));
}

// Event Listeners
startExerciseBtn.addEventListener('click', startExercise);
pauseExerciseBtn.addEventListener('click', pauseExercise);
resetExerciseBtn.addEventListener('click', resetExercise);

exerciseList.addEventListener('click', (event) => {
    const button = event.target.closest('.list-group-item-action');
    if (button) {
        // Remove active class from all buttons
        document.querySelectorAll('.list-group-item-action').forEach(btn => {
            btn.classList.remove('active');
        });
        // Add active class to the clicked button
        button.classList.add('active');
        currentExerciseKey = button.dataset.exercise;
        currentExercise = exercises[currentExerciseKey];
        resetExercise(); // Reset to load new exercise
    }
});

    // Expose functions to global scope for eye_detection_mediapipe.js to call
    window.startEyeExercise = startExercise;
    window.stopEyeExercise = endExercise;
    window.updateGazeDirection = function(gazeDirection) {
        if (window.activeEyeExerciseType && exercises[window.activeEyeExerciseType] && exercises[window.activeEyeExerciseType].verification) {
             exercises[window.activeEyeExerciseType].verification(gazeDirection);
        }
    };

// Initial UI setup
updateUI();

// CSS for animations (add to your main CSS file or a style block)
const style = document.createElement('style');
style.innerHTML = `
@keyframes pulse {
    0% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.1); opacity: 0.7; }
    100% { transform: scale(1); opacity: 1; }
}

@keyframes blink {
    0%, 100% { height: 8px; }
    50% { height: 2px; }
}

@keyframes spin-clockwise {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

@keyframes spin-counter-clockwise {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(-360deg); }
}

@keyframes trace-figure-eight {
    0% { transform: translateX(0) translateY(0); }
    25% { transform: translateX(20px) translateY(-10px); }
    50% { transform: translateX(0) translateY(0); }
    75% { transform: translateX(-20px) translateY(10px); }
    100% { transform: translateX(0) translateY(0); }
}

@keyframes trace-figure-eight-reverse {
    0% { transform: translateX(0) translateY(0); }
    25% { transform: translateX(-20px) translateY(10px); }
    50% { transform: translateX(0) translateY(0); }
    75% { transform: translateX(20px) translateY(-10px); }
    100% { transform: translateX(0) translateY(0); }
}
`;
document.head.appendChild(style);