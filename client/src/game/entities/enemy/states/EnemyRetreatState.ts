import Phaser from 'phaser'
import { EnemyState } from '../EnemyFSM'
import { EnemyStateFactory } from './EnemyStateFactory'

/** Minimum retreat duration (ms). */
const MIN_RETREAT_DURATION = 1000

/** Maximum retreat duration (ms). */
const MAX_RETREAT_DURATION = 2000

/** Speed multiplier relative to base moveSpeed while retreating. */
const RETREAT_SPEED_FACTOR = 0.75

/**
 * Retreat state -- enemy backs away from the player to create spacing.
 *
 * After an attack, the enemy retreats in the opposite direction from
 * its target for a random duration. This prevents the enemy from
 * constantly crowding the player and creates breathing room for both
 * sides.
 *
 * After retreating, the enemy transitions back to CHASE if the player
 * is still in detection range, otherwise to PATROL.
 *
 * Transitions:
 *   -> CHASE  when retreat ends and target is still in detection range
 *   -> PATROL when retreat ends and target is out of range
 */
export class EnemyRetreatState extends EnemyState {
  private elapsed = 0
  private retreatDuration = 0

  get name(): string {
    return 'RETREAT'
  }

  enter(): void {
    this.elapsed = 0
    this.retreatDuration =
      MIN_RETREAT_DURATION + Math.random() * (MAX_RETREAT_DURATION - MIN_RETREAT_DURATION)

    // Move away from target
    if (this.enemy.target) {
      const angle = Phaser.Math.Angle.Between(
        this.enemy.target.x,
        this.enemy.target.y,
        this.enemy.x,
        this.enemy.y
      )
      const speed = this.enemy.moveSpeed * RETREAT_SPEED_FACTOR
      this.enemy.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed)
      this.enemy.facingDirection = { x: -Math.cos(angle), y: -Math.sin(angle) }
      // Face the player while retreating
      this.enemy.setFlipX(this.enemy.target.x < this.enemy.x)
    }
  }

  update(delta: number): void {
    this.elapsed += delta

    // Retreat timer expired
    if (this.elapsed >= this.retreatDuration) {
      if (
        this.enemy.target &&
        this.enemy.isTargetInRange(this.enemy.detectionRange)
      ) {
        this.enemy.fsm.transition(EnemyStateFactory.create('CHASE', this.enemy))
      } else {
        this.enemy.fsm.transition(EnemyStateFactory.create('PATROL', this.enemy))
      }
      return
    }
  }

  exit(): void {
    this.elapsed = 0
    this.enemy.setVelocity(0, 0)
  }
}
