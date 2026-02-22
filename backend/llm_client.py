"""Provider-agnostic LLM client with two-stage support.

Primary LLM: answers questions using selected sections.
Router LLM:  cheap call to identify which sections a question needs.
"""

from __future__ import annotations

import json
import logging
from typing import Iterable

logger = logging.getLogger(__name__)

_NOT_CONFIGURED_MSG = (
    "LLM is not configured. Set LLM_PROVIDER, LLM_API_KEY, and LLM_MODEL in .env to enable AI answers."
)

MAX_CONTEXT_CHARS = 12000  # ~4000 tokens — enough for 2-3 papers
MAX_PER_PAPER_CHARS = 5000  # Ensure each paper gets fair representation


def is_available(provider: str, api_key: str) -> bool:
    return bool(provider and api_key)


# ── Stage 1: Router ──────────────────────────────────────

def route_question(
    *,
    api_key: str,
    model: str,
    question: str,
    abstract: str,
    headings_summary: str,
    section_order: list[str],
) -> list[str]:
    """Ask the router LLM which sections are needed to answer the question.

    Sends only the abstract + list of headings (tiny prompt).
    Returns list of section keys like ['1_introduction', '3_results'].
    """
    if not api_key:
        logger.warning("Router LLM not configured, returning all sections")
        return section_order

    prompt = (
        "You are a research paper section router. Given a question and a paper's structure, "
        "return ONLY a JSON array of section keys needed to answer the question.\n\n"
        "RULES:\n"
        "- Return ONLY a JSON array, nothing else\n"
        "- Include 'abstract' if the question is about the paper's overview or topic\n"
        "- Be selective — pick only the sections truly needed\n"
        "- If unsure, include the most likely sections\n\n"
        f"Available sections: {json.dumps(section_order)}\n\n"
        f"Paper abstract: {abstract[:500]}\n\n"
        f"Section headings: {headings_summary}\n\n"
        f"Question: {question}\n\n"
        "Return ONLY a JSON array of section keys:"
    )

    try:
        raw = _call_openai_compatible(api_key, model or "llama-3.1-8b-instant", prompt, "groq")
        logger.info("Router raw response: %s", raw[:200])

        # Parse JSON array from response
        # Strip markdown code fences if present
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

        selected = json.loads(cleaned)
        if isinstance(selected, list):
            # Filter to only valid section keys
            valid = [s for s in selected if s in section_order]
            if valid:
                logger.info("Router selected sections: %s", valid)
                return valid

        logger.warning("Router returned invalid format, using all sections")
        return section_order

    except Exception as e:
        logger.error("Router LLM failed: %s, using all sections", e)
        return section_order


# ── Stage 2: Answer ──────────────────────────────────────

def generate_answer(
    *,
    provider: str,
    api_key: str,
    model: str,
    question: str,
    contexts: Iterable[str],
    paper_titles: list[str] | None = None,
) -> str:
    """Generate an answer using the configured LLM provider.

    Args:
        contexts: list of text contexts (one per paper)
        paper_titles: optional list of paper titles (same order as contexts)
    """
    if not is_available(provider, api_key):
        return _NOT_CONFIGURED_MSG

    context_list = list(contexts)
    titles = paper_titles or [f"Paper {i+1}" for i in range(len(context_list))]
    is_multi = len(context_list) > 1

    # Build labeled context — each paper clearly identified
    labeled_parts: list[str] = []
    for i, (title, ctx) in enumerate(zip(titles, context_list)):
        if not ctx:
            continue
        # Truncate per-paper to ensure fair representation
        truncated = ctx[:MAX_PER_PAPER_CHARS]
        if len(ctx) > MAX_PER_PAPER_CHARS:
            truncated += "\n[... truncated ...]"
        labeled_parts.append(f"=== [{title}] ===\n{truncated}")

    joined_context = "\n\n".join(labeled_parts)

    # Final safety check on total length
    if len(joined_context) > MAX_CONTEXT_CHARS:
        logger.info("Truncating total context from %d to %d chars", len(joined_context), MAX_CONTEXT_CHARS)
        joined_context = joined_context[:MAX_CONTEXT_CHARS] + "\n\n[... text truncated for token limit ...]"

    if is_multi:
        prompt = (
            "You are a research assistant analyzing MULTIPLE research papers. "
            "Answer the user's question using the provided paper texts.\n\n"
            "IMPORTANT RULES:\n"
            "- When referencing information, ALWAYS cite which paper it comes from using **[Paper Title]** format\n"
            "- Compare and contrast findings across papers when relevant\n"
            "- If information is only in one paper, clearly state which one\n"
            "- Structure your answer with clear sections if the question is broad\n"
            "- If you cannot find information in the papers, say so\n\n"
            f"Question: {question}\n\n"
            f"Papers:\n{joined_context}"
        )
    else:
        prompt = (
            "You are a research assistant. Answer the user's question using the provided paper text. "
            "Be thorough and cite specific sections or findings. "
            "If you cannot find the answer in the text, say you are not sure.\n\n"
            f"Question: {question}\n\n"
            f"Paper Text:\n{joined_context}"
        )

    provider_lower = provider.strip().lower()

    if provider_lower == "gemini":
        return _call_gemini(api_key, model, prompt)
    elif provider_lower in ("openai", "groq"):
        return _call_openai_compatible(api_key, model, prompt, provider_lower)
    else:
        logger.warning("Unknown LLM provider: %s", provider)
        return f"Unknown LLM provider '{provider}'. Supported: gemini, openai, groq."


# ── Provider backends ────────────────────────────────────

def _call_gemini(api_key: str, model: str, prompt: str) -> str:
    import google.generativeai as genai
    genai.configure(api_key=api_key)
    m = genai.GenerativeModel(model or "gemini-1.5-flash")
    resp = m.generate_content(prompt)
    return getattr(resp, "text", None) or str(resp)


def _call_openai_compatible(api_key: str, model: str, prompt: str, provider: str) -> str:
    from openai import OpenAI
    base_urls = {
        "openai": "https://api.openai.com/v1",
        "groq": "https://api.groq.com/openai/v1",
    }
    client = OpenAI(api_key=api_key, base_url=base_urls.get(provider))
    resp = client.chat.completions.create(
        model=model or "llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
    )
    return resp.choices[0].message.content or ""
