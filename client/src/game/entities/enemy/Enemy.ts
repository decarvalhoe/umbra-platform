import Phaser from 'phaser'
import { EnemyFSM } from './EnemyFSM'
import { EnemyIdleState } from './states/EnemyIdleState'
import { EnemyStateFactory } from './states/EnemyStateFactory'

/**
 * Configuration for creating an enemy instance.
 * Use ENEMY_PRESETS for predefined archetypes or create custom configs.
 */
export interface EnemyConfig {
  /** Identifier for this enemy archetype (e.g. 'shadow_wraith'). */
  type: string
  /** Maximum and starting health. */
  health: number
  /** Damage dealt per attack hit. */
  attackDamage: number
  /** Movement speed in pixels per second. */
  moveSpeed: number
  /** Distance at which the enemy detects the player (px). */
  detectionRange: number
  /** Distance at which the enemy can hit the player (px). */
  attackRange: number
  /** Minimum time between attacks (ms). */
  attackCooldown: number
  /** Optional elemental affinity (e.g. 'shadow', 'void', 'blood'). */
  element?: string
}

/**
 * Enemy entity -- Phaser Arcade Sprite with FSM-driven AI behavior.
 *
 * The Enemy class owns:
 *   - Combat stats (health, damage, ranges, cooldowns)
 *   - Target tracking (reference to the player or other target)
 *   - Movement helpers (moveTowardsTarget, distanceToTarget)
 *   - The FSM that delegates all per-frame AI behavior to the active state
 *
 * The Enemy does NOT own scene-level concerns like spawning, collision
 * groups, or loot tables -- those belong in the scene or a manager.
 *
 * Uses a placeholder red rectangle texture. Replace with real sprites
 * when art assets are available.
 */
export class Enemy extends Phaser.Physics.Arcade.Sprite {
  public fsm!: EnemyFSM
  public target: Phaser.Physics.Arcade.Sprite | null = null

  // Stats
  public health: number
  public maxHealth: number
  public attackDamage: number
  public moveSpeed: number
  public detectionRange: number
  public attackRange: number
  public attackCooldown: number

  // State
  public lastAttackTime = 0
  public isInvulnerable = false
  public facingDirection: { x: number; y: number } = { x: 0, y: 0 }

  // Config
  public enemyType: string
  public element: string | null

  constructor(scene: Phaser.Scene, x: number, y: number, config: EnemyConfig) {
    // Create a placeholder red rectangle texture if it doesn't exist yet
    const textureKey = `enemy_${config.type}`
    if (!scene.textures.exists(textureKey)) {
      const gfx = scene.add.graphics()
      gfx.fillStyle(0xff4444, 1)
      gfx.fillRect(0, 0, 28, 40)
      gfx.generateTexture(textureKey, 28, 40)
      gfx.destroy()
    }

    super(scene, x, y, textureKey)

    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.setCollideWorldBounds(true)
    this.setSize(28, 40)
    this.setOrigin(0.5, 0.5)

    // Tint the placeholder rectangle red
    this.setTint(0xff4444)

    // Set stats from config
    this.health = config.health
    this.maxHealth = config.health
    this.attackDamage = config.attackDamage
    this.moveSpeed = config.moveSpeed
    this.detectionRange = config.detectionRange
    this.attackRange = config.attackRange
    this.attackCooldown = config.attackCooldown
    this.enemyType = config.type
    this.element = config.element ?? null

    // Initialize FSM -- starts in IDLE
    this.fsm = new EnemyFSM(new EnemyIdleState(this), true)
  }

  /**
   * Called every frame by the scene's update().
   * Delegates all behavior to the FSM.
   */
  update(_time: number, delta: number): void {
    this.fsm.update(delta)
  }

  // ---------------------------------------------------------------------------
  // Target management
  // ---------------------------------------------------------------------------

  /** Set the sprite this enemy will pursue and attack. */
  setTarget(target: Phaser.Physics.Arcade.Sprite): void {
    this.target = target
  }

  /** Clear the current target. */
  clearTarget(): void {
    this.target = null
  }

  // ---------------------------------------------------------------------------
  // Distance & range helpers
  // ---------------------------------------------------------------------------

  /** Distance from this enemy to its current target (Infinity if no target). */
  distanceToTarget(): number {
    if (!this.target) return Infinity
    return Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y)
  }

  /** Whether the current target is within the given range. */
  isTargetInRange(range: number): boolean {
    return this.distanceToTarget() <= range
  }

  // ---------------------------------------------------------------------------
  // Movement
  // ---------------------------------------------------------------------------

  /**
   * Move directly towards the current target at the given speed.
   * Updates facingDirection and sprite flip.
   * @param speed Override speed (defaults to this.moveSpeed).
   */
  moveTowardsTarget(speed?: number): void {
    if (!this.target) return
    const s = speed ?? this.moveSpeed
    const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y)
    this.setVelocity(Math.cos(angle) * s, Math.sin(angle) * s)
    this.facingDirection = { x: Math.cos(angle), y: Math.sin(angle) }
    this.setFlipX(this.target.x < this.x)
  }

  // ---------------------------------------------------------------------------
  // Combat
  // ---------------------------------------------------------------------------

  /** Whether the attack cooldown has elapsed since the last attack. */
  canAttack(): boolean {
    return Date.now() - this.lastAttackTime >= this.attackCooldown
  }

  /**
   * Apply damage to this enemy.
   * Respects invulnerability. Transitions to HURT or DEAD as appropriate.
   * Optional knockback velocity can be applied.
   *
   * @param amount  Damage to deal.
   * @param knockbackX  Optional horizontal knockback velocity.
   * @param knockbackY  Optional vertical knockback velocity.
   */
  takeDamage(amount: number, knockbackX?: number, knockbackY?: number): void {
    if (this.isInvulnerable) return

    this.health = Math.max(0, this.health - amount)

    if (this.health <= 0) {
      this.fsm.transition(EnemyStateFactory.create('DEAD', this))
    } else {
      this.fsm.transition(EnemyStateFactory.create('HURT', this))
      if (knockbackX !== undefined && knockbackY !== undefined) {
        this.setVelocity(knockbackX, knockbackY)
      }
    }

    this.scene.events.emit('enemy-health-changed', this)
  }
}
