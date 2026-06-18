from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from .config import cors_origins
from .limiter import limiter
from .routers import courses, subjects, terms, health

app = FastAPI(title="BISONplan API", version="0.1.0")
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
