// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "./FarmRegistry.sol";

/**
 * @title AgriTrustVault
 * @dev Escrow Vault & Cryptographic Proof Payout Engine on MST Blockchain for AgriTrust AI.
 * Holds native MST tokens in escrow and releases disaster payouts when verified
 * by signed cryptographic proof certificates from the NEWRRO AI Oracle Agent.
 */
contract AgriTrustVault is AccessControl, ReentrancyGuard, Pausable {
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

    FarmRegistry public farmRegistry;

    struct Policy {
        uint256 id;
        uint256 plotId;
        address farmerWallet;
        uint256 insuredAmountMST;
        bool isActive;
        uint256 createdAt;
    }

    uint256 private _policyCounter;
    uint256 public totalEscrowLiquidityMST;
    uint256 public totalClaimsPaidMST;

    mapping(uint256 => Policy) public policies;
    mapping(uint256 => uint256) public plotToPolicyId;
    mapping(bytes32 => bool) public executedProofs; // Replay protection mapping

    event EscrowDeposited(address indexed depositor, uint256 amountMST);
    event PolicyCreated(uint256 indexed policyId, uint256 indexed plotId, address indexed farmer, uint256 insuredAmount);
    event DisasterPayoutExecuted(
        uint256 indexed policyId,
        uint256 indexed plotId,
        address indexed farmer,
        uint256 payoutAmountMST,
        bytes32 proofHash,
        uint256 timestamp
    );
    event VaultPaused(address account);
    event VaultUnpaused(address account);

    constructor(address _farmRegistryAddress, address adminAddress, address aiOracleAddress) {
        require(_farmRegistryAddress != address(0), "Invalid FarmRegistry address");
        require(adminAddress != address(0), "Invalid admin address");

        farmRegistry = FarmRegistry(_farmRegistryAddress);

        _grantRole(DEFAULT_ADMIN_ROLE, adminAddress);
        _grantRole(ORACLE_ROLE, adminAddress);

        if (aiOracleAddress != address(0)) {
            _grantRole(ORACLE_ROLE, aiOracleAddress);
        }
    }

    /**
     * @dev Insurance pool or Government deposits native MST tokens into vault escrow.
     */
    function depositEscrow() external payable whenNotPaused {
        require(msg.value > 0, "Must deposit positive MST amount");
        totalEscrowLiquidityMST += msg.value;
        emit EscrowDeposited(msg.sender, msg.value);
    }

    /**
     * @dev Create an active crop policy for an enrolled farm plot.
     */
    function createPolicy(uint256 plotId, address farmerWallet, uint256 insuredAmountMST) external onlyRole(DEFAULT_ADMIN_ROLE) returns (uint256) {
        require(farmerWallet != address(0), "Invalid farmer wallet");
        require(insuredAmountMST > 0, "Insured amount must be > 0");

        FarmRegistry.FarmPlot memory plot = farmRegistry.getFarmPlot(plotId);
        require(plot.isEnrolled, "Plot not enrolled in FarmRegistry");

        uint256 policyId = ++_policyCounter;
        policies[policyId] = Policy({
            id: policyId,
            plotId: plotId,
            farmerWallet: farmerWallet,
            insuredAmountMST: insuredAmountMST,
            isActive: true,
            createdAt: block.timestamp
        });

        plotToPolicyId[plotId] = policyId;

        emit PolicyCreated(policyId, plotId, farmerWallet, insuredAmountMST);
        return policyId;
    }

    /**
     * @dev Called when NEWRRO AI Agent detects disaster (flood/drought).
     * Verifies EIP-191 cryptographic signature proof and transfers MST tokens to farmer wallet.
     */
    function triggerDisasterPayout(
        uint256 plotId,
        uint256 payoutAmountMST,
        uint256 timestamp,
        bytes memory signature
    ) external nonReentrant whenNotPaused {
        require(payoutAmountMST > 0, "Payout must be > 0");
        require(address(this).balance >= payoutAmountMST, "Insufficient vault escrow balance");

        // 1. Construct proof hash
        bytes32 proofHash = keccak256(
            abi.encodePacked(plotId, payoutAmountMST, timestamp, block.chainid, address(this))
        );

        // 2. Signature Replay Protection
        require(!executedProofs[proofHash], "Proof signature already executed");

        uint256 policyId = plotToPolicyId[plotId];
        require(policyId > 0, "No active policy for plot");

        Policy storage policy = policies[policyId];
        require(policy.isActive, "Policy is not active");
        // Parametric payout can never exceed the underwritten sum insured for the plot
        require(payoutAmountMST <= policy.insuredAmountMST, "Payout exceeds insured sum");

        // 3. Cryptographic EIP-191 Signature Verification
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(proofHash);
        address signer = ECDSA.recover(ethSignedMessageHash, signature);
        require(hasRole(ORACLE_ROLE, signer), "Unauthorized proof signature: Caller is not NEWRRO AI Oracle");

        // 4. Update state variables BEFORE token transfer (Reentrancy Guard pattern)
        executedProofs[proofHash] = true;
        policy.isActive = false;
        totalClaimsPaidMST += payoutAmountMST;
        if (totalEscrowLiquidityMST >= payoutAmountMST) {
            totalEscrowLiquidityMST -= payoutAmountMST;
        } else {
            totalEscrowLiquidityMST = 0;
        }

        // 5. Transfer native MST tokens to farmer wallet
        (bool success, ) = payable(policy.farmerWallet).call{value: payoutAmountMST}("");
        require(success, "MST Escrow payout transfer failed");

        emit DisasterPayoutExecuted(policyId, plotId, policy.farmerWallet, payoutAmountMST, proofHash, block.timestamp);
    }

    /**
     * @dev Read vault escrow balance.
     */
    function getVaultBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev V2.0 alias used by the AI Oracle agent (sentinel_agent.py) to check
     * available escrow liquidity before submitting a payout transaction.
     */
    function getEscrowBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev V2.0: Read the underwritten policy attached to a plot so the oracle
     * can cap the parametric payout at the insured sum.
     */
    function getPolicyForPlot(uint256 plotId)
        external
        view
        returns (
            uint256 policyId,
            address farmerWallet,
            uint256 insuredAmountMST,
            bool isActive
        )
    {
        uint256 id = plotToPolicyId[plotId];
        if (id == 0) return (0, address(0), 0, false);
        Policy storage p = policies[id];
        return (id, p.farmerWallet, p.insuredAmountMST, p.isActive);
    }

    /**
     * @dev Emergency Pause (Admin only).
     */
    function pauseVault() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
        emit VaultPaused(msg.sender);
    }

    /**
     * @dev Emergency Unpause (Admin only).
     */
    function unpauseVault() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
        emit VaultUnpaused(msg.sender);
    }

    receive() external payable {
        totalEscrowLiquidityMST += msg.value;
        emit EscrowDeposited(msg.sender, msg.value);
    }
}
