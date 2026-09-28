import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import AppKrishiMitra from './AppKrishiMitra.jsx'
import './index.css'

// Simple client-side routing based on URL hash
// #/krishi → Krishi Mitra Portal (DID Login + Farmer Dashboard)
// default → Original AgriTrust AI Demo Portal

const AppRouter = () => {
  const [route, setRoute] = React.useState(window.location.hash);

  React.useEffect(() => {
    const handleHashChange = () => setRoute(window.location.hash);
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Route to Krishi Mitra portal
  if (route === '#/krishi') {
    return <AppKrishiMitra />;
  }

  // Default: Original demo portal
  return <App />;
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>,
)
