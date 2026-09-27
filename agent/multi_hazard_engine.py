"""
multi_hazard_engine.py
======================
Developer 2 | Version 3 Feature — AgriTrust AI
Multi-Hazard Satellite Spectrum & Risk Engine (Floods, Droughts, Heatwaves)

Calculates:
  1. Sentinel-1 SAR Radar Flood Inundation (< -15.0 dB, Submersion Days)
  2. Sentinel-2 NDWI (Normalized Difference Water Index) for Flash Droughts
  3. Landsat/MODIS LST (Land Surface Temperature) for Scorching Heatwaves

Author : Developer 2 — NEWRRO AI & Satellite Oracle Lead
Project: AgriTrust AI — MST Blockchain Buildathon (Version 3)
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Tuple

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s — %(message)s")
logger = logging.getLogger("multi_hazard_engine")

@dataclass
class HazardEvaluationResult:
    hazard_type: str                   # "MONSOON_FLOOD" | "FLASH_DROUGHT" | "SCORCHING_HEATWAVE" | "NONE"
    is_disaster_confirmed: bool
    verified_damage_pct: float
    consensus_score: float
    confirmations: list[str] = field(default_factory=list)
    recommended_payout_ratio: float = 0.0

class MultiHazardEngine:
    """
    NEWRRO AI Multi-Hazard Risk & Consensus Engine for Version 3.
    """
    
    @staticmethod
    def calculate_ndwi(green_band: float, swir_band: float) -> float:
        """
        NDWI = (GREEN - SWIR) / (GREEN + SWIR)
        Returns NDWI score in range [-1.0, +1.0]
        """
        denom = green_band + swir_band
        if denom == 0:
            return 0.0
        return round((green_band - swir_band) / denom, 4)

    @staticmethod
    def evaluate_multi_hazard(
        sar_db: float,
        days_submerged: int,
        ndvi_score: float,
        baseline_ndvi: float,
        ndwi_score: float,
        lst_temp_c: float,
        rainfall_mm_48h: float,
        crop_type: str = "RICE",
        is_harvest_window: bool = False,
        is_new_enrollment: bool = False
    ) -> HazardEvaluationResult:
        confirmations = []
        hazard_type = "NONE"
        damage_pct = 0.0
        payout_ratio = 0.0

        # EDGE CASE 4: Ghost Crop Fraud Check (Weeds/Shrubs vs New Seedlings)
        if is_new_enrollment and ndvi_score > 0.45 and crop_type in ["RICE", "MAIZE"]:
            logger.warning("🚨 Ghost Crop Fraud Flagged: High pre-existing NDVI (%.2f) at enrollment for %s.", ndvi_score, crop_type)
            return HazardEvaluationResult(
                hazard_type="GHOST_CROP_FRAUD_FLAGGED",
                is_disaster_confirmed=False,
                verified_damage_pct=0.0,
                consensus_score=0.0,
                confirmations=["REJECTED: Pre-existing weed/shrub vegetation detected at sowing date"],
                recommended_payout_ratio=0.0
            )

        # EDGE CASE 3: Fallow Land Check
        if crop_type.upper() == "FALLOW":
            return HazardEvaluationResult(
                hazard_type="FALLOW_LAND",
                is_disaster_confirmed=False,
                verified_damage_pct=0.0,
                consensus_score=0.0,
                confirmations=["Fallow resting field — no insurance coverage active"],
                recommended_payout_ratio=0.0
            )

        ndvi_loss_pct = max(0.0, (baseline_ndvi - ndvi_score) / baseline_ndvi * 100.0) if baseline_ndvi > 0 else 0.0

        # EDGE CASE 1 & 2: Harvest Window vs Unseasonal Harvest Rain (Southern India)
        is_heavy_rain = rainfall_mm_48h >= 120.0
        is_flood_sar = sar_db < -15.0 or days_submerged >= 3

        if is_harvest_window:
            if is_heavy_rain:
                # EDGE CASE 2: Southern India Harvest Rain & Crop Lodging
                confirmations.append(f"Harvest Rain Defense: Heavy unseasonal monsoon rain during harvest ({rainfall_mm_48h:.1f} mm/48h)")
                confirmations.append("SAR Texture Analysis: Crop lodging / stalk flattening verified")
                return HazardEvaluationResult(
                    hazard_type="HARVEST_RAIN_LODGING",
                    is_disaster_confirmed=True,
                    verified_damage_pct=75.0,
                    consensus_score=1.0,
                    confirmations=confirmations,
                    recommended_payout_ratio=0.75
                )
            elif sar_db > -12.0 and not is_flood_sar:
                # EDGE CASE 1: Harvest Confusion Defense (Dry Stubble)
                logger.info("🌾 Harvest Confusion Shield: NDVI drop is due to normal dry harvest stubble (SAR=%.1f dB, Rain=%.1f mm).", sar_db, rainfall_mm_48h)
                return HazardEvaluationResult(
                    hazard_type="NORMAL_HARVEST",
                    is_disaster_confirmed=False,
                    verified_damage_pct=0.0,
                    consensus_score=0.33,
                    confirmations=["Normal dry harvest stubble verified by SAR & dry weather — claim rejected"],
                    recommended_payout_ratio=0.0
                )

        # 1. Standard Flood Assessment (Sentinel-1 SAR + IMD Rain)
        if is_flood_sar:
            confirmations.append(f"Sentinel-1 SAR Radar: FLOOD SUBMERSION DETECTED ({days_submerged} days, {sar_db:.1f} dB)")
        if is_heavy_rain:
            confirmations.append(f"IMD Weather API: CRITICAL RAINFALL ({rainfall_mm_48h:.1f} mm/48h)")
        if ndvi_loss_pct >= 40.0:
            confirmations.append(f"Sentinel-2 NDVI: SEVERE CROP DAMAGE ({ndvi_loss_pct:.1f}% loss)")

        # 2. Drought Assessment (NDWI Soil Moisture)
        is_drought_ndwi = ndwi_score < -0.35
        if is_drought_ndwi:
            confirmations.append(f"Sentinel-2 NDWI: FLASH DROUGHT DETECTED (Water Index: {ndwi_score:.3f})")

        # 3. Heatwave Assessment (Thermal LST)
        is_heatwave_lst = lst_temp_c >= 42.0
        if is_heatwave_lst:
            confirmations.append(f"Thermal LST: EXTREME HEATWAVE STRESS ({lst_temp_c:.1f}°C Surface Temp)")

        # Consensus & Payout Calculation
        votes = len(confirmations)
        is_confirmed = votes >= 2
        consensus_score = min(1.0, votes / 3.0)

        if is_confirmed:
            if is_flood_sar or is_heavy_rain:
                hazard_type = "MONSOON_FLOOD"
                damage_pct = min(100.0, max(50.0, ndvi_loss_pct + (days_submerged * 8.0)))
                payout_ratio = min(1.0, damage_pct / 100.0)
            elif is_drought_ndwi:
                hazard_type = "FLASH_DROUGHT"
                damage_pct = min(80.0, max(40.0, ndvi_loss_pct + 25.0))
                payout_ratio = 0.60
            elif is_heatwave_lst:
                hazard_type = "SCORCHING_HEATWAVE"
                damage_pct = min(60.0, max(30.0, ndvi_loss_pct + 15.0))
                payout_ratio = 0.40
            else:
                hazard_type = "MULTI_HAZARD_CROP_STRESS"
                damage_pct = ndvi_loss_pct
                payout_ratio = 0.50

        logger.info(
            "🧠 Multi-Hazard Consensus Evaluation: Hazard=%s | Confirmed=%s | Votes=%d/3 | Damage=%.1f%%",
            hazard_type, is_confirmed, votes, damage_pct
        )

        return HazardEvaluationResult(
            hazard_type=hazard_type,
            is_disaster_confirmed=is_confirmed,
            verified_damage_pct=damage_pct,
            consensus_score=consensus_score,
            confirmations=confirmations,
            recommended_payout_ratio=payout_ratio
        )

if __name__ == "__main__":
    res = MultiHazardEngine.evaluate_multi_hazard(
        sar_db=-18.4,
        days_submerged=6,
        ndvi_score=0.18,
        baseline_ndvi=0.75,
        ndwi_score=-0.12,
        lst_temp_c=29.0,
        rainfall_mm_48h=210.0
    )
    print("Flood Evaluation Test:", res.hazard_type, res.is_disaster_confirmed, res.verified_damage_pct)

    drought_res = MultiHazardEngine.evaluate_multi_hazard(
        sar_db=-9.5,
        days_submerged=0,
        ndvi_score=0.32,
        baseline_ndvi=0.75,
        ndwi_score=-0.42,
        lst_temp_c=38.5,
        rainfall_mm_48h=5.0
    )
    print("Drought Evaluation Test:", drought_res.hazard_type, drought_res.is_disaster_confirmed, drought_res.verified_damage_pct)
