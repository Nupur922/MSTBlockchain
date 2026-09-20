class DisasterScenarioSimulator:
    """
    Demo Scenario Generator for Hackathon Dry Runs:
    Simulates satellite telemetry for real Indian flood disaster zones.
    """
    @staticmethod
    def get_scenario_baseline(plot_id=1):
        return {
            "scenario_name": "Pre-Season Baseline (Majuli, Assam)",
            "plot_id": plot_id,
            "region": "Majuli Island, Brahmaputra Basin, Assam",
            "ndvi_score": 0.75,
            "sar_backscatter_db": -10.5,
            "days_submerged": 0,
            "rainfall_24h_mm": 15.0,
            "status": "HEALTHY_GROWING_CROP",
            "payout_ratio": 0.0
        }

    @staticmethod
    def get_scenario_assam_flood(plot_id=1):
        return {
            "scenario_name": "Brahmaputra River Monsoon Flood (Assam)",
            "plot_id": plot_id,
            "region": "Majuli Island, Brahmaputra Basin, Assam",
            "ndvi_score": 0.32,
            "sar_backscatter_db": -22.4, # SAR Radar detected standing floodwater through storm clouds
            "days_submerged": 6,
            "rainfall_24h_mm": 185.0,
            "status": "CRITICAL_FLOOD_SUBMERSION",
            "payout_ratio": 0.70 # 70% Major Loss Escrow Release
        }

    @staticmethod
    def get_scenario_bihar_kosi_flood(plot_id=1):
        return {
            "scenario_name": "Kosi River Flash Flood (Darbhanga, Bihar)",
            "plot_id": plot_id,
            "region": "Darbhanga District, Kosi Basin, Bihar",
            "ndvi_score": 0.18, # Total Paddy Crop Rot
            "sar_backscatter_db": -24.1,
            "days_submerged": 9,
            "rainfall_24h_mm": 210.0,
            "status": "TOTAL_CROP_DESTRUCTION",
            "payout_ratio": 1.00 # 100% Total Loss Escrow Release
        }

if __name__ == "__main__":
    baseline = DisasterScenarioSimulator.get_scenario_baseline()
    assam = DisasterScenarioSimulator.get_scenario_assam_flood()
    bihar = DisasterScenarioSimulator.get_scenario_bihar_kosi_flood()
    print(f"🌾 Baseline: {baseline['scenario_name']} -> Status: {baseline['status']}")
    print(f"🌊 Assam Flood: {assam['scenario_name']} -> Payout Ratio: {assam['payout_ratio']*100}%")
    print(f"🌊 Bihar Flood: {bihar['scenario_name']} -> Payout Ratio: {bihar['payout_ratio']*100}%")
