import { EnemyState } from '../EnemyFSM'
import { EnemyStateFactory } from './EnemyStateFactory'

/** Duration of the attack windup before the hit lands (ms). */
const WINDUP_DURATION = 300

/** Duration of the active hit frame (ms). */
const HIT_DURATION = 100

/** Duration of the recovery after the hit (ms). */
const RECOVERY_DURATION = 200

/** Total attack duration: windup + hit + recovery. */
const TOTAL_DURATION = WINDUP_DURATION + HIT_DURATION + RECOVERY_DURATION

/**
 * Attack state -- enemy performs a melee attack against its target.
 *
 * Attack timeline (600ms total):
 *   0-300ms   Windup  -- enemy stops, prepares to strike
 *   300-400ms Hit     -- damage event emitted, hit applied
 *   400-600ms Recovery -- enemy finishes the animation
 *
 * After recovery, the enemy transitions to CHASE if the player is
 * still within detection range, otherwise to RETREAT for spacing.
 *
 * Transitions:
 *   -> CHASE   when target is still in detection range after attack
 *   -> RETREAT when target is out of range or for spacing
 */
export class EnemyAttackState extends EnemyState {
  private elapsed = 0
  private hasHit = false

  get name(): string {
    return 'ATTACK'
  }

  enter(): void {
    this.elapsed = 0
    this.hasHit = false

    // Stop movement during attack
    this.enemy.setVelocity(0, 0)

    // Face the target
    if (this.enemy.target) {
      this.enemy.setFlipX(this.enemy.target.x < this.enemy.x)
    }

    // Visual feedback -- slight tint to indicate windup
    this.enemy.setTint(0xff8888)
  }

  update(delta: number): void {
    this.elapsed += delta

    // Apply hit once during the hit window
    if (!this.hasHit && this.elapsed >= WINDUP_DURATION) {
      this.hasHit = true
      this.enemy.lastAttackTime = Date.now()

      // Emit hit event with position and damage for combat resolution
      this.enemy.scene.events.emit('enemy-attack-hit', {
        enemy: this.enemy,
        x: this.enemy.x + this.enemy.facingDirection.x * this.enemy.attackRange,
        y: this.enemy.y + this.enemy.facingDirection.y * this.enemy.attackRange,
        damage: this.enemy.attackDamage,
        range: this.enemy.attackRange,
      })
    }

    // Attack animation still playing
    if (this.elapsed < TOTAL_DURATION) {
      return
    }

    // Attack complete -- decide next state
    if (
      this.enemy.target &&
      this.enemy.isTargetInRange(this.enemy.detectionRange)
    ) {
      this.enemy.fsm.transition(EnemyStateFactory.create('CHASE', this.enemy))
    } else {
      this.enemy.fsm.transition(EnemyStateFactory.create('RETREAT', this.enemy))
    }
  }

  exit(): void {
    this.elapsed = 0
    this.hasHit = false
    this.enemy.clearTint()
    this.enemy.setTint(0xff4444) // Restore default red tint
  }
}
