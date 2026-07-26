@echo off
echo === Simulator + UI === echo.
echo Starte Simulator ( OPC UA Server + HTTP API)...
start "Simulator - OPC UA" cmd /k "cd /d "%~dp0\..\simulator" && node dist/index.js"

timeout /t 3 /nobreak >nul

echo Starte Test UI Dashboard...
start "Simulator Test UI" cmd /k "cd /d "%~dp0\..\simulator\ui" && npx vite --host 0.0.0.0"

echo.
echo Done!
echo  OPC UA Simulator: ports 5500-5504, HTTP API on 4841
echo  Test UI Dashboard: http://localhost:5173/
