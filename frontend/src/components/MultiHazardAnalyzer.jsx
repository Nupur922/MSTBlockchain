import React, { useState } from 'react';
import { Waves, Sun, Flame, ShieldAlert, Activity, Gauge, CloudRain } from 'lucide-react';

/**
 * MultiHazardAnalyzer — Version 3 Feature
 * Interactive Satellite Multi-Hazard Spectrum Analyzer (Flood SAR, Flash Drought NDWI, Heatwave LST).
 */
export default function MultiHazardAnalyzer({ activeTelemetry }) {
  const [selectedHazard, setSelectedHazard] = useState('ALL');

  const {
    ndvi_score = 0.75,
    sar_backscatter_db = -10.5,
    days_submerged = 0,
    ndwi_score = -0.12,
    lst_temp_c = 28.5,
    status = "HEALTHY_GROWING_CROP",
    payout_ratio = 0.0,
    hazard_type = "MONSOON_FLOOD"
  } = activeTelemetry || {};

  const isFlooded = days_submerged > 0 || sar_backscatter_db < -15.0;
  const isDrought = ndwi_score < -0.35;
  const isHeatwave = lst_temp_c > 42.0;

  return (
    <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-6 text-white space-y-6 shadow-2xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-br from-emerald-500/20 via-cyan-500/20 to-amber-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="font-extrabold text-lg bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 bg-clip-text text-transparent">
              V3 Multi-Hazard AI Satellite Analyzer
            </h3>
            <p className="text-xs text-slate-400">
              Real-time Sentinel-1 SAR + Sentinel-2 NDWI + Thermal LST Telemetry
            </p>
          </div>
        </div>

        {/* Hazard Filter Tabs */}
        <div className="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setSelectedHazard('ALL')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              selectedHazard === 'ALL'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Spectrum
          </button>
          <button
            onClick={() => setSelectedHazard('FLOOD')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center space-x-1 transition-all ${
              selectedHazard === 'FLOOD'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Waves className="w-3.5 h-3.5 mr-1" /> Flood SAR
          </button>
          <button
            onClick={() => setSelectedHazard('DROUGHT')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center space-x-1 transition-all ${
              selectedHazard === 'DROUGHT'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sun className="w-3.5 h-3.5 mr-1" /> Drought NDWI
          </button>
          <button
            onClick={() => setSelectedHazard('HEATWAVE')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center space-x-1 transition-all ${
              selectedHazard === 'HEATWAVE'
                ? 'bg-rose-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5 mr-1" /> Heatwave LST
          </button>
        </div>
      </div>

      {/* Grid of 3 Telemetry Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Gauge 1: Sentinel-1 SAR Flood Inundation */}
        <div className={`p-4 rounded-xl border transition-all ${
          isFlooded
            ? 'bg-cyan-950/40 border-cyan-500/50 shadow-lg shadow-cyan-950/40'
            : 'bg-slate-800/40 border-slate-700/50'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 flex items-center font-medium">
              <Waves className="w-4 h-4 mr-1.5 text-cyan-400" /> SAR Backscatter
            </span>
            <span className="font-mono text-xs font-bold text-cyan-300">
              {sar_backscatter_db.toFixed(1)} dB
            </span>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] text-slate-300">
              <span>Submersion Duration:</span>
              <span className={`font-bold ${days_submerged > 0 ? 'text-cyan-400' : 'text-emerald-400'}`}>
                {days_submerged > 0 ? `${days_submerged} Days` : 'Dry Soil'}
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-cyan-400 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(10, (days_submerged / 10) * 100))}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400">Threshold: &lt;-15.0 dB (Standing Water)</p>
          </div>
        </div>

        {/* Gauge 2: Sentinel-2 NDWI Soil Moisture Index */}
        <div className={`p-4 rounded-xl border transition-all ${
          isDrought
            ? 'bg-amber-950/40 border-amber-500/50 shadow-lg shadow-amber-950/40'
            : 'bg-slate-800/40 border-slate-700/50'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 flex items-center font-medium">
              <Sun className="w-4 h-4 mr-1.5 text-amber-400" /> NDWI Moisture
            </span>
            <span className="font-mono text-xs font-bold text-amber-300">
              {ndwi_score.toFixed(3)}
            </span>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] text-slate-300">
              <span>Water Stress Level:</span>
              <span className={`font-bold ${isDrought ? 'text-amber-400' : 'text-emerald-400'}`}>
                {isDrought ? 'CRITICAL DROUGHT' : 'Moist Soil'}
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${isDrought ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(100, Math.max(10, ((ndwi_score + 1) / 2) * 100))}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400">Threshold: &lt;-0.35 (Severe Moisture Loss)</p>
          </div>
        </div>

        {/* Gauge 3: Thermal LST Land Surface Temperature */}
        <div className={`p-4 rounded-xl border transition-all ${
          isHeatwave
            ? 'bg-rose-950/40 border-rose-500/50 shadow-lg shadow-rose-950/40'
            : 'bg-slate-800/40 border-slate-700/50'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 flex items-center font-medium">
              <Flame className="w-4 h-4 mr-1.5 text-rose-400" /> Thermal LST
            </span>
            <span className="font-mono text-xs font-bold text-rose-300">
              {lst_temp_c.toFixed(1)}°C
            </span>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] text-slate-300">
              <span>Crop Thermal Stress:</span>
              <span className={`font-bold ${isHeatwave ? 'text-rose-400' : 'text-emerald-400'}`}>
                {isHeatwave ? 'HEATWAVE ALERT' : 'Normal Temp'}
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${isHeatwave ? 'bg-rose-500' : 'bg-teal-500'}`}
                style={{ width: `${Math.min(100, Math.max(10, (lst_temp_c / 50) * 100))}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400">Threshold: &gt;42.0°C (Scorching Stress)</p>
          </div>
        </div>
      </div>

      {/* Disaster Alert Summary Bar */}
      {payout_ratio > 0 && (
        <div className="p-4 bg-gradient-to-r from-slate-900 via-rose-950/50 to-slate-900 border border-rose-500/40 rounded-xl flex flex-col md:flex-row items-center justify-between gap-3 shadow-xl">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-rose-500/20 rounded-xl border border-rose-500/30 text-rose-400 animate-bounce">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-sm text-rose-200">
                Multi-Hazard Disaster Event Verified: {hazard_type.replace('_', ' ')}
              </p>
              <p className="text-xs text-slate-400">
                2-of-3 Oracle Consensus Verified | Relief Ratio: {(payout_ratio * 100).toFixed(0)}%
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1.5 bg-rose-500 text-slate-950 font-black text-xs rounded-xl shadow-lg">
              {(payout_ratio * 50).toFixed(1)} MST Token Payout
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
