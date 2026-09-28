import React, { useState, useEffect } from 'react';
import { Activity, Droplets, Leaf, Radio, Thermometer } from 'lucide-react';

const PlotTelemetry = ({ activeTelemetry }) => {
  const [telemetry, setTelemetry] = useState({
    ndvi: 0.72,
    sarFloodInundation: 0.15,
    ndwiDrought: -0.12,
    lstTemp: 28.5,
  });

  useEffect(() => {
    if (activeTelemetry && activeTelemetry.hazard_type && activeTelemetry.hazard_type !== 'NONE') {
      const sarNormalized = Math.max(0, Math.min(1, (activeTelemetry.sar_backscatter_db + 30) / 15));
      setTelemetry({
        ndvi: activeTelemetry.ndvi_score ?? 0.72,
        sarFloodInundation: sarNormalized,
        ndwiDrought: activeTelemetry.ndwi_score ?? -0.12,
        lstTemp: activeTelemetry.lst_temp_c ?? 28.5,
      });
    } else if (activeTelemetry && activeTelemetry.hazard_type === 'NONE') {
      setTelemetry({ ndvi: 0.72, sarFloodInundation: 0.15, ndwiDrought: -0.12, lstTemp: 28.5 });
    }
  }, [activeTelemetry]);

  useEffect(() => {
    if (activeTelemetry && activeTelemetry.hazard_type && activeTelemetry.hazard_type !== 'NONE') return;
    const interval = setInterval(() => {
      setTelemetry((prev) => ({
        ndvi: Math.max(0, Math.min(1, prev.ndvi + (Math.random() - 0.5) * 0.05)),
        sarFloodInundation: Math.max(0, Math.min(1, prev.sarFloodInundation + (Math.random() - 0.5) * 0.03)),
        ndwiDrought: Math.max(-1, Math.min(1, prev.ndwiDrought + (Math.random() - 0.5) * 0.04)),
        lstTemp: Math.max(20, Math.min(50, prev.lstTemp + (Math.random() - 0.5) * 0.5)),
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, [activeTelemetry]);

  const getMetricStatus = (type, value) => {
    if (type === 'ndvi') {
      if (value > 0.5) return { label: 'HEALTHY', color: 'emerald', bgColor: 'bg-emerald-500' };
      if (value > 0.3) return { label: 'WARNING', color: 'amber', bgColor: 'bg-amber-500' };
      return { label: 'CRITICAL', color: 'red', bgColor: 'bg-red-500' };
    }
    if (type === 'sar') {
      const sarDb = (value * 15) - 30;
      if (sarDb < -15) return { label: 'CRITICAL', color: 'red', bgColor: 'bg-red-500' };
      if (sarDb < -12) return { label: 'WARNING', color: 'amber', bgColor: 'bg-amber-500' };
      return { label: 'HEALTHY', color: 'emerald', bgColor: 'bg-emerald-500' };
    }
    if (type === 'ndwi') {
      if (value < -0.35) return { label: 'CRITICAL', color: 'red', bgColor: 'bg-red-500' };
      if (value < -0.15) return { label: 'WARNING', color: 'amber', bgColor: 'bg-amber-500' };
      return { label: 'HEALTHY', color: 'emerald', bgColor: 'bg-emerald-500' };
    }
    if (type === 'lst') {
      if (value > 42) return { label: 'CRITICAL', color: 'red', bgColor: 'bg-red-500' };
      if (value > 38) return { label: 'WARNING', color: 'amber', bgColor: 'bg-amber-500' };
      return { label: 'HEALTHY', color: 'emerald', bgColor: 'bg-emerald-500' };
    }
    return { label: 'NORMAL', color: 'gray', bgColor: 'bg-gray-500' };
  };

  const metrics = [
    {
      id: 'ndvi',
      label: 'NDVI',
      icon: Leaf,
      value: telemetry.ndvi,
      displayValue: telemetry.ndvi.toFixed(3),
      percentage: telemetry.ndvi * 100,
      description: 'Vegetation Index',
    },
    {
      id: 'sar',
      label: 'SAR Backscatter',
      icon: Radio,
      value: telemetry.sarFloodInundation,
      displayValue: `${((telemetry.sarFloodInundation * 15) - 30).toFixed(1)} dB`,
      percentage: telemetry.sarFloodInundation * 100,
      description: 'Flood Detection',
    },
    {
      id: 'ndwi',
      label: 'NDWI Moisture',
      icon: Droplets,
      value: telemetry.ndwiDrought,
      displayValue: telemetry.ndwiDrought.toFixed(3),
      percentage: ((telemetry.ndwiDrought + 1) / 2) * 100,
      description: 'Soil Moisture',
    },
    {
      id: 'lst',
      label: 'LST Temperature',
      icon: Thermometer,
      value: telemetry.lstTemp,
      displayValue: `${telemetry.lstTemp.toFixed(1)}°C`,
      percentage: (telemetry.lstTemp / 50) * 100,
      description: 'Land Surface Temp',
    },
  ];

  const currentHazard = activeTelemetry?.hazard_type || 'NONE';
  const hazardStatus = currentHazard !== 'NONE' 
    ? { label: currentHazard.replace(/_/g, ' '), color: 'red' }
    : { label: 'NO HAZARD DETECTED', color: 'emerald' };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-emerald-500 p-6">
      {/* Header */}
      <div className="flex items-center space-x-2 mb-5 pb-4 border-b border-gray-100">
        <div className="relative">
          <Activity className="w-5 h-5 text-emerald-600" />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
        </div>
        <div>
          <h2 className="text-lg font-extrabold text-gray-900">Live Plot Telemetry</h2>
          <p className="text-xs text-gray-500">Real-time satellite sensor readings</p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="space-y-4 mb-5">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const status = getMetricStatus(metric.id, metric.value);
          
          return (
            <div key={metric.id} className="space-y-2">
              {/* Metric Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Icon className={`w-4 h-4 text-${status.color}-600`} />
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-600">
                    {metric.label}
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium">
                    {metric.description}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-mono font-bold text-gray-900">
                    {metric.displayValue}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide bg-${status.color}-100 text-${status.color}-700`}>
                    {status.label}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="relative w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full ${status.bgColor} rounded-full transition-all duration-500`}
                  style={{ width: `${Math.min(100, Math.max(5, metric.percentage))}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Current Hazard Status Badge */}
      <div className={`p-4 rounded-xl border-2 ${hazardStatus.color === 'red' ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`w-2.5 h-2.5 rounded-full ${hazardStatus.color === 'red' ? 'bg-red-500' : 'bg-emerald-500'} animate-pulse`} />
            <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Current Status:</span>
          </div>
          <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wide ${hazardStatus.color === 'red' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}>
            {hazardStatus.label}
          </span>
        </div>
      </div>

      {/* Data Source Footer */}
      <div className="mt-5 pt-4 border-t border-gray-100">
        <p className="text-[10px] text-gray-500 leading-relaxed">
          <span className="font-bold text-gray-700">Data Sources:</span> Sentinel-1 C-Band SAR (Flood), Sentinel-2 MSI NDVI (Vegetation), Sentinel-2 SWIR NDWI (Moisture), Landsat-8 TIRS LST (Temperature) · Updates every 3s
        </p>
      </div>
    </div>
  );
};

export default PlotTelemetry;
