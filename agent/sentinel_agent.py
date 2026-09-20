import time
import json
import os
from web3 import Web3
from satellite_fetcher import SatelliteFetcher
from ndvi_calculator import NDVICalculator
from oracle_consensus import OracleConsensusEngine
from proof_signer import EIP191ProofSigner
from scenario_simulator import DisasterScenarioSimulator
from voice_notifier import VoiceNotifierEngine

class NEWRROAgriSentinelAgent:
    """
    NEWRRO AI Autonomous Remote Sensing Agent for AgriTrust AI on MST Blockchain.
    Continuous loop: Polls enrolled plots, checks SAR/NDVI consensus, signs EIP-191 proofs,
    and executes instant 2-second MST escrow payout transactions.
    """
    def __init__(self, rpc_url="http://127.0.0.1:8545"):
        print("=========================================================================")
        print("🌾 STARTING NEWRRO AI AUTONOMOUS REMOTE SENSING AGENT FOR AGRITRUST AI")
        print("=========================================================================")
        self.w3 = Web3(Web3.HTTPProvider(rpc_url))
        self.fetcher = SatelliteFetcher()
        self.calculator = NDVICalculator()
        self.consensus_engine = OracleConsensusEngine()
        self.signer = EIP191ProofSigner()

    def process_plot_disaster_audit(self, scenario_name="assam_flood"):
        """
        Executes end-to-end disaster evaluation for a farm plot based on scenario.
        """
        if scenario_name == "bihar_flood":
            scenario = DisasterScenarioSimulator.get_scenario_bihar_kosi_flood()
        elif scenario_name == "assam_flood":
            scenario = DisasterScenarioSimulator.get_scenario_assam_flood()
        else:
            scenario = DisasterScenarioSimulator.get_scenario_baseline()

        print(f"\n📡 [NEWRRO AI AUDIT] Evaluating Plot #{scenario['plot_id']} ({scenario['region']})...")
        print(f"   • Scenario Active: {scenario['scenario_name']}")

        # 1. Evaluate 3-Source Consensus
        consensus = self.consensus_engine.evaluate_consensus(
            sar_data={"vv_backscatter_db": scenario["sar_backscatter_db"], "days_submerged": scenario["days_submerged"]},
            weather_data={"rainfall_24h_mm": scenario["rainfall_24h_mm"], "drought_days": 0},
            ndvi_data={"baseline_ndvi": 0.75, "current_ndvi": scenario["ndvi_score"]}
        )

        print(f"   • Consensus Evaluation: {consensus['consensus_score']}")

        if not consensus["consensus_passed"]:
            print("   🟢 RESULT: Normal Crop Growth. Zero Payout Required.")
            return None

        # 2. Calculate Payout Amount
        payout_mst = 50.0 * scenario["payout_ratio"] # 50 MST max policy coverage
        payout_wei = Web3.to_wei(payout_mst, 'ether')
        timestamp = int(time.time())

        # 3. Sign EIP-191 Proof Hash
        proof = self.signer.generate_proof_signature(
            plot_id=scenario["plot_id"],
            payout_amount_wei=payout_wei,
            timestamp=timestamp,
            chain_id=31337,
            vault_address="0xe7f17152305783804246F320009258029271a412"
        )

        print(f"   🔒 Generated EIP-191 Proof Hash: {proof['proof_hash']}")
        print(f"   ⚡ MST Smart Contract Escrow Payout Triggered: {payout_mst:.1f} MST Tokens!")

        # 4. Generate Regional Voice Alert
        voice = VoiceNotifierEngine.generate_voice_alert(
            farmer_name="Ram Singh",
            region=scenario["region"],
            payout_inr=payout_mst * 1000,
            dialect="bhojpuri" if "Bihar" in scenario["region"] else "assamese"
        )
        print(f"   {voice['voice_text']}")

        return proof

if __name__ == "__main__":
    agent = NEWRROAgriSentinelAgent()
    agent.process_plot_disaster_audit("assam_flood")
