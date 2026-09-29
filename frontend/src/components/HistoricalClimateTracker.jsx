import React, { useState, useEffect, useRef } from 'react';
import { Activity, Waves, Leaf, CloudRain, Thermometer, ShieldCheck, AlertTriangle, Droplets, RefreshCw } from 'lucide-react';

const BRIDGE_URL = 'http://127.0.0.1:8000';
const DAY_LABELS = ['D-6', 'D-5', 'D-4', 'D-3', 'D-2', 'D-1', 'Today'];

// Healthy baseline fallback (shown before any farmer is selected)
const BASELINE = {
  farmer_name: null,
  days: DAY_LABELS,
  sar:  [-10.2, -10.5, -10.3, -10.8, -10.5, -10.6, -10.5],
  ndvi: [ 0.72,  0.74,  0.75,  0.76,  0.75,  0.75,  0.75],
  ndwi: [-0.15, -0.14, -0.13, -0.13, -0.14, -0.14, -0.12],
  rain: [8, 5, 12, 3, 7, 10, 6],
  temp: [28.5, 29.0, 28.8, 29.2, 28.9, 28.7, 28.5],
  consensus_day: null,
  status: 'HEALTHY_GROWING_CROP',
  hazard: 'NONE',
  payout_ratio: 0.0,
};

// ── SVG Sparkline for SAR ────────────────────────────────────────────────────
function SARSparkline({ values, consensusDay }) {
  const W = 300, H = 60;
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 10) - 5;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const threshY = H - ((-15 - min) / range) * (H - 10) - 5;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-16" preserveAspectRatio="none">
      {threshY >= 0 && threshY <= H && (
        <line x1="0" y1={threshY} x2={W} y2={threshY}
          stroke="#ef4444" strokeWidth="1.5" strokeDasharray="5 3" opacity="0.7" />
      )}
      {consensusDay !== null && (
        <line
          x1={((consensusDay / (values.length - 1)) * W).toFixed(1)} y1="0"
          x2={((consensusDay / (values.length - 1)) * W).toFixed(1)} y2={H}
          stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 2" opacity="0.9"
        />
      )}
      <polyline points={pts} fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {values.map((v, i) => {
        const x = (i / (values.length - 1)) * W;
        const y = H - ((v - min) / range) * (H - 10) - 5;
        return <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r="3.5"
          fill={v < -15 ? '#ef4444' : '#06b6d4'} stroke="white" strokeWidth="1.5" />;
      })}
    </svg>
  );
}

// ── Mini bar chart ────────────────────────────────────────────────────────────
function MiniBar({ value, max, color, label, unit, highlight }) {
  const pct = Math.max(4, Math.min(100, (value / max) * 100));
  return (
    <div className={`flex items-center gap-2 ${highlight ? 'rounded bg-amber-50 -mx-1 px-1' : ''}`}>
      <span className="text-[9px] text-slate-400 w-7 shrink-0 font-mono">{label}</span>
      <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[10px] font-mono font-bold w-12 text-right shrink-0 ${highlight ? 'text-amber-700' : 'text-slate-700'}`}>
        {typeof value === 'number' ? (Number.isInteger(value) ? value : value.toFixed(2)) : value}{unit}
      </span>
      {highlight && <span className="text-[9px] bg-amber-200 text-amber-800 font-bold rounded px-1">⚡</span>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function HistoricalClimateTracker({ activeScenario, selectedFarmer, qrScannedPlot }) {
  const [telemetry, setTelemetry] = useState(BASELINE);
  const [loading, setLoading]     = useState(false);
  const [source, setSource]       = useState('baseline'); // 'live' | 'baseline'
  const [lastFetch, setLastFetch] = useState(null);
  const abortRef = useRef(null);

  // Determine what to fetch — priority: activeScenario > selectedFarmer.scenario > qrScannedPlot.state
  const fetchKey = activeScenario
    || selectedFarmer?.scenario
    || (qrScannedPlot?.state ? `state:${qrScannedPlot.state}` : null);

  useEffect(() => {
    if (!fetchKey) {
      setTelemetry(BASELINE);
      setSource('baseline');
      return;
    }

    // Abort previous fetch
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);

    const isStateKey = fetchKey.startsWith('state:');
    const param = isStateKey
      ? `state=${encodeURIComponent(fetchKey.replace('state:', ''))}`
      : `scenario=${encodeURIComponent(fetchKey)}`;

    fetch(`${BRIDGE_URL}/api/live-telemetry?${param}`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => {
        if (data?.telemetry) {
          setTelemetry(data.telemetry);
          setSource('live');
          setLastFetch(new Date());
        }
        setLoading(false);
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        // Bridge offline — keep showing current data, just mark as offline
        setSource('offline');
        setLoading(false);
      });

    return () => controller.abort();
  }, [fetchKey]);

  const t = telemetry;
  const isDisaster = t.consensus_day !== null;
  const farmerName = t.farmer_name
    || selectedFarmer?.name
    || qrScannedPlot?.farmerName
    || null;

  const maxNdvi = 1.0;
  const maxRain = Math.max(...(t.rain || [1]), 1);
  const maxTemp = Math.max(...(t.temp || [1]), 1);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-teal-500 to-cyan-600 p-2.5 rounded-xl shadow-sm">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-sm">7-Day Satellite Telemetry</h3>
              {loading && <RefreshCw className="w-3.5 h-3.5 text-teal-500 animate-spin" />}
              <span className={`flex items-center gap-1 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                source === 'live' ? 'bg-teal-100 text-teal-700' :
                source === 'offline' ? 'bg-red-100 text-red-600' :
                'bg-slate-100 text-slate-500'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  source === 'live' ? 'bg-teal-500 animate-pulse' :
                  source === 'offline' ? 'bg-red-400' : 'bg-slate-400'
                }`} />
                {source === 'live' ? 'Live Bridge' : source === 'offline' ? 'Bridge Offline' : 'Baseline'}
              </span>
            </div>
            {farmerName ? (
              <p className="text-sm font-bold text-slate-800 mt-0.5">👨‍🌾 {farmerName}</p>
            ) : (
              <p className="text-xs text-slate-400 mt-0.5">
                {fetchKey ? 'Loading farmer data…' : 'Select a farmer or trigger a scenario'}
              </p>
            )}
          </div>
        </div>

        {/* Consensus badge */}
        {isDisaster ? (
          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 shrink-0">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <div>
              <p className="text-[9px] font-bold text-amber-700 uppercase tracking-wide">2-of-3 Breached</p>
              <p className="text-xs font-semibold text-amber-900">{DAY_LABELS[t.consensus_day]}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <div>
              <p className="text-[9px] font-bold text-emerald-700 uppercase tracking-wide">No Disaster</p>
              <p className="text-xs text-emerald-600">Healthy Season</p>
            </div>
          </div>
        )}
      </div>

      {/* ── No farmer selected empty state ── */}
      {!fetchKey && (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <div className="text-4xl mb-3">🛰️</div>
          <p className="text-slate-500 text-sm font-medium">No farmer selected</p>
          <p className="text-slate-400 text-xs mt-1">Click a farmer card in the Krishi Mitra portal, or trigger a disaster scenario above</p>
        </div>
      )}

      {/* ── Charts grid ── */}
      {fetchKey && (
        <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* SAR Sparkline */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <Waves className="w-3.5 h-3.5 text-cyan-500" />
                Sentinel-1 SAR Backscatter
              </div>
              <span className="text-[10px] font-mono font-bold text-cyan-700">
                {t.sar?.[t.sar.length - 1]?.toFixed(1)} dB
              </span>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <SARSparkline values={t.sar || []} consensusDay={t.consensus_day} />
              <div className="flex justify-between mt-1">
                {(t.days || DAY_LABELS).map((d, i) => (
                  <span key={i} className={`text-[9px] font-mono ${i === t.consensus_day ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>{d}</span>
                ))}
              </div>
            </div>
            <div className="flex gap-3 text-[9px] text-slate-400 flex-wrap">
              <span className="flex items-center gap-1"><span className="w-3 border-t-2 border-dashed border-red-400 inline-block" /> −15 dB flood threshold</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> flood</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" /> dry</span>
            </div>
          </div>

          {/* NDVI bars */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <Leaf className="w-3.5 h-3.5 text-emerald-500" />
                Sentinel-2 NDVI Vegetation
              </div>
              <span className="text-[10px] font-mono font-bold text-emerald-700">
                {t.ndvi?.[t.ndvi.length - 1]?.toFixed(2)} NDVI
              </span>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1.5">
              {(t.ndvi || []).map((v, i) => (
                <MiniBar key={i}
                  value={v} max={maxNdvi} unit=""
                  label={(t.days || DAY_LABELS)[i]}
                  highlight={i === t.consensus_day}
                  color={v > 0.5 ? 'bg-emerald-500' : v > 0.35 ? 'bg-amber-400' : v > 0.2 ? 'bg-orange-500' : 'bg-red-500'}
                />
              ))}
            </div>
          </div>

          {/* NDWI bars */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <Droplets className="w-3.5 h-3.5 text-blue-500" />
                Sentinel-2 NDWI Water Index
              </div>
              <span className="text-[10px] font-mono font-bold text-blue-700">
                {t.ndwi?.[t.ndwi.length - 1]?.toFixed(3)}
              </span>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1.5">
              {(t.ndwi || []).map((v, i) => {
                const normalized = (v + 1) / 2; // normalize -1..1 to 0..1
                const color = v > 0.3 ? 'bg-blue-600' : v > 0 ? 'bg-blue-400' : v > -0.2 ? 'bg-slate-300' : 'bg-amber-400';
                return (
                  <MiniBar key={i}
                    value={v} max={1} unit=""
                    label={(t.days || DAY_LABELS)[i]}
                    highlight={i === t.consensus_day}
                    color={color}
                  />
                );
              })}
            </div>
            <div className="flex gap-3 text-[9px] text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-blue-600 inline-block" /> &gt;0.3 water/flood</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-400 inline-block" /> &lt;−0.35 drought</span>
            </div>
          </div>

          {/* Rain + Temp */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <CloudRain className="w-3.5 h-3.5 text-blue-400" />
                IMD Precipitation &amp;
                <Thermometer className="w-3.5 h-3.5 text-rose-400 ml-1" />
                LST Temp
              </div>
              <span className="text-[10px] font-mono font-bold text-blue-600">
                Σ {(t.rain || []).reduce((a, b) => a + b, 0)} mm
              </span>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1.5">
              {(t.rain || []).map((rain, i) => {
                const temp = t.temp?.[i] ?? 0;
                const isHot = temp >= 42;
                return (
                  <div key={i} className={`flex items-center gap-2 ${i === t.consensus_day ? 'rounded bg-amber-50 -mx-1 px-1' : ''}`}>
                    <span className="text-[9px] text-slate-400 w-7 shrink-0 font-mono">{(t.days || DAY_LABELS)[i]}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div className={`h-full rounded-full ${rain >= 120 ? 'bg-blue-600' : 'bg-blue-300'}`}
                        style={{ width: `${Math.max(4, (rain / maxRain) * 100)}%` }} />
                    </div>
                    <span className="text-[10px] font-mono text-slate-600 w-10 text-right shrink-0">{rain}mm</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                      isHot ? 'bg-red-100 text-red-700' : temp >= 36 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'
                    }`}>{temp.toFixed(1)}°</span>
                    {i === t.consensus_day && <span className="text-[9px] bg-amber-200 text-amber-800 font-bold rounded px-1">⚡</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Consensus summary footer ── */}
      {fetchKey && isDisaster && (
        <div className="mx-5 mb-5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="text-xs font-bold text-amber-800">
              Oracle Consensus Breached on {DAY_LABELS[t.consensus_day]}
              {' — '}SAR {t.sar?.[t.consensus_day]?.toFixed(1)} dB
              {'  ·  '}NDVI {t.ndvi?.[t.consensus_day]?.toFixed(2)}
              {'  ·  '}{t.rain?.[t.consensus_day]} mm rain
            </span>
          </div>
          <span className="text-[10px] bg-amber-200 text-amber-900 font-bold rounded-full px-3 py-1 shrink-0 whitespace-nowrap">
            Payout {((t.payout_ratio || 0) * 100).toFixed(0)}% · ₹{Math.round((t.payout_ratio || 0) * 40000).toLocaleString('en-IN')}
          </span>
        </div>
      )}

      {lastFetch && source === 'live' && (
        <div className="px-5 pb-3 text-[9px] text-slate-400 text-right">
          Last fetched from bridge: {lastFetch.toLocaleTimeString('en-IN')}
        </div>
      )}
    </div>
  );
}
