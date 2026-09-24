import os
from pathlib import Path
from dotenv import load_dotenv
from twilio.rest import Client

load_dotenv(Path("agent/config/.env"))

sid = os.getenv("TWILIO_ACCOUNT_SID")
token = os.getenv("TWILIO_AUTH_TOKEN")
from_num = os.getenv("TWILIO_PHONE_NUMBER")
to_num = "+917483799325"

client = Client(sid, token)

# Test 1: Plain simple SMS body
print("Attempting plain text SMS...")
try:
    msg = client.messages.create(
        body="AgriTrust AI: Namaste Ram Singh ji, 76 percent flood damage confirmed. Rs 25000 transferred to your bank account.",
        to=to_num,
        from_=from_num
    )
    print("SMS SUCCESS! SID:", msg.sid)
except Exception as e:
    print("SMS Error:", e)

# Test 2: WhatsApp Sandbox
print("\nAttempting WhatsApp Message...")
try:
    wa_msg = client.messages.create(
        body="🌾 *AgriTrust AI Relief Alert*\nNamaste Ram Singh ji, 76% flood damage confirmed. Payout: ₹25,000 transferred to your bank account!",
        from_="whatsapp:+14155238886",
        to=f"whatsapp:{to_num}"
    )
    print("WhatsApp SUCCESS! SID:", wa_msg.sid)
except Exception as e:
    print("WhatsApp Error:", e)
