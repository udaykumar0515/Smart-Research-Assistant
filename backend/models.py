from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class NewsItem(BaseModel):
    id: str
    title: str
    url: str
    snippet: str
    published_at: str
    related_to: list[str] = Field(default_factory=list)
    summarized: bool | None = None
    summary: str | None = None


class PageAnalysis(BaseModel):
    page_number: int
    columns: int = 1
    has_table: bool = False
    has_image: bool = False
    image_count: int = 0
    extraction_method: str = "pymupdf"  # or "docai"


class PaperAnalysis(BaseModel):
    total_pages: int = 0
    is_double_column: bool = False
    pages_with_tables: list[int] = Field(default_factory=list)
    pages_with_images: list[int] = Field(default_factory=list)
    docai_pages: list[int] = Field(default_factory=list)
    pymupdf_pages: list[int] = Field(default_factory=list)
    page_analyses: list[PageAnalysis] = Field(default_factory=list)


class Paper(BaseModel):
    paper_id: str
    title: str
    authors: list[str] = Field(default_factory=list)
    abstract: str = ""
    pages: int = 0
    keywords: list[str] = Field(default_factory=list)
    subscription_enabled: bool = False
    updates_count: int = 0
    updates: list[NewsItem] | None = None
    analysis: PaperAnalysis | None = None


class Citation(BaseModel):
    type: Literal["paper", "news"]
    snippet: str
    paper_id: str | None = None
    page: int | None = None
    id: str | None = None
    title: str | None = None
    url: str | None = None


class Answer(BaseModel):
    type: Literal["retrieval", "synthesis"]
    answer: str
    citations: list[Citation] = Field(default_factory=list)
    used_llm: bool
    credits_used: int


class UploadPaperResponse(BaseModel):
    paper: Paper


class ChatRequest(BaseModel):
    question: str
    mode: Literal["single", "multi"]
    paper_id: str | None = None
    paper_ids: list[str] | None = None


class ChatResponse(BaseModel):
    answer: Answer
    credits: dict | None = None


class CreditsDeductRequest(BaseModel):
    amount: int
    reason: str


class CreditsPurchaseRequest(BaseModel):
    amount: int


class CreditsResponse(BaseModel):
    success: bool
    newBalance: int
    transactionId: str | None = None
    message: str | None = None


def now_iso() -> str:
    return datetime.utcnow().replace(microsecond=0).isoformat() + "Z"
