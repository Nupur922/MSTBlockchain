"""
test_agent.py
=============
Developer 2 | Day 4 Task — AgriTrust AI
Automated Test Suite — 100% Coverage Target

Tests:
  ✅ T01: NDVI calculation correctness
  ✅ T02: NDVI edge cases (zero denominator, negative values)
  ✅ T03: SAR flood duration detection
  ✅ T04: Crop loss evaluation
  ✅ T05: 2-of-3 consensus — approved (3/3 votes)
  ✅ T06: 2-of-3 consensus — approved (2/3 votes)
  ✅ T07: 2-of-3 consensus — rejected (1/3 votes)
  ✅ T08: 2-of-3 consensus — rejected (0/3 votes)
  ✅ T09: EIP-191 signature generation
  ✅ T10: EIP-191 signature verification (valid)
  ✅ T11: EIP-191 signature verification (tampered — should fail)
  ✅ T12: ABI-packed keccak256 matches Solidity encoding
  ✅ T13: Satellite fetcher offline fallback (simulated)
  ✅ T14: Voice notifier message generation (all 4 languages)
  ✅ T15: Scenario simulator — baseline healthy (no payout)
  ✅ T16: Scenario simulator — Assam flood (payout approved)
  ✅ T17: Scenario simulator — Bihar flood (payout approved)
  ✅ T18: SentinelAgent single monitoring cycle (demo mode)
  ✅ T19: Web3 connection attempt (graceful offline handling)
  ✅ T20: Consensus verified_damage_pct range validation

Run:
    python agent/test_agent.py

Author : Developer 2 — NEWRRO AI & Satellite Oracle Lead
Project: AgriTrust AI — MST Blockchain Buildathon
"""

from __future__ import annotations

import sys
import os
import time
import traceback
from dataclasses import dataclass
from typing import Callable

# Ensure the agent/ directory is on the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# ---------------------------------------------------------------------------
# Minimal test runner (no external frameworks needed)
# ---------------------------------------------------------------------------

@dataclass
class TestResult:
    name: str
    passed: bool
    message: str
    duration_ms: float


class TestRunner:
    def __init__(self):
        self.results: list[TestResult] = []

    def run(self, name: str, fn: Callable) -> TestResult:
        """Execute a single test function and record the result."""
        start = time.perf_counter()
        try:
            fn()
            duration = (time.perf_counter() - start) * 1000
            result = TestResult(name=name, passed=True, message="OK", duration_ms=duration)
        except AssertionError as e:
            duration = (time.perf_counter() - start) * 1000
            result = TestResult(name=name, passed=False, message=f"ASSERT: {e}", duration_ms=duration)
        except Exception as e:
            duration = (time.perf_counter() - start) * 1000
            tb = traceback.format_exc().strip().split("\n")[-1]
            result = TestResult(name=name, passed=False, message=f"ERROR: {tb}", duration_ms=duration)
        self.results.append(result)
        status = "✅ PASS" if result.passed else "❌ FAIL"
        print(f"  {status}  [{duration:.1f}ms]  {name}")
        if not result.passed:
            print(f"         └─ {result.message}")
        return result

    def summary(self) -> bool:
        """Print summary and return True if all tests passed."""
        total  = len(self.results)
        passed = sum(1 for r in self.results if r.passed)
        failed = total - passed
        total_ms = sum(r.duration_ms for r in self.results)

        print()
        print("═" * 65)
        print(f"  TEST SUMMARY: {passed}/{total} passed | {failed} failed | {total_ms:.0f}ms")
        print("═" * 65)

        if failed > 0:
            print("\n  FAILED TESTS:")
            for r in self.results:
                if not r.passed:
                    print(f"  ❌  {r.name}")
                    print(f"      └─ {r.message}")
        else:
            print("\n  🎉 ALL TESTS PASSED — Developer 2 pipeline is 100% verified!")

        return failed == 0


# ============================================================================
# TEST IMPLEMENTATIONS
# ============================================================================

runner = TestRunner()


# ---------------------------------------------------------------------------
# T01: NDVI calculation correctness
# ---------------------------------------------------------------------------
def t01_ndvi_basic():
    from ndvi_calculator import NDVICalculator, NDVIResult
    calc = NDVICalculator()
    result = calc.calculate_ndvi(nir=0.45, red=0.10)
    assert isinstance(result, NDVIResult), "Should return NDVIResult for scalar input"
    expected = (0.45 - 0.10) / (0.45 + 0.10)
    assert abs(result.ndvi - expected) < 1e-6, f"Expected {expected:.6f}, got {result.ndvi:.6f}"
    assert result.classification in ("HEALTHY_CROP", "DENSE_CROP", "MODERATE_VEG")


# ---------------------------------------------------------------------------
# T02: NDVI edge cases
# ---------------------------------------------------------------------------
def t02_ndvi_edge_cases():
    from ndvi_calculator import NDVICalculator
    import numpy as np
    calc = NDVICalculator()

    # Zero denominator — should return 0.0, not crash
    result = calc.calculate_ndvi(nir=0.0, red=0.0)
    assert result.ndvi == 0.0, f"Zero denominator should give NDVI=0.0, got {result.ndvi}"

    # Pure water (very low NIR, higher RED) → negative NDVI
    result = calc.calculate_ndvi(nir=0.02, red=0.15)
    assert result.ndvi < 0, f"Water body should have negative NDVI, got {result.ndvi}"

    # NDVI is always in [-1, 1]
    result = calc.calculate_ndvi(nir=0.90, red=0.01)
    assert -1.0 <= result.ndvi <= 1.0, f"NDVI out of range: {result.ndvi}"

    # Array input returns ndarray
    nir_arr = np.array([0.40, 0.55, 0.30])
    red_arr = np.array([0.08, 0.10, 0.20])
    arr_result = calc.calculate_ndvi(nir=nir_arr, red=red_arr)
    assert hasattr(arr_result, "__len__"), "Array input should return ndarray"
    assert len(arr_result) == 3


# ---------------------------------------------------------------------------
# T03: SAR flood duration
# ---------------------------------------------------------------------------
def t03_sar_flood_duration():
    from ndvi_calculator import NDVICalculator
    calc = NDVICalculator()

    # Assam Brahmaputra flood series — 3 consecutive flooded acquisitions = 18 days
    assam_series = [-8.5, -9.2, -16.1, -18.4, -19.0, -17.8, -16.5, -12.3, -9.1, -7.4]
    result = calc.calculate_sar_flood_duration(assam_series, threshold_db=-15.0)
    assert result.is_flood_event, "Assam flood series should trigger flood event"
    assert result.flood_days >= 18, f"Expected ≥18 flood days, got {result.flood_days}"
    assert result.severity in ("MODERATE", "SEVERE")

    # Dry land series — no flood
    dry_series = [-7.5, -6.8, -8.1, -7.3, -6.5, -7.0]
    dry_result = calc.calculate_sar_flood_duration(dry_series, threshold_db=-15.0)
    assert not dry_result.is_flood_event, "Dry series should not trigger flood event"
    assert dry_result.flood_days == 0
    assert dry_result.severity == "NONE"

    # Single flooded acquisition (6 days — just above threshold)
    borderline = [-8.0, -16.5, -7.0]  # 1 flooded = 6 days >= 3
    borderline_result = calc.calculate_sar_flood_duration(borderline)
    assert borderline_result.is_flood_event, "Single flooded acquisition (6 days) should trigger"


# ---------------------------------------------------------------------------
# T04: Crop loss evaluation
# ---------------------------------------------------------------------------
def t04_crop_loss():
    from ndvi_calculator import NDVICalculator
    calc = NDVICalculator()

    # Bihar Kosi flood: NDVI drop from 0.75 → 0.18 = 76% damage
    result = calc.evaluate_crop_loss(pre_ndvi=0.75, post_ndvi=0.18)
    expected_pct = (0.75 - 0.18) / 0.75 * 100
    assert abs(result.damage_pct - expected_pct) < 0.01, f"Damage% mismatch: {result.damage_pct}"
    assert result.payout_eligible, "76% damage should be payout-eligible"
    assert result.loss_severity in ("SEVERE", "TOTAL")

    # No change — 0% damage
    healthy = calc.evaluate_crop_loss(pre_ndvi=0.75, post_ndvi=0.75)
    assert healthy.damage_pct == 0.0
    assert not healthy.payout_eligible
    assert healthy.loss_severity == "NONE"

    # Improvement (post > pre) — clamp to 0%
    improved = calc.evaluate_crop_loss(pre_ndvi=0.50, post_ndvi=0.65)
    assert improved.damage_pct == 0.0, "Improvement should yield 0% damage"

    # Invalid pre_ndvi → should raise ValueError
    try:
        calc.evaluate_crop_loss(pre_ndvi=0.0, post_ndvi=0.30)
        assert False, "Should have raised ValueError for zero pre_ndvi"
    except ValueError:
        pass  # Expected


# ---------------------------------------------------------------------------
# T05: Oracle consensus — 3/3 all approve
# ---------------------------------------------------------------------------
def t05_consensus_3of3_approved():
    from oracle_consensus import MultiSourceConsensusEngine
    engine = MultiSourceConsensusEngine()
    result = engine.evaluate(
        plot_id="TEST_PLOT_3OF3",
        sar_flood_days=6,      # ≥3  ✅
        ndvi_loss_pct=76.0,    # ≥40 ✅
        rainfall_mm_48h=210.0, # ≥120 ✅
    )
    assert result.is_approved, "3/3 votes should approve"
    assert result.votes_for == 3
    assert result.consensus_score == 1.0
    assert result.verified_damage_pct > 0.0


# ---------------------------------------------------------------------------
# T06: Oracle consensus — 2/3 approve (SAR + Rain, NDVI borderline)
# ---------------------------------------------------------------------------
def t06_consensus_2of3_approved():
    from oracle_consensus import MultiSourceConsensusEngine
    engine = MultiSourceConsensusEngine()
    result = engine.evaluate(
        plot_id="TEST_PLOT_2OF3",
        sar_flood_days=5,      # ≥3  ✅
        ndvi_loss_pct=20.0,    # <40 ❌
        rainfall_mm_48h=150.0, # ≥120 ✅
    )
    assert result.is_approved, "2/3 votes should approve"
    assert result.votes_for == 2
    assert abs(result.consensus_score - 2/3) < 0.01


# ---------------------------------------------------------------------------
# T07: Oracle consensus — 1/3 rejected
# ---------------------------------------------------------------------------
def t07_consensus_1of3_rejected():
    from oracle_consensus import MultiSourceConsensusEngine
    engine = MultiSourceConsensusEngine()
    result = engine.evaluate(
        plot_id="TEST_PLOT_1OF3",
        sar_flood_days=1,      # <3  ❌
        ndvi_loss_pct=50.0,    # ≥40 ✅
        rainfall_mm_48h=80.0,  # <120 ❌
    )
    assert not result.is_approved, "1/3 votes should NOT approve"
    assert result.votes_for == 1


# ---------------------------------------------------------------------------
# T08: Oracle consensus — 0/3 rejected (healthy season)
# ---------------------------------------------------------------------------
def t08_consensus_0of3_rejected():
    from oracle_consensus import MultiSourceConsensusEngine
    engine = MultiSourceConsensusEngine()
    result = engine.evaluate(
        plot_id="TEST_PLOT_HEALTHY",
        sar_flood_days=0,
        ndvi_loss_pct=5.0,
        rainfall_mm_48h=30.0,
    )
    assert not result.is_approved, "0/3 votes should NOT approve"
    assert result.votes_for == 0
    assert result.verified_damage_pct == 0.0


# ---------------------------------------------------------------------------
# T09: EIP-191 signature generation
# ---------------------------------------------------------------------------
def t09_eip191_signature_generation():
    from proof_signer import EIP191ProofSigner, DisasterProof
    signer = EIP191ProofSigner()  # Uses Hardhat demo key

    proof = signer.sign_disaster_proof(
        plot_id=1,
        payout_amount_wei=25_000 * 10**18,
        chain_id=31337,
        timestamp=1700000000,
    )

    assert isinstance(proof, DisasterProof)
    assert proof.proof_hash.startswith("0x")
    assert len(proof.proof_hash) == 66, f"proof_hash should be 32 bytes hex, got {len(proof.proof_hash)} chars"
    assert proof.signature_hex.startswith("0x")
    assert len(proof.signature_hex) == 132, f"signature should be 65 bytes (130 hex + 0x), got {len(proof.signature_hex)}"
    assert proof.v in (27, 28), f"v should be 27 or 28, got {proof.v}"
    assert proof.plot_id == 1
    assert proof.payout_amount_wei == 25_000 * 10**18
    assert proof.chain_id == 31337
    assert proof.signer_address.startswith("0x")


# ---------------------------------------------------------------------------
# T10: EIP-191 signature verification (valid)
# ---------------------------------------------------------------------------
def t10_eip191_verification_valid():
    from proof_signer import EIP191ProofSigner
    signer = EIP191ProofSigner()

    proof = signer.sign_disaster_proof(
        plot_id=2,
        payout_amount_wei=18_000 * 10**18,
        chain_id=31337,
        timestamp=1700000500,
    )
    is_valid = signer.verify_proof(proof)
    assert is_valid, "Self-signed proof should verify successfully"


# ---------------------------------------------------------------------------
# T11: EIP-191 signature verification — tampered proof fails
# ---------------------------------------------------------------------------
def t11_eip191_verification_tampered():
    from proof_signer import EIP191ProofSigner
    import copy
    signer = EIP191ProofSigner()

    proof = signer.sign_disaster_proof(
        plot_id=3,
        payout_amount_wei=10_000 * 10**18,
        chain_id=31337,
    )

    # Tamper with payout amount — should cause verification to fail
    tampered = copy.copy(proof)
    tampered.payout_amount_wei = 999_999 * 10**18  # Inflated!
    is_valid = signer.verify_proof(tampered)
    assert not is_valid, "Tampered proof should NOT verify"


# ---------------------------------------------------------------------------
# T12: ABI-packed keccak256 determinism
# ---------------------------------------------------------------------------
def t12_keccak256_determinism():
    from proof_signer import EIP191ProofSigner
    signer = EIP191ProofSigner()

    # Same inputs must always produce the same hash
    h1 = signer.generate_proof_hash(1, 25_000 * 10**18, 1700000000, 31337)
    h2 = signer.generate_proof_hash(1, 25_000 * 10**18, 1700000000, 31337)
    assert h1 == h2, "Same inputs must produce identical proof hash"

    # Different inputs must produce different hashes
    h3 = signer.generate_proof_hash(2, 25_000 * 10**18, 1700000000, 31337)
    assert h1 != h3, "Different plot_id must produce different hash"

    h4 = signer.generate_proof_hash(1, 26_000 * 10**18, 1700000000, 31337)
    assert h1 != h4, "Different payout amount must produce different hash"

    assert len(h1) == 32, f"keccak256 should return 32 bytes, got {len(h1)}"


# ---------------------------------------------------------------------------
# T13: Satellite fetcher offline fallback
# ---------------------------------------------------------------------------
def t13_satellite_fetcher_offline():
    from satellite_fetcher import SatelliteFetcher, Sentinel2BandData, Sentinel1SARData

    fetcher = SatelliteFetcher(api_timeout=1)  # Very short timeout forces fallback

    geojson = {
        "type": "Polygon",
        "coordinates": [[[85.8977, 26.1234], [85.9123, 26.1234],
                          [85.9123, 26.1089], [85.8977, 26.1089],
                          [85.8977, 26.1234]]],
    }

    optical = fetcher.fetch_sentinel2_optical(geojson, plot_id="TEST_01")
    assert isinstance(optical, Sentinel2BandData)
    assert optical.data_source == "simulated"
    assert 0.0 <= optical.nir_band8 <= 1.0, f"NIR out of range: {optical.nir_band8}"
    assert 0.0 <= optical.red_band4 <= 1.0, f"RED out of range: {optical.red_band4}"

    sar = fetcher.fetch_sentinel1_sar(geojson, plot_id="TEST_01")
    assert isinstance(sar, Sentinel1SARData)
    assert sar.data_source == "simulated"
    assert len(sar.backscatter_db_series) > 0
    # All dB values should be realistic (typically -30 to 0 dB for land)
    for db in sar.backscatter_db_series:
        assert -40.0 <= db <= 5.0, f"Unrealistic SAR value: {db} dB"

    # Flood scenario simulation
    sar_flood = fetcher.fetch_sentinel1_sar(geojson, plot_id="TEST_01", scenario="flood")
    assert sar_flood.data_source == "simulated"
    # Flood scenario should contain values below -15 dB
    has_flood_values = any(db < -15.0 for db in sar_flood.backscatter_db_series)
    assert has_flood_values, "Flood scenario SAR should have values < -15 dB"


# ---------------------------------------------------------------------------
# T14: Voice notifier — all 4 languages
# ---------------------------------------------------------------------------
def t14_voice_notifier_all_languages():
    from voice_notifier import VoiceNotifier

    notifier = VoiceNotifier(enable_audio=False)

    test_params = {
        "farmer_name": "Ram Singh",
        "location": "Darbhanga, Bihar",
        "flood_days": 6,
        "payout_inr": 25_000,
        "approved": True,
    }

    for lang in ("hindi", "assamese", "bhojpuri", "english"):
        msg = notifier.generate_alert(language=lang, **test_params)
        assert isinstance(msg, str), f"Language {lang} should return string"
        assert len(msg) > 50, f"Language {lang} message too short: {msg}"
        # Farmer name should appear in message
        assert "Ram Singh" in msg, f"Farmer name not found in {lang} message"

    # Healthy season (no payout)
    healthy_msg = notifier.generate_alert(
        farmer_name="Bhupen Gogoi",
        location="Majuli",
        flood_days=0,
        payout_inr=0,
        language="assamese",
        approved=False,
    )
    assert isinstance(healthy_msg, str)
    assert len(healthy_msg) > 30

    # Unknown language falls back to Hindi (no crash)
    fallback_msg = notifier.generate_alert(
        farmer_name="Test",
        location="Test",
        flood_days=3,
        payout_inr=10000,
        language="punjabi",  # Unsupported
        approved=True,
    )
    assert isinstance(fallback_msg, str)
    assert len(fallback_msg) > 30

    # Broadcast all languages
    broadcasts = notifier.broadcast_all_languages(
        farmer_name="Suresh Yadav",
        location="Vaishali, Bihar",
        flood_days=5,
        payout_inr=18_000,
        approved=True,
    )
    assert len(broadcasts) == 4  # hindi, assamese, bhojpuri, english
    for lang, msg in broadcasts.items():
        assert isinstance(msg, str) and len(msg) > 30


# ---------------------------------------------------------------------------
# T15: Scenario simulator — baseline healthy
# ---------------------------------------------------------------------------
def t15_scenario_baseline_healthy():
    from scenario_simulator import ScenarioSimulator, ScenarioResult

    sim = ScenarioSimulator()
    result = sim.baseline_healthy()

    assert isinstance(result, ScenarioResult)
    assert result.ndvi_value >= 0.70, f"Healthy NDVI should be ≥0.70, got {result.ndvi_value}"
    assert result.sar_flood_days == 0
    assert not result.is_payout_approved, "Healthy season should NOT trigger payout"
    assert result.payout_mst_amount == 0.0
    assert "HEALTHY" in result.status


# ---------------------------------------------------------------------------
# T16: Scenario simulator — Assam Brahmaputra flood
# ---------------------------------------------------------------------------
def t16_scenario_assam_flood():
    from scenario_simulator import ScenarioSimulator

    sim = ScenarioSimulator()
    result = sim.assam_brahmaputra_flood()

    assert result.sar_flood_days == 6, f"Expected 6 flood days, got {result.sar_flood_days}"
    assert result.ndvi_value == 0.18, f"Expected NDVI 0.18, got {result.ndvi_value}"
    assert result.rainfall_mm_48h == 210.0
    assert result.is_payout_approved, "Assam flood should be approved"
    assert result.payout_mst_amount > 0
    assert result.consensus_score >= 2/3
    assert "ASSAM" in result.status
    assert result.proof_hash is not None, "Approved payout should have proof_hash"
    assert result.signature_hex is not None, "Approved payout should have signature"


# ---------------------------------------------------------------------------
# T17: Scenario simulator — Bihar Kosi flood
# ---------------------------------------------------------------------------
def t17_scenario_bihar_flood():
    from scenario_simulator import ScenarioSimulator

    sim = ScenarioSimulator()
    result = sim.bihar_kosi_flood()

    assert result.sar_flood_days == 4, f"Expected 4 flood days, got {result.sar_flood_days}"
    assert result.ndvi_value == 0.22, f"Expected NDVI 0.22, got {result.ndvi_value}"
    assert result.rainfall_mm_48h == 185.0
    assert result.is_payout_approved, "Bihar flood should be approved"
    assert result.payout_mst_amount > 0
    assert "BIHAR" in result.status
    assert result.proof_hash is not None


# ---------------------------------------------------------------------------
# T18: SentinelAgent — single cycle demo mode
# ---------------------------------------------------------------------------
def t18_sentinel_agent_demo_mode():
    from sentinel_agent import SentinelAgent

    agent = SentinelAgent()  # No RPC, no key, no contract addresses
    results = agent.run_once()

    assert isinstance(results, list), "run_once should return list"
    assert len(results) >= 1, "Should process at least 1 demo plot"

    for r in results:
        assert hasattr(r, "plot_id")
        assert hasattr(r, "ndvi_value")
        assert hasattr(r, "consensus_approved")
        assert -1.0 <= r.ndvi_value <= 1.0 or r.error is not None
        # TX hash in demo mode should be a string or None
        if r.tx_hash:
            assert isinstance(r.tx_hash, str)


# ---------------------------------------------------------------------------
# T19: Web3 connection — graceful offline handling
# ---------------------------------------------------------------------------
def t19_web3_offline_graceful():
    from sentinel_agent import SentinelAgent

    # Point to a port that will definitely be closed
    agent = SentinelAgent(rpc_url="http://127.0.0.1:19999")
    connected = agent._connect()
    # Should return False gracefully, not crash
    assert connected is False, "Offline node should return False, not raise exception"


# ---------------------------------------------------------------------------
# T20: Consensus damage_pct always in [0, 100]
# ---------------------------------------------------------------------------
def t20_consensus_damage_pct_range():
    from oracle_consensus import MultiSourceConsensusEngine

    engine = MultiSourceConsensusEngine()
    test_cases = [
        (0, 0.0, 0.0),
        (3, 40.0, 120.0),
        (10, 100.0, 400.0),  # Extreme values
        (1, 50.0, 50.0),
    ]
    for sar_days, ndvi_loss, rain in test_cases:
        result = engine.evaluate(
            plot_id=f"RANGE_TEST_{sar_days}",
            sar_flood_days=sar_days,
            ndvi_loss_pct=ndvi_loss,
            rainfall_mm_48h=rain,
        )
        assert 0.0 <= result.verified_damage_pct <= 100.0, (
            f"damage_pct={result.verified_damage_pct} out of range for "
            f"sar={sar_days}, ndvi={ndvi_loss}, rain={rain}"
        )
        assert 0.0 <= result.consensus_score <= 1.0


# ============================================================================
# MAIN
# ============================================================================

def main():
    print()
    print("╔══════════════════════════════════════════════════════════════╗")
    print("║      AgriTrust AI — Developer 2 Automated Test Suite        ║")
    print("║      NEWRRO AI & Satellite Oracle Engine                     ║")
    print("╚══════════════════════════════════════════════════════════════╝")
    print()

    tests = [
        ("T01: NDVI calculation correctness",                    t01_ndvi_basic),
        ("T02: NDVI edge cases (zero, negative, array)",         t02_ndvi_edge_cases),
        ("T03: SAR flood duration detection",                    t03_sar_flood_duration),
        ("T04: Crop loss evaluation",                            t04_crop_loss),
        ("T05: Consensus — 3/3 all approve",                     t05_consensus_3of3_approved),
        ("T06: Consensus — 2/3 approve (SAR+Rain)",              t06_consensus_2of3_approved),
        ("T07: Consensus — 1/3 rejected",                        t07_consensus_1of3_rejected),
        ("T08: Consensus — 0/3 rejected (healthy season)",       t08_consensus_0of3_rejected),
        ("T09: EIP-191 signature generation",                    t09_eip191_signature_generation),
        ("T10: EIP-191 signature verification (valid)",          t10_eip191_verification_valid),
        ("T11: EIP-191 verification (tampered — should fail)",   t11_eip191_verification_tampered),
        ("T12: keccak256 ABI-packed determinism",                t12_keccak256_determinism),
        ("T13: Satellite fetcher offline fallback",              t13_satellite_fetcher_offline),
        ("T14: Voice notifier — all 4 languages",                t14_voice_notifier_all_languages),
        ("T15: Scenario — baseline healthy (no payout)",         t15_scenario_baseline_healthy),
        ("T16: Scenario — Assam Brahmaputra flood",              t16_scenario_assam_flood),
        ("T17: Scenario — Bihar Kosi flood",                     t17_scenario_bihar_flood),
        ("T18: SentinelAgent single cycle (demo mode)",          t18_sentinel_agent_demo_mode),
        ("T19: Web3 offline — graceful connection failure",      t19_web3_offline_graceful),
        ("T20: Consensus damage_pct always in [0, 100]",         t20_consensus_damage_pct_range),
    ]

    print(f"  Running {len(tests)} tests…\n")

    all_passed = True
    for name, fn in tests:
        result = runner.run(name, fn)
        if not result.passed:
            all_passed = False

    success = runner.summary()

    # Exit with non-zero code if any tests failed (useful for CI)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
