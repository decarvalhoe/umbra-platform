/**
 * Corruption Wave attack for the Corrupted Guardian (Phase 2 only).
 *
 * An expanding ring of corruption that emanates from the boss.
 * The player must dodge THROUGH the wave (not away from it) to
 * avoid damage, since the ring expands outward.
 *
 * Telegraph: Purple circle at boss position, growing to show
 * the wave's path. Active: Ring expands rapidly outward.
 */

import Phaser from 'phaser'
import type { BossAttackConfig } from '../BossConfig'

/** Speed at which the wave ring expands (px/s). */
const WAVE_EXPAND_SPEED = 400

/** Thickness of the damage ring (px). */
const RING_THICKNESS = 40

/**
 * Visual and gameplay representation of the Corruption Wave.
 *
 * The wave is an expanding ring centered on the boss. The damage
 * zone is a torus (donut shape) -- the player takes damage only
 * if they are within the ring's thickness as it passes over them.
 */
export class CorruptionWave {
  private config: BossAttackConfig
  private centerX: number
  private centerY: number
  private graphics: Phaser.GameObjects.Graphics
  private elapsed = 0
  private phase: 'telegraph' | 'active' | 'done' = 'telegraph'
  private currentRadius = 0

  constructor(
    scene: Phaser.Scene,
    config: BossAttackConfig,
    centerX: number,
    centerY: number
  ) {
    this.config = config
    this.centerX = centerX
    this.centerY = centerY

    this.graphics = scene.add.graphics()
    this.graphics.setDepth(10)
  }

  /**
   * Update the wave visual and expansion.
   * Returns true when the attack is fully resolved.
   */
  update(delta: number): boolean {
    this.elapsed += delta

    if (this.phase === 'telegraph') {
      this.drawTelegraph()

      if (this.elapsed >= this.config.timing.telegraphMs) {
        this.phase = 'active'
        this.elapsed = 0
        this.currentRadius = 0
      }
      return false
    }

    if (this.phase === 'active') {
      // Expand the ring
      this.currentRadius += (WAVE_EXPAND_SPEED * delta) / 1000
      this.drawWave()

      if (this.currentRadius >= this.config.aoeRadius) {
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

  /**
   * Get the damage ring zone for collision checks.
   * The damage zone is a ring (torus): player is hit if their
   * distance from center is between (currentRadius - thickness/2)
   * and (currentRadius + thickness/2).
   */
  getDamageRing(): {
    x: number
    y: number
    innerRadius: number
    outerRadius: number
  } {
    return {
      x: this.centerX,
      y: this.centerY,
      innerRadius: Math.max(0, this.currentRadius - RING_THICKNESS / 2),
      outerRadius: this.currentRadius + RING_THICKNESS / 2,
    }
  }

  /**
   * Check if a point is within the damage ring.
   * Used for collision detection with the player.
   */
  isPointInDamageZone(px: number, py: number): boolean {
    if (this.phase !== 'active') return false

    const dx = px - this.centerX
    const dy = py - this.centerY
    const dist = Math.sqrt(dx * dx + dy * dy)
    const ring = this.getDamageRing()

    return dist >= ring.innerRadius && dist <= ring.outerRadius
  }

  private drawTelegraph(): void {
    this.graphics.clear()

    const progress = Math.min(this.elapsed / this.config.timing.telegraphMs, 1)

    // Pulsing concentric rings showing the wave's path
    const ringCount = 3
    for (let i = 0; i < ringCount; i++) {
      const ringProgress = (progress + i / ringCount) % 1
      const radius = this.config.aoeRadius * ringProgress
      const alpha = (1 - ringProgress) * 0.4

      this.graphics.lineStyle(2, this.config.telegraphColor, alpha)
      this.graphics.strokeCircle(this.centerX, this.centerY, radius)
    }

    // Center marker
    const pulse = Math.sin(this.elapsed / 150) * 0.3 + 0.7
    this.graphics.fillStyle(0x222244, pulse * 0.5)
    this.graphics.fillCircle(this.centerX, this.centerY, 20)
  }

  private drawWave(): void {
    this.graphics.clear()

    // The expanding damage ring
    const innerR = Math.max(0, this.currentRadius - RING_THICKNESS / 2)
    const outerR = this.currentRadius + RING_THICKNESS / 2

    // Draw the ring using arc paths
    // Outer circle
    this.graphics.fillStyle(this.config.attackColor, 0.4)
    this.graphics.beginPath()
    this.graphics.arc(
      this.centerX,
      this.centerY,
      outerR,
      0,
      Math.PI * 2,
      false
    )
    this.graphics.arc(
      this.centerX,
      this.centerY,
      innerR,
      Math.PI * 2,
      0,
      true
    )
    this.graphics.closePath()
    this.graphics.fillPath()

    // Edge glow
    this.graphics.lineStyle(2, 0x6622cc, 0.8)
    this.graphics.strokeCircle(this.centerX, this.centerY, outerR)
    this.graphics.lineStyle(1, 0x222244, 0.5)
    this.graphics.strokeCircle(this.centerX, this.centerY, innerR)
  }
}
