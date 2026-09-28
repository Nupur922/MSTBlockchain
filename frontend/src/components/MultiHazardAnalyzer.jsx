import React, { useState } from 'react';
import { Waves, Sun, Flame, ShieldAlert, Activity } from 'lucide-react';

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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-emerald-500 p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-gray-100 mb-6">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-br from-emerald-400 to-teal-500 p-2.5 rounded-xl shadow-sm">
            <Activity className="w-6 h-6 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-extrabold text-xl text-gray-900">
                V3 Multi-Hazard AI Satellite Analyzer
              </h3>
              <span className="flex items-center bg-teal-100 text-teal-600 text-[9px] font-bold rounded-full px-2 py-0.5 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse inline-block mr-1" />
                LIVE
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">
              Real-time Sentinel-1 SAR + Sentinel-2 NDWI + Thermal LST
            </p>
          </div>
        </div>

        {/* Hazard Filter Tabs - Pill Style */}
        <div className="flex items-center space-x-1 bg-gray-100 rounded-xl p-1 border border-gray-200">
          {[
            { id: 'ALL', label: 'All', icon: null },
            { id: 'FLOOD', label: 'Flood', icon: Waves },
            { id: 'DROUGHT', label: 'Drought', icon: Sun },
            { id: 'HEATWAVE', label: 'Heatwave', icon: Flame },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSelectedHazard(id)}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all ${
                selectedHazard === id
                  ? 'bg-white shadow-sm text-emerald-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Three Gauge Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        
        {/* FLOOD Gauge (Cyan Theme) */}
        <div className={`rounded-xl p-5 border-2 transition-all duration-300 ${
          selectedHazard === 'ALL' || selectedHazard === 'FLOOD'
            ? 'opacity-100 scale-100'
            : 'opacity-40 scale-95'
        } ${
          isFlooded
            ? 'bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-300 shadow-md'
            : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Waves className={`w-5 h-5 ${isFlooded ? 'text-cyan-600' : 'text-gray-400'}`} />
              <span className="text-xs font-bold uppercase tracking-wider text-gray-600">SAR Backscatter</span>
            </div>
            <span className={`font-mono text-sm font-black ${isFlooded ? 'text-cyan-700' : 'text-gray-600'}`}>
              {sar_backscatter_db.toFixed(1)} dB
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Days Submerged:</span>
              <span className={`font-bold ${days_submerged > 0 ? 'text-cyan-700' : 'text-emerald-600'}`}>
                {days_submerged > 0 ? `${days_submerged} Days` : 'Dry'}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${isFlooded ? 'bg-cyan-500' : 'bg-emerald-400'}`}
                style={{ width: `${Math.min(100, Math.max(10, (days_submerged / 10) * 100))}%` }}
              />
            </div>

            <p className="text-[10px] text-gray-500 font-medium">
              Threshold: &lt; -15.0 dB (Standing Water)
            </p>

            {isFlooded && (
              <div className="pt-2 border-t border-cyan-200">
                <span className="inline-flex items-center bg-cyan-100 text-cyan-700 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide">
                  ⚠ FLOOD DETECTED
                </span>
              </div>
            )}
          </div>
        </div>

        {/* DROUGHT Gauge (Amber Theme) */}
        <div className={`rounded-xl p-5 border-2 transition-all duration-300 ${
          selectedHazard === 'ALL' || selectedHazard === 'DROUGHT'
            ? 'opacity-100 scale-100'
            : 'opacity-40 scale-95'
        } ${
          isDrought
            ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300 shadow-md'
            : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sun className={`w-5 h-5 ${isDrought ? 'text-amber-600' : 'text-gray-400'}`} />
              <span className="text-xs font-bold uppercase tracking-wider text-gray-600">NDWI Moisture</span>
            </div>
            <span className={`font-mono text-sm font-black ${isDrought ? 'text-amber-700' : 'text-gray-600'}`}>
              {ndwi_score.toFixed(3)}
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Water Stress:</span>
              <span className={`font-bold ${isDrought ? 'text-amber-700' : 'text-emerald-600'}`}>
                {isDrought ? 'CRITICAL' : 'Moist'}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${isDrought ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(100, Math.max(10, ((ndwi_score + 1) / 2) * 100))}%` }}
              />
            </div>

            <p className="text-[10px] text-gray-500 font-medium">
              Threshold: &lt; -0.35 (Severe Moisture Loss)
            </p>

            {isDrought && (
              <div className="pt-2 border-t border-amber-200">
                <span className="inline-flex items-center bg-amber-100 text-amber-700 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide">
                  ⚠ DROUGHT STRESS
                </span>
              </div>
            )}
          </div>
        </div>

        {/* HEATWAVE Gauge (Rose Theme) */}
        <div className={`rounded-xl p-5 border-2 transition-all duration-300 ${
          selectedHazard === 'ALL' || selectedHazard === 'HEATWAVE'
            ? 'opacity-100 scale-100'
            : 'opacity-40 scale-95'
        } ${
          isHeatwave
            ? 'bg-gradient-to-br from-rose-50 to-red-50 border-rose-300 shadow-md'
            : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Flame className={`w-5 h-5 ${isHeatwave ? 'text-rose-600' : 'text-gray-400'}`} />
              <span className="text-xs font-bold uppercase tracking-wider text-gray-600">Thermal LST</span>
            </div>
            <span className={`font-mono text-sm font-black ${isHeatwave ? 'text-rose-700' : 'text-gray-600'}`}>
              {lst_temp_c.toFixed(1)}°C
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Thermal Stress:</span>
              <span className={`font-bold ${isHeatwave ? 'text-rose-700' : 'text-emerald-600'}`}>
                {isHeatwave ? 'HEATWAVE' : 'Normal'}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${isHeatwave ? 'bg-rose-500' : 'bg-teal-500'}`}
                style={{ width: `${Math.min(100, Math.max(10, (lst_temp_c / 50) * 100))}%` }}
              />
            </div>

            <p className="text-[10px] text-gray-500 font-medium">
              Threshold: &gt; 42.0°C (Scorching Stress)
            </p>

            {isHeatwave && (
              <div className="pt-2 border-t border-rose-200">
                <span className="inline-flex items-center bg-rose-100 text-rose-700 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide">
                  ⚠ HEATWAVE ALERT
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* NDVI Health Bar - Full Width */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 mb-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-600">
              🌿 NDVI Vegetation Health Index
            </span>
            <span className={`font-mono text-sm font-black ${ndvi_score > 0.5 ? 'text-emerald-700' : ndvi_score > 0.3 ? 'text-amber-700' : 'text-red-700'}`}>
              {ndvi_score.toFixed(3)}
            </span>
          </div>
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
            ndvi_score > 0.5
              ? 'bg-emerald-100 text-emerald-700'
              : ndvi_score > 0.3
              ? 'bg-amber-100 text-amber-700'
              : 'bg-red-100 text-red-700'
          }`}>
            {ndvi_score > 0.5 ? 'HEALTHY' : ndvi_score > 0.3 ? 'STRESSED' : 'SEVERE'}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              ndvi_score > 0.5 ? 'bg-emerald-500' : ndvi_score > 0.3 ? 'bg-amber-500' : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(100, Math.max(5, ndvi_score * 100))}%` }}
          />
        </div>
      </div>

      {/* Disaster Alert Banner */}
      {payout_ratio > 0 && (
        <div className="bg-gradient-to-r from-red-50 via-rose-50 to-red-50 border-2 border-red-300 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-100 rounded-xl">
              <ShieldAlert className="w-6 h-6 text-red-600 animate-pulse" />
            </div>
            <div>
              <p className="font-black text-sm text-red-900">
                Multi-Hazard Disaster Event Verified
              </p>
              <p className="text-xs text-red-700 mt-0.5 font-medium">
                {hazard_type.replace(/_/g, ' ')} · 2-of-3 Oracle Consensus · {(payout_ratio * 100).toFixed(0)}% Relief
              </p>
            </div>
          </div>
          <div className="flex-shrink-0">
            <div className="px-4 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 text-white font-black text-sm rounded-xl shadow-md">
              ₹{(payout_ratio * 40000).toLocaleString('en-IN')} Payout
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
