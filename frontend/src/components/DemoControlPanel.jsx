import React from 'react';
import { Play, RotateCcw, AlertTriangle } from 'lucide-react';

export default function DemoControlPanel({ onTriggerScenario }) {
  return (
    <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-6 text-white space-y-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <Play className="w-5 h-5 text-amber-400" />
          <h3 className="font-bold text-base text-amber-300">Hackathon Judge Demo Control Panel</h3>
        </div>
        <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-full font-mono">
          Interactive Live Simulation
        </span>
      </div>

      <p className="text-xs text-slate-400">
        Click a trigger button below during your pitch to simulate satellite remote sensing data and execute instant MST Blockchain escrow payouts live!
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <button
          onClick={() => onTriggerScenario('baseline')}
          className="flex items-center justify-center space-x-2 py-3 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl font-semibold text-xs text-slate-200 transition-all"
        >
          <RotateCcw className="w-4 h-4 text-emerald-400" />
          <span>🌿 Reset Pre-Season Baseline</span>
        </button>

        <button
          onClick={() => onTriggerScenario('assam_flood')}
          className="flex items-center justify-center space-x-2 py-3 px-4 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 rounded-xl font-semibold text-xs text-cyan-200 transition-all shadow-lg shadow-cyan-950/50"
        >
          <AlertTriangle className="w-4 h-4 text-cyan-400" />
          <span>🌊 Simulate Assam Flood (70% Payout)</span>
        </button>

        <button
          onClick={() => onTriggerScenario('bihar_flood')}
          className="flex items-center justify-center space-x-2 py-3 px-4 bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 rounded-xl font-semibold text-xs text-rose-200 transition-all shadow-lg shadow-rose-950/50"
        >
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <span>🌊 Simulate Bihar Flood (100% Payout)</span>
        </button>
      </div>
    </div>
  );
}
