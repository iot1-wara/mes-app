@echo off
chcp 65001 >nul
title MES Backend (NestJS Watch)
echo ====================================
echo MES NestJS Watch Mode Starting...
echo ====================================
cd /d "%~dp0"
cmd /c "npx nest start --watch"
