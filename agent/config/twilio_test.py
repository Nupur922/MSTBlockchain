"""Quick Twilio live call test."""
import sys, os
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

from twilio.rest import Client

sid   = os.getenv("TWILIO_ACCOUNT_SID")
token = os.getenv("TWILIO_AUTH_TOKEN")
from_ = os.getenv("TWILIO_PHONE_NUMBER")

print(f"SID   : {sid[:12]}...")
print(f"From  : {from_}")

client = Client(sid, token)

twiml = "<Response><Say voice=\"alice\" language=\"en-IN\">Namaste! AgriTrust AI Satellite has confirmed 76 percent flood damage on your farm plot in Darbhanga Bihar. A relief payout of 25000 rupees has been transferred to your bank account. Thank you.</Say></Response>"

try:
    call = client.calls.create(twiml=twiml, to=from_, from_=from_)
    print(f"\n  Call placed!")
    print(f"    Call SID : {call.sid}")
    print(f"    Status   : {call.status}")
except Exception as e:
    print(f"\n  Error: {str(e)}")
    if "unverified" in str(e).lower() or "21219" in str(e) or "21608" in str(e):
        print("\n  TRIAL ACCOUNT RESTRICTION:")
        print("  Twilio trial only allows calls to VERIFIED numbers.")
        print("  Fix: twilio.com -> Phone Numbers -> Verified Caller IDs -> Add your number")
    elif "21210" in str(e):
        print("\n  Cannot call the same number you are calling from.")
        print("  Fix: Change 'to' to your personal phone number.")
