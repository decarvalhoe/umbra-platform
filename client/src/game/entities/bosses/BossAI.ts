/**
 * Boss AI state machine for the Corrupted Guardian.
 *
 * States: IDLE -> TELEGRAPH -> ATTACK -> RECOVERY -> repeat
 * Special states: PHASE_TRANSITION, ENRAGED, DEAD
 *
 * The boss AI selects attacks from a phase-specific attack table,
 * respects cooldowns, and manages vulnerability windows during recovery.
 */

import type { BossAttackConfig, BossEntityConfig, BossPhaseConfig } from './BossConfig'

/**
 * Interface for any boss entity that can be controlled by BossAI.
 * All boss entities (CorruptedGuardian, FlameTyrant, VoidHarbinger)
 * must implement this interface.
 */
export interface BossEntity {
  config: BossEntityConfig
  health: number
  maxHealth: number
  isInvulnerable: boolean
  isVulnerable: boolean
  scene: Phaser.Scene
  setVelocity(x: number, y: number): void
  playAnim(key: string): void
  getPhaseIndex(): number
  getCurrentPhase(): BossPhaseConfig | null
}

/** All valid boss AI states. */
export enum BossAIState {
  IDLE = 'IDLE',
  TELEGRAPH = 'TELEGRAPH',
  ATTACK = 'ATTACK',
  RECOVERY = 'RECOVERY',
  PHASE_TRANSITION = 'PHASE_TRANSITION',
  ENRAGED = 'ENRAGED',
  DEAD = 'DEAD',
}

/**
 * Boss AI controller -- manages state transitions and attack selection.
 *
 * Unlike the EnemyFSM which uses separate State classes, the boss AI
 * uses an inline state machine because boss states are tightly coupled
 * to the boss entity's phase system and attack configs.
 */
export class BossAI {
  private boss: BossEntity
  private _state: BossAIState = BossAIState.IDLE
  private _previousState: BossAIState = BossAIState.IDLE

  // Timers
  private stateTimer = 0
  private idleDuration = 800 // ms between attack cycles
  private phaseTransitionDuration = 2000 // 2s invincible roar

  // Current attack
  private _currentAttack: BossAttackConfig | null = null
  private attackCooldowns: Map<string, number> = new Map()

  // Enrage timer
  private enrageTimer: number
  private enrageActive = false

  private debug: boolean

  constructor(boss: BossEntity, debug = false) {
    this.boss = boss
    this.debug = debug
    this.enrageTimer = boss.config.enrageTimerMs
  }

  /** Current AI state. */
  get state(): BossAIState {
    return this._state
  }

  /** Previous AI state. */
  get previousState(): BossAIState {
    return this._previousState
  }

  /** The attack currently being telegraphed or executed. */
  get currentAttack(): BossAttackConfig | null {
    return this._currentAttack
  }

  /** Whether the enrage timer has expired. */
  get isEnraged(): boolean {
    return this.enrageActive
  }

  /**
   * Transition to a new AI state.
   * Handles enter/exit logic for each state.
   */
  transition(newState: BossAIState): void {
    if (this.debug) {
      console.log(`[BossAI] ${this._state} -> ${newState}`)
    }

    this._previousState = this._state
    this._state = newState
    this.stateTimer = 0

    // Enter logic
    switch (newState) {
      case BossAIState.IDLE: {
        this.boss.setVelocity(0, 0)
        const idleAnim = this.boss.getPhaseIndex() >= 1 ? 'phase2-idle' : 'idle'
        this.boss.playAnim(idleAnim)
        break
      }

      case BossAIState.TELEGRAPH:
        this.boss.setVelocity(0, 0)
        this.boss.playAnim('telegraph')
        this.boss.scene.events.emit('boss-telegraph', this.boss, this._currentAttack)
        break

      case BossAIState.ATTACK:
        this.boss.playAnim('attack')
        this.boss.scene.events.emit('boss-attack', this.boss, this._currentAttack)
        break

      case BossAIState.RECOVERY:
        this.boss.setVelocity(0, 0)
        this.boss.isVulnerable = true
        this.boss.playAnim('idle')
        this.boss.scene.events.emit('boss-recovery', this.boss)
        break

      case BossAIState.PHASE_TRANSITION:
        this.boss.setVelocity(0, 0)
        this.boss.isInvulnerable = true
        this.boss.playAnim('hurt')
        this.boss.scene.events.emit('boss-phase-transition', this.boss)
        break

      case BossAIState.ENRAGED:
        this.enrageActive = true
        this.boss.playAnim('phase2-idle')
        this.boss.scene.events.emit('boss-enraged', this.boss)
        break

      case BossAIState.DEAD:
        this.boss.setVelocity(0, 0)
        this.boss.playAnim('dead')
        this.boss.scene.events.emit('boss-defeated', this.boss)
        break
    }
  }

  /**
   * Per-frame update. Delegates to the current state's logic.
   */
  update(delta: number): void {
    if (this._state === BossAIState.DEAD) return

    // Update enrage timer
    this.enrageTimer -= delta
    if (this.enrageTimer <= 0 && !this.enrageActive) {
      this.transition(BossAIState.ENRAGED)
      return
    }

    // Update attack cooldowns
    for (const [id, cd] of this.attackCooldowns.entries()) {
      this.attackCooldowns.set(id, Math.max(0, cd - delta))
    }

    this.stateTimer += delta

    switch (this._state) {
      case BossAIState.IDLE:
        this.updateIdle(delta)
        break
      case BossAIState.TELEGRAPH:
        this.updateTelegraph(delta)
        break
      case BossAIState.ATTACK:
        this.updateAttack(delta)
        break
      case BossAIState.RECOVERY:
        this.updateRecovery(delta)
        break
      case BossAIState.PHASE_TRANSITION:
        this.updatePhaseTransition(delta)
        break
      case BossAIState.ENRAGED:
        // In enraged state, use idle logic but faster
        this.updateIdle(delta)
        break
    }
  }

  // ---------------------------------------------------------------------------
  // State updates
  // ---------------------------------------------------------------------------

  private updateIdle(_delta: number): void {
    if (this.stateTimer >= this.idleDuration) {
      // Select next attack
      const attack = this.selectAttack()
      if (attack) {
        this._currentAttack = attack
        this.transition(BossAIState.TELEGRAPH)
      }
    }
  }

  private updateTelegraph(_delta: number): void {
    if (!this._currentAttack) {
      this.transition(BossAIState.IDLE)
      return
    }

    if (this.stateTimer >= this._currentAttack.timing.telegraphMs) {
      this.transition(BossAIState.ATTACK)
    }
  }

  private updateAttack(_delta: number): void {
    if (!this._currentAttack) {
      this.transition(BossAIState.RECOVERY)
      return
    }

    // Emit hit at midpoint of attack
    const midpoint = this._currentAttack.timing.activeMs * 0.5
    if (this.stateTimer >= midpoint && this.stateTimer - _delta < midpoint) {
      this.boss.scene.events.emit(
        'boss-attack-hit',
        this.boss,
        this._currentAttack
      )
    }

    if (this.stateTimer >= this._currentAttack.timing.activeMs) {
      // Set cooldown for this attack
      this.attackCooldowns.set(
        this._currentAttack.id,
        this._currentAttack.timing.cooldownMs
      )
      this.transition(BossAIState.RECOVERY)
    }
  }

  private updateRecovery(_delta: number): void {
    if (this.stateTimer >= this.boss.config.vulnerabilityDurationMs) {
      this.boss.isVulnerable = false
      this._currentAttack = null
      this.transition(BossAIState.IDLE)
    }
  }

  private updatePhaseTransition(_delta: number): void {
    if (this.stateTimer >= this.phaseTransitionDuration) {
      this.boss.isInvulnerable = false
      this.transition(BossAIState.IDLE)
    }
  }

  // ---------------------------------------------------------------------------
  // Attack selection
  // ---------------------------------------------------------------------------

  /**
   * Select the next attack from the current phase's attack table.
   * Respects cooldowns. Returns null if all attacks are on cooldown.
   */
  private selectAttack(): BossAttackConfig | null {
    const phase = this.boss.getCurrentPhase()
    if (!phase) return null

    const available = phase.attacks.filter((atk) => {
      const cd = this.attackCooldowns.get(atk.id) ?? 0
      return cd <= 0
    })

    if (available.length === 0) return null

    // Simple random selection (could be weighted later)
    const index = Math.floor(Math.random() * available.length)
    return available[index]
  }
}
