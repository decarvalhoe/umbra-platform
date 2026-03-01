import type { Enemy } from '../Enemy'
import { EnemyState } from '../EnemyFSM'
import { EnemyIdleState } from './EnemyIdleState'
import { EnemyPatrolState } from './EnemyPatrolState'
import { EnemyChaseState } from './EnemyChaseState'
import { EnemyAttackState } from './EnemyAttackState'
import { EnemyRetreatState } from './EnemyRetreatState'
import { EnemyHurtState } from './EnemyHurtState'
import { EnemyDeadState } from './EnemyDeadState'

/** All valid enemy state names for type safety. */
export type EnemyStateName =
  | 'IDLE'
  | 'PATROL'
  | 'CHASE'
  | 'ATTACK'
  | 'HURT'
  | 'DEAD'
  | 'RETREAT'

/**
 * Factory for creating EnemyState instances by name.
 *
 * This pattern avoids circular imports between state files --
 * states reference each other by string name through the factory
 * rather than importing each other directly.
 */
export class EnemyStateFactory {
  static create(name: EnemyStateName, enemy: Enemy): EnemyState {
    switch (name) {
      case 'IDLE':
        return new EnemyIdleState(enemy)
      case 'PATROL':
        return new EnemyPatrolState(enemy)
      case 'CHASE':
        return new EnemyChaseState(enemy)
      case 'ATTACK':
        return new EnemyAttackState(enemy)
      case 'RETREAT':
        return new EnemyRetreatState(enemy)
      case 'HURT':
        return new EnemyHurtState(enemy)
      case 'DEAD':
        return new EnemyDeadState(enemy)
      default: {
        const exhaustive: never = name
        throw new Error(`Unknown enemy state: ${exhaustive}`)
      }
    }
  }
}
