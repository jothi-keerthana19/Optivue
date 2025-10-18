"""
Healthcare-Grade AI Service using Google Gemini
CRITICAL: This module is designed for healthcare applications
All recommendations are based on real user data only - NO SIMULATED DATA
"""

import json
import sqlite3
from datetime import datetime, timedelta
from config import GEMINI_API_KEY, HEALTHCARE_MODE, validate_authentic_data
import logging

# Import Google Generative AI - handling potential linter issues
try:
    from google.generativeai.client import configure
    from google.generativeai.generative_models import GenerativeModel
except ImportError:
    raise ImportError("Google Generative AI library not installed. Install with: pip install google-generativeai")

# Configure logging for healthcare compliance
logging.basicConfig(level=logging.INFO, format='%(asctime)s - HEALTHCARE-AI - %(levelname)s - %(message)s')

class HealthcareAIService:
    def __init__(self):
        """Initialize healthcare-grade AI service with Gemini"""
        if not HEALTHCARE_MODE:
            raise ValueError("CRITICAL: Healthcare mode must be enabled for production use")
        
        # Configure Gemini API
        configure(api_key=GEMINI_API_KEY)
        self.model = GenerativeModel('gemini-1.5-flash')
        
        # Healthcare compliance
        self.validated_data_only = True
        self.prompt_version = "2.0"  # Track prompt versions for consistency
        self.clinical_guidelines_version = "2024.1"  # Track guideline updates
        logging.info("Healthcare AI Service initialized with real data validation")
    
    def get_authentic_user_data(self, user_id, hours=24):
        """
        Retrieve ONLY authentic real tracking data from database
        NO simulated or test data allowed for healthcare applications
        """
        try:
            conn = sqlite3.connect('database.db')
            cursor = conn.cursor()
            
            # Get only real tracking data from the last specified hours
            cutoff_time = datetime.now() - timedelta(hours=hours)
            
            query = """
            SELECT timestamp, blink_rate, drowsiness_level, eye_strain_level,
                   session_duration, focus_score
            FROM eye_tracking_data 
            WHERE user_id = ? AND timestamp >= ?
            ORDER BY timestamp DESC
            """
            
            cursor.execute(query, (user_id, cutoff_time.isoformat()))
            rows = cursor.fetchall()
            
            authentic_data = []
            for row in rows:
                data_point = {
                    'timestamp': row[0],
                    'blink_rate': row[1],
                    'drowsiness_level': row[2],
                    'eye_strain_level': row[3],
                    'session_duration': row[4],
                    'focus_score': row[5]
                }
                
                # CRITICAL: Validate data authenticity for healthcare use
                if validate_authentic_data(data_point):
                    authentic_data.append(data_point)
                else:
                    logging.warning(f"Excluded non-authentic data point: {data_point['timestamp']}")
            
            conn.close()
            
            logging.info(f"Retrieved {len(authentic_data)} authentic data points for user {user_id}")
            return authentic_data
            
        except Exception as e:
            logging.error(f"Error retrieving authentic data: {str(e)}")
            return []
    
    def analyze_health_patterns(self, user_data):
        """
        Analyze real user data for health patterns
        Uses only authentic tracking data for healthcare-grade analysis
        """
        if not user_data:
            return {
                'status': 'insufficient_data',
                'message': 'No authentic tracking data available for analysis'
            }
        
        try:
            # Calculate real health metrics from authentic data
            recent_data = user_data[:10]  # Last 10 authentic readings
            
            avg_blink_rate = sum(d['blink_rate'] for d in recent_data) / len(recent_data)
            avg_drowsiness = sum(d['drowsiness_level'] for d in recent_data) / len(recent_data)
            avg_eye_strain = sum(d['eye_strain_level'] for d in recent_data) / len(recent_data)
            
            # Detect concerning patterns in real data
            patterns = {
                'blink_rate_trend': self._analyze_trend([d['blink_rate'] for d in recent_data]),
                'drowsiness_trend': self._analyze_trend([d['drowsiness_level'] for d in recent_data]),
                'eye_strain_trend': self._analyze_trend([d['eye_strain_level'] for d in recent_data]),
                'current_averages': {
                    'blink_rate': round(avg_blink_rate, 1),
                    'drowsiness': round(avg_drowsiness, 1),
                    'eye_strain': round(avg_eye_strain, 1)
                }
            }
            
            return patterns
            
        except Exception as e:
            logging.error(f"Error analyzing health patterns: {str(e)}")
            return {'status': 'analysis_error', 'message': str(e)}
    
    def _analyze_trend(self, values):
        """Analyze trend in real data values"""
        if len(values) < 3:
            return 'insufficient_data'
        
        # Simple trend analysis
        recent_avg = sum(values[:3]) / 3
        earlier_avg = sum(values[-3:]) / 3
        
        if recent_avg > earlier_avg * 1.1:
            return 'increasing'
        elif recent_avg < earlier_avg * 0.9:
            return 'decreasing'
        else:
            return 'stable'
    
    def _validate_ai_response(self, response_json):
        """Validate AI response meets healthcare standards"""
        required_fields = ['risk_assessment', 'clinical_insights', 'recommendations']
        
        for field in required_fields:
            if field not in response_json:
                logging.warning(f"Validation failed: Missing required field '{field}'")
                return False
        
        # Validate risk assessment logic
        risk_level = response_json['risk_assessment'].get('overall_risk_level', '').upper()
        if risk_level == 'HIGH':
            if not response_json['recommendations'].get('immediate_actions'):
                logging.warning("Validation failed: HIGH risk level requires immediate_actions")
                return False
        
        # Additional validation for critical fields
        if 'clinical_insights' in response_json and not isinstance(response_json['clinical_insights'], list):
            logging.warning("Validation failed: clinical_insights should be a list")
            return False
            
        if 'recommendations' in response_json:
            if not isinstance(response_json['recommendations'], dict):
                logging.warning("Validation failed: recommendations should be a dictionary")
                return False
            
        return True
    
    def _create_fallback_recommendations(self, error_context):
        """Create safe fallback recommendations when AI fails"""
        return {
            'risk_assessment': {
                'overall_risk_level': 'MODERATE',
                'specific_risks': [
                    {
                        'risk_type': 'data_unavailable',
                        'severity': 'MODERATE',
                        'description': 'Unable to analyze health data due to system limitations'
                    }
                ],
                'trend_analysis': 'Unable to determine trends due to system limitations'
            },
            'clinical_insights': [
                {
                    'finding': 'System fallback mode activated',
                    'evidence_level': 'LOW',
                    'clinical_significance': 'Using conservative recommendations due to system limitations'
                }
            ],
            'recommendations': {
                'immediate_actions': ['Take regular breaks from screen time'],
                'daily_interventions': [
                    {
                        'action': 'Follow 20-20-20 rule',
                        'frequency': 'Every 20 minutes',
                        'rationale': 'Reduces eye strain and fatigue',
                        'priority': 'HIGH'
                    }
                ],
                'weekly_interventions': [
                    {
                        'action': 'Comprehensive eye exam',
                        'frequency': 'Annually or as recommended',
                        'rationale': 'Professional assessment of eye health',
                        'priority': 'MODERATE'
                    }
                ]
            },
            'monitoring_guidance': ['Monitor symptoms and seek professional help if they persist or worsen'],
            'professional_referral': {
                'needed': True,
                'urgency': 'ROUTINE',
                'reason': 'AI analysis unavailable - routine eye exam recommended',
                'specialist_type': 'Optometrist'
            },
            'confidence_metrics': {
                'data_quality_score': 30,
                'recommendation_confidence': 20,
                'explanation': 'Fallback recommendations due to system limitations'
            }
        }
    
    def generate_healthcare_recommendations(self, user_id):
        """
        Generate healthcare-grade AI recommendations using Google Gemini
        Based ONLY on authentic real tracking data
        """
        try:
            # Get authentic real data only
            authentic_data = self.get_authentic_user_data(user_id)
            
            if not authentic_data:
                return {
                    'status': 'no_authentic_data',
                    'message': 'No authentic tracking data available. Please ensure eye tracking is active.',
                    'recommendations': []
                }
            
            # Analyze real health patterns
            health_analysis = self.analyze_health_patterns(authentic_data)
            
            if health_analysis.get('status') in ['insufficient_data', 'analysis_error']:
                return {
                    'status': health_analysis['status'],
                    'message': health_analysis['message'],
                    'recommendations': []
                }
            
            # Create healthcare-focused prompt for Gemini
            prompt = self._create_healthcare_prompt(health_analysis, authentic_data)
            
            # Generate AI recommendations using Gemini
            response = self.model.generate_content(prompt)
            
            # Parse and structure the AI response
            ai_recommendations = self._parse_gemini_response(response.text)
            
            # Validate AI response meets healthcare standards
            if not self._validate_ai_response(ai_recommendations):
                logging.warning("AI response validation failed, using fallback recommendations")
                ai_recommendations = self._create_fallback_recommendations({
                    'reason': 'validation_failed',
                    'original_response': ai_recommendations
                })
            
            # Add data authenticity confirmation
            ai_recommendations['data_authenticity'] = {
                'authentic_data_points': len(authentic_data),
                'analysis_timestamp': datetime.now().isoformat(),
                'healthcare_grade': True,
                'simulated_data_used': False,
                'prompt_version': self.prompt_version,
                'clinical_guidelines_version': self.clinical_guidelines_version
            }
            
            logging.info(f"Generated healthcare recommendations for user {user_id} using {len(authentic_data)} authentic data points")
            return ai_recommendations
            
        except Exception as e:
            logging.error(f"Error generating healthcare recommendations: {str(e)}")
            # Create safe fallback recommendations when AI fails
            return self._create_fallback_recommendations({
                'reason': 'exception',
                'error': str(e)
            })
    
    def _create_healthcare_prompt(self, health_analysis, user_data):
        """Create a healthcare-focused prompt for Gemini AI"""
        
        current_metrics = health_analysis.get('current_averages', {})
        trends = {
            'blink_rate': health_analysis.get('blink_rate_trend', 'unknown'),
            'drowsiness': health_analysis.get('drowsiness_trend', 'unknown'),
            'eye_strain': health_analysis.get('eye_strain_trend', 'unknown')
        }
        
        data_summary = f"""
        Recent tracking session data (last {len(user_data)} authentic measurements):
        - Average blink rate: {current_metrics.get('blink_rate', 'N/A')} blinks/minute
        - Average drowsiness level: {current_metrics.get('drowsiness', 'N/A')}%
        - Average eye strain level: {current_metrics.get('eye_strain', 'N/A')}%
        
        Health trends from real data:
        - Blink rate trend: {trends['blink_rate']}
        - Drowsiness trend: {trends['drowsiness']}
        - Eye strain trend: {trends['eye_strain']}
        """
        
        prompt = f"""
        You are a healthcare-grade AI assistant analyzing real eye tracking data for a patient's digital eye strain and fatigue management.

        CRITICAL CONTEXT:
        - This is for a healthcare application affecting real patients
        - All data provided is from authentic live tracking (no simulated data)
        - Recommendations must be evidence-based and safe
        - Focus on preventive care and early intervention

        PATIENT DATA ANALYSIS:
        {data_summary}

        CLINICAL REFERENCE RANGES:
        - Normal blink rate: 12-20 blinks/minute
        - Drowsiness concern threshold: >40%
        - Eye strain concern threshold: >50%

        Please provide healthcare-grade recommendations in the following detailed JSON format:
        {{
            "risk_assessment": {{
                "overall_risk_level": "LOW/MODERATE/HIGH",
                "specific_risks": [
                    {{
                        "risk_type": "blink_rate/drowsiness/eye_strain",
                        "severity": "LOW/MODERATE/HIGH",
                        "description": "Detailed explanation of the risk"
                    }}
                ],
                "trend_analysis": "Assessment of whether metrics are improving, stable, or deteriorating"
            }},
            "clinical_insights": [
                {{
                    "finding": "Specific clinical observation from the data",
                    "evidence_level": "HIGH/MODERATE/LOW",
                    "clinical_significance": "Why this finding matters for patient health"
                }}
            ],
            "recommendations": {{
                "immediate_actions": [
                    "Any actions that should be taken immediately based on current data"
                ],
                "daily_interventions": [
                    {{
                        "action": "Specific intervention",
                        "frequency": "How often to perform this intervention",
                        "rationale": "Clinical reasoning behind this recommendation",
                        "priority": "HIGH/MODERATE/LOW"
                    }}
                ],
                "weekly_interventions": [
                    {{
                        "action": "Weekly health practice",
                        "frequency": "How often to perform this intervention",
                        "rationale": "Clinical reasoning behind this recommendation",
                        "priority": "HIGH/MODERATE/LOW"
                    }}
                ]
            }},
            "monitoring_guidance": [
                "Specific guidance on what to monitor and when to seek help"
            ],
            "professional_referral": {{
                "needed": true/false,
                "urgency": "IMMEDIATE/ROUTINE/NOT_NEEDED",
                "reason": "Clinical justification for referral",
                "specialist_type": "Optometrist/Ophthalmologist/Optician (if needed)"
            }},
            "confidence_metrics": {{
                "data_quality_score": 0-100,
                "recommendation_confidence": 0-100,
                "explanation": "Explanation of confidence levels"
            }}
        }}

        Focus on:
        1. Patient safety first with clear risk stratification (LOW/MODERATE/HIGH)
        2. Evidence-based recommendations with clinical reasoning
        3. Clear actionable advice with specific frequency and priority levels
        4. Professional referral criteria with urgency levels
        5. Digital wellness best practices
        6. Environmental adjustments for optimal eye comfort (lighting, screen settings, positioning)
        7. Personalized advice based on individual health patterns
        8. Monitoring guidance for tracking improvement or deterioration
        9. Confidence metrics for transparency

        Ensure all recommendations are appropriate for a healthcare setting and follow evidence-based clinical guidelines.
        Include specific clinical thresholds and contraindications where relevant.
        """
        
        return prompt
    
    def _parse_gemini_response(self, response_text):
        """Parse Gemini AI response into structured healthcare recommendations"""
        try:
            # Try to extract JSON from the response
            start_idx = response_text.find('{{')
            end_idx = response_text.rfind('}}') + 2
            
            if start_idx != -1 and end_idx > start_idx:
                json_text = response_text[start_idx:end_idx]
                recommendations = json.loads(json_text)
            else:
                # Fallback: create structured response from text
                recommendations = self._create_fallback_structure(response_text)
            
            # Ensure all required categories exist
            required_categories = [
                'risk_assessment', 'clinical_insights', 'recommendations',
                'monitoring_guidance', 'professional_referral', 'confidence_metrics'
            ]
            
            for category in required_categories:
                if category not in recommendations:
                    recommendations[category] = []
            
            recommendations['status'] = 'success'
            recommendations['ai_provider'] = 'Google Gemini'
            
            return recommendations
            
        except json.JSONDecodeError as e:
            logging.error(f"Error parsing Gemini response: {str(e)}")
            return self._create_fallback_structure(response_text)
        except Exception as e:
            logging.error(f"Unexpected error parsing Gemini response: {str(e)}")
            return {
                'status': 'parse_error',
                'message': str(e),
                'raw_response': response_text[:500] + '...' if len(response_text) > 500 else response_text
            }
    
    def _create_fallback_structure(self, response_text):
        """Create fallback structure if JSON parsing fails"""
        return {
            'status': 'fallback_parse',
            'risk_assessment': {
                'overall_risk_level': 'MODERATE',
                'specific_risks': [],
                'trend_analysis': 'Unable to determine trends from raw response'
            },
            'clinical_insights': [
                {
                    'finding': 'Review raw AI response for important health information',
                    'evidence_level': 'LOW',
                    'clinical_significance': 'Fallback response due to parsing issues'
                }
            ],
            'recommendations': {
                'immediate_actions': ['Take regular breaks from screen time'],
                'daily_interventions': [
                    {
                        'action': 'Follow 20-20-20 rule',
                        'frequency': 'Every 20 minutes',
                        'rationale': 'Reduces eye strain and fatigue',
                        'priority': 'HIGH'
                    }
                ],
                'weekly_interventions': [
                    {
                        'action': 'Comprehensive eye exam',
                        'frequency': 'Annually or as recommended',
                        'rationale': 'Professional assessment of eye health',
                        'priority': 'MODERATE'
                    }
                ]
            },
            'monitoring_guidance': ['Monitor symptoms and seek professional help if they persist or worsen'],
            'professional_referral': {
                'needed': True,
                'urgency': 'ROUTINE',
                'reason': 'AI analysis limitations - routine eye exam recommended',
                'specialist_type': 'Optometrist'
            },
            'confidence_metrics': {
                'data_quality_score': 50,
                'recommendation_confidence': 30,
                'explanation': 'Fallback response due to parsing issues with AI output'
            },
            'raw_ai_response': response_text,
            'ai_provider': 'Google Gemini (fallback parsing)'
        }

# Initialize healthcare AI service
healthcare_ai = HealthcareAIService()