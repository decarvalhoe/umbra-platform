# Enemy Bestiary — GDD v2.0

> Reference document for all enemy implementations in Umbra.
> Each entry provides stats, AI behavior, attack patterns, loot, and art direction notes.

---

## Table of Contents

1. [Conventions](#conventions)
2. [Zone 1 — Cendres Desolees (Ashen Wastes)](#zone-1--cendres-desolees-ashen-wastes)
   - [Spectre de Cendre (Ash Specter)](#spectre-de-cendre-ash-specter)
   - [Chien de Braise (Ember Hound)](#chien-de-braise-ember-hound)
   - [Sentinelle Calcinee (Scorched Sentinel)](#sentinelle-calcinee-scorched-sentinel)
   - [Gardien Corrompu (Corrupted Guardian) — BOSS](#gardien-corrompu-corrupted-guardian--boss)
3. [Zone 2 — Cryptes d'Ombre (Shadow Crypts)](#zone-2--cryptes-dombre-shadow-crypts)
   - [Spectre d'Ombre (Shadow Wraith)](#spectre-dombre-shadow-wraith)
   - [Araignee Nocturne (Night Spider)](#araignee-nocturne-night-spider)
   - [Chevalier Dechu (Fallen Knight)](#chevalier-dechu-fallen-knight)
4. [Zone 3 — Profondeurs Carmines (Crimson Depths)](#zone-3--profondeurs-carmines-crimson-depths)
   - [Sangsue Geante (Giant Leech)](#sangsue-geante-giant-leech)
   - [Pretre de Sang (Blood Priest)](#pretre-de-sang-blood-priest)
5. [Zone 4 — Faille du Neant (Void Rift)](#zone-4--faille-du-neant-void-rift)
   - [Anomalie du Neant (Void Anomaly)](#anomalie-du-neant-void-anomaly)
   - [Tisseur de Neant (Void Weaver)](#tisseur-de-neant-void-weaver)
6. [General / Multi-zone](#general--multi-zone)
   - [Rat d'Umbra (Umbra Rat)](#rat-dumbra-umbra-rat)
   - [Mimic (Mimic)](#mimic-mimic)
7. [Stat Scaling Table](#stat-scaling-table)
8. [Pack Behavior Rules](#pack-behavior-rules)
9. [Elemental Resistance Matrix](#elemental-resistance-matrix)

---

## Conventions

### Stat Definitions

| Stat | Description |
|------|-------------|
| **HP** | Hit points. Reaches 0 = death. |
| **ATK** | Base attack damage (before resistances). |
| **DEF** | Flat damage reduction applied before HP loss. |
| **Speed** | Movement speed in pixels/second. |
| **Detection Range** | Radius (px) at which the enemy transitions from Idle/Patrol to Alert/Chase. |
| **Attack Range** | Distance (px) at which the enemy can initiate an attack action. |

### Timing Notation

All attack timings use milliseconds (ms):
- **Telegraph**: Visual/audio cue before the hit lands. Player reaction window.
- **Active**: Frames where the hitbox is live and deals damage.
- **Recovery**: Post-attack cooldown before the enemy can act again.
- **Cooldown**: Minimum time before the same attack can be used again.

### Enemy Types

| Type | Description |
|------|-------------|
| **Basic** | Common fodder. Low HP, simple patterns. Appears in packs. |
| **Elite** | Tougher enemies with more complex AI and unique mechanics. |
| **Mini-boss** | Mid-dungeon threats. May gate progression. |
| **Boss** | Zone-ending encounters. Multi-phase, scripted arenas. |
| **Special** | Unique behavior that does not fit other categories. |

### Loot Rarity Tiers

| Tier | Color | Drop Weight |
|------|-------|-------------|
| Common | White | Base rate |
| Uncommon | Green | 0.5x base |
| Rare | Blue | 0.1x base |
| Epic | Purple | 0.02x base |

---

## Zone 1 — Cendres Desolees (Ashen Wastes)

**Theme:** Fire, ash, devastation. A scorched landscape with smoldering ruins and rivers of cooling lava.

---

### Spectre de Cendre (Ash Specter)

| Field | Value |
|-------|-------|
| **Type** | Basic |
| **Element** | Fire |
| **Zone(s)** | Cendres Desolees (floors 1-5) |

#### Base Stats

| HP | ATK | DEF | Speed |
|----|-----|-----|-------|
| 80 | 18 | 4 | 90 px/s |

| Detection Range | Attack Range |
|-----------------|--------------|
| 250 px | 200 px |

#### AI Behavior

The Ash Specter floats above the ground in a slow patrol pattern, drifting between preset waypoints. On detecting the player, it stops and begins channeling fireballs from a distance. It prefers to maintain its attack range and will retreat if the player closes to melee distance. If cornered (no valid retreat path), it switches to a rapid-fire burst before attempting a phase-through escape (passes through the player with brief invincibility).

**FSM States:** Patrol -> Alert -> Attack (ranged) -> Retreat -> Cornered Burst -> Flee

#### Attack Patterns

| Attack | Telegraph | Active | Recovery | Cooldown | Damage | Range | Notes |
|--------|-----------|--------|----------|----------|--------|-------|-------|
| Fireball | 600 ms (glow charge) | 100 ms (projectile launch) | 400 ms | 1500 ms | 18 ATK | 200 px (projectile travels 350 px) | Single target, straight line. Burns on hit. |
| Rapid Burst | 300 ms (flicker) | 3x 100 ms (3 fireballs at 200 ms intervals) | 800 ms | 4000 ms | 12 ATK each | 180 px | Used only when cornered. Fan spread 15 deg. |
| Phase Escape | 200 ms (transparency shift) | 500 ms (dash through player) | 600 ms | 8000 ms | 0 | 120 px dash | Invincible during active frames. Repositions behind player. |

#### Status Effects Applied

| Effect | Duration | Description |
|--------|----------|-------------|
| Burn | 3s | 4 damage/tick every 1s. Stacks up to 3x. |

#### Loot Table

| Item | Rarity | Drop Rate |
|------|--------|-----------|
| Ash Dust | Common | 60% |
| Ember Shard | Uncommon | 20% |
| Spectral Flame Essence | Rare | 5% |
| Gold | — | 10-25 gold |

#### Weakness / Resistance

| Element | Modifier |
|---------|----------|
| Water | 1.5x damage taken (Weakness) |
| Ice | 1.3x damage taken |
| Fire | 0.0x damage taken (Immune) |
| Shadow | 1.0x (Neutral) |
| Void | 1.0x (Neutral) |
| Physical | 0.7x damage taken (Resistant) |

#### Visual Description

A translucent humanoid silhouette made of swirling ash and glowing embers. No distinct facial features — two orange-white ember points serve as eyes. Its body constantly sheds ash particles that fall and dissolve before reaching the ground. When charging a fireball, the ember-eyes intensify to bright white and the ash swirl concentrates into its outstretched hand. Approximately 1.2x player height. Faint heat distortion aura around its form.

---

### Chien de Braise (Ember Hound)

| Field | Value |
|-------|-------|
| **Type** | Basic |
| **Element** | Fire |
| **Zone(s)** | Cendres Desolees (floors 1-6) |

#### Base Stats

| HP | ATK | DEF | Speed |
|----|-----|-----|-------|
| 60 | 22 | 3 | 160 px/s |

| Detection Range | Attack Range |
|-----------------|--------------|
| 300 px | 40 px |

#### AI Behavior

The Ember Hound is a fast melee attacker that operates with **pack behavior** (see [Pack Behavior Rules](#pack-behavior-rules)). It patrols in groups of 2-4. On detecting the player, the pack coordinates: one hound charges directly while others attempt to flank from the sides. Individually, a hound will dash toward the player, bite, then circle-strafe before lunging again. If HP drops below 25%, it howls (buffing nearby hounds with +15% ATK for 5s) and becomes more aggressive (reduced cooldowns by 30%).

**FSM States:** Pack Patrol -> Alert (howl to pack) -> Chase -> Flank/Circle -> Lunge Attack -> Low HP Howl -> Frenzy

#### Attack Patterns

| Attack | Telegraph | Active | Recovery | Cooldown | Damage | Range | Notes |
|--------|-----------|--------|----------|----------|--------|-------|-------|
| Bite | 300 ms (jaw opening animation) | 150 ms | 350 ms | 1200 ms | 22 ATK | 40 px | Fast melee. Small forward lunge. |
| Lunge | 500 ms (crouch + growl) | 200 ms (dash 120 px) | 500 ms | 2500 ms | 28 ATK | 120 px dash | Closing gap attack. Can be dodged sideways. |
| Fire Snap | 400 ms (ember buildup in jaw) | 100 ms | 300 ms | 3000 ms | 15 ATK + Burn | 50 px | Applies Burn. Used after 2 consecutive Bites. |
| Pack Howl | 800 ms (head tilt up) | 300 ms | 200 ms | 10000 ms | 0 | 200 px radius buff | Buffs nearby hounds +15% ATK for 5s. Used at <25% HP. |

#### Status Effects Applied

| Effect | Duration | Description |
|--------|----------|-------------|
| Burn (Fire Snap only) | 2s | 3 damage/tick every 1s. |

#### Loot Table

| Item | Rarity | Drop Rate |
|------|--------|-----------|
| Charred Bone | Common | 55% |
| Ember Fang | Uncommon | 18% |
| Hound Pelt (Scorched) | Rare | 4% |
| Gold | — | 8-18 gold |

#### Weakness / Resistance

| Element | Modifier |
|---------|----------|
| Water | 1.5x (Weakness) |
| Ice | 1.3x |
| Fire | 0.0x (Immune) |
| Shadow | 1.0x |
| Void | 1.0x |
| Physical | 1.0x (Neutral) |

#### Visual Description

A wolf-sized canine made of cracked black rock with glowing magma seams visible between the fissures. Its eyes are molten orange. Embers trail from its paws as it runs. When it howls, the magma seams flare bright and small flames erupt along its spine. Lean, aggressive posture — always coiled to spring. Approximately 0.6x player height at the shoulder.

---

### Sentinelle Calcinee (Scorched Sentinel)

| Field | Value |
|-------|-------|
| **Type** | Elite |
| **Element** | Fire |
| **Zone(s)** | Cendres Desolees (floors 3-6) |

#### Base Stats

| HP | ATK | DEF | Speed |
|----|-----|-----|-------|
| 280 | 35 | 18 | 55 px/s |

| Detection Range | Attack Range |
|-----------------|--------------|
| 200 px | 80 px (melee), 160 px (AoE) |

#### AI Behavior

The Scorched Sentinel is a slow, heavily armored enemy that guards key chokepoints. It does not patrol — it stands motionless until the player enters its detection range. Once active, it advances steadily and uses ground-slam AoE attacks to control space. It alternates between melee shield bash (pushing the player back) and ground slam (AoE zone denial). If the player stays at range, it will use a magma eruption that creates lingering fire zones on the ground. The Sentinel has a **shield mechanic**: its frontal DEF is doubled (36 effective) when facing the player. Attacking from behind deals normal damage.

**FSM States:** Dormant -> Activate (stand up animation 1.5s) -> Advance -> Shield Bash / Ground Slam / Magma Eruption -> Reposition

#### Attack Patterns

| Attack | Telegraph | Active | Recovery | Cooldown | Damage | Range | Notes |
|--------|-----------|--------|----------|----------|--------|-------|-------|
| Shield Bash | 500 ms (shield raise) | 200 ms | 600 ms | 2000 ms | 25 ATK | 80 px frontal cone 60 deg | Knockback 100 px. Stuns 500 ms. |
| Ground Slam | 1000 ms (fist raised, ground cracks glow) | 300 ms | 800 ms | 3500 ms | 40 ATK | 160 px circular AoE | Shockwave ring. Jump to avoid. |
| Magma Eruption | 1200 ms (ground glows at target location) | 500 ms | 600 ms | 5000 ms | 20 ATK + Burn | 120 px zone at target | Creates 80 px fire zone lasting 4s (10 dmg/s). |
| Stomp | 300 ms (foot raise) | 100 ms | 400 ms | 1500 ms | 15 ATK | 60 px small AoE | Quick interrupt attack when player is very close. |

#### Status Effects Applied

| Effect | Duration | Description |
|--------|----------|-------------|
| Burn (Magma Eruption) | 3s | 5 damage/tick every 1s. |
| Stun (Shield Bash) | 500 ms | Player cannot act. |
| Knockback (Shield Bash) | Instant | Pushed 100 px away from Sentinel. |

#### Loot Table

| Item | Rarity | Drop Rate |
|------|--------|-----------|
| Scorched Iron Plate | Common | 45% |
| Sentinel Core (Molten) | Uncommon | 22% |
| Obsidian Shield Fragment | Rare | 8% |
| Infernal Guard Helm | Epic | 2% |
| Gold | — | 30-65 gold |

#### Weakness / Resistance

| Element | Modifier |
|---------|----------|
| Water | 1.3x (Weakness) |
| Ice | 1.2x |
| Fire | 0.0x (Immune) |
| Shadow | 1.0x |
| Void | 1.2x |
| Physical | 0.6x (Resistant — armored) |

#### Visual Description

A massive humanoid figure (2x player height) encased in blackened, cracked plate armor fused to its body. Molten orange light pulses through the armor seams like a slow heartbeat. One arm ends in a fused tower shield of volcanic rock; the other is a gauntlet-fist. Its helmet has a single horizontal visor slit glowing with intense heat. When it activates from dormancy, its visor ignites and ash cascades off its shoulders. Slow, deliberate movements — each step leaves a brief scorch mark.

---

### Gardien Corrompu (Corrupted Guardian) — BOSS

| Field | Value |
|-------|-------|
| **Type** | Boss |
| **Element** | Fire + Void (Phase 2+) |
| **Zone(s)** | Cendres Desolees (floor 6 — boss arena) |

#### Base Stats

| HP | ATK | DEF | Speed |
|----|-----|-----|-------|
| 2500 | 45 | 22 | 70 px/s |

| Detection Range | Attack Range |
|-----------------|--------------|
| Arena-wide (auto-aggro) | 120 px (melee), 300 px (ranged) |

#### Arena

Circular arena, 800 px diameter. Four destructible pillars at cardinal points (200 HP each) that can be used as cover against breath attacks. Pillars do not respawn. Lava border deals 30 damage/s on contact.

#### AI Behavior — Overview

The Corrupted Guardian is a 3-phase boss that transitions based on HP thresholds. It combines heavy melee attacks with fire-based AoE and, in later phases, Void abilities. The boss has **no flee state** — it fights until death. Between phases, it performs a 2s invincible roar animation (phase transition telegraph) during which the arena changes.

---

#### Phase 1 — Fire Warden (100%-60% HP)

**Behavior:** Methodical and aggressive. The Guardian advances toward the player and uses a mix of melee slams and mid-range fire attacks. It prioritizes Ground Slam when the player is within melee range and Fire Breath when the player kites at range. Between attacks, it slowly stalks the player. Uses Charge to close gaps if the player stays beyond 200 px for more than 3s.

**Phase Transition at 60% HP:** The Guardian roars (2s invincible), Void cracks appear across its body and the arena floor. Two Void portals open in the arena.

| Attack | Telegraph | Active | Recovery | Cooldown | Damage | Range | Notes |
|--------|-----------|--------|----------|----------|--------|-------|-------|
| Ground Slam | 1000 ms (raises both fists, ground cracks glow beneath player) | 500 ms (impact + shockwave) | 700 ms | 3000 ms | 50 ATK | 200 px circular AoE centered on impact | Telegraphed by glowing ground cracks at target position. Dodgeable. |
| Charge | 800 ms (lowers shoulder, scrapes ground, sparks) | 400 ms (dash 400 px) | 1000 ms | 5000 ms | 55 ATK | 400 px line, 60 px width | Travels in straight line. Destroys pillars on contact. Stuns self 1s if hits arena wall. |
| Fire Breath | 600 ms (inhales, chest glows) | 3000 ms (continuous channel, sweeping cone) | 800 ms | 6000 ms | 15 ATK/tick (5 ticks over 3s) | 300 px cone, 90 deg sweep | Sweeps left-to-right (or right-to-left). Pillars block it. Burns. Player can circle behind. |
| Backhand Swipe | 300 ms (arm winds back) | 150 ms | 400 ms | 1500 ms | 35 ATK | 100 px frontal arc 120 deg | Quick melee punish for players who stay in melee too long. Knockback 80 px. |

---

#### Phase 2 — Void Corruption (60%-30% HP)

**Behavior:** The Guardian gains Void abilities. Its attacks become faster (all cooldowns reduced by 20%). It alternates between Fire and Void attacks. Every 15s, it summons 2 Ash Specters from Void portals (max 4 Specters alive at once). It gains Teleport-Slam: instead of walking to the player, it can short-range teleport (200 px) and immediately slam. Void cracks on the floor deal 5 damage/s if the player stands on them.

**Phase Transition at 30% HP:** The Guardian screams, all summoned Specters die instantly, Void energy implodes inward. The arena darkens. Continuous Void pulse begins.

| Attack | Telegraph | Active | Recovery | Cooldown | Damage | Range | Notes |
|--------|-----------|--------|----------|----------|--------|-------|-------|
| Ground Slam | 800 ms | 500 ms | 560 ms | 2400 ms | 50 ATK (Fire+Void) | 200 px AoE | Same as P1 but faster and now dual-element. |
| Charge | 640 ms | 400 ms | 800 ms | 4000 ms | 55 ATK | 400 px line | Faster windup. Leaves Void trail (3s, 8 dmg/s). |
| Fire Breath | 480 ms | 3000 ms | 640 ms | 4800 ms | 15 ATK/tick | 300 px cone | Faster startup and shorter cooldown. |
| Teleport-Slam | 400 ms (Void shimmer at current location) | 200 ms (teleport) + 500 ms (slam) | 700 ms | 5000 ms | 55 ATK | 200 px teleport + 180 px AoE | New attack. Teleports near player, immediate AoE slam. |
| Void Orb | 700 ms (dark sphere forms in hand) | 300 ms (projectile launch) | 500 ms | 3500 ms | 30 ATK | 350 px range, 60 px blast radius | New ranged attack. Slow-moving homing projectile (80 px/s). Explodes on contact. |
| Summon Specters | 1500 ms (portals pulse) | 500 ms | 0 ms | 15000 ms | 0 | Arena-wide | Spawns 2 Ash Specters from Void portals. Max 4 alive. |

---

#### Phase 3 — Berserk Annihilation (30%-0% HP)

**Behavior:** All summons die. The Guardian enters Berserk mode. All attacks deal Fire+Void damage. Continuous AoE Void pulses emanate from the Guardian every 2s (arena-wide, unavoidable, 10 damage each — a DPS race). No more summons. The Guardian gains +30% ATK and loses -30% DEF (15.4 effective DEF). It attacks relentlessly with minimal downtime, chaining attacks with only recovery frames between them (no idle stalking). Prioritizes Teleport-Slam and Charge to keep pressure on the player.

| Attack | Telegraph | Active | Recovery | Cooldown | Damage | Range | Notes |
|--------|-----------|--------|----------|----------|--------|-------|-------|
| Ground Slam | 600 ms | 400 ms | 450 ms | 1800 ms | 65 ATK (Fire+Void) | 220 px AoE | Faster, larger, harder hitting. |
| Charge | 500 ms | 350 ms | 700 ms | 3000 ms | 72 ATK | 400 px line | Berserk speed. Void trail 4s. |
| Teleport-Slam | 300 ms | 150 ms + 400 ms | 500 ms | 3500 ms | 72 ATK | 200 px tp + 200 px AoE | Near-instant teleport. |
| Fire+Void Breath | 400 ms | 2500 ms | 600 ms | 4000 ms | 20 ATK/tick (5 ticks) | 300 px cone | Dual element. Faster sweep. |
| Void Pulse | None (continuous) | 200 ms | 0 ms | 2000 ms (auto) | 10 ATK | Arena-wide | Unavoidable tick damage. DPS race mechanic. |
| Desperation Slam | 1500 ms (jumps to arena center, massive charge-up) | 800 ms | 2000 ms | 20000 ms | 90 ATK | 350 px AoE from center | Used once at 10% HP. Destroys all remaining pillars. |

#### Status Effects Applied (All Phases)

| Effect | Source | Duration | Description |
|--------|--------|----------|-------------|
| Burn | Fire Breath, Fire+Void Breath | 4s | 6 damage/tick every 1s. |
| Void Corruption | Void Orb, Teleport-Slam, Void Trail | 3s | -15% player speed, -10% player ATK. |
| Knockback | Charge, Backhand Swipe | Instant | Pushed 80-120 px. |
| Stun (self) | Charge (wall hit) | 1000 ms | Guardian stunned if Charge hits arena wall. Exploit window. |

#### Loot Table

| Item | Rarity | Drop Rate |
|------|--------|-----------|
| Guardian's Molten Core | Guaranteed | 100% |
| Corrupted Void Shard | Uncommon | 40% |
| Infernal Guardian Greaves | Rare | 15% |
| Flame of the Fallen (weapon material) | Rare | 12% |
| Void-Touched Aegis (shield) | Epic | 5% |
| Guardian's Ember Crown (helmet) | Epic | 3% |
| Gold | — | 200-500 gold |

#### Weakness / Resistance

| Element | Modifier |
|---------|----------|
| Water | 1.3x (Weakness) |
| Ice | 1.2x |
| Fire | 0.0x (Immune) |
| Shadow | 0.8x (Resistant) |
| Void | 0.5x (Highly Resistant — Phase 2+: Immune) |
| Physical | 0.8x (Resistant) |

#### Visual Description

A towering armored knight (2.5x player height) that was once a noble guardian, now twisted by Void corruption. Phase 1: Blackened plate armor with molten cracks, similar to the Sentinelle but grander. A tattered burning cape. Helm with two glowing orange eye slits and curved horns. Wields a massive two-handed mace fused with volcanic rock.

Phase 2: Purple-black Void fissures rip across the armor. One eye turns from orange to deep violet. The mace crackles with alternating fire and Void energy. Void tendrils seep from the joints of the armor. The cape disintegrates into floating ash and shadow particles.

Phase 3: The armor is half-shattered, revealing a body of pure molten fire shot through with Void veins. Both eyes burn violet-white. The mace is wreathed in a spiraling vortex of flame and Void. Continuous dark energy pulses ripple outward from the Guardian. The ground around its feet is permanently scorched and cracked with Void light.

---

## Zone 2 — Cryptes d'Ombre (Shadow Crypts)

**Theme:** Darkness, stealth, undeath. Ancient catacombs shrouded in perpetual shadow with flickering magical torches and crumbling stone.

---

### Spectre d'Ombre (Shadow Wraith)

| Field | Value |
|-------|-------|
| **Type** | Basic |
| **Element** | Shadow |
| **Zone(s)** | Cryptes d'Ombre (floors 1-5) |

#### Base Stats

| HP | ATK | DEF | Speed |
|----|-----|-----|-------|
| 65 | 25 | 3 | 110 px/s |

| Detection Range | Attack Range |
|-----------------|--------------|
| 180 px | 50 px |

#### AI Behavior

The Shadow Wraith is an ambush predator. It exists in a **stealth state** by default — invisible to the player until it enters attack range or the player uses a light-based ability/item. When stealthed, it slowly creeps toward the player. Upon reaching attack range, it uncloaks with a brief shimmer (200 ms telegraph) and delivers a backstab for bonus damage. After the ambush, it fights in melee with quick slashes, periodically re-entering stealth if it takes no damage for 3s. It flees (re-stealth + reposition) if HP drops below 20%.

**FSM States:** Stealth Patrol -> Creep (toward player) -> Ambush Strike -> Melee Combat -> Re-Stealth (if undamaged 3s) -> Flee (low HP)

#### Attack Patterns

| Attack | Telegraph | Active | Recovery | Cooldown | Damage | Range | Notes |
|--------|-----------|--------|----------|----------|--------|-------|-------|
| Ambush Strike | 200 ms (shimmer uncloak) | 150 ms | 500 ms | N/A (once per stealth) | 40 ATK (bonus from stealth) | 50 px | First hit from stealth. 1.6x base ATK. Applies Shadow Mark. |
| Shadow Slash | 250 ms (arm drawn back) | 100 ms | 300 ms | 900 ms | 25 ATK | 50 px | Standard melee combo attack (2-hit chain possible). |
| Fade Step | 150 ms (body flickers) | 300 ms | 200 ms | 4000 ms | 0 | 100 px reposition | Short teleport to evade. Used reactively when hit. |
| Re-Stealth | 500 ms (dissolves into shadow) | 1000 ms (fading) | 0 ms | 8000 ms | 0 | — | Re-enters invisibility if undamaged for 3s. |

#### Status Effects Applied

| Effect | Duration | Description |
|--------|----------|-------------|
| Shadow Mark (Ambush Strike) | 5s | Marked player takes +10% Shadow damage from all sources. |

#### Loot Table

| Item | Rarity | Drop Rate |
|------|--------|-----------|
| Shadow Wisp | Common | 55% |
| Wraith Cloth | Uncommon | 20% |
| Shade Essence | Rare | 5% |
| Gold | — | 8-20 gold |

#### Weakness / Resistance

| Element | Modifier |
|---------|----------|
| Light/Holy | 1.8x (Major Weakness) |
| Fire | 1.3x |
| Shadow | 0.0x (Immune) |
| Physical | 0.5x (Resistant — incorporeal) |
| Void | 0.8x |
| Water | 1.0x |

#### Visual Description

A hunched, hooded figure made of dense shadow. When stealthed, it is completely invisible except for a very faint dark shimmer visible only on close inspection. When uncloaked, it appears as a dark robed form with no visible face — just deeper darkness under the hood. Two pale silvery pinpoints for eyes. Long shadowy claws extend from tattered sleeves. Its lower body trails off into wisps of shadow rather than having legs. Approximately 1x player height (hunched), 1.3x if it stands upright (which it never does).

---

### Araignee Nocturne (Night Spider)

| Field | Value |
|-------|-------|
| **Type** | Basic |
| **Element** | Shadow |
| **Zone(s)** | Cryptes d'Ombre (floors 2-5) |

#### Base Stats

| HP | ATK | DEF | Speed |
|----|-----|-----|-------|
| 55 | 20 | 5 | 130 px/s (ground), 100 px/s (wall) |

| Detection Range | Attack Range |
|-----------------|--------------|
| 220 px | 45 px (melee), 150 px (web) |

#### AI Behavior

The Night Spider is a wall-crawling enemy that uses terrain to its advantage. It can traverse walls and ceilings, dropping down on the player from above. Its primary strategy is to open with a Web Shot to slow the player, then close in for melee attacks. It prefers to stay on walls/ceilings when possible, making it harder to hit with horizontal attacks. When grounded, it skitters in unpredictable zigzag patterns. Spawns in groups of 2-3.

**FSM States:** Wall Patrol -> Detect -> Web Shot (from ceiling) -> Drop Attack -> Ground Melee -> Retreat to Wall -> Repeat

#### Attack Patterns

| Attack | Telegraph | Active | Recovery | Cooldown | Damage | Range | Notes |
|--------|-----------|--------|----------|----------|--------|-------|-------|
| Web Shot | 400 ms (abdomen glows) | 200 ms (projectile) | 300 ms | 3000 ms | 8 ATK | 150 px | Slows player. Can be used from wall/ceiling. |
| Drop Attack | 300 ms (shadow appears below on ground) | 250 ms (falling strike) | 400 ms | 4000 ms | 28 ATK | 60 px AoE on landing | Only from ceiling. Shadow telegraph on ground below. |
| Fang Strike | 200 ms (fangs extend) | 100 ms | 250 ms | 800 ms | 20 ATK | 45 px | Fast melee bite. 10% chance to apply Poison. |
| Skitter Dodge | 100 ms | 200 ms | 100 ms | 2000 ms | 0 | 80 px reposition | Reactive dodge. Zigzag movement. |

#### Status Effects Applied

| Effect | Duration | Description |
|--------|----------|-------------|
| Web Slow | 2.5s | -40% movement speed. Can be broken by dodge-rolling. |
| Poison (10% on Fang Strike) | 4s | 3 damage/tick every 1s. |

#### Loot Table

| Item | Rarity | Drop Rate |
|------|--------|-----------|
| Spider Silk Thread | Common | 50% |
| Night Venom Sac | Uncommon | 18% |
| Shadow Web Spinner | Rare | 4% |
| Gold | — | 6-15 gold |

#### Weakness / Resistance

| Element | Modifier |
|---------|----------|
| Fire | 1.5x (Weakness — burns webs) |
| Light/Holy | 1.3x |
| Shadow | 0.0x (Immune) |
| Physical | 1.0x |
| Void | 1.0x |
| Ice | 0.8x |

#### Visual Description

A spider roughly 0.5x player height with a body of matte black chitin that absorbs light. Eight legs with purple-tipped joints. Multiple small violet eyes arranged in two rows on its head. Its abdomen has a faintly luminescent purple pattern resembling a skull or rune. Silk strands trail behind it as it moves. When on walls/ceilings, it blends into the dark stone, only its eyes faintly visible. Web shots are dark purple, semi-transparent threads.

---

### Chevalier Dechu (Fallen Knight)

| Field | Value |
|-------|-------|
| **Type** | Elite |
| **Element** | Shadow |
| **Zone(s)** | Cryptes d'Ombre (floors 3-6) |

#### Base Stats

| HP | ATK | DEF | Speed |
|----|-----|-----|-------|
| 320 | 38 | 20 | 65 px/s |

| Detection Range | Attack Range |
|-----------------|--------------|
| 200 px | 90 px |

#### AI Behavior

The Fallen Knight is a tactical melee combatant with a **parry-counter mechanic**. It wields a cursed greatsword and fights with disciplined, deliberate attacks. Every 3rd player attack that hits the Knight, it will attempt a Parry (70% chance). A successful Parry negates the damage and triggers an immediate Counter Slash. The Knight telegraphs when it enters parry-ready stance (sword held vertically in front). Players should bait the parry, dodge, and punish during recovery. The Knight does not flee and fights to the death.

**FSM States:** Patrol -> Alert -> Approach -> Combat Stance -> Attack Combo / Parry Stance -> Counter Slash / Punish -> Reset Stance

#### Attack Patterns

| Attack | Telegraph | Active | Recovery | Cooldown | Damage | Range | Notes |
|--------|-----------|--------|----------|----------|--------|-------|-------|
| Greatsword Slash | 600 ms (sword raised over shoulder) | 200 ms | 500 ms | 1800 ms | 38 ATK | 90 px frontal arc 90 deg | Standard heavy melee. Can chain into Overhead. |
| Overhead Slam | 800 ms (sword raised high, both hands) | 300 ms | 700 ms | 2500 ms | 48 ATK | 80 px frontal, narrow | Follow-up to Slash. High damage, long recovery (punish window). |
| Shadow Thrust | 500 ms (sword pulled back, shadow trails) | 150 ms (lunge 100 px) | 600 ms | 3000 ms | 42 ATK | 100 px line | Lunging stab. Applies Shadow Mark. |
| Parry | 100 ms (reactive) | 300 ms (parry window) | 200 ms | Passive (every 3rd hit) | 0 | Self | 70% success chance. Negates damage. Auto-triggers Counter. |
| Counter Slash | 0 ms (immediate after Parry) | 200 ms | 400 ms | Linked to Parry | 50 ATK | 100 px wide arc 180 deg | Unavoidable if in range at parry trigger. Very high damage. |
| Dark Wave | 1000 ms (sword dragged along ground, shadow energy builds) | 400 ms (projectile wave) | 800 ms | 8000 ms | 30 ATK | 250 px line, 40 px width | Ranged shadow projectile. Used to punish excessive kiting. |

#### Status Effects Applied

| Effect | Duration | Description |
|--------|----------|-------------|
| Shadow Mark (Shadow Thrust) | 5s | +10% Shadow damage taken. |
| Guard Break (Counter Slash) | 3s | Player cannot block/parry. |

#### Loot Table

| Item | Rarity | Drop Rate |
|------|--------|-----------|
| Cursed Knight's Medal | Common | 40% |
| Shadow-Forged Steel | Uncommon | 25% |
| Fallen Knight's Greaves | Rare | 10% |
| Oath-Broken Greatsword (weapon) | Epic | 3% |
| Gold | — | 35-75 gold |

#### Weakness / Resistance

| Element | Modifier |
|---------|----------|
| Light/Holy | 1.5x (Weakness) |
| Fire | 1.2x |
| Shadow | 0.2x (Highly Resistant) |
| Physical | 0.7x (Resistant — armored) |
| Void | 1.0x |
| Water | 1.0x |

#### Visual Description

A once-noble knight now animated by shadow magic. Full plate armor in tarnished dark silver, covered in patches of black corrosion. The helm's visor is open, revealing nothing but swirling darkness and two glowing purple eye-points. A tattered dark purple tabard with an unrecognizable crest hangs over the chest plate. The greatsword is a blackened blade with shadow wisps constantly rising from its edge. Moves with an eerie mix of military precision and unnatural, jerky puppet-like motions. Approximately 1.4x player height.

---

## Zone 3 — Profondeurs Carmines (Crimson Depths)

**Theme:** Blood, organic horror, parasitism. Fleshy caverns with pulsing walls, pools of dark red liquid, and a thick oppressive atmosphere.

---

### Sangsue Geante (Giant Leech)

| Field | Value |
|-------|-------|
| **Type** | Basic |
| **Element** | Blood |
| **Zone(s)** | Profondeurs Carmines (floors 1-5) |

#### Base Stats

| HP | ATK | DEF | Speed |
|----|-----|-----|-------|
| 90 | 15 | 6 | 70 px/s (ground), 100 px/s (in blood pools) |

| Detection Range | Attack Range |
|-----------------|--------------|
| 160 px | 35 px |

#### AI Behavior

The Giant Leech is a melee enemy focused on life-drain. It lurks in blood pools (partially submerged, harder to spot) and emerges when the player passes nearby. On land, it is slow and vulnerable. In blood pools, it moves faster and regenerates 2 HP/s. Its primary attack latches onto the player, dealing continuous drain damage until shaken off (mash dodge to escape, 3 inputs). It prefers to ambush from pools and retreat to pools when damaged. Spawns in groups of 2-4.

**FSM States:** Submerged (in pool) -> Emerge -> Lunge -> Latch (drain) -> Detach -> Retreat to Pool / Ground Chase

#### Attack Patterns

| Attack | Telegraph | Active | Recovery | Cooldown | Damage | Range | Notes |
|--------|-----------|--------|----------|----------|--------|-------|-------|
| Lunge | 400 ms (body coils back) | 200 ms (spring forward 80 px) | 500 ms | 2000 ms | 15 ATK | 80 px lunge | Gap closer. If it connects, transitions to Latch. |
| Latch Drain | 0 ms (auto after Lunge hit) | Continuous (until shaken off) | 800 ms (after detach) | N/A | 8 ATK/tick every 500 ms + heals self 50% of damage | 0 px (attached) | Player must mash dodge (3 inputs) to detach. Heals the leech. |
| Blood Spit | 500 ms (head inflates) | 150 ms (projectile) | 400 ms | 3000 ms | 12 ATK | 120 px range | Ranged fallback when cannot close distance. Applies Bleed. |
| Burrow | 300 ms (digs into ground) | 800 ms (underground) | 300 ms (emerge) | 6000 ms | 0 | 150 px reposition | Repositioning move. Invulnerable while underground. |

#### Status Effects Applied

| Effect | Duration | Description |
|--------|----------|-------------|
| Bleed (Blood Spit) | 3s | 4 damage/tick every 1s. Not affected by DEF. |
| Life Drain (Latch) | Until shaken | 8 damage/0.5s, heals leech 50% of damage dealt. |

#### Loot Table

| Item | Rarity | Drop Rate |
|------|--------|-----------|
| Leech Viscera | Common | 55% |
| Coagulated Blood Gem | Uncommon | 18% |
| Parasitic Tendril | Rare | 5% |
| Gold | — | 6-18 gold |

#### Weakness / Resistance

| Element | Modifier |
|---------|----------|
| Fire | 1.5x (Weakness — dries out) |
| Light/Holy | 1.3x |
| Blood | 0.0x (Immune — absorbs blood) |
| Physical | 1.0x |
| Shadow | 0.8x |
| Ice | 1.2x (Weakness — slows metabolism) |

#### Visual Description

An oversized leech (0.8x player height when reared up, 1.5x player length when stretched out) with dark crimson, glistening skin. Its body is segmented with pulsing rings that constrict rhythmically. The mouth is a circular maw ringed with concentric rows of tiny hooked teeth. Small, vestigial eye-spots run in two lines along its head. When submerged in blood pools, only the top ridge of its back is visible as a slight ripple. When latched to the player, its body visibly swells and darkens.

---

### Pretre de Sang (Blood Priest)

| Field | Value |
|-------|-------|
| **Type** | Elite |
| **Element** | Blood |
| **Zone(s)** | Profondeurs Carmines (floors 3-6) |

#### Base Stats

| HP | ATK | DEF | Speed |
|----|-----|-----|-------|
| 250 | 28 | 10 | 60 px/s |

| Detection Range | Attack Range |
|-----------------|--------------|
| 280 px | 220 px (ranged), 50 px (melee) |

#### AI Behavior

The Blood Priest is a support-caster enemy that heals and buffs nearby allies. It is always accompanied by 2-3 other Blood-zone enemies. Its priority is: (1) Heal allies below 50% HP, (2) Apply Blood Frenzy buff to nearby allies, (3) Attack the player with ranged blood magic. It maintains maximum distance from the player and hides behind its allies. If all allies die, it becomes desperate and uses Blood Sacrifice (self-damage for powerful AoE). Killing the Priest first is the optimal strategy, but it positions to make this difficult.

**FSM States:** Support Position (behind allies) -> Heal Ally -> Buff Allies -> Ranged Attack -> Desperate (solo) -> Blood Sacrifice

#### Attack Patterns

| Attack | Telegraph | Active | Recovery | Cooldown | Damage | Range | Notes |
|--------|-----------|--------|----------|----------|--------|-------|-------|
| Blood Bolt | 500 ms (crimson glow at hands) | 200 ms (projectile) | 400 ms | 1800 ms | 28 ATK | 220 px | Homing projectile (slow tracking, 60 px/s turn rate). |
| Crimson Heal | 800 ms (red light connects to ally) | 1000 ms (channel) | 500 ms | 5000 ms | 0 (heals ally 60 HP) | 200 px to ally | Interruptible channel. Red beam connects to target ally. |
| Blood Frenzy (buff) | 600 ms (ritual gesture) | 300 ms | 400 ms | 12000 ms | 0 | 150 px radius, all allies | +20% ATK, +10% Speed to all nearby allies for 8s. |
| Blood Barrier | 400 ms (crosses arms) | Instant | 0 ms | 15000 ms | 0 | Self | Absorbs next 80 damage. Visible as crimson bubble shield. |
| Blood Sacrifice | 1500 ms (levitates, slashes own chest) | 500 ms | 1000 ms | 20000 ms | 45 ATK (costs self 50 HP) | 200 px AoE centered on self | Only used when alone (all allies dead). High risk/reward. |
| Staff Strike | 200 ms | 100 ms | 300 ms | 1000 ms | 15 ATK | 50 px | Weak melee panic attack if player gets in face. |

#### Status Effects Applied

| Effect | Duration | Description |
|--------|----------|-------------|
| Bleed (Blood Bolt) | 3s | 5 damage/tick every 1s. |
| Blood Frenzy (buff on allies) | 8s | +20% ATK, +10% Speed. |

#### Loot Table

| Item | Rarity | Drop Rate |
|------|--------|-----------|
| Priest's Blood Vial | Common | 40% |
| Crimson Ritual Staff Fragment | Uncommon | 22% |
| Blood-Bound Tome | Rare | 8% |
| Sanguine Vestments | Epic | 2.5% |
| Gold | — | 30-60 gold |

#### Weakness / Resistance

| Element | Modifier |
|---------|----------|
| Fire | 1.5x (Weakness) |
| Light/Holy | 1.5x (Weakness) |
| Blood | 0.0x (Immune) |
| Shadow | 0.8x |
| Physical | 1.0x |
| Void | 1.2x |

#### Visual Description

A gaunt humanoid figure in tattered crimson robes. The robes are stained darker at the hems with dried blood. Its face is hidden behind a smooth porcelain-white mask with no features except two narrow eye-slits glowing faint red. Skeletal pale hands extend from the sleeves, fingers stained red to the second knuckle. It carries a staff made of twisted bone topped with a pulsing crimson crystal. Blood runes float in a slow orbit around its shoulders. When healing, a red tether of liquid light connects it to the target. Approximately 1.1x player height.

---

## Zone 4 — Faille du Neant (Void Rift)

**Theme:** Cosmic horror, spatial distortion, entropy. Reality breaks down — floating platforms, warped geometry, stars visible through cracks in the ground.

---

### Anomalie du Neant (Void Anomaly)

| Field | Value |
|-------|-------|
| **Type** | Basic |
| **Element** | Void |
| **Zone(s)** | Faille du Neant (floors 1-5) |

#### Base Stats

| HP | ATK | DEF | Speed |
|----|-----|-----|-------|
| 70 | 22 | 2 | 85 px/s (erratic) |

| Detection Range | Attack Range |
|-----------------|--------------|
| 300 px | 250 px |

#### AI Behavior

The Void Anomaly is an unpredictable ranged enemy that **randomly teleports** every 3-5 seconds to a new position within 200 px of the player. It has no fixed patrol path — it blinks in and out of existence in random locations. Between teleports, it fires Void bolts at the player. It never engages in melee and will always teleport away if the player closes within 80 px. Its erratic movement makes it difficult to pin down but its low HP makes it fragile when caught. Spawns solo or in pairs.

**FSM States:** Drift (random position) -> Detect Player -> Ranged Attack -> Teleport (every 3-5s) -> Evasive Teleport (if player < 80 px) -> Repeat

#### Attack Patterns

| Attack | Telegraph | Active | Recovery | Cooldown | Damage | Range | Notes |
|--------|-----------|--------|----------|----------|--------|-------|-------|
| Void Bolt | 400 ms (core pulses brighter) | 150 ms (fast projectile, 200 px/s) | 300 ms | 1200 ms | 22 ATK | 250 px | Straight-line fast projectile. No tracking. |
| Void Burst | 700 ms (body expands, crackling) | 300 ms | 500 ms | 4000 ms | 30 ATK | 100 px AoE centered on self | Used when 2+ players/allies are nearby. Self-centered AoE. |
| Distortion Field | 600 ms (space warps visually around it) | 2000 ms (field persists) | 0 ms | 8000 ms | 5 ATK/tick every 500 ms | 80 px radius zone | Creates a zone of warped space. Slows player and distorts screen. |
| Blink | 200 ms (flicker) | Instant | 300 ms | 3000-5000 ms (random) | 0 | 200 px reposition | Random teleport. Core mechanic. |

#### Status Effects Applied

| Effect | Duration | Description |
|--------|----------|-------------|
| Spatial Distortion (Distortion Field) | While in zone + 1s after | -30% player speed, screen distortion (visual only, no gameplay impact beyond slow). |
| Void Corruption (Void Burst) | 2s | -10% player ATK. |

#### Loot Table

| Item | Rarity | Drop Rate |
|------|--------|-----------|
| Void Fragment | Common | 50% |
| Distortion Crystal | Uncommon | 20% |
| Anomaly Core | Rare | 6% |
| Gold | — | 10-25 gold |

#### Weakness / Resistance

| Element | Modifier |
|---------|----------|
| Physical | 1.5x (Weakness — disrupts form) |
| Light/Holy | 1.3x |
| Void | 0.0x (Immune) |
| Shadow | 0.5x (Resistant) |
| Fire | 1.0x |
| Blood | 1.0x |

#### Visual Description

A floating geometric anomaly — a constantly shifting polyhedron (oscillating between tetrahedron, cube, and octahedron) made of translucent dark purple energy. At its center, a bright violet-white core pulses like a heartbeat. Small fragments of broken reality orbit it — tiny shards of stone, metal, and light that were absorbed from the environment. When it teleports, it collapses into a point and re-expands at the new location with a brief spatial distortion ripple. Approximately 0.7x player height. Leaves faint afterimages at its previous positions that fade over 1s.

---

### Tisseur de Neant (Void Weaver)

| Field | Value |
|-------|-------|
| **Type** | Elite |
| **Element** | Void |
| **Zone(s)** | Faille du Neant (floors 3-6) |

#### Base Stats

| HP | ATK | DEF | Speed |
|----|-----|-----|-------|
| 300 | 32 | 12 | 50 px/s |

| Detection Range | Attack Range |
|-----------------|--------------|
| 350 px | 280 px |

#### AI Behavior

The Void Weaver is a zone-control caster that creates **gravity wells** — persistent areas that pull the player toward their center. It fights by placing gravity wells strategically to restrict player movement, then attacking the trapped player from range. It can have a maximum of 3 gravity wells active at once. It stays at maximum range and uses Void Tether if the player gets past the wells. If the player reaches melee range, it uses Rift Collapse (defensive AoE + teleport away). The Weaver is slow but controls space masterfully.

**FSM States:** Observe -> Place Gravity Well -> Ranged Attack -> Reposition (maintain distance) -> Rift Collapse (if pressured) -> Repeat

#### Attack Patterns

| Attack | Telegraph | Active | Recovery | Cooldown | Damage | Range | Notes |
|--------|-----------|--------|----------|----------|--------|-------|-------|
| Gravity Well | 800 ms (void circle appears on ground, growing) | Instant (persists 8s) | 500 ms | 6000 ms | 5 ATK/s while in zone | 100 px radius zone, placed up to 250 px away | Pulls player toward center at 40 px/s. Max 3 active. |
| Void Lance | 600 ms (energy concentrates into line from hands) | 200 ms (beam) | 500 ms | 2500 ms | 35 ATK | 280 px line, 30 px width | High-damage beam. Travels instantly (hitscan). |
| Void Tether | 500 ms (tendril extends toward player) | 300 ms (tether attaches) | 400 ms | 7000 ms | 10 ATK on attach + 6 ATK/s while tethered | 200 px range, tether lasts 4s | Pulls player 30 px/s toward Weaver. Breaks if player exits 250 px. |
| Rift Collapse | 400 ms (clenches fists, all gravity wells pulse) | 500 ms (all wells explode simultaneously) | 1000 ms | 15000 ms | 40 ATK per well | Each well: 120 px explosion radius | Destroys all active wells as explosions. Weaver teleports 200 px away. |
| Void Shield | 300 ms (weaves barrier gesture) | Instant | 0 ms | 20000 ms | 0 | Self | Absorbs 100 damage. Reflects 20% of absorbed damage back at attacker. |

#### Status Effects Applied

| Effect | Duration | Description |
|--------|----------|-------------|
| Gravity Pull (Gravity Well) | While in zone | Pulled toward center at 40 px/s. Movement away costs double speed. |
| Void Corruption (Void Lance, Void Tether) | 3s | -15% player speed, -10% player ATK. |
| Tethered (Void Tether) | 4s or until broken | Pulled 30 px/s toward Weaver. Break by exceeding 250 px distance. |

#### Loot Table

| Item | Rarity | Drop Rate |
|------|--------|-----------|
| Void Thread | Common | 40% |
| Weaver's Lens | Uncommon | 22% |
| Gravity Core | Rare | 9% |
| Void Weaver's Mantle | Epic | 3% |
| Gold | — | 35-80 gold |

#### Weakness / Resistance

| Element | Modifier |
|---------|----------|
| Physical | 1.3x (Weakness) |
| Light/Holy | 1.3x |
| Fire | 1.2x |
| Void | 0.0x (Immune) |
| Shadow | 0.5x (Resistant) |
| Blood | 1.0x |

#### Visual Description

A tall, thin humanoid figure (1.8x player height) draped in robes that appear to be made of folded space — the fabric shows glimpses of starfields, distant nebulae, and impossible geometries that shift as it moves. Its face is a smooth oval of absolute darkness, featureless except for a single vertical line of violet light where a mouth would be. Six arms extend from its torso (3 per side), each ending in elongated fingers that constantly weave patterns in the air, leaving faint trails of Void energy. When creating gravity wells, its hands move in complex geometric patterns and reality visibly distorts around the target area. Floats 10 px above the ground.

---

## General / Multi-zone

---

### Rat d'Umbra (Umbra Rat)

| Field | Value |
|-------|-------|
| **Type** | Basic |
| **Element** | None |
| **Zone(s)** | All zones (floors 1-2, tutorial areas, corridors) |

#### Base Stats

| HP | ATK | DEF | Speed |
|----|-----|-----|-------|
| 20 | 8 | 1 | 120 px/s |

| Detection Range | Attack Range |
|-----------------|--------------|
| 120 px | 30 px |

#### AI Behavior

The Umbra Rat is the weakest enemy in the game, designed as a tutorial mob for new players to learn combat basics. It patrols in small areas and charges the player on detection with no sophisticated tactics. It attacks once and then briefly scurries away before charging again. In groups of 3+, they can be mildly threatening due to numbers. They flee when HP drops below 30% (running away from the player at full speed). They serve as filler enemies in corridors between major encounters.

**FSM States:** Idle (sniffing ground) -> Detect -> Charge -> Bite -> Scurry Back -> Repeat / Flee (low HP)

#### Attack Patterns

| Attack | Telegraph | Active | Recovery | Cooldown | Damage | Range | Notes |
|--------|-----------|--------|----------|----------|--------|-------|-------|
| Bite | 200 ms (lunges forward) | 100 ms | 300 ms | 800 ms | 8 ATK | 30 px | Simple melee. |
| Scratch | 150 ms (paw raised) | 80 ms | 250 ms | 600 ms | 5 ATK | 25 px | Faster, weaker alternative. Used in rapid succession (2-hit combo). |
| Flee Squeak | 0 ms | 100 ms | 0 ms | N/A | 0 | 80 px fear radius | At <30% HP, squeaks and flees. Nearby rats also flee for 2s. |

#### Status Effects Applied

None.

#### Loot Table

| Item | Rarity | Drop Rate |
|------|--------|-----------|
| Rat Tail | Common | 40% |
| Rat Fang | Common | 25% |
| Tattered Hide Scrap | Uncommon | 8% |
| Gold | — | 1-5 gold |

#### Weakness / Resistance

| Element | Modifier |
|---------|----------|
| All elements | 1.0x (Neutral) |
| Fire | 1.2x (Slight Weakness) |
| Physical | 1.0x |

#### Visual Description

A large rat (0.3x player height) with matted dark gray-brown fur and beady red eyes. Its tail is long, hairless, and scarred. Slightly larger than a real-world rat but clearly vermin. Nothing supernatural about its appearance — it is simply a mundane creature that has adapted to living in the dark, corrupted world of Umbra. Moves in quick, jerky scurrying motions.

---

### Mimic (Mimic)

| Field | Value |
|-------|-------|
| **Type** | Special |
| **Element** | None |
| **Zone(s)** | All zones (floors 2+, treasure rooms, dead ends) |

#### Base Stats

| HP | ATK | DEF | Speed |
|----|-----|-----|-------|
| 180 | 35 | 15 | 80 px/s (when revealed) |

| Detection Range | Attack Range |
|-----------------|--------------|
| 0 px (waits for interaction) | 60 px |

#### AI Behavior

The Mimic is **disguised as a treasure chest** and is visually indistinguishable from real chests until the player attempts to open it. Upon interaction (player presses the interact button), it reveals itself with a surprise attack (Jaw Snap) that deals high damage and cannot be dodged (guaranteed first hit). After revealing, it fights as an aggressive melee enemy, chasing the player with leaping attacks. It cannot re-disguise once revealed. Mimics are placed deliberately by level design in rooms that look like they should contain treasure. A very subtle tell exists: the Mimic's "lid" has a barely visible seam that differs from real chests (rewards observant players).

**FSM States:** Disguised (chest form, indefinite) -> Triggered (player interacts) -> Jaw Snap (guaranteed hit) -> Chase -> Leap Attack / Tongue Lash -> Death

#### Attack Patterns

| Attack | Telegraph | Active | Recovery | Cooldown | Damage | Range | Notes |
|--------|-----------|--------|----------|----------|--------|-------|-------|
| Jaw Snap (reveal) | 0 ms (surprise) | 300 ms (lid opens into jaws, bites) | 500 ms | N/A (once) | 40 ATK | 60 px | Guaranteed hit on reveal. Cannot be dodged. |
| Tongue Lash | 400 ms (tongue coils) | 200 ms (tongue whip) | 400 ms | 2000 ms | 25 ATK | 100 px | Ranged melee. Pulls player 40 px closer. |
| Leap | 500 ms (crouches on stubby legs) | 300 ms (jumps 150 px) | 600 ms | 3000 ms | 30 ATK | 150 px leap + 50 px AoE on landing | Closing attack. Landing AoE. |
| Devour | 800 ms (jaws open wide) | 400 ms | 800 ms | 5000 ms | 50 ATK | 40 px | High damage close-range bite. Used when player is very close. |
| Gold Spit | 300 ms (coughs) | 150 ms (projectile spread) | 400 ms | 4000 ms | 15 ATK x3 projectiles | 120 px, 30 deg spread | Spits 3 gold coins as projectiles. Adds insult to injury. |

#### Status Effects Applied

| Effect | Duration | Description |
|--------|----------|-------------|
| Surprise (Jaw Snap) | 1s | Player briefly stunned after surprise reveal. |
| Pull (Tongue Lash) | Instant | Pulled 40 px toward Mimic. |

#### Loot Table

| Item | Rarity | Drop Rate |
|------|--------|-----------|
| Mimic Tooth | Common | 50% |
| Enchanted Lock | Uncommon | 25% |
| Mimic Tongue (crafting) | Rare | 10% |
| Treasure Mimic Trophy | Epic | 4% |
| Gold | — | 50-150 gold (drops the "treasure" it was pretending to guard) |

#### Weakness / Resistance

| Element | Modifier |
|---------|----------|
| Fire | 1.3x (Weakness — wooden exterior) |
| Ice | 1.2x |
| Physical | 0.8x (Resistant — hard wood/metal shell) |
| Shadow | 1.0x |
| Void | 1.0x |
| Blood | 1.0x |

#### Visual Description

**Disguised form:** Identical to standard treasure chests found in the game — wooden body with iron banding, ornate lock, slightly ajar lid hinting at golden glow inside. The only tell: a faint, irregular seam line where the "lid" meets the "body" that is slightly more organic-looking than a real chest's hinge line.

**Revealed form:** The chest explodes open to reveal a monstrous creature. The lid becomes a hinged jaw lined with razor-sharp wooden and metal teeth. A long, prehensile crimson tongue lolls from the interior. The body sprouts four stubby but powerful legs from its underside. Two small, malicious yellow eyes peer from just below the lid-jaw hinge. The interior is not a chest cavity but a fleshy, dark red gullet. Approximately 0.7x player height (body), 1.0x when jaw is fully open.

---

## Stat Scaling Table

Enemy stats scale based on dungeon floor level. Base stats listed in each entry are for floor 1 of their respective zone.

### Scaling Formulas

| Stat | Scaling per Floor | Formula |
|------|-------------------|---------|
| **HP** | +15% per floor | `base_hp * (1 + 0.15 * (floor - 1))` |
| **ATK** | +10% per floor | `base_atk * (1 + 0.10 * (floor - 1))` |
| **DEF** | +8% per floor | `base_def * (1 + 0.08 * (floor - 1))` |
| **Speed** | No scaling | Fixed per enemy type |
| **Detection Range** | No scaling | Fixed per enemy type |
| **Attack Range** | No scaling | Fixed per enemy type |
| **Gold Drop** | +12% per floor | `base_gold * (1 + 0.12 * (floor - 1))` |
| **XP Reward** | +20% per floor | `base_xp * (1 + 0.20 * (floor - 1))` |

### Example: Ash Specter Stat Progression

| Floor | HP | ATK | DEF |
|-------|----|-----|-----|
| 1 | 80 | 18 | 4 |
| 2 | 92 | 20 | 4 |
| 3 | 104 | 22 | 5 |
| 4 | 116 | 23 | 5 |
| 5 | 128 | 25 | 6 |
| 6 | 140 | 27 | 6 |

### Boss Scaling

Bosses do **not** scale with floor level. They are tuned to a fixed difficulty appropriate for the final floor of their zone. However, their loot scales with player level at time of kill (+5% per player level above zone baseline).

### New Game+ Scaling

In NG+ cycles, all enemy base stats receive an additional multiplier:
- NG+1: 1.5x HP, 1.3x ATK, 1.2x DEF
- NG+2: 2.0x HP, 1.6x ATK, 1.4x DEF
- NG+3: 3.0x HP, 2.0x ATK, 1.8x DEF

---

## Pack Behavior Rules

When enemies spawn in groups, they follow coordination rules based on pack size.

### Aggro Sharing

- When one enemy in a pack detects the player, **all enemies in the same pack** are alerted after a 500 ms delay (the alerting enemy calls out).
- Pack aggro range: 300 px (enemies beyond this are treated as separate packs).
- Aggro is **persistent** — once alerted, pack members do not de-aggro unless the player leaves 500 px range for 8+ seconds.

### Flanking Behavior

When a pack has 3+ members and is in combat:
1. **Alpha** (highest HP member): Engages player head-on.
2. **Flankers** (2nd and 3rd members): Move to 90 deg and 270 deg positions relative to the alpha-player line.
3. **Remaining members**: Fill gaps, prioritize unguarded angles.
4. Flanking repositioning occurs every 2s. Flankers adjust position based on player movement.

### Role-Based Pack Coordination

| Pack Composition | Behavior |
|-----------------|----------|
| All Basic (same type) | Standard flanking. No special coordination beyond aggro sharing. |
| Basic + Elite | Basics act as frontline. Elite positions behind or to the side, using ranged/special attacks. |
| Mixed types (e.g., Ember Hounds + Ash Specters) | Ranged enemies stay back. Melee enemies rush forward. Ranged enemies avoid friendly fire (will not shoot if an ally is in the line of fire). |
| With Blood Priest | Priest stays in rear. All allies position between Priest and player. If player bypasses frontline, one ally peels back to intercept. |

### Pack Size Limits

| Zone | Minimum Pack | Maximum Pack | Common Pack Size |
|------|-------------|-------------|-----------------|
| Cendres Desolees | 1 | 5 | 2-3 |
| Cryptes d'Ombre | 1 | 4 | 2-3 |
| Profondeurs Carmines | 2 | 6 | 3-4 |
| Faille du Neant | 1 | 3 | 1-2 |

### Leash Distance

If the player retreats beyond **500 px** from a pack's spawn point, the pack stops chasing and returns to patrol. Enemies regenerate HP at 5% max HP/s while returning. They are still vulnerable to damage during the return walk.

---

## Elemental Resistance Matrix

Complete resistance/weakness table for all enemies. Values represent damage multipliers (1.0 = neutral, >1.0 = weakness, <1.0 = resistance, 0.0 = immune).

| Enemy | Physical | Fire | Water | Ice | Shadow | Light/Holy | Blood | Void |
|-------|----------|------|-------|-----|--------|------------|-------|------|
| Spectre de Cendre | 0.7 | 0.0 | 1.5 | 1.3 | 1.0 | 1.0 | 1.0 | 1.0 |
| Chien de Braise | 1.0 | 0.0 | 1.5 | 1.3 | 1.0 | 1.0 | 1.0 | 1.0 |
| Sentinelle Calcinee | 0.6 | 0.0 | 1.3 | 1.2 | 1.0 | 1.0 | 1.0 | 1.2 |
| Gardien Corrompu | 0.8 | 0.0 | 1.3 | 1.2 | 0.8 | 1.0 | 1.0 | 0.5* |
| Spectre d'Ombre | 0.5 | 1.3 | 1.0 | 1.0 | 0.0 | 1.8 | 1.0 | 0.8 |
| Araignee Nocturne | 1.0 | 1.5 | 1.0 | 0.8 | 0.0 | 1.3 | 1.0 | 1.0 |
| Chevalier Dechu | 0.7 | 1.2 | 1.0 | 1.0 | 0.2 | 1.5 | 1.0 | 1.0 |
| Sangsue Geante | 1.0 | 1.5 | 1.0 | 1.2 | 0.8 | 1.3 | 0.0 | 1.0 |
| Pretre de Sang | 1.0 | 1.5 | 1.0 | 1.0 | 0.8 | 1.5 | 0.0 | 1.2 |
| Anomalie du Neant | 1.5 | 1.0 | 1.0 | 1.0 | 0.5 | 1.3 | 1.0 | 0.0 |
| Tisseur de Neant | 1.3 | 1.2 | 1.0 | 1.0 | 0.5 | 1.3 | 1.0 | 0.0 |
| Rat d'Umbra | 1.0 | 1.2 | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 |
| Mimic | 0.8 | 1.3 | 1.0 | 1.2 | 1.0 | 1.0 | 1.0 | 1.0 |

> *Gardien Corrompu: Void resistance changes to 0.0 (Immune) in Phase 2+.

### Elemental Interaction Notes

- **Fire vs Shadow enemies**: Fire illuminates Shadow enemies, removing stealth for 3s on hit.
- **Water vs Fire enemies**: Water attacks extinguish Burn status on the player if self-cast (utility).
- **Light/Holy**: Universally effective against undead/shadow types. No enemy resists it except indirectly.
- **Void**: Strong against most things but Void enemies are immune. Void Corruption debuff stacks from multiple sources.
- **Physical**: Reliable against casters and anomalies. Weak against armored (Sentinel, Knight) and incorporeal (Wraith) enemies.

---

*Document version: 2.0*
*Last updated: 2026-03-01*
*Status: Specification — subject to balancing during playtesting*
