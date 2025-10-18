import sqlite3
from datetime import datetime, timedelta

def quick_check():
    conn = sqlite3.connect('database.db')
    cur = conn.cursor()
    
    # Get total counts
    cur.execute("SELECT COUNT(*) FROM eye_tracking_data")
    eye_data_count = cur.fetchone()[0]
    
    cur.execute("SELECT COUNT(*) FROM user_sessions")
    sessions_count = cur.fetchone()[0]
    
    cur.execute("SELECT COUNT(*) FROM users")
    users_count = cur.fetchone()[0]
    
    print(f"📊 QUICK DATA SUMMARY:")
    print(f"   👥 Users: {users_count}")
    print(f"   📋 Eye tracking records: {eye_data_count}")
    print(f"   🔄 User sessions: {sessions_count}")
    
    # Check recent activity
    cur.execute("SELECT MAX(timestamp) FROM eye_tracking_data")
    latest_data = cur.fetchone()[0]
    
    if latest_data:
        print(f"   🕒 Latest data: {latest_data}")
        
        # Check if data is recent (within last hour)
        latest_time = datetime.fromisoformat(latest_data.replace('Z', '+00:00').replace('T', ' '))
        now = datetime.now()
        time_diff = now - latest_time
        
        if time_diff < timedelta(hours=1):
            print("   ✅ Recent data found!")
        else:
            print("   ⚠️  Data is old - tracking may not be active")
    else:
        print("   ❌ No eye tracking data found")
    
    # Check active sessions
    cur.execute("SELECT COUNT(*) FROM user_sessions WHERE end_time IS NULL")
    active_sessions = cur.fetchone()[0]
    
    if active_sessions > 0:
        print(f"   🟢 Active sessions: {active_sessions}")
    else:
        print("   🔴 No active sessions")
    
    conn.close()

if __name__ == "__main__":
    quick_check()