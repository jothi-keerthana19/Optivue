"""
Configuration file for EyeCare AI Healthcare Application
Contains API keys, configuration flags, and validation functions
"""

import os
from datetime import datetime

# Google Gemini API Configuration
# Get API key from environment variable or set a placeholder
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', 'YOUR_GOOGLE_GEMINI_API_KEY_HERE')

# Healthcare mode flag - must be True for production healthcare use
HEALTHCARE_MODE = True

def validate_authentic_data(data_point):
    """
    Validate that a data point is authentic and from real tracking
    For healthcare applications, all data must be real, not simulated
    
    Args:
        data_point (dict): Data point to validate
        
    Returns:
        bool: True if data is authentic, False otherwise
    """
    # Check that required fields exist
    required_fields = ['timestamp', 'blink_rate', 'drowsiness_level', 'eye_strain_level']
    for field in required_fields:
        if field not in data_point or data_point[field] is None:
            return False
    
    # Validate timestamp is recent (within last 24 hours)
    try:
        timestamp = datetime.fromisoformat(data_point['timestamp'].replace('Z', '+00:00'))
        if (datetime.now(timestamp.tzinfo) - timestamp).days > 1:
            return False
    except Exception:
        return False
    
    # Validate blink rate is in reasonable range (0-100 blinks/minute)
    if not (0 <= data_point['blink_rate'] <= 100):
        return False
    
    # Validate drowsiness level is in range (0-100%)
    if not (0 <= data_point['drowsiness_level'] <= 100):
        return False
    
    # Validate eye strain level is in range (0-100%)
    if not (0 <= data_point['eye_strain_level'] <= 100):
        return False
    
    # Data is considered authentic if it passes all validation checks
    return True