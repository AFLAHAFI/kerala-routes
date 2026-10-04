@echo off
cd /d "%~dp0"
if not exist node_modules (
 call npm ci
 if errorlevel 1 (
  pause
  exit /b 1
 )
)
call npm run local:built
pause
