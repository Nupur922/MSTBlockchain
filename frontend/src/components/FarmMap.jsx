import React from 'react';
import { MapPin, Waves, Leaf } from 'lucide-react';

/**
 * FarmMap — GIS Satellite Overlay Map for AgriTrust AI.
 * Displays geofenced farm plots in Assam (Brahmaputra) & Bihar (Kosi) flood basins.
 * Uses a static visual representation for the hackathon demo.
 */
export default function FarmMap({ activeTelemetry }) {
  const {
    ndvi_score = 0.75,
    sar_backscatter_db = -10.5,
    days_submerged = 0,
    status = "HEALTHY_GROWING_CROP",
    payout_ratio = 0.0
  } = activeTelemetry || {};

  const isFlooded = days_submerged > 0 || sar_backscatter_db < -18.0;

  return (
    <div className="relative w-full h-72 md:h-96 rounded-xl overflow-hidden border border-slate-700/50">
      {/* Satellite Map Background */}
      <div className={`absolute inset-0 transition-all duration-700 ${
        isFlooded
          ? 'bg-gradient-to-br from-cyan-950 via-blue-950 to-slate-950'
          : 'bg-gradient-to-br from-emerald-950 via-green-950 to-slate-950'
      }`}>
        {/* Grid overlay for satellite imagery feel */}
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        />
      </div>

      {/* Farm Plot Polygon Overlay */}
      <div className="absolute inset-8 md:inset-12">
        <div className={`w-full h-full rounded-lg border-2 border-dashed transition-all duration-700 flex items-center justify-center ${
          isFlooded
            ? 'border-cyan-400/60 bg-cyan-500/10'
            : 'border-emerald-400/60 bg-emerald-500/10'
        }`}>
          {/* Plot markers */}
          <div className="text-center space-y-3">
            {isFlooded ? (
              <>
                <Waves className="w-12 h-12 text-cyan-400 mx-auto animate-pulse" />
                <div>
                  <p className="text-sm font-bold text-cyan-300">SAR Radar: Standing Floodwater Detected</p>
                  <p className="text-xs text-slate-400">{sar_backscatter_db} dB | {days_submerged} Days Submerged</p>
                </div>
              </>
            ) : (
              <>
                <Leaf className="w-12 h-12 text-emerald-400 mx-auto" />
                <div>
                  <p className="text-sm font-bold text-emerald-300">Healthy Crop Growth Detected</p>
                  <p className="text-xs text-slate-400">NDVI: {ndvi_score.toFixed(2)} | {sar_backscatter_db} dB (Dry Soil)</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Location Pins */}
      <div className="absolute top-3 left-3 flex items-center space-x-1.5 bg-slate-900/80 backdrop-blur px-2.5 py-1.5 rounded-lg border border-slate-700/50">
        <MapPin className="w-3.5 h-3.5 text-rose-400" />
        <span className="text-[10px] text-slate-300 font-medium">
          {isFlooded && status === "TOTAL_CROP_DESTRUCTION"
            ? "Darbhanga, Bihar — Kosi Basin"
            : isFlooded
            ? "Majuli Island, Assam — Brahmaputra Basin"
            : "Enrolled Farm Plot — Pre-Season Baseline"
          }
        </span>
      </div>

      {/* Satellite Source Badge */}
      <div className="absolute bottom-3 right-3 bg-slate-900/80 backdrop-blur px-2.5 py-1.5 rounded-lg border border-slate-700/50">
        <span className="text-[10px] text-slate-400 font-mono">
          {isFlooded ? 'Sentinel-1 SAR Radar | Cloud Penetration: 100%' : 'Sentinel-2A L2A Optical'}
        </span>
      </div>

      {/* Flood Warning Overlay */}
      {isFlooded && (
        <div className="absolute top-3 right-3 bg-rose-500/90 text-slate-950 px-3 py-1.5 rounded-lg text-[10px] font-extrabold animate-pulse">
          ⚠️ DISASTER ZONE — {(payout_ratio * 100).toFixed(0)}% LOSS
        </div>
      )}
    </div>
  );
}
