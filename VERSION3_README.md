# 🌾 AgriTrust AI — Version 3.0 Technical Specification & Architecture

> **Multi-Hazard Parametric Crop Insurance Platform on MST Blockchain**  
> Autonomous Flood SAR + Flash Drought NDWI + Heatwave Thermal LST Spectrum Engine • EIP-191 Oracles • Smart Contract Escrow • Pan-India Voice UX • Aadhaar AePS Biometric Cashout • Cryptographic PDF Evidence Certificates

---

## 🌟 What's New in Version 3.0?

Version 3.0 expands AgriTrust AI from single-hazard (monsoon flood) coverage into a **Full Multi-Hazard Satellite AI Spectrum Risk & Relief Escrow Platform** for pan-India climate resilience.

### 🚀 Key Version 3 Features Implemented
1. **🌊 Multi-Hazard Satellite Risk Engine (`agent/multi_hazard_engine.py`)**:
   - **Sentinel-1 SAR Radar**: Flood Submersion ($<-15.0\text{ dB}$, Submersion Days).
   - **Sentinel-2 NDWI (Green - SWIR / Green + SWIR)**: Flash Drought Soil Water Stress Index ($<-0.35$).
   - **Thermal LST (Land Surface Temperature)**: Scorching Heatwave Crop Thermal Stress ($>42.0^\circ\text{C}$).
2. **🎛️ V3 Multi-Hazard Spectrum Analyzer Component (`frontend/src/components/MultiHazardAnalyzer.jsx`)**:
   - Live interactive spectrum toggle (All Spectrum, Flood SAR, Drought NDWI, Heatwave LST) with real-time multi-gauge meters.
3. **🗺️ Multi-Region Multi-Hazard Simulation Scenarios (`DemoControlPanel.jsx`)**:
   - **Assam Brahmaputra Monsoon Flood** (70% Payout)
   - **Bihar Kosi Flash Flood** (100% Payout)
   - **Maharashtra Marathwada Flash Drought** (50% Payout)
   - **Punjab Wheat Scorching Heatwave** (40% Payout)
   - **Karnataka Cauvery Basin Inundation** (70% Payout)
4. **📄 Multi-Hazard PDF Audit Certificate Generator (`agent/pdf_generator.py`)**:
   - Legal evidence PDFs tagged with exact hazard classification (`MONSOON_FLOOD`, `FLASH_DROUGHT`, `SCORCHING_HEATWAVE`).

---

## 🏗️ Version 3 End-to-End System Workflow

```
[ 1. Krishi Mitra Bhu-Naksha Document QR Scanner ]
                     │
                     ▼
[ 2. MST Smart Contracts (FarmRegistry.sol & AgriTrustVault.sol) ]
  • GIS Polygon Registry + Escrow Liquidity Vault
                     │
                     ▼
[ 3. NEWRRO AI Multi-Hazard Spectrum Engine ]
  ┌─────────────────────────────────────────────────────────┐
  │ • Sentinel-1 SAR Radar  --> Flood Submersion (<-15 dB)  │
  │ • Sentinel-2 NDWI Index --> Flash Drought (<-0.35)      │
  │ • Thermal LST Band      --> Scorching Heatwave (>42°C)  │
  └─────────────────────────────────────────────────────────┘
                     │
                     ▼
[ 4. 2-of-3 Multi-Source Oracle Consensus & EIP-191 Proof Signer ]
                     │
                     ▼
[ 5. Instant On-Chain Escrow Payout (< 2 Seconds) ]
                     │
                     ▼
[ 6. Last-Mile Farmer Delivery & Biometric Cashout ]
  • Live Twilio Voice Call in State Language (Assamese/Bhojpuri/Marathi/Punjabi)
  • UltraMsg WhatsApp Receipt & PDF Evidence Download
  • Aadhaar AePS Micro-ATM Hardware Fingerprint Cashout (WebAuthn)
```

---

## 🧪 Quickstart Guide (Version 3)

### 1. Hardhat Local Node
```bash
npx hardhat node
```

### 2. Deploy Smart Contracts
```bash
npx hardhat run scripts/deploy.js --network localhost
```

### 3. Run Automated Python Test Suite
```bash
python agent/test_agent.py
python agent/multi_hazard_engine.py
```

### 4. Launch Bridge & Web Dashboard
```bash
# Terminal 3: Voice/Call Bridge
python agent/bridge_server.py

# Terminal 4: Frontend
cd frontend
npm run dev
```

---

## 📜 Repository Branch Archive

* **`nupur`**: Version 1.0 (Core smart contracts, Leaflet map, Pan-India voice mapping, QR scanner, AePS cashout).
* **`version_2`**: Version 2.0 (PDF audit certificates, Twilio live calls, UltraMsg WhatsApp, Copernicus CDSE API, 20/20 test suite).
* **`version_3`**: Version 3.0 (Multi-Hazard Satellite Spectrum Engine for Floods, Droughts, and Heatwaves).
