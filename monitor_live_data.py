#!/usr/bin/env python3

import sqlite3
import time
from datetime import datetime

def monitor_database():
    """Monitor database for new eye tracking data in real-time"""
    print("🔍 REAL-TIME DATABASE MONITOR")
    print("="*50)
    print("📋 Monitoring eye_tracking_data table for new records...")
    print("💡 Make sure you're logged in and using live tracking!")
    print()
    
    # Get initial count
    conn = sqlite3.connect('database.db')
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM eye_tracking_data")
    initial_count = cur.fetchone()[0]
    print(f"📊 Starting count: {initial_count} records")
    conn.close()
    
    last_count = initial_count
    
    while True:
        try:
            conn = sqlite3.connect('database.db')
            cur = conn.cursor()
            
            # Get current count
            cur.execute("SELECT COUNT(*) FROM eye_tracking_data")
            current_count = cur.fetchone()[0]
            
            # Check for new records
            if current_count > last_count:
                new_records = current_count - last_count
                print(f"🎉 NEW DATA! +{new_records} records (Total: {current_count})")
                
                # Show latest records
                cur.execute("""
                    SELECT user_id, blink_rate, drowsiness_level, eye_strain_level, timestamp 
                    FROM eye_tracking_data 
                    ORDER BY timestamp DESC 
                    LIMIT ?
                """, (new_records,))
                
                records = cur.fetchall()
                for record in records:
                    user_id, blink_rate, drowsiness, eye_strain, timestamp = record
                    print(f"   👤 User {user_id}: Blinks={blink_rate:.1f}, Drowsy={drowsiness:.1f}%, Strain={eye_strain:.1f}% at {timestamp}")
                
                last_count = current_count
            else:
                # Show waiting message every 10 seconds
                current_time = datetime.now().strftime("%H:%M:%S")
                print(f"⏳ {current_time} - Waiting for data... (Count: {current_count})")
            
            conn.close()
            time.sleep(5)  # Check every 5 seconds
            
        except KeyboardInterrupt:
            print("\n\n🛑 Monitor stopped by user")
            break
        except Exception as e:
            print(f"❌ Error: {e}")
            time.sleep(5)

if __name__ == "__main__":
    monitor_database()