"""Local PDF layout analysis using PyMuPDF.

Detects per-page: column count, tables, images.
Used to route pages to PyMuPDF (free) vs Document AI (paid).
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field

import fitz  # PyMuPDF

logger = logging.getLogger(__name__)


@dataclass
class PageLayout:
    page_number: int
    columns: int = 1
    has_table: bool = False
    has_image: bool = False
    image_count: int = 0


@dataclass
class PdfLayout:
    total_pages: int = 0
    is_double_column: bool = False
    pages_with_tables: list[int] = field(default_factory=list)
    pages_with_images: list[int] = field(default_factory=list)
    double_column_pages: list[int] = field(default_factory=list)
    page_layouts: list[PageLayout] = field(default_factory=list)

    @property
    def docai_pages(self) -> list[int]:
        """Pages that need Document AI extraction."""
        if self.is_double_column:
            return list(range(1, self.total_pages + 1))
        return sorted(set(self.pages_with_tables + self.pages_with_images))

    @property
    def pymupdf_pages(self) -> list[int]:
        """Pages that can be extracted locally."""
        docai = set(self.docai_pages)
        return [p for p in range(1, self.total_pages + 1) if p not in docai]

    @property
    def needs_docai(self) -> bool:
        return len(self.docai_pages) > 0


def analyze_pdf(pdf_bytes: bytes) -> PdfLayout:
    """Analyze PDF layout to determine extraction routing."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    layout = PdfLayout(total_pages=len(doc))

    for i, page in enumerate(doc):
        page_num = i + 1
        pl = PageLayout(page_number=page_num)

        # ── Detect images ──
        images = page.get_images(full=True)
        pl.image_count = len(images)
        pl.has_image = pl.image_count > 0

        # ── Detect columns via text block spatial analysis ──
        blocks = page.get_text("blocks")
        if len(blocks) > 5:
            width = page.rect.width
            middle = width / 2
            # Text blocks starting in left half vs right half
            left_starts = [b[0] for b in blocks if b[0] < middle - 50]
            right_starts = [b[0] for b in blocks if middle - 20 < b[0] < width - 50]
            if len(right_starts) > 2 and len(left_starts) > 2:
                pl.columns = 2

        # ── Detect tables via vector drawings ──
        drawings = page.get_drawings()
        if len(drawings) > 10:
            # Count horizontal and vertical lines
            h_lines = 0
            v_lines = 0
            for d in drawings:
                for item in d.get("items", []):
                    if item[0] == "l":  # line
                        p1, p2 = item[1], item[2]
                        if abs(p1.y - p2.y) < 2:
                            h_lines += 1
                        elif abs(p1.x - p2.x) < 2:
                            v_lines += 1
            if h_lines >= 3 and v_lines >= 2:
                pl.has_table = True

        # Collect results
        layout.page_layouts.append(pl)
        if pl.columns == 2:
            layout.double_column_pages.append(page_num)
        if pl.has_table:
            layout.pages_with_tables.append(page_num)
        if pl.has_image:
            layout.pages_with_images.append(page_num)

    doc.close()

    layout.is_double_column = len(layout.double_column_pages) > 0

    logger.info(
        "PDF analysis: %d pages, double_column=%s, tables_on=%s, images_on=%s",
        layout.total_pages,
        layout.is_double_column,
        layout.pages_with_tables,
        layout.pages_with_images,
    )

    return layout


def extract_text_pymupdf(pdf_bytes: bytes, pages: list[int] | None = None) -> dict[int, str]:
    """Extract text from specific pages using PyMuPDF.

    Returns {page_number: text} dict (1-indexed).
    If pages is None, extracts all pages.
    """
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    result: dict[int, str] = {}

    for i, page in enumerate(doc):
        page_num = i + 1
        if pages is not None and page_num not in pages:
            continue
        result[page_num] = page.get_text("text")

    doc.close()
    return result
