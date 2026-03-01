# Umbra — Enemy Bestiary (GDD v2.0)

## Design Philosophy

- **Each enemy teaches a specific player skill** — no filler enemies; every encounter is a lesson.
- **Visual telegraphing for all attacks** — players should always be able to react if they pay attention.
- **Elemental diversity** across the 4 elements: Fire, Shadow, Blood, Void.
- **Escalating complexity** — simple enemies introduce core mechanics first, then combinations test mastery.

---

## Vertical Slice Enemies

These two enemies are required for the vertical slice build and must be fully implemented first.

### 1. Shadow Wraith (Basic Melee)

| Stat               | Value     |
| ------------------- | --------- |
| HP                  | 120       |
| ATK                 | 25        |
| DEF                 | 10        |
| Element             | Shadow    |
| XP Reward           | 15        |
| Move Speed          | 100 px/s  |
| Detection Range     | 300 px    |
| Attack Range        | 80 px     |
| Telegraph Duration  | 500 ms    |

**Behavior FSM:**
`IDLE → ALERT (detection) → CHASE → TELEGRAPH (0.5s) → ATTACK → retreat 100px → repeat`

**Teaches:** Basic dodge timing.

**Art Direction:** Dark purple ethereal form, wispy trailing shadow particles, glowing purple eyes. Silhouette is humanoid, hunched, with elongated arms.

**Sound Design:** Whisper-like ambient sound when idle, sharp hiss on alert, whoosh on attack wind-up.

**Loot Table:**

| Item              | Drop Rate |
| ----------------- | --------- |
| Cendres (5-10)    | 100%      |
| Shadow Essence    | 15%       |
| Wraith Fragment   | 5%        |

---

### 2. Void Specter (Ranged)

| Stat               | Value                |
| ------------------- | -------------------- |
| HP                  | 80                   |
| ATK                 | 35 (projectile)      |
| DEF                 | 5                    |
| Element             | Void                 |
| XP Reward           | 20                   |
| Move Speed          | 60 px/s              |
| Detection Range     | 400 px               |
| Attack Range        | 250 px (projectile)  |
| Telegraph Duration  | 800 ms               |

**Behavior FSM:**
`IDLE → ALERT → POSITION (maintain 200px distance) → TELEGRAPH (0.8s, purple orb charge) → FIRE → cooldown 2.5s → repeat`
Retreats if player gets within 100px.

**Teaches:** Projectile dodge timing and closing distance.

**Art Direction:** Translucent dark blue/black spectral form, floats above ground, void orbs orbit around it. Silhouette is amorphous, shifting shape.

**Sound Design:** Low resonant hum, crackling energy buildup during telegraph, sharp pop on projectile fire.

**Loot Table:**

| Item              | Drop Rate |
| ----------------- | --------- |
| Cendres (8-15)    | 100%      |
| Void Crystal      | 20%       |
| Specter Core      | 5%        |

---

## Phase 3 Enemies

These three enemies are introduced in Phase 3 of development, adding tactical depth and elemental variety.

### 3. Blood Leech (Sustain/Drain)

| Stat               | Value              |
| ------------------- | ------------------ |
| HP                  | 150                |
| ATK                 | 15 + 10 drain      |
| DEF                 | 8                  |
| Element             | Blood              |
| XP Reward           | 25                 |
| Move Speed          | 80 px/s            |
| Detection Range     | 250 px             |
| Attack Range        | 50 px (attach)     |
| Telegraph Duration  | 400 ms             |

**Behavior FSM:**
`IDLE → ALERT → CHASE → TELEGRAPH (0.4s) → ATTACH → DRAIN (10 HP/s, heals self) → detach after 3s or player shake-off → cooldown 2s → repeat`

**Teaches:** Target prioritization (kill leeches first) and shake-off mechanic.

**Art Direction:** Dark crimson, slug-like form with pulsating veins. Bioluminescent glow intensifies while draining. Leaves a faint blood trail when moving.

**Sound Design:** Wet squelching movement, gurgling sound during drain phase, splatter sound on detach.

**Loot Table:**

| Item              | Drop Rate |
| ----------------- | --------- |
| Cendres (6-12)    | 100%      |
| Blood Vial        | 20%       |
| Leech Heart       | 5%        |

---

### 4. Flame Sentinel (AOE/Zone Control)

| Stat               | Value              |
| ------------------- | ------------------ |
| HP                  | 200                |
| ATK                 | 30 (AOE)           |
| DEF                 | 15                 |
| Element             | Fire               |
| XP Reward           | 30                 |
| Move Speed          | 50 px/s            |
| Detection Range     | 350 px             |
| Attack Range        | 200 px (pillar)    |
| Telegraph Duration  | 1000 ms            |

**Behavior FSM:**
`IDLE → ALERT → POSITION (slow advance) → TELEGRAPH (1.0s, ground glow) → PLANT FLAME PILLAR → repeat (max 3 active pillars) → if player in melee range: MELEE SWIPE (0.6s telegraph)`
Flame pillars persist for 8s, dealing 10 damage/s in a 60px radius.

**Teaches:** Spatial awareness and zone avoidance.

**Art Direction:** Bronze armored construct, embers constantly falling from joints. Eyes glow orange-red. Flame pillars are erupting geysers of fire with visible heat distortion.

**Sound Design:** Heavy metallic footsteps, furnace-like breathing, roaring fire on pillar placement, crackling ambient from active pillars.

**Loot Table:**

| Item              | Drop Rate |
| ----------------- | --------- |
| Cendres (10-20)   | 100%      |
| Ember Shard       | 20%       |
| Sentinel Plate    | 5%        |

---

### 5. Void Walker (Teleporter)

| Stat               | Value              |
| ------------------- | ------------------ |
| HP                  | 100                |
| ATK                 | 40                 |
| DEF                 | 5                  |
| Element             | Void               |
| XP Reward           | 35                 |
| Move Speed          | 70 px/s            |
| Detection Range     | 350 px             |
| Attack Range        | 70 px              |
| Telegraph Duration  | 600 ms             |

**Behavior FSM:**
`IDLE → ALERT → TELEPORT (behind player, 0.3s delay) → TELEGRAPH (0.6s) → ATTACK → BLINK AWAY (150px distance) → cooldown 3s → repeat`
Leaves void rifts at teleport origin and destination that deal 5 damage/s for 2s.

**Teaches:** 360-degree awareness and sound cues (audio telegraph before teleport).

**Art Direction:** Similar to Void Specter but more humanoid and angular. Darker, more solid form. Leaves void rifts — swirling dark purple tears in space — at teleport points.

**Sound Design:** Distinctive reverse-reverb whoosh 0.3s before teleport (audio telegraph), sharp crack on arrival, blade-like slash sound on attack.

**Loot Table:**

| Item              | Drop Rate |
| ----------------- | --------- |
| Cendres (10-18)   | 100%      |
| Void Shard        | 20%       |
| Walker Mask       | 3%        |

---

## Boss: Corrupted Guardian

### Overview

| Stat               | Value                                    |
| ------------------- | ---------------------------------------- |
| Total HP            | 3500 (Phase 1: 2000, Phase 2: 1500)     |
| Element             | None (corrupted, immune to status effects)|
| Arena Size          | 800 x 800 px (circular room)            |
| XP Reward           | 200                                      |
| Music               | Dynamic — intensifies in Phase 2         |

---

### Phase 1: Stone Form (HP > 50%)

The Guardian begins as a massive stone construct, slow but devastating.

**Attacks:**

| Attack          | Telegraph  | Damage | Notes                                      |
| --------------- | ---------- | ------ | ------------------------------------------ |
| Heavy Slam      | 1.2s       | 50     | Frontal cone, 120px range                  |
| Ground Slam     | 1.0s       | 35     | 360-degree shockwave, dodge by jumping or distance (200px) |
| Pillar Summon   | 1.5s       | 0      | Summons 3 stone pillars that block movement |

**Vulnerability Window:** 2s after Ground Slam — Guardian glows red and cannot act.

**Pattern Cycle:** `Heavy Slam → Heavy Slam → Ground Slam (vulnerability) → Pillar Summon → repeat`

---

### Phase 2: Corrupted Form (HP <= 50%)

At 50% HP, the stone cracks and dark corruption spills out. Speed increases 50%, attack patterns change.

**New/Modified Attacks:**

| Attack              | Telegraph  | Damage | Notes                                          |
| ------------------- | ---------- | ------ | ---------------------------------------------- |
| Corrupted Slam      | 0.8s       | 55     | Faster version of Heavy Slam                   |
| Shadow Tendrils     | 0.7s       | 30     | Ranged, 3-way spread, 300px range              |
| Exploding Pillars   | 1.5s       | 40     | Pillars now explode after 3s (150px blast radius) |

**Enrage (10% HP):** All attacks 30% faster. Arena edges begin closing with corruption (damage zone shrinks arena to 600x600px over 30s).

**Vulnerability Window:** 1.5s after Corrupted Slam — shorter than Phase 1.

**Pattern Cycle:** `Corrupted Slam → Shadow Tendrils → Corrupted Slam → Exploding Pillars → repeat`

---

### Boss Rewards

| Reward                          | Condition         |
| ------------------------------- | ----------------- |
| 500 Cendres                     | Guaranteed        |
| 1 Eclat d'Ombre                 | Guaranteed        |
| Guardian Core (crafting material)| 50% chance        |
| Shadow Warrior talent point     | First kill only   |

---

## Room Composition Guide

Standard room layouts for level design, showing how enemies combine to create teaching moments.

| Room Type   | Enemies                              | Purpose                     |
| ----------- | ------------------------------------ | --------------------------- |
| Tutorial    | 2 Shadow Wraiths                     | Learn dodge timing          |
| Ranged Intro| 1 Void Specter + 1 Shadow Wraith    | Learn target priority       |
| Drain Intro | 2 Blood Leeches + 1 Shadow Wraith   | Learn shake-off and priority|
| Zone Control| 1 Flame Sentinel + 2 Shadow Wraiths | Learn spatial awareness     |
| Ambush      | 2 Void Walkers                       | Learn 360-degree awareness  |
| Gauntlet    | 3 Shadow Wraiths + 2 Void Specters  | Test combined skills        |
| Pre-Boss    | 1 Flame Sentinel + 1 Void Walker + 1 Blood Leech | Full skill check |
| Boss Room   | Corrupted Guardian                   | Final exam                  |

---

## Difficulty Scaling

All enemy stats are multiplied by the following values based on the selected difficulty.

| Difficulty  | HP Multiplier | ATK Multiplier | Speed Multiplier | XP Multiplier |
| ----------- | ------------- | -------------- | ---------------- | ------------- |
| Normal      | 1.0x          | 1.0x           | 1.0x             | 1.0x          |
| Hard        | 1.5x          | 1.3x           | 1.1x             | 1.5x          |
| Nightmare   | 2.0x          | 1.6x           | 1.2x             | 2.5x          |

**Notes:**
- Telegraph durations are NOT affected by difficulty scaling — players always have the same reaction window.
- Boss enrage thresholds remain at the same HP percentage regardless of difficulty.
- Loot drop rates are NOT affected by difficulty — only XP rewards scale.
