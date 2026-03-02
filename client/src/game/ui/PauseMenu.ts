import Phaser from 'phaser'

// ---------------------------------------------------------------------------
// PauseMenu — reusable overlay for CombatScene and DungeonScene
// ---------------------------------------------------------------------------

export interface PauseMenuConfig {
  /** Scene that owns this pause menu. */
  scene: Phaser.Scene
  /** Callback when "Resume" is selected. */
  onResume: () => void
  /** Callback when "Abandon Run" is confirmed. */
  onAbandon: () => void
  /** Callback when "Quit to Hub" is confirmed. */
  onQuit: () => void
  /** Optional run stats to display. */
  runStats?: {
    floor?: number
    roomsCleared?: number
    runesCollected?: number
    kills?: number
    xpEarned?: number
  }
}

export class PauseMenu {
  private scene: Phaser.Scene
  private config: PauseMenuConfig
  private group!: Phaser.GameObjects.Group
  private isOpen = false
  private escKey!: Phaser.Input.Keyboard.Key
  private showingSettings = false
  private showingConfirm = false

  // Settings state (shared with AudioManager)
  private masterVolume = 70
  private musicVolume = 40
  private sfxVolume = 70
  private isFullscreen = false

  constructor(config: PauseMenuConfig) {
    this.scene = config.scene
    this.config = config
    this.group = this.scene.add.group()

    const keyboard = this.scene.input.keyboard
    if (keyboard) {
      this.escKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
    }
  }

  /** Call in scene update() to check for ESC key. */
  update(): void {
    if (this.escKey && Phaser.Input.Keyboard.JustDown(this.escKey)) {
      if (this.showingSettings) {
        this.showingSettings = false
        this.showMainMenu()
      } else if (this.showingConfirm) {
        this.showingConfirm = false
        this.showMainMenu()
      } else if (this.isOpen) {
        this.close()
      } else {
        this.open()
      }
    }
  }

  get paused(): boolean {
    return this.isOpen
  }

  // -------------------------------------------------------------------------
  // Open / Close
  // -------------------------------------------------------------------------

  open(): void {
    if (this.isOpen) return
    this.isOpen = true
    this.scene.physics?.pause()
    this.showMainMenu()
  }

  close(): void {
    if (!this.isOpen) return
    this.isOpen = false
    this.showingSettings = false
    this.showingConfirm = false
    this.clearGroup()
    this.scene.physics?.resume()
    this.config.onResume()
  }

  private clearGroup(): void {
    this.group.clear(true, true)
  }

  // -------------------------------------------------------------------------
  // Main menu
  // -------------------------------------------------------------------------

  private showMainMenu(): void {
    this.clearGroup()
    this.showingSettings = false
    this.showingConfirm = false

    const { width, height } = this.scene.scale

    // Backdrop
    const bg = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.75)
      .setInteractive().setDepth(300)
    this.group.add(bg)

    // Title
    this.group.add(this.scene.add.text(width / 2, 160, 'PAUSED', {
      fontSize: '36px', color: '#c8a2c8', fontStyle: 'bold', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(301))

    // Run stats (if provided)
    const stats = this.config.runStats
    if (stats) {
      const parts: string[] = []
      if (stats.floor !== undefined) parts.push(`Floor: ${stats.floor}`)
      if (stats.roomsCleared !== undefined) parts.push(`Rooms: ${stats.roomsCleared}`)
      if (stats.runesCollected !== undefined) parts.push(`Runes: ${stats.runesCollected}`)
      if (stats.kills !== undefined) parts.push(`Kills: ${stats.kills}`)
      if (stats.xpEarned !== undefined) parts.push(`XP: ${stats.xpEarned}`)
      if (parts.length > 0) {
        this.group.add(this.scene.add.text(width / 2, 210, parts.join('  |  '), {
          fontSize: '14px', color: '#aaa', fontFamily: 'monospace',
        }).setOrigin(0.5).setDepth(301))
      }
    }

    // Buttons
    const btnY = stats ? 270 : 250
    this.addMenuButton(width / 2, btnY, 'Resume', () => this.close())
    this.addMenuButton(width / 2, btnY + 55, 'Settings', () => this.showSettings())
    this.addMenuButton(width / 2, btnY + 110, 'Abandon Run', () => this.showConfirm('Abandon this run?', this.config.onAbandon))
    this.addMenuButton(width / 2, btnY + 165, 'Quit to Hub', () => this.showConfirm('Return to hub?', this.config.onQuit))
  }

  private addMenuButton(x: number, y: number, label: string, onClick: () => void): void {
    const bg = this.scene.add.rectangle(x, y, 240, 40, 0x333355, 0.9)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => bg.setFillStyle(0x444477, 1))
      .on('pointerout', () => bg.setFillStyle(0x333355, 0.9))
      .on('pointerdown', onClick)
      .setDepth(301)
    this.group.add(bg)

    this.group.add(this.scene.add.text(x, y, label, {
      fontSize: '16px', color: '#fff', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(302))
  }

  // -------------------------------------------------------------------------
  // Settings panel
  // -------------------------------------------------------------------------

  private showSettings(): void {
    this.clearGroup()
    this.showingSettings = true

    const { width, height } = this.scene.scale

    // Backdrop
    const bg = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.75)
      .setInteractive().setDepth(300)
    this.group.add(bg)

    this.group.add(this.scene.add.text(width / 2, 160, 'SETTINGS', {
      fontSize: '30px', color: '#c8a2c8', fontStyle: 'bold', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(301))

    // Volume sliders
    this.addSlider(width / 2, 240, 'Master Volume', this.masterVolume, (v) => { this.masterVolume = v })
    this.addSlider(width / 2, 310, 'Music Volume', this.musicVolume, (v) => { this.musicVolume = v })
    this.addSlider(width / 2, 380, 'SFX Volume', this.sfxVolume, (v) => { this.sfxVolume = v })

    // Fullscreen toggle
    const fsLabel = this.isFullscreen ? 'Fullscreen: ON' : 'Fullscreen: OFF'
    const fsBtn = this.scene.add.text(width / 2, 440, fsLabel, {
      fontSize: '16px', color: '#aaa', fontFamily: 'monospace',
      backgroundColor: '#333', padding: { x: 16, y: 8 },
    }).setOrigin(0.5).setDepth(301)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.isFullscreen = !this.isFullscreen
        if (this.isFullscreen) {
          this.scene.scale.startFullscreen()
        } else {
          this.scene.scale.stopFullscreen()
        }
        fsBtn.setText(this.isFullscreen ? 'Fullscreen: ON' : 'Fullscreen: OFF')
      })
    this.group.add(fsBtn)

    // Back button
    this.addMenuButton(width / 2, 510, 'Back', () => this.showMainMenu())
  }

  private addSlider(x: number, y: number, label: string, value: number, onChange: (v: number) => void): void {
    const sliderWidth = 200
    const sliderX = x - sliderWidth / 2

    // Label
    this.group.add(this.scene.add.text(x, y - 20, `${label}: ${value}%`, {
      fontSize: '14px', color: '#ccc', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(301))

    // Track
    const track = this.scene.add.rectangle(x, y + 5, sliderWidth, 8, 0x333333, 1)
      .setDepth(301)
    this.group.add(track)

    // Fill
    const fill = this.scene.add.rectangle(sliderX + (value / 100) * sliderWidth / 2, y + 5,
      (value / 100) * sliderWidth, 8, 0x6644cc, 1)
      .setOrigin(0, 0.5).setDepth(301)
    fill.x = sliderX
    fill.displayWidth = (value / 100) * sliderWidth
    this.group.add(fill)

    // Knob
    const knobX = sliderX + (value / 100) * sliderWidth
    const knob = this.scene.add.circle(knobX, y + 5, 10, 0x9370db, 1)
      .setInteractive({ useHandCursor: true, draggable: true })
      .setDepth(302)
    this.group.add(knob)

    // Drag behavior
    this.scene.input.setDraggable(knob)
    knob.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number) => {
      const clamped = Phaser.Math.Clamp(dragX, sliderX, sliderX + sliderWidth)
      knob.x = clamped
      const pct = Math.round(((clamped - sliderX) / sliderWidth) * 100)
      fill.displayWidth = (pct / 100) * sliderWidth
      onChange(pct)
    })
  }

  // -------------------------------------------------------------------------
  // Confirm dialog
  // -------------------------------------------------------------------------

  private showConfirm(message: string, onConfirm: () => void): void {
    this.clearGroup()
    this.showingConfirm = true

    const { width, height } = this.scene.scale

    const bg = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85)
      .setInteractive().setDepth(300)
    this.group.add(bg)

    this.group.add(this.scene.add.text(width / 2, height / 2 - 60, message, {
      fontSize: '24px', color: '#ff8888', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(301))

    this.addMenuButton(width / 2 - 80, height / 2 + 20, 'Confirm', () => {
      this.close()
      onConfirm()
    })
    this.addMenuButton(width / 2 + 80, height / 2 + 20, 'Cancel', () => this.showMainMenu())
  }

  /** Clean up when the scene shuts down. */
  destroy(): void {
    this.clearGroup()
  }
}
