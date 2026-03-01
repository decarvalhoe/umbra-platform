import { PlayerState } from '../PlayerFSM'
import { StateFactory } from './StateFactory'

/** Total duration of the dodge roll in ms. */
const DODGE_DURATION = 300

/** Duration of invulnerability during the roll (ms). Starts at frame 0. */
const IFRAME_DURATION = 200

/** Speed multiplier applied during the dodge roll. */
const DODGE_SPEED_MULTIPLIER = 2.5

/**
 * Dodge state -- a fast roll that grants brief invulnerability.
 *
 * Mechanics:
 *   - Consumes one dodge charge (2 max, 3s recharge each).
 *   - Rolls in the direction the player is facing (or last input direction).
 *   - Grants invulnerability for the first 200ms of the 300ms roll.
 *   - Player cannot act during the roll.
 *
 * Transitions:
 *   -> IDLE when the roll duration expires
 */
export class DodgeState extends PlayerState {
  private elapsed = 0
  private dodgeVx = 0
  private dodgeVy = 0

  get name(): string {
    return 'DODGE'
  }

  enter(): void {
    this.elapsed = 0

    // Consume a dodge charge
    this.player.consumeDodge()

    // Grant invulnerability
    this.player.isInvulnerable = true

    // Determine dodge direction from current input, fall back to facing direction
    const cursors = this.player.cursors
    const speed = this.player.moveSpeed * DODGE_SPEED_MULTIPLIER
    let vx = 0
    let vy = 0

    if (cursors.left.isDown) vx = -1
    else if (cursors.right.isDown) vx = 1

    if (cursors.up.isDown) vy = -1
    else if (cursors.down.isDown) vy = 1

    // If no directional input, roll in the direction the sprite is facing
    if (vx === 0 && vy === 0) {
      vx = this.player.flipX ? -1 : 1
    }

    // Normalize diagonal
    if (vx !== 0 && vy !== 0) {
      const diag = Math.SQRT1_2
      vx *= diag
      vy *= diag
    }

    this.dodgeVx = vx * speed
    this.dodgeVy = vy * speed

    this.player.setVelocity(this.dodgeVx, this.dodgeVy)

    // Visual feedback
    this.player.setAlpha(0.5)

    // this.player.anims.play('player-dodge', true)  // Enable when sprites are ready

    this.player.scene.events.emit('player-dodge')
  }

  update(delta: number): void {
    this.elapsed += delta

    // End invulnerability after iframe window
    if (this.elapsed >= IFRAME_DURATION && this.player.isInvulnerable) {
      this.player.isInvulnerable = false
    }

    // Maintain dodge velocity throughout the roll
    this.player.setVelocity(this.dodgeVx, this.dodgeVy)

    // Dodge complete
    if (this.elapsed >= DODGE_DURATION) {
      this.player.fsm.transition(StateFactory.create('IDLE', this.player))
      return
    }
  }

  exit(): void {
    this.elapsed = 0
    this.player.isInvulnerable = false
    this.player.setVelocity(0, 0)
    this.player.setAlpha(1)
  }
}
