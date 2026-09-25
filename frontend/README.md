# AgriTrust AI - Frontend Dashboard

A parametric crop insurance dashboard built with React, Vite, Web3, and GIS mapping for the MST Blockchain hackathon.

## 🚀 Features

- **Real-time Dashboard**: Displays escrow pool balance, active farmers, and claims settled
- **Interactive GIS Map**: Leaflet-based map centered on Majuli, Assam with GeoJSON farm plot boundaries
- **Telemetry Monitoring**: Live NDVI (vegetation health) and SAR flood inundation gauges
- **Web3 Integration**: Connects to local Hardhat node using Ethers.js v6
- **Responsive Design**: Fully responsive UI built with Tailwind CSS

## 🛠️ Tech Stack

- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS
- **Maps**: Leaflet + React-Leaflet
- **Web3**: Ethers.js v6 (BrowserProvider)
- **Icons**: Lucide React

## 📦 Installation

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- MetaMask browser extension (optional)
- Running Hardhat local node (optional, for Web3 features)

### Setup Steps

1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser**:
   Navigate to `http://localhost:3000`

## 🔗 Web3 Setup

### Connecting to Local Hardhat Node

1. **Start Hardhat node** (in a separate terminal):
   ```bash
   cd ..
   npx hardhat node
   ```

2. **Configure MetaMask**:
   - Network Name: Hardhat Local
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency Symbol: ETH

3. **Import Hardhat Account**:
   - Copy a private key from the Hardhat node output
   - Import it into MetaMask

4. **Connect Wallet**:
   - Click "Connect Wallet" in the dashboard header
   - Approve the connection in MetaMask

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── Header.jsx           # Header with wallet connection
│   │   ├── StatCards.jsx        # Dashboard metric cards
│   │   ├── FarmMap.jsx          # Leaflet map with farm plots
│   │   └── PlotTelemetry.jsx    # NDVI and flood gauges
│   ├── utils/
│   │   └── web3.js              # Ethers.js v6 utilities
│   ├── App.jsx                  # Main application component
│   ├── main.jsx                 # React entry point
│   └── index.css                # Tailwind CSS imports
├── index.html                   # HTML entry point
├── vite.config.js               # Vite configuration
├── tailwind.config.js           # Tailwind configuration
├── postcss.config.js            # PostCSS configuration
└── package.json                 # Dependencies
```

## 🗺️ Map Features

- **Base Layer**: OpenStreetMap tiles
- **Farm Plots**: Polygon overlays with color-coded status
- **Interactive Popups**: Click plots to see farmer details
- **Legend**: Active (green) and At-Risk (orange) indicators

### Adding Custom GeoJSON

To add your own farm boundaries:

1. Open `src/components/FarmMap.jsx`
2. Modify the `farmPlots` array with your coordinates:

```javascript
const farmPlots = [
  {
    id: 1,
    name: 'Your Farm Name',
    farmer: 'Farmer Name',
    coordinates: [
      [lat1, lon1],
      [lat2, lon2],
      [lat3, lon3],
      [lat4, lon4],
    ],
    status: 'active', // or 'at-risk'
    color: '#10b981',
  },
];
```

## 📊 Telemetry Data

Currently using simulated data. To integrate real satellite data:

1. **NDVI (Vegetation Health)**:
   - Source: Sentinel-2 satellite
   - Range: 0.0 (no vegetation) to 1.0 (healthy)
   - Update `PlotTelemetry.jsx` with API integration

2. **SAR Flood Inundation**:
   - Source: Sentinel-1 SAR
   - Range: 0.0 (no flood) to 1.0 (fully inundated)
   - Triggers insurance claims above threshold

## 🔌 Smart Contract Integration

The Web3 utilities are ready for contract integration:

```javascript
import { getContract, formatEther } from './utils/web3';

// Example: Connect to insurance contract
const contract = getContract(
  CONTRACT_ADDRESS,
  CONTRACT_ABI,
  signer
);

// Example: Get escrow balance
const balance = await contract.getEscrowBalance();
console.log(formatEther(balance));
```

## 🚨 Important Notes

- ⚠️ **Leaflet CSS Import**: The `import 'leaflet/dist/leaflet.css'` in `FarmMap.jsx` is critical - removing it will break map tiles
- ⚠️ **Ethers.js v6**: Uses `BrowserProvider`, NOT `Web3Provider` (v5 syntax)
- ⚠️ **Local Development**: Web3 features require a running Hardhat node

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## 🐛 Troubleshooting

### Map tiles not loading
- Ensure `leaflet/dist/leaflet.css` is imported
- Check browser console for CORS errors
- Verify internet connection for tile downloads

### Web3 connection fails
- Ensure Hardhat node is running on port 8545
- Check MetaMask is connected to Hardhat network
- Verify MetaMask has imported a Hardhat account

### Build errors
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Clear Vite cache: `rm -rf node_modules/.vite`

## 🤝 Contributing

This is a hackathon project for MST Blockchain. Feel free to extend and customize!

## 📄 License

MIT License - Built for educational and hackathon purposes.

---

**Built with ❤️ for AgriTrust AI Hackathon**
