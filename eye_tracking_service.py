import cv2
import time
import threading
from flask import Flask, Response, jsonify, request
from enhanced_eye_tracker import EnhancedEyeTracker 
import numpy as np
import logging

# Configure basic logging
logging.basicConfig(level=logging.INFO, format='[%(asctime)s] [%(levelname)s] - %(message)s')

app = Flask(__name__)
lock = threading.Lock()

# --- Global State Management ---
state = {
    "video_capture": None,
    "eye_tracker": EnhancedEyeTracker(),
    "latest_frame": None,
    "last_gaze_data": {
        "face_detected": False,
        "gaze_position": [50.0, 50.0],  # Default to center (in percentage)
        "confidence": 0.0,
        "is_focused": False,
    },
    "is_tracking": False,
    "simulation_mode": False
}

def initialize_camera():
    """Initializes the camera or falls back to simulation mode."""
    with lock:
        if state["video_capture"] is not None and state["video_capture"].isOpened():
            return True

        try:
            cap = cv2.VideoCapture(0)
            if cap and cap.isOpened():
                state["video_capture"] = cap
                state["video_capture"].set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                state["video_capture"].set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
                state["simulation_mode"] = False
                logging.info("✅ Real camera initialized successfully.")
                return True
            logging.warning("⚠️ Real camera not found.")
            if cap: cap.release()
        except Exception as e:
            logging.error(f"Error initializing camera: {e}")

        state["simulation_mode"] = True
        logging.info("✅ Simulation mode enabled.")
        return True

def tracking_thread_worker():
    """Background thread for continuous frame processing."""
    target_pos = None # Target position for focus calculation

    while state["is_tracking"]:
        frame = None
        frame_width, frame_height = 640, 480

        with lock:
            if state["simulation_mode"]:
                sim_frame = np.zeros((frame_height, frame_width, 3), dtype=np.uint8)
                t = time.time() * 0.5
                center_x = int(frame_width / 2 + (frame_width / 3) * np.sin(t))
                center_y = int(frame_height / 2 + (frame_height / 4) * np.cos(t))
                cv2.circle(sim_frame, (center_x, center_y), 30, (0, 255, 0), -1)
                cv2.putText(sim_frame, "SIMULATION", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
                frame = sim_frame
            elif state["video_capture"] and state["video_capture"].isOpened():
                ret, real_frame = state["video_capture"].read()
                if ret:
                    frame = real_frame
        
        if frame is None:
            time.sleep(0.1)
            continue
        
        # This is where you would get the target position if the frontend sent it
        # For now, we'll keep it simple and handle focus logic on the frontend.
        result = state["eye_tracker"].process_frame(
            frame=frame,
            target_position=target_pos, 
            canvas_size=[frame_width, frame_height]
        )
        
        with lock:
            state["latest_frame"] = frame.copy()
            if result.get("face_detected") and result.get("gaze_position"):
                gaze_px = result["gaze_position"]
                state["last_gaze_data"]["gaze_position"] = [
                    np.clip((gaze_px[0] / frame_width) * 100.0, 0, 100),
                    np.clip((gaze_px[1] / frame_height) * 100.0, 0, 100)
                ]
                state["last_gaze_data"]["confidence"] = result.get("confidence", 0.0)
                state["last_gaze_data"]["face_detected"] = True
                state["last_gaze_data"]["is_focused"] = result.get("is_focused", False)
            else:
                state["last_gaze_data"]["face_detected"] = False
        
        time.sleep(0.033) # ~30 FPS

def generate_video_feed():
    """Generator for streaming the video feed."""
    while True:
        with lock:
            if state["latest_frame"] is None:
                frame = np.zeros((480, 640, 3), dtype=np.uint8)
                cv2.putText(frame, "Initializing...", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            else:
                frame = state["latest_frame"].copy()
        
        (flag, encodedImage) = cv2.imencode(".jpg", frame)
        if not flag:
            continue
            
        yield (b'--frame
'
               b'Content-Type: image/jpeg

' + bytearray(encodedImage) + b'
')
        time.sleep(0.033)

# --- API Endpoints ---
@app.route('/status')
def get_status():
    return jsonify({'status': 'running', 'tracking_active': state['is_tracking']})

@app.route('/start_camera', methods=['GET', 'POST'])
def start_camera_endpoint():
    """Starts the camera and the tracking thread."""
    if not initialize_camera():
        return jsonify({"success": False, "message": "Failed to open camera."}), 500

    with lock:
        if not state["is_tracking"]:
            state["is_tracking"] = True
            thread = threading.Thread(target=tracking_thread_worker, daemon=True)
            thread.start()
            logging.info("Background tracking thread started.")
    
    return jsonify({"success": True, "message": "Camera started.", "simulation": state["simulation_mode"]})

@app.route('/video_feed')
def video_feed():
    return Response(generate_video_feed(), mimetype="multipart/x-mixed-replace; boundary=frame")

@app.route('/get_enhanced_gaze')
def get_enhanced_gaze():
    with lock:
        response_data = state["last_gaze_data"].copy()
        response_data['success'] = response_data['face_detected']
    return jsonify(response_data)

@app.route('/calibrate', methods=['POST'])
def calibrate():
    """Receives calibration data and applies it."""
    data = request.get_json()
    if not data or 'calibration_data' not in data:
        return jsonify({'success': False, 'message': 'No calibration data provided'}), 400
    
    with lock:
        success = state["eye_tracker"].calibrate(data['calibration_data'])
    
    if success:
        return jsonify({'success': True, 'message': 'Calibration successful'})
    else:
        return jsonify({'success': False, 'message': 'Calibration failed'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=False, use_reloader=False)
