// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title FarmRegistry
 * @dev On-chain GIS Land Parcel & Geofencing Registry for AgriTrust AI on MST Blockchain.
 * Manages enrolled farm plots in flood basins (Assam Brahmaputra & Bihar Kosi).
 */
contract FarmRegistry is AccessControl {
    bytes32 public constant KRISHI_MITRA_ROLE = keccak256("KRISHI_MITRA_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

    struct FarmPlot {
        uint256 id;
        address ownerWallet;
        string polygonGeoJSON; // Lat/Lng vector polygon coordinates
        uint256 acreage;       // Size in acres (scaled x100 e.g. 250 = 2.5 acres)
        string cropType;       // e.g. "Paddy (Rice)"
        bool isEnrolled;
        uint256 registeredAt;
        // ── V2.0: Government land-record identifiers (7/12 RoR, Bhu-Naksha, Khasra/Khata) ──
        string khasraNumber;   // Khasra / Gat / Survey / Dag number
        string khataNumber;    // Khata / Khatiyan / Record-of-Rights account number
        string stateName;      // Indian state (drives regional dialect voice dispatch)
        string districtName;   // District / Tehsil of the land parcel
    }

    uint256 private _plotCounter;
    mapping(uint256 => FarmPlot) public plots;
    mapping(address => uint256[]) public farmerPlots;

    event FarmPlotRegistered(
        uint256 indexed plotId,
        address indexed ownerWallet,
        string cropType,
        uint256 acreage,
        uint256 registeredAt,
        string khasraNumber,
        string stateName
    );

    constructor(address adminAddress, address initialKrishiMitra) {
        require(adminAddress != address(0), "Invalid admin address");
        _grantRole(DEFAULT_ADMIN_ROLE, adminAddress);
        _grantRole(KRISHI_MITRA_ROLE, adminAddress);

        if (initialKrishiMitra != address(0)) {
            _grantRole(KRISHI_MITRA_ROLE, initialKrishiMitra);
        }
    }

    /**
     * @dev Register a new farm plot on MST Blockchain.
     * Restricted to authorized Krishi Mitras / CSC operators scanning land record QR codes.
     * V2.0: also commits the government land-record identifiers (Khasra, Khata, State, District).
     */
    function registerFarmPlot(
        address ownerWallet,
        string memory polygonGeoJSON,
        uint256 acreage,
        string memory cropType,
        string memory khasraNumber,
        string memory khataNumber,
        string memory stateName,
        string memory districtName
    ) external onlyRole(KRISHI_MITRA_ROLE) returns (uint256) {
        require(ownerWallet != address(0), "Invalid farmer wallet address");
        require(bytes(polygonGeoJSON).length > 0, "Polygon coordinates required");
        require(acreage > 0, "Acreage must be greater than zero");
        require(bytes(khasraNumber).length > 0, "Khasra number required");
        require(bytes(stateName).length > 0, "State name required");

        uint256 plotId = ++_plotCounter;
        plots[plotId] = FarmPlot({
            id: plotId,
            ownerWallet: ownerWallet,
            polygonGeoJSON: polygonGeoJSON,
            acreage: acreage,
            cropType: cropType,
            isEnrolled: true,
            registeredAt: block.timestamp,
            khasraNumber: khasraNumber,
            khataNumber: khataNumber,
            stateName: stateName,
            districtName: districtName
        });

        farmerPlots[ownerWallet].push(plotId);

        emit FarmPlotRegistered(plotId, ownerWallet, cropType, acreage, block.timestamp, khasraNumber, stateName);
        return plotId;
    }

    /**
     * @dev V2.0: Read the government land-record identifiers for an enrolled plot.
     */
    function getPlotLandRecord(uint256 plotId)
        external
        view
        returns (
            string memory khasraNumber,
            string memory khataNumber,
            string memory stateName,
            string memory districtName,
            string memory polygonGeoJSON
        )
    {
        require(plots[plotId].isEnrolled, "Plot not enrolled");
        FarmPlot storage p = plots[plotId];
        return (p.khasraNumber, p.khataNumber, p.stateName, p.districtName, p.polygonGeoJSON);
    }

    /**
     * @dev Read farm plot details by plot ID.
     */
    function getFarmPlot(uint256 plotId) external view returns (FarmPlot memory) {
        require(plots[plotId].isEnrolled, "Plot not enrolled");
        return plots[plotId];
    }

    /**
     * @dev Returns total number of registered farm plots.
     * V2.0 alias kept for the AI Oracle agent (sentinel_agent.py) which reads
     * `getEnrolledPlotCount()` — every registered plot is enrolled.
     */
    function getEnrolledPlotCount() external view returns (uint256) {
        return _plotCounter;
    }

    /**
     * @dev Returns total number of registered farm plots.
     */
    function getPlotCount() external view returns (uint256) {
        return _plotCounter;
    }

    /**
     * @dev Get all plot IDs owned by a farmer address.
     */
    function getPlotsByFarmer(address farmer) external view returns (uint256[] memory) {
        return farmerPlots[farmer];
    }
}
