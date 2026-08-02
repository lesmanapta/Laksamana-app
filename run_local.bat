@echo off
TITLE Laksamana Local Server & Puppeteer Tester
echo ========================================================
echo   🚀 STARTING LAKSAMANA APP LOCALLY (WINDOWS)
echo ========================================================
echo.
set PATH=C:\laragon\bin\nodejs\node-v18;%PATH%

echo 1. Checking Node.js environment...
node -v
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js not found! Please ensure Node.js v18 is installed or available in Laragon.
    pause
    exit /b 1
)

echo.
echo 2. Starting Laksamana App Server on http://localhost:5000 ...
echo    (Press Ctrl+C to stop)
echo ========================================================
echo.

node app.js
pause
