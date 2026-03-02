import { PlayerState } from '../PlayerFSM'
import { StateFactory } from './StateFactory'

/** Total duration of the dodge roll in ms. */
const DODGE_DURATION = 300

/**
 * Delay before i-frames activate (ms).
 * Corresponds to frame 2 of the dodge animation (~66ms).
 */
const IFRAME_START_DELAY = 66

/** Duration of invulnerability during the roll (ms). Starts after IFRAME_START_DELAY. */
const IFRAME_DURATION = 200

/**
 * Target distance covered by the dodge roll in pixels.
 * Speed is derived: DODGE_DISTANCE / (DODGE_DURATION / 1000) = 500 px/s.
 */
const DODGE_DISTANCE = 150

/** Computed speed (px/s) to cover DODGE_DISTANCE within DODGE_DURATION. */
const DODGE_SPEED = DODGE_DISTANCE / (DODGE_DURATION / 1000)

/**
 * Dodge state -- a fast roll that grants brief invulnerability (i-frames).
 *
 * Mechanics:
 *   - Consumes one dodge charge (2 max, 3s recharge each).
 *   - Rolls in the current movement direction (8-directional),
 *     or the sprite's facing direction if no input is held.
 *   - I-frames begin at frame 2 of the animation (~66ms in) and last 200ms,
 *     making the player immune to all damage during that window.
 *   - Player cannot act during the roll.
 *
 * Transitions:
 *   -> IDLE when the roll duration expires
 */
export class DodgeState extends PlayerState {
  /** Time elapsed since entering this state (ms). */
  private elapsed = 0

  /** Cached dodge velocity components, applied every frame. */
  private dodgeVx = 0
  private dodgeVy = 0

  /** Whether i-frames have been activated during this dodge. */
  private iframesActive = false

  get name(): string {
    return 'DODGE'
  }

  enter(): void {
    this.elapsed = 0
    this.iframesActive = false

    // Consume a dodge charge
    this.player.consumeDodge()

    // I-frames are NOT granted immediately -- they start after IFRAME_START_DELAY.
    // The player is vulnerable for the first ~66ms of the roll.
    this.player.isInvulnerable = false

    // Determine dodge direction from current input, fall back to facing direction
    const cursors = this.player.cursors
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

    // Normalize diagonal so the dodge covers the same distance regardless of direction
    if (vx !== 0 && vy !== 0) {
      const diag = Math.SQRT1_2
      vx *= diag
      vy *= diag
    }

    this.dodgeVx = vx * DODGE_SPEED
    this.dodgeVy = vy * DODGE_SPEED

    this.player.setVelocity(this.dodgeVx, this.dodgeVy)

    // Visual feedback -- ghosting effect during the roll
    this.player.setAlpha(0.5)

    // this.player.anims.play('player-dodge', true)  // Enable when sprites are ready

    this.player.scene.events.emit('player-dodge')
  }

  update(delta: number): void {
    this.elapsed += delta

    // Activate i-frames after the startup delay (frame 2 of animation)
    if (!this.iframesActive && this.elapsed >= IFRAME_START_DELAY) {
      this.iframesActive = true
      this.player.isInvulnerable = true
    }

    // End i-frames after the iframe window closes
    if (
      this.iframesActive &&
      this.player.isInvulnerable &&
      this.elapsed >= IFRAME_START_DELAY + IFRAME_DURATION
    ) {
      this.player.isInvulnerable = false
    }

    // Maintain dodge velocity throughout the roll (prevents physics from slowing us)
    this.player.setVelocity(this.dodgeVx, this.dodgeVy)

    // Dodge complete -- return to idle
    if (this.elapsed >= DODGE_DURATION) {
      this.player.fsm.transition(StateFactory.create('IDLE', this.player))
      return
    }
  }

  exit(): void {
    this.elapsed = 0
    this.iframesActive = false
    this.player.isInvulnerable = false
    this.player.setVelocity(0, 0)
    this.player.setAlpha(1)
  }
}
