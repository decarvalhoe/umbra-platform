import { useState, useEffect, useCallback } from 'react'
import './GachaModal.css'
import type {
  SummoningBanner,
  SummonResult,
  ConvergenceState,
  PullHistoryEntry,
  RitualStep,
} from '../types/economy'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface GachaModalProps {
  isOpen: boolean
  onClose: () => void
  pityCounter: number
  onPityUpdate: (newPity: number) => void
}

// ---------------------------------------------------------------------------
// Stub data (TODO: replace with backend API calls)
// ---------------------------------------------------------------------------

const STUB_BANNERS: SummoningBanner[] = [
  {
    id: 'banner_kaelan_focus',
    name: "Kaelan's Fury",
    type: 'companion_focus',
    featuredCompanionIds: ['kaelan'],
    rateUp: { kaelan: 2.0 },
    startDate: '2025-03-01',
    endDate: '2025-03-15',
    bannerColor: '#ff4444',
    bannerIcon: '🔥',
  },
  {
    id: 'banner_nyx_focus',
    name: "Nyx's Shadow",
    type: 'companion_focus',
    featuredCompanionIds: ['nyx'],
    rateUp: { nyx: 2.0 },
    startDate: '2025-03-01',
    endDate: '2025-03-22',
    bannerColor: '#6600cc',
    bannerIcon: '🌑',
  },
  {
    id: 'banner_standard',
    name: 'Standard Void Pool',
    type: 'standard',
    featuredCompanionIds: [],
    rateUp: {},
    startDate: '2025-01-01',
    endDate: '2099-12-31',
    bannerColor: '#444466',
    bannerIcon: '✦',
  },
]

const COMPANION_DATA: Record<string, { name: string; element: string; glyph: string; color: string }> = {
  kaelan: { name: 'Kaelan', element: 'fire', glyph: '⚔', color: '#ff4444' },
  lyra: { name: 'Lyra', element: 'arcane', glyph: '✧', color: '#c88fff' },
  nyx: { name: 'Nyx', element: 'shadow', glyph: '☾', color: '#8855cc' },
  seraphina: { name: 'Seraphina', element: 'healing', glyph: '❋', color: '#66ddaa' },
  vex: { name: "Vex'thar", element: 'void', glyph: '◈', color: '#9900ff' },
  ashara: { name: 'Ashara', element: 'blood', glyph: '♰', color: '#cc0044' },
}

const RARITY_COLORS: Record<number, string> = {
  3: '#3b82f6',  // Blue
  4: '#f59e0b',  // Gold
  5: '#e879f9',  // Prismatic / pink-purple
}

const RARITY_LABELS: Record<number, string> = {
  3: '★★★',
  4: '★★★★',
  5: '★★★★★',
}

const RIFT_COLORS: Record<number, string> = {
  3: '#3b82f6',     // Blue rift
  4: '#f59e0b',     // Gold rift
  5: '#e879f9',     // Prismatic rift
}

// ---------------------------------------------------------------------------
// Stub pull simulation
// ---------------------------------------------------------------------------

function simulatePull(convergence: ConvergenceState, bannerId: string): { result: SummonResult; newConvergence: ConvergenceState } {
  const pull = convergence.pullCount + 1
  let rarity: 3 | 4 | 5 = 3

  // Hard pity at 90
  if (pull >= 90) {
    rarity = 5
  }
  // Soft pity from 70-89
  else if (pull >= 70) {
    const softPityRate = 0.006 + (pull - 70) * 0.06
    if (Math.random() < softPityRate) rarity = 5
    else if (Math.random() < 0.051) rarity = 4
  }
  // Normal rates
  else {
    const r = Math.random()
    if (r < 0.006) rarity = 5
    else if (r < 0.057) rarity = 4
  }

  // Pick companion
  const ids = Object.keys(COMPANION_DATA)
  const banner = STUB_BANNERS.find(b => b.id === bannerId)
  let companionId: string
  let isFeatured = false

  if (rarity === 5 && banner && banner.featuredCompanionIds.length > 0) {
    if (convergence.guaranteedFeatured || Math.random() < 0.5) {
      companionId = banner.featuredCompanionIds[Math.floor(Math.random() * banner.featuredCompanionIds.length)]
      isFeatured = true
    } else {
      companionId = ids[Math.floor(Math.random() * ids.length)]
      isFeatured = banner.featuredCompanionIds.includes(companionId)
    }
  } else {
    companionId = ids[Math.floor(Math.random() * ids.length)]
  }

  const comp = COMPANION_DATA[companionId]

  const newConvergence: ConvergenceState = {
    pullCount: rarity === 5 ? 0 : pull,
    softPityThreshold: 70,
    hardPityThreshold: 90,
    lastFiveStarWasFeatured: rarity === 5 ? isFeatured : convergence.lastFiveStarWasFeatured,
    guaranteedFeatured: rarity === 5 ? !isFeatured : convergence.guaranteedFeatured,
  }

  return {
    result: {
      companionId,
      companionName: comp.name,
      rarity,
      element: comp.element,
      glyph: comp.glyph,
      color: comp.color,
      isNew: Math.random() > 0.6,
      isFeatured,
    },
    newConvergence,
  }
}

// ---------------------------------------------------------------------------
// Ritual animation timing
// ---------------------------------------------------------------------------

const STEP_DURATIONS: Record<RitualStep, number> = {
  offering: 1200,
  rift: 1400,
  silhouette: 1000,
  reveal: 0, // stays until dismissed
}

const STEP_ORDER: RitualStep[] = ['offering', 'rift', 'silhouette', 'reveal']

// ---------------------------------------------------------------------------
// Sub-tabs
// ---------------------------------------------------------------------------

type GachaTab = 'summon' | 'history'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GachaModal({ isOpen, onClose, pityCounter, onPityUpdate }: GachaModalProps) {
  const [tab, setTab] = useState<GachaTab>('summon')
  const [selectedBanner, setSelectedBanner] = useState(STUB_BANNERS[0].id)

  // Convergence state
  const [convergence, setConvergence] = useState<ConvergenceState>({
    pullCount: pityCounter,
    softPityThreshold: 70,
    hardPityThreshold: 90,
    lastFiveStarWasFeatured: false,
    guaranteedFeatured: false,
  })

  // Ritual animation
  const [ritualActive, setRitualActive] = useState(false)
  const [ritualStep, setRitualStep] = useState<RitualStep>('offering')
  const [currentRevealIndex, setCurrentRevealIndex] = useState(0)
  const [pendingResults, setPendingResults] = useState<SummonResult[]>([])
  const [revealedResult, setRevealedResult] = useState<SummonResult | null>(null)

  // Pull history
  const [history, setHistory] = useState<PullHistoryEntry[]>([])

  // Arrival scene (first-time companion)
  const [arrivalScene, setArrivalScene] = useState<{ companionName: string; text: string } | null>(null)

  // Void shards (stub)
  const [voidShards, setVoidShards] = useState(3200)

  // Sync pity counter
  useEffect(() => {
    setConvergence(prev => ({ ...prev, pullCount: pityCounter }))
  }, [pityCounter])

  const advanceRitual = useCallback((results: SummonResult[], index: number) => {
    const result = results[index]
    if (!result) {
      setRitualActive(false)
      return
    }

    setRevealedResult(null)
    setCurrentRevealIndex(index)

    // Step through the ritual
    let stepIdx = 0
    setRitualStep(STEP_ORDER[0])

    const advanceStep = () => {
      stepIdx++
      if (stepIdx < STEP_ORDER.length) {
        setRitualStep(STEP_ORDER[stepIdx])
        if (STEP_ORDER[stepIdx] === 'reveal') {
          setRevealedResult(result)
          // Check for first-time arrival
          if (result.isNew && result.rarity >= 4) {
            setArrivalScene({
              companionName: result.companionName,
              text: `A rift in the void tears open... ${result.companionName} steps through, their ${result.element} essence crackling with power. "So, you're the one who called me here. Interesting."`,
            })
          }
        } else {
          setTimeout(advanceStep, STEP_DURATIONS[STEP_ORDER[stepIdx]])
        }
      }
    }

    setTimeout(advanceStep, STEP_DURATIONS[STEP_ORDER[0]])
  }, [])

  const handleSummon = (count: 1 | 10) => {
    const cost = count === 1 ? 160 : 1600
    if (voidShards < cost) return

    setVoidShards(prev => prev - cost)

    const results: SummonResult[] = []
    let conv = { ...convergence }

    for (let i = 0; i < count; i++) {
      // 10x guarantees 4★+ on final pull
      let { result, newConvergence } = simulatePull(conv, selectedBanner)
      if (count === 10 && i === count - 1 && results.every(r => r.rarity < 4)) {
        while (result.rarity < 4) {
          const retry = simulatePull(conv, selectedBanner)
          result = retry.result
          newConvergence = retry.newConvergence
        }
      }
      results.push(result)
      conv = newConvergence
    }

    setConvergence(conv)
    onPityUpdate(conv.pullCount)
    setPendingResults(results)

    // Add to history
    const newEntries: PullHistoryEntry[] = results.map(r => ({
      companionName: r.companionName,
      rarity: r.rarity,
      element: r.element,
      bannerId: selectedBanner,
      timestamp: new Date().toISOString(),
      isFeatured: r.isFeatured,
    }))
    setHistory(prev => [...newEntries.reverse(), ...prev].slice(0, 50))

    // Start ritual
    setRitualActive(true)
    advanceRitual(results, 0)
  }

  const handleSkipToReveal = () => {
    if (!pendingResults[currentRevealIndex]) return
    setRitualStep('reveal')
    setRevealedResult(pendingResults[currentRevealIndex])
  }

  const handleNextReveal = () => {
    setArrivalScene(null)
    const nextIdx = currentRevealIndex + 1
    if (nextIdx < pendingResults.length) {
      advanceRitual(pendingResults, nextIdx)
    } else {
      setRitualActive(false)
      setPendingResults([])
    }
  }

  const handleSkipAll = () => {
    setArrivalScene(null)
    setRitualActive(false)
    setPendingResults([])
  }

  if (!isOpen) return null

  const activeBanner = STUB_BANNERS.find(b => b.id === selectedBanner)
  const pullsToSoft = Math.max(0, 70 - convergence.pullCount)
  const pullsToHard = Math.max(0, 90 - convergence.pullCount)

  return (
    <div className="vs-overlay">
      <div className="vs-modal">
        {/* Header */}
        <div className="vs-header">
          <h2 className="vs-title">Void Summoning</h2>
          <div className="vs-shards">
            <span className="vs-shard-icon">◈</span>
            <span className="vs-shard-count">{voidShards.toLocaleString()}</span>
          </div>
          <button onClick={onClose} className="vs-close">&times;</button>
        </div>

        {/* Tabs */}
        <div className="vs-tabs">
          <button className={`vs-tab ${tab === 'summon' ? 'active' : ''}`} onClick={() => setTab('summon')}>
            Summon
          </button>
          <button className={`vs-tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
            History ({history.length})
          </button>
        </div>

        {/* Ritual overlay */}
        {ritualActive && (
          <div className="vs-ritual-overlay">
            {arrivalScene ? (
              <div className="vs-arrival-scene">
                <div className="vs-arrival-title">First Encounter</div>
                <div className="vs-arrival-name">{arrivalScene.companionName}</div>
                <p className="vs-arrival-text">{arrivalScene.text}</p>
                <button className="vs-ritual-btn" onClick={() => setArrivalScene(null)}>Continue</button>
              </div>
            ) : (
              <>
                {/* Step: Offering */}
                {ritualStep === 'offering' && (
                  <div className="vs-ritual-step vs-step-offering">
                    <div className="vs-ritual-circle" />
                    <div className="vs-ritual-particles" />
                    <p className="vs-step-label">The Offering...</p>
                  </div>
                )}

                {/* Step: Rift */}
                {ritualStep === 'rift' && (
                  <div
                    className="vs-ritual-step vs-step-rift"
                    style={{ '--rift-color': RIFT_COLORS[pendingResults[currentRevealIndex]?.rarity ?? 3] } as React.CSSProperties}
                  >
                    <div className="vs-rift-portal" />
                    <p className="vs-step-label">The Rift Opens...</p>
                  </div>
                )}

                {/* Step: Silhouette */}
                {ritualStep === 'silhouette' && (
                  <div className="vs-ritual-step vs-step-silhouette">
                    <div
                      className="vs-silhouette-figure"
                      style={{ color: pendingResults[currentRevealIndex]?.color ?? '#666' }}
                    >
                      {pendingResults[currentRevealIndex]?.glyph ?? '?'}
                    </div>
                    <p className="vs-step-label">A presence emerges...</p>
                  </div>
                )}

                {/* Step: Reveal */}
                {ritualStep === 'reveal' && revealedResult && (
                  <div className="vs-ritual-step vs-step-reveal">
                    <div
                      className="vs-reveal-card"
                      style={{
                        borderColor: RARITY_COLORS[revealedResult.rarity],
                        boxShadow: `0 0 40px ${RARITY_COLORS[revealedResult.rarity]}66`,
                      }}
                    >
                      <div className="vs-reveal-glyph" style={{ color: revealedResult.color }}>
                        {revealedResult.glyph}
                      </div>
                      <div className="vs-reveal-name">{revealedResult.companionName}</div>
                      <div className="vs-reveal-rarity" style={{ color: RARITY_COLORS[revealedResult.rarity] }}>
                        {RARITY_LABELS[revealedResult.rarity]}
                      </div>
                      <div className="vs-reveal-element">{revealedResult.element}</div>
                      {revealedResult.isNew && <div className="vs-reveal-new">NEW!</div>}
                      {revealedResult.isFeatured && <div className="vs-reveal-featured">FEATURED</div>}
                    </div>
                    <div className="vs-reveal-actions">
                      <button className="vs-ritual-btn" onClick={handleNextReveal}>
                        {currentRevealIndex < pendingResults.length - 1 ? 'Next' : 'Done'}
                      </button>
                      {pendingResults.length > 1 && currentRevealIndex < pendingResults.length - 1 && (
                        <button className="vs-ritual-btn vs-skip-btn" onClick={handleSkipAll}>
                          Skip All
                        </button>
                      )}
                    </div>
                    <div className="vs-reveal-counter">
                      {currentRevealIndex + 1} / {pendingResults.length}
                    </div>
                  </div>
                )}

                {/* Skip button during animation steps */}
                {ritualStep !== 'reveal' && (
                  <button className="vs-ritual-skip" onClick={handleSkipToReveal}>
                    Skip ▸
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* Tab content */}
        {tab === 'summon' && !ritualActive && (
          <div className="vs-summon-content">
            {/* Banner carousel */}
            <div className="vs-banners">
              {STUB_BANNERS.map(banner => {
                const endDate = new Date(banner.endDate)
                const now = new Date()
                const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / 86400000))

                return (
                  <button
                    key={banner.id}
                    className={`vs-banner-card ${selectedBanner === banner.id ? 'active' : ''}`}
                    style={{ '--banner-color': banner.bannerColor } as React.CSSProperties}
                    onClick={() => setSelectedBanner(banner.id)}
                  >
                    <span className="vs-banner-icon">{banner.bannerIcon}</span>
                    <span className="vs-banner-name">{banner.name}</span>
                    {banner.type !== 'standard' && (
                      <span className="vs-banner-timer">{daysLeft}d left</span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Banner info */}
            {activeBanner && (
              <div className="vs-banner-info">
                <div className="vs-banner-detail">
                  {activeBanner.featuredCompanionIds.length > 0 && (
                    <span className="vs-featured-label">
                      Featured: {activeBanner.featuredCompanionIds.map(id =>
                        COMPANION_DATA[id]?.name ?? id
                      ).join(', ')}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Convergence pity display */}
            <div className="vs-convergence">
              <div className="vs-convergence-header">Convergence</div>
              <div className="vs-convergence-bar">
                <div
                  className="vs-convergence-fill"
                  style={{ width: `${(convergence.pullCount / 90) * 100}%` }}
                />
                <div className="vs-convergence-soft" style={{ left: `${(70 / 90) * 100}%` }} />
              </div>
              <div className="vs-convergence-stats">
                <span>Pulls: {convergence.pullCount}/90</span>
                <span>Soft pity in {pullsToSoft}</span>
                <span>Hard pity in {pullsToHard}</span>
              </div>
              {convergence.guaranteedFeatured && (
                <div className="vs-convergence-guaranteed">Next 5★ is guaranteed featured!</div>
              )}
            </div>

            {/* Summon buttons */}
            <div className="vs-summon-actions">
              <button
                className="vs-summon-btn vs-single"
                onClick={() => handleSummon(1)}
                disabled={voidShards < 160}
              >
                <span className="vs-btn-label">Summon x1</span>
                <span className="vs-btn-cost">◈ 160</span>
              </button>
              <button
                className="vs-summon-btn vs-multi"
                onClick={() => handleSummon(10)}
                disabled={voidShards < 1600}
              >
                <span className="vs-btn-label">Summon x10</span>
                <span className="vs-btn-cost">◈ 1,600</span>
              </button>
            </div>
          </div>
        )}

        {/* History tab */}
        {tab === 'history' && !ritualActive && (
          <div className="vs-history-content">
            {history.length === 0 ? (
              <p className="vs-empty">No summons yet. The Void awaits.</p>
            ) : (
              <div className="vs-history-list">
                {history.map((entry, idx) => (
                  <div key={idx} className="vs-history-entry" style={{ borderLeftColor: RARITY_COLORS[entry.rarity] }}>
                    <span className="vs-history-name">{entry.companionName}</span>
                    <span className="vs-history-rarity" style={{ color: RARITY_COLORS[entry.rarity] }}>
                      {RARITY_LABELS[entry.rarity]}
                    </span>
                    <span className="vs-history-element">{entry.element}</span>
                    {entry.isFeatured && <span className="vs-history-featured">FEATURED</span>}
                    <span className="vs-history-time">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
