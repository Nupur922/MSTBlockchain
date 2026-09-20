# 🌾 AgriTrust AI: Parametric Crop Insurance & Disaster Relief Escrow on MST Blockchain

> **MST Blockchain x NEWRRO 24-Hour Buildathon Project Blueprint**  
> **Target Private Repository**: [nupurbagave2909-lang/MSTBlockchain](https://github.com/nupurbagave2909-lang/MSTBlockchain)

---

## 📌 1. EXECUTIVE PROJECT SUMMARY

**AgriTrust AI** is an autonomous, satellite-driven parametric crop insurance and disaster relief platform built on **MST Blockchain Layer 1** and powered by **NEWRRO AI Remote Sensing**.

In agricultural regions across India (such as the Brahmaputra flood basin in Assam and the Kosi river basin in Bihar), smallholder farmers lose billions to annual monsoon floods. Traditional crop insurance takes **3 to 6 months** due to manual paper assessments, human adjuster corruption, and bureaucratic delays—forcing farmers into severe debt traps.

**AgriTrust AI** replaces manual field adjusters with **Sentinel-1 SAR Radar Satellite Data** (which penetrates thick storm clouds), **NEWRRO AI Multi-Source Consensus**, and **MST Layer 1 Smart Contract Escrow Payouts in 2 Seconds**.

---

## 👥 2. TEAM WORKLOAD MATRIX & TECH STACK SPECIFICATIONS

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

## 🔬 3. GRANULAR DEVELOPER WORKFLOW SPECIFICATION

---

### 🛡️ DEVELOPER 1: BLOCKCHAIN, SMART CONTRACTS & SECURITY LEAD

#### **Day 1 Tasks (Core Contracts & Access Control)**:
1. **Repository & Tooling Setup**:
   * Create `hardhat.config.js` configured for local MST Node (`http://127.0.0.1:8545`, Chain ID `31337`).
   * Install OpenZeppelin Contracts v5 (`npm install @openzeppelin/contracts`).
2. **Develop `contracts/FarmRegistry.sol`**:
   * Define `struct FarmPlot`:
     ```solidity
     struct FarmPlot {
         uint256 id;
         address ownerWallet;
         string polygonGeoJSON; // Lat/Lng vector boundary
         uint256 acreage;
         string cropType;
         bool isEnrolled;
     }
     ```
   * Inherit OpenZeppelin `AccessControl.sol`.
   * Define roles: `DEFAULT_ADMIN_ROLE`, `KRISHI_MITRA_ROLE`, `ORACLE_ROLE`.
   * Write `registerFarmPlot(address owner, string memory geoJson, uint256 acreage, string memory cropType)` restricted to `KRISHI_MITRA_ROLE`.
3. **Develop `contracts/AgriTrustVault.sol`**:
   * Inherit `ReentrancyGuard`, `Pausable`, and `Ownable`.
   * Implement `depositEscrow()` to receive and hold native MST tokens.
   * Add input validation: Enforce plot boundary checks and positive MST deposit amounts.

#### **Day 2 Tasks (Cryptographic Signature Proofs & Security Auditing)**:
1. **Implement ECDSA Proof Verification in `AgriTrustVault.sol`**:
   * Integrate OpenZeppelin `ECDSA.sol` and `MessageHashUtils.sol`.
   * Write `triggerDisasterPayout(uint256 plotId, uint256 payoutAmount, uint256 timestamp, bytes memory signature)`:
     * Hashes payload: `bytes32 proofHash = keccak256(abi.encodePacked(plotId, payoutAmount, timestamp, block.chainid));`
     * Converts to EIP-191 signed hash: `bytes32 ethSignedHash = MessageHashUtils.toEthSignedMessageHash(proofHash);`
     * Recovers signer: `address signer = ECDSA.recover(ethSignedHash, signature);`
     * Verifies `hasRole(ORACLE_ROLE, signer)`.
2. **Implement Signature Replay Protection**:
   * Add `mapping(bytes32 => bool) public executedProofs;`. Revert if `executedProofs[proofHash]` is `true`.
3. **Write Hardhat Security Test Suite (`test/AgriTrustSecurity.test.js`)**:
   * Write tests for:
     * Valid oracle signature payout execution.
     * Unauthorized caller rejection.
     * Replayed signature proof hash rejection.
     * Reentrancy attack prevention on `withdrawEscrow()`.

#### **Day 3 Tasks (Deployment & Off-Ramp Bridge Mock)**:
1. **Write Local Deployment Script (`scripts/deploy_agritrust.js`)**:
   * Deploy `FarmRegistry.sol` and `AgriTrustVault.sol`.
   * Grant `ORACLE_ROLE` to Developer 2's AI Agent wallet address.
   * Seed `AgriTrustVault` with `500.0 MST` initial escrow liquidity.
2. **Develop `contracts/AadhaarBridgeMock.sol`**:
   * Simulates automated conversion of escrowed MST tokens into INR AePS (Aadhaar Enabled Payment System) bank deposits.
3. **Export Contract Artifacts**:
   * Automatically write deployed contract addresses and ABIs to `frontend/src/contracts/` and `agent/config/`.

#### **Day 4 Tasks (Security Hardening & Final Audit)**:
1. **Security Audit Sweep**: Verify reentrancy guards, access controls, and nonces. Run `npx hardhat test` (verify 100% passing).
2. **Dry Run & Repo Management**: Assist in demo dry runs and review on-chain execution logs.

---

### 🤖 DEVELOPER 2: NEWRRO AI, SATELLITE REMOTE SENSING & ORACLE LEAD

#### **Day 1 Tasks (Satellite Data Fetcher & NDVI/SAR Engines)**:
1. **Python Environment Setup**:
   * Create Python 3.10 virtual environment and `agent/requirements.txt` (`web3`, `eth-account`, `requests`, `geopandas`, `shapely`, `rasterio`, `numpy`).
2. **Develop `agent/satellite_fetcher.py`**:
   * Build Sentinel-2 Optical API client to fetch multispectral Band 4 (Red) and Band 8 (Near-Infrared).
   * Build Sentinel-1 SAR Radar API client to fetch backscatter imagery (penetrates storm clouds for Assam/Bihar flood sensing).
3. **Develop `agent/ndvi_calculator.py`**:
   * Implement NDVI calculation: $\text{NDVI} = \frac{\text{NIR} - \text{RED}}{\text{NIR} + \text{RED}}$
   * Implement SAR backscatter water detection threshold logic to measure standing floodwater duration over farm polygons.

#### **Day 2 Tasks (Multi-Source Consensus Engine & EIP-191 Proof Signer)**:
1. **Develop `agent/oracle_consensus.py`**:
   * Cross-reference 3 independent data feeds:
     1. Sentinel-1 SAR Radar Flood Extent.
     2. IMD (India Meteorological Department) / OpenWeather Rain API.
     3. Sentinel-2 NDVI Vegetation Loss Index.
   * Require 2-out-of-3 agreement before authorizing a payout.
2. **Develop `agent/proof_signer.py`**:
   * Generate EIP-191 cryptographic signatures using the AI Agent's private key via `eth_account.Account.sign_message`.
3. **Develop `agent/scenario_simulator.py`**:
   * Create live demo triggers:
     * *Pre-Season Baseline (NDVI: 0.75, Healthy Crop)*
     * *Assam Brahmaputra Flood (SAR Submerged 6 Days)*
     * *Bihar Kosi River Flood (NDVI Drop to 0.18)*

#### **Day 3 Tasks (Continuous Monitoring Loop & Voice Alerts)**:
1. **Develop `agent/sentinel_agent.py`**:
   * Build continuous monitoring loop using `web3.py`: Polls enrolled plots in `FarmRegistry.sol`, checks flood/drought status, signs proofs, and executes `triggerDisasterPayout()` on MST Blockchain.
2. **Develop `agent/voice_notifier.py`**:
   * Build regional language voice call generator (Assamese, Bhojpuri, Hindi):
     * 🔊 *"Ram Singh Ji, satellite radar confirmed 6 days of flood damage on your plot in Darbhanga. ₹25,000 relief payout has been sent to your bank!"*

#### **Day 4 Tasks (Telemetry Auditing & Demo Dry Runs)**:
1. **Audit Oracle Signature Payloads**: Verify EIP-191 payload structure against Developer 1's smart contract.
2. **Dry Run Execution**: Execute 3 complete dry runs of the AI disaster detection pipeline.

---

### 🎨 DEVELOPER 3: FULL-STACK WEB DASHBOARD, GIS MAPS & VOICE UX LEAD

#### **Day 1 Tasks (React Setup & Leaflet GIS Map)**:
1. **React Framework & Styling Setup**:
   * Initialize React + Vite project in `frontend/` with Tailwind CSS, `leaflet`, `react-leaflet`, `ethers`, and `lucide-react`.
2. **Develop `frontend/src/components/FarmMap.jsx`**:
   * Render Leaflet.js interactive map centered over Assam (Majuli) & Bihar (Darbhanga) flood zones.
   * Add satellite imagery and terrain layer toggles.
   * Draw interactive farm plot polygons for enrolled plots.
3. **Develop `frontend/src/components/Header.jsx` & `StatCards.jsx`**:
   * Main Header, Escrow Pool Balance Card (`500.0 MST`), Active Enrolled Farmers, Total Claims Settled.

#### **Day 2 Tasks (QR Scanner & Satellite Telemetry UI)**:
1. **Develop `frontend/src/components/QRScannerModal.jsx`**:
   * Simulates scanning government land documents (*Bihar Bhumi / Bhu-Naksha QR Code*).
   * Automatically extracts farm polygon coordinates and renders plot on map with 0 typing!
2. **Develop `frontend/src/components/PlotTelemetry.jsx`**:
   * Render live NDVI vegetation health gauge (`0.0 to 1.0`).
   * Render SAR radar flood inundation gauge (`Dry Land` vs `Submerged 6 Days`).

#### **Day 3 Tasks (Contract Integration, Demo Controls & Voice UX)**:
1. **Connect React UI to MST Smart Contracts**:
   * Integrate Ethers.js v6 to connect frontend to local Hardhat MST RPC.
   * Bind live contract balances, policy states, and event listeners (`EmergencyDisasterPayoutTriggered`).
2. **Develop `frontend/src/components/DemoControlPanel.jsx`**:
   * Trigger buttons for Assam Brahmaputra & Bihar Kosi floods.
3. **Develop `frontend/src/components/VoiceAlertModal.jsx` & `AePSCashoutModal.jsx`**:
   * Modal 1: Interactive pop-up playing regional voice alert in Assamese/Bhojpuri.
   * Modal 2: Simulated Village Post Office cash withdrawal showing Aadhaar fingerprint scan and INR cash release!

#### **Day 4 Tasks (UI Polish & Presentation)**:
1. **UI Polish**: Ensure responsive layout, smooth transitions, and error handling.
2. **Lead Demo Presentation**: Drive the interactive laptop presentation for hackathon judges.

---

## 🔒 4. SECURITY & COMPLIANCE ARCHITECTURE

```
                                  SECURITY LAYERS
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 1. REENTRANCY PROTECTION (OpenZeppelin ReentrancyGuard)                         │
│    Prevents malicious contracts from hijacking funds during token transfers.   │
├─────────────────────────────────────────────────────────────────────────────────┤
│ 2. CRYPTOGRAPHIC PROOF VERIFICATION (EIP-191 / ECDSA.recover)                    │
│    Smart contract verifies off-chain telemetry proofs signed by NEWRRO AI.      │
├─────────────────────────────────────────────────────────────────────────────────┤
│ 3. SIGNATURE REPLAY PROTECTION (Executed Proof Mapping)                          │
│    Prevents an attacker from submitting the same valid AI signature twice.      │
├─────────────────────────────────────────────────────────────────────────────────┤
│ 4. ROLE-BASED ACCESS CONTROL (OpenZeppelin AccessControl RBAC)                  │
│    Strictly restricts administrative & oracle functions to authorized wallets.  │
├─────────────────────────────────────────────────────────────────────────────────┤
│ 5. MULTI-SOURCE ORACLE CONSENSUS (2-of-3 Feed Agreement)                        │
│    Requires agreement between SAR Radar, Sentinel-2 NDVI, and IMD Weather APIs. │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🐙 5. GITHUB VERSION CONTROL WORKFLOW

```powershell
# Set Remote URL
git remote set-url origin https://github.com/nupurbagave2909-lang/MSTBlockchain.git

# Stage, Commit, and Push README.md
git add README.md
git commit -m "docs: add granular Developer 1, 2, 3 workflow specification and security architecture"
git branch -M main
git push -u origin main
```
