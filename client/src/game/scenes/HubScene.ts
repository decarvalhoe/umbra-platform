import Phaser from 'phaser'
import { getGachaPools, drawGacha } from '../../services/game-logic'
import type { GachaPool, GachaItem, GachaDrawResult } from '../../types/economy'
import { audioManager } from '../audio/AudioManager'
import { nakamaClient, getSession } from '../../nakama/client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ShopItem {
    id: string
    name: string
    description: string
    cost: number
    type: 'weapon' | 'armor' | 'potion'
    stat: string
    value: number
}

interface TalentNode {
    id: number
    name: string
    description: string
    cost: number
    requires: number[]
    effect: string
    value: number
    allocated: boolean
}

interface PlayerData {
    level: number
    xp: number
    xpToNext: number
    cendres: number
    voidFragments: number
    pityCounter: number
    talentPoints: number
    talents: number[]
    inventory: string[]
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SHOP_ITEMS: ShopItem[] = [
    { id: 'shadow_sword', name: 'Shadow Sword', description: '+15 ATK', cost: 50, type: 'weapon', stat: 'atk', value: 15 },
    { id: 'void_dagger', name: 'Void Dagger', description: '+10 ATK, +5% crit', cost: 75, type: 'weapon', stat: 'atk', value: 10 },
    { id: 'crimson_plate', name: 'Crimson Plate', description: '+20 DEF', cost: 60, type: 'armor', stat: 'def', value: 20 },
    { id: 'health_potion', name: 'Health Potion', description: 'Restore 200 HP', cost: 20, type: 'potion', stat: 'hp', value: 200 },
    { id: 'energy_elixir', name: 'Energy Elixir', description: 'Restore 50 Energy', cost: 30, type: 'potion', stat: 'energy', value: 50 },
]

const TALENT_NODES: TalentNode[] = [
    { id: 1, name: 'Sharpened Edge', description: '+10% Attack Damage', cost: 1, requires: [], effect: 'atk_percent', value: 10, allocated: false },
    { id: 2, name: 'Keen Eye', description: '+5% Critical Chance', cost: 1, requires: [1], effect: 'crit_chance', value: 5, allocated: false },
    { id: 3, name: 'Relentless Combo', description: '+15% Combo Damage', cost: 2, requires: [1], effect: 'combo_damage', value: 15, allocated: false },
    { id: 4, name: 'Arcane Surge', description: '+20% Skill Damage', cost: 2, requires: [2], effect: 'skill_damage', value: 20, allocated: false },
    { id: 5, name: 'Blade Storm', description: '+25% Attack Speed', cost: 3, requires: [3, 4], effect: 'atk_speed', value: 25, allocated: false },
]

const NODE_POSITIONS = [
    { x: 512, y: 300 },  // Node 1 — center top
    { x: 412, y: 380 },  // Node 2 — left
    { x: 612, y: 380 },  // Node 3 — right
    { x: 412, y: 460 },  // Node 4 — below 2
    { x: 512, y: 540 },  // Node 5 — center bottom
]

// ---------------------------------------------------------------------------
// HubScene
// ---------------------------------------------------------------------------

/** The persistent hub between dungeon runs. */
export class HubScene extends Phaser.Scene {
    private playerData: PlayerData = {
        level: 1, xp: 0, xpToNext: 100, cendres: 100,
        voidFragments: 0, pityCounter: 0, talentPoints: 1, talents: [], inventory: [],
    }
    private overlayGroup!: Phaser.GameObjects.Group
    private activeOverlay: 'none' | 'shop' | 'talents' | 'gacha' = 'none'
    private gachaPools: GachaPool[] = []
    private selectedPool: GachaPool | null = null
    private lastDrawResult: GachaDrawResult | null = null
    private isDrawing = false

    constructor() {
        super({ key: 'HubScene' })
    }

    // -----------------------------------------------------------------------
    // Lifecycle
    // -----------------------------------------------------------------------

    init(data: Record<string, unknown>): void {
        // Receive rewards from combat scene
        if (data && typeof data.xpEarned === 'number') {
            this.playerData.xp += data.xpEarned as number
            this.playerData.cendres += (data.cendresEarned as number) || 0
            this.checkLevelUp()
        }
    }

    create(): void {
        this.overlayGroup = this.add.group()
        this.loadPlayerData()
        this.drawHub()
    }

    // -----------------------------------------------------------------------
    // Hub Layout
    // -----------------------------------------------------------------------

    private drawHub(): void {
        // Background
        this.cameras.main.setBackgroundColor(0x1a1a2e)

        // Title
        this.add.text(512, 30, 'THE NEXUS', { fontSize: '28px', color: '#c8a2c8', fontStyle: 'bold' }).setOrigin(0.5)

        // Player stats bar
        this.drawPlayerStats()

        // Three interactive zones
        this.createZone(170, 400, 'SHOP', 0x4a2545, () => { audioManager.playSfx('ui_click'); this.openShop() })
        this.createZone(512, 400, 'TALENTS', 0x2a4a3a, () => { audioManager.playSfx('ui_click'); this.openTalents() })
        this.createZone(854, 400, 'ENTER\nDUNGEON', 0x4a2a2a, () => this.startRun())

        // Zone labels
        this.add.text(170, 320, 'Merchant', { fontSize: '14px', color: '#aaa' }).setOrigin(0.5)
        this.add.text(512, 320, 'Offense Tree', { fontSize: '14px', color: '#aaa' }).setOrigin(0.5)
        this.add.text(854, 320, 'Dungeon Portal', { fontSize: '14px', color: '#aaa' }).setOrigin(0.5)
    }

    private drawPlayerStats(): void {
        const y = 80
        // Level
        this.add.text(50, y, `Lv.${this.playerData.level}`, { fontSize: '20px', color: '#fff', fontStyle: 'bold' })

        // XP bar
        const xpPercent = this.playerData.xp / this.playerData.xpToNext
        this.add.rectangle(250, y + 10, 200, 16, 0x333333).setOrigin(0, 0.5)
        this.add.rectangle(250, y + 10, 200 * xpPercent, 16, 0x6a5acd).setOrigin(0, 0.5)
        this.add.text(250, y + 10, `XP: ${this.playerData.xp}/${this.playerData.xpToNext}`, { fontSize: '11px', color: '#fff' }).setOrigin(0, 0.5)

        // Currencies
        this.add.text(500, y, `Cendres: ${this.playerData.cendres}`, { fontSize: '16px', color: '#ffd700' })
        this.add.text(700, y, `Void Fragments: ${this.playerData.voidFragments}`, { fontSize: '16px', color: '#9370db' })
        this.add.text(500, y + 25, `Talent Points: ${this.playerData.talentPoints}`, { fontSize: '14px', color: '#90ee90' })
    }

    private createZone(x: number, y: number, label: string, color: number, onClick: () => void): void {
        const zone = this.add.rectangle(x, y, 200, 150, color, 0.8)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => zone.setFillStyle(color, 1.0))
            .on('pointerout', () => zone.setFillStyle(color, 0.8))
            .on('pointerdown', onClick)
        this.add.text(x, y, label, { fontSize: '18px', color: '#fff', fontStyle: 'bold', align: 'center' }).setOrigin(0.5)
    }

    // -----------------------------------------------------------------------
    // Shop
    // -----------------------------------------------------------------------

    private openShop(): void {
        if (this.activeOverlay !== 'none') return
        this.activeOverlay = 'shop'
        this.clearOverlay()

        // Backdrop
        const bg = this.add.rectangle(512, 384, 700, 500, 0x111111, 0.95).setInteractive()
        this.overlayGroup.add(bg)

        this.overlayGroup.add(this.add.text(512, 160, 'MERCHANT', { fontSize: '24px', color: '#ffd700', fontStyle: 'bold' }).setOrigin(0.5))
        this.overlayGroup.add(this.add.text(512, 190, `Cendres: ${this.playerData.cendres}`, { fontSize: '16px', color: '#ffd700' }).setOrigin(0.5))

        SHOP_ITEMS.forEach((item, i) => {
            const iy = 230 + i * 55
            const owned = this.playerData.inventory.includes(item.id)

            this.overlayGroup.add(this.add.text(220, iy, item.name, { fontSize: '16px', color: owned ? '#666' : '#fff' }))
            this.overlayGroup.add(this.add.text(450, iy, item.description, { fontSize: '14px', color: '#aaa' }))

            if (!owned) {
                const btn = this.add.text(680, iy, `${item.cost}c`, { fontSize: '14px', color: '#ffd700', backgroundColor: '#333', padding: { x: 8, y: 4 } })
                    .setInteractive({ useHandCursor: true })
                    .on('pointerdown', () => this.buyItem(item))
                this.overlayGroup.add(btn)
            } else {
                this.overlayGroup.add(this.add.text(680, iy, 'OWNED', { fontSize: '14px', color: '#666' }))
            }
        })

        this.addCloseButton()
    }

    private buyItem(item: ShopItem): void {
        if (this.playerData.cendres < item.cost) return
        if (this.playerData.inventory.includes(item.id)) return
        this.playerData.cendres -= item.cost
        this.playerData.inventory.push(item.id)
        this.savePlayerData()
        this.closeOverlay()
        this.openShop()
    }

    // -----------------------------------------------------------------------
    // Talent Tree
    // -----------------------------------------------------------------------

    private openTalents(): void {
        if (this.activeOverlay !== 'none') return
        this.activeOverlay = 'talents'
        this.clearOverlay()

        const bg = this.add.rectangle(512, 384, 700, 500, 0x111111, 0.95).setInteractive()
        this.overlayGroup.add(bg)

        this.overlayGroup.add(this.add.text(512, 160, 'OFFENSE TREE', { fontSize: '24px', color: '#90ee90', fontStyle: 'bold' }).setOrigin(0.5))
        this.overlayGroup.add(this.add.text(512, 190, `Points: ${this.playerData.talentPoints}`, { fontSize: '16px', color: '#90ee90' }).setOrigin(0.5))

        // Draw connections first
        const connections: [number, number][] = [[1, 2], [1, 3], [2, 4], [3, 5], [4, 5]]
        connections.forEach(([from, to]) => {
            const fp = NODE_POSITIONS[from - 1]
            const tp = NODE_POSITIONS[to - 1]
            const line = this.add.line(0, 0, fp.x, fp.y, tp.x, tp.y, 0x444444).setOrigin(0)
            this.overlayGroup.add(line)
        })

        // Draw nodes
        TALENT_NODES.forEach((node, i) => {
            const pos = NODE_POSITIONS[i]
            const allocated = this.playerData.talents.includes(node.id)
            const available = !allocated && this.canAllocate(node)

            const color = allocated ? 0xffd700 : available ? 0xffffff : 0x555555
            const circle = this.add.circle(pos.x, pos.y, 25, color, allocated ? 0.9 : 0.3)
            this.overlayGroup.add(circle)

            this.overlayGroup.add(this.add.text(pos.x, pos.y - 5, `${node.id}`, { fontSize: '16px', color: '#000', fontStyle: 'bold' }).setOrigin(0.5))
            this.overlayGroup.add(this.add.text(pos.x, pos.y + 30, node.name, { fontSize: '11px', color: '#ccc' }).setOrigin(0.5))
            this.overlayGroup.add(this.add.text(pos.x, pos.y + 45, node.description, { fontSize: '10px', color: '#888' }).setOrigin(0.5))

            if (available) {
                circle.setInteractive({ useHandCursor: true })
                    .on('pointerdown', () => this.allocateTalent(node))
            }
        })

        this.addCloseButton()
    }

    private canAllocate(node: TalentNode): boolean {
        if (this.playerData.talentPoints < node.cost) return false
        return node.requires.every(r => this.playerData.talents.includes(r))
    }

    private allocateTalent(node: TalentNode): void {
        if (!this.canAllocate(node)) return
        this.playerData.talentPoints -= node.cost
        this.playerData.talents.push(node.id)
        this.savePlayerData()
        this.closeOverlay()
        this.openTalents()
    }

    // -----------------------------------------------------------------------
    // Gacha
    // -----------------------------------------------------------------------

    private async openGacha(): Promise<void> {
        if (this.activeOverlay !== 'none') return
        this.activeOverlay = 'gacha'
        this.clearOverlay()

        const bg = this.add.rectangle(512, 384, 750, 520, 0x111111, 0.95).setInteractive()
        this.overlayGroup.add(bg)

        this.overlayGroup.add(this.add.text(512, 150, 'VOID SUMMON', { fontSize: '24px', color: '#9370db', fontStyle: 'bold' }).setOrigin(0.5))
        this.overlayGroup.add(this.add.text(512, 180, `Void Fragments: ${this.playerData.voidFragments}`, { fontSize: '16px', color: '#9370db' }).setOrigin(0.5))
        this.overlayGroup.add(this.add.text(512, 200, `Pity: ${this.playerData.pityCounter} / 90`, { fontSize: '12px', color: '#888' }).setOrigin(0.5))

        // Load pools if not cached
        if (this.gachaPools.length === 0) {
            try {
                this.gachaPools = await getGachaPools()
            } catch {
                // Offline: use local fallback pool
                this.gachaPools = [{
                    id: 'standard',
                    name: 'Standard Banner',
                    items: [
                        { id: 'rusty_blade', name: 'Rusty Blade', rarity: 'common', weight: 50, element: null },
                        { id: 'recruit_sword', name: 'Recruit Sword', rarity: 'common', weight: 40, element: null },
                        { id: 'flame_dagger', name: 'Flame Dagger', rarity: 'rare', weight: 20, element: 'fire' },
                        { id: 'shadow_katana', name: 'Shadow Katana', rarity: 'rare', weight: 15, element: 'shadow' },
                        { id: 'void_edge', name: 'Void Edge', rarity: 'epic', weight: 8, element: 'void' },
                        { id: 'blood_reaper', name: 'Blood Reaper', rarity: 'epic', weight: 5, element: 'blood' },
                        { id: 'corrupted_fang', name: 'Corrupted Fang', rarity: 'legendary', weight: 2, element: 'shadow' },
                        { id: 'phoenix_blade', name: 'Phoenix Blade', rarity: 'legendary', weight: 1, element: 'fire' },
                    ],
                    pityThreshold: 90,
                }]
            }
        }

        if (this.lastDrawResult) {
            this.showDrawResults()
        } else {
            this.showPoolSelection()
        }

        this.addCloseButton()
    }

    private showPoolSelection(): void {
        // Clear previous pool UI (keep backdrop + header)
        const poolY = 230
        this.gachaPools.forEach((pool, i) => {
            const py = poolY + i * 80
            const poolBg = this.add.rectangle(512, py + 20, 600, 65, 0x222233, 0.9)
                .setInteractive({ useHandCursor: true })
                .on('pointerover', () => poolBg.setFillStyle(0x333344, 1))
                .on('pointerout', () => poolBg.setFillStyle(0x222233, 0.9))
                .on('pointerdown', () => { this.selectedPool = pool; this.showPoolDetail() })
            this.overlayGroup.add(poolBg)

            this.overlayGroup.add(this.add.text(250, py + 8, pool.name, { fontSize: '16px', color: '#fff', fontStyle: 'bold' }))
            this.overlayGroup.add(this.add.text(250, py + 28, `${pool.items.length} items  |  Pity at ${pool.pityThreshold ?? 90}`, { fontSize: '12px', color: '#888' }))
        })
    }

    private showPoolDetail(): void {
        if (!this.selectedPool) return
        this.closeOverlay()
        this.activeOverlay = 'gacha'
        this.clearOverlay()

        const bg = this.add.rectangle(512, 384, 750, 520, 0x111111, 0.95).setInteractive()
        this.overlayGroup.add(bg)

        this.overlayGroup.add(this.add.text(512, 150, this.selectedPool.name.toUpperCase(), { fontSize: '22px', color: '#9370db', fontStyle: 'bold' }).setOrigin(0.5))
        this.overlayGroup.add(this.add.text(512, 178, `Void Fragments: ${this.playerData.voidFragments}  |  Pity: ${this.playerData.pityCounter}/90`, { fontSize: '14px', color: '#aaa' }).setOrigin(0.5))

        // Draw buttons
        const canDraw1 = this.playerData.voidFragments >= 10
        const canDraw10 = this.playerData.voidFragments >= 100

        const draw1Btn = this.add.text(380, 220, 'Draw x1 (10 VF)', {
            fontSize: '14px', color: canDraw1 ? '#9370db' : '#555',
            backgroundColor: '#222', padding: { x: 12, y: 6 }
        }).setOrigin(0.5)
        if (canDraw1) {
            draw1Btn.setInteractive({ useHandCursor: true })
                .on('pointerdown', () => this.executeDraw(1))
        }
        this.overlayGroup.add(draw1Btn)

        const draw10Btn = this.add.text(650, 220, 'Draw x10 (100 VF)', {
            fontSize: '14px', color: canDraw10 ? '#ffd700' : '#555',
            backgroundColor: '#222', padding: { x: 12, y: 6 }
        }).setOrigin(0.5)
        if (canDraw10) {
            draw10Btn.setInteractive({ useHandCursor: true })
                .on('pointerdown', () => this.executeDraw(10))
        }
        this.overlayGroup.add(draw10Btn)

        // Back button
        const backBtn = this.add.text(250, 150, '< Back', { fontSize: '14px', color: '#aaa' })
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => { this.selectedPool = null; this.closeOverlay(); this.openGacha() })
        this.overlayGroup.add(backBtn)

        // Pool contents preview
        this.overlayGroup.add(this.add.text(250, 260, 'Pool Contents:', { fontSize: '13px', color: '#888' }))
        const rarityColors: Record<string, string> = { common: '#9ca3af', rare: '#3b82f6', epic: '#a855f7', legendary: '#f59e0b' }
        this.selectedPool.items.forEach((item, i) => {
            const iy = 285 + i * 22
            if (iy > 500) return
            const color = rarityColors[item.rarity] ?? '#fff'
            this.overlayGroup.add(this.add.text(270, iy, item.name, { fontSize: '12px', color }))
            this.overlayGroup.add(this.add.text(500, iy, item.rarity, { fontSize: '11px', color: '#666' }))
            if (item.element) {
                this.overlayGroup.add(this.add.text(580, iy, item.element, { fontSize: '11px', color: '#888' }))
            }
        })

        this.addCloseButton()
    }

    // -----------------------------------------------------------------------
    // Overlay helpers
    // -----------------------------------------------------------------------

    private async executeDraw(numDraws: number): Promise<void> {
        if (!this.selectedPool || this.isDrawing) return
        const cost = numDraws * 10
        if (this.playerData.voidFragments < cost) return

        this.isDrawing = true
        this.playerData.voidFragments -= cost

        try {
            this.lastDrawResult = await drawGacha(
                this.selectedPool.id,
                numDraws,
                this.playerData.pityCounter
            )
            this.playerData.pityCounter = this.lastDrawResult.newPityCounter
        } catch {
            // Offline fallback: local weighted random
            const items = this.selectedPool.items
            const drawn: GachaItem[] = []
            for (let i = 0; i < numDraws; i++) {
                const totalW = items.reduce((s, it) => s + it.weight, 0)
                let roll = Math.random() * totalW
                let pick = items[0]
                for (const item of items) {
                    roll -= item.weight
                    if (roll <= 0) { pick = item; break }
                }
                drawn.push(pick)
                this.playerData.pityCounter++
                if (this.playerData.pityCounter >= 90) {
                    // Force legendary on pity
                    const legends = items.filter(it => it.rarity === 'legendary')
                    if (legends.length > 0) {
                        drawn[drawn.length - 1] = legends[Math.floor(Math.random() * legends.length)]
                    }
                    this.playerData.pityCounter = 0
                }
            }
            this.lastDrawResult = {
                items: drawn,
                newPityCounter: this.playerData.pityCounter,
                guaranteedLegendary: false,
            }
        }

        // Add drawn items to inventory
        for (const item of this.lastDrawResult.items) {
            if (!this.playerData.inventory.includes(item.id)) {
                this.playerData.inventory.push(item.id)
            }
        }

        this.savePlayerData()
        this.isDrawing = false

        // Show results with draw animation
        this.closeOverlay()
        this.activeOverlay = 'gacha'
        this.clearOverlay()
        this.showDrawAnimation()
    }

    private showDrawAnimation(): void {
        const bg = this.add.rectangle(512, 384, 750, 520, 0x0a0a15, 0.97).setInteractive()
        this.overlayGroup.add(bg)

        // Flash effect
        const flash = this.add.rectangle(512, 384, 750, 520, 0x9370db, 0.6)
        this.overlayGroup.add(flash)
        this.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 600,
            onComplete: () => {
                flash.destroy()
                this.showDrawResults()
            }
        })
    }

    private showDrawResults(): void {
        if (!this.lastDrawResult) return

        // Clear previous and re-draw backdrop
        this.clearOverlay()
        const bg = this.add.rectangle(512, 384, 750, 520, 0x111111, 0.95).setInteractive()
        this.overlayGroup.add(bg)

        this.overlayGroup.add(this.add.text(512, 150, 'SUMMON RESULTS', { fontSize: '22px', color: '#ffd700', fontStyle: 'bold' }).setOrigin(0.5))

        if (this.lastDrawResult.guaranteedLegendary) {
            this.overlayGroup.add(this.add.text(512, 175, 'PITY TRIGGERED!', { fontSize: '14px', color: '#f59e0b' }).setOrigin(0.5))
        }

        const rarityColors: Record<string, number> = { common: 0x9ca3af, rare: 0x3b82f6, epic: 0xa855f7, legendary: 0xf59e0b }
        const rarityTextColors: Record<string, string> = { common: '#9ca3af', rare: '#3b82f6', epic: '#a855f7', legendary: '#f59e0b' }

        const items = this.lastDrawResult.items
        const cols = Math.min(items.length, 5)
        // rows computed implicitly by col/index
        const cardW = 120
        const cardH = 140
        const startX = 512 - (cols * (cardW + 10)) / 2 + cardW / 2

        items.forEach((item, i) => {
            const col = i % cols
            const row = Math.floor(i / cols)
            const cx = startX + col * (cardW + 10)
            const cy = 260 + row * (cardH + 10)

            // Card background
            const cardBg = this.add.rectangle(cx, cy, cardW, cardH, 0x1a1a2e, 0.95)
            this.overlayGroup.add(cardBg)

            // Rarity border
            const borderColor = rarityColors[item.rarity] ?? 0xffffff
            const border = this.add.graphics()
            border.lineStyle(2, borderColor, 1)
            border.strokeRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 6)
            this.overlayGroup.add(border)

            // Rarity glow for epic/legendary
            if (item.rarity === 'epic' || item.rarity === 'legendary') {
                const glow = this.add.rectangle(cx, cy, cardW - 4, cardH - 4, borderColor, 0.1)
                this.overlayGroup.add(glow)
                this.tweens.add({ targets: glow, alpha: 0.2, yoyo: true, repeat: -1, duration: 800 })
            }

            // Item name
            const textColor = rarityTextColors[item.rarity] ?? '#fff'
            this.overlayGroup.add(this.add.text(cx, cy - 30, item.name, { fontSize: '11px', color: textColor, fontStyle: 'bold', align: 'center', wordWrap: { width: cardW - 10 } }).setOrigin(0.5))

            // Rarity
            this.overlayGroup.add(this.add.text(cx, cy + 10, item.rarity.toUpperCase(), { fontSize: '10px', color: textColor }).setOrigin(0.5))

            // Element
            if (item.element) {
                this.overlayGroup.add(this.add.text(cx, cy + 30, item.element, { fontSize: '10px', color: '#888' }).setOrigin(0.5))
            }
        })

        // Pity counter
        this.overlayGroup.add(this.add.text(512, 480, `Pity: ${this.playerData.pityCounter} / 90`, { fontSize: '12px', color: '#888' }).setOrigin(0.5))

        // Continue button
        const contBtn = this.add.text(512, 510, 'Continue', {
            fontSize: '14px', color: '#9370db', backgroundColor: '#222', padding: { x: 16, y: 6 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true })
            .on('pointerdown', () => { this.lastDrawResult = null; this.closeOverlay(); this.openGacha() })
        this.overlayGroup.add(contBtn)

        this.addCloseButton()
    }

    private addCloseButton(): void {
        const btn = this.add.text(790, 155, 'X', { fontSize: '20px', color: '#ff4444', fontStyle: 'bold' })
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.closeOverlay())
        this.overlayGroup.add(btn)
    }

    private clearOverlay(): void {
        this.overlayGroup.clear(true, true)
    }

    private closeOverlay(): void {
        this.clearOverlay()
        this.activeOverlay = 'none'
    }

    // -----------------------------------------------------------------------
    // Run Start
    // -----------------------------------------------------------------------

    private startRun(): void {
        if (this.activeOverlay !== 'none') return
        this.savePlayerData()
        this.scene.start('DungeonScene', {
            playerLevel: this.playerData.level,
            talents: [...this.playerData.talents],
            inventory: [...this.playerData.inventory],
        })
    }

    // -----------------------------------------------------------------------
    // Level Up
    // -----------------------------------------------------------------------

    private checkLevelUp(): void {
        while (this.playerData.xp >= this.playerData.xpToNext) {
            this.playerData.xp -= this.playerData.xpToNext
            this.playerData.level++
            this.playerData.xpToNext = this.playerData.level * 100
            this.playerData.talentPoints++
        }
    }

    // -----------------------------------------------------------------------
    // Persistence (Nakama Storage)
    // -----------------------------------------------------------------------

    private async loadPlayerData(): Promise<void> {
        try {
            const session = getSession()
            if (!session) return
            const result = await nakamaClient.readStorageObjects(session, {
                object_ids: [{ collection: 'player_data', key: 'profile', user_id: session.user_id }],
            })
            if (result.objects && result.objects.length > 0) {
                const saved = JSON.parse(result.objects[0].value as unknown as string) as Partial<PlayerData>
                Object.assign(this.playerData, saved)
            }
        } catch (_err) {
            // First run or offline — use defaults
        }
    }

    private async savePlayerData(): Promise<void> {
        try {
            const session = getSession()
            if (!session) return
            await nakamaClient.writeStorageObjects(session, [
                {
                    collection: 'player_data',
                    key: 'profile',
                    value: JSON.stringify(this.playerData) as unknown as object,
                    permission_read: 1,
                    permission_write: 0,
                },
            ])
        } catch (_err) {
            // Offline — data persists locally for this session
        }
    }
}
