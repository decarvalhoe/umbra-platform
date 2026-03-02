# Integration Tests: Auth + Profile Creation Flow

Integration tests that verify the interfaces between components:
**Client** -> **Nakama** -> **Game Logic**

## What these tests cover

| Test file | Scope |
|-----------|-------|
| `test_auth_flow.py` | Email/device authentication, session lifecycle, profile auto-creation |
| `test_profile_flow.py` | Profile CRUD, game state persistence, game-logic API contracts |

## Architecture

Since we cannot run a real Nakama server in CI, these tests use:

1. **MockNakamaStorage** - In-memory storage that mirrors Nakama's `storageRead`/`storageWrite` API, keyed by `(collection, key, userId)` tuples.
2. **MockNakamaSession** - Simulates Nakama session objects with token, refresh_token, and expiry.
3. **Factory functions** (`make_default_profile`, `make_default_game_state`, etc.) that produce data matching the exact schemas defined in `nakama/data/main.ts`.
4. **httpx AsyncClient** wired to the game-logic FastAPI app for endpoint contract testing.

The tests verify that:
- Client auth types and Nakama server responses share the same data shape
- Profile auto-creation defaults match `nakama/data/main.ts` constants
- Game state round-trips through storage without data loss
- Game-logic endpoints accept payloads matching what Nakama would forward

## Prerequisites

```bash
pip install pytest pytest-asyncio httpx
```

The game-logic service dependencies must also be installed:

```bash
cd services/game-logic
pip install -r requirements.txt
```

## Running the tests

From the repository root:

```bash
# Run all integration tests
pytest tests/integration/ -v

# Run only auth flow tests
pytest tests/integration/test_auth_flow.py -v

# Run only profile/game-state tests
pytest tests/integration/test_profile_flow.py -v

# Run with coverage
pytest tests/integration/ -v --tb=short
```

From the `services/game-logic` directory (for game-logic endpoint tests):

```bash
cd services/game-logic
pytest ../../tests/integration/ -v
```

## Adding new tests

1. Add shared fixtures and mock data to `conftest.py`
2. Follow the naming convention: `test_<domain>_flow.py`
3. Group related tests into classes with descriptive docstrings
4. Use the `nakama_storage` fixture for any test that needs Nakama storage simulation
5. Use the `game_logic_client` fixture for testing FastAPI endpoints
