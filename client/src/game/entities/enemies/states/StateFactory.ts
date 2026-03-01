import type { Enemy } from '../Enemy'
import { EnemyState } from '../EnemyFSM'
import { IdleState } from './IdleState'
import { AlertState } from './AlertState'
import { ChaseState } from './ChaseState'
import { TelegraphState } from './TelegraphState'
import { AttackState } from './AttackState'
import { HurtState } from './HurtState'
import { DeadState } from './DeadState'

/** All valid enemy state names for type safety. */
export type EnemyStateName =
  | 'IDLE'
  | 'ALERT'
  | 'CHASE'
  | 'TELEGRAPH'
  | 'ATTACK'
  | 'HURT'
  | 'DEAD'

/**
 * Factory for creating EnemyState instances by name.
 *
 * This pattern avoids circular imports between state files --
 * states reference each other by string name through the factory
 * rather than importing each other directly.
 */
export class StateFactory {
  static create(name: EnemyStateName, enemy: Enemy): EnemyState {
    switch (name) {
      case 'IDLE':
        return new IdleState(enemy)
      case 'ALERT':
        return new AlertState(enemy)
      case 'CHASE':
        return new ChaseState(enemy)
      case 'TELEGRAPH':
        return new TelegraphState(enemy)
      case 'ATTACK':
        return new AttackState(enemy)
      case 'HURT':
        return new HurtState(enemy)
      case 'DEAD':
        return new DeadState(enemy)
      default: {
        const exhaustive: never = name
        throw new Error(`Unknown enemy state: ${exhaustive}`)
      }
    }
  }
}
