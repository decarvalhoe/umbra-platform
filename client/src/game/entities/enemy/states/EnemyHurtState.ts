import { EnemyState } from '../EnemyFSM'
import { EnemyStateFactory } from './EnemyStateFactory'

/** Duration of the hurt stun in ms. */
const HURT_STUN_DURATION = 200

/**
 * Hurt state -- brief stun when the enemy takes damage.
 *
 * Mechanics:
 *   - Enemy is stunned for 200ms and cannot act.
 *   - A red tint flash provides visual feedback.
 *   - Knockback velocity may be applied externally via Enemy.takeDamage().
 *   - After the stun, the enemy becomes aggressive and transitions to CHASE.
 *
 * Transitions:
 *   -> CHASE when the stun duration expires (enemies get angry when hurt)
 *   -> DEAD  if health reaches 0 (handled externally via Enemy.takeDamage)
 */
export class EnemyHurtState extends EnemyState {
  private elapsed = 0
  private flashTimer = 0

  get name(): string {
    return 'HURT'
  }

  enter(): void {
    this.elapsed = 0
    this.flashTimer = 0

    // Temporary invulnerability during hurt stun
    this.enemy.isInvulnerable = true

    // Visual feedback -- bright red tint
    this.enemy.setTint(0xff0000)
  }

  update(delta: number): void {
    this.elapsed += delta

    // Flash effect -- toggle alpha rapidly
    this.flashTimer += delta
    if (this.flashTimer >= 50) {
      this.flashTimer = 0
      this.enemy.setAlpha(this.enemy.alpha < 1 ? 1 : 0.4)
    }

    // Decelerate knockback over time
    const body = this.enemy.body as Phaser.Physics.Arcade.Body
    if (body) {
      body.velocity.scale(0.9)
    }

    // Stun complete -- become aggressive
    if (this.elapsed >= HURT_STUN_DURATION) {
      this.enemy.fsm.transition(EnemyStateFactory.create('CHASE', this.enemy))
      return
    }
  }

  exit(): void {
    this.elapsed = 0
    this.flashTimer = 0
    this.enemy.isInvulnerable = false
    this.enemy.setAlpha(1)
    this.enemy.clearTint()
    this.enemy.setTint(0xff4444) // Restore default red tint
    this.enemy.setVelocity(0, 0)
  }
}
