import sqlite3
import time
from datetime import datetime

def monitor_data_storage():
    """Monitor data storage in real-time"""
    print("=== EyeCareAI Data Storage Monitor ===")
    print("Press Ctrl+C to stop monitoring")
    print("-" * 50)
    
    last_count = 0
    
    while True:
        try:
            conn = sqlite3.connect('database.db')
            cur = conn.cursor()
            
            # Check eye tracking data count
            cur.execute("SELECT COUNT(*) FROM eye_tracking_data")
            current_count = cur.fetchone()[0]
            
            # Check for new data
            if current_count > last_count:
                new_records = current_count - last_count
                print(f"[{datetime.now().strftime('%H:%M:%S')}] NEW DATA: {new_records} new record(s) added! Total: {current_count}")
                
                # Show latest records
                cur.execute("SELECT user_id, timestamp, blink_rate, drowsiness_level, eye_strain_level FROM eye_tracking_data ORDER BY timestamp DESC LIMIT 3")
                recent_data = cur.fetchall()
                for record in recent_data:
                    print(f"  User: {record[0]}, Time: {record[1]}, Blink: {record[2]}, Drowsiness: {record[3]}, Eye Strain: {record[4]}")
                
                last_count = current_count
            else:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] Waiting... (Total records: {current_count})")
            
            # Check active sessions
            cur.execute("SELECT COUNT(*) FROM user_sessions WHERE end_time IS NULL")
            active_sessions = cur.fetchone()[0]
            if active_sessions > 0:
                print(f"  Active sessions: {active_sessions}")
            
            conn.close()
            time.sleep(2)  # Check every 2 seconds
            
        except KeyboardInterrupt:
            print("\nMonitoring stopped.")
            break
        except Exception as e:
            print(f"Error: {e}")
            time.sleep(2)

if __name__ == "__main__":
    monitor_data_storage()