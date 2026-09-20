class NDVICalculator:
    """
    NEWRRO AI Satellite Analytics Engine:
    Calculates Normalized Difference Vegetation Index (NDVI) & SAR Radar Flood Submersion Duration.
    """
    @staticmethod
    def calculate_ndvi(nir, red):
        """
        Formula: NDVI = (NIR - RED) / (NIR + RED)
        Returns NDVI score in range [-1.0, +1.0]
        """
        if (nir + red) == 0:
            return 0.0
        ndvi = (nir - red) / (nir + red)
        return round(ndvi, 3)

    @staticmethod
    def evaluate_crop_health(ndvi_score):
        if ndvi_score >= 0.65:
            return "EXCELLENT_HEALTHY_CROP", 0.0  # 0% loss
        elif ndvi_score >= 0.45:
            return "MODERATE_STRESS", 0.25         # 25% loss
        elif ndvi_score >= 0.25:
            return "SEVERE_DAMAGE", 0.60          # 60% loss
        else:
            return "TOTAL_CROP_DESTRUCTION", 1.0  # 100% loss

    @staticmethod
    def evaluate_sar_flood_inundation(vv_backscatter_db, days_submerged):
        """
        SAR radar backscatter < -18.0 dB indicates standing water body over farm plot.
        Graduated Inundation Loss Curve:
        - Submerged 1-3 days: 30% Loss (Partial Replanting Escrow)
        - Submerged 4-7 days: 70% Loss (Major Relief)
        - Submerged 8+ days: 100% Loss (Total Destruction Escrow)
        """
        is_submerged = vv_backscatter_db < -18.0 or days_submerged > 0
        if not is_submerged:
            return "NO_FLOOD", 0.0

        if days_submerged >= 8:
            return "CRITICAL_TOTAL_INUNDATION", 1.0
        elif days_submerged >= 4:
            return "SEVERE_MAJOR_INUNDATION", 0.70
        elif days_submerged >= 1:
            return "PARTIAL_INUNDATION", 0.30
        else:
            return "FLASH_FLOOD_DETECTED", 0.30

if __name__ == "__main__":
    ndvi = NDVICalculator.calculate_ndvi(0.75, 0.12)
    status, loss = NDVICalculator.evaluate_crop_health(ndvi)
    print(f"🌾 Calculated Baseline NDVI: {ndvi} -> Health: {status} (Loss: {loss * 100}%)")

    flood_status, flood_loss = NDVICalculator.evaluate_sar_flood_inundation(-22.5, days_submerged=6)
    print(f"🌊 SAR Radar Inundation (-22.5 dB, 6 Days): Status: {flood_status} -> Payout Loss Ratio: {flood_loss * 100}%")
