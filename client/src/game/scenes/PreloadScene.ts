import Phaser from 'phaser'
import { generateAllSprites } from '../assets/SpriteGenerator'

/**
 * PreloadScene — generates all programmatic sprite sheets and UI textures
 * before transitioning to the main title screen.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' })
  }

  create(): void {
    const { width, height } = this.scale

    // Loading text
    const loadText = this.add.text(width / 2, height / 2, 'Loading...', {
      fontSize: '24px',
      color: '#c8a2c8',
      fontFamily: 'monospace',
    })
    loadText.setOrigin(0.5)

    // Generate all sprite sheets and register animations
    generateAllSprites(this)

    // Transition to main scene
    this.time.delayedCall(200, () => {
      this.scene.start('MainScene')
    })
  }
}
