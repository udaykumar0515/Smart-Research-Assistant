"""Parse extracted text into named sections by detecting headings.

Detects: numbered headings (1. Introduction), keyword headings (Abstract, Methods),
ALL-CAPS headings, and common research paper structure.
"""

from __future__ import annotations

import logging
import re

logger = logging.getLogger(__name__)

# Common research paper section keywords
_SECTION_KEYWORDS = [
    "abstract", "introduction", "background", "related work", "literature review",
    "methods", "methodology", "materials and methods", "experimental setup",
    "results", "findings", "experiments",
    "discussion", "analysis",
    "conclusion", "conclusions", "summary",
    "acknowledgments", "acknowledgements",
    "references", "bibliography",
    "appendix", "supplementary",
]

# Regex for numbered headings like "1. Introduction" or "2.1 Methods"
_NUMBERED_HEADING = re.compile(
    r"^(\d+(?:\.\d+)*)\s*\.?\s+([A-Z][A-Za-z\s&:,\-]+)$", re.MULTILINE
)

# Regex for keyword-based headings (line is a known keyword, possibly with caps)
_KEYWORD_HEADING = re.compile(
    r"^(" + "|".join(re.escape(kw) for kw in _SECTION_KEYWORDS) + r")\s*$",
    re.MULTILINE | re.IGNORECASE,
)

# ALL-CAPS headings (at least 3 capital letters, no lowercase)
_ALLCAPS_HEADING = re.compile(r"^([A-Z][A-Z\s&:,\-]{2,})$", re.MULTILINE)


def _normalize_key(heading: str) -> str:
    """Convert a heading to a storage key like '1_introduction'."""
    clean = re.sub(r"[^a-z0-9\s]", "", heading.lower().strip())
    clean = re.sub(r"\s+", "_", clean)
    return clean[:50]


def parse_sections(text: str) -> dict:
    """Parse extracted text into sections.

    Returns:
    {
        "abstract": "...",
        "sections": {
            "1_introduction": {"heading": "Introduction", "text": "..."},
            "2_methods":      {"heading": "Methods",      "text": "..."},
            ...
        },
        "section_order": ["abstract", "1_introduction", "2_methods", ...],
        "headings_summary": "Abstract | Introduction | Methods | ..."
    }
    """
    if not text or not text.strip():
        return {
            "abstract": "",
            "sections": {},
            "section_order": [],
            "headings_summary": "",
        }

    # Find all heading positions
    headings: list[tuple[int, str, str]] = []  # (position, key, display_heading)

    # 1. Numbered headings
    for m in _NUMBERED_HEADING.finditer(text):
        num = m.group(1).replace(".", "_")
        title = m.group(2).strip()
        key = f"{num}_{_normalize_key(title)}"
        headings.append((m.start(), key, title))

    # 2. Keyword headings
    for m in _KEYWORD_HEADING.finditer(text):
        kw = m.group(1).strip()
        key = _normalize_key(kw)
        # Skip if too close to an existing heading (within 5 chars)
        if any(abs(m.start() - h[0]) < 5 for h in headings):
            continue
        headings.append((m.start(), key, kw.title()))

    # 3. ALL-CAPS headings (only if we haven't found many headings yet)
    if len(headings) < 3:
        for m in _ALLCAPS_HEADING.finditer(text):
            caps = m.group(1).strip()
            if len(caps) < 4 or len(caps.split()) > 6:
                continue
            key = _normalize_key(caps)
            if any(abs(m.start() - h[0]) < 5 for h in headings):
                continue
            headings.append((m.start(), key, caps.title()))

    # Sort by position
    headings.sort(key=lambda h: h[0])

    # Deduplicate keys
    seen_keys: set[str] = set()
    unique_headings = []
    for pos, key, display in headings:
        if key in seen_keys:
            key = f"{key}_2"
        seen_keys.add(key)
        unique_headings.append((pos, key, display))
    headings = unique_headings

    # Extract abstract (text before first heading, or dedicated abstract section)
    abstract = ""
    if headings:
        pre_text = text[: headings[0][0]].strip()
        # Check if there's substantial text before the first heading
        if len(pre_text) > 100:
            abstract = pre_text
    else:
        # No headings found — treat first 1000 chars as abstract
        abstract = text[:1000].strip()

    # Build sections
    sections: dict[str, dict] = {}
    section_order: list[str] = []

    if abstract:
        section_order.append("abstract")

    for i, (pos, key, display) in enumerate(headings):
        # Text runs from after the heading line to the start of the next heading
        heading_end = text.find("\n", pos)
        if heading_end == -1:
            heading_end = pos + len(display)
        else:
            heading_end += 1

        if i + 1 < len(headings):
            section_text = text[heading_end: headings[i + 1][0]].strip()
        else:
            section_text = text[heading_end:].strip()

        # Skip empty sections
        if not section_text and key != "references":
            continue

        sections[key] = {
            "heading": display,
            "text": section_text,
            "char_count": len(section_text),
        }
        section_order.append(key)

    # Build headings summary
    heading_names = []
    if abstract:
        heading_names.append("Abstract")
    heading_names.extend(sections[k]["heading"] for k in section_order if k in sections)
    headings_summary = " | ".join(heading_names)

    logger.info("Parsed %d sections: %s", len(sections), headings_summary)

    return {
        "abstract": abstract,
        "sections": sections,
        "section_order": section_order,
        "headings_summary": headings_summary,
    }
