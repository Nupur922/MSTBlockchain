import React, { useState } from 'react';
import { Fingerprint, CheckCircle2, Building2, Banknote, X } from 'lucide-react';

export default function AePSCashoutModal({ isOpen, onClose, amountInr = 25000 }) {
  const [isScanning, setIsScanning] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleFingerprintScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setIsSuccess(true);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Village Post Office AePS Cash Counter</h3>
            <p className="text-xs text-slate-400">Aadhaar Enabled Payment System (AePS Cashout)</p>
          </div>
        </div>

        {!isSuccess ? (
          <div className="text-center py-6 space-y-4">
            <div className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-xl flex items-center justify-between">
              <span className="text-xs text-slate-400">Available Escrow Credit:</span>
              <span className="text-lg font-extrabold text-emerald-400">₹{amountInr.toLocaleString()} INR</span>
            </div>

            <div className="w-24 h-24 mx-auto border-2 border-dashed border-emerald-400/50 rounded-2xl flex items-center justify-center bg-emerald-500/5 relative">
              <Fingerprint className={`w-14 h-14 text-emerald-400 ${isScanning ? 'animate-pulse' : ''}`} />
              {isScanning && <div className="absolute inset-x-0 h-1 bg-emerald-400 animate-bounce" />}
            </div>

            <button
              onClick={handleFingerprintScan}
              disabled={isScanning}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 font-bold text-slate-950 rounded-xl transition-all shadow-lg shadow-emerald-500/20"
            >
              {isScanning ? "Verifying Aadhaar Biometrics..." : "👆 Scan Fingerprint to Withdraw Cash"}
            </button>
          </div>
        ) : (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 mx-auto bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center border border-emerald-500/40">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h4 className="text-lg font-bold text-emerald-300">₹{amountInr.toLocaleString()} Cash Dispensed!</h4>
            <p className="text-xs text-slate-300">
              Aadhaar Biometric Match Success. INR Cash handed over to Ram Singh at Darbhanga Village Post Office.
            </p>

            <button
              onClick={onClose}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 font-semibold text-slate-200 rounded-xl transition-all border border-slate-700"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
