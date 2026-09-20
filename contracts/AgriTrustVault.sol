// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "./FarmRegistry.sol";

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
    mapping(bytes32 => bool) public executedProofs;

    event EscrowDeposited(address indexed depositor, uint256 amountMST);
    event PolicyCreated(uint256 indexed policyId, uint256 indexed plotId, address indexed farmer, uint256 insuredAmount);
    event DisasterPayoutExecuted(uint256 indexed policyId, uint256 indexed plotId, address indexed farmer, uint256 payoutAmountMST, bytes32 proofHash, uint256 timestamp);

    constructor(address _farmRegistryAddress, address adminAddress, address aiOracleAddress) {
        require(_farmRegistryAddress != address(0), "Invalid FarmRegistry address");
        farmRegistry = FarmRegistry(_farmRegistryAddress);
        _grantRole(DEFAULT_ADMIN_ROLE, adminAddress);
        _grantRole(ORACLE_ROLE, adminAddress);
        if (aiOracleAddress != address(0)) {
            _grantRole(ORACLE_ROLE, aiOracleAddress);
        }
    }

    function depositEscrow() external payable whenNotPaused {
        require(msg.value > 0, "Must deposit positive MST amount");
        totalEscrowLiquidityMST += msg.value;
        emit EscrowDeposited(msg.sender, msg.value);
    }

    function createPolicy(uint256 plotId, address farmerWallet, uint256 insuredAmountMST) external onlyRole(DEFAULT_ADMIN_ROLE) returns (uint256) {
        require(farmerWallet != address(0), "Invalid farmer wallet");
        FarmRegistry.FarmPlot memory plot = farmRegistry.getFarmPlot(plotId);
        require(plot.isEnrolled, "Plot not enrolled");

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

    function triggerDisasterPayout(uint256 plotId, uint256 payoutAmountMST, uint256 timestamp, bytes memory signature) external nonReentrant whenNotPaused {
        require(payoutAmountMST > 0, "Payout must be > 0");
        require(address(this).balance >= payoutAmountMST, "Insufficient vault balance");

        uint256 policyId = plotToPolicyId[plotId];
        require(policyId > 0, "No active policy for plot");
        Policy storage policy = policies[policyId];
        require(policy.isActive, "Policy not active");

        bytes32 proofHash = keccak256(abi.encodePacked(plotId, payoutAmountMST, timestamp, block.chainid, address(this)));
        require(!executedProofs[proofHash], "Proof signature already executed");

        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(proofHash);
        address signer = ECDSA.recover(ethSignedMessageHash, signature);
        require(hasRole(ORACLE_ROLE, signer), "Unauthorized proof signature");

        executedProofs[proofHash] = true;
        policy.isActive = false;
        totalClaimsPaidMST += payoutAmountMST;

        (bool success, ) = payable(policy.farmerWallet).call{value: payoutAmountMST}("");
        require(success, "Payout transfer failed");

        emit DisasterPayoutExecuted(policyId, plotId, policy.farmerWallet, payoutAmountMST, proofHash, block.timestamp);
    }

    function getVaultBalance() external view returns (uint256) {
        return address(this).balance;
    }

    receive() external payable {
        totalEscrowLiquidityMST += msg.value;
        emit EscrowDeposited(msg.sender, msg.value);
    }
}
