/**
 * Ground Slam attack for the Corrupted Guardian.
 *
 * Phase 1: 1.5s telegraph, circular AoE at player position.
 * Phase 2: 1.0s telegraph, larger AoE, more damage.
 *
 * The telegraph shows a growing circle at the target position.
 * The player must dodge out of the AoE before the slam lands.
 */

import Phaser from 'phaser'
import type { BossAttackConfig } from '../BossConfig'

/**
 * Visual representation of the Ground Slam attack.
 *
 * Creates a telegraph circle that grows during the wind-up,
 * then flashes red on impact. The circle is a scene-owned
 * graphics object that self-destructs after the attack resolves.
 */
export class GroundSlam {
  private scene: Phaser.Scene
  private config: BossAttackConfig
  private targetX: number
  private targetY: number
  private graphics: Phaser.GameObjects.Graphics
  private elapsed = 0
  private phase: 'telegraph' | 'active' | 'done' = 'telegraph'

  constructor(
    scene: Phaser.Scene,
    config: BossAttackConfig,
    targetX: number,
    targetY: number
  ) {
    this.scene = scene
    this.config = config
    this.targetX = targetX
    this.targetY = targetY

    this.graphics = scene.add.graphics()
    this.graphics.setDepth(10)
  }

  /**
   * Update the visual representation.
   * Returns true when the attack is fully resolved.
   */
  update(delta: number): boolean {
    this.elapsed += delta

    if (this.phase === 'telegraph') {
      this.drawTelegraph()

      if (this.elapsed >= this.config.timing.telegraphMs) {
        this.phase = 'active'
        this.elapsed = 0
      }
      return false
    }

    if (this.phase === 'active') {
      this.drawImpact()

      if (this.elapsed >= this.config.timing.activeMs) {
        this.phase = 'done'
        this.destroy()
        return true
      }
      return false
    }

    return true
  }

  /** Clean up graphics. */
  destroy(): void {
    this.graphics.destroy()
  }

  /** Get the damage zone for collision checks. */
  getDamageZone(): { x: number; y: number; radius: number } {
    return {
      x: this.targetX,
      y: this.targetY,
      radius: this.config.aoeRadius,
    }
  }

  private drawTelegraph(): void {
    this.graphics.clear()

    // Growing circle that fills over the telegraph duration
    const progress = Math.min(this.elapsed / this.config.timing.telegraphMs, 1)
    const currentRadius = this.config.aoeRadius * progress

    // Outer warning ring
    this.graphics.lineStyle(3, this.config.telegraphColor, 0.6)
    this.graphics.strokeCircle(this.targetX, this.targetY, this.config.aoeRadius)

    // Inner growing fill
    this.graphics.fillStyle(this.config.telegraphColor, 0.2 + progress * 0.3)
    this.graphics.fillCircle(this.targetX, this.targetY, currentRadius)

    // Pulsing center marker
    const pulse = Math.sin(this.elapsed / 100) * 0.3 + 0.7
    this.graphics.fillStyle(0xff0000, pulse)
    this.graphics.fillCircle(this.targetX, this.targetY, 8)
  }

  private drawImpact(): void {
    this.graphics.clear()

    // Flash red on impact, then fade
    const progress = this.elapsed / this.config.timing.activeMs
    const alpha = 1 - progress

    this.graphics.fillStyle(this.config.attackColor, alpha * 0.6)
    this.graphics.fillCircle(this.targetX, this.targetY, this.config.aoeRadius)

    // Shockwave ring expanding outward
    const ringRadius = this.config.aoeRadius * (1 + progress * 0.3)
    this.graphics.lineStyle(4, 0xff0000, alpha)
    this.graphics.strokeCircle(this.targetX, this.targetY, ringRadius)
  }
}
