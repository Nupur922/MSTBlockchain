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
    # ── NEW: Failure condition demos ─────────────────────────────────────────
    "nonexistent-plot": {
        "label": "Claim on Unregistered Plot (Rejected)",
        "farmer_name": "Unknown",
        "location": "Unknown Coordinates",
        "state": "Unknown",
        "language": "hindi",
        "disaster_type": "Flood",
        "damage_pct": 0.0,
        "payout_ratio": 0.0,
        "plot_id": "999",
        "payouts": False,
        "rejection_reason": "Plot ID 999 is not registered in FarmRegistry.sol — ecrecover verification failed. No policy exists.",
    },
    "crop-mismatch": {
        "label": "Crop Mismatch Fraud (Claim Rejected)",
        "farmer_name": "Rajesh Kumar",
        "location": "Varanasi, Uttar Pradesh",
        "state": "Uttar Pradesh",
        "language": "hindi",
        "disaster_type": "Flood",
        "damage_pct": 0.0,
        "payout_ratio": 0.0,
        "plot_id": "3",
        "payouts": False,
        "rejection_reason": "Registered crop: Paddy (Rice). Claimed crop: Wheat. SAR texture does not match standing crop. Oracle rejected.",
    },
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
        "rejection_reason": "NDVI dropped: yes, but only 1 of 3 feeds voted yes (SAR confirms dry bare soil, rain 0mm). Seasonal dry stubble harvest detected; claim rejected.",
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
        else:
            cls._instance._refresh_credentials()
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
        elif self.path.startswith("/api/live-telemetry"):
            # GET /api/live-telemetry?scenario=assam-flood  OR  ?state=Assam
            from urllib.parse import urlparse, parse_qs
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)
            scenario_key = (params.get("scenario") or [""])[0].strip().lower()
            state_key = (params.get("state") or [""])[0].strip()
            # Resolve by scenario first, then by state
            if not scenario_key and state_key:
                scenario_key = STATE_TO_SCENARIO.get(state_key, "")
            data = LIVE_TELEMETRY.get(scenario_key)
            if data:
                self._send_json(200, {"status": "ok", "scenario": scenario_key, "telemetry": data})
            else:
                # Return healthy baseline
                self._send_json(200, {
                    "status": "ok",
                    "scenario": "baseline",
                    "telemetry": {
                        "farmer_name": None,
                        "days": ["D-6","D-5","D-4","D-3","D-2","D-1","Today"],
                        "sar":  [-10.2,-10.5,-10.3,-10.8,-10.5,-10.6,-10.5],
                        "ndvi": [0.72, 0.74, 0.75, 0.76, 0.75, 0.75, 0.75],
                        "ndwi": [-0.15,-0.14,-0.13,-0.13,-0.14,-0.14,-0.12],
                        "rain": [8, 5, 12, 3, 7, 10, 6],
                        "temp": [28.5, 29.0, 28.8, 29.2, 28.9, 28.7, 28.5],
                        "consensus_day": None,
                        "status": "HEALTHY_GROWING_CROP",
                        "hazard": "NONE",
                        "payout_ratio": 0.0,
                    }
                })
        elif self.path.startswith("/api/farmer-did"):
            # GET /api/farmer-did?address=0x...  OR  ?scenario=assam-flood
            from urllib.parse import urlparse, parse_qs
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)
            address = (params.get("address") or [""])[0].strip().lower()
            scenario_key = (params.get("scenario") or [""])[0].strip().lower()
            # Find data by address or scenario
            farmer_data = None
            if address:
                for v in LIVE_TELEMETRY.values():
                    if v.get("did", "").endswith(address):
                        farmer_data = v
                        break
            elif scenario_key:
                farmer_data = LIVE_TELEMETRY.get(scenario_key)
            if farmer_data:
                role = "farmer"
                did = farmer_data.get("did") or f"did:mst:{role}:{address or 'unknown'}"
                self._send_json(200, {
                    "status": "ok",
                    "did": did,
                    "did_document": {
                        "@context": ["https://www.w3.org/ns/did/v1"],
                        "id": did,
                        "verificationMethod": [{
                            "id": f"{did}#key-1",
                            "type": "EcdsaSecp256k1VerificationKey2019",
                            "controller": did,
                            "blockchainAccountId": f"eip155:31337:{farmer_data.get('did','').split(':')[-1]}"
                        }],
                        "service": [{
                            "id": f"{did}#agritrust",
                            "type": "AgriTrustFarmerRegistry",
                            "serviceEndpoint": "https://agritrust.mstblockchain.com"
                        }]
                    },
                    "farmer_name": farmer_data.get("farmer_name"),
                    "state": farmer_data.get("state"),
                    "district": farmer_data.get("district"),
                    "crop": farmer_data.get("crop"),
                    "khasra": farmer_data.get("khasra"),
                    "acreage": farmer_data.get("acreage"),
                })
            else:
                # Generate DID for unknown address
                did = f"did:mst:farmer:{address or 'unknown'}"
                self._send_json(200, {
                    "status": "ok",
                    "did": did,
                    "did_document": {
                        "@context": ["https://www.w3.org/ns/did/v1"],
                        "id": did,
                        "verificationMethod": [],
                        "service": []
                    },
                    "farmer_name": None,
                })
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

        # `scenario` is required: defaulting it here would let an empty POST
        # body silently place a REAL Twilio call to the demo farmer number.
        raw_scenario = payload.get("scenario")
        if raw_scenario is None or not str(raw_scenario).strip():
            self._send_json(400, {
                "status": "error",
                "message": "Missing required field 'scenario'",
                "supported": sorted(SCENARIOS.keys()),
                "no_dispatch": sorted(NO_DISPATCH_SCENARIOS),
            })
            return

        scenario = str(raw_scenario).strip().lower()

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
                "reason": spec.get("rejection_reason") or "2-of-3 oracle consensus did NOT approve this event — no payout dispatched",
                "scenario": scenario,
                "label": spec["label"],
                "plot_id": spec.get("plot_id", ""),
            })
            return

        # ── Merge frontend telemetry over the scenario defaults ────────────
        try:
            damage_pct = float(payload.get("damagePct", spec["damage_pct"]))
        except (TypeError, ValueError):
            damage_pct = spec["damage_pct"]

        payout_ratio = payload.get("payoutRatio")
        payout_inr: Optional[float] = None
        # 1) Explicit ₹ amount from the dashboard wins (keeps every surface in sync)
        try:
            if payload.get("payoutInr") is not None:
                payout_inr = round(float(payload.get("payoutInr")), 2)
        except (TypeError, ValueError):
            payout_inr = None
        # 2) Otherwise derive it from the relief ratio × sum insured
        if payout_inr is None:
            try:
                ratio = float(payout_ratio) if payout_ratio is not None else spec["payout_ratio"]
            except (TypeError, ValueError):
                ratio = spec["payout_ratio"]
            payout_inr = round(INSURED_VALUE_INR * ratio, 2)

        farmer_name = str(payload.get("farmerName") or spec["farmer_name"])
        location = str(payload.get("location") or spec["location"])
        state = str(payload.get("state") or spec["state"])
        plot_id = str(payload.get("plotId") or spec["plot_id"])
        farmer_wallet = str(payload.get("farmerWallet") or "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC")
        payout_mst = float(payload.get("payoutMst") or 5.0)
        payout_inr = 25000.0  # Fixed ₹25,000 for 5.0 MST payout
        tx_hash = str(payload.get("txHash") or "")

        # If not provided with a real 66-character on-chain hash from BridgeKey, disburse on MST Testnet
        if not tx_hash or tx_hash.startswith("0xDEMO") or len(tx_hash) < 66:
            try:
                import subprocess, json as py_json
                script_path = str(agent_dir.parent / "scripts" / "send_payout.cjs")
                res = subprocess.run(["node", script_path, farmer_wallet, str(payout_mst)], capture_output=True, text=True, timeout=12)
                for line in res.stdout.strip().splitlines():
                    if "hash" in line:
                        parsed = py_json.loads(line)
                        if parsed.get("hash"):
                            tx_hash = parsed["hash"]
                            logger.info("⚡ Real On-Chain MST Testnet Tx Confirmed: %s", tx_hash)
                            break
            except Exception as e:
                logger.warning("Could not execute on-chain disburse script: %s", e)

        if not tx_hash:
            tx_hash = "0xDEMO_PAYOUT_TX"

        language = str(payload.get("language") or spec["language"])
        disaster_type = str(payload.get("disasterType") or spec["disaster_type"])
        target_phone = resolve_target_phone(payload.get("phone"))

        notifier = VoiceNotifierFactory.get()

        logger.info(
            "📞 Triggering live phone call + WhatsApp | %s (%s) | plot %s | %.1f%% damage | 5.0 MST (₹%s) | %s",
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
            "farmer_wallet": farmer_wallet,
            "location": location,
            "language": language,
            "disaster_type": disaster_type,
            "damage_pct": damage_pct,
            "payout_inr": payout_inr,
            "payout_mst": payout_mst,
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


# ---------------------------------------------------------------------------
# Live telemetry API — returns 7-day historical data for a given scenario/state
# ---------------------------------------------------------------------------

LIVE_TELEMETRY: dict[str, dict] = {
    "assam-flood": {
        "farmer_name": "Prasanta Kalita",
        "state": "Assam",
        "district": "Majuli",
        "crop": "Sali Paddy",
        "did": "did:mst:farmer:0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc",
        "khasra": "Patta #104/B",
        "acreage": 1.8,
        "days": ["D-6","D-5","D-4","D-3","D-2","D-1","Today"],
        "sar":  [-6.2, -8.4, -11.1, -14.8, -17.3, -19.5, -22.4],
        "ndvi": [0.78, 0.72, 0.61, 0.49, 0.38, 0.30, 0.28],
        "ndwi": [-0.12,-0.08, 0.05, 0.18, 0.28, 0.33, 0.35],
        "rain": [12, 28, 55, 110, 180, 210, 195],
        "temp": [29.1, 28.4, 27.8, 26.5, 25.2, 24.8, 24.0],
        "consensus_day": 4,
        "status": "CRITICAL_FLOOD_SUBMERSION",
        "hazard": "MONSOON_FLOOD",
        "payout_ratio": 0.65,
    },
    "bihar-flood": {
        "farmer_name": "Ram Singh",
        "state": "Bihar",
        "district": "Darbhanga",
        "crop": "Paddy (Rice)",
        "did": "did:mst:farmer:0x3c44cdddb6a900fa2b585dd299e03d12fa4293bd",
        "khasra": "Khatiyan #214/A",
        "acreage": 2.5,
        "days": ["D-6","D-5","D-4","D-3","D-2","D-1","Today"],
        "sar":  [-5.8, -9.2, -13.4, -18.1, -21.0, -23.5, -24.1],
        "ndvi": [0.76, 0.68, 0.52, 0.38, 0.25, 0.20, 0.18],
        "ndwi": [-0.15,-0.05, 0.12, 0.28, 0.38, 0.43, 0.45],
        "rain": [18, 42, 88, 145, 210, 240, 220],
        "temp": [30.2, 29.1, 27.5, 26.2, 25.8, 25.5, 25.5],
        "consensus_day": 3,
        "status": "SEVERE_FLOOD_SUBMERSION",
        "hazard": "MONSOON_FLOOD",
        "payout_ratio": 0.50,
    },
    "maharashtra-drought": {
        "farmer_name": "Eknath Patil",
        "state": "Maharashtra",
        "district": "Nashik",
        "crop": "Grapes / Onion",
        "did": "did:mst:farmer:0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
        "khasra": "7/12 Extract #88/2",
        "acreage": 3.2,
        "days": ["D-6","D-5","D-4","D-3","D-2","D-1","Today"],
        "sar":  [-9.1, -8.8, -8.5, -8.3, -8.1, -8.0, -8.5],
        "ndvi": [0.68, 0.62, 0.55, 0.47, 0.40, 0.35, 0.32],
        "ndwi": [-0.18,-0.22,-0.28,-0.35,-0.40,-0.43,-0.45],
        "rain": [4, 2, 0, 0, 1, 0, 0],
        "temp": [34.0, 35.2, 36.8, 37.5, 38.0, 38.3, 38.5],
        "consensus_day": 5,
        "status": "FLASH_DROUGHT_MOISTURE_STRESS",
        "hazard": "FLASH_DROUGHT",
        "payout_ratio": 0.50,
    },
    "punjab-heatwave": {
        "farmer_name": "Gurpreet Singh",
        "state": "Punjab",
        "district": "Ludhiana",
        "crop": "Wheat",
        "did": "did:mst:farmer:0x15d34aaf54267db7d7c367839aaf71a00a2c6a65",
        "khasra": "Jamabandi #45/1",
        "acreage": 4.0,
        "days": ["D-6","D-5","D-4","D-3","D-2","D-1","Today"],
        "sar":  [-9.5, -9.2, -9.0, -8.9, -8.8, -9.0, -9.0],
        "ndvi": [0.70, 0.66, 0.60, 0.52, 0.47, 0.44, 0.42],
        "ndwi": [-0.20,-0.24,-0.28,-0.30,-0.31,-0.32,-0.32],
        "rain": [0, 0, 0, 0, 0, 0, 1],
        "temp": [38.5, 40.1, 41.8, 43.0, 44.0, 44.5, 44.2],
        "consensus_day": 4,
        "status": "SCORCHING_HEATWAVE_WHEAT_STRESS",
        "hazard": "SCORCHING_HEATWAVE",
        "payout_ratio": 0.40,
    },
    "karnataka-flood": {
        "farmer_name": "Lakshmamma",
        "state": "Karnataka",
        "district": "Mandya",
        "crop": "Sugarcane / Paddy",
        "did": "did:mst:farmer:0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc",
        "khasra": "RTC #112/3",
        "acreage": 2.8,
        "days": ["D-6","D-5","D-4","D-3","D-2","D-1","Today"],
        "sar":  [-7.0,-10.2,-14.5,-17.0,-18.2,-18.0,-18.2],
        "ndvi": [0.74, 0.65, 0.50, 0.35, 0.28, 0.25, 0.25],
        "ndwi": [-0.10, 0.02, 0.12, 0.18, 0.20, 0.20, 0.20],
        "rain": [22, 55, 100, 160, 195, 210, 200],
        "temp": [28.5, 27.8, 27.0, 26.5, 26.8, 27.0, 27.0],
        "consensus_day": 3,
        "status": "CRITICAL_INUNDATION",
        "hazard": "MONSOON_FLOOD",
        "payout_ratio": 0.70,
    },
    "tn-harvest-rain": {
        "farmer_name": "Murugan",
        "state": "Tamil Nadu",
        "district": "Thanjavur",
        "crop": "Samba Paddy",
        "did": "did:mst:farmer:0x976ea74026e726554db657fa54763abd0c3a0aa9",
        "khasra": "Patta #78/1A",
        "acreage": 2.1,
        "days": ["D-6","D-5","D-4","D-3","D-2","D-1","Today"],
        "sar":  [-8.5, -9.8,-11.5,-12.0,-11.8,-11.5,-11.0],
        "ndvi": [0.65, 0.55, 0.38, 0.28, 0.22, 0.20, 0.20],
        "ndwi": [-0.05, 0.05, 0.12, 0.14, 0.14, 0.13, 0.15],
        "rain": [30, 85, 140, 125, 90, 70, 55],
        "temp": [28.0, 27.5, 27.0, 27.2, 27.5, 28.0, 26.0],
        "consensus_day": 2,
        "status": "HARVEST_RAIN_CROP_LODGING",
        "hazard": "HARVEST_RAIN_LODGING",
        "payout_ratio": 0.75,
    },
}

# Map state names to scenario keys for quick lookup
STATE_TO_SCENARIO = {
    "Assam": "assam-flood",
    "Bihar": "bihar-flood",
    "Maharashtra": "maharashtra-drought",
    "Punjab": "punjab-heatwave",
    "Karnataka": "karnataka-flood",
    "Tamil Nadu": "tn-harvest-rain",
    "West Bengal": "assam-flood",
    "Gujarat": "bihar-flood",
}

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
