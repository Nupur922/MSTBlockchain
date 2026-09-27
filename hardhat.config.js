import '@nomicfoundation/hardhat-toolbox';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple env file reader (no external dependency requirement)
function loadEnvFile(filePath) {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...vals] = trimmed.split('=');
        if (key && !process.env[key.trim()]) {
          process.env[key.trim()] = vals.join('=').trim().replace(/^["']|["']$/g, '');
        }
      }
    });
  }
}

loadEnvFile(path.join(__dirname, '.env'));
loadEnvFile(path.join(__dirname, 'agent/config/.env'));

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
    hardhat: {
      // 5,000,000 MST per demo account so the escrow vault can be seeded with
      // realistic disaster-relief liquidity (500,000 MST) on every deploy —
      // even repeated ones — while payouts cap at the 40,000 MST sum insured.
      accounts: {
        count: 20,
        accountsBalance: '5000000000000000000000000',
      },
      chainId: 31337,
    },
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
