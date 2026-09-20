import React from 'react';
import { Activity, ShieldAlert, Waves, Sun } from 'lucide-react';

export default function PlotTelemetry({ telemetry }) {
  const {
    ndvi_score = 0.75,
    sar_backscatter_db = -10.5,
    days_submerged = 0,
    status = "HEALTHY_GROWING_CROP",
    payout_ratio = 0.0
  } = telemetry || {};

  const getNdviColor = (score) => {
    if (score >= 0.65) return "text-emerald-400 border-emerald-500/40 bg-emerald-500/10";
    if (score >= 0.45) return "text-yellow-400 border-yellow-500/40 bg-yellow-500/10";
    return "text-rose-400 border-rose-500/40 bg-rose-500/10";
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-2">
          <Activity className="w-5 h-5 text-emerald-400" />
          <h3 className="font-bold text-base">Live NEWRRO AI Satellite Telemetry</h3>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full font-bold border ${getNdviColor(ndvi_score)}`}>
          {status}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* NDVI Vegetation Gauge */}
        <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center"><Sun className="w-4 h-4 mr-1 text-amber-400" /> Sentinel-2 NDVI Index</span>
            <span className="font-mono text-white font-bold">{ndvi_score.toFixed(2)} / 1.0</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full transition-all duration-700 ${ndvi_score >= 0.5 ? 'bg-emerald-500' : ndvi_score >= 0.3 ? 'bg-yellow-500' : 'bg-rose-500'}`}
              style={{ width: `${Math.max(0, Math.min(100, ndvi_score * 100))}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400">Chlorophyll Index: {ndvi_score >= 0.65 ? 'Active Crop Growth' : 'Severe Crop Damage'}</p>
        </div>

        {/* SAR Radar Flood Inundation Gauge */}
        <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center"><Waves className="w-4 h-4 mr-1 text-cyan-400" /> Sentinel-1 SAR Radar</span>
            <span className="font-mono text-cyan-300 font-bold">{sar_backscatter_db} dB</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Inundation Duration:</span>
            <span className={`font-bold ${days_submerged > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {days_submerged > 0 ? `${days_submerged} Days Submerged` : 'Dry Soil (0 Days)'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">Cloud Penetration: 100% Active</p>
        </div>
      </div>

      {payout_ratio > 0 && (
        <div className="p-4 bg-rose-950/40 border border-rose-500/40 rounded-xl flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <ShieldAlert className="w-6 h-6 text-rose-400 animate-bounce" />
            <div>
              <p className="font-bold text-sm text-rose-300">Disaster Loss Threshold Breached!</p>
              <p className="text-xs text-slate-400">Calculated Relief Ratio: {(payout_ratio * 100).toFixed(0)}% Escrow Payout</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-rose-500 text-slate-950 font-extrabold text-xs rounded-lg">
            {(payout_ratio * 50).toFixed(1)} MST Payout
          </span>
        </div>
      )}
    </div>
  );
}
