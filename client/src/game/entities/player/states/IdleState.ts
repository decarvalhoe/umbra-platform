import Phaser from 'phaser'
import { PlayerState } from '../PlayerFSM'
import { StateFactory } from './StateFactory'

/**
 * Idle state -- player is standing still, waiting for input.
 *
 * Transitions:
 *   -> RUN    when any directional key is pressed
 *   -> ATTACK when the attack key is just pressed
 *   -> DODGE  when the dodge key is just pressed (and charges remain)
 */
export class IdleState extends PlayerState {
  get name(): string {
    return 'IDLE'
  }

  enter(): void {
    this.player.setVelocity(0, 0)
    // this.player.anims.play('player-idle', true)  // Enable when sprites are ready
  }

  update(_delta: number): void {
    const cursors = this.player.cursors
    const keys = this.player.keys

    // Transition to RUN if any movement input is held
    if (
      cursors.left.isDown ||
      cursors.right.isDown ||
      cursors.up.isDown ||
      cursors.down.isDown
    ) {
      this.player.fsm.transition(StateFactory.create('RUN', this.player))
      return
    }

    // Transition to ATTACK on attack key press
    if (Phaser.Input.Keyboard.JustDown(keys.attack)) {
      this.player.fsm.transition(StateFactory.create('ATTACK', this.player))
      return
    }

    // Transition to DODGE on dodge key press (if charges available)
    if (Phaser.Input.Keyboard.JustDown(keys.dodge) && this.player.canDodge()) {
      this.player.fsm.transition(StateFactory.create('DODGE', this.player))
      return
    }
  }

  exit(): void {
    // Nothing to clean up
  }
}
