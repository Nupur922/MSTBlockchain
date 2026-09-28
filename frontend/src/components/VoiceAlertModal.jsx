import React, { useState, useEffect, useRef } from 'react';
import { Phone, Volume2, VolumeX, X, FileText } from 'lucide-react';
import { detectStateFromCoords, getPhoneticMessage, getNativeTranscript } from '../utils/stateLanguageMap';

const buildMessages = (payoutAmount, plotId, stateName, coordinates) => {
  let detectedState = stateName;
  if (!detectedState && coordinates && coordinates.length > 0) {
    const lat = coordinates[0][0] || coordinates[0].lat;
    const lng = coordinates[0][1] || coordinates[0].lng;
    detectedState = detectStateFromCoords(lat, lng)?.name;
  }
  if (!detectedState) {
    detectedState = plotId === '1' ? 'Assam' : 'Bihar';
  }

  const regionalVoice = getPhoneticMessage(detectedState, payoutAmount, plotId);

  return [
    regionalVoice,
    {
      lang: 'hi-IN',
      text: `AgriTrust AI aapatkalin suchna. Aapke khet mein baadh ki pushti hui hai. Aapka bima bhugtan turant bhej diya gaya hai. Kripya apne nazdiki post office mein Aadhaar card lekar jayein.`,
    },
    {
      lang: 'en-IN',
      text: `AgriTrust AI Emergency Alert. Your farm plot number ${plotId} has been affected by a verified satellite disaster event. Emergency insurance payout of ${payoutAmount} MST Tokens has been triggered automatically. Please visit your nearest AePS centre.`,
    }
  ];
};

const VoiceAlertModal = ({ isOpen, onClose, onOpenPDF, payoutAmount, plotId, stateName, coordinates }) => {
  const [callDuration, setCallDuration]   = useState(0);
  const [isMuted, setIsMuted]             = useState(false);
  const [speechStatus, setSpeechStatus]   = useState('idle');

  const utterancesRef  = useRef([]);
  const isMutedRef     = useRef(false);

  const speakMessages = (amount, id, state, coords) => {
    if (!window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    utterancesRef.current = [];

    const messages = buildMessages(amount ?? '0.5', id ?? '1', state, coords);

    messages.forEach((msg, idx) => {
      const utterance = new SpeechSynthesisUtterance(msg.text);
      utterance.lang  = msg.lang;
      utterance.rate  = 0.92;
      utterance.pitch = 1.0;
      utterance.volume = isMutedRef.current ? 0 : 1;

      if (idx === 0) {
        utterance.onstart = () => setSpeechStatus('speaking');
      }
      if (idx === messages.length - 1) {
        utterance.onend = () => setSpeechStatus('done');
      }

      utterancesRef.current.push(utterance);
      window.speechSynthesis.speak(utterance);
    });
  };

  useEffect(() => {
    if (!isOpen) return;

    setCallDuration(0);
    setSpeechStatus('idle');
    isMutedRef.current = false;
    setIsMuted(false);

    let detectedState = stateName;
    if (!detectedState && coordinates && coordinates.length > 0) {
      const lat = coordinates[0][0] || coordinates[0].lat;
      const lng = coordinates[0][1] || coordinates[0].lng;
      detectedState = detectStateFromCoords(lat, lng)?.name;
    }
    if (!detectedState) {
      detectedState = plotId === '1' ? 'Assam' : 'Bihar';
    }

    const speechTimer = setTimeout(() => speakMessages(payoutAmount, plotId, detectedState, coordinates), 600);

    const durationInterval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => {
      clearTimeout(speechTimer);
      clearInterval(durationInterval);
      window.speechSynthesis?.cancel();
    };
  }, [isOpen, payoutAmount, plotId, stateName, coordinates]);

  useEffect(() => {
    isMutedRef.current = isMuted;
    if (isMuted) {
      window.speechSynthesis?.pause();
    } else {
      window.speechSynthesis?.resume();
    }
  }, [isMuted]);

  const handleEndCall = () => {
    window.speechSynthesis?.cancel();
    setSpeechStatus('idle');
    onClose();
  };

  const formatDuration = (s) => {
    const m = Math.floor(s / 60);
    return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  let detectedState = stateName;
  if (!detectedState && coordinates && coordinates.length > 0) {
    const lat = coordinates[0][0] || coordinates[0].lat;
    const lng = coordinates[0][1] || coordinates[0].lng;
    detectedState = detectStateFromCoords(lat, lng)?.name;
  }
  if (!detectedState) {
    detectedState = plotId === '1' ? 'Assam' : 'Bihar';
  }
  const native = getNativeTranscript(detectedState, payoutAmount, plotId);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        
        {/* 🇮🇳 Tricolor Header Bar */}
        <div className="h-1 flex">
          <div className="flex-1 bg-orange-400" />
          <div className="flex-1 bg-white" />
          <div className="flex-1 bg-green-600" />
        </div>

        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-4 text-white relative">
          <button 
            onClick={handleEndCall} 
            className="absolute top-3 right-3 p-1.5 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-3 mb-2">
            <div className="bg-white/20 p-2 rounded-xl animate-pulse">
              <Phone className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider opacity-90">Incoming Call</p>
              <p className="text-lg font-black">AgriTrust AI Emergency</p>
            </div>
          </div>
          
          {/* Call Duration */}
          <div className="flex items-center justify-between mt-3">
            <p className="text-2xl font-mono font-black tracking-wider">
              {formatDuration(callDuration)}
            </p>
            <div className="flex items-center space-x-2">
              {speechStatus === 'speaking' && (
                <div className="flex items-center space-x-1 bg-white/20 rounded-full px-2 py-1">
                  <Volume2 className="w-3 h-3 animate-pulse" />
                  <span className="text-[10px] font-bold">Speaking...</span>
                </div>
              )}
              {speechStatus === 'done' && (
                <div className="flex items-center space-x-1 bg-white/20 rounded-full px-2 py-1">
                  <span className="text-[10px] font-bold">✓ Delivered</span>
                </div>
              )}
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`p-1.5 rounded-lg transition-colors ${isMuted ? 'bg-red-500' : 'bg-white/20 hover:bg-white/30'}`}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Call Details */}
        <div className="p-5 space-y-4">
          <div className="flex items-center space-x-2 text-xs">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="font-bold text-gray-900 uppercase tracking-wider">Voice Alert Transcript</span>
          </div>

          {/* Transcript Messages - Terminal Style */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {/* PRIMARY: Regional Language */}
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-green-400 uppercase tracking-wider">
                  {native.name} · Primary
                </span>
                <span className="text-[9px] text-gray-500 font-mono">AUDIO TRACK 1</span>
              </div>
              <p className="text-sm text-green-400 font-mono leading-relaxed">
                "{native.text}"
              </p>
            </div>

            {/* SECONDARY: Hindi */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                  🟡 हिंदी (Hindi) · Secondary
                </span>
                <span className="text-[9px] text-amber-600 font-mono">TRACK 2</span>
              </div>
              <p className="text-xs text-amber-900 leading-relaxed">
                "AgriTrust AI आपातकालीन सूचना। आपके खेत में बाढ़ की पुष्टि हुई है।
                आपका बीमा भुगतान तुरंत भेज दिया गया है।"
              </p>
            </div>

            {/* TERTIARY: English */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                  🔵 English · Tertiary
                </span>
                <span className="text-[9px] text-blue-600 font-mono">TRACK 3</span>
              </div>
              <p className="text-xs text-blue-900 leading-relaxed">
                "Plot #{plotId} disaster-affected. Payout of{' '}
                <strong>{payoutAmount} MST</strong> triggered. Visit AePS centre with Aadhaar."
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-3 border-t border-gray-100">
            {onOpenPDF && (
              <button
                onClick={() => {
                  handleEndCall();
                  onOpenPDF();
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center space-x-2 shadow-md"
              >
                <FileText className="w-4 h-4" />
                <span>Download PDF Evidence</span>
              </button>
            )}
            <button
              onClick={handleEndCall}
              className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center space-x-2 shadow-lg"
            >
              <Phone className="w-5 h-5 rotate-[135deg]" />
              <span>End Call</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceAlertModal;
