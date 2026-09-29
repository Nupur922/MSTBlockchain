import { ethers } from 'ethers';

// Import Contract ABIs and Addresses
import contractAddresses from '../contracts/contract-addresses.json';
import FarmRegistryABI from '../contracts/FarmRegistry.json';
import AgriTrustVaultABI from '../contracts/AgriTrustVault.json';

import { 
  connectBridgeKey, 
  switchOrAddMSTTestnet, 
  isBridgeKeyInstalled, 
  isMSTTestnetChain,
  MST_TESTNET_CONFIG 
} from './bridgekey';

// ── Network configuration ──────────────────────────────────────────────────
export const HARDHAT_RPC_URL = 'http://127.0.0.1:8545';
export const MST_TESTNET_RPC_URL =
  import.meta.env?.VITE_MST_RPC_URL || 'https://testnetrpc.mstblockchain.com';
export const RPC_URL = MST_TESTNET_RPC_URL;

// Hardhat account #0 fallback for silent demo mode
export const DEMO_HARDHAT_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
export const DEMO_HARDHAT_PRIVATE_KEY =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

/**
 * Connect to BridgeKey (or injected Web3 wallet).
 * If not installed, provides silent demo mode using Hardhat account.
 */
export const connectWallet = async () => {
  if (isBridgeKeyInstalled()) {
    try {
      return await connectBridgeKey();
    } catch (err) {
      if (err.code === 4001) throw err;
      console.warn('BridgeKey connect failed, falling back to demo mode:', err.message);
    }
  }

  // Silent demo mode fallback
  try {
    const provider = new ethers.JsonRpcProvider(HARDHAT_RPC_URL);
    const signer = new ethers.Wallet(DEMO_HARDHAT_PRIVATE_KEY, provider);
    return {
      provider,
      signer,
      address: DEMO_HARDHAT_ADDRESS,
      chainId: '31337',
      isMSTTestnet: false,
      isDemo: true,
    };
  } catch (demoErr) {
    return {
      provider: null,
      signer: null,
      address: DEMO_HARDHAT_ADDRESS,
      chainId: '31337',
      isMSTTestnet: false,
      isDemo: true,
    };
  }
};

/**
 * Switch wallet to MST Testnet
 */
export const switchToMSTTestnet = async () => {
  return await switchOrAddMSTTestnet();
};

/**
 * Switch to local Hardhat network in wallet
 */
export const switchToHardhat = async () => {
  if (window.ethereum) {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x7A69' }], // 31337
      });
    } catch (error) {
      if (error.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x7A69',
            chainName: 'Hardhat Local',
            rpcUrls: [HARDHAT_RPC_URL],
          }],
        });
      }
    }
  }
};

/**
 * Format ETH/MST amount from wei
 */
export const formatEther = (wei) => {
  try {
    return ethers.formatEther(wei);
  } catch {
    return '0.0';
  }
};

/**
 * Parse ETH/MST amount to wei
 */
export const parseEther = (eth) => {
  try {
    return ethers.parseEther(String(eth));
  } catch {
    return 0n;
  }
};

/**
 * Get active contract addresses from localStorage, env vars, or contract-addresses.json
 */
export const getActiveContractAddresses = () => {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('agritrust_mst_testnet_contracts');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.FarmRegistry && parsed?.AgriTrustVault) {
          return {
            FarmRegistry: parsed.FarmRegistry,
            AgriTrustVault: parsed.AgriTrustVault,
          };
        }
      }
    } catch (e) {
      // ignore JSON parse errors
    }
  }
  return {
    FarmRegistry:
      import.meta.env?.VITE_FARM_REGISTRY_ADDRESS ||
      contractAddresses?.contracts?.FarmRegistry ||
      contractAddresses?.FarmRegistry ||
      '0xDA6Fe875D30Bd4329415625b845fC7b4Fb859C9b',
    AgriTrustVault:
      import.meta.env?.VITE_AGRITRUST_VAULT_ADDRESS ||
      contractAddresses?.contracts?.AgriTrustVault ||
      contractAddresses?.AgriTrustVault ||
      '0x69AC2F2687D0434e83309bFD62cB5d511E02519b',
  };
};

/**
 * Initialize FarmRegistry contract instance
 */
export const getFarmRegistryContract = (signerOrProvider) => {
  try {
    const address = getActiveContractAddresses().FarmRegistry;
    const abi = FarmRegistryABI.abi;
    if (!address || !abi) return null;
    return new ethers.Contract(address, abi, signerOrProvider);
  } catch (error) {
    console.error('Error initializing FarmRegistry contract:', error);
    return null;
  }
};

/**
 * Initialize AgriTrustVault contract instance
 */
export const getAgriTrustVaultContract = (signerOrProvider) => {
  try {
    const address = getActiveContractAddresses().AgriTrustVault;
    const abi = AgriTrustVaultABI.abi;
    if (!address || !abi) return null;
    return new ethers.Contract(address, abi, signerOrProvider);
  } catch (error) {
    console.error('Error initializing AgriTrustVault contract:', error);
    return null;
  }
};

/**
 * Get all contract instances at once
 */
export const getAllContracts = (signerOrProvider) => {
  return {
    farmRegistry: getFarmRegistryContract(signerOrProvider),
    agriTrustVault: getAgriTrustVaultContract(signerOrProvider),
  };
};
