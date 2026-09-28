/**
 * KrishiMitraLogin.jsx
 * ===================
 * AgriTrust AI V3 — W3C DID-Based Authentication for Krishi Mitra
 * 
 * Features:
 * - Wallet-based authentication (no username/password)
 * - EIP-191 challenge-response signing
 * - On-chain role verification (KRISHI_MITRA_ROLE)
 * - DID display: did:mst:krishi:0x...
 * - Zero centralized auth server
 */

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

const KrishiMitraLogin = ({ onLoginSuccess }) => {
  const [walletAddress, setWalletAddress] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [krishiMitraDID, setKrishiMitraDID] = useState('');

  // Check if already connected
  useEffect(() => {
    checkIfWalletConnected();
  }, []);

  const checkIfWalletConnected = async () => {
    try {
      const { ethereum } = window;
      if (!ethereum) return;

      const accounts = await ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        setWalletAddress(accounts[0]);
      }
    } catch (err) {
      console.error('Error checking wallet:', err);
    }
  };

  const connectWallet = async () => {
    try {
      const { ethereum } = window;
      
      if (!ethereum) {
        setError('MetaMask not found! Please install MetaMask browser extension.');
        return;
      }

      setIsConnecting(true);
      setError('');

      const accounts = await ethereum.request({ 
        method: 'eth_requestAccounts' 
      });

      setWalletAddress(accounts[0]);
      setIsConnecting(false);

      // Auto-verify after connection
      await verifyKrishiMitraRole(accounts[0]);

    } catch (err) {
      setIsConnecting(false);
      setError('Failed to connect wallet: ' + err.message);
    }
  };

  const verifyKrishiMitraRole = async (address) => {
    try {
      setIsVerifying(true);
      setError('');

      // Get contract instances
      const contractAddresses = await import('../contracts/contract-addresses.json');
      const FarmRegistryABI = await import('../contracts/FarmRegistry.json');

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const farmRegistry = new ethers.Contract(
        contractAddresses.FarmRegistry,
        FarmRegistryABI.abi,
        signer
      );

      // Check if wallet has KRISHI_MITRA_ROLE
      const KRISHI_MITRA_ROLE = ethers.id("KRISHI_MITRA_ROLE");
      const hasRole = await farmRegistry.hasRole(KRISHI_MITRA_ROLE, address);

      if (!hasRole) {
        setError('Access Denied: This wallet does not have KRISHI_MITRA_ROLE. Please contact admin.');
        setIsVerifying(false);
        return;
      }

      // Generate challenge for signing
      const timestamp = Date.now();
      const challenge = `AgriTrust AI Krishi Mitra Login\nTimestamp: ${timestamp}\nWallet: ${address}\nRole: KRISHI_MITRA`;

      // Request signature (EIP-191)
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [challenge, address]
      });

      // Verify signature (client-side verification)
      const recoveredAddress = ethers.verifyMessage(challenge, signature);
      
      if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
        setError('Signature verification failed!');
        setIsVerifying(false);
        return;
      }

      // Generate DID
      const did = `did:mst:krishi:${address.toLowerCase()}`;
      setKrishiMitraDID(did);

      // Login successful
      setIsVerifying(false);
      
      // Pass data to parent
      if (onLoginSuccess) {
        onLoginSuccess({
          walletAddress: address,
          did: did,
          role: 'KRISHI_MITRA',
          signature: signature,
          timestamp: timestamp
        });
      }

    } catch (err) {
      setIsVerifying(false);
      setError('Verification failed: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-teal-50/10 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#15803D12_1px,transparent_1px)] [background-size:24px_24px]"></div>

      {/* Login Card */}
      <div className="relative w-full max-w-md">
        {/* Tricolor Strip */}
        <div className="h-1.5 w-full flex rounded-t-2xl overflow-hidden">
          <div className="w-1/3 bg-[#FF9933]"></div>
          <div className="w-1/3 bg-white border-y border-slate-200"></div>
          <div className="w-1/3 bg-[#138808]"></div>
        </div>

        {/* Card Body */}
        <div className="bg-white rounded-b-2xl shadow-2xl border border-slate-200 p-8">
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-700 to-emerald-500 text-white shadow-lg shadow-emerald-700/20 mb-4">
              <i className="ph-bold ph-shield-check text-3xl"></i>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 mb-2">
              AgriTrust<span className="text-emerald-600">.AI</span>
            </h1>
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-1 rounded-full border border-emerald-300 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping"></span>
                PMFBY MST L1
              </span>
            </div>
            <p className="text-sm text-slate-600 font-medium mt-3">
              Krishi Mitra Portal
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Decentralized Identity Authentication
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-2">
              <i className="ph-bold ph-warning-circle text-red-600 text-lg mt-0.5"></i>
              <span>{error}</span>
            </div>
          )}

          {/* DID Display (After Login) */}
          {krishiMitraDID && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2 font-mono">
                ✓ Authenticated DID
              </div>
              <div className="font-mono text-xs text-emerald-900 break-all bg-white px-3 py-2 rounded border border-emerald-200">
                {krishiMitraDID}
              </div>
            </div>
          )}

          {/* Wallet Display */}
          {walletAddress && !krishiMitraDID && (
            <div className="mb-6 p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-xs text-slate-500 mb-1">Connected Wallet</div>
              <div className="font-mono text-sm text-slate-900 truncate">
                {walletAddress}
              </div>
            </div>
          )}

          {/* Connect/Verify Buttons */}
          {!walletAddress ? (
            <button
              onClick={connectWallet}
              disabled={isConnecting}
              className="w-full bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-800 hover:to-emerald-700 disabled:from-slate-400 disabled:to-slate-400 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:cursor-not-allowed"
            >
              {isConnecting ? (
                <>
                  <i className="ph-bold ph-circle-notch text-lg animate-spin"></i>
                  <span>Connecting to MetaMask...</span>
                </>
              ) : (
                <>
                  <i className="ph-bold ph-wallet text-lg"></i>
                  <span>Connect Wallet to Login</span>
                </>
              )}
            </button>
          ) : !krishiMitraDID && (
            <button
              onClick={() => verifyKrishiMitraRole(walletAddress)}
              disabled={isVerifying}
              className="w-full bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-800 hover:to-blue-700 disabled:from-slate-400 disabled:to-slate-400 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:cursor-not-allowed"
            >
              {isVerifying ? (
                <>
                  <i className="ph-bold ph-circle-notch text-lg animate-spin"></i>
                  <span>Verifying Role & Signing Challenge...</span>
                </>
              ) : (
                <>
                  <i className="ph-bold ph-fingerprint text-lg"></i>
                  <span>Verify Krishi Mitra Role</span>
                </>
              )}
            </button>
          )}

          {/* Info Box */}
          <div className="mt-6 p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-xs text-slate-600 space-y-2">
              <div className="flex items-start gap-2">
                <i className="ph-bold ph-info text-slate-400 mt-0.5"></i>
                <div>
                  <strong className="text-slate-800">DID-Based Login:</strong>
                  <p className="mt-0.5">Connect your wallet and sign a challenge to authenticate. No passwords, no centralized servers.</p>
                </div>
              </div>
              <div className="flex items-start gap-2 pt-2 border-t border-slate-200">
                <i className="ph-bold ph-shield-check text-emerald-600 mt-0.5"></i>
                <div>
                  <strong className="text-slate-800">On-Chain Verification:</strong>
                  <p className="mt-0.5">Your wallet must have KRISHI_MITRA_ROLE in the FarmRegistry contract to access the portal.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 text-center text-xs text-slate-500">
          <p>🇮🇳 Government of India · Ministry of Agriculture & Farmers Welfare</p>
          <p className="mt-1 font-mono">Powered by MST Blockchain Layer-1 · W3C DID Core 1.0</p>
        </div>
      </div>
    </div>
  );
};

export default KrishiMitraLogin;
