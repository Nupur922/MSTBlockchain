import React, { useState, useEffect } from 'react';
import { Activity, Droplets, Leaf } from 'lucide-react';

// Circular gauge component
const CircularGauge = ({ value, max, label, unit, color, icon: Icon }) => {
  const percentage = (value / max) * 100;
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        {/* Background Circle */}
        <svg className="transform -rotate-90 w-32 h-32">
          <circle
            cx="64"
            cy="64"
            r="45"
            stroke="#e5e7eb"
            strokeWidth="8"
            fill="none"
          />
          {/* Progress Circle */}
          <circle
            cx="64"
            cy="64"
            r="45"
            stroke={color}
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Icon className="w-6 h-6 text-gray-600 mb-1" />
          <span className="text-2xl font-bold text-gray-900">
            {value.toFixed(2)}
          </span>
          <span className="text-xs text-gray-500">{unit}</span>
        </div>
      </div>
      <p className="mt-3 text-sm font-medium text-gray-700">{label}</p>
    </div>
  );
};

// Status indicator component
const StatusIndicator = ({ label, status, description }) => {
  const statusColors = {
    normal: 'bg-green-500',
    warning: 'bg-orange-500',
    critical: 'bg-red-500',
  };

  return (
    <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
      <div className={`w-3 h-3 rounded-full ${statusColors[status]} mt-1`}></div>
      <div>
        <p className="font-semibold text-gray-900">{label}</p>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </div>
  );
};

const PlotTelemetry = ({ activeTelemetry }) => {
  // Mock telemetry data - satellite feeds: Sentinel-2 NDVI, Sentinel-1 SAR, Sentinel-2 NDWI
  const [telemetry, setTelemetry] = useState({
    ndvi: 0.72, // Normalized Difference Vegetation Index (0.0 - 1.0)
    sarFloodInundation: 0.15, // SAR Flood Inundation (0.0 - 1.0)
    ndwiDrought: -0.12, // Normalized Difference Water Index (-1.0 to +1.0)
    soilMoisture: 0.65, // Soil moisture (0.0 - 1.0)
  });

  // When activeTelemetry from disaster scenario is present, override local state
  useEffect(() => {
    if (activeTelemetry && activeTelemetry.hazard_type && activeTelemetry.hazard_type !== 'NONE') {
      // Map multi-hazard engine values → PlotTelemetry gauge values
      const sarNormalized = Math.max(0, Math.min(1, (activeTelemetry.sar_backscatter_db + 30) / 15));
      setTelemetry({
        ndvi: activeTelemetry.ndvi_score ?? 0.72,
        sarFloodInundation: sarNormalized,
        ndwiDrought: activeTelemetry.ndwi_score ?? -0.12,
        soilMoisture: Math.max(0, Math.min(1, (activeTelemetry.ndwi_score + 1) / 2)),
      });
    } else if (activeTelemetry && activeTelemetry.hazard_type === 'NONE') {
      // Reset to healthy baseline
      setTelemetry({ ndvi: 0.72, sarFloodInundation: 0.15, ndwiDrought: -0.12, soilMoisture: 0.65 });
    }
  }, [activeTelemetry]);

  // Simulate real-time micro-jitter updates (only when no active disaster)
  useEffect(() => {
    if (activeTelemetry && activeTelemetry.hazard_type && activeTelemetry.hazard_type !== 'NONE') return;
    const interval = setInterval(() => {
      setTelemetry((prev) => ({
        ndvi: Math.max(0, Math.min(1, prev.ndvi + (Math.random() - 0.5) * 0.05)),
        sarFloodInundation: Math.max(0, Math.min(1, prev.sarFloodInundation + (Math.random() - 0.5) * 0.03)),
        ndwiDrought: Math.max(-1, Math.min(1, prev.ndwiDrought + (Math.random() - 0.5) * 0.04)),
        soilMoisture: Math.max(0, Math.min(1, prev.soilMoisture + (Math.random() - 0.5) * 0.04)),
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, [activeTelemetry]);

  // Determine status based on telemetry
  const getFloodStatus = () => {
    if (telemetry.sarFloodInundation > 0.5) return { status: 'critical', desc: 'High flood inundation detected' };
    if (telemetry.sarFloodInundation > 0.25) return { status: 'warning', desc: 'Moderate flood risk' };
    return { status: 'normal', desc: 'Normal water level' };
  };

  const getDroughtStatus = () => {
    if (telemetry.ndwiDrought < -0.35) return { status: 'critical', desc: 'Critical drought risk: NDWI < -0.35' };
    if (telemetry.ndwiDrought < -0.15) return { status: 'warning', desc: 'Moderate moisture deficit' };
    return { status: 'normal', desc: 'Adequate moisture levels' };
  };

  const getVegetationStatus = () => {
    if (telemetry.ndvi < 0.3) return { status: 'critical', desc: 'Severe crop loss detected' };
    if (telemetry.ndvi < 0.5) return { status: 'warning', desc: 'Below optimal vegetation health' };
    return { status: 'normal', desc: 'Healthy crop canopy' };
  };

  const floodStatus = getFloodStatus();
  const droughtStatus = getDroughtStatus();
  const vegetationStatus = getVegetationStatus();

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      {/* Header */}
      <div className="flex items-center space-x-2 mb-6">
        <Activity className="w-6 h-6 text-primary" />
        <h2 className="text-xl font-bold text-gray-900">Plot Telemetry & Satellite Monitoring</h2>
      </div>

      {/* Gauges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <CircularGauge
          value={telemetry.ndvi}
          max={1.0}
          label="NDVI (Optical)"
          unit="/1.0"
          color="#10b981"
          icon={Leaf}
        />
        <CircularGauge
          value={telemetry.sarFloodInundation}
          max={1.0}
          label="SAR Flood"
          unit="/1.0"
          color="#3b82f6"
          icon={Droplets}
        />
        <CircularGauge
          value={Math.max(0, (telemetry.ndwiDrought + 1) / 2)}
          max={1.0}
          label="NDWI Moisture"
          unit={telemetry.ndwiDrought.toFixed(2)}
          color="#f59e0b"
          icon={Activity}
        />
        <CircularGauge
          value={telemetry.soilMoisture}
          max={1.0}
          label="Soil Moisture"
          unit="/1.0"
          color="#8b5cf6"
          icon={Activity}
        />
      </div>

      {/* Status Indicators */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Multi-Feed Status Alerts</h3>
        <StatusIndicator
          label="Flood Risk Assessment (Sentinel-1 SAR)"
          status={floodStatus.status}
          description={floodStatus.desc}
        />
        <StatusIndicator
          label="NDWI Drought Monitoring (Sentinel-2 SWIR)"
          status={droughtStatus.status}
          description={droughtStatus.desc}
        />
        <StatusIndicator
          label="Vegetation Health (Sentinel-2 NDVI)"
          status={vegetationStatus.status}
          description={vegetationStatus.desc}
        />
      </div>

      {/* Info Footer */}
      <div className="mt-6 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
        <p className="text-sm text-emerald-900">
          <span className="font-semibold">Satellite Telemetry Sources:</span> Sentinel-1 C-Band SAR (Flood), Sentinel-2 MSI Bands 4/8 (NDVI), Sentinel-2 SWIR Band 11 (NDWI Drought). Updates every 3s.
        </p>
      </div>
    </div>
  );
};

export default PlotTelemetry;
