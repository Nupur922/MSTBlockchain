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
    throw new Error('No deployer account configured. Set DEPLOYER_PRIVATE_KEY in .env file.');
  }

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log('👤 Deployer Address:           ', deployer.address);
  console.log('💰 Deployer Balance:           ', hre.ethers.formatEther(balance), 'MST');
  console.log('🌐 Network:                    ', hre.network.name, `(Chain ID: ${hre.network.config.chainId})`);
  console.log('-------------------------------------------------------------------------');

  if (balance === 0n) {
    throw new Error(
      `Deployer account ${deployer.address} has 0 MST. Please fund with MST before deploying.`
    );
  }

  const oracleAddress = process.env.AI_ORACLE_ADDRESS || deployer.address;

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

  // 3. Register All 6 Farmers on MST Testnet
  console.log('\n3️⃣ Enrolling 6 Regional Farm Plots & DIDs on MST Testnet...');
  
  const FARMERS_TO_ENROLL = [
    {
      name: 'Prasanta Kalita',
      wallet: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
      crop: 'Sali Paddy (Rice)',
      acreage: 180,
      khasra: 'Patta #104/B',
      khata: 'Khata #27/3',
      state: 'Assam',
      district: 'Majuli',
      did: 'did:mst:farmer:0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc',
      coverage: '0.65',
      lat: 26.9535, lng: 94.2045,
    },
    {
      name: 'Ram Singh',
      wallet: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BD',
      crop: 'Paddy (Rice)',
      acreage: 250,
      khasra: 'Khatiyan #214/A',
      khata: 'Khata #55/1',
      state: 'Bihar',
      district: 'Darbhanga',
      did: 'did:mst:farmer:0x3c44cdddb6a900fa2b585dd299e03d12fa4293bd',
      coverage: '0.50',
      lat: 26.1522, lng: 85.8971,
    },
    {
      name: 'Eknath Patil',
      wallet: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      crop: 'Grapes / Onion',
      acreage: 320,
      khasra: '7/12 Extract #88/2',
      khata: 'Khata #12/4',
      state: 'Maharashtra',
      district: 'Nashik',
      did: 'did:mst:farmer:0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
      coverage: '0.50',
      lat: 19.9975, lng: 73.7898,
    },
    {
      name: 'Gurpreet Singh',
      wallet: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
      crop: 'Wheat',
      acreage: 400,
      khasra: 'Jamabandi #45/1',
      khata: 'Khata #33/2',
      state: 'Punjab',
      district: 'Ludhiana',
      did: 'did:mst:farmer:0x15d34aaf54267db7d7c367839aaf71a00a2c6a65',
      coverage: '0.40',
      lat: 30.9010, lng: 75.8573,
    },
    {
      name: 'Lakshmamma',
      wallet: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc',
      crop: 'Sugarcane / Paddy',
      acreage: 280,
      khasra: 'RTC #112/3',
      khata: 'Khata #99/1',
      state: 'Karnataka',
      district: 'Mandya',
      did: 'did:mst:farmer:0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc',
      coverage: '0.70',
      lat: 12.5218, lng: 76.8951,
    },
    {
      name: 'Murugan',
      wallet: '0x976EA74026E726554dB657fA54763abd0C3a0aa9',
      crop: 'Samba Paddy',
      acreage: 210,
      khasra: 'Patta #78/1A',
      khata: 'Khata #44/2',
      state: 'Tamil Nadu',
      district: 'Thanjavur',
      did: 'did:mst:farmer:0x976ea74026e726554db657fa54763abd0c3a0aa9',
      coverage: '0.75',
      lat: 10.7870, lng: 79.1378,
    },
  ];

  for (let i = 0; i < FARMERS_TO_ENROLL.length; i++) {
    const f = FARMERS_TO_ENROLL[i];
    const farmerWallet = hre.ethers.getAddress(f.wallet.toLowerCase());
    const geo = JSON.stringify({
      type: 'Polygon',
      coordinates: [[
        [f.lng, f.lat],
        [f.lng + 0.0015, f.lat],
        [f.lng + 0.0015, f.lat - 0.0015],
        [f.lng, f.lat - 0.0015],
        [f.lng, f.lat]
      ]]
    });

    const regTx = await farmRegistry.registerFarmPlot(
      farmerWallet,
      geo,
      f.acreage,
      f.crop,
      f.khasra,
      f.khata,
      f.state,
      f.district
    );
    await regTx.wait();

    // Register DID
    try {
      const didTx = await farmRegistry.registerFarmerDID(farmerWallet, f.did);
      await didTx.wait();
    } catch (e) {
      console.warn(`Could not set DID for ${f.name}:`, e.message);
    }

    // Create policy in vault
    const coverageWei = hre.ethers.parseEther(f.coverage);
    const polTx = await vault.createPolicy(i + 1, farmerWallet, coverageWei);
    await polTx.wait();

    console.log(`✅ Plot #${i + 1} enrolled: ${f.name} (${f.state}) — Coverage: ${f.coverage} MST`);
  }

  // 4. Seed Escrow Vault with Initial Liquidity
  console.log('\n4️⃣ Seeding AgriTrustVault with 2.0 MST Escrow Liquidity...');
  const escrowFundAmount = hre.ethers.parseEther('2.0');
  const depositTx = await vault.depositEscrow({ value: escrowFundAmount });
  await depositTx.wait();
  console.log('✅ AgriTrustVault seeded with 2.0 MST Escrow Liquidity!');

  // 5. Export Contract Addresses & ABIs
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
      farmerWallet: FARMERS_TO_ENROLL[0].wallet,
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
