# 🏆 AgriTrust AI — Deployment & Execution Master Guide

> **Official Guide for MST Blockchain x NEWRRO Buildathon**  
> Complete steps for Local Hardhat Node, MST Testnet Deployment, Vercel Cloud Hosting, and Live Hackathon Pitch Setup.

---

## 📌 Quick Summary of Deployment Architecture

| Component | Local Hackathon Setup | Vercel & Cloud Production Setup |
|---|---|---|
| **EVM Blockchain** | `npx hardhat node` (`http://127.0.0.1:8545`) | MST Testnet / EVM RPC (`MST_RPC_URL`) |
| **Frontend Portal** | `cd frontend && npm run dev -- --host` | Vercel (`https://agritrust-ai.vercel.app`) |
| **AI Sentinel Agent** | `python agent/sentinel_agent.py` | Python Daemon / Cloud Worker |
| **Voice & Call Bridge** | `python agent/bridge_server.py` (`http://127.0.0.1:8000`) | Twilio / UltraMsg Live API Bridge |

---

## ⚡ Step 1: Deploy Smart Contracts

### Option A: Local Hardhat Node (Recommended for Demo Safety)
1. **Terminal 1 — Start Local Blockchain**:
   ```powershell
   cd D:\Sem_5\MST\MSTBlockchain
   npx hardhat node
   ```
2. **Terminal 2 — Deploy Contracts & Seed Escrow**:
   ```powershell
   cd D:\Sem_5\MST\MSTBlockchain
   npx hardhat run scripts/deploy.js --network localhost
   ```
   *Automatically exports ABI & address files to `frontend/src/contracts/` and `agent/config/`.*

### Option B: MST Testnet / Custom EVM Network
1. Create `agent/config/.env` file:
   ```env
   ORACLE_PRIVATE_KEY=0x_your_private_key_here
   MST_RPC_URL=https://rpc.mstblockchain.io
   MST_CHAIN_ID=31337
   ```
2. Deploy to Testnet:
   ```powershell
   npx hardhat run scripts/deploy.js --network mst_testnet
   ```

---

## 🌐 Step 2: Deploy Frontend Portal to Vercel (Cloud Hosting)

Deploying to Vercel gives you a live link (`https://agritrust-ai.vercel.app`) that judges can open on their own phones!

### 2-Minute Vercel Deployment Guide:
1. **Push your code to GitHub**:
   ```powershell
   git add -A
   git commit -m "deploy: prepare for Vercel production deployment"
   git push origin version_3
   ```
2. **Open Vercel.com**:
   * Log into [Vercel.com](https://vercel.com) using your GitHub account.
   * Click **"Add New..."** $\rightarrow$ **"Project"**.
   * Import the **`MSTBlockchain`** repository.
3. **Configure Settings**:
   * **Framework Preset**: Vite
   * **Root Directory**: Select `frontend` (Click **Edit** next to Root Directory and pick `frontend`).
   * **Build Command**: `npm run build`
   * **Output Directory**: `dist`
4. **Click Deploy**:
   * Vercel will build your app and generate a live link like `https://agritrust-ai.vercel.app`.

---

## 🚀 Step 3: Run the Live Application (Local Pitch Setup)

Open 4 terminal windows on your laptop:

### Terminal 1: Hardhat Node
```powershell
cd D:\Sem_5\MST\MSTBlockchain
npx hardhat node
```

### Terminal 2: Deploy Script
```powershell
cd D:\Sem_5\MST\MSTBlockchain
npx hardhat run scripts/deploy.js --network localhost
```

### Terminal 3: Voice & Call Bridge Server
```powershell
cd D:\Sem_5\MST\MSTBlockchain
python agent/bridge_server.py
```

### Terminal 4: Frontend Development Server (Wi-Fi Sharing Enabled)
```powershell
cd D:\Sem_5\MST\MSTBlockchain\frontend
npm run dev -- --host
```
*Vite will print a LAN Network URL (e.g. `http://192.168.1.15:3000`). Anyone on the same Wi-Fi can open it on their phone to test the biometric cashout & QR scanner live!*

---

## 📱 Step 4: Live Jury Pitch Walkthrough

Follow this sequence during your pitch:

1. **Open Portal**: Open `http://localhost:3000` or your Vercel link.
2. **Show Government Header**: Highlight the official Ministry of Agriculture PMFBY Banner, Toll-Free Kisan Helpline `14447`, and Language Selector.
3. **Public DBT Tracker**: Click **"Track DBT Claim Status"** and enter ARN `BIHAR-BHUMI-2026-883921` to show the 4-step audit pipeline & printable receipt.
4. **Scan Bhu-Naksha Document**: Click **"Scan / Upload Land Record QR"**, select sample land document, and see computer-vision extract Khasra GeoJSON coordinates on the Leaflet map.
5. **Multi-Hazard Spectrum**: Switch between **Flood SAR**, **Drought NDWI**, and **Heatwave Thermal LST** telemetry gauges.
6. **Trigger Emergency Payout**: In Demo Control Panel, click **"Simulate Assam Flood"** or **"Simulate Maharashtra Drought"**.
   * On-chain escrow payout executes in **< 2 seconds**.
   * Regional Voice Alert call triggers in Assamese/Bhojpuri.
   * Click **"Audit Certificate (PDF Evidence)"** to preview the legal PDF certificate.
7. **AePS Fingerprint Cashout**: Click **"Aadhaar AePS Micro-ATM Cashout"** and touch your laptop's fingerprint sensor to disburse cash receipt!

---

## 🛡️ Hackathon Safety & Troubleshooting

* **Wi-Fi Issues at Event**: Running `npm run dev -- --host` on your local laptop guarantees that even if event Wi-Fi is slow, your presentation will run with 0 latency.
* **Hardhat Error HHE22**: Run `npm install` in root directory if node_modules is missing.
* **Missing Python Dependencies**: Run `pip install -r agent/requirements.txt`.
