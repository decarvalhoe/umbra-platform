import Phaser from 'phaser'
import { EnemyState, EnemyStateType } from '../EnemyFSM'

/** Duration of the death animation in ms before emitting loot/cleanup events. */
const DEATH_ANIM_DURATION = 600

/**
 * Dead state -- the enemy has been defeated.
 *
 * Mechanics:
 *   - Plays a death animation / fade out.
 *   - Emits 'enemy-died' and 'loot-drop' events for the scene to handle.
 *   - No transitions out -- this is a terminal state.
 *     The scene must destroy the enemy externally after handling events.
 */
export class DeadState extends EnemyState {
  private elapsed = 0
  private eventsEmitted = false

  get name(): EnemyStateType {
    return EnemyStateType.DEAD
  }

  enter(): void {
    this.enemy.playAnim('dead')
    this.elapsed = 0
    this.eventsEmitted = false

    // Freeze the enemy
    this.enemy.setVelocity(0, 0)

    // Disable physics body so nothing interacts with the corpse
    const body = this.enemy.body as Phaser.Physics.Arcade.Body
    if (body) {
      body.enable = false
    }

    // Visual -- tint dark
    this.enemy.setTint(0x333333)

    // this.enemy.anims.play('enemy-death', true)  // Enable when sprites are ready

    this.enemy.scene.events.emit('enemy-dying', this.enemy)
  }

  update(delta: number): void {
    this.elapsed += delta

    // Gradual fade out
    const progress = Math.min(this.elapsed / DEATH_ANIM_DURATION, 1)
    this.enemy.setAlpha(1 - progress * 0.9) // Fade to 0.1 alpha

    // Emit final events once the animation completes
    if (!this.eventsEmitted && this.elapsed >= DEATH_ANIM_DURATION) {
      this.eventsEmitted = true

      this.enemy.scene.events.emit('enemy-died', this.enemy)
      this.enemy.scene.events.emit('loot-drop', {
        x: this.enemy.x,
        y: this.enemy.y,
        xpReward: this.enemy.config.xpReward,
        element: this.enemy.config.element,
        enemyName: this.enemy.config.name,
      })
    }
  }

  exit(): void {
    // DeadState is terminal -- exit() is provided for interface compliance
    // but should not normally be called.
    this.elapsed = 0
    this.eventsEmitted = false
    this.enemy.setAlpha(1)
    this.enemy.clearTint()
  }
}
