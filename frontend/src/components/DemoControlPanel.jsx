import React from 'react';
import { Zap, CloudRain, AlertTriangle, RefreshCw } from 'lucide-react';

const DemoControlPanel = ({ onTriggerScenario }) => {
  const scenarios = [
    {
      id: 'reset',
      label: 'Reset Baseline',
      description: 'Clear all simulations and reset to normal conditions',
      icon: RefreshCw,
      buttonClass: 'bg-gray-100 hover:bg-gray-200 text-gray-700',
      iconClass: 'bg-gray-200',
      isReset: true,
    },
    {
      id: 'assam-flood',
      label: 'Simulate Assam Flood',
      description: 'Majuli Island (Brahmaputra) — Sentinel-1 SAR: -22.4 dB',
      icon: CloudRain,
      buttonClass: 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-md hover:shadow-lg hover:scale-105',
      iconClass: 'bg-white/20',
    },
    {
      id: 'bihar-flood',
      label: 'Simulate Bihar Flood',
      description: 'Darbhanga / Kosi Basin — 50% Damage, 9 days submerged',
      icon: AlertTriangle,
      buttonClass: 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md hover:shadow-lg hover:scale-105',
      iconClass: 'bg-white/20',
    },
    {
      id: 'maharashtra-drought',
      label: 'Maharashtra Drought',
      description: 'Marathwada Flash Drought — NDWI: -0.45, 50% Payout',
      icon: CloudRain,
      buttonClass: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md hover:shadow-lg hover:scale-105',
      iconClass: 'bg-white/20',
    },
    {
      id: 'punjab-heatwave',
      label: 'Punjab Heatwave',
      description: 'Scorching Wheat Stress — LST: 44.2°C, 40% Payout',
      icon: AlertTriangle,
      buttonClass: 'bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-md hover:shadow-lg hover:scale-105',
      iconClass: 'bg-white/20',
    },
    {
      id: 'tn-harvest-rain',
      label: 'TN Harvest Rain',
      description: 'Samba Harvest Lodging — 180mm unseasonal rain during harvest',
      icon: CloudRain,
      buttonClass: 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-md hover:shadow-lg hover:scale-105',
      iconClass: 'bg-white/20',
    },
    {
      id: 'harvest-confusion',
      label: 'Harvest Stubble Shield',
      description: 'NDVI 0.15 drop but SAR dry (-8dB) — 0 Payout (Claim Rejected)',
      icon: AlertTriangle,
      buttonClass: 'bg-gradient-to-br from-slate-600 to-gray-700 text-white shadow-md hover:shadow-lg hover:scale-105',
      iconClass: 'bg-white/20',
    },
  ];

  const handleScenarioClick = (scenarioId) => {
    if (onTriggerScenario) {
      onTriggerScenario(scenarioId);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Demo Control Panel</h2>
          <p className="text-sm text-gray-600 mt-1">
            Simulate AI Oracle flood detection scenarios (mimics Chhavi's sentinel_agent.py)
          </p>
        </div>
        <div className="px-3 py-1 bg-amber-50 text-amber-600 border border-amber-200 text-xs font-bold rounded-full">
          SIMULATION MODE
        </div>
      </div>

      {/* Scenario Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {scenarios.map((scenario) => {
          const Icon = scenario.icon;
          return (
            <button
              key={scenario.id}
              onClick={() => handleScenarioClick(scenario.id)}
              className={`${scenario.buttonClass} rounded-xl p-4 transition-all font-semibold text-sm`}
            >
              <div className="flex flex-col items-center text-center space-y-2">
                <div className={`${scenario.iconClass} p-2 rounded-lg`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm leading-tight">{scenario.label}</h3>
                  <p className={`text-xs mt-1 leading-tight ${scenario.isReset ? 'text-gray-500' : 'text-white/80'}`}>
                    {scenario.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Info Banner */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-700">
            <span className="font-semibold">Note:</span> These buttons simulate the Python AI Oracle agent's multi-hazard detection (Flood SAR, Drought NDWI, Heatwave LST).
            In production, the sentinel_agent.py monitors Sentinel-1/2 satellite data and automatically triggers parametric payouts in &lt;2 seconds.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DemoControlPanel;
