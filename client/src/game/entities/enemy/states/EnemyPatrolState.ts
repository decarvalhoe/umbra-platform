import Phaser from 'phaser'
import { EnemyState } from '../EnemyFSM'
import { EnemyStateFactory } from './EnemyStateFactory'

/** Minimum patrol leg duration (ms). */
const MIN_PATROL_DURATION = 2000

/** Maximum patrol leg duration (ms). */
const MAX_PATROL_DURATION = 4000

/** Radius around the spawn point within which waypoints are generated (px). */
const PATROL_RADIUS = 100

/** Speed multiplier relative to the enemy's base moveSpeed while patrolling. */
const PATROL_SPEED_FACTOR = 0.5

/**
 * Patrol state -- enemy wanders randomly near its spawn point.
 *
 * On enter, a random waypoint is selected within PATROL_RADIUS of the
 * enemy's spawn position. The enemy moves towards that point at half
 * speed for a random duration, then returns to IDLE.
 *
 * If the player enters detection range during the patrol, the enemy
 * immediately transitions to CHASE.
 *
 * Transitions:
 *   -> IDLE  when the patrol timer expires
 *   -> CHASE when the player enters detection range
 */
export class EnemyPatrolState extends EnemyState {
  private elapsed = 0
  private patrolDuration = 0
  private waypointX = 0
  private waypointY = 0

  get name(): string {
    return 'PATROL'
  }

  enter(): void {
    this.elapsed = 0
    this.patrolDuration =
      MIN_PATROL_DURATION + Math.random() * (MAX_PATROL_DURATION - MIN_PATROL_DURATION)

    // Pick a random waypoint within PATROL_RADIUS of the enemy's current position
    const angle = Math.random() * Math.PI * 2
    const distance = Math.random() * PATROL_RADIUS
    this.waypointX = this.enemy.x + Math.cos(angle) * distance
    this.waypointY = this.enemy.y + Math.sin(angle) * distance
  }

  update(delta: number): void {
    this.elapsed += delta

    // Check for player in detection range
    if (this.enemy.target && this.enemy.isTargetInRange(this.enemy.detectionRange)) {
      this.enemy.fsm.transition(EnemyStateFactory.create('CHASE', this.enemy))
      return
    }

    // Move towards waypoint at reduced speed
    const distToWaypoint = Phaser.Math.Distance.Between(
      this.enemy.x,
      this.enemy.y,
      this.waypointX,
      this.waypointY
    )

    if (distToWaypoint > 4) {
      const angle = Phaser.Math.Angle.Between(
        this.enemy.x,
        this.enemy.y,
        this.waypointX,
        this.waypointY
      )
      const speed = this.enemy.moveSpeed * PATROL_SPEED_FACTOR
      this.enemy.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed)
      this.enemy.facingDirection = { x: Math.cos(angle), y: Math.sin(angle) }
      this.enemy.setFlipX(this.waypointX < this.enemy.x)
    } else {
      // Reached waypoint -- stop moving
      this.enemy.setVelocity(0, 0)
    }

    // Patrol timer expired -- back to idle
    if (this.elapsed >= this.patrolDuration) {
      this.enemy.fsm.transition(EnemyStateFactory.create('IDLE', this.enemy))
      return
    }
  }

  exit(): void {
    this.elapsed = 0
    this.enemy.setVelocity(0, 0)
  }
}
