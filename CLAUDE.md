# Umbra Platform

Dark fantasy hack'n'slash roguelite with AI-powered narrative, LGBTQ+ otome romance, and pop cute manga aesthetic. Monorepo: React 18 + Phaser 3 client, 3 FastAPI microservices, Nakama game server, Docker Compose orchestration, Fly.io deployment.

## Commands

### Quick Start

```bash
cp .env.example .env             # Set API keys (OpenAI/Anthropic, Stripe, etc.)
make dev                         # Docker Compose up (all 13 containers)
make health                      # Verify all services
make seed                        # Seed test data (users, gacha, AI content)
```

### Development

| Command | Description |
|---------|-------------|
| `make dev` | Start all services (docker compose up --build -d) |
| `make stop` | Stop all services |
| `make clean` | Stop + remove volumes |
| `make logs` | Stream all service logs |
| `make health` | Check health endpoints (Nakama, AI Director, Game Logic, Payment, Client, Nginx) |
| `make seed` | Seed test data via scripts/seed-data.py |
| `make build` | Build all Docker images |

### Testing

| Command | Description |
|---------|-------------|
| `make test` | Run all Python service tests |
| `make test-ai-director` | AI Director pytest |
| `make test-game-logic` | Game Logic pytest |
| `make test-payment` | Payment pytest |
| `make test-nakama` | Nakama TypeScript type-check |
| `make test-client` | Client build (npm ci + npm run build) |
| `make lint` | Ruff check on all services |
| `make format` | Black format on all services |

### Client Only

```bash
cd client && npm install && npm run dev   # Vite dev server (port 3000)
cd client && npm run build                # Production build
```

## Architecture

```
umbra-platform/
  client/                     # React 18 + Phaser 3 + Vite (port 3000)
    src/
      components/             # React UI (LandingPage, LoginScreen, HUD, GachaModal, InventoryPanel)
      game/
        scenes/               # PreloadScene → MainScene → HubScene → DungeonScene → CombatScene
        entities/player/      # Player sprite + FSM (Idle, Run, Attack, Dodge, Hurt, Dead)
        entities/enemies/     # 11 enemy types + FSM (Idle, Alert, Chase, Telegraph, Attack, Hurt, Dead)
        entities/bosses/      # CorruptedGuardian + attacks (ShadowBolt, GroundSlam, CorruptionWave)
        dungeon/              # Procedural DAG generator, RoomTemplates, RuneCardSystem, NarrativeEnricher
        audio/                # Web Audio API procedural SFX + music (no external files)
        assets/               # Canvas-based sprite sheet generator (no image files)
        ui/                   # PauseMenu overlay
      nakama/                 # Auth (email/device), realtime (WebSocket), storage (RPC)
      services/               # API layer (game-logic, ai-director, payment)
      types/                  # game.ts, combat.ts, economy.ts, nakama.ts
  services/
    ai-director/              # FastAPI (port 8001) — LLM generation (OpenAI/Anthropic), Celery workers, Redis content pools
    game-logic/               # FastAPI (port 8002) — Combat engine, gacha, progression, anomaly detection
    payment/                  # FastAPI (port 8003) — Stripe, Battle Pass, SQLAlchemy + PostgreSQL
    shared/                   # Vault client (HashiCorp KV v2)
  nakama/                     # Game server (port 7350) — Auth, storage, leaderboards, anomaly RPC
    src/main.ts               # TypeScript runtime (compiled to JS for goja ES5.1)
    local.yml                 # Config (session: 2h, refresh: 7d, console: admin/UmbraAdmin2026!)
  infrastructure/
    nginx/                    # API Gateway config (routes: /nakama/, /api/ai-director/, /api/game-logic/, /api/payment/)
    monitoring/               # Prometheus (9090) + Grafana (3001)
    vault/                    # HashiCorp Vault config
  data/
    gacha-pools.json          # Gacha pool definitions (standard, fire_banner)
    translations/             # i18n (fr.json, en.json, es.json)
  tests/
    integration/              # Cross-service tests (auth flow, profile flow)
    load/                     # k6 load tests
  scripts/
    seed-data.py              # Test data seeder
  docs/                       # GDD, API specs, architecture, guides
  docker-compose.yml          # 13 containers orchestration
  Makefile                    # Dev commands
```

### Service Ports & Dependencies

| Service | Port | Database | Depends On |
|---------|------|----------|-----------|
| Client (React+Phaser) | 3000 | — | Nakama |
| Nginx Gateway | 8080 | — | All services |
| Nakama | 7350/7351 | CockroachDB | — |
| AI Director | 8001 | Redis (cache + Celery broker) | Redis |
| Celery Worker | — | Redis | AI Director |
| Flower (Celery UI) | 5555 | — | Celery Worker |
| Game Logic | 8002 | Redis | Redis |
| Payment | 8003 | PostgreSQL 16 | Postgres, Redis |
| Prometheus | 9090 | — | — |
| Grafana | 3001 | — | Prometheus |

## Git Workflow

- **Branches**: `develop` (integration) → `staging` → `main` (production)
- **Feature branches**: `feature/<issue-slug>` from `develop`
- **Fix branches**: `fix/<issue-slug>` from `develop`
- **Conventional commits**: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- **PR target**: always `develop`
- **Default remote**: `origin` → `decarvalhoe/umbra-platform`
- **Fork remote**: `fork-dungeon` → `realisonsdotcom/umbra-platform-fork`
- **83 branches** (40 local, 43 remote) — heavy feature branching

## Environment Variables

### Required (.env)

```bash
# AI Director
OPENAI_API_KEY=sk-...                    # Default LLM provider
ANTHROPIC_API_KEY=sk-ant-...             # Alternative provider
LLM_PROVIDER=openai                      # openai | anthropic
LLM_MODEL=gpt-4-turbo-preview

# Payment
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
PAYMENT_DATABASE_URL=postgresql+asyncpg://umbra:umbra@postgres:5432/umbra_payment
FRONTEND_URL=http://localhost:3000

# Nakama
NAKAMA_SERVER_KEY=defaultserverkey
NAKAMA_HTTP_URL=http://localhost:7350

# Infrastructure
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/1
CELERY_RESULT_BACKEND=redis://redis:6379/1

# Client (Vite)
VITE_API_URL=http://localhost:8080
VITE_NAKAMA_HOST=localhost
VITE_NAKAMA_PORT=7350
VITE_NAKAMA_SERVER_KEY=defaultserverkey
VITE_NAKAMA_USE_SSL=false
VITE_API_BASE_URL=http://localhost:8080
```

## Key Technical Details

### Client (React + Phaser)

- **Scene flow**: PreloadScene → MainScene (title) → HubScene (shop/talents/gacha) → DungeonScene (map) → CombatScene (action) → back to Hub
- **No external assets**: All sprites procedurally generated via Canvas (SpriteGenerator.ts), all audio via Web Audio API (AudioManager.ts)
- **Nakama auth**: Email/password + anonymous device auth, session persisted to localStorage
- **API calls non-blocking**: Game fully playable offline, API failures silently handled
- **State management**: No global store — React component state + Phaser registry + Nakama storage
- **Mobile**: Capacitor config present (com.umbra.game.umbra) for iOS/Android builds
- **Build**: Vite → dist/ → served by Nginx in Docker

### Backend Services (FastAPI)

- **Python 3.12**, all async (asyncio, httpx, asyncpg)
- **AI Director**: Celery Beat monitors content pools every 60s, rate-limited 10 gen/min, Redis-backed pools with auto-replenishment
- **Game Logic**: Stateless combat resolution, gacha with pity (soft 70, hard 90), 7-check anomaly detection
- **Payment**: SQLAlchemy 2.0 async + Alembic migrations, runs `alembic upgrade head` on container start
- **Battle Pass**: 10-week seasons, 100 tiers, XP-based progression

### Nakama Game Server

- **Runtime**: TypeScript compiled to JS (ES5.1 target for goja VM)
- **RPCs**: get/save_player_profile, get/save_game_state, get_leaderboard, evaluate_anomaly
- **Auth hooks**: Auto-create player profile + wallet (500 cendres, 50 eclats_ombre, 0 essence_antique)
- **Leaderboards**: Quarterly seasonal (season_YYYY_Q#)
- **CockroachDB**: Game state persistence (separate from Payment PostgreSQL)

### Nginx Gateway

Routes by path prefix:
- `/nakama/*` → Nakama (7350) with WebSocket upgrade (86400s timeout)
- `/api/ai-director/*` → AI Director (8001)
- `/api/game-logic/*` → Game Logic (8002)
- `/api/payment/*` → Payment (8003)
- `/*` → Client (3000)

## Game Systems Reference

### Combat

- **Dual-wield**: Left/right weapons, alternating combo hits
- **4-hit combo**: Light → Heavy → Heavy → Finisher (1.0x → 1.2x → 1.4x → 1.8x)
- **Dodge**: 2 charges, 3s recharge each, 0.2-0.5s i-frames
- **Elements**: Fire, Shadow, Blood, Void (rock-paper-scissors + status effects)
- **Status effects**: Burn (5%/tick), Weaken (-20% DEF), Bleed (3%/tick x3 stacks), Corrosion (-15% elemental res)
- **Enemy FSM**: Idle → Alert → Chase → Telegraph → Attack → Hurt → Dead

### Economy

- **Cendres** (common): Earned from runs, shop spending
- **Eclats d'Ombre** (rare): Gacha currency
- **Essence Antique** (premium): Real-money linked
- **Gacha pity**: Soft 70 (+5%/pull), hard 90 guaranteed
- **Convergence Tokens**: 50/dupe, 300 = choose any 5-star

### Dungeon Generation

- **Seeded DAG**: 10-15 rooms per floor, deterministic per seed
- **Room types**: combat, elite, treasure, event, rest, boss
- **Corruption**: +10% per floor, scales enemy damage + spawns
- **Rune cards**: 3-card choice after treasure/elite/event, ~40 cards across 4 categories

### Companions (5 romanceable)

| Name | Role | Orientation | Pronouns | Color |
|------|------|-------------|----------|-------|
| Kaelan | Cursed Smith | Heterosexual | il/lui | `#ff6b35` |
| Lyra | Spectral Archivist | Bisexual | elle/la | `#b39ddb` |
| Nyx | Void Merchant | Pansexual | iel/ellui | `#ffe135` |
| Seraphina | Fallen Paladin | Lesbian | elle/la | `#ff2d78` |
| Ronan | Wandering Bard | Gay | il/lui | `#00bcd4` |

- **Affinity**: 0-100, 5 thresholds, earned via dialogue/gifts/runs/quests
- **Resonance Bond**: Levels 1-15, unlocks Echo Fragments (L3), True Name (L10), Void Form (L15)

## Deployment

| Env | Target | Region |
|-----|--------|--------|
| Local | Docker Compose | — |
| Production | Fly.io | CDG (Paris) |

- Each service has its own `fly.toml` and `Dockerfile`
- Client: Vite build → Nginx alpine container (port 8080)
- Services: Python 3.12-slim containers
- Nakama: Custom image (Node builder → Nakama base + compiled JS)
- Payment: Runs Alembic migrations on startup

## Code Style

- **Python**: `black` (line-length 100), `ruff` linter, `mypy --strict` (non-blocking)
- **TypeScript**: Strict mode, no `any`, ESLint + Prettier
- **Naming**: Python snake_case, TS camelCase, components PascalCase
- **Pre-commit**: `detect-secrets` hook (Yelp/detect-secrets v1.4.0)

## Gotchas

- **Nakama runtime**: Must compile TS to ES5.1 JS (goja VM) — no `padStart`, no template literals, no spread operators in runtime code
- **Nakama type defs outdated**: Some params need casting to bypass `nakama-runtime.d.ts` type errors
- **CockroachDB ≠ PostgreSQL**: Nakama uses CockroachDB (port 26257), Payment uses PostgreSQL (port 5432) — don't mix them
- **Celery requires Redis**: AI Director + Celery Worker both need Redis running
- **Content pools**: Redis-backed with TTL, Celery Beat refills every 60s — first request after empty pool is slower
- **Gacha data mount**: Game Logic service mounts `./data` as read-only volume
- **LandingPage.tsx**: 1200+ lines — self-contained marketing site with particle canvas, custom cursor, Intersection Observer animations
- **No image assets**: All sprites are procedurally generated via Canvas API, all audio via Web Audio API — zero external asset files
- **Docker health checks**: All services expose `/health` (FastAPI) or `/healthcheck` (Nakama)
- **Wallet currencies in Nakama**: `cendres`, `eclats_ombre`, `essence_antique` — snake_case keys in wallet metadata

## Uncommitted Changes (as of 2026-03-03)

- `client/src/components/LandingPage.tsx` — Major rework (+786/-476 lines): manga-styled sections, particle system, custom cursor, 7 content sections, responsive, accessible
- `client/src/components/LandingPage.css` — Complete restyling with CSS custom properties, animations, manga color palette
- `.claude/` — Local Claude Code settings (gitignored)

## Documentation

- `docs/gdd-v2.md` — Game Design Document v2 (authoritative)
- `docs/game-design/` — Economy, mechanics, progression specs
- `docs/api/` — AI Director, Game Logic, Payment API specs + standards
- `docs/architecture/services-architecture.md` — Service topology
- `docs/guides/` — Coding standards, contributing, deployment, development
- `CONTRIBUTING.md` — Setup, branch strategy, PR process, testing
