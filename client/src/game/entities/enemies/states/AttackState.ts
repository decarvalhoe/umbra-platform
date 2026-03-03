import { EnemyState, EnemyStateType } from '../EnemyFSM'
import { StateFactory } from './StateFactory'

/** Duration of the attack animation in ms. */
const ATTACK_DURATION = 300

/**
 * Attack state -- executes the enemy's melee attack.
 *
 * The attack resolves at 50% of the animation duration (the "hit frame"),
 * emitting a damage event that the scene can handle via overlap checks.
 * After the full animation plays out, the enemy returns to idle.
 *
 * Transitions:
 *   -> IDLE  after ATTACK_DURATION ms
 */
export class AttackState extends EnemyState {
  private elapsed = 0
  private hasHit = false

  get name(): EnemyStateType {
    return EnemyStateType.ATTACK
  }

  enter(): void {
    this.enemy.playAnim('attack')
    this.elapsed = 0
    this.hasHit = false

    // Stop movement during attack
    this.enemy.setVelocity(0, 0)

    // Visual feedback -- tint red during attack
    this.enemy.setTint(0xff0000)

    // this.enemy.anims.play('enemy-attack', true)  // Enable when sprites are ready

    this.enemy.scene.events.emit('enemy-attack', this.enemy)
  }

  update(delta: number): void {
    this.elapsed += delta

    // Apply hit at the midpoint of the attack animation
    if (!this.hasHit && this.elapsed >= ATTACK_DURATION * 0.5) {
      this.hasHit = true
      this.enemy.scene.events.emit(
        'enemy-attack-hit',
        this.enemy,
        this.enemy.config.attackDamage
      )
    }

    // Attack animation complete -- return to idle
    if (this.elapsed >= ATTACK_DURATION) {
      this.enemy.fsm.transition(StateFactory.create('IDLE', this.enemy))
      return
    }
  }

  exit(): void {
    this.elapsed = 0
    this.hasHit = false
    this.enemy.clearTint()
    this.enemy.setTint(this.enemy.baseTint)
  }
}
