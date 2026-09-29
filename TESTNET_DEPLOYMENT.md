# 🌐 AgriTrust AI — MST Testnet Deployment Guide

## MST Testnet Network Details

| Field | Value |
|---|---|
| Network Name | MST Testnet |
| RPC URL | https://testnetrpc.mstblockchain.com |
| Chain ID | 91562037 |
| Currency | tMSTC |
| Explorer | https://testnet.mstscan.com |

---

## Step 1: Add MST Testnet to MetaMask

1. Open MetaMask → Settings → Networks → Add Network
2. Fill in:
   - Network Name: `MST Testnet`
   - RPC URL: `https://testnetrpc.mstblockchain.com`
   - Chain ID: `91562037`
   - Currency Symbol: `tMSTC`
   - Block Explorer: `https://testnet.mstscan.com`
3. Save

---

## Step 2: Get tMSTC Testnet Tokens

1. Go to: https://testnet.mstscan.com
2. Find the faucet section
3. Enter your wallet address
4. Receive free tMSTC tokens

---

## Step 3: Configure Environment

Add to your `.env` file at project root:

```env
DEPLOYER_PRIVATE_KEY=0xyour_metamask_private_key
ORACLE_WALLET_ADDRESS=0xyour_oracle_wallet_address
MST_TESTNET_RPC_URL=https://testnetrpc.mstblockchain.com
MST_TESTNET_CHAIN_ID=91562037
```

---

## Step 4: Deploy to MST Testnet

```powershell
# Install dependencies (if not done)
npm install

# Compile contracts
npx hardhat compile

# Deploy to MST Testnet
npx hardhat run scripts/deploy_testnet.js --network mst_testnet
```

---

## Step 5: Update Agent Config

After deployment, the script auto-exports to `agent/config/contract-addresses.json`.

Update your `agent/config/.env`:
```env
MST_RPC_URL=https://testnetrpc.mstblockchain.com
MST_CHAIN_ID=91562037
FARM_REGISTRY_ADDRESS=0x<from_deployment_output>
AGRI_TRUST_VAULT_ADDRESS=0x<from_deployment_output>
```

---

## Step 6: Run Oracle Agent on Testnet

```powershell
# Activate venv
.\venv\Scripts\Activate.ps1

# Run sentinel agent pointing to testnet
python agent/sentinel_agent.py --once
```

---

## Submission Checklist

After running deploy_testnet.js, collect these for submission:

- [ ] FarmRegistry contract address on MST Testnet
- [ ] AgriTrustVault contract address on MST Testnet  
- [ ] At least one verifiable TX hash on https://testnet.mstscan.com
- [ ] Application demo link (frontend running)

---

## Verify on MST Explorer

After deployment, verify your contracts at:
```
https://testnet.mstscan.com/address/<YOUR_CONTRACT_ADDRESS>
```

Your deployment TX hashes will be printed in the terminal after running `deploy_testnet.js`.
