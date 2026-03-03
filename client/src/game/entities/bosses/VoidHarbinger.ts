/**
 * Void Harbinger -- Third boss entity (void-themed).
 *
 * A 3-phase boss fight with reality-warping attacks.
 *
 * Phase 1 — Incursion (100%-55% HP):
 *   - Void Rift (AoE tear in reality)
 *   - Gravity Well (pull + sustained damage)
 *
 * Phase 2 — Dimensional Collapse (55%-20% HP):
 *   - Adds Reality Tear (ranged projectile)
 *   - Adds Phase Shift (AoE + partial invisibility)
 *
 * Phase 3 — Annihilation (20%-0% HP):
 *   - Reality Tear + Phase Shift + Void Collapse (massive AoE) + Gravity Well
 *   - Extreme speed, boss flickers between dimensions
 */

import Phaser from 'phaser'
import { BossAI, BossAIState } from './BossAI'
import type { BossEntityConfig, BossPhaseConfig } from './BossConfig'
import { voidHarbingerConfig } from './BossConfig'

const BOSS_TINT = 0x330066
const BOSS_WIDTH = 60
const BOSS_HEIGHT = 110

export class VoidHarbinger extends Phaser.Physics.Arcade.Sprite {
  public ai!: BossAI
  public config: BossEntityConfig

  public health: number
  public maxHealth: number
  public isInvulnerable = false
  public isVulnerable = false

  private currentPhaseIndex = 0
  private playerRef: Phaser.Physics.Arcade.Sprite | null = null

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const texKey = 'boss_void_harbinger'
    if (!scene.textures.exists(texKey)) {
      const gfx = scene.add.graphics()
      // Body — dark void silhouette
      gfx.fillStyle(0x110022, 1)
      gfx.fillRect(8, 20, BOSS_WIDTH - 16, BOSS_HEIGHT - 20)
      // Hooded cloak shape
      gfx.fillStyle(0x220044, 1)
      gfx.fillTriangle(BOSS_WIDTH / 2, 0, 0, 40, BOSS_WIDTH, 40)
      // Void eye — single glowing eye
      gfx.fillStyle(0xcc00ff, 1)
      gfx.fillCircle(BOSS_WIDTH / 2, 28, 8)
      gfx.fillStyle(0x000000, 1)
      gfx.fillCircle(BOSS_WIDTH / 2, 28, 3)
      // Tendrils at the bottom
      gfx.lineStyle(2, 0x6600cc, 0.6)
      gfx.lineBetween(15, BOSS_HEIGHT - 20, 5, BOSS_HEIGHT)
      gfx.lineBetween(BOSS_WIDTH / 2, BOSS_HEIGHT - 20, BOSS_WIDTH / 2, BOSS_HEIGHT)
      gfx.lineBetween(BOSS_WIDTH - 15, BOSS_HEIGHT - 20, BOSS_WIDTH - 5, BOSS_HEIGHT)
      gfx.generateTexture(texKey, BOSS_WIDTH, BOSS_HEIGHT)
      gfx.destroy()
    }

    super(scene, x, y, texKey, 0)

    this.config = voidHarbingerConfig
    this.health = this.config.maxHp
    this.maxHealth = this.config.maxHp

    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.setCollideWorldBounds(true)
    this.setSize(BOSS_WIDTH, BOSS_HEIGHT)
    this.setOrigin(0.5, 0.5)
    this.setTint(BOSS_TINT)

    this.ai = new BossAI(this, true)
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  playAnim(key: string, ignoreIfPlaying = true): void {
    const animKey = `boss-${key}`
    if (this.scene.anims.exists(animKey)) {
      this.anims.play(animKey, ignoreIfPlaying)
    }
  }

  update(_time: number, delta: number): void {
    if (this.ai.state === BossAIState.DEAD) return

    this.ai.update(delta)
    this.checkPhaseTransition()
    this.updateVisuals()
  }

  // ---------------------------------------------------------------------------
  // Player reference
  // ---------------------------------------------------------------------------

  setPlayer(player: Phaser.Physics.Arcade.Sprite): void {
    this.playerRef = player
  }

  distanceToPlayer(): number | null {
    if (!this.playerRef || !this.playerRef.active) return null
    const dx = this.playerRef.x - this.x
    const dy = this.playerRef.y - this.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  getPlayerPosition(): { x: number; y: number } | null {
    if (!this.playerRef || !this.playerRef.active) return null
    return { x: this.playerRef.x, y: this.playerRef.y }
  }

  // ---------------------------------------------------------------------------
  // Phase management
  // ---------------------------------------------------------------------------

  getCurrentPhase(): BossPhaseConfig | null {
    return this.config.phases[this.currentPhaseIndex] ?? null
  }

  getPhaseIndex(): number {
    return this.currentPhaseIndex
  }

  private checkPhaseTransition(): void {
    const hpRatio = this.health / this.maxHealth
    const nextPhaseIndex = this.currentPhaseIndex + 1

    if (nextPhaseIndex >= this.config.phases.length) return

    const nextPhase = this.config.phases[nextPhaseIndex]
    if (hpRatio <= nextPhase.hpThreshold) {
      this.currentPhaseIndex = nextPhaseIndex
      this.ai.transition(BossAIState.PHASE_TRANSITION)

      this.scene.events.emit(
        'boss-phase-changed',
        this,
        nextPhase.id,
        this.currentPhaseIndex
      )
    }
  }

  // ---------------------------------------------------------------------------
  // Combat
  // ---------------------------------------------------------------------------

  takeDamage(rawAmount: number): void {
    if (this.isInvulnerable) return

    let amount = rawAmount
    if (this.isVulnerable) {
      amount = Math.floor(amount * this.config.vulnerabilityDamageMult)
    }

    this.health = Math.max(0, this.health - amount)

    this.scene.events.emit(
      'boss-health-changed',
      this,
      this.health,
      this.maxHealth
    )

    if (this.health <= 0) {
      this.die()
    }
  }

  die(): void {
    this.health = 0
    this.ai.transition(BossAIState.DEAD)
  }

  // ---------------------------------------------------------------------------
  // Visuals
  // ---------------------------------------------------------------------------

  private updateVisuals(): void {
    const phase = this.getCurrentPhase()
    if (!phase) return

    if (this.ai.state === BossAIState.TELEGRAPH) {
      this.setTint(0x6600cc)
    } else if (this.ai.state === BossAIState.ATTACK) {
      this.setTint(0x9900ff)
    } else if (this.ai.state === BossAIState.RECOVERY) {
      this.setTint(0x88bbff)
    } else if (this.ai.state === BossAIState.PHASE_TRANSITION) {
      this.setTint(0xcc00ff)
    } else {
      this.setTint(phase.tint)
    }

    // Enrage — dimensional flickering (rapid alpha oscillation)
    if (this.ai.isEnraged && this.ai.state !== BossAIState.DEAD) {
      const flicker = Math.random() > 0.3 ? 1 : 0.2
      this.setAlpha(flicker)
    }

    // Phase 3 — constant phase-shift shimmer
    if (this.currentPhaseIndex >= 2 && this.ai.state === BossAIState.IDLE) {
      const shimmer = Math.abs(Math.sin(Date.now() / 150)) * 0.3 + 0.7
      this.setAlpha(shimmer)
    }
  }
}
