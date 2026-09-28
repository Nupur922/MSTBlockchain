import '@nomicfoundation/hardhat-toolbox';
import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';

// Load .env from project root
dotenvConfig({ path: resolve(process.cwd(), '.env') });

/** @type import('hardhat/config').HardhatUserConfig */
const config = {
  solidity: {
    version: '0.8.24',
    settings: {
      evmVersion: 'cancun',
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    // Local Hardhat node (development)
    localhost: {
      url: 'http://127.0.0.1:8545',
      chainId: 31337,
    },
    // MST Testnet (submission requirement)
    mst_testnet: {
      url: 'https://testnetrpc.mstblockchain.com',
      chainId: 91562037,
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
      gasPrice: 'auto',
      gas: 'auto',
      timeout: 120000,
    },
  },
  paths: {
    sources: './contracts',
    tests:   './test',
    cache:   './cache',
    artifacts: './artifacts',
  },
};

export default config;
