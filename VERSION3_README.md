# 🌾 AgriTrust AI — Version 3.0 Final Production Architecture

> **Real-Time Multi-Hazard Parametric Crop Insurance & Government DBT Relief Escrow on MST Blockchain**
> Powered by **Live Copernicus CDSE Satellite Radar**, **3-Spectrum Multi-Hazard AI Engine**, **Twilio Regional Voice Calls (Amazon Polly)**, **UltraMsg WhatsApp Receipts**, **Ghost-Crop Anti-Fraud Detection**, and **Aadhaar AePS Micro-ATM Cashout**.

---

## 🚀 Version 3.0 — What's New Over V2

| Feature | V2 | V3 (This Branch) |
|---|---|---|
| **Hazard Coverage** | Flood only | **3-Spectrum: Flood (SAR) + Drought (NDWI) + Heatwave (LST)** |
| **Fraud Prevention** | 2-of-3 consensus | **+ Ghost-Crop Weed Detection (NDVI anomaly at enrollment)** |
| **Bridge Scenarios** | Assam + Bihar flood | **8 scenarios: 4 states × 3 hazard types + fraud rejections** |
| **Voice Dialect** | Flood terms only | **Heatwave ("garmi ki lahar") + Drought ("sukha") in all 4 languages** |
| **Public Transparency** | None | **Ministry of Agriculture PMFBY DBT Public Audit Portal** |
| **Multi-Hazard UI** | Single gauge | **3 interactive spectrum gauges with opacity filter tabs** |
| **Deploy Script** | Manual ORACLE_ROLE | **Auto-grant + verify ORACLE_ROLE, auto-update .env on deploy** |
| **Agent Preflight** | None | **`--check` validates addresses, ORACLE_ROLE, gas read-only** |
| **Satellite API** | Broken CDSE calls | **Fixed resx/resy placement, Sentinel-1 DEM COPERNICUS_30** |

---

## 🏗️ Cumulative 3-Layer Architecture

### Layer 1 — Blockchain Foundation (V1)
- `FarmRegistry.sol` — On-chain plot registry with Khasra/Khata/GeoJSON
- `AgriTrustVault.sol` — EIP-191 ECDSA escrow with `ecrecover` verification
- `scripts/deploy.js` — Auto-deploys, grants `ORACLE_ROLE`, seeds escrow, auto-updates `.env`
- `FarmMap.jsx` + `QRScannerModal.jsx` — Leaflet GIS map + jsQR land record scanner

### Layer 2 — Telephony, WhatsApp & Evidence (V2)
- `voice_notifier.py` — Twilio PSTN + Amazon Polly with regional Indian dialects
- `bridge_server.py` — HTTP bridge `POST /api/trigger-call` → simultaneous call + WhatsApp
- `pdf_generator.py` — 100% graph-free 3-section PDF disaster certificate
- `proof_signer.py` — EIP-191 `keccak256(plotId|payoutAmount|damagePct|timestamp)`
- `oracle_consensus.py` — 2-of-3 Byzantine fault tolerant consensus (SAR + NDVI + OWM Rain)

### Layer 3 — Multi-Hazard, Anti-Fraud & Govt DBT Portal (V3)
- `multi_hazard_engine.py` — 3-spectrum evaluation: Flood (SAR), Drought (NDWI), Heatwave (LST) + Ghost-Crop fraud
- `MultiHazardAnalyzer.jsx` — Interactive spectrum gauge with opacity filter tabs (ALL / FLOOD / DROUGHT / HEATWAVE)
- `GovtDBTTrackerModal.jsx` — Dynamic ARN search: Assam / Maharashtra / Punjab / Bihar farmer records
- `Header.jsx` — Official PMFBY Direct Benefit Transfer (DBT) Escrow Portal banner

---

## ⚡ Developer 1 → Developer 2 Integration Handoff

After running the deployment:
```bash
npx hardhat node
npx hardhat run scripts/deploy.js --network localhost
```

The deploy script **automatically**:
1. Reads `ORACLE_PRIVATE_KEY` from `.env` to derive the oracle wallet address
2. Grants `ORACLE_ROLE` on `AgriTrustVault` to that address
3. Verifies the grant with `vault.hasRole()` — throws if it fails
4. Writes `FARM_REGISTRY_ADDRESS`, `AGRI_TRUST_VAULT_ADDRESS`, `MST_RPC_URL` into both `.env` files
5. Exports ABIs to `agent/config/` and `frontend/src/contracts/`

**Manual handoff format** (if automatic update fails):

Update `agent/config/contracts.json`:
```json
{
  "FarmRegistry": "0xABC...",
  "AgriTrustVault": "0xDEF..."
}
```

Update `agent/config/.env`:
```env
FARM_REGISTRY_ADDRESS=0xABC...
AGRI_TRUST_VAULT_ADDRESS=0xDEF...
MST_RPC_URL=http://127.0.0.1:8545
```

**Verify the oracle can payout before the demo:**
```bash
.\venv\Scripts\python.exe agent\sentinel_agent.py --check
```
Expected: `✅ All 3 preflight checks passed — Oracle is ready.`

---

## 🚀 Quickstart — One Command Launch

```bat
start_all.bat
```

Opens 5 terminals:

| Terminal | Command | Port |
|---|---|---|
| 1. Hardhat Node | `npx hardhat node` | 8545 |
| 2. Contract Deploy | `npx hardhat run scripts/deploy.js --network localhost` | — |
| 3. Frontend Dashboard | `cd frontend && npm run dev` | 3000 |
| 4. Sentinel AI Agent | `cd agent && python sentinel_agent.py --demo` | — |
| 5. Bridge Server | `cd agent && python bridge_server.py` | 8000 |

**Then open: http://localhost:3000**

---

## 🎙️ Live Demo Walkthrough (3 Minutes)

### Step 1: Farmer Onboarding
1. Click **Scan Land Record / QR**
2. Select a state land record from `frontend/public/sample-land-records/`
3. jsQR decodes Khasra/Khata/GeoJSON polygon → auto-fills on interactive Leaflet map
4. Click **Register Plot on Blockchain** → `FarmRegistry.sol` stores it on-chain

### Step 2: Multi-Hazard Satellite Analysis
Click the **V3 Multi-Hazard Analyzer** tab to see:
- **Flood SAR** gauge — Sentinel-1 C-band microwave backscatter (< -15 dB = standing water)
- **Drought NDWI** gauge — Sentinel-2 water index (< -0.35 = critical moisture deficit)
- **Heatwave LST** gauge — Land Surface Temperature (> 42°C = crop stress)

Filter by hazard type using the **ALL / FLOOD / DROUGHT / HEATWAVE** tabs — inactive gauges dim to `opacity-40`.

### Step 3: Trigger Disaster Simulation
In the **Demo Control Panel**, click any scenario:

| Button | Farmer | Payout | Language |
|---|---|---|---|
| Assam Flood | Prasanta Kalita, Majuli | ₹25,000 | Assamese ("baanpani") |
| Bihar Flood | Ram Singh, Darbhanga | ₹18,000 | Bhojpuri ("baadh") |
| Maharashtra Drought | Eknath Patil, Nashik | ₹17,500 | Hindi ("sukha") |
| Punjab Heatwave | Gurpreet Singh, Ludhiana | ₹14,000 | Hindi ("garmi ki lahar") |
| Ghost-Crop Fraud | — | ₹0 | *Rejected* |

### Step 4: < 2-Second On-Chain Settlement
- Oracle signs `keccak256(plotId|payoutAmount|damagePct|timestamp)` with EIP-191
- `AgriTrustVault.triggerDisasterPayout()` verifies on-chain with `ecrecover`
- Escrow releases relief funds instantly

### Step 5: Dual Dispatch
- **Twilio PSTN call** rings farmer's phone with Amazon Polly in regional dialect
- **UltraMsg WhatsApp** delivers structured receipt with MST tx hash + Aadhaar DBT steps

### Step 6: Government DBT Audit
Click **Track DBT Claim Status** → search any ARN:

| ARN | Returns |
|---|---|
| `ASSAM-PATTA-2026-992014` | Prasanta Kalita, Majuli — ₹17,500 |
| `MAHA-712-2026-381920` | Eknath Patil, Nashik — ₹17,500 |
| `PUNJAB-HEATWAVE-2026-448120` | Gurpreet Singh, Ludhiana — ₹14,000 |
| `BIHAR-BHUMI-2026-883921` | Ram Singh, Darbhanga — ₹25,000 |

### Step 7: Aadhaar AePS Biometric Cashout
- Click **Aadhaar AePS Micro-ATM Cashout**
- Touch fingerprint sensor (W3C WebAuthn API)
- Receive simulated India Post Gramin Dak Sevak cash receipt with RRN

---

## 📊 PMFBY vs AgriTrust AI V3 — Problem Statement Alignment

| Problem (PMFBY) | AgriTrust AI V3 Solution |
|---|---|
| 6–12 Month Claim Delays (manual CCE) | **< 2-Second** automatic payout via 2-of-3 satellite oracle consensus |
| Paperwork & Evidence Disputes | Tamper-proof EIP-191 ECDSA cryptographic PDF audit certificate |
| Single-Disaster Limitation | **3-Spectrum** engine: Flood (SAR radar) + Drought (NDWI) + Heatwave (LST) |
| Exclusion of Rural Illiterate Farmers | Doorstep Aadhaar biometric cashout + regional PSTN voice calls |
| Lack of Government Transparency | PMFBY DBT Public Audit Portal with 4-step verification stepper |
| Insurance Fraud | Ghost-Crop weed detection + Byzantine fault tolerant 2-of-3 consensus |

---

## 🗂️ Repository Structure (V3 Additions Highlighted)

```
MSTBlockchain/
├── contracts/
│   ├── FarmRegistry.sol
│   └── AgriTrustVault.sol
├── scripts/
│   └── deploy.js                       ← V3: ORACLE_ROLE grant + verify + auto .env update
├── agent/
│   ├── multi_hazard_engine.py           ← V3: 3-spectrum + ghost-crop anti-fraud
│   ├── bridge_server.py                 ← V3: 8-scenario routing (flood/drought/heatwave)
│   ├── voice_notifier.py                ← V3: heatwave dialect + Union import fix
│   ├── sentinel_agent.py                ← V3: --check preflight, --demo mode
│   ├── satellite_fetcher.py             ← V3: live Copernicus CDSE OAuth2 fixed
│   ├── oracle_consensus.py              ← V2: 2-of-3 BFT consensus
│   ├── proof_signer.py                  ← V2: EIP-191 ECDSA signing
│   ├── pdf_generator.py                 ← V2: graph-free 3-section PDF
│   ├── ndvi_calculator.py               ← V1: NDVI + SAR flood duration
│   ├── test_agent.py                    ← V3: 20-test pipeline
│   └── config/
│       ├── .env.example                 ← V3: complete credentials template
│       └── contracts.json               ← Runtime: auto-updated by deploy.js
├── frontend/src/components/
│   ├── MultiHazardAnalyzer.jsx          ← V3: 3-gauge + opacity filter tabs
│   ├── GovtDBTTrackerModal.jsx          ← V3: dynamic 4-state ARN lookup
│   ├── Header.jsx                       ← V3: PMFBY DBT ESCROW PORTAL banner
│   ├── AePSCashoutModal.jsx             ← V2: W3C WebAuthn fingerprint cashout
│   └── DemoControlPanel.jsx             ← V1+V2+V3: disaster simulation triggers
├── start_all.bat                        ← V3: 5-service launcher
├── VERSION3_README.md                   ← This file
└── VERSION2_README.md
```

---

## 🛡️ Security Notes

- `ORACLE_PRIVATE_KEY` and all API tokens are loaded exclusively from `.env` — never hardcoded
- Both `.env` files are permanently in `.gitignore`
- `AgriTrustVault.sol` uses nonces + timestamps to prevent EIP-191 replay attacks
- 2-of-3 consensus threshold prevents any single compromised satellite feed from triggering payouts
- Ghost-crop detection blocks fraudulent NDVI inflation at enrollment time

---

*AgriTrust AI — MST Blockchain × NEWRRO AI Buildathon | Branch: `version_3`*
