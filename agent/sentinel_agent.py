"""
sentinel_agent.py
=================
Developer 2 | Day 3 Task — AgriTrust AI
Autonomous Sentinel AI Monitoring Agent

Continuously polls enrolled farm plots from FarmRegistry.sol,
runs satellite analysis, evaluates 2-of-3 consensus, signs disaster
proofs, and triggers payouts on AgriTrustVault.sol — all in 2 seconds.

Author : Developer 2 — NEWRRO AI & Satellite Oracle Lead
Project: AgriTrust AI — MST Blockchain Buildathon
"""

from __future__ import annotations

import json
import logging
import os
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional

# ---------------------------------------------------------------------------
# Logging — coloured console output for demo visibility
# ---------------------------------------------------------------------------
logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    level=logging.INFO,
)
logger = logging.getLogger("sentinel_agent")

# ---------------------------------------------------------------------------
# Contract ABIs (minimal subset — full ABIs loaded from artifact files)
# ---------------------------------------------------------------------------

FARM_REGISTRY_ABI = [
    {
        "inputs": [],
        "name": "getEnrolledPlotCount",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "uint256", "name": "plotId", "type": "uint256"}],
        "name": "getFarmPlot",
        "outputs": [
            {"internalType": "uint256", "name": "id",             "type": "uint256"},
            {"internalType": "address", "name": "ownerWallet",    "type": "address"},
            {"internalType": "string",  "name": "polygonGeoJSON", "type": "string"},
            {"internalType": "uint256", "name": "acreage",        "type": "uint256"},
            {"internalType": "string",  "name": "cropType",       "type": "string"},
            {"internalType": "bool",    "name": "isEnrolled",     "type": "bool"},
        ],
        "stateMutability": "view",
        "type": "function",
    },
]

AGRI_VAULT_ABI = [
    {
        "inputs": [
            {"internalType": "uint256", "name": "plotId",       "type": "uint256"},
            {"internalType": "uint256", "name": "payoutAmount", "type": "uint256"},
            {"internalType": "uint256", "name": "timestamp",    "type": "uint256"},
            {"internalType": "bytes",   "name": "signature",    "type": "bytes"},
        ],
        "name": "triggerDisasterPayout",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "getEscrowBalance",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
]

# ---------------------------------------------------------------------------
# Config defaults
# ---------------------------------------------------------------------------

DEFAULT_RPC_URL          = "http://127.0.0.1:8545"
DEFAULT_CHAIN_ID         = 31337
POLL_INTERVAL_SECONDS    = 30
MAX_PAYOUT_PER_PLOT_WEI  = 40_000 * 10**18   # 40,000 MST ceiling

# ---------------------------------------------------------------------------
# Plot monitoring result
# ---------------------------------------------------------------------------

@dataclass
class PlotMonitorResult:
    """Result of a single plot monitoring cycle."""
    plot_id: int
    owner: str
    location: str
    crop_type: str
    ndvi_value: float
    sar_flood_days: int
    rainfall_mm_48h: float
    consensus_approved: bool
    damage_pct: float
    payout_wei: int
    tx_hash: Optional[str] = None
    error: Optional[str] = None
    timestamp: float = field(default_factory=time.time)


# ---------------------------------------------------------------------------
# SentinelAgent
# ---------------------------------------------------------------------------

class SentinelAgent:
    """
    Autonomous AI agent that monitors enrolled farm plots and
    triggers disaster payouts on MST Blockchain.

    Monitoring Loop (every POLL_INTERVAL_SECONDS):
      1. Connect to Web3 MST node
      2. Fetch enrolled plot list from FarmRegistry.sol
      3. For each plot:
         a. Fetch Sentinel-2 (NIR/RED) and Sentinel-1 SAR data
         b. Calculate NDVI and SAR flood duration
         c. Run 2-of-3 oracle consensus
         d. If approved: sign EIP-191 proof, call triggerDisasterPayout()
         e. Log result with TX hash

    Usage
    -----
    >>> agent = SentinelAgent(
    ...     oracle_private_key="0x...",
    ...     farm_registry_address="0x...",
    ...     vault_address="0x...",
    ... )
    >>> agent.start()          # Blocking loop
    >>> agent.run_once()       # Single cycle (for testing)
    """

    def __init__(
        self,
        oracle_private_key: Optional[str]  = None,
        farm_registry_address: Optional[str] = None,
        vault_address: Optional[str]         = None,
        rpc_url: str                         = DEFAULT_RPC_URL,
        chain_id: int                        = DEFAULT_CHAIN_ID,
        poll_interval: int                   = POLL_INTERVAL_SECONDS,
        config_dir: Optional[str]            = None,
    ):
        self.rpc_url       = rpc_url
        self.chain_id      = chain_id
        self.poll_interval = poll_interval

        # Load addresses from config file if not provided
        cfg = self._load_config(config_dir)
        self.farm_registry_address = farm_registry_address or cfg.get("FarmRegistry")
        self.vault_address         = vault_address         or cfg.get("AgriTrustVault")

        # Private key: env var > constructor arg > Hardhat demo key
        pk = oracle_private_key or os.environ.get("ORACLE_PRIVATE_KEY")

        # Lazy-import heavy deps so the agent can be imported without web3
        self._pk = pk
        self._web3 = None          # Initialized on first connect
        self._farm_registry = None
        self._vault = None
        self._oracle_account = None

        # Sub-components
        from satellite_fetcher import SatelliteFetcher
        from oracle_consensus import MultiSourceConsensusEngine
        from proof_signer import EIP191ProofSigner
        from voice_notifier import VoiceNotifier

        self._fetcher   = SatelliteFetcher()
        self._consensus = MultiSourceConsensusEngine()
        self._signer    = EIP191ProofSigner(private_key=pk)
        self._voice     = VoiceNotifier(enable_audio=False)

        self._running   = False
        self._cycle_num = 0

        logger.info("🤖  SentinelAgent initialized. Oracle: %s", self._signer.address)

    # ------------------------------------------------------------------
    # Config loader
    # ------------------------------------------------------------------

    def _load_config(self, config_dir: Optional[str]) -> dict:
        """
        Try to load deployed contract addresses from:
          agent/config/contracts.json  (written by Developer 1's deploy script)
        """
        search_dirs = []
        if config_dir:
            search_dirs.append(Path(config_dir))
        # Default: look relative to this file
        search_dirs.append(Path(__file__).parent / "config")

        for d in search_dirs:
            cfg_file = d / "contracts.json"
            if cfg_file.exists():
                try:
                    with open(cfg_file) as f:
                        data = json.load(f)
                    logger.info("📄  Loaded contract config from %s", cfg_file)
                    return data
                except Exception as exc:
                    logger.warning("⚠️  Could not read %s: %s", cfg_file, exc)

        # No config file found — return empty dict (demo mode)
        logger.info("📄  No contracts.json found — running in demo/simulation mode.")
        return {}

    # ------------------------------------------------------------------
    # Web3 connection
    # ------------------------------------------------------------------

    def _connect(self) -> bool:
        """
        Connect to the MST Hardhat node and bind contract instances.
        Returns True if connected, False if node is offline (demo mode).
        """
        try:
            from web3 import Web3

            self._web3 = Web3(Web3.HTTPProvider(self.rpc_url))
            if not self._web3.is_connected():
                raise ConnectionError(f"Cannot connect to node at {self.rpc_url}")

            self._oracle_account = self._web3.eth.account.from_key(
                self._pk or "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
            )

            # Bind contracts if addresses are known
            if self.farm_registry_address:
                self._farm_registry = self._web3.eth.contract(
                    address=Web3.to_checksum_address(self.farm_registry_address),
                    abi=FARM_REGISTRY_ABI,
                )
            if self.vault_address:
                self._vault = self._web3.eth.contract(
                    address=Web3.to_checksum_address(self.vault_address),
                    abi=AGRI_VAULT_ABI,
                )

            balance = self._web3.eth.get_balance(self._oracle_account.address)
            logger.info(
                "✅  Connected to MST node: %s | Oracle balance: %.4f MST | Chain: %d",
                self.rpc_url,
                self._web3.from_wei(balance, "ether"),
                self.chain_id,
            )
            return True

        except ImportError:
            logger.warning("⚠️  web3 not installed — running in DEMO (offline) mode.")
            return False
        except Exception as exc:
            logger.warning("⚠️  MST node offline (%s) — running in DEMO mode.", exc)
            return False

    # ------------------------------------------------------------------
    # Plot data fetching
    # ------------------------------------------------------------------

    def _get_enrolled_plots(self) -> list[dict]:
        """
        Return list of enrolled plot dicts from FarmRegistry.sol.
        Falls back to demo plots when node is offline.
        """
        if self._farm_registry:
            try:
                count = self._farm_registry.functions.getEnrolledPlotCount().call()
                plots = []
                for i in range(1, count + 1):
                    raw = self._farm_registry.functions.getFarmPlot(i).call()
                    plots.append({
                        "id": raw[0], "owner": raw[1], "geojson": raw[2],
                        "acreage": raw[3], "cropType": raw[4], "enrolled": raw[5],
                    })
                return [p for p in plots if p["enrolled"]]
            except Exception as exc:
                logger.warning("⚠️  FarmRegistry call failed (%s), using demo plots.", exc)

        # Demo fallback plots
        return [
            {
                "id": 1, "owner": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
                "geojson": json.dumps({
                    "type": "Polygon",
                    "coordinates": [[[85.8977, 26.1234], [85.9123, 26.1234],
                                     [85.9123, 26.1089], [85.8977, 26.1089],
                                     [85.8977, 26.1234]]],
                }),
                "acreage": 3, "cropType": "RICE", "enrolled": True,
                "farmerName": "Ram Singh", "location": "Darbhanga, Bihar",
            },
            {
                "id": 2, "owner": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
                "geojson": json.dumps({
                    "type": "Polygon",
                    "coordinates": [[[94.1714, 26.7541], [94.2000, 26.7541],
                                     [94.2000, 26.7300], [94.1714, 26.7300],
                                     [94.1714, 26.7541]]],
                }),
                "acreage": 5, "cropType": "RICE", "enrolled": True,
                "farmerName": "Prasanta Kalita", "location": "Majuli, Assam",
            },
        ]

    # ------------------------------------------------------------------
    # Single plot monitoring
    # ------------------------------------------------------------------

    def _monitor_plot(self, plot: dict) -> PlotMonitorResult:
        """Run the full monitoring pipeline for a single plot."""
        plot_id   = plot["id"]
        owner     = plot.get("owner", "UNKNOWN")
        location  = plot.get("location", f"Plot {plot_id}")
        crop_type = plot.get("cropType", "UNKNOWN")
        farmer    = plot.get("farmerName", f"Farmer #{plot_id}")

        logger.info(
            "\n┌─────────────────────────────────────────────────────┐\n"
            "│  Monitoring Plot %-4d | %-28s │\n"
            "│  Owner: %-43s │\n"
            "└─────────────────────────────────────────────────────┘",
            plot_id, location, owner[:43],
        )

        try:
            # Parse GeoJSON polygon
            geojson = json.loads(plot.get("geojson", "{}")) if isinstance(plot.get("geojson"), str) else {}

            # 1. Fetch satellite data
            optical, sar_data = self._fetcher.fetch_both(geojson, plot_id=str(plot_id))

            # 2. Calculate NDVI and flood duration
            from ndvi_calculator import NDVICalculator
            calc = NDVICalculator()
            ndvi_result = calc.calculate_ndvi(optical.nir_band8, optical.red_band4)
            sar_result  = calc.calculate_sar_flood_duration(sar_data.backscatter_db_series)

            # Pre-event baseline: use healthy crop NDVI 0.75 as reference
            PRE_EVENT_NDVI = 0.75
            loss_result = calc.evaluate_crop_loss(PRE_EVENT_NDVI, ndvi_result.ndvi)

            # 3. Fetch rainfall (simulated — OpenWeather key optional)
            from oracle_consensus import RainTelemetryClient
            rain_client = RainTelemetryClient()
            # Extract centroid from GeoJSON for rain API call
            coords = geojson.get("coordinates", [[[0, 0]]])[0][0]
            lon, lat = coords[0], coords[1]
            rainfall_mm = rain_client.fetch_rainfall_48h(lat, lon)

            # 4. Oracle consensus
            consensus = self._consensus.evaluate(
                plot_id=str(plot_id),
                sar_flood_days=sar_result.flood_days,
                ndvi_loss_pct=loss_result.damage_pct,
                rainfall_mm_48h=rainfall_mm,
            )

            # 5. Sign and execute payout if approved
            tx_hash = None
            payout_wei = 0
            if consensus.is_approved:
                payout_fraction = min(1.0, consensus.verified_damage_pct / 100.0)
                payout_wei = int(MAX_PAYOUT_PER_PLOT_WEI * payout_fraction)

                proof = self._signer.sign_disaster_proof(
                    plot_id=plot_id,
                    payout_amount_wei=payout_wei,
                    chain_id=self.chain_id,
                )

                tx_hash = self._execute_payout(plot_id, payout_wei, proof.timestamp, proof.signature_hex)

                payout_mst = payout_wei / 10**18
                voice_msg = self._voice.generate_and_speak(
                    farmer_name=farmer,
                    location=location,
                    flood_days=sar_result.flood_days,
                    payout_inr=payout_mst,
                    language="hindi",
                    approved=True,
                )
                logger.info("🔊  Voice Alert: %s", voice_msg[:120] + "…")

            return PlotMonitorResult(
                plot_id=plot_id,
                owner=owner,
                location=location,
                crop_type=crop_type,
                ndvi_value=ndvi_result.ndvi,
                sar_flood_days=sar_result.flood_days,
                rainfall_mm_48h=rainfall_mm,
                consensus_approved=consensus.is_approved,
                damage_pct=consensus.verified_damage_pct,
                payout_wei=payout_wei,
                tx_hash=tx_hash,
                timestamp=time.time(),
            )

        except Exception as exc:
            logger.error("❌  Error monitoring plot %d: %s", plot_id, exc, exc_info=True)
            return PlotMonitorResult(
                plot_id=plot_id, owner=owner, location=location, crop_type=crop_type,
                ndvi_value=0.0, sar_flood_days=0, rainfall_mm_48h=0.0,
                consensus_approved=False, damage_pct=0.0, payout_wei=0,
                error=str(exc),
            )

    # ------------------------------------------------------------------
    # On-chain payout execution
    # ------------------------------------------------------------------

    def _execute_payout(
        self,
        plot_id: int,
        payout_wei: int,
        timestamp: int,
        signature_hex: str,
    ) -> Optional[str]:
        """
        Call AgriTrustVault.triggerDisasterPayout() on MST Blockchain.
        Returns the transaction hash string, or None if in demo mode.
        """
        if self._vault is None or self._web3 is None:
            logger.info(
                "📋  DEMO MODE — Would execute payout on-chain:\n"
                "    triggerDisasterPayout(%d, %d, %d, %s…)",
                plot_id, payout_wei, timestamp, signature_hex[:20],
            )
            return f"DEMO_TX_{plot_id}_{int(time.time())}"

        try:
            nonce = self._web3.eth.get_transaction_count(self._oracle_account.address)
            sig_bytes = bytes.fromhex(signature_hex[2:])

            tx = self._vault.functions.triggerDisasterPayout(
                plot_id, payout_wei, timestamp, sig_bytes
            ).build_transaction({
                "from": self._oracle_account.address,
                "gas": 300_000,
                "gasPrice": self._web3.to_wei("20", "gwei"),
                "nonce": nonce,
                "chainId": self.chain_id,
            })

            signed_tx = self._web3.eth.account.sign_transaction(
                tx, private_key=self._oracle_account.key
            )
            tx_hash = self._web3.eth.send_raw_transaction(signed_tx.raw_transaction)
            receipt = self._web3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)

            if receipt["status"] == 1:
                logger.info(
                    "✅  ON-CHAIN PAYOUT EXECUTED:\n"
                    "    TX Hash  : %s\n"
                    "    Gas Used : %d\n"
                    "    Amount   : %.4f MST",
                    tx_hash.hex(),
                    receipt["gasUsed"],
                    payout_wei / 10**18,
                )
                return "0x" + tx_hash.hex()
            else:
                logger.error("❌  Transaction reverted. Receipt: %s", receipt)
                return None

        except Exception as exc:
            logger.error("❌  Payout transaction failed: %s", exc)
            return None

    # ------------------------------------------------------------------
    # Monitoring loop
    # ------------------------------------------------------------------

    def run_once(self) -> list[PlotMonitorResult]:
        """
        Execute a single monitoring cycle across all enrolled plots.
        Returns list of PlotMonitorResult objects.
        """
        self._cycle_num += 1
        connected = self._connect()

        logger.info(
            "\n╔══════════════════════════════════════════════════════╗\n"
            "║  SENTINEL AGENT — Cycle #%-3d | %s\n"
            "║  Mode: %-47s║\n"
            "╚══════════════════════════════════════════════════════╝",
            self._cycle_num,
            time.strftime("%Y-%m-%d %H:%M:%S"),
            "LIVE (MST Node Connected)" if connected else "DEMO (Offline Simulation)",
        )

        plots = self._get_enrolled_plots()
        logger.info("🌾  Found %d enrolled plot(s) to monitor.", len(plots))

        results = []
        for plot in plots:
            result = self._monitor_plot(plot)
            results.append(result)
            self._log_result(result)

        logger.info(
            "\n📊  Cycle #%d Summary: %d plots processed | %d payouts triggered",
            self._cycle_num,
            len(results),
            sum(1 for r in results if r.consensus_approved),
        )
        return results

    def _log_result(self, r: PlotMonitorResult) -> None:
        """Print a formatted one-line summary of a plot result."""
        status = "✅ PAYOUT" if r.consensus_approved else "🌱 HEALTHY"
        tx = f"TX={r.tx_hash[:16]}…" if r.tx_hash else "no tx"
        logger.info(
            "  [%s] Plot %-3d | NDVI=%.2f | SAR=%dd | Rain=%.0fmm | Dmg=%.0f%% | %s | %s",
            status, r.plot_id, r.ndvi_value, r.sar_flood_days,
            r.rainfall_mm_48h, r.damage_pct,
            f"{r.payout_wei / 10**18:,.0f} MST" if r.payout_wei else "0 MST",
            tx,
        )

    def start(self, max_cycles: Optional[int] = None) -> None:
        """
        Start the continuous monitoring loop.

        Parameters
        ----------
        max_cycles : int, optional
            Stop after N cycles (useful for tests). None = run indefinitely.
        """
        self._running = True
        logger.info("🚀  SentinelAgent started — polling every %ds.", self.poll_interval)

        try:
            while self._running:
                self.run_once()
                if max_cycles is not None and self._cycle_num >= max_cycles:
                    logger.info("✅  Reached max_cycles=%d. Stopping.", max_cycles)
                    break
                logger.info("⏳  Sleeping %ds until next cycle…", self.poll_interval)
                time.sleep(self.poll_interval)
        except KeyboardInterrupt:
            logger.info("\n🛑  SentinelAgent stopped by user (Ctrl+C).")
        finally:
            self._running = False

    def stop(self) -> None:
        """Signal the monitoring loop to stop after the current cycle."""
        self._running = False
        logger.info("🛑  SentinelAgent stop requested.")


# ---------------------------------------------------------------------------
# CLI Entry Point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="AgriTrust AI — Sentinel Monitoring Agent"
    )
    parser.add_argument(
        "--rpc",
        default=DEFAULT_RPC_URL,
        help=f"MST node RPC URL (default: {DEFAULT_RPC_URL})",
    )
    parser.add_argument(
        "--key",
        default=None,
        help="Oracle private key (0x-prefixed). Falls back to ORACLE_PRIVATE_KEY env var.",
    )
    parser.add_argument(
        "--registry",
        default=None,
        help="FarmRegistry contract address (0x-prefixed).",
    )
    parser.add_argument(
        "--vault",
        default=None,
        help="AgriTrustVault contract address (0x-prefixed).",
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Run a single monitoring cycle then exit.",
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=POLL_INTERVAL_SECONDS,
        help=f"Polling interval in seconds (default: {POLL_INTERVAL_SECONDS}).",
    )
    args = parser.parse_args()

    agent = SentinelAgent(
        oracle_private_key=args.key,
        farm_registry_address=args.registry,
        vault_address=args.vault,
        rpc_url=args.rpc,
        poll_interval=args.interval,
    )

    if args.once:
        agent.run_once()
    else:
        agent.start()
