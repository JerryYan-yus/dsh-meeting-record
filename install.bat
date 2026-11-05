@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1" %*
set "STATUS=%ERRORLEVEL%"
echo.
pause
exit /b %STATUS%
