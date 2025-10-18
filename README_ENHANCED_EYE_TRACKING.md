# Enhanced Eye Tracking System

## Overview
This is an enhanced eye tracking system for the EyeCareAI healthcare application. It provides real-time eye tracking with improved accuracy using computer vision and MediaPipe technology.

## Features
- Real-time eye tracking using MediaPipe FaceMesh
- Iris detection for improved gaze accuracy
- Calibration system for screen mapping
- Focus accuracy measurement
- Healthcare-grade metrics tracking
- Integration with eye exercise interface

## Requirements
- Python 3.7+
- OpenCV
- MediaPipe
- Flask
- NumPy

## Installation
```bash
pip install opencv-python mediapipe flask numpy
```

## Usage

### 1. Start the Enhanced Eye Tracking Server
```bash
python enhanced_eye_tracking_server.py
```

The server will start on `http://localhost:5001`

### 2. Access the Eye Exercises Page
Open your browser and navigate to:
```
http://localhost:5001/eye-exercises
```

### 3. Using the System
1. Enable eye tracking by toggling the "Enable Eye Tracking" switch
2. Allow camera permissions when prompted by your browser
3. Select an exercise from the list
4. Complete the calibration process by looking at the red dots
5. Follow the target with your eyes during the exercise
6. View real-time focus accuracy and session metrics

## API Endpoints

### System Status
```
GET /status
```
Returns the current system status including camera and tracking status.

### Camera Control
```
GET /start_camera
GET /stop_camera
```

### Tracking Control
```
GET /start_tracking
GET /stop_tracking
```

### Session Management
```
GET /start_session
GET /stop_session
GET /reset_session
```

### Data Retrieval
```
GET /get_gaze_data
GET /get_enhanced_gaze
GET /get_session_metrics
```

### Calibration
```
POST /calibrate
POST /set_target_position
```

## Technical Details

### Enhanced Eye Tracker
The system uses MediaPipe's FaceMesh solution to detect facial landmarks and track eye movements with high precision. Key features include:

- **468 Facial Landmarks**: Detailed facial tracking for accurate eye positioning
- **Iris Detection**: Specialized detection of iris landmarks for precise gaze estimation
- **Smoothing Algorithms**: Reduces jitter for a better user experience
- **Calibration System**: Maps gaze coordinates to screen positions accurately
- **Focus Tracking**: Measures how well the user is following the exercise targets

### Data Flow
1. Camera captures video frames at 30 FPS
2. Frames are processed by the EnhancedEyeTracker
3. Facial landmarks and iris positions are detected
4. Gaze position is calculated and calibrated
5. Focus accuracy is determined based on target proximity
6. Metrics are updated and made available via API
7. Frontend polls for gaze data and updates UI in real-time

## Troubleshooting

### Camera Issues
- Ensure your camera is connected and not in use by another application
- Check camera permissions in your browser
- Try refreshing the page if the camera doesn't start

### Tracking Accuracy
- Ensure good lighting conditions
- Position your face clearly in front of the camera
- Complete the calibration process for best results
- Keep your head relatively still during tracking

### Connection Problems
- Verify the server is running on port 5001
- Check that no firewall is blocking the connection
- Try restarting the server if endpoints are not responding

## Healthcare Applications
This system is designed for healthcare applications with:
- Real-time data processing
- Accurate metrics tracking
- Session-based data collection
- Privacy-focused design (all processing done locally)

## Future Enhancements
- Advanced calibration with homography transformation
- Blink detection using eye aspect ratio
- Drowsiness detection algorithms
- Integration with healthcare data storage systems
- Machine learning models for personalized tracking

## License
This system is part of the EyeCareAI healthcare application and is intended for healthcare use only.