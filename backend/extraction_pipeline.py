"""Hybrid extraction pipeline — orchestrates PyMuPDF + Document AI.

Routes pages to free local extraction or paid API based on layout analysis.
"""

from __future__ import annotations

import logging

from .config import Settings
from .docai import extract_specific_pages, extract_text_via_docai
from .models import PageAnalysis, PaperAnalysis
from .pdf_analyzer import PdfLayout, analyze_pdf, extract_text_pymupdf

logger = logging.getLogger(__name__)


def process_paper(
    pdf_bytes: bytes,
    settings: Settings,
) -> tuple[str, int, dict, PaperAnalysis]:
    """Run the full hybrid extraction pipeline.

    Returns:
        (combined_text, page_count, page_data_dict, analysis)
    """
    # ── Step 1: Local layout analysis ──
    layout: PdfLayout = analyze_pdf(pdf_bytes)
    logger.info(
        "Layout: %d pages, double_col=%s, docai_pages=%s, pymupdf_pages=%s",
        layout.total_pages,
        layout.is_double_column,
        layout.docai_pages,
        layout.pymupdf_pages,
    )

    # ── Step 2: Build analysis model ──
    page_analyses: list[PageAnalysis] = []
    for pl in layout.page_layouts:
        method = "docai" if pl.page_number in layout.docai_pages else "pymupdf"
        page_analyses.append(
            PageAnalysis(
                page_number=pl.page_number,
                columns=pl.columns,
                has_table=pl.has_table,
                has_image=pl.has_image,
                image_count=pl.image_count,
                extraction_method=method,
            )
        )

    analysis = PaperAnalysis(
        total_pages=layout.total_pages,
        is_double_column=layout.is_double_column,
        pages_with_tables=layout.pages_with_tables,
        pages_with_images=layout.pages_with_images,
        docai_pages=layout.docai_pages,
        pymupdf_pages=layout.pymupdf_pages,
        page_analyses=page_analyses,
    )

    # ── Step 3: Extract text from PyMuPDF pages ──
    page_texts: dict[int, str] = {}

    pymupdf_pages = layout.pymupdf_pages
    if pymupdf_pages:
        logger.info("Extracting %d pages via PyMuPDF (local, free)", len(pymupdf_pages))
        local_texts = extract_text_pymupdf(pdf_bytes, pymupdf_pages)
        page_texts.update(local_texts)

    # ── Step 4: Extract text from Document AI pages ──
    docai_pages = layout.docai_pages
    docai_configured = bool(settings.docai_project_id and settings.docai_processor_id)

    if docai_pages and docai_configured:
        if layout.is_double_column:
            # Double column: send entire PDF to Document AI for proper reading order
            logger.info("Double-column detected — sending entire PDF to Document AI")
            full_text, _ = extract_text_via_docai(
                project_id=settings.docai_project_id,
                location=settings.docai_location,
                processor_id=settings.docai_processor_id,
                pdf_bytes=pdf_bytes,
            )
            # For double-column, we use the full text from DocAI for all pages
            # We still keep local extraction for reference but DocAI text is primary
            page_texts.clear()
            # Store full text as page 0 (special key for full-document text)
            page_texts[0] = full_text
        else:
            # Single column with some complex pages: send only those pages
            logger.info("Extracting %d specific pages via Document AI", len(docai_pages))
            docai_texts = extract_specific_pages(
                project_id=settings.docai_project_id,
                location=settings.docai_location,
                processor_id=settings.docai_processor_id,
                pdf_bytes=pdf_bytes,
                pages=docai_pages,
            )
            page_texts.update(docai_texts)
    elif docai_pages and not docai_configured:
        logger.warning(
            "Document AI not configured — falling back to PyMuPDF for %d complex pages",
            len(docai_pages),
        )
        fallback_texts = extract_text_pymupdf(pdf_bytes, docai_pages)
        page_texts.update(fallback_texts)
        # Update methods to reflect fallback
        for pa in page_analyses:
            pa.extraction_method = "pymupdf"
        analysis.docai_pages = []
        analysis.pymupdf_pages = list(range(1, layout.total_pages + 1))

    # ── Step 5: Build page_data dict (JSON-ready for Firestore) ──
    page_data: dict[str, dict] = {}

    if 0 in page_texts:
        # Full DocAI text mode (double-column)
        page_data["0"] = {
            "text": page_texts[0],
            "method": "docai",
            "columns": 2,
            "has_table": False,
            "has_image": False,
            "note": "full_document_docai",
        }
    else:
        for page_num in sorted(page_texts.keys()):
            pa = next((p for p in page_analyses if p.page_number == page_num), None)
            page_data[str(page_num)] = {
                "text": page_texts[page_num],
                "method": pa.extraction_method if pa else "pymupdf",
                "columns": pa.columns if pa else 1,
                "has_table": pa.has_table if pa else False,
                "has_image": pa.has_image if pa else False,
            }

    # ── Step 6: Combine all text in order ──
    if 0 in page_texts:
        combined_text = page_texts[0]
    else:
        combined_text = "\n".join(
            page_texts[p] for p in sorted(page_texts.keys())
        )

    logger.info(
        "Pipeline complete: %d pages, %d chars, docai=%d pages, pymupdf=%d pages",
        layout.total_pages,
        len(combined_text),
        len(docai_pages),
        len(pymupdf_pages),
    )

    return combined_text, layout.total_pages, page_data, analysis
