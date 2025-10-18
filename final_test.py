import requests
import time

def test_eye_tracking():
    print("Testing eye tracking functionality...")
    
    # Test status endpoint
    try:
        response = requests.get('http://localhost:5001/status', timeout=5)
        print(f"Status endpoint response: {response.status_code}")
        print(f"Status data: {response.json()}")
    except Exception as e:
        print(f"Error testing status endpoint: {e}")
    
    # Test starting camera
    try:
        response = requests.get('http://localhost:5001/start_camera', timeout=10)
        print(f"Start camera response: {response.status_code}")
        print(f"Start camera data: {response.json()}")
    except Exception as e:
        print(f"Error starting camera: {e}")
    
    # Wait a moment for camera to initialize
    time.sleep(2)
    
    # Test starting tracking
    try:
        response = requests.get('http://localhost:5001/start_tracking', timeout=10)
        print(f"Start tracking response: {response.status_code}")
        print(f"Start tracking data: {response.json()}")
    except Exception as e:
        print(f"Error starting tracking: {e}")
    
    # Wait a moment for tracking to start
    time.sleep(2)
    
    # Test status again
    try:
        response = requests.get('http://localhost:5001/status', timeout=5)
        print(f"Status after starting camera/tracking: {response.status_code}")
        print(f"Status data: {response.json()}")
    except Exception as e:
        print(f"Error testing status after initialization: {e}")
    
    # Test gaze data endpoint multiple times
    print("\nTesting gaze data requests...")
    for i in range(5):
        try:
            response = requests.get('http://localhost:5001/get_enhanced_gaze', timeout=5)
            if response.status_code == 200:
                data = response.json()
                print(f"Request {i+1}: success={data.get('success')}, gaze_position={data.get('gaze_position')}, confidence={data.get('confidence')}")
            else:
                print(f"Request {i+1}: HTTP {response.status_code}")
        except Exception as e:
            print(f"Error in request {i+1}: {e}")
        time.sleep(1)

if __name__ == "__main__":
    test_eye_tracking()