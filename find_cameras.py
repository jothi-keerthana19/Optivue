import cv2

def find_cameras():
    print("Searching for available cameras...")
    available_cameras = []
    
    # Try different camera indices
    for i in range(10):
        print(f"Trying camera index {i}...")
        cap = cv2.VideoCapture(i)
        
        if cap.isOpened():
            ret, frame = cap.read()
            if ret and frame is not None:
                print(f"Camera {i} is available. Frame shape: {frame.shape}")
                available_cameras.append(i)
            else:
                print(f"Camera {i} is opened but cannot read frames")
        else:
            print(f"Camera {i} is not available")
        
        cap.release()
    
    print(f"\nAvailable cameras: {available_cameras}")
    return available_cameras

if __name__ == "__main__":
    find_cameras()