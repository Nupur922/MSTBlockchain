"""
ndvi_calculator.py
==================
Developer 2 | Day 1 Task — AgriTrust AI
NEWRRO AI Vegetation & Flood Damage Calculator

Provides:
  - NDVI = (NIR - RED) / (NIR + RED)
  - SAR backscatter flood duration analysis
  - Crop loss percentage evaluation

Author : Developer 2 — NEWRRO AI & Satellite Oracle Lead
Project: AgriTrust AI — MST Blockchain Buildathon
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional

import numpy as np

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    level=logging.INFO,
)
logger = logging.getLogger("ndvi_calculator")

# ---------------------------------------------------------------------------
# NDVI Health Classification
# ---------------------------------------------------------------------------

NDVI_CLASSES = {
    "BARREN_WATER":  (-1.00, 0.05),
    "SPARSE_VEG":   (0.05,  0.20),
    "MODERATE_VEG": (0.20,  0.40),
    "HEALTHY_CROP": (0.40,  0.75),
    "DENSE_CROP":   (0.75,  1.00),
}


def classify_ndvi(ndvi_value: float) -> str:
    """Return human-readable NDVI classification."""
    for label, (low, high) in NDVI_CLASSES.items():
        if low <= ndvi_value < high:
            return label
    return "DENSE_CROP" if ndvi_value >= 0.75 else "BARREN_WATER"


# ---------------------------------------------------------------------------
# Result containers
# ---------------------------------------------------------------------------

@dataclass
class NDVIResult:
    """Result of a single NDVI computation."""
    nir: float
    red: float
    ndvi: float
    classification: str
    is_distressed: bool          # True if NDVI < 0.25 (severe stress)


@dataclass
class SARFloodResult:
    """Result of SAR backscatter flood duration analysis."""
    backscatter_db_series: list[float]
    flood_days: int              # Consecutive days below threshold
    threshold_db: float
    flooded_acquisitions: int
    total_acquisitions: int
    flood_fraction: float        # flooded / total
    is_flood_event: bool         # True if flood_days >= 3
    severity: str                # "NONE" | "MILD" | "MODERATE" | "SEVERE"


@dataclass
class CropLossResult:
    """Result of pre/post NDVI crop damage evaluation."""
    pre_ndvi: float
    post_ndvi: float
    ndvi_drop: float
    damage_pct: float            # 0–100 scale
    loss_severity: str           # "NONE" | "MINOR" | "MODERATE" | "SEVERE" | "TOTAL"
    payout_eligible: bool        # True if damage_pct >= 25%


# ---------------------------------------------------------------------------
# NDVICalculator
# ---------------------------------------------------------------------------

class NDVICalculator:
    """
    Core vegetation index and SAR flood analysis engine.

    All methods are pure functions and work on numpy arrays or scalar floats
    so they can process both single-pixel and spatially-averaged values.
    """

    # Minimum NDVI considered "healthy" for standing crops
    HEALTHY_NDVI_THRESHOLD: float = 0.40
    # NDVI drop fraction required to declare crop stress
    STRESS_NDVI_THRESHOLD: float = 0.25
    # Minimum flood days to trigger insurance review
    MIN_FLOOD_DAYS: int = 3

    def calculate_ndvi(
        self,
        nir: float | np.ndarray,
        red: float | np.ndarray,
    ) -> NDVIResult | np.ndarray:
        """
        Compute NDVI from NIR and RED reflectances.

        Formula:
            NDVI = (NIR - RED) / (NIR + RED)

        Parameters
        ----------
        nir : float or ndarray
            Near-Infrared band (B08 for Sentinel-2), reflectance 0.0–1.0.
        red : float or ndarray
            Red band (B04 for Sentinel-2), reflectance 0.0–1.0.

        Returns
        -------
        NDVIResult (scalar input) or ndarray (array input).
        Scalar result is clipped to [-1, 1] and classified.
        """
        nir_arr = np.asarray(nir, dtype=np.float64)
        red_arr = np.asarray(red, dtype=np.float64)

        denominator = nir_arr + red_arr
        # Avoid division by zero
        ndvi_arr = np.where(
            denominator == 0.0,
            0.0,
            (nir_arr - red_arr) / denominator,
        )
        ndvi_arr = np.clip(ndvi_arr, -1.0, 1.0)

        # Return ndarray for array inputs
        if ndvi_arr.ndim > 0 and ndvi_arr.size > 1:
            return ndvi_arr

        # Scalar path → rich result object
        ndvi_val = float(ndvi_arr)
        classification = classify_ndvi(ndvi_val)
        is_distressed = ndvi_val < self.STRESS_NDVI_THRESHOLD

        logger.info(
            "📊  NDVI: NIR=%.4f  RED=%.4f  →  NDVI=%.4f  [%s]%s",
            float(nir), float(red), ndvi_val, classification,
            " ⚠️  DISTRESSED" if is_distressed else "",
        )
        return NDVIResult(
            nir=float(nir),
            red=float(red),
            ndvi=ndvi_val,
            classification=classification,
            is_distressed=is_distressed,
        )

    def calculate_sar_flood_duration(
        self,
        sar_db_series: list[float],
        threshold_db: float = -15.0,
        acquisition_interval_days: int = 6,
    ) -> SARFloodResult:
        """
        Determine standing-floodwater duration from a SAR backscatter time series.

        A pixel is classified as FLOODED when its backscatter value drops below
        *threshold_db* (default -15 dB), indicating an open-water specular
        reflection signature rather than vegetation scattering.

        Parameters
        ----------
        sar_db_series : list of float
            Ordered backscatter dB values from consecutive Sentinel-1
            acquisitions (each acquisition ~6 days apart).
        threshold_db : float
            Backscatter dB below which a pixel is flagged as flooded.
            Default: -15.0 dB (calibrated for Sentinel-1 IW mode VV polarisation).
        acquisition_interval_days : int
            Days between each acquisition (default 6 for Sentinel-1).

        Returns
        -------
        SARFloodResult with flood_days, severity, and is_flood_event flag.
        """
        if not sar_db_series:
            raise ValueError("sar_db_series must not be empty.")

        series = np.array(sar_db_series, dtype=np.float64)
        flooded_mask = series < threshold_db
        flooded_acquisitions = int(np.sum(flooded_mask))
        total_acquisitions = len(series)
        flood_fraction = flooded_acquisitions / total_acquisitions

        # Count maximum consecutive flooded acquisitions
        max_consecutive = 0
        current_run = 0
        for flag in flooded_mask:
            if flag:
                current_run += 1
                max_consecutive = max(max_consecutive, current_run)
            else:
                current_run = 0

        flood_days = max_consecutive * acquisition_interval_days

        # Severity classification
        if flood_days == 0:
            severity = "NONE"
        elif flood_days < 12:
            severity = "MILD"
        elif flood_days < 24:
            severity = "MODERATE"
        else:
            severity = "SEVERE"

        is_flood_event = flood_days >= (self.MIN_FLOOD_DAYS)

        logger.info(
            "🌊  SAR Flood Analysis: %d/%d acquisitions flooded | "
            "Max consecutive flood days: %d | Severity: %s",
            flooded_acquisitions, total_acquisitions, flood_days, severity,
        )

        return SARFloodResult(
            backscatter_db_series=sar_db_series,
            flood_days=flood_days,
            threshold_db=threshold_db,
            flooded_acquisitions=flooded_acquisitions,
            total_acquisitions=total_acquisitions,
            flood_fraction=round(flood_fraction, 4),
            is_flood_event=is_flood_event,
            severity=severity,
        )

    def evaluate_crop_loss(
        self,
        pre_ndvi: float,
        post_ndvi: float,
        minimum_payout_damage_pct: float = 25.0,
    ) -> CropLossResult:
        """
        Calculate percentage crop damage from pre- and post-event NDVI values.

        Damage is expressed relative to the pre-event baseline NDVI:
            damage_pct = max(0, (pre_ndvi - post_ndvi) / pre_ndvi) * 100

        Parameters
        ----------
        pre_ndvi : float
            NDVI before the disaster event (baseline, typically > 0.50 for
            established monsoon-season crops).
        post_ndvi : float
            NDVI after the disaster event.
        minimum_payout_damage_pct : float
            Minimum damage percentage required for payout eligibility (default 25%).

        Returns
        -------
        CropLossResult with damage_pct and payout eligibility.
        """
        if pre_ndvi <= 0:
            raise ValueError(
                f"pre_ndvi must be positive; got {pre_ndvi}. "
                "Cannot compute relative loss against a zero/negative baseline."
            )

        ndvi_drop = pre_ndvi - post_ndvi
        # Clamp: negative drops (i.e., improvement) yield 0% damage
        damage_pct = max(0.0, (ndvi_drop / pre_ndvi) * 100.0)
        damage_pct = round(damage_pct, 2)

        # Loss severity tiers (aligned with PMFBY standard categories)
        if damage_pct < 10.0:
            loss_severity = "NONE"
        elif damage_pct < 25.0:
            loss_severity = "MINOR"
        elif damage_pct < 50.0:
            loss_severity = "MODERATE"
        elif damage_pct < 75.0:
            loss_severity = "SEVERE"
        else:
            loss_severity = "TOTAL"

        payout_eligible = damage_pct >= minimum_payout_damage_pct

        logger.info(
            "🌾  Crop Loss: Pre-NDVI=%.4f  Post-NDVI=%.4f  Drop=%.4f  "
            "Damage=%.1f%%  Severity=%s  Payout=%s",
            pre_ndvi, post_ndvi, ndvi_drop, damage_pct, loss_severity,
            "✅ ELIGIBLE" if payout_eligible else "❌ NOT ELIGIBLE",
        )

        return CropLossResult(
            pre_ndvi=pre_ndvi,
            post_ndvi=post_ndvi,
            ndvi_drop=round(ndvi_drop, 4),
            damage_pct=damage_pct,
            loss_severity=loss_severity,
            payout_eligible=payout_eligible,
        )

    # ------------------------------------------------------------------
    # NDWI — Drought & Heatwave Sensing (V2)
    # ------------------------------------------------------------------

    def calculate_ndwi(
        self,
        green_band: float | np.ndarray,
        swir_band: float | np.ndarray,
    ) -> float | np.ndarray:
        """
        Compute NDWI (Normalized Difference Water Index) for drought sensing.

        Formula:
            NDWI = (GREEN - SWIR) / (GREEN + SWIR)

        Uses Sentinel-2 Band 3 (Green) and Band 11 (SWIR).

        Interpretation:
            >  0.1   → Moist / well-irrigated soil
             0 to 0.1 → Normal moisture
            -0.1 to -0.35 → Soil moisture stress / mild drought
            < -0.35  → FLASH DROUGHT / severe desiccation — payout eligible

        Parameters
        ----------
        green_band : float or ndarray  — B03 Green reflectance (0–1)
        swir_band  : float or ndarray  — B11 SWIR reflectance (0–1)

        Returns
        -------
        float (scalar) or ndarray (array input), clipped to [-1, 1]
        """
        g = np.asarray(green_band, dtype=np.float64)
        s = np.asarray(swir_band,  dtype=np.float64)

        denom = g + s
        ndwi  = np.where(denom == 0.0, 0.0, (g - s) / denom)
        ndwi  = np.clip(ndwi, -1.0, 1.0)

        if ndwi.ndim == 0 or ndwi.size == 1:
            val = float(ndwi)
            severity = (
                "FLASH_DROUGHT" if val < -0.35
                else "MILD_DROUGHT" if val < -0.10
                else "NORMAL"
            )
            logger.info(
                "🌵  NDWI: GREEN=%.4f  SWIR=%.4f  →  NDWI=%.4f  [%s]",
                float(green_band), float(swir_band), val, severity,
            )
            return val
        return ndwi

    def evaluate_drought_severity(
        self,
        ndwi_series: list[float],
        dry_days_threshold: int = 14,
        acquisition_interval_days: int = 10,
        drought_threshold: float = -0.35,
    ) -> dict:
        """
        Evaluate drought severity from an NDWI time series.

        Classifies as FLASH DROUGHT / SOIL DESICCATION if NDWI stays
        below *drought_threshold* for *dry_days_threshold* consecutive days.

        Parameters
        ----------
        ndwi_series : list[float]
            Ordered NDWI values from consecutive Sentinel-2 acquisitions.
        dry_days_threshold : int
            Minimum consecutive dry days to declare flash drought (default 14).
        acquisition_interval_days : int
            Days between each acquisition (default 10 for Sentinel-2 10-day).
        drought_threshold : float
            NDWI below this = dry pixel (default -0.35).

        Returns
        -------
        dict with keys:
            dry_days, max_consecutive_dry, is_drought_event,
            severity, payout_eligible, drought_fraction
        """
        if not ndwi_series:
            raise ValueError("ndwi_series must not be empty.")

        series = np.array(ndwi_series, dtype=np.float64)
        dry_mask = series < drought_threshold

        dry_acquisitions = int(np.sum(dry_mask))
        total            = len(series)
        drought_fraction = round(dry_acquisitions / total, 4)

        # Max consecutive dry acquisitions
        max_consec = 0
        current    = 0
        for flag in dry_mask:
            if flag:
                current   += 1
                max_consec = max(max_consec, current)
            else:
                current = 0

        dry_days = max_consec * acquisition_interval_days

        if dry_days == 0:
            severity = "NONE"
        elif dry_days < dry_days_threshold:
            severity = "MILD_STRESS"
        elif dry_days < 30:
            severity = "MODERATE_DROUGHT"
        else:
            severity = "FLASH_DROUGHT"

        is_drought_event = dry_days >= dry_days_threshold
        payout_eligible  = is_drought_event

        logger.info(
            "🌵  Drought Analysis: %d/%d acquisitions dry | "
            "Max consecutive dry days: %d | Severity: %s | Payout: %s",
            dry_acquisitions, total, dry_days, severity,
            "✅ ELIGIBLE" if payout_eligible else "❌ NOT ELIGIBLE",
        )

        return {
            "dry_days":              dry_days,
            "max_consecutive_dry":   max_consec,
            "dry_acquisitions":      dry_acquisitions,
            "total_acquisitions":    total,
            "drought_fraction":      drought_fraction,
            "is_drought_event":      is_drought_event,
            "severity":              severity,
            "payout_eligible":       payout_eligible,
            "drought_threshold":     drought_threshold,
        }

    def full_damage_report(
        self,
        nir: float,
        red: float,
        sar_db_series: list[float],
        pre_event_ndvi: Optional[float] = None,
        threshold_db: float = -15.0,
    ) -> dict:
        """
        Convenience: run NDVI, SAR flood duration, and crop loss in one call.

        Parameters
        ----------
        pre_event_ndvi : float, optional
            Baseline NDVI for crop-loss comparison.
            If None, a healthy-crop baseline of 0.75 is assumed.
        """
        ndvi_result = self.calculate_ndvi(nir, red)
        sar_result = self.calculate_sar_flood_duration(sar_db_series, threshold_db)

        baseline = pre_event_ndvi if pre_event_ndvi is not None else 0.75
        # Scalar: ndvi_result is NDVIResult
        post_ndvi = ndvi_result.ndvi if isinstance(ndvi_result, NDVIResult) else float(ndvi_result)
        loss_result = self.evaluate_crop_loss(baseline, post_ndvi)

        return {
            "ndvi": ndvi_result,
            "sar_flood": sar_result,
            "crop_loss": loss_result,
        }


# ---------------------------------------------------------------------------
# Quick smoke-test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    calc = NDVICalculator()

    print("\n=== NDVI Calculation ===")
    res = calc.calculate_ndvi(nir=0.45, red=0.08)
    print(f"  NDVI        : {res.ndvi:.4f}")
    print(f"  Class       : {res.classification}")
    print(f"  Distressed  : {res.is_distressed}")

    print("\n=== SAR Flood Duration ===")
    # Simulate Assam Brahmaputra flood series (6 consecutive flood days = 1 acquisition)
    assam_series = [-8.5, -9.2, -16.1, -18.4, -19.0, -17.8, -16.5, -12.3, -9.1, -7.4]
    sar = calc.calculate_sar_flood_duration(assam_series)
    print(f"  Flood Days  : {sar.flood_days}")
    print(f"  Severity    : {sar.severity}")
    print(f"  Flood Event : {sar.is_flood_event}")

    print("\n=== Crop Loss Evaluation ===")
    loss = calc.evaluate_crop_loss(pre_ndvi=0.75, post_ndvi=0.18)
    print(f"  NDVI Drop   : {loss.ndvi_drop:.4f}")
    print(f"  Damage %    : {loss.damage_pct:.1f}%")
    print(f"  Severity    : {loss.loss_severity}")
    print(f"  Eligible    : {loss.payout_eligible}")

    print("\n=== NDWI Drought Index (V2) ===")
    ndwi_val = calc.calculate_ndwi(green_band=0.06, swir_band=0.35)
    print(f"  NDWI        : {ndwi_val:.4f}")

    print("\n=== Drought Severity (V2) ===")
    # Simulate 21 days of flash drought (NDWI < -0.35 for 2+ acquisitions)
    drought_series = [-0.10, -0.18, -0.38, -0.42, -0.45, -0.39, -0.22, -0.15]
    drought = calc.evaluate_drought_severity(drought_series, dry_days_threshold=14)
    print(f"  Dry Days    : {drought['dry_days']}")
    print(f"  Severity    : {drought['severity']}")
    print(f"  Payout      : {drought['payout_eligible']}")
    print(f"  Severity    : {loss.loss_severity}")
    print(f"  Eligible    : {loss.payout_eligible}")
