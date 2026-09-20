"""
voice_notifier.py
=================
Developer 2 | Day 3 Task — AgriTrust AI
Regional Language Voice Alert Generator

Generates voice alert text transcripts and optionally plays audio
using the system's text-to-speech engine.

Supported languages:
  - Hindi    (primary)
  - Assamese (for Assam Brahmaputra flood zone)
  - Bhojpuri (for Bihar Kosi river flood zone)

Example output:
  "Ram Singh Ji, satellite radar confirmed 6 days of flood damage on
   your plot in Darbhanga. ₹25,000 relief payout has been sent to
   your bank!"

Author : Developer 2 — NEWRRO AI & Satellite Oracle Lead
Project: AgriTrust AI — MST Blockchain Buildathon
"""

from __future__ import annotations

import logging
import platform
import subprocess
from typing import Optional

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    level=logging.INFO,
)
logger = logging.getLogger("voice_notifier")

# ---------------------------------------------------------------------------
# Message templates
# ---------------------------------------------------------------------------

# Each template is keyed by language and alert type ("disaster" | "healthy")
# Placeholders: {farmer}, {flood_days}, {location}, {payout_inr}

TEMPLATES: dict[str, dict[str, str]] = {
    "hindi": {
        "disaster": (
            "{farmer} ji, Satellite Radar ne aapke {location} mein sthit khet par "
            "{flood_days} din ki baadhh ka praman diya hai. "
            "AgriTrust AI ne aapke nauksaan ko confirmed kar liya hai. "
            "Rupaye {payout_inr:,.0f} ka rahat bhugtaan aapke bank khate mein bheja ja raha hai. "
            "Dhanyavaad, kripaya Aadhar-enabled ATM se raqam nikaalein."
        ),
        "healthy": (
            "{farmer} ji, namaskar! Aapki fasal bilkul swasth hai. "
            "Satellite NDVI index 0.78 hai — yeh ek bahut achha sanket hai. "
            "Koi aapda nahi, koi payout nahi. Aapki fasal surakshit hai!"
        ),
    },
    "assamese": {
        "disaster": (
            "{farmer} da, Satellite Radar-e aapunar {location}-ot thoka khetot "
            "{flood_days} din baan paani thakaar proman dise. "
            "AgriTrust AI-e aapunar khotikhoya nischit koriche. "
            "Rupiah {payout_inr:,.0f} takaar sahayota payment aapunar bank account-ot "
            "pothiaai dia hoise. Dhanyabad. Aadhaar ATM-ot taka tulibok."
        ),
        "healthy": (
            "{farmer} da, namaskar! Aapunar shash poori swasth ase. "
            "Satellite NDVI 0.78 — eti ekta boro bhaal somay. "
            "Kono bipod nai, kono payment nai. Aapunar shash surakshit!"
        ),
    },
    "bhojpuri": {
        "disaster": (
            "{farmer} bhaiya, Satellite Radar hamar {location} ke khet par "
            "{flood_days} din ke baadh ke parman de dihle ba. "
            "AgriTrust AI rahal nuksaan pakad lihle ba. "
            "Rupaya {payout_inr:,.0f} ke rahat bhugtaan aapan bank mein pathawat ba. "
            "Dhanyavad. Aadhaar ATM se paisa nikaalein."
        ),
        "healthy": (
            "{farmer} bhaiya, pranam! Rauwa ke fasal bilkul theek-thak ba. "
            "Satellite NDVI index 0.78 ba — ek bahut neetab ank. "
            "Kaunoo aapda naikhe, kaunoo payout naikhe. Fasal surakshit ba!"
        ),
    },
}

# English template (fallback and for demos)
TEMPLATES["english"] = {
    "disaster": (
        "{farmer} ji, Satellite Radar has confirmed {flood_days} days of flood damage "
        "on your plot in {location}. AgriTrust AI has verified your crop loss. "
        "A relief payout of ₹{payout_inr:,.0f} has been sent to your bank account. "
        "Thank you. Please withdraw at your nearest Aadhaar-enabled ATM."
    ),
    "healthy": (
        "{farmer} ji, good news! Your crop is completely healthy. "
        "Satellite NDVI index is 0.78 — an excellent sign. "
        "No disaster detected, no payout triggered. Your crop is safe!"
    ),
}


# ---------------------------------------------------------------------------
# VoiceNotifier
# ---------------------------------------------------------------------------

class VoiceNotifier:
    """
    Generates regional language voice alert text and optionally speaks
    them using the operating system's built-in TTS engine.

    For hackathon demos, the text transcripts are the primary output.
    Audio playback is a bonus feature when supported.

    Usage
    -----
    >>> notifier = VoiceNotifier()
    >>> msg = notifier.generate_alert(
    ...     farmer_name="Ram Singh",
    ...     location="Darbhanga",
    ...     flood_days=6,
    ...     payout_inr=25000,
    ...     language="bhojpuri",
    ...     approved=True,
    ... )
    >>> print(msg)
    """

    SUPPORTED_LANGUAGES = list(TEMPLATES.keys())

    def __init__(self, enable_audio: bool = True):
        """
        Parameters
        ----------
        enable_audio : bool
            If True, attempt to play audio using OS TTS when speak() is called.
            If False or OS TTS unavailable, text-only mode.
        """
        self.enable_audio = enable_audio
        self._tts_available = self._check_tts()

    def _check_tts(self) -> bool:
        """Check if OS TTS is available."""
        try:
            if platform.system() == "Windows":
                # PowerShell Add-Type for SAPI
                return True
            elif platform.system() == "Darwin":
                # macOS `say` command
                return True
            elif platform.system() == "Linux":
                # espeak or festival
                result = subprocess.run(["which", "espeak"], capture_output=True)
                return result.returncode == 0
        except Exception:
            pass
        return False

    def generate_alert(
        self,
        farmer_name: str,
        location: str,
        flood_days: int,
        payout_inr: float,
        language: str = "hindi",
        approved: bool = True,
    ) -> str:
        """
        Generate a regional language voice alert message.

        Parameters
        ----------
        farmer_name : str
            Name of the farmer (from FarmRegistry).
        location : str
            Farm location string (village / district).
        flood_days : int
            Number of flood days confirmed by SAR radar.
        payout_inr : float
            Payout amount in INR (MST converted to rupees).
        language : str
            Language code: "hindi" | "assamese" | "bhojpuri" | "english".
        approved : bool
            True = disaster confirmed, False = healthy season.

        Returns
        -------
        str : Formatted voice alert message.
        """
        lang = language.lower()
        if lang not in TEMPLATES:
            logger.warning("⚠️  Language '%s' not supported, falling back to Hindi.", lang)
            lang = "hindi"

        alert_type = "disaster" if approved else "healthy"
        template = TEMPLATES[lang][alert_type]

        message = template.format(
            farmer=farmer_name,
            location=location,
            flood_days=flood_days,
            payout_inr=payout_inr,
        )

        lang_emoji = {
            "hindi": "🇮🇳",
            "assamese": "🌿",
            "bhojpuri": "🌾",
            "english": "🔊",
        }.get(lang, "🔊")

        logger.info(
            "%s  Voice Alert [%s/%s] → %s: %s",
            lang_emoji, lang.upper(), alert_type.upper(),
            farmer_name, message[:80] + "…",
        )
        return message

    def speak(
        self,
        message: str,
        language: str = "hindi",
    ) -> bool:
        """
        Attempt to play the alert message using OS TTS.

        Returns True if audio playback was attempted, False otherwise.
        For hackathon demos, if TTS fails, the text message is still
        displayed in the terminal.
        """
        if not self.enable_audio or not self._tts_available:
            logger.info("🔇  TTS not available — text-only mode.")
            return False

        try:
            system = platform.system()
            if system == "Windows":
                # PowerShell SAPI.SpVoice
                ps_cmd = (
                    f'Add-Type -AssemblyName System.Speech; '
                    f'$s = New-Object System.Speech.Synthesis.SpeechSynthesizer; '
                    f'$s.Speak("{message[:200].replace(chr(39), "")}");'
                )
                subprocess.run(
                    ["powershell", "-Command", ps_cmd],
                    capture_output=True,
                    timeout=30,
                )
                logger.info("🔊  TTS (Windows SAPI): played.")
                return True

            elif system == "Darwin":
                subprocess.run(["say", message[:200]], timeout=30)
                logger.info("🔊  TTS (macOS say): played.")
                return True

            elif system == "Linux":
                subprocess.run(["espeak", message[:200]], timeout=30)
                logger.info("🔊  TTS (Linux espeak): played.")
                return True

        except Exception as exc:
            logger.warning("⚠️  TTS playback failed: %s", exc)

        return False

    def generate_and_speak(
        self,
        farmer_name: str,
        location: str,
        flood_days: int,
        payout_inr: float,
        language: str = "hindi",
        approved: bool = True,
    ) -> str:
        """Generate alert text and attempt audio playback in one call."""
        message = self.generate_alert(
            farmer_name=farmer_name,
            location=location,
            flood_days=flood_days,
            payout_inr=payout_inr,
            language=language,
            approved=approved,
        )
        self.speak(message, language)
        return message

    def broadcast_all_languages(
        self,
        farmer_name: str,
        location: str,
        flood_days: int,
        payout_inr: float,
        approved: bool = True,
    ) -> dict[str, str]:
        """
        Generate alert text in all supported languages simultaneously.

        Useful for demo slideshows showing regional language coverage.

        Returns a dict mapping language → alert message.
        """
        messages = {}
        for lang in self.SUPPORTED_LANGUAGES:
            messages[lang] = self.generate_alert(
                farmer_name=farmer_name,
                location=location,
                flood_days=flood_days,
                payout_inr=payout_inr,
                language=lang,
                approved=approved,
            )
        return messages


# ---------------------------------------------------------------------------
# Quick smoke-test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    notifier = VoiceNotifier(enable_audio=False)  # Text-only for CI

    print("\n" + "═" * 70)
    print("  AgriTrust AI — Voice Alert Samples")
    print("═" * 70)

    scenarios = [
        {
            "name": "Scenario 1: Bihar Kosi Flood (Bhojpuri)",
            "kwargs": {
                "farmer_name": "Ram Singh",
                "location": "Darbhanga",
                "flood_days": 6,
                "payout_inr": 25_000,
                "language": "bhojpuri",
                "approved": True,
            },
        },
        {
            "name": "Scenario 2: Assam Brahmaputra Flood (Assamese)",
            "kwargs": {
                "farmer_name": "Prasanta Kalita",
                "location": "Majuli Island",
                "flood_days": 4,
                "payout_inr": 20_000,
                "language": "assamese",
                "approved": True,
            },
        },
        {
            "name": "Scenario 3: Healthy Season (Hindi)",
            "kwargs": {
                "farmer_name": "Bhupen Gogoi",
                "location": "Majuli, Assam",
                "flood_days": 0,
                "payout_inr": 0,
                "language": "hindi",
                "approved": False,
            },
        },
        {
            "name": "Scenario 4: All Languages Broadcast",
            "broadcast": True,
            "kwargs": {
                "farmer_name": "Suresh Yadav",
                "location": "Vaishali, Bihar",
                "flood_days": 5,
                "payout_inr": 18_000,
                "approved": True,
            },
        },
    ]

    for scenario in scenarios:
        print(f"\n{'─' * 70}")
        print(f"  {scenario['name']}")
        print("─" * 70)
        if scenario.get("broadcast"):
            alerts = notifier.broadcast_all_languages(**scenario["kwargs"])
            for lang, msg in alerts.items():
                print(f"\n  [{lang.upper()}]")
                print(f"  {msg}")
        else:
            msg = notifier.generate_alert(**scenario["kwargs"])
            print(f"\n  {msg}")
