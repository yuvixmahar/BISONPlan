import pytest
from httpx import ASGITransport, AsyncClient

from backend.main import app


@pytest.fixture(autouse=True)
def reset_runtime_state():
    # Reset shared in-memory state between tests so behaviour is controlled
    # entirely through Aurora mocks.
    from backend.core.cache import cache

    cache._data.clear()
    yield
    cache._data.clear()


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac
