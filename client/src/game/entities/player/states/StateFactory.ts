import type { Player } from '../Player'
import { PlayerState } from '../PlayerFSM'
import { IdleState } from './IdleState'
import { RunState } from './RunState'
import { AttackState } from './AttackState'
import { DodgeState } from './DodgeState'
import { HurtState } from './HurtState'
import { DeadState } from './DeadState'

/** All valid state names for type safety. */
export type StateName = 'IDLE' | 'RUN' | 'ATTACK' | 'DODGE' | 'HURT' | 'DEAD'

/**
 * Factory for creating PlayerState instances by name.
 *
 * This pattern avoids circular imports between state files --
 * states reference each other by string name through the factory
 * rather than importing each other directly.
 */
export class StateFactory {
  static create(name: StateName, player: Player): PlayerState {
    switch (name) {
      case 'IDLE':
        return new IdleState(player)
      case 'RUN':
        return new RunState(player)
      case 'ATTACK':
        return new AttackState(player)
      case 'DODGE':
        return new DodgeState(player)
      case 'HURT':
        return new HurtState(player)
      case 'DEAD':
        return new DeadState(player)
      default: {
        const exhaustive: never = name
        throw new Error(`Unknown player state: ${exhaustive}`)
      }
    }
  }
}
