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

# ── V2.0: load agent credentials (ORACLE_PRIVATE_KEY, MST_RPC_URL, …) ────────
# Root .env first, then agent/config/.env (spec location) — the latter wins.
try:
    from dotenv import load_dotenv as _load_dotenv

    _AGENT_DIR = Path(__file__).resolve().parent
    _load_dotenv(_AGENT_DIR.parent / ".env")
    _load_dotenv(_AGENT_DIR / "config" / ".env")
except Exception:  # pragma: no cover - dotenv is optional
    pass

# ── Windows console: cp1252 cannot encode ✅/❌/🛰 — force UTF-8 output ───────
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except Exception:  # pragma: no cover - non-tty or exotic streams
        pass

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
        # Solidity returns a single dynamic struct, so the payload is prefixed
        # with an outer offset word. Declaring it as ONE tuple output keeps
        # eth-abi in sync with the on-chain encoding (a flat list of the 11
        # fields would shift every pointer by one word and fail to decode).
        "inputs": [{"internalType": "uint256", "name": "plotId", "type": "uint256"}],
        "name": "getFarmPlot",
        "outputs": [
            {
                "internalType": "struct FarmRegistry.FarmPlot",
                "name": "",
                "type": "tuple",
                "components": [
                    {"internalType": "uint256", "name": "id",             "type": "uint256"},
                    {"internalType": "address",  "name": "ownerWallet",    "type": "address"},
                    {"internalType": "string",   "name": "polygonGeoJSON", "type": "string"},
                    {"internalType": "uint256",  "name": "acreage",        "type": "uint256"},
                    {"internalType": "string",   "name": "cropType",       "type": "string"},
                    {"internalType": "bool",     "name": "isEnrolled",     "type": "bool"},
                    {"internalType": "uint256",  "name": "registeredAt",   "type": "uint256"},
                    {"internalType": "string",   "name": "khasraNumber",   "type": "string"},
                    {"internalType": "string",   "name": "khataNumber",    "type": "string"},
                    {"internalType": "string",   "name": "stateName",      "type": "string"},
                    {"internalType": "string",   "name": "districtName",   "type": "string"},
                ],
            }
        ],
        "stateMutability": "view",
        "type": "function",
    },
    {
        # Returns five separate strings (not a struct) → the payload is the
        # plain tuple head of five offsets, so these stay as flat outputs.
        "inputs": [{"internalType": "uint256", "name": "plotId", "type": "uint256"}],
        "name": "getPlotLandRecord",
        "outputs": [
            {"internalType": "string", "name": "khasraNumber",   "type": "string"},
            {"internalType": "string", "name": "khataNumber",    "type": "string"},
            {"internalType": "string", "name": "stateName",      "type": "string"},
            {"internalType": "string", "name": "districtName",   "type": "string"},
            {"internalType": "string", "name": "polygonGeoJSON", "type": "string"},
        ],
        "stateMutability": "view",
        "type": "function",
    },
]

AGRI_VAULT_ABI = [
    {
        # Inherited from OpenZeppelin AccessControl — used to assert that the
        # oracle wallet really holds ORACLE_ROLE before signing a payout proof.
        "inputs": [
            {"internalType": "bytes32", "name": "role",    "type": "bytes32"},
            {"internalType": "address",  "name": "account", "type": "address"},
        ],
        "name": "hasRole",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "ORACLE_ROLE",
        "outputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
        "stateMutability": "view",
        "type": "function",
    },
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
    {
        "inputs": [],
        "name": "getVaultBalance",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "uint256", "name": "plotId", "type": "uint256"}],
        "name": "getPolicyForPlot",
        "outputs": [
            {"internalType": "uint256", "name": "policyId",        "type": "uint256"},
            {"internalType": "address",  "name": "farmerWallet",   "type": "address"},
            {"internalType": "uint256",  "name": "insuredAmountMST", "type": "uint256"},
            {"internalType": "bool",     "name": "isActive",       "type": "bool"},
        ],
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
        rpc_url: Optional[str]               = None,
        chain_id: Optional[int]              = None,
        poll_interval: int                   = POLL_INTERVAL_SECONDS,
        config_dir: Optional[str]            = None,
    ):
        # V2.0: .env (MST_RPC_URL / MST_CHAIN_ID) beats the hardcoded defaults
        self.rpc_url       = rpc_url  or os.getenv("MST_RPC_URL")   or DEFAULT_RPC_URL
        self.chain_id      = chain_id or int(os.getenv("MST_CHAIN_ID") or DEFAULT_CHAIN_ID)
        self.poll_interval = poll_interval

        # Load addresses from config file if not provided
        cfg = self._load_config(config_dir)

        def _valid(addr: Optional[str]) -> Optional[str]:
            """Ignore blank / all-zero placeholder addresses from .env.example."""
            if not addr:
                return None
            a = str(addr).strip()
            if not a.startswith("0x") or len(a) != 42 or set(a[2:]) == {"0"}:
                return None
            return a

        self.farm_registry_address = (
            _valid(farm_registry_address)                          # 1. --registry flag
            or _valid(os.getenv("FARM_REGISTRY_ADDRESS"))          # 2. .env (spec: Dev 1 handoff)
            or _valid(cfg.get("FarmRegistry"))                     # 3. contracts.json
        )
        self.vault_address = (
            _valid(vault_address)                                  # 1. --vault flag
            or _valid(os.getenv("AGRI_TRUST_VAULT_ADDRESS"))       # 2. .env (spec: Dev 1 handoff)
            or _valid(cfg.get("AgriTrustVault"))                   # 3. contracts.json
        )
        # NOTE: .env outranks contracts.json so the documented handoff flow
        # ("update .env, then run --once") actually takes effect. deploy.js
        # rewrites both files in the same pass, so they agree after a deploy;
        # when a developer hand-edits .env, that edit must win.

        # Private key: env var > constructor arg > Hardhat demo key
        pk = oracle_private_key or os.environ.get("ORACLE_PRIVATE_KEY")

        # Lazy-import heavy deps so the agent can be imported without web3
        self._pk = pk
        self._web3 = None          # Initialized on first connect
        self._farm_registry = None
        self._vault = None
        self._oracle_account = None

        # Sub-components with graceful fallback if optional packages missing
        try:
            from satellite_fetcher import SatelliteFetcher
            self._fetcher = SatelliteFetcher()
        except ImportError as e:
            logger.info("ℹ️  SatelliteFetcher optional dependencies missing (%s) — using satellite fallback simulation.", e)
            self._fetcher = None

        try:
            from oracle_consensus import MultiSourceConsensusEngine
            self._consensus = MultiSourceConsensusEngine()
        except ImportError as e:
            logger.info("ℹ️  OracleConsensus fallback (%s).", e)
            self._consensus = None

        try:
            from proof_signer import EIP191ProofSigner
            # V2.0: bind the deployed AgriTrustVault address into every proof so
            # the payload matches `abi.encodePacked(..., address(this))` on-chain.
            self._signer = EIP191ProofSigner(private_key=pk, vault_address=self.vault_address)
            oracle_addr = self._signer.address
        except Exception:
            self._signer = None
            oracle_addr = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"

        try:
            from voice_notifier import VoiceNotifier
            self._voice = VoiceNotifier(enable_audio=False)
        except Exception:
            self._voice = None

        self._running   = False
        self._cycle_num = 0

        logger.info("🤖  SentinelAgent initialized. Oracle: %s", oracle_addr)

    # ------------------------------------------------------------------
    # Config loader
    # ------------------------------------------------------------------

    def _load_config(self, config_dir: Optional[str]) -> dict:
        """
        Try to load deployed contract addresses from:
          agent/config/contracts.json or contract-addresses.json
        """
        search_dirs = []
        if config_dir:
            search_dirs.append(Path(config_dir))
        search_dirs.append(Path(__file__).parent / "config")
        search_dirs.append(Path(__file__).parent.parent / "frontend" / "src" / "contracts")

        for d in search_dirs:
            for fname in ["contracts.json", "contract-addresses.json"]:
                cfg_file = d / fname
                if cfg_file.exists():
                    try:
                        with open(cfg_file) as f:
                            data = json.load(f)
                        logger.info("📄  Loaded contract config from %s", cfg_file)
                        
                        # Normalize nested format if present (e.g. {"contracts": {"FarmRegistry": "0x..."}})
                        result = {}
                        if "contracts" in data and isinstance(data["contracts"], dict):
                            result["FarmRegistry"] = data["contracts"].get("FarmRegistry")
                            result["AgriTrustVault"] = data["contracts"].get("AgriTrustVault")
                        if "FarmRegistry" in data:
                            result["FarmRegistry"] = data["FarmRegistry"]
                        if "AgriTrustVault" in data:
                            result["AgriTrustVault"] = data["AgriTrustVault"]
                            
                        return result
                    except Exception as exc:
                        logger.warning("⚠️  Could not read %s: %s", cfg_file, exc)

        logger.info("📄  No contract address config found — running in demo/simulation mode.")
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

    # Demo-only farmer identity map (voice dispatch uses these names)
    _DEMO_FARMERS = {
        ("assam", "majuli"): "Prasanta Kalita",
        ("bihar", "darbhanga"): "Ram Singh",
    }

    @classmethod
    def _farmer_name_for(cls, state_name: str, district_name: str, owner: str) -> str:
        state = state_name.strip().lower()
        district = district_name.strip().lower()
        if (state, district) in cls._DEMO_FARMERS:
            return cls._DEMO_FARMERS[(state, district)]
        for (known_state, _), name in cls._DEMO_FARMERS.items():
            if known_state == state:
                return name
        return f"Farmer {owner[:10]}"

    def _default_phone(self) -> str:
        return (
            os.getenv("TWILIO_VERIFIED_TO_NUMBER")
            or os.getenv("TWILIO_TO_PHONE_NUMBER")
            or os.getenv("FARMER_PHONE_NUMBER")
            or "+917483799325"
        ).strip()

    def _get_enrolled_plots(self) -> list[dict]:
        """
        Return list of enrolled plot dicts from FarmRegistry.sol.
        Falls back to demo plots when node is offline.

        V2.0: the registry now carries the government land-record identifiers
        (Khasra, Khata, State, District) that drive the PDF certificate and the
        regional-dialect voice dispatch.
        """
        if self._farm_registry:
            try:
                count = self._farm_registry.functions.getEnrolledPlotCount().call()
                plots = []
                for i in range(1, count + 1):
                    raw = self._farm_registry.functions.getFarmPlot(i).call()
                    # Defensive indexing: tolerate both V1 (6) and V2 (11) layouts
                    khasra    = raw[7] if len(raw) > 7 else ""
                    khata     = raw[8] if len(raw) > 8 else ""
                    state     = raw[9] if len(raw) > 9 else ""
                    district  = raw[10] if len(raw) > 10 else ""
                    owner     = raw[1]
                    if not raw[5]:
                        continue
                    location = ", ".join(x for x in (district, state) if x) or f"Plot {i}"
                    plots.append({
                        "id": raw[0], "owner": owner, "geojson": raw[2],
                        "acreage": raw[3], "cropType": raw[4], "enrolled": raw[5],
                        "registeredAt": raw[6] if len(raw) > 6 else 0,
                        "khasraNumber": khasra, "khataNumber": khata,
                        "stateName": state, "districtName": district,
                        "farmerName": self._farmer_name_for(state, district, owner),
                        "location": location,
                        "phoneNumber": self._default_phone(),
                    })
                logger.info("🌾  Loaded %d enrolled plot(s) from FarmRegistry.sol", len(plots))
                return plots
            except Exception as exc:
                logger.warning("⚠️  FarmRegistry call failed (%s), using demo plots.", exc)

        # Demo fallback plots — kept in the same order as the frontend
        # Demo Control Panel (plot 1 = Assam Flood, plot 2 = Bihar Flood).
        default_phone = self._default_phone()
        return [
            {
                "id": 1, "owner": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
                "geojson": json.dumps({
                    "type": "Polygon",
                    "coordinates": [[[94.1714, 26.7541], [94.2000, 26.7541],
                                     [94.2000, 26.7300], [94.1714, 26.7300],
                                     [94.1714, 26.7541]]],
                }),
                "acreage": 5, "cropType": "RICE", "enrolled": True,
                "farmerName": "Prasanta Kalita", "location": "Majuli, Assam",
                "khasraNumber": "Patta No. 104/B", "khataNumber": "Khata 27/3",
                "stateName": "Assam", "districtName": "Majuli",
                "document": "agent/documents/assam_dharitree_patta.txt",
                "phoneNumber": default_phone,
            },
            {
                "id": 2, "owner": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
                "geojson": json.dumps({
                    "type": "Polygon",
                    "coordinates": [[[85.8977, 26.1234], [85.9123, 26.1234],
                                     [85.9123, 26.1089], [85.8977, 26.1089],
                                     [85.8977, 26.1234]]],
                }),
                "acreage": 2.5, "cropType": "RICE", "enrolled": True,
                "farmerName": "Ram Singh", "location": "Darbhanga, Bihar",
                "khasraNumber": "Khasra 312/14-15", "khataNumber": "Khata 214/A",
                "stateName": "Bihar", "districtName": "Darbhanga",
                "document": "agent/documents/bihar_bhumi_khatiyan.txt",
                "phoneNumber": default_phone,
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
        plot_doc  = plot.get("document") or plot.get("document_path")

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
            if self._fetcher is not None:
                optical, sar_data = self._fetcher.fetch_both(geojson, plot_id=str(plot_id))
            else:
                from satellite_fetcher import Sentinel2Client, Sentinel1SARClient
                optical = Sentinel2Client.get_mock_scene(str(plot_id))
                sar_data = Sentinel1SARClient.get_mock_series(str(plot_id))

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
                # V2.0: never exceed the underwritten sum insured or available escrow
                payout_wei = min(
                    payout_wei,
                    self._insured_sum_wei(plot_id),
                    self._escrow_balance_wei(),
                )

                proof = self._signer.sign_disaster_proof(
                    plot_id=plot_id,
                    payout_amount_wei=payout_wei,
                    chain_id=self.chain_id,
                )

                tx_hash = self._execute_payout(plot_id, payout_wei, proof.timestamp, proof.signature_hex)

                payout_mst = payout_wei / 10**18
                farmer_phone = (
                    plot.get("phoneNumber")
                    or os.getenv("TWILIO_VERIFIED_TO_NUMBER")
                    or os.getenv("TWILIO_TO_PHONE_NUMBER")
                    or os.getenv("FARMER_PHONE_NUMBER")
                    or "+917483799325"
                ).strip()

                # ── V2: Generate PDF Audit Certificate ──────────────────
                try:
                    from pdf_generator import PDFCertificateGenerator
                    pdf_gen  = PDFCertificateGenerator()
                    cert_path = pdf_gen.generate_audit_certificate(
                        plot_id=str(plot_id),
                        farmer_name=farmer,
                        location=location,
                        disaster_type="Monsoon Flood",
                        damage_pct=consensus.verified_damage_pct,
                        payout_mst=payout_mst,
                        payout_inr=payout_mst,
                        proof_hash=proof.proof_hash,
                        tx_hash=tx_hash or "DEMO_TX_PENDING",
                        ndvi_pre=0.75,
                        ndvi_post=ndvi_result.ndvi,
                        sar_mean_db=sar_data.mean_backscatter_db,
                        sar_flood_days=sar_result.flood_days,
                        rainfall_mm=rainfall_mm,
                        consensus_score=consensus.consensus_score,
                        votes_for=consensus.votes_for,
                        ndvi_series=sar_data.backscatter_db_series[:6],
                        sar_series=sar_data.backscatter_db_series[:6],
                        crop_type=crop_type,
                        farmer_phone=farmer_phone,
                        # ── V2.0: government land record + cryptographic proof ──
                        khasra_number=plot.get("khasraNumber", ""),
                        khata_number=plot.get("khataNumber", ""),
                        state_name=plot.get("stateName", ""),
                        district_name=plot.get("districtName", ""),
                        geojson=plot.get("geojson"),
                        ecdsa_signature=proof.signature_hex,
                        oracle_address=proof.signer_address,
                        vault_address=self.vault_address,
                    )
                    logger.info("📜  \033[92mAudit Certificate generated: %s\033[0m", cert_path)
                except Exception as pdf_exc:
                    logger.warning("⚠️  PDF generation failed: %s", pdf_exc)
                    cert_path = None

                # ── V3: Generate W3C DID Verifiable Credential ───────────
                try:
                    from did_generator import (
                        generate_did,
                        generate_verifiable_credential,
                        vc_to_json,
                        vc_credential_hash,
                        did_badge_short,
                    )
                    farmer_wallet = plot.get("owner", owner)
                    farmer_did    = generate_did(farmer_wallet, role="farmer")
                    oracle_did    = generate_did(
                        proof.signer_address or "0x1d9e8dcD48A6461082fF16790512D4c38D4eed27",
                        role="oracle",
                    )
                    vc = generate_verifiable_credential(
                        farmer_did=farmer_did,
                        oracle_did=oracle_did,
                        farmer_name=farmer,
                        plot_id=str(plot_id),
                        khasra_number=plot.get("khasraNumber", ""),
                        state_name=plot.get("stateName", ""),
                        district_name=plot.get("districtName", ""),
                        crop_type=crop_type,
                        disaster_type="Monsoon Flood",
                        damage_pct=consensus.verified_damage_pct,
                        payout_inr=payout_mst,
                        payout_mst=payout_mst,
                        satellite_proof_hash=proof.proof_hash,
                        mst_tx_hash=tx_hash or "DEMO_TX_PENDING",
                        eip191_signature=proof.signature_hex,
                        ndvi_pre=0.75,
                        ndvi_post=ndvi_result.ndvi,
                        sar_db=sar_data.mean_backscatter_db,
                        sar_flood_days=sar_result.flood_days,
                        rainfall_mm=rainfall_mm,
                        consensus_score=consensus.consensus_score,
                        votes_for=consensus.votes_for,
                    )
                    vc_hash = vc_credential_hash(vc)
                    logger.info(
                        "🪪  \033[96mVerifiable Credential issued:\033[0m\n"
                        "    Farmer DID : %s\n"
                        "    Oracle DID : %s\n"
                        "    VC Hash    : %s",
                        did_badge_short(farmer_did),
                        did_badge_short(oracle_did),
                        vc_hash,
                    )
                    # Persist VC alongside the PDF certificate
                    vc_path = Path(__file__).parent / "certificates" / f"VC_{plot_id}_{vc_hash[2:10].upper()}.json"
                    vc_path.parent.mkdir(exist_ok=True)
                    vc_path.write_text(vc_to_json(vc), encoding="utf-8")
                    logger.info("📁  VC saved: %s", vc_path)
                except Exception as vc_exc:
                    logger.warning("⚠️  Verifiable Credential generation failed: %s", vc_exc)

                # ── V2: Trigger Live Twilio Voice Call & Automated Alert ──
                try:
                    alert_res = self._voice.trigger_automated_payout_alert(
                        to_phone_number=farmer_phone,
                        farmer_name=farmer,
                        payout_inr=payout_mst,
                        damage_pct=consensus.verified_damage_pct,
                        disaster_type="Flood",
                        language="auto",
                        document=plot_doc,
                        location=location,
                        geojson=geojson,
                        tx_hash=tx_hash or "0xDEMO_PAYOUT_TX",
                    )
                    call_sid = alert_res.get("call_sid")
                    logger.info("📞  \033[92mTwilio Live Call SID: %s\033[0m", call_sid)
                except Exception as call_exc:
                    logger.warning("⚠️  Twilio alert failed: %s", call_exc)

                # ── V2: NDWI Drought check ────────────────────────────────
                try:
                    swir_data = self._fetcher.fetch_sentinel2_swir(geojson, plot_id=str(plot_id))
                    from ndvi_calculator import NDVICalculator as _Calc
                    _calc = _Calc()
                    ndwi_val = _calc.calculate_ndwi(swir_data.green_band3, swir_data.swir_band11)
                    logger.info(
                        "🌵  NDWI Drought Index: %.4f%s",
                        ndwi_val,
                        "  ⚠️  DROUGHT ALERT" if ndwi_val < -0.35 else "  (Normal)",
                    )
                except Exception as ndwi_exc:
                    logger.debug("NDWI check skipped: %s", ndwi_exc)

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
    # On-chain policy / escrow guards
    # ------------------------------------------------------------------

    def _insured_sum_wei(self, plot_id: int) -> int:
        """
        Sum insured (policy limit) for the plot in wei.
        Returns MAX_PAYOUT_PER_PLOT_WEI when the vault is unreachable so the
        demo pipeline keeps working offline.
        """
        if self._vault is None or self._web3 is None:
            return MAX_PAYOUT_PER_PLOT_WEI
        try:
            _, _, insured_wei, is_active = self._vault.functions.getPolicyForPlot(plot_id).call()
            if not is_active or insured_wei == 0:
                return MAX_PAYOUT_PER_PLOT_WEI
            return int(insured_wei)
        except Exception as exc:
            logger.debug("Policy lookup failed for plot %d: %s", plot_id, exc)
            return MAX_PAYOUT_PER_PLOT_WEI

    def _escrow_balance_wei(self) -> int:
        """Available escrow liquidity in wei (0 ⇒ skip the on-chain attempt)."""
        if self._vault is None or self._web3 is None:
            return MAX_PAYOUT_PER_PLOT_WEI
        try:
            return int(self._vault.functions.getEscrowBalance().call())
        except Exception as exc:
            logger.debug("Escrow balance lookup failed: %s", exc)
            return MAX_PAYOUT_PER_PLOT_WEI

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

    def preflight_check(self) -> bool:
        """
        Verify the three Developer-1 -> Developer-2 handoff prerequisites
        WITHOUT spending gas or placing a phone call:

          1. Contract addresses resolve (contracts.json / .env / CLI flags)
          2. RPC endpoint answers and bytecode actually exists at both addresses
          3. This agent's oracle wallet holds ORACLE_ROLE on the vault
             (without it every triggerDisasterPayout reverts)

        Returns True when the live demo is safe to run.
        """
        print("\n" + "=" * 70)
        print("  AGENT PREFLIGHT — Developer 1 handoff prerequisites")
        print("=" * 70)
        ok = True

        # -- 1. Contract addresses -------------------------------------------
        print("\n[1] Contract addresses")
        for label, addr in (
            ("FarmRegistry", self.farm_registry_address),
            ("AgriTrustVault", self.vault_address),
        ):
            if addr:
                print(f"      ✅ {label:15s} {addr}")
            else:
                ok = False
                print(f"      ❌ {label:15s} NOT SET")
                print("           Fix: add it to agent/config/contracts.json or .env")
        if not self.farm_registry_address or not self.vault_address:
            print("      → Ask Developer 1 for both addresses, or re-run")
            print("        `npx hardhat run scripts/deploy.js --network localhost`")
            print("        (deploy.js rewrites contracts.json and .env automatically)")

        # -- 2. RPC + bytecode ------------------------------------------------
        print(f"\n[2] RPC endpoint  ({self.rpc_url})")
        w3 = None
        try:
            from web3 import Web3

            w3 = Web3(Web3.HTTPProvider(self.rpc_url, request_kwargs={"timeout": 10}))
            if not w3.is_connected():
                raise ConnectionError("no response")
            chain_id = w3.eth.chain_id
            print(f"      ✅ connected — chainId {chain_id}")
            if chain_id != self.chain_id:
                print(f"      ⚠️  configured MST_CHAIN_ID={self.chain_id} but node says {chain_id}")
            for label, addr in (
                ("FarmRegistry", self.farm_registry_address),
                ("AgriTrustVault", self.vault_address),
            ):
                if not addr:
                    continue
                code = w3.eth.get_code(Web3.to_checksum_address(addr))
                if code and len(code) > 2:
                    print(f"      ✅ {label:15s} bytecode present ({len(code)} bytes)")
                else:
                    ok = False
                    print(f"      ❌ {label:15s} NO CODE at {addr} — stale address?")
                    print("           Fix: re-run scripts/deploy.js (chain was probably restarted)")
        except Exception as exc:
            ok = False
            print(f"      ❌ cannot reach node: {exc}")
            print("           Fix: start it with `npx hardhat node`")

        # -- 3. ORACLE_ROLE ---------------------------------------------------
        print("\n[3] ORACLE_ROLE on AgriTrustVault")
        if w3 is None or not self.vault_address or not self._signer:
            ok = False
            print("      ❌ skipped — need a live node, a vault address and an oracle key")
        else:
            try:
                vault = w3.eth.contract(
                    address=Web3.to_checksum_address(self.vault_address),
                    abi=[{
                        "inputs": [],
                        "name": "ORACLE_ROLE",
                        "outputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
                        "stateMutability": "view",
                        "type": "function",
                    }, {
                        "inputs": [
                            {"internalType": "bytes32", "name": "role", "type": "bytes32"},
                            {"internalType": "address", "name": "account", "type": "address"},
                        ],
                        "name": "hasRole",
                        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
                        "stateMutability": "view",
                        "type": "function",
                    }],
                )
                role = vault.functions.ORACLE_ROLE().call()
                signer = Web3.to_checksum_address(self._signer.address)
                if vault.functions.hasRole(role, signer).call():
                    print(f"      ✅ oracle {signer} holds ORACLE_ROLE")
                    bal = w3.eth.get_balance(signer)
                    print(f"      ✅ oracle gas balance {w3.from_wei(bal, 'ether')} MST")
                    if bal == 0:
                        ok = False
                        print("      ❌ oracle has zero gas — payout tx will fail to send")
                else:
                    ok = False
                    print(f"      ❌ {signer} does NOT hold ORACLE_ROLE")
                    print("           Fix: re-run scripts/deploy.js — it grants the role from")
                    print("           ORACLE_PRIVATE_KEY and verifies it before finishing.")
            except Exception as exc:
                ok = False
                print(f"      ❌ role check failed: {exc}")

        # -- summary ----------------------------------------------------------
        print("\n" + "-" * 70)
        if ok:
            print("  ✅ ALL 3 PREREQUISITES OK — safe to run: python agent/sentinel_agent.py --once")
        else:
            print("  ❌ PREREQUISITES MISSING — fix the ❌ items above before running --once.")
        print("-" * 70)
        print("=" * 70 + "\n")
        return ok

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
        default=None,
        help=(
            "MST node RPC URL. Omit to use MST_RPC_URL from .env "
            f"(falls back to {DEFAULT_RPC_URL})."
        ),
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
        "--check",
        action="store_true",
        help=(
            "Preflight only: verify contract addresses, RPC reachability and "
            "ORACLE_ROLE, then exit without spending gas or placing a call."
        ),
    )
    parser.add_argument(
        "--demo",
        action="store_true",
        help="Run in interactive demo monitoring mode.",
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

    if args.check:
        # Read-only: no transactions, no phone calls.
        sys.exit(0 if agent.preflight_check() else 1)

    if args.once:
        agent.run_once()
    else:
        agent.start()
