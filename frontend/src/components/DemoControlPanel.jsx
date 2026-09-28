import React from 'react';
import { Satellite, Waves, Sun, Flame, CloudRain, XCircle, RotateCcw } from 'lucide-react';

const DemoControlPanel = ({ onTriggerScenario, activeScenario }) => {
  const scenarios = [
    {
      id: 'assam-flood',
      label: 'Assam Flood',
      description: 'Majuli — SAR -22.4 dB',
      icon: Waves,
      color: 'cyan',
      borderClass: 'border-t-cyan-500',
      hoverClass: 'hover:border-cyan-300 hover:bg-cyan-50',
      iconBg: 'bg-cyan-100',
      iconColor: 'text-cyan-600',
    },
    {
      id: 'bihar-flood',
      label: 'Bihar Flood',
      description: 'Kosi Basin — 9 days',
      icon: Waves,
      color: 'blue',
      borderClass: 'border-t-blue-600',
      hoverClass: 'hover:border-blue-300 hover:bg-blue-50',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      id: 'karnataka-flood',
      label: 'Karnataka Flood',
      description: 'Cauvery — 5 days',
      icon: Waves,
      color: 'cyan',
      borderClass: 'border-t-cyan-600',
      hoverClass: 'hover:border-cyan-300 hover:bg-cyan-50',
      iconBg: 'bg-cyan-100',
      iconColor: 'text-cyan-700',
    },
    {
      id: 'maharashtra-drought',
      label: 'Maharashtra Drought',
      description: 'NDWI -0.45',
      icon: Sun,
      color: 'amber',
      borderClass: 'border-t-amber-500',
      hoverClass: 'hover:border-amber-300 hover:bg-amber-50',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
    },
    {
      id: 'punjab-heatwave',
      label: 'Punjab Heatwave',
      description: 'LST 44.2°C',
      icon: Flame,
      color: 'rose',
      borderClass: 'border-t-rose-500',
      hoverClass: 'hover:border-rose-300 hover:bg-rose-50',
      iconBg: 'bg-rose-100',
      iconColor: 'text-rose-600',
    },
    {
      id: 'tn-harvest-rain',
      label: 'TN Harvest Rain',
      description: '180mm lodging',
      icon: CloudRain,
      color: 'emerald',
      borderClass: 'border-t-emerald-600',
      hoverClass: 'hover:border-emerald-300 hover:bg-emerald-50',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
    },
    {
      id: 'harvest-confusion',
      label: 'Harvest Stubble',
      description: 'False drop — 0%',
      icon: XCircle,
      color: 'gray',
      borderClass: 'border-t-gray-500',
      hoverClass: 'hover:border-gray-300 hover:bg-gray-50',
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-600',
    },
    {
      id: 'ghost-crop-fraud',
      label: 'Ghost Crop',
      description: 'Fraud flagged',
      icon: XCircle,
      color: 'gray',
      borderClass: 'border-t-gray-600',
      hoverClass: 'hover:border-gray-300 hover:bg-gray-50',
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-700',
    },
    {
      id: 'reset',
      label: 'Reset',
      description: 'Clear scenario',
      icon: RotateCcw,
      color: 'slate',
      borderClass: 'border-t-gray-400',
      hoverClass: 'hover:border-gray-300 hover:bg-gray-50',
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-500',
      isReset: true,
    },
  ];

  const handleScenarioClick = (scenarioId) => {
    if (onTriggerScenario) {
      onTriggerScenario(scenarioId);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-emerald-500 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-gray-100">
        <div className="flex items-center space-x-2">
          <div className="bg-gradient-to-br from-emerald-400 to-teal-500 p-2 rounded-xl">
            <Satellite className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-gray-900">Live Disaster Simulation Control</h2>
            <p className="text-xs text-gray-500 mt-0.5">Trigger parametric oracle consensus across 3 satellite spectrums</p>
          </div>
        </div>
        <div className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold rounded-full uppercase tracking-wider">
          🎮 Simulation Mode
        </div>
      </div>

      {/* Scenario Buttons Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {scenarios.map((scenario) => {
          const Icon = scenario.icon;
          return (
            <button
              key={scenario.id}
              onClick={() => handleScenarioClick(scenario.id)}
              className={`bg-white border-2 rounded-xl p-3 transition-all hover:scale-105 active:scale-95 group ${
                activeScenario === scenario.id
                  ? `border-${scenario.color}-500 ring-2 ring-${scenario.color}-200 bg-${scenario.color}-50/40 scale-105`
                  : `border-gray-200 ${scenario.borderClass} ${scenario.hoverClass}`
              }`}
            >
              <div className="flex flex-col items-center text-center space-y-2">
                <div className={`${scenario.iconBg} p-2 rounded-lg group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-5 h-5 ${scenario.iconColor}`} />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-gray-900 leading-tight">{scenario.label}</h3>
                  <p className="text-[10px] text-gray-500 mt-1 leading-tight font-medium">
                    {scenario.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DemoControlPanel;
