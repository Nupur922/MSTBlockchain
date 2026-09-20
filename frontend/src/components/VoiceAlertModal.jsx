import React from 'react';
import { Volume2, PhoneCall, X } from 'lucide-react';

export default function VoiceAlertModal({ isOpen, onClose, voiceData }) {
  if (!isOpen || !voiceData) return null;

  const { farmer_name = "Ram Singh", dialect = "Bhojpuri", payout_inr = 25000, voice_text = "" } = voiceData;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/20 text-cyan-400 animate-pulse">
            <PhoneCall className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Incoming Voice Call Alert</h3>
            <p className="text-xs text-cyan-300">Dialect: {dialect.toUpperCase()} IVR Voice System</p>
          </div>
        </div>

        <div className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-3">
          <div className="flex items-center space-x-2 text-amber-400 font-semibold text-xs">
            <Volume2 className="w-4 h-4 animate-bounce" />
            <span>Playing Native Dialect Voice Note:</span>
          </div>

          <p className="text-sm font-medium text-slate-100 italic leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-slate-800">
            "{voice_text}"
          </p>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <span>Recipient: <strong>{farmer_name}</strong></span>
            <span className="text-emerald-400 font-bold">₹{payout_inr.toLocaleString()} INR Bank Credit</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 py-3 bg-cyan-500 hover:bg-cyan-600 font-bold text-slate-950 rounded-xl transition-all"
        >
          ✅ Acknowledge Voice Call Alert
        </button>
      </div>
    </div>
  );
}
