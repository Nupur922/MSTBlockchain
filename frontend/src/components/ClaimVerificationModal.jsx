import React, { useState } from 'react';
import { 
  ShieldAlert, AlertOctagon, Wheat, Flame, 
  CheckCircle2, XCircle, Search, RefreshCw, X,
  Radio, Database, Satellite, ArrowRight
} from 'lucide-react';
import { ethers } from 'ethers';
import { getFarmRegistryContract, RPC_URL } from '../utils/web3';

export default function ClaimVerificationModal({ isOpen, onClose, onTriggerScenario }) {
  const [activeTab, setActiveTab] = useState('invalid-plot');

  // Tab 1 state: Invalid Plot
  const [plotIdInput, setPlotIdInput] = useState('999');
  const [queryingChain, setQueryingChain] = useState(false);
  const [chainResult, setChainResult] = useState(null);

  // Tab 2 state: Crop Mismatch
  const [selectedFarmerPlot, setSelectedFarmerPlot] = useState('1'); // Plot 1 = Prasanta Kalita, Paddy
  const [claimedCrop, setClaimedCrop] = useState('Wheat');
  const [mismatchResult, setMismatchResult] = useState(null);

  // Tab 3 state: Stubble Shield
  const [stubbleNdvi, setStubbleNdvi] = useState(0.18);
  const [stubbleSar, setStubbleSar] = useState(-8.5);
  const [stubbleRain, setStubbleRain] = useState(0);
  const [stubbleResult, setStubbleResult] = useState(null);

  // Tab 4 state: Ghost Crop
  const [ghostResult, setGhostResult] = useState(null);

  if (!isOpen) return null;

  // 1. Query Blockchain for Plot ID
  const handleQueryPlot = async () => {
    setQueryingChain(true);
    setChainResult(null);
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const registry = getFarmRegistryContract(provider);
      let exists = false;
      let plotData = null;

      try {
        const total = await registry.getPlotCount();
        const pid = Number(plotIdInput);
        if (pid > 0 && pid <= Number(total)) {
          plotData = await registry.getFarmPlot(pid);
          if (plotData && plotData.ownerWallet && plotData.ownerWallet !== ethers.ZeroAddress) {
            exists = true;
          }
        }
      } catch {
        exists = false;
      }

      if (exists && plotData) {
        setChainResult({
          status: 'FOUND',
          message: `Plot #${plotIdInput} is VALID and registered to ${plotData.farmerName || 'Enrolled Farmer'}.`,
          isRejection: false
        });
      } else {
        setChainResult({
          status: 'REJECTED',
          message: `Plot #${plotIdInput} NOT FOUND in FarmRegistry.sol (Chain ID 91562037). EIP-191 ECDSA Oracle proof generation aborted. Zero payout released.`,
          isRejection: true
        });
        // Also update dashboard
        onTriggerScenario?.('nonexistent-plot');
      }
    } catch {
      setChainResult({
        status: 'REJECTED',
        message: `Plot #${plotIdInput} is not enrolled on MST Testnet. Verification failed.`,
        isRejection: true
      });
      onTriggerScenario?.('nonexistent-plot');
    } finally {
      setQueryingChain(false);
    }
  };

  // 2. Crop Mismatch Evaluation
  const handleCropMismatch = () => {
    setMismatchResult({
      registeredCrop: 'Sali Paddy (Rice)',
      claimedCrop: claimedCrop,
      sarTexture: claimedCrop === 'Paddy' ? 'Compliant with Standing Water Canopy' : 'Non-compliant: Radar texture indicates Dry Grain/Canopy (-10.1 dB)',
      phenologyMatch: claimedCrop === 'Paddy',
      verdict: claimedCrop === 'Paddy' ? 'MATCH' : 'FRAUD_REJECTED'
    });
    if (claimedCrop !== 'Paddy') {
      onTriggerScenario?.('crop-mismatch');
    }
  };

  // 3. Stubble Shield Evaluation
  const handleStubbleShield = () => {
    // Optical votes yes if NDVI dropped < 0.40
    const opticalVote = stubbleNdvi < 0.40;
    // Radar votes yes ONLY if backscatter indicates standing water (< -15 dB)
    const sarVote = stubbleSar < -15.0;
    // Weather votes yes ONLY if rainfall > 50mm
    const rainVote = stubbleRain >= 50;

    const yesCount = (opticalVote ? 1 : 0) + (sarVote ? 1 : 0) + (rainVote ? 1 : 0);
    const consensusPassed = yesCount >= 2;

    setStubbleResult({
      opticalVote,
      sarVote,
      rainVote,
      yesCount,
      consensusPassed,
      verdict: consensusPassed ? 'PAYOUT_APPROVED' : 'STUBBLE_SHIELD_REJECTED'
    });
    if (!consensusPassed) {
      onTriggerScenario?.('harvest-confusion');
    }
  };

  // 4. Ghost Crop Evaluation
  const handleGhostCrop = () => {
    setGhostResult({
      preEnrollmentNdvi: 0.52,
      variance: 'Erratic baseline scatter indicative of unmanaged wild weed flora',
      tillSignature: 'Absent — No agricultural soil turning detected prior to policy date',
      verdict: 'FRAUD_REJECTED'
    });
    onTriggerScenario?.('ghost-crop-fraud');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500/20 rounded-xl border border-rose-500/40 text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                Oracle Claim & Fraud Verification Playground
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Interactive Demo
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Test custom inputs, fraud detection, and 2-of-3 consensus rejection live
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-1 overflow-x-auto">
          {[
            { id: 'invalid-plot', label: '1. Invalid Plot ID', icon: AlertOctagon },
            { id: 'crop-mismatch', label: '2. Crop Mismatch', icon: Wheat },
            { id: 'stubble-shield', label: '3. Stubble Shield', icon: Radio },
            { id: 'ghost-crop', label: '4. Ghost Crop Fraud', icon: Database },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
                  active 
                    ? 'bg-white text-rose-700 border-rose-600 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-rose-600' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">

          {/* TAB 1: INVALID PLOT */}
          {activeTab === 'invalid-plot' && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 text-rose-600" />
                  Test Unregistered Plot Claim
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Enter any custom Plot ID. The system queries <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-[11px]">FarmRegistry.sol</code> live on MST Testnet. If the plot is not enrolled, EIP-191 cryptographic proof signing is halted and the claim is rejected.
                </p>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 block">
                  Plot ID to Claim Against (Try entering 999 or 404):
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={plotIdInput}
                    onChange={(e) => setPlotIdInput(e.target.value)}
                    placeholder="Enter Plot ID (e.g. 999)"
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
                  />
                  <button
                    onClick={handleQueryPlot}
                    disabled={queryingChain || !plotIdInput}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
                  >
                    {queryingChain ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    Verify On-Chain
                  </button>
                </div>
              </div>

              {chainResult && (
                <div className={`p-4 rounded-2xl border transition-all ${
                  chainResult.isRejection 
                    ? 'bg-rose-50 border-rose-200 text-rose-900' 
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}>
                  <div className="flex items-start gap-3">
                    {chainResult.isRejection ? (
                      <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1">
                      <div className="text-xs font-black uppercase tracking-wider">
                        {chainResult.status === 'REJECTED' ? '🚫 Smart Contract Rejection' : '✅ Plot Verified'}
                      </div>
                      <p className="text-xs leading-relaxed font-medium">
                        {chainResult.message}
                      </p>
                      <div className="text-[11px] opacity-75 mt-2 pt-2 border-t border-rose-200/60 font-mono">
                        Target Contract: 0xDA6Fe875D30Bd4329415625b845fC7b4Fb859C9b · Chain: 91562037
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CROP MISMATCH */}
          {activeTab === 'crop-mismatch' && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
                  <Wheat className="w-4 h-4 text-orange-600" />
                  Test Crop Type Mismatch Fraud
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Farmer is registered in the land registry for <strong>Sali Paddy</strong>. Claim is submitted for a different crop. Sentinel-2 phenology and Sentinel-1 SAR texture cross-check catches the mismatch and flags fraud.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Registered Land Record</span>
                  <div className="text-sm font-bold text-slate-900">Plot #1 (Prasanta Kalita)</div>
                  <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded inline-block">
                    Enrolled Crop: Sali Paddy (Rice)
                  </div>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Claimed Disaster Crop</span>
                  <select
                    value={claimedCrop}
                    onChange={(e) => setClaimedCrop(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="Wheat">Wheat (Mismatched Season)</option>
                    <option value="Mustard">Mustard (Oilseed Mismatch)</option>
                    <option value="Cotton">Cotton (Texture Mismatch)</option>
                    <option value="Paddy">Paddy (Legitimate Registered Crop)</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleCropMismatch}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md transition-all"
              >
                <Satellite className="w-4 h-4" />
                Cross-Verify with Satellite Phenology & SAR Texture
              </button>

              {mismatchResult && (
                <div className={`p-4 rounded-2xl border transition-all ${
                  mismatchResult.verdict === 'FRAUD_REJECTED'
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}>
                  <div className="flex items-start gap-3">
                    {mismatchResult.verdict === 'FRAUD_REJECTED' ? (
                      <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1 text-xs">
                      <div className="font-black uppercase tracking-wider">
                        {mismatchResult.verdict === 'FRAUD_REJECTED' 
                          ? '🚫 Oracle Rejection: Crop Mismatch Detected' 
                          : '✅ Crop Type Verified'}
                      </div>
                      <p className="font-medium">
                        Registered: <strong>{mismatchResult.registeredCrop}</strong> · Claimed: <strong>{mismatchResult.claimedCrop}</strong>
                      </p>
                      <p className="opacity-90">
                        {mismatchResult.sarTexture}
                      </p>
                      <p className="text-[11px] opacity-75 mt-1 font-mono">
                        Verdict: Rejection recorded. AI Oracle refuses to issue EIP-191 signature.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: STUBBLE SHIELD */}
          {activeTab === 'stubble-shield' && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
                  <Radio className="w-4 h-4 text-indigo-600" />
                  Stubble Shield: Seasonal Harvest vs Flood (2-of-3 Consensus)
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Basic insurance that relies purely on NDVI fails when farmers cut crops or burn stubble because NDVI drops abruptly. AgriTrust AI uses <strong>3 independent spectral feeds</strong>. A payout requires at least <strong>2-of-3 feeds</strong> to confirm a disaster.
                </p>
              </div>

              {/* Sliders / Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700">1. Sentinel-2 NDVI</span>
                    <span className="font-mono font-bold text-rose-600">{stubbleNdvi.toFixed(2)}</span>
                  </div>
                  <input
                    type="range" min="0.05" max="0.80" step="0.01"
                    value={stubbleNdvi}
                    onChange={(e) => setStubbleNdvi(parseFloat(e.target.value))}
                    className="w-full accent-rose-600"
                  />
                  <span className="text-[10px] text-slate-400 block">
                    {stubbleNdvi < 0.4 ? '⚠️ Sudden drop (looks like disaster to optical)' : 'Normal healthy green'}
                  </span>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700">2. Sentinel-1 SAR</span>
                    <span className="font-mono font-bold text-indigo-600">{stubbleSar.toFixed(1)} dB</span>
                  </div>
                  <input
                    type="range" min="-26.0" max="-5.0" step="0.5"
                    value={stubbleSar}
                    onChange={(e) => setStubbleSar(parseFloat(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                  <span className="text-[10px] text-slate-400 block">
                    {stubbleSar < -15.0 ? '🌊 Standing water detected' : '🏜️ Bare dry soil (no water)'}
                  </span>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700">3. IMD Rainfall</span>
                    <span className="font-mono font-bold text-cyan-600">{stubbleRain} mm</span>
                  </div>
                  <input
                    type="range" min="0" max="250" step="5"
                    value={stubbleRain}
                    onChange={(e) => setStubbleRain(parseInt(e.target.value))}
                    className="w-full accent-cyan-600"
                  />
                  <span className="text-[10px] text-slate-400 block">
                    {stubbleRain >= 50 ? '🌧️ Heavy precipitation' : '☀️ Dry weather (0 mm)'}
                  </span>
                </div>
              </div>

              <button
                onClick={handleStubbleShield}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all"
              >
                <Radio className="w-4 h-4" />
                Evaluate 2-of-3 Multi-Spectrum Consensus
              </button>

              {stubbleResult && (
                <div className={`p-4 rounded-2xl border transition-all ${
                  !stubbleResult.consensusPassed
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                        {!stubbleResult.consensusPassed ? (
                          <>
                            <XCircle className="w-4 h-4 text-rose-600" />
                            Consensus Failed: {stubbleResult.yesCount} / 3 Feeds Voted Yes
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            Consensus Passed: {stubbleResult.yesCount} / 3 Feeds Voted Yes
                          </>
                        )}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900 text-white">
                        Required: ≥ 2 Feeds
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className={`p-2 rounded-xl border ${stubbleResult.opticalVote ? 'bg-amber-100 border-amber-300 text-amber-900' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                        <div className="font-bold">Optical NDVI</div>
                        <div className="text-[10px] mt-0.5">{stubbleResult.opticalVote ? '⚠️ Voted YES' : 'Voted NO'}</div>
                      </div>
                      <div className={`p-2 rounded-xl border ${stubbleResult.sarVote ? 'bg-cyan-100 border-cyan-300 text-cyan-900' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                        <div className="font-bold">SAR Radar</div>
                        <div className="text-[10px] mt-0.5">{stubbleResult.sarVote ? '⚠️ Voted YES' : '❌ Voted NO'}</div>
                      </div>
                      <div className={`p-2 rounded-xl border ${stubbleResult.rainVote ? 'bg-blue-100 border-blue-300 text-blue-900' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                        <div className="font-bold">Weather Rain</div>
                        <div className="text-[10px] mt-0.5">{stubbleResult.rainVote ? '⚠️ Voted YES' : '❌ Voted NO'}</div>
                      </div>
                    </div>

                    <p className="text-xs font-medium leading-relaxed">
                      {!stubbleResult.consensusPassed
                        ? '🛡️ STUBBLE SHIELD ACTIVE: NDVI drop was caused by seasonal dry harvesting or stubble cutting (SAR confirmed dry soil, no standing water). False claim successfully rejected with 0% payout.'
                        : 'Disaster Confirmed: Multi-spectrum consensus verified legitimate crop loss.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: GHOST CROP */}
          {activeTab === 'ghost-crop' && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
                  <Database className="w-4 h-4 text-purple-600" />
                  Ghost Crop Fraud: Pre-Sowing Baseline Audit
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Fraudsters attempt to insure fallow wasteland right before the monsoon to claim automatic disaster relief. AgriTrust AI audits the 30-day pre-sowing satellite history to verify actual agricultural cultivation before issuing policy payouts.
                </p>
              </div>

              <div className="p-4 bg-slate-100 rounded-2xl border border-slate-200 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Target Plot:</span>
                  <span className="font-bold text-slate-800">Plot #8 (Claimed 3.5 Acres Fallow Wasteland)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Historical Window:</span>
                  <span className="font-bold text-slate-800">May 15 – June 15, 2026 (Pre-Sowing)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Expected Signature:</span>
                  <span className="font-bold text-slate-800">Tillage roughness transition & seedling emergence</span>
                </div>
              </div>

              <button
                onClick={handleGhostCrop}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md transition-all"
              >
                <Database className="w-4 h-4" />
                Audit Pre-Sowing Baseline Satellite History
              </button>

              {ghostResult && (
                <div className="p-4 rounded-2xl border bg-rose-50 border-rose-200 text-rose-900 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-black uppercase tracking-wider">
                    <XCircle className="w-4 h-4 text-rose-600" />
                    🚫 Fraud Flagged: Ghost Crop Detected
                  </div>
                  <p className="font-medium leading-relaxed">
                    Baseline audit revealed non-agricultural weed flora on barren wasteland prior to policy enrollment. Soil turning signature is completely absent.
                  </p>
                  <p className="text-[11px] opacity-75 font-mono pt-2 border-t border-rose-200">
                    Decision: Land disqualified. Zero payout authorized.
                  </p>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">
            AgriTrust AI Sentinel Oracle · EIP-191 Security Layer
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all shadow-sm"
          >
            Close & View Dashboard
          </button>
        </div>

      </div>
    </div>
  );
}
