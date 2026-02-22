from __future__ import annotations

import logging
import uuid

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .config import load_settings
from .extraction_pipeline import process_paper
from .llm_client import generate_answer, is_available as is_llm_available, route_question
from .models import Answer, ChatRequest, ChatResponse, CreditsDeductRequest, CreditsPurchaseRequest, CreditsResponse, NewsItem, Paper, UploadPaperResponse
from .storage import Storage

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = load_settings()
store = Storage(sqlite_path=settings.sqlite_path, data_dir=settings.data_dir)

app = FastAPI(title="Smart Research Assistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get(f"{settings.api_prefix}/health")
def health() -> dict:
    return {
        "ok": True,
        "docai_configured": bool(settings.docai_project_id and settings.docai_processor_id),
        "llm_configured": is_llm_available(settings.llm_provider, settings.llm_api_key),
        "router_configured": bool(settings.llm_router_api_key),
    }


@app.post(f"{settings.api_prefix}/papers/upload", response_model=UploadPaperResponse)
async def upload_paper(
    file: UploadFile = File(...),
    create_subscription: str = Form("false"),
) -> UploadPaperResponse:
    pdf_bytes = await file.read()
    if not pdf_bytes:
        raise HTTPException(status_code=400, detail="Empty file")

    file_path = store.save_pdf_bytes(pdf_bytes)

    try:
        combined_text, page_count, page_data, analysis, sections_data = process_paper(
            pdf_bytes=pdf_bytes,
            settings=settings,
        )
    except Exception as e:
        logger.error("Extraction pipeline failed: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Extraction failed: {e}")

    paper_id = f"paper-{uuid.uuid4().hex}"
    subscription_enabled = create_subscription.strip().lower() in {"1", "true", "yes", "on"}

    # Use parsed abstract from section parser, not raw text
    parsed_abstract = sections_data.get("abstract", "").strip()
    if not parsed_abstract and combined_text:
        parsed_abstract = combined_text[:600].strip()

    paper = Paper(
        paper_id=paper_id,
        title=(file.filename or "Uploaded Paper").replace(".pdf", ""),
        authors=[],
        abstract=parsed_abstract[:600],
        pages=page_count,
        keywords=[],
        subscription_enabled=subscription_enabled,
        updates_count=0,
        updates=[],
        analysis=analysis,
    )

    store.upsert_paper(
        paper,
        extracted_text=combined_text,
        file_path=file_path,
        page_data=page_data,
        analysis_json=analysis.model_dump(),
        sections_json=sections_data,
    )

    logger.info(
        "Paper %s uploaded: %d pages, %d sections, docai=%d, pymupdf=%d",
        paper_id,
        page_count,
        len(sections_data.get("sections", {})),
        len(analysis.docai_pages),
        len(analysis.pymupdf_pages),
    )

    return UploadPaperResponse(paper=paper)


@app.post(f"{settings.api_prefix}/chat", response_model=ChatResponse)
async def chat(req: ChatRequest) -> ChatResponse:
    paper_ids: list[str]
    if req.mode == "single":
        if not req.paper_id:
            raise HTTPException(status_code=400, detail="paper_id required for single mode")
        paper_ids = [req.paper_id]
    else:
        paper_ids = req.paper_ids or []
        if not paper_ids:
            raise HTTPException(status_code=400, detail="paper_ids required for multi mode")

    contexts: list[str] = []
    paper_titles: list[str] = []
    for pid in paper_ids:
        sp = store.get_paper(pid)
        if sp is None:
            raise HTTPException(status_code=404, detail=f"Paper not found: {pid}")

        paper_titles.append(sp.paper.title)
        sections = sp.sections_json or {}
        section_order = sections.get("section_order", [])
        abstract = sections.get("abstract", "")
        headings_summary = sections.get("headings_summary", "")
        section_map = sections.get("sections", {})

        # ── Stage 1: Router LLM picks relevant sections ──
        if section_order and settings.llm_router_api_key:
            selected_keys = route_question(
                api_key=settings.llm_router_api_key,
                model=settings.llm_router_model or settings.llm_model,
                question=req.question,
                abstract=abstract,
                headings_summary=headings_summary,
                section_order=section_order,
            )
            logger.info("Router selected sections for %s: %s", sp.paper.title, selected_keys)

            # ── Build context from selected sections only ──
            parts = []
            if "abstract" in selected_keys and abstract:
                parts.append(f"[Abstract]\n{abstract}")
            for key in selected_keys:
                if key in section_map:
                    sec = section_map[key]
                    parts.append(f"[{sec['heading']}]\n{sec['text']}")
            context = "\n\n".join(parts) if parts else sp.extracted_text
        else:
            # No sections or no router — fall back to full text
            context = store.get_combined_text(pid) or sp.extracted_text

        contexts.append(context)

    # ── Stage 2: Primary LLM answers with paper labels ──
    answer_text = generate_answer(
        provider=settings.llm_provider,
        api_key=settings.llm_api_key,
        model=settings.llm_model,
        question=req.question,
        contexts=contexts,
        paper_titles=paper_titles,
    )

    llm_active = is_llm_available(settings.llm_provider, settings.llm_api_key)

    # Build citations — one per paper used
    citations = []
    for i, pid in enumerate(paper_ids):
        title = paper_titles[i] if i < len(paper_titles) else f"Paper {i+1}"
        citations.append({
            "type": "paper",
            "title": title,
            "paper_id": pid,
            "page": None,
        })

    ans = Answer(
        type="synthesis" if req.mode == "multi" else "retrieval",
        answer=answer_text,
        citations=citations,
        used_llm=llm_active,
        credits_used=0,
    )

    return ChatResponse(answer=ans, credits=None)


@app.get(f"{settings.api_prefix}/papers")
async def list_papers() -> dict:
    papers = store.list_papers()
    return {"papers": [p.model_dump() for p in papers]}


@app.delete(f"{settings.api_prefix}/papers/{{paper_id}}")
async def delete_paper(paper_id: str) -> dict:
    deleted = store.delete_paper(paper_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Paper not found")
    return {"deleted": True, "paper_id": paper_id}


@app.get(f"{settings.api_prefix}/papers/{{paper_id}}")
async def get_paper(paper_id: str) -> dict:
    sp = store.get_paper(paper_id)
    if sp is None:
        raise HTTPException(status_code=404, detail="Paper not found")
    sections = sp.sections_json or {}
    return {
        "paper": sp.paper.model_dump(),
        "analysis": sp.analysis_json,
        "page_count": sp.paper.pages,
        "extraction_summary": {
            "docai_pages": sp.analysis_json.get("docai_pages", []) if sp.analysis_json else [],
            "pymupdf_pages": sp.analysis_json.get("pymupdf_pages", []) if sp.analysis_json else [],
        },
        "sections_summary": {
            "headings": sections.get("headings_summary", ""),
            "section_count": len(sections.get("sections", {})),
            "section_order": sections.get("section_order", []),
        },
    }


@app.get(f"{settings.api_prefix}/papers/{{paper_id}}/sections")
async def get_sections(paper_id: str) -> dict:
    sp = store.get_paper(paper_id)
    if sp is None:
        raise HTTPException(status_code=404, detail="Paper not found")
    sections = sp.sections_json or {}
    return {
        "abstract": sections.get("abstract", "")[:500],
        "headings_summary": sections.get("headings_summary", ""),
        "section_order": sections.get("section_order", []),
        "sections": {
            k: {"heading": v["heading"], "char_count": v.get("char_count", len(v.get("text", "")))}
            for k, v in sections.get("sections", {}).items()
        },
    }


@app.get(f"{settings.api_prefix}/papers/{{paper_id}}/pages/{{page_num}}")
async def get_page(paper_id: str, page_num: int) -> dict:
    sp = store.get_paper(paper_id)
    if sp is None:
        raise HTTPException(status_code=404, detail="Paper not found")
    page_key = str(page_num)
    if page_key not in sp.page_data:
        raise HTTPException(status_code=404, detail=f"Page {page_num} not found")
    return {"page_number": page_num, **sp.page_data[page_key]}


@app.get(f"{settings.api_prefix}/papers/{{paper_id}}/updates")
async def get_updates(paper_id: str) -> dict:
    sp = store.get_paper(paper_id)
    if sp is None:
        raise HTTPException(status_code=404, detail="Paper not found")

    updates: list[NewsItem] = sp.paper.updates or []
    return {"updates": [u.model_dump() for u in updates]}


@app.post(f"{settings.api_prefix}/papers/{{paper_id}}/updates/{{update_id}}/summarize")
async def summarize_update(paper_id: str, update_id: str) -> dict:
    sp = store.get_paper(paper_id)
    if sp is None:
        raise HTTPException(status_code=404, detail="Paper not found")

    # Find the specific update
    update = None
    if sp.paper.updates:
        update = next((u for u in sp.paper.updates if u.id == update_id), None)

    if not is_llm_available(settings.llm_provider, settings.llm_api_key):
        return {"summary": "LLM not configured — cannot summarize.", "credits_used": 0, "new_balance": store.get_credits_balance()}

    credits_used = 2
    ok, new_balance, _tx = store.deduct_credits(credits_used)
    if not ok:
        raise HTTPException(status_code=402, detail="Insufficient credits")

    update_text = ""
    if update:
        update_text = f"Title: {update.title}\nSnippet: {update.snippet}\nURL: {update.url}"
    else:
        update_text = f"Update {update_id} related to paper: {sp.paper.title}"

    summary = generate_answer(
        provider=settings.llm_provider,
        api_key=settings.llm_api_key,
        model=settings.llm_model,
        question="Provide a concise 2-3 sentence summary of this update and how it relates to the research paper.",
        contexts=[update_text, f"Research paper: {sp.paper.title}. Abstract: {sp.paper.abstract[:300]}"],
    )

    return {"summary": summary, "credits_used": credits_used, "new_balance": new_balance}


@app.post(f"{settings.api_prefix}/papers/{{paper_id}}/report")
async def generate_report(paper_id: str) -> dict:
    sp = store.get_paper(paper_id)
    if sp is None:
        raise HTTPException(status_code=404, detail="Paper not found")

    if not is_llm_available(settings.llm_provider, settings.llm_api_key):
        md = f"# Report: {sp.paper.title}\n\nLLM not configured — cannot generate a full report.\n"
        return {"report_markdown": md, "new_balance": store.get_credits_balance()}

    credits_used = 5
    ok, new_balance, _tx = store.deduct_credits(credits_used)
    if not ok:
        raise HTTPException(status_code=402, detail="Insufficient credits")

    # Build comprehensive context from sections
    sections = sp.sections_json or {}
    section_map = sections.get("sections", {})
    abstract = sections.get("abstract", sp.paper.abstract)

    context_parts = [f"Paper Title: {sp.paper.title}"]
    if abstract:
        context_parts.append(f"Abstract:\n{abstract}")
    for key in sections.get("section_order", []):
        if key in section_map:
            sec = section_map[key]
            # Limit each section to 500 chars for token budget
            text = sec["text"][:500]
            context_parts.append(f"{sec['heading']}:\n{text}")

    report_text = generate_answer(
        provider=settings.llm_provider,
        api_key=settings.llm_api_key,
        model=settings.llm_model,
        question=(
            "Generate a structured research paper report in Markdown format. Include:\n"
            "1. **Title and Overview** — one paragraph summary\n"
            "2. **Key Findings** — bullet points of main results\n"
            "3. **Methodology** — brief description of methods used\n"
            "4. **Conclusions** — what the paper concludes\n"
            "5. **Strengths & Limitations** — brief assessment\n"
            "Format as clean Markdown with headers."
        ),
        contexts=context_parts,
    )

    md = f"# Report: {sp.paper.title}\n\n{report_text}"
    return {"report_markdown": md, "new_balance": new_balance}


@app.post(f"{settings.api_prefix}/credits/deduct", response_model=CreditsResponse)
async def deduct_credits(req: CreditsDeductRequest) -> CreditsResponse:
    ok, new_balance, tx = store.deduct_credits(req.amount)
    if not ok:
        return CreditsResponse(success=False, newBalance=new_balance, transactionId=tx, message="Insufficient credits")
    return CreditsResponse(success=True, newBalance=new_balance, transactionId=tx)


@app.post(f"{settings.api_prefix}/credits/purchase", response_model=CreditsResponse)
async def purchase_credits(req: CreditsPurchaseRequest) -> CreditsResponse:
    ok, new_balance, tx = store.purchase_credits(req.amount)
    if not ok:
        return CreditsResponse(success=False, newBalance=new_balance, transactionId=tx, message="Invalid amount")
    return CreditsResponse(success=True, newBalance=new_balance, transactionId=tx)
