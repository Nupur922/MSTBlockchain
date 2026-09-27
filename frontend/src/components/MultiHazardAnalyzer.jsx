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
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 border-l-4 border-l-emerald-500 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-br from-emerald-400 to-teal-500 p-2.5 rounded-xl shadow-sm shadow-emerald-100">
            <Activity className="w-6 h-6 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-extrabold text-xl text-gray-900">
                V3 Multi-Hazard AI Satellite Analyzer
              </h3>
              <span className="flex items-center bg-emerald-100 text-emerald-600 text-[10px] font-bold rounded-full px-2 py-0.5">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse inline-block mr-1" />
                LIVE
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Real-time Sentinel-1 SAR + Sentinel-2 NDWI + Thermal LST Telemetry
            </p>
          </div>
        </div>

        {/* Hazard Filter Tabs */}
        <div className="flex items-center space-x-1 bg-gray-100 rounded-xl p-1 border border-gray-200 text-xs">
          <button
            onClick={() => setSelectedHazard('ALL')}
            className={`px-4 py-1.5 rounded-lg font-bold text-sm transition-all ${
              selectedHazard === 'ALL'
                ? 'bg-white shadow-sm text-emerald-700'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setSelectedHazard('FLOOD')}
            className={`px-4 py-1.5 rounded-lg font-bold text-sm flex items-center gap-1 transition-all ${
              selectedHazard === 'FLOOD'
                ? 'bg-white shadow-sm text-cyan-700'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Waves className="w-3.5 h-3.5" /> Flood
          </button>
          <button
            onClick={() => setSelectedHazard('DROUGHT')}
            className={`px-4 py-1.5 rounded-lg font-bold text-sm flex items-center gap-1 transition-all ${
              selectedHazard === 'DROUGHT'
                ? 'bg-white shadow-sm text-amber-700'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Sun className="w-3.5 h-3.5" /> Drought
          </button>
          <button
            onClick={() => setSelectedHazard('HEATWAVE')}
            className={`px-4 py-1.5 rounded-lg font-bold text-sm flex items-center gap-1 transition-all ${
              selectedHazard === 'HEATWAVE'
                ? 'bg-white shadow-sm text-rose-700'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Flame className="w-3.5 h-3.5" /> Heatwave
          </button>
        </div>
      </div>

      {/* Grid of 3 Telemetry Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Gauge 1: Sentinel-1 SAR Flood Inundation */}
        <div className={`rounded-xl p-4 border transition-all duration-300 ${
          selectedHazard === 'ALL' || selectedHazard === 'FLOOD'
            ? 'opacity-100 scale-100'
            : 'opacity-40 scale-95'
        } ${
          isFlooded
            ? 'bg-gradient-to-br from-cyan-50 to-blue-50 border-2 border-cyan-300 shadow-sm'
            : 'bg-gray-50 border border-gray-100'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-500 text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5">
              <Waves className={`w-4 h-4 ${isFlooded ? 'text-cyan-500' : 'text-gray-400'}`} />
              SAR Backscatter
            </span>
            <span className={`font-mono text-xs font-bold ${isFlooded ? 'text-cyan-700' : 'text-gray-500'}`}>
              {sar_backscatter_db.toFixed(1)} dB
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-[11px]">
              <span className="text-gray-500">Submersion Duration:</span>
              <span className={`font-bold ${days_submerged > 0 ? 'text-cyan-600' : 'text-emerald-600'}`}>
                {days_submerged > 0 ? `${days_submerged} Days` : 'Dry Soil'}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${isFlooded ? 'bg-cyan-400' : 'bg-emerald-400'}`}
                style={{ width: `${Math.min(100, Math.max(10, (days_submerged / 10) * 100))}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-400">Threshold: &lt;-15.0 dB (Standing Water)</p>
            {isFlooded && (
              <span className="inline-block text-[10px] font-bold bg-cyan-100 text-cyan-700 rounded-full px-2 py-0.5">
                ⚠ FLOOD DETECTED
              </span>
            )}
          </div>
        </div>

        {/* Gauge 2: Sentinel-2 NDWI Soil Moisture Index */}
        <div className={`rounded-xl p-4 border transition-all duration-300 ${
          selectedHazard === 'ALL' || selectedHazard === 'DROUGHT'
            ? 'opacity-100 scale-100'
            : 'opacity-40 scale-95'
        } ${
          isDrought
            ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 shadow-sm'
            : 'bg-gray-50 border border-gray-100'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-500 text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5">
              <Sun className={`w-4 h-4 ${isDrought ? 'text-amber-500' : 'text-gray-400'}`} />
              NDWI Moisture
            </span>
            <span className={`font-mono text-xs font-bold ${isDrought ? 'text-amber-700' : 'text-gray-500'}`}>
              {ndwi_score.toFixed(3)}
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-[11px]">
              <span className="text-gray-500">Water Stress Level:</span>
              <span className={`font-bold ${isDrought ? 'text-amber-600' : 'text-emerald-600'}`}>
                {isDrought ? 'CRITICAL DROUGHT' : 'Moist Soil'}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${isDrought ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(100, Math.max(10, ((ndwi_score + 1) / 2) * 100))}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-400">Threshold: &lt;-0.35 (Severe Moisture Loss)</p>
            {isDrought && (
              <span className="inline-block text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">
                ⚠ DROUGHT STRESS
              </span>
            )}
          </div>
        </div>

        {/* Gauge 3: Thermal LST Land Surface Temperature */}
        <div className={`rounded-xl p-4 border transition-all duration-300 ${
          selectedHazard === 'ALL' || selectedHazard === 'HEATWAVE'
            ? 'opacity-100 scale-100'
            : 'opacity-40 scale-95'
        } ${
          isHeatwave
            ? 'bg-gradient-to-br from-rose-50 to-red-50 border-2 border-rose-300 shadow-sm'
            : 'bg-gray-50 border border-gray-100'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-500 text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5">
              <Flame className={`w-4 h-4 ${isHeatwave ? 'text-rose-500' : 'text-gray-400'}`} />
              Thermal LST
            </span>
            <span className={`font-mono text-xs font-bold ${isHeatwave ? 'text-rose-700' : 'text-gray-500'}`}>
              {lst_temp_c.toFixed(1)}°C
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-[11px]">
              <span className="text-gray-500">Crop Thermal Stress:</span>
              <span className={`font-bold ${isHeatwave ? 'text-rose-600' : 'text-emerald-600'}`}>
                {isHeatwave ? 'HEATWAVE ALERT' : 'Normal Temp'}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${isHeatwave ? 'bg-rose-500' : 'bg-teal-500'}`}
                style={{ width: `${Math.min(100, Math.max(10, (lst_temp_c / 50) * 100))}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-400">Threshold: &gt;42.0°C (Scorching Stress)</p>
            {isHeatwave && (
              <span className="inline-block text-[10px] font-bold bg-rose-100 text-rose-700 rounded-full px-2 py-0.5">
                ⚠ HEATWAVE ALERT
              </span>
            )}
          </div>
        </div>
      </div>

      {/* NDVI Health Row */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-xs font-semibold uppercase tracking-wide">
              🌿 NDVI Vegetation Health Index
            </span>
            <span className={`font-mono text-xs font-black ${ndvi_score > 0.5 ? 'text-emerald-700' : ndvi_score > 0.3 ? 'text-amber-700' : 'text-red-700'}`}>
              {ndvi_score.toFixed(3)}
            </span>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            ndvi_score > 0.5
              ? 'bg-emerald-100 text-emerald-700'
              : ndvi_score > 0.3
              ? 'bg-amber-100 text-amber-700'
              : 'bg-red-100 text-red-700'
          }`}>
            {ndvi_score > 0.5 ? 'HEALTHY CROP' : ndvi_score > 0.3 ? 'STRESSED' : 'SEVERE LOSS'}
          </span>
        </div>
        <div className="mt-2 w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              ndvi_score > 0.5 ? 'bg-emerald-500' : ndvi_score > 0.3 ? 'bg-amber-500' : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(100, Math.max(5, ndvi_score * 100))}%` }}
          />
        </div>
      </div>

      {/* Disaster Alert Summary Bar */}
      {payout_ratio > 0 && (
        <div className="bg-gradient-to-r from-red-50 via-rose-50 to-red-50 border-2 border-red-200 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-red-100 rounded-xl text-red-600 animate-pulse">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-sm text-red-800">
                Multi-Hazard Disaster Event Verified: {hazard_type.replace(/_/g, ' ')}
              </p>
              <p className="text-xs text-red-600/70 mt-0.5">
                2-of-3 Oracle Consensus Verified · Relief Ratio: {(payout_ratio * 100).toFixed(0)}%
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0">
            <span className="px-4 py-2 bg-gradient-to-r from-red-500 to-rose-600 text-white font-black text-sm rounded-xl shadow-md">
              {(payout_ratio * 40000).toFixed(0)} MST Payout (₹{(payout_ratio * 40000).toLocaleString('en-IN')})
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
