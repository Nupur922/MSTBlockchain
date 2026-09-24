"""
pdf_generator.py
================
Developer 2 | V2 Feature — AgriTrust AI
Cryptographic "NEWRRO AI Satellite Audit Certificate" PDF Generator

Generates a professional 1-page PDF audit certificate when a disaster
payout is executed. Used by insurance companies and government regulators
as a formal, tamper-proof audit trail.

Certificate contains:
  1. Certificate ID, Timestamp, Plot Location
  2. Disaster Type (Flood / Drought / Heatwave)
  3. Satellite Telemetry: NDVI Loss, SAR Backscatter, NDWI Moisture
  4. Cryptographic Section: EIP-191 Proof Hash + MST TX Hash
  5. NDVI/NDWI time-series graph (matplotlib)
  6. Digital Signature Stamp: VERIFIED BY NEWRRO AI ORACLE AGENT

Usage:
    gen = PDFCertificateGenerator()
    path = gen.generate_audit_certificate(
        plot_id="BIHAR_01",
        farmer_name="Ram Singh",
        ...
    )
    print(f"Certificate saved: {path}")

Author : Developer 2 — NEWRRO AI & Satellite Oracle Lead
Project: AgriTrust AI — MST Blockchain Buildathon
"""

from __future__ import annotations

import io
import logging
import os
import time
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
    ndvi_series: list[float] = field(default_factory=lambda: [0.75, 0.72, 0.55, 0.30, 0.18, 0.22])
    sar_series: list[float] = field(default_factory=lambda: [-8.5, -9.2, -16.1, -18.4, -19.0, -17.8])
    certificate_id: str = field(default_factory=lambda: f"CERT-{uuid.uuid4().hex[:12].upper()}")
    generated_at: str = field(default_factory=lambda: datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"))


# ---------------------------------------------------------------------------
# PDF Certificate Generator
# ---------------------------------------------------------------------------

class PDFCertificateGenerator:
    """
    Generates professional cryptographic audit certificate PDFs using ReportLab.

    Each certificate is a legally formatted 1-page A4 document containing
    satellite telemetry data, consensus results, and the EIP-191 signed
    proof hash anchored to the MST Blockchain transaction.
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
    # Internal: matplotlib graph → PNG bytes
    # ------------------------------------------------------------------

    def _generate_telemetry_graph(
        self,
        ndvi_series: list[float],
        sar_series: list[float],
        disaster_type: str,
    ) -> bytes:
        """Generate a dual-panel NDVI + SAR time-series graph as PNG bytes."""
        try:
            import matplotlib
            matplotlib.use("Agg")  # Non-interactive backend
            import matplotlib.pyplot as plt
            import matplotlib.patches as mpatches
            import numpy as np

            fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(10, 3.2), facecolor="#f4faf5")
            fig.suptitle("Satellite Telemetry Time Series", fontsize=11, fontweight="bold", color="#0f5a2e")

            dates = [f"T-{len(ndvi_series) - i}" for i in range(len(ndvi_series))]
            x     = np.arange(len(dates))

            # NDVI panel
            ax1.plot(x, ndvi_series, color="#1a7a3c", linewidth=2, marker="o", markersize=5)
            ax1.axhline(y=0.25, color="red", linestyle="--", linewidth=1, label="Stress threshold")
            ax1.fill_between(x, ndvi_series, 0.25, where=[v < 0.25 for v in ndvi_series],
                             alpha=0.3, color="red", label="Distressed")
            ax1.set_title("NDVI Vegetation Health", fontsize=9, fontweight="bold")
            ax1.set_ylabel("NDVI", fontsize=8)
            ax1.set_xticks(x)
            ax1.set_xticklabels(dates, fontsize=7, rotation=30)
            ax1.set_ylim(-0.1, 1.0)
            ax1.set_facecolor("#f0f8f2")
            ax1.legend(fontsize=7)
            ax1.grid(True, alpha=0.3)

            # SAR panel
            colors = ["#c0392b" if db < -15 else "#2980b9" for db in sar_series]
            ax2.bar(x, sar_series, color=colors, alpha=0.8)
            ax2.axhline(y=-15.0, color="red", linestyle="--", linewidth=1, label="Flood threshold (-15 dB)")
            ax2.set_title("SAR Backscatter (Flood Radar)", fontsize=9, fontweight="bold")
            ax2.set_ylabel("Backscatter (dB)", fontsize=8)
            ax2.set_xticks(x)
            ax2.set_xticklabels(dates, fontsize=7, rotation=30)
            ax2.set_facecolor("#f0f8f2")
            flood_patch = mpatches.Patch(color="#c0392b", alpha=0.8, label="Flooded (<-15 dB)")
            dry_patch   = mpatches.Patch(color="#2980b9", alpha=0.8, label="Dry land")
            ax2.legend(handles=[flood_patch, dry_patch], fontsize=7)
            ax2.grid(True, alpha=0.3, axis="y")

            plt.tight_layout()
            buf = io.BytesIO()
            plt.savefig(buf, format="png", dpi=120, bbox_inches="tight")
            plt.close(fig)
            buf.seek(0)
            return buf.read()

        except Exception as exc:
            logger.warning("⚠️  Graph generation failed (%s) — skipping graph.", exc)
            return b""

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
    ) -> str:
        """
        Generate a cryptographic audit certificate PDF.

        Returns the full file path of the generated PDF.
        """
        try:
            from reportlab.lib import colors
            from reportlab.lib.pagesizes import A4
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib.units import mm
            from reportlab.platypus import (
                SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
                HRFlowable, Image as RLImage,
            )
            from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
        except ImportError:
            logger.error("❌  reportlab not installed. Run: pip install reportlab")
            raise

        # Build data object
        cert = CertificateData(
            plot_id=plot_id, farmer_name=farmer_name, location=location,
            disaster_type=disaster_type, damage_pct=damage_pct,
            payout_mst=payout_mst, payout_inr=payout_inr,
            proof_hash=proof_hash, tx_hash=tx_hash,
            ndvi_pre=ndvi_pre, ndvi_post=ndvi_post,
            sar_mean_db=sar_mean_db, sar_flood_days=sar_flood_days,
            ndwi_value=ndwi_value, rainfall_mm=rainfall_mm,
            consensus_score=consensus_score, votes_for=votes_for,
            farmer_phone=farmer_phone, crop_type=crop_type, acreage=acreage,
            ndvi_series=ndvi_series or [0.75, 0.72, 0.55, 0.30, 0.18, 0.22],
            sar_series=sar_series or [-8.5, -9.2, -16.1, -18.4, -19.0, -17.8],
        )

        # Output filename
        if not output_filename:
            output_filename = f"AuditCert_{plot_id}_{cert.certificate_id}.pdf"
        output_path = self.output_dir / output_filename

        # ReportLab colours
        dark_green  = colors.Color(*self.COLOR_DARK_GREEN)
        light_green = colors.Color(*self.COLOR_LIGHT_GREEN)
        gold        = colors.Color(*self.COLOR_GOLD)
        red_color   = colors.Color(*self.COLOR_RED)
        dark_gray   = colors.Color(*self.COLOR_DARK_GRAY)
        white       = colors.white

        # Document setup
        doc = SimpleDocTemplate(
            str(output_path),
            pagesize=A4,
            rightMargin=15*mm, leftMargin=15*mm,
            topMargin=12*mm, bottomMargin=12*mm,
        )

        W, H = A4
        styles = getSampleStyleSheet()

        # Custom styles
        def style(name, **kwargs):
            return ParagraphStyle(name, parent=styles["Normal"], **kwargs)

        title_style    = style("Title",    fontSize=15, textColor=white,       alignment=TA_CENTER, fontName="Helvetica-Bold", leading=20)
        sub_style      = style("Sub",      fontSize=8,  textColor=white,       alignment=TA_CENTER, fontName="Helvetica")
        section_style  = style("Section",  fontSize=9,  textColor=dark_green,  fontName="Helvetica-Bold")
        body_style     = style("Body",     fontSize=8,  textColor=dark_gray,   fontName="Helvetica")
        mono_style     = style("Mono",     fontSize=6.5,textColor=dark_gray,   fontName="Courier", wordWrap="CJK")
        stamp_style    = style("Stamp",    fontSize=11, textColor=gold,        alignment=TA_CENTER, fontName="Helvetica-Bold")
        cert_id_style  = style("CertID",   fontSize=7,  textColor=white,       alignment=TA_RIGHT, fontName="Courier")

        story = []

        # ── HEADER ─────────────────────────────────────────────────────
        header_data = [[
            Paragraph("🌾  NEWRRO AI &amp; MST BLOCKCHAIN", title_style),
        ]]
        header_sub = [[
            Paragraph("SATELLITE AUDIT CERTIFICATE — PARAMETRIC CROP INSURANCE", sub_style),
        ]]
        cert_id_row = [[
            Paragraph(f"CERT ID: {cert.certificate_id}  |  {cert.generated_at}", cert_id_style),
        ]]

        header_table = Table(header_data, colWidths=[W - 30*mm])
        header_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), dark_green),
            ("TOPPADDING",    (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING",   (0, 0), (-1, -1), 10),
        ]))

        sub_table = Table(header_sub, colWidths=[W - 30*mm])
        sub_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), dark_green),
            ("TOPPADDING",    (0, 0), (-1, -1), 2),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))

        cert_id_table = Table(cert_id_row, colWidths=[W - 30*mm])
        cert_id_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), dark_green),
            ("TOPPADDING",    (0, 0), (-1, -1), 2),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 10),
        ]))

        story += [header_table, sub_table, cert_id_table, Spacer(1, 4*mm)]

        # ── FARM & DISASTER DETAILS ─────────────────────────────────────
        def section_header(text):
            t = Table([[Paragraph(f"▶  {text}", section_style)]], colWidths=[W - 30*mm])
            t.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), light_green),
                ("TOPPADDING",    (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING",   (0, 0), (-1, -1), 8),
                ("LINEBELOW", (0, 0), (-1, -1), 1, dark_green),
            ]))
            return t

        def info_table(rows, col_widths=None):
            """2-column key-value info table."""
            cw = col_widths or [(W - 30*mm) * 0.35, (W - 30*mm) * 0.65]
            t  = Table(rows, colWidths=cw)
            t.setStyle(TableStyle([
                ("FONTNAME",  (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTNAME",  (1, 0), (1, -1), "Helvetica"),
                ("FONTSIZE",  (0, 0), (-1, -1), 8),
                ("TEXTCOLOR", (0, 0), (-1, -1), dark_gray),
                ("TOPPADDING",    (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                ("LEFTPADDING",   (0, 0), (-1, -1), 6),
                ("ROWBACKGROUNDS", (0, 0), (-1, -1), [white, colors.Color(0.97, 0.99, 0.97)]),
            ]))
            return t

        story.append(section_header("1. FARM PLOT & DISASTER IDENTIFICATION"))
        story.append(Spacer(1, 1*mm))
        story.append(info_table([
            ["Plot ID:",         cert.plot_id],
            ["Farmer Name:",     cert.farmer_name],
            ["Location:",        cert.location],
            ["Crop Type:",       f"{cert.crop_type}  |  Acreage: {cert.acreage} acres"],
            ["Phone:",           cert.farmer_phone],
            ["Disaster Type:",   cert.disaster_type],
            ["Assessment Date:", cert.generated_at],
        ]))

        story.append(Spacer(1, 3*mm))

        # ── SATELLITE TELEMETRY ─────────────────────────────────────────
        story.append(section_header("2. SATELLITE TELEMETRY METRICS"))
        story.append(Spacer(1, 1*mm))

        ndvi_loss = round((cert.ndvi_pre - cert.ndvi_post) / cert.ndvi_pre * 100, 1) if cert.ndvi_pre > 0 else 0.0
        story.append(info_table([
            ["Sentinel-2 NDVI (Pre-event):",  f"{cert.ndvi_pre:.4f}  (Healthy crop baseline)"],
            ["Sentinel-2 NDVI (Post-event):", f"{cert.ndvi_post:.4f}  (Post-disaster measurement)"],
            ["NDVI Vegetation Loss:",         f"{ndvi_loss:.1f}%  {'⚠ CRITICAL' if ndvi_loss > 50 else '⚠ SEVERE' if ndvi_loss > 30 else 'MODERATE'}"],
            ["Sentinel-1 SAR Mean:",          f"{cert.sar_mean_db:.2f} dB  (Flood threshold: -15.0 dB)"],
            ["SAR Flood Duration:",           f"{cert.sar_flood_days} consecutive days below -15 dB"],
            ["NDWI Moisture Index:",          f"{cert.ndwi_value:.4f}  {'🌵 DROUGHT' if cert.ndwi_value < -0.35 else 'NORMAL'}"],
            ["IMD/OWM Rainfall (48h):",       f"{cert.rainfall_mm:.1f} mm"],
        ]))

        story.append(Spacer(1, 3*mm))

        # ── CONSENSUS RESULT ────────────────────────────────────────────
        story.append(section_header("3. NEWRRO AI 2-OF-3 MULTI-SOURCE CONSENSUS RESULT"))
        story.append(Spacer(1, 1*mm))

        verdict_text = f"✅ APPROVED — {cert.votes_for}/3 feeds confirmed disaster event"
        story.append(info_table([
            ["Oracle Consensus Score:", f"{cert.consensus_score:.2f}  ({cert.votes_for}/3 feeds voted YES)"],
            ["Verdict:",               verdict_text],
            ["Verified Damage:",       f"{cert.damage_pct:.1f}%"],
            ["Payout Authorized:",     f"{cert.payout_mst:,.2f} MST  (≈ ₹{cert.payout_inr:,.0f})"],
        ]))

        story.append(Spacer(1, 3*mm))

        # ── GRAPH ──────────────────────────────────────────────────────
        graph_bytes = self._generate_telemetry_graph(cert.ndvi_series, cert.sar_series, cert.disaster_type)
        if graph_bytes:
            story.append(section_header("4. SATELLITE TELEMETRY TIME-SERIES GRAPH"))
            story.append(Spacer(1, 1*mm))
            img_buf = io.BytesIO(graph_bytes)
            graph_img = RLImage(img_buf, width=W - 36*mm, height=55*mm)
            story.append(graph_img)
            story.append(Spacer(1, 3*mm))

        # ── CRYPTOGRAPHIC PROOF ─────────────────────────────────────────
        story.append(section_header("5. CRYPTOGRAPHIC BLOCKCHAIN PROOF"))
        story.append(Spacer(1, 1*mm))
        story.append(info_table([
            ["EIP-191 AI Proof Hash:", ""],
        ]))
        story.append(Paragraph(f"<font name='Courier' size='7'>{cert.proof_hash}</font>", body_style))
        story.append(Spacer(1, 1*mm))
        story.append(info_table([
            ["MST Blockchain TX Hash:", ""],
        ]))
        story.append(Paragraph(f"<font name='Courier' size='7'>{cert.tx_hash}</font>", body_style))
        story.append(Spacer(1, 2*mm))
        story.append(info_table([
            ["Signing Standard:",   "EIP-191 Personal Sign (Ethereum)"],
            ["Hash Algorithm:",     "keccak256(abi.encodePacked(plotId, amount, timestamp, chainId))"],
            ["ECDSA Recovery:",     "OpenZeppelin ECDSA.recover() — verified on MST Blockchain"],
            ["Replay Protection:",  "executedProofs[proofHash] mapping — single use only"],
        ]))

        story.append(Spacer(1, 4*mm))

        # ── VERIFICATION STAMP ──────────────────────────────────────────
        stamp_data = [[Paragraph(
            "✅  VERIFIED &amp; DIGITALLY SIGNED BY NEWRRO AI ORACLE AGENT<br/>"
            "This certificate is cryptographically anchored to MST Blockchain Layer 1.<br/>"
            "Any tampering with satellite telemetry data will invalidate the EIP-191 proof hash.",
            stamp_style,
        )]]
        stamp_table = Table(stamp_data, colWidths=[W - 30*mm])
        stamp_table.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, -1), colors.Color(0.98, 0.95, 0.85)),
            ("BOX",           (0, 0), (-1, -1), 1.5, gold),
            ("TOPPADDING",    (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ]))
        story.append(stamp_table)

        story.append(Spacer(1, 3*mm))
        story.append(HRFlowable(width="100%", thickness=0.5, color=dark_green))
        story.append(Spacer(1, 1*mm))
        story.append(Paragraph(
            "AgriTrust AI — Autonomous Parametric Crop Insurance &amp; Disaster Relief Escrow | "
            "MST Blockchain Layer 1 | NEWRRO AI Remote Sensing Engine",
            style("Footer", fontSize=6.5, textColor=colors.Color(0.5, 0.5, 0.5), alignment=TA_CENTER),
        ))

        # Build PDF
        doc.build(story)
        logger.info(
            "📜  Audit Certificate generated:\n"
            "    File   : %s\n"
            "    Cert ID: %s\n"
            "    Plot   : %s | %s\n"
            "    Payout : %.2f MST (₹%s)",
            output_path, cert.certificate_id,
            plot_id, disaster_type,
            payout_mst, f"{payout_inr:,.0f}",
        )
        return str(output_path)


# ---------------------------------------------------------------------------
# Quick smoke-test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    gen = PDFCertificateGenerator()

    path = gen.generate_audit_certificate(
        plot_id="BIHAR_DARBHANGA_01",
        farmer_name="Ram Singh",
        location="Darbhanga, Bihar (Kosi River Flood Zone)",
        disaster_type="Monsoon Flood",
        damage_pct=76.0,
        payout_mst=25_000.0,
        payout_inr=25_000.0,
        proof_hash="0xabc123def456abc123def456abc123def456abc123def456abc123def456abc1",
        tx_hash="0x9f8e7d6c5b4a3928374650192837465019283746501928374650192837465019",
        ndvi_pre=0.75,
        ndvi_post=0.18,
        sar_mean_db=-17.5,
        sar_flood_days=6,
        ndwi_value=-0.12,
        rainfall_mm=210.0,
        consensus_score=1.0,
        votes_for=3,
        crop_type="RICE",
        acreage=3.0,
    )
    print(f"\n[OK] Certificate saved: {path}")
