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
  enrageTimerMs: 180000, // 3 minutes
  xpReward: 500,
  minionSummonThreshold: 0.75,
  minionCount: 2,
}
