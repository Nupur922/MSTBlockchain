import '@nomicfoundation/hardhat-toolbox';
import dotenv from 'dotenv';
dotenv.config();

const accounts = (process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY)
  ? [process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY]
  : [];

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
    // MST Testnet (Chain ID 91562037)
    mst_testnet: {
      url: process.env.MST_TESTNET_RPC_URL || 'https://testnetrpc.mstblockchain.com',
      chainId: 91562037,
      accounts: accounts,
      gasPrice: 'auto',
      gas: 'auto',
      timeout: 120000,
    },
    mstTestnet: {
      url: process.env.MST_TESTNET_RPC_URL || 'https://testnetrpc.mstblockchain.com',
      chainId: 91562037,
      accounts: accounts,
      gasPrice: 'auto',
      gas: 'auto',
      timeout: 120000,
    },
    mstMainnet: {
      url: 'https://mariorpc.mstblockchain.com',
      chainId: 4646,
      accounts: accounts,
    },
  },
  etherscan: {
    apiKey: {
      mstTestnet: process.env.MSTSCAN_API_KEY || 'empty',
      mst_testnet: process.env.MSTSCAN_API_KEY || 'empty',
    },
    customChains: [
      {
        network: 'mstTestnet',
        chainId: 91562037,
        urls: {
          apiURL: 'https://testnet.mstscan.com/api',
          browserURL: 'https://testnet.mstscan.com',
        },
      },
      {
        network: 'mst_testnet',
        chainId: 91562037,
        urls: {
          apiURL: 'https://testnet.mstscan.com/api',
          browserURL: 'https://testnet.mstscan.com',
        },
      },
    ],
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
};

export default config;
