import cv2
import mediapipe as mp
import pyautogui
import numpy as np

cam = cv2.VideoCapture(0)
face_mesh = mp.solutions.face_mesh.FaceMesh(refine_landmarks=True)
screen_w, screen_h = pyautogui.size()

# Smoothing variables
previous_screen_x = screen_w / 2
previous_screen_y = screen_h / 2
smoothing_factor = 0.7  # Adjust for more/less smoothing

while True:
    _, frame = cam.read()
    frame = cv2.flip(frame, 1)
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    output = face_mesh.process(rgb_frame)
    landmark_points = output.multi_face_landmarks
    frame_h, frame_w, _ = frame.shape
    if landmark_points:
        landmarks = landmark_points[0].landmark

        # Right eye landmarks for gaze estimation
        # Eye corners: left 362, right 263
        # Iris: 473, 474, 475, 476, 477
        eye_left_x = landmarks[362].x
        eye_right_x = landmarks[263].x
        eye_top_y = landmarks[386].y
        eye_bottom_y = landmarks[374].y

        # Iris center
        iris_x = sum(landmarks[i].x for i in [473, 474, 475, 476, 477]) / 5
        iris_y = sum(landmarks[i].y for i in [473, 474, 475, 476, 477]) / 5

        # Calculate ratios (head-independent)
        if eye_right_x > eye_left_x:
            horizontal_ratio = (iris_x - eye_left_x) / (eye_right_x - eye_left_x)
        else:
            horizontal_ratio = 0.5

        if eye_bottom_y > eye_top_y:
            vertical_ratio = (iris_y - eye_top_y) / (eye_bottom_y - eye_top_y)
        else:
            vertical_ratio = 0.5

        # Clip ratios
        horizontal_ratio = np.clip(horizontal_ratio, 0.0, 1.0)
        vertical_ratio = np.clip(vertical_ratio, 0.0, 1.0)

        # Map to screen (invert x if needed, depending on camera flip)
        screen_x = horizontal_ratio * screen_w
        screen_y = vertical_ratio * screen_h

        # Apply smoothing
        screen_x = smoothing_factor * screen_x + (1 - smoothing_factor) * previous_screen_x
        screen_y = smoothing_factor * screen_y + (1 - smoothing_factor) * previous_screen_y

        # Update previous
        previous_screen_x = screen_x
        previous_screen_y = screen_y

        # Move mouse
        pyautogui.moveTo(screen_x, screen_y)

        # Draw iris points for visualization
        for i in [473, 474, 475, 476, 477]:
            x = int(landmarks[i].x * frame_w)
            y = int(landmarks[i].y * frame_h)
            cv2.circle(frame, (x, y), 3, (0, 255, 0))

        # Blink detection (left eye)
        left = [landmarks[145], landmarks[159]]
        for landmark in left:
            x = int(landmark.x * frame_w)
            y = int(landmark.y * frame_h)
            cv2.circle(frame, (x, y), 3, (0, 255, 255))
        if (left[0].y - left[1].y) < 0.004:
            pyautogui.click()
            pyautogui.sleep(1)

    cv2.imshow('Eye Controlled Mouse', frame)
    cv2.waitKey(1)
