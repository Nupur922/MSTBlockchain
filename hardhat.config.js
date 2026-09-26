import '@nomicfoundation/hardhat-toolbox';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, 'agent/config/.env') });

const ORACLE_PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const MST_RPC_URL = process.env.MST_RPC_URL || "http://127.0.0.1:8545";
const MST_CHAIN_ID = parseInt(process.env.MST_CHAIN_ID || "31337", 10);

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
    localhost: {
      url: 'http://127.0.0.1:8545',
      chainId: 31337,
    },
    mst_testnet: {
      url: MST_RPC_URL,
      chainId: MST_CHAIN_ID,
      accounts: [ORACLE_PRIVATE_KEY],
    },
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts'
  }
};

export default config;
