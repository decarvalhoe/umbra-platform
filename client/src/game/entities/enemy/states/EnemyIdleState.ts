import { EnemyState } from '../EnemyFSM'
import { EnemyStateFactory } from './EnemyStateFactory'

/** Minimum idle duration before transitioning to PATROL (ms). */
const MIN_IDLE_DURATION = 1000

/** Maximum idle duration before transitioning to PATROL (ms). */
const MAX_IDLE_DURATION = 3000

/**
 * Idle state -- enemy stands still for a random duration, then patrols.
 *
 * While idle the enemy continuously scans for the player within its
 * detection range. If the player is detected, immediately transitions
 * to CHASE.
 *
 * Transitions:
 *   -> PATROL when the idle timer expires
 *   -> CHASE  when the player enters detection range
 */
export class EnemyIdleState extends EnemyState {
  private elapsed = 0
  private idleDuration = 0

  get name(): string {
    return 'IDLE'
  }

  enter(): void {
    this.elapsed = 0
    this.idleDuration =
      MIN_IDLE_DURATION + Math.random() * (MAX_IDLE_DURATION - MIN_IDLE_DURATION)
    this.enemy.setVelocity(0, 0)
  }

  update(delta: number): void {
    this.elapsed += delta

    // Check for player in detection range
    if (this.enemy.target && this.enemy.isTargetInRange(this.enemy.detectionRange)) {
      this.enemy.fsm.transition(EnemyStateFactory.create('CHASE', this.enemy))
      return
    }

    // Idle timer expired -- start patrolling
    if (this.elapsed >= this.idleDuration) {
      this.enemy.fsm.transition(EnemyStateFactory.create('PATROL', this.enemy))
      return
    }
  }

  exit(): void {
    this.elapsed = 0
  }
}
