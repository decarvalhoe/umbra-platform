/**
 * AudioManager — centralized audio system for Umbra.
 *
 * Generates procedural SFX using Web Audio API (no external audio files needed)
 * and manages music/sfx volume, scene-based music transitions, and mute state.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SfxId =
  | 'attack_swing' | 'dodge_whoosh' | 'hurt_grunt' | 'death'
  | 'enemy_alert' | 'enemy_attack' | 'enemy_hurt' | 'enemy_death'
  | 'boss_slam' | 'boss_bolt' | 'boss_wave' | 'boss_phase'
  | 'ui_click' | 'ui_purchase' | 'ui_talent' | 'ui_rune_select'

export type MusicId = 'hub' | 'dungeon' | 'combat' | 'boss'

// ---------------------------------------------------------------------------
// Procedural SFX definitions
// ---------------------------------------------------------------------------

interface SfxDef {
  type: OscillatorType
  freq: number
  endFreq?: number
  duration: number
  gain: number
  noise?: boolean
}

const SFX_DEFS: Record<SfxId, SfxDef> = {
  // Player
  attack_swing:  { type: 'sawtooth', freq: 200, endFreq: 100, duration: 0.12, gain: 0.25 },
  dodge_whoosh:  { type: 'sine',     freq: 400, endFreq: 100, duration: 0.2,  gain: 0.15, noise: true },
  hurt_grunt:    { type: 'square',   freq: 150, endFreq: 80,  duration: 0.15, gain: 0.3 },
  death:         { type: 'sawtooth', freq: 300, endFreq: 40,  duration: 0.6,  gain: 0.35 },
  // Enemy
  enemy_alert:   { type: 'sine',     freq: 600, endFreq: 800, duration: 0.15, gain: 0.12 },
  enemy_attack:  { type: 'square',   freq: 180, endFreq: 100, duration: 0.1,  gain: 0.2 },
  enemy_hurt:    { type: 'triangle', freq: 250, endFreq: 120, duration: 0.1,  gain: 0.18 },
  enemy_death:   { type: 'sawtooth', freq: 200, endFreq: 30,  duration: 0.4,  gain: 0.2 },
  // Boss
  boss_slam:     { type: 'sine',     freq: 80,  endFreq: 30,  duration: 0.5,  gain: 0.4, noise: true },
  boss_bolt:     { type: 'sawtooth', freq: 500, endFreq: 200, duration: 0.3,  gain: 0.25 },
  boss_wave:     { type: 'sine',     freq: 100, endFreq: 300, duration: 0.6,  gain: 0.3 },
  boss_phase:    { type: 'square',   freq: 600, endFreq: 100, duration: 0.8,  gain: 0.35 },
  // UI
  ui_click:      { type: 'sine',     freq: 800, endFreq: 600, duration: 0.05, gain: 0.1 },
  ui_purchase:   { type: 'sine',     freq: 500, endFreq: 900, duration: 0.15, gain: 0.15 },
  ui_talent:     { type: 'triangle', freq: 400, endFreq: 700, duration: 0.2,  gain: 0.15 },
  ui_rune_select:{ type: 'sine',     freq: 300, endFreq: 600, duration: 0.25, gain: 0.12 },
}

// ---------------------------------------------------------------------------
// Procedural music note sequences
// ---------------------------------------------------------------------------

interface MusicDef {
  bpm: number
  notes: number[]       // frequencies (Hz), 0 = rest
  type: OscillatorType
  gain: number
  bassNotes?: number[]  // optional bass line
}

const MUSIC_DEFS: Record<MusicId, MusicDef> = {
  hub: {
    bpm: 80,
    notes: [261, 0, 329, 0, 392, 0, 329, 0, 261, 0, 220, 0, 261, 0, 0, 0],
    type: 'sine',
    gain: 0.08,
    bassNotes: [130, 0, 0, 0, 165, 0, 0, 0, 110, 0, 0, 0, 130, 0, 0, 0],
  },
  dungeon: {
    bpm: 90,
    notes: [196, 0, 220, 0, 196, 0, 174, 0, 164, 0, 174, 0, 196, 0, 0, 0],
    type: 'triangle',
    gain: 0.07,
    bassNotes: [98, 0, 0, 0, 87, 0, 0, 0, 82, 0, 0, 0, 98, 0, 0, 0],
  },
  combat: {
    bpm: 140,
    notes: [329, 392, 440, 392, 329, 261, 293, 329, 392, 440, 523, 440, 392, 329, 261, 293],
    type: 'sawtooth',
    gain: 0.06,
    bassNotes: [130, 0, 165, 0, 196, 0, 165, 0, 130, 0, 110, 0, 130, 0, 165, 0],
  },
  boss: {
    bpm: 130,
    notes: [196, 233, 261, 293, 261, 233, 196, 174, 196, 261, 329, 293, 261, 233, 196, 0],
    type: 'square',
    gain: 0.05,
    bassNotes: [65, 0, 82, 0, 98, 0, 82, 0, 65, 0, 58, 0, 65, 0, 82, 0],
  },
}

// ---------------------------------------------------------------------------
// AudioManager singleton
// ---------------------------------------------------------------------------

class AudioManagerImpl {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private sfxGain: GainNode | null = null
  private musicGain: GainNode | null = null

  // Music state
  private currentMusic: MusicId | null = null
  private musicOscillators: OscillatorNode[] = []
  private musicIntervalId: ReturnType<typeof setInterval> | null = null

  // Settings
  private _sfxVolume = 0.7
  private _musicVolume = 0.4
  private _muted = false

  /** Lazily initialize AudioContext (must be after user gesture). */
  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext()
      this.masterGain = this.ctx.createGain()
      this.masterGain.connect(this.ctx.destination)

      this.sfxGain = this.ctx.createGain()
      this.sfxGain.gain.value = this._sfxVolume
      this.sfxGain.connect(this.masterGain)

      this.musicGain = this.ctx.createGain()
      this.musicGain.gain.value = this._musicVolume
      this.musicGain.connect(this.masterGain)
    }
    // Resume if suspended (autoplay policy)
    if (this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
    return this.ctx
  }

  // -------------------------------------------------------------------------
  // SFX
  // -------------------------------------------------------------------------

  playSfx(id: SfxId): void {
    if (this._muted) return
    const def = SFX_DEFS[id]
    if (!def) return

    const ctx = this.ensureContext()
    const now = ctx.currentTime

    // Oscillator
    const osc = ctx.createOscillator()
    osc.type = def.type
    osc.frequency.setValueAtTime(def.freq, now)
    if (def.endFreq) {
      osc.frequency.linearRampToValueAtTime(def.endFreq, now + def.duration)
    }

    // Gain envelope
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(def.gain, now)
    gain.gain.linearRampToValueAtTime(0, now + def.duration)

    osc.connect(gain)
    gain.connect(this.sfxGain!)

    // Optional noise layer (for whoosh/impact effects)
    if (def.noise) {
      const bufSize = Math.round(ctx.sampleRate * def.duration)
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < bufSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.3
      }
      const noise = ctx.createBufferSource()
      noise.buffer = buf
      const noiseGain = ctx.createGain()
      noiseGain.gain.setValueAtTime(def.gain * 0.3, now)
      noiseGain.gain.linearRampToValueAtTime(0, now + def.duration)
      noise.connect(noiseGain)
      noiseGain.connect(this.sfxGain!)
      noise.start(now)
      noise.stop(now + def.duration)
    }

    osc.start(now)
    osc.stop(now + def.duration)
  }

  // -------------------------------------------------------------------------
  // Music
  // -------------------------------------------------------------------------

  playMusic(id: MusicId): void {
    if (this.currentMusic === id) return
    this.stopMusic()
    if (this._muted) {
      this.currentMusic = id
      return
    }

    const def = MUSIC_DEFS[id]
    if (!def) return

    const ctx = this.ensureContext()
    this.currentMusic = id

    const beatDuration = 60 / def.bpm
    let noteIndex = 0

    const playNote = () => {
      if (this.currentMusic !== id) return
      const freq = def.notes[noteIndex % def.notes.length]
      const bassFreq = def.bassNotes ? def.bassNotes[noteIndex % def.bassNotes.length] : 0
      const now = ctx.currentTime

      if (freq > 0) {
        const osc = ctx.createOscillator()
        osc.type = def.type
        osc.frequency.value = freq
        const g = ctx.createGain()
        g.gain.setValueAtTime(def.gain, now)
        g.gain.linearRampToValueAtTime(0, now + beatDuration * 0.8)
        osc.connect(g)
        g.connect(this.musicGain!)
        osc.start(now)
        osc.stop(now + beatDuration * 0.9)
        this.musicOscillators.push(osc)
      }

      if (bassFreq > 0) {
        const bass = ctx.createOscillator()
        bass.type = 'sine'
        bass.frequency.value = bassFreq
        const bg = ctx.createGain()
        bg.gain.setValueAtTime(def.gain * 0.6, now)
        bg.gain.linearRampToValueAtTime(0, now + beatDuration * 0.8)
        bass.connect(bg)
        bg.connect(this.musicGain!)
        bass.start(now)
        bass.stop(now + beatDuration * 0.9)
        this.musicOscillators.push(bass)
      }

      noteIndex++
    }

    playNote()
    this.musicIntervalId = setInterval(playNote, beatDuration * 1000)
  }

  stopMusic(): void {
    if (this.musicIntervalId) {
      clearInterval(this.musicIntervalId)
      this.musicIntervalId = null
    }
    for (const osc of this.musicOscillators) {
      try { osc.stop() } catch { /* already stopped */ }
    }
    this.musicOscillators = []
    this.currentMusic = null
  }

  /** Cross-fade to new music track. */
  crossFadeTo(id: MusicId, fadeMs = 500): void {
    if (this.currentMusic === id) return
    if (!this.musicGain) {
      this.playMusic(id)
      return
    }
    const ctx = this.ensureContext()
    const now = ctx.currentTime
    // Fade out current
    this.musicGain.gain.linearRampToValueAtTime(0, now + fadeMs / 1000)
    setTimeout(() => {
      this.stopMusic()
      if (this.musicGain) this.musicGain.gain.value = this._musicVolume
      this.playMusic(id)
    }, fadeMs)
  }

  // -------------------------------------------------------------------------
  // Volume / Mute controls
  // -------------------------------------------------------------------------

  get sfxVolume(): number { return this._sfxVolume }
  set sfxVolume(v: number) {
    this._sfxVolume = Math.max(0, Math.min(1, v))
    if (this.sfxGain) this.sfxGain.gain.value = this._sfxVolume
  }

  get musicVolume(): number { return this._musicVolume }
  set musicVolume(v: number) {
    this._musicVolume = Math.max(0, Math.min(1, v))
    if (this.musicGain) this.musicGain.gain.value = this._musicVolume
  }

  get muted(): boolean { return this._muted }
  set muted(v: boolean) {
    this._muted = v
    if (this.masterGain) {
      this.masterGain.gain.value = v ? 0 : 1
    }
    if (v) {
      this.stopMusic()
    } else if (this.currentMusic) {
      this.playMusic(this.currentMusic)
    }
  }

  toggleMute(): boolean {
    this.muted = !this._muted
    return this._muted
  }
}

/** Global AudioManager singleton. */
export const audioManager = new AudioManagerImpl()
