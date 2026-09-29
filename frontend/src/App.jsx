import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';

import Header               from './components/Header';
import StatCards            from './components/StatCards';
import FarmMap              from './components/FarmMap';
import PlotTelemetry        from './components/PlotTelemetry';
import DemoControlPanel     from './components/DemoControlPanel';
import VoiceAlertModal      from './components/VoiceAlertModal';
import AePSCashoutModal     from './components/AePSCashoutModal';
import QRScannerModal       from './components/QRScannerModal';
import FarmerEnrollmentModal from './components/FarmerEnrollmentModal';
import DeployTestnetModal    from './components/DeployTestnetModal';

import { getAgriTrustVaultContract } from './utils/web3';

const HARDHAT_RPC_URL              = 'http://127.0.0.1:8545';
const EVENT_LISTENER_RETRY_MS      = 8000;

function App() {
  // ── BridgeKey wallet state ───────────────────────────────────────────────
  const [walletState, setWalletState] = useState({
    isConnected: false,
    address: '',
    chainId: null,
    isMSTTestnet: false,
    provider: null,
    signer: null,
  });

  const handleWalletChange = useCallback((newState) => {
    setWalletState((prev) => ({ ...prev, ...newState }));
  }, []);

  // ── Scenario / map state ──────────────────────────────────────────────────
  const [activeScenario,  setActiveScenario]  = useState(null);
  const [qrScannedPlot,   setQrScannedPlot]   = useState(null);

  // ── Payout event data (populated from on-chain or demo) ───────────────────
  const [payoutEvent, setPayoutEvent] = useState({
    policyId:      null,
    plotId:        null,
    farmer:        null,
    payoutAmount:  null,   // ETH string
    proofHash:     null,
    timestamp:     null,
  });

  // ── Modal visibility ──────────────────────────────────────────────────────
  const [showVoice,    setShowVoice]    = useState(false);
  const [showAePS,     setShowAePS]     = useState(false);
  const [showQR,       setShowQR]       = useState(false);
  const [showEnroll,   setShowEnroll]   = useState(false);
  const [showDeploy,   setShowDeploy]   = useState(false);

  // ── Chain connection ──────────────────────────────────────────────────────
  const [chainStatus,  setChainStatus]  = useState('disconnected');
  // 'disconnected' | 'listening' | 'error'

  // Refs to avoid stale closures in setInterval
  const chainStatusRef = useRef('disconnected');
  const contractRef    = useRef(null);
  const providerRef    = useRef(null);

  // ── Map refresh trigger ───────────────────────────────────────────────────
  const [mapRefreshKey, setMapRefreshKey] = useState(0);

  // ─── Event Listener (MST Testnet + Local Hardhat) ─────────────────────────

  const setupEventListener = useCallback(async () => {
    try {
      // 1. Try MST Testnet RPC first
      let provider = null;
      try {
        provider = new ethers.JsonRpcProvider('https://testnetrpc.mstblockchain.com');
        await provider.getNetwork();
      } catch (mstRpcErr) {
        // Fallback to local hardhat node
        provider = new ethers.JsonRpcProvider(HARDHAT_RPC_URL);
        await provider.getNetwork();
      }

      const contract = getAgriTrustVaultContract(provider);
      if (!contract) {
        chainStatusRef.current = 'error';
        setChainStatus('error');
        return;
      }

      providerRef.current  = provider;
      contractRef.current  = contract;

      contract.on('DisasterPayoutExecuted',
        (policyId, plotId, farmer, payoutAmountMST, proofHash, timestamp) => {
          console.log('🚨 DisasterPayoutExecuted on MST Blockchain:', {
            policyId: policyId.toString(),
            plotId:   plotId.toString(),
            farmer,
            amount:   ethers.formatEther(payoutAmountMST),
          });

          setPayoutEvent({
            policyId:     policyId.toString(),
            plotId:       plotId.toString(),
            farmer,
            payoutAmount: ethers.formatEther(payoutAmountMST),
            proofHash:    proofHash,
            timestamp:    Number(timestamp),
          });
          setShowVoice(true);
          setShowAePS(true);
        }
      );

      chainStatusRef.current = 'listening';
      setChainStatus('listening');
      console.log('✅ Listening for DisasterPayoutExecuted on AgriTrustVault');
    } catch (err) {
      chainStatusRef.current = 'disconnected';
      setChainStatus('disconnected');
      console.info('Node not reachable, retrying…', err.message);
    }
  }, []);

  useEffect(() => {
    setupEventListener();
    const retry = setInterval(() => {
      if (chainStatusRef.current !== 'listening') setupEventListener();
    }, EVENT_LISTENER_RETRY_MS);
    return () => {
      clearInterval(retry);
      contractRef.current?.removeAllListeners?.('DisasterPayoutExecuted');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Demo Scenario Handler ────────────────────────────────────────────────

  const handleTriggerScenario = useCallback(async (scenarioId) => {
    if (scenarioId === 'reset') {
      setActiveScenario(null);
      return;
    }
    setActiveScenario(scenarioId);

    let mockAmount = '0.75';
    let mockPlotId = '2';
    let stateName = 'Bihar';

    if (scenarioId === 'assam-flood') {
      mockAmount = '0.5';
      mockPlotId = '1';
      stateName = 'Assam';
    } else if (scenarioId === 'bihar-flood') {
      mockAmount = '0.75';
      mockPlotId = '2';
      stateName = 'Bihar';
    } else if (scenarioId === 'maharashtra-flood') {
      mockAmount = '0.85';
      mockPlotId = '3';
      stateName = 'Maharashtra';
    } else if (scenarioId === 'gujarat-flood') {
      mockAmount = '0.65';
      mockPlotId = '4';
      stateName = 'Gujarat';
    } else if (scenarioId === 'karnataka-flood') {
      mockAmount = '0.70';
      mockPlotId = '5';
      stateName = 'Karnataka';
    } else if (scenarioId === 'punjab-flood') {
      mockAmount = '0.90';
      mockPlotId = '6';
      stateName = 'Punjab';
    }

    // Pre-populate payout event for demo modals
    setPayoutEvent({
      policyId:     '1',
      plotId:       mockPlotId,
      farmer:       '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      payoutAmount: mockAmount,
      proofHash:    null,
      timestamp:    Math.floor(Date.now() / 1000),
      stateName:    stateName,
    });

    // Open modals immediately in demo mode
    // (If chain is live and signed proof is available, the real event listener
    //  fires from triggerDisasterPayout() in sentinel_agent.py instead)
    setShowVoice(true);
    setShowAePS(true);
  }, []);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handlePlotScanned = useCallback((plotData) => {
    setQrScannedPlot(plotData);
    setShowQR(false);
  }, []);

  const handleEnrolled = useCallback(() => {
    // Force FarmMap to re-fetch on-chain plots by bumping key
    setMapRefreshKey(k => k + 1);
    setShowEnroll(false);
  }, []);

  // ─── Chain Status Badge ───────────────────────────────────────────────────
  const chainBadge = () => {
    if (chainStatus === 'listening') return (
      <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
        <span>Hardhat Local · Listening</span>
      </span>
    );
    if (chainStatus === 'error') return (
      <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
        <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
        <span>Contract Error</span>
      </span>
    );
    return (
      <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs font-semibold">
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
        <span>Demo Mode</span>
      </span>
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <Header walletState={walletState} onWalletChange={handleWalletChange} />

      {/* ── Modals ── */}
      <VoiceAlertModal
        isOpen={showVoice}
        onClose={() => setShowVoice(false)}
        payoutAmount={payoutEvent.payoutAmount}
        plotId={payoutEvent.plotId}
        stateName={payoutEvent.stateName}
      />
      <AePSCashoutModal
        isOpen={showAePS}
        onClose={() => setShowAePS(false)}
        payoutAmount={payoutEvent.payoutAmount}
        plotId={payoutEvent.plotId}
        farmerAddress={payoutEvent.farmer}
      />
      <QRScannerModal
        isOpen={showQR}
        onClose={() => setShowQR(false)}
        onPlotScanned={handlePlotScanned}
      />
      <FarmerEnrollmentModal
        isOpen={showEnroll}
        onClose={() => setShowEnroll(false)}
        onEnrolled={handleEnrolled}
        walletState={walletState}
      />
      <DeployTestnetModal
        isOpen={showDeploy}
        onClose={() => setShowDeploy(false)}
        onContractsDeployed={() => setMapRefreshKey((k) => k + 1)}
      />

      {/* ── Dashboard ── */}
      <main className="container mx-auto px-4 py-8">
        <DemoControlPanel onTriggerScenario={handleTriggerScenario} />
        <StatCards />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Map column */}
          <div>
            {/* Deploy + QR Scan + Enroll buttons */}
            <div className="flex flex-wrap justify-end gap-2 mb-2">
              <button
                onClick={() => setShowDeploy(true)}
                className="flex items-center space-x-1.5 px-3 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 font-bold text-xs rounded-lg transition-all transform hover:scale-105 shadow-md"
              >
                <span>🚀 Deploy to MST Testnet</span>
              </button>
              <button
                onClick={() => setShowQR(true)}
                className="flex items-center space-x-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-all transform hover:scale-105 shadow-md"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                <span>Scan / Upload QR</span>
              </button>
              <button
                onClick={() => setShowEnroll(true)}
                className="flex items-center space-x-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-all transform hover:scale-105 shadow-md"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                <span>Enroll Farmer</span>
              </button>
            </div>

            <FarmMap
              key={mapRefreshKey}
              qrScannedPlot={qrScannedPlot}
              activeScenario={activeScenario}
              onEnrollClick={() => setShowEnroll(true)}
            />
          </div>

          <PlotTelemetry />
        </div>

        {/* Footer */}
        <div className="mt-8 bg-white rounded-xl shadow-md p-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">About AgriTrust AI</h3>
              <p className="text-gray-600 max-w-3xl text-sm">
                AgriTrust AI is a parametric crop insurance platform on MST Blockchain.
                Krishi Mitras register farmer plots → NEWRRO AI Sentinel oracle monitors
                Sentinel-1 SAR + Sentinel-2 NDVI + IMD rainfall → 2-of-3 consensus →
                EIP-191 signed proof → <code>triggerDisasterPayout()</code> →
                ETH transferred to farmer's wallet in &lt;2 seconds.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                <span className="px-2 py-1 bg-blue-50   rounded">⛓ FarmRegistry Contract</span>
                <span className="px-2 py-1 bg-purple-50 rounded">🏦 AgriTrustVault (ECDSA)</span>
                <span className="px-2 py-1 bg-green-50  rounded">🛰 NEWRRO AI Sentinel Oracle</span>
                <span className="px-2 py-1 bg-orange-50 rounded">📱 AePS Cashout (Aadhaar)</span>
                <span className="px-2 py-1 bg-yellow-50 rounded">🌾 Krishi Mitra Enrollment</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 mb-1">Connected Network</p>
              <p className="font-semibold text-gray-900 mb-2">Hardhat Local (Chain ID: 31337)</p>
              {chainBadge()}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
