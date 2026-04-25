@echo off
TITLE Dairy Diary - Startup Script
COLOR 0B
SETLOCAL

:: Set paths
SET "PROJECT_DIR=%~dp0"
SET "NPM=C:\Program Files\nodejs\npm.cmd"
SET "DESKTOP_DIR=C:\Users\dindu\Desktop\DairyDiary"

echo ==========================================
echo    DAIRY DIARY - ACTIVATING SERVICES
echo ==========================================
echo.

:: ---- AUTO SYNC TO DESKTOP ----
echo [SYNC] Syncing latest code to Desktop...
robocopy "%PROJECT_DIR%" "%DESKTOP_DIR%" /E /XD node_modules .next .git /XF *.log /R:0 /W:0 /NP /NFL /NDL > nul
echo [SYNC] Desktop folder is up to date!
echo.

:: ---- CHECK DEPENDENCIES ----
IF NOT EXIST "%PROJECT_DIR%node_modules\" (
    echo [INFO] node_modules not found. Running npm install first...
    echo [INFO] This may take a few minutes on the first run.
    echo.
    call "%NPM%" install --prefix "%PROJECT_DIR%"
    IF ERRORLEVEL 1 (
        echo [ERROR] npm install failed! Please check your Node.js installation.
        pause
        exit /b
    )
    echo.
    echo [OK] Dependencies installed successfully!
    echo.
)

:: ---- START APP ----
echo [OK] Starting Dairy Diary Next.js App...
start cmd /k "title Dairy Diary Dev && cd /d "%PROJECT_DIR%" && "%NPM%" run dev"

echo.
echo [INFO] Waiting for server to start (10 seconds)...
timeout /t 10 /nobreak > nul

echo [INFO] Opening Dashboard in browser...
start http://localhost:3000

echo.
echo ==========================================
echo    DAIRY DIARY IS RUNNING!
echo    Visit: http://localhost:3000
echo    Close the other window to stop.
echo ==========================================
echo.
pause
