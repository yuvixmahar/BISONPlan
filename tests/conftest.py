import pytest
from httpx import ASGITransport, AsyncClient

from backend.main import app


@pytest.fixture(autouse=True)
def reset_runtime_state(tmp_path, monkeypatch):
    # Give every test an isolated, empty SQLite DB so DB reads return nothing
    # and tests control behaviour entirely through Aurora mocks.
    db_file = str(tmp_path / "test.db")
    monkeypatch.setattr("backend.db.DB_PATH", db_file)
    from backend.db import init_db
    init_db()

    from backend.cache import cache
    from backend.services import aurora_budget as module

    cache._data.clear()
    module.aurora_budget._count = 0
    module.aurora_budget._day = None
    yield
    cache._data.clear()
    module.aurora_budget._count = 0
    module.aurora_budget._day = None


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac
