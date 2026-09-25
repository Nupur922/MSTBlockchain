import hre from 'hardhat';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('=========================================================================');
  console.log('?? Deploying AgriTrust AI Smart Contracts to MST Blockchain Layer 1...');
  console.log('=========================================================================');

  const [deployer, aiOracleWallet, farmerWallet] = await hre.ethers.getSigners();

  console.log('?? Deployer Wallet (Admin):      ', deployer.address);
  console.log('?? NEWRRO AI Oracle Wallet:      ', aiOracleWallet ? aiOracleWallet.address : deployer.address);
  console.log('?? Demo Farmer Wallet:           ', farmerWallet ? farmerWallet.address : deployer.address);
  console.log('-------------------------------------------------------------------------');

  const oracleAddress = aiOracleWallet ? aiOracleWallet.address : deployer.address;
  const farmerAddress = farmerWallet ? farmerWallet.address : deployer.address;

  // 1. Deploy FarmRegistry
  console.log('\n1?? Deploying FarmRegistry.sol (Land Parcel & Geofencing Registry)...');
  const FarmRegistry = await hre.ethers.getContractFactory('FarmRegistry');
  const farmRegistry = await FarmRegistry.deploy(deployer.address, deployer.address);
  await farmRegistry.waitForDeployment();
  const registryAddress = await farmRegistry.getAddress();
  console.log('? FarmRegistry deployed to MST Blockchain at:', registryAddress);

  // 2. Deploy AgriTrustVault
  console.log('\n2?? Deploying AgriTrustVault.sol (Escrow Vault & Proof Payout Engine)...');
  const AgriTrustVault = await hre.ethers.getContractFactory('AgriTrustVault');
  const vault = await AgriTrustVault.deploy(registryAddress, deployer.address, oracleAddress);
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log('? AgriTrustVault deployed to MST Blockchain at:', vaultAddress);

  // 3. Register Sample Farm Plot (Darbhanga, Bihar Flood Zone)
  console.log('\n3?? Enrolling Sample Farm Plot (Darbhanga, Bihar - Kosi River Basin)...');
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
    'Paddy (Rice)'
  );
  await regTx.wait();
  console.log('? Sample Farm Plot #1 registered for Farmer:', farmerAddress);

  // 4. Create Active Policy
  console.log('\n4?? Creating Active Crop Policy for Plot #1...');
  const insuredAmount = hre.ethers.parseEther('50.0'); // 50 MST coverage
  const policyTx = await vault.createPolicy(1, farmerAddress, insuredAmount);
  await policyTx.wait();
  console.log('? Policy #1 created for 50.0 MST Coverage!');

  // 5. Fund Escrow Vault
  console.log('\n5?? Seeding AgriTrustVault with 500.0 MST Escrow Liquidity...');
  const escrowFundAmount = hre.ethers.parseEther('500.0');
  const depositTx = await vault.depositEscrow({ value: escrowFundAmount });
  await depositTx.wait();
  console.log('? AgriTrustVault successfully funded with 500.0 MST Tokens!');

  // 6. Export Contract Addresses & ABIs for Developer 2 & Developer 3
  const configData = {
    network: hre.network.name,
    chainId: hre.network.config.chainId || 31337,
    contracts: {
      FarmRegistry: registryAddress,
      AgriTrustVault: vaultAddress
    },
    accounts: {
      deployer: deployer.address,
      aiOracleWallet: oracleAddress,
      farmerWallet: farmerAddress
    }
  };

  // Export to frontend
  const frontendOutputDir = path.join(__dirname, '../frontend/src/contracts');
  if (!fs.existsSync(frontendOutputDir)) {
    fs.mkdirSync(frontendOutputDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(frontendOutputDir, 'contract-addresses.json'),
    JSON.stringify(configData, null, 2)
  );

  // Export to AI agent
  const agentOutputDir = path.join(__dirname, '../agent/config');
  if (!fs.existsSync(agentOutputDir)) {
    fs.mkdirSync(agentOutputDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(agentOutputDir, 'contract-addresses.json'),
    JSON.stringify(configData, null, 2)
  );

  const registryArtifact = await hre.artifacts.readArtifact('FarmRegistry');
  const vaultArtifact = await hre.artifacts.readArtifact('AgriTrustVault');

  fs.writeFileSync(path.join(frontendOutputDir, 'FarmRegistry.json'), JSON.stringify(registryArtifact, null, 2));
  fs.writeFileSync(path.join(frontendOutputDir, 'AgriTrustVault.json'), JSON.stringify(vaultArtifact, null, 2));
  fs.writeFileSync(path.join(agentOutputDir, 'FarmRegistry.json'), JSON.stringify(registryArtifact, null, 2));
  fs.writeFileSync(path.join(agentOutputDir, 'AgriTrustVault.json'), JSON.stringify(vaultArtifact, null, 2));

  console.log('\n=========================================================================');
  console.log('? ALL DEPLOYMENT ARTIFACTS SUCCESSFULLY EXPORTED TO FRONTEND & AGENT!');
  console.log('=========================================================================');
}

main().catch((error) => {
  console.error('? Deployment failed:', error);
  process.exitCode = 1;
});
