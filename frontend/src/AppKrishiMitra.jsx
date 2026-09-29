/**
 * AppKrishiMitra.jsx
 * ==================
 * AgriTrust AI V3 — Krishi Mitra Application Router
 *
 * Manages:
 *  - Authentication flow: KrishiMitraLogin → FarmerDashboard
 *  - Passes activeTelemetry + activeScenario down to FarmerDashboard
 *  - Exposes onSelectScenario so the Krishi portal can trigger the same
 *    scenarios as the main App.jsx Demo Control Panel
 *  - onBackToMain navigates back to the main dashboard (hash route)
 */

import { useState } from 'react';
import KrishiMitraLogin  from './pages/KrishiMitraLogin';
import FarmerDashboard   from './pages/FarmerDashboard';

function AppKrishiMitra({ activeTelemetry, activeScenario, onSelectScenario, onFarmerSelect }) {
  const [krishiMitra,      setKrishiMitra]      = useState(null);
  const [isAuthenticated,  setIsAuthenticated]  = useState(false);

  const handleLoginSuccess = (userData) => {
    setKrishiMitra(userData);
    setIsAuthenticated(true);
  };

  const handleBackToMain = () => {
    // Return to main dashboard by clearing the hash route
    window.location.hash = '';
  };

  if (!isAuthenticated) {
    return <KrishiMitraLogin onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <FarmerDashboard
      krishiMitra={krishiMitra}
      activeTelemetry={activeTelemetry}
      activeScenario={activeScenario}
      onSelectScenario={onSelectScenario}
      onBackToMain={handleBackToMain}
      onFarmerSelect={onFarmerSelect}
    />
  );
}

export default AppKrishiMitra;
