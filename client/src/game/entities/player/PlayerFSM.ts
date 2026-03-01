import type { Player } from './Player'

/**
 * Abstract base class for all player states.
 * Each concrete state controls player behavior during that phase
 * (movement, animation, combat, etc.).
 */
export abstract class PlayerState {
  protected player: Player

  constructor(player: Player) {
    this.player = player
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
 * Finite State Machine controller for the Player entity.
 *
 * Manages state lifecycle (enter/update/exit) and transitions.
 * Enable `debug` to log every transition to the console.
 */
export class PlayerFSM {
  private currentState: PlayerState
  private previousState: PlayerState | null = null
  private debug: boolean

  constructor(initialState: PlayerState, debug = false) {
    this.currentState = initialState
    this.debug = debug
    this.currentState.enter()
  }

  /**
   * Transition from the current state to a new one.
   * Calls exit() on the old state and enter() on the new state.
   */
  transition(newState: PlayerState): void {
    if (this.debug) {
      console.log(`[FSM] ${this.currentState.name} -> ${newState.name}`)
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
  get state(): PlayerState {
    return this.currentState
  }

  /** String name of the currently active state. */
  get stateName(): string {
    return this.currentState.name
  }

  /** The state that was active before the last transition (null initially). */
  get previous(): PlayerState | null {
    return this.previousState
  }
}
