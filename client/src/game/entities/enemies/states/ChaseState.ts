import { EnemyState, EnemyStateType } from '../EnemyFSM'
import { StateFactory } from './StateFactory'

/**
 * Chase state -- enemy moves toward the player.
 *
 * The enemy pursues the player at `config.chaseSpeed` using simple
 * vector-based movement (no pathfinding). The sprite flips to face
 * the direction of movement.
 *
 * Transitions:
 *   -> TELEGRAPH  when the player is within `config.attackRange`
 *   -> IDLE       when the player leaves `config.detectionRange`
 */
export class ChaseState extends EnemyState {
  get name(): EnemyStateType {
    return EnemyStateType.CHASE
  }

  enter(): void {
    this.enemy.playAnim('chase')
    // this.enemy.anims.play('enemy-run', true)  // Enable when sprites are ready
  }

  update(_delta: number): void {
    const distance = this.enemy.distanceToPlayer()
    const playerPos = this.enemy.getPlayerPosition()

    // Player out of range or destroyed -- return to idle
    if (distance === null || playerPos === null) {
      this.enemy.setVelocity(0, 0)
      this.enemy.fsm.transition(StateFactory.create('IDLE', this.enemy))
      return
    }

    // Player left detection range -- disengage
    if (distance > this.enemy.config.detectionRange) {
      this.enemy.setVelocity(0, 0)
      this.enemy.fsm.transition(StateFactory.create('IDLE', this.enemy))
      return
    }

    // Close enough to attack -- begin telegraph
    if (distance <= this.enemy.config.attackRange) {
      this.enemy.setVelocity(0, 0)
      this.enemy.fsm.transition(StateFactory.create('TELEGRAPH', this.enemy))
      return
    }

    // Move toward the player
    const dx = playerPos.x - this.enemy.x
    const dy = playerPos.y - this.enemy.y
    const len = Math.sqrt(dx * dx + dy * dy)

    if (len > 0) {
      const speed = this.enemy.config.chaseSpeed
      this.enemy.setVelocity((dx / len) * speed, (dy / len) * speed)

      // Flip sprite to face movement direction
      if (dx < 0) {
        this.enemy.setFlipX(true)
      } else if (dx > 0) {
        this.enemy.setFlipX(false)
      }
    }
  }

  exit(): void {
    this.enemy.setVelocity(0, 0)
  }
}
