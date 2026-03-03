import Phaser from 'phaser'
import { EnemyFSM } from './EnemyFSM'
import type { EnemyConfig } from './EnemyConfig'
import { IdleState } from './states/IdleState'
import { StateFactory } from './states/StateFactory'

/** Tint colour applied to the placeholder rectangle per element. */
const ELEMENT_TINTS: Record<string, number> = {
  fire: 0xff4400,
  shadow: 0x6622cc,
  blood: 0xcc0022,
  void: 0x222244,
}

/** Default tint for enemies with no elemental affinity. */
const DEFAULT_TINT = 0xcc4444

/** Map enemy element to sprite sheet key. */
const ELEMENT_SHEETS: Record<string, string> = {
  fire: 'fire_imp_sheet',
  shadow: 'shadow_wraith_sheet',
  blood: 'blood_wraith_sheet',
  void: 'void_sentinel_sheet',
}

/** Map enemy element to animation prefix. */
const ELEMENT_ANIM_PREFIX: Record<string, string> = {
  fire: 'fire_imp',
  shadow: 'shadow_wraith',
  blood: 'blood_wraith',
  void: 'void_sentinel',
}


/**
 * Enemy entity -- Phaser Arcade Sprite with FSM-driven AI behavior.
 *
 * The Enemy class owns:
 *   - Configuration (health, damage, ranges, etc.) from an EnemyConfig
 *   - The EnemyFSM that delegates all per-frame behavior to the active state
 *   - Player detection helpers (distance, position)
 *   - Combat methods (takeDamage, die)
 *
 * The Enemy does NOT own scene-level concerns like spawning groups,
 * overlap colliders, or loot tables -- those belong in the scene.
 */
export class Enemy extends Phaser.Physics.Arcade.Sprite {
  public fsm!: EnemyFSM
  public config: EnemyConfig
  public baseTint: number
  public animPrefix: string

  // Combat
  public health: number
  public maxHealth: number

  // Player reference (set by the scene that owns this enemy)
  private playerRef: Phaser.Physics.Arcade.Sprite | null = null

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    config: EnemyConfig
  ) {
    // Determine sprite sheet from element type
    const sheetKey = config.element ? (ELEMENT_SHEETS[config.element] ?? '') : ''
    const texKey = sheetKey && scene.textures.exists(sheetKey) ? sheetKey : 'enemy'

    // Fallback: create basic rect texture if no sheet generated
    if (texKey === 'enemy' && !scene.textures.exists('enemy')) {
      const gfx = scene.add.graphics()
      gfx.fillStyle(0xcc4444, 1)
      gfx.fillRect(0, 0, 32, 48)
      gfx.generateTexture('enemy', 32, 48)
      gfx.destroy()
    }

    super(scene, x, y, texKey, 0)

    this.config = config
    this.health = config.hp
    this.maxHealth = config.hp
    this.animPrefix = config.element ? (ELEMENT_ANIM_PREFIX[config.element] ?? '') : ''

    this.baseTint = config.element
      ? (ELEMENT_TINTS[config.element] ?? DEFAULT_TINT)
      : DEFAULT_TINT

    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.setCollideWorldBounds(true)
    this.setSize(32, 48)
    this.setOrigin(0.5, 0.5)
    // Only apply tint for fallback texture
    if (texKey === 'enemy') this.setTint(this.baseTint)

    // Initialize FSM -- starts in IDLE
    this.fsm = new EnemyFSM(new IdleState(this), true)
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /** Play a named animation if available. */
  playAnim(key: string, ignoreIfPlaying = true): void {
    const animKey = this.animPrefix ? `${this.animPrefix}-${key}` : ''
    if (animKey && this.scene.anims.exists(animKey)) {
      this.anims.play(animKey, ignoreIfPlaying)
    }
  }

  /**
   * Called every frame by the scene's update().
   * Delegates behavior to the FSM.
   */
  update(_time: number, delta: number): void {
    this.fsm.update(delta)
  }

  // ---------------------------------------------------------------------------
  // Player reference
  // ---------------------------------------------------------------------------

  /**
   * Set the player reference for detection/targeting.
   * Must be called by the scene after creating both the player and enemy.
   */
  setPlayer(player: Phaser.Physics.Arcade.Sprite): void {
    this.playerRef = player
  }

  /**
   * Calculate the distance to the player.
   * Returns null if no player reference is set or the player is inactive.
   */
  distanceToPlayer(): number | null {
    if (!this.playerRef || !this.playerRef.active) return null

    const dx = this.playerRef.x - this.x
    const dy = this.playerRef.y - this.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  /**
   * Get the player's current position.
   * Returns null if no player reference is set or the player is inactive.
   */
  getPlayerPosition(): { x: number; y: number } | null {
    if (!this.playerRef || !this.playerRef.active) return null
    return { x: this.playerRef.x, y: this.playerRef.y }
  }

  // ---------------------------------------------------------------------------
  // Combat
  // ---------------------------------------------------------------------------

  /**
   * Apply damage to this enemy.
   * Respects defense stat and transitions to HURT or DEAD as appropriate.
   */
  takeDamage(rawAmount: number): void {
    // Apply defense reduction (minimum 1 damage)
    const amount = Math.max(1, rawAmount - this.config.defense)
    this.health = Math.max(0, this.health - amount)

    this.scene.events.emit('enemy-health-changed', this, this.health, this.maxHealth)

    if (this.health <= 0) {
      this.die()
    } else {
      this.fsm.transition(StateFactory.create('HURT', this))
    }
  }

  /**
   * Immediately kill this enemy (transitions to DEAD state).
   * Called internally by takeDamage or externally for instant kills.
   */
  die(): void {
    this.health = 0
    this.fsm.transition(StateFactory.create('DEAD', this))
  }
}
