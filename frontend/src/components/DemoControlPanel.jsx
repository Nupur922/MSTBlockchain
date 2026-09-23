import React from 'react';
import { Zap, CloudRain, AlertTriangle } from 'lucide-react';

const DemoControlPanel = ({ onTriggerScenario }) => {
  const scenarios = [
    {
      id: 'reset',
      label: 'Reset Baseline',
      description: 'Clear all simulations and reset to normal conditions',
      icon: Zap,
      color: 'bg-blue-500 hover:bg-blue-600',
      textColor: 'text-blue-700',
    },
    {
      id: 'assam-flood',
      label: 'Simulate Assam Flood',
      description: 'Majuli Island (Brahmaputra) — primary language: Assamese',
      icon: CloudRain,
      color: 'bg-emerald-600 hover:bg-emerald-700',
      textColor: 'text-emerald-700',
    },
    {
      id: 'bihar-flood',
      label: 'Simulate Bihar Flood',
      description: 'Darbhanga / Kosi Basin — primary language: Bhojpuri',
      icon: AlertTriangle,
      color: 'bg-red-500 hover:bg-red-600',
      textColor: 'text-red-700',
    },
    {
      id: 'maharashtra-flood',
      label: 'Simulate Maharashtra Flood',
      description: 'Nashik / Godavari Basin — primary language: Marathi',
      icon: CloudRain,
      color: 'bg-orange-500 hover:bg-orange-600',
      textColor: 'text-orange-700',
    },
    {
      id: 'gujarat-flood',
      label: 'Simulate Gujarat Flood',
      description: 'Anand / Narmada Basin — primary language: Gujarati',
      icon: AlertTriangle,
      color: 'bg-amber-600 hover:bg-amber-700',
      textColor: 'text-amber-700',
    },
    {
      id: 'karnataka-flood',
      label: 'Simulate Karnataka Flood',
      description: 'Mandya / Cauvery Basin — primary language: Kannada',
      icon: CloudRain,
      color: 'bg-indigo-600 hover:bg-indigo-700',
      textColor: 'text-indigo-700',
    },
    {
      id: 'punjab-flood',
      label: 'Simulate Punjab Flood',
      description: 'Ludhiana / Sutlej Basin — primary language: Punjabi',
      icon: AlertTriangle,
      color: 'bg-purple-600 hover:bg-purple-700',
      textColor: 'text-purple-700',
    },
  ];

  const handleScenarioClick = (scenarioId) => {
    if (onTriggerScenario) {
      onTriggerScenario(scenarioId);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Demo Control Panel</h2>
          <p className="text-sm text-gray-600 mt-1">
            Simulate AI Oracle flood detection scenarios (mimics Chhavi's sentinel_agent.py)
          </p>
        </div>
        <div className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
          DEMO MODE
        </div>
      </div>

      {/* Scenario Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {scenarios.map((scenario) => {
          const Icon = scenario.icon;
          return (
            <button
              key={scenario.id}
              onClick={() => handleScenarioClick(scenario.id)}
              className={`${scenario.color} text-white p-6 rounded-lg transition-all transform hover:scale-105 hover:shadow-lg`}
            >
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="bg-white/20 p-3 rounded-full">
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{scenario.label}</h3>
                  <p className="text-sm text-white/90 mt-1">
                    {scenario.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Info Banner */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-yellow-800">
              <span className="font-semibold">Note:</span> These buttons simulate the Python AI Oracle agent's flood detection. 
              In production, the sentinel_agent.py monitors Sentinel-1 SAR data and automatically triggers emergency payouts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoControlPanel;
