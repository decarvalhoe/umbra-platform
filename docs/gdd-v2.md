# Game Design Document v2.0 — Project Umbra

## 1. Game Overview

**Genre:** Dark Fantasy Hack'n'Slash RPG / Idle / Rogue-lite
**Platform:** Web (desktop + mobile via Capacitor)
**Perspective:** Isometric top-down

### Core Loop

```
Hub → Dungeon Run → Combat → Extract/Die → Hub → Repeat
```

Players enter procedurally-generated dungeons, fight through combat rooms, collect loot, face bosses, and return to the hub with earned resources. Death loses run progress but keeps meta-progression. AI Director generates narrative events, quests, and dungeon layouts.

### Pillars
1. **One more run** — Short, intense dungeon runs (10-15 min) with meaningful rewards
2. **AI-driven narrative** — Every run feels unique through generated content
3. **Depth in simplicity** — Easy to start, deep to master (combo chains, elemental interactions, build diversity)

---

## 2. Shadow Warrior Class

The first playable class. Melee-focused dual-wielder with shadow/void affinity.

### Base Stats (Level 1)
| Stat | Value |
|------|-------|
| HP | 500 |
| Energy | 100 |
| ATK | 25 |
| DEF | 10 |
| Speed | 100 |
| Crit Rate | 5% |
| Crit Damage | 150% |

### Stats Per Level
+15 HP, +2 ATK, +1 DEF, +3 Energy per level.

### Active Skills (6)

| # | Skill | Element | Type | Damage | Cooldown | Cost | Unlock | Effect |
|---|-------|---------|------|--------|----------|------|--------|--------|
| 1 | Shadow Strike | Shadow | Melee AoE | 150% ATK | 8s | 25 energy | Lv1 | Weaken -20% ATK for 4s |
| 2 | Void Dash | Void | Teleport + Damage | 100% ATK | 12s | 30 energy | Lv3 | Tear -25% DEF for 4s |
| 3 | Blood Frenzy | Blood | Self Buff | — | 20s | 20 energy | Lv5 | +30% ATK, +20% speed for 8s; self-bleed 2% HP/s |
| 4 | Flame Burst | Fire | Point-blank AoE | 200% ATK | 5s | 20 energy | Lv7 | Burn 5% HP/s for 3s |
| 5 | Crimson Shield | Blood | Self Shield | — | 15s | 35 energy | Lv10 | Absorb 300 damage for 5s, reflect 50% |
| 6 | Umbral Blade | Shadow | Single Target | 400% ATK | 25s | Full combo | Lv15 | Weaken -35% ATK for 6s |

### Weapon System
- **Main weapon:** Sword (1.0x speed, balanced damage)
- **Secondary weapon:** Dagger (1.5x speed, 0.7x damage)
- **Dual-wield combo:** 4-hit chain (sword-sword-dagger-dagger), +15% damage on 4th hit
- Combo meter fills on hits; full meter unlocks Umbral Blade

### Dodge System
- **Duration:** 0.3s animation, 0.2s invulnerability (i-frames)
- **Charges:** 2, recharge 3s each
- **Distance:** 150px in movement direction

---

## 3. Enemy Bestiary

### Status Effects
| Element | Status | Duration | Effect |
|---------|--------|----------|--------|
| Fire | Burn | 3s | 5% HP/s DoT |
| Shadow | Weaken | 4s | -20% ATK |
| Blood | Bleed | 5s | 3% HP/s + -50% healing |
| Void | Tear | 4s | -25% DEF |

### Enemies

| Enemy | HP | ATK | DEF | Speed | Element | AI | XP | Cendres |
|-------|-----|-----|-----|-------|---------|-----|-----|---------|
| Shadow Wraith | 100 | 15 | 5 | 80 | Shadow | Chase | 10 | 5 |
| Blood Wraith | 150 | 20 | 8 | 70 | Blood | Aggressive | 15 | 8 |
| Fire Imp | 80 | 25 | 3 | 100 | Fire | Kite | 12 | 7 |
| Void Sentinel | 200 | 10 | 15 | 50 | Void | Tactical | 20 | 12 |
| Corruption Spawn | 60 | 30 | 2 | 120 | Shadow | Swarm (3-5) | 5 | 3 |

### AI Behaviors
- **Chase:** Move directly toward player, attack at melee range, short retreat after hit
- **Aggressive:** Move toward player, alternate melee attacks, no retreat, bleed on hit
- **Kite:** Maintain 200px distance, fire projectiles, dash away if player closes in
- **Tactical:** Hold position, fire ranged attacks, teleport behind player periodically
- **Swarm:** Spawn in groups of 3-5, rush player simultaneously, low individual threat

---

## 4. Boss Specification

### Corrupted Guardian (Zone: Shadow Crypts)
- **HP:** 2000 | **ATK:** 35 | **DEF:** 20 | **Element:** Shadow
- **Phase 1 (100-60% HP) — Awakening:** Ground Slam (AoE, 2.0x, 1s telegraph) + Shadow Bolt (projectile, 1.5x)
- **Phase 2 (60-25% HP) — Corruption Surge:** +Corruption Wave (cone, 1.2x), summons 3 Corruption Spawns
- **Phase 3 (<25% HP) — Death Throes:** Enrage (+50% ATK, +30% speed), +Umbral Eruption (room-wide, 4.0x, 2s telegraph)
- **Loot:** Guardian Core (guaranteed), Shadow Blade (25%), 50-100 Cendres, 3-5 Void Fragments

### Flame Tyrant (Zone: Ashen Wastes)
- **HP:** 2500 | **ATK:** 40 | **DEF:** 15 | **Element:** Fire
- **Phase 1 (100-55% HP) — Smoldering:** Flame Pillar (ground target, 2.0x, burn) + Magma Spit (projectile, 1.5x)
- **Phase 2 (55-20% HP) — Inferno:** +Magma Pool (persistent AoE, 5s, burn), +Fire Charge (dash, 3.0x), 3x Flame Pillars
- **Phase 3 (<20% HP) — Supernova:** Enrage (+40% ATK), Inferno Breath (cone, 2.0x, burn), Eruption (room-wide, 5.0x, 2.5s telegraph), 5x Flame Pillars
- **Loot:** Tyrant Crown (guaranteed), Inferno Blade (20%), 75-150 Cendres, 5-8 Fire Essence

### Void Harbinger (Zone: Void Rift)
- **HP:** 3000 | **ATK:** 30 | **DEF:** 25 | **Element:** Void
- **Phase 1 (100-65% HP) — Incursion:** Void Rift (ground target, 1.8x, tear) + Gravity Well (pull AoE, 1.0x)
- **Phase 2 (65-30% HP) — Dimensional Collapse:** +Reality Tear (line, 3.0x, tear), +Phase Shift (teleport behind), summons 2 Void Sentinels
- **Phase 3 (<30% HP) — Annihilation:** Enrage (+60% ATK), Void Collapse (room-wide, 6.0x, 3s telegraph, tear), 2x Reality Tears
- **Loot:** Harbinger Eye (guaranteed), Reality Render (15%), 100-200 Cendres, 8-12 Void Fragments, 1-3 Oblivion Shards

---

## 5. Dungeon Room Templates (10 Archetypes)

| # | Room | Description | Content |
|---|------|-------------|---------|
| 1 | Start Room | Safe zone, run briefing | Quest objective display, corruption level 0 |
| 2 | Combat Room (Easy) | Basic enemies | 3-4 Shadow Wraiths or 2 Fire Imps |
| 3 | Combat Room (Medium) | Mixed enemies | 2 Blood Wraiths + 3 Corruption Spawns |
| 4 | Combat Room (Hard) | Elite enemies | 1 Void Sentinel + 2 Blood Wraiths + 5 Corruption Spawns |
| 5 | Treasure Room | Loot chest | 1 guaranteed rare+ item, 20-50 Cendres, possible trap |
| 6 | Event Room | AI-generated narrative | Choice with consequences (buff/debuff/loot/corruption) |
| 7 | Shop Room | Wandering merchant | 4 items for sale (weapons, potions, rune cards) |
| 8 | Trap Room | Environmental hazards | Spike floors, poison gas, falling rocks; loot if survived |
| 9 | Mini-boss Room | Elite encounter | 1 elite enemy with 3x HP and unique ability |
| 10 | Boss Room | Zone boss fight | 1 boss, no exit until defeated or player dies |

### Dungeon Generation Rules
- **Length:** 5-10 rooms per run
- **Structure:** Start → 3-8 middle rooms → Boss
- **Room weights:** Combat 50%, Treasure 15%, Event 15%, Shop 10%, Trap 10%
- **Branching:** 20% chance of optional side path (1-2 rooms)
- **Corruption:** +5-15 per room (increases enemy damage and spawn count)

---

## 6. Idle Systems

### Automated Forge
- Craft equipment from materials gathered in runs
- **Timers:** Common (30min), Rare (2h), Epic (8h), Legendary (24h)
- **Slots:** 2 base, +1 per 10 player levels (max 5)
- **Daily cap:** 10 crafts/day

### Pet Expeditions
- Send companion pets to gather resources autonomously
- **Durations:** Quick (1h, low reward), Standard (4h), Extended (8h, best reward)
- **Slots:** 1 base, +1 per 20 player levels (max 3)
- **Rewards:** Cendres, crafting materials, elemental essences

### Daily Login
- 7-day cycle with escalating rewards
- Day 7: guaranteed Epic item or 500 Cendres

---

## 7. Social Systems — Clans

### Structure
- Create/join via Nakama groups (max 50 members)
- **Roles:** Leader, Officer (5 max), Member
- Clan reputation earned by member contributions (runs completed, bosses killed, contracts fulfilled)

### Reputation Tiers
| Tier | Reputation | Perks |
|------|-----------|-------|
| 1 — Gathering | 0 | Clan chat, basic stash (10 slots) |
| 2 — Rising | 500 | +10% XP for all members, stash +10 slots |
| 3 — Established | 2000 | +5% loot quality, clan banner customization |
| 4 — Renowned | 5000 | +15% XP, exclusive clan missions, stash +20 |
| 5 — Legendary | 15000 | +10% loot, +20% XP, exclusive cosmetics, 50-slot stash |

### Weekly Contracts
- AI Director generates 3 contracts per week for each clan
- Examples: "Defeat 100 Fire enemies", "Complete 20 dungeon runs", "Collect 500 Shadow Essence"
- Rewards: clan reputation + Cendres for all participants

---

## 8. Progression System

### XP & Leveling
- **Formula:** XP needed = level * 100
- **Sources:** Enemy kills (5-20 XP), room clears (25-50 XP), boss kills (100-200 XP), quest completion (50-150 XP)
- **Level cap:** 100 (for launch)

### Talent Trees (3 branches, 5 nodes each)

**Offense Tree:**
| Node | Name | Cost | Requires | Effect |
|------|------|------|----------|--------|
| 1 | Sharpened Edge | 1 pt | — | +10% Attack Damage |
| 2 | Keen Eye | 1 pt | Node 1 | +5% Critical Chance |
| 3 | Relentless Combo | 2 pts | Node 1 | +15% Combo Damage |
| 4 | Arcane Surge | 2 pts | Node 2 | +20% Skill Damage |
| 5 | Blade Storm | 3 pts | Nodes 3+4 | +25% Attack Speed |

**Defense Tree:**
| Node | Name | Cost | Requires | Effect |
|------|------|------|----------|--------|
| 1 | Thick Skin | 1 pt | — | +10% Max HP |
| 2 | Iron Will | 1 pt | Node 1 | +15% DEF |
| 3 | Regeneration | 2 pts | Node 1 | +1% HP/s out of combat |
| 4 | Evasion | 2 pts | Node 2 | +10% Dodge chance |
| 5 | Undying | 3 pts | Nodes 3+4 | Survive lethal hit at 1 HP once per run |

**Control Tree:**
| Node | Name | Cost | Requires | Effect |
|------|------|------|----------|--------|
| 1 | Energy Flow | 1 pt | — | +20% Energy regeneration |
| 2 | Extended Effects | 1 pt | Node 1 | +25% Status effect duration |
| 3 | Cooldown Mastery | 2 pts | Node 1 | -15% Skill cooldowns |
| 4 | Elemental Affinity | 2 pts | Node 2 | +20% Elemental damage |
| 5 | Corruption Resist | 3 pts | Nodes 3+4 | -30% Corruption gain per room |

---

## 9. Economy

### Currencies
| Currency | Source | Sink | Cap |
|----------|--------|------|-----|
| **Cendres** (soft) | Enemy drops, chests, quests | Shop, forge, talent respec | No cap |
| **Void Fragments** (medium) | Boss drops, expeditions | Epic+ crafting, rune upgrades | 999 |
| **Oblivion Shards** (premium) | Gacha, battle pass, rare bosses | Gacha pulls, premium cosmetics | No cap |

### Earn Rates (per 15-min run)
- Average run: 30-80 Cendres, 0-3 Void Fragments
- Boss kill: +50-200 Cendres, 3-12 Void Fragments
- Weekly quest completion: 200-500 Cendres

### Gacha
- **Standard banner:** Soft pity at pull 75, guaranteed Epic at 10 pulls
- **Themed banner:** Rotating 2-week cycles, featured legendary at 1% base rate
- **Cost:** 1 Oblivion Shard per pull, 10 for multi-pull (guaranteed rare+)
- **Rates:** Common 70%, Rare 20%, Epic 8%, Legendary 2%

### Battle Pass (per season, 12 weeks)
- **Free track:** 50 tiers, basic rewards (Cendres, materials, 1 Epic item)
- **Premium track:** 100 tiers, exclusive cosmetics, more Oblivion Shards, 2 Legendary items
- **XP sources:** Daily quests (3/day), weekly quests (5/week), run completion
