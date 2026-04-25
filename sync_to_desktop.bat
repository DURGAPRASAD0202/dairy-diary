@echo off
TITLE Dairy Diary - Sync to Desktop
COLOR 0A
SETLOCAL

SET "PROJECT_DIR=C:\Users\dindu\.gemini\antigravity\DairyDiary"
SET "DESKTOP_DIR=C:\Users\dindu\Desktop\DairyDiary"

echo ==========================================
echo    DAIRY DIARY - SYNCING TO DESKTOP
echo ==========================================
echo.
echo Source : %PROJECT_DIR%
echo Target : %DESKTOP_DIR%
echo.

robocopy "%PROJECT_DIR%" "%DESKTOP_DIR%" /E /XD node_modules .next .git /XF *.log /R:0 /W:0 /NP

echo.
echo ==========================================
echo    SYNC COMPLETE!
echo    Desktop folder is now up to date.
echo ==========================================
echo.
pause
