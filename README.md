# 🌾 AgriTrust AI — Version 3.0 (Official BridgeKey & MST Testnet Integration)

> **Autonomous Multi-Hazard Parametric Crop Insurance & Disaster Escrow on MST Blockchain**  
> Official Non-Custodial Wallet: **BridgeKey** | Primary Network: **MST Testnet (Chain ID: 91562037)** | Currency: **tMSTC**  
> Powered by **NEWRRO AI Remote Sensing**, **Copernicus Sentinel-1 SAR & Sentinel-2 Optical**, **Live Twilio Voice Calls**, **UltraMsg WhatsApp Engine**, and **Aadhaar AePS Biometric Cashout**.

---

## 📌 1. Verified Live Deployments on MST Testnet

The smart contracts are actively deployed on **MST Blockchain Testnet**:

| Contract | MST Testnet Address | Block Explorer Link |
|---|---|---|
| **FarmRegistry.sol** | `0xDA6Fe875D30Bd4329415625b845fC7b4Fb859C9b` | [View on MSTScan](https://testnet.mstscan.com/address/0xDA6Fe875D30Bd4329415625b845fC7b4Fb859C9b) |
| **AgriTrustVault.sol** | `0x69AC2F2687D0434e83309bFD62cB5d511E02519b` | [View on MSTScan](https://testnet.mstscan.com/address/0x69AC2F2687D0434e83309bFD62cB5d511E02519b) |
| **Escrow Pool Liquidity** | `5.00 tMSTC` | Funded on-chain |
| **Enrolled Farm Plots** | `Plot #1 (4.9 Acres, Wheat)` | Recorded on-chain |

---

## 🌐 2. Official Network & RPC Configuration

* **Network Name**: `MST Testnet`
* **RPC Endpoint**: `https://testnetrpc.mstblockchain.com`
* **Chain ID (Decimal)**: `91562037`
* **Chain ID (Hex)**: `0x5752035`
* **Native Currency**: `tMSTC` / `MST` (18 Decimals)
* **Block Explorer**: [https://testnet.mstscan.com](https://testnet.mstscan.com)
* **Official Faucet**: [https://faucet.masterstroke.academy](https://faucet.masterstroke.academy) (Provides free 10–50 tMSTC)

---

## 🔑 3. BridgeKey Wallet Setup Guide

1. **Install Extension**:
   * Download the official Chrome extension from the [BridgeKey Chrome Web Store](https://chromewebstore.google.com/detail/bridgekey/bfjojdcfenehemjgjlepdjomkpginlkg).
2. **Create / Set Up Wallet**:
   * Open the extension, set a password, and write down your 12-word Secret Recovery Phrase.
   * *Never share your recovery phrase or private keys with anyone.*
3. **Select MST Testnet**:
   * In the top network selector dropdown in BridgeKey, select **MST Testnet**.
4. **Claim Free Testnet Tokens ($tMSTC)**:
   * Copy your public address from BridgeKey (`0x...`).
   * Open [https://faucet.masterstroke.academy](https://faucet.masterstroke.academy), paste your address, solve the captcha, and request tokens.

---

## 🚀 4. Quickstart & Local Setup

### Prerequisites
* Node.js v18 or v20+
* Python 3.10+ (for AI Oracle and Bridge Server)
* Google Chrome with BridgeKey extension installed (or use built-in silent demo mode)

### 1. Install Dependencies
```bash
# In the root repository
npm install

# In the frontend directory
cd frontend
npm install
cd ..

# In the python environment
pip install -r agent/requirements.txt
```

### 2. Environment Configuration
Configuration files are provided at `.env` and `frontend/.env`:
```env
VITE_MST_RPC_URL=https://testnetrpc.mstblockchain.com
VITE_MST_CHAIN_ID=91562037
VITE_MST_CHAIN_ID_HEX=0x5752035
VITE_MST_NETWORK_NAME="MST Testnet"
VITE_MST_CURRENCY_SYMBOL=tMSTC
VITE_MST_EXPLORER_URL=https://testnet.mstscan.com
VITE_FARM_REGISTRY_ADDRESS=0xDA6Fe875D30Bd4329415625b845fC7b4Fb859C9b
VITE_AGRITRUST_VAULT_ADDRESS=0x69AC2F2687D0434e83309bFD62cB5d511E02519b
```

### 3. Start Services
```bash
# Terminal 1: Python Bridge Server (telemetry, Twilio, WhatsApp)
python agent/bridge_server.py

# Terminal 2: Frontend Web Dashboard
cd frontend
npm run dev
```

Open **`http://localhost:3000`** in Chrome.

---

## 💻 5. User Workflow with BridgeKey

1. **Connect BridgeKey**:
   * Click **"Connect BridgeKey"** in the top navigation bar.
   * If BridgeKey is installed, approve the connection request in the popup.
   * If BridgeKey is not installed, the dApp automatically and silently switches to the Hardhat Demo account (`0xf39…92266 [DEMO]`) without blocking usage.
   * The status badge displays **`🟢 MST Testnet (91562037)`** and your shortened address.
2. **Switch Network**:
   * If on another network, the header displays **`⚠️ Switch to MST Testnet`**. Clicking it automatically switches to MST Testnet.
3. **Register Live Farm Plots**:
   * Click **"Enroll Farmer"** (or use the preloaded presets).
   * Review Khasra Number, Khata, State, Crop, Acreage, and Polygon boundary.
   * Click **"Register Farm Plot on MST Blockchain"**.
   * Approve the transaction in BridgeKey (or automatic demo approval).
   * Transaction is confirmed on MST Testnet with on-chain receipt and direct link to MSTScan.
4. **Execute Multi-Hazard Disaster Simulation**:
   * In the **Disaster Simulation Control Panel**, choose from:
     * **6 Payout Scenarios**: Assam Flood, Bihar Flood, Karnataka Flood, MH Drought, Punjab Heatwave, TN Harvest Rain.
     * **4 Rejection Scenarios**: Invalid Plot, Crop Mismatch, Stubble Shield, Ghost Crop Fraud.
   * Verified payouts trigger live Twilio voice phone calls, UltraMsg WhatsApp notifications, and instant AePS biometric cashout vouchers.

---

## 🧪 6. Automated Testing

Run the full smart contract security test suite:
```bash
npx hardhat test
```
**Test Coverage**:
* `AgriTrustSecurity.test.cjs`:
  * ✅ Valid EIP-191 cryptographic signature proof payout execution
  * ✅ Unauthorized attacker wallet signature rejection
  * ✅ Replay attack rejection when submitting duplicate proof hashes

---

## 🛡️ 7. Security Architecture

* **EIP-1193 / EIP-6963 Compatibility**: Multi-injected provider discovery with BridgeKey.
* **Zero Client-Side Secrets**: Private keys are never touched or requested by the dApp.
* **Replay Protection**: Contract-level replay protection using `executedProofs` mapping with `block.chainid` and contract address.
* **Checks-Effects-Interactions (CEI)**: OpenZeppelin v5 `ReentrancyGuard` and state updates occur prior to native token transfers.
