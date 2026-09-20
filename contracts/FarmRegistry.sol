// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract FarmRegistry is AccessControl {
    bytes32 public constant KRISHI_MITRA_ROLE = keccak256("KRISHI_MITRA_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

    struct FarmPlot {
        uint256 id;
        address ownerWallet;
        string polygonGeoJSON;
        uint256 acreage;
        string cropType;
        bool isEnrolled;
        uint256 registeredAt;
    }

    uint256 private _plotCounter;
    mapping(uint256 => FarmPlot) public plots;
    mapping(address => uint256[]) public farmerPlots;

    event FarmPlotRegistered(uint256 indexed plotId, address indexed ownerWallet, string cropType, uint256 acreage, uint256 registeredAt);

    constructor(address adminAddress, address initialKrishiMitra) {
        require(adminAddress != address(0), "Invalid admin address");
        _grantRole(DEFAULT_ADMIN_ROLE, adminAddress);
        _grantRole(KRISHI_MITRA_ROLE, adminAddress);
        if (initialKrishiMitra != address(0)) {
            _grantRole(KRISHI_MITRA_ROLE, initialKrishiMitra);
        }
    }

    function registerFarmPlot(address ownerWallet, string memory polygonGeoJSON, uint256 acreage, string memory cropType) external onlyRole(KRISHI_MITRA_ROLE) returns (uint256) {
        require(ownerWallet != address(0), "Invalid farmer wallet address");
        uint256 plotId = ++_plotCounter;
        plots[plotId] = FarmPlot({
            id: plotId,
            ownerWallet: ownerWallet,
            polygonGeoJSON: polygonGeoJSON,
            acreage: acreage,
            cropType: cropType,
            isEnrolled: true,
            registeredAt: block.timestamp
        });
        farmerPlots[ownerWallet].push(plotId);
        emit FarmPlotRegistered(plotId, ownerWallet, cropType, acreage, block.timestamp);
        return plotId;
    }

    function getFarmPlot(uint256 plotId) external view returns (FarmPlot memory) {
        require(plots[plotId].isEnrolled, "Plot not enrolled");
        return plots[plotId];
    }

    function getPlotCount() external view returns (uint256) {
        return _plotCounter;
    }
}
