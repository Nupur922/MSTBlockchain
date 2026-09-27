"""
bridge_server.py
================
AgriTrust AI V2 | Web-to-Call HTTP Bridge

Lightweight HTTP service (port 8000) that connects the React dashboard's
disaster simulations to the multichannel dispatch engine:

    Frontend Demo Control Panel
        └─ POST /api/trigger-call { scenario: "assam-flood" | "bihar-flood" | ... }
             └─ VoiceNotifier.trigger_automated_payout_alert()
                  ├─ Live PSTN phone call  (Twilio + Amazon Polly Aditi / Raveena)
                  └─ UltraMsg WhatsApp receipt (tx hash + damage % + Aadhaar DBT steps)

Phone-number resolution priority (spec):
    TWILIO_VERIFIED_TO_NUMBER  >  TWILIO_TO_PHONE_NUMBER  >  FARMER_PHONE_NUMBER
    >  payload `phone` (mock frontend number)  >  demo fallback

Endpoints
---------
GET  /health             → service + Twilio / UltraMsg configuration status
GET  /api/scenarios      → the scenario catalogue understood by this bridge
POST /api/trigger-call   → dispatch voice call + WhatsApp for a scenario
"""

import json
import logging
import os
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from typing import Any, Optional

from dotenv import load_dotenv

# Ensure agent directory is in path and envs loaded
agent_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(agent_dir))

load_dotenv(agent_dir.parent / ".env")
load_dotenv(agent_dir / "config" / ".env")

from voice_notifier import VoiceNotifier

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("bridge_server")

# Insured sum per plot — mirrors ScenarioSimulator.INSURED_VALUE_MST (₹1 MST = ₹1)
INSURED_VALUE_INR = 40_000

# ---------------------------------------------------------------------------
# Scenario catalogue — keys match the frontend DemoControlPanel / App.jsx ids
# ---------------------------------------------------------------------------

SCENARIOS: dict[str, dict[str, Any]] = {
    "assam-flood": {
        "label": "Assam Majuli Flood",
        "farmer_name": "Prasanta Kalita",
        "location": "Majuli, Assam",
        "state": "Assam",
        "language": "assamese",
        "disaster_type": "Flood",
        "damage_pct": 65.0,
        "payout_ratio": 0.65,
        "plot_id": "1",
        "payouts": True,
    },
    "bihar-flood": {
        "label": "Bihar Darbhanga Flood",
        "farmer_name": "Ram Singh",
        "location": "Darbhanga, Bihar",
        "state": "Bihar",
        "language": "bhojpuri",
        "disaster_type": "Flood",
        "damage_pct": 50.0,
        "payout_ratio": 0.50,
        "plot_id": "2",
        "payouts": True,
    },
    "maharashtra-drought": {
        "label": "Marathwada Flash Drought",
        "farmer_name": "Sunita Deshmukh",
        "location": "Nashik, Maharashtra",
        "state": "Maharashtra",
        "language": "hindi",
        "disaster_type": "Drought",
        "damage_pct": 50.0,
        "payout_ratio": 0.50,
        "plot_id": "3",
        "payouts": True,
    },
    "punjab-heatwave": {
        "label": "Punjab Wheat Heatwave",
        "farmer_name": "Gurpreet Singh",
        "location": "Ludhiana, Punjab",
        "state": "Punjab",
        "language": "hindi",
        "disaster_type": "Heatwave",
        "damage_pct": 40.0,
        "payout_ratio": 0.40,
        "plot_id": "4",
        "payouts": True,
    },
    "karnataka-flood": {
        "label": "Karnataka Cauvery Flood",
        "farmer_name": "Lakshmamma",
        "location": "Mandya, Karnataka",
        "state": "Karnataka",
        "language": "hindi",
        "disaster_type": "Flood",
        "damage_pct": 70.0,
        "payout_ratio": 0.70,
        "plot_id": "5",
        "payouts": True,
    },
    "tn-harvest-rain": {
        "label": "Tamil Nadu Samba Harvest Rain",
        "farmer_name": "Murugan",
        "location": "Thanjavur, Tamil Nadu",
        "state": "Tamil Nadu",
        "language": "hindi",
        "disaster_type": "Flood",
        "damage_pct": 75.0,
        "payout_ratio": 0.75,
        "plot_id": "6",
        "payouts": True,
    },
    # ── Rejected / no-payout scenarios: no voice call, no WhatsApp ─────────
    "harvest-confusion": {
        "label": "Harvest Stubble Shield (Claim Rejected)",
        "farmer_name": "Ram Singh",
        "location": "Darbhanga, Bihar",
        "state": "Bihar",
        "language": "bhojpuri",
        "disaster_type": "Flood",
        "damage_pct": 0.0,
        "payout_ratio": 0.0,
        "plot_id": "7",
        "payouts": False,
    },
    "ghost-crop-fraud": {
        "label": "Ghost Crop Fraud Flagged (Claim Rejected)",
        "farmer_name": "Prasanta Kalita",
        "location": "Majuli, Assam",
        "state": "Assam",
        "language": "assamese",
        "disaster_type": "Flood",
        "damage_pct": 0.0,
        "payout_ratio": 0.0,
        "plot_id": "8",
        "payouts": False,
    },
}

NO_DISPATCH_SCENARIOS = {"reset", "baseline", ""}


def resolve_target_phone(payload_phone: Optional[str]) -> str:
    """
    ALWAYS prefer the configured .env targets over any number supplied by the
    (mock) frontend, as required by the V2 specification.
    """
    return (
        os.getenv("TWILIO_VERIFIED_TO_NUMBER", "").strip()
        or os.getenv("TWILIO_TO_PHONE_NUMBER", "").strip()
        or os.getenv("FARMER_PHONE_NUMBER", "").strip()
        or (payload_phone or "").strip()
        or "+917483799325"
    )


class VoiceNotifierFactory:
    """Lazy singleton so importing bridge_server never dials anything."""

    _instance: Optional[VoiceNotifier] = None

    @classmethod
    def get(cls) -> VoiceNotifier:
        if cls._instance is None:
            cls._instance = VoiceNotifier(enable_audio=False)
        return cls._instance


class BridgeHandler(BaseHTTPRequestHandler):
    server_version = "AgriTrustBridge/2.0"

    # ------------------------------------------------------------------ utils

    def _send_json(self, status: int, body: dict) -> None:
        data = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self):  # CORS preflight
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    # ------------------------------------------------------------------- GET

    def do_GET(self):
        if self.path in ("/health", "/api/health", "/"):
            notifier = VoiceNotifierFactory.get()
            self._send_json(200, {
                "status": "ok",
                "service": "AgriTrust AI Web-to-Call Bridge",
                "port": self.server.server_address[1],
                "twilio_configured": getattr(notifier, "twilio_configured", False),
                "ultramsg_configured": getattr(notifier, "ultramsg_configured", False),
                "target_phone": resolve_target_phone(None),
                "scenarios": sorted(SCENARIOS.keys()),
            })
        elif self.path == "/api/scenarios":
            self._send_json(200, {"scenarios": SCENARIOS})
        else:
            self._send_json(404, {"status": "error", "message": f"Unknown GET path {self.path}"})

    # ------------------------------------------------------------------ POST

    def do_POST(self):
        if self.path != "/api/trigger-call":
            self._send_json(404, {"status": "error", "message": f"Unknown POST path {self.path}"})
            return

        try:
            length = int(self.headers.get("Content-Length", 0))
            raw = self.rfile.read(length) if length else b"{}"
            payload = json.loads(raw.decode("utf-8")) if raw else {}
        except (ValueError, json.JSONDecodeError) as exc:
            self._send_json(400, {"status": "error", "message": f"Invalid JSON body: {exc}"})
            return

        scenario = str(payload.get("scenario", "assam-flood")).strip().lower()

        # Baseline / reset must never dial a farmer
        if scenario in NO_DISPATCH_SCENARIOS:
            logger.info("↩️  Scenario '%s' — no payout, dispatch skipped.", scenario or "<empty>")
            self._send_json(200, {
                "status": "skipped",
                "reason": "No disaster event — payout dispatch not applicable",
                "scenario": scenario,
            })
            return

        spec = SCENARIOS.get(scenario)
        if spec is None:
            self._send_json(404, {
                "status": "error",
                "message": f"Unknown scenario '{scenario}'",
                "supported": sorted(SCENARIOS.keys()),
            })
            return

        if not spec["payouts"]:
            logger.info("🚫  Scenario '%s' rejected by oracle consensus — no dispatch.", scenario)
            self._send_json(200, {
                "status": "rejected",
                "reason": "2-of-3 oracle consensus did NOT approve this event — no payout dispatched",
                "scenario": scenario,
                "label": spec["label"],
            })
            return

        # ── Merge frontend telemetry over the scenario defaults ────────────
        try:
            damage_pct = float(payload.get("damagePct", spec["damage_pct"]))
        except (TypeError, ValueError):
            damage_pct = spec["damage_pct"]

        payout_ratio = payload.get("payoutRatio")
        try:
            payout_inr = round(INSURED_VALUE_INR * float(payout_ratio), 2) if payout_ratio is not None \
                else round(INSURED_VALUE_INR * spec["payout_ratio"], 2)
        except (TypeError, ValueError):
            payout_inr = round(INSURED_VALUE_INR * spec["payout_ratio"], 2)

        farmer_name = str(payload.get("farmerName") or spec["farmer_name"])
        location = str(payload.get("location") or spec["location"])
        state = str(payload.get("state") or spec["state"])
        plot_id = str(payload.get("plotId") or spec["plot_id"])
        tx_hash = str(payload.get("txHash") or "0xDEMO_PAYOUT_TX")
        language = str(payload.get("language") or spec["language"])
        disaster_type = str(payload.get("disasterType") or spec["disaster_type"])
        target_phone = resolve_target_phone(payload.get("phone"))

        notifier = VoiceNotifierFactory.get()

        logger.info(
            "📞 Triggering live phone call + WhatsApp | %s (%s) | plot %s | %.1f%% damage | ₹%s | %s",
            farmer_name, scenario, plot_id, damage_pct, f"{payout_inr:,.0f}", language,
        )

        try:
            result = notifier.trigger_automated_payout_alert(
                to_phone_number=target_phone,
                farmer_name=farmer_name,
                payout_inr=payout_inr,
                damage_pct=damage_pct,
                disaster_type=disaster_type,
                language=language,
                location=location,
                tx_hash=tx_hash,
            )
        except Exception as exc:  # never crash the bridge mid-payout
            logger.exception("❌ Dispatch failed for scenario %s", scenario)
            self._send_json(500, {
                "status": "error",
                "scenario": scenario,
                "message": str(exc),
            })
            return

        whatsapp = result.get("whatsapp")
        self._send_json(200, {
            "status": "success",
            "scenario": scenario,
            "label": spec["label"],
            "state": state,
            "plot_id": plot_id,
            "farmer_name": farmer_name,
            "location": location,
            "language": language,
            "disaster_type": disaster_type,
            "damage_pct": damage_pct,
            "payout_inr": payout_inr,
            "target_phone": target_phone,
            "call_sid": result.get("call_sid"),
            "whatsapp": (
                {"status": whatsapp.get("status", "sent"), "to": whatsapp.get("to")}
                if isinstance(whatsapp, dict) else {"status": "sent"}
            ),
            "tx_hash": tx_hash,
        })

    def log_message(self, format, *args):
        logger.info("%s - - [%s] %s", self.client_address[0], self.log_date_time_string(), format % args)


if __name__ == "__main__":
    port = int(os.getenv("BRIDGE_PORT", "8000"))
    server = HTTPServer(("127.0.0.1", port), BridgeHandler)
    notifier = VoiceNotifierFactory.get()
    logger.info("🚀 AgriTrust Web-to-Call Bridge Server running on http://127.0.0.1:%d", port)
    logger.info("   Twilio voice : %s", "ENABLED" if getattr(notifier, "twilio_configured", False) else "SIMULATED")
    logger.info("   UltraMsg WA  : %s", "ENABLED" if getattr(notifier, "ultramsg_configured", False) else "SIMULATED")
    logger.info("   Target phone : %s", resolve_target_phone(None))
    logger.info("   Scenarios    : %s", ", ".join(sorted(SCENARIOS)))
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        logger.info("👋 Bridge server shutting down.")
        server.server_close()
