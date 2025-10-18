import cv2
import dlib
import numpy as np
from flask import Flask, jsonify, request, Response
from flask_cors import CORS
import threading
import time
import os
import logging
from scipy.spatial import distance as dist

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EyeTrackingServer:
    def __init__(self):
        self.app = Flask(__name__)
        CORS(self.app)
        
        # Initialize camera
        self.cap = None
        self.camera_active = False
        self.frame = None
        self.frame_lock = threading.Lock()
        
        # Initialize face and eye detectors
        self.detector = dlib.get_frontal_face_detector()
        self.predictor = None
        self.load_predictor()
        
        # Eye tracking variables
        self.gaze_x = 50  # Default center
        self.gaze_y = 50
        self.blink_detected = False
        self.calibration_data = []
        self.is_calibrated = False
        
        # Thread control
        self.tracking_active = False
        self.tracking_thread = None
        
        # Setup routes
        self.setup_routes()
        self.start_camera()
    def get_gaze_data(self):
        """Return current gaze coordinates."""
        return jsonify({"gaze_x": self.gaze_x, "gaze_y": self.gaze_y})



    
    def load_predictor(self):
        """Load dlib shape predictor"""
        try:
            # Try to load from common locations
            predictor_paths = [
                'shape_predictor_68_face_landmarks.dat',
                'static/models/shape_predictor_68_face_landmarks.dat',
                '/usr/share/dlib/shape_predictor_68_face_landmarks.dat'
            ]
            
            for path in predictor_paths:
                if os.path.exists(path):
                    self.predictor = dlib.shape_predictor(path)
                    logger.info(f"Loaded predictor from {path}")
                    break
            else:
                logger.warning("Shape predictor not found. Eye tracking will be limited.")
                
        except Exception as e:
            logger.error(f"Error loading predictor: {e}")
    
    def eye_aspect_ratio(self, eye):
        """Calculate eye aspect ratio for blink detection"""
        A = dist.euclidean(eye[1], eye[5])
        B = dist.euclidean(eye[2], eye[4])
        C = dist.euclidean(eye[0], eye[3])
        ear = (A + B) / (2.0 * C)
        return ear
    
    def get_gaze_direction(self, landmarks, frame_shape):
        """Enhanced gaze direction calculation using iris tracking"""
        if not landmarks:
            return 50, 50
        
        try:
            # Get iris landmarks (474-478 for left eye, 469-473 for right eye)
            # Using dlib's 68 point model - we'll use eye corners and centers
            left_eye_left_corner = landmarks.part(36)
            left_eye_right_corner = landmarks.part(39)
            right_eye_left_corner = landmarks.part(42)
            right_eye_right_corner = landmarks.part(45)
            
            # Get eye centers
            left_eye_center = (
                (landmarks.part(37).x + landmarks.part(38).x + landmarks.part(40).x + landmarks.part(41).x) / 4,
                (landmarks.part(37).y + landmarks.part(38).y + landmarks.part(40).y + landmarks.part(41).y) / 4
            )
            right_eye_center = (
                (landmarks.part(43).x + landmarks.part(44).x + landmarks.part(46).x + landmarks.part(47).x) / 4,
                (landmarks.part(43).y + landmarks.part(44).y + landmarks.part(46).y + landmarks.part(47).y) / 4
            )
            
            # Calculate gaze position as average of both eyes
            gaze_x = int((left_eye_center[0] + right_eye_center[0]) / 2)
            gaze_y = int((left_eye_center[1] + right_eye_center[1]) / 2)
            
            # Normalize to percentage with improved accuracy
            gaze_x = max(0, min(100, (gaze_x / frame_shape[1]) * 100))
            gaze_y = max(0, min(100, (gaze_y / frame_shape[0]) * 100))
            
            return gaze_x, gaze_y
            
        except Exception as e:
            logger.error(f"Error calculating gaze: {e}")
            return 50, 50
    
    def detect_blinks(self, landmarks, frame_shape):
        """Detect blinks using eye aspect ratio"""
        if not landmarks:
            return False
        
        try:
            # Get left and right eye landmarks
            left_eye = []
            right_eye = []
            
            for i in range(36, 42):
                left_eye.append((landmarks.part(i).x, landmarks.part(i).y))
            
            for i in range(42, 48):
                right_eye.append((landmarks.part(i).x, landmarks.part(i).y))
            
            # Calculate EAR for both eyes
            left_ear = self.eye_aspect_ratio(left_eye)
            right_ear = self.eye_aspect_ratio(right_eye)
            
            # Average EAR
            ear = (left_ear + right_ear) / 2.0
            
            # Threshold for blink detection
            EAR_THRESHOLD = 0.25
            
            return ear < EAR_THRESHOLD
            
        except Exception as e:
            logger.error(f"Error detecting blinks: {e}")
            return False
    
    def tracking_loop(self):
        """Main tracking loop running in separate thread"""
        if not self.predictor:
            logger.error("Predictor not loaded, cannot start tracking")
            return
        
        while self.tracking_active:
            if not self.camera_active or not self.cap:
                time.sleep(0.1)
                continue
            
            ret, frame = self.cap.read()
            if not ret:
                continue
            
            try:
                # Convert to grayscale
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                
                # Detect faces
                faces = self.detector(gray)
                
                if len(faces) > 0:
                    # Get the first face
                    face = faces[0]
                    
                    # Get facial landmarks
                    landmarks = self.predictor(gray, face)
                    
                    # Calculate gaze direction
                    self.gaze_x, self.gaze_y = self.get_gaze_direction(landmarks, frame.shape)
                    
                    # Detect blinks
                    self.blink_detected = self.detect_blinks(landmarks, frame.shape)
                    
                    # Apply calibration if available
                    if self.is_calibrated and self.calibration_data:
                        self.gaze_x, self.gaze_y = self.apply_calibration(self.gaze_x, self.gaze_y)
                
                else:
                    # No face detected, reset to center
                    self.gaze_x = 50
                    self.gaze_y = 50
                    self.blink_detected = False
                
                time.sleep(0.05)  # 20 FPS
                
            except Exception as e:
                logger.error(f"Error in tracking loop: {e}")
                time.sleep(0.1)
    
    def apply_calibration(self, gaze_x, gaze_y):
        """Apply calibration data to adjust gaze coordinates"""
        if not self.calibration_data or len(self.calibration_data) < 4:
            return gaze_x, gaze_y
        
        try:
            # Enhanced calibration using perspective transformation
            # Map screen coordinates to actual gaze positions
            if len(self.calibration_data) >= 4:
                # Use 4-point calibration (corners)
                screen_corners = [(0, 0), (100, 0), (100, 100), (0, 100)]
                gaze_corners = self.calibration_data[:4]
                
                # Simple linear mapping for now
                # This can be enhanced with homography transformation
                x_scale = (gaze_corners[2][0] - gaze_corners[0][0]) / 100
                y_scale = (gaze_corners[2][1] - gaze_corners[0][1]) / 100
                
                calibrated_x = gaze_corners[0][0] + (gaze_x * x_scale)
                calibrated_y = gaze_corners[0][1] + (gaze_y * y_scale)
                
                return max(0, min(100, calibrated_x)), max(0, min(100, calibrated_y))
            
            return gaze_x, gaze_y
            
        except Exception as e:
            logger.error(f"Error applying calibration: {e}")
            return gaze_x, gaze_y
    
    def start_camera(self):
        if self.cap is None:
            import cv2
            self.cap = cv2.VideoCapture(0) # 0 for default camera
            if not self.cap.isOpened():
                logger.error("Could not open video device")
                self.camera_active = False
                return
            self.camera_active = True
            logger.info("Camera initialized.")
            # Start a thread to read frames
            self.frame_reader_thread = threading.Thread(target=self._read_frames)
            self.frame_reader_thread.daemon = True
            self.frame_reader_thread.start()

    def _read_frames(self):
        import cv2
        while self.camera_active:
            ret, frame = self.cap.read()
            if not ret:
                logger.warning("Failed to grab frame, attempting to re-open camera...")
                self.cap.release()
                self.cap = cv2.VideoCapture(0)
                if not self.cap.isOpened():
                    logger.error("Could not re-open video device, stopping frame reader.")
                    self.camera_active = False
                    break
                continue
            with self.frame_lock:
                self.frame = frame.copy()
            time.sleep(0.01) # Small delay to prevent 100% CPU usage

    def gen_frames(self):
        import cv2
        while True:
            with self.frame_lock:
                if self.frame is None:
                    time.sleep(0.1) # Wait for frame
                    continue
                ret, buffer = cv2.imencode('.jpg', self.frame)
                if not ret:
                    continue
            frame = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

    def setup_routes(self):
        """Setup Flask routes"""
        
        @self.app.route('/status')
        def status():
            return jsonify({
                'status': 'running',
                'camera_status': 'active' if self.camera_active else 'inactive',
                'tracking_active': self.tracking_active,
                'calibrated': self.is_calibrated
            })
        
        @self.app.route('/start_camera')
        def start_camera():
            try:
                if not self.camera_active:
                    self.cap = cv2.VideoCapture(0)
                    if self.cap.isOpened():
                        self.camera_active = True
                        return jsonify({'success': True, 'message': 'Camera started'})
                    else:
                        return jsonify({'success': False, 'message': 'Could not open camera'}), 500
                return jsonify({'success': True, 'message': 'Camera already active'})
            except Exception as e:
                return jsonify({'success': False, 'message': str(e)}), 500
        
        @self.app.route('/stop_camera')
        def stop_camera():
            try:
                if self.camera_active and self.cap:
                    self.cap.release()
                    self.camera_active = False
                return jsonify({'success': True, 'message': 'Camera stopped'})
            except Exception as e:
                return jsonify({'success': False, 'message': str(e)}), 500
        
        @self.app.route('/start_tracking')
        def start_tracking():
            try:
                if not self.camera_active:
                    # Try to start camera first
                    result = self.start_camera()
                    if not result['success']:
                        return jsonify(result), 500
                
                if not self.tracking_active:
                    self.tracking_active = True
                    self.tracking_thread = threading.Thread(target=self.tracking_loop)
                    self.tracking_thread.daemon = True
                    self.tracking_thread.start()
                
                return jsonify({'success': True, 'message': 'Tracking started'})
            except Exception as e:
                return jsonify({'success': False, 'message': str(e)}), 500
        
        @self.app.route('/stop_tracking')
        def stop_tracking():
            try:
                self.tracking_active = False
                return jsonify({'success': True, 'message': 'Tracking stopped'})
            except Exception as e:
                return jsonify({'success': False, 'message': str(e)}), 500
        
        @self.app.route('/get_gaze_data')
        def get_gaze_data():
            return jsonify({
                'gaze_x': self.gaze_x,
                'gaze_y': self.gaze_y,
                'blink_detected': self.blink_detected,
                'timestamp': time.time()
            })
        
        @self.app.route('/calibrate', methods=['POST'])
        def calibrate():
            try:
                data = request.json
                if 'calibration_data' in data:
                    self.calibration_data = data['calibration_data']
                    self.is_calibrated = True
                    return jsonify({'success': True, 'message': 'Calibration applied'})
                return jsonify({'success': False, 'message': 'No calibration data provided'}), 400
            except Exception as e:
                return jsonify({'success': False, 'message': str(e)}), 500
        
        @self.app.route('/video_feed')
        def video_feed():
            return Response(self.gen_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')
        
        @self.app.route('/download_predictor')
        def download_predictor():
            """Download link for shape predictor"""
            return jsonify({
                'message': 'Please download shape_predictor_68_face_landmarks.dat from dlib website',
                'url': 'http://dlib.net/files/shape_predictor_68_face_landmarks.dat.bz2'
            })
    
    def run(self, host='0.0.0.0', port=5001):
        """Run the Flask server"""
        logger.info(f"Starting Eye Tracking Server on {host}:{port}")
        
        # Try to start camera on startup
        try:
            self.cap = cv2.VideoCapture(0)
            if self.cap.isOpened():
                self.camera_active = True
                logger.info("Camera initialized successfully")
            else:
                logger.warning("Could not initialize camera")
        except Exception as e:
            logger.error(f"Error initializing camera: {e}")
        
        self.app.run(host=host, port=port, debug=False)

    def stop_camera(self):
        if self.cap and self.camera_active:
            self.camera_active = False
            if self.frame_reader_thread and self.frame_reader_thread.is_alive():
                self.frame_reader_thread.join(timeout=1) # Wait for thread to finish
            self.cap.release()
            logger.info("Camera released.")

if __name__ == '__main__':
    server = EyeTrackingServer()
    try:
        server.run(host='0.0.0.0', port=5001)
    finally:
        server.stop_camera()