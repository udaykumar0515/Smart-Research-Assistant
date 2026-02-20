"""Provider-agnostic LLM client.

Configure via .env:
  LLM_PROVIDER=  (e.g. gemini, openai, groq — leave empty to disable)
  LLM_API_KEY=
  LLM_MODEL=

To add a new provider, add a handler in generate_answer().
"""

from __future__ import annotations

import logging
from typing import Iterable

logger = logging.getLogger(__name__)

_NOT_CONFIGURED_MSG = (
    "LLM is not configured. Set LLM_PROVIDER, LLM_API_KEY, and LLM_MODEL in .env to enable AI answers."
)


def is_available(provider: str, api_key: str) -> bool:
    """Check if LLM is configured and ready to use."""
    return bool(provider and api_key)


def generate_answer(
    *,
    provider: str,
    api_key: str,
    model: str,
    question: str,
    contexts: Iterable[str],
) -> str:
    """Generate an answer using the configured LLM provider.

    Returns a fallback message if no provider is configured.
    Easily extensible — add new elif blocks for new providers.
    """
    if not is_available(provider, api_key):
        return _NOT_CONFIGURED_MSG

    joined_context = "\n\n".join([c for c in contexts if c])
    prompt = (
        "You are a research assistant. Answer the user question using the provided paper text. "
        "If you cannot find it in the text, say you are not sure.\n\n"
        f"Question: {question}\n\n"
        f"Paper Text:\n{joined_context}"
    )

    provider_lower = provider.strip().lower()

    # ── Provider handlers ──────────────────────────────────
    # Add new providers as elif blocks below

    if provider_lower == "gemini":
        return _call_gemini(api_key, model, prompt)

    elif provider_lower in ("openai", "groq"):
        return _call_openai_compatible(api_key, model, prompt, provider_lower)

    else:
        logger.warning("Unknown LLM provider: %s", provider)
        return f"Unknown LLM provider '{provider}'. Supported: gemini, openai, groq."


def _call_gemini(api_key: str, model: str, prompt: str) -> str:
    """Call Google Gemini API."""
    import google.generativeai as genai

    genai.configure(api_key=api_key)
    m = genai.GenerativeModel(model or "gemini-1.5-flash")
    resp = m.generate_content(prompt)
    return getattr(resp, "text", None) or str(resp)


def _call_openai_compatible(api_key: str, model: str, prompt: str, provider: str) -> str:
    """Call OpenAI-compatible APIs (OpenAI, Groq, etc.)."""
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
