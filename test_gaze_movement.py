#!/usr/bin/env python3
"""
Test script to verify enhanced gaze tracking movement in all directions.
This script tests the API endpoints to ensure gaze tracking works properly.
"""

import requests
import time
import json
import sys

def test_gaze_movement():
    """Test gaze tracking movement by calling the enhanced gaze endpoint."""
    base_url = "http://localhost:5002"

    print("🧪 Testing Enhanced Gaze Tracking Movement")
    print("=" * 50)

    try:
        # Step 1: Check server status
        print("1. Checking server status...")
        response = requests.get(f"{base_url}/api/enhanced-eye-tracking/status")
        if response.status_code != 200:
            print(f"❌ Server not responding: {response.status_code}")
            return False
        print("✅ Server is running")

        # Step 2: Start camera
        print("2. Starting camera...")
        response = requests.post(f"{base_url}/api/enhanced-eye-tracking/start_camera")
        if response.status_code != 200:
            print(f"❌ Failed to start camera: {response.status_code}")
            return False
        data = response.json()
        if not data.get('success'):
            print(f"❌ Camera start failed: {data.get('message')}")
            return False
        print(f"✅ Camera started: {data.get('message')}")

        # Step 3: Start tracking
        print("3. Starting tracking...")
        response = requests.post(f"{base_url}/api/enhanced-eye-tracking/start_tracking")
        if response.status_code != 200:
            print(f"❌ Failed to start tracking: {response.status_code}")
            return False
        data = response.json()
        if not data.get('success'):
            print(f"❌ Tracking start failed: {data.get('message')}")
            return False
        print(f"✅ Tracking started: {data.get('message')}")

        # Step 4: Test gaze data collection
        print("4. Testing gaze data collection...")
        gaze_samples = []
        directions = ['center', 'up', 'down', 'left', 'right', 'up-left', 'up-right', 'down-left', 'down-right']

        for i in range(20):  # Collect 20 samples
            response = requests.get(f"{base_url}/api/enhanced-eye-tracking/get_enhanced_gaze?width=640&height=480")
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    gaze_x = data.get('gaze_x', 0.5)
                    gaze_y = data.get('gaze_y', 0.5)
                    confidence = data.get('confidence', 0.0)
                    face_detected = data.get('face_detected', False)
                    gaze_samples.append({
                        'x': gaze_x,
                        'y': gaze_y,
                        'confidence': confidence,
                        'face_detected': face_detected
                    })
                    print(".3f")
                else:
                    print(f"❌ Gaze request failed: {data.get('message')}")
            else:
                print(f"❌ HTTP error: {response.status_code}")

            time.sleep(0.1)  # Small delay between requests

        # Step 5: Analyze movement range
        print("5. Analyzing gaze movement range...")
        if not gaze_samples:
            print("❌ No gaze samples collected")
            return False

        x_values = [s['x'] for s in gaze_samples]
        y_values = [s['y'] for s in gaze_samples]

        x_range = max(x_values) - min(x_values)
        y_range = max(y_values) - min(y_values)

        x_center = sum(x_values) / len(x_values)
        y_center = sum(y_values) / len(y_values)

        print(".3f")
        print(".3f")
        print(".3f")
        print(".3f")

        # Check if movement covers reasonable range
        min_expected_range = 0.3  # At least 30% of screen should be covered
        if x_range < min_expected_range and y_range < min_expected_range:
            print(f"⚠️  Limited movement range detected. X range: {x_range:.3f}, Y range: {y_range:.3f}")
            print("   This might indicate the gaze tracking is not moving freely in all directions.")
        else:
            print("✅ Good movement range detected - gaze tracking appears to be working in multiple directions")

        # Check face detection
        face_detection_rate = sum(1 for s in gaze_samples if s['face_detected']) / len(gaze_samples)
        print(".1%")

        if face_detection_rate < 0.5:
            print("⚠️  Low face detection rate - this might affect tracking accuracy")

        # Step 6: Stop tracking and camera
        print("6. Stopping tracking and camera...")
        requests.post(f"{base_url}/api/enhanced-eye-tracking/stop_tracking")
        requests.post(f"{base_url}/api/enhanced-eye-tracking/stop_camera")
        print("✅ Cleanup completed")

        print("\n" + "=" * 50)
        print("🎯 GAZE TRACKING TEST SUMMARY")
        print("=" * 50)
        print(f"Total samples collected: {len(gaze_samples)}")
        print(".3f")
        print(".3f")
        print(".1%")
        print(".3f")
        print(".3f")

        # Determine if test passed
        if len(gaze_samples) >= 10 and (x_range >= min_expected_range or y_range >= min_expected_range):
            print("✅ TEST PASSED: Gaze tracking is functional with reasonable movement range")
            return True
        else:
            print("❌ TEST FAILED: Insufficient movement range or samples")
            return False

    except requests.exceptions.RequestException as e:
        print(f"❌ Network error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    success = test_gaze_movement()
    sys.exit(0 if success else 1)
