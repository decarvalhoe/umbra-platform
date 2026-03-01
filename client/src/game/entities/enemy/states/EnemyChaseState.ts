import { EnemyState } from '../EnemyFSM'
import { EnemyStateFactory } from './EnemyStateFactory'

/**
 * Hysteresis factor for losing aggro.
 * The player must exceed detectionRange * HYSTERESIS_FACTOR before the
 * enemy gives up the chase, preventing rapid state oscillation at the
 * detection boundary.
 */
const HYSTERESIS_FACTOR = 1.5

/** Maximum chase duration (ms) to prevent infinite chasing. */
const MAX_CHASE_DURATION = 8000

/**
 * Chase state -- enemy pursues the player at full speed.
 *
 * The enemy moves directly towards its target. If the target enters
 * attack range and the attack cooldown has elapsed, transitions to
 * ATTACK. If the target moves beyond the hysteresis range or the
 * chase duration is exceeded, the enemy gives up.
 *
 * Transitions:
 *   -> ATTACK when target is in attack range and attack is off cooldown
 *   -> IDLE   when target exceeds detection range * 1.5 or chase times out
 */
export class EnemyChaseState extends EnemyState {
  private elapsed = 0

  get name(): string {
    return 'CHASE'
  }

  enter(): void {
    this.elapsed = 0
  }

  update(delta: number): void {
    this.elapsed += delta

    // No target -- return to idle
    if (!this.enemy.target) {
      this.enemy.fsm.transition(EnemyStateFactory.create('IDLE', this.enemy))
      return
    }

    const distToTarget = this.enemy.distanceToTarget()

    // Target out of range (with hysteresis) or chase timed out
    if (
      distToTarget > this.enemy.detectionRange * HYSTERESIS_FACTOR ||
      this.elapsed >= MAX_CHASE_DURATION
    ) {
      this.enemy.fsm.transition(EnemyStateFactory.create('IDLE', this.enemy))
      return
    }

    // Target in attack range and attack ready
    if (this.enemy.isTargetInRange(this.enemy.attackRange) && this.enemy.canAttack()) {
      this.enemy.fsm.transition(EnemyStateFactory.create('ATTACK', this.enemy))
      return
    }

    // Move towards target at full speed
    this.enemy.moveTowardsTarget()
  }

  exit(): void {
    this.elapsed = 0
    this.enemy.setVelocity(0, 0)
  }
}
