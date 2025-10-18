import time
import json
from datetime import datetime, timedelta
import sqlite3
import os
import threading
import uuid
import logging
# Remove PostgreSQL import - using SQLite

# Define custom exception
class DatabaseError(Exception):
    pass

class RealTimeDataCollector:
    def __init__(self, db_config):
        self.db_config = db_config
        self.buffer_lock = threading.Lock()
        self.session_lock = threading.Lock()
        self.data_buffer = []
        self.active_sessions = {}
        self.max_buffer_size = 5  # Reduced for immediate storage during testing
        self.save_interval = 10  # seconds - more frequent saves
        self._setup_database()
        self._start_background_tasks()
        self.current_metrics = {}
        # Add missing attributes for metrics calculation
        self.blink_timestamps = []
        self.eye_closure_data = []
        self.total_blink_count = 0
        self.session_start_time = None

    def get_db_connection(self):
        return sqlite3.connect(self.db_config['database'])

    def _setup_database(self):
        try:
            with self.get_db_connection() as conn:
                cur = conn.cursor()
                # Verify all required tables exist
                tables = ['users', 'eye_tracking_data', 'user_sessions', 'notifications', 'user_settings']
                for table in tables:
                    cur.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table}'")
                    if not cur.fetchone():
                        # Instead of raising an error, just log a warning for missing tables
                        logging.warning(f'Table {table} does not exist - this is normal for new databases')
                        # Don't raise error - tables will be created by the application
        except Exception as e:
            # Log the error but don't raise it - allow the application to continue
            logging.warning(f'Database setup warning: {str(e)}')
            # Don't raise the exception - this allows the application to work with new databases

    def start_session(self, user_id, session_id):
        with self.session_lock:
            if user_id in self.active_sessions:
                self.end_session(user_id)

            start_time = datetime.now()

            session_data = {
                'session_id': session_id,
                'start_time': start_time,
                'last_activity': start_time,
                'total_blinks': 0,
                'blink_rate_readings': [],
                'drowsiness_readings': [],
                'eye_strain_readings': [],
            }
            self.active_sessions[user_id] = session_data

            try:
                with self.get_db_connection() as conn:
                    cur = conn.cursor()
                    cur.execute(
                        "INSERT INTO user_sessions (user_id, session_id, start_time) VALUES (?, ?, ?)",
                        (user_id, session_id, start_time)
                    )
                return session_id
            except Exception as e:
                logging.error(f'Error creating session: {str(e)}')
                self.active_sessions.pop(user_id, None)
                raise

    def end_session(self, user_id):
        with self.session_lock:
            if user_id not in self.active_sessions:
                return

            session_data = self.active_sessions.pop(user_id)
            self._save_buffered_data() # Save any remaining data

            end_time = datetime.now()
            session_id = session_data['session_id']

            # Calculate session summary
            total_blinks = session_data['total_blinks']
            avg_blink_rate = sum(session_data['blink_rate_readings']) / len(session_data['blink_rate_readings']) if session_data['blink_rate_readings'] else 0
            max_drowsiness = max(session_data['drowsiness_readings']) if session_data['drowsiness_readings'] else 0
            avg_eye_strain = sum(session_data['eye_strain_readings']) / len(session_data['eye_strain_readings']) if session_data['eye_strain_readings'] else 0

            try:
                with self.get_db_connection() as conn:
                    cur = conn.cursor()
                    cur.execute("""
                        UPDATE user_sessions
                        SET end_time = ?, total_blinks = ?, avg_blink_rate = ?, max_drowsiness = ?, avg_eye_strain = ?
                        WHERE session_id = ?
                    """, (end_time, total_blinks, avg_blink_rate, max_drowsiness, avg_eye_strain, session_id))
            except Exception as e:
                logging.error(f"Error ending session {session_id}: {str(e)}")

    def record_blink_data(self, user_id, blink_rate, eye_ratio, left_ratio, right_ratio, drowsiness_level, timestamp, eye_strain_level=None, eye_closure_duration=None):
        try:
            # Debug logging
            logging.info(f"record_blink_data called with: user_id={user_id}, blink_rate={blink_rate}, eye_ratio={eye_ratio}, left_ratio={left_ratio}, right_ratio={right_ratio}, drowsiness_level={drowsiness_level}, eye_strain_level={eye_strain_level}")
            
            # Enhanced input validation
            if not isinstance(user_id, (int, str)) or (isinstance(user_id, str) and not user_id.isdigit()):
                raise ValueError('Invalid user_id: must be a positive integer')
            user_id = int(user_id)
            
            # Validate numeric ranges
            if not all(isinstance(x, (int, float)) for x in [blink_rate, eye_ratio, left_ratio, right_ratio]):
                raise ValueError('Invalid metric values: must be numeric')
            if not all(0 <= x <= 1 for x in [eye_ratio, left_ratio, right_ratio]):
                raise ValueError('Invalid ratio values: must be between 0 and 1')
            if not isinstance(drowsiness_level, (int, float)) or not 0 <= drowsiness_level <= 100:
                raise ValueError('Invalid drowsiness_level: must be between 0 and 100')
            if eye_strain_level is not None and (not isinstance(eye_strain_level, (int, float)) or not 0 <= eye_strain_level <= 100):
                raise ValueError('Invalid eye_strain_level: must be between 0 and 100')
            if eye_closure_duration is not None and (not isinstance(eye_closure_duration, (int, float)) or eye_closure_duration < 0):
                raise ValueError('Invalid eye_closure_duration: must be non-negative')

            # Convert timestamp if it's a string (from JavaScript)
            if isinstance(timestamp, str):
                try:
                    timestamp = datetime.fromisoformat(timestamp.replace('Z', '+00:00').replace('T', ' '))
                except ValueError:
                    timestamp = datetime.now()
            else:
                timestamp = datetime.now()

            # Update active session data with thread safety
            with self.session_lock:
                if user_id in self.active_sessions:
                    session = self.active_sessions[user_id]
                    session['last_activity'] = timestamp
                    session['total_blinks'] += 1
                    session['blink_rate_readings'].append(blink_rate)
                    session['drowsiness_readings'].append(drowsiness_level)
                    if eye_strain_level is not None:
                        session['eye_strain_readings'].append(eye_strain_level)
                else:
                    # Auto-start session if none exists
                    session_id = str(uuid.uuid4())
                    self.start_session(user_id, session_id)

            # Prepare data point
            data_point = {
                'user_id': user_id,
                'blink_rate': blink_rate,
                'eye_ratio': eye_ratio,
                'left_ratio': left_ratio,
                'right_ratio': right_ratio,
                'drowsiness_level': drowsiness_level,
                'eye_strain_level': eye_strain_level,
                'eye_closure_duration': eye_closure_duration,
                'timestamp': timestamp,
                'session_id': self.active_sessions.get(user_id, {}).get('session_id')
            }
            
            # Update current metrics with thread safety
            with self.buffer_lock:
                self.current_metrics = data_point.copy()

            # Thread-safe buffer addition with immediate save for testing
            with self.buffer_lock:
                self.data_buffer.append(data_point)
                logging.info(f"📦 Added data point to buffer. Buffer size: {len(self.data_buffer)}")
                
                # Force immediate save for real-time feedback
                try:
                    self._save_buffered_data()
                    logging.info(f"✅ Immediate save completed successfully")
                except Exception as save_error:
                    logging.error(f"❌ Immediate save failed: {save_error}")
                    # Don't raise the error - let it retry later

        except ValueError as e:
            logging.error(f'Validation error in record_blink_data: {str(e)}')
            raise
        except Exception as e:
            logging.error(f'Error recording blink data: {str(e)}')
            raise

    def _direct_save_data_point(self, data_point):
        """Direct database insertion without buffering - used as fallback"""
        try:
            conn = sqlite3.connect(self.db_config['database'], timeout=3.0)
            cur = conn.cursor()
            
            cur.execute("""
                INSERT INTO eye_tracking_data
                (user_id, timestamp, blink_rate, drowsiness_level, eye_strain_level, focus_score, session_duration)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                int(data_point['user_id']),
                data_point['timestamp'],
                float(data_point['blink_rate']),
                float(data_point['drowsiness_level']),
                float(data_point.get('eye_strain_level', 30.0)),
                75.0,
                0
            ))
            
            conn.commit()
            conn.close()
            logging.info(f"🎆 Direct database insertion successful for user {data_point['user_id']}")
            
        except Exception as e:
            logging.error(f"❌ Direct database insertion failed: {str(e)}")
            raise

    def record_break_reminder(self, user_id, eye_strain_level, drowsiness_level, urgency, timestamp):
        try:
            with self.get_db_connection() as conn:
                cur = conn.cursor()
                cur.execute(
                    "INSERT INTO break_reminders (user_id, timestamp, eye_strain_level, drowsiness_level, urgency) VALUES (?, ?, ?, ?, ?)",
                    (user_id, timestamp, eye_strain_level, drowsiness_level, urgency)
                )
                conn.commit()
        except Exception as e:
            logging.error(f"Error recording break reminder: {str(e)}")
            raise

    def record_notification(self, user_id, notification_type, message, severity='info'):
        """Record a notification in the database"""
        try:
            with self.get_db_connection() as conn:
                cur = conn.cursor()
                cur.execute(
                    "INSERT INTO notifications (user_id, type, message, severity, timestamp) VALUES (?, ?, ?, ?, ?)",
                    (user_id, notification_type, message, severity, datetime.now())
                )
                conn.commit()
                logging.info(f"Notification recorded for user {user_id}: {notification_type} - {message}")
        except Exception as e:
            logging.error(f"Error recording notification: {str(e)}")
            raise

    def _save_buffered_data(self):
        if not self.data_buffer:
            return

        failed_points = []
        data_to_save = []
        with self.buffer_lock:
            data_to_save = self.data_buffer.copy()
            self.data_buffer.clear()

        if not data_to_save:
            return

        try:
            # Use immediate connection with timeout to prevent hanging
            conn = sqlite3.connect(self.db_config['database'], timeout=5.0)
            conn.execute('PRAGMA journal_mode=WAL')  # Enable WAL mode for concurrent access
            conn.execute('PRAGMA busy_timeout=3000')  # 3 second timeout for locks
            
            cur = conn.cursor()
            
            for point in data_to_save:
                try:
                    logging.info(f"Saving data point: user_id={point['user_id']}, blink_rate={point['blink_rate']}")
                    
                    # Simplified, direct insertion with proper error handling
                    cur.execute("""
                        INSERT INTO eye_tracking_data
                        (user_id, timestamp, blink_rate, drowsiness_level, eye_strain_level, focus_score, session_duration)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, (
                        int(point['user_id']),
                        point['timestamp'],
                        float(point['blink_rate']),
                        float(point['drowsiness_level']),
                        float(point.get('eye_strain_level', 30.0)),
                        75.0,  # Default focus_score
                        0  # Default session_duration
                    ))
                    
                    logging.info(f"✅ Successfully inserted data for user {point['user_id']}")
                    
                except Exception as e:
                    logging.error(f'❌ Failed to save individual data point: {str(e)}')
                    logging.error(f'   Data point: {point}')
                    failed_points.append(point)
            
            # Commit all successful insertions at once
            conn.commit()
            successful_count = len(data_to_save) - len(failed_points)
            logging.info(f"🎉 Successfully committed {successful_count} data points to database")
            
            conn.close()

        except sqlite3.OperationalError as e:
            logging.error(f'❌ Database operational error: {str(e)}')
            if 'locked' in str(e).lower():
                logging.error('   Database is locked - will retry later')
            failed_points.extend(data_to_save)
            
        except Exception as e:
            logging.error(f'❌ Unexpected error saving buffered data: {str(e)}')
            failed_points.extend(data_to_save)

        finally:
            # Re-queue failed points for later retry (but limit to prevent memory buildup)
            if failed_points:
                logging.warning(f"⚠️  Re-queuing {len(failed_points)} failed data points")
                with self.buffer_lock:
                    # Only keep the most recent 10 failed points to prevent memory issues
                    self.data_buffer.extend(failed_points[-10:])

    def get_current_metrics(self):
        """Get current real-time metrics with proper calculation for each parameter"""
        try:
            # Calculate blink rate (blinks per minute)
            blink_rate = self._calculate_blink_rate()
            
            # Calculate drowsiness level (0-100%)
            drowsiness_level = self._calculate_drowsiness_level()
            
            # Calculate eye strain level (0-100%)
            eye_strain_level = self._calculate_eye_strain_level()
            
            # Calculate PERCLOS (Percentage of Eye Closure)
            perclos = self._calculate_perclos()
            
            # Calculate total blinks in current session
            total_blinks = self._get_total_blinks()
            
            # Calculate session duration
            session_duration = self._get_session_duration()
            
            return {
                'blink_rate': round(blink_rate, 1),
                'drowsiness_level': round(drowsiness_level, 1),
                'eye_strain_level': round(eye_strain_level, 1),
                'perclos': round(perclos, 1),
                'total_blinks': total_blinks,
                'session_duration': session_duration,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logging.error(f'Error calculating current metrics: {str(e)}')
            # Return default values in case of error
            return {
                'blink_rate': 15.0,
                'drowsiness_level': 25.0,
                'eye_strain_level': 30.0,
                'perclos': 15.0,
                'total_blinks': 0,
                'session_duration': 0,
                'timestamp': datetime.now().isoformat()
            }
    
    def _calculate_blink_rate(self):
        """Calculate blink rate in blinks per minute based on recent blink events"""
        if not hasattr(self, 'blink_timestamps') or not self.blink_timestamps:
            return 15.0  # Default healthy blink rate
        
        # Consider blinks from the last 60 seconds
        current_time = time.time()
        recent_blinks = [ts for ts in self.blink_timestamps if current_time - ts <= 60]
        
        if not recent_blinks:
            return 0.0
            
        # Calculate blinks per minute
        return len(recent_blinks)
    
    def _calculate_drowsiness_level(self):
        """Calculate drowsiness level based on eye closure patterns"""
        if not hasattr(self, 'eye_closure_data') or not self.eye_closure_data:
            return 25.0  # Default low drowsiness
        
        # Analyze recent eye closure patterns (last 30 seconds)
        current_time = time.time()
        recent_data = [data for data in self.eye_closure_data 
                      if current_time - data['timestamp'] <= 30]
        
        if not recent_data:
            return 25.0
            
        # Calculate average eye closure percentage
        avg_closure = sum(data['closure_percentage'] for data in recent_data) / len(recent_data)
        
        # Map to drowsiness level (0-100%)
        # Higher closure percentage indicates higher drowsiness
        drowsiness = min(100.0, max(0.0, avg_closure * 1.5))
        return drowsiness
    
    def _calculate_eye_strain_level(self):
        """Calculate eye strain level based on blink rate and eye closure patterns"""
        blink_rate = self._calculate_blink_rate()
        drowsiness = self._calculate_drowsiness_level()
        
        # Eye strain increases with low blink rate and high drowsiness
        strain_factor = 0.0
        
        if blink_rate < 12:  # Low blink rate indicates strain
            strain_factor += (12 - blink_rate) * 3
        
        if drowsiness > 50:  # High drowsiness indicates strain
            strain_factor += (drowsiness - 50) * 0.6
            
        # Normalize to 0-100 scale
        eye_strain = min(100.0, max(0.0, strain_factor))
        return eye_strain
    
    def _calculate_perclos(self):
        """Calculate PERCLOS (Percentage of Eye Closure) - standard drowsiness metric"""
        if not hasattr(self, 'eye_closure_data') or not self.eye_closure_data:
            return 15.0  # Default
        
        # Consider data from the last 60 seconds
        current_time = time.time()
        recent_data = [data for data in self.eye_closure_data 
                      if current_time - data['timestamp'] <= 60]
        
        if not recent_data:
            return 0.0
            
        # Calculate percentage of time eyes were more than 80% closed
        high_closure_count = sum(1 for data in recent_data 
                               if data['closure_percentage'] > 80)
        
        perclos = (high_closure_count / len(recent_data)) * 100
        return min(100.0, perclos)
    
    def _get_total_blinks(self):
        """Get total number of blinks in current session"""
        if not hasattr(self, 'total_blink_count'):
            return 0
        return self.total_blink_count
    
    def _get_session_duration(self):
        """Get current session duration in seconds"""
        if not hasattr(self, 'session_start_time') or self.session_start_time is None:
            return 0
        return int(time.time() - self.session_start_time)

    def get_notifications(self, user_id, limit=50):
        """Fetch notifications for a given user."""
        try:
            with self.get_db_connection() as conn:
                cur = conn.cursor()
                cur.execute("""
                    SELECT id, type, message, severity, timestamp, read
                    FROM notifications
                    WHERE user_id = ?
                    ORDER BY timestamp DESC
                    LIMIT ?
                """, (user_id, limit))
                notifications = cur.fetchall()
            return [dict(zip([column[0] for column in cur.description], row)) for row in notifications]
        except Exception as e:
            logging.error(f"Error fetching notifications: {str(e)}")
            return []

    def cleanup_inactive_sessions(self):
        try:
            current_time = datetime.now()
            with self.session_lock:
                inactive_users = [
                    user_id for user_id, session_data in self.active_sessions.items()
                    if (current_time - session_data['last_activity']).total_seconds() > 300  # 5 minutes timeout
                ]

                for user_id in inactive_users:
                    self.end_session(user_id)

        except Exception as e:
            logging.error(f'Error cleaning up inactive sessions: {str(e)}')

    def _start_background_tasks(self):
        def run_periodic_save():
            while True:
                try:
                    time.sleep(self.save_interval)
                    self._save_buffered_data()
                    self.cleanup_inactive_sessions()
                except Exception as e:
                    logging.error(f'Error in background task: {str(e)}')

        save_thread = threading.Thread(target=run_periodic_save, daemon=True)
        save_thread.start()

    def get_recent_data(self, user_id, limit=100):
        """Retrieve recent eye tracking data for a user"""
        try:
            with self.get_db_connection() as conn:
                cur = conn.cursor()
                cur.execute("""
                    SELECT * FROM eye_tracking_data 
                    WHERE user_id = ? 
                    ORDER BY timestamp DESC 
                    LIMIT ?
                """, (user_id, limit))
                rows = cur.fetchall()
                # Convert to dict format
                columns = [column[0] for column in cur.description]
                return [dict(zip(columns, row)) for row in rows]
        except Exception as e:
            logging.error(f'Error retrieving recent data: {str(e)}')
            return []

    def get_recommendations(self, user_id):
        """Generate personalized recommendations based on user data"""
        try:
            recent_data = self.get_recent_data(user_id, limit=50)
            if not recent_data:
                return ['Start tracking to receive personalized recommendations']
            
            recommendations = []
            
            # Analyze blink rate
            avg_blink_rate = sum(d.get('blink_rate', 15) for d in recent_data) / len(recent_data)
            if avg_blink_rate < 12:
                recommendations.append('Your blink rate is low. Try the 20-20-20 rule: every 20 minutes, look at something 20 feet away for 20 seconds.')
            elif avg_blink_rate > 20:
                recommendations.append('Your blink rate is high. This may indicate eye strain. Consider taking more frequent breaks.')
            
            # Analyze drowsiness
            avg_drowsiness = sum(d.get('drowsiness_level', 0) for d in recent_data) / len(recent_data)
            if avg_drowsiness > 70:
                recommendations.append('High drowsiness detected. Ensure you are getting adequate sleep and staying hydrated.')
            
            # Analyze eye strain
            avg_strain = sum(d.get('eye_strain_level', 0) for d in recent_data) / len(recent_data)
            if avg_strain > 60:
                recommendations.append('High eye strain detected. Consider reducing screen time and doing eye exercises.')
            
            if not recommendations:
                recommendations.append('Your eye health metrics look good! Keep up the healthy habits.')
            
            return recommendations
            
        except Exception as e:
            logging.error(f'Error generating recommendations: {str(e)}')
            return ['Unable to generate recommendations at this time']

    def get_session_summary(self, user_id, session_id=None):
        """Get summary data for a specific session or the latest session"""
        try:
            with self.get_db_connection() as conn:
                cur = conn.cursor()
                if session_id:
                    cur.execute("""
                        SELECT * FROM user_sessions 
                        WHERE user_id = ? AND session_id = ?
                    """, (user_id, session_id))
                else:
                    cur.execute("""
                        SELECT * FROM user_sessions 
                        WHERE user_id = ? 
                        ORDER BY start_time DESC 
                        LIMIT 1
                    """, (user_id,))
                
                row = cur.fetchone()
                if row:
                    columns = [column[0] for column in cur.description]
                    return dict(zip(columns, row))
                return None
        except Exception as e:
            logging.error(f'Error retrieving session summary: {str(e)}')
            return None

    def get_user_analytics(self, user_id, days=7):
        """Get comprehensive analytics for a user over specified days"""
        try:
            with self.get_db_connection() as conn:
                cur = conn.cursor()
                # Get data for the specified period
                start_date = datetime.now() - timedelta(days=days)
                
                cur.execute("""
                    SELECT 
                        DATE(timestamp) as date,
                        AVG(blink_rate) as avg_blink_rate,
                        AVG(drowsiness_level) as avg_drowsiness,
                        AVG(eye_strain_level) as avg_eye_strain,
                        COUNT(*) * 5 as screen_time_minutes,  -- Assume 5 min per data point
                        MAX(drowsiness_level) as max_drowsiness,
                        MAX(eye_strain_level) as max_eye_strain
                    FROM eye_tracking_data 
                    WHERE user_id = ? AND timestamp >= ?
                    GROUP BY DATE(timestamp)
                    ORDER BY date DESC
                """, (user_id, start_date))
                
                rows = cur.fetchall()
                columns = [column[0] for column in cur.description]
                hourly_data = [dict(zip(columns, row)) for row in rows]
                
                # Get break reminder data
                cur.execute("""
                    SELECT
                        DATE(timestamp) as date,
                        COUNT(*) as total_reminders,
                        SUM(CASE WHEN urgency = 'high' THEN 1 ELSE 0 END) as high_urgency_reminders
                    FROM break_reminders
                    WHERE user_id = ? AND timestamp >= ?
                    GROUP BY DATE(timestamp)
                    ORDER BY date DESC
                """, (user_id, start_date))
                rows = cur.fetchall()
                columns = [column[0] for column in cur.description]
                break_reminder_data = [dict(zip(columns, row)) for row in rows]

                # Get session summary - using SQLite datetime functions
                cur.execute("""
                    SELECT 
                        COUNT(*) as total_sessions,
                        SUM((julianday(end_time) - julianday(start_time)) * 24 * 60) as total_screen_time,
                        AVG(avg_blink_rate) as avg_session_blink_rate,
                        AVG(max_drowsiness) as avg_max_drowsiness,
                        AVG(avg_eye_strain) as avg_eye_strain
                    FROM user_sessions
                    WHERE user_id = ? AND start_time >= ? AND end_time IS NOT NULL
                """, (user_id, start_date))
                
                row = cur.fetchone()
                columns = [column[0] for column in cur.description]
                session_summary = dict(zip(columns, row)) if row else None
                
                # Calculate progress metrics (comparing to previous period)
                prev_start_date = start_date - timedelta(days=days)
                cur.execute("""
                    SELECT 
                        AVG(blink_rate) as prev_blink_rate,
                        AVG(drowsiness_level) as prev_drowsiness,
                        AVG(eye_strain_level) as prev_eye_strain
                    FROM eye_tracking_data 
                    WHERE user_id = ? AND timestamp >= ? AND timestamp < ?
                """, (user_id, prev_start_date, start_date))
                
                row = cur.fetchone()
                columns = [column[0] for column in cur.description]
                prev_metrics = dict(zip(columns, row)) if row else None

                cur.execute("""
                    SELECT
                        SUM((julianday(end_time) - julianday(start_time)) * 24 * 60) as prev_screen_time
                    FROM user_sessions
                    WHERE user_id = ? AND start_time >= ? AND start_time < ? AND end_time IS NOT NULL
                """, (user_id, prev_start_date, start_date))

                row = cur.fetchone()
                columns = [column[0] for column in cur.description]
                prev_session_summary = dict(zip(columns, row)) if row else None

                # Calculate percentage changes
                current_blink = sum(d['avg_blink_rate'] or 0 for d in hourly_data) / len(hourly_data) if hourly_data else 0
                current_drowsiness = sum(d['avg_drowsiness'] or 0 for d in hourly_data) / len(hourly_data) if hourly_data else 0
                current_strain = sum(d['avg_eye_strain'] or 0 for d in hourly_data) / len(hourly_data) if hourly_data else 0
                current_screen_time = float(session_summary['total_screen_time']) if session_summary and session_summary['total_screen_time'] is not None else 0

                prev_blink = float(prev_metrics['prev_blink_rate']) if prev_metrics and prev_metrics['prev_blink_rate'] is not None else 15
                prev_drowsiness = float(prev_metrics['prev_drowsiness']) if prev_metrics and prev_metrics['prev_drowsiness'] is not None else 0
                prev_strain = float(prev_metrics['prev_eye_strain']) if prev_metrics and prev_metrics['prev_eye_strain'] is not None else 0
                prev_screen_time = float(prev_session_summary['prev_screen_time']) if prev_session_summary and prev_session_summary['prev_screen_time'] is not None else 0

                def calculate_change(current, previous):
                    if previous == 0:
                        return 0
                    return ((current - previous) / previous) * 100

                recommendations = self.get_recommendations(user_id)
                return {
                    'hourly_data': hourly_data,
                    'break_reminder_data': break_reminder_data,
                    'session_summary': session_summary or {
                        'total_sessions': 0,
                        'total_screen_time': 0,
                        'avg_session_blink_rate': 0,
                        'avg_max_drowsiness': 0,
                        'avg_eye_strain': 0
                    },
                    'progress_metrics': {
                        'blink_rate_change': calculate_change(current_blink, prev_blink),
                        'drowsiness_change': calculate_change(current_drowsiness, prev_drowsiness),
                        'eye_strain_change': calculate_change(current_strain, prev_strain),
                        'screen_time_change': calculate_change(current_screen_time, prev_screen_time)
                    },
                    'recommendations': recommendations
                }

        except Exception as e:
            logging.error(f'Error getting user analytics: {str(e)}')
            user_data = {
                'hourly_data': [],
                'session_summary': {'total_sessions': 0, 'total_screen_time': 0},
                'trend_data': [],
                'progress_metrics': {
                    'blink_rate_change': 0,
                    'drowsiness_change': 0,
                    'eye_strain_change': 0,
                    'screen_time_change': 0
                }
            }
            if not user_data.get('hourly_data'):
                user_data['hourly_data'] = [{
                    'avg_blink_rate': 0,
                    'avg_drowsiness': 0,
                    'avg_eye_strain': 0,
                    'screen_time_minutes': 0
                }]
            return user_data

    def get_historical_trends(self, user_id, period='day'):
        """Get historical trends for different time periods with proper aggregation"""
        try:
            # Define period configurations with proper date ranges and groupings
            period_config = {
                'day': {'days': 1, 'group_by': "datetime(timestamp, 'start of hour')", 'date_format': '%H:%M'},
                'week': {'days': 7, 'group_by': "DATE(timestamp)", 'date_format': '%Y-%m-%d'},
                'month': {'days': 30, 'group_by': "DATE(timestamp)", 'date_format': '%Y-%m-%d'},
                'quarter': {'days': 90, 'group_by': "strftime('%Y-%W', timestamp)", 'date_format': '%Y-W%W'}
            }
            
            config = period_config.get(period, period_config['week'])
            period_days = config['days']
            group_by_clause = config['group_by']
            
            with self.get_db_connection() as conn:
                cur = conn.cursor()
                start_date = datetime.now() - timedelta(days=period_days)
                
                # Get aggregated data based on period
                if period == 'day':
                    # Hourly aggregation for day view - last 24 hours
                    cur.execute(f"""
                        SELECT 
                            strftime('%H', timestamp) as hour,
                            {group_by_clause} as time_period,
                            AVG(blink_rate) as avg_blink_rate,
                            AVG(drowsiness_level) as avg_drowsiness,
                            AVG(eye_strain_level) as avg_eye_strain,
                            COUNT(*) as data_points,
                            COUNT(*) * 2 as estimated_minutes,
                            MAX(drowsiness_level) as max_drowsiness,
                            MAX(eye_strain_level) as max_eye_strain,
                            MIN(blink_rate) as min_blink_rate,
                            MAX(blink_rate) as max_blink_rate
                        FROM eye_tracking_data 
                        WHERE user_id = ? AND datetime(timestamp) >= datetime('now', '-24 hours')
                        GROUP BY {group_by_clause}
                        ORDER BY time_period ASC
                    """, (user_id,))
                elif period == 'week':
                    # Daily aggregation for week view - last 7 days
                    cur.execute(f"""
                        SELECT 
                            strftime('%w', timestamp) as day_of_week,
                            {group_by_clause} as time_period,
                            AVG(blink_rate) as avg_blink_rate,
                            AVG(drowsiness_level) as avg_drowsiness,
                            AVG(eye_strain_level) as avg_eye_strain,
                            COUNT(*) as data_points,
                            COUNT(*) * 2 as estimated_minutes,
                            MAX(drowsiness_level) as max_drowsiness,
                            MAX(eye_strain_level) as max_eye_strain,
                            MIN(blink_rate) as min_blink_rate,
                            MAX(blink_rate) as max_blink_rate
                        FROM eye_tracking_data 
                        WHERE user_id = ? AND DATE(timestamp) >= DATE('now', '-7 days')
                        GROUP BY {group_by_clause}
                        ORDER BY time_period ASC
                    """, (user_id,))
                elif period == 'month':
                    # Daily aggregation for month view - last 30 days
                    cur.execute(f"""
                        SELECT 
                            strftime('%d', timestamp) as day_of_month,
                            {group_by_clause} as time_period,
                            AVG(blink_rate) as avg_blink_rate,
                            AVG(drowsiness_level) as avg_drowsiness,
                            AVG(eye_strain_level) as avg_eye_strain,
                            COUNT(*) as data_points,
                            COUNT(*) * 2 as estimated_minutes,
                            MAX(drowsiness_level) as max_drowsiness,
                            MAX(eye_strain_level) as max_eye_strain,
                            MIN(blink_rate) as min_blink_rate,
                            MAX(blink_rate) as max_blink_rate
                        FROM eye_tracking_data 
                        WHERE user_id = ? AND DATE(timestamp) >= DATE('now', '-30 days')
                        GROUP BY {group_by_clause}
                        ORDER BY time_period ASC
                    """, (user_id,))
                else:  # quarter
                    # Weekly aggregation for quarter view - last 90 days
                    cur.execute(f"""
                        SELECT 
                            strftime('%W', timestamp) as week_of_year,
                            {group_by_clause} as time_period,
                            AVG(blink_rate) as avg_blink_rate,
                            AVG(drowsiness_level) as avg_drowsiness,
                            AVG(eye_strain_level) as avg_eye_strain,
                            COUNT(*) as data_points,
                            COUNT(*) * 2 as estimated_minutes,
                            MAX(drowsiness_level) as max_drowsiness,
                            MAX(eye_strain_level) as max_eye_strain,
                            MIN(blink_rate) as min_blink_rate,
                            MAX(blink_rate) as max_blink_rate
                        FROM eye_tracking_data 
                        WHERE user_id = ? AND DATE(timestamp) >= DATE('now', '-90 days')
                        GROUP BY {group_by_clause}
                        ORDER BY time_period ASC
                    """, (user_id,))
                
                rows = cur.fetchall()
                columns = [column[0] for column in cur.description]
                trend_data = [dict(zip(columns, row)) for row in rows]
                
                # Enhanced trend data with calculated metrics
                for data_point in trend_data:
                    # Add calculated fields for frontend charts
                    blink_rate = data_point.get('avg_blink_rate', 0) or 0
                    drowsiness = data_point.get('avg_drowsiness', 0) or 0
                    eye_strain = data_point.get('avg_eye_strain', 0) or 0
                    
                    # Calculate health scores
                    data_point['blink_health_score'] = min(100, max(0, (blink_rate / 15) * 100)) if blink_rate > 0 else 0
                    data_point['drowsiness_health_score'] = max(0, 100 - drowsiness) if drowsiness > 0 else 100
                    data_point['eye_strain_health_score'] = max(0, 100 - eye_strain) if eye_strain > 0 else 100
                    
                    # Overall health score (weighted average)
                    data_point['overall_health_score'] = (
                        data_point['blink_health_score'] * 0.3 + 
                        data_point['drowsiness_health_score'] * 0.4 + 
                        data_point['eye_strain_health_score'] * 0.3
                    )
                    
                    # Format timestamp for different periods
                    if period == 'day':
                        data_point['formatted_time'] = data_point.get('hour', '00') + ':00'
                    elif period in ['week', 'month']:
                        data_point['formatted_time'] = data_point.get('time_period', '')
                    else:  # quarter
                        data_point['formatted_time'] = f"Week {data_point.get('week_of_year', '00')}"
                
                # Get historical break reminder data with period-appropriate grouping
                if period == 'day':
                    reminder_group_clause = "datetime(timestamp, 'start of hour')"
                    reminder_start_condition = "datetime(timestamp) >= datetime('now', '-24 hours')"
                elif period == 'week':
                    reminder_group_clause = "DATE(timestamp)"
                    reminder_start_condition = "DATE(timestamp) >= DATE('now', '-7 days')"
                elif period == 'month':
                    reminder_group_clause = "DATE(timestamp)"
                    reminder_start_condition = "DATE(timestamp) >= DATE('now', '-30 days')"
                else:  # quarter
                    reminder_group_clause = "strftime('%Y-%W', timestamp)"
                    reminder_start_condition = "DATE(timestamp) >= DATE('now', '-90 days')"
                
                cur.execute(f"""
                    SELECT
                        {reminder_group_clause} as time_period,
                        COUNT(*) as total_reminders,
                        SUM(CASE WHEN urgency = 'high' THEN 1 ELSE 0 END) as high_urgency_reminders,
                        SUM(CASE WHEN urgency = 'medium' THEN 1 ELSE 0 END) as medium_urgency_reminders,
                        SUM(CASE WHEN urgency = 'low' THEN 1 ELSE 0 END) as low_urgency_reminders
                    FROM break_reminders
                    WHERE user_id = ? AND {reminder_start_condition}
                    GROUP BY {reminder_group_clause}
                    ORDER BY time_period ASC
                """, (user_id,))
                rows = cur.fetchall()
                columns = [column[0] for column in cur.description]
                historical_break_reminder_data = [dict(zip(columns, row)) for row in rows]
                
                # Calculate enhanced progress metrics with trend analysis
                if trend_data and len(trend_data) >= 2:
                    # For progress calculation, use first and last portions based on period
                    if period == 'day':
                        # Compare first 4 hours vs last 4 hours
                        comparison_size = min(4, len(trend_data) // 2)
                    elif period == 'week':
                        # Compare first 2 days vs last 2 days
                        comparison_size = min(2, len(trend_data) // 2)
                    elif period == 'month':
                        # Compare first week vs last week
                        comparison_size = min(7, len(trend_data) // 2)
                    else:  # quarter
                        # Compare first month vs last month
                        comparison_size = min(4, len(trend_data) // 2)
                    
                    first_period = trend_data[:comparison_size]
                    last_period = trend_data[-comparison_size:]
                    
                    def safe_average(data_list, key):
                        values = [d.get(key, 0) or 0 for d in data_list]
                        return sum(values) / len(values) if values else 0
                    
                    first_avg_blink = safe_average(first_period, 'avg_blink_rate')
                    last_avg_blink = safe_average(last_period, 'avg_blink_rate')
                    
                    first_avg_drowsiness = safe_average(first_period, 'avg_drowsiness')
                    last_avg_drowsiness = safe_average(last_period, 'avg_drowsiness')
                    
                    first_avg_strain = safe_average(first_period, 'avg_eye_strain')
                    last_avg_strain = safe_average(last_period, 'avg_eye_strain')
                    
                    first_health_score = safe_average(first_period, 'overall_health_score')
                    last_health_score = safe_average(last_period, 'overall_health_score')
                    
                    def calculate_trend_change(first, last):
                        if first == 0:
                            return 100 if last > 0 else 0
                        return round(((last - first) / first) * 100, 1)
                    
                    def determine_trend_direction(change):
                        if change > 5:
                            return 'improving'
                        elif change < -5:
                            return 'declining'
                        else:
                            return 'stable'
                    
                    blink_change = calculate_trend_change(first_avg_blink, last_avg_blink)
                    drowsiness_change = calculate_trend_change(first_avg_drowsiness, last_avg_drowsiness)
                    strain_change = calculate_trend_change(first_avg_strain, last_avg_strain)
                    health_change = calculate_trend_change(first_health_score, last_health_score)
                    
                    progress_metrics = {
                        'blink_rate_change': blink_change,
                        'blink_rate_trend': determine_trend_direction(blink_change),
                        'drowsiness_change': -drowsiness_change,  # Negative because lower drowsiness is better
                        'drowsiness_trend': determine_trend_direction(-drowsiness_change),
                        'eye_strain_change': -strain_change,  # Negative because lower strain is better
                        'eye_strain_trend': determine_trend_direction(-strain_change),
                        'overall_health_change': health_change,
                        'overall_health_trend': determine_trend_direction(health_change),
                        'screen_time_change': 0,  # Will be calculated if session data available
                        'period_summary': {
                            'total_data_points': len(trend_data),
                            'avg_blink_rate': safe_average(trend_data, 'avg_blink_rate'),
                            'avg_drowsiness': safe_average(trend_data, 'avg_drowsiness'),
                            'avg_eye_strain': safe_average(trend_data, 'avg_eye_strain'),
                            'avg_health_score': safe_average(trend_data, 'overall_health_score')
                        }
                    }
                else:
                    progress_metrics = {
                        'blink_rate_change': 0,
                        'blink_rate_trend': 'stable',
                        'drowsiness_change': 0,
                        'drowsiness_trend': 'stable',
                        'eye_strain_change': 0,
                        'eye_strain_trend': 'stable',
                        'overall_health_change': 0,
                        'overall_health_trend': 'stable',
                        'screen_time_change': 0,
                        'period_summary': {
                            'total_data_points': 0,
                            'avg_blink_rate': 0,
                            'avg_drowsiness': 0,
                            'avg_eye_strain': 0,
                            'avg_health_score': 0
                        }
                    }
                    
                return {
                    'hourly_data': trend_data,  # For backwards compatibility
                    'trend_data': trend_data,
                    'historical_break_reminder_data': historical_break_reminder_data,
                    'progress_metrics': progress_metrics,
                    'period': period,
                    'period_config': config,
                    'total_data_points': len(trend_data),
                    'data_range': {
                        'start_date': (datetime.now() - timedelta(days=period_days)).strftime('%Y-%m-%d'),
                        'end_date': datetime.now().strftime('%Y-%m-%d'),
                        'period_days': period_days
                    }
                }
                    
        except Exception as e:
            logging.error(f'Error getting historical trends: {str(e)}')
            return {
                'hourly_data': [],
                'trend_data': [],
                'historical_break_reminder_data': [],
                'progress_metrics': {
                    'blink_rate_change': 0,
                    'blink_rate_trend': 'stable',
                    'drowsiness_change': 0,
                    'drowsiness_trend': 'stable',
                    'eye_strain_change': 0,
                    'eye_strain_trend': 'stable',
                    'overall_health_change': 0,
                    'overall_health_trend': 'stable',
                    'screen_time_change': 0,
                    'period_summary': {
                        'total_data_points': 0,
                        'avg_blink_rate': 0,
                        'avg_drowsiness': 0,
                        'avg_eye_strain': 0,
                        'avg_health_score': 0
                    }
                },
                'period': period,
                'period_config': {'days': 7, 'group_by': 'DATE(timestamp)', 'date_format': '%Y-%m-%d'},
                'total_data_points': 0,
                'data_range': {
                    'start_date': datetime.now().strftime('%Y-%m-%d'),
                    'end_date': datetime.now().strftime('%Y-%m-%d'),
                    'period_days': 7
                }
            }

    def get_drowsiness_analytics(self, user_id):
        """Get drowsiness analytics for a user - returns current session metrics"""
        try:
            # Get current metrics from the data collector
            current_metrics = self.get_current_metrics()
            
            # Get active session data
            session_data = self.active_sessions.get(user_id, {})
            
            # Calculate session metrics
            blink_rate_readings = session_data.get('blink_rate_readings', [])
            drowsiness_readings = session_data.get('drowsiness_readings', [])
            eye_strain_readings = session_data.get('eye_strain_readings', [])
            
            avg_blink_rate = sum(blink_rate_readings) / len(blink_rate_readings) if blink_rate_readings else 0
            avg_drowsiness = sum(drowsiness_readings) / len(drowsiness_readings) if drowsiness_readings else 0
            avg_eye_strain = sum(eye_strain_readings) / len(eye_strain_readings) if eye_strain_readings else 0
            
            # Calculate session duration
            session_start = session_data.get('start_time')
            session_duration = 0
            if session_start:
                session_duration = (datetime.now() - session_start).total_seconds()
            
            # Get total blinks
            total_blinks = session_data.get('total_blinks', 0)
            
            return {
                'blink_rate': current_metrics.get('blink_rate', avg_blink_rate),
                'drowsiness_level': current_metrics.get('drowsiness_level', avg_drowsiness),
                'eye_strain_level': current_metrics.get('eye_strain_level', avg_eye_strain),
                'session_duration': session_duration,
                'total_blinks': total_blinks,
                'perclos': current_metrics.get('perclos', 0),
                'blink_duration': current_metrics.get('blink_duration', 0.3),
                'status': 'active' if user_id in self.active_sessions else 'inactive'
            }
            
        except Exception as e:
            logging.error(f'Error getting drowsiness analytics: {str(e)}')
            # Return default metrics if there's an error
            return {
                'blink_rate': 15.0,
                'drowsiness_level': 25.0,
                'eye_strain_level': 15.0,
                'session_duration': 0,
                'total_blinks': 0,
                'perclos': 0.0,
                'blink_duration': 0.3,
                'status': 'inactive'
            }