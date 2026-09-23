# 🌾 AgriTrust AI — Version 1.0 (Integration & System Architecture)

> **Decentralized Parametric Crop Insurance Platform on MST Blockchain**  
> Autonomous Flood Detection • EIP-191 Oracles • Smart Contract Escrow • Pan-India Voice UX • Aadhaar AePS Biometric Cashout

---

## 👥 Team Roles & Responsibilities

| Member | Focus Area | Key Deliverables in Version 1 |
|---|---|---|
| **Member 1 (Janaki)** | Smart Contracts & Hardhat | `FarmRegistry.sol`, `AgriTrustVault.sol`, deployment scripts, on-chain ECDSA consensus |
| **Member 2 (Chhavi)** | Sentinel AI Oracle Agent | `sentinel_agent.py`, Sentinel-1 SAR + Sentinel-2 NDVI + IMD Rainfall consensus |
| **Member 3 (Nupur)** | Frontend, Multi-State Voice & Biometric UX | React 18 + Vite UI, Leaflet Map, Pan-India State Language Voice Alert, Bhu-Naksha QR Scanner & AePS Biometric Cashout |

---

## 🏗️ End-to-End System Workflow

```
[ Farmer Land Document / Bhu-Naksha QR ]
               │
               ▼
[ 1. Krishi Mitra Portal (Nupur) ]
  • Scans / Uploads 7/12 RoR or Bhu-Naksha QR
  • Decodes GeoJSON Polygon & Khasra details via jsQR
  • Registers plot on-chain: FarmRegistry.registerFarmPlot()
               │
               ▼
[ 2. MST Smart Contracts (Janaki) ]
  • FarmRegistry stores plot GeoJSON boundaries & owner address
  • AgriTrustVault manages Escrow Pool & holds underwriting policies
               │
               ▼
[ 3. NEWRRO AI Sentinel Agent (Chhavi) ]
  • Continuously monitors Sentinel-1 SAR flood inundation + Sentinel-2 NDVI
  • When 2-of-3 oracle consensus detects flood:
  • Computes EIP-191 ECDSA disaster proof & calls triggerDisasterPayout()
               │
               ▼
[ 4. Instant Settlement (< 2 Seconds) ]
  • AgriTrustVault validates oracle signature on-chain
  • Emits DisasterPayoutExecuted event & transfers ETH relief funds
               │
               ▼
[ 5. Last-Mile Payout & Farmer Delivery (Nupur) ]
  • Automated Voice Call: Speaks in farmer's State Language (Marathi, Gujarati, Kannada, Assamese, Bhojpuri, etc.)
  • Farmer visits India Post Gramin Dak Sevak Micro-ATM
  • Real Biometric / Mobile Fingerprint Scan confirms identity
  • Cash disbursed in INR instantly!
```

---

## 📦 What Member 3 (Nupur) Implemented & Integrated

### 1. 🇮🇳 Pan-India Multi-State Regional Language Voice Alerts
- **Automatic State Detection**: Utility `src/utils/stateLanguageMap.js` automatically maps GPS coordinates and GeoJSON polygons to Indian states.
- **Mother Tongue First**:
  - **Maharashtra** $\rightarrow$ Speaks in **मराठी (Marathi)**
  - **Gujarat** $\rightarrow$ Speaks in **ગુજરાતી (Gujarati)**
  - **Karnataka** $\rightarrow$ Speaks in **ಕನ್ನಡ (Kannada)**
  - **Punjab** $\rightarrow$ Speaks in **ਪੰਜਾਬੀ (Punjabi)**
  - **Tamil Nadu** $\rightarrow$ Speaks in **தமிழ் (Tamil)**
  - **West Bengal** $\rightarrow$ Speaks in **বাংলা (Bengali)**
  - **Assam** $\rightarrow$ Speaks in **অসমীয়া (Assamese)**
  - **Bihar** $\rightarrow$ Speaks in **भोजपुरी (Bhojpuri)**
- **Three-Tier Fallback**: Primary Regional Mother Tongue $\rightarrow$ Hindi $\rightarrow$ English.
- **Dynamic Script Rendering**: Displays transcripts in official scripts (Devanagari, Gurmukhi, Kannada, Tamil, Bengali, etc.).

### 2. 📄 Bhu-Naksha & Land Record QR Document Processing
- **Document Drag-and-Drop & File Upload**: In `QRScannerModal.jsx`, farmers or Krishi Mitras can upload photos or screenshots of:
  - *MahaBhumi 7/12 Extract (Maharashtra)*
  - *AnyRoR Form 7/12 (Gujarat)*
  - *Bhoomi RTC Pahani (Karnataka)*
  - *PLRS Jamabandi (Punjab)*
  - *Bihar Bhumi Bhu-Naksha (Bihar)*
  - *ILRMS Dharitree (Assam)*
- **Client-Side Computer Vision**: Uses `jsQR` to decode high-density GeoJSON coordinates straight from the document.
- **Interactive Sample Gallery**: Built `frontend/public/sample-land-records/index.html` with scannable land certificates for all states.

### 3. 📱 Mobile Fingerprint & AePS Aadhaar Cashout
- **W3C WebAuthn Biometric Integration**: Integrated `navigator.credentials` into `AePSCashoutModal.jsx`.
- When accessed on a smartphone or biometric-enabled laptop, it prompts the **native hardware sensor** (Android Fingerprint / Touch ID).
- Displays authentic India Post Payments Bank Micro-ATM receipts with RRN transaction IDs, STQC Level-0 Bio status, and INR conversion.

### 4. 🗺️ Interactive On-Chain Farm Map
- Interactive Leaflet map centered dynamically on newly registered plots.
- Color-coded flood risk polygon overlays (green for healthy, orange/red for disaster alert).
- Live telemetry gauges for NDVI vegetation index, SAR flood inundation, and soil moisture.

### 5. ⚡ Demo Control Panel
- One-click disaster simulation scenarios for **Assam, Bihar, Maharashtra, Gujarat, Karnataka, and Punjab** for live jury presentations.

---

## 🚀 Quickstart Guide for Team & Evaluators

### Prerequisites
- Node.js (v18 or v20+)
- Python 3.10+ (for sentinel agent)

### 1. Start the Local Blockchain Node
```bash
# In the root repository directory:
npm install
npx hardhat node
```
*Hardhat will start on `http://127.0.0.1:8545` (Chain ID: 31337).*

### 2. Deploy Smart Contracts
Open a second terminal:
```bash
npx hardhat run scripts/deploy.js --network localhost
```
*This compiles `FarmRegistry.sol` and `AgriTrustVault.sol` with Solidity 0.8.24 (Cancun EVM) and automatically exports ABI files and contract addresses to `frontend/src/contracts/`.*

### 3. Launch Frontend Dashboard
Open a third terminal:
```bash
cd frontend
npm install
npm run dev
```
*Open **`http://localhost:3000`** in your browser.*

---

## 📂 Project Directory Structure

```
MSTBlockchain/
├── contracts/
│   ├── FarmRegistry.sol           # Farmer registration & polygon GeoJSON registry
│   └── AgriTrustVault.sol         # Underwriting escrow & ECDSA signature payout verification
├── scripts/
│   └── deploy.js                  # Deployment script exporting ABIs to frontend
├── agent/
│   └── sentinel_agent.py          # AI Sentinel Oracle polling satellite APIs
├── frontend/
│   ├── public/
│   │   └── sample-land-records/   # Sample state certificates with scannable QRs
│   │       └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx         # Branding & wallet connect
│   │   │   ├── StatCards.jsx      # Escrow Pool balance & claims metrics
│   │   │   ├── FarmMap.jsx        # Leaflet polygon renderer
│   │   │   ├── PlotTelemetry.jsx  # Live NDVI, SAR & Soil Moisture gauges
│   │   │   ├── DemoControlPanel.jsx # Multi-state flood triggers
│   │   │   ├── QRScannerModal.jsx # Document upload & jsQR decoder
│   │   │   ├── FarmerEnrollmentModal.jsx # Krishi Mitra plot registration form
│   │   │   ├── VoiceAlertModal.jsx # Multi-state TTS phone alert
│   │   │   └── AePSCashoutModal.jsx # Aadhaar mobile fingerprint cashout
│   │   ├── utils/
│   │   │   ├── web3.js            # Ethers v6 contract abstractions
│   │   │   └── stateLanguageMap.js # GPS coordinate to state language detection
│   │   └── App.jsx                # Main orchestration layout
│   └── package.json
├── hardhat.config.js              # Solidity 0.8.24 Cancun EVM configuration
└── VERSION1_README.md             # This comprehensive architecture documentation
```

---

## 🏆 Presentation Highlights for Hackathon Juries
1. **Zero Crypto Barrier**: Farmers don't need MetaMask or private keys — they use government RoR documents and their physical thumbprint at an AePS micro-ATM.
2. **Mother Tongue Communication**: In critical emergencies, voice communication in the regional dialect reduces panic and ensures immediate disaster relief.
3. **Parametric Speed**: Eliminates months of manual insurance surveyor bureaucracy — payouts occur in under 2 seconds upon satellite radar confirmation.
