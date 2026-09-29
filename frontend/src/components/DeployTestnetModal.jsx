import React, { useState } from 'react';
import { Rocket, Loader2, CheckCircle, AlertCircle, ExternalLink, X, ShieldCheck, Database } from 'lucide-react';
import { ethers } from 'ethers';
import { connectBridgeKey, switchOrAddMSTTestnet } from '../utils/bridgekey';
import FarmRegistryArtifact from '../contracts/FarmRegistry.json';
import AgriTrustVaultArtifact from '../contracts/AgriTrustVault.json';

const DeployTestnetModal = ({ isOpen, onClose, onContractsDeployed }) => {
  const [isDeploying, setIsDeploying] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [registryAddress, setRegistryAddress] = useState('');
  const [vaultAddress, setVaultAddress] = useState('');
  const [error, setError] = useState('');
  const [deployed, setDeployed] = useState(false);

  if (!isOpen) return null;

  const handleDeploy = async () => {
    setIsDeploying(true);
    setError('');
    setRegistryAddress('');
    setVaultAddress('');
    setDeployed(false);

    try {
      // 1. Ensure BridgeKey is connected
      setCurrentStep('Connecting to BridgeKey wallet...');
      const { signer, address, isMSTTestnet } = await connectBridgeKey();

      // 2. Ensure MST Testnet is selected
      if (!isMSTTestnet) {
        setCurrentStep('Switching wallet to MST Testnet (Chain ID 91562037)...');
        await switchOrAddMSTTestnet();
      }

      // Check balance
      const provider = signer.provider;
      const balance = await provider.getBalance(address);
      if (balance < ethers.parseEther('6.0')) {
        throw new Error(
          `Insufficient balance (${ethers.formatEther(balance)} tMSTC). You need at least 6 tMSTC to deploy contracts and seed 5 tMSTC into escrow.`
        );
      }

      // 3. Deploy FarmRegistry
      setCurrentStep('1/3: Please approve FarmRegistry deployment in BridgeKey...');
      const FarmRegistryFactory = new ethers.ContractFactory(
        FarmRegistryArtifact.abi,
        FarmRegistryArtifact.bytecode,
        signer
      );

      const farmRegistry = await FarmRegistryFactory.deploy(address, address);
      setCurrentStep(`1/3: Waiting for FarmRegistry transaction confirmation (${farmRegistry.deploymentTransaction().hash.slice(0, 10)}...)...`);
      await farmRegistry.waitForDeployment();
      const regAddr = await farmRegistry.getAddress();
      setRegistryAddress(regAddr);
      console.log('✅ FarmRegistry deployed at:', regAddr);

      // 4. Deploy AgriTrustVault
      setCurrentStep('2/3: Please approve AgriTrustVault deployment in BridgeKey...');
      const VaultFactory = new ethers.ContractFactory(
        AgriTrustVaultArtifact.abi,
        AgriTrustVaultArtifact.bytecode,
        signer
      );

      const vault = await VaultFactory.deploy(regAddr, address, address);
      setCurrentStep(`2/3: Waiting for AgriTrustVault confirmation (${vault.deploymentTransaction().hash.slice(0, 10)}...)...`);
      await vault.waitForDeployment();
      const vltAddr = await vault.getAddress();
      setVaultAddress(vltAddr);
      console.log('✅ AgriTrustVault deployed at:', vltAddr);

      // 5. Seed initial escrow liquidity (5 tMSTC)
      setCurrentStep('3/3: Please approve 5 tMSTC Escrow Liquidity deposit in BridgeKey...');
      const depositTx = await vault.depositEscrow({ value: ethers.parseEther('5.0') });
      setCurrentStep(`3/3: Confirming 5 tMSTC Escrow Deposit (${depositTx.hash.slice(0, 10)}...)...`);
      await depositTx.wait();
      console.log('✅ Seeded 5 tMSTC Escrow Liquidity!');

      // Save to localStorage
      const deployedData = {
        network: 'mstTestnet',
        chainId: 91562037,
        FarmRegistry: regAddr,
        AgriTrustVault: vltAddr,
        deployer: address,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem('agritrust_mst_testnet_contracts', JSON.stringify(deployedData));

      setDeployed(true);
      setCurrentStep('All contracts deployed and verified successfully on MST Testnet!');

      if (onContractsDeployed) {
        onContractsDeployed(deployedData);
      }
    } catch (err) {
      console.error('Deployment error:', err);
      let msg = err.message || 'Deployment failed';
      if (err.code === 4001 || msg.includes('rejected') || msg.includes('User denied')) {
        msg = 'Transaction was rejected by user in BridgeKey.';
      }
      setError(msg);
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-emerald-100 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 to-teal-800 p-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 p-2.5 rounded-xl">
              <Rocket className="w-6 h-6 text-emerald-200" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Deploy to MST Testnet</h2>
              <p className="text-xs text-emerald-100">Live deployment through your BridgeKey wallet</p>
            </div>
          </div>
          <button onClick={onClose} disabled={isDeploying} className="text-white/70 hover:text-white disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {!deployed ? (
            <>
              <p className="text-sm text-gray-600 leading-relaxed">
                This will deploy the <strong>FarmRegistry.sol</strong> cadastral registry and 
                <strong> AgriTrustVault.sol</strong> escrow contract directly to <strong>MST Testnet</strong> using your connected BridgeKey wallet and seed <strong>5 tMSTC</strong> in initial escrow liquidity.
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5 text-xs text-slate-700">
                <div className="flex items-center space-x-2 font-medium">
                  <Database className="w-4 h-4 text-emerald-600" />
                  <span>Deployment Pipeline:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
                  <li>Deploy <code>FarmRegistry.sol</code> (Admin: Connected Wallet)</li>
                  <li>Deploy <code>AgriTrustVault.sol</code> (EIP-191 Replay Protection)</li>
                  <li>Deposit <code>5.0 tMSTC</code> Escrow Pool Liquidity</li>
                </ul>
              </div>

              {isDeploying && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-3 text-emerald-800 text-xs animate-pulse">
                  <Loader2 className="w-5 h-5 text-emerald-600 animate-spin flex-shrink-0" />
                  <span className="font-semibold">{currentStep}</span>
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3 text-red-800 text-xs">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Error: </span>
                    <span>{error}</span>
                  </div>
                </div>
              )}

              <button
                onClick={handleDeploy}
                disabled={isDeploying}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md flex items-center justify-center space-x-2"
              >
                {isDeploying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deploying in BridgeKey...</span>
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4" />
                    <span>Approve & Deploy via BridgeKey (5.5 tMSTC total)</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <div className="text-center py-4 space-y-4">
              <div className="bg-emerald-100 p-5 rounded-full inline-block">
                <CheckCircle className="w-14 h-14 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Contracts Deployed! 🎉</h3>
                <p className="text-xs text-slate-500 mt-1">Live on MST Blockchain Testnet (Chain ID 91562037)</p>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 text-left space-y-3 text-xs border border-slate-200">
                <div>
                  <span className="text-slate-500 block">FarmRegistry Address:</span>
                  <a
                    href={`https://testnet.mstscan.com/address/${registryAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-emerald-700 hover:underline break-all font-semibold flex items-center space-x-1"
                  >
                    <span>{registryAddress}</span>
                    <ExternalLink className="w-3 h-3 inline" />
                  </a>
                </div>

                <div>
                  <span className="text-slate-500 block">AgriTrustVault Address:</span>
                  <a
                    href={`https://testnet.mstscan.com/address/${vaultAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-emerald-700 hover:underline break-all font-semibold flex items-center space-x-1"
                  >
                    <span>{vaultAddress}</span>
                    <ExternalLink className="w-3 h-3 inline" />
                  </a>
                </div>

                <div className="pt-2 border-t border-slate-200 flex justify-between">
                  <span className="text-slate-500">Escrow Liquidity:</span>
                  <span className="font-bold text-emerald-700">5.00 tMSTC</span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-colors shadow-md"
              >
                Done — Return to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeployTestnetModal;
