import React, { useState, useEffect } from 'react';
import { DollarSign, Users, CheckCircle, Loader2 } from 'lucide-react';
import { ethers } from 'ethers';
import { getFarmRegistryContract, getAgriTrustVaultContract } from '../utils/web3';

const HARDHAT_RPC_URL = 'http://127.0.0.1:8545';
const REFRESH_MS      = 10000;

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
      const provider = new ethers.JsonRpcProvider(HARDHAT_RPC_URL);
      await provider.getNetwork();

      const vault    = getAgriTrustVaultContract(provider);
      const registry = getFarmRegistryContract(provider);
      if (!vault || !registry) throw new Error('Contracts not ready');

      const [balanceWei, plotCount, claimsPaidWei] = await Promise.all([
        vault.getVaultBalance(),       // ✅ Janaki's real method (not getEscrowBalance)
        registry.getPlotCount(),       // ✅ Janaki's real method (not plotCounter)
        vault.totalClaimsPaidMST(),    // ✅ Janaki's real state var
      ]);

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

  const liveBadge = data.live
    ? (
      <span className="flex items-center space-x-1 bg-white/20 text-white text-[10px] font-bold rounded-full px-2 py-0.5">
        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse inline-block" />
        <span>LIVE</span>
      </span>
    )
    : (
      <span className="flex items-center space-x-1 bg-white/20 text-white text-[10px] font-bold rounded-full px-2 py-0.5">
        <span className="w-1.5 h-1.5 bg-white/70 rounded-full inline-block" />
        <span>DEMO</span>
      </span>
    );

  const cards = [
    {
      title:    'Escrow Pool Balance',
      value:    data.escrowBalance ?? '—',
      subtitle: 'MST Blockchain Vault',
      icon:     DollarSign,
      gradient: 'bg-gradient-to-br from-emerald-500 to-teal-600',
      shadow:   'shadow-emerald-200',
    },
    {
      title:    'Enrolled Farm Plots',
      value:    data.plotCount ?? '—',
      subtitle: 'Active Policies',
      icon:     Users,
      gradient: 'bg-gradient-to-br from-blue-500 to-indigo-600',
      shadow:   'shadow-blue-200',
    },
    {
      title:    'Total Claims Paid',
      value:    data.claimsPaid ?? '—',
      subtitle: 'DBT Disbursed',
      icon:     CheckCircle,
      gradient: 'bg-gradient-to-br from-purple-500 to-pink-600',
      shadow:   'shadow-purple-200',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className={`${card.gradient} rounded-2xl p-6 shadow-lg ${card.shadow} hover:shadow-xl transition-shadow`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 rounded-xl p-2">
                <Icon className="w-6 h-6 text-white" />
              </div>
              {liveBadge}
            </div>
            <h3 className="text-white/80 text-sm font-semibold mb-1">{card.title}</h3>
            {data.loading ? (
              <div className="flex items-center space-x-2 mt-2">
                <Loader2 className="w-5 h-5 text-white/70 animate-spin" />
                <span className="text-white/70 text-sm">Loading…</span>
              </div>
            ) : (
              <>
                <p className="text-3xl font-black text-white">{card.value}</p>
                <p className="text-white/60 text-xs mt-1 font-medium">{card.subtitle}</p>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StatCards;
