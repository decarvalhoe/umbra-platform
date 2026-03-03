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

type TalentBranch = 'offense' | 'defense' | 'utility'

interface TalentNode {
    id: number
    name: string
    description: string
    cost: number
    requires: number[]
    effect: string
    value: number
    branch: TalentBranch
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
    // ── Offense Branch (left column) ────────────────────────────
    { id: 1,  name: 'Lame Affûtée',      description: '+10% Dégâts d\'Attaque',   cost: 1, requires: [],     effect: 'atk_percent',   value: 10, branch: 'offense', allocated: false },
    { id: 2,  name: 'Œil Perçant',        description: '+5% Chance Critique',      cost: 1, requires: [1],    effect: 'crit_chance',   value: 5,  branch: 'offense', allocated: false },
    { id: 3,  name: 'Combo Implacable',   description: '+15% Dégâts de Combo',     cost: 2, requires: [2],    effect: 'combo_damage',  value: 15, branch: 'offense', allocated: false },
    { id: 4,  name: 'Surtension Arcane',  description: '+20% Dégâts de Compétence',cost: 2, requires: [3],    effect: 'skill_damage',  value: 20, branch: 'offense', allocated: false },
    { id: 5,  name: 'Tempête de Lames',   description: '+25% Vitesse d\'Attaque',  cost: 3, requires: [4],    effect: 'atk_speed',     value: 25, branch: 'offense', allocated: false },

    // ── Defense Branch (center column) ──────────────────────────
    { id: 6,  name: 'Peau de Fer',        description: '+10% Réduction de Dégâts', cost: 1, requires: [],     effect: 'dmg_reduction', value: 10, branch: 'defense', allocated: false },
    { id: 7,  name: 'Fortitude',          description: '+15% PV Max',              cost: 1, requires: [6],    effect: 'hp_percent',    value: 15, branch: 'defense', allocated: false },
    { id: 8,  name: 'Inébranlable',       description: '-30% Durée des CC',        cost: 2, requires: [7],    effect: 'cc_reduction',  value: 30, branch: 'defense', allocated: false },
    { id: 9,  name: 'Égide',              description: 'Bouclier auto 10% PV/30s', cost: 2, requires: [8],    effect: 'auto_shield',   value: 10, branch: 'defense', allocated: false },
    { id: 10, name: 'Bastion Immortel',   description: 'Survie à 1 PV (1x/combat)',cost: 3, requires: [9],    effect: 'death_prevent', value: 1,  branch: 'defense', allocated: false },

    // ── Utility Branch (right column) ───────────────────────────
    { id: 11, name: 'Pas Rapide',         description: '+10% Vitesse de Mouvement',cost: 1, requires: [],     effect: 'move_speed',    value: 10, branch: 'utility', allocated: false },
    { id: 12, name: 'Sens Aiguisés',      description: '+1 Charge de Dodge',       cost: 1, requires: [11],   effect: 'dodge_charge',  value: 1,  branch: 'utility', allocated: false },
    { id: 13, name: 'Débrouillard·e',     description: '+15% Loot et XP',          cost: 2, requires: [12],   effect: 'loot_xp_bonus', value: 15, branch: 'utility', allocated: false },
    { id: 14, name: 'Fortune',            description: '-10% Cooldowns',           cost: 2, requires: [13],   effect: 'cooldown_red',  value: 10, branch: 'utility', allocated: false },
    { id: 15, name: 'Transcendance',      description: 'Compétences élémentaires ×2', cost: 3, requires: [14, 5, 10], effect: 'elemental_x2', value: 2, branch: 'utility', allocated: false },
]

const BRANCH_COLORS: Record<TalentBranch, number> = {
    offense: 0xff6b35,   // Kaelan fire
    defense: 0x00bcd4,   // Ronan void/cyan
    utility: 0xffe135,   // Nyx gold
}

const NODE_POSITIONS = [
    // Offense (left column)
    { x: 280, y: 280 },  // 1 — Lame Affûtée
    { x: 280, y: 350 },  // 2 — Œil Perçant
    { x: 280, y: 420 },  // 3 — Combo Implacable
    { x: 280, y: 490 },  // 4 — Surtension Arcane
    { x: 280, y: 560 },  // 5 — Tempête de Lames

    // Defense (center column)
    { x: 512, y: 280 },  // 6 — Peau de Fer
    { x: 512, y: 350 },  // 7 — Fortitude
    { x: 512, y: 420 },  // 8 — Inébranlable
    { x: 512, y: 490 },  // 9 — Égide
    { x: 512, y: 560 },  // 10 — Bastion Immortel

    // Utility (right column)
    { x: 744, y: 280 },  // 11 — Pas Rapide
    { x: 744, y: 350 },  // 12 — Sens Aiguisés
    { x: 744, y: 420 },  // 13 — Débrouillard·e
    { x: 744, y: 490 },  // 14 — Fortune
    { x: 744, y: 560 },  // 15 — Transcendance (cross-branch capstone)
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

        const bg = this.add.rectangle(512, 384, 900, 520, 0x111111, 0.95).setInteractive()
        this.overlayGroup.add(bg)

        // Title
        this.overlayGroup.add(this.add.text(512, 145, 'ARBRE DE TALENTS', { fontSize: '22px', color: '#b39ddb', fontStyle: 'bold' }).setOrigin(0.5))
        this.overlayGroup.add(this.add.text(512, 172, `Points disponibles: ${this.playerData.talentPoints}`, { fontSize: '14px', color: '#b39ddb' }).setOrigin(0.5))

        // Branch labels
        this.overlayGroup.add(this.add.text(280, 245, '⚔ OFFENSE', { fontSize: '13px', color: '#ff6b35', fontStyle: 'bold' }).setOrigin(0.5))
        this.overlayGroup.add(this.add.text(512, 245, '🛡 DÉFENSE', { fontSize: '13px', color: '#00bcd4', fontStyle: 'bold' }).setOrigin(0.5))
        this.overlayGroup.add(this.add.text(744, 245, '✦ UTILITÉ', { fontSize: '13px', color: '#ffe135', fontStyle: 'bold' }).setOrigin(0.5))

        // Draw connections (prerequisite lines)
        TALENT_NODES.forEach((node) => {
            const toPos = NODE_POSITIONS[node.id - 1]
            node.requires.forEach((reqId) => {
                const fromPos = NODE_POSITIONS[reqId - 1]
                const reqNode = TALENT_NODES.find(n => n.id === reqId)
                const lineColor = reqNode ? BRANCH_COLORS[reqNode.branch] : 0x444444
                const bothAllocated = this.playerData.talents.includes(node.id) && this.playerData.talents.includes(reqId)
                const line = this.add.line(0, 0, fromPos.x, fromPos.y, toPos.x, toPos.y, lineColor).setOrigin(0)
                line.setAlpha(bothAllocated ? 0.6 : 0.15)
                this.overlayGroup.add(line)
            })
        })

        // Draw nodes
        TALENT_NODES.forEach((node, i) => {
            const pos = NODE_POSITIONS[i]
            const allocated = this.playerData.talents.includes(node.id)
            const available = !allocated && this.canAllocate(node)
            const branchColor = BRANCH_COLORS[node.branch]

            const color = allocated ? branchColor : available ? 0xffffff : 0x555555
            const circle = this.add.circle(pos.x, pos.y, 22, color, allocated ? 0.9 : available ? 0.4 : 0.2)
            this.overlayGroup.add(circle)

            // Node cost indicator
            const costColor = allocated ? '#000' : available ? '#fff' : '#666'
            this.overlayGroup.add(this.add.text(pos.x, pos.y - 3, `${node.cost}`, { fontSize: '14px', color: costColor, fontStyle: 'bold' }).setOrigin(0.5))

            // Node name + description
            this.overlayGroup.add(this.add.text(pos.x, pos.y + 28, node.name, { fontSize: '10px', color: allocated ? '#fff' : '#aaa' }).setOrigin(0.5))
            this.overlayGroup.add(this.add.text(pos.x, pos.y + 42, node.description, { fontSize: '8px', color: '#777', wordWrap: { width: 140 } }).setOrigin(0.5))

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
