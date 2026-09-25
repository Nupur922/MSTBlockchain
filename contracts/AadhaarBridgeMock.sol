// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AadhaarBridgeMock
 * @dev Mock Aadhaar Enabled Payment System (AePS) off-ramp settlement bridge for AgriTrust AI.
 * Simulates instant conversion of escrowed MST tokens into INR bank deposits linked to Aadhaar ID.
 */
contract AadhaarBridgeMock is Ownable {
    uint256 public constant MST_TO_INR_RATE = 1000; // 1 MST = ₹1,000 INR

    struct SettlementReceipt {
        uint256 id;
        address farmerWallet;
        string aadhaarHash;
        uint256 amountMST;
        uint256 amountINR;
        uint256 timestamp;
        bool isWithdrawn;
    }

    uint256 private _receiptCounter;
    mapping(uint256 => SettlementReceipt) public receipts;
    mapping(address => uint256[]) public farmerReceipts;

    event SettlementConverted(uint256 indexed receiptId, address indexed farmer, string aadhaarHash, uint256 amountMST, uint256 amountINR);
    event CashWithdrawnAePS(uint256 indexed receiptId, address indexed farmer, uint256 amountINR, uint256 timestamp);

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Convert received MST payout into INR AePS credit.
     */
    function processAePSSettlement(address farmerWallet, string memory aadhaarHash) external payable returns (uint256) {
        require(msg.value > 0, "Must transfer positive MST payout");
        require(farmerWallet != address(0), "Invalid farmer address");

        uint256 amountMST = msg.value;
        uint256 amountINR = (amountMST / 1 ether) * MST_TO_INR_RATE;
        if (amountINR == 0) amountINR = MST_TO_INR_RATE; // Fallback minimum for fractional MST

        uint256 receiptId = ++_receiptCounter;
        receipts[receiptId] = SettlementReceipt({
            id: receiptId,
            farmerWallet: farmerWallet,
            aadhaarHash: aadhaarHash,
            amountMST: amountMST,
            amountINR: amountINR,
            timestamp: block.timestamp,
            isWithdrawn: false
        });

        farmerReceipts[farmerWallet].push(receiptId);

        emit SettlementConverted(receiptId, farmerWallet, aadhaarHash, amountMST, amountINR);
        return receiptId;
    }

    /**
     * @dev Simulate farmer scanning fingerprint at village post office to withdraw cash.
     */
    function withdrawCashFingerprint(uint256 receiptId) external returns (bool) {
        SettlementReceipt storage receipt = receipts[receiptId];
        require(!receipt.isWithdrawn, "Cash already withdrawn");

        receipt.isWithdrawn = true;
        emit CashWithdrawnAePS(receiptId, receipt.farmerWallet, receipt.amountINR, block.timestamp);
        return true;
    }

    function getReceipt(uint256 receiptId) external view returns (SettlementReceipt memory) {
        return receipts[receiptId];
    }
}
