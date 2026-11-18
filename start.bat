@echo off
setlocal

title Sentinel CS2 Detection Platform - Launcher

echo =====================================================================
echo       Sentinel AI - CS2 Anti-Cheat and Bot Detection Platform
echo =====================================================================
echo.

:: Resolve workspace root directory (where start.bat is located)
set "PROJECT_ROOT=%~dp0"
cd /d "%PROJECT_ROOT%"

:: 1. Validate Python Environment (.python311 default)
if exist "%PROJECT_ROOT%.python311\Scripts\activate.bat" (
    echo [INFO] Activating Python environment: .python311
    call "%PROJECT_ROOT%.python311\Scripts\activate.bat"
    set "PYTHON_EXE=%PROJECT_ROOT%.python311\python.exe"
) else if exist "%PROJECT_ROOT%.venv\Scripts\activate.bat" (
    echo [INFO] Activating Python environment: .venv
    call "%PROJECT_ROOT%.venv\Scripts\activate.bat"
    set "PYTHON_EXE=%PROJECT_ROOT%.venv\Scripts\python.exe"
) else (
    echo [WARNING] No local virtual environment found in .python311 or .venv
    echo [INFO] Using system Python
    set "PYTHON_EXE=python"
)

:: Verify Python binary works
"%PYTHON_EXE%" --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python could not be executed using: %PYTHON_EXE%
    pause
    exit /b 1
)

:: 2. Ensure data directories exist
if not exist "%PROJECT_ROOT%data\demos" mkdir "%PROJECT_ROOT%data\demos"
if not exist "%PROJECT_ROOT%data\analysis" mkdir "%PROJECT_ROOT%data\analysis"
if not exist "%PROJECT_ROOT%data\logs" mkdir "%PROJECT_ROOT%data\logs"

:: 3. Check Frontend node_modules
if not exist "%PROJECT_ROOT%frontend\node_modules" (
    echo [INFO] Frontend node_modules missing. Installing npm packages...
    cd /d "%PROJECT_ROOT%frontend"
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed. Please ensure Node.js is installed.
        pause
        exit /b 1
    )
    cd /d "%PROJECT_ROOT%"
)

echo.
echo =====================================================================
echo [INFO] Starting Backend Server on http://127.0.0.1:8000
echo [INFO] Swagger Docs available at: http://127.0.0.1:8000/docs
echo =====================================================================
:: Start FastAPI backend in a separate terminal window
start "Sentinel Anti-Cheat - Backend Server (Port 8000)" cmd /k "cd /d "%PROJECT_ROOT%" && call "%PROJECT_ROOT%.python311\Scripts\activate.bat" && "%PYTHON_EXE%" -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload"

:: Give backend a moment to initialize
ping 127.0.0.1 -n 3 >nul

echo.
echo =====================================================================
echo [INFO] Starting Frontend Dev Server on http://localhost:3000
echo =====================================================================
:: Start Vite React frontend in a separate terminal window
start "Sentinel Anti-Cheat - Frontend Client (Port 3000)" cmd /k "cd /d "%PROJECT_ROOT%frontend" && npm run dev -- --force"

echo.
echo =====================================================================
echo  Services Successfully Launched!
echo.
echo  * Frontend UI:     http://localhost:3000
echo  * Backend API:     http://127.0.0.1:8000
echo  * API Docs:        http://127.0.0.1:8000/docs
echo.
echo  Keep the newly opened console windows open while running the app.
echo  Press any key to close this launcher window...
echo =====================================================================
pause >nul
