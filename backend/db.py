import asyncio
import os
import sqlite3

DB_PATH = os.getenv("DB_PATH", "/data/bisonplan.db")


def _conn() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(os.path.abspath(DB_PATH)), exist_ok=True)
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    return con


def init_db() -> None:
    with _conn() as con:
        con.executescript("""
            CREATE TABLE IF NOT EXISTS terms (
                code        TEXT    PRIMARY KEY,
                description TEXT    NOT NULL,
                fetched_at  INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS subjects (
                term_code   TEXT    NOT NULL,
                code        TEXT    NOT NULL,
                description TEXT    NOT NULL,
                fetched_at  INTEGER NOT NULL,
                PRIMARY KEY (term_code, code)
            );
        """)


# ── Sync helpers (run inside asyncio.to_thread) ───────────────────────────────

def _upsert_terms(items: list[dict], fetched_at: int) -> None:
    with _conn() as con:
        con.executemany(
            "INSERT OR REPLACE INTO terms (code, description, fetched_at) VALUES (?, ?, ?)",
            [(r["code"], r["description"], fetched_at) for r in items],
        )


def _upsert_subjects(term_code: str, items: list[dict], fetched_at: int) -> None:
    with _conn() as con:
        con.execute("DELETE FROM subjects WHERE term_code = ?", (term_code,))
        con.executemany(
            "INSERT INTO subjects (term_code, code, description, fetched_at) VALUES (?, ?, ?, ?)",
            [(term_code, r["code"], r["description"], fetched_at) for r in items],
        )


def _read_terms() -> tuple[list[dict], int | None]:
    with _conn() as con:
        rows = con.execute(
            "SELECT code, description, fetched_at FROM terms ORDER BY code DESC"
        ).fetchall()
    if not rows:
        return [], None
    return [{"code": r["code"], "description": r["description"]} for r in rows], rows[0]["fetched_at"]


def _read_subjects(term_code: str) -> tuple[list[dict], int | None]:
    with _conn() as con:
        rows = con.execute(
            "SELECT code, description, fetched_at FROM subjects WHERE term_code = ? ORDER BY code",
            (term_code,),
        ).fetchall()
    if not rows:
        return [], None
    return [{"code": r["code"], "description": r["description"]} for r in rows], rows[0]["fetched_at"]


# ── Async wrappers ────────────────────────────────────────────────────────────

async def read_terms_async() -> tuple[list[dict], int | None]:
    return await asyncio.to_thread(_read_terms)


async def read_subjects_async(term_code: str) -> tuple[list[dict], int | None]:
    return await asyncio.to_thread(_read_subjects, term_code)


async def upsert_terms_async(items: list[dict], fetched_at: int) -> None:
    await asyncio.to_thread(_upsert_terms, items, fetched_at)


async def upsert_subjects_async(term_code: str, items: list[dict], fetched_at: int) -> None:
    await asyncio.to_thread(_upsert_subjects, term_code, items, fetched_at)
