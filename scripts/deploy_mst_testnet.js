import hre from 'hardhat';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('=========================================================================');
  console.log('🌾 Deploying AgriTrust AI to MST Testnet (Chain ID: 91562037)...');
  console.log('=========================================================================');

  const [deployer] = await hre.ethers.getSigners();
  if (!deployer) {
    throw new Error('No deployer account configured. Set PRIVATE_KEY in .env file.');
  }

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log('👤 Deployer Address:           ', deployer.address);
  console.log('💰 Deployer Balance:           ', hre.ethers.formatEther(balance), 'MSTC');
  console.log('🌐 Network:                    ', hre.network.name, `(Chain ID: ${hre.network.config.chainId})`);
  console.log('-------------------------------------------------------------------------');

  if (balance === 0n) {
    throw new Error(
      `Deployer account ${deployer.address} has 0 MSTC. Please claim 10 MSTC from https://faucet.masterstroke.academy before deploying.`
    );
  }

  const oracleAddress = process.env.AI_ORACLE_ADDRESS || deployer.address;
  const farmerAddress = deployer.address;

  // 1. Deploy FarmRegistry
  console.log('\n1️⃣ Deploying FarmRegistry.sol (Land Parcel & Geofencing Registry)...');
  const FarmRegistry = await hre.ethers.getContractFactory('FarmRegistry');
  const farmRegistry = await FarmRegistry.deploy(deployer.address, deployer.address);
  await farmRegistry.waitForDeployment();
  const registryAddress = await farmRegistry.getAddress();
  console.log('✅ FarmRegistry deployed at:   ', registryAddress);
  console.log('   Explorer:                   ', `https://testnet.mstscan.com/address/${registryAddress}`);

  // 2. Deploy AgriTrustVault
  console.log('\n2️⃣ Deploying AgriTrustVault.sol (Escrow Vault & Proof Payout Engine)...');
  const AgriTrustVault = await hre.ethers.getContractFactory('AgriTrustVault');
  const vault = await AgriTrustVault.deploy(registryAddress, deployer.address, oracleAddress);
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log('✅ AgriTrustVault deployed at: ', vaultAddress);
  console.log('   Explorer:                   ', `https://testnet.mstscan.com/address/${vaultAddress}`);

  // 3. Register Sample Farm Plot (Darbhanga, Bihar - Kosi River Basin)
  console.log('\n3️⃣ Enrolling Sample Farm Plot #1 on MST Testnet...');
  const sampleGeoJSON = JSON.stringify({
    type: 'Polygon',
    coordinates: [[
      [85.8971, 26.1522],
      [85.8985, 26.1525],
      [85.8982, 26.1510],
      [85.8968, 26.1508],
      [85.8971, 26.1522]
    ]]
  });

  const regTx = await farmRegistry.registerFarmPlot(
    farmerAddress,
    sampleGeoJSON,
    250, // 2.5 Acres
    'Paddy (Rice)',
    'Khasra #104/B',
    'Khata #27/3',
    'Bihar',
    'Darbhanga'
  );
  await regTx.wait();
  console.log('✅ Farm Plot #1 registered on-chain for:', farmerAddress);

  // 4. Create Active Policy
  console.log('\n4️⃣ Creating Active Crop Policy for Plot #1...');
  const insuredAmount = hre.ethers.parseEther('0.5'); // 0.5 MSTC coverage for testnet
  const policyTx = await vault.createPolicy(1, farmerAddress, insuredAmount);
  await policyTx.wait();
  console.log('✅ Policy #1 created for 0.5 MSTC Coverage!');

  // 5. Seed Escrow Vault with Initial Liquidity
  console.log('\n5️⃣ Seeding AgriTrustVault with 1.0 MSTC Escrow Liquidity...');
  const escrowFundAmount = hre.ethers.parseEther('1.0');
  const depositTx = await vault.depositEscrow({ value: escrowFundAmount });
  await depositTx.wait();
  console.log('✅ AgriTrustVault seeded with 1.0 MSTC Escrow Liquidity!');

  // 6. Export Contract Addresses & ABIs
  const configData = {
    network: 'mstTestnet',
    chainId: 91562037,
    rpcUrl: 'https://testnetrpc.mstblockchain.com',
    explorerUrl: 'https://testnet.mstscan.com',
    contracts: {
      FarmRegistry: registryAddress,
      AgriTrustVault: vaultAddress,
    },
    accounts: {
      deployer: deployer.address,
      aiOracleWallet: oracleAddress,
      farmerWallet: farmerAddress,
    },
    deployedAt: new Date().toISOString(),
  };

  const frontendOutputDir = path.join(__dirname, '../frontend/src/contracts');
  const agentOutputDir = path.join(__dirname, '../agent/config');

  if (!fs.existsSync(frontendOutputDir)) fs.mkdirSync(frontendOutputDir, { recursive: true });
  if (!fs.existsSync(agentOutputDir)) fs.mkdirSync(agentOutputDir, { recursive: true });

  fs.writeFileSync(path.join(frontendOutputDir, 'contract-addresses.json'), JSON.stringify(configData, null, 2));
  fs.writeFileSync(path.join(agentOutputDir, 'contract-addresses.json'), JSON.stringify(configData, null, 2));

  const registryArtifact = await hre.artifacts.readArtifact('FarmRegistry');
  const vaultArtifact = await hre.artifacts.readArtifact('AgriTrustVault');

  fs.writeFileSync(path.join(frontendOutputDir, 'FarmRegistry.json'), JSON.stringify(registryArtifact, null, 2));
  fs.writeFileSync(path.join(frontendOutputDir, 'AgriTrustVault.json'), JSON.stringify(vaultArtifact, null, 2));
  fs.writeFileSync(path.join(agentOutputDir, 'FarmRegistry.json'), JSON.stringify(registryArtifact, null, 2));
  fs.writeFileSync(path.join(agentOutputDir, 'AgriTrustVault.json'), JSON.stringify(vaultArtifact, null, 2));

  console.log('\n=========================================================================');
  console.log('🎉 ALL CONTRACTS DEPLOYED & CONFIGURED FOR MST TESTNET!');
  console.log('=========================================================================');
  console.log('FarmRegistry:   ', registryAddress);
  console.log('AgriTrustVault: ', vaultAddress);
  console.log('Explorer:       ', `https://testnet.mstscan.com/address/${vaultAddress}`);
  console.log('=========================================================================');
}

main().catch((error) => {
  console.error('❌ Deployment failed:', error);
  process.exitCode = 1;
});
