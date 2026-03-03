# Économie du Jeu — Project Umbra (v3.0)

> Toutes les devises, sources, sinks et flux économiques du jeu.

---

## 1. Devises

### Devises Principales

| Devise | Type | Obtention | Utilisation |
|--------|------|-----------|-------------|
| **Cendres** | Soft currency primaire | Runs, contrats, Shadow Vigil, quêtes | Craft, upgrades de runes, achat boutique NPC, rerolls |
| **Éclats d’Ombre** | Premium | Boutique IAP, Battle Pass premium, événements | Cosmetics, accès donjons mythiques, stamina refresh |
| **Essence Antique** | Super-premium | Événements exclusifs uniquement | Évolution de reliques ult., talents ultimes, cosmetics rares |

### Devises de Progression

| Devise | Type | Obtention | Utilisation |
|--------|------|-----------|-------------|
| **Shadow Dust** | Drop commun | Loot de donjon (tous étages) | Upgrade de runes (+1 à +15) |
| **Void Crystals** | Drop rare | Étages 7+ uniquement | Equipment Awakening (Void Forge) |
| **Abyssal Dust** | Drop boss | Kill de boss uniquement | Corruption Infusion (Void Forge) |
| **Resonance Crystals** | Quête personnelle | Quêtes personnelles de compagnon | Upgrade des Echo Fragments |
| **Void Shards** | Gacha | Boss kills, achievements, événements, Battle Pass | Void Summoning (invocations) |

### Devises Spéciales

| Devise | Type | Obtention | Utilisation |
|--------|------|-----------|-------------|
| **Convergence Tokens** | Pity / échange | Duplicate d’invocation 5 étoiles | Échange contre un compagnon spécifique au choix |
| **Arena Tickets** | PvP | Événements, boutique, récompenses quotidiennes | Attaques PvP supplémentaires dans la Void Arena |

---

## 2. Flux de Devises

```
                    ┌─────────────────┐
                    │   RUN DONJON    │
                    └────────┬────────┘
                           │
           ┌──────────┼─────────────┬───────────┐
           ▼              ▼             ▼           ▼
     ┌─────────┐  ┌───────────┐  ┌─────────┐  ┌─────────┐
     │ Cendres │  │Shadow Dust│  │Void Crys.│  │Abys. Dust│
     └────┬────┘  └─────┬─────┘  └────┬────┘  └────┬────┘
          │           │           │           │
          ▼           ▼           ▼           ▼
     ┌─────────┐  ┌───────────┐  ┌─────────┐  ┌─────────┐
     │ Boutique│  │Rune +1-15 │  │Eq. Awaken│  │Corr. Inf.│
     │ Craft   │  │(upgrade)  │  │(Forge)   │  │(Forge)   │
     └─────────┘  └───────────┘  └─────────┘  └─────────┘

     ┌─────────────────┐      ┌───────────────────┐
     │  BOSS KILLS      │      │  QUÊTES PERSO.    │
     └────────┬────────┘      └─────────┬─────────┘
              │                       │
              ▼                       ▼
     ┌─────────────────┐      ┌───────────────────┐
     │  Void Shards     │      │  Resonance Crys.  │
     └────────┬────────┘      └─────────┬─────────┘
              │                       │
              ▼                       ▼
     ┌─────────────────┐      ┌───────────────────┐
     │  Void Summoning  │      │  Echo Fragment Up.│
     └─────────────────┘      └───────────────────┘

     ┌─────────────────┐      ┌───────────────────┐
     │  IAP / BOUTIQUE  │      │  ÉVÉNEMENTS       │
     └────────┬────────┘      └─────────┬─────────┘
              │                       │
              ▼                       ▼
     ┌─────────────────┐      ┌───────────────────┐
     │ Éclats d’Ombre   │      │  Essence Antique  │
     └─────────────────┘      └───────────────────┘
```

---

## 3. Sources Détaillées

### Cendres (Soft Currency)

| Source | Quantité par occurrence | Fréquence |
|--------|--------------------------|-----------|
| Run donjon (extraction) | 50-200 (selon étage) | Illimité |
| Run donjon (mort) | 25-100 (50% du total) | Illimité |
| Quêtes quotidiennes | 100 par quête (x3/jour) | 3/jour |
| Shadow Vigil | 30-80 (selon durée) | 12h cap |
| Contrats de clan | 200-500 | Hebdomadaire |
| Battle Pass (gratuit) | 100-300 par palier | Saisonnier |

### Void Shards (Gacha)

| Source | Quantité | Fréquence |
|--------|-----------|-----------|
| Boss kill | 5-15 | Par run |
| Achievement | 10-50 | One-time |
| Battle Pass (gratuit) | 5-20 par palier | Saisonnier |
| Battle Pass (premium) | 10-40 par palier | Saisonnier |
| Événements saisonniers | 20-100 | Event |
| Défis hebdomadaires | 30 | Hebdomadaire |

### Shadow Dust

| Source | Quantité | Fréquence |
|--------|-----------|-----------|
| Loot donjon (tous étages) | 5-30 par salle | Par run |
| Shadow Vigil | 10-50 (selon durée) | 12h cap |
| Démontage de runes | 10-100 (selon rarité) | À volonté |

### Void Crystals

| Source | Quantité | Fréquence |
|--------|-----------|-----------|
| Étages 7+ du donjon | 1-5 par salle | Par run (rare) |
| Boss (zone 4+) | 3-10 | Par kill |
| Événements spéciaux | 5-20 | Event |

### Abyssal Dust

| Source | Quantité | Fréquence |
|--------|-----------|-----------|
| Boss kill (tout boss) | 1-3 | Par kill |
| Boss mythique | 5-10 | Par kill |
| Récompense de clan (Gold+) | 2-5 | Hebdomadaire |

---

## 4. Sinks (Dépenses)

### Cendres

| Sink | Coût | Notes |
|------|------|-------|
| Craft d’équipement | 100-500 | Selon rarité |
| Reroll de stats (rune) | 50-200 | Coût progressif |
| Achat boutique NPC | Variable | Rotation quotidienne |
| Réparation d’équipement | 20-100 | Après mort |
| Entrée donjons mythiques | 500 | Par run |

### Shadow Dust

| Sink | Coût | Notes |
|------|------|-------|
| Rune upgrade +1 | 10 | Coût bas, taux de succès 100% |
| Rune upgrade +5 | 50 | Taux de succès 90% |
| Rune upgrade +10 | 200 | Taux de succès 60% |
| Rune upgrade +15 | 500 | Taux de succès 30% |
| Rune Reforging (Void Forge) | 300 | Ré-roll substats |

### Void Crystals

| Sink | Coût | Notes |
|------|------|-------|
| Equipment Awakening Tier 1 | 10 | Stat boost mineur |
| Equipment Awakening Tier 2 | 25 | Stat boost + effet visuel |
| Equipment Awakening Tier 3 | 50 | Stat boost majeur + aura |

### Abyssal Dust

| Sink | Coût | Notes |
|------|------|-------|
| Corruption Infusion Tier 1 | 5 | Ajoute 1 substat corrompue |
| Corruption Infusion Tier 2 | 15 | Ajoute 2 substats corrompues |
| Corruption Infusion Tier 3 | 30 | Substat corrompue légendaire |

### Void Shards

| Sink | Coût | Notes |
|------|------|-------|
| Invocation simple | 160 | 1 compagnon/équipement |
| Invocation x10 | 1600 | 10 items, garanti 1 Rare+ |
| Bannière boostée | 1600 | Rate-up pour unité spécifique |

### Resonance Crystals

| Sink | Coût | Notes |
|------|------|-------|
| Echo Fragment upgrade T1→T2 | 20 | Améliore effet passif |
| Echo Fragment upgrade T2→T3 | 50 | Débloque effet actif |

### Convergence Tokens

| Sink | Coût | Notes |
|------|------|-------|
| Échange compagnon 5★ | 300 | Choix libre parmi le roster |
| Échange équipement 5★ | 200 | Choix libre |

---

## 5. Anti-Inflation

| Mécanisme | Description |
|-----------|-------------|
| **Cap quotidien Cendres (idle)** | Shadow Vigil plafonné à 12h de récolte |
| **Coûts dynamiques** | Les coûts de craft/upgrade scalent avec le niveau joueur |
| **Rotation hebdomadaire** | Les offres boutique changent chaque semaine |
| **Taux d’échec upgrade** | Au-dessus de +10, l’upgrade peut échouer (consomme les mats) |
| **Currency sinks multiples** | Chaque devise a 2-3 sinks concurrents pour éviter l’accumulation |
| **Convergence Token cap** | Maximum 900 tokens stockables (force l’échange) |

---

## 6. Monétisation Responsable

| Principe | Implémentation |
|----------|-----------------|
| **Pas de pay-to-win** | Les achats premium sont cosmetics ou confort (stamina, slots) |
| **Probabilités affichées** | Toutes les rates gacha sont visibles avant achat |
| **Pity garanti** | Soft pity à 70 pulls, hard pity à 90 (voir Void Summoning) |
| **Limites parentales** | Contrôles de dépenses paramétrables |
| **Pas de timers payants** | Aucun coût pour accélérer le Shadow Vigil |
| **F2P viable** | Tous les compagnons sont obtenables sans achat (via Convergence Tokens) |
