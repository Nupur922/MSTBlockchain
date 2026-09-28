/**
 * deploy_testnet.js
 * =================
 * AgriTrust AI — MST Testnet Deployment Script
 *
 * Deploys FarmRegistry + AgriTrustVault to MST Testnet
 * and exports contract addresses + ABIs for:
 *   - Frontend (frontend/src/contracts/)
 *   - Python Oracle Agent (agent/config/)
 *
 * Usage:
 *   npx hardhat run scripts/deploy_testnet.js --network mst_testnet
 *
 * Requirements:
 *   - DEPLOYER_PRIVATE_KEY in .env (wallet with tMSTC balance)
 *   - ORACLE_WALLET_ADDRESS in .env (Developer 2's oracle address)
 *   - Get testnet tokens from: https://testnet.mstscan.com (faucet)
 *
 * MST Testnet Details:
 *   RPC URL  : https://testnetrpc.mstblockchain.com
 *   Chain ID : 91562037
 *   Explorer : https://testnet.mstscan.com
 *   Currency : tMSTC
 */

import hre from 'hardhat';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// MST Testnet info
const MST_TESTNET = {
  name:    'MST Testnet',
  rpc:     'https://testnetrpc.mstblockchain.com',
  chainId: 91562037,
  explorer:'https://testnet.mstscan.com',
};

async function main() {
  console.log('\n=========================================================================');
  console.log('🚀  AgriTrust AI — MST TESTNET DEPLOYMENT');
  console.log('=========================================================================');
  console.log(`🌐  Network  : ${MST_TESTNET.name}`);
  console.log(`🔗  RPC URL  : ${MST_TESTNET.rpc}`);
  console.log(`⛓️  Chain ID : ${MST_TESTNET.chainId}`);
  console.log(`🔍  Explorer : ${MST_TESTNET.explorer}`);
  console.log('=========================================================================\n');

  // Get deployer
  const [deployer] = await hre.ethers.getSigners();
  const deployerBalance = await hre.ethers.provider.getBalance(deployer.address);

  console.log(`👤  Deployer  : ${deployer.address}`);
  console.log(`💰  Balance   : ${hre.ethers.formatEther(deployerBalance)} tMSTC`);

  if (deployerBalance === 0n) {
    console.error('\n❌  ERROR: Deployer wallet has 0 tMSTC balance!');
    console.error('   Get testnet tokens from: https://testnet.mstscan.com');
    process.exit(1);
  }

  // Oracle address — Developer 2's oracle wallet
  const oracleAddress = process.env.ORACLE_WALLET_ADDRESS || deployer.address;
  console.log(`🤖  Oracle    : ${oracleAddress}`);
  console.log('-------------------------------------------------------------------------\n');

  // ─── 1. Deploy FarmRegistry ──────────────────────────────────────────────────
  console.log('1️⃣   Deploying FarmRegistry.sol...');
  const FarmRegistry = await hre.ethers.getContractFactory('FarmRegistry');
  const farmRegistry = await FarmRegistry.deploy(deployer.address, deployer.address);
  await farmRegistry.waitForDeployment();
  const registryAddress = await farmRegistry.getAddress();

  const registryTx = farmRegistry.deploymentTransaction();
  console.log(`✅  FarmRegistry deployed!`);
  console.log(`    Address : ${registryAddress}`);
  console.log(`    TX Hash : ${registryTx?.hash}`);
  console.log(`    Explorer: ${MST_TESTNET.explorer}/tx/${registryTx?.hash}\n`);

  // ─── 2. Deploy AgriTrustVault ────────────────────────────────────────────────
  console.log('2️⃣   Deploying AgriTrustVault.sol...');
  const AgriTrustVault = await hre.ethers.getContractFactory('AgriTrustVault');
  const vault = await AgriTrustVault.deploy(
    registryAddress,
    deployer.address,
    oracleAddress,
  );
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();

  const vaultTx = vault.deploymentTransaction();
  console.log(`✅  AgriTrustVault deployed!`);
  console.log(`    Address : ${vaultAddress}`);
  console.log(`    TX Hash : ${vaultTx?.hash}`);
  console.log(`    Explorer: ${MST_TESTNET.explorer}/tx/${vaultTx?.hash}\n`);

  // ─── 3. Register Demo Farm Plot ──────────────────────────────────────────────
  console.log('3️⃣   Registering demo farm plot (Darbhanga, Bihar)...');
  const sampleGeoJSON = JSON.stringify({
    type: 'Polygon',
    coordinates: [[
      [85.8971, 26.1522],
      [85.8985, 26.1525],
      [85.8982, 26.1510],
      [85.8968, 26.1508],
      [85.8971, 26.1522],
    ]],
  });

  const regTx = await farmRegistry.registerFarmPlot(
    deployer.address,
    sampleGeoJSON,
    300,          // 3.0 acres
    'Paddy (Rice)',
  );
  await regTx.wait();
  console.log(`✅  Farm Plot #1 registered`);
  console.log(`    TX Hash : ${regTx.hash}`);
  console.log(`    Explorer: ${MST_TESTNET.explorer}/tx/${regTx.hash}\n`);

  // ─── 4. Seed Escrow Vault ─────────────────────────────────────────────────────
  console.log('4️⃣   Seeding AgriTrustVault with 0.5 tMSTC escrow liquidity...');

  // Use small amount for testnet (0.5 tMSTC instead of 500)
  const seedAmount = hre.ethers.parseEther('0.5');
  const depositTx  = await vault.depositEscrow({ value: seedAmount });
  await depositTx.wait();
  console.log(`✅  Vault seeded with 0.5 tMSTC`);
  console.log(`    TX Hash : ${depositTx.hash}`);
  console.log(`    Explorer: ${MST_TESTNET.explorer}/tx/${depositTx.hash}\n`);

  // ─── 5. Export Artifacts ─────────────────────────────────────────────────────
  console.log('5️⃣   Exporting contract addresses and ABIs...');

  const configData = {
    network:    'mst_testnet',
    chainId:    MST_TESTNET.chainId,
    rpcUrl:     MST_TESTNET.rpc,
    explorerUrl:MST_TESTNET.explorer,
    deployedAt: new Date().toISOString(),
    contracts: {
      FarmRegistry:   registryAddress,
      AgriTrustVault: vaultAddress,
    },
    accounts: {
      deployer:       deployer.address,
      aiOracleWallet: oracleAddress,
    },
    verifiableTransactions: {
      FarmRegistry_deploy:   registryTx?.hash,
      AgriTrustVault_deploy: vaultTx?.hash,
      FarmPlot_register:     regTx.hash,
      Vault_seed:            depositTx.hash,
    },
  };

  // Read ABIs
  const registryArtifact = await hre.artifacts.readArtifact('FarmRegistry');
  const vaultArtifact    = await hre.artifacts.readArtifact('AgriTrustVault');

  // Export to frontend
  const frontendDir = path.join(__dirname, '../frontend/src/contracts');
  if (!fs.existsSync(frontendDir)) fs.mkdirSync(frontendDir, { recursive: true });
  fs.writeFileSync(path.join(frontendDir, 'contract-addresses.json'), JSON.stringify(configData, null, 2));
  fs.writeFileSync(path.join(frontendDir, 'FarmRegistry.json'),       JSON.stringify(registryArtifact, null, 2));
  fs.writeFileSync(path.join(frontendDir, 'AgriTrustVault.json'),     JSON.stringify(vaultArtifact, null, 2));

  // Export to agent
  const agentDir = path.join(__dirname, '../agent/config');
  if (!fs.existsSync(agentDir)) fs.mkdirSync(agentDir, { recursive: true });
  fs.writeFileSync(path.join(agentDir, 'contract-addresses.json'), JSON.stringify(configData, null, 2));
  fs.writeFileSync(path.join(agentDir, 'FarmRegistry.json'),       JSON.stringify(registryArtifact, null, 2));
  fs.writeFileSync(path.join(agentDir, 'AgriTrustVault.json'),     JSON.stringify(vaultArtifact, null, 2));

  console.log(`✅  Artifacts exported to frontend/src/contracts/ and agent/config/\n`);

  // ─── Final Summary ─────────────────────────────────────────────────────────
  console.log('=========================================================================');
  console.log('🎉  MST TESTNET DEPLOYMENT COMPLETE!');
  console.log('=========================================================================');
  console.log('\n📋  SUBMISSION CHECKLIST:');
  console.log(`\n  ✅  MST Testnet Contract Addresses:`);
  console.log(`      FarmRegistry   : ${registryAddress}`);
  console.log(`      AgriTrustVault : ${vaultAddress}`);
  console.log(`\n  ✅  Verifiable Transaction Hashes:`);
  console.log(`      FarmRegistry deploy   : ${registryTx?.hash}`);
  console.log(`      AgriTrustVault deploy : ${vaultTx?.hash}`);
  console.log(`      Farm plot register    : ${regTx.hash}`);
  console.log(`      Escrow vault seed     : ${depositTx.hash}`);
  console.log(`\n  ✅  MST Explorer Links:`);
  console.log(`      ${MST_TESTNET.explorer}/address/${registryAddress}`);
  console.log(`      ${MST_TESTNET.explorer}/address/${vaultAddress}`);
  console.log('\n=========================================================================\n');
}

main().catch((error) => {
  console.error('❌  Testnet deployment failed:', error.message);
  if (error.message.includes('insufficient funds')) {
    console.error('\n💡  Fix: Get tMSTC from https://testnet.mstscan.com faucet');
  }
  if (error.message.includes('could not detect network')) {
    console.error('\n💡  Fix: Check MST testnet RPC is reachable: https://testnetrpc.mstblockchain.com');
  }
  process.exitCode = 1;
});
