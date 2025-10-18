# Eye Tracking System - Setup and Usage

## Overview
This document provides instructions for setting up and using the Eye Tracking system in the EyeCareAI application.

## Prerequisites
- Python 3.11 or higher
- Required Python packages (automatically installed via requirements.txt):
  - Flask
  - Flask-CORS
  - OpenCV
  - NumPy
  - MediaPipe

## Starting the System

### Method 1: Using the Batch Script (Recommended)
Double-click on `start_servers.bat` to start both servers automatically:
- Main Application: http://localhost:5000
- Eye Tracking Server: http://localhost:5001

### Method 2: Manual Start
1. Start the Eye Tracking Server:
   ```
   python enhanced_eye_tracking_server.py
   ```

2. In a separate terminal, start the Main Application:
   ```
   python app.py
   ```

## Testing the Eye Tracking

1. Open your browser and navigate to http://localhost:5000

2. Log in to the application (default credentials or register a new user)

3. Navigate to the Eye Exercises page

4. Enable eye tracking by toggling the "Enable Eye Tracking" switch

5. Select an exercise from the list

6. Click "Start Exercise"

7. The system will:
   - Start the camera (in simulation mode for testing)
   - Begin tracking eye movements
   - Show a yellow gaze dot that moves around the screen
   - Display the camera feed in the bottom-right corner

## Troubleshooting

### Issue: "NetworkError when attempting to fetch resource"
**Solution**: Ensure both servers are running on their respective ports:
- Main Application: Port 5000
- Eye Tracking Server: Port 5001

### Issue: Camera feed not showing
**Solution**: 
1. Check that the eye tracking server is running
2. Verify the video feed endpoint is accessible: http://localhost:5001/video_feed
3. Ensure no firewall is blocking the ports

### Issue: Gaze dot not moving
**Solution**: The system is working in simulation mode where the gaze dot moves in a pattern. In a real implementation with a camera, it would track actual eye movements.

## Files Modified for Fixes

1. `enhanced_eye_tracking_server.py`:
   - Enhanced CORS configuration
   - Improved camera initialization with simulation mode
   - Better error handling in tracking endpoints
   - Enhanced video feed endpoint with frame waiting logic

2. `templates/eye_exercises.html`:
   - Improved gaze data polling with timeout management
   - Better video feed setup using image element
   - Enhanced error handling and user feedback

3. Created helper files:
   - `start_servers.bat`: Batch script to start both servers
   - `test_endpoints.py`: Python script to test server endpoints
   - `test_video_feed.py`: Script to test video feed functionality
   - Various documentation files explaining the fixes

## For Developers

### Testing Endpoints
Use the provided test scripts to verify functionality:
```
python test_endpoints.py
python test_video_feed.py
```

### Simulation Mode
The system runs in simulation mode by default for testing without a physical camera. To use with a real camera, modify the `start_camera` endpoint in `enhanced_eye_tracking_server.py`.

### CORS Configuration
The enhanced CORS configuration allows requests from:
- http://localhost:5000
- http://localhost:5001
- http://127.0.0.1:5000
- http://127.0.0.1:5001
- All other origins (*)

## Support
For issues or questions, refer to the documentation files:
- `EYE_TRACKING_FIXES_SUMMARY.md`
- `FINAL_EYE_TRACKING_FIXES.md`