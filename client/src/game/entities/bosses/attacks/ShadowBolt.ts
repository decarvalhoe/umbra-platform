/**
 * Shadow Bolt attack for the Corrupted Guardian.
 *
 * A straight-line projectile that travels from the boss toward the
 * player's position at the time of firing. Medium speed, explodes
 * on contact with a small AoE blast radius.
 */

import Phaser from 'phaser'
import type { BossAttackConfig } from '../BossConfig'

/** Projectile speed in pixels per second. */
const PROJECTILE_SPEED = 250

/** Size of the shadow bolt projectile. */
const BOLT_RADIUS = 12

/**
 * Visual and gameplay representation of the Shadow Bolt projectile.
 *
 * The bolt is a scene-owned graphics object that travels in a straight
 * line toward the target position. It self-destructs after reaching
 * the target or exceeding max range.
 */
export class ShadowBolt {
  private scene: Phaser.Scene
  private config: BossAttackConfig
  private graphics: Phaser.GameObjects.Graphics
  private x: number
  private y: number
  private velocityX: number
  private velocityY: number
  private distanceTraveled = 0
  private _active = true

  constructor(
    scene: Phaser.Scene,
    config: BossAttackConfig,
    startX: number,
    startY: number,
    targetX: number,
    targetY: number
  ) {
    this.scene = scene
    this.config = config
    this.x = startX
    this.y = startY

    // Calculate velocity toward target
    const dx = targetX - startX
    const dy = targetY - startY
    const len = Math.sqrt(dx * dx + dy * dy)

    if (len > 0) {
      this.velocityX = (dx / len) * PROJECTILE_SPEED
      this.velocityY = (dy / len) * PROJECTILE_SPEED
    } else {
      this.velocityX = PROJECTILE_SPEED
      this.velocityY = 0
    }

    this.graphics = scene.add.graphics()
    this.graphics.setDepth(15)
  }

  /** Whether the projectile is still in flight. */
  get active(): boolean {
    return this._active
  }

  /**
   * Update projectile position and visuals.
   * Returns true when the projectile should be removed.
   */
  update(delta: number): boolean {
    if (!this._active) return true

    // Move
    const dtSeconds = delta / 1000
    this.x += this.velocityX * dtSeconds
    this.y += this.velocityY * dtSeconds
    this.distanceTraveled += PROJECTILE_SPEED * dtSeconds

    // Check max range
    if (this.distanceTraveled >= this.config.range) {
      this.explode()
      return true
    }

    // Draw
    this.draw()
    return false
  }

  /** Get the current hitbox for collision checks. */
  getHitbox(): { x: number; y: number; radius: number } {
    return { x: this.x, y: this.y, radius: BOLT_RADIUS }
  }

  /** Get the explosion zone (larger than the bolt itself). */
  getExplosionZone(): { x: number; y: number; radius: number } {
    return { x: this.x, y: this.y, radius: this.config.aoeRadius }
  }

  /** Trigger the explosion effect and deactivate. */
  explode(): void {
    this._active = false

    // Draw explosion
    this.graphics.clear()
    this.graphics.fillStyle(this.config.attackColor, 0.5)
    this.graphics.fillCircle(this.x, this.y, this.config.aoeRadius)
    this.graphics.lineStyle(2, 0x6622cc, 0.8)
    this.graphics.strokeCircle(this.x, this.y, this.config.aoeRadius)

    // Fade out and destroy after a short delay
    this.scene.tweens.add({
      targets: this.graphics,
      alpha: 0,
      duration: 300,
      onComplete: () => {
        this.graphics.destroy()
      },
    })
  }

  /** Clean up immediately. */
  destroy(): void {
    this._active = false
    this.graphics.destroy()
  }

  private draw(): void {
    this.graphics.clear()

    // Core bolt
    this.graphics.fillStyle(0x6622cc, 1)
    this.graphics.fillCircle(this.x, this.y, BOLT_RADIUS)

    // Outer glow
    this.graphics.fillStyle(0x440088, 0.4)
    this.graphics.fillCircle(this.x, this.y, BOLT_RADIUS * 1.8)

    // Trail particles (3 trailing dots)
    const trailSpacing = 15
    for (let i = 1; i <= 3; i++) {
      const trailX = this.x - (this.velocityX / PROJECTILE_SPEED) * trailSpacing * i
      const trailY = this.y - (this.velocityY / PROJECTILE_SPEED) * trailSpacing * i
      const trailAlpha = 0.6 - i * 0.15
      const trailSize = BOLT_RADIUS * (1 - i * 0.2)
      this.graphics.fillStyle(0x6622cc, trailAlpha)
      this.graphics.fillCircle(trailX, trailY, trailSize)
    }
  }
}
