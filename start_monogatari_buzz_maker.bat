@echo off
setlocal
cd /d "%~dp0"

echo [Monogatari Buzz Maker] Starting system...
echo [INFO] Reserved local URL: http://127.0.0.1:5180/

where node >nul 2>nul
if errorlevel 1 goto NODE_MISSING

where npm >nul 2>nul
if errorlevel 1 goto NPM_MISSING

if not exist node_modules (
    echo [INFO] node_modules not found. Installing dependencies...
    call npm install
)

if not exist node_modules goto INSTALL_ERROR

echo [INFO] Checking upstream Story Maker and Nano Banana Pro sync snapshots...
call npm run check:upstreams
if errorlevel 1 goto UPSTREAM_CHECK_ERROR

echo [INFO] Launching development server on port 5180...
call npm run dev -- --open

if errorlevel 1 goto RUN_ERROR

pause
exit /b

:NODE_MISSING
echo [ERROR] Node.js is not installed.
pause
exit /b

:NPM_MISSING
echo [ERROR] npm is not found.
pause
exit /b

:INSTALL_ERROR
echo [ERROR] Installation failed.
pause
exit /b

:UPSTREAM_CHECK_ERROR
echo [ERROR] Upstream sync check failed.
echo [INFO] Run npm run sync:nano-fallback, then try again.
pause
exit /b

:RUN_ERROR
echo [ERROR] Failed to start server. Port 5180 may already be in use.
pause
exit /b
