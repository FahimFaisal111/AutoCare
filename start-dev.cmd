@echo off
:: ============================================================================
:: AutoCare AI - Local Dev Launcher
:: ============================================================================
:: Run this from a fresh clone/fork on any Windows machine. It will:
::   1. Check Node.js/npm are installed
::   2. Install backend + frontend dependencies (only if not already installed)
::   3. Make sure backend\.env exists (creating it from .env.example if not,
::      with a freshly generated JWT_SECRET - never reuses the example's)
::   4. Launch the Express backend and Next.js frontend, each in its own
::      window, in dev/watch mode (nodemon + next dev)
::
:: What this script deliberately does NOT do:
::   - It never touches your MySQL database. sql\schema.sql DROPS every
::     table before recreating it, so running it automatically could wipe
::     real data. Import it yourself once, manually, before first run:
::         mysql -u root -p < sql\schema.sql
::   - It never overwrites an existing backend\.env.
:: ============================================================================

setlocal
set "ROOT=%~dp0"
cd /d "%ROOT%"

echo.
echo ==============================================
echo   AutoCare AI - Local Dev Launcher
echo ==============================================
echo.

:: --- 1. Node.js / npm present? ------------------------------------------
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js was not found on PATH.
    echo         Install Node.js 18+ from https://nodejs.org and re-run this script.
    pause
    exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
    echo [ERROR] npm was not found on PATH. It normally ships with Node.js.
    pause
    exit /b 1
)
for /f "delims=" %%v in ('node -v') do echo [OK] Node.js found: %%v
echo.

:: --- 2. Backend dependencies ---------------------------------------------
if not exist "%ROOT%backend\node_modules" (
    echo [SETUP] Installing backend dependencies - first run, this can take a minute...
    pushd "%ROOT%backend"
    call npm install
    if errorlevel 1 (
        echo [ERROR] backend npm install failed - see the output above.
        popd
        pause
        exit /b 1
    )
    popd
) else (
    echo [OK] Backend dependencies already installed.
)

:: --- 3. Frontend dependencies ---------------------------------------------
if not exist "%ROOT%frontend\node_modules" (
    echo [SETUP] Installing frontend dependencies - first run, this can take a minute...
    pushd "%ROOT%frontend"
    call npm install
    if errorlevel 1 (
        echo [ERROR] frontend npm install failed - see the output above.
        popd
        pause
        exit /b 1
    )
    popd
) else (
    echo [OK] Frontend dependencies already installed.
)
echo.

:: --- 4. backend\.env ---------------------------------------------------------
if not exist "%ROOT%backend\.env" (
    echo [SETUP] backend\.env not found - creating it from backend\.env.example
    echo         with a freshly generated JWT_SECRET...

    powershell -NoProfile -Command ^
        "$s = ([guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N'));" ^
        "(Get-Content -Raw 'backend\.env.example') -replace 'JWT_SECRET=.*', ('JWT_SECRET=' + $s) | Set-Content -NoNewline 'backend\.env'"

    if errorlevel 1 (
        echo [ERROR] Could not generate backend\.env automatically.
        echo         Copy backend\.env.example to backend\.env by hand and fill it in.
        pause
        exit /b 1
    )

    echo.
    echo ================================================================
    echo   A new backend\.env was just created for you. Before continuing,
    echo   open it and set:
    echo     - DB_USER / DB_PASSWORD   to match YOUR local MySQL login
    echo     - GEMINI_API_KEY          optional - AI diagnostics fall back
    echo                                to a built-in mock without one
    echo   Then run this script again to actually start the servers.
    echo ================================================================
    pause
    exit /b 0
) else (
    echo [OK] backend\.env already exists - using your existing settings.
)
echo.

:: --- 5. Database reminder (manual on purpose - see header) -------------------
echo [INFO] First time on this machine? Make sure MySQL is running and the
echo        schema has been imported once, manually:
echo            mysql -u root -p ^< sql\schema.sql
echo.

:: --- 6. Launch backend + frontend, each in its own window --------------------
netstat -ano | findstr ":8080 " | findstr "LISTENING" >nul
if not errorlevel 1 (
    echo [SKIP] Port 8080 is already in use - assuming the backend is already running.
) else (
    echo [START] Launching backend  ^(Express, http://localhost:8080^) ...
    start "AutoCare Backend" /D "%ROOT%backend" cmd /k npm run dev
)

netstat -ano | findstr ":3000 " | findstr "LISTENING" >nul
if not errorlevel 1 (
    echo [SKIP] Port 3000 is already in use - assuming the frontend is already running.
) else (
    echo [START] Launching frontend ^(Next.js, http://localhost:3000^) ...
    start "AutoCare Frontend" /D "%ROOT%frontend" cmd /k npm run dev
)

echo.
echo Backend health check : http://localhost:8080/api/health
echo Frontend             : http://localhost:3000
echo.
echo Each server runs in its own window with nodemon/next in watch mode - if
echo one shows "Fatal Server Boot Error", it's almost always backend\.env's
echo DB_USER/DB_PASSWORD, or MySQL not running.
echo.
echo This launcher window can be closed now - it isn't needed once the two
echo server windows are open.
echo.
pause
endlocal
