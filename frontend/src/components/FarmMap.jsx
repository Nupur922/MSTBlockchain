import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Polygon, Popup, useMap } from 'react-leaflet';
import { MapPin, RefreshCw, AlertCircle, Wifi, WifiOff, UserPlus } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

import { ethers } from 'ethers';
import { getFarmRegistryContract, RPC_URL, HARDHAT_RPC_URL } from '../utils/web3';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAJULI_CENTER = [26.95, 94.22];
const DEFAULT_ZOOM  = 11;

// Demo plots shown when offline
const DEMO_FARM_PLOTS = [
  {
    id: 1,
    name: 'Plot A — Rice Farm (Demo)',
    farmer: 'Ravi Kumar',
    coordinates: [[26.96, 94.20],[26.97, 94.20],[26.97, 94.22],[26.96, 94.22]],
    cropType: 'Rice', isActive: true, acreage: 250, source: 'demo',
  },
  {
    id: 2,
    name: 'Plot B — Wheat Farm (Demo)',
    farmer: 'Anjali Devi',
    coordinates: [[26.94, 94.23],[26.95, 94.23],[26.95, 94.25],[26.94, 94.25]],
    cropType: 'Wheat', isActive: true, acreage: 150, source: 'demo',
  },
  {
    id: 3,
    name: 'Plot C — Vegetable Farm (Demo)',
    farmer: 'Suresh Patel',
    coordinates: [[26.93, 94.19],[26.94, 94.19],[26.94, 94.21],[26.93, 94.21]],
    cropType: 'Vegetables', isActive: true, acreage: 100, source: 'demo',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const parseGeoJsonToLeaflet = (geoJsonStr) => {
  try {
    const geo = JSON.parse(geoJsonStr);
    if (geo.type === 'Polygon' && Array.isArray(geo.coordinates?.[0])) {
      return geo.coordinates[0].map(([lng, lat]) => [lat, lng]);
    }
  } catch { /* ignore */ }
  return null;
};

const statusColor = (isActive, source) => {
  if (source === 'qr')   return '#6366f1';
  if (!isActive)         return '#ef4444';
  return '#10b981';
};

// ─── Map re-centring child component ─────────────────────────────────────────

const MapRecenter = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => { if (center) map.setView(center, zoom ?? DEFAULT_ZOOM); }, [center, zoom, map]);
  return null;
};

// ─── Main Component ───────────────────────────────────────────────────────────

const FarmMap = ({ qrScannedPlot, activeScenario, onEnrollClick }) => {
  const [plots,          setPlots]          = useState(DEMO_FARM_PLOTS);
  const [selectedPlot,   setSelectedPlot]   = useState(null);
  const [loading,        setLoading]        = useState(false);
  const [chainConnected, setChainConnected] = useState(false);
  const [errorMsg,       setErrorMsg]       = useState(null);
  const [mapCenter,      setMapCenter]      = useState(MAJULI_CENTER);
  const [mapZoom,        setMapZoom]        = useState(DEFAULT_ZOOM);

  const fetchOnChainPlots = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      let provider;
      try {
        provider = new ethers.JsonRpcProvider(RPC_URL);
        await provider.getNetwork();
      } catch {
        provider = new ethers.JsonRpcProvider(HARDHAT_RPC_URL);
        await provider.getNetwork();
      }
      const contract = getFarmRegistryContract(provider);
      if (!contract) throw new Error('Contract not initialised');

      const countBig = await contract.getPlotCount();
      const count    = Number(countBig);

      if (count === 0) {
        setChainConnected(true);
        setPlots(DEMO_FARM_PLOTS);
        return;
      }

      const fetched = [];
      for (let i = 1; i <= count; i++) {
        try {
          const plot = await contract.getFarmPlot(i);
          const { ownerWallet, polygonGeoJSON, cropType, isEnrolled, acreage } = plot;

          const coords = parseGeoJsonToLeaflet(polygonGeoJSON);
          if (!coords) continue;

          fetched.push({
            id:          i,
            name:        `Plot #${i} — ${cropType}`,
            farmer:      ownerWallet,
            coordinates: coords,
            cropType,
            acreage:     Number(acreage),
            isActive:    isEnrolled,
            source:      'chain',
          });
        } catch (e) {
          console.warn(`Plot #${i} fetch failed:`, e.message);
        }
      }

      if (fetched.length > 0) {
        setPlots(fetched);
        setChainConnected(true);
        setMapCenter(fetched[fetched.length - 1].coordinates[0]);
        setMapZoom(13);
      } else {
        setPlots(DEMO_FARM_PLOTS);
        setChainConnected(true);
      }
    } catch (err) {
      console.warn('FarmRegistry offline:', err.message);
      setChainConnected(false);
      setErrorMsg('MST Blockchain offline — showing demo plots');
      setPlots(DEMO_FARM_PLOTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOnChainPlots(); }, [fetchOnChainPlots]);

  // Auto-retry every 5 seconds until chain connects
  useEffect(() => {
    if (chainConnected) return;
    const id = setInterval(() => {
      if (!chainConnected) fetchOnChainPlots();
    }, 5000);
    return () => clearInterval(id);
  }, [chainConnected, fetchOnChainPlots]);

  useEffect(() => {
    if (!qrScannedPlot) return;
    const newPlot = {
      id:          `qr-${qrScannedPlot.id}`,
      name:        `${qrScannedPlot.village} (QR Scan)`,
      farmer:      qrScannedPlot.khasraNo,
      coordinates: qrScannedPlot.coordinates,
      cropType:    qrScannedPlot.cropType,
      acreage:     Math.round(qrScannedPlot.areaHectares * 247),
      isActive:    true,
      source:      'qr',
    };
    setPlots(prev => [...prev.filter(p => p.id !== newPlot.id), newPlot]);
    if (qrScannedPlot.center) { setMapCenter(qrScannedPlot.center); setMapZoom(14); }
  }, [qrScannedPlot]);

  const scenarioStyle = (plot) => {
    if (activeScenario === 'assam-flood' && plot.source !== 'qr')
      return { color: '#f97316', fillColor: '#f97316' };
    if (activeScenario === 'bihar-flood' && plot.source === 'qr')
      return { color: '#ef4444', fillColor: '#ef4444' };
    return { color: statusColor(plot.isActive, plot.source), fillColor: statusColor(plot.isActive, plot.source) };
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-emerald-500 p-6 h-[620px] flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
        <div className="flex items-center space-x-2">
          <MapPin className="w-5 h-5 text-emerald-600" />
          <div>
            <h2 className="text-lg font-extrabold text-gray-900">
              Farm Plot Registry — GIS Satellite Overlay
            </h2>
            <p className="text-xs text-gray-500 font-medium">
              {chainConnected ? 'On-chain plot registry' : 'Demo mode'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Chain Status Badge */}
          <span className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
            chainConnected ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500 border border-gray-200'
          }`}>
            {chainConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            <span>{chainConnected ? 'MST Testnet' : 'Demo'}</span>
          </span>

          {/* Enroll Button */}
          {onEnrollClick && (
            <button
              onClick={onEnrollClick}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Enroll Farm</span>
            </button>
          )}

          {/* Refresh */}
          <button onClick={fetchOnChainPlots} disabled={loading}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && !chainConnected && (
        <div className="flex items-center space-x-2 mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 font-medium">
          <RefreshCw className="w-3.5 h-3.5 flex-shrink-0 animate-spin" />
          <span>Connecting to MST Blockchain — retrying every 5s…</span>
          <button onClick={fetchOnChainPlots} className="ml-auto underline font-bold hover:text-amber-900">Retry now</button>
        </div>
      )}

      {/* Disaster Alert Banner */}
      {activeScenario && activeScenario !== 'reset' && (
        <div className="flex items-center space-x-2 mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 font-bold animate-pulse">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>
            <strong>FLOOD ALERT:</strong>{' '}
            {activeScenario === 'assam-flood' ? 'Assam (Majuli)' : 'Bihar farmlands'}{' '}
            — emergency payout triggered
          </span>
        </div>
      )}

      {/* Map Container */}
      <div className="flex-1 rounded-xl overflow-hidden border-2 border-gray-200 relative">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 backdrop-blur-sm">
            <div className="flex flex-col items-center space-y-2">
              <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
              <p className="text-sm text-gray-600 font-medium">Fetching plots…</p>
            </div>
          </div>
        )}
        <MapContainer center={MAJULI_CENTER} zoom={DEFAULT_ZOOM} style={{ height: '100%', width: '100%' }}>
          <MapRecenter center={mapCenter} zoom={mapZoom} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {plots.map(plot => {
            const style = scenarioStyle(plot);
            return (
              <Polygon key={plot.id} positions={plot.coordinates}
                pathOptions={{
                  color: style.color, fillColor: style.fillColor,
                  fillOpacity: activeScenario && activeScenario !== 'reset' ? 0.65 : 0.4,
                  weight: plot.source === 'qr' ? 3 : 2,
                  dashArray: plot.source === 'qr' ? '6 3' : undefined,
                }}
                eventHandlers={{ click: () => setSelectedPlot(plot) }}
              >
                <Popup>
                  <div className="p-2 min-w-[170px]">
                    <p className="font-bold text-gray-900 text-sm mb-1">{plot.name}</p>
                    <p className="text-xs text-gray-600">
                      {plot.source === 'chain'
                        ? <>Wallet: <span className="font-mono">{plot.farmer.slice(0,6)}…{plot.farmer.slice(-4)}</span></>
                        : plot.source === 'qr'
                          ? <>Khasra: <span className="font-semibold">{plot.farmer}</span></>
                          : <>Farmer: {plot.farmer}</>}
                    </p>
                    <p className="text-xs text-gray-600">Crop: {plot.cropType}</p>
                    {plot.acreage > 0 && (
                      <p className="text-xs text-gray-600">Acreage: {(plot.acreage/100).toFixed(2)} acres</p>
                    )}
                    <p className="text-xs mt-1">
                      Status: <span className={`font-semibold ${plot.isActive ? 'text-green-600' : 'text-red-600'}`}>
                        {plot.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </p>
                    {plot.source === 'qr'    && <span className="mt-1 inline-block px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full font-bold">📱 QR Scan</span>}
                    {plot.source === 'chain' && <span className="mt-1 inline-block px-2 py-0.5 bg-green-100  text-green-700  text-xs rounded-full font-bold">⛓ On-chain</span>}
                  </div>
                </Popup>
              </Polygon>
            );
          })}
        </MapContainer>
      </div>

      {/* Selected Plot Bar */}
      {selectedPlot && (
        <div className="mt-3 p-3 bg-indigo-50 rounded-lg border border-indigo-200 flex items-center justify-between">
          <p className="text-sm text-gray-700 font-medium">
            <span className="font-bold">Selected:</span> {selectedPlot.name}
            <span className="ml-2 text-indigo-600">• {selectedPlot.cropType}</span>
          </p>
          <button onClick={() => setSelectedPlot(null)} className="text-gray-400 hover:text-gray-600 text-sm font-bold ml-4">✕</button>
        </div>
      )}

      <p className="mt-2 text-xs text-gray-400 text-right font-medium">
        {plots.length} plot{plots.length !== 1 ? 's' : ''} displayed
        {plots.some(p => p.source === 'qr') && ' (incl. QR scan)'}
      </p>
    </div>
  );
};

export default FarmMap;
