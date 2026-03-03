import Phaser from 'phaser'
import { PauseMenu } from '../ui/PauseMenu'
import { audioManager } from '../audio/AudioManager'
import { Player } from '../entities/player/Player'
import { Enemy } from '../entities/enemies/Enemy'
import { shadowWraithConfig } from '../entities/enemies/EnemyConfig'
import type { EnemyConfig } from '../entities/enemies/EnemyConfig'
import { CorruptedGuardian } from '../entities/bosses/CorruptedGuardian'
import { GroundSlam } from '../entities/bosses/attacks/GroundSlam'
import { ShadowBolt } from '../entities/bosses/attacks/ShadowBolt'
import { CorruptionWave } from '../entities/bosses/attacks/CorruptionWave'
import type { BossAttackConfig } from '../entities/bosses/BossConfig'

// ---------------------------------------------------------------------------
// Wave configuration
// ---------------------------------------------------------------------------

/** Enemy spawn descriptor within a wave. */
interface WaveEnemySpawn {
  config: EnemyConfig
  count: number
}

/** A single wave definition. */
interface WaveDefinition {
  enemies: WaveEnemySpawn[]
  /** If true, the boss spawns instead of regular enemies. */
  isBossWave: boolean
}

/** Blood element wraith -- faster, less HP, bleeds on hit. */
const bloodWraithConfig: EnemyConfig = {
  name: 'Blood Wraith',
  detectionRange: 350,
  attackRange: 70,
  chaseSpeed: 150,
  telegraphDuration: 400,
  attackDamage: 20,
  hp: 80,
  defense: 5,
  xpReward: 12,
  element: 'blood',
}

/** Void Sentinel -- tanky, slow, high damage. */
const voidSentinelConfig: EnemyConfig = {
  name: 'Void Sentinel',
  detectionRange: 250,
  attackRange: 90,
  chaseSpeed: 80,
  telegraphDuration: 700,
  attackDamage: 35,
  hp: 200,
  defense: 20,
  xpReward: 25,
  element: 'void',
}

/** Fire Imp -- fast, fragile, ranged-feeling. */
const fireImpConfig: EnemyConfig = {
  name: 'Fire Imp',
  detectionRange: 400,
  attackRange: 100,
  chaseSpeed: 160,
  telegraphDuration: 350,
  attackDamage: 15,
  hp: 60,
  defense: 3,
  xpReward: 10,
  element: 'fire',
}

/** Wave definitions -- 5 waves culminating in a boss fight. */
const WAVE_DEFINITIONS: WaveDefinition[] = [
  {
    enemies: [{ config: shadowWraithConfig, count: 3 }],
    isBossWave: false,
  },
  {
    enemies: [
      { config: shadowWraithConfig, count: 2 },
      { config: bloodWraithConfig, count: 2 },
    ],
    isBossWave: false,
  },
  {
    enemies: [
      { config: fireImpConfig, count: 3 },
      { config: voidSentinelConfig, count: 1 },
    ],
    isBossWave: false,
  },
  {
    enemies: [
      { config: bloodWraithConfig, count: 2 },
      { config: voidSentinelConfig, count: 2 },
      { config: shadowWraithConfig, count: 1 },
    ],
    isBossWave: false,
  },
  {
    enemies: [],
    isBossWave: true,
  },
]

// ---------------------------------------------------------------------------
// HUD layout constants
// ---------------------------------------------------------------------------

const HUD_MARGIN = 16
const HEALTH_BAR_WIDTH = 220
const HEALTH_BAR_HEIGHT = 18
const BOSS_BAR_WIDTH = 400
const BOSS_BAR_HEIGHT = 22
const COMBO_DISPLAY_X = 16
const COMBO_DISPLAY_Y = 80
const SKILL_COOLDOWN_Y = 110

// ---------------------------------------------------------------------------
// Skill definitions
// ---------------------------------------------------------------------------

interface SkillDefinition {
  id: string
  name: string
  key: number
  cooldownMs: number
  damage: number
  range: number
  description: string
}

const SKILLS: SkillDefinition[] = [
  {
    id: 'flame_burst',
    name: 'Flame Burst',
    key: Phaser.Input.Keyboard.KeyCodes.ONE,
    cooldownMs: 5000,
    damage: 40,
    range: 150,
    description: 'AoE fire burst',
  },
  {
    id: 'shadow_strike',
    name: 'Shadow Strike',
    key: Phaser.Input.Keyboard.KeyCodes.TWO,
    cooldownMs: 8000,
    damage: 60,
    range: 120,
    description: 'High-damage shadow slash',
  },
  {
    id: 'void_shield',
    name: 'Void Shield',
    key: Phaser.Input.Keyboard.KeyCodes.THREE,
    cooldownMs: 15000,
    damage: 0,
    range: 0,
    description: '3s invulnerability',
  },
]


// ---------------------------------------------------------------------------
// Rune buff system
// ---------------------------------------------------------------------------

interface RuneBuff {
  stat: string
  value: number
  type: string // 'flat' | 'percent'
}

/** Resolves cumulative stat bonuses from active rune buffs. */
class RuneBuffResolver {
  private buffs: RuneBuff[]

  constructor(buffs: RuneBuff[]) {
    this.buffs = buffs
  }

  /** Get flat bonus for a stat. */
  getFlat(stat: string): number {
    return this.buffs
      .filter(b => b.stat === stat && b.type === 'flat')
      .reduce((sum, b) => sum + b.value, 0)
  }

  /** Get percent bonus for a stat (returns multiplier, e.g. 1.25 for +25%). */
  getMultiplier(stat: string): number {
    const pct = this.buffs
      .filter(b => b.stat === stat && b.type === 'percent')
      .reduce((sum, b) => sum + b.value, 0)
    return 1 + pct / 100
  }

  /** Combined: (base + flat) * percentMultiplier */
  apply(stat: string, base: number): number {
    return (base + this.getFlat(stat)) * this.getMultiplier(stat)
  }

  /** Check if any buff exists for a stat. */
  has(stat: string): boolean {
    return this.buffs.some(b => b.stat === stat)
  }
}

/**
 * CombatScene -- the core playable combat loop.
 *
 * This scene implements:
 *   1. Arena setup with world bounds
 *   2. Player controls (arrow keys movement, Z attack, X dodge, number keys skills)
 *   3. Combat loop: player attacks enemies, enemies attack back via FSM AI,
 *      elemental effects apply, dodge grants i-frames
 *   4. In-scene HUD: health bars, combo counter, skill cooldowns, wave info
 *   5. Wave system: kill all enemies to advance, final wave = boss fight
 *   6. Win/lose conditions: death -> restart prompt, boss defeated -> victory
 *
 * The scene wires together the existing Player, Enemy, and CorruptedGuardian
 * entities without modifying their internal behavior. All scene-level concerns
 * (collision, spawning, HUD, wave management) live here.
 */
export class CombatScene extends Phaser.Scene {
  // Dungeon context (set when entering from DungeonScene)
  private fromDungeon = false
  private runeBuffs: RuneBuffResolver = new RuneBuffResolver([])

  private dungeonContext: { floor: number; roomType: string; corruption: number; nodeId: number; runeBuffs: { stat: string; value: number; type: string }[] } | null = null

  // Entities
  private player!: Player
  private enemies!: Phaser.Physics.Arcade.Group
  private boss: CorruptedGuardian | null = null

  // Boss attack visuals
  private activeBossAttacks: (GroundSlam | ShadowBolt | CorruptionWave)[] = []

  // Wave system
  private currentWave = 0
  private waveActive = false
  private enemiesAliveInWave = 0
  private waveTransitionTimer = 0
  private isWaveTransitioning = false

  // Combat state
  private totalXp = 0
  private totalKills = 0
  private isGameOver = false
  private isVictory = false

  // Skill cooldowns (skill.id -> remaining ms)
  private skillCooldowns: Map<string, number> = new Map()
  private skillKeys: Map<string, Phaser.Input.Keyboard.Key> = new Map()

  // HUD elements
  private hudGraphics!: Phaser.GameObjects.Graphics
  private healthText!: Phaser.GameObjects.Text
  private comboText!: Phaser.GameObjects.Text
  private waveText!: Phaser.GameObjects.Text
  private skillTexts: Map<string, Phaser.GameObjects.Text> = new Map()
  private bossNameText: Phaser.GameObjects.Text | null = null
  private bossHealthText: Phaser.GameObjects.Text | null = null
  private gameOverText: Phaser.GameObjects.Text | null = null
  private restartText: Phaser.GameObjects.Text | null = null
  private xpText!: Phaser.GameObjects.Text
  private runeBuffText!: Phaser.GameObjects.Text

  // Pause menu
  private pauseMenu!: PauseMenu

  // Arena
  private arenaGraphics!: Phaser.GameObjects.Graphics

  constructor() {
    super({ key: 'CombatScene' })
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  init(data: Record<string, unknown>): void {
    this.fromDungeon = !!data.fromDungeon
    this.dungeonContext = (data.dungeonContext as typeof this.dungeonContext) ?? null
    this.runeBuffs = new RuneBuffResolver(
      (this.dungeonContext?.runeBuffs as RuneBuff[]) ?? []
    )
  }

  create(): void {
    this.resetState()
    this.createArena()
    this.createPlayer()
    this.applyRuneBuffsToPlayer()
    this.createEnemyGroup()
    this.createHUD()
    this.registerSkillKeys()
    this.registerEventListeners()

    // Pause menu
    this.pauseMenu = new PauseMenu({
      scene: this,
      onResume: () => { /* physics resumed by PauseMenu */ },
      onAbandon: () => {
        const cendresEarned = this.totalKills * 5
        this.scene.start('HubScene', { xpEarned: this.totalXp, cendresEarned })
      },
      onQuit: () => {
        this.scene.start('HubScene')
      },
      runStats: {
        kills: this.totalKills,
        xpEarned: this.totalXp,
      },
    })

    this.startWave(0)

    // Start combat music
    audioManager.crossFadeTo('combat')
  }

  update(time: number, delta: number): void {
    this.pauseMenu.update()
    if (this.pauseMenu.paused) return

    if (this.isGameOver || this.isVictory) {
      this.handleEndScreenInput()
      return
    }

    // Update player
    this.player.update(time, delta)

    // Update enemies
    this.enemies.getChildren().forEach((child) => {
      const enemy = child as Enemy
      if (enemy.active) {
        enemy.update(time, delta)
      }
    })

    // Update boss
    if (this.boss && this.boss.active) {
      this.boss.update(time, delta)
    }

    // Update boss attack visuals
    this.updateBossAttacks(delta)

    // Update skill cooldowns
    this.updateSkillCooldowns(delta)

    // Check skill input
    this.checkSkillInput()

    // Handle wave transitions
    if (this.isWaveTransitioning) {
      this.waveTransitionTimer -= delta
      if (this.waveTransitionTimer <= 0) {
        this.isWaveTransitioning = false
        this.advanceWave()
      }
    }

    // Resolve combat overlaps
    this.resolveCombat()

    // Update HUD
    this.drawHUD()
  }

  // ---------------------------------------------------------------------------
  // Setup
  // ---------------------------------------------------------------------------

  private resetState(): void {
    this.currentWave = 0
    this.waveActive = false
    this.enemiesAliveInWave = 0
    this.waveTransitionTimer = 0
    this.isWaveTransitioning = false
    this.totalXp = 0
    this.totalKills = 0
    this.isGameOver = false
    this.isVictory = false
    this.boss = null
    this.activeBossAttacks = []
    this.skillCooldowns.clear()
    this.gameOverText = null
    this.restartText = null
    this.bossNameText = null
    this.bossHealthText = null
  }

  private createArena(): void {
    const { width, height } = this.scale

    // Set world bounds (slightly smaller than screen for border)
    const margin = 40
    this.physics.world.setBounds(margin, margin, width - margin * 2, height - margin * 2)

    // Draw arena border
    this.arenaGraphics = this.add.graphics()
    this.arenaGraphics.setDepth(0)

    // Background fill
    this.arenaGraphics.fillStyle(0x1a1a2e, 1)
    this.arenaGraphics.fillRect(0, 0, width, height)

    // Arena floor (slightly lighter)
    this.arenaGraphics.fillStyle(0x222244, 1)
    this.arenaGraphics.fillRect(margin, margin, width - margin * 2, height - margin * 2)

    // Border lines
    this.arenaGraphics.lineStyle(3, 0x4444aa, 0.8)
    this.arenaGraphics.strokeRect(margin, margin, width - margin * 2, height - margin * 2)

    // Corner decorations
    const cornerSize = 20
    const corners = [
      { x: margin, y: margin },
      { x: width - margin, y: margin },
      { x: margin, y: height - margin },
      { x: width - margin, y: height - margin },
    ]
    this.arenaGraphics.fillStyle(0x6644cc, 0.6)
    for (const c of corners) {
      this.arenaGraphics.fillCircle(c.x, c.y, cornerSize)
    }
  }

  private createPlayer(): void {
    const { width, height } = this.scale
    this.player = new Player(this, width / 2, height / 2)
    this.player.setDepth(5)
  }

  private applyRuneBuffsToPlayer(): void {
    // Max HP buff
    const hpBonus = this.runeBuffs.getFlat('max_hp')
    if (hpBonus > 0) {
      this.player.maxHealth += hpBonus
      this.player.health = this.player.maxHealth
    }

    // Extra dodge charges
    const dodgeBonus = this.runeBuffs.getFlat('dodge_charges')
    if (dodgeBonus > 0) {
      // Expose via a public setter — we adjust the private fields through reassignment
      (this.player as unknown as { maxDodgeCharges: number }).maxDodgeCharges += dodgeBonus;
      (this.player as unknown as { dodgeCharges: number }).dodgeCharges += dodgeBonus
    }
  }

  private createEnemyGroup(): void {
    this.enemies = this.physics.add.group({
      classType: Enemy,
      runChildUpdate: false, // We call update manually for control
    })
  }

  private createHUD(): void {
    this.hudGraphics = this.add.graphics()
    this.hudGraphics.setDepth(100)
    this.hudGraphics.setScrollFactor(0)

    const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: '14px',
      color: '#f5f6fa',
      fontFamily: 'monospace',
    }

    this.healthText = this.add.text(HUD_MARGIN + 4, HUD_MARGIN + 2, '', textStyle)
    this.healthText.setDepth(101)
    this.healthText.setScrollFactor(0)

    this.comboText = this.add.text(COMBO_DISPLAY_X, COMBO_DISPLAY_Y, '', {
      ...textStyle,
      fontSize: '18px',
      color: '#ffcc00',
    })
    this.comboText.setDepth(101)
    this.comboText.setScrollFactor(0)

    this.waveText = this.add.text(this.scale.width / 2, HUD_MARGIN, '', {
      ...textStyle,
      fontSize: '16px',
      color: '#aaaaff',
    })
    this.waveText.setOrigin(0.5, 0)
    this.waveText.setDepth(101)
    this.waveText.setScrollFactor(0)

    this.xpText = this.add.text(this.scale.width - HUD_MARGIN, HUD_MARGIN, '', {
      ...textStyle,
      fontSize: '14px',
      color: '#88ff88',
    })
    this.xpText.setOrigin(1, 0)
    this.xpText.setDepth(101)
    this.xpText.setScrollFactor(0)

    // Rune buff indicator
    this.runeBuffText = this.add.text(this.scale.width - HUD_MARGIN, HUD_MARGIN + 20, '', {
      ...textStyle,
      fontSize: '11px',
      color: '#cc88ff',
    })
    this.runeBuffText.setOrigin(1, 0)
    this.runeBuffText.setDepth(101)
    this.runeBuffText.setScrollFactor(0)

    // Skill cooldown text displays
    let skillY = SKILL_COOLDOWN_Y
    for (const skill of SKILLS) {
      const sText = this.add.text(HUD_MARGIN, skillY, '', {
        ...textStyle,
        fontSize: '12px',
        color: '#cccccc',
      })
      sText.setDepth(101)
      sText.setScrollFactor(0)
      this.skillTexts.set(skill.id, sText)
      skillY += 20
    }
  }

  private registerSkillKeys(): void {
    const keyboard = this.input.keyboard
    if (!keyboard) return

    for (const skill of SKILLS) {
      const key = keyboard.addKey(skill.key)
      this.skillKeys.set(skill.id, key)
    }
  }

  // ---------------------------------------------------------------------------
  // Event listeners
  // ---------------------------------------------------------------------------

  private registerEventListeners(): void {
    // Player events
    this.events.on('player-attack-hit', this.onPlayerAttackHit, this)
    this.events.on('player-dead', this.onPlayerDead, this)

    // Enemy events
    this.events.on('enemy-attack-hit', this.onEnemyAttackHit, this)
    this.events.on('enemy-died', this.onEnemyDied, this)

    // Loot events
    this.events.on('loot-drop', this.onLootDrop, this)

    // Boss events
    this.events.on('boss-attack', this.onBossAttack, this)
    this.events.on('boss-attack-hit', this.onBossAttackHit, this)
    this.events.on('boss-defeated', this.onBossDefeated, this)
    this.events.on('boss-summon-minions', this.onBossSummonMinions, this)

    // Clean up on shutdown
    this.events.once('shutdown', this.cleanupListeners, this)
  }

  private cleanupListeners(): void {
    this.events.off('player-attack-hit', this.onPlayerAttackHit, this)
    this.events.off('player-dead', this.onPlayerDead, this)
    this.events.off('enemy-attack-hit', this.onEnemyAttackHit, this)
    this.events.off('enemy-died', this.onEnemyDied, this)
    this.events.off('loot-drop', this.onLootDrop, this)
    this.events.off('boss-attack', this.onBossAttack, this)
    this.events.off('boss-attack-hit', this.onBossAttackHit, this)
    this.events.off('boss-defeated', this.onBossDefeated, this)
    this.events.off('boss-summon-minions', this.onBossSummonMinions, this)
  }

  // ---------------------------------------------------------------------------
  // Wave system
  // ---------------------------------------------------------------------------

  private startWave(waveIndex: number): void {
    if (waveIndex >= WAVE_DEFINITIONS.length) {
      this.triggerVictory()
      return
    }

    this.currentWave = waveIndex
    this.waveActive = true
    const waveDef = WAVE_DEFINITIONS[waveIndex]

    if (waveDef.isBossWave) {
      this.spawnBoss()
    } else {
      this.spawnWaveEnemies(waveDef)
    }
  }

  private spawnWaveEnemies(waveDef: WaveDefinition): void {
    const { width, height } = this.scale
    const margin = 80
    let spawnCount = 0

    for (const spawn of waveDef.enemies) {
      for (let i = 0; i < spawn.count; i++) {
        // Distribute enemies around the arena edges
        const side = (spawnCount + i) % 4
        let x: number
        let y: number

        switch (side) {
          case 0: // top
            x = Phaser.Math.Between(margin, width - margin)
            y = margin + 20
            break
          case 1: // right
            x = width - margin - 20
            y = Phaser.Math.Between(margin, height - margin)
            break
          case 2: // bottom
            x = Phaser.Math.Between(margin, width - margin)
            y = height - margin - 20
            break
          default: // left
            x = margin + 20
            y = Phaser.Math.Between(margin, height - margin)
            break
        }

        const enemy = new Enemy(this, x, y, spawn.config)
        enemy.setPlayer(this.player)
        enemy.setDepth(4)
        this.enemies.add(enemy)
        spawnCount++
      }
    }

    this.enemiesAliveInWave = spawnCount
  }

  private spawnBoss(): void {
    const { width } = this.scale
    this.boss = new CorruptedGuardian(this, width / 2, 120)
    this.boss.setPlayer(this.player)
    this.boss.setDepth(6)
    this.enemiesAliveInWave = 1

    audioManager.crossFadeTo('boss')

    // Create boss HUD elements
    const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: '16px',
      color: '#ff4400',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }

    this.bossNameText = this.add.text(
      this.scale.width / 2,
      this.scale.height - 60,
      'Corrupted Guardian',
      textStyle
    )
    this.bossNameText.setOrigin(0.5, 0)
    this.bossNameText.setDepth(101)
    this.bossNameText.setScrollFactor(0)

    this.bossHealthText = this.add.text(
      this.scale.width / 2,
      this.scale.height - 38,
      '',
      { ...textStyle, fontSize: '12px', color: '#ff8800' }
    )
    this.bossHealthText.setOrigin(0.5, 0)
    this.bossHealthText.setDepth(101)
    this.bossHealthText.setScrollFactor(0)
  }

  private advanceWave(): void {
    const nextWave = this.currentWave + 1
    if (nextWave >= WAVE_DEFINITIONS.length) {
      this.triggerVictory()
      return
    }
    this.startWave(nextWave)
  }

  private checkWaveComplete(): void {
    if (!this.waveActive) return
    if (this.enemiesAliveInWave > 0) return

    this.waveActive = false

    // If this was the boss wave, victory is handled by boss-defeated event
    if (this.boss) return

    // Start transition delay before next wave
    this.isWaveTransitioning = true
    this.waveTransitionTimer = 2000 // 2s between waves
  }

  // ---------------------------------------------------------------------------
  // Combat resolution
  // ---------------------------------------------------------------------------

  private resolveCombat(): void {
    // Player attack range check against enemies
    // (handled via event system -- player-attack-hit emitted by AttackState)

    // Enemy proximity damage (for enemies in ATTACK state near player)
    // (handled via event system -- enemy-attack-hit emitted by AttackState)

    // Boss attack collision is handled by updateBossAttacks
  }

  private onPlayerAttackHit(_comboHit: unknown, damage: number): void {
    audioManager.playSfx('attack_swing')
    // Apply rune ATK + all_damage buffs
    let buffedDamage = this.runeBuffs.apply('atk', damage)
    buffedDamage = Math.round(buffedDamage * this.runeBuffs.getMultiplier('all_damage'))

    // Crit check
    const critChance = this.runeBuffs.getFlat('crit_chance') / 100
    if (critChance > 0 && Math.random() < critChance) {
      buffedDamage = Math.round(buffedDamage * 1.5)
    }

    // Check all active enemies for range-based hit detection
    const attackRange = 60
    const px = this.player.x
    const py = this.player.y
    let totalDealt = 0

    this.enemies.getChildren().forEach((child) => {
      const enemy = child as Enemy
      if (!enemy.active || enemy.health <= 0) return

      const dx = enemy.x - px
      const dy = enemy.y - py
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist <= attackRange) {
        enemy.takeDamage(buffedDamage)
        totalDealt += buffedDamage
      }
    })

    // Check boss
    if (this.boss && this.boss.active && this.boss.health > 0) {
      const dx = this.boss.x - px
      const dy = this.boss.y - py
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist <= attackRange + 32) {
        this.boss.takeDamage(buffedDamage)
        totalDealt += buffedDamage
      }
    }

    // Lifesteal
    const lifestealPct = this.runeBuffs.getFlat('lifesteal')
    if (lifestealPct > 0 && totalDealt > 0) {
      const heal = Math.round(totalDealt * lifestealPct / 100)
      this.player.health = Math.min(this.player.maxHealth, this.player.health + heal)
    }
  }

  private onEnemyAttackHit(enemy: Enemy, damage: number): void {
    audioManager.playSfx('enemy_attack')
    // Check if the enemy is close enough to the player to deal damage
    const dx = this.player.x - enemy.x
    const dy = this.player.y - enemy.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist <= enemy.config.attackRange + 20) {
      // Apply DEF rune buff: reduce damage by flat defense
      const defBonus = this.runeBuffs.getFlat('def')
      const reduced = Math.max(1, damage - defBonus)
      this.player.takeDamage(reduced)
    }
  }

  private onEnemyDied(_enemy: Enemy): void {
    audioManager.playSfx('enemy_death')
    this.enemiesAliveInWave = Math.max(0, this.enemiesAliveInWave - 1)
    this.totalKills++
    this.checkWaveComplete()
  }

  private onLootDrop(loot: { xpReward: number }): void {
    const xp = Math.round(loot.xpReward * this.runeBuffs.getMultiplier('xp_bonus'))
    this.totalXp += xp
  }

  private onPlayerDead(): void {
    audioManager.playSfx('death')
    this.isGameOver = true
    this.showGameOver()
  }

  // ---------------------------------------------------------------------------
  // Boss combat events
  // ---------------------------------------------------------------------------

  private onBossAttack(_boss: CorruptedGuardian, attackConfig: BossAttackConfig): void {
    if (!attackConfig || !this.boss) return

    const playerPos = this.boss.getPlayerPosition()
    if (!playerPos) return

    // Create visual attack object based on attack ID
    switch (attackConfig.id) {
      case 'ground_slam': {
        audioManager.playSfx('boss_slam')
        const slam = new GroundSlam(this, attackConfig, playerPos.x, playerPos.y)
        this.activeBossAttacks.push(slam)
        break
      }
      case 'shadow_bolt': {
        audioManager.playSfx('boss_bolt')
        const bolt = new ShadowBolt(
          this,
          attackConfig,
          this.boss.x,
          this.boss.y,
          playerPos.x,
          playerPos.y
        )
        this.activeBossAttacks.push(bolt)
        break
      }
      case 'corruption_wave': {
        audioManager.playSfx('boss_wave')
        const wave = new CorruptionWave(
          this,
          attackConfig,
          this.boss.x,
          this.boss.y
        )
        this.activeBossAttacks.push(wave)
        break
      }
    }
  }

  private onBossAttackHit(_boss: CorruptedGuardian, attackConfig: BossAttackConfig): void {
    if (!attackConfig || this.player.isInvulnerable) return

    // Check if player is in the attack's damage zone
    const px = this.player.x
    const py = this.player.y

    if (this.boss) {
      const dx = px - this.boss.x
      const dy = py - this.boss.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist <= attackConfig.range) {
        const defBonus = this.runeBuffs.getFlat('def')
        this.player.takeDamage(Math.max(1, attackConfig.damage - defBonus))
      }
    }
  }

  private onBossDefeated(_boss: CorruptedGuardian): void {
    audioManager.playSfx('boss_phase')
    this.enemiesAliveInWave = 0

    // Clean up boss attacks
    for (const attack of this.activeBossAttacks) {
      attack.destroy()
    }
    this.activeBossAttacks = []

    // Award boss XP
    this.totalXp += this.boss?.config.xpReward ?? 500

    this.triggerVictory()
  }

  private onBossSummonMinions(_boss: CorruptedGuardian, count: number): void {
    const { width, height } = this.scale

    for (let i = 0; i < count; i++) {
      const x = Phaser.Math.Between(100, width - 100)
      const y = Phaser.Math.Between(100, height - 100)
      const minion = new Enemy(this, x, y, shadowWraithConfig)
      minion.setPlayer(this.player)
      minion.setDepth(4)
      this.enemies.add(minion)
    }

    // Minions don't count toward wave completion -- boss death ends the wave
  }

  // ---------------------------------------------------------------------------
  // Boss attack update loop
  // ---------------------------------------------------------------------------

  private updateBossAttacks(delta: number): void {
    const resolved: number[] = []

    for (let i = 0; i < this.activeBossAttacks.length; i++) {
      const attack = this.activeBossAttacks[i]
      const done = attack.update(delta)

      // Check collision with player for projectile/wave attacks
      if (!this.player.isInvulnerable && !this.isGameOver) {
        if (attack instanceof ShadowBolt && attack.active) {
          const hitbox = attack.getHitbox()
          const dx = this.player.x - hitbox.x
          const dy = this.player.y - hitbox.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist <= hitbox.radius + 16) {
            attack.explode()
            const boltDef = this.runeBuffs.getFlat('def')
            this.player.takeDamage(Math.max(1, 30 - boltDef))
          }
        } else if (attack instanceof CorruptionWave) {
          if (attack.isPointInDamageZone(this.player.x, this.player.y)) {
            const waveDef = this.runeBuffs.getFlat('def')
            this.player.takeDamage(Math.max(1, 45 - waveDef))
          }
        }
      }

      if (done) {
        resolved.push(i)
      }
    }

    // Remove resolved attacks in reverse order
    for (let i = resolved.length - 1; i >= 0; i--) {
      this.activeBossAttacks.splice(resolved[i], 1)
    }
  }

  // ---------------------------------------------------------------------------
  // Skills
  // ---------------------------------------------------------------------------

  private checkSkillInput(): void {
    for (const skill of SKILLS) {
      const key = this.skillKeys.get(skill.id)
      if (!key) continue

      if (Phaser.Input.Keyboard.JustDown(key)) {
        this.activateSkill(skill)
      }
    }
  }

  private activateSkill(skill: SkillDefinition): void {
    // Check cooldown
    const remaining = this.skillCooldowns.get(skill.id) ?? 0
    if (remaining > 0) return

    // Set cooldown
    this.skillCooldowns.set(skill.id, skill.cooldownMs)

    // Execute skill effect
    switch (skill.id) {
      case 'flame_burst':
        audioManager.playSfx('attack_swing')
        this.executeAoESkill(skill.damage, skill.range, 0xff4400)
        break
      case 'shadow_strike':
        audioManager.playSfx('attack_swing')
        this.executeMeleeSkill(skill.damage, skill.range, 0x6622cc)
        break
      case 'void_shield':
        audioManager.playSfx('dodge_whoosh')
        this.executeShieldSkill()
        break
    }
  }

  private executeAoESkill(damage: number, range: number, color: number): void {
    const skillDmg = Math.round(
      this.runeBuffs.apply('skill_damage', damage) * this.runeBuffs.getMultiplier('all_damage')
    )
    const px = this.player.x
    const py = this.player.y

    // Visual -- expanding circle
    const gfx = this.add.graphics()
    gfx.setDepth(8)
    gfx.fillStyle(color, 0.4)
    gfx.fillCircle(px, py, range)
    gfx.lineStyle(2, color, 0.8)
    gfx.strokeCircle(px, py, range)

    this.tweens.add({
      targets: gfx,
      alpha: 0,
      duration: 400,
      onComplete: () => gfx.destroy(),
    })

    // Damage all enemies in range
    this.enemies.getChildren().forEach((child) => {
      const enemy = child as Enemy
      if (!enemy.active || enemy.health <= 0) return

      const dx = enemy.x - px
      const dy = enemy.y - py
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist <= range) {
        enemy.takeDamage(skillDmg)
      }
    })

    // Damage boss if in range
    if (this.boss && this.boss.active && this.boss.health > 0) {
      const dx = this.boss.x - px
      const dy = this.boss.y - py
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist <= range) {
        this.boss.takeDamage(skillDmg)
      }
    }
  }

  private executeMeleeSkill(damage: number, range: number, color: number): void {
    const meleeDmg = Math.round(
      this.runeBuffs.apply('skill_damage', damage) * this.runeBuffs.getMultiplier('all_damage')
    )
    const px = this.player.x
    const py = this.player.y
    const dir = this.player.flipX ? -1 : 1

    // Visual -- directional slash
    const gfx = this.add.graphics()
    gfx.setDepth(8)
    gfx.fillStyle(color, 0.6)
    gfx.beginPath()
    gfx.arc(px + dir * 20, py, range, -Math.PI / 3, Math.PI / 3, false)
    gfx.lineTo(px + dir * 20, py)
    gfx.closePath()
    gfx.fillPath()

    this.tweens.add({
      targets: gfx,
      alpha: 0,
      duration: 300,
      onComplete: () => gfx.destroy(),
    })

    // Damage enemies in a cone-like area in front of the player
    this.enemies.getChildren().forEach((child) => {
      const enemy = child as Enemy
      if (!enemy.active || enemy.health <= 0) return

      const dx = enemy.x - px
      const dy = enemy.y - py
      const dist = Math.sqrt(dx * dx + dy * dy)

      // Check direction -- only hit enemies in the facing direction
      const inFront = (dir > 0 && dx > 0) || (dir < 0 && dx < 0)
      if (dist <= range && inFront) {
        enemy.takeDamage(meleeDmg)
      }
    })

    // Damage boss
    if (this.boss && this.boss.active && this.boss.health > 0) {
      const dx = this.boss.x - px
      const dy = this.boss.y - py
      const dist = Math.sqrt(dx * dx + dy * dy)
      const inFront = (dir > 0 && dx > 0) || (dir < 0 && dx < 0)
      if (dist <= range && inFront) {
        this.boss.takeDamage(meleeDmg)
      }
    }
  }

  private executeShieldSkill(): void {
    this.player.isInvulnerable = true

    // Visual -- pulsing shield
    const gfx = this.add.graphics()
    gfx.setDepth(9)

    const shieldDuration = 3000
    let elapsed = 0

    const timer = this.time.addEvent({
      delay: 16,
      repeat: Math.floor(shieldDuration / 16),
      callback: () => {
        elapsed += 16
        gfx.clear()
        const pulse = Math.sin(elapsed / 150) * 0.15 + 0.35
        gfx.fillStyle(0x222244, pulse)
        gfx.fillCircle(this.player.x, this.player.y, 40)
        gfx.lineStyle(2, 0x6644cc, pulse + 0.3)
        gfx.strokeCircle(this.player.x, this.player.y, 40)
      },
    })

    this.time.delayedCall(shieldDuration, () => {
      timer.destroy()
      gfx.destroy()
      // Only remove invulnerability if player is not in dodge/hurt state
      if (this.player.fsm.stateName !== 'DODGE' && this.player.fsm.stateName !== 'HURT') {
        this.player.isInvulnerable = false
      }
    })
  }

  private updateSkillCooldowns(delta: number): void {
    for (const [id, remaining] of this.skillCooldowns.entries()) {
      if (remaining > 0) {
        this.skillCooldowns.set(id, Math.max(0, remaining - delta))
      }
    }
  }

  // ---------------------------------------------------------------------------
  // HUD rendering
  // ---------------------------------------------------------------------------

  private drawHUD(): void {
    this.hudGraphics.clear()

    // -- Player health bar --
    const healthPercent = this.player.health / this.player.maxHealth
    this.drawBar(
      HUD_MARGIN,
      HUD_MARGIN,
      HEALTH_BAR_WIDTH,
      HEALTH_BAR_HEIGHT,
      healthPercent,
      this.getHealthColor(healthPercent),
      0x333333
    )
    this.healthText.setText(`HP: ${this.player.health} / ${this.player.maxHealth}`)

    // -- Combo counter --
    if (this.player.comboStep > 0) {
      this.comboText.setText(`Combo x${this.player.comboStep}`)
      this.comboText.setVisible(true)
    } else {
      this.comboText.setVisible(false)
    }

    // -- Wave info --
    const waveDef = WAVE_DEFINITIONS[this.currentWave]
    if (waveDef) {
      const waveLabel = waveDef.isBossWave
        ? 'BOSS FIGHT'
        : `Wave ${this.currentWave + 1} / ${WAVE_DEFINITIONS.length}`
      const aliveLabel = this.isWaveTransitioning
        ? 'WAVE CLEAR!'
        : `Enemies: ${this.enemiesAliveInWave}`
      this.waveText.setText(`${waveLabel}  |  ${aliveLabel}`)
    }

    // -- XP --
    this.xpText.setText(`XP: ${this.totalXp}  |  Kills: ${this.totalKills}`)

    // Keep pause menu stats up to date
    if (this.pauseMenu && (this.pauseMenu as unknown as { config: { runStats: { kills: number; xpEarned: number } } }).config.runStats) {
      const rs = (this.pauseMenu as unknown as { config: { runStats: { kills: number; xpEarned: number } } }).config.runStats
      rs.kills = this.totalKills
      rs.xpEarned = this.totalXp
    }

    // -- Active rune buffs --
    this.updateRuneBuffDisplay()

    // -- Skill cooldowns --
    for (const skill of SKILLS) {
      const sText = this.skillTexts.get(skill.id)
      if (!sText) continue

      const cd = this.skillCooldowns.get(skill.id) ?? 0
      if (cd > 0) {
        const seconds = (cd / 1000).toFixed(1)
        sText.setText(`[${skill.name}] ${seconds}s`)
        sText.setColor('#666666')
      } else {
        const keyName = this.getKeyDisplayName(skill.key)
        sText.setText(`[${keyName}] ${skill.name}`)
        sText.setColor('#cccccc')
      }
    }

    // -- Boss health bar --
    if (this.boss && this.boss.active && this.boss.health > 0) {
      const bossPercent = this.boss.health / this.boss.maxHealth
      const barX = (this.scale.width - BOSS_BAR_WIDTH) / 2
      const barY = this.scale.height - 80
      this.drawBar(
        barX,
        barY,
        BOSS_BAR_WIDTH,
        BOSS_BAR_HEIGHT,
        bossPercent,
        this.getBossHealthColor(bossPercent),
        0x333333
      )

      if (this.bossHealthText) {
        const phaseLabel = this.boss.getPhaseIndex() === 0 ? 'Phase 1' : 'Phase 2 - RAGE'
        this.bossHealthText.setText(
          `${this.boss.health} / ${this.boss.maxHealth}  |  ${phaseLabel}`
        )
      }

      // Enrage timer display
      if (this.boss.ai.isEnraged) {
        // Boss is enraged -- show warning
      }
    } else if (this.bossNameText) {
      this.bossNameText.setVisible(false)
    }

    if (this.bossHealthText && (!this.boss || !this.boss.active || this.boss.health <= 0)) {
      this.bossHealthText.setVisible(false)
    }

    // -- Dodge charges (small pips below health bar) --
    const dodgeCharges = this.player.getDodgeCharges()
    const maxCharges = this.player.getMaxDodgeCharges()
    const pipY = HUD_MARGIN + HEALTH_BAR_HEIGHT + 6
    const pipSize = 8
    const pipSpacing = 14

    for (let i = 0; i < maxCharges; i++) {
      const pipX = HUD_MARGIN + i * pipSpacing + pipSize
      if (i < dodgeCharges) {
        this.hudGraphics.fillStyle(0x44aaff, 1)
      } else {
        this.hudGraphics.fillStyle(0x444444, 0.6)
      }
      this.hudGraphics.fillCircle(pipX, pipY, pipSize / 2)
    }
  }

  private updateRuneBuffDisplay(): void {
    const parts: string[] = []
    const atkMul = this.runeBuffs.getMultiplier('atk')
    if (atkMul > 1) parts.push(`ATK+${Math.round((atkMul - 1) * 100)}%`)
    const defFlat = this.runeBuffs.getFlat('def')
    if (defFlat > 0) parts.push(`DEF+${defFlat}`)
    const critFlat = this.runeBuffs.getFlat('crit_chance')
    if (critFlat > 0) parts.push(`CRIT+${critFlat}%`)
    const ls = this.runeBuffs.getFlat('lifesteal')
    if (ls > 0) parts.push(`LS ${ls}%`)
    const allDmg = this.runeBuffs.getMultiplier('all_damage')
    if (allDmg > 1) parts.push(`DMG+${Math.round((allDmg - 1) * 100)}%`)
    const skillDmg = this.runeBuffs.getMultiplier('skill_damage')
    if (skillDmg > 1) parts.push(`SKILL+${Math.round((skillDmg - 1) * 100)}%`)
    this.runeBuffText.setText(parts.length > 0 ? parts.join('  ') : '')
  }

  private drawBar(
    x: number,
    y: number,
    width: number,
    height: number,
    percent: number,
    fillColor: number,
    bgColor: number
  ): void {
    // Background
    this.hudGraphics.fillStyle(bgColor, 0.8)
    this.hudGraphics.fillRect(x, y, width, height)

    // Fill
    const fillWidth = Math.max(0, Math.min(width, width * percent))
    this.hudGraphics.fillStyle(fillColor, 1)
    this.hudGraphics.fillRect(x, y, fillWidth, height)

    // Border
    this.hudGraphics.lineStyle(1, 0xaaaaaa, 0.6)
    this.hudGraphics.strokeRect(x, y, width, height)
  }

  private getHealthColor(percent: number): number {
    if (percent > 0.6) return 0x44cc44
    if (percent > 0.3) return 0xcccc44
    return 0xcc4444
  }

  private getBossHealthColor(percent: number): number {
    if (percent > 0.5) return 0xff4400
    return 0xff0000
  }

  private getKeyDisplayName(keyCode: number): string {
    switch (keyCode) {
      case Phaser.Input.Keyboard.KeyCodes.ONE:
        return '1'
      case Phaser.Input.Keyboard.KeyCodes.TWO:
        return '2'
      case Phaser.Input.Keyboard.KeyCodes.THREE:
        return '3'
      default:
        return '?'
    }
  }

  // ---------------------------------------------------------------------------
  // End states
  // ---------------------------------------------------------------------------

  private showGameOver(): void {
    const { width, height } = this.scale

    // Dim overlay
    const overlay = this.add.graphics()
    overlay.setDepth(200)
    overlay.fillStyle(0x000000, 0.7)
    overlay.fillRect(0, 0, width, height)

    this.gameOverText = this.add.text(width / 2, height / 2 - 40, 'DEFEATED', {
      fontSize: '48px',
      color: '#ff4444',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    })
    this.gameOverText.setOrigin(0.5)
    this.gameOverText.setDepth(201)

    const statsLabel = `Waves: ${this.currentWave + 1}  |  Kills: ${this.totalKills}  |  XP: ${this.totalXp}`
    this.add
      .text(width / 2, height / 2 + 10, statsLabel, {
        fontSize: '16px',
        color: '#cccccc',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setDepth(201)

    this.restartText = this.add.text(
      width / 2,
      height / 2 + 50,
      this.fromDungeon ? 'Press ENTER to return to hub' : 'Press ENTER to restart',
      {
        fontSize: '18px',
        color: '#aaaaff',
        fontFamily: 'monospace',
      }
    )
    this.restartText.setOrigin(0.5)
    this.restartText.setDepth(201)
  }

  private triggerVictory(): void {
    this.isVictory = true

    const { width, height } = this.scale

    // Dim overlay
    const overlay = this.add.graphics()
    overlay.setDepth(200)
    overlay.fillStyle(0x000000, 0.7)
    overlay.fillRect(0, 0, width, height)

    this.gameOverText = this.add.text(width / 2, height / 2 - 40, 'VICTORY', {
      fontSize: '48px',
      color: '#44ff44',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    })
    this.gameOverText.setOrigin(0.5)
    this.gameOverText.setDepth(201)

    const statsLabel = `Kills: ${this.totalKills}  |  XP: ${this.totalXp}`
    this.add
      .text(width / 2, height / 2 + 10, statsLabel, {
        fontSize: '16px',
        color: '#cccccc',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setDepth(201)

    this.restartText = this.add.text(
      width / 2,
      height / 2 + 50,
      this.fromDungeon ? 'Press ENTER to continue dungeon' : 'Press ENTER to return to hub',
      {
        fontSize: '18px',
        color: '#aaaaff',
        fontFamily: 'monospace',
      }
    )
    this.restartText.setOrigin(0.5)
    this.restartText.setDepth(201)
  }

  private handleEndScreenInput(): void {
    const keyboard = this.input.keyboard
    if (!keyboard) return

    if (Phaser.Input.Keyboard.JustDown(keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER))) {
      const baseCendres = this.totalKills * 5 + (this.isVictory ? 20 : 0)
      const cendresEarned = Math.round(baseCendres * this.runeBuffs.getMultiplier('cendres_bonus'))

      if (this.fromDungeon) {
        const dungeonState = this.game.registry.get('dungeonState')

        if (this.isVictory && dungeonState) {
          // Victory: return to dungeon with combat result
          this.scene.start('DungeonScene', {
            ...dungeonState.playerData,
            combatResult: {
              victory: true,
              nodeId: dungeonState.currentNodeId,
              xpEarned: this.totalXp,
              cendresEarned: cendresEarned,
            },
            restoreState: dungeonState,
          })
        } else {
          // Defeat from dungeon: return to hub
          this.scene.start('HubScene', {
            xpEarned: this.totalXp,
            cendresEarned: cendresEarned,
          })
        }
      } else {
        // Standalone combat
        if (this.isVictory) {
          this.scene.start('HubScene', {
            xpEarned: this.totalXp,
            cendresEarned: cendresEarned + 30,
          })
        } else {
          this.scene.restart()
        }
      }
    }
  }
}
