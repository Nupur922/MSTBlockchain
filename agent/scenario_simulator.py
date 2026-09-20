"""
scenario_simulator.py
=====================
Developer 2 | Day 2 Task — AgriTrust AI
Hackathon Demo Scenario Simulator

Pre-built scenarios for live hackathon demonstrations.
Each scenario produces a complete set of satellite telemetry,
consensus evaluation, and signed payout proof.

Scenarios:
  1. baseline_healthy()         — Healthy pre-season crop (no payout)
  2. assam_brahmaputra_flood()  — Assam critical flood  (65% damage)
  3. bihar_kosi_flood()         — Bihar severe flood    (50% damage)

Author : Developer 2 — NEWRRO AI & Satellite Oracle Lead
Project: AgriTrust AI — MST Blockchain Buildathon
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Optional

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    level=logging.INFO,
)
logger = logging.getLogger("scenario_simulator")

# ---------------------------------------------------------------------------
# Scenario result container
# ---------------------------------------------------------------------------

@dataclass
class ScenarioResult:
    """Complete result produced by a scenario run."""
    scenario_name: str
    plot_id: str
    farmer_name: str
    location: str
    status: str                       # "HEALTHY" | "ASSAM CRITICAL FLOOD" | "BIHAR SEVERE FLOOD"

    # Satellite metrics
    ndvi_value: float
    sar_flood_days: int
    rainfall_mm_48h: float
    pre_event_ndvi: float

    # Derived metrics
    ndvi_loss_pct: float
    estimated_damage_pct: float
    payout_fraction: float            # e.g., 0.65 = 65% of insured value
    payout_mst_amount: float          # In MST tokens
    payout_inr_equivalent: float      # For display (1 MST ≈ ₹1)

    # Consensus
    is_payout_approved: bool
    consensus_score: float
    votes_for: int

    # Optional proof (populated if private key provided)
    proof_hash: Optional[str] = None
    signature_hex: Optional[str] = None
    signer_address: Optional[str] = None

    # Narration
    voice_alert: str = ""
    summary_lines: list[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# ScenarioSimulator
# ---------------------------------------------------------------------------

class ScenarioSimulator:
    """
    Runs pre-built disaster simulation scenarios for AgriTrust AI demos.

    Each scenario:
      1. Sets realistic satellite telemetry values.
      2. Runs the MultiSourceConsensusEngine.
      3. Signs a disaster proof (if private key available).
      4. Produces a VoiceNotifier alert string.
      5. Returns a complete ScenarioResult for the frontend / CLI.

    Usage
    -----
    >>> sim = ScenarioSimulator(oracle_private_key="0x...")
    >>> result = sim.assam_brahmaputra_flood()
    >>> print(result.status, result.estimated_damage_pct)
    """

    # MST token unit
    MST_DECIMALS = 10**18
    # Insured value per plot in MST (demo: 40,000 MST ≈ ₹40,000)
    INSURED_VALUE_MST = 40_000.0
    # MST → INR display rate
    MST_TO_INR = 1.0
    # Hardhat chain ID
    CHAIN_ID = 31337

    def __init__(self, oracle_private_key: Optional[str] = None):
        """
        Parameters
        ----------
        oracle_private_key : str, optional
            0x-prefixed hex Oracle private key for proof signing.
            If None, uses Hardhat demo key (for local testing only).
        """
        # Lazy imports to avoid circular deps and allow partial installs
        from oracle_consensus import MultiSourceConsensusEngine
        from proof_signer import EIP191ProofSigner
        from voice_notifier import VoiceNotifier

        self._consensus = MultiSourceConsensusEngine()
        self._signer    = EIP191ProofSigner(private_key=oracle_private_key)
        self._voice     = VoiceNotifier()

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _run_scenario(
        self,
        scenario_name: str,
        plot_id: str,
        plot_id_int: int,
        farmer_name: str,
        location: str,
        pre_event_ndvi: float,
        post_ndvi: float,
        sar_flood_days: int,
        rainfall_mm_48h: float,
        status_label: str,
        language: str = "hindi",
    ) -> ScenarioResult:
        """Internal: build, evaluate, sign, and narrate a scenario."""

        ndvi_loss_pct = round(
            max(0.0, (pre_event_ndvi - post_ndvi) / pre_event_ndvi * 100.0), 2
        )

        # Consensus
        consensus = self._consensus.evaluate(
            plot_id=plot_id,
            sar_flood_days=sar_flood_days,
            ndvi_loss_pct=ndvi_loss_pct,
            rainfall_mm_48h=rainfall_mm_48h,
        )

        # Payout calculation
        payout_fraction  = round(consensus.verified_damage_pct / 100.0, 4)
        payout_mst       = round(self.INSURED_VALUE_MST * payout_fraction, 2)
        payout_inr       = round(payout_mst * self.MST_TO_INR, 2)
        payout_wei       = int(payout_mst * self.MST_DECIMALS)

        # Sign proof
        proof = None
        if consensus.is_approved and payout_wei > 0:
            proof = self._signer.sign_disaster_proof(
                plot_id=plot_id_int,
                payout_amount_wei=payout_wei,
                chain_id=self.CHAIN_ID,
                timestamp=int(time.time()),
            )

        # Voice alert
        voice_msg = self._voice.generate_alert(
            farmer_name=farmer_name,
            location=location,
            flood_days=sar_flood_days,
            payout_inr=payout_inr,
            language=language,
            approved=consensus.is_approved,
        )

        # Summary lines for CLI display
        divider = "─" * 60
        summary = [
            divider,
            f"  SCENARIO    : {scenario_name}",
            f"  Plot ID     : {plot_id}",
            f"  Farmer      : {farmer_name}",
            f"  Location    : {location}",
            divider,
            f"  NDVI (post) : {post_ndvi:.2f}  (pre: {pre_event_ndvi:.2f})",
            f"  NDVI Loss   : {ndvi_loss_pct:.1f}%",
            f"  SAR Flood   : {sar_flood_days} days",
            f"  Rainfall    : {rainfall_mm_48h:.0f} mm / 48h",
            divider,
            f"  Votes       : {consensus.votes_for} / 3  (score={consensus.consensus_score:.2f})",
            f"  APPROVED    : {'✅ YES' if consensus.is_approved else '❌ NO'}",
            f"  Damage Est. : {consensus.verified_damage_pct:.1f}%",
            f"  Payout      : {payout_mst:,.0f} MST  (≈ ₹{payout_inr:,.0f})",
            divider,
            f"  STATUS      : {status_label}",
            divider,
        ]
        if proof:
            summary.append(f"  Proof Hash  : {proof.proof_hash}")
            summary.append(f"  Signature   : {proof.signature_hex[:26]}…")

        return ScenarioResult(
            scenario_name=scenario_name,
            plot_id=plot_id,
            farmer_name=farmer_name,
            location=location,
            status=status_label,
            ndvi_value=post_ndvi,
            sar_flood_days=sar_flood_days,
            rainfall_mm_48h=rainfall_mm_48h,
            pre_event_ndvi=pre_event_ndvi,
            ndvi_loss_pct=ndvi_loss_pct,
            estimated_damage_pct=consensus.verified_damage_pct,
            payout_fraction=payout_fraction,
            payout_mst_amount=payout_mst,
            payout_inr_equivalent=payout_inr,
            is_payout_approved=consensus.is_approved,
            consensus_score=consensus.consensus_score,
            votes_for=consensus.votes_for,
            proof_hash=proof.proof_hash if proof else None,
            signature_hex=proof.signature_hex if proof else None,
            signer_address=proof.signer_address if proof else None,
            voice_alert=voice_msg,
            summary_lines=summary,
        )

    # ------------------------------------------------------------------
    # Scenario 1 — Baseline Healthy
    # ------------------------------------------------------------------

    def baseline_healthy(self) -> ScenarioResult:
        """
        Scenario 1: Pre-Season Baseline — Healthy Crop, No Disaster.

        NDVI: 0.78 (Dense crop)
        SAR Days: 0 (Dry land, normal backscatter)
        Rain: 45 mm / 48h (Normal monsoon shower)
        Status: HEALTHY — No payout triggered.
        """
        logger.info("\n🌱  Running Scenario 1: BASELINE HEALTHY SEASON")
        return self._run_scenario(
            scenario_name="Pre-Season Baseline (Healthy Crop)",
            plot_id="MAJULI_ASSAM_01",
            plot_id_int=1,
            farmer_name="Bhupen Gogoi",
            location="Majuli, Assam",
            pre_event_ndvi=0.78,
            post_ndvi=0.78,         # No change — healthy season
            sar_flood_days=0,
            rainfall_mm_48h=45.0,
            status_label="HEALTHY — NO PAYOUT",
            language="assamese",
        )

    # ------------------------------------------------------------------
    # Scenario 2 — Assam Brahmaputra Flood
    # ------------------------------------------------------------------

    def assam_brahmaputra_flood(self) -> ScenarioResult:
        """
        Scenario 2: Assam Brahmaputra Critical Flood.

        Brahmaputra River breaches in Majuli Island, Assam.
        SAR: 6 consecutive flood days (cloud-penetrating radar)
        NDVI: Drops from 0.75 → 0.18 (76% vegetation loss)
        Rain: 210 mm / 48h (IMD Red Alert level)
        Consensus: 3/3 unanimous → 65% payout approved.
        """
        logger.info("\n🌊  Running Scenario 2: ASSAM BRAHMAPUTRA CRITICAL FLOOD")
        return self._run_scenario(
            scenario_name="Assam Brahmaputra Flood (Critical)",
            plot_id="MAJULI_ASSAM_02",
            plot_id_int=2,
            farmer_name="Prasanta Kalita",
            location="Majuli Island, Assam (Brahmaputra Flood Zone)",
            pre_event_ndvi=0.75,
            post_ndvi=0.18,          # Severe vegetation destruction
            sar_flood_days=6,
            rainfall_mm_48h=210.0,
            status_label="ASSAM CRITICAL FLOOD — 65% PAYOUT APPROVED",
            language="assamese",
        )

    # ------------------------------------------------------------------
    # Scenario 3 — Bihar Kosi Flood
    # ------------------------------------------------------------------

    def bihar_kosi_flood(self) -> ScenarioResult:
        """
        Scenario 3: Bihar Kosi River Severe Flood.

        Kosi River embankment breach in Darbhanga district, Bihar.
        SAR: 4 consecutive flood days
        NDVI: Drops from 0.72 → 0.22 (69% vegetation loss)
        Rain: 185 mm / 48h (IMD Orange Alert level)
        Consensus: 3/3 unanimous → 50% payout approved.
        """
        logger.info("\n🌊  Running Scenario 3: BIHAR KOSI RIVER SEVERE FLOOD")
        return self._run_scenario(
            scenario_name="Bihar Kosi River Flood (Severe)",
            plot_id="DARBHANGA_BIHAR_03",
            plot_id_int=3,
            farmer_name="Ram Singh",
            location="Darbhanga, Bihar (Kosi River Flood Zone)",
            pre_event_ndvi=0.72,
            post_ndvi=0.22,          # Severe crop damage
            sar_flood_days=4,
            rainfall_mm_48h=185.0,
            status_label="BIHAR SEVERE FLOOD — 50% PAYOUT APPROVED",
            language="bhojpuri",
        )

    # ------------------------------------------------------------------
    # Run all scenarios (CLI batch)
    # ------------------------------------------------------------------

    def run_all(self) -> list[ScenarioResult]:
        """Run all 3 scenarios and return results."""
        results = [
            self.baseline_healthy(),
            self.assam_brahmaputra_flood(),
            self.bihar_kosi_flood(),
        ]
        for r in results:
            print()
            for line in r.summary_lines:
                print(line)
            print(f"\n  🔊 VOICE ALERT:\n  {r.voice_alert}\n")
        return results


# ---------------------------------------------------------------------------
# Quick smoke-test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    sim = ScenarioSimulator()
    sim.run_all()
