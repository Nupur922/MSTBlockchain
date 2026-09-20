"""
api_test.py
===========
AgriTrust AI — Live API Key Verification Script

Run this BEFORE your hackathon demo to verify every API is working.
Takes ~30 seconds to complete.

Usage:
    python agent/config/api_test.py

Expected output if everything is configured:
    ✅ Copernicus OAuth2   — Token acquired
    ✅ Sentinel-2 NDVI     — NDVI=0.xxxx (LIVE)
    ✅ Sentinel-1 SAR      — Mean=-x.x dB (LIVE)
    ✅ OpenWeatherMap Rain  — xx.x mm / 48h (LIVE)
    ✅ Web3 / MST Node     — Connected / DEMO mode

Author : Developer 2 — NEWRRO AI & Satellite Oracle Lead
Project: AgriTrust AI — MST Blockchain Buildathon
"""

from __future__ import annotations

import os
import sys
import time
from pathlib import Path

# Add agent/ to path so we can import our modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv

# Load .env from agent/config/.env
_ENV = Path(__file__).parent / ".env"
if not _ENV.exists():
    print(f"""
❌  ERROR: .env file not found at {_ENV}

Please create it:
    copy agent\\config\\.env.example agent\\config\\.env
    (then fill in your API keys)
""")
    sys.exit(1)

load_dotenv(dotenv_path=_ENV)

# ---------------------------------------------------------------------------
# Test helpers
# ---------------------------------------------------------------------------

PASS = "✅"
FAIL = "❌"
WARN = "⚠️ "

# Darbhanga Bihar farm polygon (small 1km² area for fast API calls)
TEST_POLYGON = {
    "type": "Polygon",
    "coordinates": [
        [
            [85.8977, 26.1234],
            [85.9023, 26.1234],
            [85.9023, 26.1189],
            [85.8977, 26.1189],
            [85.8977, 26.1234],
        ]
    ],
}
TEST_LAT = 26.1211
TEST_LON = 85.9000

results = []


def check(label: str, ok: bool, detail: str = "") -> None:
    icon = PASS if ok else FAIL
    line = f"  {icon}  {label:<35} {detail}"
    print(line)
    results.append((label, ok))


# ---------------------------------------------------------------------------
# TEST 1: .env key presence
# ---------------------------------------------------------------------------
print("\n" + "═" * 60)
print("  AgriTrust AI — Live API Verification")
print("═" * 60)
print("\n📋  Step 1: Checking .env key presence…\n")

client_id     = os.getenv("COPERNICUS_CLIENT_ID", "")
client_secret = os.getenv("COPERNICUS_CLIENT_SECRET", "")
owm_key       = os.getenv("OPENWEATHER_API_KEY", "")
oracle_pk     = os.getenv("ORACLE_PRIVATE_KEY", "")
rpc_url       = os.getenv("MST_RPC_URL", "http://127.0.0.1:8545")

check("COPERNICUS_CLIENT_ID set",
      bool(client_id and client_id != "your_client_id_here"),
      f"= {client_id[:8]}…" if client_id and client_id != "your_client_id_here" else "NOT SET")

check("COPERNICUS_CLIENT_SECRET set",
      bool(client_secret and client_secret != "your_client_secret_here"),
      "= ****…" if client_secret and client_secret != "your_client_secret_here" else "NOT SET")

check("OPENWEATHER_API_KEY set",
      bool(owm_key and owm_key != "your_openweathermap_api_key_here"),
      f"= {owm_key[:8]}…" if owm_key and owm_key != "your_openweathermap_api_key_here" else "NOT SET")

check("ORACLE_PRIVATE_KEY set",
      bool(oracle_pk and oracle_pk.startswith("0x")),
      f"= 0x{oracle_pk[2:10]}…" if oracle_pk else "NOT SET")


# ---------------------------------------------------------------------------
# TEST 2: Copernicus OAuth2 Token
# ---------------------------------------------------------------------------
print("\n📋  Step 2: Copernicus OAuth2 Token…\n")

copernicus_session = None
if client_id and client_id != "your_client_id_here":
    try:
        from oauthlib.oauth2 import BackendApplicationClient
        from requests_oauthlib import OAuth2Session

        TOKEN_URL = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"

        client  = BackendApplicationClient(client_id=client_id)
        session = OAuth2Session(client=client)

        def _hook(resp):
            resp.raise_for_status()
            return resp
        session.register_compliance_hook("access_token_response", _hook)

        t0    = time.time()
        token = session.fetch_token(
            token_url=TOKEN_URL,
            client_id=client_id,
            client_secret=client_secret,
            include_client_id=True,
        )
        elapsed = round((time.time() - t0) * 1000)
        copernicus_session = session
        check(
            "Copernicus OAuth2 token",
            True,
            f"acquired in {elapsed}ms  (expires in {token.get('expires_in', '?')}s)",
        )
    except Exception as e:
        check("Copernicus OAuth2 token", False, f"ERROR: {e}")
else:
    check("Copernicus OAuth2 token", False, "Skipped — no credentials in .env")


# ---------------------------------------------------------------------------
# TEST 3: Sentinel-2 Statistics API (NDVI)
# ---------------------------------------------------------------------------
print("\n📋  Step 3: Sentinel-2 Live NDVI…\n")

if copernicus_session:
    try:
        from satellite_fetcher import SatelliteFetcher
        fetcher = SatelliteFetcher(client_id=client_id, client_secret=client_secret)

        t0      = time.time()
        optical = fetcher.fetch_sentinel2_optical(TEST_POLYGON, plot_id="API_TEST_S2", days_back=45)
        elapsed = round((time.time() - t0) * 1000)

        is_live = optical.data_source == "live"
        check(
            "Sentinel-2 NDVI",
            is_live,
            f"NDVI={optical.ndvi:.4f}  RED={optical.red_band4:.4f}  NIR={optical.nir_band8:.4f}"
            f"  Cloud={optical.cloud_coverage_pct:.0f}%  [{optical.data_source.upper()}]  {elapsed}ms",
        )
        if not is_live:
            print(f"       ↳ Returned simulated data — check credentials or try a wider date range")
    except Exception as e:
        check("Sentinel-2 NDVI", False, f"ERROR: {e}")
else:
    check("Sentinel-2 NDVI", False, "Skipped — no OAuth2 session")


# ---------------------------------------------------------------------------
# TEST 4: Sentinel-1 SAR Statistics API
# ---------------------------------------------------------------------------
print("\n📋  Step 4: Sentinel-1 SAR Backscatter…\n")

if copernicus_session:
    try:
        t0   = time.time()
        sar  = fetcher.fetch_sentinel1_sar(TEST_POLYGON, plot_id="API_TEST_S1", days_back=60)
        elapsed = round((time.time() - t0) * 1000)

        is_live = sar.data_source == "live"
        flooded_count = sum(1 for db in sar.backscatter_db_series if db < -15.0)
        check(
            "Sentinel-1 SAR",
            is_live,
            f"Mean={sar.mean_backscatter_db:.2f} dB  "
            f"Acquisitions={len(sar.backscatter_db_series)}  "
            f"Flooded(<-15dB)={flooded_count}  "
            f"[{sar.data_source.upper()}]  {elapsed}ms",
        )
        if not is_live:
            print(f"       ↳ Returned simulated data — check credentials")
    except Exception as e:
        check("Sentinel-1 SAR", False, f"ERROR: {e}")
else:
    check("Sentinel-1 SAR", False, "Skipped — no OAuth2 session")


# ---------------------------------------------------------------------------
# TEST 5: OpenWeatherMap Rain API
# ---------------------------------------------------------------------------
print("\n📋  Step 5: OpenWeatherMap Rain (48h)…\n")

if owm_key and owm_key != "your_openweathermap_api_key_here":
    try:
        from oracle_consensus import RainTelemetryClient
        rain_client = RainTelemetryClient(api_key=owm_key)

        t0       = time.time()
        rain_mm  = rain_client.fetch_rainfall_48h(TEST_LAT, TEST_LON)
        elapsed  = round((time.time() - t0) * 1000)
        is_live  = rain_mm > 0 or True  # Any response = success

        import requests as _req
        # Verify it actually hit the API by checking if the key is valid
        resp = _req.get(
            "https://api.openweathermap.org/data/2.5/weather",
            params={"lat": TEST_LAT, "lon": TEST_LON, "appid": owm_key},
            timeout=10,
        )
        api_ok = resp.status_code == 200
        city   = resp.json().get("name", "Unknown") if api_ok else "N/A"

        check(
            "OpenWeatherMap Rain",
            api_ok,
            f"{rain_mm:.1f} mm / 48h  Location: {city}  [{elapsed}ms]",
        )
        if not api_ok:
            print(f"       ↳ HTTP {resp.status_code}: {resp.json().get('message', '')}")
    except Exception as e:
        check("OpenWeatherMap Rain", False, f"ERROR: {e}")
else:
    check("OpenWeatherMap Rain", False, "Skipped — OPENWEATHER_API_KEY not in .env")


# ---------------------------------------------------------------------------
# TEST 6: Web3 / MST Blockchain Node
# ---------------------------------------------------------------------------
print("\n📋  Step 6: MST Blockchain Node…\n")

try:
    from web3 import Web3
    w3        = Web3(Web3.HTTPProvider(rpc_url, request_kwargs={"timeout": 5}))
    connected = w3.is_connected()
    if connected:
        chain_id  = w3.eth.chain_id
        block_num = w3.eth.block_number
        check(
            "MST Blockchain Node",
            True,
            f"Connected | Chain ID: {chain_id} | Block: {block_num} | RPC: {rpc_url}",
        )
    else:
        check(
            "MST Blockchain Node",
            None,  # Not a failure for this test — Dev 1 hasn't deployed yet
            f"OFFLINE (expected until Dev 1 runs: npx hardhat node) | URL: {rpc_url}",
        )
except ImportError:
    check("MST Blockchain Node", False, "web3 not installed — run: pip install web3")
except Exception as e:
    check(
        "MST Blockchain Node",
        None,
        f"OFFLINE — {e} | Agent will run in DEMO mode",
    )


# ---------------------------------------------------------------------------
# TEST 7: EIP-191 Proof Signer (always works — pure crypto)
# ---------------------------------------------------------------------------
print("\n📋  Step 7: EIP-191 Proof Signer (crypto)…\n")

try:
    from proof_signer import EIP191ProofSigner
    signer = EIP191ProofSigner(private_key=oracle_pk if oracle_pk else None)
    proof  = signer.sign_disaster_proof(plot_id=1, payout_amount_wei=25_000 * 10**18, chain_id=31337)
    valid  = signer.verify_proof(proof)
    check(
        "EIP-191 Proof Signer",
        valid,
        f"Signer: {signer.address[:12]}…  Sig: {proof.signature_hex[:16]}…  v={proof.v}",
    )
except Exception as e:
    check("EIP-191 Proof Signer", False, f"ERROR: {e}")


# ---------------------------------------------------------------------------
# SUMMARY
# ---------------------------------------------------------------------------
print()
print("═" * 60)
passed  = sum(1 for _, ok in results if ok is True)
warned  = sum(1 for _, ok in results if ok is None)
failed  = sum(1 for _, ok in results if ok is False)
total   = len(results)

print(f"  RESULTS: {passed} passed | {warned} warnings | {failed} failed | {total} total")
print("═" * 60)

# Critical checks
critical_passed = all(
    ok for label, ok in results
    if "OAuth2" in label or "NDVI" in label or "SAR" in label
)

if failed == 0 and critical_passed:
    print("\n  🎉 ALL CRITICAL APIS VERIFIED — Ready for hackathon demo!\n")
elif failed == 0:
    print("\n  ✅ Core APIs working. Some optional items need attention.\n")
else:
    print("\n  ❌ Some APIs need fixing before the demo. See FAILED items above.\n")
    print("  📖 Setup guide:")
    if not os.getenv("COPERNICUS_CLIENT_ID") or os.getenv("COPERNICUS_CLIENT_ID") == "your_client_id_here":
        print("     Copernicus: https://dataspace.copernicus.eu → Dashboard → OAuth Clients")
    if not os.getenv("OPENWEATHER_API_KEY") or os.getenv("OPENWEATHER_API_KEY") == "your_openweathermap_api_key_here":
        print("     OpenWeather: https://openweathermap.org/api → Sign Up → API Keys")
    print()

sys.exit(0 if failed == 0 else 1)
