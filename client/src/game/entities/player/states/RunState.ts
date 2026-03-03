import Phaser from 'phaser'
import { PlayerState } from '../PlayerFSM'
import { StateFactory } from './StateFactory'

/**
 * Run state -- 8-directional movement at `player.moveSpeed`.
 *
 * Diagonal movement is normalized (multiplied by ~0.707) so the player
 * doesn't move faster on diagonals.
 *
 * Transitions:
 *   -> IDLE   when no directional keys are held
 *   -> ATTACK when the attack key is just pressed
 *   -> DODGE  when the dodge key is just pressed (and charges remain)
 */
export class RunState extends PlayerState {
  get name(): string {
    return 'RUN'
  }

  enter(): void {
    this.player.playAnim('player-run')
  }

  update(_delta: number): void {
    const cursors = this.player.cursors
    const speed = this.player.moveSpeed
    let vx = 0
    let vy = 0

    if (cursors.left.isDown) {
      vx = -speed
    } else if (cursors.right.isDown) {
      vx = speed
    }

    if (cursors.up.isDown) {
      vy = -speed
    } else if (cursors.down.isDown) {
      vy = speed
    }

    // Normalize diagonal movement so speed is consistent
    if (vx !== 0 && vy !== 0) {
      const diag = Math.SQRT1_2 // ~0.70710678
      vx *= diag
      vy *= diag
    }

    this.player.setVelocity(vx, vy)

    // Flip sprite based on horizontal direction
    if (vx < 0) {
      this.player.setFlipX(true)
    } else if (vx > 0) {
      this.player.setFlipX(false)
    }

    // Transition to IDLE if all directional keys are released
    if (
      !cursors.left.isDown &&
      !cursors.right.isDown &&
      !cursors.up.isDown &&
      !cursors.down.isDown
    ) {
      this.player.fsm.transition(StateFactory.create('IDLE', this.player))
      return
    }

    // Can attack while running
    if (Phaser.Input.Keyboard.JustDown(this.player.keys.attack)) {
      this.player.fsm.transition(StateFactory.create('ATTACK', this.player))
      return
    }

    // Can dodge while running
    if (
      Phaser.Input.Keyboard.JustDown(this.player.keys.dodge) &&
      this.player.canDodge()
    ) {
      this.player.fsm.transition(StateFactory.create('DODGE', this.player))
      return
    }
  }

  exit(): void {
    this.player.setVelocity(0, 0)
  }
}
