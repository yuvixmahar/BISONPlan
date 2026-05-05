## BISONplan

Course planning web app that acts as a live proxy/enhancement layer over Aurora (UManitoba Banner).

### Local dev

1. Set cookies in `.env` (`AURORA_*` variables).
2. Backend:
   - `uv sync`
   - `python -m uvicorn backend.main:app --reload --port 8000`
3. Frontend:
   - `cd frontend`
   - `npm install`
   - `npm run dev` (http://localhost:5173)
