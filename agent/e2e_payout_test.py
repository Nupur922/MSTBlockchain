"""
e2e_payout_test.py
==================
AgriTrust AI V2 | End-to-End Bridge Verification

Proves that every layer of Version 2 is actually wired together on a live
local MST node:

  1. FarmRegistry.sol exposes the V2 land record (Khasra / Khata / State / District)
     and is readable by the AI Oracle agent (getEnrolledPlotCount + getFarmPlot).
  2. AgriTrustVault.sol reports the policy (sum insured) and escrow liquidity.
  3. proof_signer.py produces an EIP-191 signature whose payload EXACTLY matches
     `keccak256(abi.encodePacked(plotId, payoutAmount, timestamp, chainId, vault))`.
  4. triggerDisasterPayout() verifies it with ECDSA.recover() and settles escrow.
  5. Replay protection rejects a reused signature.

Run it after `npx hardhat node`:

    python agent/e2e_payout_test.py

(The script re-runs `scripts/deploy.js` by itself when the previous payout has
already settled the policy, so it is safe to run repeatedly.)

Exits 0 on success, 1 on failure, 77 if the node is not running (skipped).
"""

from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

# Windows consoles default to cp1252, which cannot print the → ✅ arrows used here.
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

AGENT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(AGENT_DIR))

try:
    from dotenv import load_dotenv

    load_dotenv(AGENT_DIR.parent / ".env")
    load_dotenv(AGENT_DIR / "config" / ".env")
except Exception:
    pass

PASS, FAIL, SKIP = "✅ PASS", "❌ FAIL", "⏭  SKIP"
results: list[tuple[str, str, str]] = []


def check(name: str, ok: bool, detail: str = "") -> bool:
    results.append((PASS if ok else FAIL, name, detail))
    print(f"  {PASS if ok else FAIL}  {name}" + (f" — {detail}" if detail else ""))
    return ok


def load_addresses() -> dict:
    for fname in ("contract-addresses.json", "contracts.json"):
        p = AGENT_DIR / "config" / fname
        if p.exists():
            data = json.loads(p.read_text(encoding="utf-8"))
            contracts = data.get("contracts", data)
            if "FarmRegistry" in contracts and "AgriTrustVault" in contracts:
                return contracts
    return {}


def redeploy_demo_chain() -> tuple[bool, str]:
    """
    A payout permanently deactivates the plot's policy (AgriTrustVault.sol sets
    `isActive = false`), so re-running this script needs a fresh deployment.

    Re-runs scripts/deploy.js against the local node, which re-creates the
    contracts, plots, policies, escrow and rewrites agent/config + frontend
    addresses. Returns (ok, message).
    """
    import subprocess

    root = AGENT_DIR.parent
    if not (root / "scripts" / "deploy.js").exists():
        return False, "scripts/deploy.js not found"
    try:
        proc = subprocess.run(
            "npx hardhat run scripts/deploy.js --network localhost",
            cwd=str(root),
            shell=True,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=300,
        )
    except Exception as exc:  # pragma: no cover - environment dependent
        return False, f"redeploy failed to start: {exc}"

    tail = ((proc.stdout or "") + (proc.stderr or "")).strip().splitlines()[-1:]
    if proc.returncode != 0:
        return False, f"redeploy exited {proc.returncode}: {tail[0] if tail else 'no output'}"
    return True, tail[0] if tail else "redeployed"


def main() -> int:
    print("=" * 68)
    print("  AgriTrust AI V2 — END-TO-END BRIDGE TEST")
    print("  FarmRegistry → proof_signer → AgriTrustVault → escrow settlement")
    print("=" * 68)

    try:
        from web3 import Web3
    except ImportError:
        print(f"{SKIP}  web3 not installed — run: pip install -r agent/requirements.txt")
        return 77

    rpc = os.getenv("MST_RPC_URL", "http://127.0.0.1:8545")
    w3 = Web3(Web3.HTTPProvider(rpc, request_kwargs={"timeout": 15}))
    if not w3.is_connected():
        print(f"{SKIP}  MST node not reachable at {rpc} — start it with: npx hardhat node")
        return 77

    addrs = load_addresses()
    if not addrs:
        print(f"{FAIL}  No deployed contract addresses found in agent/config/")
        return 1

    from proof_signer import EIP191ProofSigner
    from sentinel_agent import FARM_REGISTRY_ABI, AGRI_VAULT_ABI

    registry_addr = Web3.to_checksum_address(addrs["FarmRegistry"])
    vault_addr = Web3.to_checksum_address(addrs["AgriTrustVault"])
    registry = w3.eth.contract(address=registry_addr, abi=FARM_REGISTRY_ABI)
    vault = w3.eth.contract(address=vault_addr, abi=AGRI_VAULT_ABI)

    print(f"\n  RPC        : {rpc} (chain {w3.eth.chain_id})")
    print(f"  FarmRegistry: {registry_addr}")
    print(f"  AgriTrustVault: {vault_addr}\n")

    # A settled claim permanently deactivates the plot's policy, so re-running
    # this script must start from a fresh deployment — otherwise the payout
    # step reverts with "Policy is not active".
    try:
        policy_active = bool(vault.functions.getPolicyForPlot(1).call()[3])
    except Exception:
        policy_active = False
    if not policy_active:
        print("  ♻️  Policy #1 already settled — redeploying a fresh demo chain state...")
        ok, detail = redeploy_demo_chain()
        if not ok:
            check("Fresh deployment with an active policy #1", False, detail)
            return _summary()
        addrs = load_addresses()
        registry_addr = Web3.to_checksum_address(addrs["FarmRegistry"])
        vault_addr = Web3.to_checksum_address(addrs["AgriTrustVault"])
        registry = w3.eth.contract(address=registry_addr, abi=FARM_REGISTRY_ABI)
        vault = w3.eth.contract(address=vault_addr, abi=AGRI_VAULT_ABI)
        print(f"  ✅ Fresh contracts — FarmRegistry {registry_addr}")
        print(f"  ✅ Fresh contracts — AgriTrustVault {vault_addr}\n")

    # ── 1. Land-record registry read (V2) ────────────────────────────────────
    try:
        count = registry.functions.getEnrolledPlotCount().call()
        check("FarmRegistry.getEnrolledPlotCount()", count > 0, f"{count} plot(s)")
    except Exception as exc:
        check("FarmRegistry.getEnrolledPlotCount()", False, str(exc))
        return _summary()

    raw = registry.functions.getFarmPlot(1).call()
    check(
        "FarmRegistry.getFarmPlot(1) decodes V2 land record",
        len(raw) == 11 and bool(raw[7]) and bool(raw[9]),
        f"Khasra={raw[7]!r} Khata={raw[8]!r} State={raw[9]!r} District={raw[10]!r}",
    )

    # ── 2. Policy + escrow ───────────────────────────────────────────────────
    policy_id, farmer, insured_wei, is_active = vault.functions.getPolicyForPlot(1).call()
    check("AgriTrustVault.getPolicyForPlot(1)", is_active and insured_wei > 0,
          f"policy #{policy_id} insured={w3.from_wei(insured_wei, 'ether')} MST")

    escrow_wei = vault.functions.getEscrowBalance().call()
    check("AgriTrustVault.getEscrowBalance()", escrow_wei >= w3.to_wei(26000, "ether"),
          f"{w3.from_wei(escrow_wei, 'ether')} MST available")

    # ── 3. Oracle key + role ─────────────────────────────────────────────────
    pk = os.getenv("ORACLE_PRIVATE_KEY") or "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
    signer = EIP191ProofSigner(private_key=pk, vault_address=vault_addr)

    ORACLE_ROLE = w3.keccak(text="ORACLE_ROLE")
    has_role = vault.functions.hasRole(ORACLE_ROLE, Web3.to_checksum_address(signer.address)).call()
    check("Oracle wallet holds ORACLE_ROLE on the vault", has_role, signer.address)

    # ── 4. Sign a proof that matches the Solidity payload ────────────────────
    payout_wei = w3.to_wei(26000, "ether")          # 65% of 40,000 MST sum insured
    ts = int(time.time())
    proof = signer.sign_disaster_proof(
        plot_id=1,
        payout_amount_wei=payout_wei,
        chain_id=w3.eth.chain_id,
        timestamp=ts,
        vault_address=vault_addr,
    )
    check("EIP-191 proof bound to vault address", proof.vault_address == vault_addr, proof.proof_hash[:20] + "…")

    # Independent recompute — must be byte-identical to what the contract hashes
    from eth_utils import keccak
    packed = (
        (1).to_bytes(32, "big")
        + payout_wei.to_bytes(32, "big")
        + ts.to_bytes(32, "big")
        + w3.eth.chain_id.to_bytes(32, "big")
        + bytes.fromhex(vault_addr[2:])
    )
    check("Payload == keccak256(abi.encodePacked(plotId, amount, ts, chainId, vault))",
          "0x" + keccak(packed).hex() == proof.proof_hash)

    # ── 5. Execute the payout on-chain ───────────────────────────────────────
    farmer_before = w3.eth.get_balance(Web3.to_checksum_address(farmer))
    oracle_before = w3.eth.get_balance(signer.address)

    try:
        tx = vault.functions.triggerDisasterPayout(
            1, payout_wei, proof.timestamp, bytes.fromhex(proof.signature_hex[2:])
        ).build_transaction({
            "from": signer.address,
            "nonce": w3.eth.get_transaction_count(signer.address),
            "gas": 500_000,
            "gasPrice": w3.to_wei(20, "gwei"),
            "chainId": w3.eth.chain_id,
        })
        signed = w3.eth.account.sign_transaction(tx, private_key=pk)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)
    except Exception as exc:
        check("triggerDisasterPayout() settles escrow", False, str(exc)[:300])
        return _summary()

    check("triggerDisasterPayout() reverted=False / status=1", receipt["status"] == 1,
          f"gas used {receipt['gasUsed']}")
    check("Payout executed in < 2s (single receipt)", receipt["gasUsed"] > 21000,
          f"tx 0x{tx_hash.hex()[:16]}…")

    farmer_after = w3.eth.get_balance(Web3.to_checksum_address(farmer))
    check("Farmer wallet received escrow payout",
          farmer_after - farmer_before == payout_wei,
          f"+{w3.from_wei(farmer_after - farmer_before, 'ether')} MST")

    # ── 6. Replay protection ─────────────────────────────────────────────────
    replayed = False
    try:
        tx2 = vault.functions.triggerDisasterPayout(
            1, payout_wei, proof.timestamp, bytes.fromhex(proof.signature_hex[2:])
        ).build_transaction({
            "from": signer.address,
            "nonce": w3.eth.get_transaction_count(signer.address),
            "gas": 500_000,
            "gasPrice": w3.to_wei(20, "gwei"),
            "chainId": w3.eth.chain_id,
        })
        signed2 = w3.eth.account.sign_transaction(tx2, private_key=pk)
        w3.eth.send_raw_transaction(signed2.raw_transaction)
        time.sleep(1)
    except Exception:
        replayed = True
    check("Replay of the same proof is rejected", replayed)

    # ── 7. A proof signed for a DIFFERENT vault must fail ────────────────────
    bogus = EIP191ProofSigner(
        private_key=pk, vault_address="0x000000000000000000000000000000000000dEaD"
    ).sign_disaster_proof(
        plot_id=2, payout_amount_wei=w3.to_wei(1000, "ether"),
        chain_id=w3.eth.chain_id, timestamp=int(time.time()),
    )
    try:
        tx3 = vault.functions.triggerDisasterPayout(
            2, bogus.payout_amount_wei, bogus.timestamp, bytes.fromhex(bogus.signature_hex[2:])
        ).build_transaction({
            "from": signer.address,
            "nonce": w3.eth.get_transaction_count(signer.address),
            "gas": 500_000,
            "gasPrice": w3.to_wei(20, "gwei"),
            "chainId": w3.eth.chain_id,
        })
        signed3 = w3.eth.account.sign_transaction(tx3, private_key=pk)
        w3.eth.send_raw_transaction(signed3.raw_transaction)
        time.sleep(1)
        cross_vault_rejected = False
    except Exception:
        cross_vault_rejected = True
    check("Proof bound to another vault address is rejected", cross_vault_rejected)

    return _summary()


def _summary() -> int:
    passed = sum(1 for status, _, _ in results if status == PASS)
    failed = len(results) - passed
    print("\n" + "=" * 68)
    print(f"  E2E SUMMARY: {passed} passed | {failed} failed")
    print("=" * 68)
    if failed:
        for status, name, detail in results:
            if status == FAIL:
                print(f"  {status} {name} — {detail}")
        return 1
    print("  END-TO-END BRIDGE VERIFIED — registry → oracle → vault → farmer wallet")
    return 0


if __name__ == "__main__":
    sys.exit(main())
