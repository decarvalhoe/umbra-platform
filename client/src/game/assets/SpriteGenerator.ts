import Phaser from 'phaser'

// ---------------------------------------------------------------------------
// Sprite sheet generator — programmatic placeholder art
// ---------------------------------------------------------------------------

const PW = 32  // Player/enemy frame width
const PH = 48  // Player/enemy frame height
const BW = 64  // Boss frame width
const BH = 96  // Boss frame height

// ---------------------------------------------------------------------------
// Helper: draw onto a Graphics context then generate a spritesheet texture
// ---------------------------------------------------------------------------

function makeSheet(
  scene: Phaser.Scene,
  key: string,
  fw: number,
  fh: number,
  frames: ((g: Phaser.GameObjects.Graphics, x: number) => void)[]
): void {
  if (scene.textures.exists(key)) return
  const g = scene.add.graphics()
  frames.forEach((draw, i) => draw(g, i * fw))
  g.generateTexture(key, fw * frames.length, fh)
  g.destroy()
  // Register frame data
  const tex = scene.textures.get(key)
  for (let i = 0; i < frames.length; i++) {
    tex.add(i, 0, i * fw, 0, fw, fh)
  }
}

// ---------------------------------------------------------------------------
// Player drawing helpers
// ---------------------------------------------------------------------------

function drawPlayerBase(g: Phaser.GameObjects.Graphics, x: number, headY: number, bodyColor: number): void {
  // Legs
  g.fillStyle(0x224488, 1)
  g.fillRect(x + 10, 34 + headY, 5, 14)
  g.fillRect(x + 17, 34 + headY, 5, 14)
  // Body
  g.fillStyle(bodyColor, 1)
  g.fillRect(x + 8, 18 + headY, 16, 18)
  // Arms
  g.fillStyle(0x3366aa, 1)
  g.fillRect(x + 4, 20 + headY, 5, 12)
  g.fillRect(x + 23, 20 + headY, 5, 12)
  // Head
  g.fillStyle(0x88bbff, 1)
  g.fillCircle(x + 16, 12 + headY, 8)
  // Visor
  g.fillStyle(0xffffff, 1)
  g.fillRect(x + 11, 10 + headY, 10, 3)
}

// ---------------------------------------------------------------------------
// Enemy drawing helpers
// ---------------------------------------------------------------------------

function drawWraithBase(g: Phaser.GameObjects.Graphics, x: number, color: number, eyeColor: number, yOff: number): void {
  // Cloak / body — tall triangle shape
  g.fillStyle(color, 0.85)
  g.fillTriangle(x + 16, 6 + yOff, x + 2, 46 + yOff, x + 30, 46 + yOff)
  // Hood
  g.fillStyle(color, 1)
  g.fillCircle(x + 16, 14 + yOff, 10)
  // Eyes
  g.fillStyle(eyeColor, 1)
  g.fillCircle(x + 12, 12 + yOff, 2)
  g.fillCircle(x + 20, 12 + yOff, 2)
}

function drawSentinelBase(g: Phaser.GameObjects.Graphics, x: number, yOff: number): void {
  // Large blocky body
  g.fillStyle(0x222244, 1)
  g.fillRect(x + 4, 10 + yOff, 24, 30)
  // Shoulders
  g.fillStyle(0x333366, 1)
  g.fillRect(x + 1, 12 + yOff, 30, 8)
  // Head
  g.fillStyle(0x444488, 1)
  g.fillRect(x + 10, 2 + yOff, 12, 12)
  // Eye slit
  g.fillStyle(0x9370db, 1)
  g.fillRect(x + 12, 6 + yOff, 8, 2)
  // Legs
  g.fillStyle(0x222244, 1)
  g.fillRect(x + 8, 40 + yOff, 7, 8)
  g.fillRect(x + 17, 40 + yOff, 7, 8)
}

function drawImpBase(g: Phaser.GameObjects.Graphics, x: number, yOff: number): void {
  // Small round body
  g.fillStyle(0xff6600, 1)
  g.fillCircle(x + 16, 28 + yOff, 10)
  // Head
  g.fillStyle(0xff8800, 1)
  g.fillCircle(x + 16, 16 + yOff, 7)
  // Eyes
  g.fillStyle(0xffff00, 1)
  g.fillCircle(x + 13, 14 + yOff, 2)
  g.fillCircle(x + 19, 14 + yOff, 2)
  // Flame wisps
  g.fillStyle(0xffcc00, 0.6)
  g.fillTriangle(x + 8, 18 + yOff, x + 4, 10 + yOff, x + 12, 14 + yOff)
  g.fillTriangle(x + 24, 18 + yOff, x + 28, 10 + yOff, x + 20, 14 + yOff)
  // Legs
  g.fillStyle(0xcc4400, 1)
  g.fillRect(x + 11, 36 + yOff, 4, 8)
  g.fillRect(x + 17, 36 + yOff, 4, 8)
}


// ---------------------------------------------------------------------------
// Generate all sprite sheets
// ---------------------------------------------------------------------------

export function generateAllSprites(scene: Phaser.Scene): void {
  generatePlayerSheet(scene)
  generateEnemySheets(scene)
  generateBossSheet(scene)
  generateTileTextures(scene)
  generateUITextures(scene)
  registerAnimations(scene)
}

// ---------------------------------------------------------------------------
// Player sprite sheet: idle(4) + run(4) + attack(4) + dodge(2) + hurt(2) + dead(2) = 18 frames
// ---------------------------------------------------------------------------

function generatePlayerSheet(scene: Phaser.Scene): void {
  const frames: ((g: Phaser.GameObjects.Graphics, x: number) => void)[] = []

  // Idle 0-3: subtle breathing
  for (let i = 0; i < 4; i++) {
    const yOff = Math.round(Math.sin(i * Math.PI / 2) * 1)
    frames.push((g, x) => drawPlayerBase(g, x, yOff, 0x4488ff))
  }

  // Run 4-7: bobbing motion
  for (let i = 0; i < 4; i++) {
    const yOff = i % 2 === 0 ? -2 : 1
    frames.push((g, x) => {
      drawPlayerBase(g, x, yOff, 0x4488ff)
      // Motion lines
      g.lineStyle(1, 0x88bbff, 0.4)
      g.lineBetween(x + 2, 24 + yOff, x - 2, 28 + yOff)
    })
  }

  // Attack 8-11: sword swing phases
  frames.push((g, x) => {
    drawPlayerBase(g, x, 0, 0x5599ff)
    // Sword raised
    g.fillStyle(0xcccccc, 1)
    g.fillRect(x + 26, 6, 3, 16)
  })
  frames.push((g, x) => {
    drawPlayerBase(g, x, 0, 0x66aaff)
    // Sword mid-swing
    g.fillStyle(0xffffff, 1)
    g.fillRect(x + 28, 14, 4, 3)
    g.fillRect(x + 26, 16, 4, 3)
  })
  frames.push((g, x) => {
    drawPlayerBase(g, x, 0, 0x77bbff)
    // Sword low
    g.fillStyle(0xcccccc, 1)
    g.fillRect(x + 26, 24, 3, 16)
    // Slash arc
    g.lineStyle(2, 0xffffff, 0.7)
    g.arc(x + 24, 20, 14, -0.8, 0.8)
    g.strokePath()
  })
  frames.push((g, x) => {
    drawPlayerBase(g, x, 0, 0x4488ff)
    // Sword return
    g.fillStyle(0xaaaaaa, 1)
    g.fillRect(x + 24, 18, 3, 12)
  })

  // Dodge 12-13: dash blur
  for (let i = 0; i < 2; i++) {
    frames.push((g, x) => {
      // Ghost trail
      g.fillStyle(0x4488ff, 0.2)
      g.fillRect(x + 2, 6, 28, 40)
      g.fillStyle(0x88ccff, 0.5)
      drawPlayerBase(g, x, 0, 0x88ccff)
    })
  }

  // Hurt 14-15: red flash
  for (let i = 0; i < 2; i++) {
    const tint = i === 0 ? 0xff4444 : 0xcc6666
    frames.push((g, x) => drawPlayerBase(g, x, i * 2, tint))
  }

  // Dead 16-17: collapse
  frames.push((g, x) => {
    drawPlayerBase(g, x, 4, 0x444466)
  })
  frames.push((g, x) => {
    // Lying flat
    g.fillStyle(0x333355, 0.6)
    g.fillRect(x + 4, 34, 24, 10)
    g.fillStyle(0x88bbff, 0.4)
    g.fillCircle(x + 10, 36, 5)
  })

  makeSheet(scene, 'player_sheet', PW, PH, frames)
}

// ---------------------------------------------------------------------------
// Enemy sprite sheets
// ---------------------------------------------------------------------------

function generateEnemySheets(scene: Phaser.Scene): void {
  // Shadow Wraith: idle(2) + chase(2) + attack(2) + hurt(2) + dead(2) = 10
  makeSheet(scene, 'shadow_wraith_sheet', PW, PH, [
    (g, x) => drawWraithBase(g, x, 0x6622cc, 0xcc44ff, 0),
    (g, x) => drawWraithBase(g, x, 0x6622cc, 0xcc44ff, -1),
    (g, x) => drawWraithBase(g, x, 0x7733dd, 0xcc44ff, -2),
    (g, x) => drawWraithBase(g, x, 0x7733dd, 0xcc44ff, 1),
    (g, x) => {
      drawWraithBase(g, x, 0x8844ee, 0xff66ff, -1)
      // Lunge effect
      g.lineStyle(2, 0xcc44ff, 0.6)
      g.lineBetween(x + 16, 20, x + 30, 16)
    },
    (g, x) => {
      drawWraithBase(g, x, 0x8844ee, 0xff66ff, 0)
      g.lineStyle(2, 0xcc44ff, 0.4)
      g.lineBetween(x + 16, 18, x + 28, 22)
    },
    (g, x) => drawWraithBase(g, x, 0xffffff, 0xff4444, 2),
    (g, x) => drawWraithBase(g, x, 0xccaacc, 0xff4444, 1),
    (g, x) => {
      g.fillStyle(0x6622cc, 0.4)
      g.fillTriangle(x + 16, 16, x + 4, 46, x + 28, 46)
    },
    (g, x) => {
      g.fillStyle(0x6622cc, 0.15)
      g.fillCircle(x + 16, 38, 8)
    },
  ])

  // Blood Wraith
  makeSheet(scene, 'blood_wraith_sheet', PW, PH, [
    (g, x) => drawWraithBase(g, x, 0xcc0022, 0xff4444, 0),
    (g, x) => drawWraithBase(g, x, 0xcc0022, 0xff4444, -1),
    (g, x) => drawWraithBase(g, x, 0xdd1133, 0xff4444, -2),
    (g, x) => drawWraithBase(g, x, 0xdd1133, 0xff4444, 1),
    (g, x) => {
      drawWraithBase(g, x, 0xee2244, 0xff6666, -1)
      g.fillStyle(0xff0000, 0.5)
      g.fillCircle(x + 24, 28, 3)
    },
    (g, x) => drawWraithBase(g, x, 0xee2244, 0xff6666, 0),
    (g, x) => drawWraithBase(g, x, 0xffffff, 0xff4444, 2),
    (g, x) => drawWraithBase(g, x, 0xccaaaa, 0xff4444, 1),
    (g, x) => {
      g.fillStyle(0xcc0022, 0.4)
      g.fillTriangle(x + 16, 16, x + 4, 46, x + 28, 46)
    },
    (g, x) => {
      g.fillStyle(0xcc0022, 0.15)
      g.fillCircle(x + 16, 38, 8)
    },
  ])

  // Fire Imp
  makeSheet(scene, 'fire_imp_sheet', PW, PH, [
    (g, x) => drawImpBase(g, x, 0),
    (g, x) => drawImpBase(g, x, -1),
    (g, x) => drawImpBase(g, x, -2),
    (g, x) => drawImpBase(g, x, 1),
    (g, x) => {
      drawImpBase(g, x, -1)
      g.fillStyle(0xff4400, 0.6)
      g.fillCircle(x + 26, 24, 5)
    },
    (g, x) => drawImpBase(g, x, 0),
    (g, x) => {
      g.fillStyle(0xff8800, 0.8)
      drawImpBase(g, x, 2)
    },
    (g, x) => {
      g.fillStyle(0xff6600, 0.5)
      drawImpBase(g, x, 1)
    },
    (g, x) => {
      g.fillStyle(0xff6600, 0.3)
      g.fillCircle(x + 16, 28, 8)
    },
    (g, x) => {
      g.fillStyle(0xff6600, 0.1)
      g.fillCircle(x + 16, 32, 5)
    },
  ])

  // Void Sentinel
  makeSheet(scene, 'void_sentinel_sheet', PW, PH, [
    (g, x) => drawSentinelBase(g, x, 0),
    (g, x) => drawSentinelBase(g, x, -1),
    (g, x) => drawSentinelBase(g, x, -1),
    (g, x) => drawSentinelBase(g, x, 1),
    (g, x) => {
      drawSentinelBase(g, x, 0)
      g.fillStyle(0x9370db, 0.5)
      g.fillCircle(x + 28, 20, 6)
    },
    (g, x) => drawSentinelBase(g, x, 0),
    (g, x) => {
      g.fillStyle(0xffffff, 0.8)
      drawSentinelBase(g, x, 2)
    },
    (g, x) => drawSentinelBase(g, x, 1),
    (g, x) => {
      g.fillStyle(0x222244, 0.5)
      g.fillRect(x + 4, 14, 24, 28)
    },
    (g, x) => {
      g.fillStyle(0x222244, 0.2)
      g.fillRect(x + 6, 20, 20, 20)
    },
  ])
}

// ---------------------------------------------------------------------------
// Boss sprite sheet: idle(2) + attack(2) + phase2_idle(2) + telegraph(2) + hurt(2) + dead(2) = 12
// ---------------------------------------------------------------------------

function generateBossSheet(scene: Phaser.Scene): void {
  const frames: ((g: Phaser.GameObjects.Graphics, x: number) => void)[] = []

  function drawBossBase(g: Phaser.GameObjects.Graphics, x: number, bodyColor: number, eyeColor: number, yOff: number): void {
    // Legs
    g.fillStyle(0x553300, 1)
    g.fillRect(x + 18, 72 + yOff, 10, 20)
    g.fillRect(x + 36, 72 + yOff, 10, 20)
    // Body — large armored torso
    g.fillStyle(bodyColor, 1)
    g.fillRect(x + 12, 30 + yOff, 40, 44)
    // Shoulder plates
    g.fillStyle(0x886622, 1)
    g.fillRect(x + 6, 32 + yOff, 12, 16)
    g.fillRect(x + 46, 32 + yOff, 12, 16)
    // Head
    g.fillStyle(0x664400, 1)
    g.fillRect(x + 20, 10 + yOff, 24, 24)
    // Eyes
    g.fillStyle(eyeColor, 1)
    g.fillCircle(x + 28, 20 + yOff, 4)
    g.fillCircle(x + 40, 20 + yOff, 4)
    // Crown/horns
    g.fillStyle(0x886622, 1)
    g.fillTriangle(x + 20, 12 + yOff, x + 16, 2 + yOff, x + 24, 8 + yOff)
    g.fillTriangle(x + 44, 12 + yOff, x + 48, 2 + yOff, x + 40, 8 + yOff)
  }

  // Phase 1 idle 0-1
  frames.push((g, x) => drawBossBase(g, x, 0xff4400, 0xffcc00, 0))
  frames.push((g, x) => drawBossBase(g, x, 0xff4400, 0xffcc00, -1))

  // Phase 1 attack 2-3
  frames.push((g, x) => {
    drawBossBase(g, x, 0xff6600, 0xff0000, -2)
    g.fillStyle(0xff0000, 0.4)
    g.fillCircle(x + 32, 50, 20)
  })
  frames.push((g, x) => {
    drawBossBase(g, x, 0xff5500, 0xff2200, 0)
    g.lineStyle(3, 0xff4400, 0.6)
    g.strokeCircle(x + 32, 50, 30)
  })

  // Phase 2 idle 4-5 (cracked, red glow)
  frames.push((g, x) => {
    drawBossBase(g, x, 0xcc2200, 0xff0000, 0)
    g.lineStyle(1, 0xff0000, 0.5)
    g.lineBetween(x + 20, 40, x + 30, 60)
    g.lineBetween(x + 35, 35, x + 42, 55)
  })
  frames.push((g, x) => {
    drawBossBase(g, x, 0xcc2200, 0xff0000, -1)
    g.lineStyle(1, 0xff0000, 0.5)
    g.lineBetween(x + 22, 42, x + 32, 58)
  })

  // Telegraph 6-7
  frames.push((g, x) => {
    drawBossBase(g, x, 0xff8800, 0xffff00, -1)
    g.lineStyle(2, 0xffcc00, 0.5)
    g.strokeCircle(x + 32, 48, 24)
  })
  frames.push((g, x) => {
    drawBossBase(g, x, 0xff8800, 0xffff00, 0)
    g.lineStyle(2, 0xffcc00, 0.3)
    g.strokeCircle(x + 32, 48, 28)
  })

  // Hurt 8-9
  frames.push((g, x) => drawBossBase(g, x, 0xffffff, 0xff4444, 2))
  frames.push((g, x) => drawBossBase(g, x, 0xcccccc, 0xff4444, 1))

  // Dead 10-11
  frames.push((g, x) => {
    drawBossBase(g, x, 0x444444, 0x222222, 4)
  })
  frames.push((g, x) => {
    g.fillStyle(0x333333, 0.5)
    g.fillRect(x + 10, 60, 44, 20)
    g.fillStyle(0x664400, 0.3)
    g.fillRect(x + 18, 64, 28, 12)
  })

  makeSheet(scene, 'boss_sheet', BW, BH, frames)
}

// ---------------------------------------------------------------------------
// Tile textures for dungeon
// ---------------------------------------------------------------------------

function generateTileTextures(scene: Phaser.Scene): void {
  const tileSize = 32

  // Floor tile
  if (!scene.textures.exists('tile_floor')) {
    const g = scene.add.graphics()
    g.fillStyle(0x2a2a3e, 1)
    g.fillRect(0, 0, tileSize, tileSize)
    g.lineStyle(1, 0x333355, 0.3)
    g.strokeRect(0, 0, tileSize, tileSize)
    // Subtle stone pattern
    g.fillStyle(0x252538, 1)
    g.fillRect(4, 4, 10, 10)
    g.fillRect(18, 18, 10, 10)
    g.generateTexture('tile_floor', tileSize, tileSize)
    g.destroy()
  }

  // Wall tile
  if (!scene.textures.exists('tile_wall')) {
    const g = scene.add.graphics()
    g.fillStyle(0x1a1a2e, 1)
    g.fillRect(0, 0, tileSize, tileSize)
    g.fillStyle(0x222240, 1)
    g.fillRect(2, 2, tileSize - 4, tileSize - 4)
    g.lineStyle(2, 0x4444aa, 0.5)
    g.strokeRect(1, 1, tileSize - 2, tileSize - 2)
    g.generateTexture('tile_wall', tileSize, tileSize)
    g.destroy()
  }

  // Door tile
  if (!scene.textures.exists('tile_door')) {
    const g = scene.add.graphics()
    g.fillStyle(0x2a2a3e, 1)
    g.fillRect(0, 0, tileSize, tileSize)
    g.fillStyle(0x664422, 1)
    g.fillRect(6, 2, 20, 28)
    g.fillStyle(0xffd700, 1)
    g.fillCircle(22, 16, 2)
    g.generateTexture('tile_door', tileSize, tileSize)
    g.destroy()
  }
}

// ---------------------------------------------------------------------------
// UI textures
// ---------------------------------------------------------------------------

function generateUITextures(scene: Phaser.Scene): void {
  // Health bar frame
  if (!scene.textures.exists('ui_healthbar_frame')) {
    const g = scene.add.graphics()
    g.lineStyle(2, 0x888888, 1)
    g.strokeRoundedRect(0, 0, 224, 22, 4)
    g.fillStyle(0x111111, 0.8)
    g.fillRoundedRect(1, 1, 222, 20, 3)
    g.generateTexture('ui_healthbar_frame', 224, 22)
    g.destroy()
  }

  // Rune card frame (for selection overlay)
  if (!scene.textures.exists('ui_rune_card')) {
    const g = scene.add.graphics()
    g.fillStyle(0x1a1a2e, 0.95)
    g.fillRoundedRect(0, 0, 160, 200, 8)
    g.lineStyle(2, 0x4488ff, 0.8)
    g.strokeRoundedRect(0, 0, 160, 200, 8)
    g.generateTexture('ui_rune_card', 160, 200)
    g.destroy()
  }

  // Button texture
  if (!scene.textures.exists('ui_button')) {
    const g = scene.add.graphics()
    g.fillStyle(0x333355, 1)
    g.fillRoundedRect(0, 0, 120, 36, 6)
    g.lineStyle(1, 0x6644cc, 0.8)
    g.strokeRoundedRect(0, 0, 120, 36, 6)
    g.generateTexture('ui_button', 120, 36)
    g.destroy()
  }
}

// ---------------------------------------------------------------------------
// Animation registration
// ---------------------------------------------------------------------------

function registerAnimations(scene: Phaser.Scene): void {
  if (scene.anims.exists('player-idle')) return

  // Player animations
  const pa = (key: string, start: number, end: number, rate: number, repeat: number) => {
    const frames: Phaser.Types.Animations.AnimationFrame[] = []
    for (let i = start; i <= end; i++) {
      frames.push({ key: 'player_sheet', frame: i })
    }
    scene.anims.create({ key, frames, frameRate: rate, repeat })
  }

  pa('player-idle', 0, 3, 4, -1)
  pa('player-run', 4, 7, 8, -1)
  pa('player-attack-1', 8, 9, 10, 0)
  pa('player-attack-2', 9, 10, 10, 0)
  pa('player-attack-3', 10, 11, 10, 0)
  pa('player-attack-4', 8, 11, 12, 0)
  pa('player-dodge', 12, 13, 8, 0)
  pa('player-hurt', 14, 15, 6, 0)
  pa('player-dead', 16, 17, 4, 0)

  // Enemy animations (same frame layout for all: idle 0-1, chase 2-3, attack 4-5, hurt 6-7, dead 8-9)
  const enemySheets = ['shadow_wraith_sheet', 'blood_wraith_sheet', 'fire_imp_sheet', 'void_sentinel_sheet']
  const enemyPrefixes = ['shadow_wraith', 'blood_wraith', 'fire_imp', 'void_sentinel']

  for (let e = 0; e < enemySheets.length; e++) {
    const sheet = enemySheets[e]
    const prefix = enemyPrefixes[e]
    const ea = (key: string, start: number, end: number, rate: number, repeat: number) => {
      const frames: Phaser.Types.Animations.AnimationFrame[] = []
      for (let i = start; i <= end; i++) {
        frames.push({ key: sheet, frame: i })
      }
      scene.anims.create({ key: `${prefix}-${key}`, frames, frameRate: rate, repeat })
    }
    ea('idle', 0, 1, 3, -1)
    ea('chase', 2, 3, 6, -1)
    ea('attack', 4, 5, 6, 0)
    ea('hurt', 6, 7, 6, 0)
    ea('dead', 8, 9, 4, 0)
  }

  // Boss animations (idle 0-1, attack 2-3, phase2 4-5, telegraph 6-7, hurt 8-9, dead 10-11)
  const ba = (key: string, start: number, end: number, rate: number, repeat: number) => {
    const frames: Phaser.Types.Animations.AnimationFrame[] = []
    for (let i = start; i <= end; i++) {
      frames.push({ key: 'boss_sheet', frame: i })
    }
    scene.anims.create({ key: `boss-${key}`, frames, frameRate: rate, repeat })
  }

  ba('idle', 0, 1, 3, -1)
  ba('attack', 2, 3, 6, 0)
  ba('phase2-idle', 4, 5, 3, -1)
  ba('telegraph', 6, 7, 4, 0)
  ba('hurt', 8, 9, 6, 0)
  ba('dead', 10, 11, 3, 0)
}
