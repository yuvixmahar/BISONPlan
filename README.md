## BISONplan

BISONplan is a faster, cleaner course planning experience for University of Manitoba students. It sits on top of Aurora (Banner SSB) as a live proxy and enhancement layer — not a mirrored or stale course database. Every search hits Aurora directly, so seat counts, waitlists, and section details stay current.

Built for students who want to explore courses, compare sections, and sketch out a schedule without fighting Aurora’s UI.

## Features

### Course Search

- **Live Aurora data** — terms, departments, sections, and seats are fetched in real time from U of M registration.
- **Term and subject pickers** — paginated dropdowns with search, matching Aurora’s lookup behavior.
- **Rich filtering** — narrow by credits, course level (1xxx–4xxx undergrad / 7xxx grad), campus, delivery mode, schedule type, day of week, time of day, and instructor; toggle full classes and waitlist-only sections.
- **Text search** — filter the loaded section list by course code or title (use the instructor filter for professor names).
- **Seat badges** — open, waitlist, and full status at a glance.
- **Quick View drawer** — meeting times, locations, instructors, dates, and section notes without leaving the list.
- **Prerequisites and corequisites** — loaded on demand in Aurora’s own wording to avoid misinformation.
- **Stale-data banner** — if Aurora is slow or unreachable, cached results are shown with a clear freshness indicator.

### Weekly Planner

- **Add from search** — send any section to your Fall, Winter, or Summer planner in one click.
- **Week-by-week calendar** — browse from the first to last class date with previous/next week navigation.
- **Weekly grid** — visualize meeting blocks on a Mon–Sun timetable with a dynamic time range.
- **Conflict detection** — overlapping meeting times are blocked before a course is added; summer terms also respect non-overlapping date ranges.
- **Per-term planners** — keep separate draft schedules for Fall, Winter, and Summer.

## Tech Stack

- **Backend:** Python, FastAPI, httpx
- **Frontend:** React + Vite + Tailwind CSS
- **Python package manager:** uv
- **Frontend package manager:** npm
- **Caching:** in-memory TTL cache for live Aurora-backed responses

## Local Setup

### Backend

```bash
uv sync
python -m uvicorn backend.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`, backend on `http://localhost:8000`.

No environment file or cookie configuration is required — Aurora endpoints are called directly.
