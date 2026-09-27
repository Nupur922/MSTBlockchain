"""
proof_signer.py
===============
Developer 2 | Day 2 Task — AgriTrust AI
EIP-191 Cryptographic Proof Signer

Generates and signs disaster relief proofs using the Oracle Agent's
private key. The signatures are verified on-chain by Developer 1's
AgriTrustVault.sol contract using OpenZeppelin ECDSA.recover().

Payload structure matches Solidity exactly:
    keccak256(abi.encodePacked(plotId, payoutAmount, timestamp, chainId, vaultAddress))

Author : Developer 2 — NEWRRO AI & Satellite Oracle Lead
Project: AgriTrust AI — MST Blockchain Buildathon
"""

from __future__ import annotations

import logging
import os
import time
from dataclasses import dataclass
from typing import Any, Optional

from eth_account import Account
from eth_account.messages import encode_defunct
from eth_utils import keccak, to_bytes  # type: ignore

# Sentinel meaning "use the vault address configured on this signer instance".
# An explicit `vault_address=None` therefore still builds a legacy 4-field payload.
_USE_INSTANCE_VAULT = object()

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    level=logging.INFO,
)
logger = logging.getLogger("proof_signer")

# ---------------------------------------------------------------------------
# Result container
# ---------------------------------------------------------------------------

@dataclass
class DisasterProof:
    """Signed disaster proof payload ready for on-chain submission."""
    plot_id: int
    payout_amount_wei: int
    timestamp: int
    chain_id: int
    proof_hash: str              # 0x-prefixed hex keccak256 of raw payload
    eth_signed_hash: str         # 0x-prefixed hex EIP-191 prefixed hash
    signature_hex: str           # 0x-prefixed hex ECDSA signature (65 bytes)
    signer_address: str          # Checksummed Ethereum address
    r: str                       # Signature component r
    s: str                       # Signature component s
    v: int                       # Signature component v (27 or 28)
    vault_address: Optional[str] = None  # AgriTrustVault address bound into the proof


# ---------------------------------------------------------------------------
# ABI encoding helpers (matches Solidity abi.encodePacked)
# ---------------------------------------------------------------------------

def _pack_address(address: str) -> bytes:
    """
    Encode an Ethereum address as the 20 raw bytes Solidity uses for an
    `abi.encodePacked(address)` member (no 0x prefix, no zero padding).
    """
    clean = address.strip().lower()
    if clean.startswith("0x"):
        clean = clean[2:]
    if len(clean) != 40:
        raise ValueError(f"Invalid Ethereum address for proof packing: {address!r}")
    return bytes.fromhex(clean)


def _abi_encode_packed(
    plot_id: int,
    payout_amount_wei: int,
    timestamp: int,
    chain_id: int,
    vault_address: Optional[str] = None,
) -> bytes:
    """
    Replicates Solidity's
    abi.encodePacked(plotId, payoutAmount, timestamp, chainId, vaultAddress).

    The first four values are encoded as uint256 (32 bytes each, big-endian)
    and the vault address as 20 raw bytes, matching exactly:
        bytes32 proofHash = keccak256(
            abi.encodePacked(plotId, payoutAmountMST, timestamp, block.chainid, address(this))
        );

    NOTE: AgriTrustVault.sol binds `address(this)` into the payload, so the
    vault address MUST be supplied for the on-chain ECDSA.recover() to match.

    Parameters
    ----------
    plot_id : int           — Farm plot ID (uint256)
    payout_amount_wei : int — Payout in wei (uint256)
    timestamp : int         — Unix timestamp (uint256)
    chain_id : int          — EVM chain ID (uint256)
    vault_address : str     — AgriTrustVault contract address (address).
                              If None, the vault component is omitted (legacy
                              4-field proofs used by offline unit tests).
    """
    packed = (
        plot_id.to_bytes(32, "big")
        + payout_amount_wei.to_bytes(32, "big")
        + timestamp.to_bytes(32, "big")
        + chain_id.to_bytes(32, "big")
    )
    if vault_address:
        packed += _pack_address(vault_address)
    return packed


def _keccak256(data: bytes) -> bytes:
    """Return 32-byte keccak256 hash."""
    return keccak(primitive=data)


# ---------------------------------------------------------------------------
# EIP-191 Proof Signer
# ---------------------------------------------------------------------------

class EIP191ProofSigner:
    """
    Signs disaster relief proofs using EIP-191 personal_sign standard.

    The signing flow mirrors the on-chain verification in AgriTrustVault.sol:

      Off-chain (Python):
        1. proofHash    = keccak256(abi.encodePacked(plotId, amount, ts, chainId, vault))
        2. ethSignedMsg = "\\x19Ethereum Signed Message:\\n32" + proofHash
        3. signature    = eth_account.Account.sign_message(ethSignedMsg, privateKey)

      On-chain (Solidity):
        1. proofHash    = keccak256(abi.encodePacked(plotId, amount, ts, block.chainid, address(this)))
        2. ethSignedHash = MessageHashUtils.toEthSignedMessageHash(proofHash)
        3. signer       = ECDSA.recover(ethSignedHash, signature)
        4. require(hasRole(ORACLE_ROLE, signer))

    Usage
    -----
    >>> signer = EIP191ProofSigner(private_key="0xYOUR_ORACLE_PRIVATE_KEY")
    >>> proof  = signer.sign_disaster_proof(
    ...     plot_id=1,
    ...     payout_amount_wei=25000 * 10**18,
    ...     chain_id=31337,
    ... )
    >>> print(proof.signature_hex)
    """

    # Hardhat local MST node chain ID (matches hardhat.config.js)
    DEFAULT_CHAIN_ID = 31337

    def __init__(self, private_key: Optional[str] = None, vault_address: Optional[str] = None):
        """
        Parameters
        ----------
        private_key : str, optional
            0x-prefixed hex private key for the Oracle Agent wallet.
            If None, a deterministic demo key is used (NOT for production).
        vault_address : str, optional
            Deployed AgriTrustVault contract address. Bound into every proof
            payload because AgriTrustVault.sol hashes `address(this)` on-chain.
            Falls back to the AGRI_TRUST_VAULT_ADDRESS environment variable.
        """
        if private_key:
            self._account = Account.from_key(private_key)
        else:
            # Hardhat test account #1 (widely known, demo-only)
            DEMO_KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
            logger.warning(
                "⚠️  No private key provided — using Hardhat demo account #1. "
                "DO NOT use this key in production."
            )
            self._account = Account.from_key(DEMO_KEY)

        self.vault_address = (
            vault_address
            or os.getenv("AGRI_TRUST_VAULT_ADDRESS")
            or self._lookup_deployed_vault()
            or ""
        ).strip() or None
        if self.vault_address:
            logger.info("🏦  Proof bound to AgriTrustVault: %s", self.vault_address)
        else:
            logger.warning(
                "⚠️  No AgriTrustVault address configured — proofs will NOT match "
                "AgriTrustVault.sol on-chain verification. Deploy contracts first "
                "(scripts/deploy.js writes agent/config/contract-addresses.json)."
            )

        logger.info("🔑  Oracle signer initialized: %s", self._account.address)

    @staticmethod
    def _lookup_deployed_vault() -> Optional[str]:
        """
        Resolve the deployed AgriTrustVault address written by scripts/deploy.js
        so locally signed proofs always verify on-chain without extra wiring.
        """
        import json
        from pathlib import Path

        config_dir = Path(__file__).resolve().parent / "config"
        candidates = [
            config_dir / "contract-addresses.json",
            config_dir / "contracts.json",
            Path(__file__).resolve().parent.parent / "frontend" / "src" / "contracts" / "contract-addresses.json",
        ]
        for cfg_file in candidates:
            try:
                if not cfg_file.exists():
                    continue
                data = json.loads(cfg_file.read_text(encoding="utf-8"))
                vault = None
                if isinstance(data.get("contracts"), dict):
                    vault = data["contracts"].get("AgriTrustVault")
                vault = vault or data.get("AgriTrustVault")
                if vault:
                    return str(vault)
            except Exception as exc:  # pragma: no cover - defensive
                logger.debug("Could not read %s: %s", cfg_file, exc)
        return None

    @property
    def address(self) -> str:
        """Checksummed Oracle Agent wallet address."""
        return self._account.address

    def generate_proof_hash(
        self,
        plot_id: int,
        payout_amount_wei: int,
        timestamp: int,
        chain_id: int,
        vault_address: Any = _USE_INSTANCE_VAULT,
    ) -> bytes:
        """
        Compute keccak256(abi.encodePacked(plotId, payoutAmount, timestamp, chainId, vaultAddress)).

        This is the raw proof hash (bytes32 in Solidity terms) BEFORE the
        EIP-191 prefix is applied.

        Parameters
        ----------
        plot_id : int              — Farm plot identifier
        payout_amount_wei : int    — Payout amount in wei
        timestamp : int            — Unix epoch timestamp of the event
        chain_id : int             — EVM chain ID
        vault_address : str | None — AgriTrustVault address bound into the payload.
                                     Defaults to this signer's configured vault.
                                     Pass None explicitly to build a legacy
                                     4-field payload (no vault component).

        Returns
        -------
        bytes : 32-byte proof hash
        """
        vault = self.vault_address if vault_address is _USE_INSTANCE_VAULT else vault_address
        packed = _abi_encode_packed(plot_id, payout_amount_wei, timestamp, chain_id, vault)
        proof_hash_bytes = _keccak256(packed)
        logger.debug(
            "🔐  Proof hash components: plotId=%d  amount=%d wei  ts=%d  chainId=%d  vault=%s",
            plot_id, payout_amount_wei, timestamp, chain_id, vault or "<unset>",
        )
        return proof_hash_bytes

    def sign_disaster_proof(
        self,
        plot_id: int,
        payout_amount_wei: int,
        chain_id: int = DEFAULT_CHAIN_ID,
        timestamp: Optional[int] = None,
        vault_address: Any = _USE_INSTANCE_VAULT,
    ) -> DisasterProof:
        """
        Generate and sign an EIP-191 disaster relief proof.

        This method:
          1. Encodes plotId, payoutAmount, timestamp, chainId, vaultAddress as ABI-packed bytes
          2. Hashes with keccak256 → proofHash
          3. Wraps with EIP-191 prefix → ethSignedHash
          4. Signs with the Oracle private key → ECDSA signature

        The resulting DisasterProof contains everything needed to call
        AgriTrustVault.triggerDisasterPayout() on MST Blockchain.

        Parameters
        ----------
        plot_id : int
            Farm plot ID registered in FarmRegistry.sol.
        payout_amount_wei : int
            Payout amount denominated in wei (e.g., 25000 * 10**18 = 25,000 MST).
        chain_id : int
            EVM chain ID. Default: 31337 (local Hardhat MST node).
        timestamp : int, optional
            Unix epoch timestamp. Defaults to current time.
        vault_address : str | None, optional
            AgriTrustVault contract address to bind into the payload
            (must match `address(this)` on-chain). Defaults to the signer's
            configured vault address.

        Returns
        -------
        DisasterProof
            Complete signed proof with hash, signature, and signer address.
        """
        ts = timestamp if timestamp is not None else int(time.time())
        vault = self.vault_address if vault_address is _USE_INSTANCE_VAULT else vault_address

        # Step 1: Generate raw proof hash
        proof_hash_bytes = self.generate_proof_hash(
            plot_id, payout_amount_wei, ts, chain_id, vault
        )
        proof_hash_hex = "0x" + proof_hash_bytes.hex()

        # Step 2: Wrap with EIP-191 Ethereum personal_sign prefix
        # encode_defunct wraps the bytes32 hash with "\x19Ethereum Signed Message:\n32"
        # matching OpenZeppelin's MessageHashUtils.toEthSignedMessageHash()
        signable_msg = encode_defunct(primitive=proof_hash_bytes)
        eth_signed_hash_hex = "0x" + signable_msg.body.hex() if hasattr(signable_msg, "body") else proof_hash_hex

        # Step 3: Sign
        signed = Account.sign_message(signable_msg, private_key=self._account.key)

        signature_hex = "0x" + signed.signature.hex()
        r_hex = hex(signed.r)
        s_hex = hex(signed.s)
        v_val = signed.v

        # Recover signer address to self-verify
        recovered = Account.recover_message(signable_msg, signature=signed.signature)
        assert recovered.lower() == self._account.address.lower(), (
            f"Signer recovery mismatch: expected {self._account.address}, got {recovered}"
        )

        logger.info(
            "✅  Proof signed successfully:\n"
            "    Plot ID      : %d\n"
            "    Amount (wei) : %d\n"
            "    Timestamp    : %d\n"
            "    Chain ID     : %d\n"
            "    Vault        : %s\n"
            "    Proof Hash   : %s\n"
            "    Signature    : %s…\n"
            "    Signer       : %s",
            plot_id, payout_amount_wei, ts, chain_id, vault or "<unset>",
            proof_hash_hex,
            signature_hex[:20],
            self._account.address,
        )

        return DisasterProof(
            plot_id=plot_id,
            payout_amount_wei=payout_amount_wei,
            timestamp=ts,
            chain_id=chain_id,
            proof_hash=proof_hash_hex,
            eth_signed_hash=eth_signed_hash_hex,
            signature_hex=signature_hex,
            signer_address=self._account.address,
            r=r_hex,
            s=s_hex,
            v=v_val,
            vault_address=vault,
        )

    def verify_proof(self, proof: DisasterProof) -> bool:
        """
        Verify that a DisasterProof's signature recovers to the expected signer.

        Useful for pre-submission sanity check and unit testing.

        Returns True if the recovered address matches the signer address.
        """
        proof_hash_bytes = self.generate_proof_hash(
            proof.plot_id,
            proof.payout_amount_wei,
            proof.timestamp,
            proof.chain_id,
            vault_address=proof.vault_address,
        )
        signable_msg = encode_defunct(primitive=proof_hash_bytes)
        signature_bytes = bytes.fromhex(proof.signature_hex[2:])
        recovered = Account.recover_message(signable_msg, signature=signature_bytes)
        is_valid = recovered.lower() == proof.signer_address.lower()
        logger.info(
            "🔍  Proof verification: recovered=%s  expected=%s  valid=%s",
            recovered, proof.signer_address, "✅ PASS" if is_valid else "❌ FAIL",
        )
        return is_valid


# ---------------------------------------------------------------------------
# Quick smoke-test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    signer = EIP191ProofSigner()  # Uses Hardhat demo key

    print(f"\n  Oracle Address : {signer.address}")

    # Bihar Kosi flood — ₹25,000 payout
    proof = signer.sign_disaster_proof(
        plot_id=1,
        payout_amount_wei=25_000 * 10**18,  # 25,000 MST tokens
        chain_id=31337,
    )
    print(f"\n  Plot ID        : {proof.plot_id}")
    print(f"  Amount (Wei)   : {proof.payout_amount_wei}")
    print(f"  Proof Hash     : {proof.proof_hash}")
    print(f"  Signature      : {proof.signature_hex[:30]}…")
    print(f"  v              : {proof.v}")

    # Verify
    is_valid = signer.verify_proof(proof)
    print(f"\n  Signature Valid: {is_valid}")
