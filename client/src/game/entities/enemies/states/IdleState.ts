import { EnemyState, EnemyStateType } from '../EnemyFSM'
import { StateFactory } from './StateFactory'

/**
 * Idle state -- enemy is stationary, waiting for the player to enter detection range.
 *
 * This is the default state for all enemies. The enemy stands still
 * (or plays a patrol/breathing animation) and checks every frame
 * whether the player has entered its detection radius.
 *
 * Transitions:
 *   -> ALERT  when the player enters `config.detectionRange`
 */
export class IdleState extends EnemyState {
  get name(): EnemyStateType {
    return EnemyStateType.IDLE
  }

  enter(): void {
    this.enemy.setVelocity(0, 0)
    // this.enemy.anims.play('enemy-idle', true)  // Enable when sprites are ready
  }

  update(_delta: number): void {
    const distance = this.enemy.distanceToPlayer()

    // Player entered detection range -- go on alert
    if (distance !== null && distance <= this.enemy.config.detectionRange) {
      this.enemy.fsm.transition(StateFactory.create('ALERT', this.enemy))
      return
    }
  }

  exit(): void {
    // Nothing to clean up
  }
}
