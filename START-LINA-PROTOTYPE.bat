@echo off
REM Lina's — double-click launcher for the local client-review prototype.
REM This only starts a local preview server. It does not deploy or publish anything.

cd /d "%~dp0"

echo.
echo Lina's — starting the local prototype server...
echo.

where node >nul 2>nul
if errorlevel 1 (
    echo Node.js was not found on this computer.
    echo.
    echo Please install Node.js from https://nodejs.org before using this launcher,
    echo then double-click this file again.
    echo.
    pause
    exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
    echo npm was not found on this computer, even though Node.js is installed.
    echo Try reinstalling Node.js from https://nodejs.org.
    echo.
    pause
    exit /b 1
)

echo Once the server starts, open this address in your browser:
echo.
echo     http://localhost:8000
echo.
echo Keep this window open while you view the prototype.
echo Press Ctrl+C in this window at any time to stop the server.
echo.

call npm run prototype

echo.
echo The server has stopped. You can close this window.
pause
