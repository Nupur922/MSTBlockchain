import { ethers } from 'ethers';

// Import Contract ABIs and Addresses
import contractAddresses from '../contracts/contract-addresses.json';
import FarmRegistryABI from '../contracts/FarmRegistry.json';
import AgriTrustVaultABI from '../contracts/AgriTrustVault.json';

// Local Hardhat node configuration
const HARDHAT_RPC_URL = 'http://127.0.0.1:8545';

/**
 * Connect to MetaMask or injected Web3 wallet
 * Uses Ethers.js v6 BrowserProvider
 */
export const connectWallet = async () => {
  try {
    if (!window.ethereum) {
      throw new Error('MetaMask not found. Please install MetaMask.');
    }

    // Request account access
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    
    // Use Ethers v6 BrowserProvider (NOT Web3Provider)
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    const network = await provider.getNetwork();

    return {
      provider,
      signer,
      address,
      chainId: network.chainId.toString(),
    };
  } catch (error) {
    console.error('Error connecting wallet:', error);
    throw error;
  }
};

/**
 * Connect to local Hardhat node directly
 * Useful for testing without MetaMask
 */
export const connectToHardhat = async () => {
  try {
    const provider = new ethers.JsonRpcProvider(HARDHAT_RPC_URL);
    const network = await provider.getNetwork();
    
    // Get first account from Hardhat node
    const signer = await provider.getSigner(0);
    const address = await signer.getAddress();

    return {
      provider,
      signer,
      address,
      chainId: network.chainId.toString(),
    };
  } catch (error) {
    console.error('Error connecting to Hardhat:', error);
    throw error;
  }
};

/**
 * Switch to local Hardhat network in MetaMask
 */
export const switchToHardhat = async () => {
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x7A69' }], // 31337 in hex (Hardhat default)
    });
  } catch (error) {
    // If network doesn't exist, add it
    if (error.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: '0x7A69',
          chainName: 'Hardhat Local',
          rpcUrls: [HARDHAT_RPC_URL],
        }],
      });
    } else {
      throw error;
    }
  }
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

/**
 * Initialize FarmRegistry contract instance
 * @param {ethers.Signer | ethers.Provider} signerOrProvider - Ethers signer or provider
 * @returns {ethers.Contract | null} Contract instance or null if ABIs not available
 */
export const getFarmRegistryContract = (signerOrProvider) => {
  try {
    const address = contractAddresses.contracts.FarmRegistry;
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
    const address = contractAddresses.contracts.AgriTrustVault;
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
