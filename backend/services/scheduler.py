import logging
import time

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from ..config import TERMS as PRIORITY_TERMS
from ..db import upsert_subjects_async, upsert_terms_async
from ..services.aurora import fetch_all_subjects, fetch_all_terms, init_term_session, make_client
from ..utils.aurora_data import normalize_subject_items, normalize_term_items

log = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


async def refresh_priority_data() -> None:
    """Fetch terms + subjects for priority terms from Aurora and persist to SQLite."""
    log.info("Scheduler: starting priority data refresh")
    now = int(time.time())

    # ── Terms ──────────────────────────────────────────────────────────────────
    try:
        async with make_client() as client:
            raw = await fetch_all_terms(client)
        normalized = normalize_term_items(raw)
        await upsert_terms_async(normalized, now)
        log.info("Scheduler: persisted %d terms", len(normalized))
    except Exception:
        log.exception("Scheduler: failed to refresh terms")

    # ── Subjects for each priority term ────────────────────────────────────────
    for label, term_code in PRIORITY_TERMS.items():
        try:
            async with make_client() as client:
                await init_term_session(client, term_code)
                raw = await fetch_all_subjects(client, term_code)
            normalized = normalize_subject_items(raw)
            await upsert_subjects_async(term_code, normalized, now)
            log.info("Scheduler: persisted %d subjects for %s (%s)", len(normalized), label, term_code)
        except Exception:
            log.exception("Scheduler: failed to refresh subjects for %s (%s)", label, term_code)


def start_scheduler() -> None:
    scheduler.add_job(refresh_priority_data, "interval", hours=24, id="refresh_priority")
    scheduler.start()
    log.info("Scheduler: started (24 h interval)")


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
        log.info("Scheduler: stopped")
