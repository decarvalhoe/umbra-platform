import Phaser from 'phaser'
import { PlayerState } from '../PlayerFSM'

/** Duration of the death animation in ms before emitting the final event. */
const DEATH_ANIM_DURATION = 800

/**
 * Dead state -- the player has been defeated.
 *
 * Mechanics:
 *   - Plays a death animation / fade out.
 *   - Emits 'player-dead' event for the scene to handle (respawn, game over, etc.).
 *   - No transitions out -- this is a terminal state.
 *     The scene must reset or destroy the player externally.
 */
export class DeadState extends PlayerState {
  private elapsed = 0
  private eventEmitted = false

  get name(): string {
    return 'DEAD'
  }

  enter(): void {
    this.elapsed = 0
    this.eventEmitted = false

    // Freeze the player
    this.player.setVelocity(0, 0)
    this.player.isInvulnerable = true

    // Disable physics body so nothing interacts with the corpse
    const body = this.player.body as Phaser.Physics.Arcade.Body
    if (body) {
      body.enable = false
    }

    // Visual -- tint dark and begin fade
    this.player.setTint(0x333333)

    // this.player.anims.play('player-death', true)  // Enable when sprites are ready

    this.player.scene.events.emit('player-dying')
  }

  update(delta: number): void {
    this.elapsed += delta

    // Gradual fade out
    const progress = Math.min(this.elapsed / DEATH_ANIM_DURATION, 1)
    this.player.setAlpha(1 - progress * 0.8) // Fade to 0.2 alpha, not fully invisible

    // Emit the final death event once the animation completes
    if (!this.eventEmitted && this.elapsed >= DEATH_ANIM_DURATION) {
      this.eventEmitted = true
      this.player.scene.events.emit('player-dead')
    }
  }

  exit(): void {
    // DeadState is terminal -- exit() is provided for interface compliance
    // but should not normally be called.
    this.elapsed = 0
    this.eventEmitted = false
    this.player.setAlpha(1)
    this.player.clearTint()
  }
}
