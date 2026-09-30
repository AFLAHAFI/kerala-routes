@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Install Node.js 22 LTS or newer, then reopen this file.
 pause
 exit /b 1
)
if not exist node_modules (
 echo Installing dependencies. Internet is needed once.
 call npm ci
 if errorlevel 1 (
  pause
  exit /b 1
 )
)
echo Open http://localhost:3000 after the server starts.
echo This local practice server uses temporary saves unless Supabase is configured.
call npm run dev
pause
