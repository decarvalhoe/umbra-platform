import Phaser from 'phaser'
import { PlayerState } from '../PlayerFSM'
import { StateFactory } from './StateFactory'
import type { ComboHit, ComboHitType, Hand } from '../../../../types/combat'

/** Duration of a single attack animation in ms. */
const ATTACK_DURATION = 250

/** Window after an attack in which the next combo hit can be queued (ms). */
const COMBO_WINDOW = 500

/** Maximum number of hits in a combo chain (4-hit dual-wield chain). */
const MAX_COMBO = 4

/** Damage multiplier per combo step (1-indexed, index 0 unused). */
const COMBO_MULTIPLIERS: readonly number[] = [0, 1.0, 1.1, 1.3, 1.6]

/** Hit type per combo step (1-indexed, index 0 unused). */
const COMBO_HIT_TYPES: readonly ComboHitType[] = [
  'light',
  'light',
  'light',
  'heavy',
  'finisher',
]

/**
 * Attack state -- executes a melee attack and handles a 4-hit dual-wield
 * combo chain with damage multipliers and input buffering.
 *
 * The combo system works as follows:
 *   1. On enter, `comboStep` advances (0 -> 1 -> 2 -> 3 -> 4).
 *   2. Each hit alternates the attacking hand (left / right).
 *   3. The attack plays for ATTACK_DURATION ms.
 *   4. After the attack, a COMBO_WINDOW (500ms) opens during which the
 *      player can press attack to chain the next hit.
 *   5. If the player presses attack DURING the animation, the input is
 *      buffered and automatically consumed when the window opens.
 *   6. If the window expires without input, the combo resets -> IDLE.
 *   7. At any point the player can cancel into DODGE.
 *
 * Hit chain:
 *   Hit 1: Light  (1.0x) - left hand
 *   Hit 2: Light  (1.1x) - right hand
 *   Hit 3: Heavy  (1.3x) - left hand
 *   Hit 4: Finisher (1.6x) - right hand, combines both weapon elements
 *
 * Events emitted:
 *   'player-attack'     (comboHit: ComboHit)          - on enter
 *   'player-attack-hit' (comboHit: ComboHit, damage)  - at hit frame
 *   'player-combo-finisher' (comboHit: ComboHit)      - hit 4 only (VFX)
 *
 * Transitions:
 *   -> IDLE  when the combo window expires (or max combo reached + window)
 *   -> DODGE when the dodge key is pressed (combo cancel)
 */
export class AttackState extends PlayerState {
  /** Time elapsed since entering this state (ms). */
  private elapsed = 0
  /** Whether the current attack's hit has been applied. */
  private hasHit = false
  /** Whether an attack input was buffered during the current animation. */
  private inputBuffered = false

  get name(): string {
    return 'ATTACK'
  }

  enter(): void {
    this.elapsed = 0
    this.hasHit = false
    this.inputBuffered = false

    // Advance combo step
    this.player.comboStep = Math.min(this.player.comboStep + 1, MAX_COMBO)
    this.player.comboTimer = COMBO_WINDOW

    // Alternate attacking hand
    const hand = this.getAttackingHand()
    this.player.lastAttackHand = hand

    // Stop movement during attack
    this.player.setVelocity(0, 0)

    this.player.playAnim(`player-attack-${this.player.comboStep}`)

    // Emit event for UI / sound with enriched combo data
    const comboHit = this.buildComboHit(hand)
    this.player.scene.events.emit('player-attack', comboHit)
  }

  update(delta: number): void {
    this.elapsed += delta

    // Apply hit once during the attack window (at 50% of animation)
    if (!this.hasHit && this.elapsed >= ATTACK_DURATION * 0.5) {
      this.hasHit = true
      const hand = this.player.lastAttackHand
      const comboHit = this.buildComboHit(hand)
      const damage = this.calculateDamage(hand)

      this.player.scene.events.emit('player-attack-hit', comboHit, damage)

      // Finisher (hit 4) gets a special event for VFX systems
      if (this.player.comboStep === MAX_COMBO) {
        this.player.scene.events.emit('player-combo-finisher', comboHit)
      }
    }

    // Still in the attack animation
    if (this.elapsed < ATTACK_DURATION) {
      // Buffer attack input during animation for responsive feel
      if (Phaser.Input.Keyboard.JustDown(this.player.keys.attack)) {
        this.inputBuffered = true
      }

      // Allow dodge-cancel during attack
      if (
        Phaser.Input.Keyboard.JustDown(this.player.keys.dodge) &&
        this.player.canDodge()
      ) {
        this.resetCombo()
        this.player.fsm.transition(StateFactory.create('DODGE', this.player))
        return
      }
      return
    }

    // Attack animation finished -- enter combo window
    // Check for buffered input or new input
    const hasAttackInput =
      this.inputBuffered ||
      Phaser.Input.Keyboard.JustDown(this.player.keys.attack)

    if (hasAttackInput) {
      if (this.player.comboStep < MAX_COMBO) {
        // Chain into the next attack
        this.player.fsm.transition(StateFactory.create('ATTACK', this.player))
        return
      }
      // Max combo reached -- fall through to idle after window expires
    }

    // Allow dodge-cancel in combo window
    if (
      Phaser.Input.Keyboard.JustDown(this.player.keys.dodge) &&
      this.player.canDodge()
    ) {
      this.resetCombo()
      this.player.fsm.transition(StateFactory.create('DODGE', this.player))
      return
    }

    // Combo window expired
    if (this.elapsed >= ATTACK_DURATION + COMBO_WINDOW) {
      this.resetCombo()
      this.player.fsm.transition(StateFactory.create('IDLE', this.player))
      return
    }
  }

  exit(): void {
    this.elapsed = 0
    this.hasHit = false
    this.inputBuffered = false
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Determine which hand attacks this step.
   * Attacks alternate: odd steps use left, even steps use right.
   */
  private getAttackingHand(): Hand {
    return this.player.comboStep % 2 === 1 ? 'left' : 'right'
  }

  /** Calculate the effective damage for the current combo hit. */
  private calculateDamage(hand: Hand): number {
    const step = this.player.comboStep
    const multiplier = COMBO_MULTIPLIERS[step] ?? 1.0
    const weapon =
      hand === 'left'
        ? this.player.dualWield.leftWeapon
        : this.player.dualWield.rightWeapon
    return Math.round(weapon.baseDamage * multiplier)
  }

  /** Build a ComboHit descriptor for the current step. */
  private buildComboHit(hand: Hand): ComboHit {
    const step = this.player.comboStep
    const multiplier = COMBO_MULTIPLIERS[step] ?? 1.0
    const hitType = COMBO_HIT_TYPES[step] ?? 'light'
    const weapon =
      hand === 'left'
        ? this.player.dualWield.leftWeapon
        : this.player.dualWield.rightWeapon

    const comboHit: ComboHit = {
      step,
      multiplier,
      hitType,
      hand,
      element: weapon.element,
    }

    // Finisher combines both weapon elements
    if (hitType === 'finisher') {
      const offHandWeapon =
        hand === 'left'
          ? this.player.dualWield.rightWeapon
          : this.player.dualWield.leftWeapon
      if (
        offHandWeapon.element &&
        offHandWeapon.element !== weapon.element
      ) {
        comboHit.secondaryElement = offHandWeapon.element
      }
    }

    return comboHit
  }

  /** Reset combo state on the player. */
  private resetCombo(): void {
    this.player.comboStep = 0
    this.player.comboTimer = 0
  }
}
