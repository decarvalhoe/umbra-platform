/**
 * Data-driven configuration for enemy entities.
 *
 * Each enemy type defines its own config object that controls
 * detection ranges, combat stats, movement speeds, and loot.
 * The Enemy class reads these values at construction time,
 * so balancing is done entirely through config -- no code changes needed.
 */
export interface EnemyConfig {
  /** Display name (used in UI and debug logs). */
  name: string

  /** Distance (px) at which the enemy detects the player and enters ALERT. */
  detectionRange: number

  /** Distance (px) at which the enemy can execute a melee attack. */
  attackRange: number

  /** Movement speed (px/s) while chasing the player. */
  chaseSpeed: number

  /** Duration (ms) of the telegraph wind-up before an attack. */
  telegraphDuration: number

  /** Base damage dealt per attack. */
  attackDamage: number

  /** Maximum hit points. */
  hp: number

  /** Flat damage reduction applied to incoming hits. */
  defense: number

  /** Experience points awarded to the player on kill. */
  xpReward: number

  /** Elemental affinity (null = physical / untyped). */
  element: 'fire' | 'shadow' | 'blood' | 'void' | null
}

// ---------------------------------------------------------------------------
// Enemy configs
// ---------------------------------------------------------------------------

/**
 * Shadow Wraith -- a mid-range shadow elemental.
 *
 * Behavior notes (from GDD):
 *   - Patrols slowly, detects at 300px.
 *   - Short telegraph (500ms) makes it a fair but punishing fight.
 *   - Moderate HP and damage -- intended as a common encounter in Act I.
 */
export const shadowWraithConfig: EnemyConfig = {
  name: 'Shadow Wraith',
  detectionRange: 300,
  attackRange: 80,
  chaseSpeed: 120,
  telegraphDuration: 500,
  attackDamage: 25,
  hp: 120,
  defense: 10,
  xpReward: 15,
  element: 'shadow',
}
