"""Document AI integration with support for full-PDF and selective page extraction."""

from __future__ import annotations

import logging
import re

import fitz  # PyMuPDF — reliable page counting
from google.api_core.client_options import ClientOptions
from google.cloud import documentai_v1 as documentai

logger = logging.getLogger(__name__)

PAGE_LIMIT = 15  # Max pages per online processing request


def _get_pdf_page_count(pdf_bytes: bytes) -> int:
    """Detect page count from PDF binary content using PyMuPDF."""
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        count = len(doc)
        doc.close()
        return count
    except Exception:
        # Fallback: try regex (less reliable)
        count_matches = re.findall(rb"/Type\s*/Page[^s]", pdf_bytes)
        return len(count_matches) if count_matches else PAGE_LIMIT


def _make_client(location: str) -> documentai.DocumentProcessorServiceClient:
    """Create a Document AI client with the regional endpoint."""
    opts = ClientOptions(api_endpoint=f"{location}-documentai.googleapis.com")
    return documentai.DocumentProcessorServiceClient(client_options=opts)


def extract_text_via_docai(
    *,
    project_id: str,
    location: str,
    processor_id: str,
    pdf_bytes: bytes,
) -> tuple[str, int]:
    """Extract text from entire PDF using Document AI.

    Automatically batches large PDFs (>15 pages) into multiple requests.
    Returns (extracted_text, page_count).
    """
    if not project_id or not processor_id:
        raise ValueError(
            "Document AI config missing: set DOC_AI_PROJECT_ID and DOC_AI_PROCESSOR_ID in .env"
        )

    client = _make_client(location)
    resource_name = client.processor_path(project_id, location, processor_id)
    raw_document = documentai.RawDocument(content=pdf_bytes, mime_type="application/pdf")
    total_pages = _get_pdf_page_count(pdf_bytes)

    logger.info("Processing entire PDF: ~%d pages via processor %s", total_pages, processor_id)

    if total_pages <= PAGE_LIMIT:
        request = documentai.ProcessRequest(name=resource_name, raw_document=raw_document)
        result = client.process_document(request=request)
        doc = result.document
        return doc.text or "", len(doc.pages) if doc.pages else 0

    # Auto-batch into PAGE_LIMIT-page chunks
    all_text_parts: list[str] = []
    total_page_count = 0

    for start in range(1, total_pages + 1, PAGE_LIMIT):
        end = min(start + PAGE_LIMIT - 1, total_pages)
        batch_pages = list(range(start, end + 1))
        logger.info("  Batch: pages %d-%d", start, end)

        process_options = documentai.ProcessOptions(
            individual_page_selector=documentai.ProcessOptions.IndividualPageSelector(
                pages=batch_pages
            )
        )
        request = documentai.ProcessRequest(
            name=resource_name,
            raw_document=raw_document,
            process_options=process_options,
        )
        result = client.process_document(request=request)
        doc = result.document
        all_text_parts.append(doc.text or "")
        total_page_count += len(doc.pages) if doc.pages else 0

    combined_text = "\n".join(all_text_parts)
    logger.info("Extraction complete: %d pages, %d chars", total_page_count, len(combined_text))
    return combined_text, total_page_count


def extract_specific_pages(
    *,
    project_id: str,
    location: str,
    processor_id: str,
    pdf_bytes: bytes,
    pages: list[int],
) -> dict[int, str]:
    """Extract text from specific pages only using Document AI.

    Returns {page_number: text} dict (1-indexed).
    Batches into PAGE_LIMIT-page chunks if needed.
    """
    if not project_id or not processor_id:
        raise ValueError("Document AI config missing")

    if not pages:
        return {}

    client = _make_client(location)
    resource_name = client.processor_path(project_id, location, processor_id)
    raw_document = documentai.RawDocument(content=pdf_bytes, mime_type="application/pdf")

    result_map: dict[int, str] = {}

    # Batch the requested pages into chunks of PAGE_LIMIT
    for i in range(0, len(pages), PAGE_LIMIT):
        batch = pages[i: i + PAGE_LIMIT]
        logger.info("  DocAI batch for pages: %s", batch)

        process_options = documentai.ProcessOptions(
            individual_page_selector=documentai.ProcessOptions.IndividualPageSelector(
                pages=batch
            )
        )
        request = documentai.ProcessRequest(
            name=resource_name,
            raw_document=raw_document,
            process_options=process_options,
        )
        result = client.process_document(request=request)
        doc = result.document

        # Map each returned page to its original page number
        for j, page in enumerate(doc.pages):
            page_num = batch[j] if j < len(batch) else batch[-1]
            # Extract text for this specific page using text anchors
            page_text = _extract_page_text(doc.text, page)
            result_map[page_num] = page_text

    return result_map


def _extract_page_text(full_text: str, page) -> str:
    """Extract text belonging to a specific page from the full document text."""
    if not page.paragraphs:
        return ""

    segments = []
    for para in page.paragraphs:
        for seg in para.layout.text_anchor.text_segments:
            start = int(seg.start_index)
            end = int(seg.end_index)
            segments.append((start, end))

    if not segments:
        return ""

    # Sort and merge overlapping segments
    segments.sort()
    text_parts = []
    for start, end in segments:
        text_parts.append(full_text[start:end])

    return "".join(text_parts)
