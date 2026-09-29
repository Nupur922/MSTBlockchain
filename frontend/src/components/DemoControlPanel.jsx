import React from 'react';
import { Satellite, Waves, Sun, Flame, CloudRain, XCircle, RotateCcw, Zap } from 'lucide-react';

const SCENARIOS = [
  { id: 'assam-flood',        label: 'Assam Flood',       sub: 'SAR −22.4 dB · 6 days',  Icon: Waves,      color: 'cyan' },
  { id: 'bihar-flood',        label: 'Bihar Flood',       sub: 'Kosi −24.1 dB · 9 days', Icon: Waves,      color: 'blue' },
  { id: 'karnataka-flood',    label: 'Karnataka Flood',   sub: 'Cauvery −18.2 dB',       Icon: Waves,      color: 'indigo' },
  { id: 'maharashtra-drought',label: 'MH Drought',        sub: 'NDWI −0.45',             Icon: Sun,        color: 'amber' },
  { id: 'punjab-heatwave',    label: 'Punjab Heat',       sub: 'LST 44.2 °C',            Icon: Flame,      color: 'rose' },
  { id: 'tn-harvest-rain',    label: 'TN Harvest Rain',   sub: '140 mm lodging',         Icon: CloudRain,  color: 'emerald' },
  { id: 'harvest-confusion',  label: 'Stubble Shield',    sub: 'Rejected — 0%',          Icon: XCircle,    color: 'slate' },
  { id: 'ghost-crop-fraud',   label: 'Ghost Crop',        sub: 'Fraud flagged',          Icon: XCircle,    color: 'slate' },
  { id: 'reset',              label: 'Reset',             sub: 'Clear all',              Icon: RotateCcw,  color: 'slate', isReset: true },
];

const COLOR = {
  cyan:    { pill: 'bg-cyan-50 border-cyan-200 text-cyan-800 hover:bg-cyan-100',    active: 'bg-cyan-500 border-cyan-600 text-white shadow-cyan-200', dot: 'bg-cyan-500' },
  blue:    { pill: 'bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100',    active: 'bg-blue-600 border-blue-700 text-white shadow-blue-200',  dot: 'bg-blue-500' },
  indigo:  { pill: 'bg-indigo-50 border-indigo-200 text-indigo-800 hover:bg-indigo-100', active: 'bg-indigo-600 border-indigo-700 text-white shadow-indigo-200', dot: 'bg-indigo-500' },
  amber:   { pill: 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100',  active: 'bg-amber-500 border-amber-600 text-white shadow-amber-200',  dot: 'bg-amber-500' },
  rose:    { pill: 'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100',    active: 'bg-rose-500 border-rose-600 text-white shadow-rose-200',    dot: 'bg-rose-500' },
  emerald: { pill: 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100', active: 'bg-emerald-600 border-emerald-700 text-white shadow-emerald-200', dot: 'bg-emerald-500' },
  slate:   { pill: 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100',   active: 'bg-slate-500 border-slate-600 text-white shadow-slate-200',   dot: 'bg-slate-400' },
};

export default function DemoControlPanel({ onTriggerScenario, activeScenario }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-600 p-1.5 rounded-lg">
            <Satellite className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Disaster Simulation Control</h2>
            <p className="text-xs text-slate-500">Trigger 3-spectrum parametric oracle consensus</p>
          </div>
        </div>
        {activeScenario && activeScenario !== 'reset' && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 border border-red-200 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-bold text-red-700 uppercase tracking-wide">ACTIVE</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {SCENARIOS.map(({ id, label, sub, Icon, color, isReset }) => {
          const c = COLOR[color];
          const isActive = activeScenario === id;
          return (
            <button
              key={id}
              onClick={() => onTriggerScenario?.(id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-full border text-xs font-semibold transition-all shadow-sm ${
                isActive ? `${c.active} shadow-md scale-105` : c.pill
              }`}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{label}</span>
              <span className={`hidden sm:inline opacity-70 font-normal text-[10px]`}>· {sub}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
