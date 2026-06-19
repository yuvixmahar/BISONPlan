from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from .config import cors_origins
from .db import init_db
from .limiter import limiter
from .routers import courses, health, subjects, terms
from .services.scheduler import refresh_priority_data, start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    start_scheduler()
    await refresh_priority_data()
    yield
    stop_scheduler()


app = FastAPI(title="BISONplan API", version="0.1.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins(),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def inject_limiter(request: Request, call_next):
    request.state.limiter = limiter
    return await call_next(request)


app.include_router(courses.router, prefix="/api")
app.include_router(subjects.router, prefix="/api")
app.include_router(terms.router, prefix="/api")
app.include_router(health.router, prefix="/api")
