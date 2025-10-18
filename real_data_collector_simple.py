import json
from datetime import datetime, timedelta
import sqlite3
import os
import threading
import uuid
import logging

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
        self.current_metrics = {}
        # Add missing attributes for metrics calculation
        self.blink_timestamps = []
        self.eye_closure_data = []
        self.total_blink_count = 0
        self.session_start_time = None

    def get_db_connection(self):
        return sqlite3.connect(self.db_config['database'])

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
        conn = None
        try:
            conn = sqlite3.connect(self.db_config['database'], timeout=3.0)
            cur = conn.cursor()
            
            cur.execute("""
                INSERT INTO eye_tracking_data 
                (user_id, timestamp, blink_rate, drowsiness_level, eye_strain_level, focus_score, session_duration)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                data_point['user_id'],
                data_point['timestamp'],
                data_point['blink_rate'],
                data_point['drowsiness_level'],
                data_point.get('eye_strain_level', 30.0),
                75.0,  # Default focus score
                0  # Default session duration
            ))
            
            conn.commit()
            logging.info(f"💾 Direct save completed for user {data_point['user_id']}")
        except Exception as e:
            logging.error(f"❌ Direct save failed: {str(e)}")
        finally:
            if conn:
                conn.close()

    def _save_buffered_data(self):
        """Save buffered data to database with immediate execution"""
        if not self.data_buffer:
            return

        data_to_save = []
        conn = None
        try:
            # Copy buffer data to avoid race conditions
            with self.buffer_lock:
                data_to_save = self.data_buffer[:]
                self.data_buffer = []
            
            if not data_to_save:
                return
                
            logging.info(f"💾 Saving {len(data_to_save)} data points to database")
            
            conn = sqlite3.connect(self.db_config['database'], timeout=5.0)
            cur = conn.cursor()
            
            for data_point in data_to_save:
                try:
                    cur.execute("""
                        INSERT INTO eye_tracking_data 
                        (user_id, timestamp, blink_rate, drowsiness_level, eye_strain_level, focus_score, session_duration)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, (
                        data_point['user_id'],
                        data_point['timestamp'],
                        data_point['blink_rate'],
                        data_point['drowsiness_level'],
                        data_point.get('eye_strain_level', 30.0),
                        75.0,  # Default focus score
                        0  # Default session duration
                    ))
                except Exception as point_error:
                    logging.error(f"Error saving individual data point: {str(point_error)}")
                    # Continue with other data points
            
            conn.commit()
            logging.info(f"✅ Successfully saved {len(data_to_save)} data points")
            
        except Exception as e:
            logging.error(f"❌ Error in _save_buffered_data: {str(e)}")
            # Restore unsaved data to buffer
            with self.buffer_lock:
                self.data_buffer = data_to_save + self.data_buffer
        finally:
            if conn:
                conn.close()

    def get_current_metrics(self):
        """Get the most recent metrics for real-time display"""
        with self.buffer_lock:
            return self.current_metrics.copy() if self.current_metrics else {}

    def get_historical_trends(self, user_id, period='day'):
        """Get historical trends for charts and analytics"""
        try:
            conn = sqlite3.connect(self.db_config['database'], timeout=5.0)
            cur = conn.cursor()
            
            # Calculate time range based on period
            if period == 'day':
                time_filter = "datetime('now', '-1 day')"
            elif period == 'week':
                time_filter = "datetime('now', '-7 days')"
            elif period == 'month':
                time_filter = "datetime('now', '-1 month')"
            elif period == 'quarter':
                time_filter = "datetime('now', '-3 months')"
            else:
                time_filter = "datetime('now', '-1 day')"
            
            cur.execute(f"""
                SELECT timestamp, blink_rate, drowsiness_level, eye_strain_level, focus_score
                FROM eye_tracking_data 
                WHERE user_id = ? AND timestamp >= {time_filter}
                ORDER BY timestamp
            """, (user_id,))
            
            rows = cur.fetchall()
            conn.close()
            
            if not rows:
                return {'status': 'no_data', 'trend_data': []}
            
            # Process data for charts
            trend_data = []
            for row in rows:
                trend_data.append({
                    'timestamp': row[0],
                    'avg_blink_rate': float(row[1]) if row[1] else 15.0,
                    'avg_drowsiness': float(row[2]) if row[2] else 25.0,
                    'avg_eye_strain': float(row[3]) if row[3] else 30.0,
                    'focus_score': float(row[4]) if row[4] else 75.0
                })
            
            return {
                'status': 'success',
                'period': period,
                'trend_data': trend_data
            }
            
        except Exception as e:
            logging.error(f"Error getting historical trends: {str(e)}")
            return {'status': 'error', 'message': str(e)}

    def get_user_analytics(self, user_id, days=7):
        """Get comprehensive user analytics for reports"""
        try:
            conn = sqlite3.connect(self.db_config['database'], timeout=5.0)
            cur = conn.cursor()
            
            # Get recent data for analytics
            cur.execute("""
                SELECT timestamp, blink_rate, drowsiness_level, eye_strain_level, focus_score
                FROM eye_tracking_data 
                WHERE user_id = ? AND timestamp >= datetime('now', '-{} days')
                ORDER BY timestamp DESC
                LIMIT 100
            """.format(days), (user_id,))
            
            rows = cur.fetchall()
            conn.close()
            
            if not rows:
                return {'status': 'no_data'}
            
            # Calculate analytics
            blink_rates = [float(row[1]) for row in rows if row[1] is not None]
            drowsiness_levels = [float(row[2]) for row in rows if row[2] is not None]
            eye_strain_levels = [float(row[3]) for row in rows if row[3] is not None]
            
            analytics = {
                'status': 'success',
                'period_days': days,
                'total_data_points': len(rows),
                'avg_blink_rate': sum(blink_rates) / len(blink_rates) if blink_rates else 15.0,
                'avg_drowsiness': sum(drowsiness_levels) / len(drowsiness_levels) if drowsiness_levels else 25.0,
                'avg_eye_strain': sum(eye_strain_levels) / len(eye_strain_levels) if eye_strain_levels else 30.0,
                'blink_rate_trend': 'improving' if len(blink_rates) > 1 and blink_rates[0] > blink_rates[-1] else 'declining',
                'drowsiness_trend': 'improving' if len(drowsiness_levels) > 1 and drowsiness_levels[0] < drowsiness_levels[-1] else 'worsening',
                'eye_strain_trend': 'improving' if len(eye_strain_levels) > 1 and eye_strain_levels[0] < eye_strain_levels[-1] else 'worsening'
            }
            
            return analytics
            
        except Exception as e:
            logging.error(f"Error getting user analytics: {str(e)}")
            return {'status': 'error', 'message': str(e)}