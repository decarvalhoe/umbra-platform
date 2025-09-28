import Phaser from 'phaser'

const heroAsset = new URL('../assets/hero.svg', import.meta.url).href
const crystalAsset = new URL('../assets/crystal.svg', import.meta.url).href

export class MainScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys

  private crystals!: Phaser.Physics.Arcade.Group

  private scoreText!: Phaser.GameObjects.Text

  private score = 0

  private lastFacingAngle = 0

  constructor() {
    super({ key: 'MainScene' })
  }

  preload() {
    this.load.svg('hero', heroAsset, { scale: 2 })
    this.load.svg('crystal', crystalAsset, { scale: 1.5 })

    console.log('🎮 Project Umbra - Chargement des assets...')
  }

  create() {
    const { width, height } = this.scale

    this.add
      .text(width / 2, 72, 'Project Umbra', {
        fontSize: '40px',
        fontStyle: 'bold',
        color: '#f5f6fa'
      })
      .setOrigin(0.5)

    this.add
      .text(width / 2, 122, 'Collectez l\'énergie des cristaux', {
        fontSize: '20px',
        color: '#bdc3c7'
      })
      .setOrigin(0.5)

    this.player = this.physics.add.sprite(width / 2, height / 2, 'hero')
    this.player.setCollideWorldBounds(true)
    this.player.setDamping(true)
    this.player.setDrag(320)
    this.player.setMaxVelocity(240)

    const cursors = this.input.keyboard?.createCursorKeys()

    if (!cursors) {
      throw new Error('Le clavier n\'est pas disponible dans cette scène')
    }

    this.cursors = cursors

    this.crystals = this.physics.add.group({
      allowGravity: false
    })

    for (let i = 0; i < 5; i += 1) {
      this.spawnCrystal()
    }

    this.physics.add.overlap(
      this.player,
      this.crystals,
      this.collectCrystal,
      undefined,
      this
    )

    this.scoreText = this.add.text(24, 24, 'Énergie : 0', {
      fontSize: '22px',
      color: '#f5f6fa'
    })

    console.log('🎮 Project Umbra - Scène principale créée')
  }

  update() {
    if (!this.player || !this.cursors) {
      return
    }

    const body = this.player.body as Phaser.Physics.Arcade.Body
    const speed = 240

    body.setVelocity(0)

    if (this.cursors.left?.isDown) {
      body.setVelocityX(-speed)
    } else if (this.cursors.right?.isDown) {
      body.setVelocityX(speed)
    }

    if (this.cursors.up?.isDown) {
      body.setVelocityY(-speed)
    } else if (this.cursors.down?.isDown) {
      body.setVelocityY(speed)
    }

    if (body.velocity.lengthSq() > 0) {
      body.velocity.normalize().scale(speed)
      this.lastFacingAngle = Math.atan2(body.velocity.y, body.velocity.x)
    }

    this.player.setRotation(this.lastFacingAngle)
  }

  private spawnCrystal() {
    const { width, height } = this.scale
    const x = Phaser.Math.Between(64, width - 64)
    const y = Phaser.Math.Between(160, height - 64)

    const crystal = this.crystals.create(x, y, 'crystal') as Phaser.Physics.Arcade.Sprite
    crystal.setCircle(crystal.displayWidth / 2)
    crystal.setImmovable(true)

    return crystal
  }

  private collectCrystal: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (
    _player,
    crystal
  ) => {
    if (!('body' in crystal)) {
      return
    }

    const crystalSprite = crystal as Phaser.Physics.Arcade.Sprite
    crystalSprite.disableBody(true, true)

    this.score += 10
    this.scoreText.setText(`Énergie : ${this.score}`)

    this.time.delayedCall(1200, () => {
      this.respawnCrystal(crystalSprite)
    })
  }

  private respawnCrystal(crystal: Phaser.Physics.Arcade.Sprite) {
    const { width, height } = this.scale
    const x = Phaser.Math.Between(64, width - 64)
    const y = Phaser.Math.Between(160, height - 64)

    crystal.enableBody(true, x, y, true, true)
    crystal.setCircle(crystal.displayWidth / 2)
    crystal.setImmovable(true)
  }
}
