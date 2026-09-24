import os
from pathlib import Path
from dotenv import load_dotenv
from twilio.rest import Client

load_dotenv(Path("agent/config/.env"))

sid = os.getenv("TWILIO_ACCOUNT_SID")
token = os.getenv("TWILIO_AUTH_TOKEN")
from_ = os.getenv("TWILIO_PHONE_NUMBER")
to = "+917483799325"

client = Client(sid, token)

# Clean simple TwiML XML
twiml_content = """<Response>
<Say voice="Polly.Aditi" language="hi-IN">Namaste Ram Singh ji! AgriTrust AI Satellite ne aapke khet mein 76 percent flood damage confirm kiya hai. 25000 rupees aapke bank khate mein bhej diya gaya hai. Dhanyavaad.</Say>
</Response>"""

print("Attempting call with official Twilio demo URL...")
try:
    call = client.calls.create(
        url="http://demo.twilio.com/docs/voice.xml",
        to=to,
        from_=from_
    )
    print("SUCCESS! Call SID:", call.sid)
except Exception as e:
    print("Error with demo url:", e)
