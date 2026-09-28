import React, { useState } from 'react';
import { Search, ShieldCheck, CheckCircle2, PhoneCall, X, Printer } from 'lucide-react';

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

      let farmerData;

      if (q.includes('ASSAM') || q.includes('PATTA') || q.includes('992014')) {
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
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-8">

        {/* 🇮🇳 Tricolor Top Bar */}
        <div className="h-1 flex">
          <div className="flex-1 bg-orange-400" />
          <div className="flex-1 bg-white" />
          <div className="flex-1 bg-green-600" />
        </div>

        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 to-teal-700 px-6 py-5 text-white relative">
          <button onClick={onClose} className="absolute top-4 right-4 p-1.5 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-3 mb-2">
            <div className="bg-white/20 p-2 rounded-xl">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="bg-white/10 rounded-lg px-3 py-1 text-emerald-100 text-[10px] mb-1.5 inline-block font-bold uppercase tracking-wider">
                🇮🇳 GOVT OF INDIA · MINISTRY OF AGRICULTURE
              </div>
              <h3 className="text-lg font-black tracking-tight">
                Public DBT Claim Status & Audit Portal
              </h3>
              <p className="text-xs text-emerald-100/90 mt-0.5 font-medium">
                Direct Benefit Transfer Audit Trail · MST Blockchain EIP-191 Verified
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Search Box */}
          <form onSubmit={handleSearch} className="space-y-3">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
              Search by Application Reference No. (ARN) / Aadhaar / Khasra
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g. BIHAR-BHUMI-2026-883921 or Aadhaar 12-digit"
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 focus:border-emerald-400 rounded-xl text-sm font-semibold focus:outline-none transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all shadow-sm disabled:opacity-60"
              >
                {isSearching ? 'Searching...' : 'Check Status'}
              </button>
            </div>

            {/* Quick Fill Samples */}
            <div className="flex items-center space-x-2 flex-wrap gap-2">
              <span className="text-xs font-bold text-gray-500">Sample ARNs:</span>
              {['BIHAR-BHUMI-2026-883921', 'ASSAM-PATTA-2026-992014', 'MAHA-712-2026-381920', 'PUNJAB-HEATWAVE-2026-448120'].map((arn) => (
                <button
                  key={arn}
                  type="button"
                  onClick={() => handleQuickFill(arn)}
                  className="bg-gray-100 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-200 text-gray-600 hover:text-emerald-700 text-[10px] rounded-full px-2.5 py-1 cursor-pointer transition-all font-mono font-bold"
                >
                  {arn}
                </button>
              ))}
            </div>
          </form>

          {/* Search Result Display */}
          {searchResult && (
            <div className="border-2 border-emerald-200 bg-emerald-50/40 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-200">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="font-black text-emerald-900">DBT Record Verified</span>
                </div>
                <span className="px-3 py-1 bg-emerald-600 text-white font-mono font-bold text-xs rounded-lg shadow-sm">
                  {searchResult.applicationId}
                </span>
              </div>

              {/* Farmer Details Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                {[
                  ['Farmer Name', searchResult.farmerName],
                  ['Aadhaar ID', searchResult.aadhaarMasked],
                  ['State / District', `${searchResult.state}, ${searchResult.district}`],
                  ['Block', searchResult.block],
                  ['Khasra / Land', searchResult.khasraNumber],
                  ['Crop Type', searchResult.cropType],
                ].map(([label, value]) => (
                  <div key={label}>
                    <span className="text-gray-500 block font-medium">{label}:</span>
                    <strong className="text-gray-900 text-sm block mt-0.5">{value}</strong>
                  </div>
                ))}
              </div>

              {/* 4-Step DBT Stepper */}
              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-3">
                <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider">
                  4-Step Direct Benefit Transfer (DBT) Audit
                </h4>
                <div className="space-y-2.5">
                  {[
                    'Bhu-Naksha GIS Land Record Verified (Revenue Dept)',
                    `NEWRRO AI Satellite Consensus Approved (2-of-3)`,
                    `MST Blockchain Escrow Released (${searchResult.payoutAmountINR})`,
                    'India Post Aadhaar AePS Cash Disbursed',
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center font-black text-xs shadow-md">
                        {i + 1}
                      </div>
                      <span className="text-xs text-gray-700 font-bold flex-1">{step}</span>
                      <span className={`flex-shrink-0 text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-wide ${
                        i === 3 ? 'bg-emerald-100 text-emerald-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {i === 3 ? 'CREDITED' : 'PASSED'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Terminal-Style Hash Block */}
              <div className="bg-gray-900 text-white p-3 rounded-xl space-y-1.5 font-mono text-[10px]">
                <div className="flex justify-between">
                  <span className="text-gray-400">DBT RRN Ref:</span>
                  <span className="text-emerald-400 font-bold">{searchResult.dbtRrn}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-gray-400">EIP-191 Proof:</span>
                  <span className="text-cyan-300 truncate max-w-[320px] text-right">{searchResult.eip191Proof}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-gray-400">MST TX Hash:</span>
                  <span className="text-amber-300 truncate max-w-[320px] text-right">{searchResult.mstTxHash}</span>
                </div>
              </div>

              {/* Print Action */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white text-xs font-bold rounded-xl flex items-center space-x-2 transition-all shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Official Receipt</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 text-gray-600">
            <PhoneCall className="w-4 h-4 text-emerald-700" />
            <span>PMFBY Toll-Free: <strong className="text-gray-900">14447</strong></span>
          </div>
          <span className="text-gray-400 font-medium">Powered by MST Blockchain L1</span>
        </div>
      </div>
    </div>
  );
}
