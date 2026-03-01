import { EnemyState, EnemyStateType } from '../EnemyFSM'
import { StateFactory } from './StateFactory'

/** Duration of the alert pause before chasing (ms). */
const ALERT_DURATION = 300

/**
 * Alert state -- brief pause when the enemy first detects the player.
 *
 * Plays an alert animation (e.g. "!" icon, head turn) for a short
 * duration, giving the player a visual cue that they've been spotted.
 * After the alert window, the enemy begins pursuit.
 *
 * Transitions:
 *   -> CHASE  after ALERT_DURATION ms
 *   -> IDLE   if the player leaves detection range during the alert window
 */
export class AlertState extends EnemyState {
  private elapsed = 0

  get name(): EnemyStateType {
    return EnemyStateType.ALERT
  }

  enter(): void {
    this.elapsed = 0
    this.enemy.setVelocity(0, 0)

    // Visual feedback -- tint yellow to indicate alert
    this.enemy.setTint(0xffff00)

    // this.enemy.anims.play('enemy-alert', true)  // Enable when sprites are ready

    this.enemy.scene.events.emit('enemy-alert', this.enemy)
  }

  update(delta: number): void {
    this.elapsed += delta

    // If the player escaped during the alert window, return to idle
    const distance = this.enemy.distanceToPlayer()
    if (distance === null || distance > this.enemy.config.detectionRange) {
      this.enemy.fsm.transition(StateFactory.create('IDLE', this.enemy))
      return
    }

    // Alert pause complete -- begin chasing
    if (this.elapsed >= ALERT_DURATION) {
      this.enemy.fsm.transition(StateFactory.create('CHASE', this.enemy))
      return
    }
  }

  exit(): void {
    this.elapsed = 0
    this.enemy.clearTint()
    this.enemy.setTint(this.enemy.baseTint)
  }
}
