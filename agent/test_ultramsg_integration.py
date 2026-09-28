"""
test_ultramsg_integration.py
=============================
Quick test script to verify UltraMsg WhatsApp integration with +919996902657

Usage:
    python agent/test_ultramsg_integration.py
"""

import sys
from pathlib import Path

# Add agent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from voice_notifier import VoiceNotifier

def test_ultramsg_configuration():
    """Test if UltraMsg is properly configured"""
    print("\n" + "=" * 70)
    print("🧪  AgriTrust AI — UltraMsg WhatsApp Integration Test")
    print("=" * 70)
    
    notifier = VoiceNotifier(enable_audio=False)
    
    print(f"\n✅ UltraMsg Configured: {notifier.ultramsg_configured}")
    print(f"✅ Twilio Configured: {notifier.twilio_configured}")
    print(f"✅ UltraMsg Instance ID: {notifier._ultramsg_instance_id}")
    print(f"✅ UltraMsg WhatsApp Number: {notifier._ultramsg_whatsapp_number or 'Not set (will use TWILIO_VERIFIED_TO_NUMBER)'}")
    
    if notifier.ultramsg_configured:
        print("\n" + "=" * 70)
        print("📲  Sending Test WhatsApp Alert to +919996902657...")
        print("=" * 70)
        
        result = notifier.send_whatsapp_ultramsg(
            to_phone_number="+919996902657",
            farmer_name="Test Farmer",
            payout_inr=25000,
            damage_pct=75.0,
            disaster_type="Flood",
            language="hindi",
            tx_hash="0xTEST123456789ABCDEF",
        )
        
        print("\n📊 Result:")
        print(f"   {result}")
        
        if result and isinstance(result, dict) and result.get("status") != "simulated":
            print("\n✅ SUCCESS! WhatsApp message sent via UltraMsg!")
            print(f"   Message ID: {result.get('id', 'N/A')}")
        elif result and result.get("status") == "simulated":
            print("\n⚠️  SIMULATED MODE (credentials not configured)")
        else:
            print("\n❌ FAILED! Check your UltraMsg credentials.")
    else:
        print("\n⚠️  UltraMsg not configured. Add credentials to agent/config/.env:")
        print("     ULTRAMSG_INSTANCE_ID=your_instance_id")
        print("     ULTRAMSG_TOKEN=your_token")
        print("     ULTRAMSG_WHATSAPP_NUMBER=+919996902657")
    
    print("\n" + "=" * 70)
    print("🎯  Testing Automated Dual Alert (Voice + WhatsApp)...")
    print("=" * 70)
    
    result = notifier.trigger_automated_payout_alert(
        to_phone_number="+919996902657",
        farmer_name="Ram Singh",
        payout_inr=25000,
        damage_pct=76.0,
        disaster_type="Flood",
        language="hindi",
        location="Darbhanga, Bihar",
        tx_hash="0xABCDEF1234567890",
    )
    
    print("\n📊 Automated Alert Result:")
    print(f"   Voice Call SID: {result.get('call_sid', 'N/A')}")
    print(f"   WhatsApp: {result.get('whatsapp', 'N/A')}")
    
    print("\n" + "=" * 70)
    print("✅  Integration test complete!")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    test_ultramsg_configuration()
