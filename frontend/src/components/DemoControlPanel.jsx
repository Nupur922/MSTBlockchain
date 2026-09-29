import React from 'react';
import { Satellite, Waves, Sun, Flame, CloudRain, XCircle, RotateCcw, AlertOctagon, Wheat } from 'lucide-react';

const SCENARIOS = [
  // ── Payout scenarios ──────────────────────────────────────────────────────
  { id: 'assam-flood',         label: 'Assam Flood',      sub: 'SAR −22.4 dB · 6 days', Icon: Waves,        color: 'cyan',    group: 'payout' },
  { id: 'bihar-flood',         label: 'Bihar Flood',      sub: 'Kosi −24.1 dB · 9 days',Icon: Waves,        color: 'blue',    group: 'payout' },
  { id: 'karnataka-flood',     label: 'Karnataka Flood',  sub: 'Cauvery −18.2 dB',       Icon: Waves,        color: 'indigo',  group: 'payout' },
  { id: 'maharashtra-drought', label: 'MH Drought',       sub: 'NDWI −0.45',             Icon: Sun,          color: 'amber',   group: 'payout' },
  { id: 'punjab-heatwave',     label: 'Punjab Heat',      sub: 'LST 44.2 °C',            Icon: Flame,        color: 'rose',    group: 'payout' },
  { id: 'tn-harvest-rain',     label: 'TN Harvest Rain',  sub: '140 mm lodging',         Icon: CloudRain,    color: 'emerald', group: 'payout' },
  // ── Failure / rejection scenarios ─────────────────────────────────────────
  { id: 'nonexistent-plot',    label: 'Invalid Plot',     sub: 'Not registered · Reject',Icon: AlertOctagon, color: 'red',     group: 'reject' },
  { id: 'crop-mismatch',       label: 'Crop Mismatch',    sub: 'Wheat ≠ Paddy · Reject', Icon: Wheat,        color: 'orange',  group: 'reject' },
  { id: 'harvest-confusion',   label: 'Stubble Shield',   sub: 'False drop · 0%',        Icon: XCircle,      color: 'slate',   group: 'reject' },
  { id: 'ghost-crop-fraud',    label: 'Ghost Crop',       sub: 'Fraud flagged',          Icon: XCircle,      color: 'slate',   group: 'reject' },
  // ── Controls ──────────────────────────────────────────────────────────────
  { id: 'reset',               label: 'Reset',            sub: 'Clear all',              Icon: RotateCcw,    color: 'slate',   group: 'control' },
];

const COLOR = {
  cyan:    { pill: 'bg-cyan-50 border-cyan-200 text-cyan-800 hover:bg-cyan-100',       active: 'bg-cyan-500 border-cyan-600 text-white' },
  blue:    { pill: 'bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100',       active: 'bg-blue-600 border-blue-700 text-white' },
  indigo:  { pill: 'bg-indigo-50 border-indigo-200 text-indigo-800 hover:bg-indigo-100', active: 'bg-indigo-600 border-indigo-700 text-white' },
  amber:   { pill: 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100',   active: 'bg-amber-500 border-amber-600 text-white' },
  rose:    { pill: 'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100',       active: 'bg-rose-500 border-rose-600 text-white' },
  emerald: { pill: 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100', active: 'bg-emerald-600 border-emerald-700 text-white' },
  red:     { pill: 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100',           active: 'bg-red-600 border-red-700 text-white' },
  orange:  { pill: 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100', active: 'bg-orange-500 border-orange-600 text-white' },
  slate:   { pill: 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100',   active: 'bg-slate-500 border-slate-600 text-white' },
};

export default function DemoControlPanel({ onTriggerScenario, activeScenario }) {
  const payoutScenarios  = SCENARIOS.filter(s => s.group === 'payout');
  const rejectScenarios  = SCENARIOS.filter(s => s.group === 'reject');
  const controlScenarios = SCENARIOS.filter(s => s.group === 'control');

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-600 p-1.5 rounded-lg">
            <Satellite className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Disaster Simulation Control</h2>
            <p className="text-xs text-slate-500">3-spectrum parametric oracle · includes fraud/rejection demos</p>
          </div>
        </div>
        {activeScenario && activeScenario !== 'reset' && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 border border-red-200 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-bold text-red-700 uppercase tracking-wide">ACTIVE</span>
          </div>
        )}
      </div>

      {/* Payout scenarios */}
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">✅ Payout Approved</p>
        <div className="flex flex-wrap gap-2">
          {payoutScenarios.map(s => <Btn key={s.id} s={s} />)}
        </div>
      </div>

      {/* Rejection / failure scenarios */}
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">❌ Oracle Rejected</p>
        <div className="flex flex-wrap gap-2">
          {rejectScenarios.map(s => <Btn key={s.id} s={s} />)}
          {controlScenarios.map(s => <Btn key={s.id} s={s} />)}
        </div>
      </div>
    </div>
  );
}
