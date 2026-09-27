"""Twilio live call test — trial account compatible."""
import sys, os
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

from twilio.rest import Client

sid   = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
token = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
from_ = os.getenv("TWILIO_PHONE_NUMBER", "").strip()
to    = "+917483799325"  # your verified number

print(f"SID   : {sid[:12]}...")
print(f"From  : {from_}")
print(f"To    : {to}")

twiml = "<Response><Say>Namaste! AgriTrust AI Satellite has confirmed 76 percent flood damage on your farm. Relief payout of 25000 rupees has been sent to your bank account. Thank you.</Say></Response>"
import urllib.parse
encoded_twiml = urllib.parse.quote(twiml)
twimlet_url = f"http://twimlets.com/echo?Twiml={encoded_twiml}"

client = Client(sid, token)
try:
    call = client.calls.create(
        url=twimlet_url,
        to=to,
        from_=from_
    )
    print(f"\nCall placed successfully!")
    print(f"Call SID : {call.sid}")
    print(f"Status   : {call.status}")
    print(f"\nYour phone should ring in ~5 seconds!")

except Exception as e:
    err = str(e)
    print(f"\nError: {err}")
    if "21608" in err or "unverified" in err.lower():
        print("\nFix: Your number is not verified.")
        print("Go to: twilio.com -> Phone Numbers -> Verified Caller IDs")
        print(f"Add: {to}")
    elif "trial" in err.lower():
        print("\nTrial restriction — upgrade at twilio.com/console/billing")
    elif "21219" in err:
        print("\nFix: Number not in E.164 format. Use +91XXXXXXXXXX")
