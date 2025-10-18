import time
import enhanced_eye_tracker
import cv2
import numpy as np

def run_performance_test():
    print('Performance test starting...')

    # Initialize tracker
    tracker = enhanced_eye_tracker.EnhancedEyeTracker()

    # Create test frame (blank frame to simulate no face)
    frame = np.zeros((480, 640, 3), dtype=np.uint8)
    target = [0.5, 0.5]
    canvas = [640.0, 480.0]

    # Run performance test
    start = time.time()
    results = []

    for i in range(100):
        result = tracker.process_frame(frame, target, canvas)
        results.append(result)

    end = time.time()

    total_time = end - start
    avg_time_per_frame = total_time / 100
    fps = 100 / total_time

    print(f'Performance test completed in {total_time:.2f} seconds')
    print(f'Average processing time: {avg_time_per_frame:.4f} seconds per frame')
    print(f'FPS: {fps:.1f}')

    # Check if performance is acceptable (should be > 10 FPS for real-time)
    if fps >= 10:
        print('✅ Performance acceptable for real-time eye tracking')
    else:
        print('❌ Performance too slow for real-time eye tracking')

    return {
        'total_time': total_time,
        'avg_time_per_frame': avg_time_per_frame,
        'fps': fps,
        'acceptable': fps >= 10
    }

if __name__ == '__main__':
    run_performance_test()
