import React, { useState } from 'react';
import { Wallet, ShieldCheck, Search, PhoneCall } from 'lucide-react';
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
    <header className="sticky top-0 z-40 bg-white shadow-sm">
      {/* 🇮🇳 Tricolor Strip (3px) */}
      <div className="h-[3px] flex">
        <div className="flex-1 bg-orange-400" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-green-600" />
      </div>

      {/* Government Banner Line */}
      <div className="bg-white border-b border-gray-100 text-[10px] py-2 px-4">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2 flex-wrap justify-center sm:justify-start">
            <span className="flex items-center space-x-1 font-bold text-gray-700">
              <span>🇮🇳</span>
              <span>GOVERNMENT OF INDIA</span>
            </span>
            <span className="text-gray-300 hidden sm:inline">|</span>
            <span className="text-gray-600 font-medium">MINISTRY OF AGRICULTURE</span>
            <span className="text-gray-300 hidden sm:inline">|</span>
            <span className="text-emerald-700 font-bold">PMFBY DIRECT BENEFIT TRANSFER (DBT) ESCROW PORTAL</span>
          </div>

          <div className="flex items-center space-x-3 text-[10px]">
            <div className="flex items-center space-x-1 text-emerald-600 font-semibold">
              <PhoneCall className="w-3 h-3" />
              <span>Toll-Free Kisan Help Centre: <strong>14447</strong></span>
            </div>
            <span className="text-gray-300 hidden sm:inline">|</span>
            <button
              onClick={() => setShowGovtTracker(true)}
              className="text-emerald-600 font-bold hover:underline flex items-center space-x-1 transition-colors"
            >
              <Search className="w-3 h-3" />
              <span>Public DBT Audit Portal</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="bg-white py-3">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2 rounded-xl shadow-md">
                <ShieldCheck className="w-7 h-7 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl font-black tracking-tight text-gray-900">
                    AgriTrust AI
                  </h1>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-bold rounded border border-emerald-200 uppercase tracking-wider">
                    PMFBY MST L1
                  </span>
                </div>
                <p className="text-[10px] text-gray-600 mt-0.5 font-medium">
                  Parametric Crop Insurance &amp; Instant Satellite Disaster Relief Escrow on MST Blockchain
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowGovtTracker(true)}
                className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-all shadow-sm"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Track DBT Status</span>
              </button>

              {walletAddress ? (
                <div className="bg-emerald-50 border-2 border-emerald-200 px-3 py-2 rounded-lg flex items-center space-x-2 text-xs font-mono text-emerald-700">
                  <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="font-bold">{truncateAddress(walletAddress)}</span>
                </div>
              ) : (
                <button
                  onClick={handleConnectWallet}
                  disabled={isConnecting}
                  className="bg-white border-2 border-emerald-200 hover:border-emerald-400 text-emerald-700 px-3 py-2 rounded-lg font-bold transition-all flex items-center space-x-2 disabled:opacity-50 text-xs shadow-sm"
                >
                  <Wallet className="w-3.5 h-3.5" />
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
