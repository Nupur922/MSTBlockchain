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

// Local and MST RPC configurations
const HARDHAT_RPC_URL = 'http://127.0.0.1:8545';
export const MST_TESTNET_RPC_URL = import.meta.env?.VITE_MST_RPC_URL || 'https://testnetrpc.mstblockchain.com';

/**
 * Connect to BridgeKey (or injected Web3 wallet)
 * Uses Ethers.js v6 BrowserProvider
 */
export const connectWallet = async () => {
  return await connectBridgeKey();
};

/**
 * Switch wallet to MST Testnet
 */
export const switchToMSTTestnet = async () => {
  return await switchOrAddMSTTestnet();
};

/**
 * Initialize a contract instance
 * @param {string} contractAddress - Deployed contract address
 * @param {Array} abi - Contract ABI
 * @param {ethers.Signer} signer - Ethers signer instance
 */
export const getContract = (contractAddress, abi, signer) => {
  return new ethers.Contract(contractAddress, abi, signer);
};

/**
 * Format ETH amount from wei
 */
export const formatEther = (wei) => {
  return ethers.formatEther(wei);
};

/**
 * Parse ETH amount to wei
 */
export const parseEther = (eth) => {
  return ethers.parseEther(eth);
};

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
    FarmRegistry: import.meta.env?.VITE_FARM_REGISTRY_ADDRESS || contractAddresses?.contracts?.FarmRegistry,
    AgriTrustVault: import.meta.env?.VITE_AGRITRUST_VAULT_ADDRESS || contractAddresses?.contracts?.AgriTrustVault,
  };
};

/**
 * Initialize FarmRegistry contract instance
 * @param {ethers.Signer | ethers.Provider} signerOrProvider - Ethers signer or provider
 * @returns {ethers.Contract | null} Contract instance or null if ABIs not available
 */
export const getFarmRegistryContract = (signerOrProvider) => {
  try {
    const address = getActiveContractAddresses().FarmRegistry;
    const abi = FarmRegistryABI.abi;
    
    if (!address || !abi) {
      console.warn('FarmRegistry contract address or ABI not found');
      return null;
    }
    
    return new ethers.Contract(address, abi, signerOrProvider);
  } catch (error) {
    console.error('Error initializing FarmRegistry contract:', error);
    return null;
  }
};

/**
 * Initialize AgriTrustVault contract instance
 * @param {ethers.Signer | ethers.Provider} signerOrProvider - Ethers signer or provider
 * @returns {ethers.Contract | null} Contract instance or null if ABIs not available
 */
export const getAgriTrustVaultContract = (signerOrProvider) => {
  try {
    const address = getActiveContractAddresses().AgriTrustVault;
    const abi = AgriTrustVaultABI.abi;
    
    if (!address || !abi) {
      console.warn('AgriTrustVault contract address or ABI not found');
      return null;
    }
    
    return new ethers.Contract(address, abi, signerOrProvider);
  } catch (error) {
    console.error('Error initializing AgriTrustVault contract:', error);
    return null;
  }
};

/**
 * Get all contract instances at once
 * @param {ethers.Signer | ethers.Provider} signerOrProvider - Ethers signer or provider
 * @returns {Object} Object containing all contract instances
 */
export const getAllContracts = (signerOrProvider) => {
  return {
    farmRegistry: getFarmRegistryContract(signerOrProvider),
    agriTrustVault: getAgriTrustVaultContract(signerOrProvider),
  };
};
