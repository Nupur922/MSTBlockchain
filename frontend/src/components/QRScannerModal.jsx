import React, { useState } from 'react';
import { QrCode, CheckCircle, MapPin, X } from 'lucide-react';

export default function QRScannerModal({ isOpen, onClose, onPlotRegistered }) {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedPlot, setScannedPlot] = useState(null);

  if (!isOpen) return null;

  const handleSimulateScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      const mockPlot = {
        owner: "Ram Singh (Darbhanga, Bihar)",
        documentId: "BIHAR-BHUMI-2026-883921",
        acreage: "2.5 Acres",
        cropType: "Paddy (Rice)",
        geoJson: "[[85.8971, 26.1522], [85.8985, 26.1525], [85.8982, 26.1510], [85.8968, 26.1508]]"
      };
      setScannedPlot(mockPlot);
      setIsScanning(false);
    }, 1200);
  };

  const handleConfirmRegistration = () => {
    if (scannedPlot && onPlotRegistered) {
      onPlotRegistered(scannedPlot);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Village Krishi Mitra QR Scanner</h3>
            <p className="text-xs text-slate-400">Scan Bhu-Naksha Land Record QR Code (0 Typing)</p>
          </div>
        </div>

        {!scannedPlot ? (
          <div className="text-center py-8 border-2 border-dashed border-slate-700 rounded-xl bg-slate-800/40">
            <div className="w-24 h-24 mx-auto mb-4 border-2 border-emerald-400 rounded-xl relative flex items-center justify-center bg-emerald-500/5">
              <QrCode className="w-12 h-12 text-emerald-400 animate-pulse" />
              {isScanning && <div className="absolute inset-x-0 h-0.5 bg-emerald-400 animate-bounce" />}
            </div>
            <p className="text-sm text-slate-300 mb-4">Scan Farmer's Land Document QR Code</p>
            <button
              onClick={handleSimulateScan}
              disabled={isScanning}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 font-semibold rounded-xl text-slate-950 transition-all shadow-lg shadow-emerald-500/20"
            >
              {isScanning ? "Extracting Polygon Coordinates..." : "📷 Scan Bhu-Naksha Document QR"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-emerald-400 font-semibold text-sm">
                <span className="flex items-center"><CheckCircle className="w-4 h-4 mr-1.5" /> Land QR Extracted</span>
                <span className="text-xs bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-300">{scannedPlot.documentId}</span>
              </div>
              <div className="text-xs text-slate-300 space-y-1 pt-1">
                <p><strong>Farmer:</strong> {scannedPlot.owner}</p>
                <p><strong>Acreage:</strong> {scannedPlot.acreage}</p>
                <p><strong>Crop Type:</strong> {scannedPlot.cropType}</p>
                <p className="font-mono text-[10px] text-slate-400 truncate"><strong>GIS Polygon:</strong> {scannedPlot.geoJson}</p>
              </div>
            </div>

            <button
              onClick={handleConfirmRegistration}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 font-bold rounded-xl text-slate-950 transition-all"
            >
              ✅ Enroll Land Plot on MST Blockchain
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
