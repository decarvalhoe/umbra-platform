import { Types } from 'phaser'
import { PreloadScene } from './scenes/PreloadScene'
import { MainScene } from './scenes/MainScene'
import { CombatScene } from './scenes/CombatScene'
import { DungeonScene } from './scenes/DungeonScene'
import { HubScene } from './scenes/HubScene'

export const gameConfig: Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1024,
  height: 768,
  backgroundColor: '#2c3e50',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0, x: 0 },
      debug: false
    }
  },
  scene: [PreloadScene, MainScene, CombatScene, DungeonScene, HubScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
}
