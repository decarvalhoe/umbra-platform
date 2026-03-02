import Phaser from 'phaser'
import { PlayerFSM } from './PlayerFSM'
import { IdleState } from './states/IdleState'
import { StateFactory } from './states/StateFactory'

/** Key bindings for player actions. */
export interface PlayerKeys {
  attack: Phaser.Input.Keyboard.Key
  dodge: Phaser.Input.Keyboard.Key
  skill1: Phaser.Input.Keyboard.Key
}

/**
 * Player entity -- Phaser Arcade Sprite with FSM-driven behavior.
 *
 * The Player class owns:
 *   - Input bindings (cursors + action keys)
 *   - Combat stats (health, damage, combo)
 *   - Dodge charge system (2 charges, 3s recharge)
 *   - The FSM that delegates all per-frame behavior to the active state
 *
 * The Player does NOT own scene-level concerns like camera, collisions,
 * or spawning -- those belong in the scene that creates the Player.
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
  public fsm!: PlayerFSM
  public cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  public keys!: PlayerKeys

  // Movement
  public moveSpeed = 200

  // Combat
  public isInvulnerable = false
  public health = 100
  public maxHealth = 100
  public attackDamage = 15
  public comboStep = 0
  public comboTimer = 0

  // Dodge system
  private dodgeCharges = 2
  private maxDodgeCharges = 2
  private dodgeRechargeTimer = 0
  private dodgeRechargeDuration = 3000 // 3 seconds per charge

  constructor(scene: Phaser.Scene, x: number, y: number) {
    // Create a placeholder texture if 'player' doesn't exist yet
    if (!scene.textures.exists('player')) {
      const gfx = scene.add.graphics()
      gfx.fillStyle(0x4488ff, 1)
      gfx.fillRect(0, 0, 32, 48)
      gfx.generateTexture('player', 32, 48)
      gfx.destroy()
    }

    super(scene, x, y, 'player')

    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.setCollideWorldBounds(true)
    this.setSize(32, 48)
    this.setOrigin(0.5, 0.5)

    // Tint the placeholder rectangle
    this.setTint(0x4488ff)

    // Input setup
    const keyboard = scene.input.keyboard
    if (!keyboard) {
      throw new Error('Keyboard input is not available in this scene')
    }

    this.cursors = keyboard.createCursorKeys()
    this.keys = {
      attack: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z),
      dodge: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X),
      skill1: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
    }

    // Initialize FSM -- starts in IDLE
    this.fsm = new PlayerFSM(new IdleState(this), true)

    // Emit initial dodge charge count so UI can display on load
    this.scene.events.emit(
      'player-dodge-charges-changed',
      this.dodgeCharges,
      this.maxDodgeCharges
    )
  }

  /**
   * Called every frame by the scene's update().
   * Delegates behavior to the FSM and updates internal timers.
   */
  update(_time: number, delta: number): void {
    this.fsm.update(delta)
    this.updateDodgeRecharge(delta)
    this.updateComboTimer(delta)
  }

  // ---------------------------------------------------------------------------
  // Dodge system
  // ---------------------------------------------------------------------------

  /** Whether the player has at least one dodge charge available. */
  canDodge(): boolean {
    return this.dodgeCharges > 0
  }

  /** Consume one dodge charge. Called by DodgeState on enter. */
  consumeDodge(): void {
    if (this.dodgeCharges > 0) {
      this.dodgeCharges--
      this.dodgeRechargeTimer = 0 // Reset recharge progress on use
      this.scene.events.emit(
        'player-dodge-charges-changed',
        this.dodgeCharges,
        this.maxDodgeCharges
      )
    }
  }

  /** Current number of dodge charges (for UI display). */
  getDodgeCharges(): number {
    return this.dodgeCharges
  }

  /** Maximum dodge charges (for UI display). */
  getMaxDodgeCharges(): number {
    return this.maxDodgeCharges
  }

  private updateDodgeRecharge(delta: number): void {
    if (this.dodgeCharges < this.maxDodgeCharges) {
      this.dodgeRechargeTimer += delta
      if (this.dodgeRechargeTimer >= this.dodgeRechargeDuration) {
        this.dodgeCharges++
        this.dodgeRechargeTimer = 0
        this.scene.events.emit(
          'player-dodge-recharged',
          this.dodgeCharges,
          this.maxDodgeCharges
        )
        this.scene.events.emit(
          'player-dodge-charges-changed',
          this.dodgeCharges,
          this.maxDodgeCharges
        )
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Combo system
  // ---------------------------------------------------------------------------

  private updateComboTimer(delta: number): void {
    if (this.comboTimer > 0) {
      this.comboTimer -= delta
      if (this.comboTimer <= 0) {
        this.comboTimer = 0
        this.comboStep = 0
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Damage
  // ---------------------------------------------------------------------------

  /**
   * Apply damage to the player.
   * Respects invulnerability (dodge i-frames, hurt stun).
   * Transitions to HURT or DEAD state as appropriate.
   */
  takeDamage(amount: number): void {
    if (this.isInvulnerable) return

    this.health = Math.max(0, this.health - amount)

    this.scene.events.emit('player-health-changed', this.health, this.maxHealth)

    if (this.health <= 0) {
      this.fsm.transition(StateFactory.create('DEAD', this))
    } else {
      this.fsm.transition(StateFactory.create('HURT', this))
    }
  }

  // ---------------------------------------------------------------------------
  // Reset (for respawn)
  // ---------------------------------------------------------------------------

  /**
   * Reset the player to full health and idle state.
   * Call this from the scene when respawning.
   */
  respawn(x: number, y: number): void {
    this.health = this.maxHealth
    this.isInvulnerable = false
    this.comboStep = 0
    this.comboTimer = 0
    this.dodgeCharges = this.maxDodgeCharges
    this.dodgeRechargeTimer = 0

    this.setPosition(x, y)
    this.setVelocity(0, 0)
    this.setAlpha(1)
    this.clearTint()
    this.setTint(0x4488ff)

    // Re-enable physics body
    const body = this.body as Phaser.Physics.Arcade.Body
    if (body) {
      body.enable = true
    }

    this.fsm.transition(StateFactory.create('IDLE', this))

    this.scene.events.emit('player-health-changed', this.health, this.maxHealth)
    this.scene.events.emit(
      'player-dodge-charges-changed',
      this.dodgeCharges,
      this.maxDodgeCharges
    )
  }
}
