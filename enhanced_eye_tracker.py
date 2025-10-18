import cv2
import numpy as np
from typing import Dict, Optional, List

try:
    import mediapipe as mp
    FACE_MESH_AVAILABLE = True
except ImportError:
    mp = None
    FACE_MESH_AVAILABLE = False

class EnhancedEyeTracker:
    def __init__(self) -> None:
        """Initializes tracker with simple face presence detection."""
        self.face_mesh = None
        self._init_mediapipe()

    def _init_mediapipe(self) -> None:
        if not FACE_MESH_AVAILABLE: return
        try:
            self.face_mesh = mp.solutions.face_mesh.FaceMesh(
                max_num_faces=1, refine_landmarks=False,
                min_detection_confidence=0.5, min_tracking_confidence=0.5
            )
        except Exception as e:
            self.face_mesh = None
            print(f"Failed to initialize MediaPipe FaceMesh: {e}")

    def process_frame(self, frame: np.ndarray, target_position: Optional[List[float]], canvas_size: List[float]) -> Dict[str, object]:
        if self.face_mesh is None:
            return {'face_detected': False, 'success': False}

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.face_mesh.process(rgb)

        if not results.multi_face_landmarks:
            return {'face_detected': False, 'success': True}

        # Face is detected if we have face landmarks
        return {'face_detected': True, 'success': True}
