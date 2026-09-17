@echo off
REM ============================================================
REM SpeakMate AI — Emergent Bootstrap Launcher
REM ============================================================
REM Double-click this file (SpeakMate-Sync.cmd) from anywhere.
REM It will:
REM   1. Auto-detect the SpeakMateAI folder
REM   2. Download latest auto-sync.ps1 + build-aab.ps1
REM   3. Run auto-sync (pull latest code from Emergent)
REM   4. Optionally build AAB
REM
REM Place this file ONE TIME on Desktop or anywhere convenient.
REM No re-download ever needed for this .cmd file itself.
REM ============================================================

setlocal ENABLEDELAYEDEXPANSION

REM ------- Config -------
set "BACKEND_URL=https://gift-hub-sync.preview.emergentagent.com"
set "PROJECT_DIR=D:\sm\SpeakMateAI"

REM ------- Locate project -------
if not exist "%PROJECT_DIR%\package.json" (
    echo.
    echo ERROR: SpeakMateAI folder not found at %PROJECT_DIR%
    echo Edit this .cmd file and update PROJECT_DIR at the top.
    pause
    exit /b 1
)
cd /d "%PROJECT_DIR%"

REM ------- Ask what to do -------
echo.
echo ==============================================
echo   SpeakMate AI  ^|  Emergent Bootstrap
echo ==============================================
echo   Project: %PROJECT_DIR%
echo   Backend: %BACKEND_URL%
echo.
echo   1. Sync latest code only (fast, ~1 min)
echo   2. Sync + yarn install (naye modules ke liye, ~4 min)
echo   3. Full rebuild + build AAB (production, ~20 min)
echo   4. Quick AAB build (skip sync, code already updated)
echo   5. Exit
echo.
set /p CHOICE="Choose (1-5): "

REM ------- Always ensure scripts exist -------
echo.
echo Downloading latest sync + build scripts...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; ^
     Invoke-WebRequest -Uri '%BACKEND_URL%/api/fix-files/auto-sync.ps1' -OutFile 'auto-sync.ps1' -UseBasicParsing -TimeoutSec 30; ^
     Invoke-WebRequest -Uri '%BACKEND_URL%/api/fix-files/build-aab.ps1' -OutFile 'build-aab.ps1' -UseBasicParsing -TimeoutSec 30"
if errorlevel 1 (
    echo.
    echo ERROR: Could not download scripts from %BACKEND_URL%
    echo Check internet and try again.
    pause
    exit /b 1
)
echo Done.
echo.

REM ------- Execute chosen action -------
if "%CHOICE%"=="1" (
    powershell -NoProfile -ExecutionPolicy Bypass -File auto-sync.ps1 -BackendUrl "%BACKEND_URL%"
) else if "%CHOICE%"=="2" (
    powershell -NoProfile -ExecutionPolicy Bypass -File auto-sync.ps1 -BackendUrl "%BACKEND_URL%" -InstallDeps
) else if "%CHOICE%"=="3" (
    powershell -NoProfile -ExecutionPolicy Bypass -File build-aab.ps1 -BackendUrl "%BACKEND_URL%" -Clean
) else if "%CHOICE%"=="4" (
    powershell -NoProfile -ExecutionPolicy Bypass -File build-aab.ps1 -BackendUrl "%BACKEND_URL%" -SkipSync -Clean
) else if "%CHOICE%"=="5" (
    echo Bye!
    exit /b 0
) else (
    echo Invalid choice. Exiting.
    exit /b 1
)

echo.
echo ==============================================
echo   Done. Press any key to close.
echo ==============================================
pause
