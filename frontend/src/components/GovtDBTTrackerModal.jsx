import React, { useState } from 'react';
import { Search, ShieldCheck, CheckCircle2, FileText, Building2, PhoneCall, X, ExternalLink, Printer } from 'lucide-react';

/**
 * GovtDBTTrackerModal — Authentic Indian Government Direct Benefit Transfer (DBT)
 * Claim Tracking & Public Audit Portal (PMFBY / PM-KISAN / MST Blockchain L1 Standards).
 */
export default function GovtDBTTrackerModal({ isOpen, onClose }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  if (!isOpen) return null;

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setTimeout(() => {
      const q = searchQuery.toUpperCase();

      // Determine which farmer record to return based on ARN keywords
      let farmerData;

      if (q.includes('ASSAM') || q.includes('PATTA') || q.includes('992014')) {
        // Assam — Prasanta Kalita, Majuli
        farmerData = {
          applicationId: 'PMFBY-MST-2026-992014',
          farmerName: 'Prasanta Kalita',
          aadhaarMasked: 'XXXX-XXXX-4412',
          state: 'Assam',
          district: 'Majuli',
          block: 'Majuli Sadar',
          panchayat: 'Kamalabari Gram Panchayat',
          khasraNumber: 'Patta #104/B (1.8 Acres)',
          cropType: 'Sali Paddy (Rice)',
          insuredAmountINR: '₹35,000',
          payoutAmountINR: '₹17,500',
          dbtRrn: 'IPPB-RRN-9920140041',
          disasterType: 'Brahmaputra River Monsoon Flood (6 Days Submerged)',
        };
      } else if (q.includes('MAHA') || q.includes('381920')) {
        // Maharashtra — Eknath Patil, Nashik
        farmerData = {
          applicationId: 'PMFBY-MST-2026-381920',
          farmerName: 'Eknath Patil',
          aadhaarMasked: 'XXXX-XXXX-7734',
          state: 'Maharashtra',
          district: 'Nashik / Marathwada',
          block: 'Niphad',
          panchayat: 'Panchavati Gram Panchayat',
          khasraNumber: '7/12 Extract #88/2 (3.2 Acres)',
          cropType: 'Grapes / Onion',
          insuredAmountINR: '₹35,000',
          payoutAmountINR: '₹17,500',
          dbtRrn: 'IPPB-RRN-3819200088',
          disasterType: 'Marathwada Flash Drought (NDWI Soil Moisture Deficit -0.45)',
        };
      } else if (q.includes('PUNJAB') || q.includes('HEATWAVE') || q.includes('448120')) {
        // Punjab — Gurpreet Singh, Ludhiana
        farmerData = {
          applicationId: 'PMFBY-MST-2026-448120',
          farmerName: 'Gurpreet Singh',
          aadhaarMasked: 'XXXX-XXXX-5567',
          state: 'Punjab',
          district: 'Ludhiana',
          block: 'Samrala',
          panchayat: 'Khangarh Gram Panchayat',
          khasraNumber: 'Jamabandi #45/1 (4.0 Acres)',
          cropType: 'Wheat',
          insuredAmountINR: '₹28,000',
          payoutAmountINR: '₹14,000',
          dbtRrn: 'IPPB-RRN-4481200045',
          disasterType: 'Scorching Wheat Heatwave (44.2°C Thermal LST)',
        };
      } else {
        // Default / Bihar — Ram Singh, Darbhanga
        farmerData = {
          applicationId: q.includes('BHUMI') || q.includes('883921') ? searchQuery.toUpperCase() : 'PMFBY-MST-2026-883921',
          farmerName: 'Ram Singh',
          aadhaarMasked: 'XXXX-XXXX-8821',
          state: 'Bihar',
          district: 'Darbhanga',
          block: 'Darbhanga Sadar',
          panchayat: 'Kakarghatti Gram Panchayat',
          khasraNumber: 'Khatiyan Plot #214/A (2.5 Acres)',
          cropType: 'Paddy (Rice)',
          insuredAmountINR: '₹50,000',
          payoutAmountINR: '₹25,000',
          dbtRrn: 'IPPB-RRN-9920148839',
          disasterType: 'Kosi River Monsoon Flood (9 Days Submerged)',
        };
      }

      const mockResult = {
        ...farmerData,
        payoutStatus: 'DBT_CREDIT_DISBURSED',
        satelliteConsensus: '2-of-3 NEWRRO AI Oracle Consensus Verified',
        eip191Proof: '0xabc123def4567890abcdef1234567890abcdef1234567890abcdef1234567890',
        mstTxHash: '0x9f8e7d6c5b4a3928374650192837465019283746501928374650192837465019',
        verificationDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      };

      setSearchResult(mockResult);
      setIsSearching(false);
    }, 800);
  };

  const handleQuickFill = (sampleId) => {
    setSearchQuery(sampleId);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full mx-4 shadow-2xl overflow-hidden relative text-gray-900">

        {/* 🇮🇳 Tricolor Top Bar */}
        <div className="h-1.5 flex">
          <div className="flex-1 bg-orange-400" />
          <div className="flex-1 bg-white border-y border-gray-200" />
          <div className="flex-1 bg-green-600" />
        </div>

        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 to-teal-700 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2.5 rounded-xl">
                <ShieldCheck className="w-7 h-7 text-white" />
              </div>
              <div>
                <div className="bg-white/10 rounded-lg px-3 py-1 text-emerald-100 text-xs mb-2 inline-block">
                  🇮🇳 GOVT OF INDIA · MINISTRY OF AGRICULTURE &amp; FARMERS WELFARE
                </div>
                <h3 className="text-lg font-extrabold tracking-wide text-white">
                  Public DBT Claim Status &amp; Governance Portal
                </h3>
                <p className="text-xs text-emerald-100/80 mt-0.5">
                  Direct Benefit Transfer Audit Trail · MST Blockchain EIP-191 Verified
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Search Box */}
          <form onSubmit={handleSearch} className="space-y-3">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
              Search by Application Reference No. (ARN) / Aadhaar No. / Khasra No.
            </label>
            <div className="flex gap-2 bg-gray-50 border-2 border-gray-200 rounded-2xl p-1.5 focus-within:border-emerald-400 focus-within:bg-white transition-all">
              <div className="relative flex-1">
                <Search className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter ARN e.g. BIHAR-BHUMI-2026-883921 or Aadhaar 12-digit"
                  className="w-full pl-10 pr-4 py-2 bg-transparent text-sm font-semibold focus:outline-none text-gray-800"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all shadow-sm flex items-center space-x-1.5 disabled:opacity-60"
              >
                <span>{isSearching ? 'Searching...' : 'Check Status'}</span>
              </button>
            </div>

            {/* Quick Fill Samples */}
            <div className="flex items-center space-x-2 flex-wrap gap-2">
              <span className="text-xs font-semibold text-gray-500">Sample ARNs:</span>
              <button
                type="button"
                onClick={() => handleQuickFill('BIHAR-BHUMI-2026-883921')}
                className="bg-gray-100 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-200 text-gray-500 hover:text-emerald-700 text-xs rounded-full px-3 py-1 cursor-pointer transition-all font-mono"
              >
                BIHAR-BHUMI-2026-883921
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('ASSAM-PATTA-2026-992014')}
                className="bg-gray-100 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-200 text-gray-500 hover:text-emerald-700 text-xs rounded-full px-3 py-1 cursor-pointer transition-all font-mono"
              >
                ASSAM-PATTA-2026-992014
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('MAHA-712-2026-381920')}
                className="bg-gray-100 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-200 text-gray-500 hover:text-emerald-700 text-xs rounded-full px-3 py-1 cursor-pointer transition-all font-mono"
              >
                MAHA-712-2026-381920
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('PUNJAB-HEATWAVE-2026-448120')}
                className="bg-gray-100 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-200 text-gray-500 hover:text-emerald-700 text-xs rounded-full px-3 py-1 cursor-pointer transition-all font-mono"
              >
                PUNJAB-HEATWAVE-2026-448120
              </button>
            </div>
          </form>

          {/* Search Result Display */}
          {searchResult && (
            <div className="border border-emerald-200 bg-emerald-50/40 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-200 pb-3">
                <div className="flex items-center space-x-2 text-emerald-800 font-bold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>DBT Application Record Verified</span>
                </div>
                <span className="px-3 py-1 bg-emerald-600 text-white font-mono font-bold text-xs rounded-lg shadow-sm">
                  {searchResult.applicationId}
                </span>
              </div>

              {/* Farmer & Location Details Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-gray-500 block">Farmer Name:</span>
                  <strong className="text-gray-900 text-sm">{searchResult.farmerName}</strong>
                </div>
                <div>
                  <span className="text-gray-500 block">Aadhaar ID:</span>
                  <strong className="font-mono text-gray-900">{searchResult.aadhaarMasked}</strong>
                </div>
                <div>
                  <span className="text-gray-500 block">State / District:</span>
                  <strong className="text-gray-900">{searchResult.state}, {searchResult.district}</strong>
                </div>
                <div>
                  <span className="text-gray-500 block">Block / Panchayat:</span>
                  <strong className="text-gray-900">{searchResult.block}</strong>
                </div>
                <div>
                  <span className="text-gray-500 block">Khasra / Land Parcel:</span>
                  <strong className="text-gray-900">{searchResult.khasraNumber}</strong>
                </div>
                <div>
                  <span className="text-gray-500 block">Crop Type:</span>
                  <strong className="text-gray-900">{searchResult.cropType}</strong>
                </div>
              </div>

              {/* Official DBT Verification Stepper */}
              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-3">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Official 4-Step Direct Benefit Transfer (DBT) Audit Steps
                </h4>
                <div className="space-y-2.5 text-xs">
                  {[
                    '1. Bhu-Naksha GIS Land Record Verified (State Revenue Dept)',
                    '2. NEWRRO AI Satellite Sentinel Consensus Approved (2-of-3)',
                    `3. MST Blockchain Escrow Settlement Released (${searchResult.payoutAmountINR})`,
                    '4. India Post Gramin Dak Sevak Micro-ATM Aadhaar AePS Disbursed',
                  ].map((step, i) => (
                    <div key={i} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex-shrink-0 w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center font-bold text-xs shadow-md shadow-emerald-200">
                          {i + 1}
                        </span>
                        <span className="text-gray-700 font-medium">{step.slice(3)}</span>
                      </div>
                      <span className="flex-shrink-0 text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-bold">
                        {i === 3 ? 'CREDITED' : 'PASSED'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cryptographic Hashes — intentional terminal look */}
              <div className="bg-gray-900 text-white p-3 rounded-xl space-y-1.5 font-mono text-[10px]">
                <div className="flex justify-between">
                  <span className="text-gray-400">DBT RRN Ref:</span>
                  <span className="text-emerald-400 font-bold">{searchResult.dbtRrn}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">EIP-191 Proof Hash:</span>
                  <span className="text-cyan-300 truncate max-w-[300px]">{searchResult.eip191Proof}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">MST Blockchain TX:</span>
                  <span className="text-amber-300 truncate max-w-[300px]">{searchResult.mstTxHash}</span>
                </div>
              </div>

              {/* Print Receipt Action */}
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Official DBT Receipt</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Official Toll-Free Helpline Footer */}
        <div className="bg-gray-50 p-4 border-t border-gray-200 flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center space-x-2">
            <PhoneCall className="w-4 h-4 text-emerald-700" />
            <span>PMFBY Kisan Call Centre Toll-Free: <strong>14447</strong></span>
          </div>
          <span className="text-gray-400">Powered by MST Blockchain Layer 1</span>
        </div>
      </div>
    </div>
  );
}
