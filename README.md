
# EyeCare AI - Advanced Eye Health Monitoring Web Application

![EyeCare AI](https://img.shields.io/badge/EyeCare-AI-blue) ![Python](https://img.shields.io/badge/Python-3.8+-green) ![Flask](https://img.shields.io/badge/Flask-2.0+-orange) ![MediaPipe](https://img.shields.io/badge/MediaPipe-Computer%20Vision-red)

A comprehensive web application for real-time eye health monitoring and drowsiness detection using advanced computer vision technologies. Track your eye health metrics, view detailed analytics, and receive personalized insights to maintain optimal eye wellness.

## 🌟 Features

### 🔍 **Real-Time Eye Tracking**
- **MediaPipe Face Mesh Integration** - High-precision 468-point facial landmark detection
- **Advanced Blink Detection** - Sophisticated EAR (Eye Aspect Ratio) algorithms
- **Gaze Direction Tracking** - Real-time pupil and gaze direction analysis
- **Drowsiness Detection** - AI-powered alertness monitoring with customizable thresholds
- **Background Mode Support** - Continuous monitoring even when browser tab is inactive

### 📊 **Comprehensive Analytics**
- **Session Tracking** - Detailed monitoring of eye health metrics over time
- **Daily/Weekly/Monthly Reports** - Trend analysis and progress tracking
- **Blink Rate Analysis** - Healthy vs. unhealthy blinking pattern detection
- **Eye Strain Assessment** - Risk level evaluation and recommendations
- **Data Export** - CSV and PDF report generation for medical consultations

### ⏰ **Smart Reminder System**
- **Customizable Break Intervals** - 20-20-20 rule and custom timing options
- **Intelligent Notifications** - Context-aware break reminders
- **Visual and Audio Alerts** - Multiple notification types
- **Productivity Integration** - Non-intrusive reminder timing

### 🔧 **Advanced Settings**
- **Sensitivity Controls** - Adjustable detection thresholds
- **Alert Customization** - Personalized notification preferences
- **Privacy Controls** - Local data storage with export options
- **Accessibility Features** - Support for various user needs

## 🛠️ Technology Stack

### **Backend**
- **Flask** - Lightweight Python web framework
- **Python 3.8+** - Core application logic
- **SQLite** - Local database for data storage

### **Frontend**
- **HTML5/CSS3/JavaScript** - Modern web standards
- **Bootstrap 5** - Responsive UI framework
- **MediaPipe** - Google's computer vision library
- **WebRTC** - Real-time camera access

### **Computer Vision**
- **MediaPipe Face Mesh** - 468-point facial landmark detection
- **Eye Aspect Ratio (EAR)** - Blink detection algorithms

## 🚀 Quick Start Guide

### Prerequisites
- **Python 3.8 or higher** - Download from [python.org](https://python.org)
- **Web browser** - Chrome, Firefox, Safari, or Edge (latest versions recommended)
- **Camera** - Webcam for eye tracking features (optional - simulation mode available)
- **Internet connection** - Required for initial setup and AI features

### Installation Steps

1. **Clone or Download the Project**
   ```bash
   git clone https://github.com/jothi-keerthana19/Optivue
   cd EyeCareAI
   ```

2. **Install Python Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Start the Application**
   ```bash
   python app.py
   ```

4. **Access the Application**
   - Open your web browser
   - Navigate to: `http://localhost:5000`
   - The application will automatically create the database on first run

## 📋 Step-by-Step User Guide

### Step 1: Register a New Account
1. Open `http://localhost:5000` in your browser
2. Click on **"Register"** link (usually in the navigation or on the login page)
3. Fill in the registration form:
   - **Username**: Choose a unique username (required)
   - **Email**: Enter your email address (required)
   - **Password**: Create a secure password (required)
4. Click **"Register"** button
5. You'll be redirected to the login page with a success message

### Step 2: Login to Your Account
1. On the login page, enter your credentials:
   - **Username**: The username you registered with
   - **Password**: Your password
2. Click **"Login"** button
3. You'll be redirected to the home page if login is successful

### Step 3: Explore the Home Page
1. After login, you'll see the main dashboard
2. View your current eye health metrics:
   - **Current Blink Rate**: Shows your blinking frequency (blinks per minute)
   - **Drowsiness Level**: Indicates your current alertness status (percentage)
   - **Daily Screen Time**: Tracks your screen usage duration (hours)
3. Check the **Insights** section for personalized recommendations based on your metrics
4. Use the navigation menu to access other features like Live Tracking and Reports

### Step 4: Start Live Tracking
1. Click on **"Live Tracking"** in the navigation menu
2. Grant camera permissions when prompted by your browser
3. The system will:
   - Access your webcam for real-time eye tracking
   - Display live metrics on the screen including:
     - Current blink rate
     - Drowsiness level
     - Eye strain level
     - Focus score
4. If no camera is available, the system switches to simulation mode with default values
5. Watch the live metrics update in real-time as you use the application
6. The tracking data is automatically saved to your account for later analysis

### Step 5: View Reports and Analytics
1. Click on **"Reports"** in the navigation menu
2. View comprehensive eye health analytics including:
   - **Current Health Metrics**: Real-time blink rate, drowsiness, and eye strain levels
   - **Hourly Data**: Recent tracking sessions with detailed metrics
   - **Time Period Analysis**: Daily, weekly, and monthly trends and patterns
   - **AI Recommendations**: Personalized healthcare advice based on your data
3. Explore different report periods using the tabs (Hourly, Daily, Weekly, Monthly)
4. Review correlation data showing relationships between different metrics
5. Check predictive trends to see how your eye health may change
6. View population comparison statistics to understand how you compare to others

## 🎯 Key Features Overview

### Real-Time Eye Tracking
- **Camera Access**: Uses your webcam for live eye monitoring
- **Simulation Mode**: Works without camera for testing and demonstration
- **Live Metrics**: Real-time display of eye health indicators
- **Automatic Saving**: All data is stored securely in your local account

### Health Analytics
- **Comprehensive Reports**: Detailed analysis of your eye health patterns
- **Trend Analysis**: Track improvements and changes over time
- **AI Recommendations**: Personalized health advice based on your data
- **Data Privacy**: All data stored locally on your device

### User Experience
- **Responsive Design**: Works on desktop and mobile devices
- **Intuitive Navigation**: Easy-to-use interface with clear navigation
- **Real-Time Updates**: Live data visualization and updates
- **Secure Storage**: All personal data stored locally and privately

## 🔧 Troubleshooting

### Application Won't Start
- **Check Python Version**: Ensure Python 3.8+ is installed by running `python --version`
- **Install Dependencies**: Run `pip install -r requirements.txt` to install all required packages
- **Port Conflict**: Check if port 5000 is available (close other applications using it)
- **Virtual Environment**: Consider using a virtual environment to avoid dependency conflicts

### Camera Not Working
- **Grant Permissions**: Ensure you grant camera permissions when prompted by your browser
- **Refresh Page**: Try refreshing the page and granting permissions again
- **Camera in Use**: Check if another application is using the camera
- **Browser Support**: Use Chrome, Firefox, Safari, or Edge (latest versions)
- **Simulation Mode**: The system will automatically switch to simulation mode if camera access fails

### Login Issues
- **Verify Credentials**: Double-check username and password are correct
- **Caps Lock**: Ensure Caps Lock is not enabled
- **Browser Cache**: Clear browser cache and cookies if problems persist
- **Session Issues**: Try closing and reopening your browser

### Data Not Showing
- **Login Status**: Ensure you're logged in to the application
- **Start Tracking**: Try starting a new live tracking session to generate data
- **Browser Console**: Check browser developer console (F12) for any error messages
- **Database Issues**: The application creates the database automatically on first run

### Performance Issues
- **Browser Resources**: Close unnecessary browser tabs to free up resources
- **Camera Quality**: Ensure good lighting and camera positioning for better tracking
- **System Resources**: Close other resource-intensive applications
- **Browser Updates**: Ensure your browser is up to date

## 📋 System Requirements

### **Minimum Requirements**
- **Operating System**: Windows 10+, macOS 10.15+, Linux (Ubuntu 18.04+)
- **Python**: Version 3.8 or higher
- **Browser**: Chrome 88+, Firefox 85+, Safari 14+, Edge 88+
- **Camera**: Webcam with minimum 640x480 resolution (optional)
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 500MB free space
- **Internet**: Required for initial setup and AI features

### **Recommended Requirements**
- **Operating System**: Windows 11, macOS 12+, Linux (Ubuntu 20.04+)
- **Python**: Version 3.9 or higher
- **Browser**: Latest versions of Chrome, Firefox, Safari, or Edge
- **Camera**: HD webcam (1080p) for best tracking accuracy
- **RAM**: 8GB or higher
- **Storage**: 1GB free space
- **Internet**: Stable broadband connection

## 🔒 Privacy & Security

- **Local Data Storage** - All personal data stored locally on your device
- **No Cloud Dependencies** - Core functionality works offline
- **Secure Camera Access** - Permissions requested transparently with user consent
- **Data Export Control** - Users control their data export and sharing
- **GDPR Compliant** - Privacy-by-design architecture
- **Session Security** - Secure session management with proper authentication

## 📈 Usage Examples

### **Daily Eye Health Monitoring**
1. Start your day by logging into EyeCare AI
2. Check your home dashboard for current eye health status
3. Begin live tracking during work or study sessions
4. Monitor real-time metrics and take breaks when needed
5. Review daily reports to understand your eye health patterns

### **Analytics Dashboard Usage**
1. Access the Reports page to view comprehensive analytics
2. Analyze trends over different time periods (hourly, daily, weekly)
3. Review AI recommendations for improving eye health
4. Export reports for sharing with healthcare professionals
5. Track progress and improvements over time

### **Work Session Tracking**
1. Start live tracking at the beginning of work sessions
2. Monitor blink rate and drowsiness levels throughout the day
3. Receive alerts when metrics indicate the need for breaks
4. Use the 20-20-20 rule reminders to maintain eye health
5. Review session data to optimize work habits

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### **Development Setup**
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎯 Roadmap

### **Upcoming Features**
- [ ] Enhanced AI recommendations
- [ ] Advanced sleep pattern analysis
- [ ] Integration with health tracking platforms
- [ ] Multi-language support
- [ ] Cloud synchronization options
- [ ] Advanced biometric analysis

### **Long-term Goals**
- [ ] Clinical trial validation
- [ ] Medical device certification
- [ ] AI-powered health predictions
- [ ] Integration with smart glasses
- [ ] Workplace wellness platforms

## 🙏 Acknowledgments

- **MediaPipe Team** - For the excellent computer vision library
- **TensorFlow Team** - For machine learning framework
- **Flask Community** - For the web framework
- **Bootstrap Team** - For the UI framework

## 📞 Support

For support, please open an issue on GitHub or contact us at support@eyecareai.com

---

**Made with ❤️ for better eye health worldwide**

![GitHub stars](https://img.shields.io/github/stars/yourusername/eyecare-ai)
![GitHub forks](https://img.shields.io/github/forks/yourusername/eyecare-ai)
![GitHub issues](https://img.shields.io/github/issues/yourusername/eyecare-ai)
