@echo off
cd /d "%~dp0"
node node_modules/@nestjs/cli/bin/nest.cmd start --watch
