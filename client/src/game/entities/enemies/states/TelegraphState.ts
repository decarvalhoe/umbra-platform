import { EnemyState, EnemyStateType } from '../EnemyFSM'
import { StateFactory } from './StateFactory'

/**
 * Telegraph state -- wind-up animation before an attack.
 *
 * This is a core fairness mechanic: the enemy clearly signals its
 * upcoming attack for `config.telegraphDuration` ms, giving the player
 * time to dodge or reposition. The telegraph cannot be cancelled --
 * once started, the enemy commits to the attack.
 *
 * Transitions:
 *   -> ATTACK  after `config.telegraphDuration` ms
 */
export class TelegraphState extends EnemyState {
  private elapsed = 0

  get name(): EnemyStateType {
    return EnemyStateType.TELEGRAPH
  }

  enter(): void {
    this.enemy.playAnim('attack')
    this.elapsed = 0

    // Stop moving during telegraph
    this.enemy.setVelocity(0, 0)

    // Visual feedback -- tint orange to warn the player
    this.enemy.setTint(0xff8800)

    // this.enemy.anims.play('enemy-telegraph', true)  // Enable when sprites are ready

    this.enemy.scene.events.emit('enemy-telegraph', this.enemy)
  }

  update(delta: number): void {
    this.elapsed += delta

    // Telegraph is non-cancellable -- always runs to completion
    if (this.elapsed >= this.enemy.config.telegraphDuration) {
      this.enemy.fsm.transition(StateFactory.create('ATTACK', this.enemy))
      return
    }
  }

  exit(): void {
    this.elapsed = 0
    this.enemy.clearTint()
    this.enemy.setTint(this.enemy.baseTint)
  }
}
