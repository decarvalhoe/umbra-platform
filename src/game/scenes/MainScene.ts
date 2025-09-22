import { Scene } from 'phaser'

export class MainScene extends Scene {
  constructor() {
    super({ key: 'MainScene' })
  }

  preload() {
    // TODO: Charger les assets du jeu
    console.log('🎮 Project Umbra - Chargement des assets...')
  }

  create() {
    // TODO: Créer la scène de jeu
    const centerX = this.cameras.main.worldView.x + this.cameras.main.width / 2
    const centerY = this.cameras.main.worldView.y + this.cameras.main.height / 2

    this.add.text(centerX, centerY, 'Project Umbra\nHack\'n\'slash RPG', {
      fontSize: '32px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5)

    console.log('🎮 Project Umbra - Scène principale créée')
  }

  update() {
    // TODO: Logique de mise à jour du jeu
  }
}
