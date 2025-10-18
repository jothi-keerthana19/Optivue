# How to Run EyeCareAI Application

## Prerequisites
- Python 3.7 or higher
- Required Python packages (install with `pip install -r requirements.txt`)

## Starting the Application

### Option 1: Using the Batch File (Windows)
1. Double-click on `start_servers.bat` in the project root directory
2. Two console windows will open:
   - Enhanced Eye Tracking Server (port 5001)
   - Main Application (port 5000)
3. Press any key in the batch file window to close it (servers will continue running)

### Option 2: Manual Start
1. Open a terminal/command prompt
2. Navigate to the project directory: `cd d:\EyeCareAI`
3. Start the enhanced eye tracking server:
   ```
   python enhanced_eye_tracking_server.py
   ```
4. Open another terminal/command prompt
5. Navigate to the project directory: `cd d:\EyeCareAI`
6. Start the main application:
   ```
   python app.py
   ```

## Accessing the Application

### Enhanced Eye Exercises (Recommended)
- URL: http://localhost:5001/eye-exercises
- Features real-time eye tracking with computer vision
- Includes simulation mode when no camera is available

### Main Application
- URL: http://localhost:5000
- Includes all features of the main EyeCareAI application
- Can access enhanced eye tracking through proxy routes

## Features

### Eye Tracking
- Real-time eye tracking using MediaPipe FaceMesh
- Iris detection for improved accuracy
- Calibration system for screen mapping
- Focus accuracy measurement
- Healthcare-grade metrics tracking

### Eye Exercises
- Multiple exercise types (Center Focus, Figure Eight, Horizontal Shift, etc.)
- Interactive target tracking
- Real-time feedback on focus accuracy
- Session metrics and progress tracking

### Healthcare Features
- Session-based data collection
- Focus percentage tracking
- Accuracy measurement
- Blink detection
- Calibration status

## Troubleshooting

### Camera Issues
- If you see "Camera not available, simulation mode enabled", the system is working correctly but no physical camera was detected
- Simulation mode provides moving patterns for testing
- To use a real camera, ensure it's connected and not in use by another application

### Connection Issues
- Make sure both servers are running
- Check that ports 5000 and 5001 are not blocked by firewall
- If ports are in use, modify the port numbers in the server files

### Application Not Starting
- Ensure all required Python packages are installed
- Check the console output for error messages
- Verify that the Python environment is properly set up

## Stopping the Application
- Close both console windows
- Or press Ctrl+C in each console window
- Or run `Stop-Process -Name "python" -Force` in PowerShell

## Development Notes
- The enhanced eye tracking server runs on port 5001
- The main application runs on port 5000
- The main application proxies requests to the enhanced eye tracking server for eye tracking features
- All processing is done locally for privacy and security