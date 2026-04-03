@echo off
REM One-command Hermes CLI installer and runner for Windows
REM Usage: 
REM   run.bat "Hello Hermes!"                          (localhost:8642)
REM   run.bat "Hello" -e http://server:8642           (custom endpoint)
REM   set HERMES_ENDPOINT=http://server:8642 && run.bat "Hello"

setlocal enabledelayedexpansion

set "INSTALL_DIR=%USERPROFILE%\.bunny"
set "SRC_DIR=%INSTALL_DIR%"

REM Check for bun
where bun >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Installing bun...
    powershell -Command "irm bun.sh/winx -o bun.zip; Expand-Archive -Force bun.zip .; Remove-Item bun.zip"
    set "PATH=%USERPROFILE%\.bun\bin;%PATH%"
)

REM Check for git
where git >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Error: git is required but not installed
    exit /b 1
)

if exist "%SRC_DIR%\src\index.ts" (
    echo Updating bunny...
    cd /d "%SRC_DIR%"
    git pull --quiet >nul 2>&1
    call bun install >nul 2>&1
) else (
    echo Installing bunny to %INSTALL_DIR%...
    mkdir "%INSTALL_DIR%" 2>nul
    git clone --depth 1 https://github.com/boofpackdev/bunny "%SRC_DIR%"
    cd /d "%SRC_DIR%"
    call bun install
)

echo.
echo Running: %*
call bun run "%SRC_DIR%\src\index.ts" %*

if %ERRORLEVEL% neq 0 (
    echo.
    echo Tip: If connection failed, try:
    echo   run.bat "message" -e http://YOUR_SERVER_IP:8642
)
