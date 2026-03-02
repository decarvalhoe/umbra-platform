import Phaser from 'phaser'
import { PauseMenu } from '../ui/PauseMenu'
import { audioManager } from '../audio/AudioManager'
import { DungeonGenerator, DungeonGraph, DungeonNode } from '../dungeon/DungeonGenerator'
import { RuneInventory, selectRuneCards, RuneCard } from '../dungeon/RuneCardSystem'
import { generateDungeon as fetchAIDungeon } from '../../services/ai-director'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DungeonSceneData {
    playerLevel: number
    talents: number[]
    inventory: string[]
    floor?: number
    seed?: string
}


interface CombatResult {
    victory: boolean
    nodeId: number
    xpEarned: number
    cendresEarned: number
}

interface DungeonRestoreState {
    seed: string
    floor: number
    currentNodeId: number
    roomsCleared: number
    visitedNodes: number[]
    clearedNodes: number[]
    activeRunes: RuneCard[]
    playerData: DungeonSceneData
    totalXpEarned: number
    totalCendresEarned: number
}
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAP_MARGIN = 40
const MAP_WIDTH = 240
const MAP_HEIGHT = 400
const NODE_RADIUS = 12
const ROOM_TRANSITION_MS = 600

// Color palette
const COLORS = {
    bg: 0x0f0f1a,
    mapBg: 0x1a1a2e,
    start: 0x4488ff,
    combat: 0xcc4444,
    elite: 0xff8800,
    treasure: 0xffd700,
    event: 0x9370db,
    rest: 0x44cc88,
    boss: 0xff2222,
    visited: 0x666666,
    current: 0x00ffaa,
    connection: 0x333355,
    connectionActive: 0x6644cc,
}

// ---------------------------------------------------------------------------
// DungeonScene
// ---------------------------------------------------------------------------

export class DungeonScene extends Phaser.Scene {
  private pauseMenu!: PauseMenu
    private dungeon!: DungeonGraph
    private currentNodeId: number = 0
    private runeInventory: RuneInventory = new RuneInventory()
    private playerData!: DungeonSceneData
    private floor: number = 1
    private roomsCleared: number = 0

    // Accumulated run rewards
    private totalXpEarned: number = 0
    private totalCendresEarned: number = 0

    // Pending combat result
    private pendingCombatResult?: CombatResult
    private pendingRestoreState?: DungeonRestoreState

    // Graphics
    private mapGraphics!: Phaser.GameObjects.Graphics
    private roomInfoGroup!: Phaser.GameObjects.Group
    private runeOverlayGroup!: Phaser.GameObjects.Group
    private hudGroup!: Phaser.GameObjects.Group
    private showingRuneCards: boolean = false

    // RNG for rune cards (shared seed)
    private rng!: () => number

    constructor() {
        super({ key: 'DungeonScene' })
    }

    // -----------------------------------------------------------------------
    // Lifecycle
    // -----------------------------------------------------------------------

    init(data: DungeonSceneData & { combatResult?: CombatResult; restoreState?: DungeonRestoreState }): void {
        if (data.restoreState && data.combatResult) {
            const state = data.restoreState
            this.playerData = state.playerData
            this.floor = state.floor
            this.roomsCleared = state.roomsCleared
            this.totalXpEarned = state.totalXpEarned
            this.totalCendresEarned = state.totalCendresEarned
            this.pendingCombatResult = data.combatResult
            this.pendingRestoreState = state
        } else {
            this.playerData = {
                playerLevel: data.playerLevel ?? 1,
                talents: data.talents ?? [],
                inventory: data.inventory ?? [],
                floor: data.floor ?? 1,
                seed: data.seed ?? 'run_' + Date.now(),
            }
            this.floor = this.playerData.floor!
            this.roomsCleared = 0
            this.totalXpEarned = 0
            this.totalCendresEarned = 0
            this.runeInventory.reset()
            this.pendingCombatResult = undefined
            this.pendingRestoreState = undefined
        }
    }

    update(): void {
    this.pauseMenu.update()
    if (this.pauseMenu.paused) return
  }

  create(): void {
    // Pause menu
    this.pauseMenu = new PauseMenu({
      scene: this,
      onResume: () => { /* resumed */ },
      onAbandon: () => {
        this.scene.start('HubScene', {
          xpEarned: (this as unknown as { totalXpEarned?: number }).totalXpEarned ?? 0,
          cendresEarned: (this as unknown as { totalCendresEarned?: number }).totalCendresEarned ?? 0,
        })
      },
      onQuit: () => {
        this.scene.start('HubScene')
      },
    })

    audioManager.crossFadeTo('dungeon')
        this.cameras.main.setBackgroundColor(COLORS.bg)
        this.mapGraphics = this.add.graphics()
        this.roomInfoGroup = this.add.group()
        this.runeOverlayGroup = this.add.group()
        this.hudGroup = this.add.group()

        // Generate dungeon
        const generator = new DungeonGenerator()
        this.dungeon = generator.generateDungeon(this.playerData.seed!, this.floor)
        this.currentNodeId = 0

        // Create seeded RNG for rune card draws
        this.rng = this.createRng(this.playerData.seed! + '_runes')

        // Restore state if returning from combat
        if (this.pendingRestoreState) {
            this.restoreDungeonState(this.pendingRestoreState)
        }

        // Try fetching AI-enhanced layout (non-blocking)
        this.fetchAILayout()

        // Draw initial state
        this.drawMap()
        this.drawHUD()
        this.drawRoomInfo(this.dungeon.nodes[this.currentNodeId])

        // Handle pending combat result after scene is drawn
        if (this.pendingCombatResult) {
            this.time.delayedCall(300, () => {
                this.handleCombatResult(this.pendingCombatResult!)
                this.pendingCombatResult = undefined
                this.pendingRestoreState = undefined
            })
        }
    }


    // -----------------------------------------------------------------------
    // State save / restore
    // -----------------------------------------------------------------------

    private saveDungeonState(combatNodeId: number): void {
        const state: DungeonRestoreState = {
            seed: this.playerData.seed!,
            floor: this.floor,
            currentNodeId: combatNodeId,
            roomsCleared: this.roomsCleared,
            visitedNodes: this.dungeon.nodes.filter(n => n.visited).map(n => n.id),
            clearedNodes: this.dungeon.nodes.filter(n => n.cleared).map(n => n.id),
            activeRunes: [...this.runeInventory.getActiveRunes()],
            playerData: { ...this.playerData },
            totalXpEarned: this.totalXpEarned,
            totalCendresEarned: this.totalCendresEarned,
        }
        this.game.registry.set('dungeonState', state)
    }

    private restoreDungeonState(state: DungeonRestoreState): void {
        this.currentNodeId = state.currentNodeId
        for (const node of this.dungeon.nodes) {
            if (state.visitedNodes.includes(node.id)) node.visited = true
            if (state.clearedNodes.includes(node.id)) node.cleared = true
        }
        this.runeInventory.reset()
        for (const rune of state.activeRunes) {
            this.runeInventory.addRune(rune)
        }
        for (let i = 0; i < state.activeRunes.length * 2; i++) {
            this.rng()
        }
    }

    private handleCombatResult(result: CombatResult): void {
        this.totalXpEarned += result.xpEarned
        this.totalCendresEarned += result.cendresEarned

        if (result.victory) {
            const node = this.dungeon.nodes.find(n => n.id === result.nodeId)
            if (node) {
                node.cleared = true
                node.visited = true
                this.roomsCleared++
            }
            if (node && node.type === 'boss') {
                this.scene.start('HubScene', {
                    xpEarned: this.totalXpEarned,
                    cendresEarned: this.totalCendresEarned,
                })
                return
            }
            this.drawMap()
            this.drawHUD()
            if (node) this.drawRoomInfo(node)
            if (node && node.type === 'elite') {
                this.time.delayedCall(500, () => this.showRuneCardSelection())
            }
        } else {
            this.scene.start('HubScene', {
                xpEarned: this.totalXpEarned,
                cendresEarned: this.totalCendresEarned,
            })
        }
    }

    // -----------------------------------------------------------------------
    // AI Director integration
    // -----------------------------------------------------------------------

    private async fetchAILayout(): Promise<void> {
        try {
            const aiLayout = await fetchAIDungeon(
                this.floor,
                this.dungeon.totalCorruption,
                this.playerData.playerLevel,
            )
            // AI can enhance corruption effects and narrative
            if (aiLayout.corruptionEffects?.length > 0) {
                this.applyCorruptionEffects(aiLayout.corruptionEffects)
            }
        } catch {
            // AI director unavailable — proceed with local generation
        }
    }

    private applyCorruptionEffects(effects: string[]): void {
        // Apply the first effect as a visual cue
        if (effects.length > 0) {
            const effectText = this.add.text(
                this.scale.width / 2, 50,
                effects[0],
                { fontSize: '12px', color: '#9370db', fontStyle: 'italic' },
            ).setOrigin(0.5).setAlpha(0.8)
            this.hudGroup.add(effectText)
        }
    }

    // -----------------------------------------------------------------------
    // Minimap rendering
    // -----------------------------------------------------------------------

    private drawMap(): void {
        this.mapGraphics.clear()

        const mapX = this.scale.width - MAP_WIDTH - MAP_MARGIN
        const mapY = MAP_MARGIN

        // Map background
        this.mapGraphics.fillStyle(COLORS.mapBg, 0.85)
        this.mapGraphics.fillRoundedRect(mapX, mapY, MAP_WIDTH, MAP_HEIGHT, 8)
        this.mapGraphics.lineStyle(1, 0x444466, 0.6)
        this.mapGraphics.strokeRoundedRect(mapX, mapY, MAP_WIDTH, MAP_HEIGHT, 8)

        // Title
        this.add.text(mapX + MAP_WIDTH / 2, mapY + 12, `Floor ${this.floor}`, {
            fontSize: '13px', color: '#aaa', fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(10)

        const maxDepth = Math.max(...this.dungeon.nodes.map(n => n.depth))
        const innerPadding = 20

        // Draw connections
        this.mapGraphics.lineStyle(2, COLORS.connection, 0.5)
        for (const node of this.dungeon.nodes) {
            const fromPos = this.getMapNodePos(node, mapX, mapY, innerPadding, maxDepth)
            for (const connId of node.connections) {
                const targetNode = this.dungeon.nodes.find(n => n.id === connId)
                if (!targetNode) continue
                const toPos = this.getMapNodePos(targetNode, mapX, mapY, innerPadding, maxDepth)

                const isActive = node.visited && this.isReachable(connId)
                this.mapGraphics.lineStyle(2, isActive ? COLORS.connectionActive : COLORS.connection, isActive ? 0.8 : 0.4)
                this.mapGraphics.lineBetween(fromPos.x, fromPos.y, toPos.x, toPos.y)
            }
        }

        // Draw nodes
        for (const node of this.dungeon.nodes) {
            const pos = this.getMapNodePos(node, mapX, mapY, innerPadding, maxDepth)
            const isCurrent = node.id === this.currentNodeId
            const isReachable = this.isReachable(node.id)

            let color = this.getNodeColor(node.type)
            let alpha = 0.4

            if (isCurrent) {
                color = COLORS.current
                alpha = 1
            } else if (node.visited) {
                color = COLORS.visited
                alpha = 0.6
            } else if (isReachable) {
                alpha = 0.9
            }

            this.mapGraphics.fillStyle(color, alpha)
            this.mapGraphics.fillCircle(pos.x, pos.y, isCurrent ? NODE_RADIUS + 2 : NODE_RADIUS)

            if (isCurrent) {
                this.mapGraphics.lineStyle(2, 0xffffff, 0.8)
                this.mapGraphics.strokeCircle(pos.x, pos.y, NODE_RADIUS + 4)
            }

            // Make reachable nodes clickable
            if (isReachable && !isCurrent) {
                const hitArea = this.add.circle(pos.x, pos.y, NODE_RADIUS + 4)
                    .setInteractive({ useHandCursor: true })
                    .setAlpha(0.01)
                    .on('pointerdown', () => this.moveToNode(node))
                this.roomInfoGroup.add(hitArea)
            }
        }
    }

    private getMapNodePos(
        node: DungeonNode,
        mapX: number,
        mapY: number,
        padding: number,
        maxDepth: number,
    ): { x: number; y: number } {
        const headerOffset = 28
        const usableHeight = MAP_HEIGHT - headerOffset - padding * 2
        const usableWidth = MAP_WIDTH - padding * 2

        return {
            x: mapX + padding + node.x * usableWidth,
            y: mapY + headerOffset + padding + (node.depth / Math.max(1, maxDepth)) * usableHeight,
        }
    }

    private getNodeColor(type: string): number {
        return (COLORS as Record<string, number>)[type] ?? COLORS.combat
    }

    // -----------------------------------------------------------------------
    // Room info panel
    // -----------------------------------------------------------------------

    private drawRoomInfo(node: DungeonNode): void {
        // Clear previous
        this.roomInfoGroup.clear(true, true)

        const panelX = MAP_MARGIN
        const panelY = MAP_MARGIN
        const panelW = 350
        const panelH = 180

        // Panel background
        const bg = this.add.graphics()
        bg.fillStyle(0x1a1a2e, 0.9)
        bg.fillRoundedRect(panelX, panelY, panelW, panelH, 8)
        bg.lineStyle(1, 0x444466, 0.5)
        bg.strokeRoundedRect(panelX, panelY, panelW, panelH, 8)
        this.roomInfoGroup.add(bg)

        const typeLabel = node.type.toUpperCase()
        const typeColor = `#${this.getNodeColor(node.type).toString(16).padStart(6, '0')}`

        this.roomInfoGroup.add(this.add.text(panelX + 16, panelY + 12, typeLabel, {
            fontSize: '18px', color: typeColor, fontStyle: 'bold',
        }))

        this.roomInfoGroup.add(this.add.text(panelX + 16, panelY + 40, node.template.id.replace(/_/g, ' '), {
            fontSize: '14px', color: '#ccc',
        }))

        const corruptionColor = node.corruption > 15 ? '#ff4444' : node.corruption > 5 ? '#ffaa44' : '#888'
        this.roomInfoGroup.add(this.add.text(panelX + 16, panelY + 65, `Corruption: ${node.corruption}`, {
            fontSize: '13px', color: corruptionColor,
        }))

        // Enemy info for combat/elite rooms
        if ((node.type === 'combat' || node.type === 'elite') && node.template.enemySlots.length > 0) {
            const enemies = node.template.enemySlots.map(s => `${s.count}x ${s.enemyType.replace(/_/g, ' ')}`).join(', ')
            this.roomInfoGroup.add(this.add.text(panelX + 16, panelY + 88, `Enemies: ${enemies}`, {
                fontSize: '12px', color: '#cc8888',
            }))
        }

        // Show connections
        const nextRooms = node.connections.map(id => {
            const n = this.dungeon.nodes.find(nd => nd.id === id)
            return n ? n.type : '?'
        }).join(', ')
        if (nextRooms) {
            this.roomInfoGroup.add(this.add.text(panelX + 16, panelY + 115, `Paths: ${nextRooms}`, {
                fontSize: '12px', color: '#888',
            }))
        }

        // Action button
        if (node.id === this.currentNodeId && !node.cleared && node.type !== 'start') {
            const btn = this.add.text(panelX + 16, panelY + 142, '[ ENTER ROOM ]', {
                fontSize: '15px', color: '#00ffaa', fontStyle: 'bold',
            }).setInteractive({ useHandCursor: true })
                .on('pointerdown', () => this.enterRoom(node))
            this.roomInfoGroup.add(btn)
        } else if (node.cleared) {
            this.roomInfoGroup.add(this.add.text(panelX + 16, panelY + 142, 'CLEARED', {
                fontSize: '15px', color: '#666',
            }))
        }
    }

    // -----------------------------------------------------------------------
    // HUD
    // -----------------------------------------------------------------------

    private drawHUD(): void {
        this.hudGroup.clear(true, true)

        const y = this.scale.height - 50

        // Active runes display
        const runes = this.runeInventory.getActiveRunes()
        if (runes.length > 0) {
            const runeLabel = `Runes: ${runes.map(r => r.name).join(' | ')}`
            this.hudGroup.add(this.add.text(MAP_MARGIN, y, runeLabel, {
                fontSize: '12px', color: '#9370db',
            }))
        }

        // Corruption meter
        const corruption = this.runeInventory.getCorruption() + this.dungeon.totalCorruption
        const corruptionColor = corruption > 50 ? '#ff4444' : corruption > 25 ? '#ffaa44' : '#888'
        this.hudGroup.add(this.add.text(MAP_MARGIN, y + 18, `Total Corruption: ${corruption}%`, {
            fontSize: '12px', color: corruptionColor,
        }))

        // Rooms cleared
        this.hudGroup.add(this.add.text(this.scale.width / 2, y + 8, `Rooms: ${this.roomsCleared} | Floor: ${this.floor}`, {
            fontSize: '14px', color: '#aaa',
        }).setOrigin(0.5))

        // Back to hub button
        const backBtn = this.add.text(this.scale.width - MAP_MARGIN, y + 8, '[ ABANDON RUN ]', {
            fontSize: '13px', color: '#ff4444',
        }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.abandonRun())
        this.hudGroup.add(backBtn)
    }

    // -----------------------------------------------------------------------
    // Navigation
    // -----------------------------------------------------------------------

    private isReachable(nodeId: number): boolean {
        const currentNode = this.dungeon.nodes[this.currentNodeId]
        return currentNode.connections.includes(nodeId)
    }

    private moveToNode(node: DungeonNode): void {
        if (this.showingRuneCards) return
        if (!this.isReachable(node.id)) return

        // Transition effect
        this.cameras.main.fadeOut(ROOM_TRANSITION_MS / 2, 0, 0, 0)
        this.time.delayedCall(ROOM_TRANSITION_MS / 2, () => {
            this.currentNodeId = node.id
            node.visited = true
            this.drawMap()
            this.drawRoomInfo(node)
            this.drawHUD()
            this.cameras.main.fadeIn(ROOM_TRANSITION_MS / 2, 0, 0, 0)
        })
    }

    private enterRoom(node: DungeonNode): void {
        if (node.type === 'combat' || node.type === 'elite' || node.type === 'boss') {
            // Save dungeon state before transitioning to combat
            this.saveDungeonState(node.id)

            this.scene.start('CombatScene', {
                playerLevel: this.playerData.playerLevel,
                talents: this.playerData.talents,
                inventory: this.playerData.inventory,
                dungeonContext: {
                    floor: this.floor,
                    roomType: node.type,
                    corruption: node.corruption,
                    nodeId: node.id,
                    runeBuffs: this.runeInventory.getActiveRunes().map(r => ({
                        stat: r.effect.stat,
                        value: r.effect.value,
                        type: r.effect.type,
                    })),
                },
            })
        } else if (node.type === 'treasure') {
            // Mark cleared and offer rune cards
            node.cleared = true
            this.roomsCleared++
            this.showRuneCardSelection()
        } else if (node.type === 'rest') {
            // Heal & mark cleared
            node.cleared = true
            this.roomsCleared++
            this.drawRoomInfo(node)
            this.drawHUD()
        } else if (node.type === 'event') {
            // Random event — simplified to rune card offer
            node.cleared = true
            this.roomsCleared++
            this.showRuneCardSelection()
        }
    }

    // -----------------------------------------------------------------------
    // Rune card selection overlay
    // -----------------------------------------------------------------------

    private showRuneCardSelection(): void {
        this.showingRuneCards = true
        this.runeOverlayGroup.clear(true, true)

        const { width, height } = this.scale

        // Backdrop
        const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8)
            .setInteractive()
        this.runeOverlayGroup.add(bg)

        this.runeOverlayGroup.add(
            this.add.text(width / 2, 60, 'CHOOSE A RUNE', {
                fontSize: '24px', color: '#ffd700', fontStyle: 'bold',
            }).setOrigin(0.5)
        )

        // Get 3 cards
        const existingIds = this.runeInventory.getActiveRunes().map(r => r.id)
        const cards = selectRuneCards(this.rng, this.dungeon.totalCorruption, 3, existingIds)

        const cardWidth = 200
        const cardHeight = 260
        const spacing = 30
        const totalWidth = cards.length * cardWidth + (cards.length - 1) * spacing
        const startX = (width - totalWidth) / 2

        cards.forEach((card, i) => {
            const cx = startX + i * (cardWidth + spacing) + cardWidth / 2
            const cy = height / 2

            this.drawRuneCard(cx, cy, cardWidth, cardHeight, card)
        })

        // Skip button
        const skipBtn = this.add.text(width / 2, height - 60, '[ SKIP ]', {
            fontSize: '16px', color: '#888',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.closeRuneSelection())
        this.runeOverlayGroup.add(skipBtn)
    }

    private drawRuneCard(
        cx: number,
        cy: number,
        w: number,
        h: number,
        card: RuneCard,
    ): void {
        const rarityColors: Record<string, number> = {
            common: 0x888888,
            rare: 0x4488ff,
            legendary: 0xffd700,
        }

        const borderColor = rarityColors[card.rarity] ?? 0x888888

        // Card background
        const cardBg = this.add.graphics()
        cardBg.fillStyle(0x1a1a2e, 0.95)
        cardBg.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 10)
        cardBg.lineStyle(2, borderColor, 0.9)
        cardBg.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, 10)
        this.runeOverlayGroup.add(cardBg)

        // Rarity tag
        this.runeOverlayGroup.add(
            this.add.text(cx, cy - h / 2 + 20, card.rarity.toUpperCase(), {
                fontSize: '10px', color: `#${borderColor.toString(16).padStart(6, '0')}`,
            }).setOrigin(0.5)
        )

        // Category icon
        const categoryIcons: Record<string, string> = {
            offense: 'ATK', defense: 'DEF', utility: 'UTL', corruption: 'COR',
        }
        this.runeOverlayGroup.add(
            this.add.text(cx, cy - h / 2 + 45, categoryIcons[card.category] ?? '?', {
                fontSize: '24px', color: '#fff', fontStyle: 'bold',
            }).setOrigin(0.5)
        )

        // Name
        this.runeOverlayGroup.add(
            this.add.text(cx, cy + 10, card.name, {
                fontSize: '14px', color: '#fff', fontStyle: 'bold', align: 'center',
                wordWrap: { width: w - 20 },
            }).setOrigin(0.5)
        )

        // Description
        this.runeOverlayGroup.add(
            this.add.text(cx, cy + 40, card.description, {
                fontSize: '12px', color: '#aaa', align: 'center',
                wordWrap: { width: w - 20 },
            }).setOrigin(0.5)
        )

        // Corruption cost
        if (card.corruptionCost > 0) {
            this.runeOverlayGroup.add(
                this.add.text(cx, cy + h / 2 - 40, `+${card.corruptionCost} Corruption`, {
                    fontSize: '11px', color: '#ff4444',
                }).setOrigin(0.5)
            )
        }

        // Click to select
        const hitArea = this.add.rectangle(cx, cy, w, h)
            .setInteractive({ useHandCursor: true })
            .setAlpha(0.01)
            .on('pointerover', () => {
                cardBg.clear()
                cardBg.fillStyle(0x2a2a3e, 0.95)
                cardBg.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 10)
                cardBg.lineStyle(3, borderColor, 1)
                cardBg.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, 10)
            })
            .on('pointerout', () => {
                cardBg.clear()
                cardBg.fillStyle(0x1a1a2e, 0.95)
                cardBg.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 10)
                cardBg.lineStyle(2, borderColor, 0.9)
                cardBg.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, 10)
            })
            .on('pointerdown', () => this.selectRuneCard(card))
        this.runeOverlayGroup.add(hitArea)
    }

    private selectRuneCard(card: RuneCard): void {
        this.runeInventory.addRune(card)
        this.closeRuneSelection()
    }

    private closeRuneSelection(): void {
        this.showingRuneCards = false
        this.runeOverlayGroup.clear(true, true)
        this.drawMap()
        this.drawHUD()
    }

    // -----------------------------------------------------------------------
    // Run management
    // -----------------------------------------------------------------------

    private abandonRun(): void {
        this.scene.start('HubScene', {
            xpEarned: this.totalXpEarned + this.roomsCleared * 15,
            cendresEarned: this.totalCendresEarned + this.roomsCleared * 10,
        })
    }

    // -----------------------------------------------------------------------
    // Seeded RNG helper
    // -----------------------------------------------------------------------

    private createRng(seed: string): () => number {
        let h = 0
        for (let i = 0; i < seed.length; i++) {
            h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0
        }
        let s = h >>> 0
        return () => {
            s = (s + 0x6d2b79f5) | 0
            let t = Math.imul(s ^ (s >>> 15), 1 | s)
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296
        }
    }
}
