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

  const cards = [
    {
      title: 'Escrow Pool Balance',
      value: data.escrowBalance ?? '—',
      icon:  DollarSign,
      color: 'bg-blue-500',
    },
    {
      title: 'Enrolled Farm Plots',
      value: data.plotCount ?? '—',
      icon:  Users,
      color: 'bg-green-500',
    },
    {
      title: 'Total Claims Paid',
      value: data.claimsPaid ?? '—',
      icon:  CheckCircle,
      color: 'bg-purple-500',
    },
  ];

  const badge = data.live
    ? <span className="text-xs font-semibold text-green-600">⛓ Live</span>
    : <span className="text-xs font-semibold text-gray-400">Demo</span>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.title} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className={`${card.color} p-3 rounded-lg`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              {badge}
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1">{card.title}</h3>
            {data.loading
              ? <div className="flex items-center space-x-2 mt-2"><Loader2 className="w-5 h-5 text-gray-400 animate-spin" /><span className="text-gray-400 text-sm">Loading…</span></div>
              : <p className="text-3xl font-bold text-gray-900">{card.value}</p>
            }
          </div>
        );
      })}
    </div>
  );
};

export default StatCards;
