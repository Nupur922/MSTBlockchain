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
    <header className="font-sans">
      {/* 🇮🇳 Top Official Indian Government Banner Strip */}
      <div className="bg-white border-b border-gray-100 text-[11px] py-1.5 px-4">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1 font-bold text-gray-700">
              <span>🇮🇳</span>
              <span>GOVERNMENT OF INDIA</span>
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-500">MINISTRY OF AGRICULTURE</span>
            <span className="text-gray-300">|</span>
            <span className="text-emerald-700 font-bold">PMFBY DIRECT BENEFIT TRANSFER (DBT) ESCROW PORTAL</span>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1.5 text-emerald-600 font-semibold">
              <PhoneCall className="w-3 h-3" />
              <span>Toll-Free Kisan Help Centre: <strong>14447</strong></span>
            </div>
            <span className="text-gray-300">|</span>
            <button
              onClick={() => setShowGovtTracker(true)}
              className="text-emerald-600 font-bold hover:underline flex items-center space-x-1"
            >
              <Search className="w-3 h-3" />
              <span>Public DBT Audit Portal</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Navigation Header */}
      <div className="bg-white shadow-sm border-b border-gray-100 py-4">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-3.5">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 rounded-xl shadow-md shadow-emerald-100">
                <ShieldCheck className="w-8 h-8 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-2xl font-black tracking-tight text-gray-900">
                    AgriTrust AI
                  </h1>
                  <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-md border border-emerald-200">
                    PMFBY MST L1
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Parametric Crop Insurance &amp; Instant Satellite Disaster Relief Escrow on MST Blockchain
                </p>
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowGovtTracker(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-sm"
              >
                <Search className="w-4 h-4" />
                <span>Track DBT Claim Status</span>
              </button>

              {walletAddress ? (
                <div className="bg-emerald-50 border-2 border-emerald-200 px-4 py-2 rounded-xl flex items-center space-x-2 text-xs font-mono text-emerald-700">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                  <span>{truncateAddress(walletAddress)}</span>
                </div>
              ) : (
                <button
                  onClick={handleConnectWallet}
                  disabled={isConnecting}
                  className="bg-white border-2 border-emerald-200 hover:border-emerald-400 text-emerald-600 px-4 py-2 rounded-xl font-bold transition-all flex items-center space-x-2 disabled:opacity-50 text-xs"
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
