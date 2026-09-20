# 🌾 AgriTrust AI: Parametric Crop Insurance & Disaster Relief Escrow on MST Blockchain

> **MST Blockchain x NEWRRO 24-Hour Buildathon Project Blueprint**  
> **Target Repository**: [nupurbagave2909-lang/MSTBlockchain](https://github.com/nupurbagave2909-lang/MSTBlockchain)

---

## 📌 Executive Summary

**AgriTrust AI** is an autonomous, satellite-driven parametric crop insurance and disaster relief platform built on **MST Blockchain Layer 1** and powered by **NEWRRO AI Remote Sensing**.

In agricultural regions across India (such as the Brahmaputra flood basin in Assam and the Kosi river basin in Bihar), smallholder farmers lose billions to annual monsoon floods. Traditional crop insurance takes **3 to 6 months** due to manual paper assessments, human adjuster corruption, and bureaucratic delays—forcing farmers into severe debt traps.

**AgriTrust AI** replaces manual field adjusters with **Sentinel-1 SAR Radar Satellite Data** (which penetrates thick storm clouds), **NEWRRO AI Multi-Source Consensus**, and **MST Layer 1 Smart Contract Escrow Payouts in 2 Seconds**.

---

## 🛠️ Equal Workload Distribution & Tech Stack Specifications

The 4-day development lifecycle is distributed equally across 3 team members:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 AGRITRUST AI TEAM STACK                                │
├───────────────────────────────┬───────────────────────────────┬────────────────────────┤
│   DEVELOPER 1: BLOCKCHAIN     │     DEVELOPER 2: NEWRRO AI    │ DEVELOPER 3: FRONTEND  │
│      & SECURITY LEAD          │    & SATELLITE ENGINE LEAD    │    & VOICE UX LEAD     │
├───────────────────────────────┼───────────────────────────────┼────────────────────────┤
│ • Solidity v0.8.20            │ • Python 3.10+                │ • React 18 + Vite      │
│ • Hardhat Framework           │ • Web3.py & eth-account       │ • Tailwind CSS         │
│ • OpenZeppelin v5 (Security)  │ • Sentinel-1 SAR Radar API    │ • Leaflet.js (GIS Map) │
│ • ECDSA Signature Proofs      │ • Sentinel-2 Optical API      │ • Ethers.js v6         │
│ • Hardhat Unit Tests          │ • Multi-Source Consensus      │ • Web Speech Voice API │
└───────────────────────────────┴───────────────────────────────┴────────────────────────┘
```

---

## 👥 Role Responsibilities

### 🛡️ Developer 1: Blockchain, Smart Contracts & Security Lead
* **Scope**: Solidity smart contracts, access control, reentrancy guards, cryptographic EIP-712 / ECDSA signature verification, off-ramp bridge mock, Hardhat unit testing, and security auditing.
* **Core Artifacts**: `contracts/FarmRegistry.sol`, `contracts/AgriTrustVault.sol`, `contracts/AadhaarBridgeMock.sol`, `test/AgriTrustSecurity.test.js`, `scripts/deploy_agritrust.js`.

### 🤖 Developer 2: NEWRRO AI, Remote Sensing & Oracle Lead
* **Scope**: Satellite imagery ingestion (Sentinel-1 SAR Radar & Sentinel-2 Optical), NDVI vegetation index calculation, SAR radar flood inundation mapping, multi-source oracle consensus engine, EIP-712 cryptographic proof signing.
* **Core Artifacts**: `agent/satellite_fetcher.py`, `agent/ndvi_calculator.py`, `agent/oracle_consensus.py`, `agent/proof_signer.py`, `agent/scenario_simulator.py`, `agent/voice_notifier.py`, `agent/sentinel_agent.py`.

### 🎨 Developer 3: Full-Stack Web Dashboard, GIS Mapping & Voice UX Lead
* **Scope**: React/Vite dashboard, Leaflet.js interactive farm GIS map, land record QR code scanning simulation, regional voice alert modal (Assamese/Bhojpuri/Hindi), Aadhaar AePS cashout workflow.
* **Core Artifacts**: `frontend/src/components/FarmMap.jsx`, `frontend/src/components/QRScannerModal.jsx`, `frontend/src/components/PlotTelemetry.jsx`, `frontend/src/components/DemoControlPanel.jsx`, `frontend/src/components/VoiceAlertModal.jsx`, `frontend/src/components/AePSCashoutModal.jsx`.

---

## 🌐 Zero-Friction Model for Rural & Illiterate Farmers

To ensure 100% real-world adoption in rural India:

1. **Zero Typing Onboarding**: Local village *Krishi Mitras* / CSC operators scan government land record QR codes (*Bhu-Naksha / Bihar Bhumi*). The app automatically extracts farm polygon coordinates.
2. **Aadhaar-Linked Account Abstraction**: MST Blockchain wallets are generated automatically linked to the farmer's Aadhaar and mobile number—zero seed phrases or passwords to manage.
3. **Regional Voice Notifications**: Farmers receive automated Voice Calls / WhatsApp Voice Notes in their native dialect (Assamese, Bhojpuri, Hindi):
   > 🔊 *"Ram Singh Ji, satellite radar confirmed 6 days of flood damage on your plot in Darbhanga. ₹25,000 relief payout has been sent to your bank!"*
4. **AePS Fingerprint Cash Withdrawal**: The MST payout converts automatically to INR via AePS (Aadhaar Enabled Payment System). Farmers withdraw cash at their local Village Post Office using a simple fingerprint scan.

---

## 📅 Detailed 4-Day Master Sprint Schedule

### 🛠️ DAY 1: Architecture, Core Contracts & Ingestion Pipelines

* **Developer 1 (Blockchain & Security Lead)**:
  * Set up `hardhat.config.js` for local MST Node (`http://127.0.0.1:8545`, Chain ID `31337`).
  * Write `contracts/FarmRegistry.sol`: On-chain farm polygon geofencing & land registration with `AccessControl` roles (`DEFAULT_ADMIN_ROLE`, `KRISHI_MITRA_ROLE`, `ORACLE_ROLE`).
  * Write `contracts/AgriTrustVault.sol`: Escrow pool balance management with OpenZeppelin `ReentrancyGuard` and `Pausable`.
* **Developer 2 (NEWRRO AI & Satellite Lead)**:
  * Create Python environment & `agent/requirements.txt` (`web3`, `eth-account`, `requests`, `geopandas`, `shapely`, `rasterio`, `numpy`).
  * Write `agent/satellite_fetcher.py`: Ingests Sentinel-2 Optical imagery (Bands 4 & 8) and Sentinel-1 SAR Radar backscatter data.
  * Write `agent/ndvi_calculator.py`: Calculates NDVI $\frac{\text{NIR} - \text{RED}}{\text{NIR} + \text{RED}}$ and SAR backscatter water detection threshold logic for standing floodwater over farm polygons.
* **Developer 3 (Frontend Dashboard & GIS Lead)**:
  * Initialize React + Vite project in `frontend/` with Tailwind CSS, Leaflet.js, and Lucide Icons.
  * Write `frontend/src/components/FarmMap.jsx`: Interactive GIS map centered over Assam (Majuli) & Bihar (Darbhanga) flood zones.
  * Write `frontend/src/components/Header.jsx` & `StatCards.jsx`: Main header, active policies, and escrow pool metrics (`500.0 MST`).

---

### 🔒 DAY 2: Cryptographic Proofs, Consensus Engine & Contract Security

* **Developer 1 (Blockchain & Security Lead)**:
  * Upgrade `AgriTrustVault.sol` with `ECDSA.sol` signature recovery (`triggerDisasterPayout(...)`).
  * Add Replay Protection: `mapping(bytes32 => bool) public executedProofs` to prevent double-spending proof signatures.
  * Write Hardhat security unit tests (`test/AgriTrustSecurity.test.js`): Reentrancy prevention, fake oracle rejection, signature replay rejection, pausable checks.
* **Developer 2 (NEWRRO AI & Satellite Lead)**:
  * Write `agent/oracle_consensus.py`: Cross-references Sentinel-1 SAR Radar, IMD Rain API, and Sentinel-2 NDVI Index (requires 2-of-3 agreement).
  * Write `agent/proof_signer.py`: Generates EIP-191 cryptographic signatures using the AI Agent's private key.
  * Write `agent/scenario_simulator.py`: Demo triggers (*Pre-Season Green Baseline* -> *Brahmaputra Flood* -> *Kosi River Flood*).
* **Developer 3 (Frontend Dashboard & GIS Lead)**:
  * Write `frontend/src/components/QRScannerModal.jsx`: Simulates land record QR code scanning (*Bhu-Naksha*) with zero typing.
  * Write `frontend/src/components/PlotTelemetry.jsx`: Live NDVI vegetation health dial (`0.0 to 1.0`) and SAR flood inundation status.

---

### ⚡ DAY 3: Full-Stack Integration, Voice Interface & AePS Off-Ramp

* **Developer 1 (Blockchain & Security Lead)**:
  * Write deployment script `scripts/deploy_agritrust.js`: Deploy contracts to local MST node, grant `ORACLE_ROLE`, and seed vault with `500.0 MST`.
  * Write `contracts/AadhaarBridgeMock.sol`: Simulates instant conversion of MST Tokens into INR AePS bank deposits.
  * Export deployment addresses and ABIs to `frontend/src/contracts/` and `agent/config/`.
* **Developer 2 (NEWRRO AI & Satellite Lead)**:
  * Write `agent/sentinel_agent.py`: Main continuous monitoring loop for plot verification and on-chain payout transactions.
  * Write `agent/voice_notifier.py`: Generates regional voice calls (Assamese, Bhojpuri, Hindi) alerting farmers of payout details.
* **Developer 3 (Frontend Dashboard & GIS Lead)**:
  * Connect React UI to deployed smart contracts using Ethers.js v6.
  * Write `frontend/src/components/DemoControlPanel.jsx`: Trigger buttons for Assam Brahmaputra & Bihar Kosi floods.
  * Write `frontend/src/components/VoiceAlertModal.jsx` & `AePSCashoutModal.jsx`: Pop-up modal simulating regional voice calls and village post office fingerprint cash withdrawal in INR.

---

### 🚀 DAY 4: Security Audit, Hardening, Presentation Prep & GitHub Push

* **All Developers (Collaborative Sprint)**:
  1. **Security Audit Sweep**: Verify reentrancy guards, RBAC access controls, signature nonces, and run `npx hardhat test`.
  2. **End-to-End Dry Runs**: QR Land Scan -> Pre-Season Green Satellite Baseline -> Click "Simulate Kosi River Flood" -> SAR Radar cloud penetration -> AI signature generation -> MST Smart Contract 2-second payout -> Voice call alert -> Fingerprint AePS cashout.
  3. **GitHub Push**: Execute terminal commands to commit and push the complete codebase to `https://github.com/nupurbagave2909-lang/MSTBlockchain.git`.

---

## 🔒 Security & Compliance Architecture

1. **Reentrancy Protection**: State updates occur *before* external token transfers via OpenZeppelin `ReentrancyGuard`.
2. **Cryptographic EIP-191 Proof Verification**: Smart contract verifies off-chain telemetry proofs signed by NEWRRO AI Agent using `ECDSA.recover`.
3. **Signature Replay Prevention**: `mapping(bytes32 => bool) public executedProofs` reverts double-submission of identical proof hashes.
4. **Role-Based Access Control (RBAC)**: Administrative and oracle functions restricted via OpenZeppelin `AccessControl`.
5. **Multi-Source Oracle Consensus**: Requires 2-out-of-3 agreement between Sentinel-1 SAR Radar, Sentinel-2 NDVI, and IMD Weather APIs.

---

## 🐙 Git Push Commands

```powershell
# Set Remote URL (Fixing broken URL syntax)
git remote set-url origin https://github.com/nupurbagave2909-lang/MSTBlockchain.git

# Stage, Commit, and Push
git add README.md
git commit -m "docs: add detailed AgriTrust AI 4-day masterplan and security specification"
git branch -M main
git push -u origin main
```
