"""
document_parser.py
==================
Developer 2 | AgriTrust AI  [V2 Feature — Regional Document & Language Engine]
Automated Land Document Extractor & Regional Language Detection

Extracts uploaded government land records (PDF, text, JSON, images/OCR text)
and determines the farmer's state/region and primary regional dialect for
automated Twilio voice calls:
  - Assam (Majuli / Brahmaputra / Dharitree Patta)    → Assamese (assamese)
  - Bihar (Darbhanga / Kosi / Bihar Bhumi Jamabandi)   → Bhojpuri (bhojpuri)
  - Punjab (Ludhiana / PLRS Fard Jamabandi)           → Punjabi  (punjabi -> fallback hindi)
  - Hindi Belt (UP / MP / Rajasthan Bhulekh Khasra)   → Hindi    (hindi)

Author : Developer 2 — NEWRRO AI & Satellite Oracle Lead
Project: AgriTrust AI — MST Blockchain Buildathon
"""

from __future__ import annotations

import json
import logging
import os
import re
from pathlib import Path
from typing import Any, Optional, Union

logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    level=logging.INFO,
)
logger = logging.getLogger("document_parser")

# ---------------------------------------------------------------------------
# Regional Keyword & Geo-Coordinates Rules
# ---------------------------------------------------------------------------

REGION_RULES: dict[str, dict[str, Any]] = {
    "assamese": {
        "region_name": "Assam",
        "keywords": [
            "assam", "majuli", "brahmaputra", "guwahati", "kamrup", "jorhat",
            "dibrugarh", "nagaon", "barpeta", "dhemaji", "lakhimpur", "golaghat",
            "sonitpur", "tezpur", "cachar", "silchar", "dharitree", "chitha",
            "patta", "dag no", "mouza", "bigha", "katha", "lessa", "lat mandal",
            "circle officer assam", "disaster management department assam"
        ],
        # Longitude [min, max], Latitude [min, max]
        "bbox": {"lon": (89.5, 96.0), "lat": (24.0, 28.5)},
    },
    "bhojpuri": {
        "region_name": "Bihar (Purvanchal)",
        "keywords": [
            "bihar", "darbhanga", "kosi", "madhubani", "muzaffarpur", "patna",
            "saharsa", "samastipur", "purnia", "bhagalpur", "gaya", "saran",
            "chapra", "siwan", "gopalganj", "vaishali", "bihar bhumi", "jamabandi",
            "khatian", "dakhil kharij", "bhu-naksha", "anchal", "halka", "khesra",
            "khasra bihar", "shuddh patra", "rajaswa evm bhumi sudhar"
        ],
        "bbox": {"lon": (83.3, 88.3), "lat": (24.3, 27.8)},
    },
    "punjabi": {
        "region_name": "Punjab",
        "keywords": [
            "punjab", "ludhiana", "amritsar", "jalandhar", "patiala", "bathinda",
            "ferozepur", "hoshiarpur", "plrs", "fard", "jamabandi punjab",
            "girdawari", "murabba", "killa", "kanal", "marla", "halqa patwari"
        ],
        "bbox": {"lon": (73.8, 77.0), "lat": (29.5, 32.5)},
    },
    "hindi": {
        "region_name": "Hindi Belt (UP/MP/Rajasthan/Haryana)",
        "keywords": [
            "uttar pradesh", "madhya pradesh", "rajasthan", "haryana", "uttarakhand",
            "jharkhand", "chhattisgarh", "bhulekh", "khasra", "khatauni", "gata",
            "bhu-abhilekh", "tehsildar", "lekhpal", "lucknow", "varanasi", "gorakhpur",
            "jaipur", "bhopal", "patwari"
        ],
        "bbox": {"lon": (74.0, 84.0), "lat": (21.0, 30.5)},
    },
}


# ---------------------------------------------------------------------------
# Document & Language Extractor Class
# ---------------------------------------------------------------------------

class DocumentLanguageExtractor:
    """
    Intelligent extractor that inspects uploaded farm documents,
    location descriptors, and GeoJSON coordinates to automatically
    select the appropriate regional voice language for Twilio calls.
    """

    def __init__(self):
        self.rules = REGION_RULES

    def extract_text_from_file(self, file_path: Union[str, Path]) -> str:
        """
        Extracts raw textual content from uploaded PDF, text, or JSON files.
        """
        path = Path(file_path)
        if not path.exists():
            logger.warning("Document file not found at path: %s", path)
            return ""

        suffix = path.suffix.lower()

        # Handle PDF files
        if suffix == ".pdf":
            try:
                import pypdf
                reader = pypdf.PdfReader(str(path))
                text_parts = [page.extract_text() or "" for page in reader.pages]
                full_text = "\n".join(text_parts).strip()
                logger.info("📄 Extracted %d chars from PDF: %s", len(full_text), path.name)
                return full_text
            except Exception as exc:
                logger.warning("⚠️ pypdf extraction failed for %s: %s. Using binary text scan.", path.name, exc)
                try:
                    raw_bytes = path.read_bytes()
                    # Extract readable ASCII/UTF strings from PDF binary stream
                    strings = re.findall(b"[a-zA-Z0-9 ,.-]{4,}", raw_bytes)
                    return " ".join([s.decode("latin-1", errors="ignore") for s in strings])
                except Exception:
                    return ""

        # Handle TXT, JSON, CSV, MD files
        try:
            return path.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            try:
                return path.read_text(encoding="latin-1", errors="ignore")
            except Exception as exc:
                logger.error("Failed to read document %s: %s", path, exc)
                return ""

    def detect_from_text(self, text: str) -> tuple[str, str, float]:
        """
        Scans textual content for regional keywords and returns:
          (language_code, region_name, confidence)
        """
        if not text:
            return ("hindi", "Unknown Region (Default)", 0.0)

        normalized = text.lower()
        scores: dict[str, int] = {lang: 0 for lang in self.rules}

        for lang, info in self.rules.items():
            for kw in info["keywords"]:
                # Count keyword matches
                matches = len(re.findall(r"\b" + re.escape(kw) + r"\b", normalized))
                scores[lang] += matches

        best_lang = max(scores, key=scores.get)
        best_score = scores[best_lang]

        if best_score > 0:
            confidence = min(1.0, 0.4 + (best_score * 0.15))
            region_name = self.rules[best_lang]["region_name"]
            logger.info(
                "🌐 Document Match → Language: %s (%s) | Confidence: %.2f | Keyword hits: %d",
                best_lang.upper(), region_name, confidence, best_score,
            )
            return (best_lang, region_name, confidence)

        return ("hindi", "Default Hindi Zone", 0.3)

    def detect_from_location(self, location_str: str) -> tuple[str, str, float]:
        """
        Infers language directly from location strings (e.g. 'Majuli, Assam', 'Darbhanga, Bihar').
        """
        if not location_str:
            return ("hindi", "Unknown", 0.0)

        loc = location_str.lower()

        # Assam check
        if any(w in loc for w in ["assam", "majuli", "brahmaputra", "guwahati", "jorhat"]):
            return ("assamese", "Assam", 0.95)

        # Bihar / Bhojpuri check
        if any(w in loc for w in ["bihar", "darbhanga", "kosi", "madhubani", "patna", "muzaffarpur"]):
            return ("bhojpuri", "Bihar", 0.95)

        # Punjab check
        if any(w in loc for w in ["punjab", "ludhiana", "amritsar", "jalandhar"]):
            return ("punjabi", "Punjab", 0.95)

        # Hindi Belt check
        if any(w in loc for w in ["uttar pradesh", "up", "madhya pradesh", "mp", "rajasthan", "haryana"]):
            return ("hindi", "Hindi Belt", 0.90)

        return ("hindi", "North India", 0.5)

    def detect_from_geojson(self, geojson_input: Union[dict, str]) -> tuple[str, str, float]:
        """
        Determines region based on GPS bounding boxes from GeoJSON coordinates.
        """
        try:
            data = geojson_input if isinstance(geojson_input, dict) else json.loads(geojson_input)
            coords = data.get("coordinates", [])
            while coords and isinstance(coords[0], list) and isinstance(coords[0][0], list):
                coords = coords[0]
            if not coords or not isinstance(coords[0], (int, float)):
                if isinstance(coords[0], list) and len(coords[0]) >= 2:
                    coords = coords[0]
                else:
                    return ("hindi", "Unknown Coordinates", 0.0)

            lon, lat = float(coords[0]), float(coords[1])

            for lang, info in self.rules.items():
                b = info["bbox"]
                if b["lon"][0] <= lon <= b["lon"][1] and b["lat"][0] <= lat <= b["lat"][1]:
                    logger.info("📍 GeoJSON GPS Point (%.4f, %.4f) matched %s → %s", lon, lat, info["region_name"], lang)
                    return (lang, info["region_name"], 0.85)

        except Exception as exc:
            logger.debug("GeoJSON parsing for language detection skipped: %s", exc)

        return ("hindi", "Default Coordinates", 0.3)

    def detect_language(
        self,
        document: Optional[Union[str, Path]] = None,
        location: Optional[str] = None,
        geojson: Optional[Union[dict, str]] = None,
    ) -> dict[str, Any]:
        """
        Master detection method combining document content, location string, and GeoJSON.

        Priority order:
          1. Uploaded document file or raw document text (if provided)
          2. Explicit location string (e.g., 'Majuli, Assam')
          3. GeoJSON polygon coordinates (centroid / bounding box)
          4. Default fallback: 'hindi'

        Returns
        -------
        dict with:
          {
             "language": "assamese" | "bhojpuri" | "punjabi" | "hindi" | "english",
             "region": str,
             "confidence": float,
             "source": "document" | "location" | "geojson" | "default"
          }
        """
        # 1. Check Document (File or Raw Text)
        if document:
            text = ""
            doc_str = str(document).strip()
            # If it's a file path
            if "\n" not in doc_str and (Path(doc_str).exists() or doc_str.lower().endswith((".pdf", ".txt", ".json"))):
                text = self.extract_text_from_file(doc_str)
            else:
                text = doc_str

            if text:
                lang, region, conf = self.detect_from_text(text)
                if conf >= 0.5:
                    return {
                        "language": lang,
                        "region": region,
                        "confidence": conf,
                        "source": "uploaded_document",
                        "preview": text[:120].replace("\n", " "),
                    }

        # 2. Check Location String
        if location:
            lang, region, conf = self.detect_from_location(location)
            if conf >= 0.7:
                return {
                    "language": lang,
                    "region": region,
                    "confidence": conf,
                    "source": "location_string",
                }

        # 3. Check GeoJSON Coordinates
        if geojson:
            lang, region, conf = self.detect_from_geojson(geojson)
            if conf >= 0.7:
                return {
                    "language": lang,
                    "region": region,
                    "confidence": conf,
                    "source": "geojson_coordinates",
                }

        # 4. Fallback Default
        return {
            "language": "hindi",
            "region": "National Language Default",
            "confidence": 0.5,
            "source": "default_fallback",
        }


# Global helper instance
extractor = DocumentLanguageExtractor()


def detect_regional_language(
    document: Optional[Union[str, Path]] = None,
    location: Optional[str] = None,
    geojson: Optional[Union[dict, str]] = None,
) -> str:
    """
    Convenience helper function returning directly the language string code:
    'assamese' | 'bhojpuri' | 'punjabi' | 'hindi' | 'english'
    """
    res = extractor.detect_language(document=document, location=location, geojson=geojson)
    return res["language"]
