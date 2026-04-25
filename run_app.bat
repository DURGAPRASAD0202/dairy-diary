@echo off
TITLE Dairy Diary - Startup Script
COLOR 0B

echo ==========================================
echo    DAIRY DIARY - ACTIVATING SERVICES
echo ==========================================
echo.

:: Check for separate backend and frontend folders
if exist "backend" (
    echo [OK] Found 'backend' folder. Starting Backend...
    start cmd /k "title Backend && cd backend && npm start"
) else (
    echo [INFO] No separate 'backend' folder found.
)

if exist "frontend" (
    echo [OK] Found 'frontend' folder. Starting Frontend...
    start cmd /k "title Frontend && cd frontend && npm run dev"
) else (
    :: If no separate folders, check if current folder is a project
    if exist "package.json" (
        echo [OK] Starting unified Next.js Project (Frontend + Backend)...
        start cmd /k "title Dairy Diary Dev && npm run dev"
    ) else (
        echo [ERROR] No package.json found in this directory!
        pause
        exit
    )
)

echo.
echo [INFO] Waiting for services to initialize...
timeout /t 5 /nobreak > nul

echo [INFO] Opening Dashboard in browser...
start http://localhost:3000

echo.
echo ==========================================
echo    ALL SERVICES ARE RUNNING!
echo ==========================================
echo.
pause
