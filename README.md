# Umbra Platform

Dark fantasy roguelike with AI-driven narrative, dual-weapon combat, rune corruption mechanics, and gacha economy.

## Architecture

| Service | Port | Description |
|---------|------|-------------|
| Nakama | 7350/7351 | Game server (auth, storage, leaderboards, realtime) |
| AI Director | 8001 | LLM-powered quest/dungeon/narrative generation |
| Game Logic | 8002 | Combat engine, gacha system, progression, anti-cheat |
| Payment | 8003 | Stripe checkout, receipt validation, Battle Pass |
| Client | 3000 | React 18 + Phaser 3.70 game client |
| Nginx | 8080 | API gateway |
| PostgreSQL | 5432 | Payment database |
| CockroachDB | 26257 | Nakama database |
| Redis | 6379 | Cache layer |
| Prometheus | 9090 | Metrics collection |
| Grafana | 3001 | Monitoring dashboards |

## Quick Start

```bash
# 1. Configure environment
cp .env.example .env
# Edit .env with your API keys

# 2. Start everything
make dev

# 3. Verify
make health
```

## Tech Stack

- **Game Server**: Nakama 3.21.1 (TypeScript runtime)
- **Backend**: FastAPI + Python 3.12 (3 microservices)
- **Frontend**: React 18 + Phaser 3.70 + Vite
- **Databases**: CockroachDB (Nakama), PostgreSQL 16 (payments)
- **Cache**: Redis 7
- **Gateway**: Nginx
- **Payments**: Stripe
- **AI**: OpenAI / Anthropic (pluggable)
- **Monitoring**: Prometheus + Grafana

## Development

```bash
make test          # Run all tests
make test-nakama   # Type-check Nakama TS
make test-client   # Build client
make lint          # Lint Python services
make format        # Format Python services
make logs          # Tail service logs
make health        # Check all endpoints
make clean         # Stop + remove volumes
```

## Security

This project uses [detect-secrets](https://github.com/Yelp/detect-secrets) to prevent accidental secret commits.

```bash
# Install pre-commit hooks
pip install pre-commit detect-secrets
pre-commit install

# Update baseline after intentional changes
detect-secrets scan > .secrets.baseline
```

## Project Structure

```
umbra-platform/
├── nakama/          # Nakama game server + TypeScript runtime
├── services/
│   ├── ai-director/ # LLM orchestration (FastAPI)
│   ├── game-logic/  # Combat, gacha, progression (FastAPI)
│   └── payment/     # Stripe, Battle Pass (FastAPI + SQLAlchemy)
├── client/          # React + Phaser game client
├── data/            # Shared static data (translations, gacha pools)
├── infrastructure/  # Nginx, scripts, monitoring
└── docs/            # Game design + architecture docs
```
