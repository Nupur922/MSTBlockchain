"""
oracle_consensus.py
===================
Developer 2 | Day 2 Task — AgriTrust AI  [LIVE API VERSION]
NEWRRO AI Multi-Source Oracle Consensus Engine

Evaluates 3 independent data feeds and requires 2-of-3 agreement
before authorizing a disaster payout. This prevents any single
faulty sensor from triggering false insurance claims.

Oracle Feeds:
  Feed 1 — Sentinel-1 SAR Radar   : Flood days >= 3
  Feed 2 — Sentinel-2 NDVI Loss   : Vegetation loss >= 40%
  Feed 3 — OpenWeatherMap Rain API : Rainfall >= 120mm in 48h  [LIVE]

Setup:
  Add OPENWEATHER_API_KEY to agent/config/.env
  Free key at: https://openweathermap.org/api

Author : Developer 2 — NEWRRO AI & Satellite Oracle Lead
Project: AgriTrust AI — MST Blockchain Buildathon
"""

from __future__ import annotations

import logging
import os
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import requests
from dotenv import load_dotenv

# Load .env
_ENV_PATH = Path(__file__).parent / "config" / ".env"
load_dotenv(dotenv_path=_ENV_PATH)

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    level=logging.INFO,
)
logger = logging.getLogger("oracle_consensus")

# ---------------------------------------------------------------------------
# Thresholds (calibrated to Assam / Bihar flood conditions)
# ---------------------------------------------------------------------------

SAR_FLOOD_DAY_THRESHOLD: int   = 3      # Minimum consecutive flood days
NDVI_LOSS_THRESHOLD_PCT: float = 40.0   # Minimum NDVI loss percentage
RAINFALL_THRESHOLD_MM: float   = 120.0  # Minimum rainfall in 48-hour window
MIN_VOTES_FOR_APPROVAL: int    = 2      # 2-of-3 required

# ---------------------------------------------------------------------------
# Feed result containers
# ---------------------------------------------------------------------------

@dataclass
class FeedResult:
    """Result from a single oracle feed evaluation."""
    feed_name: str
    vote: bool             # True = confirms disaster
    value: float           # Raw metric value
    threshold: float       # Threshold used
    description: str


@dataclass
class ConsensusResult:
    """Final multi-source consensus decision."""
    plot_id: str
    timestamp: float
    feeds: list[FeedResult]
    votes_for: int
    votes_against: int
    consensus_score: float         # votes_for / total_feeds  (0.0–1.0)
    is_approved: bool              # True if votes_for >= MIN_VOTES_FOR_APPROVAL
    verified_damage_pct: float     # Weighted damage estimate (0–100)
    decision_reason: str


# ---------------------------------------------------------------------------
# OpenWeatherMap Rain Telemetry Client  [LIVE API]
# ---------------------------------------------------------------------------

class RainTelemetryClient:
    """
    Fetches real rainfall data from OpenWeatherMap API for a given lat/lon.

    Uses two OWM endpoints:
      1. Current weather (/weather) — live rain in last 1h
      2. 5-day forecast (/forecast) — extracts 48h cumulative rain

    Falls back to simulation when no API key or network is unavailable.

    Setup:
        Add OPENWEATHER_API_KEY=your_key to agent/config/.env
        Free key: https://openweathermap.org/api  (1000 calls/day free)
    """

    CURRENT_URL  = "https://api.openweathermap.org/data/2.5/weather"
    FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast"

    def __init__(self, api_key: Optional[str] = None, timeout: int = 10):
        self.api_key = api_key or os.getenv("OPENWEATHER_API_KEY", "")
        self.timeout = timeout

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key and self.api_key != "your_openweathermap_api_key_here")

    def fetch_rainfall_48h(
        self,
        lat: float,
        lon: float,
        simulate_mm: Optional[float] = None,
    ) -> float:
        """
        Return 48-hour cumulative rainfall in mm for (lat, lon).

        Strategy:
          - Calls /forecast to get 3-hourly forecasts for the next 48h
          - Sums rain.3h values across all intervals ≤ 48h from now
          - Falls back to /weather current rain if forecast has no rain data
          - Simulates if API is unreachable

        Parameters
        ----------
        lat, lon : float
            Coordinates of the farm plot centroid.
        simulate_mm : float, optional
            Override with a fixed simulation value (demo mode).
        """
        if simulate_mm is not None:
            logger.info("🌧️  Rain Telemetry (FORCED SIM): %.1f mm / 48h", simulate_mm)
            return simulate_mm

        if not self.is_configured:
            logger.warning("⚠️  No OpenWeatherMap API key — using simulation.")
            return self._simulate_rainfall()

        # --- Try 5-day /forecast endpoint (most accurate 48h sum) ---
        try:
            params = {
                "lat": lat,
                "lon": lon,
                "appid": self.api_key,
                "units": "metric",
                "cnt": 16,  # 16 × 3h = 48h window
            }
            resp = requests.get(self.FORECAST_URL, params=params, timeout=self.timeout)
            resp.raise_for_status()
            data = resp.json()

            # Sum rain.3h across the next 48h of 3-hourly forecast slots
            rain_48h = 0.0
            slots_used = 0
            for item in data.get("list", [])[:16]:
                rain_3h = item.get("rain", {}).get("3h", 0.0)
                rain_48h += rain_3h
                slots_used += 1

            rain_48h = round(rain_48h, 1)
            city = data.get("city", {}).get("name", f"{lat:.2f},{lon:.2f}")
            logger.info(
                "🌧️  Rain Telemetry (LIVE /forecast): %.1f mm / 48h | Location: %s | Slots: %d",
                rain_48h, city, slots_used,
            )
            return rain_48h

        except Exception as exc:
            logger.warning("⚠️  OWM /forecast failed (%s). Trying /weather…", exc)

        # --- Fallback to /weather current conditions ---
        try:
            params = {
                "lat": lat,
                "lon": lon,
                "appid": self.api_key,
                "units": "metric",
            }
            resp = requests.get(self.CURRENT_URL, params=params, timeout=self.timeout)
            resp.raise_for_status()
            data = resp.json()

            rain_1h = data.get("rain", {}).get("1h", 0.0)
            rain_3h = data.get("rain", {}).get("3h", 0.0)
            hourly  = rain_1h if rain_1h > 0 else (rain_3h / 3.0 if rain_3h > 0 else 0.0)
            # Scale current hourly rate to a 48h estimate (conservative)
            rain_48h = round(hourly * 48, 1)
            city = data.get("name", f"{lat:.2f},{lon:.2f}")
            logger.info(
                "🌧️  Rain Telemetry (LIVE /weather): %.1f mm / 48h | "
                "Location: %s | Hourly rate: %.2f mm",
                rain_48h, city, hourly,
            )
            return rain_48h

        except Exception as exc:
            logger.warning("⚠️  OWM /weather also failed (%s). Using simulation.", exc)
            return self._simulate_rainfall()

    def _simulate_rainfall(self) -> float:
        """Return realistic simulated 48h rainfall for Indian monsoon conditions."""
        import random
        mm = round(random.uniform(40.0, 180.0), 1)
        logger.info("🌧️  Rain Telemetry (SIMULATED): %.1f mm / 48h", mm)
        return mm


# ---------------------------------------------------------------------------
# Multi-Source Consensus Engine
# ---------------------------------------------------------------------------

class MultiSourceConsensusEngine:
    """
    2-of-3 oracle consensus engine for AgriTrust AI parametric insurance.

    Three independent data feeds vote on whether a disaster event occurred:

      Feed 1 (SAR)    — Sentinel-1 SAR flood days >= 3
      Feed 2 (NDVI)   — Sentinel-2 NDVI vegetation loss >= 40%
      Feed 3 (Rain)   — IMD/OWM cumulative rainfall >= 120mm / 48h

    A payout is authorized only when at least 2 feeds vote YES.
    This multi-source design prevents a single faulty sensor from
    triggering fraudulent or erroneous insurance claims.

    Usage
    -----
    >>> engine = MultiSourceConsensusEngine()
    >>> result = engine.evaluate(
    ...     plot_id="BIHAR_01",
    ...     sar_flood_days=6,
    ...     ndvi_loss_pct=76.0,
    ...     rainfall_mm_48h=185.0,
    ... )
    >>> print(result.is_approved, result.verified_damage_pct)
    """

    def __init__(
        self,
        sar_threshold_days: int   = SAR_FLOOD_DAY_THRESHOLD,
        ndvi_loss_threshold: float = NDVI_LOSS_THRESHOLD_PCT,
        rain_threshold_mm: float   = RAINFALL_THRESHOLD_MM,
        min_votes: int             = MIN_VOTES_FOR_APPROVAL,
        rain_client: Optional[RainTelemetryClient] = None,
    ):
        self.sar_threshold_days  = sar_threshold_days
        self.ndvi_loss_threshold = ndvi_loss_threshold
        self.rain_threshold_mm   = rain_threshold_mm
        self.min_votes           = min_votes
        self.rain_client         = rain_client or RainTelemetryClient()

    # ------------------------------------------------------------------
    # Individual feed evaluators
    # ------------------------------------------------------------------

    def _evaluate_sar_feed(self, sar_flood_days: int) -> FeedResult:
        """Feed 1: SAR Radar flood duration."""
        vote = sar_flood_days >= self.sar_threshold_days
        logger.info(
            "📡  Feed 1 [SAR]  : %d flood days  (threshold=%d)  →  %s",
            sar_flood_days, self.sar_threshold_days, "✅ YES" if vote else "❌ NO",
        )
        return FeedResult(
            feed_name="Sentinel-1 SAR Radar",
            vote=vote,
            value=float(sar_flood_days),
            threshold=float(self.sar_threshold_days),
            description=(
                f"SAR backscatter detected {sar_flood_days} consecutive flood days "
                f"(threshold: ≥{self.sar_threshold_days} days)"
            ),
        )

    def _evaluate_ndvi_feed(self, ndvi_loss_pct: float) -> FeedResult:
        """Feed 2: Sentinel-2 NDVI vegetation loss."""
        vote = ndvi_loss_pct >= self.ndvi_loss_threshold
        logger.info(
            "🌿  Feed 2 [NDVI] : %.1f%% vegetation loss  (threshold=%.0f%%)  →  %s",
            ndvi_loss_pct, self.ndvi_loss_threshold, "✅ YES" if vote else "❌ NO",
        )
        return FeedResult(
            feed_name="Sentinel-2 NDVI Loss",
            vote=vote,
            value=ndvi_loss_pct,
            threshold=self.ndvi_loss_threshold,
            description=(
                f"NDVI vegetation loss index: {ndvi_loss_pct:.1f}% "
                f"(threshold: ≥{self.ndvi_loss_threshold:.0f}%)"
            ),
        )

    def _evaluate_rain_feed(self, rainfall_mm: float) -> FeedResult:
        """Feed 3: IMD / OWM rainfall telemetry."""
        vote = rainfall_mm >= self.rain_threshold_mm
        logger.info(
            "🌧️  Feed 3 [Rain] : %.1f mm/48h  (threshold=%.0f mm)  →  %s",
            rainfall_mm, self.rain_threshold_mm, "✅ YES" if vote else "❌ NO",
        )
        return FeedResult(
            feed_name="IMD/OWM Rainfall Telemetry",
            vote=vote,
            value=rainfall_mm,
            threshold=self.rain_threshold_mm,
            description=(
                f"Cumulative 48h rainfall: {rainfall_mm:.1f} mm "
                f"(threshold: ≥{self.rain_threshold_mm:.0f} mm)"
            ),
        )

    # ------------------------------------------------------------------
    # Main consensus evaluator
    # ------------------------------------------------------------------

    def evaluate(
        self,
        plot_id: str,
        sar_flood_days: int,
        ndvi_loss_pct: float,
        rainfall_mm_48h: float,
    ) -> ConsensusResult:
        """
        Run 2-of-3 consensus evaluation for a farm plot.

        Parameters
        ----------
        plot_id : str
            Farm plot identifier (for logging / audit trail).
        sar_flood_days : int
            Consecutive days SAR backscatter indicates standing water.
        ndvi_loss_pct : float
            Percentage NDVI drop from pre-event baseline (0–100).
        rainfall_mm_48h : float
            Cumulative rainfall in mm over the 48-hour event window.

        Returns
        -------
        ConsensusResult
            is_approved, verified_damage_pct, consensus_score, and full
            per-feed audit trail.
        """
        logger.info(
            "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            "🔍  ORACLE CONSENSUS EVALUATION — Plot: %s\n"
            "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
            plot_id,
        )

        feeds = [
            self._evaluate_sar_feed(sar_flood_days),
            self._evaluate_ndvi_feed(ndvi_loss_pct),
            self._evaluate_rain_feed(rainfall_mm_48h),
        ]

        votes_for     = sum(1 for f in feeds if f.vote)
        votes_against = len(feeds) - votes_for
        consensus_score = round(votes_for / len(feeds), 4)
        is_approved = votes_for >= self.min_votes

        # Verified damage estimate: weighted average of active feeds
        # SAR contributes 40%, NDVI contributes 40%, Rain contributes 20%
        weights = [0.40, 0.40, 0.20]
        # Normalise each feed's metric to a 0–100 damage % scale
        sar_dmg   = min(100.0, (sar_flood_days  / 10.0) * 100.0)
        ndvi_dmg  = min(100.0, ndvi_loss_pct)
        rain_dmg  = min(100.0, (rainfall_mm_48h / 300.0) * 100.0)
        metrics   = [sar_dmg, ndvi_dmg, rain_dmg]

        # Only average feeds that voted YES (confirmed damage)
        active_weights = [w if f.vote else 0.0 for w, f in zip(weights, feeds)]
        total_weight = sum(active_weights)
        if total_weight > 0:
            verified_damage_pct = round(
                sum(m * w for m, w in zip(metrics, active_weights)) / total_weight,
                2,
            )
        else:
            verified_damage_pct = 0.0

        decision_reason = (
            f"{'APPROVED' if is_approved else 'REJECTED'}: "
            f"{votes_for}/{len(feeds)} feeds confirmed disaster event "
            f"(required {self.min_votes}/{len(feeds)}). "
            f"Estimated damage: {verified_damage_pct:.1f}%."
        )

        logger.info(
            "\n📋  CONSENSUS RESULT:\n"
            "    Votes For    : %d / %d\n"
            "    Score        : %.2f\n"
            "    Approved     : %s\n"
            "    Damage Est.  : %.1f%%\n"
            "    Reason       : %s",
            votes_for, len(feeds),
            consensus_score,
            "✅ YES" if is_approved else "❌ NO",
            verified_damage_pct,
            decision_reason,
        )

        return ConsensusResult(
            plot_id=plot_id,
            timestamp=time.time(),
            feeds=feeds,
            votes_for=votes_for,
            votes_against=votes_against,
            consensus_score=consensus_score,
            is_approved=is_approved,
            verified_damage_pct=verified_damage_pct,
            decision_reason=decision_reason,
        )

    def evaluate_with_raw_data(
        self,
        plot_id: str,
        sar_db_series: list[float],
        pre_ndvi: float,
        post_ndvi: float,
        rainfall_mm_48h: float,
        sar_threshold_db: float = -15.0,
        acquisition_interval_days: int = 6,
    ) -> ConsensusResult:
        """
        Higher-level wrapper: accepts raw satellite data arrays and
        computes derived metrics before running consensus.

        This is the method called by sentinel_agent.py.
        """
        from ndvi_calculator import NDVICalculator

        calc = NDVICalculator()
        sar_result  = calc.calculate_sar_flood_duration(
            sar_db_series, sar_threshold_db, acquisition_interval_days
        )
        loss_result = calc.evaluate_crop_loss(pre_ndvi, post_ndvi)

        return self.evaluate(
            plot_id=plot_id,
            sar_flood_days=sar_result.flood_days,
            ndvi_loss_pct=loss_result.damage_pct,
            rainfall_mm_48h=rainfall_mm_48h,
        )


# ---------------------------------------------------------------------------
# Quick smoke-test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    engine = MultiSourceConsensusEngine()

    print("\n=== Scenario: Healthy Season (No Disaster) ===")
    result = engine.evaluate(
        plot_id="BASELINE_01",
        sar_flood_days=0,
        ndvi_loss_pct=5.0,
        rainfall_mm_48h=30.0,
    )
    print(f"  Approved : {result.is_approved}")
    print(f"  Score    : {result.consensus_score}")
    print(f"  Damage   : {result.verified_damage_pct}%")

    print("\n=== Scenario: Assam Brahmaputra Flood (Critical) ===")
    result = engine.evaluate(
        plot_id="ASSAM_BRAHMAPUTRA_01",
        sar_flood_days=6,
        ndvi_loss_pct=76.0,
        rainfall_mm_48h=210.0,
    )
    print(f"  Approved : {result.is_approved}")
    print(f"  Score    : {result.consensus_score}")
    print(f"  Damage   : {result.verified_damage_pct}%")

    print("\n=== Scenario: Rain Only (2-of-3 Fails) ===")
    result = engine.evaluate(
        plot_id="PARTIAL_01",
        sar_flood_days=1,
        ndvi_loss_pct=15.0,
        rainfall_mm_48h=150.0,
    )
    print(f"  Approved : {result.is_approved}")
    print(f"  Score    : {result.consensus_score}")
    print(f"  Damage   : {result.verified_damage_pct}%")
