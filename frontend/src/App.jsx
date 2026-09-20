import React, { useState } from 'react';
import { ShieldCheck, QrCode, PhoneCall, Fingerprint, Activity, MapPin, ExternalLink } from 'lucide-react';
import FarmMap from './components/FarmMap';
import PlotTelemetry from './components/PlotTelemetry';
import DemoControlPanel from './components/DemoControlPanel';
import QRScannerModal from './components/QRScannerModal';
import VoiceAlertModal from './components/VoiceAlertModal';
import AePSCashoutModal from './components/AePSCashoutModal';

export default function App() {
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isAePSModalOpen, setIsAePSModalOpen] = useState(false);

  const [activeTelemetry, setActiveTelemetry] = useState({
    ndvi_score: 0.75,
    sar_backscatter_db: -10.5,
    days_submerged: 0,
    status: "HEALTHY_GROWING_CROP",
    payout_ratio: 0.0
  });

  const [voiceData, setVoiceData] = useState(null);
  const [plotCount, setPlotCount] = useState(1);

  const handleTriggerScenario = (scenarioType) => {
    if (scenarioType === 'assam_flood') {
      const telemetry = {
        ndvi_score: 0.32,
        sar_backscatter_db: -22.4,
        days_submerged: 6,
        status: "CRITICAL_FLOOD_SUBMERSION",
        payout_ratio: 0.70
      };
      setActiveTelemetry(telemetry);
      setVoiceData({
        farmer_name: "Biren Das",
        dialect: "Assamese",
        payout_inr: 35000,
        voice_text: "🔊 [ASSAMESE VOICE ALERT]: বিৰেন দাস ডাঙৰীয়া, উপগ্ৰহ ৰাডাৰে আপোনাৰ পথাৰত (মাজুলী, অসম) ६ দিনৰ বানপানী নিশ্চিত কৰিছে। ₹৩৫,০০০ টকাৰ সাহায্য পোনপটীয়া বেংক একাউন্টলৈ প্ৰেৰণ কৰা হৈছে!"
      });
      setIsVoiceModalOpen(true);
    } else if (scenarioType === 'bihar_flood') {
      const telemetry = {
        ndvi_score: 0.18,
        sar_backscatter_db: -24.1,
        days_submerged: 9,
        status: "TOTAL_CROP_DESTRUCTION",
        payout_ratio: 1.00
      };
      setActiveTelemetry(telemetry);
      setVoiceData({
        farmer_name: "Ram Singh",
        dialect: "Bhojpuri",
        payout_inr: 50000,
        voice_text: "🔊 [BHOJPURI VOICE ALERT]: राम सिंह जी, उपग्रह राडार राउर खेत (दरभंगा, बिहार) में ६ दिन के बाढ़ के पुष्टि कइले बा। ₹५०,००० के सहायता राशि सीधे राउर आधार बैंक खाता में भेज दिहल गइल बा!"
      });
      setIsVoiceModalOpen(true);
    } else {
      setActiveTelemetry({
        ndvi_score: 0.75,
        sar_backscatter_db: -10.5,
        days_submerged: 0,
        status: "HEALTHY_GROWING_CROP",
        payout_ratio: 0.0
      });
    }
  };

  const handlePlotRegistered = (plotData) => {
    setPlotCount((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 md:p-8 space-y-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              AgriTrust AI
            </h1>
            <p className="text-xs text-slate-400">
              Parametric Crop Insurance & Disaster Relief Escrow on MST Blockchain Layer 1
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsQrModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-emerald-500/40 text-emerald-400 rounded-xl font-semibold text-xs transition-all shadow-lg shadow-emerald-500/10"
          >
            <QrCode className="w-4 h-4" />
            <span>Scan Land QR (0 Typing)</span>
          </button>

          <button
            onClick={() => setIsAePSModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 font-bold text-slate-950 rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20"
          >
            <Fingerprint className="w-4 h-4" />
            <span>AePS Fingerprint Cashout</span>
          </button>
        </div>
      </header>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-1">
          <p className="text-xs text-slate-400 font-medium">MST Escrow Pool Balance</p>
          <p className="text-2xl font-black text-emerald-400">500.0 MST</p>
          <p className="text-[11px] text-slate-400">Locked in AgriTrustVault.sol</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-1">
          <p className="text-xs text-slate-400 font-medium">Active Enrolled Plots</p>
          <p className="text-2xl font-black text-white">{plotCount} Plots</p>
          <p className="text-[11px] text-slate-400">Assam & Bihar Geofenced</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-1">
          <p className="text-xs text-slate-400 font-medium">NEWRRO AI Oracle Status</p>
          <p className="text-2xl font-black text-cyan-400 flex items-center">
            <Activity className="w-5 h-5 mr-1 animate-pulse" /> Active
          </p>
          <p className="text-[11px] text-slate-400">2-of-3 Oracle Consensus</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-1">
          <p className="text-xs text-slate-400 font-medium">Average Payout Time</p>
          <p className="text-2xl font-black text-teal-300">1.8 Seconds</p>
          <p className="text-[11px] text-slate-400">Instant MST Blockchain Settlement</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: GIS Farm Map */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-emerald-400" />
                <h2 className="font-bold text-base">Geofenced Farm GIS Map (Assam & Bihar)</h2>
              </div>
              <span className="text-xs text-slate-400">Sentinel-1 SAR Radar Active</span>
            </div>

            <FarmMap activeTelemetry={activeTelemetry} />
          </div>

          <DemoControlPanel onTriggerScenario={handleTriggerScenario} />
        </div>

        {/* Right Column: Telemetry & Controls */}
        <div className="space-y-6">
          <PlotTelemetry telemetry={activeTelemetry} />

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
            <h4 className="font-bold text-sm text-slate-200">Zero-Friction Grassroots Features</h4>
            <div className="space-y-2 text-xs text-slate-300">
              <div className="p-2.5 bg-slate-800/40 rounded-xl border border-slate-800 flex items-center justify-between">
                <span>Krishi Mitra QR Scanner</span>
                <span className="text-emerald-400 font-bold">0 Typing</span>
              </div>
              <div className="p-2.5 bg-slate-800/40 rounded-xl border border-slate-800 flex items-center justify-between">
                <span>Aadhaar Account Abstraction</span>
                <span className="text-cyan-400 font-bold">No Seed Phrase</span>
              </div>
              <div className="p-2.5 bg-slate-800/40 rounded-xl border border-slate-800 flex items-center justify-between">
                <span>Regional IVR Voice Calls</span>
                <span className="text-amber-400 font-bold">Assamese / Bhojpuri</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <QRScannerModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        onPlotRegistered={handlePlotRegistered}
      />

      <VoiceAlertModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        voiceData={voiceData}
      />

      <AePSCashoutModal
        isOpen={isAePSModalOpen}
        onClose={() => setIsAePSModalOpen(false)}
        amountInr={activeTelemetry.payout_ratio * 50000 || 25000}
      />
    </div>
  );
}
