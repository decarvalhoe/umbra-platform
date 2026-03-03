import Phaser from 'phaser'
import { PlayerState } from '../PlayerFSM'
import { StateFactory } from './StateFactory'

/** Duration of the hurt stun in ms. */
const HURT_STUN_DURATION = 300

/** Knockback speed applied when taking damage. */
const KNOCKBACK_SPEED = 120

/**
 * Hurt state -- brief stun when the player takes damage.
 *
 * Mechanics:
 *   - Player is stunned for 300ms and cannot act.
 *   - A small knockback pushes the player away from the damage source.
 *   - Visual flash indicates the hit.
 *
 * Transitions:
 *   -> IDLE when the stun duration expires
 *   -> DEAD if health reaches 0 (handled externally via Player.takeDamage)
 */
export class HurtState extends PlayerState {
  private elapsed = 0
  private flashTimer = 0

  get name(): string {
    return 'HURT'
  }

  enter(): void {
    this.player.playAnim('player-hurt')
    this.elapsed = 0
    this.flashTimer = 0

    // Apply knockback in the opposite direction the player is facing
    const knockbackDir = this.player.flipX ? 1 : -1
    this.player.setVelocity(knockbackDir * KNOCKBACK_SPEED, -KNOCKBACK_SPEED * 0.3)

    // Temporary invulnerability during hurt stun
    this.player.isInvulnerable = true

    // Visual feedback -- tint red
    this.player.setTint(0xff4444)

    // this.player.anims.play('player-hurt', true)  // Enable when sprites are ready

    this.player.scene.events.emit('player-hurt')
  }

  update(delta: number): void {
    this.elapsed += delta

    // Flash effect -- toggle visibility rapidly
    this.flashTimer += delta
    if (this.flashTimer >= 60) {
      this.flashTimer = 0
      this.player.setAlpha(this.player.alpha < 1 ? 1 : 0.4)
    }

    // Decelerate knockback over time
    const body = this.player.body as Phaser.Physics.Arcade.Body
    if (body) {
      body.velocity.scale(0.92)
    }

    // Stun complete
    if (this.elapsed >= HURT_STUN_DURATION) {
      this.player.fsm.transition(StateFactory.create('IDLE', this.player))
      return
    }
  }

  exit(): void {
    this.elapsed = 0
    this.flashTimer = 0
    this.player.isInvulnerable = false
    this.player.setAlpha(1)
    this.player.clearTint()
    this.player.setVelocity(0, 0)
  }
}
