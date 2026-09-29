import React, { useState, useEffect, useCallback } from 'react';
import { Sprout, Wallet, Key, ExternalLink, Check, Copy, AlertTriangle, RefreshCw, LogOut } from 'lucide-react';
import { 
  connectBridgeKey, 
  switchOrAddMSTTestnet, 
  isBridgeKeyInstalled, 
  isMSTTestnetChain,
  subscribeToBridgeKeyEvents,
  MST_TESTNET_CONFIG,
  BRIDGEKEY_CHROME_STORE_URL 
} from '../utils/bridgekey';

const Header = ({ walletState, onWalletChange }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Local fallback if parent doesn't provide walletState
  const [localWallet, setLocalWallet] = useState({
    isConnected: false,
    address: '',
    chainId: null,
    isMSTTestnet: false,
  });

  const activeWallet = walletState || localWallet;

  const updateState = useCallback((partial) => {
    const updated = { ...activeWallet, ...partial };
    setLocalWallet(updated);
    if (onWalletChange) onWalletChange(updated);
  }, [activeWallet, onWalletChange]);

  // Connect BridgeKey Wallet handler
  const handleConnectWallet = async () => {
    setErrorMsg('');
    if (!isBridgeKeyInstalled()) {
      setShowInstallModal(true);
      return;
    }

    setIsConnecting(true);
    try {
      const { address, chainId, isMSTTestnet, provider, signer } = await connectBridgeKey();
      
      updateState({
        isConnected: true,
        address,
        chainId,
        isMSTTestnet,
        provider,
        signer,
      });

      // If connected but on wrong chain, automatically offer/prompt to switch to MST Testnet
      if (!isMSTTestnet) {
        try {
          await switchOrAddMSTTestnet();
          updateState({ isMSTTestnet: true, chainId: String(MST_TESTNET_CONFIG.chainId) });
        } catch (switchErr) {
          console.warn('Network switch skipped or deferred by user:', switchErr.message);
        }
      }
    } catch (error) {
      console.error('Failed to connect BridgeKey:', error);
      if (error.code === 'BRIDGEKEY_NOT_INSTALLED') {
        setShowInstallModal(true);
      } else {
        setErrorMsg(error.message || 'Failed to connect wallet');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  // Switch to MST Testnet handler
  const handleSwitchNetwork = async () => {
    setIsSwitchingNetwork(true);
    setErrorMsg('');
    try {
      await switchOrAddMSTTestnet();
      updateState({ isMSTTestnet: true });
    } catch (err) {
      console.error('Network switch failed:', err);
      setErrorMsg(err.message || 'Failed to switch network');
    } finally {
      setIsSwitchingNetwork(false);
    }
  };

  // Disconnect handler (clears local application session)
  const handleDisconnect = () => {
    updateState({
      isConnected: false,
      address: '',
      chainId: null,
      isMSTTestnet: false,
      signer: null,
      provider: null,
    });
  };

  // Copy address to clipboard
  const handleCopyAddress = () => {
    if (!activeWallet.address) return;
    navigator.clipboard.writeText(activeWallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Subscribe to real-time BridgeKey events
  useEffect(() => {
    const unsubscribe = subscribeToBridgeKeyEvents({
      onAccountsChanged: (accounts) => {
        if (!accounts || accounts.length === 0) {
          handleDisconnect();
        } else {
          updateState({ address: accounts[0], isConnected: true });
        }
      },
      onChainChanged: (newChainId) => {
        const isTestnet = isMSTTestnetChain(newChainId);
        updateState({ chainId: newChainId, isMSTTestnet: isTestnet });
      },
      onDisconnect: () => {
        handleDisconnect();
      },
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [updateState]);

  const truncateAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <>
      <header className="bg-gradient-to-r from-emerald-800 via-green-700 to-teal-800 text-white shadow-lg border-b border-emerald-600/30">
        <div className="container mx-auto px-4 py-3.5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Logo & Brand */}
            <div className="flex items-center space-x-3">
              <div className="bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/20 shadow-inner">
                <Sprout className="w-7 h-7 text-emerald-300" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl font-bold tracking-tight">AgriTrust AI</h1>
                  <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 rounded-full">
                    MST Blockchain
                  </span>
                </div>
                <p className="text-xs text-emerald-100/80">Autonomous Parametric Crop Insurance & Disaster Escrow</p>
              </div>
            </div>

            {/* Wallet & Network Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Network Status Badge */}
              {activeWallet.isConnected && (
                activeWallet.isMSTTestnet ? (
                  <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-950/60 border border-emerald-500/50 rounded-lg text-xs font-semibold text-emerald-200 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>MST Testnet (91562037)</span>
                  </div>
                ) : (
                  <button
                    onClick={handleSwitchNetwork}
                    disabled={isSwitchingNetwork}
                    title="Click to switch wallet to MST Testnet"
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold transition-all shadow-md animate-bounce"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{isSwitchingNetwork ? 'Switching...' : 'Switch to MST Testnet'}</span>
                  </button>
                )
              )}

              {/* Faucet Link */}
              <a
                href="https://faucet.masterstroke.academy"
                target="_blank"
                rel="noopener noreferrer"
                title="Get 10 MSTC Test Tokens for free"
                className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium border border-white/15 transition-all text-emerald-100"
              >
                <span>🚰 Faucet (10 MSTC)</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </a>

              {/* Explorer Link */}
              <a
                href="https://testnet.mstscan.com"
                target="_blank"
                rel="noopener noreferrer"
                title="View MST Testnet Block Explorer"
                className="hidden md:flex items-center space-x-1.5 px-2.5 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium border border-white/15 transition-all text-emerald-100"
              >
                <span>MSTScan</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </a>

              {/* Wallet Button */}
              {activeWallet.isConnected && activeWallet.address ? (
                <div className="flex items-center bg-white/15 backdrop-blur-md rounded-lg border border-white/20 overflow-hidden text-xs">
                  <button
                    onClick={handleCopyAddress}
                    title="Click to copy full wallet address"
                    className="flex items-center space-x-1.5 px-3 py-2 hover:bg-white/10 transition-colors font-mono font-medium"
                  >
                    <Key className="w-3.5 h-3.5 text-amber-300" />
                    <span>{truncateAddress(activeWallet.address)}</span>
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                    ) : (
                      <Copy className="w-3 h-3 opacity-60" />
                    )}
                  </button>
                  <button
                    onClick={handleDisconnect}
                    title="Disconnect wallet from dApp"
                    className="p-2 border-l border-white/20 hover:bg-red-500/30 text-white/80 hover:text-white transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleConnectWallet}
                  disabled={isConnecting}
                  className="bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold px-4 py-2 rounded-lg transition-all shadow-md flex items-center space-x-2 text-xs disabled:opacity-50 hover:shadow-amber-400/20"
                >
                  <Wallet className="w-4 h-4 text-slate-900" />
                  <span>{isConnecting ? 'Connecting...' : 'Connect BridgeKey'}</span>
                </button>
              )}
            </div>
          </div>

          {errorMsg && (
            <div className="mt-2 text-xs bg-red-500/20 border border-red-500/40 text-red-200 px-3 py-1.5 rounded-lg flex items-center justify-between">
              <span>{errorMsg}</span>
              <button onClick={() => setErrorMsg('')} className="font-bold ml-2">×</button>
            </div>
          )}
        </div>
      </header>

      {/* BridgeKey Install Prompt Modal */}
      {showInstallModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white text-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-emerald-100">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-amber-100 p-3 rounded-xl">
                <Key className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">BridgeKey Wallet Required</h3>
                <p className="text-xs text-slate-500">Official Web3 Wallet for MST Blockchain</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 mb-5 leading-relaxed">
              To interact with <strong>AgriTrust AI</strong> on <strong>MST Testnet</strong>, please install the official 
              <strong> BridgeKey Chrome Extension</strong>, create or import your wallet, and connect to MST Testnet.
            </p>

            <div className="space-y-2.5 mb-5 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-700">
              <div className="flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[11px]">1</span>
                <span>Install BridgeKey from the Chrome Web Store</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[11px]">2</span>
                <span>Select <strong>MST Testnet</strong> network in BridgeKey</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[11px]">3</span>
                <span>Claim 10 free test tokens ($MSTC) at the faucet</span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <a
                href={BRIDGEKEY_CHROME_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-xl text-center text-sm transition-colors flex items-center justify-center space-x-2 shadow-md shadow-emerald-600/20"
              >
                <span>Install BridgeKey</span>
                <ExternalLink className="w-4 h-4" />
              </a>
              <button
                onClick={() => setShowInstallModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-sm font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
