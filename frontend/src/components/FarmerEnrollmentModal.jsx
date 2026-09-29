import React, { useState } from 'react';
import { X, UserPlus, Loader2, CheckCircle, AlertCircle, MapPin, Leaf } from 'lucide-react';
import { ethers } from 'ethers';
import { getFarmRegistryContract } from '../utils/web3';
import { connectBridgeKey, switchOrAddMSTTestnet } from '../utils/bridgekey';

// ─── Preset GeoJSON templates for quick demo fills ───────────────────────────
const GEO_PRESETS = [
  {
    label: 'Darbhanga, Bihar (Kosi Basin)',
    state: 'Bihar',
    geoJson: JSON.stringify({
      type: 'Polygon',
      coordinates: [[[85.8971,26.1522],[85.8985,26.1525],[85.8982,26.1510],[85.8968,26.1508],[85.8971,26.1522]]]
    }, null, 2),
  },
  {
    label: 'Majuli Island, Assam (Brahmaputra)',
    state: 'Assam',
    geoJson: JSON.stringify({
      type: 'Polygon',
      coordinates: [[[94.20,26.96],[94.20,26.97],[94.22,26.97],[94.22,26.96],[94.20,26.96]]]
    }, null, 2),
  },
  {
    label: 'Nashik, Maharashtra (Godavari Basin)',
    state: 'Maharashtra',
    geoJson: JSON.stringify({
      type: 'Polygon',
      coordinates: [[[73.7898,19.9975],[73.7920,19.9975],[73.7920,19.9950],[73.7898,19.9950],[73.7898,19.9975]]]
    }, null, 2),
  },
  {
    label: 'Anand, Gujarat (Charotar Belt)',
    state: 'Gujarat',
    geoJson: JSON.stringify({
      type: 'Polygon',
      coordinates: [[[72.9289,22.5645],[72.9315,22.5645],[72.9315,22.5620],[72.9289,22.5620],[72.9289,22.5645]]]
    }, null, 2),
  },
  {
    label: 'Mandya, Karnataka (Cauvery Basin)',
    state: 'Karnataka',
    geoJson: JSON.stringify({
      type: 'Polygon',
      coordinates: [[[76.8958,12.5218],[76.8985,12.5218],[76.8985,12.5190],[76.8958,12.5190],[76.8958,12.5218]]]
    }, null, 2),
  },
  {
    label: 'Ludhiana, Punjab (Sutlej Basin)',
    state: 'Punjab',
    geoJson: JSON.stringify({
      type: 'Polygon',
      coordinates: [[[75.8573,30.9010],[75.8600,30.9010],[75.8600,30.8985],[75.8573,30.8985],[75.8573,30.9010]]]
    }, null, 2),
  },
  {
    label: 'Thanjavur, Tamil Nadu (Delta Zone)',
    state: 'Tamil Nadu',
    geoJson: JSON.stringify({
      type: 'Polygon',
      coordinates: [[[79.1378,10.7870],[79.1405,10.7870],[79.1405,10.7845],[79.1378,10.7845],[79.1378,10.7870]]]
    }, null, 2),
  },
  {
    label: 'Burdwan, West Bengal (Damodar Belt)',
    state: 'West Bengal',
    geoJson: JSON.stringify({
      type: 'Polygon',
      coordinates: [[[87.8615,23.2324],[87.8640,23.2324],[87.8640,23.2300],[87.8615,23.2300],[87.8615,23.2324]]]
    }, null, 2),
  },
];

const CROP_TYPES = [
  'Paddy (Rice)', 'Wheat', 'Maize', 'Sugarcane', 'Mustard',
  'Jute', 'Vegetables', 'Pulses', 'Cotton', 'Other',
];

const STEP = { FORM: 'form', CONFIRMING: 'confirming', SUCCESS: 'success', ERROR: 'error' };

const FarmerEnrollmentModal = ({ isOpen, onClose, onEnrolled, walletState }) => {
  const [step, setStep] = useState(STEP.FORM);

  // Form fields
  const [farmerWallet, setFarmerWallet] = useState('');
  const [cropType,     setCropType]     = useState('Paddy (Rice)');
  const [acreageStr,   setAcreageStr]   = useState('');   // e.g. "2.5" acres
  const [geoJson,      setGeoJson]      = useState('');

  // Result
  const [txHash,   setTxHash]   = useState('');
  const [plotId,   setPlotId]   = useState(null);
  const [errMsg,   setErrMsg]   = useState('');

  // Reset form and step every time modal opens
  React.useEffect(() => {
    if (isOpen) {
      setStep(STEP.FORM);
      setErrMsg('');
      setTxHash('');
      setPlotId(null);
    }
  }, [isOpen]);

  // ── Validation helpers ────────────────────────────────────────────────────
  const isValidAddress = (addr) => /^0x[0-9a-fA-F]{40}$/.test(addr);
  const isValidGeoJson = (s) => {
    try { const g = JSON.parse(s); return g.type === 'Polygon' && Array.isArray(g.coordinates?.[0]); }
    catch { return false; }
  };
  const isValidAcreage = (s) => !isNaN(parseFloat(s)) && parseFloat(s) > 0;

  const canSubmit = isValidAddress(farmerWallet) && isValidGeoJson(geoJson) && isValidAcreage(acreageStr);

  // ── Submit via BridgeKey Wallet ──────────────────────────────────────────
  const handleSubmit = async () => {
    if (!canSubmit) return;
    setStep(STEP.CONFIRMING);
    setErrMsg('');
    setTxHash('');

    try {
      // 1. Obtain user's connected BridgeKey signer
      let signer = walletState?.signer;
      let isMSTTestnet = walletState?.isMSTTestnet;

      if (!signer) {
        const conn = await connectBridgeKey();
        signer = conn.signer;
        isMSTTestnet = conn.isMSTTestnet;
      }

      // 2. Ensure wallet is on MST Testnet
      if (!isMSTTestnet) {
        try {
          await switchOrAddMSTTestnet();
        } catch (switchErr) {
          throw new Error('Please switch your BridgeKey wallet to MST Testnet to submit transactions.');
        }
      }

      // 3. Obtain FarmRegistry contract with BridgeKey Signer
      const contract = getFarmRegistryContract(signer);
      if (!contract) {
        throw new Error('FarmRegistry contract not available. Please verify contract deployment and address configuration.');
      }

      // acreage is stored ×100 in Solidity (e.g. 2.5 acres → 250)
      const acreageScaled = Math.round(parseFloat(acreageStr) * 100);

      // 4. Request user authorization & signature in BridgeKey
      console.log('📝 Submitting registerFarmPlot via BridgeKey:', {
        farmerWallet,
        cropType,
        acreageScaled,
      });

      const tx = await contract.registerFarmPlot(
        farmerWallet,
        geoJson,
        acreageScaled,
        cropType
      );

      setTxHash(tx.hash);
      console.log('🚀 Transaction broadcasted to MST Testnet:', tx.hash);

      // 5. Wait for on-chain block confirmation
      const receipt = await tx.wait();
      console.log('✅ Transaction confirmed on MST Testnet. Receipt:', receipt);

      // 6. Extract plotId from FarmPlotRegistered event
      let newPlotId = null;
      if (receipt.logs) {
        for (const log of receipt.logs) {
          try {
            const parsed = contract.interface.parseLog(log);
            if (parsed?.name === 'FarmPlotRegistered') {
              newPlotId = parsed.args.plotId.toString();
              break;
            }
          } catch { /* ignore non-matching logs */ }
        }
      }

      setPlotId(newPlotId);
      setStep(STEP.SUCCESS);

      // Notify parent to refresh map
      if (onEnrolled) onEnrolled({ plotId: newPlotId, farmerWallet, cropType, geoJson, txHash: tx.hash });

    } catch (err) {
      console.error('Enrollment transaction failed:', err);
      let msg = err.message ?? 'Unknown error';

      if (err.code === 4001 || msg.includes('rejected') || msg.includes('User denied')) {
        msg = 'Transaction was rejected in BridgeKey.';
      } else if (msg.includes('KRISHI_MITRA_ROLE') || msg.includes('missing role')) {
        msg = 'Your connected BridgeKey address does not have the KRISHI_MITRA_ROLE. The contract admin must grant KRISHI_MITRA_ROLE to this address.';
      } else if (msg.includes('insufficient funds')) {
        msg = 'Insufficient $MSTC in your BridgeKey wallet for gas fees. Please claim 10 MSTC from https://faucet.masterstroke.academy.';
      } else if (msg.includes('BridgeKey wallet extension is not installed')) {
        msg = 'BridgeKey wallet extension is not installed. Please install it from the Chrome Web Store.';
      }

      setErrMsg(msg);
      setStep(STEP.ERROR);
    }
  };

  const handleClose = () => {
    setStep(STEP.FORM);
    setFarmerWallet(''); setCropType('Paddy (Rice)'); setAcreageStr(''); setGeoJson('');
    setTxHash(''); setPlotId(null); setErrMsg('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-5 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Krishi Mitra — Farm Enrollment</h2>
                <p className="text-xs text-green-100">Register a new farm plot on MST Blockchain</p>
              </div>
            </div>
            <button onClick={handleClose} className="text-white/70 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6">

          {/* ── FORM ── */}
          {step === STEP.FORM && (
            <div className="space-y-5">
              {/* Info box */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
                <strong>Who can enroll?</strong> Only wallets with <code className="bg-blue-100 px-1 rounded">KRISHI_MITRA_ROLE</code> can call this function.
                Connect MetaMask with the Krishi Mitra wallet (account #0 after deploying).
              </div>

              {/* Farmer Wallet */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Farmer Wallet Address *
                </label>
                <input
                  type="text"
                  value={farmerWallet}
                  onChange={e => setFarmerWallet(e.target.value.trim())}
                  placeholder="0x..."
                  className={`w-full px-3 py-2.5 border rounded-xl text-sm font-mono transition-colors
                    ${farmerWallet && !isValidAddress(farmerWallet)
                      ? 'border-red-400 bg-red-50'
                      : 'border-gray-300 focus:border-green-500 focus:ring-1 focus:ring-green-500'}`}
                />
                {farmerWallet && !isValidAddress(farmerWallet) && (
                  <p className="text-xs text-red-600 mt-1">Invalid Ethereum address</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  Try Hardhat account #2: <button
                    onClick={() => setFarmerWallet('0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC')}
                    className="text-green-600 underline">fill demo</button>
                </p>
              </div>

              {/* Crop Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Crop Type *
                </label>
                <select
                  value={cropType}
                  onChange={e => setCropType(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500"
                >
                  {CROP_TYPES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              {/* Acreage */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Acreage (acres) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={acreageStr}
                  onChange={e => setAcreageStr(e.target.value)}
                  placeholder="e.g. 2.5"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500"
                />
                <p className="text-xs text-gray-400 mt-1">Stored as ×100 in Solidity (e.g. 2.5 acres → 250)</p>
              </div>

              {/* GeoJSON */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-semibold text-gray-700 flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-green-600" />
                    <span>Polygon GeoJSON *</span>
                  </label>
                  <span className="text-xs text-gray-400">Quick-fill:</span>
                </div>
                {/* Preset buttons */}
                <div className="flex flex-wrap gap-2 mb-2">
                  {GEO_PRESETS.map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setGeoJson(p.geoJson)}
                      className="px-2.5 py-1 bg-green-50 hover:bg-green-100 border border-green-200 text-green-800 text-xs rounded-lg transition-colors font-medium flex items-center space-x-1"
                    >
                      <span className="font-semibold text-green-900">{p.state}:</span>
                      <span>{p.label.split(',')[0]}</span>
                    </button>
                  ))}
                </div>
                <textarea
                  value={geoJson}
                  onChange={e => setGeoJson(e.target.value)}
                  placeholder={'{\n  "type": "Polygon",\n  "coordinates": [[[lng,lat]...]]\n}'}
                  rows={5}
                  className={`w-full px-3 py-2 border rounded-xl text-xs font-mono transition-colors resize-none
                    ${geoJson && !isValidGeoJson(geoJson)
                      ? 'border-red-400 bg-red-50'
                      : 'border-gray-300 focus:border-green-500 focus:ring-1 focus:ring-green-500'}`}
                />
                {geoJson && !isValidGeoJson(geoJson) && (
                  <p className="text-xs text-red-600 mt-1">Invalid GeoJSON — must be Polygon type with coordinates array</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  Or scan a Bihar Bhumi QR code above the map and copy the GeoJSON from there.
                </p>
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-bold transition-all transform hover:scale-105 shadow-md"
              >
                Register Farm Plot on MST Blockchain
              </button>
            </div>
          )}

          {/* ── CONFIRMING ── */}
          {step === STEP.CONFIRMING && (
            <div className="text-center py-8 space-y-5">
              <div className="bg-emerald-100 p-6 rounded-full inline-block">
                <Loader2 className="w-16 h-16 text-emerald-600 animate-spin" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Approve in BridgeKey Wallet</h3>
                <p className="text-sm text-gray-500 mt-1">Please confirm the transaction in the BridgeKey extension popup and wait for block confirmation on MST Testnet</p>
              </div>
              {txHash && (
                <div className="p-3 bg-gray-50 rounded-xl text-left border border-emerald-200">
                  <p className="text-xs text-gray-500 mb-1">Transaction Hash:</p>
                  <p className="font-mono text-xs text-emerald-700 break-all">{txHash}</p>
                  <a
                    href={`https://testnet.mstscan.com/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-2 text-xs font-semibold text-emerald-600 hover:text-emerald-700 underline"
                  >
                    View on MSTScan ↗
                  </a>
                </div>
              )}
              <p className="text-xs text-gray-400">Broadcasting <code>FarmRegistry.registerFarmPlot()</code> to MST Testnet (Chain ID 91562037)…</p>
            </div>
          )}

          {/* ── SUCCESS ── */}
          {step === STEP.SUCCESS && (
            <div className="text-center py-6 space-y-5">
              <div className="bg-emerald-100 p-6 rounded-full inline-block">
                <CheckCircle className="w-16 h-16 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-bold text-emerald-900 text-xl">Farm Plot Enrolled! 🎉</h3>
                <p className="text-sm text-gray-500 mt-1">Successfully registered on MST Testnet Blockchain</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2 text-sm border border-gray-100">
                {plotId && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Plot ID:</span>
                    <span className="font-bold text-emerald-700">#{plotId}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Farmer Wallet:</span>
                  <span className="font-mono text-xs">{farmerWallet.slice(0,6)}…{farmerWallet.slice(-4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Crop Type:</span>
                  <span className="font-semibold">{cropType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Acreage:</span>
                  <span className="font-semibold">{acreageStr} acres</span>
                </div>
                <div className="border-t pt-2">
                  <p className="text-xs text-gray-500 mb-1">MST Testnet TX Hash:</p>
                  <p className="font-mono text-xs text-gray-700 break-all">{txHash}</p>
                  {txHash && (
                    <a
                      href={`https://testnet.mstscan.com/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 mt-2 text-xs font-bold text-emerald-600 hover:text-emerald-700"
                    >
                      <span>Verify on MSTScan</span>
                      <span>↗</span>
                    </a>
                  )}
                </div>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                <strong>Verified On-Chain:</strong> The farm plot is recorded on MST Testnet Layer 1. The NEWRRO AI Sentinel Agent will monitor this land parcel boundary via Sentinel-1 SAR & Sentinel-2 NDVI.
              </div>

              <button
                onClick={handleClose}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold transition-colors shadow-md"
              >
                Close & Refresh Map
              </button>
            </div>
          )}

          {/* ── ERROR ── */}
          {step === STEP.ERROR && (
            <div className="text-center py-6 space-y-5">
              <div className="bg-red-100 p-6 rounded-full inline-block">
                <AlertCircle className="w-16 h-16 text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Enrollment Failed</h3>
                <p className="text-sm text-gray-500 mt-1">Transaction could not be completed</p>
              </div>
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800 text-left">
                {errMsg}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setStep(STEP.FORM)}
                  className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 py-2.5 rounded-xl font-medium transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={handleClose}
                  className="flex-1 bg-gray-800 text-white py-2.5 rounded-xl font-medium transition-colors hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FarmerEnrollmentModal;
