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
    regionalVoice, // PRIMARY: Regional language plays first!
    {
      lang: 'hi-IN',
      text: `AgriTrust AI aapatkalin suchna. Aapke khet mein baadh ki pushti hui hai. Aapka bima bhugtan turant bhej diya gaya hai. Kripya apne nazdiki post office mein Aadhaar card lekar jayein.`,
    },
    {
      lang: 'en-IN',
      text: `AgriTrust AI Emergency Alert. Your farm plot number ${plotId} has been affected by flooding. Emergency insurance payout of ${payoutAmount} Ethereum has been triggered automatically. Please visit your nearest AePS centre.`,
    }
  ];
};

const VoiceAlertModal = ({ isOpen, onClose, onOpenPDF, payoutAmount, plotId, stateName, coordinates }) => {
  const [callDuration, setCallDuration]   = useState(0);
  const [isMuted, setIsMuted]             = useState(false);
  const [speechStatus, setSpeechStatus]   = useState('idle');
  // 'idle' | 'speaking' | 'done'

  const utterancesRef  = useRef([]);
  const isMutedRef     = useRef(false); // ref so the speech callback can read current value

  // ── Speak the alert messages using Web Speech API ──────────────────────────
  const speakMessages = (amount, id, state, coords) => {
    if (!window.speechSynthesis) return;

    window.speechSynthesis.cancel(); // clear any leftover speech
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

  // ── On open: reset state and start speech ─────────────────────────────────
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

    // Short delay so the modal renders before speech starts
    const speechTimer = setTimeout(() => speakMessages(payoutAmount, plotId, detectedState, coordinates), 600);

    // Call duration counter
    const durationInterval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    // Speech duration can exceed 30 seconds across 3 languages (Regional, Hindi, English).
    // Modal will stay open until either all messages finish speaking (plus a buffer) or user clicks "End Call".
    return () => {
      clearTimeout(speechTimer);
      clearInterval(durationInterval);
      window.speechSynthesis?.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ── Apply mute/unmute to active utterances ─────────────────────────────────
  useEffect(() => {
    isMutedRef.current = isMuted;
    // Can't change volume of an in-progress utterance in most browsers,
    // so we cancel and restart when unmuting, or just pause when muting.
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

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      {/* Phone card */}
      <div className="bg-gradient-to-b from-green-500 to-green-700 rounded-3xl shadow-2xl w-80 overflow-hidden">

        {/* ── Top bar ── */}
        <div className="px-6 pt-5 pb-2 text-white flex items-center justify-between">
          <span className="text-sm opacity-80 font-medium">Incoming Call</span>
          <button onClick={handleEndCall} className="text-white/70 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Caller info ── */}
        <div className="flex flex-col items-center py-5 text-white space-y-3">
          <div className="bg-white/20 p-4 rounded-full ring-4 ring-white/30 animate-pulse">
            <Phone className="w-10 h-10 text-white" />
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">AgriTrust AI</p>
            <p className="text-sm opacity-80">Automated Disaster Alert</p>
          </div>

          {/* Timer */}
          <p className="text-4xl font-mono font-bold tracking-widest">
            {formatDuration(callDuration)}
          </p>

          {/* Speech status */}
          <div className="flex items-center space-x-2 text-sm">
            {speechStatus === 'speaking' && (
              <>
                <Volume2 className="w-4 h-4 animate-pulse" />
                <span>Playing alert message…</span>
              </>
            )}
            {speechStatus === 'done' && (
              <span className="opacity-70">Message delivered ✓</span>
            )}
            {speechStatus === 'idle' && (
              <span className="opacity-50">Connecting…</span>
            )}
          </div>

          {/* Mute toggle */}
          <button
            onClick={() => setIsMuted((m) => !m)}
            className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold transition-colors
              ${isMuted ? 'bg-red-500/80 text-white' : 'bg-white/20 text-white hover:bg-white/30'}`}
          >
            {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
            <span>{isMuted ? 'Muted' : 'Mute'}</span>
          </button>
        </div>

        {/* ── Message transcript ── */}
        <div className="bg-white rounded-t-3xl px-5 pt-5 pb-2">
          <div className="flex items-center space-x-2 mb-3">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <p className="font-bold text-gray-900 text-sm">Alert Transcript</p>
          </div>

          <div className="space-y-2 text-xs text-gray-700 max-h-48 overflow-y-auto pr-1">
            {/* PRIMARY: Regional language */}
            {(() => {
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
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="font-semibold text-green-800 mb-1">{native.name}</p>
                  <p className="italic leading-relaxed">
                    "{native.text}"
                  </p>
                </div>
              );
            })()}

            {/* SECONDARY: Hindi */}
            <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="font-semibold text-yellow-800 mb-1">🟡 हिंदी (Hindi) — Secondary</p>
              <p className="italic leading-relaxed">
                "AgriTrust AI आपातकालीन सूचना। आपके खेत में बाढ़ की पुष्टि हुई है।
                आपका बीमा भुगतान तुरंत भेज दिया गया है। कृपया अपने नज़दीकी Post Office में
                Aadhaar card लेकर जाएँ।"
              </p>
            </div>

            {/* TERTIARY: English */}
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="font-semibold text-blue-800 mb-1">🔵 English — Tertiary</p>
              <p className="italic leading-relaxed">
                "Your farm Plot #{plotId} has been flood-affected. Emergency payout of{' '}
                <strong>{payoutAmount} ETH</strong> has been triggered automatically.
                Please visit your nearest AePS centre with Aadhaar."
              </p>
            </div>
          </div>
        </div>

        {/* ── Action buttons: PDF Evidence & End Call ── */}
        <div className="bg-white px-5 pb-5 pt-3 space-y-2">
          {onOpenPDF && (
            <button
              onClick={() => {
                handleEndCall();
                onOpenPDF();
              }}
              className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white py-2.5 rounded-full font-semibold text-xs transition-all flex items-center justify-center space-x-2 shadow-md"
            >
              <FileText className="w-4 h-4" />
              <span>Download Disaster Audit Certificate (PDF Evidence)</span>
            </button>
          )}
          <button
            onClick={handleEndCall}
            className="w-full bg-red-500 hover:bg-red-600 active:scale-95 text-white py-3 rounded-full font-bold transition-all flex items-center justify-center space-x-2 shadow-lg"
          >
            <Phone className="w-5 h-5 rotate-[135deg]" />
            <span>End Call</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceAlertModal;
