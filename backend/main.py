from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import cors_origins
from .routers import courses, subjects, terms, health

app = FastAPI(title="BISONplan API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins(),
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(courses.router, prefix="/api")
app.include_router(subjects.router, prefix="/api")
app.include_router(terms.router, prefix="/api")
app.include_router(health.router, prefix="/api")

