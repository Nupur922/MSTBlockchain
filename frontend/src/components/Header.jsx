import React, { useState } from 'react';
import { Sprout, Wallet, ShieldCheck, Search, PhoneCall, Globe } from 'lucide-react';
import { connectWallet, switchToHardhat } from '../utils/web3';
import GovtDBTTrackerModal from './GovtDBTTrackerModal';

const Header = () => {
  const [walletAddress, setWalletAddress] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [showGovtTracker, setShowGovtTracker] = useState(false);

  const handleConnectWallet = async () => {
    setIsConnecting(true);
    try {
      await switchToHardhat();
      const { address } = await connectWallet();
      setWalletAddress(address);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      alert(error.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const truncateAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <header className="shadow-lg font-sans">
      {/* 🇮🇳 Top Official Indian Government Banner Strip */}
      <div className="bg-slate-950 text-slate-300 text-[11px] py-1.5 px-4 border-b border-slate-800">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1 font-bold text-slate-100">
              <span>🇮🇳</span>
              <span>GOVERNMENT OF INDIA</span>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">MINISTRY OF AGRICULTURE & FARMERS WELFARE</span>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1.5 text-amber-400 font-semibold">
              <PhoneCall className="w-3 h-3" />
              <span>Kisan Help Centre: <strong>14447</strong></span>
            </div>
            <span className="text-slate-600">|</span>
            <button
              onClick={() => setShowGovtTracker(true)}
              className="text-emerald-400 font-bold hover:underline flex items-center space-x-1"
            >
              <Search className="w-3 h-3" />
              <span>Public DBT Audit Portal</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Navigation Header */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-950 to-slate-950 text-white py-4">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-3.5">
              <div className="bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-950/50">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 bg-clip-text text-transparent">
                    AgriTrust AI
                  </h1>
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded border border-emerald-500/30">
                    PMFBY MST L1
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Parametric Crop Insurance &amp; Direct Benefit Transfer (DBT) Escrow Portal
                </p>
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowGovtTracker(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20"
              >
                <Search className="w-4 h-4" />
                <span>Track DBT Claim Status</span>
              </button>

              {walletAddress ? (
                <div className="bg-slate-900 border border-slate-700 px-4 py-2 rounded-xl flex items-center space-x-2 text-xs font-mono">
                  <Wallet className="w-4 h-4 text-emerald-400" />
                  <span>{truncateAddress(walletAddress)}</span>
                </div>
              ) : (
                <button
                  onClick={handleConnectWallet}
                  disabled={isConnecting}
                  className="bg-slate-900 border border-emerald-500/40 hover:bg-slate-800 text-emerald-400 px-4 py-2 rounded-xl font-bold transition-all flex items-center space-x-2 disabled:opacity-50 text-xs"
                >
                  <Wallet className="w-4 h-4" />
                  <span>{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Govt DBT Tracker Modal */}
      <GovtDBTTrackerModal
        isOpen={showGovtTracker}
        onClose={() => setShowGovtTracker(false)}
      />
    </header>
  );
};

export default Header;
