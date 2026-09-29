@echo off
title AgriTrust AI Version 3.0 — Full Stack Launcher
color 0A

echo.
echo  =====================================================================
echo   🌾 AgriTrust AI Version 3.0 — Full Stack Services Launcher
echo   MST Blockchain + NEWRRO AI Oracle + Voice + WhatsApp + Frontend
echo  =====================================================================
echo.

:: ── Step 1: Start Hardhat node (stays open in its own window) ──────────────
echo  [1/5] Starting Hardhat Local Blockchain Node on port 8545...
start "1. Hardhat Node" cmd /k "title Hardhat Node && npx hardhat node"

:: Wait 12 seconds — Hardhat needs time to compile and print accounts
echo  Waiting 12 seconds for Hardhat node to initialize...
timeout /t 12 /nobreak >nul

:: ── Step 2: Deploy contracts (wait for it to finish before moving on) ────────
echo  [2/5] Deploying Smart Contracts to Hardhat Local Node...
echo  Please wait — this takes ~10 seconds...
echo.
call npx hardhat run scripts/deploy.js --network localhost
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  ❌ Contract deployment FAILED!
    echo  Make sure the Hardhat node window above shows accounts before retrying.
    echo  Press any key to exit...
    pause >nul
    exit /b 1
)
echo.
echo  ✅ Contracts deployed successfully!
echo.

:: ── Step 3: Frontend ─────────────────────────────────────────────────────────
echo  [3/5] Starting Frontend Vite Dev Server on port 3000...
start "3. Frontend (port 3000)" cmd /k "title Frontend && cd frontend && npm run dev"

:: ── Step 4: Python venv + sentinel agent ─────────────────────────────────────
echo  [4/5] Starting Python AI Oracle Sentinel Agent (Demo Mode)...
start "4. AI Oracle Agent" cmd /k "title AI Oracle && .\venv\Scripts\activate && cd agent && python sentinel_agent.py --demo"

:: Wait a moment before starting bridge
timeout /t 2 /nobreak >nul

:: ── Step 5: Bridge server ─────────────────────────────────────────────────────
echo  [5/5] Starting Twilio Voice + WhatsApp Bridge Server on port 8000...
start "5. Bridge Server (port 8000)" cmd /k "title Bridge Server && .\venv\Scripts\activate && cd agent && python bridge_server.py"

echo.
echo  =====================================================================
echo   ✅ ALL 5 AgriTrust AI services launched!
echo.
echo   🌐 Dashboard    :  http://localhost:3000
echo   👨‍🌾 Krishi Portal :  http://localhost:3000/#/krishi
echo   📞 Bridge API   :  http://localhost:8000/health
echo   ⛓  Chain RPC    :  http://localhost:8545
echo  =====================================================================
echo.
echo  Press any key to close this launcher window...
pause >nul
