"""Document AI integration with auto-batching for large PDFs."""

from __future__ import annotations

import logging
import re

from google.api_core.client_options import ClientOptions
from google.cloud import documentai_v1 as documentai

logger = logging.getLogger(__name__)

PAGE_LIMIT = 15  # Max pages per online processing request


def _get_pdf_page_count(pdf_bytes: bytes) -> int:
    """Detect page count from PDF binary content."""
    count_matches = re.findall(rb"/Count\s+(\d+)", pdf_bytes)
    if count_matches:
        return max(int(c) for c in count_matches)
    return PAGE_LIMIT  # safe fallback


def extract_text_via_docai(
    *,
    project_id: str,
    location: str,
    processor_id: str,
    pdf_bytes: bytes,
) -> tuple[str, int]:
    """Extract text from a PDF using Google Document AI.

    Automatically batches large PDFs (>15 pages) into multiple requests.
    Returns (extracted_text, page_count).
    """
    if not project_id or not processor_id:
        raise ValueError(
            "Document AI config missing: set DOC_AI_PROJECT_ID and DOC_AI_PROCESSOR_ID in .env"
        )

    # Use regional endpoint
    opts = ClientOptions(api_endpoint=f"{location}-documentai.googleapis.com")
    client = documentai.DocumentProcessorServiceClient(client_options=opts)
    resource_name = client.processor_path(project_id, location, processor_id)

    raw_document = documentai.RawDocument(content=pdf_bytes, mime_type="application/pdf")
    total_pages = _get_pdf_page_count(pdf_bytes)

    logger.info("Processing PDF: ~%d pages via processor %s", total_pages, processor_id)

    if total_pages <= PAGE_LIMIT:
        # Single request — no batching needed
        request = documentai.ProcessRequest(name=resource_name, raw_document=raw_document)
        result = client.process_document(request=request)
        doc = result.document
        return doc.text or "", len(doc.pages) if doc.pages else 0

    # Auto-batch into 15-page chunks
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
