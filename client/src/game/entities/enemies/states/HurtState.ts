import Phaser from 'phaser'
import { EnemyState, EnemyStateType } from '../EnemyFSM'
import { StateFactory } from './StateFactory'

/** Duration of the hurt stagger in ms. */
const HURT_STAGGER_DURATION = 200

/** Knockback speed applied when taking damage. */
const KNOCKBACK_SPEED = 80

/**
 * Hurt state -- brief stagger when the enemy takes damage.
 *
 * This state interrupts any other state (except DEAD), providing
 * a visible reaction to being hit. The enemy is briefly stunned
 * and pushed back from the damage source.
 *
 * Transitions:
 *   -> IDLE  after HURT_STAGGER_DURATION ms
 *   -> DEAD  if health reaches 0 (handled externally via Enemy.takeDamage)
 */
export class HurtState extends EnemyState {
  private elapsed = 0
  private flashTimer = 0

  get name(): EnemyStateType {
    return EnemyStateType.HURT
  }

  enter(): void {
    this.enemy.playAnim('hurt')
    this.elapsed = 0
    this.flashTimer = 0

    // Apply knockback away from the player
    const playerPos = this.enemy.getPlayerPosition()
    if (playerPos) {
      const dx = this.enemy.x - playerPos.x
      const dy = this.enemy.y - playerPos.y
      const len = Math.sqrt(dx * dx + dy * dy)
      if (len > 0) {
        this.enemy.setVelocity(
          (dx / len) * KNOCKBACK_SPEED,
          (dy / len) * KNOCKBACK_SPEED
        )
      }
    } else {
      // Fallback: knock back based on facing direction
      const knockbackDir = this.enemy.flipX ? -1 : 1
      this.enemy.setVelocity(knockbackDir * KNOCKBACK_SPEED, -KNOCKBACK_SPEED * 0.3)
    }

    // Visual feedback -- tint white
    this.enemy.setTint(0xffffff)

    // this.enemy.anims.play('enemy-hurt', true)  // Enable when sprites are ready

    this.enemy.scene.events.emit('enemy-hurt', this.enemy)
  }

  update(delta: number): void {
    this.elapsed += delta

    // Flash effect -- toggle visibility rapidly
    this.flashTimer += delta
    if (this.flashTimer >= 50) {
      this.flashTimer = 0
      this.enemy.setAlpha(this.enemy.alpha < 1 ? 1 : 0.4)
    }

    // Decelerate knockback over time
    const body = this.enemy.body as Phaser.Physics.Arcade.Body
    if (body) {
      body.velocity.scale(0.9)
    }

    // Stagger complete -- return to idle
    if (this.elapsed >= HURT_STAGGER_DURATION) {
      this.enemy.fsm.transition(StateFactory.create('IDLE', this.enemy))
      return
    }
  }

  exit(): void {
    this.elapsed = 0
    this.flashTimer = 0
    this.enemy.setAlpha(1)
    this.enemy.clearTint()
    this.enemy.setTint(this.enemy.baseTint)
    this.enemy.setVelocity(0, 0)
  }
}
