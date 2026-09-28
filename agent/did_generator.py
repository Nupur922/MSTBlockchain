"""
did_generator.py
================
AgriTrust AI Version 3.0 — W3C Decentralized Identity (DID) Engine

Implements the W3C DID Core 1.0 and Verifiable Credentials (VC) Data Model 1.1
specification for farmer identity on MST Blockchain.

DID Method: did:mst
  - did:mst:farmer:<lowercaseWalletAddress>   → registered farmer
  - did:mst:krishi:<lowercaseWalletAddress>   → Krishi Mitra (field officer)
  - did:mst:oracle:<lowercaseWalletAddress>   → NEWRRO AI Oracle

Verifiable Credential (VC):
  - Issued by the NEWRRO AI Oracle DID
  - Subject is the farmer DID
  - Credential contains disaster event, satellite proof, payout, MST TX hash
  - Proof is the EIP-191 ECDSA Oracle signature

References:
  https://www.w3.org/TR/did-core/
  https://www.w3.org/TR/vc-data-model/

Author : Developer 2 — NEWRRO AI & Satellite Oracle Lead
Project: AgriTrust AI — MST Blockchain Buildathon (Version 3)
"""

from __future__ import annotations

import hashlib
import json
import logging
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger("did_generator")

# ── DID Method identifier ────────────────────────────────────────────────────
DID_METHOD = "mst"

# ── W3C VC context URLs ──────────────────────────────────────────────────────
VC_CONTEXT = [
    "https://www.w3.org/2018/credentials/v1",
    "https://w3id.org/security/suites/secp256k1-2019/v1",
]

# ── Credential types ─────────────────────────────────────────────────────────
VC_TYPES = {
    "disaster_relief": [
        "VerifiableCredential",
        "DisasterReliefCredential",
        "PMFBYParametricInsuranceClaim",
    ],
    "farmer_identity": [
        "VerifiableCredential",
        "FarmerIdentityCredential",
        "AadhaarLinkedAgriculturalIdentity",
    ],
    "plot_registration": [
        "VerifiableCredential",
        "LandRecordCredential",
        "BhuNakshaGeoJsonCertificate",
    ],
}


# ═══════════════════════════════════════════════════════════════════════════
# DID GENERATION
# ═══════════════════════════════════════════════════════════════════════════

def generate_did(wallet_address: str, role: str = "farmer") -> str:
    """
    Generate a W3C-compliant DID for a wallet address.

    Parameters
    ----------
    wallet_address : str
        Ethereum wallet address (0x-prefixed).
    role : str
        "farmer" | "krishi" | "oracle" — becomes the DID method-specific path.

    Returns
    -------
    str
        DID string, e.g. "did:mst:farmer:0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc"

    Examples
    --------
    >>> generate_did("0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC")
    'did:mst:farmer:0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc'

    >>> generate_did("0x1d9e8dcD48A6461082fF16790512D4c38D4eed27", role="oracle")
    'did:mst:oracle:0x1d9e8dcd48a6461082ff16790512d4c38d4eed27'
    """
    if not wallet_address or not wallet_address.startswith("0x"):
        raise ValueError(f"Invalid wallet address: {wallet_address!r}. Must be 0x-prefixed.")

    role = role.lower().strip()
    if role not in ("farmer", "krishi", "oracle", "admin"):
        role = "farmer"

    return f"did:{DID_METHOD}:{role}:{wallet_address.lower()}"


def parse_did(did: str) -> dict:
    """
    Parse a DID string into its components.

    Returns
    -------
    dict with keys: method, role, wallet_address
    """
    parts = did.split(":")
    if len(parts) != 4 or parts[0] != "did" or parts[1] != DID_METHOD:
        raise ValueError(f"Invalid MST DID format: {did!r}")
    return {
        "method": parts[1],
        "role": parts[2],
        "wallet_address": parts[3],
        "did": did,
    }


# ═══════════════════════════════════════════════════════════════════════════
# DID DOCUMENT
# ═══════════════════════════════════════════════════════════════════════════

def resolve_did_document(
    did: str,
    farmer_name: Optional[str] = None,
    khasra_number: Optional[str] = None,
    state_name: Optional[str] = None,
    district_name: Optional[str] = None,
    crop_type: Optional[str] = None,
    plot_id: Optional[str] = None,
    aadhaar_masked: Optional[str] = None,
) -> dict:
    """
    Build a W3C DID Document for a given MST DID.

    The document conforms to the W3C DID Core 1.0 specification.
    In production this would be resolved from the FarmRegistry smart contract.

    Parameters
    ----------
    did : str
        The DID to resolve, e.g. "did:mst:farmer:0x3c44..."
    farmer_name : str, optional
        Human-readable name for the DID subject.
    khasra_number : str, optional
        Government land record Khasra / Patta number.
    state_name : str, optional
        Indian state of the registered plot.
    district_name : str, optional
        District of the registered plot.
    crop_type : str, optional
        Primary insured crop type.
    plot_id : str, optional
        On-chain plot ID.
    aadhaar_masked : str, optional
        Masked Aadhaar number (last 4 digits only), e.g. "XXXX-XXXX-8821".

    Returns
    -------
    dict
        W3C DID Document as a Python dict (serialisable to JSON-LD).
    """
    parsed = parse_did(did)
    wallet = parsed["wallet_address"]
    role   = parsed["role"]
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    doc: dict = {
        "@context": [
            "https://www.w3.org/ns/did/v1",
            "https://w3id.org/security/suites/secp256k1-2019/v1",
        ],
        "id": did,
        "controller": did,
        "created": now_iso,
        "updated": now_iso,

        # Verification methods — the wallet's secp256k1 key
        "verificationMethod": [
            {
                "id": f"{did}#key-1",
                "type": "EcdsaSecp256k1VerificationKey2019",
                "controller": did,
                "blockchainAccountId": f"eip155:31337:{wallet}",
            }
        ],

        # Authentication — this wallet can authenticate as this DID
        "authentication": [f"{did}#key-1"],

        # Assertion method — this wallet can issue VCs as this DID
        "assertionMethod": [f"{did}#key-1"],

        # Service endpoints
        "service": [
            {
                "id": f"{did}#agritrust-registry",
                "type": "AgriTrustFarmRegistry",
                "serviceEndpoint": "http://127.0.0.1:8545",
                "description": "MST Blockchain FarmRegistry Contract",
            },
            {
                "id": f"{did}#pmfby-dbt",
                "type": "PMFBYDBTAuditPortal",
                "serviceEndpoint": "http://localhost:3000",
                "description": "AgriTrust AI Public DBT Audit Portal",
            },
        ],

        # Subject metadata (non-normative — optional per DID spec)
        "subjectMetadata": {
            "role": role,
            "blockchainNetwork": "MST Blockchain (Hardhat Local)",
            "chainId": 31337,
            "walletAddress": wallet,
        },
    }

    # Attach optional agricultural metadata
    agri: dict = {}
    if farmer_name:   agri["farmerName"]    = farmer_name
    if khasra_number: agri["khasraNumber"]  = khasra_number
    if state_name:    agri["stateName"]     = state_name
    if district_name: agri["districtName"]  = district_name
    if crop_type:     agri["cropType"]      = crop_type
    if plot_id:       agri["plotId"]        = str(plot_id)
    if aadhaar_masked: agri["aadhaarMasked"] = aadhaar_masked

    if agri:
        doc["agriculturalProfile"] = agri

    logger.info("📄  DID Document resolved: %s (%s)", did, role.upper())
    return doc


# ═══════════════════════════════════════════════════════════════════════════
# VERIFIABLE CREDENTIAL
# ═══════════════════════════════════════════════════════════════════════════

def generate_verifiable_credential(
    farmer_did: str,
    oracle_did: str,
    farmer_name: str,
    plot_id: str,
    khasra_number: str,
    state_name: str,
    district_name: str,
    crop_type: str,
    disaster_type: str,
    damage_pct: float,
    payout_inr: float,
    payout_mst: float,
    satellite_proof_hash: str,
    mst_tx_hash: str,
    eip191_signature: str,
    ndvi_pre: float = 0.75,
    ndvi_post: float = 0.28,
    sar_db: float = -22.4,
    sar_flood_days: int = 6,
    ndwi_score: float = -0.12,
    rainfall_mm: float = 185.0,
    consensus_score: float = 1.0,
    votes_for: int = 3,
    aadhaar_masked: str = "XXXX-XXXX-8821",
    credential_type: str = "disaster_relief",
) -> dict:
    """
    Generate a W3C Verifiable Credential for a parametric disaster payout.

    The credential is issued by the NEWRRO AI Oracle (oracle_did),
    signed with the EIP-191 ECDSA proof, and the subject is the farmer (farmer_did).

    Parameters
    ----------
    farmer_did : str
        Farmer's DID, e.g. "did:mst:farmer:0x3c44..."
    oracle_did : str
        Oracle issuer DID, e.g. "did:mst:oracle:0x1d9e..."
    ... (all other payout and telemetry fields)

    Returns
    -------
    dict
        W3C VC JSON-LD document as Python dict. Serialise with json.dumps().
    """
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    # Deterministic credential ID using SHA-256 of key fields
    cred_id_input = f"{farmer_did}:{plot_id}:{mst_tx_hash}:{now_iso}"
    cred_id_hash  = hashlib.sha256(cred_id_input.encode()).hexdigest()[:16]
    credential_id = f"urn:uuid:agritrust:vc:{cred_id_hash}"

    vc = {
        "@context": VC_CONTEXT,
        "id": credential_id,
        "type": VC_TYPES.get(credential_type, VC_TYPES["disaster_relief"]),

        # Issuer: NEWRRO AI Oracle
        "issuer": {
            "id": oracle_did,
            "name": "NEWRRO AI Oracle — AgriTrust AI",
            "description": (
                "Autonomous parametric satellite oracle on MST Blockchain. "
                "Issued under PMFBY Pradhan Mantri Fasal Bima Yojana."
            ),
        },

        "issuanceDate": now_iso,
        "expirationDate": None,   # Disaster relief credentials do not expire

        # Credential subject: the farmer
        "credentialSubject": {
            "id": farmer_did,
            "farmerName": farmer_name,
            "aadhaarMasked": aadhaar_masked,

            # Government land record
            "landRecord": {
                "khasraNumber": khasra_number,
                "stateName": state_name,
                "districtName": district_name,
                "cropType": crop_type,
                "plotId": str(plot_id),
            },

            # Disaster event
            "disasterEvent": {
                "type": disaster_type,
                "verifiedDamagePct": round(damage_pct, 2),
                "satelliteConsensus": f"{votes_for}-of-3 NEWRRO AI Oracle Verified",
                "consensusScore": round(consensus_score, 4),
            },

            # Satellite telemetry proof
            "satelliteTelemetry": {
                "sentinel1SARBackscatterDB": round(sar_db, 2),
                "floodDaysDetected": sar_flood_days,
                "sentinel2NDVIPre": round(ndvi_pre, 4),
                "sentinel2NDVIPost": round(ndvi_post, 4),
                "ndviCropLossPct": round((ndvi_pre - ndvi_post) / ndvi_pre * 100, 2) if ndvi_pre > 0 else 0,
                "sentinel2NDWIMoisture": round(ndwi_score, 4),
                "imdRainfallMM48h": round(rainfall_mm, 1),
            },

            # Payout settlement
            "payoutSettlement": {
                "payoutINR": round(payout_inr, 2),
                "payoutMST": round(payout_mst, 6),
                "disbursalMethod": "Aadhaar AePS DBT — India Post Gramin Dak Sevak Micro-ATM",
                "mstBlockchainTxHash": mst_tx_hash,
                "settlementLatencySeconds": "< 2",
            },
        },

        # Cryptographic proof (EIP-191 ECDSA)
        "proof": {
            "type": "EcdsaSecp256k1Signature2019",
            "created": now_iso,
            "verificationMethod": f"{oracle_did}#key-1",
            "proofPurpose": "assertionMethod",
            "proofValue": eip191_signature,
            "satelliteProofHash": satellite_proof_hash,
            "eip191Standard": (
                "keccak256(abi.encodePacked(plotId, payoutAmount, damagePct, timestamp))"
            ),
            "blockchainNetwork": "MST Blockchain (Chain ID: 31337)",
        },
    }

    logger.info(
        "✅  Verifiable Credential generated:\n"
        "    ID       : %s\n"
        "    Farmer   : %s (%s)\n"
        "    Oracle   : %s\n"
        "    Disaster : %s (%.1f%% damage)\n"
        "    Payout   : ₹%s / %.4f MST",
        credential_id,
        farmer_name, farmer_did,
        oracle_did,
        disaster_type, damage_pct,
        f"{payout_inr:,.0f}", payout_mst,
    )
    return vc


def vc_to_json(vc: dict, indent: int = 2) -> str:
    """Serialise a VC dict to a formatted JSON string."""
    return json.dumps(vc, indent=indent, ensure_ascii=False)


def vc_credential_hash(vc: dict) -> str:
    """
    Compute a SHA-256 fingerprint of the VC (excluding the proof block)
    for tamper-evident audit logging.
    """
    vc_no_proof = {k: v for k, v in vc.items() if k != "proof"}
    canonical = json.dumps(vc_no_proof, sort_keys=True, ensure_ascii=False)
    return "0x" + hashlib.sha256(canonical.encode()).hexdigest()


# ═══════════════════════════════════════════════════════════════════════════
# CONVENIENCE HELPERS
# ═══════════════════════════════════════════════════════════════════════════

def did_badge_short(did: str) -> str:
    """
    Return a short human-readable badge string for display in the UI.
    "did:mst:farmer:0x3c44...293bc"  →  "did:mst:farmer:0x3c44…93bc"
    """
    parts = did.split(":")
    if len(parts) != 4:
        return did[:24] + "…"
    wallet = parts[3]
    return f"did:mst:{parts[2]}:{wallet[:6]}…{wallet[-4:]}"


def generate_farmer_did_batch(farmer_wallets: list[dict]) -> list[dict]:
    """
    Generate DIDs for a list of farmer wallet records.

    Parameters
    ----------
    farmer_wallets : list of dict
        Each dict should have at least "wallet_address" key.
        Optionally: "farmer_name", "khasra_number", "state_name".

    Returns
    -------
    list of dict
        Each input dict enriched with "did" and "did_document" keys.
    """
    result = []
    for record in farmer_wallets:
        wallet = record.get("wallet_address", "")
        if not wallet:
            continue
        did = generate_did(wallet, role="farmer")
        doc = resolve_did_document(
            did=did,
            farmer_name=record.get("farmer_name"),
            khasra_number=record.get("khasra_number"),
            state_name=record.get("state_name"),
            district_name=record.get("district_name"),
            crop_type=record.get("crop_type"),
            plot_id=record.get("plot_id"),
        )
        result.append({**record, "did": did, "did_short": did_badge_short(did), "did_document": doc})
    return result


# ═══════════════════════════════════════════════════════════════════════════
# SMOKE TEST
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

    # 1. Generate DIDs
    farmer_did = generate_did("0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", "farmer")
    oracle_did = generate_did("0x1d9e8dcD48A6461082fF16790512D4c38D4eed27", "oracle")
    krishi_did = generate_did("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", "krishi")

    print(f"\nFarmer DID : {farmer_did}")
    print(f"Oracle DID : {oracle_did}")
    print(f"Krishi DID : {krishi_did}")
    print(f"Short badge: {did_badge_short(farmer_did)}")

    # 2. Resolve DID Document
    doc = resolve_did_document(
        did=farmer_did,
        farmer_name="Ram Singh",
        khasra_number="Khatiyan Plot #214/A",
        state_name="Bihar",
        district_name="Darbhanga",
        crop_type="Paddy (Rice)",
        plot_id="2",
        aadhaar_masked="XXXX-XXXX-8821",
    )
    print(f"\nDID Document (truncated):\n{json.dumps(doc, indent=2)[:500]}...")

    # 3. Generate Verifiable Credential
    vc = generate_verifiable_credential(
        farmer_did=farmer_did,
        oracle_did=oracle_did,
        farmer_name="Ram Singh",
        plot_id="2",
        khasra_number="Khatiyan Plot #214/A",
        state_name="Bihar",
        district_name="Darbhanga",
        crop_type="Paddy (Rice)",
        disaster_type="Kosi River Monsoon Flood",
        damage_pct=76.0,
        payout_inr=25000.0,
        payout_mst=25000.0,
        satellite_proof_hash="0xabc123def4567890",
        mst_tx_hash="0x9f8e7d6c5b4a3928374650192837465019",
        eip191_signature="0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab",
        sar_flood_days=9,
        sar_db=-24.1,
        ndvi_pre=0.76,
        ndvi_post=0.18,
        rainfall_mm=240.0,
    )
    print(f"\nVerifiable Credential ID : {vc['id']}")
    print(f"VC Hash                  : {vc_credential_hash(vc)}")
    print(f"Full VC JSON:\n{vc_to_json(vc)[:800]}...")
