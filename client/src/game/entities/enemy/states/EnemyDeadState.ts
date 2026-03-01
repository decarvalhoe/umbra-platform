import { EnemyState } from '../EnemyFSM'

/** Duration of the death fade-out animation (ms). */
const DEATH_FADE_DURATION = 500

/**
 * Dead state -- the enemy has been defeated.
 *
 * Mechanics:
 *   - Emits 'enemy-dead' event with the enemy reference and position
 *     so the scene can spawn loot, award XP, etc.
 *   - Fades out over 500ms.
 *   - After the fade, the sprite is destroyed and cleaned up.
 *   - No transitions out -- this is a terminal state.
 *
 * Events emitted:
 *   - 'enemy-dead': { enemy, x, y, type, element }
 */
export class EnemyDeadState extends EnemyState {
  private elapsed = 0
  private eventEmitted = false
  private destroyed = false

  get name(): string {
    return 'DEAD'
  }

  enter(): void {
    this.elapsed = 0
    this.eventEmitted = false
    this.destroyed = false

    // Freeze the enemy
    this.enemy.setVelocity(0, 0)
    this.enemy.isInvulnerable = true

    // Disable physics body
    const body = this.enemy.body as Phaser.Physics.Arcade.Body
    if (body) {
      body.enable = false
    }

    // Visual -- tint dark
    this.enemy.setTint(0x333333)

    // Emit death event immediately for game logic (loot, XP)
    if (!this.eventEmitted) {
      this.eventEmitted = true
      this.enemy.scene.events.emit('enemy-dead', {
        enemy: this.enemy,
        x: this.enemy.x,
        y: this.enemy.y,
        type: this.enemy.enemyType,
        element: this.enemy.element,
      })
    }
  }

  update(delta: number): void {
    if (this.destroyed) return

    this.elapsed += delta

    // Gradual fade out
    const progress = Math.min(this.elapsed / DEATH_FADE_DURATION, 1)
    this.enemy.setAlpha(1 - progress)

    // Destroy sprite after fade completes
    if (this.elapsed >= DEATH_FADE_DURATION) {
      this.destroyed = true
      this.enemy.destroy()
    }
  }

  exit(): void {
    // Terminal state -- exit() is provided for interface compliance
    // but should not normally be called.
    this.elapsed = 0
    this.eventEmitted = false
    this.destroyed = false
  }
}
