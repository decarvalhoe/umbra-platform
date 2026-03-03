/**
 * Data-driven configuration for boss entities.
 *
 * Extends the base EnemyConfig pattern with boss-specific fields:
 * phase thresholds, attack tables per phase, vulnerability windows,
 * enrage timer, and loot configuration.
 */

import type { Element } from '../../../types/game'

/** Timing configuration for a single boss attack. */
export interface BossAttackTiming {
  /** Duration (ms) of the telegraph wind-up. */
  telegraphMs: number
  /** Duration (ms) of the active attack. */
  activeMs: number
  /** Duration (ms) of the recovery window after the attack. */
  recoveryMs: number
  /** Minimum cooldown (ms) before this attack can be used again. */
  cooldownMs: number
}

/** Full configuration for a single boss attack. */
export interface BossAttackConfig {
  /** Identifier for this attack type. */
  id: string
  /** Display name for UI/telegraph indicators. */
  name: string
  /** Timing data for telegraph, active, recovery, and cooldown. */
  timing: BossAttackTiming
  /** Base damage dealt by this attack. */
  damage: number
  /** Range (px) of the attack. */
  range: number
  /** Element of the attack (if any). */
  element: Element | null
  /** AoE radius (px), 0 for single-target/line attacks. */
  aoeRadius: number
  /** Color of the telegraph indicator (hex). */
  telegraphColor: number
  /** Color of the attack hitbox (hex). */
  attackColor: number
}

/** Phase threshold configuration. */
export interface BossPhaseConfig {
  /** Phase identifier. */
  id: string
  /** HP percentage threshold to enter this phase (e.g. 0.5 = 50%). */
  hpThreshold: number
  /** Attacks available during this phase. */
  attacks: BossAttackConfig[]
  /** Speed multiplier for this phase (1.0 = normal). */
  speedMultiplier: number
  /** Attack speed multiplier (affects telegraph duration). */
  attackSpeedMultiplier: number
  /** Tint applied to the boss sprite during this phase. */
  tint: number
}

/** Full boss configuration. */
export interface BossEntityConfig {
  /** Display name. */
  name: string
  /** Maximum hit points. */
  maxHp: number
  /** Base attack damage. */
  attack: number
  /** Flat damage reduction. */
  defense: number
  /** Base movement speed (px/s). */
  speed: number
  /** Elemental affinity. */
  element: Element | null
  /** Detection range (px) -- typically arena-wide. */
  detectionRange: number
  /** Melee attack range (px). */
  meleeRange: number
  /** Ranged attack range (px). */
  rangedRange: number
  /** Phase configurations (ordered by HP threshold, descending). */
  phases: BossPhaseConfig[]
  /** Duration (ms) of the vulnerability window after each attack. */
  vulnerabilityDurationMs: number
  /** Damage multiplier applied during vulnerability windows. */
  vulnerabilityDamageMult: number
  /** Enrage timer (ms). Boss enters rage mode when this expires. */
  enrageTimerMs: number
  /** XP reward on defeat. */
  xpReward: number
  /** HP threshold to summon minions (e.g. 0.75 = 75%). Phase 1 only. */
  minionSummonThreshold: number
  /** Number of minions to summon. */
  minionCount: number
}

// ---------------------------------------------------------------------------
// Corrupted Guardian attack definitions
// ---------------------------------------------------------------------------

const groundSlamP1: BossAttackConfig = {
  id: 'ground_slam',
  name: 'Ground Slam',
  timing: {
    telegraphMs: 1500,
    activeMs: 500,
    recoveryMs: 2000,
    cooldownMs: 3000,
  },
  damage: 50,
  range: 200,
  element: 'fire',
  aoeRadius: 200,
  telegraphColor: 0xff8800,
  attackColor: 0xff4400,
}

const shadowBoltP1: BossAttackConfig = {
  id: 'shadow_bolt',
  name: 'Shadow Bolt',
  timing: {
    telegraphMs: 1500,
    activeMs: 300,
    recoveryMs: 2000,
    cooldownMs: 3500,
  },
  damage: 30,
  range: 350,
  element: 'shadow',
  aoeRadius: 60,
  telegraphColor: 0x6622cc,
  attackColor: 0x440088,
}

const groundSlamP2: BossAttackConfig = {
  id: 'ground_slam',
  name: 'Ground Slam',
  timing: {
    telegraphMs: 1000,
    activeMs: 400,
    recoveryMs: 2000,
    cooldownMs: 2400,
  },
  damage: 65,
  range: 220,
  element: 'fire',
  aoeRadius: 220,
  telegraphColor: 0xff4400,
  attackColor: 0xff0000,
}

const shadowBoltP2: BossAttackConfig = {
  id: 'shadow_bolt',
  name: 'Shadow Bolt',
  timing: {
    telegraphMs: 1000,
    activeMs: 200,
    recoveryMs: 2000,
    cooldownMs: 2800,
  },
  damage: 40,
  range: 350,
  element: 'shadow',
  aoeRadius: 60,
  telegraphColor: 0x440088,
  attackColor: 0x220044,
}

const corruptionWave: BossAttackConfig = {
  id: 'corruption_wave',
  name: 'Corruption Wave',
  timing: {
    telegraphMs: 1000,
    activeMs: 800,
    recoveryMs: 2000,
    cooldownMs: 5000,
  },
  damage: 45,
  range: 400,
  element: 'void',
  aoeRadius: 400,
  telegraphColor: 0x222244,
  attackColor: 0x110022,
}

// ---------------------------------------------------------------------------
// Corrupted Guardian config
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Flame Tyrant attack definitions
// ---------------------------------------------------------------------------

const flamePillar: BossAttackConfig = {
  id: 'flame_pillar',
  name: 'Flame Pillar',
  timing: { telegraphMs: 1200, activeMs: 600, recoveryMs: 1800, cooldownMs: 3000 },
  damage: 45,
  range: 250,
  element: 'fire',
  aoeRadius: 120,
  telegraphColor: 0xff6600,
  attackColor: 0xff2200,
}

const magmaSpit: BossAttackConfig = {
  id: 'magma_spit',
  name: 'Magma Spit',
  timing: { telegraphMs: 800, activeMs: 400, recoveryMs: 1500, cooldownMs: 2500 },
  damage: 35,
  range: 350,
  element: 'fire',
  aoeRadius: 80,
  telegraphColor: 0xff8800,
  attackColor: 0xff4400,
}

const magmaPool: BossAttackConfig = {
  id: 'magma_pool',
  name: 'Magma Pool',
  timing: { telegraphMs: 1000, activeMs: 800, recoveryMs: 2000, cooldownMs: 5000 },
  damage: 20,
  range: 300,
  element: 'fire',
  aoeRadius: 150,
  telegraphColor: 0xcc4400,
  attackColor: 0xaa2200,
}

const fireCharge: BossAttackConfig = {
  id: 'fire_charge',
  name: 'Fire Charge',
  timing: { telegraphMs: 1000, activeMs: 600, recoveryMs: 2500, cooldownMs: 6000 },
  damage: 70,
  range: 400,
  element: 'fire',
  aoeRadius: 60,
  telegraphColor: 0xff4400,
  attackColor: 0xff0000,
}

const infernoBreath: BossAttackConfig = {
  id: 'inferno_breath',
  name: 'Inferno Breath',
  timing: { telegraphMs: 1200, activeMs: 1000, recoveryMs: 2000, cooldownMs: 7000 },
  damage: 55,
  range: 300,
  element: 'fire',
  aoeRadius: 200,
  telegraphColor: 0xff6600,
  attackColor: 0xff0000,
}

const eruption: BossAttackConfig = {
  id: 'eruption',
  name: 'Eruption',
  timing: { telegraphMs: 1500, activeMs: 1200, recoveryMs: 2500, cooldownMs: 8000 },
  damage: 80,
  range: 500,
  element: 'fire',
  aoeRadius: 350,
  telegraphColor: 0xcc2200,
  attackColor: 0xff0000,
}

// ---------------------------------------------------------------------------
// Flame Tyrant config
// ---------------------------------------------------------------------------

export const flameTyrantConfig: BossEntityConfig = {
  name: 'Flame Tyrant',
  maxHp: 2500,
  attack: 50,
  defense: 18,
  speed: 80,
  element: 'fire',
  detectionRange: 800,
  meleeRange: 130,
  rangedRange: 350,
  phases: [
    {
      id: 'smoldering',
      hpThreshold: 1.0,
      attacks: [flamePillar, magmaSpit],
      speedMultiplier: 1.0,
      attackSpeedMultiplier: 1.0,
      tint: 0xff6b35,
    },
    {
      id: 'inferno',
      hpThreshold: 0.6,
      attacks: [flamePillar, magmaSpit, magmaPool, fireCharge],
      speedMultiplier: 1.2,
      attackSpeedMultiplier: 1.15,
      tint: 0xff4400,
    },
    {
      id: 'supernova',
      hpThreshold: 0.25,
      attacks: [fireCharge, infernoBreath, eruption, magmaPool],
      speedMultiplier: 1.4,
      attackSpeedMultiplier: 1.3,
      tint: 0xff0000,
    },
  ],
  vulnerabilityDurationMs: 1800,
  vulnerabilityDamageMult: 1.5,
  enrageTimerMs: 180000,
  xpReward: 750,
  minionSummonThreshold: 0.75,
  minionCount: 0,
}

// ---------------------------------------------------------------------------
// Void Harbinger attack definitions
// ---------------------------------------------------------------------------

const voidRift: BossAttackConfig = {
  id: 'void_rift',
  name: 'Void Rift',
  timing: { telegraphMs: 1200, activeMs: 600, recoveryMs: 2000, cooldownMs: 3000 },
  damage: 40,
  range: 250,
  element: 'void',
  aoeRadius: 130,
  telegraphColor: 0x220044,
  attackColor: 0x110022,
}

const gravityWell: BossAttackConfig = {
  id: 'gravity_well',
  name: 'Gravity Well',
  timing: { telegraphMs: 1000, activeMs: 1000, recoveryMs: 2000, cooldownMs: 4000 },
  damage: 25,
  range: 300,
  element: 'void',
  aoeRadius: 180,
  telegraphColor: 0x330066,
  attackColor: 0x220044,
}

const realityTear: BossAttackConfig = {
  id: 'reality_tear',
  name: 'Reality Tear',
  timing: { telegraphMs: 800, activeMs: 400, recoveryMs: 1500, cooldownMs: 3500 },
  damage: 50,
  range: 400,
  element: 'void',
  aoeRadius: 60,
  telegraphColor: 0x440088,
  attackColor: 0x330066,
}

const phaseShift: BossAttackConfig = {
  id: 'phase_shift',
  name: 'Phase Shift',
  timing: { telegraphMs: 600, activeMs: 800, recoveryMs: 2500, cooldownMs: 6000 },
  damage: 35,
  range: 200,
  element: 'void',
  aoeRadius: 250,
  telegraphColor: 0x110033,
  attackColor: 0x000011,
}

const voidCollapse: BossAttackConfig = {
  id: 'void_collapse',
  name: 'Void Collapse',
  timing: { telegraphMs: 1800, activeMs: 1200, recoveryMs: 2500, cooldownMs: 9000 },
  damage: 90,
  range: 500,
  element: 'void',
  aoeRadius: 400,
  telegraphColor: 0x220044,
  attackColor: 0x000000,
}

// ---------------------------------------------------------------------------
// Void Harbinger config
// ---------------------------------------------------------------------------

export const voidHarbingerConfig: BossEntityConfig = {
  name: 'Void Harbinger',
  maxHp: 3000,
  attack: 55,
  defense: 15,
  speed: 90,
  element: 'void',
  detectionRange: 900,
  meleeRange: 100,
  rangedRange: 400,
  phases: [
    {
      id: 'incursion',
      hpThreshold: 1.0,
      attacks: [voidRift, gravityWell],
      speedMultiplier: 1.0,
      attackSpeedMultiplier: 1.0,
      tint: 0x330066,
    },
    {
      id: 'dimensional_collapse',
      hpThreshold: 0.55,
      attacks: [voidRift, gravityWell, realityTear, phaseShift],
      speedMultiplier: 1.25,
      attackSpeedMultiplier: 1.2,
      tint: 0x220044,
    },
    {
      id: 'annihilation',
      hpThreshold: 0.2,
      attacks: [realityTear, phaseShift, voidCollapse, gravityWell],
      speedMultiplier: 1.5,
      attackSpeedMultiplier: 1.4,
      tint: 0x110022,
    },
  ],
  vulnerabilityDurationMs: 1500,
  vulnerabilityDamageMult: 1.6,
  enrageTimerMs: 200000,
  xpReward: 1000,
  minionSummonThreshold: 0.7,
  minionCount: 0,
}

// ---------------------------------------------------------------------------
// Corrupted Guardian config
// ---------------------------------------------------------------------------

export const corruptedGuardianConfig: BossEntityConfig = {
  name: 'Corrupted Guardian',
  maxHp: 2500,
  attack: 45,
  defense: 22,
  speed: 70,
  element: 'fire',
  detectionRange: 800,
  meleeRange: 120,
  rangedRange: 300,
  phases: [
    {
      id: 'phase_1',
      hpThreshold: 1.0,
      attacks: [groundSlamP1, shadowBoltP1],
      speedMultiplier: 1.0,
      attackSpeedMultiplier: 1.0,
      tint: 0xff4400,
    },
    {
      id: 'phase_2',
      hpThreshold: 0.5,
      attacks: [groundSlamP2, shadowBoltP2, corruptionWave],
      speedMultiplier: 1.3,
      attackSpeedMultiplier: 1.0,
      tint: 0xff0000,
    },
  ],
  vulnerabilityDurationMs: 2000,
  vulnerabilityDamageMult: 1.5,
  enrageTimerMs: 180000,
  xpReward: 500,
  minionSummonThreshold: 0.75,
  minionCount: 2,
}
