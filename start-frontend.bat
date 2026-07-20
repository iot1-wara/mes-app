@echo off
chcp 65001 >nul
title MES Frontend (Vite HMR)
echo ====================================
echo MES Vite Frontend Starting...
echo Port: http://localhost:5173
echo ====================================
cd /d "%~dp0"
node node_modules/vite/bin/vite.js --host 0.0.0.0
