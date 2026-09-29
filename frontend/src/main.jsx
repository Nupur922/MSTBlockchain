import React, { useState, useCallback, useRef } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import AppKrishiMitra from './AppKrishiMitra.jsx'
import './index.css'

/**
 * AppRouter — top-level router for AgriTrust AI
 *
 * Routes:
 *   (default)  → Main demo dashboard (App.jsx)
 *   #/krishi   → Krishi Mitra DID portal (AppKrishiMitra.jsx)
 *
 * Shared state:
 *   activeTelemetry + activeScenario are lifted here so the Krishi portal
 *   can read the same live values as the main dashboard, and trigger
 *   scenarios that also update the main dashboard.
 */

// Default healthy telemetry (mirrors App.jsx default)
const DEFAULT_TELEMETRY = {
  ndvi_score: 0.75,
  sar_backscatter_db: -10.5,
  days_submerged: 0,
  ndwi_score: -0.12,
  lst_temp_c: 28.5,
  status: 'HEALTHY_GROWING_CROP',
  payout_ratio: 0.0,
  hazard_type: 'NONE',
};

const AppRouter = () => {
  const [route, setRoute] = React.useState(window.location.hash);

  // Shared scenario state — lifted so Krishi portal can read + write
  const [activeScenario,  setActiveScenario]  = useState(null);
  const [activeTelemetry, setActiveTelemetry] = useState(DEFAULT_TELEMETRY);

  // Shared selectedFarmer state — lifted so clicking a farmer in Krishi portal
  // updates the HistoricalClimateTracker on the main dashboard
  const [selectedFarmer, setSelectedFarmer] = useState(null);

  // Keep App.jsx's handleTriggerScenario accessible from the Krishi portal
  // by storing it in a ref that App.jsx will populate via a callback prop
  const appScenarioHandlerRef = useRef(null);

  const handleSelectScenarioFromKrishi = useCallback((scenarioId) => {
    // If App.jsx has registered its handler, delegate to it
    // (keeps all telemetry logic in one place)
    if (appScenarioHandlerRef.current) {
      appScenarioHandlerRef.current(scenarioId);
    } else {
      // App not mounted (Krishi portal is the active route) — just store it
      setActiveScenario(scenarioId);
    }
    // After triggering, navigate back to main dashboard so the user sees the effect
    window.location.hash = '';
  }, []);

  React.useEffect(() => {
    const onHashChange = () => setRoute(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  if (route === '#/krishi') {
    return (
      <AppKrishiMitra
        activeTelemetry={activeTelemetry}
        activeScenario={activeScenario}
        onSelectScenario={handleSelectScenarioFromKrishi}
        onFarmerSelect={setSelectedFarmer}
      />
    );
  }

  // Main dashboard — pass a registration callback so App can share its handler
  return (
    <App
      onRegisterScenarioHandler={(handler) => { appScenarioHandlerRef.current = handler; }}
      sharedActiveTelemetry={activeTelemetry}
      onTelemetryChange={setActiveTelemetry}
      sharedActiveScenario={activeScenario}
      onScenarioChange={setActiveScenario}
      selectedFarmer={selectedFarmer}
    />
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>,
)
