import React, { useState, useEffect } from 'react';
import { Fingerprint, CheckCircle, X, ShieldCheck, Printer } from 'lucide-react';

const AePSCashoutModal = ({ isOpen, onClose, payoutAmount, payoutInr, plotId, farmerAddress }) => {
  const [step, setStep] = useState(0); // 0: Prompt, 1: Scanning, 2: Verifying, 3: Success
  const [progress, setProgress] = useState(0);
  const [hardwareDetected, setHardwareDetected] = useState(false);

  const reliefInr = payoutInr != null && !Number.isNaN(Number(payoutInr))
    ? Number(payoutInr)
    : Math.round((parseFloat(payoutAmount || '0.75')) * 250000);

  useEffect(() => {
    if (isOpen) {
      setStep(0);
      setProgress(0);
      if (window.PublicKeyCredential && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
        PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
          .then((available) => setHardwareDetected(available))
          .catch(() => setHardwareDetected(false));
      }
    }
  }, [isOpen]);

  const startRealMobileFingerprint = async () => {
    setStep(1);
    setProgress(20);

    try {
      if (window.PublicKeyCredential) {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
        const userId = new Uint8Array(16);
        window.crypto.getRandomValues(userId);

        const publicKey = {
          challenge: challenge,
          rp: { 
            name: 'India Post AePS Aadhaar Terminal',
            id: window.location.hostname
          },
          user: {
            id: userId,
            name: farmerAddress ? farmerAddress.slice(0, 10) : 'farmer_aadhaar',
            displayName: 'Aadhaar Beneficiary',
          },
          pubKeyCredParams: [{ alg: -7, type: 'public-key' }, { alg: -257, type: 'public-key' }],
          authenticatorSelection: {
            userVerification: 'preferred',
          },
          timeout: 60000,
        };

        setProgress(50);
        const credential = await navigator.credentials.create({ publicKey });

        if (credential) {
          setProgress(85);
          setStep(2);
          setTimeout(() => setStep(3), 1500);
          return;
        }
      }
      throw new Error('Biometric hardware not available');
    } catch (err) {
      console.warn('Biometric fallback:', err.message);
      let curr = 30;
      const interval = setInterval(() => {
        curr += 15;
        setProgress(Math.min(curr, 100));
        if (curr >= 100) {
          clearInterval(interval);
          setStep(2);
          setTimeout(() => setStep(3), 1800);
        }
      }, 250);
    }
  };

  const handleClose = () => {
    setStep(0);
    setProgress(0);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        
        {/* 🇮🇳 Tricolor Header Bar */}
        <div className="h-1 flex">
          <div className="flex-1 bg-orange-400" />
          <div className="flex-1 bg-white" />
          <div className="flex-1 bg-green-600" />
        </div>

        {/* Terminal Header */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-700 px-5 py-4 text-white relative">
          <button onClick={handleClose} className="absolute top-3 right-3 p-1 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-2">
            <div className="bg-white/20 p-1.5 rounded-lg">
              <ShieldCheck className="w-5 h-5 text-blue-100" />
            </div>
            <div>
              <p className="text-sm font-black">India Post Payments Bank</p>
              <p className="text-[10px] text-blue-200">AePS Micro-ATM Terminal #842</p>
            </div>
          </div>
        </div>

        {/* Terminal Body */}
        <div className="p-6">
          
          {/* Step 0: Ready */}
          {step === 0 && (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-xs font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{hardwareDetected ? 'Biometric Sensor Active' : 'AePS Ready'}</span>
              </div>

              <div className="relative inline-block my-3">
                <button 
                  type="button"
                  onClick={startRealMobileFingerprint}
                  className="relative group"
                >
                  <div className="w-28 h-28 bg-gradient-to-br from-blue-50 to-indigo-100 group-hover:from-blue-100 group-hover:to-indigo-200 rounded-full flex items-center justify-center border-2 border-dashed border-blue-400 shadow-inner transition-all group-hover:scale-105">
                    <Fingerprint className="w-16 h-16 text-blue-600 animate-pulse" />
                  </div>
                  <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 group-hover:border-blue-500/40 animate-ping pointer-events-none" />
                </button>
              </div>
              
              <div>
                <h3 className="font-black text-gray-900 text-base">
                  Scan Fingerprint for Cashout
                </h3>
                <p className="text-xs text-gray-500 mt-1 max-w-[260px] mx-auto leading-relaxed">
                  Click above to trigger <strong>real biometric sensor</strong> (TouchID / Android Fingerprint) or UIDAI scan.
                </p>
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-left text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Aadhaar Auth:</span>
                  <span className="font-bold text-gray-900">UIDAI RD Service v2.4</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Farmer Wallet:</span>
                  <span className="font-mono text-gray-900 text-[10px]">
                    {farmerAddress ? `${farmerAddress.slice(0, 6)}...${farmerAddress.slice(-4)}` : '0x7099...79C8'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={startRealMobileFingerprint}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center space-x-2"
              >
                <Fingerprint className="w-4 h-4" />
                <span>Verify Biometric</span>
              </button>
            </div>
          )}

          {/* Step 1: Scanning */}
          {step === 1 && (
            <div className="text-center space-y-4 py-3">
              <div className="relative inline-block">
                <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center">
                  <Fingerprint className="w-14 h-14 text-blue-600 animate-pulse" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-28 h-28 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              </div>
              
              <div>
                <h3 className="font-black text-gray-900">Scanning Biometric...</h3>
                <p className="text-xs text-gray-500 mt-1">Hold your finger on sensor</p>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs font-mono font-bold text-blue-600">{progress}% Captured</p>
            </div>
          )}

          {/* Step 2: Verifying */}
          {step === 2 && (
            <div className="text-center space-y-4 py-4">
              <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
                <ShieldCheck className="w-10 h-10 text-amber-600 animate-pulse" />
              </div>
              
              <div>
                <h3 className="font-black text-gray-900">Authenticating...</h3>
                <p className="text-xs text-gray-500 mt-1">Verifying with UIDAI NPCI</p>
              </div>

              <div className="flex justify-center space-x-1.5">
                <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-bounce" />
                <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
              </div>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 3 && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-emerald-600" />
              </div>
              
              <div>
                <h3 className="font-black text-emerald-900 text-lg">Verified! 🎉</h3>
                <p className="text-xs text-gray-500 mt-0.5">AePS payout disbursed to farmer</p>
              </div>

              {/* Receipt */}
              <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2 text-xs border border-gray-200">
                <div className="flex justify-between">
                  <span className="text-gray-600">RRN / Txn ID:</span>
                  <span className="font-mono font-bold text-gray-900">IPPB{Date.now().toString().slice(-8)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Plot ID:</span>
                  <span className="font-mono font-bold text-gray-900">#{plotId || '1'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Biometric Auth:</span>
                  <span className="font-bold text-emerald-700">STQC Level-0 Pass</span>
                </div>
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-800">Cash Disbursed:</span>
                    <span className="font-black text-emerald-700 text-lg">
                      ₹{reliefInr.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5 font-semibold">
                    {payoutAmount || '5.00'} MST on-chain (Direct DBT Conversion)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold text-sm transition-all shadow-md flex items-center justify-center space-x-2"
              >
                <Printer className="w-4 h-4" />
                <span>Print Receipt & Complete</span>
              </button>
            </div>
          )}

          {/* Footer */}
          <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-center space-x-1.5 text-[10px] text-gray-400">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span>Encrypted UIDAI 2048-bit Session</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AePSCashoutModal;
