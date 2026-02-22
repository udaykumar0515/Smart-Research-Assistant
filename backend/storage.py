from __future__ import annotations

import json
import os
import sqlite3
import uuid
from dataclasses import dataclass
from pathlib import Path

from .models import Paper, PaperAnalysis


@dataclass(frozen=True)
class StoredPaper:
    paper: Paper
    extracted_text: str
    file_path: str
    page_data: dict
    analysis_json: dict | None = None
    sections_json: dict | None = None


class Storage:
    def __init__(self, sqlite_path: str, data_dir: str):
        self.sqlite_path = sqlite_path
        self.data_dir = data_dir
        Path(self.data_dir).mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.sqlite_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        Path(os.path.dirname(self.sqlite_path) or ".").mkdir(parents=True, exist_ok=True)
        with self._connect() as conn:
            conn.execute(
                """
                create table if not exists papers (
                  paper_id text primary key,
                  paper_json text not null,
                  extracted_text text not null,
                  file_path text not null,
                  page_data text not null default '{}',
                  analysis_json text not null default '{}',
                  sections_json text not null default '{}'
                )
                """
            )
            conn.execute(
                """
                create table if not exists credits (
                  id integer primary key check (id = 1),
                  balance integer not null
                )
                """
            )
            conn.execute("insert or ignore into credits (id, balance) values (1, 100)")

            # Migrate: add columns if they don't exist (for existing DBs)
            try:
                conn.execute("select page_data from papers limit 0")
            except sqlite3.OperationalError:
                conn.execute("alter table papers add column page_data text not null default '{}'")
            try:
                conn.execute("select analysis_json from papers limit 0")
            except sqlite3.OperationalError:
                conn.execute("alter table papers add column analysis_json text not null default '{}'")
            try:
                conn.execute("select sections_json from papers limit 0")
            except sqlite3.OperationalError:
                conn.execute("alter table papers add column sections_json text not null default '{}'")

    def save_pdf_bytes(self, pdf_bytes: bytes) -> str:
        paper_dir = Path(self.data_dir) / "papers"
        paper_dir.mkdir(parents=True, exist_ok=True)
        file_name = f"{uuid.uuid4().hex}.pdf"
        file_path = str(paper_dir / file_name)
        Path(file_path).write_bytes(pdf_bytes)
        return file_path

    def upsert_paper(
        self,
        paper: Paper,
        extracted_text: str,
        file_path: str,
        page_data: dict | None = None,
        analysis_json: dict | None = None,
        sections_json: dict | None = None,
    ) -> None:
        pd_json = json.dumps(page_data or {})
        an_json = json.dumps(analysis_json or {})
        sc_json = json.dumps(sections_json or {})
        with self._connect() as conn:
            conn.execute(
                "insert into papers (paper_id, paper_json, extracted_text, file_path, page_data, analysis_json, sections_json) "
                "values (?, ?, ?, ?, ?, ?, ?) "
                "on conflict(paper_id) do update set "
                "paper_json=excluded.paper_json, extracted_text=excluded.extracted_text, "
                "file_path=excluded.file_path, page_data=excluded.page_data, "
                "analysis_json=excluded.analysis_json, sections_json=excluded.sections_json",
                (paper.paper_id, paper.model_dump_json(), extracted_text, file_path, pd_json, an_json, sc_json),
            )

    def get_paper(self, paper_id: str) -> StoredPaper | None:
        with self._connect() as conn:
            row = conn.execute("select * from papers where paper_id=?", (paper_id,)).fetchone()
            if row is None:
                return None
            paper = Paper.model_validate_json(row["paper_json"])
            page_data = json.loads(row["page_data"]) if row["page_data"] else {}
            analysis_json = json.loads(row["analysis_json"]) if row["analysis_json"] else None
            sections_json = json.loads(row["sections_json"]) if row["sections_json"] else None
            return StoredPaper(
                paper=paper,
                extracted_text=row["extracted_text"],
                file_path=row["file_path"],
                page_data=page_data,
                analysis_json=analysis_json,
                sections_json=sections_json,
            )

    def get_combined_text(self, paper_id: str) -> str:
        """Get combined text from all pages in order."""
        sp = self.get_paper(paper_id)
        if sp is None:
            return ""
        if sp.page_data:
            # Reconstruct from page data in order
            sorted_pages = sorted(sp.page_data.items(), key=lambda x: int(x[0]))
            return "\n".join(pd.get("text", "") for _, pd in sorted_pages)
        return sp.extracted_text

    def list_papers(self) -> list[Paper]:
        with self._connect() as conn:
            rows = conn.execute("select paper_json from papers").fetchall()
            return [Paper.model_validate_json(r[0]) for r in rows]

    def delete_paper(self, paper_id: str) -> bool:
        with self._connect() as conn:
            row = conn.execute("select file_path from papers where paper_id=?", (paper_id,)).fetchone()
            if row is None:
                return False
            file_path = row["file_path"]
            conn.execute("delete from papers where paper_id=?", (paper_id,))
            # Remove PDF file from disk
            if file_path and os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except OSError:
                    pass
            return True

    def get_credits_balance(self) -> int:
        with self._connect() as conn:
            row = conn.execute("select balance from credits where id=1").fetchone()
            return int(row[0]) if row else 0

    def set_credits_balance(self, balance: int) -> None:
        with self._connect() as conn:
            conn.execute("update credits set balance=? where id=1", (balance,))

    def deduct_credits(self, amount: int) -> tuple[bool, int, str]:
        if amount <= 0:
            return True, self.get_credits_balance(), uuid.uuid4().hex
        with self._connect() as conn:
            row = conn.execute("select balance from credits where id=1").fetchone()
            balance = int(row[0]) if row else 0
            if balance < amount:
                return False, balance, uuid.uuid4().hex
            new_balance = balance - amount
            conn.execute("update credits set balance=? where id=1", (new_balance,))
            return True, new_balance, uuid.uuid4().hex

    def purchase_credits(self, amount: int) -> tuple[bool, int, str]:
        if amount <= 0:
            return False, self.get_credits_balance(), uuid.uuid4().hex
        with self._connect() as conn:
            row = conn.execute("select balance from credits where id=1").fetchone()
            balance = int(row[0]) if row else 0
            new_balance = balance + amount
            conn.execute("update credits set balance=? where id=1", (new_balance,))
            return True, new_balance, uuid.uuid4().hex
