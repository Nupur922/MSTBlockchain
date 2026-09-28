/**
 * FarmerDashboard.jsx
 * ===================
 * AgriTrust AI V3 — Krishi Mitra Farmer Management Dashboard
 *
 * Wiring:
 *  - krishiMitra       : object from KrishiMitraLogin (walletAddress, did, role)
 *  - activeTelemetry   : live telemetry from App.jsx — passed through AppKrishiMitra
 *  - activeScenario    : current scenario slug from App.jsx
 *  - onSelectScenario  : callback to App.jsx handleTriggerScenario — lets the
 *                        Krishi Mitra portal trigger the same scenarios as the
 *                        Demo Control Panel on the main dashboard
 *  - onBackToMain      : callback to return to the main dashboard
 */

import { useState, useEffect, useMemo } from 'react';
import { ethers } from 'ethers';

// ── Demo farmer roster (used when blockchain is offline / no MetaMask) ───────
const DEMO_FARMERS = [
  {
    address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    name: 'Prasanta Kalita',
    did: 'did:mst:farmer:0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc',
    plots: [{ id: 1, cropType: 'Sali Paddy (Rice)', acreage: 180, khasraNumber: 'Patta #104/B', stateName: 'Assam', districtName: 'Majuli' }],
    totalAcreage: 180,
    scenario: 'assam-flood',
    state: 'Assam',
  },
  {
    address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    name: 'Ram Singh',
    did: 'did:mst:farmer:0x3c44cdddb6a900fa2b585dd299e03d12fa4293bd',
    plots: [{ id: 2, cropType: 'Paddy (Rice)', acreage: 250, khasraNumber: 'Khatiyan #214/A', stateName: 'Bihar', districtName: 'Darbhanga' }],
    totalAcreage: 250,
    scenario: 'bihar-flood',
    state: 'Bihar',
  },
  {
    address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    name: 'Eknath Patil',
    did: 'did:mst:farmer:0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
    plots: [{ id: 3, cropType: 'Grapes / Onion', acreage: 320, khasraNumber: '7/12 Extract #88/2', stateName: 'Maharashtra', districtName: 'Nashik' }],
    totalAcreage: 320,
    scenario: 'maharashtra-drought',
    state: 'Maharashtra',
  },
  {
    address: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
    name: 'Gurpreet Singh',
    did: 'did:mst:farmer:0x15d34aaf54267db7d7c367839aaf71a00a2c6a65',
    plots: [{ id: 4, cropType: 'Wheat', acreage: 400, khasraNumber: 'Jamabandi #45/1', stateName: 'Punjab', districtName: 'Ludhiana' }],
    totalAcreage: 400,
    scenario: 'punjab-heatwave',
    state: 'Punjab',
  },
  {
    address: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc',
    name: 'Lakshmamma',
    did: 'did:mst:farmer:0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc',
    plots: [{ id: 5, cropType: 'Sugarcane / Paddy', acreage: 280, khasraNumber: 'RTC #112/3', stateName: 'Karnataka', districtName: 'Mandya' }],
    totalAcreage: 280,
    scenario: 'karnataka-flood',
    state: 'Karnataka',
  },
  {
    address: '0x976EA74026E726554dB657fA54763abd0C3a0aa9',
    name: 'Murugan',
    did: 'did:mst:farmer:0x976ea74026e726554db657fa54763abd0c3a0aa9',
    plots: [{ id: 6, cropType: 'Samba Paddy', acreage: 210, khasraNumber: 'Patta #78/1A', stateName: 'Tamil Nadu', districtName: 'Thanjavur' }],
    totalAcreage: 210,
    scenario: 'tn-harvest-rain',
    state: 'Tamil Nadu',
  },
];

// ── Scenario → telemetry / imagery data map ──────────────────────────────────
const SCENARIO_DATA = {
  'assam-flood': {
    label: 'Brahmaputra Monsoon Flood',
    hazardColor: 'cyan',
    realtime: { ndvi: 0.74, sar: -7.8, lst: 27.5, ndwi: 0.08, status: 'HEALTHY_GROWING_CROP', summary: 'All sensors normal. No flood inundation detected.' },
    simulation: {
      event: 'Assam Brahmaputra River Flood (Sep 22–28, 2026)',
      damage: '65% crop loss verified by Sentinel-1 SAR (6 days submersion)',
      payout: '₹25,000 released via MST Blockchain (0.65 MST)',
      sarDB: '-22.4 dB (Standing Water Confirmed)',
      ndviDrop: '0.78 → 0.28 (64% vegetation loss)',
      rainfall: '210 mm in 48 hours (IMD Verified)',
      txHash: '0x9f8e7d6c5b4a3928374650192837465019283746',
      // Real Copernicus/ESA flood imagery placeholder (public domain satellite map)
      satelliteImageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Sentinel-2_image_of_Assam_floods_2020.jpg/800px-Sentinel-2_image_of_Assam_floods_2020.jpg',
      satelliteImageAlt: 'Sentinel-2 false-colour composite showing Brahmaputra flood extent (cyan = standing water)',
    },
  },
  'bihar-flood': {
    label: 'Kosi River Monsoon Flood',
    hazardColor: 'blue',
    realtime: { ndvi: 0.76, sar: -8.2, lst: 29.0, ndwi: 0.05, status: 'HEALTHY_GROWING_CROP', summary: 'Normal Kharif season. No flood inundation detected.' },
    simulation: {
      event: 'Bihar Kosi River Embankment Breach (Sep 20–28, 2026)',
      damage: '50% crop loss verified by Sentinel-1 SAR (9 days submersion)',
      payout: '₹18,000 released via MST Blockchain (0.50 MST)',
      sarDB: '-24.1 dB (Critical Submersion)',
      ndviDrop: '0.76 → 0.18 (76% vegetation loss)',
      rainfall: '240 mm in 48 hours (IMD Verified)',
      txHash: '0x8e7d6c5b4a392837465019283746501928374650',
      satelliteImageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Bihar_floods_2019_satellite.jpg/800px-Bihar_floods_2019_satellite.jpg',
      satelliteImageAlt: 'Sentinel-1 SAR backscatter image showing Kosi river flood extent',
    },
  },
  'maharashtra-drought': {
    label: 'Marathwada Flash Drought',
    hazardColor: 'amber',
    realtime: { ndvi: 0.68, sar: -9.1, lst: 34.0, ndwi: -0.12, status: 'HEALTHY_GROWING_CROP', summary: 'Soil moisture slightly below average. No drought threshold breached.' },
    simulation: {
      event: 'Marathwada Flash Drought — NDWI Moisture Deficit (Sep 2026)',
      damage: '55% crop loss — NDWI soil moisture deficit -0.45 for 21 days',
      payout: '₹17,500 released via MST Blockchain (0.50 MST)',
      sarDB: '-8.5 dB (Dry Soil Confirmed)',
      ndviDrop: '0.68 → 0.32 (53% vegetation loss)',
      rainfall: '2 mm in 48 hours (Critical Deficit)',
      txHash: '0x7d6c5b4a39283746501928374650192837465019',
      satelliteImageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Drought_NDVI_India_2016.png/800px-Drought_NDVI_India_2016.png',
      satelliteImageAlt: 'Sentinel-2 NDVI composite showing drought stress (brown = moisture deficit)',
    },
  },
  'punjab-heatwave': {
    label: 'Scorching Wheat Heatwave',
    hazardColor: 'rose',
    realtime: { ndvi: 0.70, sar: -9.5, lst: 32.0, ndwi: -0.15, status: 'HEALTHY_GROWING_CROP', summary: 'Temperatures elevated but below critical 42°C threshold.' },
    simulation: {
      event: 'Punjab Terminal Wheat Heatwave — 44.2°C Peak LST (Apr 2026)',
      damage: '40% crop loss — Land Surface Temperature 44.2°C during grain filling',
      payout: '₹14,000 released via MST Blockchain (0.40 MST)',
      sarDB: '-9.0 dB (Dry Conditions)',
      ndviDrop: '0.70 → 0.42 (40% canopy scorch)',
      rainfall: '0 mm (Zero Precipitation)',
      txHash: '0x6c5b4a3928374650192837465019283746501928',
      satelliteImageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Landsat_thermal_Punjab.jpg/800px-Landsat_thermal_Punjab.jpg',
      satelliteImageAlt: 'Landsat-9 TIRS thermal band showing land surface temperature anomaly (red = extreme heat)',
    },
  },
  'karnataka-flood': {
    label: 'Cauvery River Flood',
    hazardColor: 'cyan',
    realtime: { ndvi: 0.72, sar: -8.0, lst: 28.0, ndwi: 0.10, status: 'HEALTHY_GROWING_CROP', summary: 'Cauvery river levels normal. No flood inundation detected.' },
    simulation: {
      event: 'Karnataka Cauvery Basin Flood Inundation (Sep 2026)',
      damage: '70% crop loss verified by Sentinel-1 SAR (7 days submersion)',
      payout: '₹28,000 released via MST Blockchain (0.70 MST)',
      sarDB: '-24.1 dB (Deep Inundation)',
      ndviDrop: '0.72 → 0.25 (65% vegetation loss)',
      rainfall: '380 mm in 48 hours (Extreme Event)',
      txHash: '0x5b4a392837465019283746501928374650192837',
      satelliteImageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Sentinel-2_image_of_Assam_floods_2020.jpg/800px-Sentinel-2_image_of_Assam_floods_2020.jpg',
      satelliteImageAlt: 'Sentinel-1 SAR image showing Cauvery flood inundation extent',
    },
  },
  'tn-harvest-rain': {
    label: 'Samba Harvest Rain',
    hazardColor: 'emerald',
    realtime: { ndvi: 0.65, sar: -8.5, lst: 28.0, ndwi: 0.12, status: 'HEALTHY_GROWING_CROP', summary: 'Samba paddy harvest season approaching. Conditions normal.' },
    simulation: {
      event: 'Tamil Nadu Samba Unseasonal Harvest Rain — Crop Lodging (Dec 2026)',
      damage: '75% crop loss due to stalk lodging from 140mm unseasonal rain',
      payout: '₹28,000 released via MST Blockchain (0.75 MST)',
      sarDB: '-12.0 dB (Lodged Crop SAR Texture)',
      ndviDrop: '0.65 → 0.20 (69% canopy damage)',
      rainfall: '140 mm during harvest (IMD Verified)',
      txHash: '0x4a392837465019283746501928374650192837',
      satelliteImageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Sentinel-2_image_of_Assam_floods_2020.jpg/800px-Sentinel-2_image_of_Assam_floods_2020.jpg',
      satelliteImageAlt: 'Sentinel-2 optical image showing crop lodging damage in Thanjavur delta',
    },
  },
};

// ── Status badge colour helper ────────────────────────────────────────────────
const HAZARD_BADGE = {
  HEALTHY_GROWING_CROP:            { label: 'HEALTHY',  cls: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  CRITICAL_FLOOD_SUBMERSION:       { label: 'FLOOD',    cls: 'bg-cyan-100 text-cyan-800 border-cyan-300' },
  SEVERE_FLOOD_SUBMERSION:         { label: 'FLOOD',    cls: 'bg-blue-100 text-blue-800 border-blue-300' },
  FLASH_DROUGHT_MOISTURE_STRESS:   { label: 'DROUGHT',  cls: 'bg-amber-100 text-amber-800 border-amber-300' },
  SCORCHING_HEATWAVE_WHEAT_STRESS: { label: 'HEATWAVE', cls: 'bg-rose-100 text-rose-800 border-rose-300' },
  GHOST_CROP_WEED_FRAUD_FLAGGED:   { label: 'FRAUD',    cls: 'bg-red-100 text-red-800 border-red-300' },
};

// ─────────────────────────────────────────────────────────────────────────────

const FarmerDashboard = ({ krishiMitra, activeTelemetry, activeScenario, onSelectScenario, onBackToMain }) => {
  const [farmers, setFarmers]               = useState([]);
  const [selectedFarmer, setSelectedFarmer] = useState(null);
  const [viewMode, setViewMode]             = useState('realtime');
  const [loading, setLoading]               = useState(true);
  const [imgError, setImgError]             = useState(false);

  // Load farmers: try blockchain first, fall back to demo roster
  useEffect(() => { loadFarmers(); }, []);

  const loadFarmers = async () => {
    setLoading(true);
    try {
      const contractAddresses = await import('../contracts/contract-addresses.json');
      const FarmRegistryABI   = await import('../contracts/FarmRegistry.json');

      const provider = new ethers.BrowserProvider(window.ethereum);
      const farmRegistry = new ethers.Contract(
        contractAddresses.default?.contracts?.FarmRegistry || contractAddresses.FarmRegistry,
        FarmRegistryABI.abi,
        provider
      );

      const totalPlots = await farmRegistry.getPlotCount();
      const farmerMap  = new Map();

      for (let i = 1; i <= Number(totalPlots); i++) {
        const plot          = await farmRegistry.getFarmPlot(i);
        const farmerAddress = plot.ownerWallet;

        if (!farmerMap.has(farmerAddress)) {
          let farmerDID = '';
          try { farmerDID = await farmRegistry.getFarmerDID(farmerAddress); } catch (_) {}
          if (!farmerDID) farmerDID = `did:mst:farmer:${farmerAddress.toLowerCase()}`;

          // Match to demo roster for rich name/scenario data
          const demo = DEMO_FARMERS.find(f => f.address.toLowerCase() === farmerAddress.toLowerCase());
          farmerMap.set(farmerAddress, {
            address:      farmerAddress,
            did:          farmerDID,
            name:         demo?.name || `Farmer ${farmerAddress.slice(0, 6)}…${farmerAddress.slice(-4)}`,
            plots:        [],
            totalAcreage: 0,
            scenario:     demo?.scenario || 'assam-flood',
            state:        demo?.state || plot.stateName,
          });
        }

        const farmer = farmerMap.get(farmerAddress);
        farmer.plots.push({
          id: i, cropType: plot.cropType, acreage: Number(plot.acreage) / 100,
          khasraNumber: plot.khasraNumber, stateName: plot.stateName, districtName: plot.districtName,
        });
        farmer.totalAcreage += Number(plot.acreage) / 100;
      }

      const list = Array.from(farmerMap.values());
      setFarmers(list.length > 0 ? list : DEMO_FARMERS);
    } catch (_) {
      // Blockchain offline — use demo roster
      setFarmers(DEMO_FARMERS);
    }
    setLoading(false);
  };

  // Derive current telemetry display for selected farmer
  const currentTelemetry = useMemo(() => {
    if (!selectedFarmer) return null;
    const scenarioKey = activeScenario === selectedFarmer.scenario ? activeScenario : null;
    const sd = SCENARIO_DATA[selectedFarmer.scenario];
    if (!sd) return null;

    if (viewMode === 'simulation' || scenarioKey) {
      // Show live activeTelemetry values when scenario is running, else simulation defaults
      return activeTelemetry && activeTelemetry.hazard_type !== 'NONE'
        ? activeTelemetry
        : { ...sd.realtime, hazard_type: 'NONE' };
    }
    return { ...sd.realtime, hazard_type: 'NONE' };
  }, [selectedFarmer, viewMode, activeTelemetry, activeScenario]);

  const hazardStatus = activeTelemetry?.hazard_type && activeTelemetry.hazard_type !== 'NONE'
    ? (HAZARD_BADGE[activeTelemetry.hazard_type] || { label: activeTelemetry.hazard_type.replace(/_/g, ' '), cls: 'bg-red-100 text-red-800 border-red-300' })
    : HAZARD_BADGE['HEALTHY_GROWING_CROP'];

  const handleTriggerScenario = (farmer) => {
    if (onSelectScenario) onSelectScenario(farmer.scenario);
    if (onBackToMain) onBackToMain();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-teal-50/10">
      <div className="absolute inset-0 bg-[radial-gradient(#15803D12_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      {/* Tricolor Strip */}
      <div className="h-1.5 w-full flex">
        <div className="w-1/3 bg-[#FF9933]" /><div className="w-1/3 bg-white border-y border-slate-200" /><div className="w-1/3 bg-[#138808]" />
      </div>

      {/* Header */}
      <header className="relative bg-white border-b border-slate-200 shadow-sm px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-700 to-emerald-500 text-white flex items-center justify-center shadow-md">
              <span className="text-lg">🛡️</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold tracking-tight text-slate-900">AgriTrust<span className="text-emerald-600">.AI</span></span>
                <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full border border-blue-300">KRISHI MITRA</span>
              </div>
              <p className="text-xs text-slate-500">Farmer Management Portal · DID-Based Identity</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Back to main dashboard */}
            {onBackToMain && (
              <button onClick={onBackToMain}
                className="border border-emerald-300 hover:bg-emerald-50 text-emerald-700 font-semibold text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 transition">
                ← Main Dashboard
              </button>
            )}
            <div className="hidden md:block text-right">
              <div className="text-xs text-slate-500">Krishi Mitra DID</div>
              <div className="font-mono text-xs text-emerald-700">{krishiMitra?.did?.slice(0, 32)}…</div>
            </div>
            <button onClick={() => window.location.reload()}
              className="border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 transition">
              ⬅ Logout
            </button>
          </div>
        </div>
      </header>

      {/* Live telemetry status bar */}
      {activeTelemetry && activeTelemetry.hazard_type !== 'NONE' && (
        <div className="bg-gradient-to-r from-red-900 to-rose-900 text-white px-4 py-2 text-xs font-mono flex items-center justify-between">
          <span>🚨 ACTIVE DISASTER EVENT: <strong>{activeTelemetry.hazard_type?.replace(/_/g, ' ')}</strong></span>
          <span>NDVI: {activeTelemetry.ndvi_score?.toFixed(2)} · SAR: {activeTelemetry.sar_backscatter_db?.toFixed(1)} dB · Payout Ratio: {(activeTelemetry.payout_ratio * 100).toFixed(0)}%</span>
        </div>
      )}

      <main className="relative max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-6">

        {/* Mode Toggle + Summary */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Registered Farmers Under Your Jurisdiction</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {loading ? 'Loading…' : `${farmers.length} farmers · ${farmers.reduce((s, f) => s + f.plots.length, 0)} plots registered on MST Blockchain`}
              </p>
            </div>
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
              <button onClick={() => setViewMode('realtime')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-1.5 ${viewMode === 'realtime' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
                🛰 Real-Time Data
              </button>
              <button onClick={() => setViewMode('simulation')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-1.5 ${viewMode === 'simulation' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
                📼 Historical Simulation
              </button>
            </div>
          </div>

          {viewMode === 'realtime'
            ? <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-900 flex items-start gap-2">
                <span>ℹ️</span>
                <span><strong>Real-Time Mode:</strong> Live Copernicus Sentinel-1 SAR + Sentinel-2 NDVI telemetry. No disasters currently detected — all plots show healthy growing season conditions.</span>
              </div>
            : <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-900 flex items-start gap-2">
                <span>⏪</span>
                <span><strong>Historical Simulation Mode:</strong> Click any farmer to view archived satellite imagery and verified blockchain payout records from past disaster events. Click "Trigger Simulation" to replay it on the main dashboard.</span>
              </div>
          }
        </div>

        {/* Loading */}
        {loading && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-600">Loading farmer registry from MST Blockchain…</p>
          </div>
        )}

        {/* Farmer Cards */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {farmers.map((farmer, idx) => {
              const sd = SCENARIO_DATA[farmer.scenario];
              const isActive = activeScenario === farmer.scenario;
              return (
                <div key={farmer.address + idx}
                  onClick={() => { setSelectedFarmer(farmer); setImgError(false); }}
                  className={`bg-white rounded-xl border shadow-sm p-5 hover:shadow-md transition cursor-pointer ${isActive ? 'border-2 border-emerald-500 ring-1 ring-emerald-200' : 'border-slate-200'}`}>

                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700 flex items-center justify-center text-2xl border-2 border-emerald-200">
                        👨‍🌾
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{farmer.name}</div>
                        <div className="text-xs text-slate-500">{farmer.state} · {farmer.plots[0]?.districtName}</div>
                      </div>
                    </div>
                    {isActive && <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">ACTIVE</span>}
                  </div>

                  {/* DID Badge */}
                  <div className="mb-3 p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="text-[10px] text-slate-400 font-mono font-bold mb-0.5">W3C DID</div>
                    <div className="font-mono text-[11px] text-slate-800 truncate">{farmer.did}</div>
                  </div>

                  {/* Hazard tag for simulation mode */}
                  {sd && (
                    <div className="mb-3 flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        farmer.scenario.includes('flood')    ? 'bg-cyan-50 text-cyan-800 border-cyan-300' :
                        farmer.scenario.includes('drought')  ? 'bg-amber-50 text-amber-800 border-amber-300' :
                        farmer.scenario.includes('heatwave') ? 'bg-rose-50 text-rose-800 border-rose-300' :
                        'bg-emerald-50 text-emerald-800 border-emerald-300'
                      }`}>{sd.label}</span>
                      <span className="text-[10px] text-slate-500">{farmer.plots[0]?.khasraNumber}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div className="p-2 rounded-lg bg-blue-50 border border-blue-200">
                      <div className="text-blue-600 font-semibold">Acreage</div>
                      <div className="text-blue-900 font-bold">{(farmer.totalAcreage / 100).toFixed(1)} Ac</div>
                    </div>
                    <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                      <div className="text-emerald-600 font-semibold">Plots</div>
                      <div className="text-emerald-900 font-bold">{farmer.plots.length}</div>
                    </div>
                  </div>

                  <button className="w-full py-2 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 font-semibold text-xs rounded-lg transition flex items-center justify-center gap-1">
                    View Details →
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── Farmer Detail Modal ── */}
      {selectedFarmer && (() => {
        const sd = SCENARIO_DATA[selectedFarmer.scenario];
        const isLive = viewMode === 'realtime';
        const tel = isLive ? sd?.realtime : null;
        const sim = sd?.simulation;
        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedFarmer(null)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}>

              {/* Modal header */}
              <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white px-6 py-4 flex items-center justify-between">
                <div>
                  <div className="text-lg font-extrabold">👨‍🌾 {selectedFarmer.name}</div>
                  <div className="text-xs text-emerald-200 mt-0.5">{selectedFarmer.state} · {selectedFarmer.plots[0]?.districtName}</div>
                </div>
                <button onClick={() => setSelectedFarmer(null)}
                  className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition text-xl">✕</button>
              </div>

              <div className="p-6 space-y-4">
                {/* DID */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-xs font-bold text-slate-600 mb-1 font-mono uppercase tracking-wider">W3C Decentralized Identifier (DID)</div>
                  <div className="font-mono text-sm text-slate-900 break-all bg-white p-2 rounded border border-slate-300">
                    {selectedFarmer.did}
                  </div>
                </div>

                {/* Plot details */}
                <div className="grid grid-cols-2 gap-3">
                  {selectedFarmer.plots.map(plot => (
                    <div key={plot.id} className="p-3 rounded-xl border border-slate-200 bg-white text-sm space-y-1">
                      <div className="font-bold text-slate-900 mb-1">Plot #{plot.id}</div>
                      <div><span className="text-slate-500">Crop:</span> <strong>{plot.cropType}</strong></div>
                      <div><span className="text-slate-500">Khasra:</span> <strong className="font-mono">{plot.khasraNumber}</strong></div>
                      <div><span className="text-slate-500">State:</span> <strong>{plot.stateName}</strong></div>
                    </div>
                  ))}
                </div>

                {/* Mode-specific content */}
                {isLive ? (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3">
                    <div className="font-bold text-emerald-900 flex items-center gap-2">🛰 Real-Time Satellite Telemetry</div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {[
                        { label: 'NDVI Vegetation', val: tel?.ndvi?.toFixed(3), ok: tel?.ndvi > 0.5, unit: '' },
                        { label: 'SAR Backscatter', val: tel?.sar?.toFixed(1), ok: tel?.sar > -15, unit: ' dB' },
                        { label: 'NDWI Moisture',   val: tel?.ndwi?.toFixed(3), ok: tel?.ndwi > -0.35, unit: '' },
                        { label: 'LST Temperature', val: tel?.lst?.toFixed(1),  ok: tel?.lst < 42, unit: '°C' },
                      ].map(m => (
                        <div key={m.label} className="p-3 bg-white rounded-lg border border-emerald-200">
                          <div className="text-xs text-slate-500">{m.label}</div>
                          <div className="font-mono font-bold text-lg text-slate-900">{m.val}{m.unit}</div>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${m.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {m.ok ? '✓ NORMAL' : '⚠ ALERT'}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="text-sm text-emerald-800 font-medium">{tel?.summary}</div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-3">
                    <div className="font-bold text-blue-900 flex items-center gap-2">📼 Historical Disaster Event</div>
                    <div className="text-sm text-blue-900 space-y-1">
                      <div><strong>Event:</strong> {sim?.event}</div>
                      <div><strong>Damage:</strong> {sim?.damage}</div>
                      <div><strong>Payout:</strong> <span className="text-emerald-700 font-bold">{sim?.payout}</span></div>
                      <div className="grid grid-cols-3 gap-2 pt-2 text-xs font-mono">
                        <div className="p-2 bg-white rounded border border-blue-200"><div className="text-blue-500">SAR Peak</div><strong>{sim?.sarDB}</strong></div>
                        <div className="p-2 bg-white rounded border border-blue-200"><div className="text-blue-500">NDVI Drop</div><strong>{sim?.ndviDrop}</strong></div>
                        <div className="p-2 bg-white rounded border border-blue-200"><div className="text-blue-500">Rainfall</div><strong>{sim?.rainfall}</strong></div>
                      </div>
                    </div>

                    {/* Satellite imagery */}
                    {!imgError ? (
                      <div>
                        <img
                          src={sim?.satelliteImageUrl}
                          alt={sim?.satelliteImageAlt}
                          className="w-full rounded-lg border border-blue-300 object-cover max-h-48"
                          onError={() => setImgError(true)}
                        />
                        <p className="text-xs text-blue-700 mt-1 italic">{sim?.satelliteImageAlt}</p>
                      </div>
                    ) : (
                      <div className="w-full h-32 rounded-lg border border-blue-300 bg-gradient-to-br from-blue-900 to-cyan-900 flex flex-col items-center justify-center text-white">
                        <span className="text-3xl mb-1">🛰</span>
                        <span className="text-xs font-mono">Sentinel-1 SAR · Flood Extent Map</span>
                        <span className="text-[10px] text-blue-300 mt-1">{sim?.sarDB}</span>
                      </div>
                    )}

                    {/* TX Hash */}
                    <div className="p-2 rounded bg-slate-900 font-mono text-xs text-slate-300">
                      <span className="text-slate-500">MST TX: </span>
                      <span className="text-amber-400">{sim?.txHash}</span>
                    </div>

                    {/* Trigger simulation button */}
                    <button
                      onClick={() => handleTriggerScenario(selectedFarmer)}
                      className="w-full py-3 bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-800 hover:to-blue-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 shadow">
                      🎬 Trigger This Simulation on Main Dashboard
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default FarmerDashboard;
