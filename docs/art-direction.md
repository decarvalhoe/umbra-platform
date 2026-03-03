# UMBRA — Art Direction Guide

> Dark Fantasy Pop Cute Manga LGBTQ+

This document is the canonical reference for all visual, UI, and character design decisions. All contributors (artists, developers, designers) must follow these guidelines.

**Canonical source:** GitHub Issue #102

---

## Design Direction

**Pop Cute Manga** — A dark fantasy world wrapped in warm, inviting manga aesthetics. Menacing silhouettes with welcoming details. The art direction prioritizes emotional safety while maintaining genuine edge.

**Reference mix:** Persona 5's bold UI + Himesama Goumon's cute-gothic-queer energy + TYPE-MOON's noble aesthetic, set in a dark fantasy world.

---

## 6 Design Principles

1. **Menacing Silhouette, Welcoming Detail** — Characters look intimidating in silhouette but reveal warm, detailed features up close.
2. **Gothic Candy Environments** — Dark gothic architecture with unexpected pops of color (neon signs, glowing flowers, candy-colored crystals).
3. **Emotional Safety with Aesthetic Edge** — The world is dark but the UI is always warm and navigable. Horror as aesthetic, not experience.
4. **Sincerity > Irony** — Characters are earnest in their emotions. No "too cool to care" attitudes. Vulnerability is strength.
5. **Integrated Inclusivity** — LGBTQ+ representation is woven into the world naturally, not as a separate mode or toggle. All companions are romanceable regardless of player identity.
6. **Found Family > Blood Family** — The companion system centers chosen bonds over inherited ones.

---

## Color Palette — Gothic Candy

### Primary (Dark Bases)

| Token | Name | Hex | Usage |
|-------|------|-----|-------|
| `--color-bg-primary` | Abyssal Black | `#0a0a0f` | Primary background |
| `--color-bg-secondary` | Dark Violet | `#1a1a2e` | Cards, secondary panels |
| `--color-bg-tertiary` | Deep Navy | `#16213e` | Tertiary panels |

### Accents (Pop Candy)

| Token | Name | Hex | Usage |
|-------|------|-----|-------|
| `--color-accent-pink` | Hot Pink | `#ff2d78` | Primary accent, CTA, romance |
| `--color-accent-gold` | Gold Shimmer | `#ffe135` | Rare drops, achievements |
| `--color-accent-cyan` | Cyan Glow | `#00bcd4` | Info, cooldowns, tech |
| `--color-accent-lavender` | Lavender Mist | `#b39ddb` | Mystery, magic, void |
| `--color-accent-magenta` | Magenta Burst | `#e040fb` | Criticals, special events |

### Noble Layer (premium / boss contexts)

| Token | Name | Hex | Usage |
|-------|------|-----|-------|
| `--color-noble-gold` | Gold Noble | `#ffd700` | Boss titles, legendary |
| `--color-noble-midnight` | Midnight Blue | `#191970` | Boss arenas, cutscenes |
| `--color-noble-crimson` | Crimson Accent | `#dc143c` | Danger, corruption |
| `--color-noble-purple` | Royal Purple | `#4b0082` | Void energy, ultimates |

### Companion Signature Colors

| Companion | Token | Hex | Element |
|-----------|-------|-----|---------|
| Kaelan | `--color-companion-kaelan` | `#ff6b35` | Fire |
| Lyra | `--color-companion-lyra` | `#b39ddb` | Arcane |
| Nyx | `--color-companion-nyx` | `#ffe135` | Shadow |
| Seraphina | `--color-companion-seraphina` | `#ff2d78` | Healing |
| Ronan | `--color-companion-ronan` | `#00bcd4` | Void |

---

## Typography

| Role | Font | Token | Weight | Usage |
|------|------|-------|--------|-------|
| Display / Titles | Cinzel Decorative | `--font-display` | Bold / Black | Boss names, chapter titles, menu headers |
| Body / UI | Inter | `--font-body` | Regular–Bold | All body text, buttons, labels |
| Code / Stats | JetBrains Mono | `--font-mono` | Regular–Bold | Stat numbers, debug info, damage numbers |

### Size Scale

| Token | Size | Usage |
|-------|------|-------|
| `--text-2xs` | 0.58rem | Micro labels |
| `--text-xs` | 0.65rem | Badges, tags |
| `--text-sm` | 0.8rem | Captions, small UI |
| `--text-base` | 1rem | Body text |
| `--text-lg` | 1.25rem | Large body |
| `--text-xl` | 1.5rem | Section subtitle |
| `--text-2xl` | 2rem | Stat numbers |
| `--text-3xl` | 3rem | Section titles |
| `--text-4xl` | 4rem | Hero title |

---

## UI Component Patterns

### Buttons

- **Primary:** Gradient pink (`#ff2d78` → `#e040fb`), rounded or clipped corners, subtle glow on hover.
- **Secondary:** Outlined with accent border, transparent fill.
- **Gacha:** Gradient purple with pill shape, pulsing glow animation.
- **Disabled:** Desaturated, no glow.

### Cards

- Dark background (`--color-bg-secondary`), left border colored by rarity or companion.
- Subtle shadow, hover: lift + glow effect.
- Manga-panel inspired frames for important cards (clipped corners).

### Inputs

- Dark field (`rgba(255,255,255,0.04)` background).
- Focus: accent glow ring (cyan for generic, pink for romance contexts).
- Placeholder text in muted lavender.

### Modals

- Manga panel style: bold borders, slight rotation (1-2 deg), speed line accents.
- Dark overlay backdrop with optional particle effects.

---

## Lighting Philosophy

| Context | Lighting | Emotional Feel |
|---------|----------|----------------|
| Hub | Warm amber, soft glow | Safe, home |
| Dungeon | Dramatic shadows, corruption tint | Tense, foreboding |
| Boss fight | Theatrical spotlight, rim lighting | Epic, cinematic |
| Romance scenes | Soft lavender, bokeh background | Intimate, gentle |
| Void events | Cold blue/purple, flickering | Otherworldly, unsettling |

---

## Particle & Effect System

| Effect | Usage | Budget |
|--------|-------|--------|
| Ambient particles | Hub atmosphere (embers, void sparks) | Max 50 |
| Burst on click | UI interaction feedback | 10-15 per burst |
| Custom cursor | Themed cursor with trail | Minimal |
| Sparkles | Rare drops, romance, achievements | Max 30 |
| Halftone dots | Manga-style impact emphasis | Shader-based |
| Speed lines | Dash, criticals, transitions | Shader-based |

---

## Character Design Guidelines

- **Art fusion:** Takeuchi (TYPE-MOON) precision x Himesama Goumon cute-gothic energy.
- **Portraits:** Semi-realistic manga style for dialogue scenes.
- **In-game sprites:** Super-deformed (SD) chibi proportions for gameplay.
- **Emotion states:** Each companion needs minimum 5 expressions (neutral, happy, sad, flustered, angry).
- **Corruption Motif:** All characters share a visual "corruption marker" that evolves with story (glowing veins, void cracks).
- **Silhouette clarity:** Every character must be instantly recognizable in pure silhouette.

### Mascot

- Cute demon chibi, positioned bottom-right of UI.
- Playful, teasing personality — tutorial hints, rare quips.
- Reacts to player actions (celebrates victories, pouts on defeats).
- Can be toggled off in settings.

---

## CSS Token Usage

All design tokens live in `client/src/styles/design-tokens.css`. To use them:

```css
.my-component {
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  font-family: var(--font-display);
  padding: var(--space-lg);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-glow-pink);
  transition: transform var(--duration-normal) var(--ease-smooth);
}
```

**Do not** hardcode hex colors or font names in component CSS. Always use tokens.

---

## Visual References

| Reference | What to Take |
|-----------|-------------|
| Himesama Goumon | Cute-gothic-queer energy, emotional warmth in dark settings |
| TYPE-MOON / Fate | Noble aesthetic, character design precision, magical realism |
| Hades | Dark world that feels inviting, character relationship depth |
| Genshin Impact | UI polish, elemental color coding, gacha presentation |
| Persona 5 | Bold UI design, dynamic transitions, style as identity |
