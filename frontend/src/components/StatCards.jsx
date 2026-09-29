import React, { useState, useEffect } from 'react';
import { TrendingUp, MapPin, CheckCircle, Zap } from 'lucide-react';
import { ethers } from 'ethers';
import { getFarmRegistryContract, getAgriTrustVaultContract, RPC_URL, HARDHAT_RPC_URL } from '../utils/web3';

const REFRESH_MS = 10000;

const StatCards = () => {
  const [data, setData] = useState({
    escrowBalance: null,
    plotCount:     null,
    claimsPaid:    null,
    loading:       true,
    live:          false,
  });

  const fetchStats = async () => {
    try {
      let provider;
      try {
        provider = new ethers.JsonRpcProvider(RPC_URL);
        await provider.getNetwork();
      } catch {
        provider = new ethers.JsonRpcProvider(HARDHAT_RPC_URL);
        await provider.getNetwork();
      }

      const vault    = getAgriTrustVaultContract(provider);
      const registry = getFarmRegistryContract(provider);
      if (!vault || !registry) throw new Error('Contracts not ready');

      let balanceWei = 0n;
      try {
        balanceWei = await vault.getVaultBalance();
      } catch {
        try {
          balanceWei = await vault.getEscrowBalance();
        } catch {}
      }

      let plotCount = 0n;
      try {
        plotCount = await registry.getPlotCount();
      } catch {}

      let claimsPaidWei = 0n;
      try {
        claimsPaidWei = await vault.totalClaimsPaidMST();
      } catch {}

      setData({
        escrowBalance: parseFloat(ethers.formatEther(balanceWei)).toFixed(3) + ' MST',
        plotCount:     plotCount.toString(),
        claimsPaid:    parseFloat(ethers.formatEther(claimsPaidWei)).toFixed(2) + ' MST',
        loading:       false,
        live:          true,
      });
    } catch {
      // Hardhat offline — fallback to mock
      setData({
        escrowBalance: '500.000 MST',
        plotCount:     '1,234',
        claimsPaid:    '0.00 MST',
        loading:       false,
        live:          false,
      });
    }
  };

  useEffect(() => {
    fetchStats();
    const id = setInterval(fetchStats, REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  const cards = [
    {
      title:    'Total Escrow TVL',
      value:    data.escrowBalance ?? '—',
      subtitle: 'Total Value Locked',
      icon:     TrendingUp,
      gradient: 'from-emerald-400 to-teal-500',
      iconBg:   'bg-emerald-500/20',
    },
    {
      title:    'Plots Registered',
      value:    data.plotCount ?? '—',
      subtitle: 'Active Farm Plots',
      icon:     MapPin,
      gradient: 'from-teal-400 to-cyan-500',
      iconBg:   'bg-teal-500/20',
    },
    {
      title:    'Payouts Executed',
      value:    data.claimsPaid ?? '—',
      subtitle: 'Relief Disbursed',
      icon:     CheckCircle,
      gradient: 'from-amber-400 to-orange-500',
      iconBg:   'bg-amber-500/20',
    },
    {
      title:    'Avg Settlement Time',
      value:    '< 2',
      subtitle: 'Seconds',
      icon:     Zap,
      gradient: 'from-purple-400 to-pink-500',
      iconBg:   'bg-purple-500/20',
      isStatic: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const isLoading = !card.isStatic && data.loading;
        
        return (
          <div
            key={card.title}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-all group"
          >
            {/* Icon with gradient background */}
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.gradient} ${card.iconBg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <Icon className="w-6 h-6 text-white" />
            </div>

            {/* Label */}
            <div className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-1">
              {card.title}
            </div>

            {/* Value */}
            {isLoading ? (
              <div className="h-9 flex items-center">
                <div className="w-5 h-5 border-2 border-gray-300 border-t-emerald-500 rounded-full animate-spin" />
              </div>
            ) : (
              <div className="text-3xl font-black text-gray-900 mb-1">
                {card.value}
              </div>
            )}

            {/* Subtitle */}
            <div className="text-xs text-gray-500 font-medium">
              {card.subtitle}
            </div>

            {/* Live indicator for non-static cards */}
            {!card.isStatic && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center space-x-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${data.live ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                  <span className={`text-[10px] font-bold uppercase tracking-wide ${data.live ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {data.live ? 'Live Chain Data' : 'Demo Mode'}
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StatCards;
