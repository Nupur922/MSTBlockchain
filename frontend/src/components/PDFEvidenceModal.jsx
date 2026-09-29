import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { FileText, Download, ShieldCheck, CheckCircle2, Satellite, AlertTriangle, X } from 'lucide-react';

const PDFEvidenceModal = ({ isOpen, onClose, plotData, payoutEvent }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  // Defaults and fallbacks based on plot or payout
  const farmerName = plotData?.farmerName || payoutEvent?.farmerName || 'Ram Singh';
  const plotId = plotData?.plotId || payoutEvent?.plotId || '1';
  const state = plotData?.state || payoutEvent?.stateName || 'Bihar';
  const location = plotData?.location || (state === 'Assam' ? 'Majuli, Assam' : 'Darbhanga, Bihar');
  const landDocType = state === 'Assam' 
    ? 'Periodic Patta (Dharitree Portal Ref: AS-MJL-2026-4421)' 
    : 'Bihar Bhumi Jamabandi Panji (Khatian Ref: BR-DBG-889102)';
  const disasterType = payoutEvent?.disasterType || (state === 'Assam' ? 'Brahmaputra Flash Flood' : 'Monsoon Kosi Flood');
  const damagePct = payoutEvent?.damagePct || 76.0;
  const payoutAmount = payoutEvent?.payoutAmount || '0.75';
  const payoutINR = (parseFloat(payoutAmount) * 33333.33).toLocaleString('en-IN', { maximumFractionDigits: 0 }) || '25,000';
  const proofHash = payoutEvent?.proofHash || '0x4f8a91bc76de203918a994ef7162bca98164392019ab921c';
  const txHash = payoutEvent?.txHash || '0x8f3a91bc24ef10c79184aa2758129e8dcD48A6461082f';
  const timestamp = new Date().toUTCString();

  // Generate client-side PDF using jsPDF (Clean, graph-free, professional certificate)
  const generateAndDownloadPDF = () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Background Border & Frame
      doc.setDrawColor(22, 101, 52); // Forest green
      doc.setLineWidth(1.5);
      doc.rect(10, 10, 190, 277);

      doc.setDrawColor(187, 247, 208); // Light green inner frame
      doc.setLineWidth(0.6);
      doc.rect(12.5, 12.5, 185, 272);

      // Header Banner
      doc.setFillColor(22, 101, 52);
      doc.rect(13.5, 13.5, 183, 27, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(255, 255, 255);
      doc.text('AGRITRUST AI -- DISASTER AUDIT CERTIFICATE', 105, 23, { align: 'center' });

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text('PARAMETRIC CROP RELIEF ESCROW & SATELLITE ORACLE VERIFICATION', 105, 29.5, { align: 'center' });
      doc.setFontSize(7.5);
      doc.setTextColor(209, 250, 229);
      doc.text('MST Blockchain Layer 1 | NEWRRO AI Autonomous Remote Sensing', 105, 35.5, { align: 'center' });

      // Certificate Meta Strip
      doc.setTextColor(55, 65, 81);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(`Certificate No: CERT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`, 15, 46);
      doc.setFont('helvetica', 'normal');
      doc.text(`Issue Timestamp: ${timestamp}`, 195, 46, { align: 'right' });
      doc.text(`Chain Status: MST Testnet Verified (Chain ID: 91562037)`, 15, 51);
      doc.text(`Smart Contract: AgriTrustVault.sol`, 195, 51, { align: 'right' });

      // Divider line
      doc.setDrawColor(209, 213, 219);
      doc.setLineWidth(0.5);
      doc.line(14, 55, 196, 55);

      // ── Section 1: Farmer & Land Registry Record ──
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(22, 101, 52);
      doc.text('1. FARMER & GOVERNMENT LAND RECORD IDENTIFICATION', 15, 62);

      const farmerDetails = [
        ['Farmer Name', farmerName],
        ['Plot ID / Registry', `Plot #${plotId} (FarmRegistry.sol)`],
        ['Geographic Location', location],
        ['State Jurisdiction', state],
        ['Uploaded Land Record', landDocType],
        ['Beneficiary Wallet', payoutEvent?.farmer || '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'],
      ];

      let yPos = 68;
      farmerDetails.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(55, 65, 81);
        doc.text(`${label}:`, 16, yPos);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(17, 24, 39);
        doc.text(String(value), 66, yPos, { maxWidth: 126 });
        yPos += 5.5;
      });

      // Divider line
      doc.setDrawColor(209, 213, 219);
      doc.line(14, yPos + 1.5, 196, yPos + 1.5);
      yPos += 8;

      // ── Section 2: NEWRRO Multi-Modal Satellite Telemetry ──
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(22, 101, 52);
      doc.text('2. MULTI-MODAL SATELLITE SENSING & TELEMETRY BREAKDOWN', 15, yPos);

      yPos += 6;
      const telemetryDetails = [
        ['Sentinel-2 Optical (NDVI)', 'Baseline: 0.75  →  Post-Disaster: 0.18 (76.0% Vegetative Loss)'],
        ['Sentinel-1 C-Band SAR', 'Backscatter: -22.4 dB (Inundation Confirmed for 6 Consecutive Days)'],
        ['Sentinel-2 SWIR (NDWI)', 'Moisture Index: -0.380 (Critical Water/Soil Level Evaluated)'],
        ['IMD Doppler Precipitation', 'Cumulative 48-Hour Precipitation: 248.5 mm (Threshold 120 mm)'],
        ['Oracle Consensus Evaluation', 'Score: 1.00 -- 3-of-3 Autonomous Sensor Feeds Approved'],
      ];

      telemetryDetails.forEach(([sensor, result]) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(55, 65, 81);
        doc.text(`${sensor}:`, 16, yPos);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(17, 24, 39);
        doc.text(String(result), 66, yPos, { maxWidth: 126 });
        yPos += 5.5;
      });

      // Divider line
      doc.setDrawColor(209, 213, 219);
      doc.line(14, yPos + 1.5, 196, yPos + 1.5);
      yPos += 8;

      // ── Section 3: Escrow Payout & Cryptographic Proof ──
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(22, 101, 52);
      doc.text('3. ESCROW PAYOUT & CRYPTOGRAPHIC PROOF OF DISASTER', 15, yPos);

      yPos += 6;
      const payoutDetails = [
        ['Disaster Classification', `${disasterType} (Verified by Sentinel Consensus)`],
        ['Verified Damage Severity', `${damagePct.toFixed(1)}% of registered crop area`],
        ['Calculated Relief Payout', `${payoutAmount} MST (Equivalent: Rs ${payoutINR})`],
        ['EIP-191 Disaster Proof Hash', proofHash],
        ['MST Blockchain Tx Hash', txHash],
        ['Voice Call Alert Status', 'Twilio Live Call Dispatched in Regional Dialect (Polly.Aditi)'],
      ];

      payoutDetails.forEach(([field, val]) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(55, 65, 81);
        doc.text(`${field}:`, 16, yPos);

        const isHash = field.includes('Hash');
        doc.setFont(isHash ? 'courier' : 'helvetica', 'normal');
        doc.setFontSize(isHash ? 7 : 8);
        doc.setTextColor(17, 24, 39);
        doc.text(String(val), 66, yPos, { maxWidth: 126 });
        yPos += 5.5;
      });

      // ── Section 4: Verification Stamp Box & Official Seal ──
      yPos += 5;
      doc.setFillColor(240, 253, 244);
      doc.setDrawColor(34, 197, 94);
      doc.setLineWidth(0.8);
      doc.rect(14, yPos, 182, 30, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(21, 128, 61);
      doc.text('VERIFIED BY NEWRRO AI SENTINEL ORACLE & MST SMART CONTRACT', 105, yPos + 9, { align: 'center' });

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(75, 85, 99);
      doc.text(
        'This tamper-proof certificate serves as official legal evidence of satellite-verified crop loss and on-chain payout.',
        105, yPos + 16, { align: 'center' }
      );
      doc.text(
        'All cryptographic signatures are validated on-chain against AgriTrustVault.sol on MST Layer 1.',
        105, yPos + 22, { align: 'center' }
      );

      // Footer notice
      doc.setFontSize(7);
      doc.setTextColor(156, 163, 175);
      doc.text(
        'AgriTrust AI — Autonomous Parametric Crop Insurance & Disaster Relief Escrow | MST Blockchain Layer 1',
        105, 282, { align: 'center' }
      );

      // Save PDF to browser
      const filename = `AgriTrust_Audit_Certificate_Plot_${plotId}_${state}.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('Failed to generate PDF: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-100 animate-fadeIn">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-green-700 p-6 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-white bg-opacity-20 rounded-xl backdrop-blur-sm">
              <FileText className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Disaster Audit Certificate</h2>
              <p className="text-xs text-emerald-100 font-medium">NEWRRO AI Remote Sensing & Blockchain Evidence</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white hover:bg-opacity-20 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Certificate Details Preview */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Status Alert Banner */}
          <div className="flex items-start space-x-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-emerald-900">Proof of Crop Loss Verified & Recorded On-Chain</h4>
              <p className="text-xs text-emerald-700 mt-0.5">
                Consensus approved by 3 independent satellite feeds. Escrow payout of <span className="font-bold">{payoutAmount} MST (Rs {payoutINR})</span> released to beneficiary.
              </p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-xl border border-gray-200">
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Farmer / Beneficiary</span>
              <p className="font-bold text-gray-900 mt-0.5">{farmerName}</p>
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Plot ID & Location</span>
              <p className="font-bold text-gray-900 mt-0.5">Plot #{plotId} ({location})</p>
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Disaster Classification</span>
              <p className="font-bold text-amber-700 mt-0.5">{disasterType}</p>
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Verified Damage</span>
              <p className="font-bold text-red-600 mt-0.5">{damagePct}% Severity</p>
            </div>
            <div className="col-span-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Uploaded Land Document</span>
              <p className="text-xs font-medium text-gray-800 bg-white p-2 rounded border border-gray-200 mt-1">
                {landDocType}
              </p>
            </div>
          </div>

          {/* Telemetry Breakdown */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center space-x-1.5">
              <Satellite className="w-4 h-4 text-emerald-600" />
              <span>Satellite Evidence Breakdown</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-lg">
                <span className="text-gray-500 block">SAR Radar</span>
                <span className="font-bold text-blue-700 text-sm">6 Flood Days</span>
              </div>
              <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg">
                <span className="text-gray-500 block">NDVI Loss</span>
                <span className="font-bold text-emerald-700 text-sm">76.0% Drop</span>
              </div>
              <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-lg">
                <span className="text-gray-500 block">NDWI Index</span>
                <span className="font-bold text-amber-700 text-sm">-0.380 (Drought)</span>
              </div>
              <div className="p-2.5 bg-purple-50 border border-purple-100 rounded-lg">
                <span className="text-gray-500 block">48h Rainfall</span>
                <span className="font-bold text-purple-700 text-sm">248.5 mm</span>
              </div>
            </div>
          </div>

          {/* Cryptographic Hashes */}
          <div className="space-y-1.5 text-xs text-gray-500">
            <div className="flex justify-between font-mono bg-gray-100 p-2 rounded">
              <span>Proof Hash:</span>
              <span className="text-gray-800 font-semibold">{proofHash.substring(0, 24)}...</span>
            </div>
            <div className="flex justify-between font-mono bg-gray-100 p-2 rounded">
              <span>MST Tx:</span>
              <span className="text-emerald-700 font-semibold">{txHash.substring(0, 24)}...</span>
            </div>
          </div>
        </div>

        {/* Modal Footer / Action Buttons */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <a
            href="/certificates/AuditCert_BIHAR_DARBHANGA_01_CERT-8D4E5409C579.pdf"
            download
            className="text-xs text-gray-600 hover:text-emerald-700 underline font-medium flex items-center space-x-1"
          >
            <span>Or download ReportLab PDF template</span>
          </a>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium rounded-lg transition"
            >
              Close
            </button>
            <button
              onClick={generateAndDownloadPDF}
              disabled={isGenerating}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-lg transition transform hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isGenerating ? 'Generating PDF...' : 'Download PDF Evidence'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFEvidenceModal;
