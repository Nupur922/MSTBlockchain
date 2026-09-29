import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';

import Header                    from './components/Header';
import StatCards                 from './components/StatCards';
import FarmMap                   from './components/FarmMap';
import PlotTelemetry             from './components/PlotTelemetry';
import MultiHazardAnalyzer       from './components/MultiHazardAnalyzer';
import HistoricalClimateTracker  from './components/HistoricalClimateTracker';
import DemoControlPanel          from './components/DemoControlPanel';
import VoiceAlertModal           from './components/VoiceAlertModal';
import AePSCashoutModal          from './components/AePSCashoutModal';
import QRScannerModal            from './components/QRScannerModal';
import FarmerEnrollmentModal     from './components/FarmerEnrollmentModal';
import PDFEvidenceModal          from './components/PDFEvidenceModal';
import DeployTestnetModal        from './components/DeployTestnetModal';
import { FileText, QrCode, UserPlus, RefreshCw, Rocket } from 'lucide-react';

import { 
  getAgriTrustVaultContract, 
  getFarmRegistryContract, 
  RPC_URL, 
  HARDHAT_RPC_URL 
} from './utils/web3';

const EVENT_RETRY_MS      = 8000;
export const INSURED_SUM_INR = 40000;

const STATE_CITY = {
  Assam: 'Majuli', Bihar: 'Darbhanga', Maharashtra: 'Nashik',
  Punjab: 'Ludhiana', Karnataka: 'Mandya', 'Tamil Nadu': 'Thanjavur',
  Gujarat: 'Anand', 'West Bengal': 'Burdwan',
};

const SCENARIO_TELEMETRY = {
  'assam-flood':         { ndvi_score:0.28, sar_backscatter_db:-22.4, days_submerged:6,  ndwi_score:0.35,  lst_temp_c:24.0, status:'CRITICAL_FLOOD_SUBMERSION',      payout_ratio:0.65, hazard_type:'MONSOON_FLOOD' },
  'bihar-flood':         { ndvi_score:0.18, sar_backscatter_db:-24.1, days_submerged:9,  ndwi_score:0.45,  lst_temp_c:25.5, status:'SEVERE_FLOOD_SUBMERSION',        payout_ratio:0.50, hazard_type:'MONSOON_FLOOD' },
  'maharashtra-drought': { ndvi_score:0.32, sar_backscatter_db:-8.5,  days_submerged:0,  ndwi_score:-0.45, lst_temp_c:38.5, status:'FLASH_DROUGHT_MOISTURE_STRESS',  payout_ratio:0.50, hazard_type:'FLASH_DROUGHT' },
  'punjab-heatwave':     { ndvi_score:0.42, sar_backscatter_db:-9.0,  days_submerged:0,  ndwi_score:-0.32, lst_temp_c:44.2, status:'SCORCHING_HEATWAVE_WHEAT_STRESS', payout_ratio:0.40, hazard_type:'SCORCHING_HEATWAVE' },
  'karnataka-flood':     { ndvi_score:0.25, sar_backscatter_db:-18.2, days_submerged:5,  ndwi_score:0.10,  lst_temp_c:27.0, status:'CRITICAL_INUNDATION',            payout_ratio:0.70, hazard_type:'MONSOON_FLOOD' },
  'tn-harvest-rain':     { ndvi_score:0.20, sar_backscatter_db:-11.0, days_submerged:0,  ndwi_score:0.15,  lst_temp_c:26.0, status:'HARVEST_RAIN_CROP_LODGING',      payout_ratio:0.75, hazard_type:'HARVEST_RAIN_LODGING' },
  'harvest-confusion':   { ndvi_score:0.15, sar_backscatter_db:-8.0,  days_submerged:0,  ndwi_score:-0.10, lst_temp_c:28.0, status:'NORMAL_DRY_HARVEST_STUBBLE',     payout_ratio:0.0,  hazard_type:'NORMAL_HARVEST' },
  'ghost-crop-fraud':    { ndvi_score:0.55, sar_backscatter_db:-7.5,  days_submerged:0,  ndwi_score:0.05,  lst_temp_c:29.0, status:'GHOST_CROP_WEED_FRAUD_FLAGGED',  payout_ratio:0.0,  hazard_type:'GHOST_CROP_FRAUD_FLAGGED' },
  'nonexistent-plot':    { ndvi_score:0.60, sar_backscatter_db:-9.2,  days_submerged:0,  ndwi_score:-0.05, lst_temp_c:30.0, status:'PLOT_NOT_REGISTERED',            payout_ratio:0.0,  hazard_type:'NONE' },
  'crop-mismatch':       { ndvi_score:0.45, sar_backscatter_db:-10.1, days_submerged:0,  ndwi_score:-0.08, lst_temp_c:31.5, status:'CROP_TYPE_MISMATCH_REJECTED',    payout_ratio:0.0,  hazard_type:'NONE' },
};

const HEALTHY_TELEMETRY = {
  ndvi_score:0.75, sar_backscatter_db:-10.5, days_submerged:0,
  ndwi_score:-0.12, lst_temp_c:28.5, status:'HEALTHY_GROWING_CROP',
  payout_ratio:0.0, hazard_type:'NONE',
};

const DEMO_FARMERS = [
  { id:1, name:'Prasanta Kalita', state:'Assam',       district:'Majuli',     crop:'Sali Paddy', acreage:1.8, khasra:'Patta #104/B',     scenario:'assam-flood',         did:'did:mst:farmer:0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc' },
  { id:2, name:'Ram Singh',       state:'Bihar',       district:'Darbhanga',  crop:'Paddy',      acreage:2.5, khasra:'Khatiyan #214/A',  scenario:'bihar-flood',          did:'did:mst:farmer:0x3c44cdddb6a900fa2b585dd299e03d12fa4293bd' },
  { id:3, name:'Eknath Patil',    state:'Maharashtra', district:'Nashik',     crop:'Grapes',     acreage:3.2, khasra:'7/12 Extract #88', scenario:'maharashtra-drought',  did:'did:mst:farmer:0x70997970c51812dc3a010c7d01b50e0d17dc79c8' },
  { id:4, name:'Gurpreet Singh',  state:'Punjab',      district:'Ludhiana',   crop:'Wheat',      acreage:4.0, khasra:'Jamabandi #45/1',  scenario:'punjab-heatwave',      did:'did:mst:farmer:0x15d34aaf54267db7d7c367839aaf71a00a2c6a65' },
  { id:5, name:'Lakshmamma',      state:'Karnataka',   district:'Mandya',     crop:'Sugarcane',  acreage:2.8, khasra:'RTC #112/3',       scenario:'karnataka-flood',      did:'did:mst:farmer:0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc' },
  { id:6, name:'Murugan',         state:'Tamil Nadu',  district:'Thanjavur',  crop:'Samba Paddy',acreage:2.1, khasra:'Patta #78/1A',     scenario:'tn-harvest-rain',      did:'did:mst:farmer:0x976ea74026e726554db657fa54763abd0c3a0aa9' },
];

const HAZARD_COLOR = {
  MONSOON_FLOOD:              'bg-cyan-100 text-cyan-800 border-cyan-300',
  FLASH_DROUGHT:              'bg-amber-100 text-amber-800 border-amber-300',
  SCORCHING_HEATWAVE:         'bg-rose-100 text-rose-800 border-rose-300',
  HARVEST_RAIN_LODGING:       'bg-emerald-100 text-emerald-800 border-emerald-300',
  NORMAL_HARVEST:             'bg-slate-100 text-slate-600 border-slate-300',
  GHOST_CROP_FRAUD_FLAGGED:   'bg-red-100 text-red-800 border-red-300',
  NONE:                       'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const randomTxHash = () => '0x' + Array.from({length:64}, () => '0123456789abcdef'[Math.floor(Math.random()*16)]).join('');

function App({ onRegisterScenarioHandler, onTelemetryChange, selectedFarmer: sharedFarmer, onFarmerSelect }) {
  // ── BridgeKey wallet state ───────────────────────────────────────────────
  const [walletState, setWalletState] = useState({
    isConnected: false,
    address: '',
    chainId: null,
    isMSTTestnet: false,
    isDemo: false,
    provider: null,
    signer: null,
  });

  const handleWalletChange = useCallback((newState) => {
    setWalletState((prev) => ({ ...prev, ...newState }));
  }, []);

  // ── Scenario / map state ──────────────────────────────────────────────────
  const [activeScenario,  setActiveScenario]  = useState(null);
  const [activeTelemetry, setActiveTelemetry] = useState(HEALTHY_TELEMETRY);
  const [qrScannedPlot,   setQrScannedPlot]   = useState(null);
  const [selectedFarmer,  setSelectedFarmer]  = useState(null); // local sidebar selection
  const [farmers,         setFarmers]         = useState(DEMO_FARMERS);
  const [farmersLoading,  setFarmersLoading]  = useState(false);
  const [bridgeStatus,    setBridgeStatus]    = useState(null);
  const [payoutEvent,     setPayoutEvent]     = useState({});
  const [chainStatus,     setChainStatus]     = useState('disconnected');
  const [mapRefreshKey,   setMapRefreshKey]   = useState(0);

  // ── Modal visibility ──────────────────────────────────────────────────────
  const [showVoice,       setShowVoice]       = useState(false);
  const [showAePS,        setShowAePS]        = useState(false);
  const [showQR,          setShowQR]          = useState(false);
  const [showEnroll,      setShowEnroll]      = useState(false);
  const [showPDF,         setShowPDF]         = useState(false);
  const [showDeploy,      setShowDeploy]      = useState(false);

  const telemetryRef   = useRef(HEALTHY_TELEMETRY);
  const contractRef    = useRef(null);
  const chainStatusRef = useRef('disconnected');

  // ── Use sharedFarmer from Krishi portal if set ──────────────────────────
  const effectiveFarmer = selectedFarmer || sharedFarmer;

  // ── Load farmers from blockchain ──────────────────────────────────────
  const loadFarmers = useCallback(async () => {
    setFarmersLoading(true);
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      await provider.getNetwork();
      const registry = getFarmRegistryContract(provider);
      if (!registry) throw new Error('no registry');
      const total = Number(await registry.getPlotCount());
      const farmerMap = new Map();
      for (let i = 1; i <= total; i++) {
        const plot = await registry.getFarmPlot(i);
        const addr = plot.ownerWallet?.toLowerCase();
        if (addr && !farmerMap.has(addr)) {
          let did = '';
          try { did = await registry.getFarmerDID(addr); } catch {}
          if (!did) did = `did:mst:farmer:${addr}`;
          const demo = DEMO_FARMERS.find(f => f.did?.toLowerCase().includes(addr));
          farmerMap.set(addr, {
            id: i,
            name: demo?.name || `Farmer ${addr.slice(0,6)}…${addr.slice(-4)}`,
            state: plot.stateName || demo?.state || '',
            district: plot.districtName || demo?.district || '',
            crop: plot.cropType || demo?.crop || '',
            acreage: Number(plot.acreage) / 100,
            khasra: plot.khasraNumber || demo?.khasra || '',
            scenario: demo?.scenario || 'assam-flood',
            did,
            plots: [],
          });
        }
        if (addr && farmerMap.has(addr)) {
          farmerMap.get(addr).plots.push({ id: i, ...plot });
        }
      }
      const list = Array.from(farmerMap.values());
      if (list.length > 0) setFarmers(list);
    } catch {
      // Blockchain offline or unreachable — use fallback demo roster
    }
    setFarmersLoading(false);
  }, []);

  // ── Chain event listener ──────────────────────────────────────────────
  const setupEventListener = useCallback(async () => {
    try {
      let provider;
      try {
        provider = new ethers.JsonRpcProvider(RPC_URL);
        await provider.getNetwork();
      } catch {
        provider = new ethers.JsonRpcProvider(HARDHAT_RPC_URL);
        await provider.getNetwork();
      }

      const contract = getAgriTrustVaultContract(provider);
      if (!contract) {
        chainStatusRef.current = 'error';
        setChainStatus('error');
        return;
      }

      contractRef.current = contract;
      contract.removeAllListeners?.();

      contract.on('DisasterPayoutExecuted', (policyId, plotId, farmer, amountWei, proofHash, timestamp) => {
        setPayoutEvent({
          policyId: policyId.toString(),
          plotId: plotId.toString(),
          farmer,
          payoutAmount: ethers.formatEther(amountWei),
          payoutInr: Number(ethers.formatEther(amountWei)),
          proofHash,
          timestamp: Number(timestamp),
        });
        setShowVoice(true);
        setShowAePS(true);
      });

      chainStatusRef.current = 'listening';
      setChainStatus('listening');
    } catch {
      chainStatusRef.current = 'disconnected';
      setChainStatus('disconnected');
    }
  }, []);

  useEffect(() => {
    loadFarmers();
    setupEventListener();
    const retry = setInterval(() => {
      if (chainStatusRef.current !== 'listening') setupEventListener();
    }, EVENT_RETRY_MS);
    if (onRegisterScenarioHandler) onRegisterScenarioHandler(handleTriggerScenario);
    return () => { 
      clearInterval(retry); 
      contractRef.current?.removeAllListeners?.(); 
    };
  }, []);

  // ── Telemetry helpers ─────────────────────────────────────────────────
  const applyTelemetry = useCallback((t) => {
    telemetryRef.current = t;
    setActiveTelemetry(t);
    onTelemetryChange?.(t);
  }, [onTelemetryChange]);

  // ── Bridge dispatch ───────────────────────────────────────────────────
  const dispatchBridge = useCallback(async (payload) => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/trigger-call', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout?.(20000),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.status === 'success') {
        setBridgeStatus({ 
          ok:true, 
          text:`📞 Live call & WhatsApp → ${data.target_phone} · ₹${Number(data.payout_inr||0).toLocaleString('en-IN')} (${data.damage_pct}% damage)` 
        });
      } else if (data.status === 'rejected') {
        setBridgeStatus({
          ok: false,
          isRejection: true,
          text: `Oracle Rejected: ${data.label || data.scenario}`,
          detail: data.reason || 'Claim rejected by 2-of-3 consensus.',
        });
      } else if (data.status === 'skipped') {
        setBridgeStatus({ ok:false, text:`No payout for this scenario.` });
      } else {
        setBridgeStatus({ ok:false, text:`⚠️ Bridge: ${data.message || 'unconfirmed'}` });
      }
    } catch {
      setBridgeStatus({ ok:false, text:'⚠️ Bridge server offline (port 8000) — start with start_all.bat' });
    }
    setTimeout(() => setBridgeStatus(null), 12000);
  }, []);

  // ── Scenario handler ──────────────────────────────────────────────────
  const handleTriggerScenario = useCallback(async (scenarioId) => {
    if (scenarioId === 'reset') {
      setActiveScenario(null); 
      applyTelemetry(HEALTHY_TELEMETRY); 
      setBridgeStatus(null);
      return;
    }
    setActiveScenario(scenarioId);
    const tel = SCENARIO_TELEMETRY[scenarioId] || HEALTHY_TELEMETRY;
    applyTelemetry(tel);

    // Rejection / failure scenarios
    const rejectionScenarios = {
      'nonexistent-plot': { label: 'Invalid Plot', reason: 'Plot ID 999 not found in FarmRegistry. EIP-191 proof verification fails; zero payout.' },
      'crop-mismatch': { label: 'Crop Mismatch', reason: 'Enrolled for Paddy, claim filed for Wheat. SAR radar texture and Sentinel-2 phenology do not match registered crop.' },
      'harvest-confusion': { label: 'Stubble Shield', reason: 'NDVI dropped: yes, but only 1 of 3 feeds voted yes (SAR confirms dry bare soil, rain 0mm). Seasonal dry stubble harvest detected — claim rejected.' },
      'ghost-crop-fraud': { label: 'Ghost Crop Fraud', reason: 'Pre-existing weed vegetation flagged at enrollment. Non-cultivated land fraud detected.' },
    };

    if (rejectionScenarios[scenarioId]) {
      const rej = rejectionScenarios[scenarioId];
      setBridgeStatus({
        ok: false,
        isRejection: true,
        text: `Oracle Rejected: ${rej.label}`,
        detail: rej.reason,
      });
      setTimeout(() => setBridgeStatus(null), 12000);
      return;
    }

    const farmerMap = {
      'assam-flood':         { state:'Assam',       plotId:'1', amount:'0.50', name:'Prasanta Kalita' },
      'bihar-flood':         { state:'Bihar',       plotId:'2', amount:'0.75', name:'Ram Singh' },
      'maharashtra-drought': { state:'Maharashtra', plotId:'3', amount:'0.50', name:'Eknath Patil' },
      'punjab-heatwave':     { state:'Punjab',      plotId:'4', amount:'0.40', name:'Gurpreet Singh' },
      'karnataka-flood':     { state:'Karnataka',   plotId:'5', amount:'0.70', name:'Lakshmamma' },
      'tn-harvest-rain':     { state:'Tamil Nadu',  plotId:'6', amount:'0.75', name:'Murugan' },
    };
    const fm = farmerMap[scenarioId] || { state:'Bihar', plotId:'1', amount:'0.50', name:'Farmer' };
    const reliefInr = Math.round(INSURED_SUM_INR * (tel.payout_ratio || 0));

    setPayoutEvent({
      policyId:'1', 
      plotId:fm.plotId,
      farmer:'0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      payoutAmount: fm.amount, 
      payoutInr: reliefInr,
      stateName: fm.state, 
      timestamp: Math.floor(Date.now()/1000),
    });
    setShowAePS(true);

    dispatchBridge({
      scenario: scenarioId, 
      plotId: fm.plotId, 
      state: fm.state,
      location: `${STATE_CITY[fm.state]||fm.state}, ${fm.state}`,
      farmerName: fm.name,
      damagePct: Math.round((tel.payout_ratio||0)*100),
      payoutRatio: tel.payout_ratio||0,
      payoutInr: reliefInr,
      disasterType: tel.hazard_type?.includes('DROUGHT') ? 'Drought' : tel.hazard_type?.includes('HEAT') ? 'Heatwave' : 'Flood',
      txHash: randomTxHash(),
    });
  }, [applyTelemetry, dispatchBridge]);

  const handleFarmerSelect = (farmer) => {
    setSelectedFarmer(farmer);
    onFarmerSelect?.(farmer);
  };

  const handlePlotScanned = (scannedData) => {
    setQrScannedPlot(scannedData);
    setShowQR(false);
  };

  const handleEnrolled = () => {
    setMapRefreshKey((k) => k + 1);
    setShowEnroll(false);
    loadFarmers();
  };

  const hazardBadgeClass = HAZARD_COLOR[activeTelemetry.hazard_type] || HAZARD_COLOR.NONE;

  return (
    <div className="min-h-screen bg-slate-50">
      <Header walletState={walletState} onWalletChange={handleWalletChange} />

      {/* ── Modals ── */}
      <VoiceAlertModal 
        isOpen={showVoice} 
        onClose={() => setShowVoice(false)} 
        onOpenPDF={() => setShowPDF(true)}
        payoutAmount={payoutEvent.payoutAmount} 
        plotId={payoutEvent.plotId} 
        stateName={payoutEvent.stateName} 
      />
      <AePSCashoutModal 
        isOpen={showAePS} 
        onClose={() => setShowAePS(false)}
        payoutAmount={payoutEvent.payoutAmount} 
        payoutInr={payoutEvent.payoutInr}
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
      <PDFEvidenceModal 
        isOpen={showPDF} 
        onClose={() => setShowPDF(false)}
        plotData={qrScannedPlot} 
        payoutEvent={payoutEvent} 
      />
      <DeployTestnetModal
        isOpen={showDeploy}
        onClose={() => setShowDeploy(false)}
        onContractsDeployed={() => setMapRefreshKey((k) => k + 1)}
      />

      <main className="container mx-auto px-4 py-5 space-y-4 max-w-[1400px]">

        {/* ── Row 1: Stats Live from Chain ── */}
        <StatCards />

        {/* ── Row 2: Disaster Simulation Control Panel (6 approved + 4 rejected + reset) ── */}
        <DemoControlPanel 
          onTriggerScenario={handleTriggerScenario} 
          activeScenario={activeScenario} 
        />

        {/* ── Bridge Status Banner ── */}
        {bridgeStatus && (
          <div className={`rounded-xl border px-4 py-3 text-sm font-medium flex items-center justify-between gap-3 ${
            bridgeStatus.ok
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : bridgeStatus.isRejection
              ? 'bg-red-50 border-red-300 text-red-800'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}>
            <div className="flex items-start gap-2">
              {bridgeStatus.isRejection && (
                <span className="shrink-0 mt-0.5">🚫</span>
              )}
              <div>
                <span className="font-bold">{bridgeStatus.text}</span>
                {bridgeStatus.detail && (
                  <p className="text-xs mt-1 opacity-80 font-normal">{bridgeStatus.detail}</p>
                )}
              </div>
            </div>
            <button 
              onClick={() => setBridgeStatus(null)} 
              className="text-xs font-bold opacity-60 hover:opacity-100 shrink-0"
            >
              ✕
            </button>
          </div>
        )}

        {/* ── Row 3: Main Two-Column Layout ── */}
        <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-4">

          {/* ── LEFT: Farmer Selector Panel ── */}
          <div className="space-y-4">

            {/* Farmer list card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Registered Farmers</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {farmersLoading ? 'Fetching from chain…' : `${farmers.length} farmers · click to view 7-day data`}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <button 
                    onClick={loadFarmers} 
                    disabled={farmersLoading}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors disabled:opacity-50"
                    title="Refresh from blockchain"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${farmersLoading ? 'animate-spin' : ''}`} />
                  </button>
                  <button 
                    onClick={() => setShowEnroll(true)}
                    className="p-1.5 rounded-lg hover:bg-emerald-100 text-emerald-600 transition-colors" 
                    title="Enroll new farmer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="divide-y divide-slate-50 max-h-[460px] overflow-y-auto">
                {farmers.map((farmer) => {
                  const isSelected = effectiveFarmer?.id === farmer.id || effectiveFarmer?.did === farmer.did;
                  const isActiveScenario = activeScenario === farmer.scenario;
                  return (
                    <button
                      key={farmer.id}
                      onClick={() => handleFarmerSelect(farmer)}
                      className={`w-full text-left px-4 py-3 transition-colors flex items-start gap-3 ${
                        isSelected
                          ? 'bg-emerald-50 border-l-2 border-l-emerald-500'
                          : 'hover:bg-slate-50 border-l-2 border-l-transparent'
                      }`}
                    >
                      {/* Avatar */}
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0 ${
                        isSelected ? 'bg-emerald-100' : 'bg-slate-100'
                      }`}>
                        👨‍🌾
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-slate-900 truncate">{farmer.name}</span>
                          {isActiveScenario && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">{farmer.state} · {farmer.district}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">{farmer.crop} · {farmer.acreage?.toFixed(1)} ac</p>

                        {/* DID */}
                        <p className="text-[9px] font-mono text-emerald-600 mt-1 truncate" title={farmer.did}>
                          {farmer.did?.slice(0, 36)}…
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action buttons (Grid of 3 + Deploy testnet) */}
            <div className="grid grid-cols-3 gap-2">
              <button 
                onClick={() => setShowPDF(true)}
                className="flex flex-col items-center gap-1 py-3 bg-white rounded-xl border border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 text-slate-600 hover:text-emerald-700 transition-all shadow-sm text-xs font-medium"
              >
                <FileText className="w-4 h-4" />
                <span>PDF Cert</span>
              </button>
              <button 
                onClick={() => setShowQR(true)}
                className="flex flex-col items-center gap-1 py-3 bg-white rounded-xl border border-slate-200 hover:bg-indigo-50 hover:border-indigo-300 text-slate-600 hover:text-indigo-700 transition-all shadow-sm text-xs font-medium"
              >
                <QrCode className="w-4 h-4" />
                <span>Scan QR</span>
              </button>
              <button 
                onClick={() => setShowEnroll(true)}
                className="flex flex-col items-center gap-1 py-3 bg-white rounded-xl border border-slate-200 hover:bg-green-50 hover:border-green-300 text-slate-600 hover:text-green-700 transition-all shadow-sm text-xs font-medium"
              >
                <UserPlus className="w-4 h-4" />
                <span>Enroll</span>
              </button>
            </div>

            {/* Selected farmer detail card */}
            {effectiveFarmer && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">👨‍🌾</span>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{effectiveFarmer.name}</p>
                    <p className="text-xs text-slate-500">{effectiveFarmer.state} · {effectiveFarmer.district}</p>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  {[
                    ['Crop', effectiveFarmer.crop],
                    ['Acreage', `${effectiveFarmer.acreage?.toFixed(1)} acres`],
                    ['Khasra', effectiveFarmer.khasra],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-slate-500">{k}</span>
                      <span className="font-semibold text-slate-800">{v}</span>
                    </div>
                  ))}
                </div>

                {/* DID document */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-mono">W3C DID Core 1.0</p>
                  <p className="font-mono text-[10px] text-emerald-700 break-all leading-relaxed">
                    {effectiveFarmer.did}
                  </p>
                  <div className="mt-2 pt-2 border-t border-slate-200 space-y-1 text-[9px] text-slate-500 font-mono">
                    <div className="flex gap-1"><span className="text-slate-400">type:</span><span>EcdsaSecp256k1Verification</span></div>
                    <div className="flex gap-1"><span className="text-slate-400">chain:</span><span>eip155:91562037</span></div>
                    <div className="flex gap-1"><span className="text-slate-400">issued by:</span><span>did:mst:oracle:newrro-ai</span></div>
                  </div>
                </div>

                {/* Hazard status */}
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold ${
                  activeTelemetry.hazard_type !== 'NONE' ? hazardBadgeClass : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    activeTelemetry.hazard_type !== 'NONE' ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'
                  }`} />
                  {activeTelemetry.hazard_type !== 'NONE'
                    ? activeTelemetry.hazard_type.replace(/_/g,' ')
                    : 'No Active Disaster'}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT: 7-day tracker + multi-hazard + map ── */}
          <div className="space-y-4">

            {/* 7-Day Historical Climate Tracker — LIVE from bridge */}
            <HistoricalClimateTracker
              activeScenario={activeScenario}
              selectedFarmer={effectiveFarmer}
              qrScannedPlot={qrScannedPlot}
            />

            {/* Multi-Hazard Analyzer */}
            <MultiHazardAnalyzer activeTelemetry={activeTelemetry} />

            {/* Farm Map + Plot Telemetry side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <FarmMap 
                key={mapRefreshKey} 
                qrScannedPlot={qrScannedPlot}
                activeScenario={activeScenario} 
                onEnrollClick={() => setShowEnroll(true)} 
              />
              <PlotTelemetry activeTelemetry={activeTelemetry} />
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-black text-slate-900 mb-1">AgriTrust AI · Version 3.0</h3>
              <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                Multi-Hazard Parametric Crop Insurance on MST Blockchain.
                Sentinel-1 SAR Floods · Sentinel-2 NDWI Droughts · Thermal LST Heatwaves →
                2-of-3 Byzantine Oracle Consensus → EIP-191 proof → instant payout &lt;2s.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {['⛓ MST Blockchain', '🛰 NEWRRO AI Oracle', '📱 AePS Cashout', '📄 PDF Certificates', '🆔 W3C DID Core 1.0'].map(b => (
                <span key={b} className="px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-600 rounded-lg text-xs font-medium">{b}</span>
              ))}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}

export default App;
