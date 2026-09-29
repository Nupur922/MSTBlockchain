import React, { useState, useEffect } from 'react';
import { Sprout, Activity, ExternalLink, RefreshCw } from 'lucide-react';
import { ethers } from 'ethers';

const RPC_URL = import.meta.env?.VITE_MST_RPC_URL || 'http://127.0.0.1:8545';

const Header = () => {
  const [chainStatus, setChainStatus] = useState('connecting');
  const [blockNumber, setBlockNumber] = useState(null);

  useEffect(() => {
    let interval;
    const check = async () => {
      try {
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const bn = await provider.getBlockNumber();
        setBlockNumber(bn);
        setChainStatus('live');
      } catch {
        setChainStatus('offline');
      }
    };
    check();
    interval = setInterval(check, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-white border-b border-slate-200 shadow-sm">
      {/* Tricolor top strip */}
      <div className="h-1 w-full flex">
        <div className="w-1/3 bg-[#FF9933]" />
        <div className="w-1/3 bg-white" />
        <div className="w-1/3 bg-[#138808]" />
      </div>

      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">

          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2 rounded-xl">
              <Sprout className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  AgriTrust<span className="text-emerald-600">.AI</span>
                </h1>
                <span className="hidden sm:block text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200 uppercase tracking-wider">
                  v3.0
                </span>
                <span className="hidden sm:block text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full border border-blue-200 uppercase tracking-wider">
                  PMFBY
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden md:block">Autonomous Parametric Crop Insurance · MST Blockchain</p>
            </div>
          </div>

          {/* Right side nav */}
          <div className="flex items-center gap-2">

            {/* Chain status pill */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
              chainStatus === 'live'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : chainStatus === 'offline'
                ? 'bg-red-50 text-red-600 border-red-200'
                : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                chainStatus === 'live' ? 'bg-emerald-500 animate-pulse' :
                chainStatus === 'offline' ? 'bg-red-400' : 'bg-slate-400'
              }`} />
              {chainStatus === 'live'
                ? `Block #${blockNumber?.toLocaleString()}`
                : chainStatus === 'offline'
                ? 'Chain Offline'
                : 'Connecting…'}
            </div>

            {/* MSTScan explorer */}
            <a
              href="https://testnet.mstscan.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors border border-slate-200"
            >
              <ExternalLink className="w-3 h-3" />
              MSTScan
            </a>

            {/* Krishi Mitra Portal */}
            <a
              href="#/krishi"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm"
            >
              <span>👨‍🌾</span>
              <span className="hidden sm:inline">Krishi Mitra</span>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
