import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';

import Header               from './components/Header';
import StatCards            from './components/StatCards';
import FarmMap              from './components/FarmMap';
import PlotTelemetry        from './components/PlotTelemetry';
import MultiHazardAnalyzer  from './components/MultiHazardAnalyzer';
import DemoControlPanel     from './components/DemoControlPanel';
import VoiceAlertModal      from './components/VoiceAlertModal';
import AePSCashoutModal     from './components/AePSCashoutModal';
import QRScannerModal       from './components/QRScannerModal';
import FarmerEnrollmentModal from './components/FarmerEnrollmentModal';
import PDFEvidenceModal     from './components/PDFEvidenceModal';
import { FileText }          from 'lucide-react';

import { getAgriTrustVaultContract } from './utils/web3';

const HARDHAT_RPC_URL              = 'http://127.0.0.1:8545';
const EVENT_LISTENER_RETRY_MS      = 8000;

function App() {
  // ── Scenario / map state ──────────────────────────────────────────────────
  const [activeScenario,  setActiveScenario]  = useState(null);
  const [qrScannedPlot,   setQrScannedPlot]   = useState(null);

  // ── Active Multi-Hazard Telemetry State ─────────────────────────────────────
  const [activeTelemetry, setActiveTelemetry] = useState({
    ndvi_score: 0.75,
    sar_backscatter_db: -10.5,
    days_submerged: 0,
    ndwi_score: -0.12,
    lst_temp_c: 28.5,
    status: "HEALTHY_GROWING_CROP",
    payout_ratio: 0.0,
    hazard_type: "NONE"
  });

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
  const [showVoice,       setShowVoice]       = useState(false);
  const [showAePS,        setShowAePS]        = useState(false);
  const [showQR,          setShowQR]          = useState(false);
  const [showEnroll,      setShowEnroll]      = useState(false);
  const [showPDFEvidence, setShowPDFEvidence] = useState(false);

  // ── Chain connection ──────────────────────────────────────────────────────
  const [chainStatus,  setChainStatus]  = useState('disconnected');
  const chainStatusRef = useRef('disconnected');
  const contractRef    = useRef(null);
  const providerRef    = useRef(null);

  // ── Map refresh trigger ───────────────────────────────────────────────────
  const [mapRefreshKey, setMapRefreshKey] = useState(0);

  // ─── Event Listener ──────────────────────────────────────────────────────

  const setupEventListener = useCallback(async () => {
    try {
      const provider = new ethers.JsonRpcProvider(HARDHAT_RPC_URL);
      await provider.getNetwork();

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
          console.log('🚨 DisasterPayoutExecuted:', {
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
      console.info('Hardhat not reachable, retrying…', err.message);
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
  }, []);

  // ─── Multi-Hazard Scenario Handler ───────────────────────────────────────

  const handleTriggerScenario = useCallback(async (scenarioId) => {
    if (scenarioId === 'reset') {
      setActiveScenario(null);
      setActiveTelemetry({
        ndvi_score: 0.75,
        sar_backscatter_db: -10.5,
        days_submerged: 0,
        ndwi_score: -0.12,
        lst_temp_c: 28.5,
        status: "HEALTHY_GROWING_CROP",
        payout_ratio: 0.0,
        hazard_type: "NONE"
      });
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
      setActiveTelemetry({
        ndvi_score: 0.28,
        sar_backscatter_db: -22.4,
        days_submerged: 6,
        ndwi_score: 0.35,
        lst_temp_c: 24.0,
        status: "CRITICAL_FLOOD_SUBMERSION",
        payout_ratio: 0.70,
        hazard_type: "MONSOON_FLOOD"
      });
    } else if (scenarioId === 'bihar-flood') {
      mockAmount = '0.75';
      mockPlotId = '2';
      stateName = 'Bihar';
      setActiveTelemetry({
        ndvi_score: 0.18,
        sar_backscatter_db: -24.1,
        days_submerged: 9,
        ndwi_score: 0.45,
        lst_temp_c: 25.5,
        status: "TOTAL_CROP_DESTRUCTION",
        payout_ratio: 1.00,
        hazard_type: "MONSOON_FLOOD"
      });
    } else if (scenarioId === 'maharashtra-drought') {
      mockAmount = '0.50';
      mockPlotId = '3';
      stateName = 'Maharashtra';
      setActiveTelemetry({
        ndvi_score: 0.32,
        sar_backscatter_db: -8.5,
        days_submerged: 0,
        ndwi_score: -0.45,
        lst_temp_c: 38.5,
        status: "FLASH_DROUGHT_MOISTURE_STRESS",
        payout_ratio: 0.50,
        hazard_type: "FLASH_DROUGHT"
      });
    } else if (scenarioId === 'punjab-heatwave') {
      mockAmount = '0.40';
      mockPlotId = '4';
      stateName = 'Punjab';
      setActiveTelemetry({
        ndvi_score: 0.42,
        sar_backscatter_db: -9.0,
        days_submerged: 0,
        ndwi_score: -0.32,
        lst_temp_c: 44.2,
        status: "SCORCHING_HEATWAVE_WHEAT_STRESS",
        payout_ratio: 0.40,
        hazard_type: "SCORCHING_HEATWAVE"
      });
    } else if (scenarioId === 'karnataka-flood') {
      mockAmount = '0.70';
      mockPlotId = '5';
      stateName = 'Karnataka';
      setActiveTelemetry({
        ndvi_score: 0.25,
        sar_backscatter_db: -18.2,
        days_submerged: 5,
        ndwi_score: 0.10,
        lst_temp_c: 27.0,
        status: "CRITICAL_INUNDATION",
        payout_ratio: 0.70,
        hazard_type: "MONSOON_FLOOD"
      });
    }

    setPayoutEvent({
      policyId:     '1',
      plotId:       mockPlotId,
      farmer:       '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      payoutAmount: mockAmount,
      proofHash:    null,
      timestamp:    Math.floor(Date.now() / 1000),
      stateName:    stateName,
    });

    setShowVoice(true);
    setShowAePS(true);

    try {
      fetch('http://127.0.0.1:8000/api/trigger-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: scenarioId }),
      }).catch(() => {});
    } catch (_) {}
  }, []);

  const handlePlotScanned = useCallback((plotData) => {
    setQrScannedPlot(plotData);
    setShowQR(false);
  }, []);

  const handleEnrolled = useCallback(() => {
    setMapRefreshKey(k => k + 1);
    setShowEnroll(false);
  }, []);

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* ── Modals ── */}
      <VoiceAlertModal
        isOpen={showVoice}
        onClose={() => setShowVoice(false)}
        onOpenPDF={() => setShowPDFEvidence(true)}
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
      />
      <PDFEvidenceModal
        isOpen={showPDFEvidence}
        onClose={() => setShowPDFEvidence(false)}
        plotData={qrScannedPlot}
        payoutEvent={payoutEvent}
      />

      {/* ── Dashboard Main ── */}
      <main className="container mx-auto px-4 py-8 space-y-8">
        <DemoControlPanel onTriggerScenario={handleTriggerScenario} />
        <StatCards />

        {/* V3 Multi-Hazard Analyzer Widget */}
        <MultiHazardAnalyzer activeTelemetry={activeTelemetry} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <div className="flex flex-wrap justify-end gap-2 mb-2">
              <button
                onClick={() => setShowPDFEvidence(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-all transform hover:scale-105 shadow-md"
                title="Download Official Satellite Audit Certificate (PDF Evidence)"
              >
                <FileText className="w-4 h-4" />
                <span>Audit Certificate (PDF Evidence)</span>
              </button>
              <button
                onClick={() => setShowQR(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-all transform hover:scale-105 shadow-md"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                <span>Scan / Upload Land Record QR</span>
              </button>
              <button
                onClick={() => setShowEnroll(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-all transform hover:scale-105 shadow-md"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

          <PlotTelemetry activeTelemetry={activeTelemetry} />
        </div>

        {/* Footer */}
        <div className="mt-8 bg-white rounded-xl shadow-md p-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">About AgriTrust AI (Version 3.0)</h3>
              <p className="text-gray-600 max-w-3xl text-sm">
                AgriTrust AI V3 is a Multi-Hazard Parametric Crop Insurance &amp; Disaster Relief Escrow platform on MST Blockchain.
                Monitors Sentinel-1 SAR (Floods) + Sentinel-2 NDWI (Flash Droughts) + Thermal LST (Heatwaves) + IMD rainfall →
                2-of-3 Oracle Consensus → EIP-191 proof verification → instant MST payout in &lt;2 seconds.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                <span className="px-2 py-1 bg-blue-50   rounded">⛓ FarmRegistry &amp; AgriTrustVault</span>
                <span className="px-2 py-1 bg-purple-50 rounded">🛰 NEWRRO Multi-Hazard AI Oracle</span>
                <span className="px-2 py-1 bg-green-50  rounded">🌊 Flood SAR + ☀️ Drought NDWI + 🔥 Heatwave LST</span>
                <span className="px-2 py-1 bg-orange-50 rounded">📱 AePS Micro-ATM Cashout (Aadhaar)</span>
                <span className="px-2 py-1 bg-yellow-50 rounded">📄 Cryptographic PDF Audit Certificates</span>
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
