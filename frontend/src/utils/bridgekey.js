/**
 * Official BridgeKey Wallet Integration Service for MST Blockchain
 * AgriTrust AI — MST Testnet
 */

import { ethers } from 'ethers';

// Official MST Testnet Configuration
export const MST_TESTNET_CONFIG = {
  chainId: '0x5752035', // 91562037 in hex
  chainName: 'MST Testnet',
  nativeCurrency: {
    name: 'MSTC',
    symbol: 'MSTC',
    decimals: 18,
  },
  rpcUrls: [
    import.meta.env?.VITE_MST_RPC_URL || 'https://testnetrpc.mstblockchain.com',
  ],
  blockExplorerUrls: [
    import.meta.env?.VITE_MST_EXPLORER_URL || 'https://testnet.mstscan.com',
  ],
};

export const MST_TESTNET_CHAIN_ID_DECIMAL = 91562037;
export const MST_TESTNET_CHAIN_ID_HEX = '0x5752035';
export const BRIDGEKEY_CHROME_STORE_URL =
  'https://chromewebstore.google.com/detail/bridgekey/bfjojdcfenehemjgjlepdjomkpginlkg';

// Cache discovered EIP-6963 provider
let eip6963BridgeKeyProvider = null;

// Listen for EIP-6963 provider announcements
if (typeof window !== 'undefined') {
  window.addEventListener('eip6963:announceProvider', (event) => {
    const info = event.detail?.info;
    const provider = event.detail?.provider;
    if (info && provider) {
      const name = (info.name || '').toLowerCase();
      const rdns = (info.rdns || '').toLowerCase();
      if (name.includes('bridgekey') || rdns.includes('bridgekey')) {
        eip6963BridgeKeyProvider = provider;
        console.log('🔗 BridgeKey discovered via EIP-6963:', info);
      }
    }
  });

  try {
    window.dispatchEvent(new Event('eip6963:requestProvider'));
  } catch (e) {
    // Ignore in non-standard environments
  }
}

/**
 * Discovers and returns the active BridgeKey or compatible EVM provider.
 */
export const getBridgeKeyProvider = () => {
  if (typeof window === 'undefined') return null;

  // 1. EIP-6963 discovered provider
  if (eip6963BridgeKeyProvider) {
    return eip6963BridgeKeyProvider;
  }

  // 2. Dedicated window.bridgekey namespace
  if (window.bridgekey) {
    return window.bridgekey;
  }

  // 3. Multi-provider array in window.ethereum.providers
  if (window.ethereum?.providers && Array.isArray(window.ethereum.providers)) {
    const bk = window.ethereum.providers.find(
      (p) => p.isBridgeKey || p.name?.toLowerCase().includes('bridgekey')
    );
    if (bk) return bk;
  }

  // 4. Default window.ethereum if BridgeKey or single extension is active
  if (window.ethereum) {
    return window.ethereum;
  }

  return null;
};

/**
 * Checks whether BridgeKey or an EVM wallet provider is installed
 */
export const isBridgeKeyInstalled = () => {
  return getBridgeKeyProvider() !== null;
};

/**
 * Verifies whether the provided chainId matches MST Testnet
 */
export const isMSTTestnetChain = (chainId) => {
  if (!chainId) return false;
  const normalized = typeof chainId === 'string' ? chainId.toLowerCase() : String(chainId);
  return (
    normalized === MST_TESTNET_CHAIN_ID_HEX.toLowerCase() ||
    normalized === String(MST_TESTNET_CHAIN_ID_DECIMAL) ||
    parseInt(normalized, 16) === MST_TESTNET_CHAIN_ID_DECIMAL
  );
};

/**
 * Connect to BridgeKey wallet and request accounts
 */
export const connectBridgeKey = async () => {
  const rawProvider = getBridgeKeyProvider();

  if (!rawProvider) {
    const error = new Error('BridgeKey wallet extension is not installed.');
    error.code = 'BRIDGEKEY_NOT_INSTALLED';
    error.installUrl = BRIDGEKEY_CHROME_STORE_URL;
    throw error;
  }

  try {
    // Request accounts from BridgeKey
    const accounts = await rawProvider.request({
      method: 'eth_requestAccounts',
    });

    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts authorized. Please approve the connection in BridgeKey.');
    }

    const browserProvider = new ethers.BrowserProvider(rawProvider);
    const signer = await browserProvider.getSigner();
    const address = await signer.getAddress();
    const network = await browserProvider.getNetwork();
    const currentChainId = network.chainId.toString();

    const isTestnet = isMSTTestnetChain(currentChainId);

    return {
      provider: browserProvider,
      rawProvider,
      signer,
      address,
      chainId: currentChainId,
      isMSTTestnet: isTestnet,
    };
  } catch (error) {
    console.error('Error connecting to BridgeKey:', error);
    if (error.code === 4001) {
      throw new Error('Wallet connection request rejected by user in BridgeKey.');
    }
    throw error;
  }
};

/**
 * Switches the active network to MST Testnet or registers it if not present.
 */
export const switchOrAddMSTTestnet = async (rawProvider = null) => {
  const provider = rawProvider || getBridgeKeyProvider();
  if (!provider) {
    throw new Error('BridgeKey wallet extension not detected.');
  }

  try {
    // Attempt switching to MST Testnet
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: MST_TESTNET_CONFIG.chainId }],
    });
    return true;
  } catch (switchError) {
    // Error code 4902 indicates chain is not yet added to the wallet
    if (switchError.code === 4902 || switchError?.data?.originalError?.code === 4902) {
      try {
        await provider.request({
          method: 'wallet_addEthereumChain',
          params: [MST_TESTNET_CONFIG],
        });
        return true;
      } catch (addError) {
        console.error('Failed to add MST Testnet:', addError);
        throw new Error(`Failed to add MST Testnet to BridgeKey: ${addError.message}`);
      }
    } else if (switchError.code === 4001) {
      throw new Error('Network switch was rejected in BridgeKey.');
    }
    throw switchError;
  }
};

/**
 * Subscribe to wallet state changes (accountsChanged, chainChanged, disconnect)
 */
export const subscribeToBridgeKeyEvents = ({
  onAccountsChanged,
  onChainChanged,
  onDisconnect,
}) => {
  const provider = getBridgeKeyProvider();
  if (!provider || typeof provider.on !== 'function') return () => {};

  const handleAccountsChanged = (accounts) => {
    console.log('BridgeKey accountsChanged:', accounts);
    if (onAccountsChanged) onAccountsChanged(accounts);
  };

  const handleChainChanged = (chainId) => {
    console.log('BridgeKey chainChanged:', chainId);
    if (onChainChanged) onChainChanged(chainId);
  };

  const handleDisconnect = (error) => {
    console.log('BridgeKey disconnect:', error);
    if (onDisconnect) onDisconnect(error);
  };

  provider.on('accountsChanged', handleAccountsChanged);
  provider.on('chainChanged', handleChainChanged);
  provider.on('disconnect', handleDisconnect);

  // Return unsubscribe cleanup function
  return () => {
    if (typeof provider.removeListener === 'function') {
      provider.removeListener('accountsChanged', handleAccountsChanged);
      provider.removeListener('chainChanged', handleChainChanged);
      provider.removeListener('disconnect', handleDisconnect);
    }
  };
};
