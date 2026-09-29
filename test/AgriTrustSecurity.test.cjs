const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("🛡️ AgriTrust AI Smart Contract Security Suite", function () {
  let FarmRegistry, farmRegistry;
  let AgriTrustVault, vault;
  let owner, aiOracle, farmer, attacker;

  beforeEach(async function () {
    [owner, aiOracle, farmer, attacker] = await ethers.getSigners();

    FarmRegistry = await ethers.getContractFactory("FarmRegistry");
    farmRegistry = await FarmRegistry.deploy(owner.address, owner.address);
    await farmRegistry.waitForDeployment();

    AgriTrustVault = await ethers.getContractFactory("AgriTrustVault");
    vault = await AgriTrustVault.deploy(
      await farmRegistry.getAddress(),
      owner.address,
      aiOracle.address
    );
    await vault.waitForDeployment();

    // Register Plot #1
    const sampleGeoJSON = JSON.stringify({ type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] });
    await farmRegistry.registerFarmPlot(
      farmer.address, 
      sampleGeoJSON, 
      250, 
      "Paddy (Rice)",
      "Khasra #104/B",
      "Khata #27/3",
      "Assam",
      "Majuli"
    );

    // Create Policy #1 (50 MST)
    await vault.createPolicy(1, farmer.address, ethers.parseEther("50.0"));

    // Fund Vault with 100 MST Escrow Liquidity
    await vault.depositEscrow({ value: ethers.parseEther("100.0") });
  });

  it("1. Should successfully process disaster payout with valid NEWRRO AI EIP-191 signature proof", async function () {
    const plotId = 1;
    const payoutAmount = ethers.parseEther("25.0"); // 25 MST partial payout
    const timestamp = Math.floor(Date.now() / 1000);
    const chainId = (await ethers.provider.getNetwork()).chainId;
    const vaultAddress = await vault.getAddress();

    // Construct Hash matching smart contract ABI encoding
    const proofHash = ethers.solidityPackedKeccak256(
      ["uint256", "uint256", "uint256", "uint256", "address"],
      [plotId, payoutAmount, timestamp, chainId, vaultAddress]
    );

    // AI Oracle Signs Message
    const signature = await aiOracle.signMessage(ethers.getBytes(proofHash));

    const farmerInitialBalance = await ethers.provider.getBalance(farmer.address);

    // Execute Payout
    await expect(vault.triggerDisasterPayout(plotId, payoutAmount, timestamp, signature))
      .to.emit(vault, "DisasterPayoutExecuted");

    const farmerFinalBalance = await ethers.provider.getBalance(farmer.address);
    expect(farmerFinalBalance - farmerInitialBalance).to.equal(payoutAmount);
  });

  it("2. Should REJECT disaster payout signed by an unauthorized attacker wallet", async function () {
    const plotId = 1;
    const payoutAmount = ethers.parseEther("25.0");
    const timestamp = Math.floor(Date.now() / 1000);
    const chainId = (await ethers.provider.getNetwork()).chainId;
    const vaultAddress = await vault.getAddress();

    const proofHash = ethers.solidityPackedKeccak256(
      ["uint256", "uint256", "uint256", "uint256", "address"],
      [plotId, payoutAmount, timestamp, chainId, vaultAddress]
    );

    // Attacker signs message instead of AI Oracle
    const fakeSignature = await attacker.signMessage(ethers.getBytes(proofHash));

    await expect(
      vault.triggerDisasterPayout(plotId, payoutAmount, timestamp, fakeSignature)
    ).to.be.revertedWith("Unauthorized proof signature: Caller is not NEWRRO AI Oracle");
  });

  it("3. Should REJECT signature replay attack when submitting the exact same proof hash twice", async function () {
    const plotId = 1;
    const payoutAmount = ethers.parseEther("25.0");
    const timestamp = Math.floor(Date.now() / 1000);
    const chainId = (await ethers.provider.getNetwork()).chainId;
    const vaultAddress = await vault.getAddress();

    const proofHash = ethers.solidityPackedKeccak256(
      ["uint256", "uint256", "uint256", "uint256", "address"],
      [plotId, payoutAmount, timestamp, chainId, vaultAddress]
    );

    const signature = await aiOracle.signMessage(ethers.getBytes(proofHash));

    // First execution succeeds
    await vault.triggerDisasterPayout(plotId, payoutAmount, timestamp, signature);

    // Second execution with same proof MUST REVERT due to Replay Protection
    await expect(
      vault.triggerDisasterPayout(plotId, payoutAmount, timestamp, signature)
    ).to.be.revertedWith("Proof signature already executed");
  });
});
