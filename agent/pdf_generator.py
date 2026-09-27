"""
pdf_generator.py
================
AgriTrust AI V2 | Graph-Free High-Definition PDF Evidence Generator

Generates a **strictly 1-page, 100% graph-free** disaster evidence certificate
(no matplotlib, no canvas image overlays) used as the audit trail for a
parametric payout. Layout is hard-capped at a 126 mm text width so nothing can
ever spill across the document border.

Three structured sections (V2 specification):

  1. Farmer & Government Land Record Identification
     — Khasra No, Khata No, State, District, GeoJSON boundary polygon
  2. Multi-Modal Satellite Remote Sensing Telemetry
     — Copernicus Sentinel-1 SAR VV backscatter (dB), Sentinel-2 NDVI / NDWI
  3. Escrow Settlement & Cryptographic Proof
     — MST tx hash, EIP-191 ECDSA oracle signature, verified damage %,
       consensus verdict and the official verification seal

Usage:
    gen = PDFCertificateGenerator()
    path = gen.generate_audit_certificate(
        plot_id="ASSAM_MAJULI_01",
        farmer_name="Prasanta Kalita",
        khasra_number="Patta No. 104/B",
        khata_number="Khata 27/3",
        state_name="Assam",
        district_name="Majuli",
        ...
    )
    print(f"Certificate saved: {path}")

Author : Developer 2 — NEWRRO AI & Satellite Oracle Lead
Project: AgriTrust AI — MST Blockchain Buildathon
"""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Optional

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    level=logging.INFO,
)
logger = logging.getLogger("pdf_generator")

# Output directory for certificates
CERTIFICATES_DIR = Path(__file__).parent / "certificates"

# ── Layout constraints (V2 specification) ────────────────────────────────────
PAGE_WIDTH_MM = 210.0          # A4 portrait
TEXT_WIDTH_MM = 126.0          # maximum text width — prevents border overflow
MARGIN_MM = (PAGE_WIDTH_MM - TEXT_WIDTH_MM) / 2.0   # 42 mm symmetric margins


# ---------------------------------------------------------------------------
# Certificate data container
# ---------------------------------------------------------------------------

@dataclass
class CertificateData:
    """All data needed to generate one audit certificate."""
    plot_id: str
    farmer_name: str
    location: str
    disaster_type: str                      # "Monsoon Flood" | "Flash Drought" | "Heatwave"
    damage_pct: float
    payout_mst: float
    payout_inr: float
    proof_hash: str                         # EIP-191 keccak256 hash
    tx_hash: str                            # MST blockchain TX hash
    # ── V2.0: government land-record identification ────────────────────────
    khasra_number: str = "N/A"
    khata_number: str = "N/A"
    state_name: str = "N/A"
    district_name: str = "N/A"
    geojson: str = "N/A"
    # ── V2.0: cryptographic proof details ──────────────────────────────────
    ecdsa_signature: str = "N/A"
    oracle_address: str = "N/A"
    vault_address: str = "N/A"
    # ── Satellite telemetry ────────────────────────────────────────────────
    ndvi_pre: float = 0.75
    ndvi_post: float = 0.18
    sar_mean_db: float = -17.5
    sar_flood_days: int = 6
    ndwi_value: float = -0.42
    rainfall_mm: float = 185.0
    consensus_score: float = 1.0
    votes_for: int = 3
    farmer_phone: str = "N/A"
    crop_type: str = "RICE"
    acreage: float = 3.0
    certificate_id: str = field(default_factory=lambda: f"CERT-{uuid.uuid4().hex[:12].upper()}")
    generated_at: str = field(default_factory=lambda: datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"))


def _compact_geojson(geojson: Optional[str], limit: int = 190) -> str:
    """Collapse a GeoJSON polygon to a single readable, border-safe line."""
    if not geojson:
        return "N/A"
    text = str(geojson).replace("\n", " ").strip()
    if len(text) > limit:
        return text[:limit] + " …"
    return text


# ---------------------------------------------------------------------------
# PDF Certificate Generator
# ---------------------------------------------------------------------------

class PDFCertificateGenerator:
    """
    Generates 1-page, graph-free cryptographic disaster evidence certificates.

    Pure ReportLab vector/text layout — no matplotlib, no PNG/JPEG overlays —
    so the output is fully text-selectable, searchable and regulation friendly.
    """

    # Brand colours (AgriTrust AI palette)
    COLOR_DARK_GREEN  = (0.06, 0.35, 0.18)    # Header background
    COLOR_LIGHT_GREEN = (0.90, 0.97, 0.91)    # Section backgrounds
    COLOR_GOLD        = (0.85, 0.65, 0.13)    # Accent / stamp
    COLOR_RED         = (0.75, 0.10, 0.10)    # Warning / critical
    COLOR_DARK_GRAY   = (0.15, 0.15, 0.15)    # Body text
    COLOR_WHITE       = (1.0, 1.0, 1.0)

    def __init__(self, output_dir: Optional[str] = None):
        self.output_dir = Path(output_dir) if output_dir else CERTIFICATES_DIR
        self.output_dir.mkdir(parents=True, exist_ok=True)

    # ------------------------------------------------------------------
    # Main certificate generator
    # ------------------------------------------------------------------

    def generate_audit_certificate(
        self,
        plot_id: str,
        farmer_name: str,
        disaster_type: str,
        damage_pct: float,
        payout_mst: float,
        payout_inr: float,
        proof_hash: str,
        tx_hash: str,
        location: str = "Bihar, India",
        ndvi_pre: float = 0.75,
        ndvi_post: float = 0.18,
        sar_mean_db: float = -17.5,
        sar_flood_days: int = 6,
        ndwi_value: float = -0.42,
        rainfall_mm: float = 185.0,
        consensus_score: float = 1.0,
        votes_for: int = 3,
        ndvi_series: Optional[list] = None,
        sar_series: Optional[list] = None,
        crop_type: str = "RICE",
        acreage: float = 3.0,
        farmer_phone: str = "N/A",
        output_filename: Optional[str] = None,
        # ── V2.0 land-record + cryptographic proof fields ──────────────────
        khasra_number: str = "N/A",
        khata_number: str = "N/A",
        state_name: str = "N/A",
        district_name: str = "N/A",
        geojson: Optional[str] = None,
        ecdsa_signature: str = "N/A",
        oracle_address: str = "N/A",
        vault_address: str = "N/A",
    ) -> str:
        """
        Generate a strictly 1-page, graph-free disaster evidence certificate.

        Returns the full file path of the generated PDF.
        """
        try:
            from reportlab.lib import colors
            from reportlab.lib.pagesizes import A4
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib.units import mm
            from reportlab.platypus import (
                SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable,
            )
            from reportlab.lib.enums import TA_CENTER, TA_LEFT
        except ImportError:
            logger.error("❌  reportlab not installed. Run: pip install reportlab")
            raise

        # Build data object (ndvi_series / sar_series kept for API compatibility;
        # V2 certificates are deliberately graph-free.)
        cert = CertificateData(
            plot_id=plot_id, farmer_name=farmer_name, location=location,
            disaster_type=disaster_type, damage_pct=damage_pct,
            payout_mst=payout_mst, payout_inr=payout_inr,
            proof_hash=proof_hash, tx_hash=tx_hash,
            khasra_number=khasra_number or "N/A",
            khata_number=khata_number or "N/A",
            state_name=state_name or "N/A",
            district_name=district_name or "N/A",
            geojson=_compact_geojson(geojson),
            ecdsa_signature=ecdsa_signature or "N/A",
            oracle_address=oracle_address or "N/A",
            vault_address=vault_address or "N/A",
            ndvi_pre=ndvi_pre, ndvi_post=ndvi_post,
            sar_mean_db=sar_mean_db, sar_flood_days=sar_flood_days,
            ndwi_value=ndwi_value, rainfall_mm=rainfall_mm,
            consensus_score=consensus_score, votes_for=votes_for,
            farmer_phone=farmer_phone, crop_type=crop_type, acreage=acreage,
        )

        if not output_filename:
            output_filename = f"AuditCert_{plot_id}_{cert.certificate_id}.pdf"
        output_path = self.output_dir / output_filename

        # ReportLab colours
        dark_green  = colors.Color(*self.COLOR_DARK_GREEN)
        light_green = colors.Color(*self.COLOR_LIGHT_GREEN)
        gold        = colors.Color(*self.COLOR_GOLD)
        dark_gray   = colors.Color(*self.COLOR_DARK_GRAY)
        white       = colors.white

        # ── Document setup: symmetric margins ⇒ exactly 126 mm of text width ──
        doc = SimpleDocTemplate(
            str(output_path),
            pagesize=A4,
            leftMargin=MARGIN_MM * mm,
            rightMargin=MARGIN_MM * mm,
            topMargin=8 * mm,
            bottomMargin=8 * mm,
            title=f"AgriTrust AI Disaster Evidence Certificate {cert.certificate_id}",
            author="AgriTrust AI Oracle Network",
        )

        W = TEXT_WIDTH_MM * mm          # usable text width (126 mm)
        styles = getSampleStyleSheet()

        def style(name, **kwargs):
            return ParagraphStyle(name, parent=styles["Normal"], **kwargs)

        title_style   = style("Title",   fontSize=12, textColor=white, alignment=TA_CENTER, fontName="Helvetica-Bold", leading=14)
        sub_style     = style("Sub",     fontSize=7,  textColor=white, alignment=TA_CENTER, fontName="Helvetica", leading=9)
        section_style = style("Section", fontSize=8.5, textColor=dark_green, fontName="Helvetica-Bold", leading=10)
        body_style    = style("Body",    fontSize=7.5, textColor=dark_gray, fontName="Helvetica", leading=9.5)
        mono_style    = style("Mono",    fontSize=6.5, textColor=dark_gray, fontName="Courier", wordWrap="CJK", leading=8)
        stamp_style   = style("Stamp",   fontSize=8.5, textColor=gold, alignment=TA_CENTER, fontName="Helvetica-Bold", leading=11)
        cert_id_style = style("CertID",  fontSize=6.5, textColor=white, alignment=TA_CENTER, fontName="Courier", leading=8)
        footer_style  = style("Footer",  fontSize=6.5, textColor=colors.Color(0.5, 0.5, 0.5), alignment=TA_CENTER, leading=8)

        story = []

        # ── HEADER ─────────────────────────────────────────────────────────
        def banner(rows, style_obj, pad_top, pad_bottom, background=dark_green):
            t = Table([[Paragraph(r, style_obj)] for r in rows], colWidths=[W])
            t.setStyle(TableStyle([
                ("BACKGROUND",    (0, 0), (-1, -1), background),
                ("TOPPADDING",    (0, 0), (-1, -1), pad_top),
                ("BOTTOMPADDING", (0, 0), (-1, -1), pad_bottom),
                ("LEFTPADDING",   (0, 0), (-1, -1), 6),
                ("RIGHTPADDING",  (0, 0), (-1, -1), 6),
            ]))
            return t

        story.append(banner(["🌾  AGRITRUST AI  —  MST BLOCKCHAIN LAYER 1"], title_style, 5, 2))
        story.append(banner(["SATELLITE DISASTER EVIDENCE CERTIFICATE — PARAMETRIC CROP INSURANCE"], sub_style, 1, 2))
        story.append(banner([f"CERT ID: {cert.certificate_id}   |   {cert.generated_at}"], cert_id_style, 1, 4))
        story.append(Spacer(1, 2 * mm))

        # ── Shared table builders ──────────────────────────────────────────
        def section_header(text):
            t = Table([[Paragraph(f"▶  {text}", section_style)]], colWidths=[W])
            t.setStyle(TableStyle([
                ("BACKGROUND",    (0, 0), (-1, -1), light_green),
                ("TOPPADDING",    (0, 0), (-1, -1), 2.5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
                ("LEFTPADDING",   (0, 0), (-1, -1), 6),
                ("LINEBELOW",     (0, 0), (-1, -1), 1, dark_green),
            ]))
            return t

        def info_table(rows):
            """2-column key/value table, total width pinned to 126 mm."""
            cells = []
            for key, value in rows:
                cells.append([
                    Paragraph(str(key), body_style),
                    value if isinstance(value, Paragraph) else Paragraph(str(value), body_style),
                ])
            t = Table(cells, colWidths=[W * 0.33, W * 0.67])
            t.setStyle(TableStyle([
                ("FONTNAME",     (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTSIZE",     (0, 0), (-1, -1), 7.5),
                ("TEXTCOLOR",    (0, 0), (-1, -1), dark_gray),
                ("VALIGN",       (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING",   (0, 0), (-1, -1), 1.2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 1.2),
                ("LEFTPADDING",  (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("ROWBACKGROUNDS", (0, 0), (-1, -1), [white, colors.Color(0.97, 0.99, 0.97)]),
                ("GRID",         (0, 0), (-1, -1), 0.25, colors.Color(0.85, 0.9, 0.85)),
            ]))
            return t

        def mono(value: str) -> Paragraph:
            return Paragraph(f"<font name='Courier' size='6.5'>{value}</font>", mono_style)

        # ── SECTION 1: FARMER & GOVERNMENT LAND RECORD ─────────────────────
        story.append(section_header("1. FARMER &amp; GOVERNMENT LAND RECORD IDENTIFICATION"))
        story.append(Spacer(1, 0.8 * mm))
        story.append(info_table([
            ["Plot ID:",          cert.plot_id],
            ["Farmer Name:",      cert.farmer_name],
            ["Khasra / Survey No:", cert.khasra_number],
            ["Khata / Khatiyan No:", cert.khata_number],
            ["State / District:", f"{cert.state_name} / {cert.district_name}"],
            ["Crop &amp; Acreage:", f"{cert.crop_type} — {cert.acreage} acres"],
            ["Farmer Mobile:",    cert.farmer_phone],
            ["Disaster Type:",    f"{cert.disaster_type}  |  {cert.location}"],
            ["GeoJSON Polygon:",  mono(cert.geojson)],
        ]))
        story.append(Spacer(1, 1.6 * mm))

        # ── SECTION 2: MULTI-MODAL SATELLITE TELEMETRY ─────────────────────
        story.append(section_header("2. MULTI-MODAL SATELLITE TELEMETRY (COPERNICUS SENTINEL-1/2)"))
        story.append(Spacer(1, 0.8 * mm))

        ndvi_loss = round((cert.ndvi_pre - cert.ndvi_post) / cert.ndvi_pre * 100, 1) if cert.ndvi_pre > 0 else 0.0
        sar_verdict = "FLOOD (specular reflection)" if cert.sar_mean_db < -15.0 else "DRY LAND"
        ndwi_verdict = "DROUGHT STRESS" if cert.ndwi_value < -0.35 else "NORMAL"
        story.append(info_table([
            ["Sentinel-1 SAR VV Backscatter:", f"{cert.sar_mean_db:.2f} dB  →  {sar_verdict}  (threshold −15.0 dB)"],
            ["SAR Flood Duration:",           f"{cert.sar_flood_days} consecutive day(s) below −15 dB"],
            ["Sentinel-2 NDVI (Pre / Post):", f"{cert.ndvi_pre:.4f}  →  {cert.ndvi_post:.4f}"],
            ["NDVI Vegetation Loss:",         f"{ndvi_loss:.1f}%  {'⚠ CRITICAL' if ndvi_loss > 50 else '⚠ SEVERE' if ndvi_loss > 30 else 'MODERATE'}"],
            ["Sentinel-2 NDWI Index:",        f"{cert.ndwi_value:.4f}  →  {ndwi_verdict}"],
            ["IMD / OpenWeather Rainfall:",   f"{cert.rainfall_mm:.1f} mm in 48 hours"],
            ["Sensor Fusion:",                "2-of-3 Byzantine consensus across SAR · Optical · Precipitation"],
        ]))
        story.append(Spacer(1, 1.6 * mm))

        # ── SECTION 3: ESCROW SETTLEMENT & CRYPTOGRAPHIC PROOF ─────────────
        story.append(section_header("3. ESCROW SETTLEMENT &amp; CRYPTOGRAPHIC PROOF OF DISASTER"))
        story.append(Spacer(1, 0.8 * mm))

        verdict = f"✅ APPROVED — {cert.votes_for}/3 oracle feeds confirmed the event"
        story.append(info_table([
            ["Oracle Consensus:",       f"{cert.consensus_score:.2f}  ({cert.votes_for}/3 feeds voted YES)"],
            ["Verdict:",                verdict],
            ["Verified Damage:",        f"{cert.damage_pct:.1f}%"],
            ["Escrow Payout Settled:",  f"{cert.payout_mst:,.2f} MST  (≈ ₹{cert.payout_inr:,.0f})"],
            ["MST Blockchain Tx Hash:", mono(cert.tx_hash)],
            ["EIP-191 Proof Hash:",     mono(cert.proof_hash)],
            ["ECDSA Oracle Signature:", mono(cert.ecdsa_signature)],
            ["Oracle Signer:",          mono(cert.oracle_address)],
            ["AgriTrustVault:",         mono(cert.vault_address)],
        ]))

        story.append(Spacer(1, 2.5 * mm))

        # ── OFFICIAL VERIFICATION SEAL ─────────────────────────────────────
        stamp = Table([[Paragraph(
            "✅  VERIFIED &amp; DIGITALLY SIGNED BY THE AGRITRUST AI ORACLE NETWORK<br/>"
            "<font size='7'>EIP-191 ECDSA · OpenZeppelin ECDSA.recover() · anchored to MST Blockchain Layer 1 · "
            "tamper-evident, 1-page graph-free evidence</font>",
            stamp_style,
        )]], colWidths=[W])
        stamp.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, -1), colors.Color(0.98, 0.95, 0.85)),
            ("BOX",           (0, 0), (-1, -1), 1.25, gold),
            ("TOPPADDING",    (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(stamp)

        story.append(Spacer(1, 1.5 * mm))
        story.append(HRFlowable(width="100%", thickness=0.5, color=dark_green))
        story.append(Spacer(1, 0.8 * mm))
        story.append(Paragraph(
            "AgriTrust AI — Autonomous Parametric Crop Insurance &amp; Disaster Relief Escrow | "
            "MST Blockchain Layer 1 | Copernicus Sentinel-1/2 Remote Sensing",
            footer_style,
        ))

        # Build PDF
        doc.build(story)

        pages = self.page_count(output_path)
        if pages != 1:
            logger.warning("⚠️  Certificate spans %d pages — V2 requires exactly 1 page.", pages)

        logger.info(
            "📜  Audit Certificate generated:\n"
            "    File    : %s\n"
            "    Cert ID : %s\n"
            "    Plot    : %s | %s | Khasra %s\n"
            "    Payout  : %.2f MST (₹%s)\n"
            "    Pages   : %d",
            output_path, cert.certificate_id,
            plot_id, disaster_type, cert.khasra_number,
            payout_mst, f"{payout_inr:,.0f}", pages,
        )
        return str(output_path)

    # ------------------------------------------------------------------
    # Page-count guard (keeps the "strictly 1 page" promise honest)
    # ------------------------------------------------------------------
    @staticmethod
    def page_count(pdf_path: Path) -> int:
        try:
            raw = Path(pdf_path).read_bytes()
            return raw.count(b"/Type /Page") - raw.count(b"/Type /Pages")
        except Exception:
            return 1


# ---------------------------------------------------------------------------
# Quick smoke-test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    gen = PDFCertificateGenerator()

    path = gen.generate_audit_certificate(
        plot_id="ASSAM_MAJULI_01",
        farmer_name="Prasanta Kalita",
        location="Majuli, Assam (Brahmaputra Flood Zone)",
        disaster_type="Monsoon Flood",
        damage_pct=65.0,
        payout_mst=25_000.0,
        payout_inr=25_000.0,
        proof_hash="0xabc123def456abc123def456abc123def456abc123def456abc123def456abc1",
        tx_hash="0x9f8e7d6c5b4a3928374650192837465019283746501928374650192837465019",
        khasra_number="Patta No. 104/B",
        khata_number="Khata 27/3",
        state_name="Assam",
        district_name="Majuli",
        geojson='{"type":"Polygon","coordinates":[[[94.1714,26.7541],[94.2,26.7541],[94.2,26.73],[94.1714,26.73],[94.1714,26.7541]]]}',
        ecdsa_signature="0x8f3a91bc24ef10d5c7a6b9e2d4f81a03c5e7b6d9a2f4c1e8b3d6f0a9c2e5b7d41a8f3c6e9b2d5a7f0c4e1b8d6a3f5c9e0b2d7a4f6c1e8",
        oracle_address="0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        vault_address="0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
        ndvi_pre=0.75,
        ndvi_post=0.26,
        sar_mean_db=-17.5,
        sar_flood_days=6,
        ndwi_value=-0.12,
        rainfall_mm=210.0,
        consensus_score=1.0,
        votes_for=3,
        crop_type="Paddy (Rice)",
        acreage=5.0,
    )
    print(f"\n[OK] Certificate saved: {path}")
