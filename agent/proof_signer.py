from eth_account import Account
from eth_account.messages import encode_defunct
from web3 import Web3
import time

class EIP191ProofSigner:
    """
    NEWRRO AI EIP-191 Cryptographic Signature Proof Generator.
    Signs audit loss certificates off-chain using the AI Agent's private key.
    The resulting signature is verified on-chain by AgriTrustVault.sol (ECDSA.recover).
    """
    def __init__(self, private_key="0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"):
        self.account = Account.from_key(private_key)
        print(f"🔒 EIP-191 Proof Signer initialized for NEWRRO AI Agent Address: {self.account.address}")

    def generate_proof_signature(self, plot_id, payout_amount_wei, timestamp, chain_id, vault_address):
        """
        Constructs packed Solidity hash and signs EIP-191 message.
        Hash matches abi.encodePacked(plotId, payoutAmount, timestamp, chainId, vaultAddress)
        """
        w3 = Web3()
        proof_hash = w3.solidity_keccak(
            ['uint256', 'uint256', 'uint256', 'uint256', 'address'],
            [plot_id, payout_amount_wei, timestamp, chain_id, w3.to_checksum_address(vault_address)]
        )

        message = encode_defunct(hexstr=proof_hash.hex())
        signed_message = self.account.sign_message(message)

        return {
            "plot_id": plot_id,
            "payout_amount_wei": payout_amount_wei,
            "timestamp": timestamp,
            "chain_id": chain_id,
            "vault_address": vault_address,
            "proof_hash": proof_hash.hex(),
            "signature": signed_message.signature.hex(),
            "signer_address": self.account.address
        }

if __name__ == "__main__":
    signer = EIP191ProofSigner()
    payout_wei = Web3.to_wei(25.0, 'ether')
    proof = signer.generate_proof_signature(
        plot_id=1,
        payout_amount_wei=payout_wei,
        timestamp=int(time.time()),
        chain_id=31337,
        vault_address="0xe7f17152305783804246F320009258029271a412"
    )
    print(f"✅ Generated EIP-191 Proof Hash: {proof['proof_hash']}")
    print(f"✅ Signature: {proof['signature'][:30]}...")
