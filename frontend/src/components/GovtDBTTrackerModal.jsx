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
      const mockResult = {
        applicationId: searchQuery.toUpperCase().includes('BHUMI') ? searchQuery : 'PMFBY-MST-2026-883921',
        farmerName: 'Ram Singh',
        aadhaarMasked: 'XXXX-XXXX-8821',
        state: 'Bihar',
        district: 'Darbhanga',
        block: 'Darbhanga Sadar',
        panchayat: 'Kakarghatti Gram Panchayat',
        khasraNumber: 'Plot #214/A (2.5 Acres)',
        cropType: 'Paddy (Rice)',
        insuredAmountINR: '₹50,000',
        payoutAmountINR: '₹25,000',
        payoutStatus: 'DBT_CREDIT_DISBURSED',
        dbtRrn: 'IPPB-RRN-9920148839',
        disasterType: 'Kosi River Monsoon Flood (6 Days Submerged)',
        satelliteConsensus: '2-of-3 NEWRRO AI Oracle Consensus Verified',
        eip191Proof: '0xabc123def4567890abcdef1234567890abcdef1234567890abcdef1234567890',
        mstTxHash: '0x9f8e7d6c5b4a3928374650192837465019283746501928374650192837465019',
        verificationDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      };
      setSearchResult(mockResult);
      setIsSearching(false);
    }, 800);
  };

  const handleQuickFill = (sampleId) => {
    setSearchQuery(sampleId);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-gray-300 shadow-2xl overflow-hidden relative text-gray-900">
        {/* Official Government Top Header */}
        <div className="bg-gradient-to-r from-orange-600 via-white to-green-700 p-1 flex justify-between items-center text-[10px] font-bold text-gray-800 px-4">
          <span>🇮🇳 GOVERNMENT OF INDIA | MINISTRY OF AGRICULTURE & FARMERS WELFARE</span>
          <span>PMFBY - MST BLOCKCHAIN L1 DBT PORTAL</span>
        </div>

        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold tracking-wide text-white">
                Public DBT Claim Status & Governance Portal
              </h3>
              <p className="text-xs text-slate-400">
                Direct Benefit Transfer Audit Trail • MST Blockchain EIP-191 Verified
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Search Box */}
          <form onSubmit={handleSearch} className="space-y-2">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
              Search by Application Reference No. (ARN) / Aadhaar No. / Khasra No.
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter ARN e.g. BIHAR-BHUMI-2026-883921 or Aadhaar 12-digit"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center space-x-1.5"
              >
                <span>{isSearching ? 'Searching...' : 'Check Status'}</span>
              </button>
            </div>

            {/* Quick Fill Samples */}
            <div className="flex items-center space-x-2 text-xs text-gray-500 pt-1">
              <span className="font-semibold">Sample ARNs:</span>
              <button
                type="button"
                onClick={() => handleQuickFill('BIHAR-BHUMI-2026-883921')}
                className="text-emerald-700 underline hover:text-emerald-900 font-mono"
              >
                BIHAR-BHUMI-2026-883921
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => handleQuickFill('ASSAM-PATTA-2026-992014')}
                className="text-emerald-700 underline hover:text-emerald-900 font-mono"
              >
                ASSAM-PATTA-2026-992014
              </button>
            </div>
          </form>

          {/* Search Result Display */}
          {searchResult && (
            <div className="border border-emerald-500/40 bg-emerald-50/50 rounded-2xl p-5 space-y-4 shadow-inner">
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
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-green-700 font-semibold">
                    <span>1. Bhu-Naksha GIS Land Record Verified (State Revenue Dept)</span>
                    <span className="text-[10px] bg-green-100 px-2 py-0.5 rounded font-bold">PASSED</span>
                  </div>
                  <div className="flex items-center justify-between text-green-700 font-semibold">
                    <span>2. NEWRRO AI Satellite Sentinel Consensus Approved (2-of-3)</span>
                    <span className="text-[10px] bg-green-100 px-2 py-0.5 rounded font-bold">PASSED</span>
                  </div>
                  <div className="flex items-center justify-between text-green-700 font-semibold">
                    <span>3. MST Blockchain Escrow Settlement Released ({searchResult.payoutAmountINR})</span>
                    <span className="text-[10px] bg-green-100 px-2 py-0.5 rounded font-bold">PASSED</span>
                  </div>
                  <div className="flex items-center justify-between text-green-700 font-semibold">
                    <span>4. India Post Gramin Dak Sevak Micro-ATM Aadhaar AePS Disbursed</span>
                    <span className="text-[10px] bg-green-100 px-2 py-0.5 rounded font-bold">CREDITED</span>
                  </div>
                </div>
              </div>

              {/* Cryptographic Hashes */}
              <div className="bg-slate-900 text-white p-3 rounded-xl space-y-1.5 font-mono text-[10px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">DBT RRN Ref:</span>
                  <span className="text-emerald-400 font-bold">{searchResult.dbtRrn}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">EIP-191 Proof Hash:</span>
                  <span className="text-cyan-300 truncate max-w-[300px]">{searchResult.eip191Proof}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">MST Blockchain TX:</span>
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
        <div className="bg-gray-100 p-4 border-t border-gray-200 flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center space-x-2">
            <PhoneCall className="w-4 h-4 text-emerald-700" />
            <span>PMFBY Kisan Call Centre Toll-Free: <strong>14447</strong></span>
          </div>
          <span>Powered by MST Blockchain Layer 1</span>
        </div>
      </div>
    </div>
  );
}
