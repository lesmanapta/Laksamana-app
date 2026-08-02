@echo off
TITLE Laksamana Dev Launcher
echo ========================================================
echo   🚀 LAUNCHING LAKSAMANA SERVER & CLIENT (DEV MODE)
echo ========================================================
echo.

set PATH=C:\laragon\bin\nodejs\node-v18;%PATH%

echo 1. Launching Backend Server on port 5000...
start "Laksamana Backend (Port 5000)" cmd /k "set PATH=C:\laragon\bin\nodejs\node-v18;%%PATH%% && node app.js"

echo 2. Launching Frontend Client (Vite) on port 5173 / 3000...
start "Laksamana Frontend Client" cmd /k "set PATH=C:\laragon\bin\nodejs\node-v18;%%PATH%% && cd client && npm run dev"

echo.
echo ✅ Server and Client launched in separate windows!
echo    - Backend API : http://localhost:5000
echo    - Frontend UI : http://localhost:5173 (atau port yang tertera di window client)
echo.
pause
