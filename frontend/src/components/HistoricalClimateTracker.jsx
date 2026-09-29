import React, { useMemo } from 'react';
import { Activity, Waves, Leaf, CloudRain, Thermometer, ShieldCheck, AlertTriangle } from 'lucide-react';

/**
 * HistoricalClimateTracker — Version 3.0 New Feature
 * 7-Day Historical Telemetry & Micro-Climate Trend Visualizer
 *
 * Shows satellite telemetry history for the REGISTERED PLOT.
 * When a farmer scans their land record QR and registers their plot,
 * this tracker displays that plot's 7-day SAR/NDVI/Rain/Temp history.
 *
 * Props:
 *   activeTelemetry  — current telemetry object from App.jsx state
 *   activeScenario   — scenario slug string (e.g. "assam-flood") or null
 *   qrScannedPlot    — plot data from QR scan / enrollment (has state, farmerName, khasraNo, etc.)
 */

// ---------------------------------------------------------------------------
// Scenario-specific 7-day historical data seeds
// ---------------------------------------------------------------------------

const SCENARIO_HISTORY = {
  'assam-flood': {
    label: 'Brahmaputra Monsoon Flood — Majuli, Assam',
    consensusDay: 4,       // day index (0-based) when 2-of-3 breached
    consensusTime: '14:32 IST',
    sar:  [-6.2, -8.4, -11.1, -14.8, -17.3, -19.5, -22.4],
    ndvi: [0.78, 0.72, 0.61, 0.49, 0.38, 0.30, 0.28],
    rain: [12,   28,   55,   110,  180,  210,  195],
    temp: [29.1, 28.4, 27.8, 26.5, 25.2, 24.8, 24.0],
  },
  'bihar-flood': {
    label: 'Kosi River Monsoon Flood — Darbhanga, Bihar',
    consensusDay: 3,
    consensusTime: '09:15 IST',
    sar:  [-5.8, -9.2, -13.4, -18.1, -21.0, -23.5, -24.1],
    ndvi: [0.76, 0.68, 0.52, 0.38, 0.25, 0.20, 0.18],
    rain: [18,   42,   88,   145,  210,  240,  220],
    temp: [30.2, 29.1, 27.5, 26.2, 25.8, 25.5, 25.5],
  },
  'maharashtra-drought': {
    label: 'Marathwada Flash Drought — Nashik, Maharashtra',
    consensusDay: 5,
    consensusTime: '11:48 IST',
    sar:  [-9.1, -8.8, -8.5, -8.3, -8.1, -8.0, -8.5],
    ndvi: [0.68, 0.62, 0.55, 0.47, 0.40, 0.35, 0.32],
    rain: [4,    2,    0,    0,    1,    0,    0],
    temp: [34.0, 35.2, 36.8, 37.5, 38.0, 38.3, 38.5],
  },
  'punjab-heatwave': {
    label: 'Scorching Wheat Heatwave — Ludhiana, Punjab',
    consensusDay: 4,
    consensusTime: '13:05 IST',
    sar:  [-9.5, -9.2, -9.0, -8.9, -8.8, -9.0, -9.0],
    ndvi: [0.70, 0.66, 0.60, 0.52, 0.47, 0.44, 0.42],
    rain: [0,    0,    0,    0,    0,    0,    1],
    temp: [38.5, 40.1, 41.8, 43.0, 44.0, 44.5, 44.2],
  },
  'karnataka-flood': {
    label: 'Cauvery River Flood — Mandya, Karnataka',
    consensusDay: 3,
    consensusTime: '16:22 IST',
    sar:  [-7.0, -10.2, -14.5, -17.0, -18.2, -18.0, -18.2],
    ndvi: [0.74, 0.65, 0.50, 0.35, 0.28, 0.25, 0.25],
    rain: [22,   55,   100,  160,  195,  210,  200],
    temp: [28.5, 27.8, 27.0, 26.5, 26.8, 27.0, 27.0],
  },
  'tn-harvest-rain': {
    label: 'Samba Harvest Rain — Thanjavur, Tamil Nadu',
    consensusDay: 2,
    consensusTime: '08:55 IST',
    sar:  [-8.5, -9.8, -11.5, -12.0, -11.8, -11.5, -11.0],
    ndvi: [0.65, 0.55, 0.38, 0.28, 0.22, 0.20, 0.20],
    rain: [30,   85,   140,  125,  90,   70,   55],
    temp: [28.0, 27.5, 27.0, 27.2, 27.5, 28.0, 26.0],
  },
};

// Default healthy-season baseline (shown when no disaster scenario is active)
const DEFAULT_HISTORY = {
  label: 'Healthy Growing Season — Baseline Telemetry',
  consensusDay: null,
  consensusTime: null,
  sar:  [-10.2, -10.5, -10.3, -10.8, -10.5, -10.6, -10.5],
  ndvi: [0.72,  0.74,  0.75,  0.76,  0.75,  0.75,  0.75],
  rain: [8,     5,     12,    3,     7,     10,    6],
  temp: [28.5,  29.0,  28.8,  29.2,  28.9,  28.7,  28.5],
};

// Map a plot's state name → which scenario history to use for telemetry
const STATE_TO_SCENARIO = {
  'Assam':        'assam-flood',
  'Bihar':        'bihar-flood',
  'Maharashtra':  'maharashtra-drought',
  'Punjab':       'punjab-heatwave',
  'Karnataka':    'karnataka-flood',
  'Tamil Nadu':   'tn-harvest-rain',
  'Gujarat':      'bihar-flood',       // nearest climate analog
  'West Bengal':  'assam-flood',
};

// Day labels — D-6 to D-0 (today)
const DAY_LABELS = ['D-6', 'D-5', 'D-4', 'D-3', 'D-2', 'D-1', 'Today'];

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------

/** SAR sparkline rendered as an SVG polyline */
function SARSparkline({ values, consensusDay }) {
  const W = 280, H = 56;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 8) - 4;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  // Threshold line at -15 dB
  const threshY = H - ((-15 - min) / range) * (H - 8) - 4;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-14" preserveAspectRatio="none">
      {/* -15 dB threshold line */}
      {threshY >= 0 && threshY <= H && (
        <line x1="0" y1={threshY} x2={W} y2={threshY}
          stroke="#ef4444" strokeWidth="1" strokeDasharray="4 3" opacity="0.6" />
      )}
      {/* Consensus breach vertical */}
      {consensusDay !== null && (
        <line
          x1={((consensusDay / (values.length - 1)) * W).toFixed(1)}
          y1="0"
          x2={((consensusDay / (values.length - 1)) * W).toFixed(1)}
          y2={H}
          stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.8"
        />
      )}
      {/* SAR line */}
      <polyline points={pts} fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinejoin="round" />
      {/* Dots */}
      {values.map((v, i) => {
        const x = (i / (values.length - 1)) * W;
        const y = H - ((v - min) / range) * (H - 8) - 4;
        const isFlood = v < -15;
        return (
          <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r="3"
            fill={isFlood ? '#ef4444' : '#06b6d4'} stroke="white" strokeWidth="1" />
        );
      })}
    </svg>
  );
}

/** NDVI gradient health bar */
function NDVIBar({ values, consensusDay }) {
  return (
    <div className="space-y-1.5">
      {values.map((v, i) => {
        const pct = Math.max(5, Math.min(100, v * 100));
        const color = v > 0.5
          ? 'bg-emerald-500'
          : v > 0.35
          ? 'bg-amber-400'
          : v > 0.2
          ? 'bg-orange-500'
          : 'bg-red-500';
        const isBreachDay = i === consensusDay;
        return (
          <div key={i} className={`flex items-center gap-2 ${isBreachDay ? 'ring-1 ring-amber-400 rounded' : ''}`}>
            <span className="text-[9px] text-gray-400 w-7 shrink-0 font-mono">{DAY_LABELS[i]}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${color}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className={`text-[10px] font-mono font-bold w-8 text-right shrink-0 ${
              v > 0.5 ? 'text-emerald-700' : v > 0.35 ? 'text-amber-600' : 'text-red-600'
            }`}>{v.toFixed(2)}</span>
            {isBreachDay && (
              <span className="text-[9px] bg-amber-100 text-amber-700 font-bold rounded px-1">⚡</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Rain + Temperature histogram */
function RainTempHistogram({ rainValues, tempValues, consensusDay }) {
  const maxRain = Math.max(...rainValues, 1);
  return (
    <div className="space-y-1">
      {rainValues.map((rain, i) => {
        const pct = Math.max(4, (rain / maxRain) * 100);
        const isHeavy = rain >= 120;
        const isBreachDay = i === consensusDay;
        const temp = tempValues[i];
        const isThermalStress = temp >= 42;
        return (
          <div key={i} className={`flex items-center gap-2 ${isBreachDay ? 'ring-1 ring-amber-400 rounded' : ''}`}>
            <span className="text-[9px] text-gray-400 w-7 shrink-0 font-mono">{DAY_LABELS[i]}</span>
            {/* Rain bar */}
            <div className="flex-1 bg-gray-100 rounded-sm h-4 overflow-hidden relative">
              <div
                className={`h-full rounded-sm ${isHeavy ? 'bg-blue-600' : 'bg-blue-300'}`}
                style={{ width: `${pct}%` }}
              />
              <span className="absolute right-1 top-0 text-[9px] font-mono text-gray-600 leading-4">
                {rain}mm
              </span>
            </div>
            {/* Temp badge */}
            <span className={`text-[9px] font-bold rounded px-1.5 py-0.5 shrink-0 ${
              isThermalStress
                ? 'bg-red-100 text-red-700'
                : temp >= 35
                ? 'bg-orange-100 text-orange-700'
                : 'bg-slate-100 text-slate-600'
            }`}>
              {temp.toFixed(1)}°C
            </span>
            {isBreachDay && (
              <span className="text-[9px] bg-amber-100 text-amber-700 font-bold rounded px-1">⚡</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function HistoricalClimateTracker({ activeTelemetry, activeScenario, qrScannedPlot, selectedFarmer }) {
  const history = useMemo(() => {
    // Priority 1: active disaster scenario (Demo Control Panel button clicked)
    if (activeScenario && SCENARIO_HISTORY[activeScenario]) {
      return SCENARIO_HISTORY[activeScenario];
    }
    // Priority 2: farmer selected in FarmerDashboard — use their scenario
    if (selectedFarmer?.scenario && SCENARIO_HISTORY[selectedFarmer.scenario]) {
      return SCENARIO_HISTORY[selectedFarmer.scenario];
    }
    // Priority 3: registered/scanned plot — use its state to pick climate history
    if (qrScannedPlot?.state) {
      const scenarioKey = STATE_TO_SCENARIO[qrScannedPlot.state];
      if (scenarioKey && SCENARIO_HISTORY[scenarioKey]) {
        return SCENARIO_HISTORY[scenarioKey];
      }
    }
    // Priority 4: healthy baseline (no plot registered, no scenario active)
    return DEFAULT_HISTORY;
  }, [activeScenario, selectedFarmer, qrScannedPlot]);

  // Resolve farmer name: selectedFarmer > scanned plot > scenario default > generic
  const farmerName = selectedFarmer?.name
    || qrScannedPlot?.farmerName
    || qrScannedPlot?.ownerName
    || history.farmerName
    || null;

  // Resolve plot reference: scanned plot > scenario default
  const plotRef = qrScannedPlot
    ? `${qrScannedPlot.khasraNo || qrScannedPlot.khasraNumber || 'Plot'} · ${qrScannedPlot.village || qrScannedPlot.district || ''}, ${qrScannedPlot.state || ''}`
    : (history.plotRef || null);

  const isDisaster = history.consensusDay !== null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-teal-500 p-6 space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-br from-teal-400 to-cyan-500 p-2.5 rounded-xl shadow-sm shadow-teal-100">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-extrabold text-lg text-gray-900">
                7-Day Historical Climate & Telemetry Tracker
              </h3>
              <span className="flex items-center bg-teal-100 text-teal-600 text-[10px] font-bold rounded-full px-2 py-0.5">
                <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse inline-block mr-1" />
                LIVE
              </span>
            </div>
            {/* Show registered farmer + plot info if available */}
            {farmerName ? (
              <div className="mt-1 space-y-0.5">
                <p className="text-sm font-bold text-gray-800">👨‍🌾 {farmerName}</p>
                {plotRef && <p className="text-xs text-gray-500">{plotRef}</p>}
              </div>
            ) : (
              <p className="text-xs text-gray-500 mt-0.5">{history.label}</p>
            )}
          </div>
        </div>

        {/* Consensus Breach Tag */}
        {isDisaster ? (
          <div className="flex items-center space-x-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 shrink-0">
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            <div>
              <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">
                2-of-3 Consensus Breached
              </p>
              <p className="text-xs font-semibold text-amber-900">
                {DAY_LABELS[history.consensusDay]} · {history.consensusTime}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 shrink-0">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <div>
              <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">
                No Disaster Threshold Crossed
              </p>
              <p className="text-xs text-emerald-600">Healthy Growing Season</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Grid: 2 columns on desktop ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Column 1: SAR Sparkline ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">
              <Waves className="w-3.5 h-3.5 text-cyan-500" />
              Sentinel-1 SAR Backscatter (7 Days)
            </div>
            <span className="text-[10px] font-mono text-cyan-700 font-bold">
              {history.sar[history.sar.length - 1].toFixed(1)} dB
            </span>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <SARSparkline values={history.sar} consensusDay={history.consensusDay} />
            <div className="flex justify-between mt-1.5">
              {DAY_LABELS.map((d, i) => (
                <span key={i} className={`text-[9px] font-mono ${
                  i === history.consensusDay ? 'text-amber-600 font-bold' : 'text-gray-400'
                }`}>{d}</span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-red-400 inline-block" style={{borderTop: '1px dashed'}} /> -15 dB flood threshold</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> flood detected</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" /> dry soil</span>
          </div>
        </div>

        {/* ── Column 2: NDVI Decay ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">
              <Leaf className="w-3.5 h-3.5 text-emerald-500" />
              Sentinel-2 NDVI Vegetation Decay
            </div>
            <span className="text-[10px] font-mono text-emerald-700 font-bold">
              {history.ndvi[history.ndvi.length - 1].toFixed(2)} NDVI
            </span>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <NDVIBar values={history.ndvi} consensusDay={history.consensusDay} />
          </div>
          <div className="flex items-center gap-3 text-[10px] text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-500 inline-block" /> &gt;0.50 healthy</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-400 inline-block" /> 0.35–0.50 stressed</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-500 inline-block" /> &lt;0.20 severe</span>
          </div>
        </div>

        {/* ── Column 3 (full width): Rain + Temp Histogram ── */}
        <div className="lg:col-span-2 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">
              <CloudRain className="w-3.5 h-3.5 text-blue-500" />
              IMD Precipitation (mm) &amp;
              <Thermometer className="w-3.5 h-3.5 text-rose-500 ml-1" />
              Land Surface Temperature (°C)
            </div>
            <span className="text-[10px] font-mono text-blue-700 font-bold">
              Cumulative: {history.rain.reduce((a, b) => a + b, 0)} mm / 7 days
            </span>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <RainTempHistogram
              rainValues={history.rain}
              tempValues={history.temp}
              consensusDay={history.consensusDay}
            />
          </div>
          <div className="flex items-center gap-4 text-[10px] text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-2.5 rounded-sm bg-blue-600 inline-block" /> ≥120mm critical rainfall</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2.5 rounded-sm bg-blue-300 inline-block" /> normal rain</span>
            <span className="flex items-center gap-1"><span className="px-1 bg-red-100 text-red-700 rounded text-[9px] font-bold">44°C</span> ≥42°C heatwave stress</span>
            {isDisaster && (
              <span className="flex items-center gap-1 text-amber-600 font-semibold">
                <span className="text-[10px]">⚡</span> consensus breach day
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Consensus Summary Row ── */}
      {isDisaster && (
        <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-200 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="text-xs font-bold text-amber-800">
              Oracle Consensus Breach on {DAY_LABELS[history.consensusDay]} at {history.consensusTime}
              {' — '}SAR {history.sar[history.consensusDay].toFixed(1)} dB &nbsp;·&nbsp;
              NDVI {history.ndvi[history.consensusDay].toFixed(2)} &nbsp;·&nbsp;
              Rain {history.rain[history.consensusDay]} mm
            </span>
          </div>
          <span className="text-[10px] bg-amber-200 text-amber-900 font-bold rounded-full px-3 py-1 shrink-0">
            2-of-3 FEEDS CONFIRMED
          </span>
        </div>
      )}
    </div>
  );
}
