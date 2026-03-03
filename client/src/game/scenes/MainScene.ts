import Phaser from 'phaser'
import { restoreSession, authenticateDevice } from '../../nakama/auth'
import { audioManager } from '../audio/AudioManager'

/**
 * MainScene — Title screen and entry point.
 *
 * Attempts to restore or create a Nakama session, then transitions
 * to HubScene.  Works fully offline (auth failure is non-blocking).
 */
export class MainScene extends Phaser.Scene {
  private statusText!: Phaser.GameObjects.Text

  constructor() {
    super({ key: 'MainScene' })
  }

  create() {
    const { width, height } = this.scale
    this.cameras.main.setBackgroundColor(0x0f0f1a)

    // Title
    this.add
      .text(width / 2, height / 3 - 20, 'PROJECT UMBRA', {
        fontSize: '48px',
        fontStyle: 'bold',
        color: '#c8a2c8',
      })
      .setOrigin(0.5)

    this.add
      .text(width / 2, height / 3 + 40, 'Chronicles of the Fractured Realm', {
        fontSize: '18px',
        color: '#666666',
      })
      .setOrigin(0.5)

    // Start button
    const startBtn = this.add
      .text(width / 2, height / 2 + 60, '[ ENTER THE NEXUS ]', {
        fontSize: '22px',
        color: '#00ffaa',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => startBtn.setColor('#ffffff'))
      .on('pointerout', () => startBtn.setColor('#00ffaa'))
      .on('pointerdown', () => this.startGame())

    // ENTER shortcut
    this.input.keyboard
      ?.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER)
      .on('down', () => this.startGame())

    // Status line (auth feedback)
    this.statusText = this.add
      .text(width / 2, height - 60, '', {
        fontSize: '12px',
        color: '#555555',
      })
      .setOrigin(0.5)

    // Version
    this.add
      .text(width / 2, height - 30, 'v0.2.0 — Vertical Slice', {
        fontSize: '12px',
        color: '#333333',
      })
      .setOrigin(0.5)

    audioManager.crossFadeTo('hub')
  }

  private async startGame(): Promise<void> {
    this.statusText.setText('Connecting...')

    try {
      // Try restoring saved session first
      const restored = restoreSession()
      if (!restored) {
        // Fall back to anonymous device auth
        const deviceId =
          localStorage.getItem('umbra_device_id') || crypto.randomUUID()
        localStorage.setItem('umbra_device_id', deviceId)
        await authenticateDevice(deviceId)
      }
    } catch {
      // Offline — proceed without auth
    }

    this.scene.start('HubScene')
  }
}
