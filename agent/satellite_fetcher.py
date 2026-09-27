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
import math
import os
import random
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional

import requests
from dotenv import load_dotenv
try:
    from oauthlib.oauth2 import BackendApplicationClient
    from requests_oauthlib import OAuth2Session
except ImportError:
    BackendApplicationClient = None
    OAuth2Session = None

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
                        # NOTE: resx/resy belong to input.data[], NOT aggregation.
                        # Copernicus ignores them under "aggregation" and then
                        # fails with "Pixel size of 2840.83 meters per pixel
                        # exceeds the limit 1500.00" (it renders 1 px across the
                        # whole field). Declared here the statistics call returns
                        # HTTP 200 with real band statistics.
                        "resx": 10,
                        "resy": 10,
                    }
                ],
            },
            "aggregation": {
                "timeRange": {"from": from_date, "to": to_date},
                "aggregationInterval": {"of": "P10D"},
                "evalscript": EVALSCRIPT_S2_NDVI,
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

            # The Copernicus statistics endpoint can return nulls (→ NaN) when a
            # tile is fully clouded/nodata. NaN would poison the consensus math
            # (NDVI=nan → damage=nan), so treat it as a failed fetch.
            if not all(math.isfinite(v) for v in (ndvi_val, red_val, nir_val)):
                raise ValueError(
                    f"Non-finite Sentinel-2 stats (NDVI={ndvi_val}, RED={red_val}, NIR={nir_val})"
                )
            if not -1.0 <= ndvi_val <= 1.0:
                raise ValueError(f"Sentinel-2 NDVI out of range: {ndvi_val}")

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
                        # resx/resy must be here (input.data[]), not under
                        # "aggregation" — see the Sentinel-2 NDVI payload note.
                        "resx": 10,
                        "resy": 10,
                        "processing": {
                            "backCoeff": "GAMMA0_TERRAIN",
                            "orthorectify": True,
                            # MAPZEN was rejected by the CDSE statistics API with
                            # "DEM instance MAPZEN is not supported here!" (HTTP 400),
                            # which silently forced every SAR reading onto the
                            # simulated fallback. COPERNICUS_30 is the supported
                            # DEM and keeps full orthorectified terrain correction.
                            "demInstance": "COPERNICUS_30",
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
                    value = float(mean_db)
                    if not math.isfinite(value):
                        continue  # nodata tile → skip rather than poison the series
                    db_series.append(round(value, 3))
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
# Sentinel-2 SWIR Band Data (for NDWI drought sensing)
# ---------------------------------------------------------------------------

@dataclass
class Sentinel2SWIRData:
    """Green (B03) and SWIR (B11) band values for NDWI drought sensing."""
    plot_id: str
    timestamp: float
    green_band3: float          # Green (B03) reflectance, 0.0–1.0
    swir_band11: float          # SWIR (B11) reflectance, 0.0–1.0
    ndwi: float                 # Pre-computed NDWI = (GREEN-SWIR)/(GREEN+SWIR)
    data_source: str            # "live" | "simulated"
    acquisition_date: str
    raw_response: dict[str, Any] = field(default_factory=dict)


# Evalscript: Sentinel-2 B03 Green + B11 SWIR for NDWI drought index
EVALSCRIPT_S2_SWIR = """
//VERSION=3
function setup() {
  return {
    input: [{
      bands: ["B03", "B11", "SCL", "dataMask"]
    }],
    output: [
      { id: "green",   bands: 1, sampleType: "FLOAT32" },
      { id: "swir",    bands: 1, sampleType: "FLOAT32" },
      { id: "ndwi",    bands: 1, sampleType: "FLOAT32" },
      { id: "dataMask",bands: 1 }
    ]
  }
}

function evaluatePixel(s) {
  // NDWI = (GREEN - SWIR) / (GREEN + SWIR)
  // Negative NDWI = dry/stressed vegetation, more negative = severe drought
  let ndwi = (s.B03 + s.B11 === 0) ? 0.0 : (s.B03 - s.B11) / (s.B03 + s.B11);

  // Exclude clouds and water pixels
  let cloudFree = (s.SCL !== 3 && s.SCL !== 8 && s.SCL !== 9 && s.SCL !== 10) ? 1 : 0;

  return {
    green:    [s.B03],
    swir:     [s.B11],
    ndwi:     [ndwi],
    dataMask: [s.dataMask * cloudFree]
  };
}
"""


class Sentinel2SWIRClient:
    """
    Fetches Sentinel-2 Green (B03) and SWIR (B11) bands for NDWI drought sensing.

    NDWI (Normalized Difference Water Index) formula:
        NDWI = (GREEN - SWIR) / (GREEN + SWIR)

    Interpretation:
        NDWI >  0.1  → Moist / well-irrigated soil
        NDWI  0 to 0.1 → Normal
        NDWI -0.1 to -0.35 → Soil moisture stress
        NDWI < -0.35 → FLASH DROUGHT / severe desiccation
    """

    TIMEOUT = 30

    def __init__(self, session: CopernicusSession):
        self._session = session

    def _make_date_range(self, days_back: int = 30) -> tuple[str, str]:
        to_dt   = datetime.datetime.utcnow()
        from_dt = to_dt - datetime.timedelta(days=days_back)
        return from_dt.strftime("%Y-%m-%dT00:00:00Z"), to_dt.strftime("%Y-%m-%dT23:59:59Z")

    def fetch(
        self,
        geojson_polygon: dict,
        plot_id: str = "PLOT_001",
        days_back: int = 30,
    ) -> Sentinel2SWIRData:
        """Fetch real Sentinel-2 Green (B03) and SWIR (B11) band stats for NDWI."""
        if not self._session.is_configured:
            return self._simulate(plot_id)

        from_date, to_date = self._make_date_range(days_back)
        logger.info("🌵  Sentinel-2 SWIR: Fetching NDWI drought index for plot %s …", plot_id)

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
                        "type": "sentinel-2-l2a",
                        "dataFilter": {"mosaickingOrder": "leastCC"},
                        # B11 is native 20 m — must be declared on input.data[]
                        # (not aggregation) or the API 400s. See the Sentinel-2
                        # NDVI payload note above.
                        "resx": 20,
                        "resy": 20,
                    }
                ],
            },
            "aggregation": {
                "timeRange": {"from": from_date, "to": to_date},
                "aggregationInterval": {"of": "P10D"},
                "evalscript": EVALSCRIPT_S2_SWIR,
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

            acquisitions = [
                acq for acq in data.get("data", [])
                if acq.get("outputs", {}).get("ndwi", {}).get("bands", {}).get("B0", {}).get("stats", {}).get("sampleCount", 0) > 0
            ]
            if not acquisitions:
                raise ValueError("No valid SWIR acquisitions in date range.")

            latest   = acquisitions[-1]
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

            green_val = float(_mean("green"))
            swir_val  = float(_mean("swir"))
            ndwi_val  = float(_mean("ndwi"))

            logger.info(
                "✅  Sentinel-2 SWIR LIVE: GREEN=%.4f  SWIR=%.4f  NDWI=%.4f  Date=%s%s",
                green_val, swir_val, ndwi_val, acq_date,
                "  🌵 DROUGHT" if ndwi_val < -0.35 else "",
            )
            return Sentinel2SWIRData(
                plot_id=plot_id,
                timestamp=time.time(),
                green_band3=green_val,
                swir_band11=swir_val,
                ndwi=ndwi_val,
                data_source="live",
                acquisition_date=acq_date,
                raw_response=data,
            )

        except Exception as exc:
            logger.warning("⚠️  Sentinel-2 SWIR API error (%s). Falling back to simulation.", exc)
            return self._simulate(plot_id)

    def _simulate(self, plot_id: str, scenario: str = "normal") -> Sentinel2SWIRData:
        if scenario == "drought":
            green = round(random.uniform(0.05, 0.10), 4)
            swir  = round(random.uniform(0.28, 0.40), 4)
        else:
            green = round(random.uniform(0.08, 0.15), 4)
            swir  = round(random.uniform(0.10, 0.20), 4)
        ndwi = round((green - swir) / (green + swir), 4) if (green + swir) > 0 else 0.0
        logger.info("🔬  Sentinel-2 SWIR SIM (%s): GREEN=%.4f SWIR=%.4f NDWI=%.4f", scenario, green, swir, ndwi)
        return Sentinel2SWIRData(
            plot_id=plot_id,
            timestamp=time.time(),
            green_band3=green,
            swir_band11=swir,
            ndwi=ndwi,
            data_source="simulated",
            acquisition_date=datetime.datetime.utcnow().strftime("%Y-%m-%d"),
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
        self._session    = CopernicusSession(client_id=client_id, client_secret=client_secret)
        self._s2_client  = Sentinel2Client(self._session)
        self._s1_client  = Sentinel1SARClient(self._session)
        self._swir_client = Sentinel2SWIRClient(self._session)

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

    def fetch_sentinel2_swir(
        self,
        geojson_polygon: dict,
        plot_id: str = "PLOT_001",
        days_back: int = 30,
        scenario: str = "normal",
    ) -> Sentinel2SWIRData:
        """
        Fetch Sentinel-2 Green (B03) and SWIR (B11) bands for NDWI drought sensing.

        NDWI = (GREEN - SWIR) / (GREEN + SWIR)
        Values below -0.35 indicate Flash Drought / severe soil desiccation.

        scenario : used for simulation fallback ("normal" | "drought")
        """
        result = self._swir_client.fetch(geojson_polygon, plot_id, days_back)
        if result.data_source == "simulated" and scenario == "drought":
            result = self._swir_client._simulate(plot_id, scenario="drought")
        return result

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
