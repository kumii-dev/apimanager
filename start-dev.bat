@echo off
REM ============================================================
REM KUMII API Gateway - Development Server Startup (Windows)
REM Starts both Gateway Server and Admin Client concurrently
REM ============================================================

setlocal enabledelayedexpansion

echo ╔════════════════════════════════════════════════════════════════╗
echo ║           🚀 KUMII API Gateway - Dev Server Startup           ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

REM ============================================================
REM Pre-flight Checks
REM ============================================================

echo 📋 Running pre-flight checks...

REM Check Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is not installed
    echo Please install Node.js 18 or higher
    exit /b 1
)
echo ✅ Node.js installed

REM Check npm
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ npm is not installed
    exit /b 1
)
echo ✅ npm installed

REM Check .env files
if not exist "gateway-server\.env" (
    echo ❌ Gateway server .env file not found
    echo Please create gateway-server\.env from .env.example
    exit /b 1
)
echo ✅ Gateway .env file exists

if not exist "admin-client\.env" (
    echo ❌ Admin client .env file not found
    echo Please create admin-client\.env from .env.example
    exit /b 1
)
echo ✅ Admin client .env file exists

REM Check dependencies
if not exist "gateway-server\node_modules\" (
    echo ⚠️  Installing gateway-server dependencies...
    cd gateway-server
    call npm install
    cd ..
)
echo ✅ Gateway dependencies installed

if not exist "admin-client\node_modules\" (
    echo ⚠️  Installing admin-client dependencies...
    cd admin-client
    call npm install
    cd ..
)
echo ✅ Admin client dependencies installed

echo.
echo ✅ All pre-flight checks passed!
echo.

REM ============================================================
REM Start Servers
REM ============================================================

echo ╔════════════════════════════════════════════════════════════════╗
echo ║                    🎬 Starting Services                        ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
echo 🔹 Gateway Server: http://localhost:3000
echo 🔹 Admin Client:   http://localhost:5173
echo.
echo Press Ctrl+C to stop all services
echo.

REM Check if concurrently is available
if exist "node_modules\.bin\concurrently.cmd" (
    echo Using concurrently for parallel execution...
    echo.
    call npm run dev
) else (
    echo Starting services manually...
    echo.
    
    REM Start gateway server in new window
    start "KUMII Gateway Server" cmd /k "cd gateway-server && npm run dev"
    
    REM Wait a bit for gateway to start
    timeout /t 2 /nobreak >nul
    
    REM Start admin client in new window
    start "KUMII Admin Client" cmd /k "cd admin-client && npm run dev"
    
    echo.
    echo ✅ Services started in separate windows
    echo Close the terminal windows to stop the services
    echo.
    pause
)
