# Umbra Platform

Monorepo for the Umbra game platform — a multiplayer game with cloud services for authentication, player management, game state, payments, cloud profiles, security, and localization.

## Architecture

```
umbra-platform/
├── client/                # Game client (TypeScript, React, Phaser 3)
├── services/
│   ├── auth/              # Authentication service (Python, Flask, JWT)
│   ├── player/            # Player management service
│   ├── game-state/        # Game state service
│   ├── payment/           # Payment processing service
│   ├── cloud-profile/     # Cloud save/profile service
│   ├── security/          # Security & anti-cheat service
│   └── localization/      # Localization (i18n) service
├── infrastructure/        # Nginx, Prometheus, Grafana configs, DB init scripts
├── docs/                  # Project documentation
├── docker-compose.yml     # Full development stack
└── Makefile               # Orchestration commands
```

## Quick Start

```bash
# Start the full stack (all services + postgres + redis + nginx)
make dev

# View logs
make logs

# Run all tests
make test

# Stop everything
make stop
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| auth | 5000 | Authentication, JWT, session management |
| player | 5001 | Player profiles and management |
| game-state | 5002 | Game state persistence |
| payment | 5003 | Payment processing |
| cloud-profile | 5004 | Cloud saves and profiles |
| security | 5006 | Security and anti-cheat |
| localization | 5007 | Internationalization |
| game-client | 3000 | Web game client (Vite dev server) |
| nginx | 8080 | API gateway |
| postgres | 5432 | PostgreSQL 15 |
| redis | 6379 | Redis 7 |
| prometheus | 9090 | Metrics collection |
| grafana | 3001 | Monitoring dashboards |

## Development

```bash
# Install all dependencies (Python + Node)
make install

# Test a specific service
make test-auth
make test-player
make test-client

# Lint all backend services
make lint

# Format all backend code
make format
```

## Tech Stack

- **Backend**: Python 3.11, Flask, SQLAlchemy, JWT
- **Client**: TypeScript, React 18, Phaser 3.70, Vite, Capacitor
- **Infrastructure**: PostgreSQL 15, Redis 7, Nginx, Docker Compose
- **Monitoring**: Prometheus + Grafana
