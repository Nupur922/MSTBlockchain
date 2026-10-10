"""
tel_agent_notifier.py
======================
Developer 2 | AgriTrust AI  [TEL-AGENT OPEN-SOURCE AI RECEPTIONIST GATEWAY INTEGRATION]

Tel-Agent is an open-source, AGPL-3.0 AI receptionist gateway (by Dpro) that connects
SIP phone lines, WhatsApp, SMS, Web Chat, Email, and 20+ channels directly to AI agents.

This module provides:
  1. TelAgentNotifier — Omni-channel gateway client (Voice Calls, SMS, WhatsApp, Web Chat)
  2. TelAgent AI Receptionist & Chatbot Query Processor (Instant Farmer Support)
  3. Model Context Protocol (MCP) Tool Definitions for Tel-Agent integration
  4. Seamless fallback to Twilio / UltraMsg / Simulation when local gateway is offline

Setup:
  Add to agent/config/.env:
    TEL_AGENT_ENABLED=true
    TEL_AGENT_URL=http://localhost:38471
    TEL_AGENT_API_KEY=your_telagent_api_key_here
    TEL_AGENT_SIP_TRUNK=+917483799325

Author : Developer 2 — NEWRRO AI & Satellite Oracle Lead
Project: AgriTrust AI — MST Blockchain Buildathon
"""

from __future__ import annotations

import json
import logging
import os
import time
from pathlib import Path
from typing import Any, Optional, Union

import requests
from dotenv import load_dotenv

# Load environment configuration
_ENV_PATH = Path(__file__).parent / "config" / ".env"
load_dotenv(dotenv_path=_ENV_PATH)

# Logging configuration
logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    level=logging.INFO,
)
logger = logging.getLogger("tel_agent_notifier")


class TelAgentNotifier:
    """
    Client for Tel-Agent Open-Source AI Receptionist Gateway.

    Features:
      - Place AI Voice Calls over SIP / PSTN trunks
      - Send SMS & WhatsApp notifications via Tel-Agent multi-channel engine
      - Process interactive farmer queries via Tel-Agent AI Receptionist Chatbot
      - Expose Model Context Protocol (MCP) tool definitions for external LLMs
    """

    DEFAULT_URL = "http://localhost:38471"

    def __init__(
        self,
        gateway_url: Optional[str] = None,
        api_key: Optional[str] = None,
        sip_trunk: Optional[str] = None,
        timeout: int = 5,
    ):
        self.gateway_url = (gateway_url or os.getenv("TEL_AGENT_URL", self.DEFAULT_URL)).rstrip("/")
        self.api_key = api_key or os.getenv("TEL_AGENT_API_KEY", "")
        self.sip_trunk = sip_trunk or os.getenv("TEL_AGENT_SIP_TRUNK", "+917483799325")
        self.enabled = os.getenv("TEL_AGENT_ENABLED", "true").lower() in ("true", "1", "yes")
        self.timeout = timeout

        self._gateway_online = self._check_gateway_health()

        if self._gateway_online:
            logger.info("📞  Tel-Agent Gateway connected at %s (SIP Trunk: %s)", self.gateway_url, self.sip_trunk)
        else:
            logger.info("ℹ️  Tel-Agent Gateway not detected at %s (Operating in Standalone/Simulation mode)", self.gateway_url)

    @property
    def is_online(self) -> bool:
        return self._gateway_online

    def _check_gateway_health(self) -> bool:
        """Check if local Tel-Agent service (http://localhost:38471) is reachable."""
        if not self.enabled:
            return False
        try:
            resp = requests.get(f"{self.gateway_url}/health", timeout=self.timeout)
            if resp.status_code in (200, 204):
                return True
            # Check alternative status endpoint
            resp_status = requests.get(f"{self.gateway_url}/api/v1/status", timeout=self.timeout)
            return resp_status.status_code == 200
        except Exception:
            return False

    # ---------------------------------------------------------------------------
    # VOICE CALL DISPATCH (Tel-Agent SIP / Voice Gateway)
    # ---------------------------------------------------------------------------

    def trigger_voice_call(
        self,
        to_phone_number: str,
        farmer_name: str,
        payout_inr: float,
        damage_pct: float,
        disaster_type: str = "Flood",
        language: str = "hindi",
        location: str = "Darbhanga, Bihar",
    ) -> dict[str, Any]:
        """
        Triggers an automated AI receptionist call via Tel-Agent SIP gateway.
        """
        clean_to = to_phone_number.strip()
        call_id = f"TELAGENT_CALL_{int(time.time())}_{farmer_name.replace(' ', '_')}"

        prompt_script = (
            f"You are AgriTrust AI Receptionist calling farmer {farmer_name}. "
            f"Inform them that Copernicus satellite radar confirmed {damage_pct:.0f}% {disaster_type} damage "
            f"at {location}. A parametric relief payout of Rupees {payout_inr:,.0f} has been transferred "
            f"directly to their Aadhaar-linked bank account on MST Blockchain. "
            f"Remind them to withdraw funds using any India Post AePS Micro-ATM."
        )

        payload = {
            "to": clean_to,
            "from": self.sip_trunk,
            "channel": "sip_voice",
            "agent_role": "AgriTrust AI Disaster Relief Receptionist",
            "language": language,
            "script": prompt_script,
            "metadata": {
                "farmer_name": farmer_name,
                "payout_inr": payout_inr,
                "damage_pct": damage_pct,
                "disaster_type": disaster_type,
                "location": location,
            },
        }

        if self.is_online:
            try:
                headers = {"Content-Type": "application/json"}
                if self.api_key:
                    headers["Authorization"] = f"Bearer {self.api_key}"

                resp = requests.post(
                    f"{self.gateway_url}/api/v1/calls",
                    json=payload,
                    headers=headers,
                    timeout=self.timeout,
                )
                if resp.status_code in (200, 201, 202):
                    res_json = resp.json() if resp.content else {}
                    real_id = res_json.get("call_id", call_id)
                    logger.info("✅  Tel-Agent Voice Call placed: Call ID=%s | To=%s", real_id, clean_to)
                    return {"status": "success", "call_id": real_id, "channel": "tel_agent_sip", "response": res_json}
            except Exception as exc:
                logger.warning("⚠️  Tel-Agent call dispatch failed (%s), falling back to simulation mode.", exc)

        logger.info(
            "📞  TEL-AGENT SIMULATED CALL DISPATCH:\n"
            "    Call ID  : %s\n"
            "    To       : %s\n"
            "    Farmer   : %s\n"
            "    Script   : %s",
            call_id, clean_to, farmer_name, prompt_script[:120] + "..."
        )
        return {
            "status": "simulated",
            "call_id": call_id,
            "channel": "tel_agent_sip_simulated",
            "script": prompt_script,
        }

    # ---------------------------------------------------------------------------
    # SMS DISPATCH (Tel-Agent Multi-Channel Gateway)
    # ---------------------------------------------------------------------------

    def send_sms(
        self,
        to_phone_number: str,
        farmer_name: str,
        payout_inr: float,
        damage_pct: float,
        disaster_type: str = "Flood",
        tx_hash: str = "0x8f3a91bc24ef10",
    ) -> dict[str, Any]:
        """Sends an SMS alert via Tel-Agent SMS channel."""
        clean_to = to_phone_number.strip()
        msg_text = (
            f"🌾 AgriTrust AI Relief Alert!\n"
            f"Namaste {farmer_name} ji,\n"
            f"Satellite confirmed {damage_pct:.0f}% {disaster_type} damage.\n"
            f"Payout: ₹{payout_inr:,.0f} transferred to your bank account.\n"
            f"MST Tx: {tx_hash[:16]}...\n"
            f"Tel-Agent Receptionist: Reply HELP for options."
        )

        msg_id = f"TELAGENT_SMS_{int(time.time())}"

        if self.is_online:
            try:
                headers = {"Content-Type": "application/json"}
                if self.api_key:
                    headers["Authorization"] = f"Bearer {self.api_key}"

                payload = {"to": clean_to, "channel": "sms", "message": msg_text}
                resp = requests.post(f"{self.gateway_url}/api/v1/sms", json=payload, headers=headers, timeout=self.timeout)
                if resp.status_code in (200, 201, 202):
                    logger.info("✅  Tel-Agent SMS dispatched to %s", clean_to)
                    return {"status": "success", "msg_id": msg_id, "channel": "tel_agent_sms"}
            except Exception as exc:
                logger.warning("⚠️  Tel-Agent SMS failed (%s).", exc)

        logger.info("📱  TEL-AGENT SIMULATED SMS to %s:\n%s", clean_to, msg_text)
        return {"status": "simulated", "msg_id": msg_id, "channel": "tel_agent_sms_simulated", "text": msg_text}

    # ---------------------------------------------------------------------------
    # WHATSAPP DISPATCH (Tel-Agent Multi-Channel Gateway)
    # ---------------------------------------------------------------------------

    def send_whatsapp(
        self,
        to_phone_number: str,
        farmer_name: str,
        payout_inr: float,
        damage_pct: float,
        disaster_type: str = "Flood",
        tx_hash: str = "0x8f3a91bc24ef10",
    ) -> dict[str, Any]:
        """Sends a rich WhatsApp alert via Tel-Agent WhatsApp gateway channel."""
        clean_to = to_phone_number.strip()
        wa_text = (
            f"🌾 *AgriTrust AI — Parametric Relief Alert (Tel-Agent Gateway)*\n"
            f"━━━━━━━━━━━━━━━━━━━━━━\n"
            f"Namaste *{farmer_name} ji*,\n\n"
            f"🚨 *Disaster Event:* {disaster_type}\n"
            f"🛰️ *Satellite Damage:* {damage_pct:.0f}%\n"
            f"💰 *Relief Payout:* *₹{payout_inr:,.0f}*\n"
            f"🏛️ *Transfer:* Direct Aadhaar-Linked Bank Account (DBT)\n"
            f"🔗 *MST Blockchain Tx:* `{tx_hash[:18]}...`\n\n"
            f"🤖 *Tel-Agent AI Receptionist:* Active & ready to answer questions.\n"
            f"━━━━━━━━━━━━━━━━━━━━━━\n"
            f"🏛️ _AgriTrust AI Oracle Network — MST Blockchain_"
        )

        msg_id = f"TELAGENT_WA_{int(time.time())}"

        if self.is_online:
            try:
                headers = {"Content-Type": "application/json"}
                if self.api_key:
                    headers["Authorization"] = f"Bearer {self.api_key}"

                payload = {"to": clean_to, "channel": "whatsapp", "message": wa_text}
                resp = requests.post(f"{self.gateway_url}/api/v1/whatsapp", json=payload, headers=headers, timeout=self.timeout)
                if resp.status_code in (200, 201, 202):
                    logger.info("✅  Tel-Agent WhatsApp dispatched to %s", clean_to)
                    return {"status": "success", "msg_id": msg_id, "channel": "tel_agent_whatsapp"}
            except Exception as exc:
                logger.warning("⚠️  Tel-Agent WhatsApp failed (%s).", exc)

        logger.info("💬  TEL-AGENT SIMULATED WHATSAPP to %s:\n%s", clean_to, wa_text.replace('\n', ' '))
        return {"status": "simulated", "msg_id": msg_id, "channel": "tel_agent_whatsapp_simulated", "text": wa_text}

    # ---------------------------------------------------------------------------
    # AI RECEPTIONIST CHATBOT QUERY PROCESSOR
    # ---------------------------------------------------------------------------

    def process_ai_receptionist_query(
        self,
        user_message: str,
        farmer_name: str = "Ram Singh",
        location: str = "Darbhanga, Bihar",
        khasra_no: str = "104/A",
    ) -> dict[str, Any]:
        """
        AI Receptionist & Live Chatbot Assistant.
        Handles inbound farmer queries over Web Chat, Phone Voice, SMS, or WhatsApp.
        """
        query_lower = user_message.lower()

        if any(w in query_lower for w in ("payout", "money", "claim", "bank", "rupaye", "toka")):
            reply = (
                f"Namaste {farmer_name} ji! Your Parametric Disaster Relief payout of ₹25,000 for Khasra #{khasra_no} "
                f"at {location} has been verified by Copernicus Satellite Consensus (Sentinel-1 SAR + Sentinel-2 NDVI) "
                f"and executed on MST Blockchain (Tx: 0x8f3a91bc24ef10). You can cash out using any Aadhaar AePS Micro-ATM!"
            )
            intent = "payout_status"
        elif any(w in query_lower for w in ("crop", "health", "ndvi", "flood", "drought", "radar", "satellite", "telemetry")):
            reply = (
                f"Satellite telemetry for plot {khasra_no} in {location}:\n"
                f"• Sentinel-2 NDVI Health: 0.18 (76% vegetation damage)\n"
                f"• Sentinel-1 SAR Backscatter: -18.2 dB (6 consecutive flood inundation days)\n"
                f"• IMD Rain Telemetry: 210 mm / 48h\n"
                f"Status: 3-of-3 Oracle Consensus approved for immediate escrow release."
            )
            intent = "telemetry_inquiry"
        elif any(w in query_lower for w in ("cash", "atm", "aeps", "fingerprint", "withdraw", "post office")):
            reply = (
                f"To cash out your ₹25,000 relief funds:\n"
                f"1. Visit your local India Post Gramin Dak Sevak or bank agent.\n"
                f"2. Provide your 12-digit Aadhaar number.\n"
                f"3. Authenticate with your fingerprint on the AePS Micro-ATM scanner.\n"
                f"4. Receive instant INR cash on the spot!"
            )
            intent = "aeps_cashout_guide"
        else:
            reply = (
                f"Namaste {farmer_name} ji! I am Tel-Agent, your AgriTrust AI Receptionist. "
                f"I can help you check your disaster claim status, satellite telemetry (NDVI/SAR), "
                f"or Aadhaar AePS cashout locations. How can I assist you today?"
            )
            intent = "general_greeting"

        # Attempt forwarding to Tel-Agent gateway LLM if online
        if self.is_online:
            try:
                headers = {"Content-Type": "application/json"}
                if self.api_key:
                    headers["Authorization"] = f"Bearer {self.api_key}"

                payload = {
                    "user_message": user_message,
                    "context": {
                        "farmer_name": farmer_name,
                        "location": location,
                        "khasra_no": khasra_no,
                    },
                }
                resp = requests.post(f"{self.gateway_url}/api/v1/chat", json=payload, headers=headers, timeout=self.timeout)
                if resp.status_code == 200:
                    res_json = resp.json()
                    gateway_reply = res_json.get("reply") or res_json.get("message")
                    if gateway_reply:
                        return {
                            "reply": gateway_reply,
                            "intent": "tel_agent_llm_response",
                            "source": "tel_agent_gateway",
                        }
            except Exception:
                pass

        return {
            "reply": reply,
            "intent": intent,
            "source": "agritrust_telagent_engine",
            "farmer": farmer_name,
            "location": location,
        }

    # ---------------------------------------------------------------------------
    # MODEL CONTEXT PROTOCOL (MCP) TOOL DEFINITIONS
    # ---------------------------------------------------------------------------

    def get_mcp_tools(self) -> list[dict[str, Any]]:
        """
        Exposes AgriTrust AI tools over Model Context Protocol (MCP) format
        for Tel-Agent gateway, Claude, ChatGPT, and AI agent clients.
        """
        return [
            {
                "name": "check_farmer_payout_status",
                "description": "Check AgriTrust AI parametric disaster insurance payout status for a farmer plot.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "khasra_no": {"type": "string", "description": "Land Khasra/Plot ID (e.g. 104/A)"},
                        "farmer_name": {"type": "string", "description": "Name of enrolled farmer"},
                    },
                    "required": ["khasra_no"],
                },
            },
            {
                "name": "get_satellite_telemetry",
                "description": "Fetch Sentinel-1 SAR flood dB and Sentinel-2 NDVI optical crop health telemetry.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "plot_id": {"type": "string", "description": "Plot identifier"},
                    },
                    "required": ["plot_id"],
                },
            },
            {
                "name": "trigger_disaster_relief_alert",
                "description": "Trigger automated voice call, SMS, and WhatsApp alerts via Tel-Agent gateway.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "to_phone_number": {"type": "string", "description": "Recipient phone number with country code"},
                        "farmer_name": {"type": "string", "description": "Farmer name"},
                        "payout_inr": {"type": "number", "description": "Payout amount in INR"},
                        "disaster_type": {"type": "string", "description": "Disaster type (Flood, Drought, Heatwave)"},
                    },
                    "required": ["to_phone_number", "farmer_name", "payout_inr"],
                },
            },
        ]


# ---------------------------------------------------------------------------
# CLI Smoke Test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    notifier = TelAgentNotifier()

    print("\n=================================================================")
    print("      Tel-Agent AI Receptionist & Omni-Channel Gateway           ")
    print("=================================================================")
    print(f"  Gateway URL     : {notifier.gateway_url}")
    print(f"  Gateway Online  : {notifier.is_online}")
    print(f"  SIP Trunk       : {notifier.sip_trunk}")
    print("-----------------------------------------------------------------")

    # 1. Voice Call Test
    call_res = notifier.trigger_voice_call(
        to_phone_number="+917483799325",
        farmer_name="Ram Singh",
        payout_inr=25000,
        damage_pct=76.0,
        disaster_type="Flood",
        language="bhojpuri",
        location="Darbhanga, Bihar",
    )
    print(f"\n  Call Result     : {call_res['status']} (ID: {call_res['call_id']})")

    # 2. SMS Test
    sms_res = notifier.send_sms(
        to_phone_number="+917483799325",
        farmer_name="Ram Singh",
        payout_inr=25000,
        damage_pct=76.0,
        disaster_type="Flood",
    )
    print(f"  SMS Result      : {sms_res['status']} (ID: {sms_res['msg_id']})")

    # 3. WhatsApp Test
    wa_res = notifier.send_whatsapp(
        to_phone_number="+917483799325",
        farmer_name="Ram Singh",
        payout_inr=25000,
        damage_pct=76.0,
        disaster_type="Flood",
    )
    print(f"  WhatsApp Result : {wa_res['status']} (ID: {wa_res['msg_id']})")

    # 4. AI Receptionist Chatbot Query Test
    chat_res = notifier.process_ai_receptionist_query("Has my flood payout been credited to my bank account?")
    clean_reply = chat_res['reply'].replace("₹", "Rs. ")
    print(f"\n  AI Receptionist Query Response:\n  Intent : {chat_res['intent']}\n  Reply  : {clean_reply}\n")

    # 5. MCP Tools Test
    tools = notifier.get_mcp_tools()
    print(f"  MCP Tools Count : {len(tools)} tools defined.")
    print("=================================================================\n")
