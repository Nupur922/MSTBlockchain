import React from 'react';
import { Satellite, Waves, Sun, Flame, CloudRain, RotateCcw, ShieldAlert } from 'lucide-react';

const SCENARIOS = [
  // ── Payout scenarios ──────────────────────────────────────────────────────
  { id: 'assam-flood',         label: 'Assam Flood',      sub: 'SAR −22.4 dB · 6 days', Icon: Waves,        color: 'cyan' },
  { id: 'bihar-flood',         label: 'Bihar Flood',      sub: 'Kosi −24.1 dB · 9 days',Icon: Waves,        color: 'blue' },
  { id: 'karnataka-flood',     label: 'Karnataka Flood',  sub: 'Cauvery −18.2 dB',       Icon: Waves,        color: 'indigo' },
  { id: 'maharashtra-drought', label: 'MH Drought',       sub: 'NDWI −0.45',             Icon: Sun,          color: 'amber' },
  { id: 'punjab-heatwave',     label: 'Punjab Heat',      sub: 'LST 44.2 °C',            Icon: Flame,        color: 'rose' },
  { id: 'tn-harvest-rain',     label: 'TN Harvest Rain',  sub: '140 mm lodging',         Icon: CloudRain,    color: 'emerald' },
];

const COLOR = {
  cyan:    { pill: 'bg-cyan-50 border-cyan-200 text-cyan-800 hover:bg-cyan-100',       active: 'bg-cyan-500 border-cyan-600 text-white' },
  blue:    { pill: 'bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100',       active: 'bg-blue-600 border-blue-700 text-white' },
  indigo:  { pill: 'bg-indigo-50 border-indigo-200 text-indigo-800 hover:bg-indigo-100', active: 'bg-indigo-600 border-indigo-700 text-white' },
  amber:   { pill: 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100',   active: 'bg-amber-500 border-amber-600 text-white' },
  rose:    { pill: 'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100',       active: 'bg-rose-500 border-rose-600 text-white' },
  emerald: { pill: 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100', active: 'bg-emerald-600 border-emerald-700 text-white' },
};

export default function DemoControlPanel({ onTriggerScenario, activeScenario, onOpenFraudDemo }) {
  const Btn = ({ s }) => {
    const c = COLOR[s.color];
    const isActive = activeScenario === s.id;
    return (
      <button
        onClick={() => onTriggerScenario?.(s.id)}
        className={`flex items-center gap-2 px-3 py-2 rounded-full border text-xs font-semibold transition-all shadow-sm whitespace-nowrap ${
          isActive ? `${c.active} shadow-md scale-105` : c.pill
        }`}
      >
        <s.Icon className="w-3.5 h-3.5 flex-shrink-0" />
        <span>{s.label}</span>
        <span className="hidden lg:inline opacity-60 font-normal text-[10px]">· {s.sub}</span>
      </button>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-600 p-1.5 rounded-lg shadow-sm">
            <Satellite className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Disaster Simulation Control</h2>
            <p className="text-xs text-slate-500">3-spectrum parametric oracle · live on-chain payouts</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Interactive Fraud & Rejection Demo Button */}
          <button
            onClick={onOpenFraudDemo}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-rose-50 to-orange-50 border border-rose-200 hover:border-rose-400 text-rose-700 hover:text-rose-900 rounded-xl text-xs font-bold shadow-sm transition-all hover:scale-[1.02]"
            title="Interactive Claim & Fraud Verification Playground"
          >
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span>Test Claim & Fraud Verifier</span>
            <span className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded bg-rose-200/60 text-rose-800 font-extrabold uppercase">
              Demo Cases
            </span>
          </button>

          {activeScenario && activeScenario !== 'reset' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 border border-red-200 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-bold text-red-700 uppercase tracking-wide">ACTIVE</span>
            </div>
          )}
        </div>
      </div>

      {/* Payout scenarios */}
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
          ✅ Payout Approved Scenarios
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {SCENARIOS.map(s => <Btn key={s.id} s={s} />)}
          
          {/* Reset button */}
          <button
            onClick={() => onTriggerScenario?.('reset')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold transition-all shadow-sm ml-auto"
            title="Reset telemetry and clear active disaster"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>
    </div>
  );
}
