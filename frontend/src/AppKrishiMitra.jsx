/**
 * AppKrishiMitra.jsx
 * ==================
 * AgriTrust AI V3 — Main Krishi Mitra Application Router
 * 
 * Handles authentication flow and routing between:
 * - KrishiMitraLogin (DID-based auth)
 * - FarmerDashboard (farmer list + telemetry)
 */

import { useState } from 'react';
import KrishiMitraLogin from './pages/KrishiMitraLogin';
import FarmerDashboard from './pages/FarmerDashboard';

function AppKrishiMitra() {
  const [krishiMitra, setKrishiMitra] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLoginSuccess = (userData) => {
    setKrishiMitra(userData);
    setIsAuthenticated(true);
    console.log('✓ Krishi Mitra authenticated:', userData);
  };

  return (
    <div className="min-h-screen">
      {!isAuthenticated ? (
        <KrishiMitraLogin onLoginSuccess={handleLoginSuccess} />
      ) : (
        <FarmerDashboard krishiMitra={krishiMitra} />
      )}
    </div>
  );
}

export default AppKrishiMitra;
