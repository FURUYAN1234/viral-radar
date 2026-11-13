@echo off
setlocal
cd /d "%~dp0"
chcp 65001 >nul
echo [Monogatari Buzz Maker] http://127.0.0.1:5180/viral-radar/
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-local.ps1" %*
set "launchResult=%errorlevel%"
if not "%launchResult%"=="0" pause
exit /b %launchResult%
