"""
test_telagent_integration.py
==============================
Automated Verification Test Suite for Tel-Agent Integration in AgriTrust AI.

Tests:
  T01: TelAgentNotifier initialization & default configuration
  T02: Tel-Agent AI Voice Call dispatch (Simulation / Live Gateway)
  T03: Tel-Agent SMS dispatch
  T04: Tel-Agent WhatsApp dispatch
  T05: AI Receptionist Chatbot query processing (Payout intent)
  T06: AI Receptionist Chatbot query processing (Satellite Telemetry intent)
  T07: AI Receptionist Chatbot query processing (AePS Cashout intent)
  T08: Model Context Protocol (MCP) Tool definitions compliance
  T09: VoiceNotifier + Tel-Agent automated payout alert integration
"""

import os
import sys
import unittest
from pathlib import Path

# Add agent directory to sys.path
agent_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(agent_dir))

from tel_agent_notifier import TelAgentNotifier
from voice_notifier import VoiceNotifier


class TestTelAgentIntegration(unittest.TestCase):

    def setUp(self):
        self.notifier = TelAgentNotifier()
        self.voice_notifier = VoiceNotifier(enable_audio=False)

    def test_t01_initialization(self):
        """T01: TelAgentNotifier initialization & properties."""
        self.assertIsNotNone(self.notifier.gateway_url)
        self.assertEqual(self.notifier.sip_trunk, "+917483799325")
        self.assertIsInstance(self.notifier.enabled, bool)

    def test_t02_voice_call(self):
        """T02: Tel-Agent Voice Call dispatch."""
        res = self.notifier.trigger_voice_call(
            to_phone_number="+917483799325",
            farmer_name="Ram Singh",
            payout_inr=25000,
            damage_pct=76.0,
            disaster_type="Flood",
            language="bhojpuri",
            location="Darbhanga, Bihar",
        )
        self.assertIn(res["status"], ("success", "simulated"))
        self.assertIn("call_id", res)
        self.assertTrue(res["call_id"].startswith("TELAGENT_CALL_"))

    def test_t03_sms_dispatch(self):
        """T03: Tel-Agent SMS dispatch."""
        res = self.notifier.send_sms(
            to_phone_number="+917483799325",
            farmer_name="Ram Singh",
            payout_inr=25000,
            damage_pct=76.0,
            disaster_type="Flood",
        )
        self.assertIn(res["status"], ("success", "simulated"))
        self.assertIn("msg_id", res)
        self.assertTrue(res["msg_id"].startswith("TELAGENT_SMS_"))

    def test_t04_whatsapp_dispatch(self):
        """T04: Tel-Agent WhatsApp dispatch."""
        res = self.notifier.send_whatsapp(
            to_phone_number="+917483799325",
            farmer_name="Ram Singh",
            payout_inr=25000,
            damage_pct=76.0,
            disaster_type="Flood",
        )
        self.assertIn(res["status"], ("success", "simulated"))
        self.assertIn("msg_id", res)
        self.assertTrue(res["msg_id"].startswith("TELAGENT_WA_"))

    def test_t05_ai_receptionist_payout_query(self):
        """T05: AI Receptionist payout status query."""
        res = self.notifier.process_ai_receptionist_query("Has my flood payout for Khasra #104 been processed?")
        self.assertEqual(res["intent"], "payout_status")
        self.assertIn("Ram Singh", res["reply"])
        self.assertIn("25,000", res["reply"])

    def test_t06_ai_receptionist_telemetry_query(self):
        """T06: AI Receptionist satellite telemetry query."""
        res = self.notifier.process_ai_receptionist_query("What is the satellite crop health and flood radar status?")
        self.assertEqual(res["intent"], "telemetry_inquiry")
        self.assertIn("NDVI", res["reply"])
        self.assertIn("SAR", res["reply"])

    def test_t07_ai_receptionist_aeps_query(self):
        """T07: AI Receptionist AePS cashout query."""
        res = self.notifier.process_ai_receptionist_query("How can I cash out using my Aadhaar fingerprint at India Post?")
        self.assertEqual(res["intent"], "aeps_cashout_guide")
        self.assertIn("Aadhaar", res["reply"])
        self.assertIn("AePS", res["reply"])

    def test_t08_mcp_tools(self):
        """T08: Model Context Protocol (MCP) Tool definitions."""
        tools = self.notifier.get_mcp_tools()
        self.assertIsInstance(tools, list)
        self.assertGreaterEqual(len(tools), 3)
        tool_names = [t["name"] for t in tools]
        self.assertIn("check_farmer_payout_status", tool_names)
        self.assertIn("get_satellite_telemetry", tool_names)
        self.assertIn("trigger_disaster_relief_alert", tool_names)

    def test_t09_voice_notifier_integration(self):
        """T09: VoiceNotifier + Tel-Agent integrated automated payout alert."""
        res = self.voice_notifier.trigger_automated_payout_alert(
            to_phone_number="+917483799325",
            farmer_name="Ram Singh",
            payout_inr=25000,
            damage_pct=76.0,
            disaster_type="Flood",
            language="bhojpuri",
            location="Darbhanga, Bihar",
        )
        self.assertIn("telagent", res)
        self.assertIsNotNone(res["telagent"])
        self.assertIn("call", res["telagent"])
        self.assertIn("sms", res["telagent"])
        self.assertIn("whatsapp", res["telagent"])


if __name__ == "__main__":
    print("\n=================================================================")
    print("      AgriTrust AI -- Tel-Agent Verification Test Suite          ")
    print("=================================================================\n")
    runner = unittest.TextTestRunner(verbosity=2)
    suite = unittest.TestLoader().loadTestsFromTestCase(TestTelAgentIntegration)
    result = runner.run(suite)
    if not result.wasSuccessful():
        sys.exit(1)
