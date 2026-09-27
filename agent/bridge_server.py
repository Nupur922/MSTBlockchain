import json
import logging
import os
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from dotenv import load_dotenv

# Ensure agent directory is in path and envs loaded
agent_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(agent_dir))

load_dotenv(agent_dir.parent / ".env")
load_dotenv(agent_dir / "config" / ".env")

from voice_notifier import VoiceNotifier

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("bridge_server")

notifier = VoiceNotifier()

class BridgeHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self):
        if self.path == "/api/trigger-call":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode("utf-8")) if body else {}

            scenario = data.get("scenario", "assam-flood")
            env_target = os.getenv("TWILIO_VERIFIED_TO_NUMBER") or os.getenv("TWILIO_TO_PHONE_NUMBER")
            target_phone = env_target if env_target else (data.get("phone") or "+917483799325")

            if "bihar" in scenario:
                farmer_name = "Ram Singh"
                payout_inr = 18000
                damage_pct = 50.0
                language = "bhojpuri"
                location = "Darbhanga, Bihar"
            else:
                farmer_name = "Prasanta Kalita"
                payout_inr = 25000
                damage_pct = 65.0
                language = "assamese"
                location = "Majuli, Assam"

            logger.info("📞 Triggering live phone call for %s (%s)...", farmer_name, scenario)
            call_res = notifier.trigger_automated_payout_alert(
                to_phone_number=target_phone,
                farmer_name=farmer_name,
                payout_inr=payout_inr,
                damage_pct=damage_pct,
                disaster_type="Flood",
                language=language,
                location=location,
            )

            self.send_response(200)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "success",
                "call_sid": call_res.get("call_sid"),
                "whatsapp": call_res.get("whatsapp"),
            }).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        # Clean logging
        logger.info("%s - - [%s] %s", self.client_address[0], self.log_date_time_string(), format % args)

if __name__ == "__main__":
    port = 8000
    server = HTTPServer(("127.0.0.1", port), BridgeHandler)
    logger.info("🚀 AgriTrust Web-to-Call Bridge Server running on http://127.0.0.1:%d", port)
    server.serve_forever()
