@echo off
cd /d "%~dp0\.."

REM Alte Node-Prozesse killen
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ') do taskkill //F //PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173 ') do taskkill //F //PID %%a 2>nul
timeout /t 1 /nobreak >nul

echo =========================================
echo   MES Production Control - Dev Server
echo =========================================
echo.

REM Beide parallel starten — direkt mit node + Vollpfad, kein npm/npx/Gesurvive!
echo [1/3] Backend starten (port 3000)...
start "MES Backend" cmd /k "cd /d \"%cd%\" && node node_modules/@nestjs/cli/bin/nest.js start --watch"

timeout /t 2 /nobreak >nul

echo [2/3] Frontend starten (port 5173)...
start "MES Frontend" cmd /k "cd /d \"%cd%\frontend\" && node node_modules/vite/bin/vite.js"

echo.
echo DONE!
echo   Backend:  http://localhost:3000  (Ctrl+C zum Stoppen)
echo   Frontend: http://localhost:5173
echo.
pause >nul
