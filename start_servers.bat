@echo off
echo Starting EyeCareAI Servers...
echo ==========================

echo Starting Enhanced Eye Tracking Server on port 5001...
start "Eye Tracking Server" /min cmd /c "cd /d D:\EyeCareAI && d:/EyeCareAI/.venv/Scripts/python.exe enhanced_eye_tracking_server.py"

timeout /t 3 /nobreak >nul

echo Starting Main Application on port 5000...
start "Main Application" /min cmd /c "cd /d D:\EyeCareAI && d:/EyeCareAI/.venv/Scripts/python.exe app.py"

echo.
echo Servers started successfully!
echo Main Application: http://localhost:5000
echo Eye Tracking Server: http://localhost:5001
echo.
echo Press any key to exit...
pause >nul