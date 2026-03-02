# Contributing to Umbra Platform

## Prerequisites

- **Docker** + Docker Compose v2
- **Node.js** 18+ (for client and Nakama runtime)
- **Python** 3.12+ (for backend services)
- **Git** with conventional commit support

## Setup

```bash
# 1. Clone the repo
git clone https://github.com/decarvalhoe/umbra-platform.git
cd umbra-platform

# 2. Copy environment template
cp .env.example .env
# Edit .env with your API keys (OpenAI/Anthropic for AI Director, Stripe for Payment)

# 3. Start all services
make dev

# 4. Verify everything is running
make health

# 5. (Optional) Seed test data
make seed
```

## Development Workflow

### Branch Naming

| Prefix | Usage | Example |
|--------|-------|---------|
| `feature/` | New features | `feature/hub-scene` |
| `fix/` | Bug fixes | `fix/combat-hitbox` |
| `docs/` | Documentation | `docs/api-reference` |
| `refactor/` | Code refactoring | `refactor/combat-engine` |
| `test/` | Adding tests | `test/gacha-integration` |
| `chore/` | Maintenance | `chore/update-deps` |

### Commit Conventions

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add dodge roll with invincibility frames
fix: correct gacha pity counter reset
docs: update combat engine API reference
refactor: extract enemy FSM into separate module
test: add integration tests for payment webhook
chore: update FastAPI to 0.110
```

**Scope** is optional but encouraged for large repos:
```
feat(combat): implement elemental status effects
fix(gacha): reset pity counter after legendary pull
```

### Pull Request Process

1. Create a branch from `develop` (never from `main`)
2. Make your changes
3. Run tests: `make test`
4. Build client: `make test-client`
5. Push and create a PR targeting `develop`
6. Ensure CI is green
7. Get review and merge

### GitFlow

```
main ← staging ← develop ← feature branches
```

- `develop`: integration branch, auto-deploys to dev environment
- `staging`: pre-production testing
- `main`: production releases

## Running Tests

```bash
make test              # All Python service tests
make test-game-logic   # Game logic service only
make test-ai-director  # AI Director service only
make test-payment      # Payment service only
make test-nakama       # Nakama TypeScript typecheck
make test-client       # Client build (includes TS check)
```

## Code Style

- **Python**: Ruff for linting, Black for formatting (`make lint`, `make format`)
- **TypeScript**: ESLint + strict mode (`noUnusedLocals`, `noUnusedParameters`)
- Prefix unused parameters with `_` (e.g., `_ctx`, `_seed`)

## Project Structure

```
services/
  ai-director/    # LLM content generation + Celery workers
  game-logic/     # Combat, gacha, progression, anomaly detection
  payment/        # Stripe integration, battle pass
client/           # React 18 + Phaser 3.70 game client
nakama/           # Nakama game server TypeScript runtime
infrastructure/   # Nginx, monitoring configs
```

Each service is independently testable and deployable.
