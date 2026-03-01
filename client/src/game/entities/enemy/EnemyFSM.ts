import type { Enemy } from './Enemy'

/**
 * Abstract base class for all enemy states.
 * Each concrete state controls enemy behavior during that phase
 * (movement, detection, combat, etc.).
 */
export abstract class EnemyState {
  protected enemy: Enemy

  constructor(enemy: Enemy) {
    this.enemy = enemy
  }

  /** Called once when transitioning INTO this state. */
  abstract enter(): void

  /** Called every frame while this state is active. */
  abstract update(delta: number): void

  /** Called once when transitioning OUT of this state. */
  abstract exit(): void

  /** Human-readable state identifier for debugging. */
  abstract get name(): string
}

/**
 * Finite State Machine controller for Enemy entities.
 *
 * Manages state lifecycle (enter/update/exit) and transitions.
 * Mirrors the PlayerFSM pattern for consistency across the codebase.
 * Enable `debug` to log every transition to the console.
 */
export class EnemyFSM {
  private currentState: EnemyState
  private previousState: EnemyState | null = null
  private debug: boolean

  constructor(initialState: EnemyState, debug = false) {
    this.currentState = initialState
    this.debug = debug
    this.currentState.enter()
  }

  /**
   * Transition from the current state to a new one.
   * Calls exit() on the old state and enter() on the new state.
   */
  transition(newState: EnemyState): void {
    if (this.debug) {
      console.log(`[EnemyFSM] ${this.currentState.name} -> ${newState.name}`)
    }
    this.previousState = this.currentState
    this.currentState.exit()
    this.currentState = newState
    this.currentState.enter()
  }

  /** Delegates the per-frame update to the active state. */
  update(delta: number): void {
    this.currentState.update(delta)
  }

  /** The currently active state instance. */
  get state(): EnemyState {
    return this.currentState
  }

  /** String name of the currently active state. */
  get stateName(): string {
    return this.currentState.name
  }

  /** The state that was active before the last transition (null initially). */
  get previous(): EnemyState | null {
    return this.previousState
  }
}
