from __future__ import annotations

import uuid

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .config import load_settings
from .docai import extract_text_via_docai
from .llm_client import generate_answer, is_available as is_llm_available
from .models import Answer, ChatRequest, ChatResponse, CreditsDeductRequest, CreditsPurchaseRequest, CreditsResponse, NewsItem, Paper, UploadPaperResponse
from .storage import Storage

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
        text, pages = extract_text_via_docai(
            project_id=settings.docai_project_id,
            location=settings.docai_location,
            processor_id=settings.docai_processor_id,
            pdf_bytes=pdf_bytes,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Document AI failed: {e}")

    paper_id = f"paper-{uuid.uuid4().hex}"
    subscription_enabled = create_subscription.strip().lower() in {"1", "true", "yes", "on"}

    paper = Paper(
        paper_id=paper_id,
        title=(file.filename or "Uploaded Paper").replace(".pdf", ""),
        authors=[],
        abstract=(text[:600].strip() if text else ""),
        pages=pages,
        keywords=[],
        subscription_enabled=subscription_enabled,
        updates_count=0,
        updates=[],
    )

    store.upsert_paper(paper, extracted_text=text, file_path=file_path)
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
    for pid in paper_ids:
        sp = store.get_paper(pid)
        if sp is None:
            raise HTTPException(status_code=404, detail=f"Paper not found: {pid}")
        contexts.append(sp.extracted_text)

    answer_text = generate_answer(
        provider=settings.llm_provider,
        api_key=settings.llm_api_key,
        model=settings.llm_model,
        question=req.question,
        contexts=contexts,
    )

    llm_active = is_llm_available(settings.llm_provider, settings.llm_api_key)
    credits_used = 3 if llm_active else 0
    credits_meta = None
    if credits_used:
        ok, new_balance, tx = store.deduct_credits(credits_used)
        if not ok:
            raise HTTPException(status_code=402, detail="Insufficient credits")
        credits_meta = {"deducted": credits_used, "new_balance": new_balance, "transaction_id": tx}

    ans = Answer(
        type="synthesis" if req.mode == "multi" else "retrieval",
        answer=answer_text,
        citations=[],
        used_llm=llm_active,
        credits_used=credits_used,
    )

    return ChatResponse(answer=ans, credits=credits_meta)


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

    credits_used = 2
    ok, new_balance, _tx = store.deduct_credits(credits_used)
    if not ok:
        raise HTTPException(status_code=402, detail="Insufficient credits")

    return {"summary": "Summary not implemented yet for hackathon mode.", "credits_used": credits_used, "new_balance": new_balance}


@app.post(f"{settings.api_prefix}/papers/{{paper_id}}/report")
async def generate_report(paper_id: str) -> dict:
    sp = store.get_paper(paper_id)
    if sp is None:
        raise HTTPException(status_code=404, detail="Paper not found")

    credits_used = 5
    ok, new_balance, _tx = store.deduct_credits(credits_used)
    if not ok:
        raise HTTPException(status_code=402, detail="Insufficient credits")

    md = f"# Report\n\nPaper: {sp.paper.title}\n\nThis is a placeholder report for hackathon mode.\n"
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
