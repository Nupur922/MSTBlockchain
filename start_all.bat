@echo off
title AgriTrust AI Launcher
echo ===================================================
echo   🌾 Starting AgriTrust AI Full Stack Services...
echo ===================================================

echo [1/5] Starting Hardhat Local Blockchain Node...
start "1. Hardhat Node" cmd /k "npx hardhat node"

echo Waiting 5 seconds for Hardhat node to initialize...
timeout /t 5 /nobreak >nul

echo [2/5] Deploying Smart Contracts to Localhost...
start "2. Contract Deploy" cmd /k "npx hardhat run scripts/deploy.js --network localhost"

echo Waiting 3 seconds for deployment to complete...
timeout /t 3 /nobreak >nul

echo [3/5] Starting Frontend Vite Server...
start "3. Frontend Web App" cmd /k "cd frontend && npm run dev"

echo [4/5] Starting Python AI Oracle Sentinel Agent...
start "4. Python AI Agent" cmd /k "cd agent && python sentinel_agent.py --demo"

echo [5/5] Starting Twilio Voice & WhatsApp Bridge Server...
start "5. Twilio Bridge Server" cmd /k "cd agent && python bridge_server.py"

echo ===================================================
echo   ✅ All 5 AgriTrust AI services launched!
echo   Browser ready at http://localhost:3000
echo   Live Twilio Calls & WhatsApp active on port 8000
echo ===================================================
