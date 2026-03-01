import Phaser from 'phaser'
import { PlayerState } from '../PlayerFSM'
import { StateFactory } from './StateFactory'

/** Duration of a single attack animation in ms. */
const ATTACK_DURATION = 250

/** Window after an attack in which the next combo hit can be queued (ms). */
const COMBO_WINDOW = 400

/** Maximum number of hits in a combo chain. */
const MAX_COMBO = 3

/**
 * Attack state -- executes a melee attack and handles combo chaining.
 *
 * The combo system works as follows:
 *   1. On enter, `comboStep` advances (0 -> 1 -> 2 -> 3).
 *   2. The attack plays for ATTACK_DURATION ms.
 *   3. After the attack, a COMBO_WINDOW opens during which the player
 *      can press attack again to chain the next hit.
 *   4. If the window expires without input, the combo resets and
 *      we transition back to IDLE.
 *   5. At any point during the attack, the player can cancel into DODGE.
 *
 * Transitions:
 *   -> IDLE  when the combo window expires (or max combo reached)
 *   -> DODGE when the dodge key is pressed (combo cancel)
 */
export class AttackState extends PlayerState {
  /** Time elapsed since entering this state (ms). */
  private elapsed = 0
  /** Whether the current attack's hit has been applied. */
  private hasHit = false

  get name(): string {
    return 'ATTACK'
  }

  enter(): void {
    this.elapsed = 0
    this.hasHit = false

    // Advance combo step
    this.player.comboStep = Math.min(this.player.comboStep + 1, MAX_COMBO)
    this.player.comboTimer = COMBO_WINDOW

    // Stop movement during attack
    this.player.setVelocity(0, 0)

    // this.player.anims.play(`player-attack-${this.player.comboStep}`, true)

    // Emit event for UI / sound
    this.player.scene.events.emit('player-attack', this.player.comboStep)
  }

  update(delta: number): void {
    this.elapsed += delta

    // Apply hit once during the attack window (at 50% of animation)
    if (!this.hasHit && this.elapsed >= ATTACK_DURATION * 0.5) {
      this.hasHit = true
      this.player.scene.events.emit(
        'player-attack-hit',
        this.player.comboStep,
        this.player.attackDamage
      )
    }

    // Still in the attack animation
    if (this.elapsed < ATTACK_DURATION) {
      // Allow dodge-cancel during attack
      if (
        Phaser.Input.Keyboard.JustDown(this.player.keys.dodge) &&
        this.player.canDodge()
      ) {
        this.player.comboStep = 0
        this.player.comboTimer = 0
        this.player.fsm.transition(StateFactory.create('DODGE', this.player))
        return
      }
      return
    }

    // Attack animation finished -- enter combo window
    // Check for next combo input
    if (Phaser.Input.Keyboard.JustDown(this.player.keys.attack)) {
      if (this.player.comboStep < MAX_COMBO) {
        // Chain into the next attack
        this.player.fsm.transition(StateFactory.create('ATTACK', this.player))
        return
      }
      // Max combo reached -- fall through to idle
    }

    // Allow dodge-cancel in combo window
    if (
      Phaser.Input.Keyboard.JustDown(this.player.keys.dodge) &&
      this.player.canDodge()
    ) {
      this.player.comboStep = 0
      this.player.comboTimer = 0
      this.player.fsm.transition(StateFactory.create('DODGE', this.player))
      return
    }

    // Combo window expired
    if (this.elapsed >= ATTACK_DURATION + COMBO_WINDOW) {
      this.player.comboStep = 0
      this.player.comboTimer = 0
      this.player.fsm.transition(StateFactory.create('IDLE', this.player))
      return
    }
  }

  exit(): void {
    this.elapsed = 0
    this.hasHit = false
  }
}
