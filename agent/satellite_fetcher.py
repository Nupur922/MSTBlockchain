"""
satellite_fetcher.py
====================
Developer 2 | Day 1 Task — AgriTrust AI  [LIVE API VERSION]
NEWRRO AI Satellite Remote Sensing Engine

Connects to real Copernicus Data Space Sentinel Hub APIs:
  - OAuth2 Client Credentials token flow
  - Sentinel-2 L2A Statistics API (B04 RED + B08 NIR → NDVI)
  - Sentinel-1 GRD Statistics API (VV backscatter → flood detection)

Setup:
  1. Register FREE at https://dataspace.copernicus.eu
  2. Dashboard → User Settings → OAuth Clients → Create New
  3. Copy client_id and client_secret into agent/config/.env

Author : Developer 2 — NEWRRO AI & Satellite Oracle Lead
Project: AgriTrust AI — MST Blockchain Buildathon
"""

from __future__ import annotations

import datetime
import logging
import os
import random
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional

import requests
from dotenv import load_dotenv
from oauthlib.oauth2 import BackendApplicationClient
from requests_oauthlib import OAuth2Session

# ---------------------------------------------------------------------------
# Load .env
# ---------------------------------------------------------------------------
_ENV_PATH = Path(__file__).parent / "config" / ".env"
load_dotenv(dotenv_path=_ENV_PATH)

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    level=logging.INFO,
)
logger = logging.getLogger("satellite_fetcher")

# ---------------------------------------------------------------------------
# API constants (Copernicus Data Space)
# ---------------------------------------------------------------------------
TOKEN_URL     = os.getenv(
    "COPERNICUS_TOKEN_URL",
    "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token",
)
STATISTICS_URL = os.getenv(
    "SENTINEL_HUB_URL",
    "https://sh.dataspace.copernicus.eu/api/v1/statistics",
)

# ---------------------------------------------------------------------------
# Data containers
# ---------------------------------------------------------------------------

@dataclass
class Sentinel2BandData:
    """Multispectral band values returned by Sentinel-2 fetch."""
    plot_id: str
    timestamp: float
    nir_band8: float            # NIR (B08) mean reflectance, 0.0–1.0
    red_band4: float            # RED (B04) mean reflectance, 0.0–1.0
    ndvi: float                 # Pre-computed NDVI = (NIR-RED)/(NIR+RED)
    cloud_coverage_pct: float   # % cloudy pixels in the polygon
    data_source: str            # "live" | "simulated"
    acquisition_date: str       # ISO date of the acquisition
    raw_response: dict[str, Any] = field(default_factory=dict)


@dataclass
class Sentinel1SARData:
    """SAR backscatter values returned by Sentinel-1 fetch."""
    plot_id: str
    timestamp: float
    backscatter_db_series: list[float]  # dB values per acquisition
    acquisition_dates: list[str]        # ISO date strings
    mean_backscatter_db: float
    data_source: str                    # "live" | "simulated"
    raw_response: dict[str, Any] = field(default_factory=dict)


# ---------------------------------------------------------------------------
# Copernicus OAuth2 Session
# ---------------------------------------------------------------------------

class CopernicusSession:
    """
    Manages an OAuth2 session to the Copernicus Data Space Sentinel Hub.

    Uses the Client Credentials grant — no user interaction needed.
    Tokens are auto-refreshed when they expire (~1 hour validity).

    Usage:
        session = CopernicusSession()
        response = session.post(STATISTICS_URL, json=payload)
    """

    def __init__(
        self,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
    ):
        self.client_id     = client_id     or os.getenv("COPERNICUS_CLIENT_ID", "")
        self.client_secret = client_secret or os.getenv("COPERNICUS_CLIENT_SECRET", "")
        self._session: Optional[OAuth2Session] = None

    @property
    def is_configured(self) -> bool:
        """True if real credentials are present."""
        return bool(
            self.client_id
            and self.client_secret
            and self.client_id != "your_client_id_here"
        )

    def _build_session(self) -> OAuth2Session:
        """Create and authenticate a new OAuth2Session."""
        client  = BackendApplicationClient(client_id=self.client_id)
        session = OAuth2Session(client=client)

        # Compliance hook — ensures server errors surface correctly
        def _compliance_hook(response: requests.Response) -> requests.Response:
            response.raise_for_status()
            return response

        session.register_compliance_hook("access_token_response", _compliance_hook)

        token = session.fetch_token(
            token_url=TOKEN_URL,
            client_id=self.client_id,
            client_secret=self.client_secret,
            include_client_id=True,
        )
        logger.info(
            "🔑  Copernicus OAuth2 token acquired (expires in %ds)",
            token.get("expires_in", 3600),
        )
        return session

    def post(self, url: str, **kwargs) -> requests.Response:
        """
        Make an authenticated POST request, refreshing the token if needed.
        """
        if self._session is None:
            self._session = self._build_session()
        try:
            return self._session.post(url, **kwargs)
        except Exception:
            # Token may have expired — rebuild once
            self._session = self._build_session()
            return self._session.post(url, **kwargs)


# ---------------------------------------------------------------------------
# Evalscripts (JavaScript executed server-side on Copernicus)
# ---------------------------------------------------------------------------

# Sentinel-2: returns NDVI + individual B04/B08 + SCL for cloud masking
EVALSCRIPT_S2_NDVI = """
//VERSION=3
function setup() {
  return {
    input: [{
      bands: ["B04", "B08", "SCL", "dataMask"]
    }],
    output: [
      { id: "ndvi",    bands: 1, sampleType: "FLOAT32" },
      { id: "red",     bands: 1, sampleType: "FLOAT32" },
      { id: "nir",     bands: 1, sampleType: "FLOAT32" },
      { id: "dataMask",bands: 1 }
    ]
  }
}

function evaluatePixel(s) {
  let ndvi = (s.B08 + s.B04 === 0) ? 0.0 : (s.B08 - s.B04) / (s.B08 + s.B04);

  // Mask: exclude water (SCL=6), cloud shadow (SCL=3), cloud (SCL=8,9,10)
  let cloudFree = (s.SCL !== 3 && s.SCL !== 6 && s.SCL !== 8 && s.SCL !== 9 && s.SCL !== 10) ? 1 : 0;

  return {
    ndvi:     [ndvi],
    red:      [s.B04],
    nir:      [s.B08],
    dataMask: [s.dataMask * cloudFree]
  };
}
"""

# Sentinel-1: returns VV backscatter in dB (10 * log10(VV))
EVALSCRIPT_S1_SAR = """
//VERSION=3
function setup() {
  return {
    input: [{
      bands: ["VV", "dataMask"]
    }],
    output: [
      { id: "vv_db",   bands: 1, sampleType: "FLOAT32" },
      { id: "dataMask",bands: 1 }
    ]
  }
}

function evaluatePixel(s) {
  // Convert linear VV to dB — negative = water/flood
  let vv_db = (s.VV > 0) ? 10.0 * Math.log10(s.VV) : -30.0;
  return {
    vv_db:    [vv_db],
    dataMask: [s.dataMask]
  };
}
"""


# ---------------------------------------------------------------------------
# Sentinel-2 Optical Client
# ---------------------------------------------------------------------------

class Sentinel2Client:
    """
    Fetches real Sentinel-2 L2A NDVI, NIR (B08), and RED (B04) band statistics
    from the Copernicus Sentinel Hub Statistics API.

    Falls back to realistic simulation when credentials are missing or the
    API is unreachable (e.g., during hackathon demo offline mode).
    """

    TIMEOUT = 30  # seconds

    def __init__(self, session: CopernicusSession):
        self._session = session

    def _make_date_range(self, days_back: int = 30) -> tuple[str, str]:
        """Return (from_date, to_date) ISO strings for a recent date window."""
        to_dt   = datetime.datetime.utcnow()
        from_dt = to_dt - datetime.timedelta(days=days_back)
        return from_dt.strftime("%Y-%m-%dT00:00:00Z"), to_dt.strftime("%Y-%m-%dT23:59:59Z")

    def _build_geometry_bounds(self, geojson_polygon: dict) -> dict:
        """
        Build the 'bounds' section of the Statistics API request.
        Supports both GeoJSON Feature and bare Geometry objects.
        Uses WGS84 (EPSG:4326) — lon/lat.
        """
        geometry = (
            geojson_polygon.get("geometry", geojson_polygon)
            if geojson_polygon.get("type") == "Feature"
            else geojson_polygon
        )
        return {
            "geometry": geometry,
        }

    def fetch(
        self,
        geojson_polygon: dict,
        plot_id: str = "PLOT_001",
        days_back: int = 30,
    ) -> Sentinel2BandData:
        """
        Fetch real Sentinel-2 NDVI, NIR, and RED band statistics for a farm polygon.

        Parameters
        ----------
        geojson_polygon : dict
            GeoJSON Polygon (lon/lat, WGS84) of the farm boundary.
        plot_id : str
            Farm plot identifier for logging.
        days_back : int
            Number of days back from today to search for imagery.

        Returns
        -------
        Sentinel2BandData with real reflectance values, or simulated fallback.
        """
        if not self._session.is_configured:
            logger.warning(
                "⚠️  No Copernicus credentials in .env — using simulation for plot %s", plot_id
            )
            return self._simulate(plot_id)

        from_date, to_date = self._make_date_range(days_back)
        logger.info(
            "🛰️  Sentinel-2: Fetching NDVI for plot %s | %s → %s",
            plot_id, from_date[:10], to_date[:10],
        )

        payload = {
            "input": {
                "bounds": self._build_geometry_bounds(geojson_polygon),
                "data": [
                    {
                        "type": "sentinel-2-l2a",
                        "dataFilter": {"mosaickingOrder": "leastCC"},
                    }
                ],
            },
            "aggregation": {
                "timeRange": {"from": from_date, "to": to_date},
                "aggregationInterval": {"of": "P10D"},
                "evalscript": EVALSCRIPT_S2_NDVI,
                "resx": 10,
                "resy": 10,
            },
        }

        try:
            resp = self._session.post(
                STATISTICS_URL,
                json=payload,
                headers={"Content-Type": "application/json", "Accept": "application/json"},
                timeout=self.TIMEOUT,
            )
            resp.raise_for_status()
            data = resp.json()

            # Find the most recent interval with valid data
            acquisitions = [
                acq for acq in data.get("data", [])
                if acq.get("outputs", {}).get("ndvi", {}).get("bands", {}).get("B0", {}).get("stats", {}).get("sampleCount", 0) > 0
            ]
            if not acquisitions:
                raise ValueError("No cloud-free Sentinel-2 acquisitions found in date range.")

            latest = acquisitions[-1]
            acq_date = latest.get("interval", {}).get("from", "N/A")[:10]

            def _mean(output_id: str) -> float:
                return (
                    latest.get("outputs", {})
                    .get(output_id, {})
                    .get("bands", {})
                    .get("B0", {})
                    .get("stats", {})
                    .get("mean", 0.0)
                )

            ndvi_val = float(_mean("ndvi"))
            red_val  = float(_mean("red"))
            nir_val  = float(_mean("nir"))

            # Estimate cloud coverage from noDataCount / sampleCount
            stats_obj = latest.get("outputs", {}).get("ndvi", {}).get("bands", {}).get("B0", {}).get("stats", {})
            sample_count = stats_obj.get("sampleCount", 1) or 1
            no_data      = stats_obj.get("noDataCount", 0)
            cloud_pct    = round(no_data / (sample_count + no_data) * 100, 1)

            logger.info(
                "✅  Sentinel-2 LIVE: NDVI=%.4f  RED=%.4f  NIR=%.4f  Cloud=%.1f%%  Date=%s",
                ndvi_val, red_val, nir_val, cloud_pct, acq_date,
            )
            return Sentinel2BandData(
                plot_id=plot_id,
                timestamp=time.time(),
                nir_band8=nir_val,
                red_band4=red_val,
                ndvi=ndvi_val,
                cloud_coverage_pct=cloud_pct,
                data_source="live",
                acquisition_date=acq_date,
                raw_response=data,
            )

        except Exception as exc:
            logger.warning("⚠️  Sentinel-2 API error (%s). Falling back to simulation.", exc)
            return self._simulate(plot_id)

    def _simulate(self, plot_id: str, scenario: str = "normal") -> Sentinel2BandData:
        """Realistic simulated Sentinel-2 data for offline demo."""
        if scenario == "flood":
            nir, red = round(random.uniform(0.08, 0.15), 4), round(random.uniform(0.10, 0.18), 4)
        else:
            nir, red = round(random.uniform(0.40, 0.55), 4), round(random.uniform(0.06, 0.12), 4)
        ndvi = round((nir - red) / (nir + red), 4) if (nir + red) > 0 else 0.0
        cloud = round(random.uniform(5.0, 25.0), 1)
        logger.info("🔬  Sentinel-2 SIM: NDVI=%.4f  RED=%.4f  NIR=%.4f  Cloud=%.1f%%", ndvi, red, nir, cloud)
        return Sentinel2BandData(
            plot_id=plot_id,
            timestamp=time.time(),
            nir_band8=nir,
            red_band4=red,
            ndvi=ndvi,
            cloud_coverage_pct=cloud,
            data_source="simulated",
            acquisition_date=datetime.date.today().isoformat(),
        )


# ---------------------------------------------------------------------------
# Sentinel-1 SAR Client
# ---------------------------------------------------------------------------

class Sentinel1SARClient:
    """
    Fetches real Sentinel-1 GRD VV backscatter dB time series from the
    Copernicus Sentinel Hub Statistics API.

    SAR penetrates monsoon cloud cover — critical for Bihar/Assam flood
    sensing when Sentinel-2 optical imagery is completely blocked.

    Backscatter thresholds (Sentinel-1 IW VV, GAMMA0_TERRAIN corrected):
        > -5 dB   → Dry land / dense vegetation
        -5 to -15 → Transitional / partially wet soil
        < -15 dB  → Open water / standing floodwater
    """

    TIMEOUT = 30
    FLOOD_THRESHOLD_DB = -15.0

    def __init__(self, session: CopernicusSession):
        self._session = session

    def _make_date_range(self, days_back: int = 60) -> tuple[str, str]:
        to_dt   = datetime.datetime.utcnow()
        from_dt = to_dt - datetime.timedelta(days=days_back)
        return from_dt.strftime("%Y-%m-%dT00:00:00Z"), to_dt.strftime("%Y-%m-%dT23:59:59Z")

    def fetch(
        self,
        geojson_polygon: dict,
        plot_id: str = "PLOT_001",
        days_back: int = 60,
    ) -> Sentinel1SARData:
        """
        Fetch real Sentinel-1 VV backscatter (in dB) time series.

        Parameters
        ----------
        geojson_polygon : dict
            GeoJSON Polygon (lon/lat, WGS84).
        days_back : int
            Days back from today to search. Sentinel-1 revisits every 6 days.

        Returns
        -------
        Sentinel1SARData with backscatter dB series and acquisition dates.
        """
        if not self._session.is_configured:
            logger.warning(
                "⚠️  No Copernicus credentials in .env — using SAR simulation for plot %s", plot_id
            )
            return self._simulate(plot_id)

        from_date, to_date = self._make_date_range(days_back)
        logger.info(
            "📡  Sentinel-1 SAR: Fetching VV backscatter for plot %s | %s → %s",
            plot_id, from_date[:10], to_date[:10],
        )

        payload = {
            "input": {
                "bounds": {
                    "geometry": (
                        geojson_polygon.get("geometry", geojson_polygon)
                        if geojson_polygon.get("type") == "Feature"
                        else geojson_polygon
                    ),
                },
                "data": [
                    {
                        "type": "sentinel-1-grd",
                        "dataFilter": {
                            "resolution": "HIGH",
                            "acquisitionMode": "IW",
                            "polarization": "DV",
                        },
                        "processing": {
                            "backCoeff": "GAMMA0_TERRAIN",
                            "orthorectify": True,
                            "demInstance": "MAPZEN",
                            "speckleFilter": {
                                "type": "LEE",
                                "windowSizeX": 5,
                                "windowSizeY": 5,
                            },
                        },
                    }
                ],
            },
            "aggregation": {
                "timeRange": {"from": from_date, "to": to_date},
                "aggregationInterval": {"of": "P6D"},  # ~Sentinel-1 revisit
                "evalscript": EVALSCRIPT_S1_SAR,
                "resx": 10,
                "resy": 10,
            },
        }

        try:
            resp = self._session.post(
                STATISTICS_URL,
                json=payload,
                headers={"Content-Type": "application/json", "Accept": "application/json"},
                timeout=self.TIMEOUT,
            )
            resp.raise_for_status()
            data = resp.json()

            db_series = []
            dates     = []

            for acq in data.get("data", []):
                stats = (
                    acq.get("outputs", {})
                    .get("vv_db", {})
                    .get("bands", {})
                    .get("B0", {})
                    .get("stats", {})
                )
                mean_db = stats.get("mean")
                if mean_db is not None and stats.get("sampleCount", 0) > 0:
                    db_series.append(round(float(mean_db), 3))
                    dates.append(acq.get("interval", {}).get("from", "N/A")[:10])

            if not db_series:
                raise ValueError("No valid SAR acquisitions returned from API.")

            mean_db = round(sum(db_series) / len(db_series), 3)
            flooded = sum(1 for db in db_series if db < self.FLOOD_THRESHOLD_DB)
            logger.info(
                "✅  Sentinel-1 SAR LIVE: %d acquisitions | Mean=%.2f dB | "
                "%d flooded (<%.0f dB) | Dates=%s→%s",
                len(db_series), mean_db, flooded, self.FLOOD_THRESHOLD_DB,
                dates[0], dates[-1],
            )
            return Sentinel1SARData(
                plot_id=plot_id,
                timestamp=time.time(),
                backscatter_db_series=db_series,
                acquisition_dates=dates,
                mean_backscatter_db=mean_db,
                data_source="live",
                raw_response=data,
            )

        except Exception as exc:
            logger.warning("⚠️  Sentinel-1 SAR API error (%s). Falling back to simulation.", exc)
            return self._simulate(plot_id)

    def _simulate(self, plot_id: str, scenario: str = "normal") -> Sentinel1SARData:
        """Realistic simulated Sentinel-1 SAR backscatter series."""
        base = datetime.date.today() - datetime.timedelta(days=60)
        dates = [(base + datetime.timedelta(days=i * 6)).isoformat() for i in range(10)]

        if scenario == "flood":
            # Progressive flooding pattern then recovery
            series = [-8.5, -9.2, -16.1, -18.4, -19.0, -17.8, -16.5, -12.3, -9.1, -7.4]
        elif scenario == "severe_flood":
            series = [-7.1, -8.3, -18.2, -20.5, -22.1, -21.8, -19.4, -17.2, -14.8, -9.0]
        else:
            series = [round(random.uniform(-8.0, -4.0), 2) for _ in range(10)]

        mean_db = round(sum(series) / len(series), 2)
        logger.info(
            "🔬  Sentinel-1 SAR SIM (%s): %d pts | Mean=%.2f dB",
            scenario, len(series), mean_db,
        )
        return Sentinel1SARData(
            plot_id=plot_id,
            timestamp=time.time(),
            backscatter_db_series=series,
            acquisition_dates=dates,
            mean_backscatter_db=mean_db,
            data_source="simulated",
        )


# ---------------------------------------------------------------------------
# High-level SatelliteFetcher facade
# ---------------------------------------------------------------------------

class SatelliteFetcher:
    """
    Unified facade for all satellite data acquisition.

    Automatically uses real Copernicus APIs when credentials are present
    in agent/config/.env, falling back to realistic simulation otherwise.

    Setup:
        cp agent/config/.env.example agent/config/.env
        # Fill COPERNICUS_CLIENT_ID and COPERNICUS_CLIENT_SECRET

    Usage:
        fetcher = SatelliteFetcher()
        optical  = fetcher.fetch_sentinel2_optical(geojson_polygon)
        sar_data = fetcher.fetch_sentinel1_sar(geojson_polygon)
    """

    def __init__(
        self,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
    ):
        self._session   = CopernicusSession(client_id=client_id, client_secret=client_secret)
        self._s2_client = Sentinel2Client(self._session)
        self._s1_client = Sentinel1SARClient(self._session)

        mode = "🌍 LIVE (Copernicus API)" if self._session.is_configured else "🔬 SIMULATED (no credentials)"
        logger.info("🛰️  SatelliteFetcher initialized — Mode: %s", mode)

    def fetch_sentinel2_optical(
        self,
        geojson_polygon: dict,
        plot_id: str = "PLOT_001",
        days_back: int = 30,
    ) -> Sentinel2BandData:
        """
        Fetch Sentinel-2 L2A NIR (B08), RED (B04), and NDVI statistics.

        Uses real Copernicus API if credentials present, simulation otherwise.
        Cloud-affected pixels automatically masked using SCL band.
        """
        return self._s2_client.fetch(geojson_polygon, plot_id, days_back)

    def fetch_sentinel1_sar(
        self,
        geojson_polygon: dict,
        plot_id: str = "PLOT_001",
        days_back: int = 60,
        scenario: str = "normal",
    ) -> Sentinel1SARData:
        """
        Fetch Sentinel-1 GRD VV backscatter dB time series.

        SAR penetrates storm clouds — works during active monsoon flooding
        when Sentinel-2 optical imagery is completely obscured.

        scenario : only used for simulation fallback ("normal" | "flood" | "severe_flood")
        """
        result = self._s1_client.fetch(geojson_polygon, plot_id, days_back)
        if result.data_source == "simulated" and scenario != "normal":
            result = self._s1_client._simulate(plot_id, scenario=scenario)
        return result

    def fetch_both(
        self,
        geojson_polygon: dict,
        plot_id: str = "PLOT_001",
        sar_scenario: str = "normal",
    ) -> tuple[Sentinel2BandData, Sentinel1SARData]:
        """Fetch Sentinel-2 and Sentinel-1 data in one call."""
        optical  = self.fetch_sentinel2_optical(geojson_polygon, plot_id)
        sar_data = self.fetch_sentinel1_sar(geojson_polygon, plot_id, scenario=sar_scenario)
        return optical, sar_data

    @property
    def is_live(self) -> bool:
        """True if connected to real Copernicus APIs."""
        return self._session.is_configured


# ---------------------------------------------------------------------------
# Quick smoke-test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    # Sample Darbhanga, Bihar farm polygon (WGS84 lon/lat)
    SAMPLE_POLYGON = {
        "type": "Polygon",
        "coordinates": [
            [
                [85.8977, 26.1234],
                [85.9123, 26.1234],
                [85.9123, 26.1089],
                [85.8977, 26.1089],
                [85.8977, 26.1234],
            ]
        ],
    }

    fetcher = SatelliteFetcher()
    print(f"\n  Live API: {fetcher.is_live}")

    print("\n--- Sentinel-2 Optical (NDVI) ---")
    optical = fetcher.fetch_sentinel2_optical(SAMPLE_POLYGON, plot_id="BIHAR_01")
    print(f"  NIR (B08)   : {optical.nir_band8:.4f}")
    print(f"  RED (B04)   : {optical.red_band4:.4f}")
    print(f"  NDVI        : {optical.ndvi:.4f}")
    print(f"  Cloud Cover : {optical.cloud_coverage_pct:.1f}%")
    print(f"  Acquired    : {optical.acquisition_date}")
    print(f"  Source      : {optical.data_source}")

    print("\n--- Sentinel-1 SAR (Backscatter) ---")
    sar = fetcher.fetch_sentinel1_sar(SAMPLE_POLYGON, plot_id="BIHAR_01")
    print(f"  Series   : {sar.backscatter_db_series}")
    print(f"  Mean dB  : {sar.mean_backscatter_db}")
    print(f"  Dates    : {sar.acquisition_dates[:3]}…")
    print(f"  Source   : {sar.data_source}")
