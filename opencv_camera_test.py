import cv2
import time

def test_camera():
    print("Testing OpenCV camera access...")
    
    # Try to open the default camera
    print("Attempting to open camera 0...")
    cap = cv2.VideoCapture(0)
    
    if cap.isOpened():
        print("Camera opened successfully!")
        
        # Try to read a few frames
        for i in range(5):
            ret, frame = cap.read()
            if ret:
                print(f"Frame {i+1} captured. Shape: {frame.shape}")
                time.sleep(0.1)
            else:
                print(f"Failed to capture frame {i+1}")
                
        cap.release()
        print("Camera released.")
    else:
        print("Failed to open camera.")
        # Try other camera indices
        for i in range(1, 5):
            print(f"Trying camera {i}...")
            cap = cv2.VideoCapture(i)
            if cap.isOpened():
                print(f"Camera {i} opened successfully!")
                ret, frame = cap.read()
                if ret:
                    print(f"Frame captured from camera {i}. Shape: {frame.shape}")
                cap.release()
                return
            else:
                print(f"Failed to open camera {i}")

if __name__ == "__main__":
    test_camera()