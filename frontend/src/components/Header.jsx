import React, { useState } from 'react';
import { Sprout, Wallet } from 'lucide-react';
import { connectWallet, switchToHardhat } from '../utils/web3';

const Header = () => {
  const [walletAddress, setWalletAddress] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnectWallet = async () => {
    setIsConnecting(true);
    try {
      // First switch to Hardhat network
      await switchToHardhat();
      
      // Then connect wallet
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
    <header className="bg-gradient-to-r from-primary to-secondary text-white shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-3">
            <div className="bg-white p-2 rounded-lg">
              <Sprout className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">AgriTrust AI</h1>
              <p className="text-sm text-green-100">Parametric Crop Insurance on MST Blockchain</p>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center space-x-3">
            {/* Open on Phone Badge */}
            <a
              href="http://10.60.4.237:3000"
              target="_blank"
              rel="noopener noreferrer"
              title="Open http://10.60.4.237:3000 on your mobile browser (connected to same WiFi)"
              className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-lg text-xs font-semibold backdrop-blur-sm border border-white/20 transition-all text-white"
            >
              <span>📱 Phone: 10.60.4.237:3000</span>
            </a>

            {walletAddress ? (
              <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg flex items-center space-x-2">
                <Wallet className="w-5 h-5" />
                <span className="font-mono">{truncateAddress(walletAddress)}</span>
              </div>
            ) : (
              <button
                onClick={handleConnectWallet}
                disabled={isConnecting}
                className="bg-white text-primary px-5 py-2 rounded-lg font-semibold hover:bg-green-50 transition-colors flex items-center space-x-2 disabled:opacity-50 text-sm"
              >
                <Wallet className="w-4 h-4" />
                <span>{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
