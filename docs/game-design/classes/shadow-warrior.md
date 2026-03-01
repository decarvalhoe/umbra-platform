# Guerrier de l'Ombre — Shadow Warrior

> **GDD v2.0 — Complete Class Specification**
> Status: Draft | Version: 2.0 | Last updated: 2026-03-01

---

## 1. Class Identity

| Property | Value |
|----------|-------|
| **Name** | Guerrier de l'Ombre (Shadow Warrior) |
| **Role** | Melee DPS / Duelist |
| **Primary Element** | Shadow |
| **Secondary Element** | Blood (unlocked at level 10) |
| **Playstyle** | Aggressive close-range combat with high mobility, dual-wield focus, risk-reward mechanics (deal more damage at low HP) |

### Lore

Les Guerriers de l'Ombre furent autrefois des chevaliers d'honneur, gardiens des citadelles humaines. Lorsque la corruption de l'Umbra se propagea sur le monde, certains d'entre eux choisirent de ne pas fuir mais de fusionner avec les ténèbres. Ce pacte interdit leur coûta leur humanité — leur peau se marbre de veines noires, leurs yeux deviennent des éclats d'obsidienne — mais en échange, ils acquirent le pouvoir de manier les ombres comme des armes physiques. Ni vivants ni morts, ils marchent entre les mondes, traquant les abominations de l'Umbra avec les mêmes pouvoirs corrompus. Leurs anciens frères d'armes les considèrent comme des monstres. Les Guerriers de l'Ombre, eux, savent qu'ils sont le seul rempart qui reste.

*(Shadow Warriors were once knights of honor, guardians of human citadels. When the Umbra corruption spread across the world, some chose not to flee but to merge with the darkness. This forbidden pact cost them their humanity — their skin mottled with black veins, their eyes turned to obsidian shards — but in exchange, they gained the power to wield shadows as physical weapons. Neither living nor dead, they walk between worlds, hunting Umbra abominations with the same corrupted powers. Their former brothers-in-arms consider them monsters. The Shadow Warriors know they are the only bulwark that remains.)*

---

## 2. Base Stats (Level 1)

| Stat | Base Value | Growth / Level |
|------|-----------|----------------|
| HP | 800 | +45 |
| Energy | 100 | +5 |
| Strength (STR) | 14 | +2 |
| Agility (AGI) | 16 | +3 |
| Intelligence (INT) | 8 | +1 |
| Endurance (END) | 12 | +2 |
| Willpower (WIL) | 10 | +1 |

### Derived Stats

| Derived Stat | Formula |
|-------------|---------|
| **Attack Power (ATK)** | STR * 2.5 + AGI * 0.5 |
| **Critical Rate** | 5% + AGI * 0.3% |
| **Critical Damage** | 150% (base) |
| **Move Speed** | 200 + AGI * 0.5 |
| **Dodge i-frames** | 200ms (base), +10ms per 10 AGI |

**Example at Level 1:** ATK = 14 * 2.5 + 16 * 0.5 = 43. Crit Rate = 5% + 4.8% = 9.8%. Move Speed = 208.

---

## 3. Weapon Proficiencies

| Weapon Type | Proficiency | Damage Modifier | Speed |
|-------------|-------------|-----------------|-------|
| Swords | S | 1.0x | Fast |
| Daggers | S | 0.8x | Very Fast |
| Axes | A | 1.2x | Medium |
| Greatswords | B | 1.5x | Slow (no dual-wield) |
| Staves | D | 0.5x | Medium |

### Dual-Wield Mechanics

- **Main hand:** 100% damage
- **Off-hand:** 85% damage
- **Restriction:** Greatswords and Staves cannot be dual-wielded

### Recommended Loadouts

| Loadout | Weapons | Strengths |
|---------|---------|-----------|
| **Versatile** | Sword + Dagger | Balanced speed and damage, good for all content |
| **Speed** | Dagger + Dagger | Maximum attack speed, highest proc rate for passives |
| **Balanced** | Sword + Sword | Strong base damage, consistent DPS output |

---

## 4. Active Skills

### Skill 1: Ombre Tranchante (Shadow Slash)

| Property | Value |
|----------|-------|
| **Type** | Melee AoE (frontal arc) |
| **Element** | Shadow |
| **Damage** | ATK * 180% + AGI * 2 |
| **Cooldown** | 4s |
| **Energy Cost** | 15 |
| **Range** | Close (2m arc) |
| **Unlock** | Level 1 |

**Effect:** Sweeps a blade of condensed shadow in a frontal arc. Applies **Affaiblissement** (Weaken: -20% ATK) to all enemies hit for 3s.

**Design Notes:** Bread-and-butter skill. Low cooldown makes it the primary damage filler. The frontal arc makes it effective against groups without being overpowered in 1v1 scenarios. Weaken debuff encourages using it as an opener before committing to a fight.

---

### Skill 2: Pas du Néant (Void Step)

| Property | Value |
|----------|-------|
| **Type** | Dash + Damage |
| **Element** | Void |
| **Damage** | ATK * 120% |
| **Cooldown** | 8s |
| **Energy Cost** | 20 |
| **Range** | 5m teleport |
| **Unlock** | Level 1 |

**Effect:** Teleport 5m in the aimed direction. Grants **0.5s invulnerability** during the teleport. Deals damage at the arrival point. Leaves a **shadow clone** at the origin position that explodes after 1s, dealing **60% ATK Shadow damage** in a 2m radius.

**Design Notes:** Primary mobility skill and escape tool. The shadow clone explosion adds skill expression — aggressive players can teleport through enemies so both the arrival damage and the clone explosion hit the same target. Defensive players use it purely for repositioning.

---

### Skill 3: Frénésie Sanglante (Blood Frenzy)

| Property | Value |
|----------|-------|
| **Type** | Self-buff |
| **Element** | Blood |
| **Cooldown** | 20s |
| **Energy Cost** | 30 |
| **Duration** | 8s |
| **Unlock** | Level 1 |

**Effect:**

| Condition | ATK Bonus | Attack Speed | Damage Reduction |
|-----------|-----------|-------------|------------------|
| Above 30% HP | +30% | +20% | -15% damage taken |
| Below 30% HP | +60% | +40% | -15% damage taken |

- Each kill during Frenzy heals **5% max HP**.
- All attacks during Frenzy apply **Saignement** (Bleed: 2% ATK per second for 5s, stacks up to 3 times).

**Design Notes:** The signature class identity skill. The risk-reward mechanic of being stronger at low HP defines the Shadow Warrior fantasy. Skilled players intentionally stay at low HP for maximum output. The kill-heal mechanic provides sustain in group encounters, preventing the low-HP state from being purely suicidal.

---

### Skill 4: Embuscade Nocturne (Night Ambush)

| Property | Value |
|----------|-------|
| **Type** | Stealth + Backstab |
| **Element** | Shadow |
| **Damage** | ATK * 300% (from stealth) / ATK * 150% (if detected) |
| **Cooldown** | 15s |
| **Energy Cost** | 25 |
| **Duration** | 3s stealth |
| **Unlock** | Level 5 |

**Effect:** Become **invisible** for 3s. Stealth is broken by attacking or taking damage. While stealthed:

- Movement speed +20%
- Next attack is a **guaranteed critical hit** with **+50% crit damage** (total: 200% crit damage base)
- Stealth attack uses the 300% damage multiplier; if detected before attacking, falls back to 150%

**Design Notes:** Burst damage tool and positioning skill. The 3s window is short enough to prevent perma-stealth cheese but long enough to reposition behind a target. In PvP, the guaranteed crit from stealth creates exciting counterplay — opponents must track the Shadow Warrior's last known position.

---

### Skill 5: Lames Jumelles (Twin Blades)

| Property | Value |
|----------|-------|
| **Type** | Channel (rapid strikes) |
| **Element** | Shadow + Blood |
| **Damage** | 6 hits of ATK * 50% each (total: ATK * 300%) |
| **Cooldown** | 12s |
| **Energy Cost** | 35 |
| **Duration** | 1.5s channel |
| **Unlock** | Level 10 |

**Effect:** Unleash a rapid 6-hit combo with both weapons.

- Each hit has an **independent critical chance** roll
- Final hit (6th) applies both **Affaiblissement** (Weaken) and **Saignement** (Bleed)
- Channel can be **canceled by dodge** (remaining hits are lost)
- Requires dual-wield (unavailable with Greatswords/Staves)

**Design Notes:** Highest raw DPS skill in the kit, but locks the player in place for 1.5s. The dodge-cancel provides an escape valve against incoming attacks, but at the cost of lost damage. Each hit rolling crit independently means high-AGI builds see more consistent damage spikes. The dual-element requirement ties into the level 10 Blood unlock.

---

### Skill 6: Jugement de l'Ombre (Shadow Judgement) — Ultimate

| Property | Value |
|----------|-------|
| **Type** | AoE Burst |
| **Element** | Shadow |
| **Damage** | ATK * 500% + 10% of total damage dealt in the last 10s |
| **Cooldown** | 60s |
| **Energy Cost** | 50 |
| **Range** | 8m radius (centered on player) |
| **Unlock** | Level 15 |

**Effect:** Channel for 0.5s, then unleash a massive shadow explosion centered on the player.

- Enemies killed by this skill drop **double loot**
- Heals the player for **20% of damage dealt** by this skill
- Applies all 4 elemental statuses for 2s: Shadow (Weaken), Blood (Bleed), Void (Slow), Corruption (Vulnerability)
- The "10% of recent damage" component is calculated from all damage sources (skills, auto-attacks, DoTs)

**Design Notes:** The ultimate ability and the capstone of aggressive play. The "10% of recent damage" mechanic directly rewards players who stay in combat and deal sustained damage before using the ultimate. This creates a natural gameplay loop: engage -> build damage -> detonate with Judgement. The double loot on kill incentivizes saving it for finishing blows on elite enemies.

---

## 5. Passive Abilities

### Soif d'Ombre (Shadow Thirst)

> Kills restore **3 Energy**.

Provides resource sustain during extended combat. Particularly effective during Blood Frenzy when kill speed increases. At 3 Energy per kill, clearing a pack of 5 enemies restores 15 Energy — equivalent to one Shadow Slash cast.

### Instinct Meurtrier (Killer Instinct)

> +2% Critical Rate per enemy in combat (max +10%).

Scales the Shadow Warrior's power with encounter size. Against a single target: +2% crit. Against 5+ enemies: +10% crit. This passive makes the class feel rewarding in group encounters without breaking 1v1 balance.

### Résonance Duale (Dual Resonance)

> Dual-wield attacks have a **15% chance** to strike with both weapons simultaneously.

When triggered, both main-hand (100% damage) and off-hand (85% damage) hit at once, effectively dealing 185% of a normal attack. Procs on auto-attacks and single-hit skills. Does not proc on multi-hit skills (Twin Blades) to prevent multiplicative scaling.

---

## 6. Talent Tree

**Total talent points available:** 10 (1 per level from 5 to 14, respec available at any Umbra Shrine)

### Voie de la Lame (Offense Branch — Path of the Blade)

| Tier | Talent | Max Points | Effect |
|------|--------|-----------|--------|
| 1 | **Affûtage** (Sharpening) | 3 | +5% ATK per point |
| 2 | **Précision Létale** (Lethal Precision) | 3 | +3% Critical Rate per point |
| 3 | **Combo Maître** (Combo Master) | 2 | Extend combo window by 0.5s per point |
| 4 | **Exécution** (Execution) | 1 | Enemies below 20% HP take 25% more damage |
| 5 | **Tempête d'Acier** (Steel Tempest) | 1 | Attack combo gains a 4th hit dealing +100% damage |

*Branch total: 10 points to max. Full investment creates a pure damage dealer.*

### Voie de l'Ombre (Defense Branch — Path of Shadow)

| Tier | Talent | Max Points | Effect |
|------|--------|-----------|--------|
| 1 | **Ténacité** (Tenacity) | 3 | +5% max HP per point |
| 2 | **Esquive Instinctive** (Instinctive Dodge) | 1 | +1 dodge charge |
| 3 | **Absorption d'Ombre** (Shadow Absorption) | 1 | 10% of Shadow damage dealt heals the player |
| 4 | **Second Souffle** (Second Wind) | 1 | When dropping below 25% HP, heal 15% HP (120s internal cooldown) |
| 5 | **Immortalité Fugace** (Fleeting Immortality) | 1 | Survive a lethal hit with 1 HP, once per run |

*Branch total: 7 points to max. Provides survivability for solo content and difficult encounters.*

### Voie du Sang (Control Branch — Path of Blood)

| Tier | Talent | Max Points | Effect |
|------|--------|-----------|--------|
| 1 | **Hémorragie** (Hemorrhage) | 3 | Bleed damage +20% per point |
| 2 | **Ralentissement** (Slowdown) | 1 | Weakened enemies also have -15% move speed |
| 3 | **Chaînes de Sang** (Blood Chains) | 1 | Bleed spreads to nearby enemies within 3m |
| 4 | **Drain Vital** (Vital Drain) | 1 | 5% of all damage dealt is converted to healing |
| 5 | **Marque de Sang** (Blood Mark) | 1 | Marked enemies take 15% more damage from all sources |

*Branch total: 7 points to max. Focuses on debuffs, DoT, and sustain through damage.*

### Talent Point Economy

With 10 points available, players must make meaningful choices:

- Cannot max two full branches (7 + 7 = 14 > 10)
- Can max one branch and partially invest in another
- Can spread across all three for a hybrid build
- Respec cost increases each time (1st free, then 100g, 500g, 2000g...)

---

## 7. Recommended Builds

### Speed Assassin

> *"Strike fast, strike first, disappear."*

| Property | Choice |
|----------|--------|
| **Weapons** | Dagger + Dagger |
| **Primary Stat** | Agility (all points) |
| **Talents** | Offense 1-3 (Sharpening + Lethal Precision) + Control 1 (Hemorrhage x1) |

**Playstyle:** Maximize attack speed and critical rate. Open with Night Ambush for guaranteed crit, follow with Twin Blades, use Void Step to reposition. Blood Frenzy at low HP for maximum burst. Relies on dodging rather than tanking — if you get hit, you die.

**Strengths:** Highest burst damage, best PvP build, fastest clear speed on weak enemies.
**Weaknesses:** Fragile, requires precise dodge timing, struggles against high-HP bosses.

---

### Bruiser

> *"I don't dodge. I don't need to."*

| Property | Choice |
|----------|--------|
| **Weapons** | Sword + Axe |
| **Primary Stat** | Strength + Endurance (balanced) |
| **Talents** | Defense 1-4 (Tenacity + Dodge + Absorption + Second Wind) + Offense 1 (Sharpening x2) |

**Playstyle:** Frontline brawler. Absorb damage with high HP, heal through Shadow Absorption and Second Wind. Blood Frenzy is used at full HP for the base buff — no need to risk low-HP gameplay. Shadow Slash for consistent AoE damage, Shadow Judgement for burst.

**Strengths:** Durable, forgiving to play, excellent for solo content and tanking dungeons.
**Weaknesses:** Lower DPS ceiling, slower kill speed, less exciting moment-to-moment gameplay.

---

### Blood Mage Hybrid

> *"Every wound I inflict heals me. Every wound I take makes me stronger."*

| Property | Choice |
|----------|--------|
| **Weapons** | Sword + Dagger |
| **Primary Stat** | Agility > Strength |
| **Talents** | Control 1-5 (full Blood path) + Offense 4 (Execution) |

**Playstyle:** Sustain through damage. Apply Bleed to everything via Blood Frenzy, spread it with Blood Chains, heal with Vital Drain. Execution finishes weakened enemies. Blood Mark amplifies team damage in group content. Play at medium HP — low enough for some Frenzy bonus, high enough to survive hits.

**Strengths:** Best sustain build, strong in group content (debuffs benefit all allies), self-sufficient.
**Weaknesses:** Lower raw burst than Speed Assassin, requires managing multiple DoTs and debuffs.

---

## Appendix: Status Effects Reference

| Status | French Name | Effect | Default Duration |
|--------|------------|--------|-----------------|
| Weaken | Affaiblissement | -20% ATK | 3s |
| Bleed | Saignement | 2% ATK/s, stacks x3 | 5s |
| Slow | Ralentissement | -15% move speed | 3s |
| Vulnerability | Vulnérabilité | +15% damage taken | 2s |

---

## Appendix: Level Progression

| Level | HP | Energy | STR | AGI | INT | END | WIL | ATK | Crit% | Unlock |
|-------|-----|--------|-----|-----|-----|-----|-----|-----|-------|--------|
| 1 | 800 | 100 | 14 | 16 | 8 | 12 | 10 | 43 | 9.8% | Shadow Slash, Void Step, Blood Frenzy |
| 5 | 980 | 120 | 22 | 28 | 12 | 20 | 14 | 69 | 13.4% | Night Ambush, Talent Points begin |
| 10 | 1205 | 145 | 32 | 43 | 17 | 30 | 19 | 101.5 | 17.9% | Twin Blades, Blood element unlocked |
| 15 | 1430 | 170 | 42 | 58 | 22 | 40 | 24 | 134 | 22.4% | Shadow Judgement (Ultimate) |
| 20 | 1655 | 195 | 52 | 73 | 27 | 50 | 29 | 166.5 | 26.9% | — |

*Values assume no gear bonuses or talent modifiers.*
