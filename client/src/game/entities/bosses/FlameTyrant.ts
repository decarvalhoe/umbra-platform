/**
 * Flame Tyrant -- Second boss entity (fire-themed).
 *
 * A 3-phase boss fight with escalating fire attacks.
 *
 * Phase 1 — Smoldering (100%-60% HP):
 *   - Flame Pillar (AoE column)
 *   - Magma Spit (ranged projectile)
 *
 * Phase 2 — Inferno (60%-25% HP):
 *   - Adds Magma Pool (persistent AoE)
 *   - Adds Fire Charge (dash attack)
 *
 * Phase 3 — Supernova (25%-0% HP):
 *   - Fire Charge + Inferno Breath + Eruption + Magma Pool
 *   - Massive speed and attack speed increase
 */

import Phaser from 'phaser'
import { BossAI, BossAIState } from './BossAI'
import type { BossEntityConfig, BossPhaseConfig } from './BossConfig'
import { flameTyrantConfig } from './BossConfig'

const BOSS_TINT = 0xff6b35
const BOSS_WIDTH = 72
const BOSS_HEIGHT = 104

export class FlameTyrant extends Phaser.Physics.Arcade.Sprite {
  public ai!: BossAI
  public config: BossEntityConfig

  public health: number
  public maxHealth: number
  public isInvulnerable = false
  public isVulnerable = false

  private currentPhaseIndex = 0
  private playerRef: Phaser.Physics.Arcade.Sprite | null = null

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const texKey = 'boss_flame_tyrant'
    if (!scene.textures.exists(texKey)) {
      const gfx = scene.add.graphics()
      // Body — dark red core
      gfx.fillStyle(0x8b0000, 1)
      gfx.fillRect(0, 0, BOSS_WIDTH, BOSS_HEIGHT)
      // Flame crown
      gfx.fillStyle(0xff4400, 1)
      gfx.fillTriangle(BOSS_WIDTH / 2, 0, 10, 24, BOSS_WIDTH - 10, 24)
      // Glowing eyes
      gfx.fillStyle(0xffcc00, 1)
      gfx.fillCircle(22, 32, 7)
      gfx.fillCircle(50, 32, 7)
      // Magma veins
      gfx.lineStyle(2, 0xff6600, 0.8)
      gfx.lineBetween(BOSS_WIDTH / 2, 50, 10, BOSS_HEIGHT - 10)
      gfx.lineBetween(BOSS_WIDTH / 2, 50, BOSS_WIDTH - 10, BOSS_HEIGHT - 10)
      gfx.generateTexture(texKey, BOSS_WIDTH, BOSS_HEIGHT)
      gfx.destroy()
    }

    super(scene, x, y, texKey, 0)

    this.config = flameTyrantConfig
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
      this.setTint(0xffaa00)
    } else if (this.ai.state === BossAIState.ATTACK) {
      this.setTint(0xff2200)
    } else if (this.ai.state === BossAIState.RECOVERY) {
      this.setTint(0x88bbff)
    } else if (this.ai.state === BossAIState.PHASE_TRANSITION) {
      this.setTint(0xffff00)
    } else {
      this.setTint(phase.tint)
    }

    // Enrage — intense flickering flame effect
    if (this.ai.isEnraged && this.ai.state !== BossAIState.DEAD) {
      const flicker = Math.abs(Math.sin(Date.now() / 100)) * 0.4 + 0.6
      this.setAlpha(flicker)
    }
  }
}
