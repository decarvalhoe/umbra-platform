# Services Architecture - Umbra Platform

## Overview

Umbra uses a hybrid architecture: Nakama handles core game server responsibilities (auth, realtime, storage, matchmaking) while three focused FastAPI microservices provide domain-specific logic that benefits from Python's AI/ML ecosystem and Stripe SDK.

## Services

### Nakama (Game Server)
- **Role**: Authentication, player storage, leaderboards, realtime multiplayer, matchmaking
- **Database**: CockroachDB (managed by Nakama)
- **Runtime**: TypeScript modules for custom server logic (RPCs, hooks, match handlers)
- **Ports**: 7350 (API/WebSocket), 7351 (console)

### AI Director (FastAPI)
- **Role**: LLM-powered content generation (quests, dungeons, narrative events, difficulty tuning)
- **Provider**: OpenAI or Anthropic (pluggable via config)
- **State**: Stateless; uses Redis for response caching and rate limiting
- **Port**: 8001

### Game Logic (FastAPI)
- **Role**: Combat resolution, gacha draws with pity system, XP/progression, talent trees, anti-cheat
- **State**: Stateless; reads shared static data (gacha pools, balance tables) from mounted volume
- **Port**: 8002

### Payment (FastAPI)
- **Role**: Stripe checkout sessions, receipt validation (Apple/Google), Battle Pass progression
- **Database**: PostgreSQL 16 (transaction records, Battle Pass state)
- **Port**: 8003

## Infrastructure

### API Gateway (Nginx)
Routes all traffic through port 8080. Paths: `/nakama/` to Nakama, `/api/ai-director/` to AI Director, `/api/game-logic/` to Game Logic, `/api/payment/` to Payment, `/` to client.

### Databases
- **CockroachDB**: Nakama-managed player data and game state
- **PostgreSQL 16**: Payment transactions and Battle Pass records
- **Redis 7**: Shared cache for all services (AI response caching, rate limits, session data)

### Monitoring
- **Prometheus**: Scrapes health endpoints from all services at 15s intervals
- **Grafana**: Dashboards for service health, latency, and game metrics

## Communication

- **Client to Nakama**: WebSocket (realtime) + REST (CRUD operations)
- **Client to services**: HTTP via Nginx gateway
- **Nakama to services**: Server-side HTTP calls from TypeScript runtime RPCs
- **Services to Redis**: Direct connection for caching and pub/sub

## Deployment

- **Local**: Docker Compose orchestrates all services with health checks and dependency ordering
- **CI/CD**: GitHub Actions for testing (per-service) and Docker image builds (GHCR)
- **Images**: Published to `ghcr.io` on pushes to `main` and version tags
