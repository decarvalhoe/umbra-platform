# Game Logic API

Base URL: `http://localhost:8002`

## Endpoints

### POST /api/v1/combat/resolve
Resolve a combat turn with dual-weapon system and elemental combos.

### POST /api/v1/combat/calculate-damage
Pure damage calculation with element multipliers.

### GET /api/v1/gacha/pools
List available gacha pools.

### POST /api/v1/gacha/draw
Perform gacha draws with pity system (guaranteed legendary at 90).

### POST /api/v1/progression/calculate-xp
Calculate XP from run results.

### POST /api/v1/progression/level-up
Process level-up with stat increases.

### POST /api/v1/progression/talent-tree
Allocate talent points (Offense/Defense/Control trees).

### POST /api/v1/anomaly/evaluate
Anti-cheat evaluation (7 weighted checks).

### GET /health
Health check.
