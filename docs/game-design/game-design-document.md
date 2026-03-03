# Game Design Document — Project Umbra (GDD v3.0)

> Version 3.0 — Mise à jour Mars 2026
> Document de référence principal pour le design de Project Umbra.

---

## 1. Vision

**Project Umbra** est un **hack’n’slash roguelite** dark fantasy enrichi par un **AI Director narratif**, un système de **romance otome inclusive LGBTQ+**, et une direction artistique **pop cute manga**.

Le joueur incarne un Éveillé du Void, explorant des donjons générés procéduralement, combattant des ennemis du Void, forgeant des liens affectifs avec des compagnons, et progressant à travers des systèmes imbriqués de runes, talents, invocations et romance.

**Mots-clés** : Roguelite × Hack’n’slash × AI Narrative × Otome LGBTQ+ × Pop Cute Manga × Idle Systems

---

## 2. Les 5 Piliers

### Pilier 1 — Combat Viscéral
Hack’n’slash avec esquive à i-frames, système élémentaire (Feu, Ombre, Sang, Néant), combos d’armes duales, et synergies de runes de corruption. Le combat doit être rapide, lisible et satisfaisant.

### Pilier 2 — Exploration Roguelite
Donjons générés procéduralement avec événements narratifs, choix à conséquences, corruption croissante, et boss multi-phases. Chaque run est unique grâce aux combinaisons de runes, bénédictions et malus.

### Pilier 3 — AI Director Narratif
Un système d’intelligence artificielle qui génère des dialogues contextuels, adapte les événements narratifs aux choix du joueur, et crée des moments de storytelling émergent. Les compagnons réagissent dynamiquement aux actions du joueur.

### Pilier 4 — Romance Inclusive
Système otome LGBTQ+ avec 5 love interests diversifiés. Relations configurable par le joueur (Romance / Amitié Profonde / Neutre). Chaque compagnon a un arc narratif personnel avec des scènes de résonance débloquables.

### Pilier 5 — Progression Multi-couche
Progression imbriquée combinant niveau joueur, affinité compagnon, résonance, arbre de talents, runes de corruption, Void Forge, et Battle Pass saisonnier. Chaque couche nourrit les autres.

---

## 3. Boucle de Gameplay

```
┌───────────────────────────────────────────────────────────────────┐
│  1. PRÉPARATION                                                       │
│  Équiper runes • Configurer talents • Choisir compagnons               │
│  Void Forge (reforger runes, awakening, infusion)                     │
└─────────────────────────────────┬─────────────────────────────────┘
                                    │
                                    ▼
┌───────────────────────────────────────────────────────────────────┐
│  2. RUN ROGUELITE                                                     │
│  Donjons procéduraux • Événements narratifs • Corruption croissante  │
│  Choix de bénédictions/malédictions • Loot temporaire                 │
└─────────────────────────────────┬─────────────────────────────────┘
                                    │
                                    ▼
┌───────────────────────────────────────────────────────────────────┐
│  3. COMBAT                                                            │
│  Hack’n’slash • Esquive i-frames • Combos élémentaires              │
│  Boss multi-phases • Synergies de runes                              │
└─────────────────────────────────┬─────────────────────────────────┘
                                    │
                                    ▼
┌───────────────────────────────────────────────────────────────────┐
│  4. EXTRACTION / MORT                                                 │
│  Extraction réussie = loot complet + bonus                           │
│  Mort = loot partiel + pénalité corruption                            │
└─────────────────────────────────┬─────────────────────────────────┘
                                    │
                                    ▼
┌───────────────────────────────────────────────────────────────────┐
│  5. RÉCOMPENSES & MÉTA-PROGRESSION                                    │
│  Cendres • Shadow Dust • Void Shards • XP Compagnon                 │
│  Monter affinité • Améliorer runes • Débloquer talents               │
└─────────────────────────────────┬─────────────────────────────────┘
                                    │
                                    ▼
┌───────────────────────────────────────────────────────────────────┐
│  6. SHADOW VIGIL (Idle)                                               │
│  3 compagnons en veille • 12h cap • AI rapports                      │
│  Récolte passive de ressources et XP compagnon                       │
└─────────────────────────────────┴─────────────────────────────────┘
                                    │
                           ─── Retour à 1. ───
```

---

## 4. Systèmes Principaux

| Système | Description | Issue |
|---------|-------------|-------|
| **Corruption Runes** | 7 sets, 6 slots, 5 rarités, upgrade +15, Corruption Seals | #68 |
| **Void Summoning** | Invocation gacha 4 étapes, pity Convergence (soft 70, hard 90) | #71 |
| **Shadow Vigil** | Système idle : 3 compagnons, 12h cap, rapports AI | #78 |
| **Void Arena** | PvP asynchrone, Defense Teams, 5 tiers de classement | #80 |
| **Void Forge** | 3 piliers : Rune Reforging, Equipment Awakening, Corruption Infusion | #105 |
| **Resonance Bond** | Liens compagnon, Echo Fragments, Void Form | #104 |
| **Affinity System** | Affinité 0-100 par compagnon, 5 seuils, préférence relationnelle | #98 |
| **AI Dialogue** | Dialogues contextuels générés par AI, réactions dynamiques | #99 |
| **Seasonal Events** | Événements saisonniers avec bannières, quêtes, cosmetics | #103 |

---

## 5. Boucles d’Engagement

### Micro-boucle (5-15 min)
- Lancer un run rapide (3-5 étages)
- Gagner Cendres + Shadow Dust + XP compagnon
- Ouvrir coffre de fin de run
- Améliorer une rune ou un talent

### Boucle quotidienne (30-60 min)
- Récupérer les récompenses Shadow Vigil
- Compléter 3 quêtes quotidiennes
- Faire 1-2 runs complets
- Interagir avec un compagnon (dialogue AI, cadeau)
- Dépenser Arena Tickets

### Boucle hebdomadaire
- Compléter les défis de clan
- Monter dans le classement Arena
- Progresser dans le Battle Pass (7-10 tiers/semaine)
- Participer aux événements saisonniers
- Void Forge : reforger/awakening hebdomadaire

### Boucle long-terme
- Débloquer les scènes de Résonance avec chaque compagnon
- Atteindre Void Form (Résonance L15)
- Compléter le Bestiaire
- Atteindre le rang Legendary en clan
- Collectionner tous les sets de runes

---

## 6. Plateformes & Stack Technique

| Composant | Technologie |
|-----------|-------------|
| **Client Web** | React 18 + Phaser 3 (canvas de jeu) |
| **Client Mobile** | Capacitor (iOS + Android) |
| **Backend** | FastAPI (Python) |
| **Temps réel** | Nakama (matchmaking, sync, leaderboards) |
| **Base de données** | PostgreSQL + Redis (cache) |
| **AI** | OpenAI / Anthropic pour dialogues contextuels |
| **CI/CD** | GitHub Actions, déploiement Jelastic |
| **Auth** | JWT + OAuth2 (Google, Discord) |

**Sync cross-platform** : Les profils joueurs sont synchronisés via le Cloud Profile Service de Nakama. Un joueur peut commencer sur web et continuer sur mobile sans perte de progression.

---

## 7. Direction Artistique

### Style : Pop Cute Manga
Un style qui mélange l’esthétique **dark gothic** avec des éléments **kawaii** et **colorés**. Les personnages sont stylisés avec des proportions manga, des yeux expressifs et des tenues élaborées. L’ambiance oscille entre le mignon et le sinistre.

### Palette : Gothic Candy
- **Primaire** : Violet profond (#2D1B4E), Noir charbon (#1A1A2E)
- **Accent** : Rose bonbon (#FF6B9D), Cyan néon (#00F5FF), Or antique (#D4A574)
- **UI** : Blanc spectral (#F0E6FF), Gris brume (#8B7FA3)
- **Danger** : Rouge corruption (#FF2D55), Orange ember (#FF8C42)

### Typographie
- **Titres** : Cinzel (serif gothique, majuscules)
- **Corps** : Inter (sans-serif lisible, UI et dialogues)
- **Accents narratifs** : Playfair Display (italique, citations, noms des compagnons)

### Références visuelles
- Genshin Impact (qualité des personnages)
- Hades (clarté du combat)
- Persona 5 (UI stylisée)
- Obey Me! (esthétique otome)

---

## 8. Documents Associés

| Document | Fichier |
|----------|---------|
| Économie | [economy.md](./economy.md) |
| Mécaniques | [mechanics.md](./mechanics.md) |
| Progression | [progression.md](./progression.md) |
| Bestiaire | [enemies/bestiary.md](./enemies/bestiary.md) |
