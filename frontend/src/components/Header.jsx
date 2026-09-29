import React, { useState, useEffect, useCallback } from 'react';
import { Sprout, Wallet, Key, ExternalLink, Check, Copy, AlertTriangle, LogOut } from 'lucide-react';
import { ethers } from 'ethers';
import { 
  connectWallet, 
  DEMO_HARDHAT_ADDRESS, 
  RPC_URL, 
  HARDHAT_RPC_URL 
} from '../utils/web3';
import { 
  switchOrAddMSTTestnet, 
  isBridgeKeyInstalled, 
  isMSTTestnetChain, 
  subscribeToBridgeKeyEvents, 
  MST_TESTNET_CONFIG 
} from '../utils/bridgekey';

const Header = ({ walletState, onWalletChange }) => {
  const [chainStatus, setChainStatus] = useState('connecting');
  const [blockNumber, setBlockNumber] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Local fallback if parent doesn't provide walletState
  const [localWallet, setLocalWallet] = useState({
    isConnected: false,
    address: '',
    chainId: null,
    isMSTTestnet: false,
    isDemo: false,
  });

  const activeWallet = walletState || localWallet;

  const updateState = useCallback((partial) => {
    const updated = { ...activeWallet, ...partial };
    setLocalWallet(updated);
    if (onWalletChange) onWalletChange(updated);
  }, [activeWallet, onWalletChange]);

  // Block number poller (every 8s)
  useEffect(() => {
    let interval;
    const checkBlock = async () => {
      try {
        let provider;
        try {
          provider = new ethers.JsonRpcProvider(RPC_URL);
          const bn = await provider.getBlockNumber();
          setBlockNumber(bn);
          setChainStatus('live');
          return;
        } catch {
          // Fallback to local hardhat
          provider = new ethers.JsonRpcProvider(HARDHAT_RPC_URL);
          const bn = await provider.getBlockNumber();
          setBlockNumber(bn);
          setChainStatus('live');
        }
      } catch {
        setChainStatus('offline');
      }
    };
    checkBlock();
    interval = setInterval(checkBlock, 8000);
    return () => clearInterval(interval);
  }, []);

  // Connect BridgeKey / Silent Demo handler
  const handleConnectWallet = async () => {
    setErrorMsg('');
    setIsConnecting(true);
    try {
      // If BridgeKey is installed, connects via BridgeKey;
      // If not installed, silently falls back to Hardhat demo account (0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266)
      const res = await connectWallet();
      
      updateState({
        isConnected: true,
        address: res.address,
        chainId: res.chainId,
        isMSTTestnet: res.isMSTTestnet || res.isDemo,
        isDemo: !!res.isDemo,
        provider: res.provider,
        signer: res.signer,
      });

      if (!res.isDemo && !res.isMSTTestnet) {
        try {
          await switchOrAddMSTTestnet();
          updateState({ isMSTTestnet: true, chainId: String(MST_TESTNET_CONFIG.chainId) });
        } catch (switchErr) {
          console.warn('Network switch deferred:', switchErr.message);
        }
      }
    } catch (error) {
      console.warn('Wallet connection note:', error);
      // Fallback silently to demo mode if error
      updateState({
        isConnected: true,
        address: DEMO_HARDHAT_ADDRESS,
        chainId: '91562037',
        isMSTTestnet: true,
        isDemo: true,
        provider: null,
        signer: null,
      });
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
      updateState({ isMSTTestnet: true, chainId: String(MST_TESTNET_CONFIG.chainId) });
    } catch (err) {
      console.error('Network switch failed:', err);
      setErrorMsg(err.message || 'Failed to switch network');
    } finally {
      setIsSwitchingNetwork(false);
    }
  };

  // Disconnect handler
  const handleDisconnect = () => {
    updateState({
      isConnected: false,
      address: '',
      chainId: null,
      isMSTTestnet: false,
      isDemo: false,
      signer: null,
      provider: null,
    });
  };

  // Copy address
  const handleCopyAddress = () => {
    if (!activeWallet.address) return;
    navigator.clipboard.writeText(activeWallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Subscribe to real-time BridgeKey events
  useEffect(() => {
    if (!isBridgeKeyInstalled()) return;
    const unsubscribe = subscribeToBridgeKeyEvents({
      onAccountsChanged: (accounts) => {
        if (!accounts || accounts.length === 0) {
          handleDisconnect();
        } else {
          updateState({ address: accounts[0], isConnected: true, isDemo: false });
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
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
  };

  const isDemoAddress =
    activeWallet.isDemo ||
    activeWallet.address?.toLowerCase() === DEMO_HARDHAT_ADDRESS.toLowerCase();

  return (
    <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-40">
      {/* Tricolor top strip */}
      <div className="h-1 w-full flex">
        <div className="w-1/3 bg-[#FF9933]" />
        <div className="w-1/3 bg-white" />
        <div className="w-1/3 bg-[#138808]" />
      </div>

      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">

          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2 rounded-xl text-white shadow-sm">
              <Sprout className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  AgriTrust<span className="text-emerald-600">.AI</span>
                </h1>
                <span className="hidden sm:inline-block text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200 uppercase tracking-wider">
                  v3.0
                </span>
                <span className="hidden sm:inline-block text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full border border-blue-200 uppercase tracking-wider">
                  PMFBY
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden md:block">
                Autonomous Parametric Crop Insurance · MST Blockchain
              </p>
            </div>
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-2 flex-wrap">

            {/* Live Block Number Pill (polls every 8s) */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                chainStatus === 'live'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : chainStatus === 'offline'
                  ? 'bg-red-50 text-red-600 border-red-200'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  chainStatus === 'live'
                    ? 'bg-emerald-500 animate-pulse'
                    : chainStatus === 'offline'
                    ? 'bg-red-400'
                    : 'bg-slate-400'
                }`}
              />
              {chainStatus === 'live'
                ? `Block #${blockNumber?.toLocaleString()}`
                : chainStatus === 'offline'
                ? 'Chain Offline'
                : 'Connecting…'}
            </div>

            {/* Network pill / Switch button if connected */}
            {activeWallet.isConnected && (
              activeWallet.isMSTTestnet ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>MST Testnet (91562037)</span>
                </div>
              ) : (
                <button
                  onClick={handleSwitchNetwork}
                  disabled={isSwitchingNetwork}
                  title="Click to switch wallet to MST Testnet"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold transition-all shadow-sm animate-pulse"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{isSwitchingNetwork ? 'Switching…' : 'Switch to MST Testnet'}</span>
                </button>
              )
            )}

            {/* MSTScan explorer link */}
            <a
              href="https://testnet.mstscan.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors border border-slate-200"
            >
              <ExternalLink className="w-3 h-3" />
              <span>MSTScan</span>
            </a>

            {/* Krishi Mitra Portal button */}
            <a
              href="#/krishi"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm"
            >
              <span>👨‍🌾</span>
              <span className="hidden sm:inline">Krishi Mitra</span>
            </a>

            {/* BridgeKey Connect / Address badge */}
            {activeWallet.isConnected && activeWallet.address ? (
              <div className="flex items-center bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 overflow-hidden text-xs transition-colors">
                <button
                  onClick={handleCopyAddress}
                  title="Click to copy full wallet address"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-slate-800 font-mono font-semibold"
                >
                  <Key className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{truncateAddress(activeWallet.address)}</span>
                  {isDemoAddress && (
                    <span className="ml-1 text-[10px] font-bold bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded font-sans">
                      DEMO
                    </span>
                  )}
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 opacity-60" />
                  )}
                </button>
                <button
                  onClick={handleDisconnect}
                  title="Disconnect wallet"
                  className="p-1.5 border-l border-slate-300 hover:bg-red-100 text-slate-600 hover:text-red-600 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnectWallet}
                disabled={isConnecting}
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-3.5 py-1.5 rounded-lg transition-all shadow-sm flex items-center gap-1.5 text-xs disabled:opacity-50"
              >
                <Wallet className="w-3.5 h-3.5 text-slate-950" />
                <span>{isConnecting ? 'Connecting…' : 'Connect BridgeKey'}</span>
              </button>
            )}

          </div>
        </div>

        {errorMsg && (
          <div className="mt-2 text-xs bg-red-50 border border-red-200 text-red-700 px-3 py-1.5 rounded-lg flex items-center justify-between">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg('')} className="font-bold ml-2">×</button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
