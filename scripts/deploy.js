import hre from 'hardhat';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

// Load Oracle credentials so the deployed contract grants ORACLE_ROLE to the
// exact wallet that agent/sentinel_agent.py signs payouts with.
dotenv.config({ path: path.join(ROOT, '.env') });
dotenv.config({ path: path.join(ROOT, 'agent', 'config', '.env') });

/** Resolve the AI Oracle wallet address without ever printing the private key. */
function resolveOracleAddress(hre) {
  const pk = (process.env.ORACLE_PRIVATE_KEY || '').trim();
  if (pk) {
    try {
      const addr = new hre.ethers.Wallet(pk.startsWith('0x') ? pk : `0x${pk}`).address;
      console.log('🔑  ORACLE_PRIVATE_KEY detected — granting ORACLE_ROLE to:', addr);
      return addr;
    } catch (err) {
      console.warn('⚠️   ORACLE_PRIVATE_KEY present but invalid — falling back to Hardhat account #1.');
    }
  }
  return null;
}

async function main() {
  console.log('=========================================================================');
  console.log('🌾 Deploying AgriTrust AI Smart Contracts to MST Blockchain Layer 1...');
  console.log('=========================================================================');

  const signers = await hre.ethers.getSigners();
  const [deployer, hardhatOracle, farmerWallet] = signers;

  const oracleAddress = resolveOracleAddress(hre) || (hardhatOracle ? hardhatOracle.address : deployer.address);
  const farmerAddress = farmerWallet ? farmerWallet.address : deployer.address;

  console.log('👤 Deployer Wallet (Admin):     ', deployer.address);
  console.log('🤖 NEWRRO AI Oracle Wallet:     ', oracleAddress);
  console.log('👨‍🌾 Demo Farmer Wallet:           ', farmerAddress);
  console.log('-------------------------------------------------------------------------');

  // 1. Deploy FarmRegistry
  console.log('\n1️⃣  Deploying FarmRegistry.sol (Land Parcel, Khasra/Khata & Geofencing Registry)...');
  const FarmRegistry = await hre.ethers.getContractFactory('FarmRegistry');
  const farmRegistry = await FarmRegistry.deploy(deployer.address, deployer.address);
  await farmRegistry.waitForDeployment();
  const registryAddress = await farmRegistry.getAddress();
  console.log('✅ FarmRegistry deployed to MST Blockchain at:', registryAddress);

  // 2. Deploy AgriTrustVault
  console.log('\n2️⃣  Deploying AgriTrustVault.sol (Escrow Vault & EIP-191 Proof Payout Engine)...');
  const AgriTrustVault = await hre.ethers.getContractFactory('AgriTrustVault');
  const vault = await AgriTrustVault.deploy(registryAddress, deployer.address, oracleAddress);
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log('✅ AgriTrustVault deployed to MST Blockchain at:', vaultAddress);

  // Grant ORACLE_ROLE explicitly to oracleAddress
  const ORACLE_ROLE = await vault.ORACLE_ROLE();
  const grantTx = await vault.grantRole(ORACLE_ROLE, oracleAddress);
  await grantTx.wait();
  console.log('🔑 Granted ORACLE_ROLE on AgriTrustVault to Oracle Address:', oracleAddress);

  // 3. Register sample farm plots WITH government land-record identifiers (V2.0)
  const samplePlots = [
    {
      label: 'Assam Majuli Farm Plot #1 (Brahmaputra Flood Basin)',
      owner: farmerAddress,
      geoJSON: {
        type: 'Polygon',
        coordinates: [[[94.1714, 26.7541], [94.2000, 26.7541], [94.2000, 26.7300], [94.1714, 26.7300], [94.1714, 26.7541]]],
      },
      acreage: 500, // 5.0 acres
      cropType: 'Paddy (Rice)',
      khasra: 'Patta No. 104/B',
      khata: 'Khata 27/3',
      state: 'Assam',
      district: 'Majuli',
      insuredMST: '40000.0',
    },
    {
      label: 'Bihar Darbhanga Farm Plot #2 (Kosi River Flood Basin)',
      owner: farmerAddress,
      geoJSON: {
        type: 'Polygon',
        coordinates: [[[85.8971, 26.1522], [85.8985, 26.1525], [85.8982, 26.1510], [85.8968, 26.1508], [85.8971, 26.1522]]],
      },
      acreage: 250, // 2.5 acres
      cropType: 'Paddy (Rice)',
      khasra: 'Khasra 312/14-15',
      khata: 'Khata 214/A',
      state: 'Bihar',
      district: 'Darbhanga',
      insuredMST: '40000.0',
    },
  ];

  console.log(`\n3️⃣  Enrolling ${samplePlots.length} Sample Farm Plots with Khasra / Khata / State records...`);
  const insuredAmount = hre.ethers.parseEther('40000.0'); // ₹40,000 sum insured per plot

  for (let i = 0; i < samplePlots.length; i++) {
    const p = samplePlots[i];
    const regTx = await farmRegistry.registerFarmPlot(
      p.owner,
      JSON.stringify(p.geoJSON),
      p.acreage,
      p.cropType,
      p.khasra,
      p.khata,
      p.state,
      p.district,
    );
    await regTx.wait();
    console.log(`   ✅ Plot #${i + 1} registered — ${p.label}`);

    const policyTx = await vault.createPolicy(i + 1, p.owner, insuredAmount);
    await policyTx.wait();
    console.log(`   ✅ Policy #${i + 1} created for ${p.insuredMST} MST coverage (${p.state})`);
  }

  // 4. Fund Escrow Vault — enough liquidity for every parametric payout scenario
  console.log('\n4️⃣  Seeding AgriTrustVault with 500,000.0 MST Escrow Liquidity...');
  const escrowFundAmount = hre.ethers.parseEther('500000.0');
  const depositTx = await vault.depositEscrow({ value: escrowFundAmount });
  await depositTx.wait();
  console.log('✅ AgriTrustVault successfully funded with 500,000.0 MST Tokens!');

  // 4b. The AI Oracle key (agent/config/.env) is NOT one of the funded Hardhat
  //     accounts, so top it up with gas money — otherwise it cannot submit
  //     triggerDisasterPayout() transactions during the demo.
  const oracleBalance = await hre.ethers.provider.getBalance(oracleAddress);
  const oracleGasFloat = hre.ethers.parseEther('100.0');
  if (oracleBalance < oracleGasFloat) {
    const fundTx = await deployer.sendTransaction({ to: oracleAddress, value: oracleGasFloat });
    await fundTx.wait();
    console.log('⛽  AI Oracle wallet topped up with 100.0 MST for gas:', oracleAddress);
  }

  // 5. Export Contract Addresses & ABIs for the AI Agent & Frontend
  const configData = {
    network: hre.network.name,
    chainId: hre.network.config.chainId || 31337,
    contracts: {
      FarmRegistry: registryAddress,
      AgriTrustVault: vaultAddress,
    },
    accounts: {
      deployer: deployer.address,
      aiOracleWallet: oracleAddress,
      farmerWallet: farmerAddress,
    },
  };

  const frontendOutputDir = path.join(ROOT, 'frontend', 'src', 'contracts');
  const agentOutputDir = path.join(ROOT, 'agent', 'config');
  fs.mkdirSync(frontendOutputDir, { recursive: true });
  fs.mkdirSync(agentOutputDir, { recursive: true });

  const configJson = JSON.stringify(configData, null, 2);

  // Frontend + agent both read `contract-addresses.json`, and the agent ALSO
  // reads `contracts.json` — write every variant so the bridge never goes stale.
  for (const dir of [frontendOutputDir, agentOutputDir]) {
    fs.writeFileSync(path.join(dir, 'contract-addresses.json'), configJson);
    fs.writeFileSync(path.join(dir, 'contracts.json'), configJson);
  }

  const registryArtifact = await hre.artifacts.readArtifact('FarmRegistry');
  const vaultArtifact = await hre.artifacts.readArtifact('AgriTrustVault');

  fs.writeFileSync(path.join(frontendOutputDir, 'FarmRegistry.json'), JSON.stringify(registryArtifact, null, 2));
  fs.writeFileSync(path.join(frontendOutputDir, 'AgriTrustVault.json'), JSON.stringify(vaultArtifact, null, 2));
  fs.writeFileSync(path.join(agentOutputDir, 'FarmRegistry.json'), JSON.stringify(registryArtifact, null, 2));
  fs.writeFileSync(path.join(agentOutputDir, 'AgriTrustVault.json'), JSON.stringify(vaultArtifact, null, 2));

  // Helper to update .env files automatically
  function updateEnvFile(envPath, updates) {
    let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
    for (const [key, value] of Object.entries(updates)) {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(content)) {
        content = content.replace(regex, `${key}=${value}`);
      } else {
        content += `\n${key}=${value}`;
      }
    }
    fs.writeFileSync(envPath, content, 'utf8');
  }

  const envUpdates = {
    FARM_REGISTRY_ADDRESS: registryAddress,
    AGRI_TRUST_VAULT_ADDRESS: vaultAddress,
    MST_RPC_URL: 'http://127.0.0.1:8545',
  };

  updateEnvFile(path.join(ROOT, '.env'), envUpdates);
  updateEnvFile(path.join(agentOutputDir, '.env'), envUpdates);

  console.log('\n=========================================================================');
  console.log('✅ ALL DEPLOYMENT ARTIFACTS & .ENV CONFIGS UPDATED!');
  console.log('   FarmRegistry :', registryAddress);
  console.log('   AgriTrustVault:', vaultAddress);
  console.log('   MST RPC URL   : http://127.0.0.1:8545');
  console.log('=========================================================================');
}

main().catch((error) => {
  console.error('❌ Deployment failed:', error);
  process.exitCode = 1;
});
