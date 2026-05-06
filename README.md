## BISONplan

BISONplan is a faster, cleaner course planning experience for University of Manitoba students.
It works as a live proxy/enhancement layer over Aurora (Banner SSB), not a mirrored course database.

## What It Does

- Browse terms and departments with Aurora-style paginated dropdowns.
- Search and filter course sections with live seat availability.
- Load course lists fast (details fetched lazily when needed).
- Open a Quick View drawer for meeting details, dates, and requisites.
- Show prerequisite/corequisite text in Aurora wording to avoid misinformation.
- Plan a week at a glance for Fall and Winter Term.

## Tech Stack

- **Backend:** Python, FastAPI, httpx
- **Frontend:** React + Vite + Tailwind CSS
- **Python package manager:** uv
- **Frontend package manager:** npm
- **Caching:** in-memory TTL cache for live Aurora-backed responses

## Project Structure

```text
bisonplan/
├── backend/
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── cache.py
│   ├── routers/
│   ├── services/
│   ├── models/
│   ├── schemas/
│   └── utils/
├── frontend/
│   ├── public/
│   ├── src/
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── .env
├── .gitignore
├── pyproject.toml
└── README.md
```

## Local Setup

### 1) Configure environment

Create `.env` in the repo root:

```env
AURORA_BIGIP_COOKIE=
AURORA_CF_CLEARANCE=
AURORA_JSESSIONID=
AURORA_TS_COOKIE=
```

### 2) Backend

```bash
uv sync
python -m uvicorn backend.main:app --reload --port 8000
```

### 3) Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`, backend on `http://localhost:8000`.

## API Overview

- `GET /api/health` — Aurora connectivity status + latency
- `GET /api/terms` — paginated term lookup (`offset`, `max`, `searchTerm`)
- `GET /api/subjects` — paginated typeahead subject lookup
- `GET /api/courses` — course sections for subject/term (fast list mode by default)
- `GET /api/courses/{crn}/description` — detailed description + requisites for one section

## Notes

- Aurora session initialization (`getTerms` then `term/search`) is required before search results.
- Seat data is always live from Aurora endpoints.
- Cookies expire and must be refreshed in `.env` periodically.