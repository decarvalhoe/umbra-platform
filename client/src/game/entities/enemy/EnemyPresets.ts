import type { EnemyConfig } from './Enemy'

/**
 * Predefined enemy configurations.
 *
 * Each preset defines the base stats for an enemy archetype.
 * These can be passed directly to the Enemy constructor.
 *
 * Archetypes:
 *   - shadow_wraith: Balanced melee bruiser. Medium speed, medium damage.
 *   - void_specter:  Slow but hits hard with longer range. High cooldown.
 *   - blood_hound:   Fast glass-cannon. Low HP, rapid attacks, wide detection.
 */
export const ENEMY_PRESETS: Record<string, EnemyConfig> = {
  shadow_wraith: {
    type: 'shadow_wraith',
    health: 150,
    attackDamage: 12,
    moveSpeed: 120,
    detectionRange: 200,
    attackRange: 40,
    attackCooldown: 1500,
    element: 'shadow',
  },
  void_specter: {
    type: 'void_specter',
    health: 100,
    attackDamage: 18,
    moveSpeed: 90,
    detectionRange: 250,
    attackRange: 80,
    attackCooldown: 2000,
    element: 'void',
  },
  blood_hound: {
    type: 'blood_hound',
    health: 80,
    attackDamage: 8,
    moveSpeed: 180,
    detectionRange: 300,
    attackRange: 35,
    attackCooldown: 800,
    element: 'blood',
  },
}
