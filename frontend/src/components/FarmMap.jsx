import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Polygon, Popup, useMap } from 'react-leaflet';
import { MapPin, RefreshCw, AlertCircle, Wifi, WifiOff, UserPlus } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

import { ethers } from 'ethers';
import { getFarmRegistryContract } from '../utils/web3';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAJULI_CENTER = [26.95, 94.22];
const DEFAULT_ZOOM  = 11;

// Demo plots shown when Hardhat node is offline
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

// Janaki's contract stores GeoJSON as {type:'Polygon', coordinates:[[[lng,lat]...]]}
// Leaflet needs [[lat,lng]]
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

  // ── Fetch on-chain plots using Janaki's real ABI ───────────────────────────
  const fetchOnChainPlots = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
      const contract = getFarmRegistryContract(provider);
      if (!contract) throw new Error('Contract not initialised');

      // ✅ Janaki's real method: getPlotCount() (not plotCounter)
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
          // ✅ Janaki's real method: getFarmPlot(plotId) returns FarmPlot struct
          const plot = await contract.getFarmPlot(i);
          // ✅ Janaki's real field names: ownerWallet, polygonGeoJSON, isEnrolled, acreage
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
        // Center on the MOST RECENTLY enrolled plot!
        setMapCenter(fetched[fetched.length - 1].coordinates[0]);
        setMapZoom(13);
      } else {
        setPlots(DEMO_FARM_PLOTS);
        setChainConnected(true);
      }
    } catch (err) {
      console.warn('FarmRegistry offline:', err.message);
      setChainConnected(false);
      setErrorMsg('Hardhat node offline — showing demo plots');
      setPlots(DEMO_FARM_PLOTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOnChainPlots(); }, [fetchOnChainPlots]);

  // ── Append QR-scanned plot ─────────────────────────────────────────────────
  useEffect(() => {
    if (!qrScannedPlot) return;
    const newPlot = {
      id:          `qr-${qrScannedPlot.id}`,
      name:        `${qrScannedPlot.village} (QR Scan)`,
      farmer:      qrScannedPlot.khasraNo,
      coordinates: qrScannedPlot.coordinates,
      cropType:    qrScannedPlot.cropType,
      acreage:     Math.round(qrScannedPlot.areaHectares * 247), // ha → acreage ×100 approx
      isActive:    true,
      source:      'qr',
    };
    setPlots(prev => [...prev.filter(p => p.id !== newPlot.id), newPlot]);
    if (qrScannedPlot.center) { setMapCenter(qrScannedPlot.center); setMapZoom(14); }
  }, [qrScannedPlot]);

  // ── Flood scenario colour overlay ─────────────────────────────────────────
  const scenarioStyle = (plot) => {
    if (activeScenario === 'assam-flood' && plot.source !== 'qr')
      return { color: '#f97316', fillColor: '#f97316' };
    if (activeScenario === 'bihar-flood' && plot.source === 'qr')
      return { color: '#ef4444', fillColor: '#ef4444' };
    return { color: statusColor(plot.isActive, plot.source), fillColor: statusColor(plot.isActive, plot.source) };
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-xl shadow-md p-6 h-[620px] flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <MapPin className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-bold text-gray-900">
            Farm Plots {chainConnected ? '— On-Chain' : '— Majuli, Assam'}
          </h2>
        </div>

        <div className="flex items-center space-x-2">
          {/* Chain badge */}
          <span className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-semibold
            ${chainConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {chainConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            <span>{chainConnected ? 'On-chain' : 'Demo'}</span>
          </span>

          {/* Enroll button */}
          {onEnrollClick && (
            <button
              onClick={onEnrollClick}
              className="flex items-center space-x-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              <UserPlus className="w-3 h-3" />
              <span>Enroll Farm</span>
            </button>
          )}

          {/* Refresh */}
          <button onClick={fetchOnChainPlots} disabled={loading}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Legend */}
          <div className="hidden sm:flex items-center space-x-3">
            {[['bg-green-500','Active'],['bg-indigo-500','QR'],['bg-orange-500','At Risk']].map(([c,l]) => (
              <div key={l} className="flex items-center space-x-1">
                <div className={`w-3 h-3 ${c} rounded-sm`} />
                <span className="text-xs text-gray-500">{l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Error banner */}
      {errorMsg && (
        <div className="flex items-center space-x-2 mb-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Flood banner */}
      {activeScenario && activeScenario !== 'reset' && (
        <div className="flex items-center space-x-2 mb-2 px-3 py-2 bg-red-50 border border-red-300 rounded-lg text-xs text-red-800 animate-pulse">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>
            <strong>FLOOD ALERT:</strong>{' '}
            {activeScenario === 'assam-flood' ? 'Assam (Majuli region)' : 'Bihar farmlands'}{' '}
            — emergency payout triggered by AI oracle
          </span>
        </div>
      )}

      {/* Map */}
      <div className="flex-1 rounded-lg overflow-hidden border border-gray-200 relative">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-sm">
            <div className="flex flex-col items-center space-y-2">
              <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
              <p className="text-sm text-gray-600">Fetching on-chain plots…</p>
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
                    {plot.source === 'qr'    && <span className="mt-1 inline-block px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full">📱 QR Scan</span>}
                    {plot.source === 'chain' && <span className="mt-1 inline-block px-2 py-0.5 bg-green-100  text-green-700  text-xs rounded-full">⛓ On-chain</span>}
                  </div>
                </Popup>
              </Polygon>
            );
          })}
        </MapContainer>
      </div>

      {/* Selected plot bar */}
      {selectedPlot && (
        <div className="mt-2 p-3 bg-indigo-50 rounded-lg border border-indigo-200 flex items-center justify-between">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Selected:</span> {selectedPlot.name}
            <span className="ml-2 text-indigo-600">• {selectedPlot.cropType}</span>
          </p>
          <button onClick={() => setSelectedPlot(null)} className="text-gray-400 hover:text-gray-600 text-xs ml-4">✕</button>
        </div>
      )}

      <p className="mt-1 text-xs text-gray-400 text-right">
        {plots.length} plot{plots.length !== 1 ? 's' : ''} displayed
        {plots.some(p => p.source === 'qr') && ' (incl. QR scan)'}
      </p>
    </div>
  );
};

export default FarmMap;
