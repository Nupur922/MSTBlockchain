# 🌾 AgriTrust AI — Official BridgeKey Wallet Integration on MST Blockchain

> **Autonomous Satellite Parametric Crop Insurance & Disaster Escrow on MST Blockchain**  
> Official Non-Custodial Wallet: **BridgeKey** | Network: **MST Testnet (Chain ID: 91562037)** | Currency: **tMSTC**

---

## 📌 1. Verified Live Deployments on MST Testnet

The smart contracts are live on **MST Blockchain Testnet**:

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
* Google Chrome with the BridgeKey extension installed

### 1. Install Dependencies
```bash
# In the root repository
npm install

# In the frontend directory
cd frontend
npm install
cd ..
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

### 3. Run Frontend Application
```bash
cd frontend
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in Chrome.

---

## 💻 5. User Workflow with BridgeKey

1. **Connect BridgeKey**:
   * Click **"Connect BridgeKey"** in the top navigation bar.
   * Approve the connection request in the BridgeKey popup.
   * The status badge turns to **`🟢 MST Testnet (91562037)`** and displays your shortened public address.
2. **Switch Network (Automatic Protection)**:
   * If your wallet is on an unexpected network, the header displays **`⚠️ Switch to MST Testnet`**. Clicking it automatically triggers `wallet_switchEthereumChain` / `wallet_addEthereumChain` to configure MST Testnet.
3. **Register Live Farm Plots**:
   * Click **"Enroll Farmer"**.
   * Fill in the farmer wallet address, crop type, acreage, and GeoJSON boundary (or use preset templates).
   * Click **"Register Farm Plot on MST Blockchain"**.
   * BridgeKey opens a confirmation popup for the transaction.
   * Click **Approve**.
   * The transaction is broadcast, mined on MST Testnet, and displays a direct **MSTScan** receipt link (`https://testnet.mstscan.com/tx/<hash>`).
4. **Deploy Contracts (Optional)**:
   * Click **"🚀 Deploy to MST Testnet"** anytime to deploy your own instance of the contracts directly through BridgeKey with seeded escrow liquidity.

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

* **EIP-1193 / EIP-6963 Compatibility**: Uses modern multi-injected provider discovery for BridgeKey.
* **No Client-Side Secrets**: Private keys are never touched or requested by the dApp. All transactions are securely signed inside the BridgeKey extension.
* **Replay Protection**: Contract-level replay protection using `executedProofs` mapping hashed with `block.chainid` and contract address.
* **Checks-Effects-Interactions (CEI)**: OpenZeppelin v5 `ReentrancyGuard` and state updates occur prior to native token transfers.
